// Keyboard + mouse input for Merapi Ring Run.
// Arrow keys / WASD: pitch and roll. W/S or Shift/Ctrl: throttle.
// Mouse: moving the pointer steers (pointer position relative to centre).
// Enter/Space: start / restart. P: pause. M: mute.
export function createInput(canvas) {
  const keys = new Set();
  // Latched presses: a quick tap (e.g. Enter from a test driver) must not
  // be lost between frames, so keydowns are latched until consumed.
  const latched = new Set();
  const mouse = { x: 0, y: 0, active: false };

  function onKeyDown(e) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
    keys.add(e.key.toLowerCase());
    latched.add(e.key.toLowerCase());
  }
  function onKeyUp(e) {
    keys.delete(e.key.toLowerCase());
  }
  function onMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - rect.left) / rect.width - 0.5;
    mouse.y = (e.clientY - rect.top) / rect.height - 0.5;
    mouse.active = true;
  }
  function onMouseLeave() {
    mouse.active = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mouseleave', onMouseLeave);

  function pressed(key) {
    return keys.has(key);
  }

  return {
    // Flight input for this frame; mouse steers only while no arrow keys
    // are held, so keyboard always wins when both are used.
    flight() {
      let pitch = 0;
      let roll = 0;
      if (pressed('arrowup') || pressed('w')) pitch += 1;
      if (pressed('arrowdown') || pressed('s')) pitch -= 1;
      if (pressed('arrowleft') || pressed('a')) roll -= 1;
      if (pressed('arrowright') || pressed('d')) roll += 1;
      if (pitch === 0 && roll === 0 && mouse.active) {
        pitch = Math.max(-1, Math.min(1, -mouse.y * 2.2));
        roll = Math.max(-1, Math.min(1, mouse.x * 2.2));
      }
      let throttle = null;
      if (pressed('shift')) throttle = 1;
      else if (pressed('control')) throttle = 0.25;
      return { pitch, roll, throttle };
    },
    startPressed() {
      return latched.has('enter') || latched.has(' ');
    },
    pausePressed() {
      return latched.has('p');
    },
    mutePressed() {
      return latched.has('m');
    },
    consume(key) {
      keys.delete(key);
      latched.delete(key);
    },
    destroy() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseleave', onMouseLeave);
    },
  };
}
