<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Zeus Gate resolves a round the instant it is asked for, so it cannot commit
 * and reveal per round the way Aviator does — by the time the player saw the
 * hash the result would already be in the same response.
 *
 * Instead a seed pair is committed up front and reused: the player sees the
 * hash of a server seed before their first spin, every spin off it counts the
 * nonce up by one, and the seed is only published when the pair is retired.
 * Anyone can then replay each nonce and check the whole series at once.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('zeus_seeds', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('server_seed', 64);
            $table->string('server_seed_hash', 64);
            $table->string('client_seed', 64);
            $table->unsignedBigInteger('nonce')->default(0);   // the next spin's
            $table->timestamp('revealed_at')->nullable();      // null -> still in use
            $table->timestamps();

            $table->index(['user_id', 'revealed_at']);
        });

        Schema::create('zeus_rounds', function (Blueprint $table) {
            $table->id();
            $table->foreignId('seed_id')->constrained('zeus_seeds')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->unsignedBigInteger('nonce');
            $table->bigInteger('stake');                       // paisa, per spin
            $table->bigInteger('cost');                        // paisa actually taken
            $table->boolean('bought')->default(false);
            $table->decimal('win_units', 12, 2);               // payout / stake
            $table->bigInteger('payout');                      // paisa
            $table->unsignedSmallInteger('free_spins')->default(0);
            $table->timestamps();

            $table->unique(['seed_id', 'nonce']);
            $table->index(['user_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('zeus_rounds');
        Schema::dropIfExists('zeus_seeds');
    }
};
