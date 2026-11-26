// Kestrel Post — flight physics.
// One clear job: move the plane one step: throttle, pitch, bank, fuel,
// rings, terrain and the runway. No drawing here.
'use strict';

class Plane {
  constructor(world, mission) {
    this.world = world;
    this.cfg = KestrelConfig;
    this.reset(mission);
  }

  reset(mission) {
    this.dist = 0;                 // ft along the course
    this.lateral = 0;              // ft across the course
    this.alt = 60;                 // ft above ground, on the runway
    this.heading = 0;              // rad, 0 = straight down the course
    this.speed = 0;                // knots
    this.throttle = 0;
    this.pitch = 0;                // rad, + = nose up
    this.bank = 0;                 // rad, + = right
    this.fuel = mission.startFuel;
    this.score = 0;
    this.status = 'ready';         // ready | flying | landed | crashed
    this.crashReason = '';
    this.message = '';
    this.messageTimer = 0;
    this.elapsed = 0;
    this.ringsHit = 0;
    this.groundSpeed = 0;
    this.stalled = false;
    this.lowFuelWarned = false;
    this.onGround = true;
    this.prevClearance = 0;  // ft above ground on the previous frame
    this.vspeed = 0;         // ft/s, + = climbing
  }

  say(text, seconds) {
    this.message = text;
    this.messageTimer = seconds || 2.5;
  }

  update(dt, input, audio) {
    if (this.status !== 'flying') return;
    const cfg = this.cfg;
    const mission = this.world.mission;
    this.elapsed += dt;
    if (this.messageTimer > 0) this.messageTimer -= dt;

    // Throttle.
    const td = input.throttleDelta();
    this.throttle = Math.max(0, Math.min(1, this.throttle + td * dt));

    // Steering intent.
    const steer = input.steer();
    const targetBank = steer.bank * cfg.maxBank;
    const targetPitch = steer.pitch * cfg.maxPitch;
    const agility = 0.35 + 0.65 * Math.min(1, this.speed / 120);
    this.bank += (targetBank - this.bank) * Math.min(1, 3.2 * agility * dt);
    this.pitch += (targetPitch - this.pitch) * Math.min(1, 2.6 * agility * dt);

    // Airbrake.
    const brake = input.down(' ') ? 0.45 : 0;

    // Speed: throttle pushes it up, drag and climb pull it down.
    const targetSpeed = cfg.minSpeed + this.throttle * (cfg.maxSpeed - cfg.minSpeed);
    let accel = (targetSpeed - this.speed) * 0.22;
    accel -= Math.max(0, this.pitch) * 55;             // climbing bleeds speed
    accel += Math.max(0, -this.pitch) * 35;            // diving gains speed
    accel -= brake * 60;
    this.speed = Math.max(0, this.speed + accel * dt);
    this.stalled = this.speed < cfg.minSpeed + 12 && this.alt > 120;

    // Heading follows bank, more at higher speed.
    const turnAuthority = Math.min(1, this.speed / 110);
    this.heading += this.bank * cfg.turnRate * turnAuthority * dt;

    // Wind pushes the plane sideways.
    const wind = this.world.windAt(this.dist);
    this.lateral += wind * dt;

    // Position.
    const speedFps = this.speed * 1.68781; // knots to ft/s
    this.dist += Math.cos(this.heading) * speedFps * dt;
    this.lateral += Math.sin(this.heading) * speedFps * dt;
    this.groundSpeed = speedFps;

    // Altitude: pitch climbs when fast, sinks when stalled or slow.
    let climb = Math.sin(this.pitch) * cfg.climbRate * Math.min(1, this.speed / 90);
    if (this.stalled) climb -= cfg.sinkRate * 0.7;
    if (this.speed < 40) climb -= cfg.sinkRate;
    this.vspeed = climb * 3.2;
    this.alt += climb * dt * 3.2;
    if (this.alt < 0) this.alt = 0;

    // Fuel.
    this.fuel -= cfg.fuelBurn * (0.25 + this.throttle) * dt;
    if (this.fuel < 25 && !this.lowFuelWarned) {
      this.lowFuelWarned = true;
      this.say('LOW FUEL — fly through a ring to refuel', 3);
      if (audio) audio.warnBeep();
    }
    if (this.fuel <= 0) {
      this.fuel = 0;
      this.throttle = 0;
      if (this.alt <= 2) {
        this.land(false, 'Out of fuel — forced landing short of the runway');
        return;
      }
    }

    // Rings.
    const ring = this.world.nextRing();
    if (ring && this.dist > ring.dist - 90 && this.dist < ring.dist + 90 && !ring.passed) {
      const dx = this.lateral - ring.lateral;
      const dy = this.alt - ring.alt;
      const r = ring.radius;
      if (Math.abs(dx) < r && Math.abs(dy) < r) {
        ring.passed = true;
        ring.hit = true;
        this.ringsHit++;
        this.score += cfg.ringScore;
        this.fuel = Math.min(cfg.fuelCapacity, this.fuel + cfg.fuelPerRing);
        this.say('RING! +' + cfg.ringScore + '  ·  fuel +' + cfg.fuelPerRing, 1.6);
        if (audio) audio.ringChime();
      } else if (this.dist > ring.dist + 60) {
        ring.passed = true;
        this.say('Missed a ring', 1.4);
      }
    }
    if (ring && this.dist > ring.dist + 60 && !ring.passed) {
      ring.passed = true;
      this.say('Missed a ring', 1.4);
    }

    // Terrain: the departure strip is safe ground for the takeoff roll,
    // and the runway approach is judged by the landing code below — only
    // a genuine impact (airborne, fast or sinking hard) is a crash. A
    // soft touchdown in the fields is a forced landing, not a wreck.
    const ground = this.world.terrainAlt(this.dist, this.lateral);
    const clearance = this.alt - ground;
    const rwNear = this.world.runway;
    const onRunwayApproach = this.dist > rwNear.dist - 500 && this.dist < rwNear.dist + 900;
    if (clearance <= 0) {
      if (this.dist < cfg.departureStrip || onRunwayApproach) {
        this.alt = ground;
        this.onGround = true;
      } else if (this.prevClearance > 25 && (this.speed > 80 || this.vspeed < -cfg.landingMaxSink)) {
        this.crash('Terrain strike — the valley floor came up too fast');
        return;
      } else {
        this.alt = ground;
        this.onGround = true;
        // Rolling on the ground off-runway: rough stop.
        this.speed = Math.max(0, this.speed - 90 * dt);
        if (this.speed < 4) {
          this.land(false, 'Landed off the runway — the mail is late');
          return;
        }
      }
    } else {
      this.onGround = false;
    }
    this.prevClearance = clearance;

    // Runway landing: judged on actually being on the ground in the
    // strip, so a touchdown that the terrain snap has already caught
    // counts — the plane does not have to thread a 6 ft window.
    const rw = this.world.runway;
    if (this.dist > rw.dist - 500 && this.dist < rw.dist + 900) {
      const latErr = Math.abs(this.lateral - rw.lateral);
      const headErr = Math.abs(this.heading);
      if (this.onGround && this.speed < cfg.landingMaxSpeed && latErr < 130 && headErr < 0.22) {
        this.alt = ground;
        // Brakes plus drag: the rollout must always win over the engine,
        // even if the pilot forgets to cut the throttle.
        this.speed = Math.max(0, this.speed - 90 * dt);
        if (this.speed < 8) {
          const bonus = cfg.landingBonus + Math.round(this.fuel) * 2;
          this.score += bonus;
          this.land(true, 'Delivered! Landing bonus +' + bonus);
          return;
        }
      } else if (this.onGround && this.speed >= cfg.landingMaxSpeed) {
        this.crash('Too fast for the runway — the landing gear gave way');
        return;
      } else if (this.onGround && latErr >= 130) {
        this.crash('Ran off the runway into the field');
        return;
      }
    }

    // Flew past the runway.
    if (this.dist > rw.dist + 1400) {
      this.crash('Overshot the runway — out of valley');
    }
  }

  land(ok, reason) {
    this.status = 'landed';
    this.crashReason = reason;
    this.score += Math.max(0, Math.round(600 - this.elapsed) * this.cfg.timeBonusPerSecond);
  }

  crash(reason) {
    this.status = 'crashed';
    this.crashReason = reason;
  }
}
