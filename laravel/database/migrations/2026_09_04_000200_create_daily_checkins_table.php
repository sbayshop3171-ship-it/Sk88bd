<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * One row per player per day they claimed the check-in bonus.
 *
 * The unique key is what actually stops a second claim — a check in the
 * controller alone would lose a race between two taps.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('daily_checkins', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->date('checked_on');
            /** paisa credited, so a later change to the setting cannot rewrite history */
            $table->bigInteger('amount');
            $table->timestamps();

            $table->unique(['user_id', 'checked_on']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('daily_checkins');
    }
};
