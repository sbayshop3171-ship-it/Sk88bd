<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class AdminAccessTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array<int, array{0: string}>
     */
    public static function adminRoutes(): array
    {
        return [
            ['/admin'],
            ['/admin/deposits'],
            ['/admin/withdrawals'],
            ['/admin/users'],
            ['/admin/games'],
            ['/admin/promotions'],
            ['/admin/banners'],
            ['/admin/bets'],
            ['/admin/reports'],
            ['/admin/ledger'],
            ['/admin/audit'],
            ['/admin/settings'],
        ];
    }

    #[DataProvider('adminRoutes')]
    public function test_a_guest_is_sent_to_the_login_screen(string $route): void
    {
        $this->get($route)->assertRedirect('/login');
    }

    #[DataProvider('adminRoutes')]
    public function test_a_player_is_forbidden(string $route): void
    {
        $this->actingAs(User::factory()->create())->get($route)->assertForbidden();
    }

    #[DataProvider('adminRoutes')]
    public function test_an_admin_gets_in(string $route): void
    {
        $this->actingAs(User::factory()->admin()->create())->get($route)->assertSuccessful();
    }

    public function test_a_player_cannot_adjust_a_balance(): void
    {
        $victim = User::factory()->withBalance(1000)->create();

        $this->actingAs(User::factory()->create())
            ->post("/admin/users/{$victim->id}/adjust", ['amount' => 100000, 'note' => 'nice try'])
            ->assertForbidden();

        $this->assertSame(1000, $victim->wallet->fresh()->balance);
    }
}
