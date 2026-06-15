// ============================================================
// CAMERA — Pan & Zoom viewport, AU <-> Screen coordinate transform
// ============================================================

const Camera = (() => {
  let _x = 0;        // world center in AU (pan offset)
  let _y = 0;
  let _zoom = 100;   // pixels per AU
  let _width  = window.innerWidth;
  let _height = window.innerHeight;
  let _dragging = false;
  let _lastMouseX = 0, _lastMouseY = 0;
  let _onChangeCallback = null;
  let _followTarget = null;  // CelestialBody to follow
  let _canvas = null;
  let disablePan = false;

  function init(canvas, onChangeCb) {
    _canvas = canvas;
    _onChangeCallback = onChangeCb;
    _width  = window.innerWidth;
    _height = window.innerHeight;

    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup',   onMouseUp);
    canvas.addEventListener('wheel',     onWheel, { passive: false });
    canvas.addEventListener('dblclick',  onDblClick);
  }

  function resize(w, h) {
    _width = w;
    _height = h;
  }

  // ── Coordinate transforms ──────────────────────────────────

  /** AU (world) → screen pixels */
  function worldToScreen(wx, wy) {
    return {
      x: (wx - _x) * _zoom + _width  / 2,
      y: (wy - _y) * _zoom + _height / 2,
    };
  }

  /** Screen pixels → AU (world) */
  function screenToWorld(sx, sy) {
    return {
      x: (sx - _width  / 2) / _zoom + _x,
      y: (sy - _height / 2) / _zoom + _y,
    };
  }

  // (getters exposed via return object below)

  // ── Interaction handlers ───────────────────────────────────

  function onMouseDown(e) {
    if (e.button !== 0) return;  // left only
    _dragging   = true;
    _lastMouseX = e.clientX;
    _lastMouseY = e.clientY;
    _followTarget = null;
  }

  function onMouseMove(e) {
    if (!_dragging || Camera.disablePan) return;
    const dx = e.clientX - _lastMouseX;
    const dy = e.clientY - _lastMouseY;
    _x -= dx / _zoom;
    _y -= dy / _zoom;
    _lastMouseX = e.clientX;
    _lastMouseY = e.clientY;
    _onChangeCallback?.();
  }

  function onMouseUp() {
    _dragging = false;
  }

  function onWheel(e) {
    e.preventDefault();
    // Smooth zoom proportional to scroll wheel delta
    const factor = Math.pow(0.998, e.deltaY);
    // Zoom towards mouse position
    const rect   = _canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const worldBefore = screenToWorld(mouseX, mouseY);
    _zoom = Math.max(0.00001, Math.min(50000, _zoom * factor));
    const worldAfter  = screenToWorld(mouseX, mouseY);
    _x -= worldAfter.x - worldBefore.x;
    _y -= worldAfter.y - worldBefore.y;
    _onChangeCallback?.();
  }

  function onDblClick(e) {
    // Find body near click
    const rect = _canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const world = screenToWorld(sx, sy);
    let closest = null, closestDist = Infinity;
    if (window.Simulation) {
      for (const b of window.Simulation.bodies) {
        if (!b.isAlive) continue;
        const d = Math.hypot(b.x - world.x, b.y - world.y);
        if (d < closestDist) {
          closestDist = d;
          closest = b;
        }
      }
      // Only follow if within 50 pixels of the body center
      if (closest && closestDist * _zoom < 80) {
        _followTarget = closest;
      }
    }
  }

  /** Called each frame to update follow */
  function tick() {
    if (_followTarget) {
      if (!_followTarget.isAlive) { _followTarget = null; return; }
      _x = _followTarget.x;
      _y = _followTarget.y;
    }
  }

  function setFollow(body) {
    _followTarget = body;
  }

  function getFollow() { return _followTarget; }

  function centerOn(wx, wy) {
    _x = wx;
    _y = wy;
    _followTarget = null;
  }

  function fitAll(bodies) {
    if (!bodies || bodies.length === 0) return;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const b of bodies) {
      minX = Math.min(minX, b.x);
      maxX = Math.max(maxX, b.x);
      minY = Math.min(minY, b.y);
      maxY = Math.max(maxY, b.y);
    }
    _x = (minX + maxX) / 2;
    _y = (minY + maxY) / 2;
    const spanX = maxX - minX || 1;
    const spanY = maxY - minY || 1;
    const padding = 1.3;
    _zoom = Math.min(_width / (spanX * padding), _height / (spanY * padding));
    _zoom = Math.max(0.00001, Math.min(50000, _zoom));
    _followTarget = null;
    _onChangeCallback?.();
  }

  function setZoom(z) {
    _zoom = Math.max(0.00001, Math.min(50000, z));
  }

  return {
    init, resize, tick,
    worldToScreen, screenToWorld,
    get pixelsPerAU() { return _zoom; },
    get zoom()        { return _zoom; },
    get disablePan()  { return disablePan; },
    set disablePan(v) { disablePan = v; },
    centerOn, fitAll, setFollow, getFollow, setZoom,
  };
})();
