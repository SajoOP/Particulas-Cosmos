// ============================================================
// SIMULATION CONTROLLER
// ============================================================

const Simulation = (() => {
  let bodies       = [];
  let paused       = true;
  let timeScale    = 86400 * 365;   // real seconds per sim-second
  let simTime      = 0;             // total simulated seconds
  let _pendingMerges = [];          // { bodyA, bodyB, merged, timer }
  let _onBodyChange  = null;        // callback when bodies list changes
  let _mergeDelay    = 0.8;         // seconds of explosion before merge
  let _currentScenarioKey = 'solarSystem';
  
  // Dual mode parameters
  let mode          = 'COSMIC';     // 'COSMIC' | 'ATOMIC'
  let coulombK      = 10.0;
  let strongK       = 40.0;
  let strongRange   = 2.0;
  let temperature   = 0.0;
  let langevinGamma = 0.2;

  const FIXED_DT_REAL = 1 / 60;    // physics step in real seconds
  const MAX_SUBSTEPS   = 20;

  // ── Load scenario ──────────────────────────────────────────

  function loadScenario(key) {
    const s = Scenarios[key];
    if (!s) return;
    _currentScenarioKey = key;
    
    // Automatically switch mode based on scenario config
    mode = s.mode || 'COSMIC';
    if (mode === 'ATOMIC') {
      coulombK      = s.coulombK !== undefined ? s.coulombK : ATOMIC_DEFAULTS.coulombK;
      strongK       = s.strongK !== undefined ? s.strongK : ATOMIC_DEFAULTS.strongK;
      strongRange   = s.strongRange !== undefined ? s.strongRange : ATOMIC_DEFAULTS.strongRange;
      temperature   = s.temperature !== undefined ? s.temperature : ATOMIC_DEFAULTS.temperature;
      langevinGamma = s.langevinGamma !== undefined ? s.langevinGamma : ATOMIC_DEFAULTS.langevinGamma;
    }

    bodies = s.bodies();
    timeScale = s.timeScale;
    simTime = 0;
    paused = false;
    _pendingMerges = [];
    Camera.fitAll(bodies);
    Camera.centerOn(
      bodies.reduce((s, b) => s + b.x, 0) / (bodies.length || 1),
      bodies.reduce((s, b) => s + b.y, 0) / (bodies.length || 1),
    );
    // Init accelerations
    if (bodies.length > 1) {
      if (mode === 'ATOMIC') {
        Physics.computeAtomicAccelerations(bodies, coulombK, strongK, strongRange);
      } else {
        Physics.computeAccelerations(bodies);
      }
    }
    _onBodyChange?.();
    return s;
  }

  // ── Main tick ──────────────────────────────────────────────

  /**
   * @param {number} dtReal  — elapsed wall clock seconds since last frame
   */
  function tick(dtReal) {
    dtReal = Math.min(dtReal, 0.1); // cap at 100ms to avoid spiral of death

    // Update explosion timers
    for (const pm of _pendingMerges) {
      pm.timer -= dtReal;
    }
    // Complete ready merges
    const stillPending = [];
    for (const pm of _pendingMerges) {
      if (pm.timer <= 0) {
        // Remove originals, add merged
        pm.bodyA.isAlive = false;
        pm.bodyB.isAlive = false;
        bodies.push(pm.merged);
        Physics.computeAccelerations(bodies.filter(b => b.isAlive));
        _onBodyChange?.();
      } else {
        stillPending.push(pm);
      }
    }
    _pendingMerges = stillPending;

    if (paused) return;

    // Physics integration
    const dt_sim = timeScale * dtReal;
    // Sub-step for stability (especially at high timeScale)
    const nSteps = Math.min(MAX_SUBSTEPS, Math.max(1, Math.ceil(Math.abs(dt_sim) / (86400 * 10))));
    const dt_step = dt_sim / nSteps;

    const aliveBodies = bodies.filter(b => b.isAlive && !b.isMerging);

    for (let s = 0; s < nSteps; s++) {
      Physics.integrateStep(aliveBodies, dt_step);
    }

    simTime += dt_sim;

    // Record trails (every frame)
    for (const b of aliveBodies) {
      b.recordTrail();
    }

    // Collision detection
    const collisions = Physics.detectCollisions(aliveBodies, Camera.pixelsPerAU);
    for (const { i, j } of collisions) {
      const bi = aliveBodies[i];
      const bj = aliveBodies[j];
      if (bi.isMerging || bj.isMerging) continue;
      bi.isMerging = true;
      bj.isMerging = true;
      const merged = Physics.mergeBodies(bi, bj);
      _pendingMerges.push({ bodyA: bi, bodyB: bj, merged, timer: _mergeDelay });

      // Trigger explosion visual
      const cx = (bi.x + bj.x) / 2;
      const cy = (bi.y + bj.y) / 2;
      const expColor = bi.mass >= bj.mass ? bi.color : bj.color;
      const expRadius = Math.max(bi.getVisualRadius(Camera.pixelsPerAU), bj.getVisualRadius(Camera.pixelsPerAU)) * 2;
      Particles.explode(cx, cy, expColor, expRadius);
    }

    // Remove dead bodies
    const before = bodies.length;
    bodies = bodies.filter(b => b.isAlive);
    if (bodies.length !== before) _onBodyChange?.();
  }

  // ── Controls ───────────────────────────────────────────────

  function play()  { paused = false; }
  function pause() { paused = true;  }
  function togglePause() { paused = !paused; return paused; }

  function setTimeScale(ts) { timeScale = ts; }
  function getTimeScale()   { return timeScale; }
  function isPaused()       { return paused; }
  function getSimTime()     { return simTime; }

  function addBody(opts) {
    // Validate to prevent NaN from corrupting the physics engine
    if (opts.mass === undefined || opts.mass === null || isNaN(opts.mass)) {
      console.warn('addBody: invalid mass, defaulting to 1e-6');
      opts.mass = 1e-6;
    }
    if (isNaN(opts.x)) opts.x = 0;
    if (isNaN(opts.y)) opts.y = 0;
    if (isNaN(opts.vx)) opts.vx = 0;
    if (isNaN(opts.vy)) opts.vy = 0;

    const b = new CelestialBody(opts);
    bodies.push(b);
    if (mode === 'ATOMIC') {
      Physics.computeAtomicAccelerations(bodies.filter(b => b.isAlive), coulombK, strongK, strongRange);
    } else {
      Physics.computeAccelerations(bodies.filter(b => b.isAlive));
    }
    _onBodyChange?.();
    return b;
  }

  function removeBody(id) {
    const idx = bodies.findIndex(b => b.id === id);
    if (idx !== -1) bodies.splice(idx, 1);
    if (mode === 'ATOMIC') {
      Physics.computeAtomicAccelerations(bodies.filter(b => b.isAlive), coulombK, strongK, strongRange);
    } else {
      Physics.computeAccelerations(bodies.filter(b => b.isAlive));
    }
    _onBodyChange?.();
  }

  function updateBody(id, opts) {
    const b = bodies.find(b => b.id === id);
    if (!b) return;
    if (opts.name   !== undefined) b.name  = opts.name;
    if (opts.type   !== undefined) b.type  = opts.type;
    if (opts.mass   !== undefined) b.mass  = parseFloat(opts.mass);
    if (opts.color  !== undefined) b.color = opts.color;
    if (opts.vx     !== undefined) b.vx    = parseFloat(opts.vx);
    if (opts.vy     !== undefined) b.vy    = parseFloat(opts.vy);
    if (opts.charge !== undefined) b.charge = parseFloat(opts.charge);
    b.refresh();
    
    if (mode === 'ATOMIC') {
      Physics.computeAtomicAccelerations(bodies.filter(b => b.isAlive), coulombK, strongK, strongRange);
    } else {
      Physics.computeAccelerations(bodies.filter(b => b.isAlive));
    }
    _onBodyChange?.();
    return b;
  }

  function onBodyChange(cb) { _onBodyChange = cb; }
  
  function restartScenario() {
    const wasPaused = paused;
    const wasTimeScale = timeScale;
    const wasSimTime = simTime;
    const result = loadScenario(_currentScenarioKey);
    paused = wasPaused;
    timeScale = wasTimeScale;
    simTime = wasSimTime;
    return result;
  }

  function formattedSimTime() {
    const absT = Math.abs(simTime);
    if (absT < 3600)      return simTime.toFixed(0) + ' s';
    if (absT < 86400)     return (simTime / 3600).toFixed(1) + ' h';
    if (absT < 86400 * 365) return (simTime / 86400).toFixed(1) + ' días';
    const yrs = simTime / (86400 * 365.25);
    if (Math.abs(yrs) < 1000) return yrs.toFixed(2) + ' años';
    return (yrs / 1e6).toFixed(3) + ' Maños';
  }

  return {
    get bodies() { return bodies; },
    get currentScenarioKey() { return _currentScenarioKey; },
    loadScenario, restartScenario, tick, addBody, removeBody, updateBody,
    play, pause, togglePause, isPaused,
    setTimeScale, getTimeScale, getSimTime, formattedSimTime,
    onBodyChange,
    
    // Mode properties
    get mode() { return mode; },
    set mode(v) { mode = v; },
    get coulombK() { return coulombK; },
    set coulombK(v) { coulombK = v; },
    get strongK() { return strongK; },
    set strongK(v) { strongK = v; },
    get strongRange() { return strongRange; },
    set strongRange(v) { strongRange = v; },
    get temperature() { return temperature; },
    set temperature(v) { temperature = v; },
    get langevinGamma() { return langevinGamma; },
    set langevinGamma(v) { langevinGamma = v; }
  };
})();

// Expose globally for camera double-click
window.Simulation = Simulation;
