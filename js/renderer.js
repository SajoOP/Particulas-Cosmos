// ============================================================
// RENDERER — PixiJS WebGL rendering
// ============================================================

const Renderer = (() => {
  let _app        = null;
  let _stage      = null;
  let _starLayer  = null;   // static star background
  let _gridLayer  = null;   // dynamic coordinate grid
  let _trailLayer = null;   // orbit trails (Graphics)
  let _bodyLayer  = null;   // body circles
  let _labelLayer = null;   // text labels
  let _uiLayer    = null;   // selection ring, velocity vectors
  let _slingshotLayer = null; // slingshot launch line (Graphics)

  let _slingshotStart = null;
  let _slingshotEnd   = null;

  // Per-body graphics objects keyed by body ID
  const _bodyGfx  = new Map();  // id -> { circle, label, glowFilter }
  const _trailGfx = new Map();  // id -> PIXI.Graphics

  let _showTrails  = true;
  let _showLabels  = true;
  let _showVectors = false;
  let _selectedId  = null;

  // ── Init ──────────────────────────────────────────────────

  function init(canvasEl) {
    _app = new PIXI.Application({
      view: canvasEl,
      width:  window.innerWidth,
      height: window.innerHeight,
      backgroundColor: 0x020408,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      antialias: true,
    });

    _stage      = _app.stage;
    _starLayer  = new PIXI.Container();
    _gridLayer  = new PIXI.Container();
    _trailLayer = new PIXI.Container();
    _bodyLayer  = new PIXI.Container();
    _labelLayer = new PIXI.Container();
    _uiLayer    = new PIXI.Container();
    _slingshotLayer = new PIXI.Graphics();

    _stage.addChild(_starLayer);
    _stage.addChild(_gridLayer);
    _stage.addChild(_trailLayer);
    _stage.addChild(_bodyLayer);
    _stage.addChild(_labelLayer);
    _stage.addChild(_uiLayer);
    _stage.addChild(_slingshotLayer);

    Particles.init(_stage);

    _generateStarField();
    _app.ticker.stop(); // We drive the loop manually

    return _app;
  }

  // ── Star field background ─────────────────────────────────

  function _generateStarField() {
    const g = new PIXI.Graphics();
    const W = window.innerWidth, H = window.innerHeight;
    const count = 800;
    for (let i = 0; i < count; i++) {
      const x = Math.random() * W * 2 - W * 0.5;
      const y = Math.random() * H * 2 - H * 0.5;
      const r = Math.random();
      const size   = r < 0.7 ? 0.5 : r < 0.93 ? 1 : 1.5;
      const alpha  = 0.3 + Math.random() * 0.7;
      const bright = Math.random();
      let color;
      if (bright > 0.85) color = 0xCCDDFF;
      else if (bright > 0.6) color = 0xFFFFFF;
      else color = 0xAABBCC;
      g.beginFill(color, alpha);
      g.drawCircle(x, y, size);
      g.endFill();
    }
    _starLayer.addChild(g);
  }

  // ── Body graphics management ──────────────────────────────

  function _createBodyGfx(body) {
    const circle = new PIXI.Graphics();
    // Initial draw (will be re-drawn every frame anyway)
    _drawBodyCircle(circle, body, body.getVisualRadius(Camera.zoom));

    // Glow filter for stars and black holes
    let glowFilter = null;
    if (body.hasGlow) {
      try {
        // pixi-filters 5.x: available as PIXI.filters.GlowFilter
        const GlowFilter = (PIXI.filters && PIXI.filters.GlowFilter)
          || (window.PixiFilters && window.PixiFilters.GlowFilter);
        if (GlowFilter) {
          glowFilter = new GlowFilter({
            distance: 22,
            outerStrength: 2.5,
            innerStrength: 0.3,
            color: body.color,
            quality: 0.25,
          });
          circle.filters = [glowFilter];
        }
      } catch (e) {
        console.warn('GlowFilter unavailable:', e.message);
      }
    }

    // Label
    const label = new PIXI.Text(body.name, {
      fontFamily: 'Inter, sans-serif',
      fontSize: 11,
      fill: 0xCCDDFF,
      alpha: 0.85,
      resolution: 2,
    });
    label.anchor.set(0, 0.5);

    _bodyLayer.addChild(circle);
    _labelLayer.addChild(label);

    const trail = new PIXI.Graphics();
    _trailLayer.addChild(trail);

    _bodyGfx.set(body.id, { circle, label, glowFilter });
    _trailGfx.set(body.id, trail);
  }

  function _drawBodyCircle(g, body, r) {
    g.clear();
    const color = body.color;

    if (body.type === 'BLACK_HOLE') {
      // Event horizon ring
      g.beginFill(0x000000, 1);
      g.drawCircle(0, 0, r);
      g.endFill();
      g.lineStyle(2, 0xAA44FF, 0.9);
      g.drawCircle(0, 0, r * 1.3);
    } else if (body.type === 'STAR' || body.type === 'NEUTRON_STAR') {
      // Outer glow halo
      g.beginFill(color, 0.4);
      g.drawCircle(0, 0, r * 1.3);
      g.endFill();
      // Main body
      g.beginFill(color, 0.95);
      g.drawCircle(0, 0, r);
      g.endFill();
      // Bright white core
      g.beginFill(0xFFFFFF, 0.9);
      g.drawCircle(0, 0, r * 0.3);
      g.endFill();
    } else {
      g.beginFill(color, 0.95);
      g.drawCircle(0, 0, r);
      g.endFill();
      // Subtle highlight
      g.beginFill(0xFFFFFF, 0.15);
      g.drawEllipse(-r * 0.25, -r * 0.3, r * 0.5, r * 0.35);
      g.endFill();
    }
  }

  function _removeBodyGfx(id) {
    const gfx = _bodyGfx.get(id);
    if (gfx) {
      _bodyLayer.removeChild(gfx.circle);
      _labelLayer.removeChild(gfx.label);
      gfx.circle.destroy();
      gfx.label.destroy();
      _bodyGfx.delete(id);
    }
    const trail = _trailGfx.get(id);
    if (trail) {
      _trailLayer.removeChild(trail);
      trail.destroy();
      _trailGfx.delete(id);
    }
  }

  // ── Main render frame ─────────────────────────────────────

  function render(bodies, dtReal) {
    _drawGrid();
    _drawSlingshot();

    // Sync graphics objects
    const liveIds = new Set(bodies.map(b => b.id));
    // Remove stale
    for (const id of _bodyGfx.keys()) {
      if (!liveIds.has(id)) _removeBodyGfx(id);
    }
    // Create new
    for (const body of bodies) {
      if (!_bodyGfx.has(body.id)) _createBodyGfx(body);
    }

    // Draw each body
    for (const body of bodies) {
      const gfx = _bodyGfx.get(body.id);
      if (!gfx) continue;
      const { circle, label, glowFilter } = gfx;
      const screen = Camera.worldToScreen(body.x, body.y);
      const currentRadius = body.getVisualRadius(Camera.zoom);

      // Body circle
      _drawBodyCircle(circle, body, currentRadius);
      circle.x = screen.x;
      circle.y = screen.y;
      circle.alpha = body.isMerging ? 0 : 1;

      // Update glow color
      if (glowFilter) {
        glowFilter.color = body.color;
      }

      // Selection ring
      if (body.selected) {
        circle.lineStyle(2, 0x88CCFF, 0.9);
        circle.drawCircle(0, 0, currentRadius + 5);
      }

      // Label
      const showLabel = _showLabels;
      label.visible = showLabel;
      if (showLabel) {
        label.text = body.name;
        label.x = screen.x + currentRadius + 4;
        label.y = screen.y;
        label.style.fontSize = 11;
        label.alpha = body.isMerging ? 0 : 0.85;
      }

      // Trail
      _drawTrail(body, _trailGfx.get(body.id));
    }

    // Clear velocity vector overlay each frame
    while (_uiLayer.children.length > 0) {
      const child = _uiLayer.removeChildAt(0);
      child.destroy();
    }

    if (_showVectors) {
      for (const body of bodies) {
        if (body.isMerging) continue;
        const screen = Camera.worldToScreen(body.x, body.y);
        const scale = 2e9; // tuning factor
        const vxScreen = body.vx * Camera.pixelsPerAU * scale * 3e-9;
        const vyScreen = body.vy * Camera.pixelsPerAU * scale * 3e-9;
        const len = Math.sqrt(vxScreen * vxScreen + vyScreen * vyScreen);
        if (len < 3) continue;
        const vg = new PIXI.Graphics();
        vg.lineStyle(1.5, 0x44FF88, 0.7);
        vg.moveTo(screen.x, screen.y);
        vg.lineTo(screen.x + vxScreen, screen.y + vyScreen);
        // Arrowhead
        const angle = Math.atan2(vyScreen, vxScreen);
        const aw = 6;
        vg.beginFill(0x44FF88, 0.7);
        vg.drawPolygon([
          screen.x + vxScreen, screen.y + vyScreen,
          screen.x + vxScreen - aw * Math.cos(angle - 0.4),
          screen.y + vyScreen - aw * Math.sin(angle - 0.4),
          screen.x + vxScreen - aw * Math.cos(angle + 0.4),
          screen.y + vyScreen - aw * Math.sin(angle + 0.4),
        ]);
        vg.endFill();
        _uiLayer.addChild(vg);
      }
    }

    // Particle update
    Particles.tick(dtReal, Camera.worldToScreen.bind(Camera));

    // Renderer tick
    _app.renderer.render(_stage);
  }

  function _drawGrid() {
    let g = _gridLayer.children[0];
    if (!g) {
      g = new PIXI.Graphics();
      _gridLayer.addChild(g);
    }
    g.clear();

    const zoom = Camera.zoom;
    // Determine dynamic grid step (in AU) based on zoom
    let stepAU = 1;
    if (zoom > 0) {
      while (stepAU * zoom < 80) stepAU *= 10;
      while (stepAU * zoom > 800) stepAU /= 10;
    }

    g.lineStyle(1, 0xFFFFFF, 0.05);

    // Screen corners in AU
    const topLeft = Camera.screenToWorld(0, 0);
    const botRight = Camera.screenToWorld(window.innerWidth, window.innerHeight);

    const startX = Math.floor(topLeft.x / stepAU) * stepAU;
    const endX   = Math.ceil(botRight.x / stepAU) * stepAU;
    const startY = Math.floor(topLeft.y / stepAU) * stepAU;
    const endY   = Math.ceil(botRight.y / stepAU) * stepAU;

    for (let x = startX; x <= endX; x += stepAU) {
      const sx = Camera.worldToScreen(x, 0).x;
      g.moveTo(sx, 0);
      g.lineTo(sx, window.innerHeight);
    }
    for (let y = startY; y <= endY; y += stepAU) {
      const sy = Camera.worldToScreen(0, y).y;
      g.moveTo(0, sy);
      g.lineTo(window.innerWidth, sy);
    }
  }

  function _drawTrail(body, g) {
    if (!g) return;
    g.clear();
    if (!_showTrails || body.trail.length < 2 || body.isMerging) return;

    const trail = body.trail;
    const n = trail.length;
    for (let i = 1; i < n; i++) {
      const t = i / n; // 0 = oldest, 1 = newest
      const alpha = t * t * 0.6;
      const screen0 = Camera.worldToScreen(trail[i - 1].x, trail[i - 1].y);
      const screen1 = Camera.worldToScreen(trail[i].x, trail[i].y);
      g.lineStyle(1.5, body.color, alpha);
      g.moveTo(screen0.x, screen0.y);
      g.lineTo(screen1.x, screen1.y);
    }
  }

  function _drawSlingshot() {
    _slingshotLayer.clear();
    if (_slingshotStart && _slingshotEnd) {
      const sStart = Camera.worldToScreen(_slingshotStart.x, _slingshotStart.y);
      const sEnd   = Camera.worldToScreen(_slingshotEnd.x, _slingshotEnd.y);
      
      _slingshotLayer.lineStyle(2, 0x44FF88, 0.8);
      _slingshotLayer.moveTo(sStart.x, sStart.y);
      _slingshotLayer.lineTo(sEnd.x, sEnd.y);

      // Arrow head (pointing towards end, which indicates velocity)
      const angle = Math.atan2(sEnd.y - sStart.y, sEnd.x - sStart.x);
      const aw = 10;
      _slingshotLayer.beginFill(0x44FF88, 0.8);
      _slingshotLayer.drawPolygon([
        sEnd.x, sEnd.y,
        sEnd.x - aw * Math.cos(angle - 0.4), sEnd.y - aw * Math.sin(angle - 0.4),
        sEnd.x - aw * Math.cos(angle + 0.4), sEnd.y - aw * Math.sin(angle + 0.4),
      ]);
      _slingshotLayer.endFill();
    }
  }

  // ── Resize ────────────────────────────────────────────────

  function resize(w, h) {
    _app.renderer.resize(w, h);
    Camera.resize(w, h);
  }

  // ── Settings ──────────────────────────────────────────────

  function setShowTrails(v)  { _showTrails  = v; }
  function setShowLabels(v)  { _showLabels  = v; }
  function setShowVectors(v) { _showVectors = v; }
  function setSelected(id)   { _selectedId  = id; }
  function getApp()          { return _app; }
  function setSlingshot(start, end) {
    _slingshotStart = start;
    _slingshotEnd   = end;
  }

  return {
    init, render, resize,
    setShowTrails, setShowLabels, setShowVectors, setSelected,
    setSlingshot,
    getApp,
  };
})();
