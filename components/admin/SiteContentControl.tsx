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
  'invalid-title': 'শিরোনাম দিন (কমপক্ষে ২ অক্ষর)।',
  'invalid-href': 'লিংক সাইটের ভেতরের পথ হতে হবে, যেমন /deposit।',
  'list-full': `সর্বোচ্চ ${MAX_SLIDES} টি স্লাইড রাখা যায়।`,
  'not-found': 'স্লাইডটি পাওয়া যায়নি — পেজ রিফ্রেশ করুন।',
  'no-file': 'কোনো ছবি বাছা হয়নি।',
  'bad-type': 'শুধু PNG, JPG, WEBP বা GIF ছবি দিন।',
  'too-large': `ছবি ${Math.round(SLIDE_IMAGE_MAX_BYTES / 1024 / 1024)} MB এর ছোট হতে হবে।`,
  unauthorized: 'সেশন শেষ হয়ে গেছে — আবার লগইন করুন।',
};

const BLANK: Draft = {
  kicker: '', title: '', amount: '', emoji: '🎁', cta: 'বিস্তারিত',
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
        setError(ERROR_LABEL[data.reason] ?? `সমস্যা হয়েছে (${data.reason})`);
        return false;
      }
      setContent(data.content);
      setNotice(okMessage);
      return true;
    } catch {
      setError('সার্ভারে পৌঁছানো গেল না — আবার চেষ্টা করুন।');
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
        setError(ERROR_LABEL[data.reason] ?? `আপলোড হয়নি (${data.reason})`);
        return;
      }
      setContent(data.content);
      setImageVersion((v) => v + 1);
      setNotice('ছবি বসানো হয়েছে — সাইটে এখন এই ছবিটাই দেখাবে।');
    } catch {
      setError('আপলোড করা গেল না — আবার চেষ্টা করুন।');
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
        setError(ERROR_LABEL[data.reason] ?? `মোছা গেল না (${data.reason})`);
        return;
      }
      setContent(data.content);
      setImageVersion((v) => v + 1);
      setNotice('ছবি সরানো হয়েছে — আবার রঙের কার্ড দেখাবে।');
    } catch {
      setError('সার্ভারে পৌঁছানো গেল না — আবার চেষ্টা করুন।');
    } finally {
      setBusy(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const ok = editingId
      ? await send({ action: 'update', kind, id: editingId, ...form }, 'স্লাইড আপডেট হয়েছে।')
      : await send({ action: 'add', kind, ...form }, 'নতুন স্লাইড যোগ হয়েছে।');
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
      cta: b.cta ?? 'বিস্তারিত',
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
          হোম ব্যানার ({content.banners.length})
        </button>
        <button type="button" className={!isBanner ? 'on' : ''} onClick={() => switchKind('announcement')}>
          ঘোষণা পপআপ ({content.announcements.length})
        </button>
      </div>

      <form className="adm__card" onSubmit={submit}>
        <h2 className="adm__cardh">
          {editingId ? 'স্লাইড এডিট' : isBanner ? 'নতুন ব্যানার' : 'নতুন ঘোষণা'}
        </h2>

        <div className="adm__formgrid">
          {isBanner && (
            <label className="adm__f">
              <span>উপরের ছোট লেখা</span>
              <input value={form.kicker} onChange={(e) => set('kicker', e.target.value)} placeholder="সাইন আপ বোনাস" disabled={busy} />
            </label>
          )}

          <label className="adm__f">
            <span>শিরোনাম</span>
            <input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="১৮৳ ফ্রি বোনাস" disabled={busy} />
          </label>

          <label className="adm__f">
            <span>বড় অংক</span>
            <input value={form.amount} onChange={(e) => set('amount', e.target.value)} placeholder="৳১৮" disabled={busy} />
          </label>

          {isBanner ? (
            <>
              <label className="adm__f">
                <span>ইমোজি</span>
                <input value={form.emoji} onChange={(e) => set('emoji', e.target.value)} placeholder="🎁" disabled={busy} />
              </label>
              <label className="adm__f">
                <span>বাটনের লেখা</span>
                <input value={form.cta} onChange={(e) => set('cta', e.target.value)} placeholder="এখনই নিন" disabled={busy} />
              </label>
              <label className="adm__f">
                <span>লিংক (সাইটের ভেতরে)</span>
                <input value={form.href} onChange={(e) => set('href', e.target.value)} placeholder="/register" disabled={busy} />
              </label>
            </>
          ) : (
            <label className="adm__f adm__f--wide">
              <span>নিচের লেখা</span>
              <input value={form.note} onChange={(e) => set('note', e.target.value)} placeholder="সাইন আপ করে নাম্বার ভেরিফাই করুন" disabled={busy} />
            </label>
          )}

          <label className="adm__f">
            <span>রঙ</span>
            <select value={form.art} onChange={(e) => set('art', e.target.value as ArtClass)} disabled={busy}>
              {ART_CLASSES.map((a) => <option key={a} value={a}>{ART_LABEL[a]}</option>)}
            </select>
          </label>

          <label className="adm__f">
            <span>ক্রম</span>
            <input type="number" min={1} max={99} value={form.sortOrder} onChange={(e) => set('sortOrder', Number(e.target.value))} disabled={busy} />
          </label>

          <label className="adm__f">
            <span>অবস্থা</span>
            <select value={form.status} onChange={(e) => set('status', e.target.value as SlideStatus)} disabled={busy}>
              <option value="active">দেখানো হবে</option>
              <option value="hidden">লুকানো</option>
            </select>
          </label>
        </div>

        {full && <p className="adm__warn" style={{ margin: '0 0 10px' }}>সর্বোচ্চ {MAX_SLIDES} টি স্লাইড হয়ে গেছে।</p>}
        {error && <p className="adm__err">{error}</p>}
        {notice && <p className="adm__note">{notice}</p>}

        <div className="adm__actions">
          <button type="submit" className="btn btn--gold" disabled={busy || full}>
            {editingId ? 'আপডেট করুন' : 'যোগ করুন'}
          </button>
          {editingId && (
            <button type="button" className="btn btn--ghost" onClick={() => { setEditingId(null); setForm(BLANK); }} disabled={busy}>
              বাতিল
            </button>
          )}
        </div>

        <p className="adm__hint">
          সেভ করার সাথে সাথেই সাইটে বদলে যাবে — ক্রম ছোট থেকে বড় হিসেবে সাজানো হয়।
          নিচের তালিকায় “ছবি” ঘরে ক্লিক করে যেকোনো স্লাইডে নিজের ছবি বসানো যায়
          ({isBanner ? 'ব্যানারের জন্য ২:১ মাপ, যেমন ১২৮০×৬৪০' : 'পপআপের জন্য বর্গাকার, যেমন ৮০০×৮০০'});
          ছবি থাকলে সাইটে শুধু ছবিটাই দেখাবে, লেখা নয়।
        </p>
      </form>

      <div className="adm__tablewrap">
        <table className="adm__table">
          <thead>
            <tr>
              <th>ছবি</th><th>ক্রম</th><th>শিরোনাম</th>
              <th>{isBanner ? 'লিংক' : 'নিচের লেখা'}</th>
              <th>অংক</th><th>রঙ</th><th>অবস্থা</th><th></th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr><td colSpan={8} className="adm__empty">কোনো স্লাইড নেই — উপরের ফর্ম থেকে যোগ করুন।</td></tr>
            ) : (
              list.map((s) => (
                <tr key={s.id}>
                  <td>
                    <label className={`adm__icon${isBanner ? ' adm__icon--wide' : ''}`} title="ছবি বদলান">
                      {s.imageUrl
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={`${s.imageUrl}?v=${imageVersion}`} alt="" />
                        : <span className="adm__icon-none">+</span>}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        aria-label={`${s.title} — ছবি আপলোড`}
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
                  <td>{s.status === 'active' ? <span className="adm__ok">দেখানো হচ্ছে</span> : <span className="adm__miss">লুকানো</span>}</td>
                  <td className="adm__rowacts">
                    <button type="button" className="btn btn--ghost" onClick={() => edit(s)} disabled={busy}>এডিট</button>
                    {s.imageUrl && (
                      <button type="button" className="btn btn--ghost" disabled={busy} onClick={() => removeImage(s.id)}>
                        ছবি মুছুন
                      </button>
                    )}
                    <button
                      type="button" className="btn btn--ghost" disabled={busy}
                      onClick={() => send(
                        { action: 'update', kind, ...s, status: s.status === 'active' ? 'hidden' : 'active' },
                        s.status === 'active' ? 'স্লাইড লুকানো হয়েছে।' : 'স্লাইড দেখানো হচ্ছে।',
                      )}
                    >
                      {s.status === 'active' ? 'লুকান' : 'দেখান'}
                    </button>
                    <button
                      type="button" className="btn btn--ghost adm__danger" disabled={busy}
                      onClick={() => send({ action: 'remove', kind, id: s.id }, 'স্লাইড মুছে ফেলা হয়েছে।')}
                    >
                      মুছুন
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
