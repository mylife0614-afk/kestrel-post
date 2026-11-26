// Kestrel Post — game loop and states.
// One clear job: own the menu / flying / paused / ended states, run the
// loop, and wire input, physics, audio and rendering together.
'use strict';

(function () {
  const canvas = document.getElementById('game');
  const renderer = new Renderer(canvas);
  const input = new Input(canvas);
  const audio = new AudioEngine();

  let missionIndex = 0;
  let mission = KestrelConfig.missions[0];
  let world = new World(mission);
  let plane = new Plane(world, mission);
  let state = 'menu'; // menu | flying | paused | landed | crashed
  let best = 0;
  try {
    best = Number(window.localStorage.getItem('kestrel-post-best') || 0) || 0;
  } catch (e) { best = 0; }

  function saveBest() {
    if (plane.score > best) {
      best = plane.score;
      try { window.localStorage.setItem('kestrel-post-best', String(best)); } catch (e) { /* optional */ }
    }
  }

  function startMission(i) {
    missionIndex = i;
    mission = KestrelConfig.missions[i];
    world = new World(mission);
    plane = new Plane(world, mission);
    input.resetMouse();
    plane.status = 'flying';
    plane.throttle = 0.55;
    plane.speed = 40;
    state = 'flying';
    audio.ensure();
    audio.click();
    plane.say(mission.name + ' — fly through every ring, then land', 3);
  }

  function toMenu() {
    mission = KestrelConfig.missions[missionIndex];
    world = new World(mission);
    plane = new Plane(world, mission);
    state = 'menu';
  }

  let last = performance.now();

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    if (state === 'menu') {
      if (input.wasPressed('1')) { missionIndex = 0; toMenu(); audio.ensure(); audio.click(); }
      if (input.wasPressed('2')) { missionIndex = 1; toMenu(); audio.ensure(); audio.click(); }
      if (input.wasPressed('3')) { missionIndex = 2; toMenu(); audio.ensure(); audio.click(); }
      if (input.wasPressed('Enter', ' ', 'MouseClick')) startMission(missionIndex);
      renderer.drawMenu({ plane, world, mission, audio }, missionIndex);
    } else if (state === 'flying') {
      if (input.wasPressed('p', 'P', 'Escape')) {
        state = 'paused';
      } else {
        plane.update(dt, input, audio);
        audio.update(plane.throttle, plane.speed / KestrelConfig.maxSpeed, true);
        if (plane.status === 'landed' || plane.status === 'crashed') {
          state = plane.status;
          saveBest();
          if (plane.status === 'landed') audio.fanfare(); else audio.crash();
        }
        renderer.draw({ plane, world, mission, audio });
      }
    } else if (state === 'paused') {
      renderer.draw({ plane, world, mission, audio });
      const ctx = renderer.ctx;
      ctx.save();
      ctx.fillStyle = 'rgba(6, 10, 20, 0.55)';
      ctx.fillRect(0, 0, renderer.W, renderer.H);
      ctx.fillStyle = '#ffe9b0';
      ctx.font = 'bold 44px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PAUSED', renderer.W / 2, renderer.H / 2);
      ctx.font = '18px system-ui, sans-serif';
      ctx.fillStyle = '#cfe8ff';
      ctx.fillText('P to resume  ·  R to restart  ·  M for missions', renderer.W / 2, renderer.H / 2 + 44);
      ctx.restore();
      if (input.wasPressed('p', 'P', 'Escape', 'Enter')) state = 'flying';
      if (input.wasPressed('r', 'R')) startMission(missionIndex);
      if (input.wasPressed('m', 'M')) toMenu();
    } else {
      // landed | crashed
      renderer.draw({ plane, world, mission, audio });
      renderer.drawEnd({ plane, world, mission, audio }, state === 'landed');
      if (input.wasPressed('r', 'R', 'Enter', ' ')) startMission(missionIndex);
      if (input.wasPressed('m', 'M')) toMenu();
    }

    if (input.wasPressed('m', 'M') && state === 'flying') {
      audio.setMuted(!audio.muted);
    }
    input.endFrame();
    requestAnimationFrame(frame);
  }

  // Screenshot scenes (?scene=start|flight|ring|landing&mission=dawn|storm|night).
  // Used only to take the entry's screenshots; the game plays normally.
  function applyScene() {
    const params = new URLSearchParams(window.location.search);
    const scene = params.get('scene');
    const mName = params.get('mission');
    if (mName) {
      const idx = KestrelConfig.missions.findIndex((m) => m.id === mName);
      if (idx >= 0) missionIndex = idx;
    }
    if (!scene || scene === 'start') return;
    mission = KestrelConfig.missions[missionIndex];
    world = new World(mission);
    plane = new Plane(world, mission);
    plane.status = 'flying';
    state = 'flying';
    if (scene === 'flight') {
      const ring = world.rings[2];
      world.rings[0].passed = true;
      world.rings[1].passed = true;
      plane.dist = ring.dist - 1800;
      plane.lateral = ring.lateral * 0.5;
      plane.alt = ring.alt + 120;
      plane.heading = Math.atan2(ring.lateral - plane.lateral, 1800);
      plane.speed = 175;
      plane.throttle = 0.72;
      plane.fuel = 82;
      plane.say('Ring 3 ahead — hold your line', 3);
    } else if (scene === 'ring') {
      const ring = world.rings[1];
      world.rings[0].passed = true;
      plane.dist = ring.dist - 1000;
      plane.lateral = ring.lateral;
      plane.alt = ring.alt;
      plane.heading = 0;
      plane.speed = 190;
      plane.throttle = 0.8;
      plane.fuel = 88;
    } else if (scene === 'landing') {
      const rw = world.runway;
      for (const r of world.rings) r.passed = true;
      plane.dist = rw.dist - 1500;
      plane.lateral = rw.lateral;
      plane.alt = world.terrainAlt(plane.dist, plane.lateral) + 120;
      plane.heading = 0;
      plane.speed = 85;
      plane.throttle = 0.38;
      plane.fuel = 41;
      plane.say('Runway ahead — slow down and line up', 3);
    }
  }

  applyScene();
  window.__kestrel = {
    get state() { return state; },
    get plane() { return plane; },
    get world() { return world; },
    get mission() { return mission; },
    startMission,
    toMenu
  };
  requestAnimationFrame(frame);
})();
