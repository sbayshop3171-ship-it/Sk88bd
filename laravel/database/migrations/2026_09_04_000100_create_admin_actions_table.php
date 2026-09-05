<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Who did what in the admin panel.
 *
 * Money can be created out of nothing here — approving a deposit, adjusting a
 * balance — so every such action leaves a row that names the admin, the player
 * it touched and the amount. Append-only: nothing in the app updates or
 * deletes these rows.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('admin_actions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('admin_id')->constrained('users')->cascadeOnDelete();
            // 'deposit.approve', 'withdrawal.reject', 'user.adjust', ...
            $table->string('action', 64);
            // the record acted on: 'deposit', 'withdrawal', 'user', 'game', ...
            $table->string('subject_type', 32)->nullable();
            $table->string('subject_id', 64)->nullable();
            $table->foreignId('target_user_id')->nullable()->constrained('users')->nullOnDelete();
            /** signed paisa, when the action moved money */
            $table->bigInteger('amount')->nullable();
            $table->string('note')->nullable();
            $table->string('ip', 45)->nullable();
            $table->timestamps();

            $table->index(['action', 'created_at']);
            $table->index(['admin_id', 'created_at']);
            $table->index(['target_user_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('admin_actions');
    }
};
