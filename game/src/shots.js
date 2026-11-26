// Screenshot scenes behind ?shot=start|play|end&seed=1. Each one plays the
// real rules forward from a fresh world, steered by a simple autopilot
// (steer toward the next ring in x and altitude, hold a steady throttle),
// so the frame is what a real flight looks like and the same seed always
// gives the same frame.
import { PLANE, RUN } from './config.js';
import { EVENT_OVER, EVENT_LANDED } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 2;
const PLAY_SECONDS = 26;
const END_LIMIT_SECONDS = 600;
const SAMPLE = 1 / 60;

// Autopilot: aim at the next unpassed ring; skill 1.0 flies it cleanly,
// lower skill lags and drifts, so the end scene eventually meets terrain.
function autopilot(s, skill) {
  const next = s.rings.find((r) => !r.done && r.z > s.z);
  let pitch = 0;
  let roll = 0;
  let throttle = 0.75;
  if (next) {
    const dAlt = next.alt - s.alt;
    pitch = Math.max(-1, Math.min(1, dAlt / 40)) * skill;
    const dX = next.x - s.x;
    roll = Math.max(-1, Math.min(1, dX / 30)) * skill;
    // Ease off near the strip so a good pilot can land.
    if (s.z > RUN.courseLength - 900) {
      pitch = Math.max(-1, Math.min(1, (60 - s.alt) / 40));
      roll = Math.max(-1, Math.min(1, (0 - s.x) / 30));
      throttle = 0.35;
    }
  }
  return { pitch, roll, throttle };
}

export function stageShot(name, world) {
  world.reset();
  const s = world.state;
  if (name !== 'play' && name !== 'end') {
    for (let t = 0; t < START_SECONDS; t += SAMPLE) {
      world.step(SAMPLE, { pitch: 0, roll: 0, throttle: 0.6 });
    }
    return { screen: SCREEN_TITLE, best: 0 };
  }
  const limit = name === 'end' ? END_LIMIT_SECONDS : PLAY_SECONDS;
  const skill = name === 'end' ? 0.45 : 1.0;
  for (let t = 0; t < limit; t += SAMPLE) {
    const ev = world.step(SAMPLE, autopilot(s, skill));
    if (ev & (EVENT_OVER | EVENT_LANDED)) break;
  }
  const over = s.over || s.landed;
  return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: s.score };
}
