<?php

namespace Tests\Feature;

use App\Models\Setting;
use App\Models\Transaction;
use App\Models\User;
use App\Services\WalletService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * The refer screen has always promised a lifetime commission and counted it
 * out of `rebate` entries. These are the tests for the command that writes
 * them.
 */
class ReferralCommissionTest extends TestCase
{
    use RefreshDatabase;

    private User $referrer;

    private User $referral;

    private WalletService $wallet;

    protected function setUp(): void
    {
        parent::setUp();

        $this->wallet = app(WalletService::class);
        $this->referrer = User::factory()->withBalance(0)->create();
        $this->referral = User::factory()->withBalance(100_000)->create(['referred_by' => $this->referrer->id]);
    }

    /** Play a day for the referred player: staked, and won back. */
    private function play(int $staked, int $won): void
    {
        $this->wallet->apply($this->referral, 'bet', -$staked, 'zeus:1');

        if ($won > 0) {
            $this->wallet->apply($this->referral, 'win', $won, 'zeus:1');
        }

        Transaction::where('user_id', $this->referral->id)
            ->update(['created_at' => now()->subDay()->setTime(14, 0)]);
    }

    public function test_nothing_is_paid_while_the_rate_is_zero(): void
    {
        Setting::put('referral', ['rate_bp' => 0]);
        $this->play(50_000, 10_000);

        $this->artisan('referrals:settle')->assertSuccessful();

        $this->assertSame(0, $this->referrer->wallet->fresh()->balance);
        $this->assertDatabaseCount('transactions', 2);
    }

    public function test_a_referrer_earns_a_share_of_what_their_referral_lost(): void
    {
        Setting::put('referral', ['rate_bp' => 500]);   // 5%
        $this->play(50_000, 10_000);                   // 40,000 lost

        $this->artisan('referrals:settle')->assertSuccessful();

        $this->assertSame(2_000, $this->referrer->wallet->fresh()->balance);
        $this->assertDatabaseHas('transactions', [
            'user_id' => $this->referrer->id,
            'kind' => 'rebate',
            'amount' => 2_000,
            'ref' => 'referral:'.now()->subDay()->toDateString(),
        ]);
    }

    public function test_a_day_the_referral_came_out_ahead_pays_nothing_rather_than_billing_back(): void
    {
        Setting::put('referral', ['rate_bp' => 500]);
        $this->play(50_000, 90_000);   // the player is 40,000 up

        $this->artisan('referrals:settle')->assertSuccessful();

        $this->assertSame(0, $this->referrer->wallet->fresh()->balance);
    }

    public function test_settling_the_same_day_twice_pays_once(): void
    {
        Setting::put('referral', ['rate_bp' => 500]);
        $this->play(50_000, 10_000);

        $this->artisan('referrals:settle')->assertSuccessful();
        $this->artisan('referrals:settle')->assertSuccessful();

        $this->assertSame(2_000, $this->referrer->wallet->fresh()->balance);
        $this->assertSame(1, Transaction::where('kind', 'rebate')->count());
    }

    public function test_a_dry_run_works_the_figure_out_without_moving_money(): void
    {
        Setting::put('referral', ['rate_bp' => 500]);
        $this->play(50_000, 10_000);

        $this->artisan('referrals:settle', ['--dry-run' => true])->assertSuccessful();

        $this->assertSame(0, $this->referrer->wallet->fresh()->balance);
        $this->assertSame(0, Transaction::where('kind', 'rebate')->count());
    }

    public function test_only_the_named_day_is_settled(): void
    {
        Setting::put('referral', ['rate_bp' => 500]);
        $this->play(50_000, 10_000);

        $this->artisan('referrals:settle', ['--date' => now()->subDays(5)->toDateString()])->assertSuccessful();

        $this->assertSame(0, $this->referrer->wallet->fresh()->balance);
    }

    public function test_the_refer_screen_quotes_the_rate_that_is_actually_paid(): void
    {
        Setting::put('referral', ['rate_bp' => 750]);

        $this->actingAs($this->referrer)
            ->get('/refer')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Account/Refer')->where('ratePercent', 7.5));
    }
}
