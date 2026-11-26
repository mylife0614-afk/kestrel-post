// Kestrel Post — synthesised sound, no audio assets.
// One clear job: engine drone, ring chime, warnings and crash, all made
// with the Web Audio API. Silent until the player first interacts.
'use strict';

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.engineOsc = null;
    this.engineGain = null;
    this.engineFilter = null;
    this.windGain = null;
    this.started = false;
  }

  // Call from a user gesture; safe to call repeatedly.
  ensure() {
    if (this.started) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.started = true;
      // Engine: two detuned saws through a low-pass filter.
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 55;
      const osc2 = this.ctx.createOscillator();
      osc2.type = 'sawtooth';
      osc2.frequency.value = 55 * 1.005;
      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.value = 320;
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0;
      this.engineOsc.connect(this.engineFilter);
      osc2.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.ctx.destination);
      this.engineOsc.start();
      osc2.start();
      this.engineOsc2 = osc2;
      // Wind: looped noise buffer through a band-pass.
      const len = this.ctx.sampleRate * 2;
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      const noise = this.ctx.createBufferSource();
      noise.buffer = buf;
      noise.loop = true;
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 500;
      bp.Q.value = 0.6;
      this.windGain = this.ctx.createGain();
      this.windGain.gain.value = 0;
      noise.connect(bp);
      bp.connect(this.windGain);
      this.windGain.connect(this.ctx.destination);
      noise.start();
    } catch (e) {
      this.started = false;
    }
  }

  setMuted(m) {
    this.muted = m;
    if (this.ctx) this.ctx.suspend && (m ? this.ctx.suspend() : this.ctx.resume());
  }

  // Continuous engine + wind levels, called every frame.
  update(throttle, speed01, flying) {
    if (this.ctx && this.ctx.state === 'suspended' && !this.muted) this.ctx.resume();
    if (!this.ctx || this.muted || !flying) {
      if (this.engineGain) this.engineGain.gain.value = 0;
      if (this.windGain) this.windGain.gain.value = 0;
      return;
    }
    const t = this.ctx.currentTime;
    const freq = 48 + throttle * 70 + speed01 * 25;
    this.engineOsc.frequency.setTargetAtTime(freq, t, 0.08);
    this.engineOsc2.frequency.setTargetAtTime(freq * 1.005, t, 0.08);
    this.engineFilter.frequency.setTargetAtTime(240 + throttle * 900, t, 0.1);
    this.engineGain.gain.setTargetAtTime(0.05 + throttle * 0.06, t, 0.1);
    this.windGain.gain.setTargetAtTime(speed01 * speed01 * 0.05, t, 0.15);
  }

  blip(freq, dur, type, vol) {
    if (!this.ctx || this.muted) return;
    try {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type || 'sine';
      o.frequency.value = freq;
      g.gain.setValueAtTime(vol || 0.12, this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + dur);
      o.connect(g);
      g.connect(this.ctx.destination);
      o.start();
      o.stop(this.ctx.currentTime + dur);
    } catch (e) { /* sound is optional */ }
  }

  ringChime() {
    this.blip(880, 0.35, 'sine', 0.16);
    setTimeout(() => this.blip(1318, 0.4, 'sine', 0.12), 90);
  }

  warnBeep() {
    this.blip(440, 0.12, 'square', 0.06);
  }

  click() {
    this.blip(660, 0.06, 'triangle', 0.08);
  }

  crash() {
    this.blip(70, 0.6, 'sawtooth', 0.22);
    this.blip(45, 0.8, 'square', 0.14);
  }

  fanfare() {
    const notes = [523, 659, 784, 1046];
    notes.forEach((n, i) => setTimeout(() => this.blip(n, 0.35, 'triangle', 0.12), i * 130));
  }
}
