<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Money is stored in paisa (bigint), never a float: BDT 12.34 = 1234.
 *
 * `wallets.balance` is denormalised from `transactions` so the header does not
 * have to sum a growing ledger on every page load. Only WalletService writes it.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wallets', function (Blueprint $table) {
            $table->foreignId('user_id')->primary()->constrained()->cascadeOnDelete();
            $table->bigInteger('balance')->default(0);
            $table->bigInteger('bonus_balance')->default(0);
            $table->bigInteger('turnover_need')->default(0);
            $table->bigInteger('turnover_done')->default(0);
            $table->timestamps();
        });

        Schema::create('transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->enum('kind', ['deposit', 'withdraw', 'bet', 'win', 'bonus', 'rebate', 'adjust']);
            $table->bigInteger('amount');          // signed: credits positive, debits negative
            $table->bigInteger('balance_after');
            $table->string('ref')->nullable();     // round id, deposit id, admin note...
            $table->timestamps();

            $table->index(['user_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transactions');
        Schema::dropIfExists('wallets');
    }
};
