/** Placeholder shown wherever a list has no rows yet. */
export default function Empty({ glyph = '📭', text }: { glyph?: string; text: string }) {
    return (
        <div className="empty">
            <span className="e" aria-hidden>{glyph}</span>
            {text}
        </div>
    );
}
