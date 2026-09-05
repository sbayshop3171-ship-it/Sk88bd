<?php

namespace Database\Seeders;

use App\Models\Promotion;
use Illuminate\Database\Seeder;

class PromotionSeeder extends Seeder
{
    public function run(): void
    {
        $promotions = [
            ['signup', '৳১৮ সাইন আপ বোনাস', '🎁', 'a3', 'নতুন',
                'রেজিস্টার করে মোবাইল নাম্বার ভেরিফাই করুন এবং প্রথম ডিপোজিট সম্পূর্ণ করলেই ৳১৮ বোনাস।'],
            ['deposit-5', '৫% প্রতিবার ডিপোজিট বোনাস', '💰', 'a5', 'জনপ্রিয়',
                'আজীবন, প্রতিটি ডিপোজিটে ৫% বোনাস। কোনো সীমা নেই — যতবার ডিপোজিট, ততবার বোনাস।'],
            ['rebate', '১% মাসিক রিবেট ক্যাশব্যাক', '🔄', 'a2', null,
                'প্রতি মাসের মোট বেটিং টার্নওভারের উপর ১% ক্যাশব্যাক অটোমেটিক জমা হবে।'],
            ['refer', '৪০% রেফারেল কমিশন', '👥', 'a1', null,
                'বন্ধুকে ইনভাইট করুন। সে যত খেলবে, আপনি তত আজীবন কমিশন পাবেন।'],
            ['cricket', 'ক্রিকেট এক্সচেঞ্জ বোনাস', '🏏', 'a7', null,
                'ক্রিকেট এক্সচেঞ্জে বেট করলে বিশেষ বোনাস ও কম কমিশন রেট।'],
            ['vip', 'ভিআইপি লেভেল আপ রিওয়ার্ড', '👑', 'a6', null,
                'প্রতিটি ভিআইপি লেভেলে আপগ্রেড বোনাস, বেশি রিবেট ও দ্রুত উইথড্র।'],
        ];

        foreach ($promotions as $i => [$id, $title, $glyph, $art, $badge, $body]) {
            Promotion::updateOrCreate(['id' => $id], [
                'title' => $title,
                'body' => $body,
                'glyph' => $glyph,
                'art' => $art,
                'badge' => $badge,
                'is_active' => true,
                'sort_order' => $i + 1,
            ]);
        }
    }
}
