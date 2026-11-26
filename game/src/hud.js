// The instruments: everything the pilot reads while flying, drawn lit on
// the glass — airspeed, altitude, heading, the attitude ball, throttle,
// fuel and damage — plus the menu and end screens. The HUD is drawn on the
// same canvas as the world, so a screenshot shows the game as it is flown.
import { CONFIG, MISSIONS } from './config.js';
import { readouts } from './physics.js';
import { nextRing, timeLeft } from './world.js';

const PANEL = 'rgba(10, 18, 32, 0.62)';
const PANEL_EDGE = 'rgba(148, 197, 255, 0.45)';
const LIT = '#bfe6ff';
const AMBER = '#fbbf24';
const GREEN = '#34d399';
const RED = '#f87171';

// Draw the whole HUD over the scene for a playing or paused frame.
export function drawHud(ctx, world, now, width, height) {
  const r = readouts(world.plane, world.valley);
  const top = 14;
  const pad = 14;

  drawReadoutBox(ctx, pad, top, 150, 64, 'AIRSPEED', `${r.speedKts}`, 'KT', r.stalled ? RED : LIT);
  drawReadoutBox(ctx, width - pad - 150, top, 150, 64, 'ALTITUDE', `${r.altitudeFt}`, 'FT', LIT);
  drawCompass(ctx, world, width / 2, top + 32, Math.min(360, width * 0.42), 64);
  drawVerticalSpeed(ctx, width - pad - 150, top + 76, 150, 30, r.verticalFpm);

  drawAttitude(ctx, pad, height - pad - 108, 108, world.plane.bank, world.plane.pitch);
  drawThrottleFuel(ctx, width - pad - 150, height - pad - 108, 150, 108, world, r);

  drawMissionBar(ctx, world, width / 2, top + 92, now);

  // Warnings, centre screen, where the pilot cannot miss them.
  if (r.stalled) drawWarning(ctx, 'STALL — NOSE DOWN, POWER UP', width / 2, height * 0.42, RED, now);
  else if (world.plane.y - floorBelow(world) < 25 && world.plane.verticalSpeed < -2) {
    drawWarning(ctx, 'PULL UP — TERRAIN', width / 2, height * 0.42, AMBER, now);
  }

  // The transient banner (ring scored, fuel empty, and the like).
  if (world.message && world.time < world.messageUntil) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, (world.messageUntil - world.time) * 2);
    ctx.fillStyle = PANEL;
    ctx.strokeStyle = PANEL_EDGE;
    ctx.lineWidth = 1;
    const w = ctx.measureText(world.message).width + 44;
    roundRect(ctx, width / 2 - w / 2, height * 0.58, w, 34, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = LIT;
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(world.message, width / 2, height * 0.58 + 17);
    ctx.restore();
  }

  drawControlsHint(ctx, width, height);
}

function floorBelow(world) {
  const z = world.plane.z;
  const i = Math.max(0, Math.min(world.valley.segments.length - 1, Math.floor(z / CONFIG.segmentLength)));
  return world.valley.segments[i].floor;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawReadoutBox(ctx, x, y, w, h, label, value, unit, colour) {
  ctx.fillStyle = PANEL;
  ctx.strokeStyle = PANEL_EDGE;
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, w, h, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#8fb8d8';
  ctx.font = '11px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(label, x + 10, y + 16);
  ctx.fillStyle = colour;
  ctx.font = 'bold 30px system-ui, sans-serif';
  ctx.fillText(value, x + 10, y + 46);
  ctx.fillStyle = '#8fb8d8';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(unit, x + w - 10, y + 46);
}

// Heading tape: cardinal points and degrees, the current heading centred.
function drawCompass(ctx, world, cx, cy, w, h) {
  const r = readouts(world.plane, world.valley);
  ctx.fillStyle = PANEL;
  ctx.strokeStyle = PANEL_EDGE;
  ctx.lineWidth = 1;
  roundRect(ctx, cx - w / 2, cy - h / 2, w, h, 8);
  ctx.fill();
  ctx.stroke();
  ctx.save();
  ctx.beginPath();
  ctx.rect(cx - w / 2, cy - h / 2, w, h);
  ctx.clip();
  const pxPerDeg = w / 90;
  for (let d = -60; d <= 60; d += 5) {
    const deg = ((Math.round(r.headingDeg / 5) * 5 + d) % 360 + 360) % 360;
    const x = cx + d * pxPerDeg;
    const major = deg % 30 === 0;
    ctx.strokeStyle = major ? LIT : 'rgba(191, 230, 255, 0.4)';
    ctx.lineWidth = major ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(x, cy + h / 2 - 8);
    ctx.lineTo(x, cy + h / 2 - (major ? 22 : 14));
    ctx.stroke();
    if (major) {
      ctx.fillStyle = LIT;
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      const label = deg === 0 ? 'N' : deg === 90 ? 'E' : deg === 180 ? 'S' : deg === 270 ? 'W' : `${deg}`;
      ctx.fillText(label, x, cy - h / 2 + 15);
    }
  }
  ctx.restore();
  // The lubber line and the digital heading.
  ctx.fillStyle = AMBER;
  ctx.beginPath();
  ctx.moveTo(cx - 7, cy - h / 2 + 2);
  ctx.lineTo(cx + 7, cy - h / 2 + 2);
  ctx.lineTo(cx, cy - h / 2 + 12);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = LIT;
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${String(r.headingDeg).padStart(3, '0')}°`, cx, cy + h / 2 - 12);
}

function drawVerticalSpeed(ctx, x, y, w, h, fpm) {
  ctx.fillStyle = PANEL;
  ctx.strokeStyle = PANEL_EDGE;
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, w, h, 6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#8fb8d8';
  ctx.font = '11px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('VERT SPEED', x + 8, y + 19);
  ctx.fillStyle = fpm < -300 ? AMBER : LIT;
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`${fpm >= 0 ? '+' : ''}${fpm} FPM`, x + w - 8, y + 19);
}

// The attitude ball: a lit artificial horizon that banks and pitches.
function drawAttitude(ctx, x, y, size, bank, pitch) {
  const cx = x + size / 2;
  const cy = y + size / 2;
  const rad = size / 2;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, rad, 0, Math.PI * 2);
  ctx.clip();
  ctx.translate(cx, cy);
  ctx.rotate(-bank);
  const pitchPx = Math.max(-rad, Math.min(rad, pitch * rad * 1.4));
  ctx.fillStyle = '#2f6fb2';
  ctx.fillRect(-rad, -rad + pitchPx, rad * 2, rad);
  ctx.fillStyle = '#b4632a';
  ctx.fillRect(-rad, pitchPx, rad * 2, rad);
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-rad, pitchPx);
  ctx.lineTo(rad, pitchPx);
  ctx.stroke();
  ctx.restore();
  // The fixed wings of the symbol, and the bezel.
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - rad * 0.55, cy);
  ctx.lineTo(cx - rad * 0.18, cy);
  ctx.moveTo(cx + rad * 0.18, cy);
  ctx.lineTo(cx + rad * 0.55, cy);
  ctx.stroke();
  ctx.fillStyle = AMBER;
  ctx.beginPath();
  ctx.arc(cx, cy, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PANEL_EDGE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, rad, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#8fb8d8';
  ctx.font = '11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ATTITUDE', cx, y + size + 13);
}

// Throttle, fuel and damage bars, bottom right.
function drawThrottleFuel(ctx, x, y, w, h, world, r) {
  ctx.fillStyle = PANEL;
  ctx.strokeStyle = PANEL_EDGE;
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, w, h, 8);
  ctx.fill();
  ctx.stroke();
  bar(ctx, x + 12, y + 18, w - 24, 12, r.throttlePct / 100, '#38bdf8', `THR ${r.throttlePct}%`);
  bar(ctx, x + 12, y + 48, w - 24, 12, r.fuelPct / 100, r.fuelPct < 20 ? RED : GREEN, `FUEL ${r.fuelPct}%`);
  bar(ctx, x + 12, y + 78, w - 24, 12, r.damagePct / 100, r.damagePct > 60 ? RED : AMBER, `DMG ${r.damagePct}%`);
}

function bar(ctx, x, y, w, h, frac, colour, label) {
  ctx.fillStyle = 'rgba(148, 197, 255, 0.18)';
  roundRect(ctx, x, y, w, h, 4);
  ctx.fill();
  if (frac > 0) {
    ctx.fillStyle = colour;
    roundRect(ctx, x, y, Math.max(4, w * frac), h, 4);
    ctx.fill();
  }
  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'bold 10px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(label, x + 5, y + h - 2);
}

// Mission name, rings, score, clock and the next ring's distance.
function drawMissionBar(ctx, world, cx, y, now) {
  const m = world.mission;
  const ring = nextRing(world);
  const left = timeLeft(world);
  const parts = [
    m.name,
    `RINGS ${world.ringsHit}/${world.valley.rings.length}`,
    `SCORE ${world.score}`,
  ];
  if (left !== null) parts.push(`TIME ${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`);
  if (ring) {
    const dist = Math.max(0, Math.round(ring.z - world.plane.z));
    parts.push(`NEXT RING ${dist} M`);
  }
  const text = parts.join('   ·   ');
  ctx.font = 'bold 15px system-ui, sans-serif';
  const w = ctx.measureText(text).width + 36;
  ctx.fillStyle = PANEL;
  ctx.strokeStyle = PANEL_EDGE;
  ctx.lineWidth = 1;
  roundRect(ctx, cx - w / 2, y, w, 30, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = left !== null && left < 20 && Math.floor(now * 2) % 2 === 0 ? RED : LIT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, cx, y + 15);
  ctx.textBaseline = 'alphabetic';
}

function drawWarning(ctx, text, cx, y, colour, now) {
  if (Math.floor(now * 2.4) % 2 === 0) return; // blink, so it cannot be missed
  ctx.fillStyle = colour;
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(text, cx, y);
}

function drawControlsHint(ctx, width, height) {
  ctx.fillStyle = 'rgba(191, 230, 255, 0.55)';
  ctx.font = '12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('W/S throttle · A/D bank · mouse steers · P pause · R restart · M sound', width / 2, height - 10);
}

// The menu: title, the three sorties, the controls. Drawn over a live
// valley view so the first frame already shows the game.
export function drawMenu(ctx, world, width, height, now) {
  const cx = width / 2;
  ctx.fillStyle = 'rgba(8, 14, 26, 0.45)';
  ctx.fillRect(0, 0, width, height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffe9b0';
  ctx.font = `bold ${Math.min(72, width * 0.075)}px system-ui, sans-serif`;
  ctx.fillText('RIDGE RUNNER', cx, height * 0.2);
  ctx.fillStyle = LIT;
  ctx.font = '18px system-ui, sans-serif';
  ctx.fillText('A bush-plane valley run — rings, fuel, and one strip of tarmac.', cx, height * 0.2 + 34);

  let y = height * 0.34;
  for (const m of MISSIONS) {
    const selected = world.mission.id === m.id;
    const w = Math.min(620, width * 0.8);
    ctx.fillStyle = selected ? 'rgba(251, 191, 36, 0.16)' : PANEL;
    ctx.strokeStyle = selected ? AMBER : PANEL_EDGE;
    ctx.lineWidth = selected ? 2 : 1;
    roundRect(ctx, cx - w / 2, y, w, 64, 10);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = selected ? AMBER : LIT;
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`[${m.key}]  ${m.name}`, cx - w / 2 + 18, y + 28);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillText(m.tagline, cx - w / 2 + 18, y + 50);
    y += 78;
  }

  ctx.fillStyle = '#e2e8f0';
  ctx.font = '15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  const pulse = 0.65 + 0.35 * Math.sin(now * 3);
  ctx.globalAlpha = pulse;
  ctx.fillText('Press 1, 2 or 3 — or click a sortie — to fly', cx, y + 18);
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#94a3b8';
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText('W/S or ↑/↓ throttle · A/D or ←/→ bank · I/K pitch · mouse steers · P pause · M sound', cx, y + 46);
}

// The end of a sortie: outcome, score, and what to do next.
export function drawEnd(ctx, world, width, height, now) {
  const cx = width / 2;
  ctx.fillStyle = 'rgba(8, 14, 26, 0.55)';
  ctx.fillRect(0, 0, width, height);
  ctx.textAlign = 'center';
  const good = world.outcome === 'landed' || world.outcome === 'complete';
  ctx.fillStyle = good ? GREEN : RED;
  ctx.font = `bold ${Math.min(54, width * 0.06)}px system-ui, sans-serif`;
  ctx.fillText(world.message || 'SORTIE OVER', cx, height * 0.3);
  ctx.fillStyle = LIT;
  ctx.font = 'bold 34px system-ui, sans-serif';
  ctx.fillText(`SCORE  ${world.score}`, cx, height * 0.3 + 56);
  ctx.fillStyle = '#cbd5e1';
  ctx.font = '17px system-ui, sans-serif';
  ctx.fillText(
    `Rings ${world.ringsHit} of ${world.valley.rings.length}  ·  Time ${Math.round(world.time)}s  ·  Best ${world.best}`,
    cx,
    height * 0.3 + 92,
  );
  const pulse = 0.65 + 0.35 * Math.sin(now * 3);
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#e2e8f0';
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillText('Press R to fly again · M for another sortie · Enter to refly this one', cx, height * 0.3 + 140);
  ctx.globalAlpha = 1;
}
