<?php

namespace Database\Seeders;

use App\Models\PaymentChannel;
use Illuminate\Database\Seeder;

/**
 * Cashier channels offered to BD players. Limits are in paisa.
 *
 * Receiving account numbers are deliberately absent — those are operator
 * secrets that belong in the admin panel, never in source.
 */
class PaymentChannelSeeder extends Seeder
{
    public function run(): void
    {
        $channels = [
            ['id' => 'bkash',  'name' => 'bKash',         'glyph' => '🅱️', 'art' => 'a8', 'min' => 300,  'max' => 30000,  'withdraw' => true],
            ['id' => 'nagad',  'name' => 'Nagad',         'glyph' => '🅽',  'art' => 'a3', 'min' => 300,  'max' => 30000,  'withdraw' => true],
            ['id' => 'rocket', 'name' => 'Rocket',        'glyph' => '🚀', 'art' => 'a6', 'min' => 300,  'max' => 25000,  'withdraw' => true],
            ['id' => 'upay',   'name' => 'Upay',          'glyph' => '🆙', 'art' => 'a4', 'min' => 300,  'max' => 20000,  'withdraw' => true],
            ['id' => 'bank',   'name' => 'Bank Transfer', 'glyph' => '🏦', 'art' => 'a2', 'min' => 1000, 'max' => 200000, 'withdraw' => true],
            ['id' => 'usdt',   'name' => 'USDT (TRC20)',  'glyph' => '₮',  'art' => 'a7', 'min' => 500,  'max' => 500000, 'withdraw' => false],
        ];

        foreach ($channels as $i => $c) {
            PaymentChannel::updateOrCreate(['id' => $c['id']], [
                'name' => $c['name'],
                'kind' => $c['id'] === 'bank' ? 'bank' : ($c['id'] === 'usdt' ? 'crypto' : 'mobile'),
                'glyph' => $c['glyph'],
                'art' => $c['art'],
                'min_amount' => $c['min'] * 100,
                'max_amount' => $c['max'] * 100,
                'supports_deposit' => true,
                'supports_withdraw' => $c['withdraw'],
                'is_active' => true,
                'sort_order' => $i + 1,
            ]);
        }
    }
}
