<?php

namespace App\Http\Controllers;

use App\Models\Banner;
use App\Models\Game;
use App\Support\Catalogue;
use Inertia\Inertia;
use Inertia\Response;

class HomeController extends Controller
{
    public function __invoke(): Response
    {
        return Inertia::render('Home', [
            'sections' => Catalogue::sections(),
            'slides' => Banner::active()->where('placement', 'home')
                ->orderBy('sort_order')->get(),
            'announcements' => Banner::active()->where('placement', 'announcement')
                ->orderBy('sort_order')->get(),
            'featured' => Game::active()->where('is_playable', true)
                ->orderBy('sort_order')->first(),
            'providers' => Catalogue::providers(),
        ]);
    }
}
