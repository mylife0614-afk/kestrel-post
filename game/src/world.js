// Kestrel Post — the valley: terrain, rings, runway and wind.
// One clear job: build a mission's course from its seed and answer
// "how high is the ground here" and "where is the next ring".
'use strict';

class World {
  constructor(mission) {
    this.mission = mission;
    this.rand = mulberry32(mission.seed);
    // Ridge profiles: three noise fields, one per visual layer.
    this.noiseFar = makeNoise(this.rand, 3);
    this.noiseMid = makeNoise(this.rand, 4);
    this.noiseNear = makeNoise(this.rand, 4);
    // Valley floor: gentle undulation along the course.
    this.noiseFloor = makeNoise(this.rand, 2);
    // Course: rings spaced along the route, then the runway.
    this.ringSpacing = 2600; // ft between rings
    this.rings = [];
    let lateral = 0;
    let alt = 900;
    for (let i = 0; i < mission.rings; i++) {
      lateral = Math.max(-900, Math.min(900, lateral + range(this.rand, -650, 650)));
      alt = Math.max(450, Math.min(1350, alt + range(this.rand, -180, 180)));
      const ringDist = 3200 + i * this.ringSpacing;
      // Never bury a ring: the valley sides rise, so keep every ring
      // comfortably above the ground beneath it.
      alt = Math.max(alt, this.terrainAlt(ringDist, lateral) + 160);
      this.rings.push({
        index: i,
        dist: ringDist,
        lateral,
        alt,
        radius: mission.ringRadius,
        passed: false,
        hit: false
      });
    }
    this.runwayDist = 3200 + mission.rings * this.ringSpacing + 1400;
    this.runway = { dist: this.runwayDist, lateral: this.rings[this.rings.length - 1].lateral * 0.4, heading: 0 };
    this.courseLength = this.runwayDist + 2600;
    // Wind gusts: a slow noise field over distance.
    this.noiseWind = makeNoise(this.rand, 2);
    // Scattered ground features, keyed by distance slice.
    this.features = [];
    for (let d = 800; d < this.courseLength; d += 420) {
      const n = rangeInt(this.rand, 0, 3);
      for (let i = 0; i < n; i++) {
        this.features.push({
          dist: d + range(this.rand, -160, 160),
          lateral: range(this.rand, -1600, 1600),
          kind: pick(this.rand, ['tree', 'tree', 'tree', 'house', 'barn', 'rock']),
          size: range(this.rand, 0.7, 1.4)
        });
      }
    }
  }

  // Terrain altitude (ft) at a course distance and lateral offset.
  // The valley floor rises towards the edges: flying wide means mountains.
  terrainAlt(dist, lateral) {
    const edge = Math.min(1, Math.abs(lateral) / 1500);
    const ridge = 260 + 620 * edge * edge;
    const bumps = this.noiseFloor(dist * 0.9 + lateral * 0.35) * 170;
    const wall = Math.max(0, (Math.abs(lateral) - 1150) / 350) * 900;
    return 40 + ridge * (0.55 + 0.45 * Math.abs(bumps) / 170) + bumps * 0.4 + wall;
  }

  // Ridge silhouette height (0..1) for a screen layer at a heading offset.
  ridgeHeight(layer, x) {
    const n = layer === 0 ? this.noiseFar : layer === 1 ? this.noiseMid : this.noiseNear;
    return 0.5 + 0.5 * n(x);
  }

  // Wind push (ft/s lateral) at a course distance; stronger in storm.
  windAt(dist) {
    return this.noiseWind(dist * 0.7) * 26 * this.mission.wind;
  }

  nextRing() {
    return this.rings.find((r) => !r.passed) || null;
  }

  ringsRemaining() {
    return this.rings.filter((r) => !r.passed).length;
  }

  ringsHit() {
    return this.rings.filter((r) => r.hit).length;
  }
}
