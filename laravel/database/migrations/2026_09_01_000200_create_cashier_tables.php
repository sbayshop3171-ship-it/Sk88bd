<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_channels', function (Blueprint $table) {
            $table->string('id', 32)->primary();   // 'bkash', 'nagad', ...
            $table->string('name');
            $table->string('kind', 32)->default('mobile');
            $table->string('glyph', 16)->nullable();
            $table->string('art', 16)->nullable();
            // operator's receiving account; admin-only, never exposed to players
            $table->string('account_no')->nullable();
            $table->string('account_name')->nullable();
            $table->bigInteger('min_amount')->default(30000);
            $table->bigInteger('max_amount')->default(3000000);
            $table->boolean('supports_deposit')->default(true);
            $table->boolean('supports_withdraw')->default(true);
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('deposits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('channel_id', 32);
            $table->bigInteger('amount');
            $table->string('sender_no')->nullable();   // what the player says they sent from
            $table->string('txn_id')->nullable();
            $table->enum('state', ['pending', 'approved', 'rejected', 'cancelled'])->default('pending');
            $table->string('admin_note')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();

            $table->foreign('channel_id')->references('id')->on('payment_channels');
            $table->index(['state', 'created_at']);
        });

        Schema::create('withdrawals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('channel_id', 32);
            $table->bigInteger('amount');
            $table->string('account_no');
            $table->enum('state', ['pending', 'approved', 'rejected', 'cancelled'])->default('pending');
            $table->string('admin_note')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();

            $table->foreign('channel_id')->references('id')->on('payment_channels');
            $table->index(['state', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('withdrawals');
        Schema::dropIfExists('deposits');
        Schema::dropIfExists('payment_channels');
    }
};
