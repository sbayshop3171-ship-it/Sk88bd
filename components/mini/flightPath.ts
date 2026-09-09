import { flightMultiplierAt, flightTimeToReach } from '@/lib/mini-games';

/* ============================================================
   The shape a flying round is drawn in.

   Both boards face the same problem: a 1.3x round and a 60x
   round have to be equally readable in the same little box on a
   phone. The answer is the one the Aviator canvas already uses —
   below `cruiseAt` the nose genuinely travels out of the corner,
   above it the nose holds and the curve steepens underneath.

   Crash and JetX only differ by the numbers they pass in, so the
   geometry lives here rather than twice.
   ============================================================ */

export interface Stage {
  /** viewBox, and the aspect the stage is locked to in CSS so the
      craft never squashes under preserveAspectRatio="none" */
  W: number;
  H: number;
  /** the pad the craft waits on */
  padX: number;
  floor: number;
  /** where the nose settles once it has climbed into frame */
  tipX: number;
  tipY: number;
  /** the multiplier by which it has finished climbing */
  cruiseAt: number;
  steps: number;
  /** nose pitch on the pad, and the range it may take once it is up */
  launchPitch: number;
  minPitch: number;
  maxPitch: number;
}

export type Point = [number, number];

/** 0 on the pad, 1 once the nose reaches cruise — eased out, so the craft
    leaps off the corner and settles rather than crawling up. */
export function travelOf(stage: Stage, multiplier: number): number {
  if (multiplier <= 1) return 0;
  const t = Math.min(1, Math.log(multiplier) / Math.log(stage.cruiseAt));
  return 1 - (1 - t) * (1 - t);
}

export function trailPoints(
  game: 'crash' | 'jetx',
  stage: Stage,
  multiplier: number,
  travel: number,
): Point[] {
  const span = Math.max(multiplier - 1, 0.0001);
  const total = flightTimeToReach(game, multiplier);
  const spanX = travel * (stage.tipX - stage.padX);
  const spanY = travel * (stage.floor - stage.tipY);
  const pts: Point[] = [];
  for (let i = 0; i <= stage.steps; i++) {
    const f = i / stage.steps;
    const m = flightMultiplierAt(game, total * f);
    pts.push([
      Number((stage.padX + f * spanX).toFixed(2)),
      Number((stage.floor - ((m - 1) / span) * spanY).toFixed(2)),
    ]);
  }
  return pts;
}

/**
 * The nose follows the trail: the chord over the last fifth of the path, not
 * the last pair of samples — a two-point slope shifts every frame and makes
 * the craft tremble. The stage is locked to the viewBox's own aspect, so an
 * angle measured in viewBox units is the angle drawn on screen.
 */
export function noseAngle(stage: Stage, pts: Point[], travel: number): number {
  if (travel < 0.05) return stage.launchPitch;
  const tip = pts[pts.length - 1];
  const back = pts[Math.max(0, pts.length - 9)];
  const deg = (Math.atan2(tip[1] - back[1], tip[0] - back[0]) * 180) / Math.PI;
  return Number(Math.max(stage.minPitch, Math.min(stage.maxPitch, deg)).toFixed(2));
}

/** Where a given multiplier sits on the y axis of the round being drawn —
    what a board needs to label its gridlines. */
export function yForMultiplier(stage: Stage, tipMultiplier: number, travel: number, m: number) {
  const span = Math.max(tipMultiplier - 1, 0.0001);
  return stage.floor - ((m - 1) / span) * travel * (stage.floor - stage.tipY);
}
