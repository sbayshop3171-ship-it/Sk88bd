import { createHash, randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { timeToReach } from './aviator';

export type SignalGame = 'aviator' | 'crash';
export type AviatorRoundStatus = 'scheduled' | 'revealed' | 'betting' | 'flying' | 'crashed';

export interface AviatorSignalSettings {
  auto_mode: boolean;
  signal_active: boolean;
  active_mode: 'BASS' | 'AUTO' | 'MANUAL';
  accuracy: number;
  win_rate: number;
  updated_at: string;
}

export interface StoredAviatorRound {
  round_id: number;
  target_x: number;
  signal_reveal_at: string;
  betting_at: string;
  fly_at: string;
  crash_at: string;
  status: AviatorRoundStatus;
  server_seed_hash: string;
  server_seed: string;
  client_seed: string;
  nonce: number;
  source: 'auto' | 'manual';
  created_at: string;
  updated_at: string;
}

export interface AviatorAuditLog {
  id: string;
  action: string;
  message: string;
  created_at: string;
}

export interface AviatorSignalState {
  serverTime: string;
  settings: AviatorSignalSettings;
  currentRound: StoredAviatorRound;
  appSignalRound: StoredAviatorRound;
  previewRounds: StoredAviatorRound[];
  /** the app's queue: appSignalRound first, then the ones behind it */
  upcomingSignalRounds: StoredAviatorRound[];
  history: StoredAviatorRound[];
  auditLogs: AviatorAuditLog[];
}

interface SignalStore {
  version: 1;
  next_round_id: number;
  settings: AviatorSignalSettings;
  rounds: StoredAviatorRound[];
  auditLogs: AviatorAuditLog[];
}

export const SIGNAL_LEAD_MS = 60_000;
export const BETTING_LEAD_MS = 6_000;
export const CRASHED_HOLD_MS = 3_500;
const PREVIEW_ROUNDS = 5;
const SCHEDULE_DRIFT_MS = 500;

const STORE_FILE = path.join(process.cwd(), '.data', 'aviator-signal-store.json');
const CLIENT_SEED = 'prime-vai-devx-LIVE';
const AUTO_TARGETS = [2.64, 3.02, 2.18, 6.44, 1.21, 3.03, 12.34, 1.83, 4.78, 8.92, 1.55, 15.76];
const HISTORY_TARGETS = [3.03, 2.38, 1.83, 2.64, 3.02, 2.18, 6.44, 1.21];

let writeQueue = Promise.resolve();

export async function getAviatorSignalState(): Promise<AviatorSignalState> {
  return mutateStore((store) => {
    const now = Date.now();
    syncStore(store, now);
    return buildState(store, now);
  });
}

/** What the app calls itself. The app carries the same string as a fallback
    for when it cannot reach us, so change both together. */
export const SIGNAL_APP_TITLE = 'ARIYAN KHAN';

export async function getSignalTerminalSnapshot(game: SignalGame = 'aviator') {
  const state = await getAviatorSignalState();
  const now = Date.parse(state.serverTime);
  const websiteRound = state.currentRound;
  const round = state.appSignalRound;
  const flyAt = Date.parse(round.fly_at);
  const bettingAt = Date.parse(round.betting_at);
  const signalVisible = state.settings.signal_active;
  const mode = state.settings.active_mode;

  return {
    game,
    branding: {
      title: SIGNAL_APP_TITLE,
      subtitle: 'ENCRYPTED SIGNAL TERMINAL',
      modeBadge: `MODE: ${mode}`,
    },
    stats: {
      accuracy: state.settings.accuracy,
      mode,
      winRate: state.settings.win_rate,
    },
    targetMultiplier: signalVisible ? round.target_x : 1,
    timestamp: state.serverTime,
    signal: {
      active: signalVisible,
      auto: state.settings.auto_mode && state.settings.signal_active,
      label: signalVisible ? 'SIGNAL ACTIVE' : 'SIGNAL WAITING',
    },
    countdown: {
      revealInMs: 0,
      bettingInMs: Math.max(0, Date.parse(websiteRound.betting_at) - now),
      flyInMs: Math.max(0, Date.parse(websiteRound.fly_at) - now),
      crashInMs: Math.max(0, Date.parse(websiteRound.crash_at) - now),
      appSignalBettingInMs: Math.max(0, bettingAt - now),
      appSignalFlyInMs: Math.max(0, flyAt - now),
    },
    round: publicRound(round),
    websiteRound: publicRound(websiteRound),
    /* The queue the app shows: what is coming, in order, each with the hash
       it is committed to. `revealed` is false while the signal is switched
       off, so the app can show the row without giving the number away. */
    upcoming: state.upcomingSignalRounds.map((item, i) => ({
      position: i + 1,
      roundId: item.round_id,
      targetX: signalVisible ? item.target_x : null,
      revealed: signalVisible,
      bettingAt: item.betting_at,
      flyAt: item.fly_at,
      bettingInMs: Math.max(0, Date.parse(item.betting_at) - now),
      flyInMs: Math.max(0, Date.parse(item.fly_at) - now),
      serverSeedHash: item.server_seed_hash,
    })),
    recentRounds: state.history.map((item) => ({
      id: item.round_id,
      multiplier: item.target_x,
      crashAt: item.target_x,
      happenedAt: item.crash_at,
    })),
    notice: signalVisible ? 'নেক্সট সিগন্যাল রেডি' : 'সিগন্যাল অফ',
    signalLeadMode: 'app-next-round-preview',
    demoControlled: true,
  };
}

export async function updateAviatorSignal(input: {
  action: 'set-manual' | 'toggle-auto' | 'toggle-signal' | 'regenerate' | 'speed-demo';
  targetX?: number;
  autoMode?: boolean;
  signalActive?: boolean;
}): Promise<AviatorSignalState> {
  return mutateStore((store) => {
    const now = Date.now();
    syncStore(store, now);

    if (input.action === 'toggle-auto') {
      store.settings.auto_mode = Boolean(input.autoMode);
      store.settings.active_mode = store.settings.auto_mode ? 'AUTO' : 'BASS';
      store.settings.updated_at = iso(now);
      addLog(store, 'toggle-auto', `Auto mode ${store.settings.auto_mode ? 'enabled' : 'disabled'}`, now);
    }

    if (input.action === 'toggle-signal') {
      store.settings.signal_active = Boolean(input.signalActive);
      store.settings.updated_at = iso(now);
      addLog(store, 'toggle-signal', `Signal ${store.settings.signal_active ? 'enabled' : 'disabled'}`, now);
    }

    if (input.action === 'set-manual') {
      const targetX = clampTarget(input.targetX);
      const round = applyTargetToSignalRound(store, targetX, now, 'manual');
      store.settings.active_mode = 'MANUAL';
      store.settings.updated_at = iso(now);
      addLog(store, 'set-manual', `Signal #${round.round_id} locked at ${targetX.toFixed(2)}x`, now);
    }

    if (input.action === 'regenerate') {
      const signal = getEditableSignalRound(store, now);
      const targetX = autoTarget(store.next_round_id + signal.round_id);
      const round = applyTargetToSignalRound(store, targetX, now, 'auto');
      store.settings.active_mode = store.settings.auto_mode ? 'AUTO' : 'BASS';
      store.settings.updated_at = iso(now);
      addLog(store, 'regenerate', `Signal #${round.round_id} regenerated at ${targetX.toFixed(2)}x`, now);
    }

    if (input.action === 'speed-demo') {
      const current = getCurrentRound(store, now);
      moveRound(current, now + BETTING_LEAD_MS, now);
      current.updated_at = iso(now);
      addLog(store, 'speed-demo', `Round #${current.round_id} moved to a quick ${BETTING_LEAD_MS / 1000}s countdown`, now);
    }

    syncStore(store, now);
    return buildState(store, now);
  });
}

function mutateStore<T>(fn: (store: SignalStore) => T): Promise<T> {
  const next = writeQueue.then(async () => {
    const store = await readStore();
    const result = fn(store);
    await writeStore(store);
    return result;
  });
  writeQueue = next.then(() => undefined, () => undefined);
  return next;
}

async function readStore(): Promise<SignalStore> {
  try {
    const raw = await readFile(STORE_FILE, 'utf8');
    const parsed = JSON.parse(raw) as SignalStore;
    if (parsed?.version === 1 && Array.isArray(parsed.rounds)) {
      normalizeLiveLabels(parsed);
      return parsed;
    }
  } catch {
    // First local run: create a fresh demo store below.
  }
  return createInitialStore(Date.now());
}

function normalizeLiveLabels(store: SignalStore) {
  for (const round of store.rounds) {
    if (round.client_seed === 'prime-vai-devx-demo') {
      round.client_seed = CLIENT_SEED;
    }
  }
}

async function writeStore(store: SignalStore) {
  await mkdir(path.dirname(STORE_FILE), { recursive: true });
  await writeFile(STORE_FILE, `${JSON.stringify(store, null, 2)}\n`);
}

function createInitialStore(now: number): SignalStore {
  const store: SignalStore = {
    version: 1,
    next_round_id: 1,
    settings: {
      auto_mode: true,
      signal_active: true,
      active_mode: 'BASS',
      accuracy: 65,
      win_rate: 78,
      updated_at: iso(now),
    },
    rounds: [],
    auditLogs: [],
  };

  for (let i = HISTORY_TARGETS.length - 1; i >= 0; i -= 1) {
    const flyAt = now - (i + 1) * 18_000;
    store.rounds.push(makeRound(store.next_round_id++, HISTORY_TARGETS[i], flyAt, 'auto', now - (i + 1) * 18_000));
  }
  scheduleNextRound(store, now + BETTING_LEAD_MS, now);
  addLog(store, 'init', 'Local demo signal backend created', now);
  return store;
}

function syncStore(store: SignalStore, now: number) {
  store.rounds = store.rounds
    .sort((a, b) => a.round_id - b.round_id)
    .slice(-40);

  for (const round of store.rounds) {
    round.status = statusFor(round, now);
  }

  let current = findPlayableRound(store, now);
  if (!current) {
    current = scheduleNextRound(store, now + BETTING_LEAD_MS, now);
  }

  if (Date.parse(current.betting_at) - now > BETTING_LEAD_MS + SCHEDULE_DRIFT_MS) {
    moveRound(current, now + BETTING_LEAD_MS, now);
    addLog(store, 'compact-schedule', `Round #${current.round_id} moved to quick ${BETTING_LEAD_MS / 1000}s countdown`, now);
  }

  const futureRounds = getFutureRoundsAfter(store, current, now);
  let anchor = current;
  for (const round of futureRounds) {
    const flyAt = nextFlyAfter(anchor);
    if (Math.abs(Date.parse(round.fly_at) - flyAt) > SCHEDULE_DRIFT_MS) {
      moveRound(round, flyAt, now);
    }
    anchor = round;
  }

  while (futureRounds.length < PREVIEW_ROUNDS) {
    const nextFlyAt = nextFlyAfter(anchor);
    const round = scheduleNextRound(store, nextFlyAt, now);
    futureRounds.push(round);
    anchor = round;
  }

  for (const round of store.rounds) {
    round.status = statusFor(round, now);
  }
}

function getFutureRoundsAfter(store: SignalStore, current: StoredAviatorRound, now: number) {
  return store.rounds
    .filter((round) => round.round_id > current.round_id && Date.parse(round.crash_at) + CRASHED_HOLD_MS > now)
    .sort((a, b) => a.round_id - b.round_id);
}

function nextFlyAfter(round: StoredAviatorRound) {
  return Date.parse(round.crash_at) + CRASHED_HOLD_MS + BETTING_LEAD_MS;
}

/** How far ahead the app's signal queue runs. */
export const UPCOMING_SIGNAL_COUNT = 5;

/**
 * The next few signal rounds, scheduled for real if they do not exist yet.
 *
 * The store used to keep exactly one round queued behind the live one, so
 * there was nothing to show a player who wants to see what is coming. These
 * are committed rounds — each with its own seed hash — not a projection the
 * app draws for itself, so what the queue promises is what the round pays.
 */
function upcomingSignalRounds(store: SignalStore, now: number, count: number) {
  const current = getCurrentRound(store, now);
  const queue: StoredAviatorRound[] = store.rounds
    .filter((round) => round.round_id > current.round_id && Date.parse(round.crash_at) + CRASHED_HOLD_MS > now)
    .sort((a, b) => a.round_id - b.round_id);

  let last = queue[queue.length - 1] ?? current;
  while (queue.length < count) {
    last = scheduleNextRound(store, nextFlyAfter(last), now);
    queue.push(last);
  }
  return queue.slice(0, count);
}

function buildState(store: SignalStore, now: number): AviatorSignalState {
  const currentRound = getCurrentRound(store, now);
  const upcoming = upcomingSignalRounds(store, now, UPCOMING_SIGNAL_COUNT);
  const appSignalRound = upcoming[0];
  const previewRounds = store.rounds
    .filter((round) => Date.parse(round.fly_at) >= now || round.round_id === currentRound.round_id)
    .sort((a, b) => a.round_id - b.round_id)
    .slice(0, 5);
  const history = store.rounds
    .filter((round) => Date.parse(round.crash_at) <= now)
    .sort((a, b) => b.round_id - a.round_id)
    .slice(0, 16);

  return {
    serverTime: iso(now),
    settings: { ...store.settings },
    currentRound: { ...currentRound },
    appSignalRound: { ...appSignalRound },
    previewRounds: previewRounds.map((round) => ({ ...round })),
    upcomingSignalRounds: upcoming.map((round) => ({ ...round })),
    history: history.map((round) => ({ ...round })),
    auditLogs: store.auditLogs.slice(0, 30).map((log) => ({ ...log })),
  };
}

function getCurrentRound(store: SignalStore, now: number): StoredAviatorRound {
  return findPlayableRound(store, now) ?? scheduleNextRound(store, now + BETTING_LEAD_MS, now);
}

function getQueuedSignalRound(store: SignalStore, now: number): StoredAviatorRound {
  const current = getCurrentRound(store, now);
  const queued = store.rounds
    .filter((round) => round.round_id > current.round_id && Date.parse(round.crash_at) + CRASHED_HOLD_MS > now)
    .sort((a, b) => a.round_id - b.round_id)[0];

  if (queued) return queued;

  return scheduleNextRound(store, nextFlyAfter(current), now);
}

function getEditableSignalRound(store: SignalStore, now: number): StoredAviatorRound {
  return getQueuedSignalRound(store, now);
}

function findPlayableRound(store: SignalStore, now: number) {
  return store.rounds
    .filter((round) => Date.parse(round.crash_at) + CRASHED_HOLD_MS > now)
    .sort((a, b) => Date.parse(a.fly_at) - Date.parse(b.fly_at))[0];
}

function scheduleNextRound(store: SignalStore, flyAt: number, now: number) {
  const round = makeRound(store.next_round_id, autoTarget(store.next_round_id), flyAt, 'auto', now);
  store.next_round_id += 1;
  store.rounds.push(round);
  addLog(store, 'schedule', `Round #${round.round_id} scheduled for ${round.target_x.toFixed(2)}x`, now);
  return round;
}

function makeRound(
  roundId: number,
  targetX: number,
  flyAt: number,
  source: 'auto' | 'manual',
  createdAt: number,
): StoredAviatorRound {
  const seed = randomBytes(16).toString('hex');
  const round: StoredAviatorRound = {
    round_id: roundId,
    target_x: clampTarget(targetX),
    signal_reveal_at: iso(flyAt - SIGNAL_LEAD_MS),
    betting_at: iso(flyAt - BETTING_LEAD_MS),
    fly_at: iso(flyAt),
    crash_at: iso(flyAt + timeToReach(clampTarget(targetX))),
    status: 'scheduled',
    server_seed_hash: sha256(seed),
    server_seed: seed,
    client_seed: CLIENT_SEED,
    nonce: roundId,
    source,
    created_at: iso(createdAt),
    updated_at: iso(createdAt),
  };
  round.status = statusFor(round, createdAt);
  return round;
}

function applyTargetToSignalRound(
  store: SignalStore,
  targetX: number,
  now: number,
  source: 'auto' | 'manual',
) {
  const round = getEditableSignalRound(store, now);
  applyTarget(round, targetX, now, source);
  return round;
}

function applyTarget(round: StoredAviatorRound, targetX: number, now: number, source: 'auto' | 'manual') {
  round.target_x = clampTarget(targetX);
  round.crash_at = iso(Date.parse(round.fly_at) + timeToReach(round.target_x));
  round.source = source;
  round.updated_at = iso(now);
  round.status = statusFor(round, now);
}

function moveRound(round: StoredAviatorRound, flyAt: number, updatedAt?: number) {
  round.signal_reveal_at = iso(flyAt - SIGNAL_LEAD_MS);
  round.betting_at = iso(flyAt - BETTING_LEAD_MS);
  round.fly_at = iso(flyAt);
  round.crash_at = iso(flyAt + timeToReach(round.target_x));
  if (updatedAt) {
    round.updated_at = iso(updatedAt);
  }
}

function statusFor(round: StoredAviatorRound, now: number): AviatorRoundStatus {
  const revealAt = Date.parse(round.signal_reveal_at);
  const bettingAt = Date.parse(round.betting_at);
  const flyAt = Date.parse(round.fly_at);
  const crashAt = Date.parse(round.crash_at);

  if (now < revealAt) return 'scheduled';
  if (now < bettingAt) return 'revealed';
  if (now < flyAt) return 'betting';
  if (now < crashAt) return 'flying';
  return 'crashed';
}

function publicRound(round: StoredAviatorRound) {
  return {
    round_id: round.round_id,
    id: round.round_id,
    target_x: round.target_x,
    targetX: round.target_x,
    signal_reveal_at: round.signal_reveal_at,
    signalRevealAt: round.signal_reveal_at,
    betting_at: round.betting_at,
    bettingAt: round.betting_at,
    fly_at: round.fly_at,
    flyAt: round.fly_at,
    crash_at: round.crash_at,
    crashAtTime: round.crash_at,
    status: round.status,
    serverSeedHash: round.server_seed_hash,
    server_seed_hash: round.server_seed_hash,
    serverSeed: round.status === 'crashed' ? round.server_seed : undefined,
    clientSeed: round.client_seed,
    nonce: round.nonce,
    source: round.source,
  };
}

export function publicAviatorState(state: AviatorSignalState) {
  return {
    ok: true,
    serverTime: state.serverTime,
    timeline: {
      signalLeadMs: SIGNAL_LEAD_MS,
      bettingLeadMs: BETTING_LEAD_MS,
      crashedHoldMs: CRASHED_HOLD_MS,
    },
    settings: state.settings,
    round: publicRound(state.currentRound),
    appSignalRound: publicRound(state.appSignalRound),
    previewRounds: state.previewRounds.map(publicRound),
    history: state.history.map((round) => ({
      id: round.round_id,
      round_id: round.round_id,
      crashAt: round.target_x,
      target_x: round.target_x,
      serverSeed: round.server_seed,
      clientSeed: round.client_seed,
      nonce: round.nonce,
      happenedAt: round.crash_at,
    })),
    auditLogs: state.auditLogs,
    demoControlled: true,
  };
}

function addLog(store: SignalStore, action: string, message: string, now: number) {
  store.auditLogs = [
    {
      id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
      action,
      message,
      created_at: iso(now),
    },
    ...store.auditLogs,
  ].slice(0, 50);
}

function autoTarget(roundId: number) {
  return AUTO_TARGETS[(roundId - 1) % AUTO_TARGETS.length];
}

function clampTarget(value: unknown) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 2;
  return Math.round(Math.min(99.99, Math.max(1.01, num)) * 100) / 100;
}

function sha256(input: string) {
  return createHash('sha256').update(input).digest('hex');
}

function iso(ms: number) {
  return new Date(ms).toISOString();
}
