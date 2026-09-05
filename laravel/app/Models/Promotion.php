<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

#[Fillable([
    'id', 'title', 'body', 'glyph', 'art', 'badge',
    'image_url', 'is_active', 'sort_order',
])]
class Promotion extends Model
{
    protected $keyType = 'string';

    public $incrementing = false;

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    #[Scope]
    protected function active(Builder $query): void
    {
        $query->where('is_active', true);
    }
}
