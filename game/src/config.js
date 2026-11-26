// Ridge Runner — tuning constants. One place for every number the flight
// model, the missions and the renderer share, so a balance change is a
// one-line edit here, never a hunt through the sim.
export const CONFIG = {
  // World: the valley is a ribbon of segments; each segment is this long.
  segmentLength: 20, // metres
  drawDistance: 46, // segments rendered ahead of the camera
  corridorHalfWidth: 260, // metres, half the flyable valley width
  groundBase: 0, // sea level of the valley floor, metres

  // Aircraft performance (a light bush plane, not a jet).
  maxSpeed: 95, // m/s at full throttle, level flight
  cruiseSpeed: 62, // m/s where the engine is happiest
  stallSpeed: 26, // m/s; below this the wing stops flying
  maxClimb: 9, // m/s vertical at full power
  maxSink: 14, // m/s vertical, power off, nose down
  bankRate: 1.9, // rad/s the wings roll toward the commanded bank
  maxBank: 1.05, // rad, about 60 degrees
  turnRate: 0.55, // rad/s of heading change at full bank
  pitchRate: 0.85, // rad/s the nose moves toward the commanded pitch
  maxPitch: 0.5, // rad, about 29 degrees up or down
  throttleRate: 0.55, // per second the throttle lever travels

  // Fuel and damage: the decisions in a sortie.
  fuelCapacity: 100, // units; a full tank
  fuelBurnCruise: 0.55, // units/s at cruise throttle
  fuelBurnFull: 1.5, // units/s at full throttle
  fuelBurnIdle: 0.12, // units/s at idle
  damagePerScrape: 34, // hitting a ridge or a ring post costs this much
  maxDamage: 100, // at this the airframe gives up

  // Landing: the strip forgives a gentle touchdown, nothing else.
  landingMaxSpeed: 58, // m/s; faster and the gear folds
  landingMaxSink: 3.2, // m/s down; harder and the airframe breaks
  landingZoneStart: 40, // metres into the runway where the zone opens
  landingZoneEnd: 320, // metres into the runway where it closes
  runwayLength: 420, // metres of paved strip
  runwayWidth: 26, // metres

  // Rings: the gates a sortie is scored on.
  ringRadius: 16, // metres, the hole the plane must pass through
  ringScore: 100, // points per ring flown cleanly
  ringNearBonus: 25, // extra points for passing near the ring centre

  // Rendering.
  cameraHeight: 6, // metres above the plane the chase camera sits
  cameraDepth: 0.84, // projection constant (1 / tan(fov / 2) flavour)
  horizonFraction: 0.42, // fraction of the screen height the horizon sits at
  planeScreenY: 0.72, // fraction of the screen height the plane sits at
  fogStart: 26, // segments out, where haze begins to swallow the valley
};

// The three sorties on the menu. Each is a different goal over the same
// valley, so the flying — not the scenery — is what changes.
export const MISSIONS = [
  {
    id: 'rings',
    key: '1',
    name: 'RING RUN',
    tagline: 'Thread 8 rings down the valley before the tank runs dry.',
    rings: 8,
    length: 6000, // metres of valley before the sortie ends
    fuel: 100,
    timeLimit: 0, // no clock, only fuel
    scorePerRing: 100,
    startAltitude: 90,
    startSpeed: 55,
  },
  {
    id: 'dash',
    key: '2',
    name: 'CANYON DASH',
    tagline: 'Ten gates, 150 seconds. Bank hard and the wing bleeds speed.',
    rings: 10,
    length: 7000,
    fuel: 100,
    timeLimit: 150, // seconds on the clock
    scorePerRing: 100,
    startAltitude: 80,
    startSpeed: 70,
  },
  {
    id: 'landing',
    key: '3',
    name: 'STRIP LANDING',
    tagline: 'Fly the valley, then put her down gentle on the strip.',
    rings: 4,
    length: 5200,
    fuel: 70,
    timeLimit: 0,
    scorePerRing: 100,
    startAltitude: 110,
    startSpeed: 60,
  },
];

// Keyboard map, kept in one place so the menu can print it truthfully.
export const KEYS = {
  throttleUp: ['KeyW', 'ArrowUp'],
  throttleDown: ['KeyS', 'ArrowDown'],
  bankLeft: ['KeyA', 'ArrowLeft'],
  bankRight: ['KeyD', 'ArrowRight'],
  pitchUp: ['KeyI'],
  pitchDown: ['KeyK'],
  pause: ['KeyP', 'Escape'],
  restart: ['KeyR'],
  mute: ['KeyM'],
  confirm: ['Enter', 'Space'],
};
