<?php

namespace Tests\Feature;

use App\Models\Transaction;
use App\Models\User;
use App\Services\WalletService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use RuntimeException;
use Tests\TestCase;

class WalletServiceTest extends TestCase
{
    use RefreshDatabase;

    private WalletService $wallet;

    protected function setUp(): void
    {
        parent::setUp();
        $this->wallet = app(WalletService::class);
    }

    public function test_credit_raises_the_balance_and_writes_a_ledger_entry(): void
    {
        $user = User::factory()->create();

        $balance = $this->wallet->apply($user, 'deposit', 50_000, 'deposit:1');

        $this->assertSame(50_000, $balance);
        $this->assertSame(50_000, $user->wallet->fresh()->balance);
        $this->assertDatabaseHas('transactions', [
            'user_id' => $user->id,
            'kind' => 'deposit',
            'amount' => 50_000,
            'balance_after' => 50_000,
            'ref' => 'deposit:1',
        ]);
    }

    public function test_debit_below_zero_is_refused_and_leaves_no_trace(): void
    {
        $user = User::factory()->withBalance(10_000)->create();

        try {
            $this->wallet->apply($user, 'withdraw', -20_000);
            $this->fail('expected the debit to be refused');
        } catch (RuntimeException) {
            // expected
        }

        $this->assertSame(10_000, $user->wallet->fresh()->balance);
        $this->assertSame(0, Transaction::where('user_id', $user->id)->count());
    }

    public function test_balance_always_equals_the_sum_of_the_ledger(): void
    {
        $user = User::factory()->create();

        $this->wallet->apply($user, 'deposit', 100_000);
        $this->wallet->apply($user, 'bet', -30_000);
        $this->wallet->apply($user, 'win', 45_000);
        $this->wallet->apply($user, 'withdraw', -15_000);

        $this->assertSame(
            (int) Transaction::where('user_id', $user->id)->sum('amount'),
            $user->wallet->fresh()->balance,
        );
    }

    public function test_a_bonus_raises_the_turnover_the_player_must_clear(): void
    {
        $user = User::factory()->create();

        $this->wallet->grantBonus($user, 1_800, 10, 'signup');

        $wallet = $user->wallet->fresh();
        $this->assertSame(1_800, $wallet->balance);
        $this->assertSame(18_000, $wallet->turnover_need);
    }

    public function test_a_wager_counts_towards_the_outstanding_turnover(): void
    {
        $user = User::factory()->withBalance(0)->create();
        $this->wallet->grantBonus($user, 10_000, 10, 'welcome');

        $this->wallet->apply($user, 'bet', -4_000, 'round:1');

        $wallet = $user->wallet->fresh();

        $this->assertSame(100_000, $wallet->turnover_need);
        $this->assertSame(4_000, $wallet->turnover_done);
    }

    /** Clearing the requirement resets it, so the next bonus starts from zero. */
    public function test_clearing_the_turnover_resets_it(): void
    {
        $user = User::factory()->withBalance(200_000)->create();
        $this->wallet->grantBonus($user, 10_000, 2, 'welcome');

        $this->wallet->apply($user, 'bet', -20_000, 'round:1');

        $wallet = $user->wallet->fresh();

        $this->assertSame(0, $wallet->turnover_need);
        $this->assertSame(0, $wallet->turnover_done);
    }

    public function test_a_wager_with_no_bonus_outstanding_records_no_turnover(): void
    {
        $user = User::factory()->withBalance(50_000)->create();

        $this->wallet->apply($user, 'bet', -10_000, 'round:1');

        $wallet = $user->wallet->fresh();

        $this->assertSame(0, $wallet->turnover_need);
        $this->assertSame(0, $wallet->turnover_done);
    }

    public function test_a_deposit_does_not_count_towards_turnover(): void
    {
        $user = User::factory()->withBalance(0)->create();
        $this->wallet->grantBonus($user, 10_000, 10, 'welcome');

        $this->wallet->apply($user, 'deposit', 50_000, 'deposit:1');

        $this->assertSame(0, $user->wallet->fresh()->turnover_done);
    }
}
