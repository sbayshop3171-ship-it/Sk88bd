'use client';

import { useMemo, useState } from 'react';
import {
  byId,
  ICON_MAX_BYTES,
  STATUS_LABEL,
  type GameOverride,
  type GameStatus,
} from '@/lib/game-control';

type Row = {
  id: string;
  name: string;
  provider: string;
  category: string;
  catalogueTag: string | null;
  thumb: string | null;
  hasArt: boolean;
  playable: boolean;
};

const UPLOAD_ERROR: Record<string, string> = {
  'no-file': 'কোনো ছবি বাছা হয়নি।',
  'bad-type': 'ছবিটি PNG, JPG, WEBP বা GIF হতে হবে।',
  'too-large': `ছবিটি ${ICON_MAX_BYTES / 1024 / 1024}MB এর মধ্যে হতে হবে।`,
  unauthorized: 'সেশন শেষ হয়ে গেছে — আবার লগইন করুন।',
};

const PAGE_SIZE = 40;

const TAG_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'ক্যাটালগ অনুযায়ী' },
  { value: 'hot', label: 'HOT' },
  { value: 'new', label: 'NEW' },
  { value: 'top', label: 'TOP' },
  { value: 'none', label: 'কোনো ব্যাজ নয়' },
];

export default function GameControl({
  games,
  initialOverrides,
}: {
  games: Row[];
  initialOverrides: GameOverride[];
}) {
  const [overrides, setOverrides] = useState(byId(initialOverrides));
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [onlyChanged, setOnlyChanged] = useState(false);
  const [shown, setShown] = useState(PAGE_SIZE);
  const [iconVersion, setIconVersion] = useState(0);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');

  // A game in two categories carries them joined ("হট গেমস, স্লট"), so split
  // before building the filter list and match on membership below.
  const categories = useMemo(
    () => [...new Set(games.flatMap((g) => g.category.split(', ')))].sort(),
    [games],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return games.filter((g) => {
      if (category && !g.category.split(', ').includes(category)) return false;
      if (onlyChanged && !overrides[g.id]) return false;
      if (!q) return true;
      return g.name.toLowerCase().includes(q) || g.provider.toLowerCase().includes(q);
    });
  }, [games, query, category, onlyChanged, overrides]);

  const hiddenCount = Object.values(overrides).filter((o) => o.status === 'hidden').length;
  const changedCount = Object.keys(overrides).length;

  async function send(gameId: string, body: Record<string, unknown>) {
    setBusyId(gameId);
    setError('');
    try {
      const res = await fetch('/api/admin/games', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ gameId, ...body }),
      });
      const data = (await res.json()) as
        | { ok: true; overrides: GameOverride[] }
        | { ok: false; reason: string };

      if (!data.ok) {
        setError(`সমস্যা হয়েছে (${data.reason})`);
        return;
      }
      setOverrides(byId(data.overrides));
    } catch {
      setError('সার্ভারে পৌঁছানো গেল না — আবার চেষ্টা করুন।');
    } finally {
      setBusyId('');
    }
  }

  async function uploadIcon(gameId: string, file: File) {
    setBusyId(gameId);
    setError('');
    try {
      const body = new FormData();
      body.append('gameId', gameId);
      body.append('file', file);

      const res = await fetch('/api/admin/game-icon', { method: 'POST', body });
      const data = (await res.json()) as
        | { ok: true; overrides: GameOverride[] }
        | { ok: false; reason: string };

      if (!data.ok) {
        setError(UPLOAD_ERROR[data.reason] ?? `আপলোড হয়নি (${data.reason})`);
        return;
      }
      setOverrides(byId(data.overrides));
      // Same URL, new bytes — bust the browser's copy.
      setIconVersion((v) => v + 1);
    } catch {
      setError('আপলোড করা গেল না — আবার চেষ্টা করুন।');
    } finally {
      setBusyId('');
    }
  }

  async function removeIcon(gameId: string) {
    setBusyId(gameId);
    setError('');
    try {
      const res = await fetch(`/api/admin/game-icon?gameId=${encodeURIComponent(gameId)}`, {
        method: 'DELETE',
      });
      const data = (await res.json()) as
        | { ok: true; overrides: GameOverride[] }
        | { ok: false; reason: string };

      if (!data.ok) {
        setError(UPLOAD_ERROR[data.reason] ?? `মোছা গেল না (${data.reason})`);
        return;
      }
      setOverrides(byId(data.overrides));
      setIconVersion((v) => v + 1);
    } catch {
      setError('সার্ভারে পৌঁছানো গেল না — আবার চেষ্টা করুন।');
    } finally {
      setBusyId('');
    }
  }

  /** One row's full state, so a change to any field keeps the others. */
  const patch = (gameId: string, change: Partial<GameOverride>) => {
    const current = overrides[gameId];
    return send(gameId, {
      action: 'set',
      status: current?.status ?? 'active',
      tag: current?.tag ?? null,
      sortOrder: current?.sortOrder ?? null,
      ...change,
    });
  };

  return (
    <>
      <div className="adm__tiles" style={{ marginBottom: 14 }}>
        <div className="adm__tile"><b>{games.length}</b><small>মোট গেম</small></div>
        <div className="adm__tile"><b>{games.length - hiddenCount}</b><small>দেখানো হচ্ছে</small></div>
        <div className="adm__tile"><b>{hiddenCount}</b><small>লুকানো</small></div>
        <div className="adm__tile"><b>{changedCount}</b><small>বদলানো হয়েছে</small></div>
      </div>

      <div className="adm__card">
        <div className="adm__formgrid">
          <label className="adm__f">
            <span>খুঁজুন</span>
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setShown(PAGE_SIZE); }}
              placeholder="গেম বা প্রোভাইডারের নাম"
            />
          </label>
          <label className="adm__f">
            <span>ক্যাটাগরি</span>
            <select value={category} onChange={(e) => { setCategory(e.target.value); setShown(PAGE_SIZE); }}>
              <option value="">সব ক্যাটাগরি</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="adm__f">
            <span>ফিল্টার</span>
            <select
              value={onlyChanged ? 'changed' : 'all'}
              onChange={(e) => { setOnlyChanged(e.target.value === 'changed'); setShown(PAGE_SIZE); }}
            >
              <option value="all">সব গেম</option>
              <option value="changed">শুধু বদলানো গুলো</option>
            </select>
          </label>
        </div>
        {error && <p className="adm__err" style={{ marginBottom: 0 }}>{error}</p>}
        <p className="adm__hint">
          আইকনে ক্লিক করলে নতুন ছবি আপলোড হবে (PNG/JPG/WEBP/GIF,{' '}
          {ICON_MAX_BYTES / 1024 / 1024}MB পর্যন্ত)। লুকালে গেমটি হোম ও লবি থেকে
          সরে যাবে। ক্রম দিলে ঐ গেম তার ক্যাটাগরির উপরে উঠে আসবে — খালি রাখলে
          ক্যাটালগের নিজের ক্রম থাকবে।
        </p>
      </div>

      <div className="adm__tablewrap">
        <table className="adm__table">
          <thead>
            <tr>
              <th>আইকন</th><th>গেম</th><th>প্রোভাইডার</th><th>ক্যাটাগরি</th>
              <th>ব্যাজ</th><th>ক্রম</th><th>অবস্থা</th><th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} className="adm__empty">কোনো গেম মিলল না।</td></tr>
            ) : (
              filtered.slice(0, shown).map((g) => {
                const o = overrides[g.id];
                const status: GameStatus = o?.status ?? 'active';
                const busy = busyId === g.id;

                const art = o?.iconUrl ? `${o.iconUrl}?v=${iconVersion}` : g.thumb;

                return (
                  <tr key={g.id}>
                    <td>
                      <label className="adm__icon" title="আইকন বদলান">
                        {art
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={art} alt="" width={38} height={38} />
                          : <span className="adm__icon-none">+</span>}
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/gif"
                          aria-label={`${g.name} — আইকন আপলোড`}
                          disabled={busy}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            e.target.value = '';
                            if (file) void uploadIcon(g.id, file);
                          }}
                        />
                      </label>
                    </td>
                    <td>
                      {g.name}
                      {g.playable && <span className="adm__ok" style={{ marginLeft: 6, fontSize: 10 }}>চালু</span>}
                      {!g.hasArt && <span className="adm__miss" style={{ marginLeft: 6, fontSize: 10 }}>আর্ট নেই</span>}
                    </td>
                    <td className="adm__muted">{g.provider}</td>
                    <td className="adm__muted">{g.category}</td>
                    <td>
                      <select
                        className="adm__mini"
                        value={o?.tag ?? ''}
                        disabled={busy}
                        onChange={(e) => patch(g.id, { tag: (e.target.value || null) as GameOverride['tag'] })}
                      >
                        {TAG_OPTIONS.map((tg) => <option key={tg.value} value={tg.value}>{tg.label}</option>)}
                      </select>
                    </td>
                    <td>
                      <input
                        className="adm__mini"
                        type="number" min={1} max={999} style={{ width: 66 }}
                        value={o?.sortOrder ?? ''}
                        placeholder="—"
                        disabled={busy}
                        onChange={(e) => patch(g.id, { sortOrder: e.target.value === '' ? null : Number(e.target.value) })}
                      />
                    </td>
                    <td>
                      {status === 'active'
                        ? <span className="adm__ok">{STATUS_LABEL.active}</span>
                        : <span className="adm__miss">{STATUS_LABEL.hidden}</span>}
                    </td>
                    <td className="adm__rowacts">
                      <button
                        type="button" className="btn btn--ghost" disabled={busy}
                        onClick={() => patch(g.id, { status: status === 'active' ? 'hidden' : 'active' })}
                      >
                        {status === 'active' ? 'লুকান' : 'দেখান'}
                      </button>
                      {o?.iconUrl && (
                        <button
                          type="button" className="btn btn--ghost" disabled={busy}
                          onClick={() => removeIcon(g.id)}
                        >
                          আইকন মুছুন
                        </button>
                      )}
                      {o && (
                        <button
                          type="button" className="btn btn--ghost adm__danger" disabled={busy}
                          onClick={() => send(g.id, { action: 'clear' })}
                        >
                          রিসেট
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {shown < filtered.length && (
        <div className="adm__actions" style={{ marginTop: 12 }}>
          <button type="button" className="btn btn--ghost" onClick={() => setShown((n) => n + PAGE_SIZE)}>
            আরও দেখুন ({filtered.length - shown} টি বাকি)
          </button>
        </div>
      )}
    </>
  );
}
