<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LoginTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_player_signs_in_with_their_mobile_number(): void
    {
        $user = User::factory()->create([
            'phone' => '01712345678',
            'password' => 'secret123',
        ]);

        $this->post('/login', ['phone' => '01712345678', 'password' => 'secret123'])
            ->assertRedirect('/member');

        $this->assertAuthenticatedAs($user);
        $this->assertNotNull($user->fresh()->last_login_at);
    }

    public function test_a_wrong_password_is_refused(): void
    {
        User::factory()->create(['phone' => '01712345678', 'password' => 'secret123']);

        $this->post('/login', ['phone' => '01712345678', 'password' => 'wrong'])
            ->assertSessionHasErrors('phone');

        $this->assertGuest();
    }

    public function test_a_blocked_account_cannot_sign_in(): void
    {
        User::factory()->blocked()->create([
            'phone' => '01712345678',
            'password' => 'secret123',
        ]);

        $this->post('/login', ['phone' => '01712345678', 'password' => 'secret123'])
            ->assertSessionHasErrors('phone');

        $this->assertGuest();
    }

    public function test_repeated_failures_are_rate_limited(): void
    {
        User::factory()->create(['phone' => '01712345678', 'password' => 'secret123']);

        for ($i = 0; $i < 5; $i++) {
            $this->post('/login', ['phone' => '01712345678', 'password' => 'wrong']);
        }

        // the sixth attempt is refused even with the right password
        $this->post('/login', ['phone' => '01712345678', 'password' => 'secret123'])
            ->assertSessionHasErrors('phone');

        $this->assertGuest();
    }

    public function test_signing_out_ends_the_session(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->post('/logout')->assertRedirect('/');

        $this->assertGuest();
    }
}
