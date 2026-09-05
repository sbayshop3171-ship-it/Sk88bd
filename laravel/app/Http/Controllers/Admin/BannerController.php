<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Banner;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class BannerController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/Banners', [
            'rows' => Banner::orderBy('placement')->orderBy('sort_order')->get(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        Banner::create($this->validated($request));

        return back()->with('toast', 'ব্যানার যোগ হয়েছে');
    }

    public function update(Request $request, Banner $banner): RedirectResponse
    {
        $banner->update($this->validated($request));

        return back()->with('toast', 'ব্যানার আপডেট হয়েছে');
    }

    public function destroy(Banner $banner): RedirectResponse
    {
        $banner->delete();

        return back()->with('toast', 'ব্যানার মুছে ফেলা হয়েছে');
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request): array
    {
        return $request->validate([
            'title' => ['required', 'string', 'max:120'],
            'subtitle' => ['nullable', 'string', 'max:200'],
            'kicker' => ['nullable', 'string', 'max:80'],
            'amount' => ['nullable', 'string', 'max:32'],
            'emoji' => ['nullable', 'string', 'max:16'],
            'cta' => ['nullable', 'string', 'max:64'],
            'art' => ['nullable', 'string', 'max:16'],
            'image_url' => ['nullable', 'string', 'max:255'],
            'href' => ['nullable', 'string', 'max:255'],
            'placement' => ['required', Rule::in(['home', 'announcement'])],
            'is_active' => ['boolean'],
            'sort_order' => ['nullable', 'integer'],
        ]);
    }
}
