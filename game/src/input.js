// Kestrel Post — keyboard and mouse input.
// One clear job: turn keys and the pointer into one steering intent.
'use strict';

class Input {
  constructor(canvas) {
    this.keys = Object.create(null);
    this.mouseX = 0.5;      // 0..1 across the canvas
    this.mouseY = 0.5;      // 0..1 down the canvas
    this.mouseActive = false;
    this.wheelDelta = 0;
    this.pressed = Object.create(null); // edge-triggered keys, consumed by the game
    this.canvas = canvas;

    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
      if (!this.keys[e.key]) this.pressed[e.key] = true;
      this.keys[e.key] = true;
      this.mouseActive = false;
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.key] = false;
    });
    canvas.addEventListener('mousemove', (e) => {
      const r = canvas.getBoundingClientRect();
      this.mouseX = (e.clientX - r.left) / r.width;
      this.mouseY = (e.clientY - r.top) / r.height;
      this.mouseActive = true;
    });
    canvas.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.pressed['MouseClick'] = true;
      this.mouseActive = true;
    });
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.wheelDelta += e.deltaY;
    }, { passive: false });
    window.addEventListener('blur', () => {
      this.keys = Object.create(null);
    });
  }

  // Centre the mouse intent so a pointer left at the top of the screen
  // does not pitch the plane up hard when a new mission starts.
  resetMouse() {
    this.mouseX = 0.5;
    this.mouseY = 0.5;
  }

  down(...names) {
    return names.some((n) => !!this.keys[n]);
  }

  // True once, on the frame the key went down; clears after read.
  wasPressed(...names) {
    for (const n of names) {
      if (this.pressed[n]) {
        this.pressed[n] = false;
        return true;
      }
    }
    return false;
  }

  // Steering intent in [-1, 1] for bank (x) and pitch (y), from keys or mouse.
  steer() {
    let bank = 0;
    let pitch = 0;
    if (this.down('ArrowLeft', 'a', 'A')) bank -= 1;
    if (this.down('ArrowRight', 'd', 'D')) bank += 1;
    if (this.down('ArrowUp', 'w', 'W')) pitch += 1;    // nose up = climb
    if (this.down('ArrowDown', 's', 'S')) pitch -= 1;   // nose down = descend
    if (this.mouseActive && bank === 0 && pitch === 0) {
      bank = (this.mouseX - 0.5) * 2.4;
      pitch = (0.5 - this.mouseY) * 2.0;
      bank = Math.max(-1, Math.min(1, bank));
      pitch = Math.max(-1, Math.min(1, pitch));
    }
    return { bank, pitch };
  }

  // Throttle delta for this frame: keys, Shift/Ctrl, or mouse wheel.
  throttleDelta() {
    let d = 0;
    if (this.down('Shift')) d += 0.9;
    if (this.down('Control')) d -= 0.9;
    if (this.down('+', '=')) d += 0.9;
    if (this.down('-', '_')) d -= 0.9;
    if (this.wheelDelta !== 0) {
      d += -this.wheelDelta * 0.0012;
      this.wheelDelta = 0;
    }
    return d;
  }

  endFrame() {
    this.pressed = Object.create(null);
  }
}
