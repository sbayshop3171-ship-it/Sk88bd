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
  unauthorized: 'Your session has expired — log in again.',
  forbidden: 'Only the super admin can manage staff accounts.',
  'invalid-action': 'That request was not understood.',
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
        setError(ERROR_LABEL[data.reason] ?? `Something went wrong (${data.reason})`);
        return false;
      }
      setStaff(data.staff);
      setNotice(okMessage);
      return true;
    } catch {
      setError('Could not reach the server — try again.');
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const made = await send(
      { action: 'create', username, password, role },
      `${username} — ${ROLE_LABEL[role]} account created.`,
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
      'Password changed — pass the new one on to them.',
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
        <div className="adm__tile"><b>{staff.length}</b><small>Staff accounts</small></div>
        <div className="adm__tile"><b>{admins}</b><small>Admins</small></div>
        <div className="adm__tile"><b>{agents}</b><small>Agents</small></div>
        <div className="adm__tile"><b>{staff.filter((s) => s.active).length}</b><small>Active</small></div>
      </div>

      <form className="adm__card" onSubmit={create}>
        <h2 className="adm__cardh">Add a staff account</h2>

        <div className="adm__formgrid">
          <label className="adm__f">
            <span>Username</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder="e.g. agent1"
              autoComplete="off"
              disabled={busy}
            />
          </label>

          <label className="adm__f">
            <span>Password (at least {MIN_PASSWORD_LENGTH} characters)</span>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Something you can pass on to them"
              autoComplete="new-password"
              disabled={busy}
            />
          </label>

          <label className="adm__f">
            <span>Role</span>
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
          <button type="submit" className="btn btn--gold" disabled={busy}>Add</button>
        </div>

        <p className="adm__hint">
          Passwords are hashed on the server — they can never be read back, so a
          forgotten one has to be replaced from here.
        </p>
      </form>

      {resetId && (
        <form className="adm__card" onSubmit={resetSubmit}>
          <h2 className="adm__cardh">
            New password — {staff.find((s) => s.id === resetId)?.username}
          </h2>
          <div className="adm__formgrid">
            <label className="adm__f adm__f--wide">
              <span>Password (at least {MIN_PASSWORD_LENGTH} characters)</span>
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
            <button type="submit" className="btn btn--gold" disabled={busy}>Save</button>
            <button
              type="button" className="btn btn--ghost" disabled={busy}
              onClick={() => { setResetId(''); setResetPassword(''); }}
            >
              Cancel
            </button>
          </div>
          <p className="adm__hint">
            Saving logs that account out of every open session straight away.
          </p>
        </form>
      )}

      <div className="adm__tablewrap">
        <table className="adm__table">
          <thead>
            <tr>
              <th>Username</th><th>Role</th><th>Link code</th><th>Status</th>
              <th>Last login</th><th>Added by</th><th></th>
            </tr>
          </thead>
          <tbody>
            {staff.length === 0 ? (
              <tr>
                <td colSpan={7} className="adm__empty">
                  No staff accounts yet — add one with the form above.
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
                        `${s.username} is now ${ROLE_LABEL[e.target.value as AdminRole]}.`,
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
                      ? <span className="adm__ok">Active</span>
                      : <span className="adm__miss">Disabled</span>}
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
                      Password
                    </button>
                    <button
                      type="button" className="btn btn--ghost" disabled={busy}
                      onClick={() => void send(
                        { action: 'set-active', id: s.id, active: !s.active },
                        s.active ? `${s.username} disabled.` : `${s.username} enabled.`,
                      )}
                    >
                      {s.active ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      type="button" className="btn btn--ghost adm__danger" disabled={busy}
                      onClick={() => void send(
                        { action: 'remove', id: s.id },
                        `${s.username} deleted.`,
                      )}
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

      <p className="adm__hint">
        A disabled or deleted account is thrown out of the panel immediately — there is
        no waiting for a cookie to expire.
      </p>
    </>
  );
}
