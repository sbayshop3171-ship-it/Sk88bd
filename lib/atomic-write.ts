/** Write a file so nobody ever sees it half-written.

    `writeFile` empties the file first and then fills it. Every `.data/*.json`
    store on this site is read on ordinary requests — the deposit page, a
    staff session check, an Aviator cash-out — so a read landing in that gap
    saw an empty file, and a crash or a full disk in it left one behind. The
    stores take an unreadable file for a first run, so the next save wrote an
    empty store over it: every staff login, every payment number, every sold
    signal key, gone.

    Written beside the real file and renamed over it instead. A rename is
    atomic on one filesystem, so a reader gets the old file or the new one,
    and a failed write leaves the old one where it was. */

import { randomBytes } from 'node:crypto';
import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

export async function writeFileAtomic(
  file: string,
  data: string | Uint8Array,
  options?: { mode?: number },
): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${randomBytes(4).toString('hex')}.tmp`;
  try {
    await writeFile(tmp, data, options);
    await rename(tmp, file);
  } catch (error) {
    await rm(tmp, { force: true }).catch(() => {});
    throw error;
  }
}
