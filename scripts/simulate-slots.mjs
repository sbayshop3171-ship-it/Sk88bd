#!/usr/bin/env node
/**
 * Measure Golden Ace's return, and say what PAY_SCALE should be.
 *
 * A cascading ways-pays slot has no closed form worth trusting: the gilded
 * cards feed wilds back into the next drop, the ladder compounds, free games
 * pay at double, and the round ceiling clips the tail. The only honest way
 * to know what it returns is to play it a few million times.
 *
 * Run it after touching a reel weight, the gold chance, the paytable shape,
 * the ladder or the free-game counts:
 *
 *     node scripts/simulate-slots.mjs            # 2,000,000 rounds
 *     node scripts/simulate-slots.mjs 5000000
 *
 * It prints the measured return and the PAY_SCALE that would put it on RTP.
 * Paste that back into lib/slots.ts and run it once more to confirm.
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROUNDS = Number(process.argv[2] ?? 2_000_000);
const RTP = 0.97;

const out = mkdtempSync(path.join(tmpdir(), 'slots-'));
try {
  execFileSync(
    'npx',
    ['tsc', 'lib/slots.ts', '--target', 'es2022', '--module', 'es2022',
     '--moduleResolution', 'bundler', '--outDir', out],
    { stdio: 'inherit' },
  );

  const slots = await import(pathToFileURL(path.join(out, 'slots.js')).href);
  report(await measure(slots, ROUNDS));
} finally {
  rmSync(out, { recursive: true, force: true });
}

async function measure(slots, rounds) {
  /* Math.random rather than the seeded draw: the return depends on the
     distribution, not on which uniform source produced it, and this runs
     the millions of rounds a hash chain could not in the time available. */
  const rng = Math.random;

  let paid = 0;
  let wins = 0;
  let freeRounds = 0;
  let capped = 0;
  let best = 0;
  const buckets = { '0': 0, '<1x': 0, '1-5x': 0, '5-20x': 0, '20-100x': 0, '100x+': 0 };

  for (let i = 0; i < rounds; i += 1) {
    const round = slots.playRound(rng);
    paid += round.win;
    if (round.win > 0) wins += 1;
    if (round.freeGames > 0) freeRounds += 1;
    if (round.capped) capped += 1;
    if (round.win > best) best = round.win;

    const w = round.win;
    if (w === 0) buckets['0'] += 1;
    else if (w < 1) buckets['<1x'] += 1;
    else if (w < 5) buckets['1-5x'] += 1;
    else if (w < 20) buckets['5-20x'] += 1;
    else if (w < 100) buckets['20-100x'] += 1;
    else buckets['100x+'] += 1;
  }

  return {
    rounds, paid, wins, freeRounds, capped, best, buckets,
    rtp: paid / rounds,
    scale: slots.PAY_SCALE,
  };
}

function report(r) {
  const pct = (n) => `${(n * 100).toFixed(3)}%`;
  console.log(`\nrounds        ${r.rounds.toLocaleString('en-US')}`);
  console.log(`PAY_SCALE     ${r.scale}`);
  console.log(`return        ${pct(r.rtp)}   (target ${pct(RTP)})`);
  console.log(`hit rate      ${pct(r.wins / r.rounds)}`);
  console.log(`free games    ${pct(r.freeRounds / r.rounds)} of rounds`);
  console.log(`hit the cap   ${r.capped} round(s)`);
  console.log(`biggest win   ${r.best.toFixed(2)}x`);
  console.log('\nwin size');
  for (const [label, n] of Object.entries(r.buckets)) {
    console.log(`  ${label.padEnd(8)} ${pct(n / r.rounds)}`);
  }

  /* Payouts scale linearly with PAY_SCALE everywhere except the ceiling,
     which clips a handful of rounds — so this is a very good first guess
     and a second run confirms it rather than needing a third. */
  const suggested = (r.scale * RTP) / r.rtp;
  const drift = Math.abs(r.rtp - RTP);
  console.log(
    drift < 0.0015
      ? `\nPAY_SCALE ${r.scale} is good — within ${pct(drift)} of target.`
      : `\nset PAY_SCALE = ${suggested.toFixed(4)} in lib/slots.ts and run again.`,
  );
}
