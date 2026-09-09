'use client';

import { useState } from 'react';
import {
  ART_CLASSES,
  ART_LABEL,
  MAX_SLIDES,
  SLIDE_IMAGE_MAX_BYTES,
  type Announcement,
  type ArtClass,
  type Banner,
  type SiteContent,
  type SlideStatus,
} from '@/lib/site-content';

type Kind = 'banner' | 'announcement';

type Draft = {
  kicker: string;
  title: string;
  amount: string;
  emoji: string;
  cta: string;
  href: string;
  note: string;
  art: ArtClass;
  status: SlideStatus;
  sortOrder: number;
};

const ERROR_LABEL: Record<string, string> = {
  'invalid-title': 'Enter a title (at least 2 characters).',
  'invalid-href': 'The link must be an in-site path, e.g. /deposit.',
  'list-full': `You can keep up to ${MAX_SLIDES} slides.`,
  'not-found': 'Slide not found — refresh the page.',
  'no-file': 'No image was chosen.',
  'bad-type': 'Only PNG, JPG, WEBP or GIF images are accepted.',
  'too-large': `The image must be under ${Math.round(SLIDE_IMAGE_MAX_BYTES / 1024 / 1024)} MB.`,
  unauthorized: 'Your session has expired — log in again.',
};

const BLANK: Draft = {
  kicker: '', title: '', amount: '', emoji: '🎁', cta: 'Details',
  href: '/promotions', note: '', art: 's1', status: 'active', sortOrder: 1,
};

export default function SiteContentControl({ initial }: { initial: SiteContent }) {
  const [content, setContent] = useState(initial);
  const [kind, setKind] = useState<Kind>('banner');
  const [form, setForm] = useState<Draft>(BLANK);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  // bumped after every upload so the browser fetches the new bytes at the
  // same URL
  const [imageVersion, setImageVersion] = useState(0);

  const list: (Banner | Announcement)[] =
    kind === 'banner' ? content.banners : content.announcements;
  const full = !editingId && list.length >= MAX_SLIDES;

  async function send(body: Record<string, unknown>, okMessage: string) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const res = await fetch('/api/admin/site-content', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as
        | { ok: true; content: SiteContent }
        | { ok: false; reason: string };

      if (!data.ok) {
        setError(ERROR_LABEL[data.reason] ?? `Something went wrong (${data.reason})`);
        return false;
      }
      setContent(data.content);
      setNotice(okMessage);
      return true;
    } catch {
      setError('Could not reach the server — try again.');
      return false;
    } finally {
      setBusy(false);
    }
  }

  /** A picture for one slide. When it is set the site shows the picture
      instead of the drawn gradient card. */
  async function uploadImage(id: string, file: File) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const body = new FormData();
      body.append('kind', kind);
      body.append('id', id);
      body.append('file', file);
      const res = await fetch('/api/admin/slide-image', { method: 'POST', body });
      const data = (await res.json()) as
        | { ok: true; content: SiteContent }
        | { ok: false; reason: string };
      if (!data.ok) {
        setError(ERROR_LABEL[data.reason] ?? `Upload failed (${data.reason})`);
        return;
      }
      setContent(data.content);
      setImageVersion((v) => v + 1);
      setNotice('Image set — the site now shows this picture.');
    } catch {
      setError('Could not upload — try again.');
    } finally {
      setBusy(false);
    }
  }

  async function removeImage(id: string) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const res = await fetch(
        `/api/admin/slide-image?kind=${kind}&id=${encodeURIComponent(id)}`,
        { method: 'DELETE' },
      );
      const data = (await res.json()) as
        | { ok: true; content: SiteContent }
        | { ok: false; reason: string };
      if (!data.ok) {
        setError(ERROR_LABEL[data.reason] ?? `Could not delete (${data.reason})`);
        return;
      }
      setContent(data.content);
      setImageVersion((v) => v + 1);
      setNotice('Image removed — the colour card is back.');
    } catch {
      setError('Could not reach the server — try again.');
    } finally {
      setBusy(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const ok = editingId
      ? await send({ action: 'update', kind, id: editingId, ...form }, 'Slide updated.')
      : await send({ action: 'add', kind, ...form }, 'New slide added.');
    if (ok) {
      setForm({ ...BLANK, sortOrder: list.length + 1 });
      setEditingId(null);
    }
  }

  function edit(slide: Banner | Announcement) {
    const b = slide as Banner;
    const a = slide as Announcement;
    setEditingId(slide.id);
    setError('');
    setNotice('');
    setForm({
      kicker: b.kicker ?? '',
      title: slide.title,
      amount: slide.amount,
      emoji: b.emoji ?? '🎁',
      cta: b.cta ?? 'Details',
      href: b.href ?? '/promotions',
      note: a.note ?? '',
      art: slide.art,
      status: slide.status,
      sortOrder: slide.sortOrder,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function switchKind(next: Kind) {
    setKind(next);
    setEditingId(null);
    setForm(BLANK);
    setError('');
    setNotice('');
  }

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const isBanner = kind === 'banner';

  return (
    <>
      <div className="adm__seg">
        <button type="button" className={isBanner ? 'on' : ''} onClick={() => switchKind('banner')}>
          Home banners ({content.banners.length})
        </button>
        <button type="button" className={!isBanner ? 'on' : ''} onClick={() => switchKind('announcement')}>
          Announcement popup ({content.announcements.length})
        </button>
      </div>

      <form className="adm__card" onSubmit={submit}>
        <h2 className="adm__cardh">
          {editingId ? 'Edit slide' : isBanner ? 'New banner' : 'New announcement'}
        </h2>

        <div className="adm__formgrid">
          {isBanner && (
            <label className="adm__f">
              <span>Kicker line</span>
              <input value={form.kicker} onChange={(e) => set('kicker', e.target.value)} placeholder="Sign Up Bonus" disabled={busy} />
            </label>
          )}

          <label className="adm__f">
            <span>Title</span>
            <input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="৳18 Free Bonus" disabled={busy} />
          </label>

          <label className="adm__f">
            <span>Big figure</span>
            <input value={form.amount} onChange={(e) => set('amount', e.target.value)} placeholder="৳18" disabled={busy} />
          </label>

          {isBanner ? (
            <>
              <label className="adm__f">
                <span>Emoji</span>
                <input value={form.emoji} onChange={(e) => set('emoji', e.target.value)} placeholder="🎁" disabled={busy} />
              </label>
              <label className="adm__f">
                <span>Button text</span>
                <input value={form.cta} onChange={(e) => set('cta', e.target.value)} placeholder="Claim Now" disabled={busy} />
              </label>
              <label className="adm__f">
                <span>Link (in-site)</span>
                <input value={form.href} onChange={(e) => set('href', e.target.value)} placeholder="/register" disabled={busy} />
              </label>
            </>
          ) : (
            <label className="adm__f adm__f--wide">
              <span>Note line</span>
              <input value={form.note} onChange={(e) => set('note', e.target.value)} placeholder="Sign up and verify your number" disabled={busy} />
            </label>
          )}

          <label className="adm__f">
            <span>Colour</span>
            <select value={form.art} onChange={(e) => set('art', e.target.value as ArtClass)} disabled={busy}>
              {ART_CLASSES.map((a) => <option key={a} value={a}>{ART_LABEL[a]}</option>)}
            </select>
          </label>

          <label className="adm__f">
            <span>Order</span>
            <input type="number" min={1} max={99} value={form.sortOrder} onChange={(e) => set('sortOrder', Number(e.target.value))} disabled={busy} />
          </label>

          <label className="adm__f">
            <span>Status</span>
            <select value={form.status} onChange={(e) => set('status', e.target.value as SlideStatus)} disabled={busy}>
              <option value="active">Shown</option>
              <option value="hidden">Hidden</option>
            </select>
          </label>
        </div>

        {full && <p className="adm__warn" style={{ margin: '0 0 10px' }}>You have reached {MAX_SLIDES} slides.</p>}
        {error && <p className="adm__err">{error}</p>}
        {notice && <p className="adm__note">{notice}</p>}

        <div className="adm__actions">
          <button type="submit" className="btn btn--gold" disabled={busy || full}>
            {editingId ? 'Update' : 'Add'}
          </button>
          {editingId && (
            <button type="button" className="btn btn--ghost" onClick={() => { setEditingId(null); setForm(BLANK); }} disabled={busy}>
              Cancel
            </button>
          )}
        </div>

        <p className="adm__hint">
          Changes go live the moment you save — slides are ordered low to high.
          Click the “Image” cell in the table below to put your own picture on any slide
          ({isBanner ? '2:1 for banners, e.g. 1280×640' : 'square for the popup, e.g. 800×800'});
          when a slide has an image the site shows the picture only, not the text.
        </p>
      </form>

      <div className="adm__tablewrap">
        <table className="adm__table">
          <thead>
            <tr>
              <th>Image</th><th>Order</th><th>Title</th>
              <th>{isBanner ? 'Link' : 'Note'}</th>
              <th>Figure</th><th>Colour</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr><td colSpan={8} className="adm__empty">No slides yet — add one with the form above.</td></tr>
            ) : (
              list.map((s) => (
                <tr key={s.id}>
                  <td>
                    <label className={`adm__icon${isBanner ? ' adm__icon--wide' : ''}`} title="Change image">
                      {s.imageUrl
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={`${s.imageUrl}?v=${imageVersion}`} alt="" />
                        : <span className="adm__icon-none">+</span>}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        aria-label={`${s.title} — upload image`}
                        disabled={busy}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          e.target.value = '';
                          if (file) void uploadImage(s.id, file);
                        }}
                      />
                    </label>
                  </td>
                  <td>{s.sortOrder}</td>
                  <td>{isBanner && (s as Banner).emoji} {s.title}</td>
                  <td>{isBanner ? <code>{(s as Banner).href}</code> : <span className="adm__muted">{(s as Announcement).note || '—'}</span>}</td>
                  <td>{s.amount || '—'}</td>
                  <td>{ART_LABEL[s.art]}</td>
                  <td>{s.status === 'active' ? <span className="adm__ok">Showing</span> : <span className="adm__miss">Hidden</span>}</td>
                  <td className="adm__rowacts">
                    <button type="button" className="btn btn--ghost" onClick={() => edit(s)} disabled={busy}>Edit</button>
                    {s.imageUrl && (
                      <button type="button" className="btn btn--ghost" disabled={busy} onClick={() => removeImage(s.id)}>
                        Remove image
                      </button>
                    )}
                    <button
                      type="button" className="btn btn--ghost" disabled={busy}
                      onClick={() => send(
                        { action: 'update', kind, ...s, status: s.status === 'active' ? 'hidden' : 'active' },
                        s.status === 'active' ? 'Slide hidden.' : 'Slide is showing.',
                      )}
                    >
                      {s.status === 'active' ? 'Hide' : 'Show'}
                    </button>
                    <button
                      type="button" className="btn btn--ghost adm__danger" disabled={busy}
                      onClick={() => send({ action: 'remove', kind, id: s.id }, 'Slide deleted.')}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
