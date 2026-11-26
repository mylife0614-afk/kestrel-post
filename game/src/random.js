// Kestrel Post — deterministic random numbers.
// One clear job: a seeded RNG so terrain, rings and gusts are identical
// on every run of the same mission.
'use strict';

function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Random number in [min, max).
function range(rand, min, max) {
  return min + rand() * (max - min);
}

// Random integer in [min, max].
function rangeInt(rand, min, max) {
  return Math.floor(range(rand, min, max + 1));
}

// Pick one element of an array.
function pick(rand, arr) {
  return arr[Math.floor(rand() * arr.length)];
}

// Smooth 1D value noise: a sum of sines with seeded phases, in [-1, 1].
function makeNoise(rand, octaves) {
  const waves = [];
  for (let i = 0; i < octaves; i++) {
    waves.push({
      freq: range(rand, 0.0006, 0.004) * (i + 1),
      amp: 1 / (i + 1),
      phase: range(rand, 0, Math.PI * 2)
    });
  }
  const total = waves.reduce((s, w) => s + w.amp, 0);
  return function noise(x) {
    let v = 0;
    for (const w of waves) {
      v += w.amp * Math.sin(x * w.freq + w.phase);
    }
    return v / total;
  };
}
