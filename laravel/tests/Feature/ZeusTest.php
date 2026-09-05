<?php

namespace Tests\Feature;

use App\Models\Transaction;
use App\Models\User;
use App\Models\ZeusRound;
use App\Models\ZeusSeed;
use App\Support\SlotEngine;
use Database\Seeders\GameSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ZeusTest extends TestCase
{
    use RefreshDatabase;

    private User $player;

    protected function setUp(): void
    {
        parent::setUp();
        $this->player = User::factory()->withBalance(500_000)->create();
    }

    public function test_a_spin_debits_the_stake_pays_the_win_and_counts_the_nonce_up(): void
    {
        $response = $this->actingAs($this->player)
            ->postJson('/game/zeus/spin', ['stake' => 10_000])
            ->assertOk()
            ->assertJsonStructure(['round' => ['base', 'free', 'free_spins', 'win_units'], 'payout', 'balance']);

        $round = ZeusRound::sole();

        $this->assertSame(0, $round->nonce);
        $this->assertSame(10_000, $round->stake);
        $this->assertSame(10_000, $round->cost);
        $this->assertSame((int) floor(10_000 * $round->win_units), $round->payout);

        // the next spin must not replay this one
        $this->assertSame(1, ZeusSeed::sole()->nonce);

        $this->assertSame(500_000 - 10_000 + $round->payout, $this->player->wallet->fresh()->balance);
        $this->assertSame($this->player->wallet->fresh()->balance, $response->json('balance'));
    }

    public function test_the_ledger_records_the_stake_and_any_win_against_the_round(): void
    {
        $this->actingAs($this->player)->postJson('/game/zeus/spin', ['stake' => 10_000])->assertOk();

        $round = ZeusRound::sole();

        $this->assertDatabaseHas('transactions', [
            'user_id' => $this->player->id,
            'kind' => 'bet',
            'amount' => -10_000,
            'ref' => "zeus:{$round->id}",
        ]);

        $wins = Transaction::where('kind', 'win')->where('ref', "zeus:{$round->id}")->sum('amount');
        $this->assertSame($round->payout, (int) $wins);

        // the wallet moved by exactly what the round wrote to the ledger, and
        // by nothing else (the factory seeds the balance without a ledger row,
        // so the delta is what can be checked here, not the absolute sum)
        $ledger = (int) Transaction::where('ref', "zeus:{$round->id}")->sum('amount');
        $this->assertSame(500_000 + $ledger, $this->player->wallet->fresh()->balance);
    }

    public function test_the_server_seed_never_reaches_a_player_still_spinning_against_it(): void
    {
        $this->actingAs($this->player)->postJson('/game/zeus/spin', ['stake' => 10_000])->assertOk();

        $seed = ZeusSeed::sole();

        $page = $this->actingAs($this->player)->get('/game/zeus')->assertOk();

        $this->assertStringNotContainsString($seed->server_seed, $page->getContent());
        $this->assertStringContainsString($seed->server_seed_hash, $page->getContent());
    }

    public function test_buying_the_free_spins_costs_a_hundred_stakes_and_skips_the_paid_spin(): void
    {
        $this->actingAs($this->player)
            ->postJson('/game/zeus/spin', ['stake' => 1_000, 'buy' => true])
            ->assertOk()
            ->assertJsonPath('round.base', null)
            ->assertJsonPath('cost', 1_000 * SlotEngine::BUY_COST);

        $round = ZeusRound::sole();

        $this->assertTrue($round->bought);
        $this->assertGreaterThanOrEqual(SlotEngine::FREE_SPINS, $round->free_spins);
        $this->assertSame(500_000 - 100_000 + $round->payout, $this->player->wallet->fresh()->balance);
    }

    public function test_a_spin_beyond_the_balance_is_refused_and_charges_nothing(): void
    {
        $poor = User::factory()->withBalance(5_000)->create();

        $this->actingAs($poor)
            ->postJson('/game/zeus/spin', ['stake' => 10_000])
            ->assertStatus(422);

        $this->assertSame(5_000, $poor->wallet->fresh()->balance);
        $this->assertDatabaseCount('zeus_rounds', 0);
        $this->assertDatabaseCount('zeus_seeds', 0);
    }

    public function test_a_buy_beyond_the_balance_is_refused(): void
    {
        $this->actingAs($this->player)
            ->postJson('/game/zeus/spin', ['stake' => 10_000, 'buy' => true])
            ->assertStatus(422);

        $this->assertSame(500_000, $this->player->wallet->fresh()->balance);
        $this->assertDatabaseCount('zeus_rounds', 0);
    }

    public function test_the_stake_is_held_between_its_bounds(): void
    {
        $this->actingAs($this->player)
            ->postJson('/game/zeus/spin', ['stake' => 100])
            ->assertStatus(422)
            ->assertJsonValidationErrors('stake');

        $this->actingAs($this->player)
            ->postJson('/game/zeus/spin', ['stake' => 900_000])
            ->assertStatus(422)
            ->assertJsonValidationErrors('stake');

        $this->assertSame(500_000, $this->player->wallet->fresh()->balance);
    }

    public function test_a_signed_out_visitor_spins_a_demo_that_touches_no_wallet(): void
    {
        $this->postJson('/game/zeus/spin', ['stake' => 10_000])
            ->assertOk()
            ->assertJsonPath('demo', true)
            ->assertJsonPath('payout', 0);

        $this->assertDatabaseCount('zeus_rounds', 0);
        $this->assertDatabaseCount('zeus_seeds', 0);
        $this->assertDatabaseCount('transactions', 0);
    }

    public function test_retiring_a_pair_publishes_the_seed_and_commits_a_fresh_one(): void
    {
        $this->actingAs($this->player)->postJson('/game/zeus/spin', ['stake' => 10_000])->assertOk();

        $old = ZeusSeed::sole();

        $this->actingAs($this->player)
            ->postJson('/game/zeus/seed', ['client_seed' => 'my-own-seed'])
            ->assertOk()
            ->assertJsonPath('revealed.server_seed', $old->server_seed)
            ->assertJsonPath('revealed.spins', 1)
            ->assertJsonPath('seed.client_seed', 'my-own-seed')
            ->assertJsonPath('seed.nonce', 0);

        $this->assertNotNull($old->fresh()->revealed_at);

        // a retired pair is never played again
        $this->actingAs($this->player)->postJson('/game/zeus/spin', ['stake' => 10_000])->assertOk();
        $this->assertSame(1, $old->fresh()->nonce);
        $this->assertSame(2, ZeusSeed::count());
    }

    public function test_a_published_seed_replays_the_round_the_player_was_paid_for(): void
    {
        // spin until one pays, so the replay is checked against a real payout
        // rather than against a nil result any seed would reproduce
        for ($i = 0; $i < 40 && ZeusRound::where('payout', '>', 0)->doesntExist(); $i++) {
            $this->actingAs($this->player)->postJson('/game/zeus/spin', ['stake' => 1_000])->assertOk();
        }

        $seed = ZeusSeed::sole();
        $round = ZeusRound::where('payout', '>', 0)->latest('id')->firstOrFail();

        $replay = $this->actingAs($this->player)
            ->postJson('/game/zeus/verify', [
                'server_seed' => $seed->server_seed,
                'client_seed' => $seed->client_seed,
                'nonce' => $round->nonce,
            ])
            ->assertOk()
            ->assertJsonPath('server_seed_hash', $seed->server_seed_hash);

        $this->assertSame($round->win_units, (float) $replay->json('win_units'));
        $this->assertSame($round->payout, (int) floor($round->stake * (float) $replay->json('win_units')));

        // a neighbouring nonce is a different round, or the nonce is doing nothing
        $other = $this->actingAs($this->player)
            ->postJson('/game/zeus/verify', [
                'server_seed' => $seed->server_seed,
                'client_seed' => $seed->client_seed,
                'nonce' => $round->nonce + 1_000,
            ])
            ->assertOk();

        $this->assertNotSame($replay->json('round'), $other->json('round'));
    }

    public function test_the_lobby_sends_the_game_to_its_own_table(): void
    {
        $this->seed(GameSeeder::class);

        $this->get('/casino/zeus-gate')->assertRedirect(route('zeus'));
        $this->get('/game/zeus')->assertOk();
    }
}
