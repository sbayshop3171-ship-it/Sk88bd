'use client';

import { useMemo, useState } from 'react';
import type { SignalAppKeyAdminState } from '@/lib/signal-app-access';

type AppKey = SignalAppKeyAdminState['keys'][number];

export default function AppKeysControl({ initialState }: { initialState: SignalAppKeyAdminState }) {
  const [state, setState] = useState(initialState);
  const [generatedKey, setGeneratedKey] = useState(initialState.generatedKey ?? '');
  const [name, setName] = useState('Xiaomi Signal Access');
  const [maxDevices, setMaxDevices] = useState(1);
  const [expiresAt, setExpiresAt] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const stats = useMemo(() => {
    const active = state.keys.filter((key) => key.status === 'active').length;
    const devices = state.keys.reduce((sum, key) => sum + key.deviceCount, 0);
    const revoked = state.keys.filter((key) => key.status === 'revoked').length;
    return { active, devices, revoked };
  }, [state.keys]);

  async function send(action: string, body: Record<string, unknown> = {}) {
    setBusy(action);
    setError('');
    setCopied(false);
    try {
      const res = await fetch('/api/admin/app-keys', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, ...body }),
      });
      const next = (await res.json()) as SignalAppKeyAdminState & { reason?: string };
      if (!res.ok || !next.ok) throw new Error(next.reason ?? `API ${res.status}`);
      setState(next);
      if (next.generatedKey) setGeneratedKey(next.generatedKey);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'App key update failed');
    } finally {
      setBusy('');
    }
  }

  async function copyKey() {
    if (!generatedKey) return;
    try {
      await navigator.clipboard.writeText(generatedKey);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <>
      <div className="adm-signal__hero">
        <div>
          <p className="adm-signal__eyebrow">DEVICE BOUND ACCESS</p>
          <h1 className="adm__h1">Signal App Keys</h1>
          <p className="adm__sub">
            APK হাতে পেলেও key ছাড়া signal API খুলবে না। Key unlock হলে device bind
            হবে, এরপর app token দিয়ে auto signal চালাবে।
          </p>
        </div>
        <div className="adm-signal__status">
          <b>{state.keys.length}</b>
          <span>Total keys, {stats.active} active, {stats.devices} bound devices</span>
        </div>
      </div>

      {error && <div className="adm__warn">{error}</div>}

      <div className="adm__tiles">
        <div className="adm__tile"><b>{stats.active}</b><small>Active keys</small></div>
        <div className="adm__tile"><b>{stats.devices}</b><small>Bound devices</small></div>
        <div className="adm__tile"><b>{stats.revoked}</b><small>Revoked keys</small></div>
      </div>

      <section className="adm-keys__grid">
        <form
          className="adm-signal__panel"
          onSubmit={(event) => {
            event.preventDefault();
            void send('generate', { name, maxDevices, expiresAt, note });
          }}
        >
          <h2 className="adm__h2">Generate New Key</h2>
          <label className="adm-signal__field">
            <span>Name</span>
            <input value={name} onChange={(event) => setName(event.target.value)} required />
          </label>
          <div className="adm-keys__form-row">
            <label className="adm-signal__field">
              <span>Max device</span>
              <input
                type="number"
                min={1}
                max={25}
                value={maxDevices}
                onChange={(event) => setMaxDevices(Number(event.target.value))}
              />
            </label>
            <label className="adm-signal__field">
              <span>Expiry</span>
              <input type="date" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} />
            </label>
          </div>
          <label className="adm-signal__field">
            <span>Note</span>
            <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="optional" />
          </label>
          <button className="btn btn--gold btn--block" type="submit" disabled={Boolean(busy)}>
            {busy === 'generate' ? 'Generating...' : 'Generate app key'}
          </button>
        </form>

        <div className="adm-keys__vault">
          <h2 className="adm__h2">Last Generated Key</h2>
          {generatedKey ? (
            <>
              <div className="adm-keys__secret">{generatedKey}</div>
              <button type="button" className="btn btn--ghost" onClick={copyKey}>
                {copied ? 'Copied' : 'Copy key'}
              </button>
              <p>
                এই full key শুধু এখন দেখা যাবে। Refresh করলে admin panel শুধু prefix
                দেখাবে, full key আর server file-এ plain থাকবে না।
              </p>
            </>
          ) : (
            <p>Generate করলে full key এখানে একবার দেখাবে।</p>
          )}
        </div>
      </section>

      <section>
        <h2 className="adm__h2">Keys</h2>
        <div className="adm-keys__list">
          {state.keys.length === 0 ? (
            <div className="adm-keys__empty">এখনো কোনো app key generate করা হয়নি।</div>
          ) : (
            state.keys.map((key) => (
              <KeyRow key={key.id} item={key} busy={busy} onAction={send} />
            ))
          )}
        </div>
      </section>

      <section>
        <h2 className="adm__h2">Access Logs</h2>
        <div className="adm-signal__logs">
          {state.auditLogs.slice(0, 10).map((log) => (
            <div key={log.id}>
              <b>{log.action}</b>
              <span>{log.message}</span>
              <small>{timeOnly(log.createdAt)}</small>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function KeyRow({
  item,
  busy,
  onAction,
}: {
  item: AppKey;
  busy: string;
  onAction: (action: string, body?: Record<string, unknown>) => Promise<void>;
}) {
  const locked = Boolean(busy) || item.status === 'revoked';

  return (
    <article className={`adm-keys__row is-${item.status}`}>
      <div>
        <div className="adm-keys__top">
          <b>{item.name}</b>
          <span>{item.status.toUpperCase()}</span>
        </div>
        <div className="adm-keys__meta">
          <span>Prefix: {item.keyPrefix}</span>
          <span>Devices: {item.deviceCount}/{item.maxDevices}</span>
          <span>Expires: {item.expiresAt ? dateOnly(item.expiresAt) : 'Never'}</span>
          <span>Last: {item.lastUsedAt ? timeOnly(item.lastUsedAt) : 'Unused'}</span>
        </div>
        {item.note && <p>{item.note}</p>}
        {item.devices.length > 0 && (
          <div className="adm-keys__devices">
            {item.devices.map((device) => (
              <span key={device.deviceHash}>
                {device.deviceHash} • {device.appVersion} • {timeOnly(device.lastUsedAt)}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="adm-keys__actions">
        <button
          type="button"
          className="btn btn--ghost"
          disabled={locked}
          onClick={() => onAction('toggle', { keyId: item.id, active: item.status !== 'active' })}
        >
          {item.status === 'active' ? 'Disable' : 'Enable'}
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          disabled={locked}
          onClick={() => onAction('reset-devices', { keyId: item.id })}
        >
          Reset devices
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          disabled={locked}
          onClick={() => onAction('revoke', { keyId: item.id })}
        >
          Revoke
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          disabled={Boolean(busy)}
          onClick={() => onAction('delete', { keyId: item.id })}
        >
          Delete
        </button>
      </div>
    </article>
  );
}

function dateOnly(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB');
}

function timeOnly(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
