<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            SettingSeeder::class,
            PaymentChannelSeeder::class,
            GameSeeder::class,
            PromotionSeeder::class,
            BannerSeeder::class,
            AdminUserSeeder::class,
        ]);
    }
}
