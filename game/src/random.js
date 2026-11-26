// Seeded randomness for Ridge Runner. Every valley, tree line and ring
// layout comes from one seed, so a screenshot staged with ?shot= is the
// same frame every time it is taken, and a sortie can be replayed exactly.

// Mulberry32: small, fast, deterministic, good enough for terrain.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A value-noise helper: smooth pseudo-random hills from a seed, so the
// valley walls and the distant ranges look like terrain, not static.
export function makeNoise1D(seed) {
  const rand = mulberry32(seed);
  const grid = new Float64Array(512);
  for (let i = 0; i < grid.length; i += 1) grid[i] = rand() * 2 - 1;
  const smooth = (x) => {
    const xi = Math.floor(x);
    const xf = x - xi;
    const a = grid[((xi % 512) + 512) % 512];
    const b = grid[(((xi + 1) % 512) + 512) % 512];
    const u = xf * xf * (3 - 2 * xf);
    return a + (b - a) * u;
  };
  return (x) => 0.6 * smooth(x) + 0.3 * smooth(x * 2.7 + 13.1) + 0.1 * smooth(x * 6.3 + 71.7);
}

// Pick `count` distinct integers in [0, n) with the given random source.
export function pickSpread(rand, n, count, minGap) {
  const picked = [];
  let guard = 0;
  while (picked.length < count && guard < 4000) {
    guard += 1;
    const v = Math.floor(rand() * n);
    if (picked.every((p) => Math.abs(p - v) >= minGap)) picked.push(v);
  }
  return picked.sort((a, b) => a - b);
}
