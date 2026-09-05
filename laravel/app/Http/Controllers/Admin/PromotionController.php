<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Promotion;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The offers on /promotions.
 *
 * The id is chosen rather than generated because it is what the operator will
 * quote to a player ("the welcome-100 offer"), and it is what a support ticket
 * will refer to months later.
 */
class PromotionController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/Promotions', [
            'rows' => Promotion::orderBy('sort_order')->get(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        Promotion::create($this->validated($request));

        return back()->with('toast', 'প্রোমোশন যোগ হয়েছে');
    }

    public function update(Request $request, Promotion $promotion): RedirectResponse
    {
        // the id is the promotion's public handle; renaming it would orphan
        // every link and support note pointing at it
        $promotion->update(collect($this->validated($request, $promotion))->except('id')->all());

        return back()->with('toast', 'প্রোমোশন আপডেট হয়েছে');
    }

    public function destroy(Promotion $promotion): RedirectResponse
    {
        $promotion->delete();

        return back()->with('toast', 'প্রোমোশন মুছে ফেলা হয়েছে');
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request, ?Promotion $promotion = null): array
    {
        return $request->validate([
            'id' => [
                Rule::requiredIf($promotion === null),
                'string', 'max:64', 'regex:/^[a-z0-9-]+$/',
                Rule::unique('promotions', 'id')->ignore($promotion?->id, 'id'),
            ],
            'title' => ['required', 'string', 'max:120'],
            'body' => ['required', 'string', 'max:2000'],
            'glyph' => ['nullable', 'string', 'max:16'],
            'art' => ['nullable', 'string', 'max:16'],
            'badge' => ['nullable', 'string', 'max:32'],
            'image_url' => ['nullable', 'string', 'max:255'],
            'is_active' => ['boolean'],
            'sort_order' => ['nullable', 'integer'],
        ], [
            'id.regex' => 'আইডিতে শুধু ছোট হাতের অক্ষর, সংখ্যা আর - চলবে',
        ]);
    }
}
