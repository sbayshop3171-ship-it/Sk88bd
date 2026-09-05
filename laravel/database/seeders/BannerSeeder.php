<?php

namespace Database\Seeders;

use App\Models\Banner;
use Illuminate\Database\Seeder;

/**
 * Home carousel slides and the first-visit announcement cards.
 *
 * `art` picks a gradient class from app.css rather than an image: real artwork
 * is uploaded from the admin panel, and a gradient is an honest placeholder.
 */
class BannerSeeder extends Seeder
{
    public function run(): void
    {
        $home = [
            ['a1', 'সাইন আপ বোনাস', '১৮৳ ফ্রি বোনাস', '৳১৮', '🎁', 'এখনই নিন', '/register'],
            ['a2', 'প্রতিবার ডিপোজিট', '৫% ডিপোজিট বোনাস', '৫%', '💰', 'ডিপোজিট করুন', '/deposit'],
            ['a3', 'মাসিক ক্যাশব্যাক', '১% রিবেট ক্যাশব্যাক', '১%', '🏏', 'বিস্তারিত', '/promotions'],
            ['a4', 'রেফার প্রোগ্রাম', 'বন্ধু আনুন, কমিশন নিন', '৪০%', '👥', 'রেফার করুন', '/refer'],
        ];

        foreach ($home as $i => [$art, $kicker, $title, $amount, $emoji, $cta, $href]) {
            Banner::updateOrCreate(
                ['placement' => 'home', 'sort_order' => $i + 1],
                compact('art', 'kicker', 'title', 'amount', 'emoji', 'cta', 'href') + ['is_active' => true],
            );
        }

        $announcements = [
            ['a2', 'অ্যাপ ডাউনলোড করলেই বোনাস', '৳১৮', 'সাইন আপ করে নাম্বার ভেরিফাই করুন'],
            ['a1', 'প্রতিবার ডিপোজিট বোনাস', '৫%', 'আজীবন, প্রতিটি ডিপোজিটে'],
            ['a3', 'মাসিক রিবেট ক্যাশব্যাক', '১%', 'প্রতি মাসে অটোমেটিক জমা'],
        ];

        foreach ($announcements as $i => [$art, $title, $amount, $subtitle]) {
            Banner::updateOrCreate(
                ['placement' => 'announcement', 'sort_order' => $i + 1],
                compact('art', 'title', 'amount', 'subtitle') + ['is_active' => true],
            );
        }
    }
}
