<?php

namespace App\Http\Controllers;

use App\Models\ZeusRound;
use App\Models\ZeusSeed;
use App\Services\WalletService;
use App\Support\SlotEngine;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Zeus Gate.
 *
 * The browser is a projector: it plays back the drops, tumbles and free spins
 * that {@see SlotEngine} already resolved here, and can change none of them.
 * A tampered client can therefore show a player a win it will never be paid.
 *
 * Fairness is a committed seed pair rather than a per-round reveal. A slot
 * answers instantly, so revealing the seed with the result would prove
 * nothing — the server would have seen the stake first. Instead the player
 * holds the hash of a server seed before their first spin, every spin counts
 * the nonce up, and the seed is published when they retire the pair, letting
 * them replay the whole series at once.
 *
 * Signed out, the page still spins: the round is resolved off a throwaway seed
 * and never touches a wallet or the tables, which is the free-play demo the
 * lobby links to.
 */
class ZeusController extends Controller
{
    /** Per-spin stake bounds, in paisa. */
    private const MIN_STAKE = 1000;

    private const MAX_STAKE = 200000;

    public function __construct(private readonly WalletService $wallet) {}

    public function play(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('Game/Zeus/Play', [
            'rules' => SlotEngine::rules(),
            'minStake' => self::MIN_STAKE,
            'maxStake' => self::MAX_STAKE,
            'seed' => $user ? $this->commitment($this->activeSeed($user->id)) : null,
            'history' => $this->history($user?->id),
        ]);
    }

    public function fairness(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('Game/Zeus/Fairness', [
            'rules' => SlotEngine::rules(),
            'seed' => $user ? $this->commitment($this->activeSeed($user->id)) : null,
            'revealed' => $user ? $this->revealed($user->id) : [],
        ]);
    }

    /**
     * Play one round.
     *
     * The stake buys a spin, or a hundred stakes buy the free spins outright.
     * Both are taken before the reels are read and the win is paid after, in
     * one transaction, so a round can never be half-charged.
     */
    public function spin(Request $request): JsonResponse
    {
        $data = $request->validate([
            'stake' => ['required', 'integer', 'min:'.self::MIN_STAKE, 'max:'.self::MAX_STAKE],
            'buy' => ['nullable', 'boolean'],
        ], [
            'stake.min' => 'সর্বনিম্ন বেট ৳'.number_format(self::MIN_STAKE / 100),
            'stake.max' => 'সর্বোচ্চ বেট ৳'.number_format(self::MAX_STAKE / 100),
        ]);

        $stake = (int) $data['stake'];
        $bought = (bool) ($data['buy'] ?? false);
        $user = $request->user();

        if ($user === null) {
            return response()->json([
                'demo' => true,
                'round' => SlotEngine::spin(SlotEngine::randomHex(), 'demo', random_int(0, 1 << 30), $bought),
                'stake' => $stake,
                'payout' => 0,
            ]);
        }

        $cost = $bought ? $stake * SlotEngine::BUY_COST : $stake;

        if ($cost > $this->wallet->balanceOf($user)) {
            return response()->json([
                'message' => $bought
                    ? 'ফ্রি স্পিন কিনতে ৳'.number_format($cost / 100).' লাগবে'
                    : 'ব্যালেন্স যথেষ্ট নয়',
            ], 422);
        }

        $played = DB::transaction(function () use ($user, $stake, $cost, $bought): array {
            $seed = $this->activeSeed($user->id, lock: true);
            $nonce = $seed->nonce;

            $result = SlotEngine::spin($seed->server_seed, $seed->client_seed, $nonce, $bought);
            $payout = (int) floor($stake * $result['win_units']);

            $seed->increment('nonce');

            $round = ZeusRound::create([
                'seed_id' => $seed->id,
                'user_id' => $user->id,
                'nonce' => $nonce,
                'stake' => $stake,
                'cost' => $cost,
                'bought' => $bought,
                'win_units' => $result['win_units'],
                'payout' => $payout,
                'free_spins' => $result['free_spins'],
            ]);

            $this->wallet->apply($user, 'bet', -$cost, "zeus:{$round->id}");

            if ($payout > 0) {
                $this->wallet->apply($user, 'win', $payout, "zeus:{$round->id}");
            }

            return ['round' => $round, 'result' => $result, 'nonce' => $nonce];
        });

        return response()->json([
            'demo' => false,
            'round' => $played['result'],
            'round_id' => $played['round']->id,
            'nonce' => $played['nonce'],
            'stake' => $stake,
            'cost' => $cost,
            'payout' => $played['round']->payout,
            'balance' => $this->wallet->balanceOf($user),
        ]);
    }

    /**
     * Retire the seed pair and commit a fresh one.
     *
     * The old server seed is published here and its rounds become checkable.
     * The player may name the client seed that goes into the next pair, which
     * is what stops the server choosing both halves of the draw.
     */
    public function rotate(Request $request): JsonResponse
    {
        $data = $request->validate([
            'client_seed' => ['nullable', 'string', 'max:64', 'regex:/^[A-Za-z0-9_-]*$/'],
        ], [
            'client_seed.regex' => 'ক্লায়েন্ট সিডে শুধু অক্ষর, সংখ্যা, - আর _ চলবে',
        ]);

        $user = $request->user();

        $next = DB::transaction(function () use ($user, $data): array {
            $old = $this->activeSeed($user->id, lock: true);
            $old->update(['revealed_at' => now()]);

            $fresh = $this->newSeed($user->id, ($data['client_seed'] ?? '') ?: null);

            return [
                'revealed' => [
                    'server_seed' => $old->server_seed,
                    'server_seed_hash' => $old->server_seed_hash,
                    'client_seed' => $old->client_seed,
                    'spins' => $old->nonce,
                ],
                'seed' => $this->commitment($fresh),
            ];
        });

        return response()->json($next);
    }

    /** Re-derive a round from a published seed and say what it paid. */
    public function verify(Request $request): JsonResponse
    {
        $data = $request->validate([
            'server_seed' => ['required', 'string', 'max:128'],
            'client_seed' => ['required', 'string', 'max:128'],
            'nonce' => ['required', 'integer', 'min:0'],
            'buy' => ['nullable', 'boolean'],
        ], [
            'server_seed.required' => 'সার্ভার সিড ও ক্লায়েন্ট সিড দুটোই দিন',
            'client_seed.required' => 'সার্ভার সিড ও ক্লায়েন্ট সিড দুটোই দিন',
        ]);

        $result = SlotEngine::spin(
            $data['server_seed'],
            $data['client_seed'],
            (int) $data['nonce'],
            (bool) ($data['buy'] ?? false),
        );

        return response()->json([
            'server_seed_hash' => SlotEngine::hash($data['server_seed']),
            'win_units' => $result['win_units'],
            'free_spins' => $result['free_spins'],
            'round' => $result,
        ]);
    }

    /**
     * The pair the player is spinning against, creating one on first sight.
     *
     * `lock` is for the spin path, where two requests racing would otherwise
     * hand out the same nonce twice and pay the same grid twice.
     */
    private function activeSeed(int $userId, bool $lock = false): ZeusSeed
    {
        $query = ZeusSeed::query()->where('user_id', $userId)->whereNull('revealed_at');

        if ($lock) {
            $query->lockForUpdate();
        }

        return $query->latest('id')->first() ?? $this->newSeed($userId);
    }

    private function newSeed(int $userId, ?string $clientSeed = null): ZeusSeed
    {
        $serverSeed = SlotEngine::randomHex();

        return ZeusSeed::create([
            'user_id' => $userId,
            'server_seed' => $serverSeed,
            'server_seed_hash' => SlotEngine::hash($serverSeed),
            'client_seed' => $clientSeed ?? SlotEngine::randomHex(8),
            'nonce' => 0,
        ]);
    }

    /**
     * What the player may see of a pair still in use: everything but the seed.
     *
     * @return array{server_seed_hash: string, client_seed: string, nonce: int}
     */
    private function commitment(ZeusSeed $seed): array
    {
        return [
            'server_seed_hash' => $seed->server_seed_hash,
            'client_seed' => $seed->client_seed,
            'nonce' => $seed->nonce,
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function revealed(int $userId): array
    {
        return ZeusSeed::query()
            ->where('user_id', $userId)
            ->whereNotNull('revealed_at')
            ->latest('revealed_at')
            ->limit(10)
            ->get()
            ->map(fn (ZeusSeed $s) => [
                'server_seed' => $s->server_seed,
                'server_seed_hash' => $s->server_seed_hash,
                'client_seed' => $s->client_seed,
                'spins' => $s->nonce,
                'revealed_at' => $s->revealed_at?->toDateTimeString(),
            ])
            ->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function history(?int $userId): array
    {
        if ($userId === null) {
            return [];
        }

        return ZeusRound::query()
            ->where('user_id', $userId)
            ->latest('id')
            ->limit(20)
            ->get(['id', 'nonce', 'stake', 'cost', 'bought', 'win_units', 'payout', 'free_spins'])
            ->map(fn (ZeusRound $r) => [
                'id' => $r->id,
                'nonce' => $r->nonce,
                'stake' => $r->stake,
                'cost' => $r->cost,
                'bought' => $r->bought,
                'win_units' => $r->win_units,
                'payout' => $r->payout,
                'free_spins' => $r->free_spins,
            ])
            ->all();
    }
}
