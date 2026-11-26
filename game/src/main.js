// Ridge Runner — the entry point. Wires the canvas, the input, the audio,
// the world and the screens together, and runs the fixed-step loop. The
// game is static files only: no network, no storage, no build step.
import { MISSIONS, KEYS } from './config.js';
import { createWorld, resetWorld, stepWorld, EVENT_RING, EVENT_CRASHED } from './world.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { drawScene } from './render.js';
import { drawHud, drawMenu, drawEnd } from './hud.js';
import { stageShot, steerToward } from './shots.js';

const STEP = 1 / 60;
const SEED = 20261126;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const params = new URLSearchParams(window.location.search);
const seedParam = Number(params.get('seed'));
const seed = Number.isFinite(seedParam) && seedParam > 0 ? Math.floor(seedParam) : SEED;
const shot = params.get('shot');

let width = 0;
let height = 0;
let dpr = 1;

function resize() {
  dpr = Math.min(2, window.devicePixelRatio || 1);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();

const input = createInput(canvas);
const audio = createAudio();
let world = createWorld(MISSIONS[0], seed);
let screen = 'menu'; // 'menu' | 'play' | 'pause' | 'over'
let frozen = false; // a ?shot= frame: staged once, never stepped again

// The menu flies itself: a slow autopilot pass so the title sits over a
// living valley instead of a still picture.
function menuAutopilot() {
  const ring = world.valley.rings[world.nextRing];
  if (ring) steerToward(world, ring.x, ring.y, ring.z, 58);
  if (world.over || world.plane.z > 1500) resetWorld(world);
}

function startMission(mission) {
  world = createWorld(mission, seed);
  screen = 'play';
  audio.ensure();
}

function backToMenu() {
  world = createWorld(world.mission, seed);
  screen = 'menu';
}

// A staged screenshot: play the real rules forward once, then hold the
// frame exactly as it landed.
if (shot) {
  screen = stageShot(shot, world);
  frozen = true;
}

let last = performance.now();
let accumulator = 0;

function frame(now) {
  const elapsed = Math.min(0.1, (now - last) / 1000);
  last = now;

  if (!frozen) {
    accumulator += elapsed;
    while (accumulator >= STEP) {
      accumulator -= STEP;
      step(now, STEP);
    }
  }
  render(now / 1000);
  input.clearPressed();
  requestAnimationFrame(frame);
}

function step(now, dt) {
  void now;
  if (screen === 'menu') {
    menuAutopilot();
    stepWorld(world, dt);
    // Mission keys start a sortie from the menu.
    for (const m of MISSIONS) {
      if (input.wasPressed([`Digit${m.key}`])) startMission(m);
    }
    if (input.wasPressed(KEYS.confirm)) startMission(world.mission);
    return;
  }
  if (screen === 'play') {
    input.applyTo(world.plane);
    const events = stepWorld(world, dt);
    audio.update(world.plane);
    if (events & EVENT_RING) audio.chime(world.ringsHit > 0);
    if (events & EVENT_CRASHED) audio.thud();
    if (world.over) screen = 'over';
    if (input.wasPressed(KEYS.pause)) screen = 'pause';
    if (input.wasPressed(KEYS.restart)) resetWorld(world);
    if (input.wasPressed(KEYS.mute)) audio.setMuted(!audio.muted);
    return;
  }
  if (screen === 'pause') {
    if (input.wasPressed(KEYS.pause) || input.wasPressed(KEYS.confirm)) screen = 'play';
    if (input.wasPressed(KEYS.restart)) {
      resetWorld(world);
      screen = 'play';
    }
    return;
  }
  // screen === 'over'
  if (input.wasPressed(KEYS.restart) || input.wasPressed(KEYS.confirm)) {
    resetWorld(world);
    screen = 'play';
  }
  if (input.wasPressed(KEYS.mute)) backToMenu();
}

// Clicking a mission row on the menu starts that sortie.
canvas.addEventListener('click', (e) => {
  audio.ensure();
  if (screen !== 'menu') return;
  const rect = canvas.getBoundingClientRect();
  const y = e.clientY - rect.top;
  let rowY = height * 0.34;
  for (const m of MISSIONS) {
    if (y >= rowY && y <= rowY + 64) {
      startMission(m);
      return;
    }
    rowY += 78;
  }
  startMission(world.mission);
});

// Losing the window pauses a flight in progress; a stuck key never flies on.
window.addEventListener('blur', () => {
  if (screen === 'play') screen = 'pause';
});

function render(now) {
  ctx.clearRect(0, 0, width, height);
  drawScene(ctx, world, screen, now, width, height);
  if (screen === 'menu') drawMenu(ctx, world, width, height, now);
  else if (screen === 'over') {
    drawHud(ctx, world, now, width, height);
    drawEnd(ctx, world, width, height, now);
  } else if (screen === 'pause') {
    drawHud(ctx, world, now, width, height);
    drawPaused(ctx, width, height, now);
  } else {
    drawHud(ctx, world, now, width, height);
  }
}

function drawPaused(ctx, width, height, now) {
  ctx.fillStyle = 'rgba(8, 14, 26, 0.55)';
  ctx.fillRect(0, 0, width, height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#bfe6ff';
  ctx.font = `bold ${Math.min(48, width * 0.05)}px system-ui, sans-serif`;
  ctx.fillText('PAUSED', width / 2, height * 0.42);
  const pulse = 0.65 + 0.35 * Math.sin(now * 3);
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#e2e8f0';
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillText('P or Enter to resume · R to restart', width / 2, height * 0.42 + 40);
  ctx.globalAlpha = 1;
}

requestAnimationFrame(frame);
