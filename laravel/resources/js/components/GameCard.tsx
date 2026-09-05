import { Link } from '@inertiajs/react';
import GameArt from './GameArt';
import type { Game } from '../types';

const TAG_LABEL = { hot: 'HOT', new: 'NEW', top: 'TOP' } as const;

/** A game with an engine of its own opens that engine; everything else opens
    the catalogue page, which explains that no provider is connected yet. */
export default function GameCard({ game }: { game: Game }) {
    const href = game.is_playable ? `/game/${game.slug}` : `/casino/${game.slug}`;

    return (
        <Link className="game" href={href}>
            {/* supplied artwork carries its own HOT/NEW badge, so the overlay
                would sit a second one on top of it */}
            {game.tag && !game.thumb_url && <i className={`tag tag--${game.tag}`}>{TAG_LABEL[game.tag]}</i>}
            <GameArt slug={game.slug} thumb={game.thumb_url} name={game.name} provider={game.provider} />
            <div className="game__meta">
                <div className="game__prov">{game.provider}</div>
            </div>
        </Link>
    );
}
