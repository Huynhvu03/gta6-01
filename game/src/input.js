// Keyboard and mouse state. The game polls this every frame; keys are tracked
// by KeyboardEvent.code so layout does not matter, and the mouse reports its
// position in canvas pixels plus a click edge the game consumes once.

export function createInput(canvas) {
  const keys = new Set();
  const mouse = { x: 0, y: 0, down: false, clicked: false };

  function onKeyDown(e) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
    keys.add(e.code);
  }
  function onKeyUp(e) {
    keys.delete(e.code);
  }
  function onMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  }
  function onMouseDown(e) {
    if (e.button === 0) {
      mouse.down = true;
      mouse.clicked = true;
      onMouseMove(e);
    }
  }
  function onMouseUp(e) {
    if (e.button === 0) mouse.down = false;
  }
  function onBlur() {
    keys.clear();
    mouse.down = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);

  return {
    keys,
    mouse,
    down(...codes) {
      return codes.some((c) => keys.has(c));
    },
    // True once for the frame the key was pressed; the caller clears it.
    pressed(code) {
      if (keys.has(code)) {
        keys.delete(code);
        return true;
      }
      return false;
    },
    consumeClick() {
      const c = mouse.clicked;
      mouse.clicked = false;
      return c;
    },
  };
}
