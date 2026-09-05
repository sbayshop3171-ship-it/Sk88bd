<?php

namespace Tests\Feature;

use App\Models\AviatorBet;
use App\Models\AviatorRound;
use App\Models\User;
use App\Support\CrashEngine;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class AviatorTest extends TestCase
{
    use RefreshDatabase;

    private User $player;

    protected function setUp(): void
    {
        parent::setUp();
        $this->player = User::factory()->withBalance(500_000)->create();
    }

    public function test_opening_a_round_debits_the_stakes_and_commits_only_the_hash(): void
    {
        $response = $this->actingAs($this->player)
            ->postJson('/game/aviator/rounds', [
                'seats' => [['seat' => 0, 'stake' => 10_000, 'auto_at' => null]],
            ])
            ->assertOk()
            ->assertJsonStructure(['round_id', 'nonce', 'server_seed_hash', 'starts_at', 'server_now', 'balance']);

        // the seed itself must never ride along while the round is in the air
        $response->assertJsonMissing(['server_seed']);
        $this->assertArrayNotHasKey('crash_at', $response->json());

        $this->assertSame(490_000, $this->player->wallet->fresh()->balance);
        $this->assertDatabaseHas('aviator_bets', [
            'user_id' => $this->player->id,
            'seat' => 0,
            'stake' => 10_000,
        ]);
    }

    public function test_a_round_cannot_be_opened_for_more_than_the_balance(): void
    {
        $this->actingAs($this->player)
            ->postJson('/game/aviator/rounds', [
                'seats' => [['seat' => 0, 'stake' => 900_000, 'auto_at' => null]],
            ])
            ->assertStatus(422);

        $this->assertSame(500_000, $this->player->wallet->fresh()->balance);
        $this->assertDatabaseCount('aviator_rounds', 0);
    }

    /**
     * A signed-in player who stakes nothing watches the round instead — the
     * client draws it locally. If the request ever does arrive, it must come
     * back in Bangla rather than as a raw English validation string.
     */
    public function test_opening_a_round_with_no_seats_is_refused_in_bangla(): void
    {
        $this->actingAs($this->player)
            ->postJson('/game/aviator/rounds', ['seats' => []])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['seats' => 'বেট না দিয়ে রাউন্ড শুরু করা যায় না']);

        $this->assertDatabaseCount('aviator_rounds', 0);
        $this->assertSame(500_000, $this->player->wallet->fresh()->balance);
    }

    public function test_a_stake_below_the_minimum_is_refused_in_bangla(): void
    {
        $this->actingAs($this->player)
            ->postJson('/game/aviator/rounds', [
                'seats' => [['seat' => 0, 'stake' => 1, 'auto_at' => null]],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['seats.0.stake' => 'সর্বনিম্ন বেট ৳10']);

        $this->assertDatabaseCount('aviator_rounds', 0);
    }

    public function test_a_guest_cannot_open_a_round(): void
    {
        $this->postJson('/game/aviator/rounds', [
            'seats' => [['seat' => 0, 'stake' => 10_000, 'auto_at' => null]],
        ])->assertUnauthorized();
    }

    public function test_cashing_out_mid_flight_pays_the_servers_own_multiplier(): void
    {
        $round = $this->openRound(crashAt: 5.0, stake: 10_000);

        // 11.09s of flight is 2.00x. The extra tick matters: the payout
        // multiplier is floored to two places, so landing exactly on the
        // boundary prices at 1.99x.
        Carbon::setTestNow($round->started_at->copy()->addMilliseconds((int) ceil(CrashEngine::timeToReach(2.0)) + 5));

        $response = $this->actingAs($this->player)
            ->postJson("/game/aviator/rounds/{$round->id}/cash-out", ['seat' => 0])
            ->assertOk();

        $this->assertTrue($response->json('ok'));
        $this->assertSame(2.0, (float) $response->json('multiplier'));
        $this->assertSame(20_000, $response->json('payout'));

        // 500,000 - 10,000 staked + 20,000 won
        $this->assertSame(510_000, $this->player->wallet->fresh()->balance);
    }

    public function test_cashing_out_after_the_crash_pays_nothing(): void
    {
        $round = $this->openRound(crashAt: 2.0, stake: 10_000);

        Carbon::setTestNow($round->started_at->copy()->addMilliseconds((int) CrashEngine::timeToReach(3.0)));

        $this->actingAs($this->player)
            ->postJson("/game/aviator/rounds/{$round->id}/cash-out", ['seat' => 0])
            ->assertStatus(422);

        $this->assertSame(490_000, $this->player->wallet->fresh()->balance);
        $this->assertNull(AviatorBet::where('round_id', $round->id)->value('cashed_at'));
    }

    public function test_a_seat_cannot_cash_out_twice(): void
    {
        $round = $this->openRound(crashAt: 9.0, stake: 10_000);

        Carbon::setTestNow($round->started_at->copy()->addMilliseconds((int) ceil(CrashEngine::timeToReach(2.0)) + 5));

        $this->actingAs($this->player)->postJson("/game/aviator/rounds/{$round->id}/cash-out", ['seat' => 0])->assertOk();
        $this->actingAs($this->player)->postJson("/game/aviator/rounds/{$round->id}/cash-out", ['seat' => 0])->assertStatus(422);

        $this->assertSame(510_000, $this->player->wallet->fresh()->balance);
    }

    public function test_another_player_cannot_cash_out_someone_elses_round(): void
    {
        $round = $this->openRound(crashAt: 9.0, stake: 10_000);
        $intruder = User::factory()->withBalance(0)->create();

        Carbon::setTestNow($round->started_at->copy()->addMilliseconds(2000));

        $this->actingAs($intruder)
            ->postJson("/game/aviator/rounds/{$round->id}/cash-out", ['seat' => 0])
            ->assertForbidden();
    }

    public function test_the_seed_stays_hidden_until_the_aircraft_could_have_crashed(): void
    {
        $round = $this->openRound(crashAt: 5.0, stake: 10_000);

        Carbon::setTestNow($round->started_at->copy()->addMilliseconds(500));

        $this->actingAs($this->player)
            ->postJson("/game/aviator/rounds/{$round->id}/settle")
            ->assertStatus(422);

        $this->assertNull($round->fresh()->crashed_at);
    }

    public function test_settling_publishes_the_seed_and_the_crash_point(): void
    {
        $round = $this->openRound(crashAt: 3.0, stake: 10_000);

        Carbon::setTestNow($round->started_at->copy()->addMilliseconds((int) CrashEngine::timeToReach(3.0) + 10));

        $response = $this->actingAs($this->player)
            ->postJson("/game/aviator/rounds/{$round->id}/settle")
            ->assertOk();

        $this->assertSame($round->server_seed, $response->json('server_seed'));
        $this->assertSame(3.0, (float) $response->json('crash_at'));
        $this->assertNotNull($round->fresh()->crashed_at);

        // and the published seed really does hash to the committed hash
        $this->assertSame(
            $round->server_seed_hash,
            CrashEngine::hash($response->json('server_seed')),
        );
    }

    public function test_the_verifier_reproduces_a_rounds_crash_point(): void
    {
        $serverSeed = CrashEngine::randomHex();
        $expected = CrashEngine::crashFromHash(CrashEngine::hash("{$serverSeed}:player-seed:7"));

        $this->postJson('/game/aviator/verify', [
            'server_seed' => $serverSeed,
            'client_seed' => 'player-seed',
            'nonce' => 7,
        ])
            ->assertOk()
            ->assertJson([
                'server_seed_hash' => CrashEngine::hash($serverSeed),
                'crash_at' => $expected,
            ]);
    }

    public function test_the_play_screen_never_ships_a_seed_or_a_crash_point(): void
    {
        $this->actingAs($this->player)
            ->get('/game/aviator')
            ->assertInertia(fn ($page) => $page
                ->component('Game/Aviator/Play')
                ->has('clientSeed')
                ->missing('serverSeed')
                ->missing('crashAt'));
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    /** Open a round, then force its crash point so the assertions are exact. */
    private function openRound(float $crashAt, int $stake): AviatorRound
    {
        $this->actingAs($this->player)->postJson('/game/aviator/rounds', [
            'seats' => [['seat' => 0, 'stake' => $stake, 'auto_at' => null]],
        ])->assertOk();

        $round = AviatorRound::latest('id')->firstOrFail();
        $round->forceFill(['crash_at' => $crashAt])->save();

        return $round->fresh();
    }
}
