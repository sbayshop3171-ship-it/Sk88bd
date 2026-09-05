<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Yesterday's referral commission, once the day is closed. Harmless while the
// rate is zero: the command says so and pays nothing.
Schedule::command('referrals:settle')->dailyAt('01:00')->timezone('Asia/Dhaka');
