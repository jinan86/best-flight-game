// Merapi Ring Run — world simulation. Pure state + step function; no DOM,
// no Date, no Math.random: everything derives from the seeded course and
// the inputs, so the same inputs always replay the same flight.
import { PLANE, RINGS, RING_RADIUS, RUN } from './config.js';
import { mulberry32, range } from './random.js';

export const EVENT_RING = 1;
export const EVENT_MISS = 2;
export const EVENT_CRASH = 4;
export const EVENT_OVER = 8;
export const EVENT_LANDED = 16;
export const EVENT_LOW_FUEL = 32;

// Valley floor height (metres) at distance z and lateral x. Gentle rolling
// hills that rise toward the volcano end of the course, plus a ridge on
// each side of the valley so straying sideways is punished.
export function groundHeight(z, x) {
  const hills = 14 * Math.sin(z * 0.0016 + 1.2) + 9 * Math.sin(z * 0.004 + 0.4);
  const rise = Math.max(0, (z - 4200) / 2000) * 26; // climb toward the airstrip
  const valley = Math.pow(Math.abs(x) / PLANE.lateralLimit, 2) * 55;
  return 6 + hills + rise + valley;
}

// Scattered ground features (terraces, trees, houses, river bends) placed
// once from a seed, so the valley looks the same every run.
export function buildFeatures(seed) {
  const rng = mulberry32(seed);
  const features = [];
  for (let z = 200; z < RUN.courseLength + 900; z += 90) {
    const roll = rng();
    if (roll < 0.3) {
      features.push({ kind: 'terraces', z, x: range(rng, -100, 100), w: range(rng, 50, 110) });
    } else if (roll < 0.62) {
      features.push({ kind: 'trees', z, x: range(rng, -105, 105), n: 2 + Math.floor(rng() * 4) });
    } else if (roll < 0.8) {
      features.push({ kind: 'village', z, x: range(rng, -90, 90), n: 2 + Math.floor(rng() * 4) });
    } else {
      features.push({ kind: 'field', z, x: range(rng, -100, 100), w: range(rng, 40, 90), hue: rng() });
    }
  }
  return features;
}

export function freshState(seed) {
  return {
    seed,
    time: 0,
    z: 0,
    x: 0,
    alt: PLANE.startAlt,
    speed: PLANE.startSpeed,
    throttle: 0.7,
    pitch: 0, // smoothed vertical velocity
    roll: 0, // smoothed lateral velocity
    heading: 90, // degrees, east down the valley
    fuel: RUN.fuelMax,
    score: 0,
    combo: 0,
    bestCombo: 0,
    ringsHit: 0,
    ringsMissed: 0,
    lives: RUN.lives,
    invuln: 0, // seconds of post-crash grace
    over: false,
    landed: false,
    won: false,
    lowFuelWarned: false,
    rings: RINGS.map((r) => ({ ...r, done: false, hit: false })),
    features: buildFeatures(seed),
    message: '',
    messageT: 0,
  };
}

export function createWorld(seed) {
  const state = freshState(seed || 1);
  return {
    state,
    reset() {
      const s = freshState(state.seed);
      for (const k of Object.keys(state)) delete state[k];
      Object.assign(state, s);
    },
    // input: { pitch: -1..1 (up positive), roll: -1..1, throttle: 0..1 }
    // step the world by dt seconds; returns an event bitmask.
    step(dt, input) {
      const s = state;
      if (s.over || s.landed) return 0;
      let events = 0;
      s.time += dt;

      // --- controls ---
      s.throttle = input.throttle !== undefined ? input.throttle : s.throttle;
      const targetSpeed = PLANE.minSpeed + (PLANE.maxSpeed - PLANE.minSpeed) * s.throttle;
      s.speed += (targetSpeed - s.speed) * Math.min(1, dt * 0.8);
      const wantPitch = (input.pitch || 0) * PLANE.climbRate;
      s.pitch += (wantPitch - s.pitch) * Math.min(1, dt * 3);
      const wantRoll = (input.roll || 0) * PLANE.turnRate;
      s.roll += (wantRoll - s.roll) * Math.min(1, dt * 3);

      s.alt += s.pitch * dt;
      s.x += s.roll * dt;
      s.z += s.speed * dt;
      s.heading = 90 + (s.roll / PLANE.turnRate) * 28;
      if (s.alt > PLANE.maxAlt) s.alt = PLANE.maxAlt;
      if (s.alt < 2) s.alt = 2;
      if (s.x > PLANE.lateralLimit) s.x = PLANE.lateralLimit;
      if (s.x < -PLANE.lateralLimit) s.x = -PLANE.lateralLimit;

      // --- fuel ---
      s.fuel -= RUN.fuelDrain * dt * (0.7 + s.throttle * 0.6);
      if (s.fuel <= 20 && !s.lowFuelWarned) {
        s.lowFuelWarned = true;
        events |= EVENT_LOW_FUEL;
        s.message = 'LOW FUEL — find the airstrip!';
        s.messageT = 3;
      }
      if (s.fuel <= 0) {
        s.fuel = 0;
        s.pitch += (-14 - s.pitch) * Math.min(1, dt * 1.5); // engine out: glide down
      }
      if (s.messageT > 0) s.messageT -= dt;

      if (s.invuln > 0) s.invuln -= dt;

      // --- rings ---
      for (const ring of s.rings) {
        if (ring.done) continue;
        if (s.z >= ring.z - 6 && s.z < ring.z + s.speed * dt + 6) {
          ring.done = true;
          const dx = Math.abs(s.x - ring.x);
          const da = Math.abs(s.alt - ring.alt);
          const dist = Math.sqrt(dx * dx + da * da * 0.55);
          if (dist < RING_RADIUS) {
            ring.hit = true;
            s.ringsHit += 1;
            s.combo += 1;
            if (s.combo > s.bestCombo) s.bestCombo = s.combo;
            const pts = RUN.ringScore * s.combo;
            s.score += pts;
            s.fuel = Math.min(RUN.fuelMax, s.fuel + RUN.fuelPerRing);
            s.message = `RING! +${pts}${s.combo > 1 ? '  COMBO x' + s.combo : ''}`;
            s.messageT = 1.6;
            events |= EVENT_RING;
          } else {
            s.ringsMissed += 1;
            s.combo = 0;
            s.message = 'Ring missed…';
            s.messageT = 1.2;
            events |= EVENT_MISS;
          }
        } else if (s.z > ring.z + 40) {
          ring.done = true; // flown past without the crossing test firing
          s.ringsMissed += 1;
          s.combo = 0;
        }
      }

      // --- airstrip: land between the threshold and the end of the strip ---
      const stripStart = RUN.courseLength;
      const stripEnd = RUN.courseLength + RUN.stripLength;
      if (s.z >= stripStart && s.z <= stripEnd) {
        const ground = groundHeight(s.z, s.x);
        if (s.alt - ground < 26 && s.speed < 62 && Math.abs(s.x) < 42) {
          s.landed = true;
          s.won = true;
          const bonus = Math.round(s.fuel) * RUN.landBonusPerFuel + s.lives * RUN.landBonusPerLife;
          s.score += bonus;
          s.message = `LANDED! Bonus +${bonus}`;
          s.messageT = 5;
          events |= EVENT_LANDED;
          return events;
        }
      }
      if (s.z > stripEnd) {
        s.over = true; // overshot the runway
        s.message = 'Overshot the airstrip!';
        events |= EVENT_OVER;
        return events;
      }

      // --- terrain collision ---
      const ground = groundHeight(s.z, s.x);
      if (s.invuln <= 0 && s.alt <= ground + 4) {
        s.lives -= 1;
        s.score = Math.max(0, s.score - RUN.crashPenalty);
        s.combo = 0;
        events |= EVENT_CRASH;
        if (s.lives <= 0) {
          s.over = true;
          s.message = 'Crashed out of the sky.';
          events |= EVENT_OVER;
          return events;
        }
        // Respawning: back up in the air, brief grace period.
        s.alt = ground + 150;
        s.speed = PLANE.startSpeed;
        s.pitch = 0;
        s.roll = 0;
        s.invuln = 3;
        s.message = 'Terrain hit! One life lost.';
        s.messageT = 2;
      }
      return events;
    },
  };
}
