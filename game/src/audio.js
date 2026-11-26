// Synthesized WebAudio sound effects — no audio assets, everything is
// generated with oscillators. Silent until the player first interacts,
// as browsers require.
let ctx = null;
let enabled = true;

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  return ctx;
}

function blip(freq, dur, type, vol, slideTo) {
  if (!enabled) return;
  const ac = ensure();
  if (!ac) return;
  const t0 = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type || 'sine';
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  gain.gain.setValueAtTime(vol || 0.12, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(gain).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export const sfx = {
  ring() {
    blip(880, 0.12, 'sine', 0.14);
    setTimeout(() => blip(1318, 0.18, 'sine', 0.12), 70);
  },
  miss() {
    blip(220, 0.2, 'triangle', 0.08, 140);
  },
  crash() {
    blip(160, 0.4, 'sawtooth', 0.16, 50);
  },
  land() {
    blip(523, 0.15, 'sine', 0.12);
    setTimeout(() => blip(659, 0.15, 'sine', 0.12), 120);
    setTimeout(() => blip(784, 0.3, 'sine', 0.12), 240);
  },
  click() {
    blip(660, 0.06, 'square', 0.05);
  },
  lowFuel() {
    blip(440, 0.1, 'square', 0.06, 330);
  },
};

export function setSoundOn(on) {
  enabled = !!on;
}
export function isSoundOn() {
  return enabled;
}
