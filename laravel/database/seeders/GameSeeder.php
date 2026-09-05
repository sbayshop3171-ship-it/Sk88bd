<?php

namespace Database\Seeders;

use App\Models\Game;
use App\Support\Catalogue;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * The catalogue that used to live in lib/catalogue.ts.
 *
 * Thumbnails point at files under public/games/; a game with none gets a tile
 * generated from its slug on the front end. Provider artwork is licensed and
 * must be served from the provider's own CDN — none is bundled here.
 */
class GameSeeder extends Seeder
{
    /**
     * category => [name, glyph, provider, tag, thumb]
     *
     * @var array<string, array<int, array{0: string, 1: string, 2: string, 3: ?string, 4: ?string}>>
     */
    private const CATALOGUE = [
        'hot' => [
            ['Aviator', '✈️', 'Spribe', 'hot', '/games/aviator.webp'],
            ['Zeus Gate', '⚡', 'Sk88', 'new', null],
            ['Crazy Time', '🎡', 'Evolution', 'hot', '/games/crazy-time.webp'],
            ['Gates of Olympus', '⚡', 'Pragmatic', 'top', '/games/gates-of-olympus.webp'],
            ['Teen Patti', '🃏', 'Ezugi', null, null],
            ['Sweet Bonanza', '🍭', 'Pragmatic', 'hot', '/games/sweet-bonanza.webp'],
            ['Dragon Tiger', '🐉', 'Ezugi', null, null],
            ['Andar Bahar', '♠️', 'Evolution', 'new', null],
            ['Mines', '💣', 'Spribe', null, null],
            ['Lightning Roulette', '🎯', 'Evolution', 'top', '/games/lightning-roulette.webp'],
        ],
        'sports' => [
            ['Cricket Exchange', '🏏', 'Exchange', 'hot', '/games/cricket-exchange.webp'],
            ['Football', '⚽', 'Sportsbook', null, '/games/football.webp'],
            ['Tennis', '🎾', 'Sportsbook', null, '/games/tennis.webp'],
            ['Kabaddi', '🤼', 'Sportsbook', 'new', null],
            ['Basketball', '🏀', 'Sportsbook', null, null],
            ['Horse Racing', '🐎', 'Sportsbook', null, null],
        ],
        'live' => [
            ['Lightning Roulette', '🎯', 'Evolution', 'hot', null],
            ['Crazy Time', '🎡', 'Evolution', 'top', null],
            ['Baccarat VIP', '🀄', 'Ezugi', null, '/games/baccarat-vip.webp'],
            ['Blackjack Party', '♣️', 'Evolution', null, null],
            ['Andar Bahar Live', '♦️', 'Ezugi', 'hot', null],
            ['Dragon Tiger Live', '🐲', 'Ezugi', null, null],
            ['Monopoly Live', '🎩', 'Evolution', null, null],
            ['Sic Bo', '🎲', 'Ezugi', null, null],
            ['Mega Wheel', '🛞', 'Pragmatic', 'new', null],
        ],
        'slot' => [
            ['Zeus Gate', '⚡', 'Sk88', 'new', null],
            ['Sweet Bonanza', '🍬', 'Pragmatic', 'hot', null],
            ['Super Ace', '🂡', 'JILI', 'top', null],
            ['Fortune Gems', '💎', 'JILI', null, null],
            ['Big Bass Bonanza', '🎣', 'Pragmatic', null, null],
            ['Starburst', '💫', 'NetEnt', null, null],
            ['Wild West Gold', '🤠', 'Pragmatic', null, null],
            ['Fruit Party', '🍉', 'Pragmatic', null, '/games/fruit-party.webp'],
            ['Money Train 3', '🚂', 'Relax', 'new', null],
            ['Sugar Rush', '🧁', 'Pragmatic', 'hot', null],
            ['Diamond Bonanza', '💎', 'Pragmatic', 'new', '/games/diamond-bonanza.webp'],
        ],
        'poker' => [
            ['Teen Patti 3D', '🃏', 'Ezugi', 'hot', null],
            ['Card Matka', '🎴', 'KingMaker', null, null],
            ['Rummy', '🂡', 'KingMaker', null, null],
            ['Call Break', '🂮', 'KingMaker', 'new', null],
            ['7 Up 7 Down', '🎰', 'Ezugi', null, null],
            ['32 Cards', '🗂️', 'Ezugi', null, null],
            ['Casino Holdem', '💼', 'Evolution', null, null],
            ['Poker Pro', '🏆', 'JILI', null, null],
            ['Baccarat', '🀄', 'CQ9', null, null],
        ],
        'fish' => [
            ['Jackpot Fishing', '🐟', 'JILI', 'hot', null],
            ['Dragon Fortune', '🐡', 'Pragmatic', null, null],
            ['Ocean King 3', '🦈', 'CQ9', 'top', null],
            ['Bombing Fishing', '💥', 'JILI', null, null],
            ['Royal Fishing', '👑', 'JILI', null, null],
            ['Mega Fishing', '🎣', 'JILI', 'new', null],
            ['Fish Hunter', '🔱', 'CQ9', null, null],
            ['Golden Toad', '🐸', 'JDB', null, null],
            ['Boom Legend', '⚓', 'JILI', null, null],
        ],
        'esports' => [
            ['Counter Strike', '🔫', 'E-Sports', 'hot', null],
            ['Dota 2', '🛡️', 'E-Sports', null, null],
            ['Mobile Legends', '📱', 'E-Sports', 'new', null],
            ['Valorant', '🎯', 'E-Sports', null, null],
            ['PUBG Mobile', '🪖', 'E-Sports', null, null],
            ['League of Legends', '⚔️', 'E-Sports', null, null],
        ],
        'lottery' => [
            ['Bingo 5', '🎱', 'JILI', 'hot', null],
            ['Keno Live', '🔢', 'Evolution', null, null],
            ['Lotto Instant', '🎟️', 'Betgames', null, null],
            ['Number King', '🔟', 'JDB', null, null],
            ['Lucky Draw', '🍀', 'KingMaker', 'new', null],
            ['Color Game', '🌈', 'JILI', null, null],
        ],
    ];

    public function run(): void
    {
        foreach (self::CATALOGUE as $category => $games) {
            foreach ($games as $i => [$name, $glyph, $provider, $tag, $thumb]) {
                $slug = Str::slug($name);

                Game::updateOrCreate(
                    ['slug' => $slug, 'category' => $category],
                    [
                        'name' => $name,
                        'glyph' => $glyph,
                        'provider' => $provider,
                        'tag' => $tag,
                        'thumb_url' => $thumb,
                        // playable means the site runs the maths itself; the
                        // rest wait on a provider
                        'is_playable' => isset(Catalogue::ENGINES[$slug]),
                        'is_active' => true,
                        'sort_order' => $i + 1,
                    ],
                );
            }
        }
    }
}
