// The sortie: rings, the clock, the score and the end of a flight. World
// owns everything that is a mission rule rather than a flight-model fact, so
// physics.js never has to know what a ring is worth.
import { CONFIG } from './config.js';
import { buildValley } from './terrain.js';
import { createPlane, bindRunway, stepPlane } from './physics.js';

export const EVENT_NONE = 0;
export const EVENT_RING = 1;
export const EVENT_LANDED = 2;
export const EVENT_CRASHED = 4;
export const EVENT_OVER = 8;

export function createWorld(mission, seed) {
  const valley = buildValley(seed, mission);
  const plane = createPlane(mission, valley);
  bindRunway(plane, valley);
  return {
    mission,
    seed,
    valley,
    plane,
    time: 0, // seconds since the start line
    score: 0,
    ringsHit: 0,
    ringsMissed: 0,
    nextRing: 0, // index of the ring the pilot is flying to
    over: false,
    outcome: '', // 'landed' | 'crashed' | 'fuel' | 'time' | 'complete'
    message: '',
    messageUntil: 0, // seconds of game time the banner stays up
    best: 0, // best score this session, for the end screen
  };
}

// Restart the same sortie from the start line, same seed, same valley.
export function resetWorld(world) {
  const fresh = createWorld(world.mission, world.seed);
  fresh.best = world.best;
  Object.assign(world, fresh);
}

// One fixed step. Returns a bitmask of EVENT_* for the frame.
export function stepWorld(world, dt) {
  if (world.over) return EVENT_OVER;
  world.time += dt;
  const plane = world.plane;

  const result = stepPlane(plane, world.valley, dt);
  if (result === 'landed') {
    endSortie(world, 'landed', 'TOUCHDOWN — ' + landingGrade(world) + ' LANDING');
    return EVENT_LANDED;
  }
  if (result === 'crashed') {
    endSortie(world, 'crashed', plane.lastEvent);
    return EVENT_CRASHED;
  }

  // The clock: the Dash sortie ends when it runs out, wherever the plane is.
  if (world.mission.timeLimit > 0 && world.time >= world.mission.timeLimit) {
    endSortie(world, 'time', 'OUT OF TIME — THE GATES CLOSE');
    return EVENT_OVER;
  }

  // Out of fuel with the wheels still in the air: the sortie is over when
  // the plane stops, but the glide itself is still flown, not cut short.
  if (!plane.engineOn && plane.speed < 4 && plane.y - world.valley.segments[0].floor < 2) {
    endSortie(world, 'fuel', 'OUT OF FUEL — SHE RAN OUT OF SKY');
    return EVENT_OVER;
  }

  // Rings: the next ring is the only one that counts. Flying through the
  // hole scores; flying past it marks it missed and moves the target on.
  const ring = world.valley.rings[world.nextRing];
  if (ring && !ring.passed && !ring.missed) {
    const dz = plane.z - ring.z;
    if (dz > CONFIG.ringRadius) {
      ring.missed = true;
      world.ringsMissed += 1;
      world.nextRing += 1;
      flash(world, 'RING MISSED');
    } else if (Math.abs(dz) <= CONFIG.ringRadius) {
      const dx = plane.x - ring.x;
      const dy = plane.y - ring.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= CONFIG.ringRadius) {
        ring.passed = true;
        world.ringsHit += 1;
        const centred = dist < CONFIG.ringRadius * 0.45;
        const gained = CONFIG.ringScore + (centred ? CONFIG.ringNearBonus : 0);
        world.score += gained;
        world.nextRing += 1;
        flash(world, centred ? 'RING — DEAD CENTRE +' + gained : 'RING +' + gained);
        return EVENT_RING;
      }
    }
  }

  // All rings flown: the sortie is complete, with a fuel bonus for what is
  // left in the tank — flying economically is worth points. The Strip
  // Landing sortie is the exception: its rings are along the way, and only
  // the landing itself ends it.
  if (world.mission.id !== 'landing' && world.nextRing >= world.valley.rings.length && world.valley.rings.length > 0) {
    const fuelBonus = Math.round(plane.fuel) * 2;
    world.score += fuelBonus;
    endSortie(world, 'complete', 'ALL RINGS — FUEL BONUS +' + fuelBonus);
    return EVENT_OVER;
  }

  // Flying past the end of the valley without landing ends the sortie.
  if (plane.z > world.mission.length + CONFIG.runwayLength + 200) {
    endSortie(world, 'complete', 'VALLEY COMPLETE');
    return EVENT_OVER;
  }
  return EVENT_NONE;
}

function landingGrade(world) {
  const p = world.plane;
  if (p.speed < 40 && p.verticalSpeed > -1.5) return 'GREASED';
  if (p.speed < 50 && p.verticalSpeed > -2.5) return 'SMOOTH';
  return 'FIRM BUT SAFE';
}

function endSortie(world, outcome, message) {
  world.over = true;
  world.outcome = outcome;
  world.message = message;
  world.messageUntil = world.time + 4;
  if (outcome === 'landed') world.score += 250 + Math.round(world.plane.fuel) * 2;
  if (world.score > world.best) world.best = world.score;
}

function flash(world, message) {
  world.message = message;
  world.messageUntil = world.time + 2.2;
}

// The next ring, for the HUD arrow and the distance readout.
export function nextRing(world) {
  return world.valley.rings[world.nextRing] ?? null;
}

// Seconds left on the Dash clock, or null when the sortie has no clock.
export function timeLeft(world) {
  if (world.mission.timeLimit <= 0) return null;
  return Math.max(0, world.mission.timeLimit - world.time);
}
