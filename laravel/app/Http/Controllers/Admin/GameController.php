<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Game;
use App\Support\Catalogue;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class GameController extends Controller
{
    public function index(): Response
    {
        $games = Game::orderBy('category')->orderBy('sort_order')->get();

        return Inertia::render('Admin/Games', [
            'rows' => $games,
            'categories' => Catalogue::HOME_SECTIONS,
            'stats' => [
                'total' => $games->count(),
                'withArt' => $games->whereNotNull('thumb_url')->count(),
                'withDemo' => $games->whereNotNull('demo_url')->count(),
                'playable' => $games->where('is_playable', true)->count(),
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        Game::create($this->validated($request));

        return back()->with('toast', 'গেম যোগ হয়েছে');
    }

    public function update(Request $request, Game $game): RedirectResponse
    {
        $game->update($this->validated($request, $game));

        return back()->with('toast', 'গেম আপডেট হয়েছে');
    }

    public function destroy(Game $game): RedirectResponse
    {
        $game->delete();

        return back()->with('toast', 'গেম মুছে ফেলা হয়েছে');
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request, ?Game $game = null): array
    {
        return $request->validate([
            'slug' => ['required', 'string', 'max:64', 'regex:/^[a-z0-9-]+$/'],
            'name' => ['required', 'string', 'max:120'],
            'provider' => ['required', 'string', 'max:64'],
            'category' => [
                'required',
                Rule::in(Catalogue::HOME_SECTIONS),
                // one placement per (slug, category)
                Rule::unique('games', 'category')
                    ->where('slug', $request->string('slug')->toString())
                    ->ignore($game?->id),
            ],
            'glyph' => ['nullable', 'string', 'max:16'],
            'thumb_url' => ['nullable', 'string', 'max:255'],
            // the page frames this URL, so only https is accepted: an http
            // frame is blocked outright on an https page
            'demo_url' => ['nullable', 'url:https', 'max:2048'],
            'tag' => ['nullable', Rule::in(['hot', 'new', 'top'])],
            'is_playable' => ['boolean'],
            'is_active' => ['boolean'],
            'sort_order' => ['nullable', 'integer'],
        ]);
    }
}
