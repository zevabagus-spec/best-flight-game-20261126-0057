// Keyboard and mouse for Ridge Runner. One object owns every key state so
// the game loop reads intentions, never events: holding a key is a held
// lever, and a lost window clears every key so the plane never flies on
// with a stuck stick.
import { KEYS } from './config.js';

export function createInput(canvas) {
  const input = {
    keys: new Set(),
    mouseX: 0.5, // 0..1 across the canvas, 0.5 is centred
    mouseActive: false, // the mouse steers only once it has moved
    mouseDown: false,
    pressed: new Set(), // keys pressed since the last frame was read
  };

  const is = (list) => list.some((k) => input.keys.has(k));

  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    if (!e.repeat) input.pressed.add(e.code);
    input.keys.add(e.code);
  });
  window.addEventListener('keyup', (e) => input.keys.delete(e.code));
  // A window that loses focus lets go of every key: no stuck throttle.
  window.addEventListener('blur', () => {
    input.keys.clear();
    input.mouseDown = false;
  });

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    input.mouseX = (e.clientX - rect.left) / Math.max(1, rect.width);
    input.mouseActive = true;
  });
  canvas.addEventListener('mousedown', () => {
    input.mouseDown = true;
  });
  window.addEventListener('mouseup', () => {
    input.mouseDown = false;
  });
  // Touch: dragging steers, and a second finger is the throttle.
  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    input.mouseX = (e.touches[0].clientX - rect.left) / Math.max(1, rect.width);
    input.mouseActive = true;
  }, { passive: false });

  // Read this frame's intentions into the plane, then clear the edges.
  input.applyTo = (plane) => {
    const up = is(KEYS.throttleUp);
    const down = is(KEYS.throttleDown);
    plane.wantThrottle = up && !down ? 1 : down && !up ? -1 : 0;
    const left = is(KEYS.bankLeft);
    const right = is(KEYS.bankRight);
    let bank = left && !right ? -1 : right && !left ? 1 : 0;
    if (bank === 0 && input.mouseActive) {
      // The mouse steers: how far it sits from centre is the bank asked for.
      bank = Math.max(-1, Math.min(1, (input.mouseX - 0.5) * 2.4));
      if (Math.abs(bank) < 0.06) bank = 0;
    }
    plane.wantBank = bank;
    const pitchUp = is(KEYS.pitchUp);
    const pitchDown = is(KEYS.pitchDown);
    plane.wantPitch = pitchUp && !pitchDown ? 1 : pitchDown && !pitchUp ? -1 : 0;
  };

  input.wasPressed = (list) => list.some((k) => input.pressed.has(k));
  input.clearPressed = () => input.pressed.clear();
  input.isDown = is;
  return input;
}
