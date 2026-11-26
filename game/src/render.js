// Kestrel Post — everything the player sees.
// One clear job: draw the sky, ridges, ground, rings, runway, the plane
// and the HUD on one canvas, in chase view behind the aircraft.
'use strict';

class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.W = KestrelConfig.canvasWidth;
    this.H = KestrelConfig.canvasHeight;
    canvas.width = this.W;
    canvas.height = this.H;
    this.time = 0;
    this.clouds = [];
    const r = mulberry32(99);
    for (let i = 0; i < 14; i++) {
      this.clouds.push({ x: r(), y: 0.05 + r() * 0.3, s: 0.5 + r() * 1.4, v: 0.004 + r() * 0.01 });
    }
  }

  project(plane, horizonY, focal, fwd, lateral, alt) {
    const f = Math.max(60, fwd);
    return {
      x: this.W / 2 + (lateral / f) * focal,
      y: horizonY - (alt / f) * focal,
      s: focal / f
    };
  }

  // The plane sits just below the horizon line, so a ring at the plane's
  // altitude appears centred on it — what you see is what the ring test
  // measures. (The menu keeps the old lower position so the plane shows
  // under the mission cards.)
  draw(state, opts = {}) {
    const { plane, world, mission, audio } = state;
    const ctx = this.ctx;
    const pal = mission.palette;
    const cfg = KestrelConfig;
    const cx = this.W / 2;
    this.time += 1 / 60;

    const horizonY = cfg.horizonBase + plane.pitch * 300;
    const bankRoll = plane.bank * 0.45;

    // ---- Sky (rotates with bank) ----
    ctx.save();
    ctx.translate(cx, horizonY);
    ctx.rotate(-bankRoll);
    ctx.translate(-cx, -horizonY);
    const sky = ctx.createLinearGradient(0, -400, 0, horizonY + 40);
    sky.addColorStop(0, pal.skyTop);
    sky.addColorStop(0.62, pal.skyMid);
    sky.addColorStop(1, pal.skyLow);
    ctx.fillStyle = sky;
    ctx.fillRect(-500, -500, this.W + 1000, horizonY + 540);

    // Sun / moon with glow.
    const sunX = this.W * 0.78 - plane.heading * 260;
    const sunY = 110 - plane.pitch * 120;
    const glow = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 150);
    glow.addColorStop(0, pal.sunGlow);
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(sunX - 160, sunY - 160, 320, 320);
    ctx.fillStyle = pal.sun;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 30, 0, Math.PI * 2);
    ctx.fill();

    // Clouds, drifting with heading.
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    for (const c of this.clouds) {
      const clx = ((c.x - plane.heading * 0.12 - this.time * c.v * 0.02) % 1.2 + 1.2) % 1.2 - 0.1;
      const clY = c.y * horizonY;
      const s = c.s * 60;
      ctx.beginPath();
      ctx.ellipse(clx * this.W, clY, s, s * 0.32, 0, 0, Math.PI * 2);
      ctx.ellipse(clx * this.W + s * 0.6, clY + 6, s * 0.7, s * 0.26, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Mountain ridges, three parallax layers.
    const layers = [
      { h: 150, color: pal.ridgeFar, par: 0.10, layer: 0 },
      { h: 210, color: pal.ridgeMid, par: 0.22, layer: 1 },
      { h: 290, color: pal.ridgeNear, par: 0.45, layer: 2 }
    ];
    for (const L of layers) {
      ctx.fillStyle = L.color;
      ctx.beginPath();
      ctx.moveTo(-40, horizonY + 2);
      for (let x = -40; x <= this.W + 40; x += 16) {
        const wx = x * 3.2 + plane.heading * 900 * L.par + plane.dist * 0.12 * L.par;
        const peak = world.ridgeHeight(L.layer, wx);
        ctx.lineTo(x, horizonY + 2 - peak * L.h);
      }
      ctx.lineTo(this.W + 40, horizonY + 2);
      ctx.closePath();
      ctx.fill();
      // Snow caps on the near ridge.
      if (L.layer === 2) {
        ctx.fillStyle = pal.snow;
        ctx.beginPath();
        for (let x = -40; x <= this.W + 40; x += 16) {
          const wx = x * 3.2 + plane.heading * 900 * L.par + plane.dist * 0.12 * L.par;
          const peak = world.ridgeHeight(L.layer, wx);
          if (peak > 0.86) {
            const y = horizonY + 2 - peak * L.h;
            ctx.moveTo(x - 8, y + 14);
            ctx.lineTo(x, y - 2);
            ctx.lineTo(x + 8, y + 14);
            ctx.closePath();
          }
        }
        ctx.fill();
      }
    }

    // ---- Ground: perspective strips below the horizon ----
    // Paint the base colour first: when the plane sits on the ground the
    // valley undulation can invert a strip, and the gaps must read as
    // ground, never as empty canvas.
    ctx.fillStyle = pal.groundA;
    ctx.fillRect(-40, horizonY, this.W + 80, this.H - horizonY + 40);
    const groundY = (f) => {
      const g = world.terrainAlt(plane.dist + f, plane.lateral);
      const rel = g - plane.alt;
      return horizonY - (rel / Math.max(60, f)) * cfg.focal;
    };
    const strips = [70, 110, 170, 260, 400, 620, 950, 1450, 2200, 3400, 5200, 8000];
    const fieldCols = [pal.groundA, pal.groundB, pal.groundC];
    for (let i = strips.length - 1; i >= 0; i--) {
      const fNear = strips[i];
      const fFar = i + 1 < strips.length ? strips[i + 1] : strips[i] * 1.6;
      const yNear = groundY(fNear);
      const yFar = groundY(fFar);
      if (yFar >= this.H + 40) continue;
      ctx.fillStyle = fieldCols[i % 3];
      ctx.globalAlpha = i < 2 ? 1 : 0.92;
      ctx.fillRect(-40, Math.min(yFar, this.H), this.W + 80, Math.max(2, yNear - yFar));
      ctx.globalAlpha = 1;
      // Field boundary lines converging on the horizon.
      ctx.strokeStyle = 'rgba(0,0,0,0.18)';
      ctx.lineWidth = 1;
      for (const lat of [-1200, -600, 600, 1200]) {
        const pN = this.project(plane, horizonY, cfg.focal, fNear, lat - plane.lateral, -plane.alt);
        const pF = this.project(plane, horizonY, cfg.focal, fFar, lat - plane.lateral, -plane.alt);
        ctx.beginPath();
        ctx.moveTo(pN.x, Math.min(yNear, this.H));
        ctx.lineTo(pF.x, Math.min(yFar, this.H));
        ctx.stroke();
      }
    }

    // Ground features: trees, houses, rocks — drawn at the terrain height
    // where they stand, so they sit on the ground instead of under it.
    for (const feat of world.features) {
      const f = feat.dist - plane.dist;
      if (f < 120 || f > 4200) continue;
      const featAlt = world.terrainAlt(feat.dist, feat.lateral) - plane.alt;
      const p = this.project(plane, horizonY, cfg.focal, f, feat.lateral - plane.lateral, featAlt);
      if (p.x < -60 || p.x > this.W + 60 || p.y > this.H + 20) continue;
      const s = Math.max(2, 1500 / f * feat.size);
      if (feat.kind === 'tree') {
        ctx.fillStyle = pal.tree;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - s * 1.6);
        ctx.lineTo(p.x - s * 0.55, p.y);
        ctx.lineTo(p.x + s * 0.55, p.y);
        ctx.closePath();
        ctx.fill();
      } else if (feat.kind === 'rock') {
        ctx.fillStyle = pal.rock;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y - s * 0.4, s * 0.7, s * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#7a5a3a';
        ctx.fillRect(p.x - s * 0.5, p.y - s * 0.7, s, s * 0.7);
        ctx.fillStyle = '#a33d2e';
        ctx.beginPath();
        ctx.moveTo(p.x - s * 0.62, p.y - s * 0.7);
        ctx.lineTo(p.x, p.y - s * 1.25);
        ctx.lineTo(p.x + s * 0.62, p.y - s * 0.7);
        ctx.closePath();
        ctx.fill();
      }
    }

    // ---- Runway, drawn at the terrain height of its own ground ----
    const rw = world.runway;
    const rwAlt = world.terrainAlt(rw.dist, rw.lateral) - plane.alt;
    const rwRel = rw.dist - plane.dist;
    if (rwRel > -900 && rwRel < 9000) {
      const rwLen = 900;
      const rwHalf = 70;
      const corners = [
        this.project(plane, horizonY, cfg.focal, rwRel, rw.lateral - rwHalf - plane.lateral, rwAlt),
        this.project(plane, horizonY, cfg.focal, rwRel, rw.lateral + rwHalf - plane.lateral, rwAlt),
        this.project(plane, horizonY, cfg.focal, rwRel + rwLen, rw.lateral + rwHalf - plane.lateral, rwAlt),
        this.project(plane, horizonY, cfg.focal, rwRel + rwLen, rw.lateral - rwHalf - plane.lateral, rwAlt)
      ];
      ctx.fillStyle = '#3a3a40';
      ctx.beginPath();
      ctx.moveTo(corners[0].x, corners[0].y);
      for (const c of corners.slice(1)) ctx.lineTo(c.x, c.y);
      ctx.closePath();
      ctx.fill();
      // Centreline dashes.
      ctx.strokeStyle = '#e8e8e8';
      ctx.lineWidth = Math.max(1.5, corners[0].s * 2);
      for (let d = 60; d < rwLen; d += 150) {
        const a = this.project(plane, horizonY, cfg.focal, rwRel + d, rw.lateral - plane.lateral, rwAlt);
        const b = this.project(plane, horizonY, cfg.focal, rwRel + d + 70, rw.lateral - plane.lateral, rwAlt);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      // Edge lights.
      for (let d = 0; d <= rwLen; d += 150) {
        for (const side of [-1, 1]) {
          const p = this.project(plane, horizonY, cfg.focal, rwRel + d, rw.lateral + side * rwHalf - plane.lateral, rwAlt);
          ctx.fillStyle = '#7dff9a';
          ctx.beginPath();
          ctx.arc(p.x, p.y, Math.max(1.5, p.s * 1.6), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // Threshold bars at the near end.
      ctx.fillStyle = '#ffffff';
      for (const off of [-48, -16, 16, 48]) {
        const p = this.project(plane, horizonY, cfg.focal, rwRel + 24, rw.lateral + off - plane.lateral, rwAlt);
        ctx.fillRect(p.x - Math.max(2, p.s * 6), p.y - Math.max(1, p.s), Math.max(4, p.s * 12), Math.max(2, p.s * 2));
      }
    }

    // ---- Rings ----
    for (const ring of world.rings) {
      const f = ring.dist - plane.dist;
      if (f < 40 || f > 9000 || ring.passed) continue;
      const p = this.project(plane, horizonY, cfg.focal, f, ring.lateral - plane.lateral, ring.alt - plane.alt);
      const rx = ring.radius * p.s;
      if (p.x < -rx * 2 || p.x > this.W + rx * 2 || p.y < -rx || p.y > this.H + rx) continue;
      const pulse = 0.75 + 0.25 * Math.sin(this.time * 4 + ring.index);
      ctx.save();
      ctx.shadowColor = '#ffb03a';
      ctx.shadowBlur = 26 * pulse;
      ctx.strokeStyle = '#ffc95e';
      ctx.lineWidth = Math.max(3, rx * 0.10);
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, rx, rx * 0.92, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#fff3d0';
      ctx.lineWidth = Math.max(1.5, rx * 0.03);
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, rx * 0.88, rx * 0.80, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255, 201, 94, 0.10)';
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, rx * 0.88, rx * 0.80, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      if (f < 2600) {
        ctx.fillStyle = '#ffe9b0';
        ctx.font = 'bold 15px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('RING ' + (ring.index + 1), p.x, p.y - rx - 12);
      }
    }
    ctx.restore(); // un-rotate the world

    // ---- The plane (chase view, banking with roll) ----
    const planeY = horizonY + (opts.planeYOffset ?? 34);
    ctx.save();
    ctx.translate(cx, planeY);
    ctx.rotate(plane.bank * 0.85);
    const propSpin = this.time * (6 + plane.throttle * 42);
    // Propeller disc, kept faint so it reads as motion, not a shape.
    ctx.fillStyle = 'rgba(220, 230, 240, 0.12)';
    ctx.beginPath();
    ctx.ellipse(0, -30, 8 + plane.throttle * 6, 36, propSpin % Math.PI, 0, Math.PI * 2);
    ctx.fill();
    // Wings.
    const wingGrad = ctx.createLinearGradient(-150, 0, 150, 0);
    wingGrad.addColorStop(0, '#c8352c');
    wingGrad.addColorStop(0.5, '#e8e4da');
    wingGrad.addColorStop(1, '#c8352c');
    ctx.fillStyle = wingGrad;
    ctx.beginPath();
    ctx.moveTo(-152, 6);
    ctx.quadraticCurveTo(-120, -16, -30, -8);
    ctx.lineTo(30, -8);
    ctx.quadraticCurveTo(120, -16, 152, 6);
    ctx.quadraticCurveTo(120, 16, 30, 12);
    ctx.lineTo(-30, 12);
    ctx.quadraticCurveTo(-120, 16, -152, 6);
    ctx.closePath();
    ctx.fill();
    // Fuselage.
    const bodyGrad = ctx.createLinearGradient(0, -52, 0, 22);
    bodyGrad.addColorStop(0, '#f2efe6');
    bodyGrad.addColorStop(0.55, '#d8d2c2');
    bodyGrad.addColorStop(1, '#8a8371');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.moveTo(0, -56);
    ctx.quadraticCurveTo(16, -40, 15, -6);
    ctx.quadraticCurveTo(14, 14, 0, 18);
    ctx.quadraticCurveTo(-14, 14, -15, -6);
    ctx.quadraticCurveTo(-16, -40, 0, -56);
    ctx.closePath();
    ctx.fill();
    // Cockpit windows, lit.
    ctx.fillStyle = '#9fd8ff';
    ctx.beginPath();
    ctx.ellipse(0, -34, 8, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.beginPath();
    ctx.ellipse(-3, -38, 3, 5, -0.4, 0, Math.PI * 2);
    ctx.fill();
    // Tail fin.
    ctx.fillStyle = '#c8352c';
    ctx.beginPath();
    ctx.moveTo(-9, 12);
    ctx.lineTo(-13, 34);
    ctx.lineTo(-3, 30);
    ctx.lineTo(0, 18);
    ctx.lineTo(3, 30);
    ctx.lineTo(13, 34);
    ctx.lineTo(9, 12);
    ctx.closePath();
    ctx.fill();
    // Registration stripe.
    ctx.fillStyle = '#2c4a6e';
    ctx.fillRect(-14, -8, 28, 5);
    // Nav lights: red left, green right, white strobe.
    ctx.fillStyle = '#ff3b30';
    ctx.beginPath(); ctx.arc(-152, 6, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#35e065';
    ctx.beginPath(); ctx.arc(152, 6, 4, 0, Math.PI * 2); ctx.fill();
    if (Math.sin(this.time * 6) > 0.4) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(0, 36, 3.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    // ---- HUD ----
    this.drawHUD(state, horizonY);
  }

  drawHUD(state, horizonY) {
    const { plane, world, mission } = state;
    const ctx = this.ctx;
    const pal = mission.palette;
    const cfg = KestrelConfig;
    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    const panel = (x, y, w, h) => {
      ctx.fillStyle = 'rgba(8, 14, 26, 0.55)';
      ctx.strokeStyle = 'rgba(207, 232, 255, 0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 8);
      ctx.fill();
      ctx.stroke();
    };

    // Airspeed, top left.
    panel(18, 16, 150, 64);
    ctx.fillStyle = pal.hud;
    ctx.font = 'bold 30px system-ui, sans-serif';
    ctx.fillText(String(Math.round(plane.speed)), 32, 50);
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(207,232,255,0.75)';
    ctx.fillText('KNOTS', 96, 50);
    ctx.fillText('AIRSPEED', 32, 70);

    // Heading compass, top centre.
    panel(this.W / 2 - 150, 16, 300, 64);
    const hdg = ((plane.heading * 180 / Math.PI) % 360 + 360) % 360;
    ctx.fillStyle = pal.hud;
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(Math.round(hdg)).padStart(3, '0') + '°', this.W / 2, 48);
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(207,232,255,0.75)';
    ctx.fillText('HEADING', this.W / 2, 70);
    // Compass ticks.
    ctx.strokeStyle = 'rgba(207,232,255,0.6)';
    for (let d = -60; d <= 60; d += 15) {
      const a = hdg + d;
      const x = this.W / 2 + d * 1.9;
      const len = a % 45 === 0 ? 10 : 5;
      ctx.beginPath();
      ctx.moveTo(x, 22);
      ctx.lineTo(x, 22 + len);
      ctx.stroke();
    }
    ctx.fillStyle = '#ffc95e';
    ctx.beginPath();
    ctx.moveTo(this.W / 2 - 6, 16);
    ctx.lineTo(this.W / 2 + 6, 16);
    ctx.lineTo(this.W / 2, 26);
    ctx.closePath();
    ctx.fill();
    ctx.textAlign = 'left';

    // Altitude, top right.
    panel(this.W - 168, 16, 150, 64);
    ctx.fillStyle = pal.hud;
    ctx.font = 'bold 30px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(String(Math.round(plane.alt)), this.W - 62, 50);
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(207,232,255,0.75)';
    ctx.fillText('FEET', this.W - 32, 50);
    ctx.fillText('ALTITUDE', this.W - 32, 70);
    ctx.textAlign = 'left';

    // Throttle + fuel, bottom left.
    panel(18, this.H - 96, 210, 80);
    ctx.fillStyle = 'rgba(207,232,255,0.75)';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText('THROTTLE', 32, this.H - 72);
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.fillRect(32, this.H - 62, 182, 10);
    ctx.fillStyle = plane.throttle > 0.85 ? '#ffb03a' : '#7fd0ff';
    ctx.fillRect(32, this.H - 62, 182 * plane.throttle, 10);
    ctx.fillStyle = 'rgba(207,232,255,0.75)';
    ctx.fillText('FUEL', 32, this.H - 34);
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.fillRect(32, this.H - 26, 182, 10);
    ctx.fillStyle = plane.fuel < 25 ? pal.hudBad : '#7dff9a';
    ctx.fillRect(32, this.H - 26, 182 * Math.max(0, plane.fuel / 100), 10);
    ctx.fillStyle = pal.hud;
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillText(Math.round(plane.fuel) + '%', 182, this.H - 34);

    // Score + rings, bottom right.
    panel(this.W - 228, this.H - 96, 210, 80);
    ctx.fillStyle = 'rgba(207,232,255,0.75)';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText('SCORE', this.W - 214, this.H - 72);
    ctx.fillStyle = pal.hud;
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.fillText(String(plane.score), this.W - 214, this.H - 44);
    ctx.fillStyle = 'rgba(207,232,255,0.75)';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText('RINGS  ' + plane.ringsHit + ' / ' + world.mission.rings, this.W - 214, this.H - 26);

    // Mission name, bottom centre.
    ctx.fillStyle = 'rgba(207,232,255,0.85)';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(mission.name.toUpperCase() + '  ·  ' + Math.round(plane.dist / 1000) + 'k FT FLOWN', this.W / 2, this.H - 24);
    ctx.textAlign = 'left';

    // Message line.
    if (plane.messageTimer > 0 && plane.message) {
      ctx.fillStyle = '#ffe9b0';
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(plane.message, this.W / 2, 108);
      ctx.textAlign = 'left';
    }

    // Warnings.
    const warns = [];
    const ground = world.terrainAlt(plane.dist, plane.lateral);
    if (plane.status === 'flying' && plane.alt - ground < 160 && plane.alt > ground + 2) warns.push('TERRAIN');
    if (plane.stalled) warns.push('STALL');
    if (plane.fuel < 25) warns.push('LOW FUEL');
    if (warns.length && Math.sin(this.time * 8) > -0.2) {
      ctx.fillStyle = pal.hudBad;
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚠ ' + warns.join('  ·  '), this.W / 2, 142);
      ctx.textAlign = 'left';
    }
    ctx.restore();
  }

  drawMenu(state, selected) {
    const { plane, world, mission } = state;
    this.draw({ ...state, plane: { ...plane, status: 'ready', pitch: 0, bank: 0, throttle: 0.3, speed: 0, fuel: 100, score: 0, ringsHit: 0, message: '', messageTimer: 0 } }, { planeYOffset: 148 });
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(6, 10, 20, 0.45)';
    ctx.fillRect(0, 0, this.W, this.H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffe9b0';
    ctx.font = 'bold 64px system-ui, sans-serif';
    ctx.fillText('KESTREL POST', this.W / 2, 150);
    ctx.fillStyle = '#cfe8ff';
    ctx.font = '22px system-ui, sans-serif';
    ctx.fillText('Alpine courier runs — fly the rings, mind the fuel, land the mail.', this.W / 2, 192);
    const missions = KestrelConfig.missions;
    missions.forEach((m, i) => {
      const y = 268 + i * 74;
      const sel = i === selected;
      ctx.fillStyle = sel ? 'rgba(255, 201, 94, 0.22)' : 'rgba(8, 14, 26, 0.55)';
      ctx.strokeStyle = sel ? '#ffc95e' : 'rgba(207,232,255,0.35)';
      ctx.lineWidth = sel ? 2 : 1;
      ctx.beginPath();
      ctx.roundRect(this.W / 2 - 300, y - 30, 600, 58, 10);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = sel ? '#ffe9b0' : '#cfe8ff';
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.fillText((i + 1) + '.  ' + m.name, this.W / 2, y - 6);
      ctx.fillStyle = 'rgba(207,232,255,0.8)';
      ctx.font = '14px system-ui, sans-serif';
      ctx.fillText(m.subtitle, this.W / 2, y + 16);
    });
    ctx.fillStyle = '#cfe8ff';
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillText('Arrows or mouse — steer  ·  Shift / Ctrl or wheel — throttle  ·  Space — airbrake', this.W / 2, 530);
    ctx.fillText('Press 1–3 to pick a mission, Enter or click to fly.  P pauses, M mutes.', this.W / 2, 558);
    ctx.fillStyle = '#ffe9b0';
    ctx.font = 'bold 18px system-ui, sans-serif';
    const blink = Math.sin(this.time * 3) > -0.3;
    if (blink) ctx.fillText('— PRESS ENTER TO FLY —', this.W / 2, 606);
    ctx.restore();
  }

  drawEnd(state, won) {
    const { plane, world, mission } = state;
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(6, 10, 20, 0.55)';
    ctx.fillRect(0, 0, this.W, this.H);
    ctx.textAlign = 'center';
    ctx.fillStyle = won ? '#7dff9a' : '#ff5a4e';
    ctx.font = 'bold 52px system-ui, sans-serif';
    ctx.fillText(won ? 'DELIVERED!' : 'CRASHED', this.W / 2, 220);
    ctx.fillStyle = '#e8f2ff';
    ctx.font = '20px system-ui, sans-serif';
    ctx.fillText(plane.crashReason, this.W / 2, 264);
    ctx.fillStyle = '#ffe9b0';
    ctx.font = 'bold 30px system-ui, sans-serif';
    ctx.fillText('SCORE  ' + plane.score, this.W / 2, 330);
    ctx.fillStyle = '#cfe8ff';
    ctx.font = '17px system-ui, sans-serif';
    ctx.fillText('Rings ' + plane.ringsHit + ' / ' + world.mission.rings +
      '   ·   Time ' + Math.round(plane.elapsed) + 's   ·   Fuel left ' + Math.round(plane.fuel) + '%', this.W / 2, 372);
    ctx.fillText('R — fly again    ·    M — back to missions', this.W / 2, 430);
    ctx.restore();
  }
}
