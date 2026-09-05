/** Placeholder shown wherever real records will appear once the backend lands. */
export default function Empty({ glyph = '📭', text }: { glyph?: string; text: string }) {
  return (
    <div className="empty">
      <span className="e" aria-hidden>{glyph}</span>
      {text}
    </div>
  );
}
