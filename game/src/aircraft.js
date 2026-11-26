// The aeroplane Ridge Runner flies: a bush plane drawn in code, no image
// file. It is drawn from behind and slightly above, as a chase camera sees
// it, with the wings banking with the plane and the instruments' glow
// reflected in its windows. One function, one job: draw the plane.
import { clamp } from './physics.js';

// Draw the plane centred at (cx, cy), `size` pixels across the wings,
// banked by `bank` radians and pitched by `pitch` radians (positive is
// nose up, which lifts the tail in a chase view). `lit` makes the cockpit
// windows and navigation lights glow, as they do at dawn.
export function drawPlane(ctx, cx, cy, size, bank, pitch, lit) {
  ctx.save();
  ctx.translate(cx, cy + pitch * size * 0.35);
  ctx.rotate(bank);
  const s = size / 200; // the drawing is authored at 200 px wide

  // Soft shadow on the ground far below is drawn by render.js; here is the
  // airframe alone.
  ctx.lineJoin = 'round';

  // Main wings: a broad, slightly swept pair in sunset orange.
  ctx.fillStyle = '#e8590c';
  ctx.strokeStyle = '#8f3a08';
  ctx.lineWidth = 2 * s;
  ctx.beginPath();
  ctx.moveTo(-100 * s, 6 * s);
  ctx.lineTo(-8 * s, -6 * s);
  ctx.lineTo(8 * s, -6 * s);
  ctx.lineTo(100 * s, 6 * s);
  ctx.lineTo(96 * s, 14 * s);
  ctx.lineTo(0, 8 * s);
  ctx.lineTo(-96 * s, 14 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Wing tips: navigation lights, red port and green starboard.
  if (lit) {
    ctx.fillStyle = '#ff3b30';
    ctx.beginPath();
    ctx.arc(-98 * s, 10 * s, 4 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#34d399';
    ctx.beginPath();
    ctx.arc(98 * s, 10 * s, 4 * s, 0, Math.PI * 2);
    ctx.fill();
  }

  // Tailplane and fin: at the tail, nearest the camera (bottom of the
  // frame), the fin rising from it toward the middle of the fuselage.
  ctx.fillStyle = '#c2410c';
  ctx.beginPath();
  ctx.moveTo(-34 * s, 26 * s);
  ctx.lineTo(-6 * s, 34 * s);
  ctx.lineTo(6 * s, 34 * s);
  ctx.lineTo(34 * s, 26 * s);
  ctx.lineTo(30 * s, 32 * s);
  ctx.lineTo(0, 26 * s);
  ctx.lineTo(-30 * s, 32 * s);
  ctx.closePath();
  ctx.fill();
  // The fin rises from the tail toward the sky.
  ctx.fillStyle = '#9a3412';
  ctx.beginPath();
  ctx.moveTo(-5 * s, 34 * s);
  ctx.lineTo(0, 12 * s);
  ctx.lineTo(5 * s, 34 * s);
  ctx.closePath();
  ctx.fill();

  // Fuselage: a tapered body, cream on top, orange below, with a dark
  // cheatline running its length.
  ctx.fillStyle = '#fff7ed';
  ctx.beginPath();
  ctx.moveTo(0, -46 * s);
  ctx.quadraticCurveTo(13 * s, -30 * s, 12 * s, 8 * s);
  ctx.quadraticCurveTo(11 * s, 34 * s, 0, 40 * s);
  ctx.quadraticCurveTo(-11 * s, 34 * s, -12 * s, 8 * s);
  ctx.quadraticCurveTo(-13 * s, -30 * s, 0, -46 * s);
  ctx.fill();
  ctx.strokeStyle = '#7c2d12';
  ctx.lineWidth = 1.5 * s;
  ctx.stroke();
  ctx.fillStyle = '#e8590c';
  ctx.beginPath();
  ctx.moveTo(-12 * s, 6 * s);
  ctx.quadraticCurveTo(-11 * s, 34 * s, 0, 40 * s);
  ctx.quadraticCurveTo(11 * s, 34 * s, 12 * s, 6 * s);
  ctx.quadraticCurveTo(0, 14 * s, -12 * s, 6 * s);
  ctx.closePath();
  ctx.fill();

  // Cockpit windows, lit warm: two panes and a windscreen glint.
  const glass = lit ? '#ffe9a8' : '#7dd3fc';
  ctx.fillStyle = glass;
  ctx.beginPath();
  ctx.moveTo(-8 * s, -26 * s);
  ctx.lineTo(-2 * s, -26 * s);
  ctx.lineTo(-2 * s, -12 * s);
  ctx.lineTo(-8 * s, -12 * s);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(2 * s, -26 * s);
  ctx.lineTo(8 * s, -26 * s);
  ctx.lineTo(8 * s, -12 * s);
  ctx.lineTo(2 * s, -12 * s);
  ctx.closePath();
  ctx.fill();
  if (lit) {
    ctx.fillStyle = 'rgba(255, 233, 168, 0.35)';
    ctx.beginPath();
    ctx.ellipse(0, -19 * s, 11 * s, 9 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Registration on the fin, small and proud.
  ctx.fillStyle = '#fff7ed';
  ctx.font = `bold ${7 * s}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('RR-26', 0, 30 * s);

  // Propeller: a blurred disc ahead of the nose, with a spinner.
  ctx.fillStyle = 'rgba(30, 41, 59, 0.28)';
  ctx.beginPath();
  ctx.ellipse(0, -44 * s, 16 * s, 5 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.arc(0, -44 * s, 3.5 * s, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// Where the plane sits on screen for a given canvas size: centred, low,
// so the valley and the ring ahead fill the frame above it.
export function planeScreenPosition(width, height) {
  return { x: width / 2, y: height * 0.74 };
}

export { clamp };
