<?php

namespace Tests\Feature;

use App\Models\AdminAction;
use App\Models\Deposit;
use App\Models\PaymentChannel;
use App\Models\User;
use App\Models\Withdrawal;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Every admin action that can move money has to be traceable back to the admin
 * who took it, so these assert the audit row as well as the effect.
 */
class AdminAuditTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private User $player;

    protected function setUp(): void
    {
        parent::setUp();

        PaymentChannel::create(['id' => 'bkash', 'name' => 'bKash']);

        $this->admin = User::factory()->admin()->create();
        $this->player = User::factory()->withBalance(500_000)->create();
    }

    public function test_approving_a_deposit_is_recorded(): void
    {
        $deposit = Deposit::create([
            'user_id' => $this->player->id,
            'channel_id' => 'bkash',
            'amount' => 100_000,
        ]);

        $this->actingAs($this->admin)
            ->patch("/admin/deposits/{$deposit->id}", ['state' => 'approved', 'admin_note' => 'ok']);

        $this->assertDatabaseHas('admin_actions', [
            'admin_id' => $this->admin->id,
            'action' => 'deposit.approved',
            'subject_type' => 'deposit',
            'subject_id' => (string) $deposit->id,
            'target_user_id' => $this->player->id,
            'amount' => 100_000,
            'note' => 'ok',
        ]);
    }

    public function test_rejecting_a_deposit_is_recorded_without_an_amount(): void
    {
        $deposit = Deposit::create([
            'user_id' => $this->player->id,
            'channel_id' => 'bkash',
            'amount' => 100_000,
        ]);

        $this->actingAs($this->admin)
            ->patch("/admin/deposits/{$deposit->id}", ['state' => 'rejected']);

        $action = AdminAction::where('action', 'deposit.rejected')->firstOrFail();

        $this->assertSame($this->admin->id, $action->admin_id);
        $this->assertNull($action->amount);
    }

    public function test_approving_a_withdrawal_records_a_negative_amount(): void
    {
        $withdrawal = Withdrawal::create([
            'user_id' => $this->player->id,
            'channel_id' => 'bkash',
            'amount' => 200_000,
            'account_no' => '01712345678',
        ]);

        $this->actingAs($this->admin)
            ->patch("/admin/withdrawals/{$withdrawal->id}", ['state' => 'approved']);

        $this->assertDatabaseHas('admin_actions', [
            'action' => 'withdrawal.approved',
            'target_user_id' => $this->player->id,
            'amount' => -200_000,
        ]);
    }

    /** A refused withdrawal never reached the wallet, so it leaves no audit row. */
    public function test_a_withdrawal_that_fails_leaves_no_audit_row(): void
    {
        $withdrawal = Withdrawal::create([
            'user_id' => $this->player->id,
            'channel_id' => 'bkash',
            'amount' => 900_000,
            'account_no' => '01712345678',
        ]);

        $this->actingAs($this->admin)
            ->patch("/admin/withdrawals/{$withdrawal->id}", ['state' => 'approved']);

        $this->assertDatabaseCount('admin_actions', 0);
    }

    public function test_a_balance_adjustment_records_the_reason(): void
    {
        $this->actingAs($this->admin)
            ->post("/admin/users/{$this->player->id}/adjust", [
                'amount' => -250,
                'note' => 'ডুপ্লিকেট ডিপোজিট ফেরত',
            ]);

        $this->assertDatabaseHas('admin_actions', [
            'action' => 'user.adjust',
            'target_user_id' => $this->player->id,
            'amount' => -25_000,
            'note' => 'ডুপ্লিকেট ডিপোজিট ফেরত',
        ]);
    }

    public function test_changing_a_receiving_number_is_recorded_with_both_values(): void
    {
        $this->actingAs($this->admin)->patch('/admin/settings/channels/bkash', [
            'account_no' => '01999888777',
            'account_name' => 'Operator Ltd',
            'min_amount' => 300,
            'max_amount' => 30000,
        ]);

        $action = AdminAction::where('action', 'channel.update')->firstOrFail();

        $this->assertStringContainsString('01999888777', (string) $action->note);
        $this->assertSame('bkash', $action->subject_id);
    }

    public function test_the_audit_screen_lists_what_happened(): void
    {
        $this->actingAs($this->admin)
            ->post("/admin/users/{$this->player->id}/adjust", ['amount' => 100, 'note' => 'গুডউইল']);

        $this->actingAs($this->admin)
            ->get('/admin/audit')
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Audit')
                ->where('rows.data.0.action', 'user.adjust')
                ->where('rows.data.0.note', 'গুডউইল'));
    }

    public function test_a_player_cannot_read_the_audit_log(): void
    {
        $this->actingAs($this->player)->get('/admin/audit')->assertForbidden();
        $this->actingAs($this->player)->get('/admin/ledger')->assertForbidden();
    }

    public function test_the_ledger_screen_totals_the_filtered_rows(): void
    {
        $deposit = Deposit::create([
            'user_id' => $this->player->id,
            'channel_id' => 'bkash',
            'amount' => 100_000,
        ]);

        $this->actingAs($this->admin)->patch("/admin/deposits/{$deposit->id}", ['state' => 'approved']);

        $this->actingAs($this->admin)
            ->get('/admin/ledger?kind=deposit')
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Ledger')
                ->where('totals.credits', 100_000)
                ->where('totals.debits', 0));
    }
}
