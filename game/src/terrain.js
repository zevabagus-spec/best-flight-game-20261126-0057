// The valley Ridge Runner flies through. One seeded generator lays out the
// whole ribbon — its bends, its floor height, its tree lines, its river and
// the runway — before the first frame, so the world never changes under the
// plane and the same seed always builds the same valley.
import { CONFIG } from './config.js';
import { makeNoise1D, mulberry32, pickSpread } from './random.js';

// A valley segment: one slice of the ribbon, `segmentLength` metres long.
export function buildValley(seed, mission) {
  const totalSegments = Math.ceil(mission.length / CONFIG.segmentLength) + 60;
  const rand = mulberry32(seed);
  const bend = makeNoise1D(seed + 101);
  const lift = makeNoise1D(seed + 202);
  const rough = makeNoise1D(seed + 303);

  const segments = [];
  let heading = 0; // accumulated bend of the valley, radians
  let height = 0; // valley floor height, metres
  for (let i = 0; i < totalSegments; i += 1) {
    const curve = bend(i * 0.045) * 0.028; // gentle, flyable bends
    heading += curve;
    // The floor rises and falls slowly; the plane must watch the ground.
    height += lift(i * 0.03) * 1.15 + 0.12;
    if (i > 4) height = Math.max(-30, Math.min(120, height));
    segments.push({
      index: i,
      z: i * CONFIG.segmentLength,
      curve,
      heading,
      floor: height,
      // Side walls: ridges that climb away from the ribbon.
      leftWall: 55 + Math.max(0, rough(i * 0.05 + 7)) * 130 + 40,
      rightWall: 55 + Math.max(0, rough(i * 0.05 + 91)) * 130 + 40,
      // A grass band alternates every few segments so speed reads on screen.
      band: Math.floor(i / 3) % 2 === 0 ? 0 : 1,
    });
  }

  // Trees: seeded clumps on both walls, kept out of the flyable ribbon.
  const trees = [];
  for (let i = 8; i < totalSegments - 4; i += 1) {
    if (rand() < 0.42) {
      const side = rand() < 0.5 ? -1 : 1;
      trees.push({
        z: i * CONFIG.segmentLength + rand() * CONFIG.segmentLength,
        x: side * (CONFIG.corridorHalfWidth * (0.55 + rand() * 0.9)),
        size: 9 + rand() * 14,
        hue: rand(),
      });
    }
  }

  // The river: a bright ribbon that meanders across the valley floor.
  const river = makeNoise1D(seed + 404);
  const riverPoints = [];
  for (let i = 0; i < totalSegments; i += 6) {
    riverPoints.push({ z: i * CONFIG.segmentLength, x: river(i * 0.02) * 120 });
  }

  // Rings: spread along the sortie, never closer than 400 m apart, each one
  // hanging at a height the plane can reach without scraping the floor.
  const ringSpots = pickSpread(rand, Math.floor(mission.length / CONFIG.segmentLength) - 30, mission.rings, 20);
  const rings = ringSpots.map((spot, n) => {
    const seg = segments[spot];
    return {
      id: n,
      z: spot * CONFIG.segmentLength,
      x: (rand() * 2 - 1) * 130,
      y: seg.floor + 55 + rand() * 70,
      passed: false,
      missed: false,
    };
  });

  // The runway: a flat paved strip at the end of the valley, aligned with
  // the valley's own heading there so the final is a straight one.
  const stripAt = Math.floor(mission.length / CONFIG.segmentLength);
  const stripSeg = segments[Math.min(stripAt, segments.length - 1)];
  const runway = {
    startZ: stripAt * CONFIG.segmentLength,
    endZ: stripAt * CONFIG.segmentLength + CONFIG.runwayLength,
    heading: stripSeg.heading,
    floor: stripSeg.floor,
    width: CONFIG.runwayWidth,
  };

  return { seed, mission, segments, trees, riverPoints, rings, runway, totalSegments };
}

// Height of the valley floor at a distance along the ribbon.
export function floorAt(valley, z) {
  const i = Math.max(0, Math.min(valley.segments.length - 1, Math.floor(z / CONFIG.segmentLength)));
  return valley.segments[i].floor;
}

// Heading of the valley ribbon at a distance along it.
export function headingAt(valley, z) {
  const i = Math.max(0, Math.min(valley.segments.length - 1, Math.floor(z / CONFIG.segmentLength)));
  return valley.segments[i].heading;
}

// Lateral position of the ribbon centreline at a distance along it: the
// bends accumulate, so the centre wanders from the straight line.
export function centreAt(valley, z) {
  const seg = Math.max(0, Math.min(valley.segments.length - 1, Math.floor(z / CONFIG.segmentLength)));
  let x = 0;
  let h = 0;
  for (let i = 0; i <= seg; i += 1) {
    h += valley.segments[i].curve;
    x += Math.sin(h) * CONFIG.segmentLength;
  }
  return x;
}
