<?php

namespace Tests\Feature;

use App\Models\Deposit;
use App\Models\PaymentChannel;
use App\Models\Promotion;
use App\Models\Setting;
use App\Models\User;
use App\Models\ZeusRound;
use App\Models\ZeusSeed;
use App\Services\WalletService;
use Database\Seeders\PaymentChannelSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * The screens an operator actually runs the site from.
 *
 * Everything here was reachable only through the database before: a player's
 * full history, the offers on the promotions page, a cashier channel, and the
 * bonus the site hands out on sign-up.
 */
class AdminOperationsTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->admin()->create();
    }

    /* ---------------- the player screen ---------------- */

    public function test_the_player_screen_totals_what_the_site_took_off_them(): void
    {
        $player = User::factory()->withBalance(0)->create();
        $wallet = app(WalletService::class);

        $wallet->apply($player, 'deposit', 100_000, 'deposit:1');
        $wallet->apply($player, 'bet', -30_000, 'zeus:1');
        $wallet->apply($player, 'win', 12_000, 'zeus:1');

        $this->actingAs($this->admin)
            ->get("/admin/users/{$player->id}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/UserDetail')
                ->where('totals.deposited', 100_000)
                ->where('totals.staked', 30_000)
                ->where('totals.won', 12_000)
                ->where('totals.ggr', 18_000)
                ->where('wallet.balance', 82_000));
    }

    public function test_the_player_screen_lists_rounds_from_every_engine(): void
    {
        $player = User::factory()->withBalance(500_000)->create();

        $this->actingAs($player)->postJson('/game/zeus/spin', ['stake' => 10_000])->assertOk();
        $this->actingAs($player)->postJson('/game/aviator/rounds', [
            'seats' => [['seat' => 0, 'stake' => 10_000, 'auto_at' => null]],
        ])->assertOk();

        $this->actingAs($this->admin)
            ->get("/admin/users/{$player->id}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page->has('rounds', 2));
    }

    public function test_a_granted_bonus_carries_the_turnover_that_holds_it(): void
    {
        $player = User::factory()->withBalance(0)->create();

        $this->actingAs($this->admin)
            ->post("/admin/users/{$player->id}/bonus", [
                'amount' => 500,
                'turnover_multiplier' => 8,
                'note' => 'ঈদ অফার',
            ])
            ->assertRedirect();

        $wallet = $player->wallet()->firstOrFail();

        $this->assertSame(50_000, $wallet->balance);
        $this->assertSame(50_000 * 8, $wallet->turnover_need);

        // and the player cannot simply walk out with it
        $this->assertDatabaseHas('admin_actions', [
            'action' => 'user.bonus',
            'target_user_id' => $player->id,
            'amount' => 50_000,
        ]);
    }

    public function test_a_bonus_needs_a_reason(): void
    {
        $player = User::factory()->withBalance(0)->create();

        $this->actingAs($this->admin)
            ->post("/admin/users/{$player->id}/bonus", ['amount' => 500, 'turnover_multiplier' => 8])
            ->assertSessionHasErrors('note');

        $this->assertSame(0, $player->wallet()->firstOrFail()->balance);
        $this->assertSame(0, $player->wallet()->firstOrFail()->turnover_need);
    }

    /* ---------------- promotions ---------------- */

    public function test_promotions_can_be_added_edited_and_removed(): void
    {
        $this->actingAs($this->admin)
            ->post('/admin/promotions', [
                'id' => 'welcome-100',
                'title' => 'প্রথম ডিপোজিটে ১০০%',
                'body' => 'সর্বোচ্চ ৳৫,০০০ পর্যন্ত',
                'is_active' => true,
                'sort_order' => 1,
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('promotions', ['id' => 'welcome-100']);

        $this->actingAs($this->admin)
            ->patch('/admin/promotions/welcome-100', [
                'title' => 'প্রথম ডিপোজিটে ২০০%',
                'body' => 'সর্বোচ্চ ৳১০,০০০ পর্যন্ত',
                'is_active' => false,
                'sort_order' => 2,
            ])
            ->assertRedirect();

        $promotion = Promotion::findOrFail('welcome-100');
        $this->assertSame('প্রথম ডিপোজিটে ২০০%', $promotion->title);
        $this->assertFalse($promotion->is_active);

        $this->actingAs($this->admin)->delete('/admin/promotions/welcome-100')->assertRedirect();
        $this->assertDatabaseMissing('promotions', ['id' => 'welcome-100']);
    }

    public function test_a_promotion_id_is_not_rewritten_by_an_edit(): void
    {
        Promotion::create(['id' => 'keep-me', 'title' => 'ক', 'body' => 'খ']);

        $this->actingAs($this->admin)
            ->patch('/admin/promotions/keep-me', ['id' => 'renamed', 'title' => 'গ', 'body' => 'ঘ'])
            ->assertRedirect();

        $this->assertDatabaseHas('promotions', ['id' => 'keep-me', 'title' => 'গ']);
        $this->assertDatabaseMissing('promotions', ['id' => 'renamed']);
    }

    /* ---------------- cashier channels ---------------- */

    public function test_a_channel_can_be_added_from_the_panel(): void
    {
        $this->actingAs($this->admin)
            ->post('/admin/settings/channels', [
                'id' => 'tap',
                'name' => 'TAP',
                'kind' => 'mobile',
                'account_no' => '01711111111',
                'min_amount' => 300,
                'max_amount' => 30000,
                'supports_deposit' => true,
                'supports_withdraw' => true,
                'is_active' => true,
            ])
            ->assertRedirect();

        $channel = PaymentChannel::findOrFail('tap');

        // taka in, paisa stored
        $this->assertSame(30_000, $channel->min_amount);
        $this->assertSame(3_000_000, $channel->max_amount);
    }

    public function test_a_channel_that_has_taken_money_cannot_be_deleted(): void
    {
        $this->seed(PaymentChannelSeeder::class);

        $player = User::factory()->create();
        Deposit::create([
            'user_id' => $player->id,
            'channel_id' => 'bkash',
            'amount' => 50_000,
            'state' => 'pending',
        ]);

        $this->actingAs($this->admin)->delete('/admin/settings/channels/bkash')->assertRedirect();
        $this->assertDatabaseHas('payment_channels', ['id' => 'bkash']);

        // one with no history goes
        $this->actingAs($this->admin)->delete('/admin/settings/channels/usdt')->assertRedirect();
        $this->assertDatabaseMissing('payment_channels', ['id' => 'usdt']);
    }

    /* ---------------- bonus settings ---------------- */

    public function test_the_signup_bonus_set_here_is_what_a_new_player_receives(): void
    {
        $this->actingAs($this->admin)
            ->patch('/admin/settings/bonus', [
                'signup_amount' => 200,
                'signup_turnover' => 5,
                'checkin_amount' => 10,
                'checkin_turnover' => 12,
                'referral_rate' => 0,
            ])
            ->assertRedirect();

        $this->assertSame(
            ['amount' => 20_000, 'turnover_multiplier' => 5],
            Setting::get('signup_bonus'),
        );

        // /register is behind the guest middleware, and the admin above is
        // still signed into this session
        $this->post('/logout');

        $this->post('/register', [
            'phone' => '01712345678',
            'password' => 'secret-pass',
            'password_confirmation' => 'secret-pass',
        ])->assertRedirect();

        $player = User::where('phone', '01712345678')->sole();
        $wallet = $player->wallet()->firstOrFail();

        $this->assertSame(20_000, $wallet->balance);
        $this->assertSame(100_000, $wallet->turnover_need);
    }

    /* ---------------- bets and reports ---------------- */

    public function test_the_bets_screen_totals_both_engines_and_filters_to_one(): void
    {
        $player = User::factory()->withBalance(500_000)->create();

        $this->actingAs($player)->postJson('/game/zeus/spin', ['stake' => 10_000])->assertOk();
        $this->actingAs($player)->postJson('/game/aviator/rounds', [
            'seats' => [['seat' => 0, 'stake' => 20_000, 'auto_at' => null]],
        ])->assertOk();

        $paid = (int) ZeusRound::sum('payout');

        $this->actingAs($this->admin)
            ->get('/admin/bets')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Bets')
                ->where('totals.rounds', 2)
                ->where('totals.staked', 30_000)
                ->where('totals.paid', $paid));

        $this->actingAs($this->admin)
            ->get('/admin/bets?game=zeus')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('totals.rounds', 1)->where('totals.staked', 10_000));
    }

    public function test_the_report_counts_a_day_of_play(): void
    {
        $player = User::factory()->withBalance(500_000)->create();
        $this->actingAs($player)->postJson('/game/zeus/spin', ['stake' => 10_000])->assertOk();

        $this->actingAs($this->admin)
            ->get('/admin/reports?days=7')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Reports')
                ->has('rows', 7)
                ->where('totals.staked', 10_000)
                ->where('rows.0.date', now()->toDateString()));
    }

    public function test_a_retired_seed_leaves_its_rounds_visible_to_the_admin(): void
    {
        $player = User::factory()->withBalance(500_000)->create();

        $this->actingAs($player)->postJson('/game/zeus/spin', ['stake' => 10_000])->assertOk();
        $this->actingAs($player)->postJson('/game/zeus/seed', [])->assertOk();

        $this->assertSame(1, ZeusRound::count());
        $this->assertNotNull(ZeusSeed::whereNotNull('revealed_at')->first());

        $this->actingAs($this->admin)
            ->get('/admin/bets')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('totals.rounds', 1));
    }
}
