<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Provider demo ("fun mode") launch URL.
 *
 * A demo URL runs the real game against the provider's own play-money credits,
 * so it needs no player session and touches no wallet. Real-money launch is a
 * different thing entirely — it needs a per-session token minted server-side by
 * the aggregator — and is deliberately not modelled here yet.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('games', function (Blueprint $table) {
            $table->string('demo_url', 2048)->nullable()->after('thumb_url');
        });
    }

    public function down(): void
    {
        Schema::table('games', function (Blueprint $table) {
            $table->dropColumn('demo_url');
        });
    }
};
