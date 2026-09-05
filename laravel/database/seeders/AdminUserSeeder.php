<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Wallet;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * The first admin account.
 *
 * Credentials come from the environment so a real password never sits in the
 * repository. Set ADMIN_PHONE and ADMIN_PASSWORD before seeding in production;
 * without them the seeder skips rather than creating a known-password account.
 */
class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        $phone = env('ADMIN_PHONE');
        $password = env('ADMIN_PASSWORD');

        if (blank($phone) || blank($password)) {
            $this->command?->warn('ADMIN_PHONE / ADMIN_PASSWORD না থাকায় অ্যাডমিন তৈরি হয়নি।');

            return;
        }

        DB::transaction(function () use ($phone, $password): void {
            $admin = User::updateOrCreate(
                ['phone' => $phone],
                [
                    'password' => $password,
                    'role' => 'admin',
                    'display_name' => 'Admin',
                    'referral_code' => User::where('phone', $phone)->value('referral_code')
                        ?? User::freshReferralCode(),
                ],
            );

            Wallet::firstOrCreate(['user_id' => $admin->id]);
        });

        $this->command?->info("অ্যাডমিন অ্যাকাউন্ট প্রস্তুত: {$phone}");
    }
}
