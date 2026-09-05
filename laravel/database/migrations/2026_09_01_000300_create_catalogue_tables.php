<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // A game can sit in more than one section (Lightning Roulette is both
        // hot and live), so the row is per placement and `slug` — the /casino
        // URL — is only unique within a category.
        Schema::create('games', function (Blueprint $table) {
            $table->id();
            $table->string('slug', 64);            // used in /casino/{slug}
            $table->string('name');
            $table->string('glyph', 16)->nullable();
            $table->string('provider');
            $table->string('category', 32);
            $table->string('thumb_url')->nullable();   // licensed art; null -> generated tile
            $table->string('tag', 16)->nullable();     // 'hot' | 'new' | 'top'
            $table->boolean('is_playable')->default(false);
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->unique(['slug', 'category']);
            $table->index(['category', 'sort_order']);
        });

        Schema::create('banners', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('subtitle')->nullable();
            $table->string('kicker')->nullable();
            $table->string('amount', 32)->nullable();
            $table->string('emoji', 16)->nullable();
            $table->string('cta', 64)->nullable();
            $table->string('art', 16)->nullable();
            $table->string('image_url')->nullable();
            $table->string('href')->nullable();
            $table->string('placement', 32)->default('home');  // 'home' | 'announcement'
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('promotions', function (Blueprint $table) {
            $table->string('id', 64)->primary();
            $table->string('title');
            $table->text('body');
            $table->string('glyph', 16)->nullable();
            $table->string('art', 16)->nullable();
            $table->string('badge', 32)->nullable();
            $table->string('image_url')->nullable();
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('settings', function (Blueprint $table) {
            $table->string('key', 64)->primary();
            $table->json('value');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('settings');
        Schema::dropIfExists('promotions');
        Schema::dropIfExists('banners');
        Schema::dropIfExists('games');
    }
};
