<?php

namespace Tests\Feature;

use App\Models\Game;
use App\Models\PaymentChannel;
use App\Models\User;
use Database\Seeders\BannerSeeder;
use Database\Seeders\GameSeeder;
use Database\Seeders\PaymentChannelSeeder;
use Database\Seeders\PromotionSeeder;
use Database\Seeders\SettingSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class CatalogueTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([
            SettingSeeder::class,
            PaymentChannelSeeder::class,
            GameSeeder::class,
            PromotionSeeder::class,
            BannerSeeder::class,
        ]);
    }

    public function test_the_home_page_renders_every_section_and_the_carousel(): void
    {
        $this->get('/')->assertInertia(fn ($page) => $page
            ->component('Home')
            ->has('sections.hot')
            ->has('sections.sports')
            ->has('sections.live')
            ->has('sections.slot')
            ->has('sections.poker')
            ->has('sections.fish')
            ->has('sections.esports')
            ->has('sections.lottery')
            ->has('slides', 4)
            ->has('announcements', 3)
            ->where('featured.slug', 'aviator'));
    }

    public function test_a_game_in_two_sections_keeps_one_row_per_section(): void
    {
        // Lightning Roulette is both hot and live in the reference layout
        $this->assertSame(2, Game::where('slug', 'lightning-roulette')->count());
    }

    public function test_a_catalogue_page_renders_for_a_game_without_an_engine(): void
    {
        $this->get('/casino/crazy-time')->assertInertia(fn ($page) => $page
            ->component('Casino/Show')
            ->where('game.slug', 'crazy-time'));
    }

    public function test_a_playable_game_redirects_to_its_own_engine(): void
    {
        $this->get('/casino/aviator')->assertRedirect('/game/aviator');
    }

    public function test_an_unknown_game_is_a_404(): void
    {
        $this->get('/casino/not-a-game')->assertNotFound();
    }

    public function test_a_hidden_game_is_not_reachable(): void
    {
        Game::where('slug', 'crazy-time')->update(['is_active' => false]);

        $this->get('/casino/crazy-time')->assertNotFound();
    }

    /**
     * A manual bKash/Nagad deposit has nowhere to go without the operator's own
     * receiving number, so the deposit screen is the one page that must show it.
     */
    public function test_the_deposit_screen_shows_the_operators_receiving_account(): void
    {
        PaymentChannel::where('id', 'bkash')
            ->update(['account_no' => '01999888777', 'account_name' => 'Operator Ltd']);

        $response = $this->actingAs(User::factory()->create())->get('/deposit');

        $response->assertSee('01999888777');
        $response->assertSee('Operator Ltd');
    }

    public function test_a_guest_cannot_read_the_operators_receiving_account(): void
    {
        PaymentChannel::where('id', 'bkash')
            ->update(['account_no' => '01999888777', 'account_name' => 'Operator Ltd']);

        $this->get('/deposit')->assertRedirect('/login');
    }

    /** Only a channel a player can actually deposit into hands over its number. */
    public function test_a_withdraw_only_channel_keeps_its_account_hidden(): void
    {
        PaymentChannel::where('id', 'bkash')->update([
            'account_no' => '01999888777',
            'supports_deposit' => false,
            'supports_withdraw' => true,
        ]);

        $this->actingAs(User::factory()->create())
            ->get('/deposit')
            ->assertDontSee('01999888777');
    }

    public function test_an_inactive_channel_keeps_its_account_hidden(): void
    {
        PaymentChannel::where('id', 'bkash')
            ->update(['account_no' => '01999888777', 'is_active' => false]);

        $this->actingAs(User::factory()->create())
            ->get('/deposit')
            ->assertDontSee('01999888777');
    }

    /** Every other player-facing cashier screen still keeps it hidden. */
    public function test_the_withdraw_screens_never_expose_the_operators_account(): void
    {
        PaymentChannel::where('id', 'bkash')
            ->update(['account_no' => '01999888777', 'account_name' => 'Operator Ltd']);

        $user = User::factory()->create();

        $this->actingAs($user)->get('/withdraw')->assertDontSee('01999888777');
        $this->actingAs($user)->get('/withdraw-history')->assertDontSee('01999888777');
        $this->actingAs($user)->get('/deposit-history')->assertDontSee('01999888777');
        $this->actingAs($user)->get('/member')->assertDontSee('01999888777');
    }

    /**
     * @return array<int, array{0: string, 1: string}>
     */
    public static function publicPages(): array
    {
        return [
            ['/', 'Home'],
            ['/casino', 'Casino/Lobby'],
            ['/sports', 'Sports'],
            ['/promotions', 'Promotions'],
            ['/reward', 'Reward'],
            ['/vip', 'Vip'],
            ['/support', 'Support'],
            ['/download', 'Download'],
            ['/refer', 'Account/Refer'],
            ['/member', 'Account/Member'],
            ['/login', 'Auth/Login'],
            ['/register', 'Auth/Register'],
            ['/forgot-password', 'Auth/ForgotPassword'],
            ['/game/aviator', 'Game/Aviator/Play'],
            ['/game/aviator/fairness', 'Game/Aviator/Fairness'],
        ];
    }

    #[DataProvider('publicPages')]
    public function test_a_guest_can_reach_every_public_page(string $url, string $component): void
    {
        $this->get($url)
            ->assertSuccessful()
            ->assertInertia(fn ($page) => $page->component($component));
    }

    /**
     * @return array<int, array{0: string, 1: string}>
     */
    public static function memberPages(): array
    {
        return [
            ['/deposit', 'Cashier/Deposit'],
            ['/withdraw', 'Cashier/Withdraw'],
            ['/deposit-history', 'Cashier/DepositHistory'],
            ['/withdraw-history', 'Cashier/WithdrawHistory'],
            ['/my-profile', 'Account/Profile'],
            ['/account-statement', 'Account/Statement'],
            ['/bets-history', 'Account/BetsHistory'],
            ['/balance-overview', 'Account/BalanceOverview'],
            ['/turnover', 'Account/Turnover'],
            ['/security', 'Account/Security'],
        ];
    }

    #[DataProvider('memberPages')]
    public function test_every_member_page_renders_for_a_signed_in_player(string $url, string $component): void
    {
        $this->actingAs(User::factory()->create())
            ->get($url)
            ->assertSuccessful()
            ->assertInertia(fn ($page) => $page->component($component));
    }

    #[DataProvider('memberPages')]
    public function test_every_member_page_is_closed_to_guests(string $url): void
    {
        $this->get($url)->assertRedirect('/login');
    }
}
