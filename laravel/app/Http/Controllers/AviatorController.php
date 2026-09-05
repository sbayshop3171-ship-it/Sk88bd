<?php

namespace App\Http\Controllers;

use App\Models\AviatorBet;
use App\Models\AviatorRound;
use App\Services\WalletService;
use App\Support\CrashEngine;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Aviator.
 *
 * The browser draws the curve, but it never decides anything: the seed and the
 * crash point are generated here before the aircraft leaves the ground, and a
 * cash-out is priced from this server's clock, not from a multiplier the page
 * claims to have reached. A tampered client can therefore lose money, never
 * win it.
 *
 * Rounds are dealt per player rather than shared, which keeps the single-player
 * feel of the original and needs no round daemon. A shared table would mean
 * broadcasting one clock to everyone.
 */
class AviatorController extends Controller
{
    /** Minimum stake, in paisa. */
    private const MIN_STAKE = 1000;

    private const MAX_SEATS = 2;

    public function __construct(private readonly WalletService $wallet) {}

    public function play(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('Game/Aviator/Play', [
            'clientSeed' => $this->clientSeed($request),
            'minStake' => self::MIN_STAKE,
            'bettingMs' => CrashEngine::BETTING_MS,
            'crashedMs' => CrashEngine::CRASHED_MS,
            'history' => $this->history($user?->id),
        ]);
    }

    public function fairness(): Response
    {
        return Inertia::render('Game/Aviator/Fairness');
    }

    /** Re-derive a finished round from its published seed. */
    public function verify(Request $request): JsonResponse
    {
        $data = $request->validate([
            'server_seed' => ['required', 'string', 'max:128'],
            'client_seed' => ['required', 'string', 'max:128'],
            'nonce' => ['nullable', 'integer', 'min:0'],
        ], [
            'server_seed.required' => 'সার্ভার সিড ও ক্লায়েন্ট সিড দুটোই দিন',
            'client_seed.required' => 'সার্ভার সিড ও ক্লায়েন্ট সিড দুটোই দিন',
        ]);

        $nonce = (int) ($data['nonce'] ?? 0);
        $roundHash = CrashEngine::hash("{$data['server_seed']}:{$data['client_seed']}:{$nonce}");

        return response()->json([
            'server_seed_hash' => CrashEngine::hash($data['server_seed']),
            'crash_at' => CrashEngine::crashFromHash($roundHash),
        ]);
    }

    /**
     * Open a round: commit the seed, take the stakes, and hand back the hash
     * plus the take-off time the client animates against.
     */
    public function start(Request $request): JsonResponse
    {
        $data = $request->validate([
            'seats' => ['required', 'array', 'min:1', 'max:'.self::MAX_SEATS],
            'seats.*.seat' => ['required', 'integer', 'min:0', 'max:'.(self::MAX_SEATS - 1)],
            'seats.*.stake' => ['required', 'integer', 'min:'.self::MIN_STAKE],
            'seats.*.auto_at' => ['nullable', 'numeric', 'min:1.01', 'max:10000'],
        ], [
            // A player watching without staking never reaches here — the client
            // draws that round locally — but the message is theirs if they do.
            'seats.required' => 'বেট না দিয়ে রাউন্ড শুরু করা যায় না',
            'seats.min' => 'বেট না দিয়ে রাউন্ড শুরু করা যায় না',
            'seats.*.stake.min' => 'সর্বনিম্ন বেট ৳'.number_format(self::MIN_STAKE / 100),
        ]);

        $user = $request->user();
        $clientSeed = $this->clientSeed($request);

        $seats = collect($data['seats'])->unique('seat')->values();
        $total = $seats->sum('stake');

        if ($total > $this->wallet->balanceOf($user)) {
            return response()->json(['message' => 'ব্যালেন্স যথেষ্ট নয়'], 422);
        }

        $round = DB::transaction(function () use ($user, $clientSeed, $seats, $total): AviatorRound {
            $nonce = AviatorRound::where('user_id', $user->id)->max('nonce') + 1;

            $serverSeed = CrashEngine::randomHex();
            $roundHash = CrashEngine::hash("{$serverSeed}:{$clientSeed}:{$nonce}");

            $round = AviatorRound::create([
                'user_id' => $user->id,
                'server_seed' => $serverSeed,
                'server_seed_hash' => CrashEngine::hash($serverSeed),
                'client_seed' => $clientSeed,
                'nonce' => $nonce,
                'crash_at' => CrashEngine::crashFromHash($roundHash),
                'started_at' => now()->addMilliseconds(CrashEngine::BETTING_MS),
            ]);

            foreach ($seats as $seat) {
                AviatorBet::create([
                    'round_id' => $round->id,
                    'user_id' => $user->id,
                    'seat' => $seat['seat'],
                    'stake' => $seat['stake'],
                    'auto_at' => $seat['auto_at'] ?? null,
                ]);
            }

            $this->wallet->apply($user, 'bet', -$total, "aviator:{$round->id}");

            return $round;
        });

        return response()->json([
            'round_id' => $round->id,
            'nonce' => $round->nonce,
            'server_seed_hash' => $round->server_seed_hash,
            'client_seed' => $clientSeed,
            // epoch ms, so the client can run its own countdown against it
            'starts_at' => $round->started_at->getPreciseTimestamp(3),
            'server_now' => now()->getPreciseTimestamp(3),
            'balance' => $this->wallet->balanceOf($user),
        ]);
    }

    /**
     * Cash one seat out. The multiplier is recomputed here from the elapsed
     * flight time; whatever the page believes is ignored.
     */
    public function cashOut(Request $request, AviatorRound $round): JsonResponse
    {
        $data = $request->validate([
            'seat' => ['required', 'integer', 'min:0', 'max:'.(self::MAX_SEATS - 1)],
        ]);

        $user = $request->user();

        if ($round->user_id !== $user->id) {
            return response()->json(['message' => 'রাউন্ডটি আপনার নয়'], 403);
        }

        $result = DB::transaction(function () use ($round, $user, $data): array {
            /** @var AviatorBet|null $bet */
            $bet = AviatorBet::query()
                ->where('round_id', $round->id)
                ->where('user_id', $user->id)
                ->where('seat', $data['seat'])
                ->lockForUpdate()
                ->first();

            if ($bet === null || $bet->cashed_at !== null) {
                return ['ok' => false, 'message' => 'এই সিটে কোনো চলমান বেট নেই'];
            }

            $elapsed = $round->started_at->diffInMilliseconds(now(), false);

            if ($elapsed < 0) {
                return ['ok' => false, 'message' => 'রাউন্ড এখনো শুরু হয়নি'];
            }

            $multiplier = floor(CrashEngine::multiplierAt($elapsed) * 100) / 100;

            if ($multiplier >= $round->crash_at) {
                return ['ok' => false, 'message' => 'উড়ে গেছে — ক্যাশ আউট হয়নি'];
            }

            $payout = (int) floor($bet->stake * $multiplier);

            $bet->update(['cashed_at' => $multiplier, 'payout' => $payout]);
            $this->wallet->apply($user, 'win', $payout, "aviator:{$round->id}:{$bet->seat}");

            return ['ok' => true, 'multiplier' => $multiplier, 'payout' => $payout];
        });

        return response()->json([
            ...$result,
            'balance' => $this->wallet->balanceOf($user),
        ], $result['ok'] ? 200 : 422);
    }

    /**
     * Close the round and publish the seed. Safe to call more than once, and
     * refused until the aircraft could actually have crashed — otherwise the
     * seed would be readable mid-flight.
     */
    public function settle(Request $request, AviatorRound $round): JsonResponse
    {
        $user = $request->user();

        if ($round->user_id !== $user->id) {
            return response()->json(['message' => 'রাউন্ডটি আপনার নয়'], 403);
        }

        $crashesAt = $round->started_at->copy()
            ->addMilliseconds((int) CrashEngine::timeToReach((float) $round->crash_at));

        if (now()->lessThan($crashesAt)) {
            return response()->json(['message' => 'রাউন্ড এখনো চলছে'], 422);
        }

        if ($round->crashed_at === null) {
            $round->update(['crashed_at' => $crashesAt]);
        }

        return response()->json([
            'round_id' => $round->id,
            'nonce' => $round->nonce,
            'crash_at' => (float) $round->crash_at,
            'server_seed' => $round->server_seed,
            'server_seed_hash' => $round->server_seed_hash,
            'client_seed' => $round->client_seed,
            'balance' => $this->wallet->balanceOf($user),
            'history' => $this->history($user->id),
        ]);
    }

    /**
     * The player's own client seed. Kept in the session so a round can be
     * verified later, and re-rollable from the fairness screen.
     */
    private function clientSeed(Request $request): string
    {
        $seed = $request->session()->get('aviator_client_seed');

        if (! is_string($seed) || $seed === '') {
            $seed = CrashEngine::randomHex(8);
            $request->session()->put('aviator_client_seed', $seed);
        }

        return $seed;
    }

    /**
     * @return array<int, array{id: int, crash_at: float}>
     */
    private function history(?int $userId): array
    {
        if ($userId === null) {
            return [];
        }

        return AviatorRound::query()
            ->where('user_id', $userId)
            ->whereNotNull('crashed_at')
            ->latest('id')
            ->limit(24)
            ->get(['id', 'nonce', 'crash_at', 'server_seed_hash'])
            ->map(fn (AviatorRound $r) => [
                'id' => $r->id,
                'nonce' => $r->nonce,
                'crash_at' => (float) $r->crash_at,
            ])
            ->all();
    }
}
