// Kestrel Post — game configuration.
// One clear job: every tunable number, palette and mission in one place.
'use strict';

const KestrelConfig = {
  canvasWidth: 1280,
  canvasHeight: 720,

  // Flight model.
  minSpeed: 55,          // knots, below this the plane stalls
  maxSpeed: 240,         // knots at full throttle, level flight
  cruiseThrottle: 0.62,
  climbRate: 32,         // ft/s at full climb, full speed
  sinkRate: 14,          // ft/s sinking when slow
  turnRate: 0.55,        // rad/s at full bank and full speed
  maxBank: 0.9,          // rad
  maxPitch: 0.52,        // rad
  fuelCapacity: 100,
  fuelBurn: 1.15,        // per second at full throttle
  fuelPerRing: 9,
  ringScore: 100,
  landingBonus: 250,
  timeBonusPerSecond: 2,

  // Takeoff and landing.
  departureStrip: 1500,  // ft of safe ground at the start for the takeoff roll
  landingMaxSpeed: 95,   // knots, touchdown above this breaks the gear
  landingMaxSink: 20,    // ft/s, harder touchdowns in the fields are crashes

  // Camera / projection.
  focal: 620,            // projection focal length in px
  horizonBase: 330,      // horizon line at level flight, px from top
  groundLevel: 0,        // terrain base altitude, ft

  missions: [
    {
      id: 'dawn',
      name: 'Dawn Run',
      subtitle: 'First light over Alder Valley — 8 rings, then land',
      seed: 1101,
      rings: 8,
      ringRadius: 90,
      wind: 0.10,
      startFuel: 100,
      palette: {
        skyTop: '#2e4a7a', skyMid: '#7fa8c9', skyLow: '#f7c98b',
        sun: '#ffd98a', sunGlow: 'rgba(255, 214, 138, 0.55)',
        ridgeFar: '#6d7fa3', ridgeMid: '#4d5f7d', ridgeNear: '#33445c',
        groundA: '#5d7a43', groundB: '#6f8a4a', groundC: '#8a7a4a',
        tree: '#2f4a26', rock: '#5a5148', snow: '#e8eef2',
        hud: '#cfe8ff', hudWarn: '#ffb03a', hudBad: '#ff5a4e'
      }
    },
    {
      id: 'storm',
      name: 'Storm Pass',
      subtitle: 'Gusts through Greytooth Pass — 10 rings, hold your line',
      seed: 2202,
      rings: 10,
      ringRadius: 78,
      wind: 0.55,
      startFuel: 100,
      palette: {
        skyTop: '#232c3d', skyMid: '#4a5a6e', skyLow: '#c98a5a',
        sun: '#f2b06a', sunGlow: 'rgba(242, 176, 106, 0.4)',
        ridgeFar: '#565e70', ridgeMid: '#3c4356', ridgeNear: '#262c3a',
        groundA: '#4a5a3c', groundB: '#5a6a44', groundC: '#6e6242',
        tree: '#24361f', rock: '#4a4238', snow: '#cfd8de',
        hud: '#ffe9c4', hudWarn: '#ffb03a', hudBad: '#ff5a4e'
      }
    },
    {
      id: 'night',
      name: 'Night Mail',
      subtitle: 'Last post under the stars — 8 tight rings, lights on',
      seed: 3303,
      rings: 8,
      ringRadius: 66,
      wind: 0.22,
      startFuel: 100,
      palette: {
        skyTop: '#060a18', skyMid: '#101a33', skyLow: '#2c3a5e',
        sun: '#e8ecff', sunGlow: 'rgba(232, 236, 255, 0.35)',
        ridgeFar: '#1d2742', ridgeMid: '#141c30', ridgeNear: '#0c1220',
        groundA: '#1d2a1a', groundB: '#243320', groundC: '#332f1e',
        tree: '#101c0e', rock: '#232028', snow: '#8a94a8',
        hud: '#bfe3ff', hudWarn: '#ffb03a', hudBad: '#ff5a4e'
      }
    }
  ]
};
