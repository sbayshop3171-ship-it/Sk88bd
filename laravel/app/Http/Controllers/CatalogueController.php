<?php

namespace App\Http\Controllers;

use App\Models\Game;
use App\Support\Catalogue;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class CatalogueController extends Controller
{
    public function lobby(): Response
    {
        return Inertia::render('Casino/Lobby', [
            'sections' => Catalogue::sections(),
        ]);
    }

    public function show(string $slug): Response|RedirectResponse
    {
        $game = Catalogue::find($slug);

        if ($game === null) {
            throw new NotFoundHttpException;
        }

        // a game with its own engine gets its own route, not this placeholder
        if ($game->is_playable && isset(Catalogue::ENGINES[$game->slug])) {
            return redirect()->route(Catalogue::ENGINES[$game->slug]);
        }

        return Inertia::render('Casino/Show', [
            'game' => $game,
            'related' => Game::active()
                ->where('category', $game->category)
                ->where('slug', '!=', $game->slug)
                ->orderBy('sort_order')
                ->limit(6)
                ->get(),
        ]);
    }

    public function sports(): Response
    {
        return Inertia::render('Sports');
    }
}
