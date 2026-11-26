// The screenshot scenes behind ?shot=menu|cover|rings|landing. Each one
// plays the real rules forward from a fresh world for a fixed number of
// steps, steered by a simple autopilot, so the frame is what a short game
// really looks like and the same seed always gives the same frame.
// main.js freezes the sim on the staged frame, so a screenshot is exact.
import { CONFIG, MISSIONS } from './config.js';
import { createWorld, stepWorld, EVENT_OVER } from './world.js';
import { centreAt, floorAt } from './terrain.js';

const STEP = 1 / 60;

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

// Steer the plane toward a point in the valley. The point is named by its
// offset from the ribbon centreline at its own distance, so the steering
// accounts for the valley's bends: it aims at where the point really is,
// not where it would be if the valley ran straight. The nose is pointed at
// the target (bank follows the heading error), never spun around it.
export function steerToward(world, targetX, targetY, targetZ, targetSpeed) {
  const plane = world.plane;
  const valley = world.valley;
  const planeAbsX = centreAt(valley, plane.z) + plane.x;
  const targetAbsX = centreAt(valley, targetZ) + targetX;
  const dz = Math.max(60, targetZ - plane.z);
  const desiredHeading = Math.atan2(targetAbsX - planeAbsX, dz);
  let headingError = desiredHeading - plane.heading;
  while (headingError > Math.PI) headingError -= Math.PI * 2;
  while (headingError < -Math.PI) headingError += Math.PI * 2;
  plane.wantBank = clamp(headingError * 2.2, -1, 1);
  // Never fly into a rising floor on the way to the target.
  const clearance = floorAt(valley, plane.z + 300) + 45;
  const targetAlt = Math.max(targetY, clearance);
  plane.wantPitch = clamp((targetAlt - plane.y) / 40, -1, 1);
  plane.wantThrottle = plane.speed < targetSpeed - 3 ? 1 : plane.speed > targetSpeed + 3 ? -1 : 0;
}

// Level the wings and hold the nose on the target for a moment, so the
// frozen frame shows the plane flying straight at the ring, not mid-turn.
function settle(world, seconds) {
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    const plane = world.plane;
    const ring = world.valley.rings[world.nextRing];
    plane.wantBank *= 0.85;
    if (ring) plane.wantPitch = clamp((ring.y - plane.y) / 60, -0.4, 0.4);
    plane.wantThrottle = plane.speed < 57 ? 0.5 : plane.speed > 63 ? -0.5 : 0;
    if (stepWorld(world, STEP) & EVENT_OVER) break;
  }
}

// Fly forward with the autopilot until `until` says stop, or the sortie
// ends. Returns true when the sortie ended early.
function flyUntil(world, until, seconds) {
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    const ring = world.valley.rings[world.nextRing];
    if (ring) steerToward(world, ring.x, ring.y, ring.z, 60);
    else steerToward(world, 0, world.plane.y, world.plane.z + 500, 55);
    if (stepWorld(world, STEP) & EVENT_OVER) return true;
    if (until(world)) return false;
  }
  return false;
}

// Set `world` to the named scene and return the screen to draw over it.
// Each shot flies its own sortie: the landing shot is the Strip Landing
// mission, the others are the Ring Run.
export function stageShot(name, world) {
  const mission = name === 'landing' ? MISSIONS[2] : MISSIONS[0];
  const fresh = createWorld(mission, world.seed);
  Object.assign(world, fresh);

  if (name === 'menu') {
    // A gentle pass down the valley behind the title screen.
    flyUntil(world, () => world.plane.z > 900, 40);
    return 'menu';
  }
  if (name === 'landing') {
    // Final approach: on the centreline, low over the threshold, the strip
    // filling the frame ahead.
    const rw = world.valley.runway;
    flyUntil(world, (w) => w.plane.z > rw.startZ - 600, 200);
    // Hand-fly the last stretch: throttle back, hold the glide, aim at a
    // point just past the threshold.
    for (let i = 0; i < 60 * 16; i += 1) {
      steerToward(world, 0, rw.floor + 16, rw.startZ + 60, 50);
      if (stepWorld(world, STEP) & EVENT_OVER) break;
      if (world.plane.z > rw.startZ - 150) break;
    }
    settle(world, 0.8);
    return 'play';
  }
  if (name === 'rings') {
    // Just after the second ring, the next one already in sight.
    flyUntil(world, (w) => w.ringsHit >= 2 && w.nextRing < w.valley.rings.length, 200);
    flyUntil(world, (w) => {
      const ring = w.valley.rings[w.nextRing];
      return ring ? ring.z - w.plane.z < 500 : true;
    }, 60);
    settle(world, 1);
    return 'play';
  }
  // cover: one ring flown, the next one close ahead, the plane banked into
  // the turn — the whole game in a single frame.
  flyUntil(world, (w) => w.ringsHit >= 1 && w.nextRing < w.valley.rings.length, 200);
  flyUntil(world, (w) => {
    const ring = w.valley.rings[w.nextRing];
    return ring ? ring.z - w.plane.z < 420 : true;
  }, 60);
  settle(world, 1);
  return 'play';
}

export { CONFIG };
