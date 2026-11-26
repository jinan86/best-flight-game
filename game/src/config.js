// Merapi Ring Run — tuning and course layout.
// A dawn flight down a volcanic valley in Central Java: fly the little
// red-and-white prop plane "Elang Pagi" through gold rings, mind the
// terrain and the fuel, and put her down on the mountain airstrip.
export const VIEW = { width: 1280, height: 720, horizon: 330 };

export const PLANE = {
  name: 'Elang Pagi',
  startAlt: 180, // metres above the valley floor
  startSpeed: 55, // m/s
  minSpeed: 38,
  maxSpeed: 92,
  climbRate: 16, // m/s at full pitch
  turnRate: 55, // lateral m/s at full roll
  maxAlt: 420,
  lateralLimit: 110, // metres either side of the valley centre line
};

export const RUN = {
  lives: 3,
  fuelMax: 100,
  fuelDrain: 0.55, // per second at cruise
  fuelPerRing: 6,
  ringScore: 100,
  landBonusPerFuel: 10,
  landBonusPerLife: 200,
  courseLength: 6200, // metres to the airstrip threshold
  stripLength: 700, // metres of runway after the threshold
  crashPenalty: 50,
  step: 1 / 60,
};

// The ring course: gold rings down the valley, rising over the terraces,
// dipping by the river, then climbing toward the airstrip under the volcano.
// x is metres across the valley (-110..110), alt is metres above the floor.
export const RINGS = [
  { z: 350, x: 0, alt: 180 },
  { z: 700, x: -45, alt: 210 },
  { z: 1050, x: 40, alt: 190 },
  { z: 1400, x: 75, alt: 240 },
  { z: 1750, x: 10, alt: 160 },
  { z: 2100, x: -70, alt: 220 },
  { z: 2450, x: -20, alt: 150 },
  { z: 2800, x: 60, alt: 260 },
  { z: 3150, x: 0, alt: 200 },
  { z: 3500, x: -55, alt: 280 },
  { z: 3850, x: 45, alt: 230 },
  { z: 4200, x: 80, alt: 300 },
  { z: 4550, x: -10, alt: 250 },
  { z: 4900, x: -75, alt: 320 },
  { z: 5250, x: 20, alt: 270 },
  { z: 5600, x: 55, alt: 300 },
  { z: 5950, x: 0, alt: 220 },
];

export const RING_RADIUS = 34; // metres; generous so the course feels fair
