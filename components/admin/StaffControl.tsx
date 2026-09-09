'use client';

import { useState } from 'react';
import {
  ASSIGNABLE_ROLES,
  MIN_PASSWORD_LENGTH,
  ROLE_HELP,
  ROLE_LABEL,
  STAFF_ERROR_LABEL,
  type AdminRole,
  type AdminStaff,
  type StaffMutationReason,
} from '@/lib/admin-roles';

const ERROR_LABEL: Record<string, string> = {
  ...STAFF_ERROR_LABEL,
  unauthorized: 'সেশন শেষ হয়ে গেছে — আবার লগইন করুন।',
  forbidden: 'স্টাফ অ্যাকাউন্ট শুধু সুপার অ্যাডমিন সামলাতে পারেন।',
  'invalid-action': 'অনুরোধটি বোঝা গেল না।',
};

export default function StaffControl({ initialStaff }: { initialStaff: AdminStaff[] }) {
  const [staff, setStaff] = useState(initialStaff);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<AdminRole>('agent');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  /** the account whose password is being reset, and the new one typed */
  const [resetId, setResetId] = useState('');
  const [resetPassword, setResetPassword] = useState('');

  async function send(body: Record<string, unknown>, okMessage: string) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const res = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as
        | { ok: true; staff: AdminStaff[] }
        | { ok: false; reason: StaffMutationReason | string };

      if (!data.ok) {
        setError(ERROR_LABEL[data.reason] ?? `সমস্যা হয়েছে (${data.reason})`);
        return false;
      }
      setStaff(data.staff);
      setNotice(okMessage);
      return true;
    } catch {
      setError('সার্ভারে পৌঁছানো গেল না — আবার চেষ্টা করুন।');
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const made = await send(
      { action: 'create', username, password, role },
      `${username} — ${ROLE_LABEL[role]} অ্যাকাউন্ট তৈরি হয়েছে।`,
    );
    if (made) {
      setUsername('');
      setPassword('');
    }
  }

  async function resetSubmit(e: React.FormEvent) {
    e.preventDefault();
    const done = await send(
      { action: 'set-password', id: resetId, password: resetPassword },
      'পাসওয়ার্ড বদলে দেওয়া হয়েছে — নতুনটা তাকে জানিয়ে দিন।',
    );
    if (done) {
      setResetId('');
      setResetPassword('');
    }
  }

  const agents = staff.filter((s) => s.role === 'agent').length;
  const admins = staff.filter((s) => s.role === 'admin').length;

  return (
    <>
      <div className="adm__tiles" style={{ marginBottom: 14 }}>
        <div className="adm__tile"><b>{staff.length}</b><small>স্টাফ অ্যাকাউন্ট</small></div>
        <div className="adm__tile"><b>{admins}</b><small>অ্যাডমিন</small></div>
        <div className="adm__tile"><b>{agents}</b><small>এজেন্ট</small></div>
        <div className="adm__tile"><b>{staff.filter((s) => s.active).length}</b><small>সক্রিয়</small></div>
      </div>

      <form className="adm__card" onSubmit={create}>
        <h2 className="adm__cardh">নতুন স্টাফ যোগ করুন</h2>

        <div className="adm__formgrid">
          <label className="adm__f">
            <span>ইউজারনেম</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder="যেমন: agent1"
              autoComplete="off"
              disabled={busy}
            />
          </label>

          <label className="adm__f">
            <span>পাসওয়ার্ড (কমপক্ষে {MIN_PASSWORD_LENGTH} অক্ষর)</span>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="তাকে জানিয়ে দেওয়ার মতো একটা"
              autoComplete="new-password"
              disabled={busy}
            />
          </label>

          <label className="adm__f">
            <span>রোল</span>
            <select value={role} onChange={(e) => setRole(e.target.value as AdminRole)} disabled={busy}>
              {ASSIGNABLE_ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_LABEL[r]}</option>
              ))}
            </select>
            <em className="adm__hint">{ROLE_HELP[role]}</em>
          </label>
        </div>

        {error && <p className="adm__err">{error}</p>}
        {notice && <p className="adm__note">{notice}</p>}

        <div className="adm__actions">
          <button type="submit" className="btn btn--gold" disabled={busy}>যোগ করুন</button>
        </div>

        <p className="adm__hint">
          পাসওয়ার্ড সার্ভারে হ্যাশ করে রাখা হয় — পরে আর দেখা যাবে না, ভুলে গেলে
          এখান থেকে নতুন একটা বসাতে হবে।
        </p>
      </form>

      {resetId && (
        <form className="adm__card" onSubmit={resetSubmit}>
          <h2 className="adm__cardh">
            নতুন পাসওয়ার্ড — {staff.find((s) => s.id === resetId)?.username}
          </h2>
          <div className="adm__formgrid">
            <label className="adm__f adm__f--wide">
              <span>পাসওয়ার্ড (কমপক্ষে {MIN_PASSWORD_LENGTH} অক্ষর)</span>
              <input
                type="text"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                autoComplete="new-password"
                disabled={busy}
              />
            </label>
          </div>
          <div className="adm__actions">
            <button type="submit" className="btn btn--gold" disabled={busy}>সেভ করুন</button>
            <button
              type="button" className="btn btn--ghost" disabled={busy}
              onClick={() => { setResetId(''); setResetPassword(''); }}
            >
              বাতিল
            </button>
          </div>
          <p className="adm__hint">
            সেভ করলে ঐ অ্যাকাউন্টের চালু সেশনগুলো সাথে সাথে লগআউট হয়ে যাবে।
          </p>
        </form>
      )}

      <div className="adm__tablewrap">
        <table className="adm__table">
          <thead>
            <tr>
              <th>ইউজারনেম</th><th>রোল</th><th>লিংক কোড</th><th>অবস্থা</th>
              <th>শেষ লগইন</th><th>যোগ করেছেন</th><th></th>
            </tr>
          </thead>
          <tbody>
            {staff.length === 0 ? (
              <tr>
                <td colSpan={7} className="adm__empty">
                  কোনো স্টাফ অ্যাকাউন্ট নেই — উপরের ফর্ম থেকে যোগ করুন।
                </td>
              </tr>
            ) : (
              staff.map((s) => (
                <tr key={s.id}>
                  <td><code>{s.username}</code></td>
                  <td>
                    <select
                      value={s.role}
                      disabled={busy}
                      onChange={(e) => void send(
                        { action: 'set-role', id: s.id, role: e.target.value },
                        `${s.username} এখন ${ROLE_LABEL[e.target.value as AdminRole]}।`,
                      )}
                    >
                      {ASSIGNABLE_ROLES.map((r) => (
                        <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                      ))}
                    </select>
                  </td>
                  <td><code>{s.refCode}</code></td>
                  <td>
                    {s.active
                      ? <span className="adm__ok">সক্রিয়</span>
                      : <span className="adm__miss">বন্ধ</span>}
                  </td>
                  <td className="adm__muted">
                    {s.lastLoginAt ? new Date(s.lastLoginAt).toLocaleString('en-GB') : '—'}
                  </td>
                  <td className="adm__muted">{s.createdBy}</td>
                  <td className="adm__rowacts">
                    <button
                      type="button" className="btn btn--ghost" disabled={busy}
                      onClick={() => { setResetId(s.id); setResetPassword(''); }}
                    >
                      পাসওয়ার্ড
                    </button>
                    <button
                      type="button" className="btn btn--ghost" disabled={busy}
                      onClick={() => void send(
                        { action: 'set-active', id: s.id, active: !s.active },
                        s.active ? `${s.username} বন্ধ করা হয়েছে।` : `${s.username} চালু করা হয়েছে।`,
                      )}
                    >
                      {s.active ? 'বন্ধ' : 'চালু'}
                    </button>
                    <button
                      type="button" className="btn btn--ghost adm__danger" disabled={busy}
                      onClick={() => void send(
                        { action: 'remove', id: s.id },
                        `${s.username} মুছে ফেলা হয়েছে।`,
                      )}
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

      <p className="adm__hint">
        বন্ধ করা বা মুছে ফেলা অ্যাকাউন্ট সাথে সাথেই প্যানেল থেকে বেরিয়ে যায় —
        কুকির মেয়াদ শেষ হওয়ার অপেক্ষা করতে হয় না।
      </p>
    </>
  );
}
