<?php

use App\Http\Controllers\AccountController;
use App\Http\Controllers\Admin;
use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Auth\PasswordResetController;
use App\Http\Controllers\Auth\RegisteredUserController;
use App\Http\Controllers\AviatorController;
use App\Http\Controllers\CashierController;
use App\Http\Controllers\CatalogueController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\PageController;
use App\Http\Controllers\ZeusController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Player site
|--------------------------------------------------------------------------
*/

Route::get('/', HomeController::class)->name('home');

Route::get('/casino', [CatalogueController::class, 'lobby'])->name('casino.lobby');
Route::get('/casino/{id}', [CatalogueController::class, 'show'])->name('casino.show');
Route::get('/sports', [CatalogueController::class, 'sports'])->name('sports');

Route::get('/promotions', [PageController::class, 'promotions'])->name('promotions');
Route::get('/reward', [PageController::class, 'reward'])->name('reward');
Route::get('/vip', [PageController::class, 'vip'])->name('vip');
Route::get('/support', [PageController::class, 'support'])->name('support');
Route::get('/download', [PageController::class, 'download'])->name('download');
Route::get('/refer', [AccountController::class, 'refer'])->name('refer');

// the member hub renders for guests too, showing login/register instead
Route::get('/member', [AccountController::class, 'member'])->name('member');

/*
|--------------------------------------------------------------------------
| Aviator
|--------------------------------------------------------------------------
| The page and the verifier are public; anything that touches money is not.
*/

Route::get('/game/aviator', [AviatorController::class, 'play'])->name('aviator');
Route::get('/game/aviator/fairness', [AviatorController::class, 'fairness'])->name('aviator.fairness');
Route::post('/game/aviator/verify', [AviatorController::class, 'verify'])->name('aviator.verify');

Route::middleware('auth')->group(function (): void {
    Route::post('/game/aviator/rounds', [AviatorController::class, 'start'])->name('aviator.start');
    Route::post('/game/aviator/rounds/{round}/cash-out', [AviatorController::class, 'cashOut'])->name('aviator.cashout');
    Route::post('/game/aviator/rounds/{round}/settle', [AviatorController::class, 'settle'])->name('aviator.settle');
});

/*
|--------------------------------------------------------------------------
| Zeus Gate
|--------------------------------------------------------------------------
| Spinning is open to guests, who get a throwaway seed and no wallet — that
| is the lobby's free-play demo. Retiring a seed pair needs an account,
| because only an account has one.
|
| The spin throttle is not about abuse of the page: each call resolves a whole
| round and can pay out, so it is the one endpoint worth capping per minute.
*/

Route::get('/game/zeus', [ZeusController::class, 'play'])->name('zeus');
Route::get('/game/zeus/fairness', [ZeusController::class, 'fairness'])->name('zeus.fairness');
Route::post('/game/zeus/verify', [ZeusController::class, 'verify'])->name('zeus.verify');
Route::post('/game/zeus/spin', [ZeusController::class, 'spin'])->middleware('throttle:120,1')->name('zeus.spin');

Route::post('/game/zeus/seed', [ZeusController::class, 'rotate'])->middleware('auth')->name('zeus.seed');

/*
|--------------------------------------------------------------------------
| Guests
|--------------------------------------------------------------------------
*/

Route::middleware('guest')->group(function (): void {
    Route::get('/login', [AuthenticatedSessionController::class, 'create'])->name('login');
    Route::post('/login', [AuthenticatedSessionController::class, 'store']);

    Route::get('/register', [RegisteredUserController::class, 'create'])->name('register');
    Route::post('/register', [RegisteredUserController::class, 'store']);

    Route::get('/forgot-password', [PasswordResetController::class, 'create'])->name('password.request');
    Route::post('/forgot-password', [PasswordResetController::class, 'store']);
});

/*
|--------------------------------------------------------------------------
| Signed-in players
|--------------------------------------------------------------------------
*/

Route::middleware('auth')->group(function (): void {
    Route::post('/logout', [AuthenticatedSessionController::class, 'destroy'])->name('logout');

    Route::get('/deposit', [CashierController::class, 'depositForm'])->name('deposit');
    Route::post('/deposit', [CashierController::class, 'storeDeposit']);
    Route::get('/deposit-history', [CashierController::class, 'depositHistory'])->name('deposits.history');

    Route::get('/withdraw', [CashierController::class, 'withdrawForm'])->name('withdraw');
    Route::post('/withdraw', [CashierController::class, 'storeWithdrawal']);
    Route::get('/withdraw-history', [CashierController::class, 'withdrawalHistory'])->name('withdrawals.history');

    Route::get('/my-profile', [AccountController::class, 'profile'])->name('profile');
    Route::get('/account-statement', [AccountController::class, 'statement'])->name('statement');
    Route::get('/bets-history', [AccountController::class, 'betsHistory'])->name('bets.history');
    Route::get('/balance-overview', [AccountController::class, 'balanceOverview'])->name('balance');
    Route::get('/turnover', [AccountController::class, 'turnover'])->name('turnover');
    Route::post('/reward/check-in', [PageController::class, 'checkIn'])->name('reward.checkin');

    Route::get('/security', [AccountController::class, 'security'])->name('security');
    Route::patch('/security/password', [AccountController::class, 'updatePassword'])->name('security.password');
});

/*
|--------------------------------------------------------------------------
| Admin
|--------------------------------------------------------------------------
| Outside the player shell: no bottom nav, no floating support buttons.
*/

Route::prefix('admin')->name('admin.')->middleware(['auth', 'admin'])->group(function (): void {
    Route::get('/', Admin\DashboardController::class)->name('dashboard');

    Route::get('/deposits', [Admin\DepositController::class, 'index'])->name('deposits');
    Route::patch('/deposits/{deposit}', [Admin\DepositController::class, 'update'])->name('deposits.update');

    Route::get('/withdrawals', [Admin\WithdrawalController::class, 'index'])->name('withdrawals');
    Route::patch('/withdrawals/{withdrawal}', [Admin\WithdrawalController::class, 'update'])->name('withdrawals.update');

    Route::get('/users', [Admin\UserController::class, 'index'])->name('users');
    Route::get('/users/{user}', [Admin\UserController::class, 'show'])->name('users.show');
    Route::patch('/users/{user}', [Admin\UserController::class, 'update'])->name('users.update');
    Route::post('/users/{user}/adjust', [Admin\UserController::class, 'adjust'])->name('users.adjust');
    Route::post('/users/{user}/bonus', [Admin\UserController::class, 'bonus'])->name('users.bonus');

    Route::get('/games', [Admin\GameController::class, 'index'])->name('games');
    Route::post('/games', [Admin\GameController::class, 'store'])->name('games.store');
    Route::patch('/games/{game}', [Admin\GameController::class, 'update'])->name('games.update');
    Route::delete('/games/{game}', [Admin\GameController::class, 'destroy'])->name('games.destroy');

    Route::get('/promotions', [Admin\PromotionController::class, 'index'])->name('promotions');
    Route::post('/promotions', [Admin\PromotionController::class, 'store'])->name('promotions.store');
    Route::patch('/promotions/{promotion}', [Admin\PromotionController::class, 'update'])->name('promotions.update');
    Route::delete('/promotions/{promotion}', [Admin\PromotionController::class, 'destroy'])->name('promotions.destroy');

    Route::get('/banners', [Admin\BannerController::class, 'index'])->name('banners');
    Route::post('/banners', [Admin\BannerController::class, 'store'])->name('banners.store');
    Route::patch('/banners/{banner}', [Admin\BannerController::class, 'update'])->name('banners.update');
    Route::delete('/banners/{banner}', [Admin\BannerController::class, 'destroy'])->name('banners.destroy');

    Route::get('/bets', [Admin\BetController::class, 'index'])->name('bets');
    Route::get('/reports', [Admin\ReportController::class, 'index'])->name('reports');
    Route::get('/ledger', [Admin\LedgerController::class, 'index'])->name('ledger');
    Route::get('/audit', [Admin\AuditController::class, 'index'])->name('audit');

    Route::get('/settings', [Admin\SettingController::class, 'index'])->name('settings');
    Route::patch('/settings/site', [Admin\SettingController::class, 'updateSite'])->name('settings.site');
    Route::patch('/settings/bonus', [Admin\SettingController::class, 'updateBonuses'])->name('settings.bonus');
    Route::post('/settings/channels', [Admin\SettingController::class, 'storeChannel'])->name('settings.channels.store');
    Route::patch('/settings/channels/{channel}', [Admin\SettingController::class, 'updateChannel'])->name('settings.channel');
    Route::delete('/settings/channels/{channel}', [Admin\SettingController::class, 'destroyChannel'])->name('settings.channels.destroy');
});
