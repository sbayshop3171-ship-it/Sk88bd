<?php

namespace Tests\Feature;

use App\Models\Setting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DailyCheckinTest extends TestCase
{
    use RefreshDatabase;

    private User $player;

    protected function setUp(): void
    {
        parent::setUp();

        Setting::put('checkin_bonus', ['amount' => 500, 'turnover_multiplier' => 10]);
        $this->player = User::factory()->withBalance(0)->create();
    }

    public function test_claiming_credits_the_bonus_and_raises_the_turnover(): void
    {
        $this->actingAs($this->player)->post('/reward/check-in')->assertRedirect();

        $wallet = $this->player->wallet->fresh();

        $this->assertSame(500, $wallet->balance);
        $this->assertSame(5_000, $wallet->turnover_need);
        $this->assertDatabaseHas('transactions', ['kind' => 'bonus', 'amount' => 500]);
        $this->assertDatabaseCount('daily_checkins', 1);
    }

    public function test_a_second_claim_on_the_same_day_pays_nothing(): void
    {
        $this->actingAs($this->player)->post('/reward/check-in');
        $this->actingAs($this->player)->post('/reward/check-in');

        $this->assertSame(500, $this->player->wallet->fresh()->balance);
        $this->assertDatabaseCount('daily_checkins', 1);
        $this->assertDatabaseCount('transactions', 1);
    }

    public function test_yesterdays_claim_does_not_block_today(): void
    {
        $this->travel(-1)->days();
        $this->actingAs($this->player)->post('/reward/check-in');

        $this->travelBack();
        $this->actingAs($this->player)->post('/reward/check-in');

        $this->assertSame(1_000, $this->player->wallet->fresh()->balance);
        $this->assertDatabaseCount('daily_checkins', 2);
    }

    public function test_the_reward_screen_reports_whether_today_is_claimed(): void
    {
        $this->actingAs($this->player)
            ->get('/reward')
            ->assertInertia(fn ($page) => $page->where('checkin.claimedToday', false));

        $this->actingAs($this->player)->post('/reward/check-in');

        $this->actingAs($this->player)
            ->get('/reward')
            ->assertInertia(fn ($page) => $page->where('checkin.claimedToday', true));
    }

    public function test_a_guest_cannot_claim(): void
    {
        $this->post('/reward/check-in')->assertRedirect('/login');

        $this->assertDatabaseCount('daily_checkins', 0);
    }

    public function test_a_zero_bonus_pays_nothing(): void
    {
        Setting::put('checkin_bonus', ['amount' => 0, 'turnover_multiplier' => 10]);

        $this->actingAs($this->player)->post('/reward/check-in')->assertRedirect();

        $this->assertSame(0, $this->player->wallet->fresh()->balance);
        $this->assertDatabaseCount('daily_checkins', 0);
    }
}
