// Merapi Ring Run — bootstrap and fixed-step game loop.
import { RUN } from './config.js';
import { createWorld, EVENT_CRASH, EVENT_LANDED, EVENT_LOW_FUEL, EVENT_OVER, EVENT_RING, EVENT_MISS } from './world.js';
import { createInput } from './input.js';
import { draw, SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';
import { sfx, setSoundOn, isSoundOn } from './audio.js';

const BEST_KEY = 'merapi-ring-run-best';

function loadBest() {
  try {
    return Number(window.localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}
function saveBest(v) {
  try {
    window.localStorage.setItem(BEST_KEY, String(v));
  } catch {
    // localStorage may be unavailable; the game plays on regardless.
  }
}

function boot() {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  const seed = Number(params.get('seed') || 1) || 1;
  const world = createWorld(seed);
  const input = createInput(canvas);
  let best = loadBest();
  let screen = SCREEN_TITLE;
  let paused = false;
  let last = performance.now();
  let acc = 0;

  function handleEvents(ev) {
    if (ev & EVENT_RING) sfx.ring();
    if (ev & EVENT_MISS) sfx.miss();
    if (ev & EVENT_CRASH) sfx.crash();
    if (ev & EVENT_LANDED) sfx.land();
    if (ev & EVENT_LOW_FUEL) sfx.lowFuel();
    if (ev & EVENT_OVER) {
      screen = SCREEN_OVER;
      if (world.state.score > best) {
        best = world.state.score;
        saveBest(best);
      }
    }
    if (ev & EVENT_LANDED) {
      screen = SCREEN_OVER;
      if (world.state.score > best) {
        best = world.state.score;
        saveBest(best);
      }
    }
  }

  if (shot) {
    // Deterministic screenshot mode: stage the scene, draw one frame.
    const staged = stageShot(shot, world);
    screen = staged.screen;
    if (staged.best > best) best = staged.best;
    draw(ctx, world.state, screen, best);
    document.title = `Merapi Ring Run — shot ${shot}`;
    return;
  }

  // Tiny read-only probe for automated play-testing (harmless in play).
  window.__merapi = () => ({
    screen,
    score: world.state.score,
    ringsHit: world.state.ringsHit,
    ringsMissed: world.state.ringsMissed,
    lives: world.state.lives,
    z: Math.round(world.state.z),
    alt: Math.round(world.state.alt),
    fuel: Math.round(world.state.fuel),
    over: world.state.over,
    landed: world.state.landed,
  });

  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (input.pausePressed()) {
      paused = !paused;
      input.consume('p');
    }
    if (input.mutePressed()) {
      setSoundOn(!isSoundOn());
      input.consume('m');
    }
    if (!paused) {
      if (screen === SCREEN_TITLE && input.startPressed()) {
        world.reset();
        screen = SCREEN_PLAY;
        input.consume('enter');
        input.consume(' ');
        sfx.click();
      } else if (screen === SCREEN_OVER && input.startPressed()) {
        world.reset();
        screen = SCREEN_PLAY;
        input.consume('enter');
        input.consume(' ');
        sfx.click();
      } else if (screen === SCREEN_PLAY) {
        acc += dt;
        while (acc >= RUN.step) {
          const f = input.flight();
          const ev = world.step(RUN.step, { pitch: f.pitch, roll: f.roll, throttle: f.throttle === null ? undefined : f.throttle });
          handleEvents(ev);
          acc -= RUN.step;
          if (world.state.over || world.state.landed) break;
        }
      }
    }
    draw(ctx, world.state, screen, best);
    if (paused && screen === SCREEN_PLAY) {
      ctx.fillStyle = 'rgba(10, 14, 32, 0.5)';
      ctx.fillRect(0, 0, 1280, 720);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 40px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PAUSED — press P to resume', 640, 360);
      ctx.textAlign = 'left';
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
