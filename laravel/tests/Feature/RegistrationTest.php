<?php

namespace Tests\Feature;

use App\Models\Setting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_signing_up_creates_the_account_its_wallet_and_a_referral_code(): void
    {
        $response = $this->post('/register', [
            'phone' => '01712345678',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
        ]);

        $response->assertRedirect('/member');

        $user = User::where('phone', '01712345678')->firstOrFail();

        $this->assertAuthenticatedAs($user);
        $this->assertTrue(Hash::check('secret123', $user->password));
        $this->assertNotEmpty($user->referral_code);
        $this->assertSame(0, $user->wallet->balance);
    }

    public function test_the_same_number_cannot_register_twice(): void
    {
        User::factory()->create(['phone' => '01712345678']);

        $this->post('/register', [
            'phone' => '01712345678',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
        ])->assertSessionHasErrors('phone');

        $this->assertSame(1, User::where('phone', '01712345678')->count());
    }

    public function test_a_number_that_is_not_a_bd_mobile_is_rejected(): void
    {
        $this->post('/register', [
            'phone' => '0171234',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
        ])->assertSessionHasErrors('phone');

        $this->assertGuest();
    }

    public function test_a_mismatched_confirmation_is_rejected(): void
    {
        $this->post('/register', [
            'phone' => '01712345678',
            'password' => 'secret123',
            'password_confirmation' => 'different',
        ])->assertSessionHasErrors('password');

        $this->assertGuest();
    }

    public function test_a_referral_code_links_the_new_account_to_its_referrer(): void
    {
        $referrer = User::factory()->create(['referral_code' => 'ABCD1234']);

        $this->post('/register', [
            'phone' => '01712345678',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
            'referral_code' => 'ABCD1234',
        ])->assertRedirect('/member');

        $this->assertSame(
            $referrer->id,
            User::where('phone', '01712345678')->value('referred_by'),
        );
    }

    public function test_an_unknown_referral_code_is_rejected(): void
    {
        $this->post('/register', [
            'phone' => '01712345678',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
            'referral_code' => 'NOPE9999',
        ])->assertSessionHasErrors('referral_code');
    }

    public function test_a_configured_signup_bonus_is_credited_with_its_turnover(): void
    {
        Setting::put('signup_bonus', ['amount' => 1_800, 'turnover_multiplier' => 10]);

        $this->post('/register', [
            'phone' => '01712345678',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
        ]);

        $wallet = User::where('phone', '01712345678')->firstOrFail()->wallet;

        $this->assertSame(1_800, $wallet->balance);
        $this->assertSame(18_000, $wallet->turnover_need);
    }
}
