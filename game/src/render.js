// The world on screen: a chase view down the valley, drawn on one canvas
// with a classic segment projection (no library, no images). Far to near,
// sky, ranges, ground, river, trees, rings, runway, then the plane. Every
// colour is one dusk palette, so the terrain and the sky read as one place.
import { CONFIG } from './config.js';
import { floorAt, headingAt } from './terrain.js';
import { drawPlane, planeScreenPosition } from './aircraft.js';
import { clamp } from './physics.js';

const SKY_TOP = '#16324f';
const SKY_MID = '#7a5a78';
const SKY_HORIZON = '#f2a65a';
const HAZE = '#e8b48a';
const GROUND_A = '#5d7f43';
const GROUND_B = '#54743d';
const WALL_A = '#3f5d3a';
const WALL_B = '#38522f';
const ROCK = '#6d5c4d';
const RIVER = '#5ec8e8';
const ROAD = '#8a7a5c';

// Project a world point to the screen. Returns null when behind the camera.
function project(cam, wx, wy, wz, width, height, horizonY) {
  const d = wz - cam.z;
  if (d < 1) return null;
  const scale = CONFIG.cameraDepth / d;
  return {
    x: width / 2 + scale * (wx - cam.x) * (width / 2),
    y: horizonY - scale * (wy - cam.y) * (height / 2),
    scale,
  };
}

// Mix a hex colour toward the haze colour by `t` (0 = the colour, 1 = haze).
function haze(hex, t) {
  const n = parseInt(hex.slice(1), 16);
  const h = parseInt(HAZE.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) + (((h >> 16) & 255) - ((n >> 16) & 255)) * t);
  const g = Math.round(((n >> 8) & 255) + (((h >> 8) & 255) - ((n >> 8) & 255)) * t);
  const b = Math.round((n & 255) + ((h & 255) - (n & 255)) * t);
  return `rgb(${r},${g},${b})`;
}

// Draw the whole scene for the current frame. `screen` is 'menu' | 'play' |
// 'pause' | 'over'; the menu shows the valley from a slow autopilot pass.
export function drawScene(ctx, world, screen, now, width, height) {
  const plane = world.plane;
  const valley = world.valley;
  const horizonY = height * CONFIG.horizonFraction;
  const cam = {
    x: plane.x,
    z: plane.z - 10,
    y: plane.y + CONFIG.cameraHeight,
  };
  // The camera rides the valley's bends: its lateral anchor is the ribbon
  // centreline at the camera's own distance.
  const camCentre = centreAt(valley, cam.z);
  cam.x = camCentre + plane.x;

  drawSky(ctx, world, width, height, horizonY, now);
  drawRanges(ctx, world, width, height, horizonY, now);

  // Walk the segments ahead, accumulating the ribbon's bend as we go.
  const segLen = CONFIG.segmentLength;
  const base = Math.max(0, Math.floor(cam.z / segLen));
  const segs = [];
  let heading = valley.segments[base].heading;
  let centre = centreAt(valley, cam.z);
  for (let n = 0; n <= CONFIG.drawDistance; n += 1) {
    const i = base + n;
    if (i >= valley.segments.length) break;
    const seg = valley.segments[i];
    if (n > 0) {
      heading += seg.curve;
      centre += Math.sin(heading) * segLen;
    }
    segs.push({ seg, centre, heading });
  }

  // Ground, walls and river, far to near so near strips paint over far.
  for (let n = segs.length - 1; n >= 1; n -= 1) {
    drawGroundStrip(ctx, valley, segs[n - 1], segs[n], cam, width, height, horizonY);
  }

  drawTrees(ctx, valley, segs, cam, width, height, horizonY);
  drawRings(ctx, world, cam, width, height, horizonY);
  drawRunway(ctx, world, cam, width, height, horizonY);
  drawPlaneShadow(ctx, world, cam, width, height, horizonY);

  // The plane itself, banked and pitched, low in the frame so the valley
  // and the ring ahead fill the picture above it.
  const pos = planeScreenPosition(width, height);
  const size = Math.min(width, height) * 0.26;
  drawPlane(ctx, pos.x, pos.y, size, plane.bank, plane.pitch, true);

  // Speed streaks at the edges when the throttle is open.
  if (plane.speed > 55 && screen === 'play') drawStreaks(ctx, plane, width, height, now);
}

// Lateral position of the ribbon centreline at distance z (walked once).
function centreAt(valley, z) {
  const segLen = CONFIG.segmentLength;
  const upto = Math.max(0, Math.min(valley.segments.length - 1, Math.floor(z / segLen)));
  let x = 0;
  let h = 0;
  for (let i = 0; i <= upto; i += 1) {
    h += valley.segments[i].curve;
    x += Math.sin(h) * segLen;
  }
  return x;
}

function drawSky(ctx, world, width, height, horizonY, now) {
  const g = ctx.createLinearGradient(0, 0, 0, horizonY * 1.15);
  g.addColorStop(0, SKY_TOP);
  g.addColorStop(0.55, SKY_MID);
  g.addColorStop(1, SKY_HORIZON);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, horizonY * 1.15);

  // Low sun, warm and large, sitting on the horizon ahead-left.
  const sunX = width * 0.24 - world.plane.heading * 220;
  const sunY = horizonY - height * 0.045;
  const glow = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, height * 0.22);
  glow.addColorStop(0, 'rgba(255, 214, 130, 0.95)');
  glow.addColorStop(0.25, 'rgba(255, 170, 90, 0.55)');
  glow.addColorStop(1, 'rgba(255, 170, 90, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(sunX - height * 0.22, sunY - height * 0.22, height * 0.44, height * 0.44);
  ctx.fillStyle = '#ffe9b0';
  ctx.beginPath();
  ctx.arc(sunX, sunY, height * 0.035, 0, Math.PI * 2);
  ctx.fill();

  // A few slow clouds, drifting with the heading so turning moves the sky.
  ctx.fillStyle = 'rgba(255, 236, 210, 0.5)';
  for (let i = 0; i < 6; i += 1) {
    const cx = ((i * 0.37 + 0.08 - world.plane.heading * 0.06 + now * 0.002) % 1.2) * width - width * 0.1;
    const cy = height * (0.08 + (i % 3) * 0.07);
    const cw = width * (0.09 + (i % 3) * 0.03);
    ctx.beginPath();
    ctx.ellipse(cx, cy, cw, cw * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Two distant ranges, silhouettes from seeded noise, sliding with heading.
function drawRanges(ctx, world, width, height, horizonY, now) {
  const layers = [
    { amp: 0.10, colour: '#5b4a68', parallax: 0.35, seed: 11 },
    { amp: 0.07, colour: '#4a3d5c', parallax: 0.6, seed: 47 },
  ];
  for (const layer of layers) {
    ctx.fillStyle = layer.colour;
    ctx.beginPath();
    ctx.moveTo(0, horizonY + 2);
    for (let x = 0; x <= width; x += 16) {
      const t = (x / width) * 6 + layer.seed + world.plane.heading * layer.parallax * 4;
      const y = horizonY - (Math.sin(t) * 0.5 + Math.sin(t * 2.3 + 1.7) * 0.3 + 0.8) * layer.amp * height;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(width, horizonY + 2);
    ctx.closePath();
    ctx.fill();
  }
  void now;
}

// One ground strip between two neighbouring segments: the valley floor, its
// walls rising on both sides, and the river where it crosses the ribbon.
function drawGroundStrip(ctx, valley, a, b, cam, width, height, horizonY) {
  const far = (b.seg.z - cam.z) / (CONFIG.drawDistance * CONFIG.segmentLength);
  const fog = clamp((far - 0.45) / 0.55, 0, 0.75);
  const groundColour = haze(a.seg.band === 0 ? GROUND_A : GROUND_B, fog);
  const wallColour = haze(a.seg.band === 0 ? WALL_A : WALL_B, fog);

  const half = CONFIG.corridorHalfWidth;
  const p = (centre, y, z) => project(cam, centre, y, z, width, height, horizonY);
  const aL = p(a.centre - half, a.seg.floor, a.seg.z);
  const aR = p(a.centre + half, a.seg.floor, a.seg.z);
  const bL = p(b.centre - half, b.seg.floor, b.seg.z);
  const bR = p(b.centre + half, b.seg.floor, b.seg.z);
  if (!aL || !aR || !bL || !bR) return;

  // The floor itself.
  ctx.fillStyle = groundColour;
  ctx.beginPath();
  ctx.moveTo(aL.x, aL.y);
  ctx.lineTo(bL.x, bL.y);
  ctx.lineTo(bR.x, bR.y);
  ctx.lineTo(aR.x, aR.y);
  ctx.closePath();
  ctx.fill();

  // The walls: from the floor edge up to the crest, both sides.
  const wallSpread = 220;
  const aLc = p(a.centre - half - wallSpread, a.seg.floor + a.seg.leftWall, a.seg.z);
  const bLc = p(b.centre - half - wallSpread, b.seg.floor + b.seg.leftWall, b.seg.z);
  const aRc = p(a.centre + half + wallSpread, a.seg.floor + a.seg.rightWall, a.seg.z);
  const bRc = p(b.centre + half + wallSpread, b.seg.floor + b.seg.rightWall, b.seg.z);
  if (aLc && bLc) {
    ctx.fillStyle = wallColour;
    ctx.beginPath();
    ctx.moveTo(aL.x, aL.y);
    ctx.lineTo(bL.x, bL.y);
    ctx.lineTo(bLc.x, bLc.y);
    ctx.lineTo(aLc.x, aLc.y);
    ctx.closePath();
    ctx.fill();
    // Rock near the crest.
    ctx.fillStyle = haze(ROCK, fog);
    ctx.beginPath();
    ctx.moveTo(aLc.x, aLc.y);
    ctx.lineTo(bLc.x, bLc.y);
    ctx.lineTo(bLc.x, bLc.y - 6);
    ctx.lineTo(aLc.x, aLc.y - 6);
    ctx.closePath();
    ctx.fill();
  }
  if (aRc && bRc) {
    ctx.fillStyle = wallColour;
    ctx.beginPath();
    ctx.moveTo(aR.x, aR.y);
    ctx.lineTo(bR.x, bR.y);
    ctx.lineTo(bRc.x, bRc.y);
    ctx.lineTo(aRc.x, aRc.y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = haze(ROCK, fog);
    ctx.beginPath();
    ctx.moveTo(aRc.x, aRc.y);
    ctx.lineTo(bRc.x, bRc.y);
    ctx.lineTo(bRc.x, bRc.y - 6);
    ctx.lineTo(aRc.x, aRc.y - 6);
    ctx.closePath();
    ctx.fill();
  }

  // The river: a bright band across the floor where it meanders through.
  const riverX = riverXAt(valley, a.seg.z);
  const rL = p(a.centre + riverX - 6, a.seg.floor + 0.4, a.seg.z);
  const rR = p(a.centre + riverX + 6, a.seg.floor + 0.4, a.seg.z);
  const rL2 = p(b.centre + riverXAt(valley, b.seg.z) - 6, b.seg.floor + 0.4, b.seg.z);
  const rR2 = p(b.centre + riverXAt(valley, b.seg.z) + 6, b.seg.floor + 0.4, b.seg.z);
  if (rL && rR && rL2 && rR2) {
    ctx.fillStyle = haze(RIVER, fog);
    ctx.beginPath();
    ctx.moveTo(rL.x, rL.y);
    ctx.lineTo(rL2.x, rL2.y);
    ctx.lineTo(rR2.x, rR2.y);
    ctx.lineTo(rR.x, rR.y);
    ctx.closePath();
    ctx.fill();
  }
}

function riverXAt(valley, z) {
  const pts = valley.riverPoints;
  if (pts.length === 0) return 0;
  let i = 0;
  while (i < pts.length - 1 && pts[i + 1].z <= z) i += 1;
  const a = pts[i];
  const b = pts[Math.min(i + 1, pts.length - 1)];
  const span = Math.max(1, b.z - a.z);
  const t = clamp((z - a.z) / span, 0, 1);
  return a.x + (b.x - a.x) * t;
}

// Trees on the walls, far to near, as simple dark-green billboards.
function drawTrees(ctx, valley, segs, cam, width, height, horizonY) {
  const farZ = cam.z + CONFIG.drawDistance * CONFIG.segmentLength;
  const list = valley.trees.filter((t) => t.z > cam.z + 4 && t.z < farZ);
  list.sort((a, b) => b.z - a.z);
  for (const tree of list) {
    const centre = centreAt(valley, tree.z);
    const ground = floorAt(valley, tree.z);
    const p = project(cam, centre + tree.x, ground, tree.z, width, height, horizonY);
    if (!p) continue;
    const h = Math.max(1.5, p.scale * tree.size * (width / 2) * 0.9);
    const fog = clamp(((tree.z - cam.z) / (CONFIG.drawDistance * CONFIG.segmentLength) - 0.4) / 0.6, 0, 0.7);
    ctx.fillStyle = haze(tree.hue > 0.5 ? '#2f5230' : '#3a5f33', fog);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - h);
    ctx.lineTo(p.x - h * 0.42, p.y);
    ctx.lineTo(p.x + h * 0.42, p.y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = haze('#4a3524', fog);
    ctx.fillRect(p.x - h * 0.06, p.y - h * 0.08, h * 0.12, h * 0.12);
  }
}

// Rings: the next one glows amber, flown ones green, the rest pale.
function drawRings(ctx, world, cam, width, height, horizonY) {
  const rings = [...world.valley.rings].sort((a, b) => b.z - a.z);
  for (const ring of rings) {
    if (ring.z < cam.z + 4) continue;
    const centre = centreAt(world.valley, ring.z);
    const p = project(cam, centre + ring.x, ring.y, ring.z, width, height, horizonY);
    if (!p) continue;
    const r = Math.max(2, p.scale * CONFIG.ringRadius * (width / 2));
    const isNext = world.valley.rings[world.nextRing] === ring;
    const colour = ring.passed ? '#34d399' : isNext ? '#fbbf24' : 'rgba(226, 232, 240, 0.75)';
    ctx.save();
    if (isNext) {
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = r * 0.5;
    }
    ctx.strokeStyle = colour;
    ctx.lineWidth = Math.max(2, r * 0.16);
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.stroke();
    // Chevrons around the rim, so the ring reads even when it is small.
    ctx.fillStyle = colour;
    for (let k = 0; k < 4; k += 1) {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
      ctx.beginPath();
      ctx.arc(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, Math.max(1.5, r * 0.07), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    if (isNext) {
      ctx.fillStyle = '#fde68a';
      ctx.font = `bold ${Math.max(11, r * 0.28)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(`RING ${ring.id + 1}`, p.x, p.y - r - 8);
    }
  }
}

// The runway: asphalt, centreline dashes, threshold bars and edge lights.
function drawRunway(ctx, world, cam, width, height, horizonY) {
  const rw = world.valley.runway;
  if (rw.endZ < cam.z + 4 || rw.startZ > cam.z + CONFIG.drawDistance * CONFIG.segmentLength) return;
  const half = rw.width / 2;
  const centre = centreAt(world.valley, rw.startZ);
  const p = (x, z) => project(cam, centre + x, rw.floor + 0.3, z, width, height, horizonY);
  const s1 = p(-half, rw.startZ);
  const s2 = p(half, rw.startZ);
  const e1 = p(-half, rw.endZ);
  const e2 = p(half, rw.endZ);
  if (!s1 || !s2 || !e1 || !e2) return;
  ctx.fillStyle = '#3f4756';
  ctx.beginPath();
  ctx.moveTo(s1.x, s1.y);
  ctx.lineTo(e1.x, e1.y);
  ctx.lineTo(e2.x, e2.y);
  ctx.lineTo(s2.x, s2.y);
  ctx.closePath();
  ctx.fill();
  // Centreline dashes down the strip.
  ctx.fillStyle = '#f8fafc';
  for (let d = 20; d < CONFIG.runwayLength; d += 40) {
    const z = rw.startZ + d;
    const c = p(0, z);
    const c2 = p(0, z + 14);
    if (!c || !c2) continue;
    const w = Math.max(1, Math.abs(c.x - p(3, z).x));
    ctx.fillRect(c.x - w / 2, Math.min(c.y, c2.y), w, Math.abs(c.y - c2.y) + 1);
  }
  // Threshold bars at the near end.
  for (let k = -2; k <= 2; k += 1) {
    const a = p(k * 4 - 1.5, rw.startZ + 8);
    const b = p(k * 4 + 1.5, rw.startZ + 8);
    if (!a || !b) continue;
    ctx.fillRect(Math.min(a.x, b.x), a.y - 2, Math.abs(a.x - b.x), 4);
  }
  // Edge lights, amber, along both sides.
  ctx.fillStyle = '#fbbf24';
  for (let d = 0; d <= CONFIG.runwayLength; d += 30) {
    for (const side of [-half, half]) {
      const q = p(side, rw.startZ + d);
      if (q) {
        ctx.beginPath();
        ctx.arc(q.x, q.y, Math.max(1.5, q.scale * 600), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

// The plane's shadow on the ground below it, for landing judgement.
function drawPlaneShadow(ctx, world, cam, width, height, horizonY) {
  const plane = world.plane;
  const ground = floorAt(world.valley, plane.z);
  const agl = Math.max(0, plane.y - ground);
  if (agl > 260) return;
  const centre = centreAt(world.valley, plane.z);
  const p = project(cam, centre + plane.x, ground + 0.5, plane.z + 6, width, height, horizonY);
  if (!p) return;
  const alpha = clamp(0.4 - agl / 600, 0.06, 0.4);
  ctx.fillStyle = `rgba(15, 23, 42, ${alpha})`;
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, Math.max(3, p.scale * 900), Math.max(1.5, p.scale * 260), 0, 0, Math.PI * 2);
  ctx.fill();
}

// Wind streaks at the screen edges when the throttle is open.
function drawStreaks(ctx, plane, width, height, now) {
  const strength = clamp((plane.speed - 55) / 40, 0, 1);
  ctx.strokeStyle = `rgba(255, 255, 255, ${0.25 * strength})`;
  ctx.lineWidth = 2;
  for (let i = 0; i < 10; i += 1) {
    const y = ((i * 97 + now * 0.9) % 1) * height;
    const len = 30 + plane.speed * 0.9;
    const x = i % 2 === 0 ? 12 : width - 12 - len;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + len * (i % 2 === 0 ? 1 : -1), y);
    ctx.stroke();
  }
}
