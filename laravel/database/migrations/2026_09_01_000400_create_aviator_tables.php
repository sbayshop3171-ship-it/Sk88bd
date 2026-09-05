<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The server owns the seed. `server_seed` stays hidden from the client until
 * the round busts, which is what makes the fairness commitment meaningful.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('aviator_rounds', function (Blueprint $table) {
            $table->id();
            // rounds are dealt per player, so the nonce can count up per account
            $table->foreignId('user_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('server_seed', 64);
            $table->string('server_seed_hash', 64);
            $table->string('client_seed', 64)->nullable();
            $table->unsignedBigInteger('nonce')->default(0);
            $table->decimal('crash_at', 10, 2);
            $table->timestamp('started_at')->nullable();
            $table->timestamp('crashed_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'nonce']);
        });

        Schema::create('aviator_bets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('round_id')->constrained('aviator_rounds')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('seat')->default(0);   // two seats per player
            $table->bigInteger('stake');
            $table->decimal('auto_at', 10, 2)->nullable();
            $table->decimal('cashed_at', 10, 2)->nullable();
            $table->bigInteger('payout')->default(0);
            $table->timestamps();

            $table->unique(['round_id', 'user_id', 'seat']);
            $table->index(['user_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('aviator_bets');
        Schema::dropIfExists('aviator_rounds');
    }
};
