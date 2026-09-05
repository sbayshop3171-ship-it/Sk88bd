<?php

namespace Tests\Feature;

use App\Models\Game;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class GameDemoModeTest extends TestCase
{
    use RefreshDatabase;

    private const DEMO = 'https://demo.provider.example/launch?game=crazy-time';

    private function game(array $overrides = []): Game
    {
        return Game::create([
            'slug' => 'crazy-time',
            'name' => 'Crazy Time',
            'provider' => 'Evolution',
            'category' => 'live',
            ...$overrides,
        ]);
    }

    public function test_a_game_without_a_demo_url_keeps_the_placeholder(): void
    {
        $this->game();

        $this->get('/casino/crazy-time')->assertInertia(fn ($page) => $page
            ->component('Casino/Show')
            ->where('game.demo_url', null));
    }

    public function test_a_demo_url_is_handed_to_the_game_page(): void
    {
        $this->game(['demo_url' => self::DEMO]);

        $this->get('/casino/crazy-time')->assertInertia(fn ($page) => $page
            ->component('Casino/Show')
            ->where('game.demo_url', self::DEMO));
    }

    public function test_a_guest_can_watch_the_demo(): void
    {
        $this->game(['demo_url' => self::DEMO]);

        $this->assertGuest();
        $this->get('/casino/crazy-time')->assertSuccessful();
    }

    public function test_watching_a_demo_never_touches_a_wallet(): void
    {
        $this->game(['demo_url' => self::DEMO]);
        $player = User::factory()->withBalance(500_000)->create();

        $this->actingAs($player)->get('/casino/crazy-time')->assertSuccessful();

        $this->assertSame(500_000, $player->wallet->fresh()->balance);
        $this->assertDatabaseCount('transactions', 0);
    }

    public function test_an_admin_can_set_a_demo_url(): void
    {
        $game = $this->game();

        $this->actingAs(User::factory()->admin()->create())
            ->patch("/admin/games/{$game->id}", [
                'slug' => 'crazy-time',
                'name' => 'Crazy Time',
                'provider' => 'Evolution',
                'category' => 'live',
                'demo_url' => self::DEMO,
            ])
            ->assertSessionHasNoErrors();

        $this->assertSame(self::DEMO, $game->fresh()->demo_url);
    }

    /**
     * @return array<int, array{0: string}>
     */
    public static function badUrls(): array
    {
        return [
            // an http frame is blocked outright on an https page
            ['http://demo.provider.example/launch'],
            ['javascript:alert(1)'],
            ['data:text/html,<script>alert(1)</script>'],
            ['/games/local.html'],
            ['not a url at all'],
        ];
    }

    #[DataProvider('badUrls')]
    public function test_a_demo_url_that_is_not_https_is_refused(string $url): void
    {
        $game = $this->game();

        $this->actingAs(User::factory()->admin()->create())
            ->patch("/admin/games/{$game->id}", [
                'slug' => 'crazy-time',
                'name' => 'Crazy Time',
                'provider' => 'Evolution',
                'category' => 'live',
                'demo_url' => $url,
            ])
            ->assertSessionHasErrors('demo_url');

        $this->assertNull($game->fresh()->demo_url);
    }

    public function test_a_player_cannot_set_a_demo_url(): void
    {
        $game = $this->game();

        $this->actingAs(User::factory()->create())
            ->patch("/admin/games/{$game->id}", [
                'slug' => 'crazy-time',
                'name' => 'Crazy Time',
                'provider' => 'Evolution',
                'category' => 'live',
                'demo_url' => self::DEMO,
            ])
            ->assertForbidden();

        $this->assertNull($game->fresh()->demo_url);
    }

    public function test_a_game_with_its_own_engine_still_wins_over_a_demo_url(): void
    {
        $this->game([
            'slug' => 'aviator',
            'name' => 'Aviator',
            'category' => 'hot',
            'is_playable' => true,
            'demo_url' => self::DEMO,
        ]);

        $this->get('/casino/aviator')->assertRedirect('/game/aviator');
    }

    public function test_a_hidden_game_stays_hidden_even_with_a_demo_url(): void
    {
        $this->game(['demo_url' => self::DEMO, 'is_active' => false]);

        $this->get('/casino/crazy-time')->assertNotFound();
    }
}
