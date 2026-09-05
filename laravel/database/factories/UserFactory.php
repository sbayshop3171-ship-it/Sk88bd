<?php

namespace Database\Factories;

use App\Models\User;
use App\Models\Wallet;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    protected static ?string $password;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'phone' => '01'.fake()->unique()->numerify('#########'),
            'display_name' => fake()->firstName(),
            'password' => static::$password ??= Hash::make('password'),
            'role' => 'player',
            'referral_code' => Str::upper(Str::random(8)),
            'remember_token' => Str::random(10),
        ];
    }

    public function admin(): static
    {
        return $this->state(fn (): array => ['role' => 'admin']);
    }

    public function blocked(): static
    {
        return $this->state(fn (): array => ['is_blocked' => true]);
    }

    /** Every real user has a wallet; the factory should not leave one without. */
    public function configure(): static
    {
        return $this->afterCreating(function (User $user): void {
            Wallet::firstOrCreate(['user_id' => $user->id]);
        });
    }

    /** Start the account with a balance, in paisa. */
    public function withBalance(int $paisa): static
    {
        return $this->afterCreating(function (User $user) use ($paisa): void {
            Wallet::updateOrCreate(['user_id' => $user->id], ['balance' => $paisa]);
        });
    }
}
