<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/**
 * One placement of a game in one section.
 *
 * The same title can appear in several sections, so a row is (slug, category)
 * and `slug` is what the /casino URL carries. `thumb_url` null means the front
 * end generates the tile from the slug (resources/js/components/GameArt.tsx) —
 * provider artwork is licensed and has to come from the provider's own CDN.
 *
 * `demo_url` is the provider's fun-mode launch URL. Set it and /casino/{slug}
 * frames the real game in play money; leave it null and the page keeps its
 * "no provider connected" placeholder.
 */
#[Fillable([
    'slug', 'name', 'glyph', 'provider', 'category', 'thumb_url', 'demo_url',
    'tag', 'is_playable', 'is_active', 'sort_order',
])]
class Game extends Model
{
    protected function casts(): array
    {
        return [
            'is_playable' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    #[Scope]
    protected function active(Builder $query): void
    {
        $query->where('is_active', true);
    }
}
