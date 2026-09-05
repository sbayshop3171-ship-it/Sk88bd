'use client';

import { useEffect, useMemo, useState } from 'react';
import { fmtX } from '@/lib/aviator';

type AdminSignalPayload = {
  ok: boolean;
  serverTime: string;
  settings: {
    auto_mode: boolean;
    signal_active: boolean;
    active_mode: string;
    accuracy: number;
    win_rate: number;
  };
  round: SignalRound;
  appSignalRound: SignalRound;
  previewRounds: SignalRound[];
  history: {
    id: number;
    crashAt: number;
    happenedAt: string;
  }[];
  auditLogs: {
    id: string;
    action: string;
    message: string;
    created_at: string;
  }[];
};

type SignalRound = {
  id: number;
  round_id: number;
  targetX: number;
  target_x: number;
  status: string;
  source: string;
  signalRevealAt: string;
  bettingAt: string;
  flyAt: string;
  crashAtTime: string;
};

export default function AviatorSignalControl({ initialState }: { initialState: AdminSignalPayload }) {
  const [state, setState] = useState(initialState);
  const [target, setTarget] = useState(initialState.round.targetX.toFixed(2));
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const id = setInterval(() => {
      void refresh();
    }, 2000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!busy) setTarget(state.round.targetX.toFixed(2));
  }, [busy, state.round.id, state.round.targetX]);

  const clock = useMemo(() => {
    const now = Date.parse(state.serverTime);
    const flyAt = Date.parse(state.round.flyAt);
    const bettingAt = Date.parse(state.round.bettingAt);
    const crashAt = Date.parse(state.round.crashAtTime);

    if (now < bettingAt) return `Signal shown, betting starts in ${seconds(bettingAt - now)}s`;
    if (now < flyAt) return `Betting countdown ${seconds(flyAt - now)}s`;
    if (now < crashAt) return `Flying, crash locked at ${fmtX(state.round.targetX)}`;
    return 'Round crashed, next schedule loading';
  }, [state]);

  async function refresh() {
    try {
      const res = await fetch('/api/admin/aviator-signal', { cache: 'no-store' });
      if (!res.ok) throw new Error(`API ${res.status}`);
      setState((await res.json()) as AdminSignalPayload);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signal API unavailable');
    }
  }

  async function send(action: string, body: Record<string, unknown> = {}) {
    setBusy(action);
    setError('');
    try {
      const res = await fetch('/api/admin/aviator-signal', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, ...body }),
      });
      if (!res.ok) throw new Error(`API ${res.status}`);
      const next = (await res.json()) as AdminSignalPayload;
      setState(next);
      setTarget(next.round.targetX.toFixed(2));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setBusy('');
    }
  }

  return (
    <>
      <div className="adm-signal__hero">
        <div>
          <p className="adm-signal__eyebrow">DEMO CONTROLLED BACKEND</p>
          <h1 className="adm__h1">Aviator Signal Brain</h1>
          <p className="adm__sub">
            App আগে current signal দেখায়। Website একই backend round পরে চালায়,
            তাই app-এর value আর website crash target সবসময় match করবে।
          </p>
        </div>
        <div className={`adm-signal__status is-${state.round.status}`}>
          <b>{state.round.status.toUpperCase()}</b>
          <span>{clock}</span>
        </div>
      </div>

      {error && <div className="adm__warn">{error}</div>}

      <div className="adm__tiles">
        <div className="adm__tile"><b>#{state.round.id}</b><small>Signal round</small></div>
        <div className="adm__tile"><b>{fmtX(state.round.targetX)}</b><small>App signal target</small></div>
        <div className="adm__tile"><b>#{state.appSignalRound.id}</b><small>Website same round</small></div>
        <div className="adm__tile"><b>{fmtX(state.appSignalRound.targetX)}</b><small>Website crash target</small></div>
        <div className="adm__tile"><b>{state.settings.accuracy}%</b><small>Accuracy stat</small></div>
        <div className="adm__tile"><b>{state.settings.win_rate}%</b><small>Win rate stat</small></div>
      </div>

      <section className="adm-signal__grid">
        <form
          className="adm-signal__panel"
          onSubmit={(event) => {
            event.preventDefault();
            void send('set-manual', { targetX: Number(target) });
          }}
        >
          <h2 className="adm__h2">Manual Signal</h2>
          <label className="adm-signal__field">
            <span>Target multiplier for signal round #{state.round.id}</span>
            <input
              type="number"
              min="1.01"
              max="99.99"
              step="0.01"
              value={target}
              onChange={(event) => setTarget(event.target.value)}
            />
          </label>
          <button className="btn btn--gold btn--block" type="submit" disabled={Boolean(busy)}>
            {busy === 'set-manual' ? 'Saving...' : 'Set signal'}
          </button>
          <div className="adm-signal__hint">
            Manual set করলে app gauge সাথে সাথে update হবে। Website betting/fly
            শুরু হলে একই value crash target হিসেবে follow করবে।
          </div>
        </form>

        <div className="adm-signal__panel">
          <h2 className="adm__h2">Live Controls</h2>
          <div className="adm-signal__switches">
            <button
              type="button"
              className={state.settings.auto_mode ? 'on' : ''}
              onClick={() => send('toggle-auto', { autoMode: !state.settings.auto_mode })}
              disabled={Boolean(busy)}
            >
              Auto mode {state.settings.auto_mode ? 'ON' : 'OFF'}
            </button>
            <button
              type="button"
              className={state.settings.signal_active ? 'on' : ''}
              onClick={() => send('toggle-signal', { signalActive: !state.settings.signal_active })}
              disabled={Boolean(busy)}
            >
              Signal {state.settings.signal_active ? 'ON' : 'OFF'}
            </button>
          </div>
          <div className="adm-signal__actions">
            <button type="button" className="btn btn--ghost" onClick={() => send('regenerate')} disabled={Boolean(busy)}>
              Regenerate target
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => send('speed-demo')} disabled={Boolean(busy)}>
              20s test round
            </button>
          </div>
          <div className="adm-signal__hint">
            20s test একই signal round দ্রুত চালায়। App আগে value দেখাবে,
            তারপর website countdown/fly/crash একই target follow করবে।
          </div>
        </div>
      </section>

      <section>
        <h2 className="adm__h2">Website Current Timeline</h2>
        <div className="adm-signal__timeline">
          <span><b>Reveal</b>{timeOnly(state.round.signalRevealAt)}</span>
          <span><b>Betting</b>{timeOnly(state.round.bettingAt)}</span>
          <span><b>Fly</b>{timeOnly(state.round.flyAt)}</span>
          <span><b>Crash</b>{timeOnly(state.round.crashAtTime)}</span>
        </div>
      </section>

      <section>
        <h2 className="adm__h2">App Signal Timeline</h2>
        <div className="adm-signal__timeline">
          <span><b>Round</b>#{state.appSignalRound.id}</span>
          <span><b>Betting</b>{timeOnly(state.appSignalRound.bettingAt)}</span>
          <span><b>Fly</b>{timeOnly(state.appSignalRound.flyAt)}</span>
          <span><b>Target</b>{fmtX(state.appSignalRound.targetX)}</span>
        </div>
      </section>

      <section className="adm-signal__cols">
        <div>
          <h2 className="adm__h2">Next Preview</h2>
          <div className="adm-signal__list">
            {state.previewRounds.map((round) => (
              <div
                key={round.id}
                className={`adm-signal__row${round.id === state.appSignalRound.id ? ' is-app' : ''}`}
              >
                <span>#{round.id}</span>
                <b>{fmtX(round.targetX)}</b>
                <small>{round.id === state.appSignalRound.id ? 'current signal' : round.status}</small>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h2 className="adm__h2">History</h2>
          <div className="adm-signal__list">
            {state.history.slice(0, 8).map((round) => (
              <div key={round.id} className="adm-signal__row">
                <span>#{round.id}</span>
                <b>{fmtX(round.crashAt)}</b>
                <small>{timeOnly(round.happenedAt)}</small>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <h2 className="adm__h2">Audit Logs</h2>
        <div className="adm-signal__logs">
          {state.auditLogs.slice(0, 8).map((log) => (
            <div key={log.id}>
              <b>{log.action}</b>
              <span>{log.message}</span>
              <small>{timeOnly(log.created_at)}</small>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function seconds(ms: number) {
  return Math.max(0, Math.ceil(ms / 1000));
}

function timeOnly(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return '--:--:--';
  return date.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
