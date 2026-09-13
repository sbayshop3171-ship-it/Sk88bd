/** A JSON file in .data/, held in memory.

    The stores used to read and rewrite their whole file on every call, one
    call at a time — the Aviator board asks every two seconds per viewer, so
    a few hundred viewers queued up behind the disk. Now the file is read
    once, kept in memory for every copy of the module in this process (Next
    bundles a module into more than one chunk, and each chunk would
    otherwise keep its own copy), and written only when a change actually
    changed something.

    A file edited by hand on the server is still picked up: its modified
    time is checked every few seconds. */

import { mkdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { writeFileAtomic } from './atomic-write';

const RECHECK_MS = 5_000;

type Slot<T> = {
  value: T | null;
  /** the compact JSON last written or read, to tell a real change */
  text: string;
  mtime: number;
  checkedAt: number;
  queue: Promise<unknown>;
};

export function jsonStore<T>(file: string, parse: (raw: unknown) => T | null, create: () => T) {
  const key = `__sk88bd_json_store__:${file}`;
  const g = globalThis as unknown as Record<string, Slot<T> | undefined>;
  const slot: Slot<T> = (g[key] ??= { value: null, text: '', mtime: 0, checkedAt: 0, queue: Promise.resolve() });

  async function load(): Promise<T> {
    const now = Date.now();
    if (slot.value && now - slot.checkedAt < RECHECK_MS) return slot.value;
    slot.checkedAt = now;

    let mtime = -1;
    try { mtime = (await stat(file)).mtimeMs; } catch { /* not written yet */ }
    if (slot.value && mtime === slot.mtime) return slot.value;

    if (mtime >= 0) {
      try {
        const parsed = parse(JSON.parse(await readFile(file, 'utf8')));
        if (parsed) {
          slot.value = parsed;
          slot.text = JSON.stringify(parsed);
          slot.mtime = mtime;
          return parsed;
        }
      } catch { /* unreadable: keep what we have, or start fresh below */ }
    }
    if (!slot.value) {
      slot.value = create();
      slot.text = ''; // the next change writes it
    }
    return slot.value;
  }

  async function persist(value: T) {
    const text = JSON.stringify(value);
    if (text === slot.text) return;
    await mkdir(path.dirname(file), { recursive: true });
    await writeFileAtomic(file, `${JSON.stringify(value, null, 2)}\n`);
    slot.text = text;
    try { slot.mtime = (await stat(file)).mtimeMs; } catch { /* next check re-reads */ }
  }

  return {
    /** The live value. Read it; change it only through mutate(). */
    read: load,
    /** One change at a time, written to disk before the caller hears back. */
    mutate<R>(fn: (value: T) => R): Promise<R> {
      const next = slot.queue.then(async () => {
        const value = await load();
        try {
          const result = fn(value);
          await persist(value);
          return result;
        } catch (e) {
          slot.value = null; // half-changed: take the file's word next time
          slot.checkedAt = 0;
          throw e;
        }
      });
      slot.queue = next.then(() => undefined, () => undefined);
      return next;
    },
  };
}
