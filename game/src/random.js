// Deterministic seeded RNG (mulberry32). Every random draw in the game
// comes from a seeded generator so screenshots are reproducible.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Small helper: pick a value in [min, max) from a seeded generator.
export function range(rng, min, max) {
  return min + rng() * (max - min);
}
