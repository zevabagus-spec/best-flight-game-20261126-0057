// The bush plane itself: throttle, bank, pitch, speed, altitude, fuel and
// damage. The model is deliberately simple — one integrator, no hidden
// forces — so what the player feels on screen is exactly what this file
// computes, and a screenshot staged from a state is a state the game can
// really reach.
import { CONFIG } from './config.js';
import { floorAt, headingAt } from './terrain.js';

export function createPlane(mission, valley) {
  return {
    // Position along the valley ribbon, metres from the start line.
    z: 0,
    // Lateral offset from the ribbon centreline, metres. Positive is right.
    x: 0,
    // Height above sea level; altitude above ground is y - floorAt(z).
    y: valley.segments[0].floor + mission.startAltitude,
    heading: 0, // radians, relative to the valley's start heading
    speed: mission.startSpeed, // m/s
    pitch: 0, // radians, positive is nose up
    bank: 0, // radians, positive is right wing down
    throttle: 0.62, // 0..1, the lever the player works
    fuel: mission.fuel,
    damage: 0,
    verticalSpeed: 0,
    // What the pilot asked for this step; input.js writes these.
    wantBank: 0, // -1..1
    wantPitch: 0, // -1..1, positive is nose up
    wantThrottle: 0, // -1..1, the lever's direction of travel
    engineOn: true,
    landed: false,
    crashed: false,
    // The last thing that happened, for the HUD and the crash report.
    lastEvent: '',
  };
}

// One fixed step of flight. `dt` is seconds. Returns an event string when
// something notable happens this step (ring handled by world.js), else ''.
export function stepPlane(plane, valley, dt) {
  if (plane.crashed || plane.landed) return '';

  // Throttle lever moves at a fixed rate; the engine answers at every speed.
  plane.throttle = clamp(plane.throttle + plane.wantThrottle * CONFIG.throttleRate * dt, 0, 1);

  // Fuel: full throttle drinks, idle sips. An empty tank stops the engine,
  // and the plane becomes a glider with one decision left: where to land.
  const burn = plane.throttle > 0.9
    ? CONFIG.fuelBurnFull
    : plane.throttle < 0.15
      ? CONFIG.fuelBurnIdle
      : CONFIG.fuelBurnCruise * (0.4 + plane.throttle);
  plane.fuel = Math.max(0, plane.fuel - burn * dt);
  if (plane.fuel <= 0 && plane.engineOn) {
    plane.engineOn = false;
    plane.lastEvent = 'FUEL EMPTY — GLIDING';
  }

  // Wings roll toward the commanded bank; the nose follows the bank.
  const targetBank = plane.wantBank * CONFIG.maxBank;
  plane.bank += clamp(targetBank - plane.bank, -CONFIG.bankRate * dt, CONFIG.bankRate * dt);
  plane.heading += Math.sin(plane.bank) * CONFIG.turnRate * dt;

  // The nose follows the stick, but a slow wing cannot hold altitude.
  const targetPitch = plane.wantPitch * CONFIG.maxPitch;
  plane.pitch += clamp(targetPitch - plane.pitch, -CONFIG.pitchRate * dt, CONFIG.pitchRate * dt);

  // Speed: thrust against drag, with a climb tax and a dive bonus. Thrust
  // is sized so full throttle in level flight settles exactly at maxSpeed:
  // the drag at maxSpeed is the thrust at full throttle, so the number in
  // config.js is a real limit, not a clamp the plane leans on.
  const dragAtMax = 0.32 * CONFIG.maxSpeed + 0.0016 * CONFIG.maxSpeed * CONFIG.maxSpeed;
  const thrust = plane.engineOn ? plane.throttle * dragAtMax : 0;
  const drag = 0.32 * plane.speed + 0.0016 * plane.speed * plane.speed;
  const climbTax = Math.sin(plane.pitch) * 26;
  plane.speed += (thrust - drag - climbTax) * dt * 0.9;
  plane.speed = clamp(plane.speed, 0, CONFIG.maxSpeed * 1.12);

  // Vertical speed: pitch and power lift, a stalled wing sinks.
  const stalled = plane.speed < CONFIG.stallSpeed;
  let vs = Math.sin(plane.pitch) * plane.speed;
  vs += plane.engineOn ? (plane.throttle - 0.45) * 4 : -3;
  if (stalled) vs -= (CONFIG.stallSpeed - plane.speed) * 0.55;
  vs = clamp(vs, -CONFIG.maxSink, CONFIG.maxClimb);
  plane.verticalSpeed = vs;
  plane.y += vs * dt;

  // Forward motion follows the heading, relative to the valley ribbon.
  const relHeading = plane.heading - headingAt(valley, plane.z);
  plane.z += Math.cos(relHeading) * plane.speed * dt;
  plane.x += Math.sin(relHeading) * plane.speed * dt;
  // The valley walls push back: drifting wide costs speed, not a wall.
  const over = Math.abs(plane.x) - CONFIG.corridorHalfWidth;
  if (over > 0) {
    plane.x = Math.sign(plane.x) * CONFIG.corridorHalfWidth;
    plane.speed = Math.max(20, plane.speed - over * 0.02 * dt * 60);
  }

  // Ground: touching the valley floor outside the runway is a crash.
  const ground = floorAt(valley, plane.z);
  const agl = plane.y - ground;
  if (agl <= 0.5) {
    plane.y = ground + 0.5;
    return hitGround(plane, ground);
  }
  return '';
}

// The plane met the ground. A gentle touchdown on the runway is a landing;
// everything else is a crash, and the reason is spelled out.
function hitGround(plane, ground) {
  const onRunway = plane.z >= plane.runwayStartZ && plane.z <= plane.runwayEndZ;
  const inStrip = Math.abs(plane.x) <= 13;
  if (onRunway && inStrip && plane.speed <= CONFIG.landingMaxSpeed && plane.verticalSpeed >= -CONFIG.landingMaxSink && Math.abs(plane.bank) < 0.35) {
    plane.landed = true;
    plane.speed = Math.max(0, plane.speed - 18);
    plane.lastEvent = 'TOUCHDOWN — WELCOME HOME';
    return 'landed';
  }
  plane.crashed = true;
  if (!onRunway) plane.lastEvent = 'CRASHED INTO THE RIDGE';
  else if (!inStrip) plane.lastEvent = 'CRASHED BESIDE THE STRIP';
  else if (plane.speed > CONFIG.landingMaxSpeed) plane.lastEvent = 'TOO FAST — THE GEAR FOLDED';
  else if (plane.verticalSpeed < -CONFIG.landingMaxSink) plane.lastEvent = 'TOO HARD — THE AIRFRAME BROKE';
  else plane.lastEvent = 'WINGS NOT LEVEL ON TOUCHDOWN';
  return 'crashed';
}

// Called by world.js once the valley is built, so hitGround can see the strip.
export function bindRunway(plane, valley) {
  plane.runwayStartZ = valley.runway.startZ;
  plane.runwayEndZ = valley.runway.endZ;
}

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

// Readouts the HUD draws, in pilot units.
export function readouts(plane, valley) {
  const agl = Math.max(0, plane.y - floorAt(valley, plane.z));
  return {
    altitudeFt: Math.round(agl * 3.28084),
    speedKts: Math.round(plane.speed * 1.94384),
    headingDeg: Math.round(((plane.heading * 180) / Math.PI % 360 + 360) % 360),
    verticalFpm: Math.round(plane.verticalSpeed * 196.85),
    fuelPct: Math.round((plane.fuel / CONFIG.fuelCapacity) * 100),
    throttlePct: Math.round(plane.throttle * 100),
    damagePct: Math.round(plane.damage),
    stalled: plane.speed < CONFIG.stallSpeed,
  };
}
