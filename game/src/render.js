// Merapi Ring Run — all art is drawn in code: dawn sky, the Merapi cone,
// terraced valley, river, villages, the airstrip, gold rings, the little
// red-and-white prop plane, and the full HUD. No image assets.
import { VIEW, PLANE, RINGS, RING_RADIUS, RUN } from './config.js';
import { groundHeight } from './world.js';
import { mulberry32 } from './random.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_OVER = 'over';

const W = VIEW.width;
const H = VIEW.height;
const HORIZON = VIEW.horizon;

// Seeded clouds, fixed for every run.
const cloudRng = mulberry32(99);
const CLOUDS = [];
for (let i = 0; i < 14; i += 1) {
  CLOUDS.push({
    x: -500 + cloudRng() * 1000,
    y: 30 + cloudRng() * 190,
    s: 40 + cloudRng() * 90,
    drift: 2 + cloudRng() * 5,
  });
}

function skyGradient(ctx) {
  const g = ctx.createLinearGradient(0, 0, 0, HORIZON + 60);
  g.addColorStop(0, '#2b3a6e');
  g.addColorStop(0.35, '#7a5a8e');
  g.addColorStop(0.62, '#e08a5a');
  g.addColorStop(0.85, '#f7c489');
  g.addColorStop(1, '#ffe3b3');
  return g;
}

function groundGradient(ctx) {
  const g = ctx.createLinearGradient(0, HORIZON, 0, H);
  g.addColorStop(0, '#8a9a5b');
  g.addColorStop(0.4, '#5d7a3a');
  g.addColorStop(1, '#3c5a26');
  return g;
}

// Pseudo-3D projection of a world point (distance d ahead, lateral x,
// altitude a) onto the screen.
function project(s, d, x, a) {
  const scale = 520 / (d + 90);
  return {
    x: W / 2 + (x - s.x) * scale * 2.2,
    y: HORIZON - (a - s.alt) * scale * 1.6,
    scale,
  };
}

function drawSky(ctx, s) {
  ctx.fillStyle = skyGradient(ctx);
  ctx.fillRect(0, 0, W, HORIZON + 80);
  // Rising sun, low over the valley mouth.
  const sunX = 1010 - s.x * 0.12;
  const sunY = 132;
  const glow = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 150);
  glow.addColorStop(0, 'rgba(255, 236, 180, 0.95)');
  glow.addColorStop(0.25, 'rgba(255, 190, 110, 0.55)');
  glow.addColorStop(1, 'rgba(255, 170, 90, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(sunX - 160, sunY - 160, 320, 320);
  ctx.fillStyle = '#fff3cf';
  ctx.beginPath();
  ctx.arc(sunX, sunY, 34, 0, Math.PI * 2);
  ctx.fill();
  // Clouds, drifting slowly with world time.
  ctx.fillStyle = 'rgba(255, 235, 220, 0.85)';
  for (const c of CLOUDS) {
    const cx = ((c.x + s.time * c.drift - s.x * 0.06) % 1500 + 1500) % 1500 - 110;
    const cy = c.y;
    ctx.beginPath();
    ctx.ellipse(cx, cy, c.s, c.s * 0.32, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + c.s * 0.5, cy + 6, c.s * 0.6, c.s * 0.26, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function ridge(ctx, baseY, amp, freq, phase, color, parallax, s) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, HORIZON + 4);
  for (let x = 0; x <= W; x += 16) {
    const px = x - s.x * parallax - s.z * parallax * 0.02;
    const y = baseY - amp * (0.6 + 0.4 * Math.sin(px * freq + phase) * Math.sin(px * freq * 0.37 + phase * 2));
    ctx.lineTo(x, y);
  }
  ctx.lineTo(W, HORIZON + 4);
  ctx.closePath();
  ctx.fill();
}

function drawVolcano(ctx, s) {
  // The Merapi cone, dead ahead on the horizon, smoke curling from the crater.
  const cx = W / 2 + 60 - s.x * 0.35;
  const baseY = HORIZON + 2;
  const topY = HORIZON - 218;
  ctx.fillStyle = '#5d4a63';
  ctx.beginPath();
  ctx.moveTo(cx - 260, baseY);
  ctx.quadraticCurveTo(cx - 90, baseY - 150, cx - 26, topY);
  ctx.lineTo(cx + 26, topY);
  ctx.quadraticCurveTo(cx + 90, baseY - 150, cx + 260, baseY);
  ctx.closePath();
  ctx.fill();
  // Snow/ash cap near the crater.
  ctx.fillStyle = '#cbb8c2';
  ctx.beginPath();
  ctx.moveTo(cx - 26, topY);
  ctx.lineTo(cx + 26, topY);
  ctx.lineTo(cx + 14, topY + 26);
  ctx.lineTo(cx, topY + 14);
  ctx.lineTo(cx - 14, topY + 26);
  ctx.closePath();
  ctx.fill();
  // Smoke puffs rising from the crater, driven by world time.
  ctx.fillStyle = 'rgba(235, 228, 230, 0.45)';
  for (let i = 0; i < 5; i += 1) {
    const rise = (s.time * 9 + i * 34) % 130;
    const px = cx + Math.sin(i * 2.4 + s.time * 0.4) * 10 + rise * 0.22;
    const py = topY - 8 - rise;
    const r = 7 + rise * 0.12;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGround(ctx, s) {
  ctx.fillStyle = groundGradient(ctx);
  ctx.fillRect(0, HORIZON, W, H - HORIZON);
  // Distant ground haze band.
  ctx.fillStyle = 'rgba(255, 220, 170, 0.25)';
  ctx.fillRect(0, HORIZON, W, 26);

  // The river: a winding blue band down the valley, drawn as projected
  // segments so it bends with the terrain.
  ctx.strokeStyle = '#5fa8c9';
  ctx.lineCap = 'round';
  for (let d = 120; d < 1500; d += 60) {
    const z0 = s.z + d;
    const z1 = s.z + d + 60;
    const rx0 = 58 * Math.sin(z0 * 0.0011) + 18 * Math.sin(z0 * 0.0037);
    const rx1 = 58 * Math.sin(z1 * 0.0011) + 18 * Math.sin(z1 * 0.0037);
    const p0 = project(s, d, rx0, groundHeight(z0, rx0) + 1);
    const p1 = project(s, d + 60, rx1, groundHeight(z1, rx1) + 1);
    ctx.lineWidth = Math.max(1, Math.min(30, 26 * p0.scale));
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();
  }

  // Seeded ground features, nearest last so near ones overlap far ones.
  const feats = s.features.filter((f) => f.z > s.z + 10 && f.z < s.z + 1500);
  feats.sort((a, b) => b.z - a.z);
  for (const f of feats) {
    const d = f.z - s.z;
    const g = groundHeight(f.z, f.x);
    const p = project(s, d, f.x, g);
    const k = p.scale;
    if (f.kind === 'terraces') {
      ctx.fillStyle = '#7fae4e';
      ctx.strokeStyle = '#5d8a38';
      ctx.lineWidth = 1;
      for (let i = 0; i < 4; i += 1) {
        const w = f.w * k * (1 - i * 0.16);
        const y = p.y + i * 7 * k;
        ctx.beginPath();
        ctx.ellipse(p.x, y, Math.max(2, w), Math.max(1.5, 5 * k), 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    } else if (f.kind === 'trees') {
      for (let i = 0; i < f.n; i += 1) {
        const tx = p.x + (i - f.n / 2) * 22 * k;
        const th = 26 * k;
        ctx.fillStyle = '#2e5d23';
        ctx.beginPath();
        ctx.moveTo(tx, p.y - th);
        ctx.lineTo(tx - 9 * k, p.y);
        ctx.lineTo(tx + 9 * k, p.y);
        ctx.closePath();
        ctx.fill();
      }
    } else if (f.kind === 'village') {
      for (let i = 0; i < f.n; i += 1) {
        const hx = p.x + (i - f.n / 2) * 30 * k;
        const hw = 16 * k;
        const hh = 11 * k;
        ctx.fillStyle = '#f2e3c2';
        ctx.fillRect(hx - hw / 2, p.y - hh, hw, hh);
        ctx.fillStyle = '#b4502e';
        ctx.beginPath();
        ctx.moveTo(hx - hw / 2 - 2, p.y - hh);
        ctx.lineTo(hx, p.y - hh - 8 * k);
        ctx.lineTo(hx + hw / 2 + 2, p.y - hh);
        ctx.closePath();
        ctx.fill();
      }
    } else {
      ctx.fillStyle = f.hue > 0.5 ? '#c9a86a' : '#8fae52';
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, Math.max(3, f.w * k), Math.max(2, 6 * k), 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // The mountain airstrip: grey ribbon with a white centre line.
  const stripStart = RUN.courseLength;
  const stripEnd = RUN.courseLength + RUN.stripLength;
  if (s.z + 1500 > stripStart && s.z < stripEnd) {
    const pts = [];
    for (let d = Math.max(20, stripStart - s.z); d <= Math.min(1500, stripEnd - s.z); d += 40) {
      const z = s.z + d;
      const g = groundHeight(z, 0);
      pts.push({ l: project(s, d, -30, g + 1), r: project(s, d, 30, g + 1) });
    }
    if (pts.length > 1) {
      ctx.fillStyle = '#6f6f74';
      ctx.beginPath();
      ctx.moveTo(pts[0].l.x, pts[0].l.y);
      for (const p of pts) ctx.lineTo(p.l.x, p.l.y);
      for (let i = pts.length - 1; i >= 0; i -= 1) ctx.lineTo(pts[i].r.x, pts[i].r.y);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#f5f5f5';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < pts.length; i += 1) {
        const mx = (pts[i].l.x + pts[i].r.x) / 2;
        const my = (pts[i].l.y + pts[i].r.y) / 2;
        if (i % 2 === 0) {
          ctx.moveTo(mx, my);
          ctx.lineTo(mx, my + 8);
        }
      }
      ctx.stroke();
    }
  }
}

function drawRings(ctx, s) {
  const ahead = s.rings.filter((r) => !r.done && r.z > s.z && r.z < s.z + 1600);
  ahead.sort((a, b) => b.z - a.z);
  for (const ring of ahead) {
    const d = ring.z - s.z;
    const p = project(s, d, ring.x, ring.alt);
    const rx = RING_RADIUS * p.scale * 2.2;
    const ry = RING_RADIUS * p.scale * 1.6;
    if (rx < 3) continue;
    const glow = ctx.createRadialGradient(p.x, p.y, rx * 0.4, p.x, p.y, rx * 1.4);
    glow.addColorStop(0, 'rgba(255, 205, 60, 0.10)');
    glow.addColorStop(1, 'rgba(255, 205, 60, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(p.x - rx * 1.5, p.y - ry * 1.5, rx * 3, ry * 3);
    ctx.lineWidth = Math.max(2, rx * 0.16);
    ctx.strokeStyle = '#ffcf3c';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = Math.max(1, rx * 0.06);
    ctx.strokeStyle = '#fff3b0';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, rx * 0.82, ry * 0.82, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Next-ring guide arrow at the top of the screen.
  const next = s.rings.find((r) => !r.done && r.z > s.z);
  if (next) {
    const d = next.z - s.z;
    const p = project(s, d, next.x, next.alt);
    const ax = Math.max(40, Math.min(W - 40, p.x));
    ctx.fillStyle = '#ffcf3c';
    ctx.beginPath();
    ctx.moveTo(ax, 74);
    ctx.lineTo(ax - 9, 58);
    ctx.lineTo(ax + 9, 58);
    ctx.closePath();
    ctx.fill();
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffe9a8';
    ctx.fillText(`${Math.round(d)} m`, ax, 94);
  }
}

function drawPlane(ctx, s) {
  // Chase view: the plane sits low-centre, banking with roll, prop spinning.
  const cx = W / 2;
  const cy = 512 + Math.sin(s.time * 2.2) * 2;
  const bank = (s.roll / PLANE.turnRate) * 0.55;
  const scale = 1.15;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(bank);
  ctx.scale(scale, scale);
  // Shadow on the valley far below.
  ctx.restore();
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(bank);
  // Tail.
  ctx.fillStyle = '#c0272d';
  ctx.beginPath();
  ctx.moveTo(-58, -6);
  ctx.lineTo(-84, -26);
  ctx.lineTo(-84, -14);
  ctx.lineTo(-58, 2);
  ctx.closePath();
  ctx.fill();
  // Fuselage: white top, red belly, red nose.
  ctx.fillStyle = '#f4f1e8';
  ctx.beginPath();
  ctx.ellipse(0, 0, 62, 17, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#c0272d';
  ctx.beginPath();
  ctx.ellipse(0, 7, 58, 10, 0, 0, Math.PI);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(52, -2, 14, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  // Cockpit windows, lit warm by the dawn.
  ctx.fillStyle = '#ffd98a';
  ctx.beginPath();
  ctx.ellipse(28, -8, 16, 7, -0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#7ec8e8';
  ctx.beginPath();
  ctx.ellipse(28, -8, 12, 5, -0.15, 0, Math.PI * 2);
  ctx.fill();
  // Wings.
  ctx.fillStyle = '#c0272d';
  ctx.beginPath();
  ctx.moveTo(-6, 2);
  ctx.lineTo(-30, 34);
  ctx.lineTo(-14, 36);
  ctx.lineTo(14, 6);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-6, -4);
  ctx.lineTo(-26, -34);
  ctx.lineTo(-12, -36);
  ctx.lineTo(12, -8);
  ctx.closePath();
  ctx.fill();
  // Spinning prop: blurred disc + two blades, angle from world time.
  const pa = s.time * 22;
  ctx.fillStyle = 'rgba(40, 40, 50, 0.28)';
  ctx.beginPath();
  ctx.ellipse(66, -2, 7, 34, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2c2c34';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(66 - Math.cos(pa) * 30, -2 - Math.sin(pa) * 30);
  ctx.lineTo(66 + Math.cos(pa) * 30, -2 + Math.sin(pa) * 30);
  ctx.stroke();
  ctx.fillStyle = '#e8e8e8';
  ctx.beginPath();
  ctx.arc(66, -2, 6, 0, Math.PI * 2);
  ctx.fill();
  // Registration on the fuselage.
  ctx.fillStyle = '#c0272d';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ELANG PAGI', -8, 4);
  ctx.restore();
}

function bar(ctx, x, y, w, h, frac, fill, bg) {
  ctx.fillStyle = bg || 'rgba(0,0,0,0.45)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w * Math.max(0, Math.min(1, frac)), h);
}

function drawHUD(ctx, s, best) {
  ctx.textAlign = 'left';
  // Top bar.
  ctx.fillStyle = 'rgba(12, 18, 38, 0.62)';
  ctx.fillRect(0, 0, W, 46);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText(`SCORE ${s.score}`, 18, 30);
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillStyle = '#ffd98a';
  ctx.fillText(`BEST ${Math.max(best, s.score)}`, 190, 29);
  ctx.fillStyle = '#ffcf3c';
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.fillText(`RINGS ${s.ringsHit}/${RINGS.length}`, 300, 29);
  if (s.combo > 1) {
    ctx.fillStyle = '#ff9d3c';
    ctx.fillText(`COMBO x${s.combo}`, 420, 29);
  }
  // Lives: little plane silhouettes.
  for (let i = 0; i < RUN.lives; i += 1) {
    const lx = 560 + i * 30;
    ctx.fillStyle = i < s.lives ? '#ff5a5a' : 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.moveTo(lx, 18);
    ctx.lineTo(lx + 20, 24);
    ctx.lineTo(lx, 30);
    ctx.lineTo(lx + 5, 24);
    ctx.closePath();
    ctx.fill();
  }
  // Compass strip, centre top.
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  const hdg = Math.round(((s.heading % 360) + 360) % 360);
  ctx.fillText(`HDG ${String(hdg).padStart(3, '0')}°`, W / 2 + 130, 29);
  // Instruments, right side — lit.
  ctx.textAlign = 'right';
  ctx.fillStyle = '#7ec8e8';
  ctx.font = 'bold 19px system-ui, sans-serif';
  ctx.fillText(`ALT ${Math.round(s.alt)} m`, W - 210, 29);
  ctx.fillStyle = '#8dff9e';
  ctx.fillText(`SPD ${Math.round(s.speed * 3.6)} km/h`, W - 18, 29);
  ctx.textAlign = 'left';

  // Fuel gauge, bottom left.
  ctx.fillStyle = 'rgba(12, 18, 38, 0.62)';
  ctx.fillRect(14, H - 62, 250, 48);
  ctx.fillStyle = s.fuel <= 20 && Math.floor(s.time * 2) % 2 === 0 ? '#ff5a5a' : '#fff';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText('FUEL', 24, H - 42);
  bar(ctx, 70, H - 52, 140, 12, s.fuel / RUN.fuelMax, s.fuel <= 20 ? '#ff5a5a' : '#ffb43c');
  ctx.fillStyle = '#fff';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText(`${Math.round(s.fuel)}%`, 216, H - 42);
  // Throttle bar.
  ctx.fillText('THR', 24, H - 24);
  bar(ctx, 70, H - 32, 140, 8, s.throttle, '#8dff9e');

  // Artificial horizon, bottom right.
  const ax = W - 70;
  const ay = H - 62;
  const ar = 34;
  ctx.save();
  ctx.beginPath();
  ctx.arc(ax, ay, ar, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = '#3a6ea8';
  ctx.fillRect(ax - ar, ay - ar, ar * 2, ar * 2);
  ctx.save();
  ctx.translate(ax, ay);
  ctx.rotate(-(s.roll / PLANE.turnRate) * 0.5);
  ctx.translate(0, s.pitch * 1.4);
  ctx.fillStyle = '#7a9a5a';
  ctx.fillRect(-ar, 0, ar * 2, ar * 2);
  ctx.restore();
  ctx.fillStyle = '#ffcf3c';
  ctx.fillRect(ax - 14, ay - 1.5, 28, 3);
  ctx.restore();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(ax, ay, ar, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = '11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ATTITUDE', ax, ay + ar + 14);

  // Centre message.
  if (s.messageT > 0 && s.message) {
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(12, 18, 38, 0.55)';
    const tw = ctx.measureText(s.message).width + 36;
    ctx.fillRect(W / 2 - tw / 2, 108, tw, 42);
    ctx.fillStyle = '#ffe9a8';
    ctx.fillText(s.message, W / 2, 138);
    ctx.textAlign = 'left';
  }
  // Distance to the airstrip.
  const toStrip = Math.max(0, RUN.courseLength - s.z);
  ctx.fillStyle = '#fff';
  ctx.font = '14px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(toStrip > 0 ? `Airstrip ${Math.round(toStrip)} m ahead` : 'Airstrip — land now!', W / 2, H - 18);
  ctx.textAlign = 'left';
}

function overlay(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(10, 14, 32, 0.55)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = accent || '#ffcf3c';
  ctx.font = 'bold 64px system-ui, sans-serif';
  ctx.fillText(title, W / 2, 250);
  ctx.fillStyle = '#fff';
  ctx.font = '20px system-ui, sans-serif';
  let y = 300;
  for (const line of lines) {
    ctx.fillText(line, W / 2, y);
    y += 34;
  }
  ctx.textAlign = 'left';
}

export function draw(ctx, s, screen, best) {
  ctx.clearRect(0, 0, W, H);
  drawSky(ctx, s);
  ridge(ctx, HORIZON - 8, 46, 0.004, 1.7, '#6a5a7d', 0.06, s);
  ridge(ctx, HORIZON - 2, 30, 0.007, 4.2, '#4e4a68', 0.12, s);
  drawVolcano(ctx, s);
  drawGround(ctx, s);
  drawRings(ctx, s);
  if (screen !== SCREEN_TITLE) drawPlane(ctx, s);
  if (screen === SCREEN_PLAY) drawHUD(ctx, s, best);
  if (screen === SCREEN_TITLE) {
    // The plane still shows on the title screen, parked in the dawn light.
    drawPlane(ctx, s);
    overlay(ctx, 'MERAPI RING RUN', [
      'Dawn flight over the volcanic valley — fly Elang Pagi through the gold rings',
      'and put her down on the mountain airstrip before the fuel runs out.',
      '',
      '↑ / ↓  climb & dive      ← / →  bank & turn      SHIFT  full throttle      Mouse steers too',
      `Best score: ${best}`,
      '',
      'Press ENTER to fly',
    ]);
  }
  if (screen === SCREEN_OVER) {
    const title = s.won ? 'LANDED SAFELY!' : 'RUN OVER';
    overlay(ctx, title, [
      s.won ? 'Elang Pagi is down on the mountain airstrip. Beautiful flying.' : s.message || 'Out of lives.',
      `Score ${s.score}    Rings ${s.ringsHit}/${RINGS.length}    Best combo x${Math.max(1, s.bestCombo)}`,
      `Best score: ${Math.max(best, s.score)}`,
      '',
      'Press ENTER to fly again',
    ], s.won ? '#8dff9e' : '#ff8a7a');
  }
}
