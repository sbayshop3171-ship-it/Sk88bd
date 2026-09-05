/** Timestamps arrive as ISO strings; players read them in Dhaka time. */
export function when(iso: string | null | undefined): string {
    if (!iso) return '—';

    return new Date(iso).toLocaleString('en-GB', {
        timeZone: 'Asia/Dhaka',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    });
}

/**
 * Turn a ledger `ref` into something a player can read.
 *
 * The column carries two kinds of value: a machine reference written by the
 * app (`deposit:12`, `aviator:7:0`) and a free-text reason typed by an admin on
 * a manual adjustment. Only the first kind is rewritten; anything unrecognised
 * is the admin's own words and is passed through untouched.
 */
export function refLabel(ref: string | null | undefined): string | null {
    if (!ref) return null;

    const m = /^(deposit|withdrawal|aviator|zeus):(\d+)/.exec(ref);
    if (!m) return ref;

    const [, kind, id] = m;

    if (kind === 'deposit') return `ডিপোজিট #${id}`;
    if (kind === 'withdrawal') return `উইথড্র #${id}`;
    if (kind === 'zeus') return `Zeus Gate রাউন্ড #${id}`;

    return `Aviator রাউন্ড #${id}`;
}
