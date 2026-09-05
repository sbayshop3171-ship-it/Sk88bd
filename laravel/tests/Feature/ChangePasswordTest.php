<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class ChangePasswordTest extends TestCase
{
    use RefreshDatabase;

    private User $player;

    protected function setUp(): void
    {
        parent::setUp();

        $this->player = User::factory()->create(['password' => 'oldpassword']);
    }

    public function test_a_player_can_change_their_password(): void
    {
        $this->actingAs($this->player)
            ->patch('/security/password', [
                'current_password' => 'oldpassword',
                'password' => 'newpassword',
                'password_confirmation' => 'newpassword',
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $this->assertTrue(Hash::check('newpassword', $this->player->fresh()->password));
    }

    public function test_the_current_password_has_to_be_right(): void
    {
        $this->actingAs($this->player)
            ->patch('/security/password', [
                'current_password' => 'notmypassword',
                'password' => 'newpassword',
                'password_confirmation' => 'newpassword',
            ])
            ->assertSessionHasErrors('current_password');

        $this->assertTrue(Hash::check('oldpassword', $this->player->fresh()->password));
    }

    public function test_the_new_password_has_to_be_confirmed(): void
    {
        $this->actingAs($this->player)
            ->patch('/security/password', [
                'current_password' => 'oldpassword',
                'password' => 'newpassword',
                'password_confirmation' => 'somethingelse',
            ])
            ->assertSessionHasErrors('password');

        $this->assertTrue(Hash::check('oldpassword', $this->player->fresh()->password));
    }

    public function test_the_new_password_cannot_repeat_the_old_one(): void
    {
        $this->actingAs($this->player)
            ->patch('/security/password', [
                'current_password' => 'oldpassword',
                'password' => 'oldpassword',
                'password_confirmation' => 'oldpassword',
            ])
            ->assertSessionHasErrors('password');
    }

    public function test_a_short_password_is_refused(): void
    {
        $this->actingAs($this->player)
            ->patch('/security/password', [
                'current_password' => 'oldpassword',
                'password' => 'abc',
                'password_confirmation' => 'abc',
            ])
            ->assertSessionHasErrors('password');
    }

    public function test_a_guest_cannot_change_a_password(): void
    {
        $this->patch('/security/password', [
            'current_password' => 'oldpassword',
            'password' => 'newpassword',
            'password_confirmation' => 'newpassword',
        ])->assertRedirect('/login');
    }

    public function test_the_security_screen_shows_the_last_login(): void
    {
        $this->post('/login', ['phone' => $this->player->phone, 'password' => 'oldpassword']);

        $this->actingAs($this->player->fresh())
            ->get('/security')
            ->assertInertia(fn ($page) => $page
                ->component('Account/Security')
                ->whereNot('lastLoginAt', null));
    }
}
