// ============================================================
// UI CONTROLLER — DOM panels, sidebar, property editor
// ============================================================

const UI = (() => {

  let _selectedBodyId = null;
  let _placementMode  = false;
  let _draggedBody    = null;
  let _slingshotStart = null;
  let _placementConfig = null;
  let _placementMethod = 'drop'; // drop, orbit, launch

  // ── Build UI ──────────────────────────────────────────────

  function init() {
    _bindScenarioDropdown();
    _bindTimeControls();
    _bindToolbarButtons();
    _bindAddBodyModal();
    _bindCanvasEvents();
    _bindKeyboard();
    _bindModeToggle();
    _bindGlobalSettings();
    _bindPropertyPanel();
    Simulation.onBodyChange(_refreshBodyList);
  }

  // ── Scenario Dropdown ─────────────────────────────────────

  function _bindScenarioDropdown() {
    _rebuildScenarioDropdown();
    document.getElementById('scenario-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      document.getElementById('scenario-menu').classList.toggle('open');
    });
    document.addEventListener('click', () => document.getElementById('scenario-menu').classList.remove('open'));
  }

  function _rebuildScenarioDropdown() {
    const menu = document.getElementById('scenario-menu');
    menu.innerHTML = '';
    const keys = Simulation.mode === 'ATOMIC' ? ATOMIC_SCENARIOS : COSMIC_SCENARIOS;
    for (const key of keys) {
      const s = Scenarios[key];
      if (!s) continue;
      const li = document.createElement('li');
      li.dataset.key = key;
      li.innerHTML = `<span class="scenario-icon">${_scenarioIcon(key)}</span> ${s.name}`;
      li.addEventListener('click', () => {
        _loadScenario(key);
        menu.classList.remove('open');
      });
      menu.appendChild(li);
    }
  }

  function _scenarioIcon(key) {
    const icons = {
      solarSystem: '☀️', earthMoon: '🌍', binaryStars: '⭐',
      blackHole: '🕳️', asteroidImpact: '☄️', slingshot: '🚀',
      chaos: '🌀', figure8: '♾️', rogueStar: '🌠',
      galaxyCollision: '💥', hereYouAre: '📍', empty: '✨',
      hydrogen: '⚛️', helium: '🎈', hydrogenMolecule: '🧬',
      nuclearFusion: '🔥', quarkPlasma: '🌀'
    };
    return icons[key] || '🌌';
  }

  function _loadScenario(key) {
    const s = Simulation.loadScenario(key);
    if (!s) return;
    document.getElementById('scenario-title').textContent = s.name;
    
    // Sync mode button classes
    const cosmicBtn = document.getElementById('btn-mode-cosmic');
    const atomicBtn = document.getElementById('btn-mode-atomic');
    if (Simulation.mode === 'ATOMIC') {
      atomicBtn.classList.add('active');
      cosmicBtn.classList.remove('active');
    } else {
      cosmicBtn.classList.add('active');
      atomicBtn.classList.remove('active');
    }
    
    _rebuildScenarioDropdown();

    // Sync time scale selector
    const sel = document.getElementById('time-scale-select');
    // Find closest
    let closest = TIME_SCALES[0], minDiff = Infinity;
    for (const ts of TIME_SCALES) {
      const diff = Math.abs(ts.value - s.timeScale);
      if (diff < minDiff) { minDiff = diff; closest = ts; }
    }
    sel.value = closest.value;
    Simulation.setTimeScale(closest.value);
    _refreshBodyList();
    _deselectBody();
    _updatePlayPause();
  }

  // ── Body List (sidebar) ───────────────────────────────────

  function _refreshBodyList() {
    const list = document.getElementById('body-list');
    list.innerHTML = '';
    const bodies = Simulation.bodies.filter(b => b.isAlive);
    document.getElementById('body-count').textContent = bodies.length + ' objetos';

    for (const body of bodies) {
      const item = document.createElement('div');
      item.className = 'body-item' + (body.id === _selectedBodyId ? ' selected' : '');
      item.dataset.id = body.id;

      const colorHex = '#' + body.color.toString(16).padStart(6, '0');
      const info = body.displayInfo();
      const typeLabel = BODY_TYPES[body.type]?.label || body.type;

      item.innerHTML = `
        <div class="body-item-dot" style="background:${colorHex}; box-shadow:0 0 6px ${colorHex}88"></div>
        <div class="body-item-info">
          <div class="body-item-name">${body.name}</div>
          <div class="body-item-meta">${typeLabel} · ${info.massSun}</div>
        </div>
        <button class="body-item-del" data-id="${body.id}" title="Eliminar">✕</button>
      `;

      item.addEventListener('click', (e) => {
        if (e.target.classList.contains('body-item-del')) return;
        _selectBody(body.id);
      });

      item.querySelector('.body-item-del').addEventListener('click', (e) => {
        e.stopPropagation();
        _deleteBody(parseInt(e.currentTarget.dataset.id));
      });

      list.appendChild(item);
    }
  }

  // ── Selection ─────────────────────────────────────────────

  function _selectBody(id) {
    // Deselect previous
    const prev = Simulation.bodies.find(b => b.id === _selectedBodyId);
    if (prev) prev.selected = false;

    _selectedBodyId = id;
    const body = Simulation.bodies.find(b => b.id === id);
    if (body) {
      body.selected = true;
      Camera.setFollow(null); // don't auto-follow on click
    }
    _refreshBodyList();
    _showPropertyPanel(body);
  }

  function _deselectBody() {
    const prev = Simulation.bodies.find(b => b.id === _selectedBodyId);
    if (prev) prev.selected = false;
    _selectedBodyId = null;
    _showGlobalSettings();
  }

  // ── Property Panel ────────────────────────────────────────

  function _showPropertyPanel(body) {
    if (!body) { _showGlobalSettings(); return; }
    
    document.getElementById('prop-body-selected').classList.remove('hidden');
    document.getElementById('prop-body-global').classList.add('hidden');
    const panel = document.getElementById('prop-panel');
    panel.classList.remove('hidden');

    document.getElementById('prop-panel-title').textContent = 'Propiedades';
    document.getElementById('prop-name').value = body.name;
    
    const typeSel = document.getElementById('prop-type');
    _buildTypeOptions(typeSel);
    typeSel.value = body.type;
    
    document.getElementById('prop-mass').value = body.mass;
    document.getElementById('prop-mass-display').textContent = _formatMass(body.mass, body.type);
    document.getElementById('prop-vx').value = body.vx.toExponential(4);
    document.getElementById('prop-vy').value = body.vy.toExponential(4);
    document.getElementById('prop-color').value = '#' + body.color.toString(16).padStart(6, '0');

    // Show/hide charge configuration row
    const chargeRow = document.getElementById('prop-charge-row');
    if (Simulation.mode === 'ATOMIC') {
      chargeRow.classList.remove('hidden');
      document.getElementById('prop-charge').value = body.charge;
      document.getElementById('prop-charge-display').textContent = (body.charge >= 0 ? '+' : '') + body.charge.toFixed(2) + ' e';
      document.getElementById('label-prop-mass').textContent = 'Masa (m_p)';
    } else {
      chargeRow.classList.add('hidden');
      document.getElementById('label-prop-mass').textContent = 'Masa (M☉)';
    }

    const info = body.displayInfo();
    document.getElementById('prop-speed').textContent = info.speedKms;
    document.getElementById('prop-dist').textContent  = info.distAU;
  }

  function _hidePropertyPanel() {
    document.getElementById('prop-panel').classList.add('hidden');
  }

  function _formatMass(m, type) {
    if (Simulation.mode === 'ATOMIC') {
      return m.toFixed(5) + ' m_p';
    }
    if (m >= 0.01)   return m.toFixed(4) + ' M☉';
    const earth = m * MSUN / 5.972e24;
    if (earth >= 0.01) return earth.toFixed(3) + ' M⊕';
    return (m * MSUN).toExponential(2) + ' kg';
  }

  // ── Property Panel bindings ───────────────────────────────

  function _bindPropertyPanel() {
    document.getElementById('prop-apply').addEventListener('click', () => {
      if (_selectedBodyId === null) return;
      const name   = document.getElementById('prop-name').value;
      const type   = document.getElementById('prop-type').value;
      const mass   = parseFloat(document.getElementById('prop-mass').value);
      const vx     = parseFloat(document.getElementById('prop-vx').value);
      const vy     = parseFloat(document.getElementById('prop-vy').value);
      const colorH = document.getElementById('prop-color').value;
      const color  = parseInt(colorH.slice(1), 16);
      
      const opts = { name, type, mass, vx, vy, color };
      if (Simulation.mode === 'ATOMIC') {
        opts.charge = parseFloat(document.getElementById('prop-charge').value);
      }
      
      Simulation.updateBody(_selectedBodyId, opts);
      _showPropertyPanel(Simulation.bodies.find(b => b.id === _selectedBodyId));
      _refreshBodyList();
    });

    document.getElementById('prop-follow').addEventListener('click', () => {
      const body = Simulation.bodies.find(b => b.id === _selectedBodyId);
      if (body) Camera.setFollow(body);
    });

    document.getElementById('prop-close').addEventListener('click', () => {
      if (_selectedBodyId !== null) {
        _deselectBody();
      } else {
        _hidePropertyPanel();
      }
    });

    document.getElementById('prop-mass').addEventListener('input', (e) => {
      const m = parseFloat(e.target.value) || 0;
      document.getElementById('prop-mass-display').textContent = _formatMass(m);
    });

    document.getElementById('prop-charge')?.addEventListener('input', (e) => {
      const c = parseFloat(e.target.value) || 0;
      document.getElementById('prop-charge-display').textContent = (c >= 0 ? '+' : '') + c.toFixed(2) + ' e';
    });
  }

  // ── Time Controls ─────────────────────────────────────────

  function _bindTimeControls() {
    document.getElementById('btn-play-pause').addEventListener('click', () => {
      Simulation.togglePause();
      _updatePlayPause();
    });

    document.getElementById('btn-slower').addEventListener('click', () => {
      const sel = document.getElementById('time-scale-select');
      if (sel.selectedIndex > 0) {
        sel.selectedIndex--;
        Simulation.setTimeScale(parseFloat(sel.value));
      }
    });

    document.getElementById('btn-faster').addEventListener('click', () => {
      const sel = document.getElementById('time-scale-select');
      if (sel.selectedIndex < sel.options.length - 1) {
        sel.selectedIndex++;
        Simulation.setTimeScale(parseFloat(sel.value));
      }
    });

    const sel = document.getElementById('time-scale-select');
    // Populate
    for (const ts of TIME_SCALES) {
      const opt = document.createElement('option');
      opt.value = ts.value;
      opt.textContent = ts.label;
      sel.appendChild(opt);
    }
    sel.selectedIndex = 4; // 1 año/s default
    sel.addEventListener('change', () => {
      Simulation.setTimeScale(parseFloat(sel.value));
    });

    // Space = play/pause
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && e.target.tagName !== 'INPUT') {
        e.preventDefault();
        Simulation.togglePause();
        _updatePlayPause();
      }
    });
  }

  function _updatePlayPause() {
    const btn = document.getElementById('btn-play-pause');
    btn.textContent = Simulation.isPaused() ? '▶' : '⏸';
    btn.title       = Simulation.isPaused() ? 'Reanudar (Espacio)' : 'Pausar (Espacio)';
  }

  // ── Toolbar buttons ───────────────────────────────────────

  function _bindToolbarButtons() {
    document.getElementById('btn-trails').addEventListener('click', function() {
      this.classList.toggle('active');
      Renderer.setShowTrails(this.classList.contains('active'));
    });
    document.getElementById('btn-labels').addEventListener('click', function() {
      this.classList.toggle('active');
      Renderer.setShowLabels(this.classList.contains('active'));
    });
    document.getElementById('btn-vectors').addEventListener('click', function() {
      this.classList.toggle('active');
      Renderer.setShowVectors(this.classList.contains('active'));
    });
    document.getElementById('btn-fit').addEventListener('click', () => {
      Camera.fitAll(Simulation.bodies.filter(b => b.isAlive));
    });
    document.getElementById('btn-restart').addEventListener('click', () => {
      const s = Simulation.restartScenario();
      if (!s) return;
      document.getElementById('scenario-title').textContent = s.name;
      // Sync dropdown to the preserved time scale
      const sel = document.getElementById('time-scale-select');
      const currentTS = Simulation.getTimeScale();
      let closest = TIME_SCALES[0], minDiff = Infinity;
      for (const ts of TIME_SCALES) {
        const diff = Math.abs(ts.value - currentTS);
        if (diff < minDiff) { minDiff = diff; closest = ts; }
      }
      sel.value = closest.value;
      _refreshBodyList();
      _deselectBody();
      _updatePlayPause();
    });
    document.getElementById('btn-clear').addEventListener('click', () => {
      _loadScenario('empty');
    });
    document.getElementById('btn-add').addEventListener('click', (e) => {
      if (_placementMode) {
        // If already in placement mode, cancel it
        _exitPlacementMode();
      } else {
        // Open the modal to configure the body first
        document.getElementById('add-modal').classList.remove('hidden');
      }
    });

    // Property panel bindings (deferred)
    _bindPropertyPanel();
  }

  // ── Add Body Modal ────────────────────────────────────────

  function _buildTypeOptions(selectEl) {
    selectEl.innerHTML = '';
    for (const [key, cfg] of Object.entries(BODY_TYPES)) {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = cfg.label;
      selectEl.appendChild(opt);
    }
  }

  function _bindAddBodyModal() {
    const modal   = document.getElementById('add-modal');
    const typeEl  = document.getElementById('add-type');
    _buildTypeOptions(typeEl);

    // Populate color with default for type
    typeEl.addEventListener('change', () => {
      const colors = BODY_COLORS[typeEl.value] || [0xFFFFFF];
      document.getElementById('add-color').value = '#' + colors[0].toString(16).padStart(6, '0');
      const cfg = BODY_TYPES[typeEl.value];
      document.getElementById('add-mass').value = ((cfg.minMass + cfg.maxMass) / 2).toExponential(3);
    });
    typeEl.dispatchEvent(new Event('change'));

    document.getElementById('add-confirm').addEventListener('click', () => {
      _placementConfig = {
        name:  document.getElementById('add-name').value || 'Nuevo Cuerpo',
        type:  typeEl.value,
        mass:  parseFloat(document.getElementById('add-mass').value),
        color: parseInt(document.getElementById('add-color').value.slice(1), 16),
      };
      _placementMethod = document.getElementById('add-method').value;

      modal.classList.add('hidden');
      _placementMode = true;
      document.getElementById('btn-add').classList.add('active');
      document.getElementById('sim-canvas').style.cursor = 'crosshair';
    });

    document.getElementById('add-cancel').addEventListener('click', () => {
      modal.classList.add('hidden');
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.add('hidden');
    });
  }

  // ── Canvas Interaction (Drag, Drop, Slingshot) ────────────

  function _findBodyAt(sx, sy) {
    const world = Camera.screenToWorld(sx, sy);
    let closest = null, closestDist = Infinity;
    for (const b of Simulation.bodies) {
      if (!b.isAlive) continue;
      const d = Math.hypot(b.x - world.x, b.y - world.y);
      const hitRadius = (b.getVisualRadius(Camera.zoom) + 12) / Camera.pixelsPerAU;
      if (d < hitRadius && d < closestDist) {
        closestDist = d;
        closest = b;
      }
    }
    return closest;
  }

  function _exitPlacementMode() {
    _placementMode = false;
    document.getElementById('btn-add').classList.remove('active');
    document.getElementById('sim-canvas').style.cursor = 'default';
  }

  function _bindCanvasEvents() {
    const canvas = document.getElementById('sim-canvas');
    
    canvas.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      const rect  = canvas.getBoundingClientRect();
      const sx    = e.clientX - rect.left;
      const sy    = e.clientY - rect.top;
      const world = Camera.screenToWorld(sx, sy);

      if (_placementMode) {
        if (_placementMethod === 'drop') {
          const b = Simulation.addBody({ ..._placementConfig, x: world.x, y: world.y, vx: 0, vy: 0 });
          _selectBody(b.id);
          _exitPlacementMode();
        } else if (_placementMethod === 'orbit') {
          let heaviest = null, maxM = 0;
          for (const b of Simulation.bodies) {
            if (b.isAlive && b.mass > maxM) { maxM = b.mass; heaviest = b; }
          }
          let vx = 0, vy = 0;
          if (heaviest) {
            const dx = world.x - heaviest.x;
            const dy = world.y - heaviest.y;
            const r = Math.hypot(dx, dy);
            if (r > 0) {
              let v = 0;
              if (Simulation.mode === 'ATOMIC') {
                const particleMass = _placementConfig.mass;
                const particleCharge = _placementConfig.charge;
                const qProduct = Math.abs(heaviest.charge * particleCharge);
                // Orbit requires attraction (opposite signs for charges)
                if (qProduct > 0 && (heaviest.charge * particleCharge < 0)) {
                  v = Math.sqrt(Simulation.coulombK * qProduct / (particleMass * r));
                } else {
                  v = 0; // repulsive or neutral force cannot sustain standard circular orbit
                }
              } else {
                v = Math.sqrt(G_SIM * heaviest.mass / r);
              }
              vx = heaviest.vx - v * (dy / r);
              vy = heaviest.vy + v * (dx / r);
            }
          }
          const b = Simulation.addBody({ ..._placementConfig, x: world.x, y: world.y, vx, vy });
          _selectBody(b.id);
          _exitPlacementMode();
        } else if (_placementMethod === 'launch') {
          _slingshotStart = world;
          Camera.disablePan = true;
          Renderer.setSlingshot(_slingshotStart, _slingshotStart);
        }
        return;
      }

      const hit = _findBodyAt(sx, sy);
      if (hit) {
        _selectBody(hit.id);
        _draggedBody = hit;
        Camera.disablePan = true;
      } else {
        _deselectBody();
      }
    });

    canvas.addEventListener('mousemove', (e) => {
      const rect  = canvas.getBoundingClientRect();
      const sx    = e.clientX - rect.left;
      const sy    = e.clientY - rect.top;
      const world = Camera.screenToWorld(sx, sy);

      if (_slingshotStart) {
        Renderer.setSlingshot(_slingshotStart, world);
      } else if (_draggedBody) {
        _draggedBody.x = world.x;
        _draggedBody.y = world.y;
        _draggedBody.vx = 0;
        _draggedBody.vy = 0;
        // Also clear trail
        _draggedBody.trail = [];
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (_slingshotStart) {
        const rect  = canvas.getBoundingClientRect();
        const world = Camera.screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
        // drag vector is the velocity. Multiply by 0.5 to make it controllable.
        const vx = (world.x - _slingshotStart.x) * 0.5;
        const vy = (world.y - _slingshotStart.y) * 0.5;
        const b = Simulation.addBody({ ..._placementConfig, x: _slingshotStart.x, y: _slingshotStart.y, vx, vy });
        _selectBody(b.id);
        _slingshotStart = null;
        Renderer.setSlingshot(null);
        Camera.disablePan = false;
        _exitPlacementMode();
      }
      if (_draggedBody) {
        _draggedBody = null;
        Camera.disablePan = false;
      }
    });
  }

  function _bindKeyboard() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (_selectedBodyId !== null && e.target.tagName !== 'INPUT') {
          _deleteBody(_selectedBodyId);
        }
      }
    });
  }

  function _deleteBody(id) {
    Simulation.removeBody(id);
    if (_selectedBodyId === id) _deselectBody();
    _refreshBodyList();
  }

  // ── Mode Toggle and Custom Settings ───────────────────────

  function _bindModeToggle() {
    const cosmicBtn = document.getElementById('btn-mode-cosmic');
    const atomicBtn = document.getElementById('btn-mode-atomic');

    cosmicBtn.addEventListener('click', () => {
      if (Simulation.mode === 'COSMIC') return;
      Simulation.mode = 'COSMIC';
      cosmicBtn.classList.add('active');
      atomicBtn.classList.remove('active');
      _updateUIMode();
    });

    atomicBtn.addEventListener('click', () => {
      if (Simulation.mode === 'ATOMIC') return;
      Simulation.mode = 'ATOMIC';
      atomicBtn.classList.add('active');
      cosmicBtn.classList.remove('active');
      _updateUIMode();
    });
  }

  function _updateUIMode() {
    _rebuildScenarioDropdown();
    const defaultScenario = Simulation.mode === 'ATOMIC' ? 'hydrogen' : 'solarSystem';
    _loadScenario(defaultScenario);
    
    const typeEl = document.getElementById('add-type');
    _buildTypeOptions(typeEl);
    typeEl.dispatchEvent(new Event('change'));

    _deselectBody();
  }

  function _bindGlobalSettings() {
    const slideTemp = document.getElementById('slide-temp');
    const dispTemp = document.getElementById('disp-temp');
    slideTemp?.addEventListener('input', (e) => {
      const T = parseFloat(e.target.value);
      Simulation.temperature = T;
      dispTemp.textContent = T === 0 ? '0 K (Cero Absoluto)' : T.toFixed(0) + ' K (Equiv)';
    });

    const slideCoulomb = document.getElementById('slide-coulomb');
    const dispCoulomb = document.getElementById('disp-coulomb');
    slideCoulomb?.addEventListener('input', (e) => {
      const k = parseFloat(e.target.value);
      Simulation.coulombK = k;
      dispCoulomb.textContent = k.toFixed(1) + ' (Const. Coulomb)';
    });

    const slideStrong = document.getElementById('slide-strong');
    const dispStrong = document.getElementById('disp-strong');
    slideStrong?.addEventListener('input', (e) => {
      const k = parseFloat(e.target.value);
      Simulation.strongK = k;
      dispStrong.textContent = k.toFixed(1) + ' (Const. Fuerza Fuerte)';
    });

    const slideGamma = document.getElementById('slide-gamma');
    const dispGamma = document.getElementById('disp-gamma');
    slideGamma?.addEventListener('input', (e) => {
      const g = parseFloat(e.target.value);
      Simulation.langevinGamma = g;
      dispGamma.textContent = g.toFixed(2) + ' (Damping)';
    });

    document.getElementById('btn-thermal-kick')?.addEventListener('click', () => {
      const kick = 15.0; // velocity amplitude
      for (const b of Simulation.bodies) {
        if (!b.isAlive) continue;
        const angle = Math.random() * Math.PI * 2;
        // thermal agitation is inversely proportional to square root of mass
        b.vx += Math.cos(angle) * kick / Math.sqrt(b.mass);
        b.vy += Math.sin(angle) * kick / Math.sqrt(b.mass);
      }
    });
  }

  function _showGlobalSettings() {
    document.getElementById('prop-body-selected').classList.add('hidden');
    document.getElementById('prop-body-global').classList.remove('hidden');

    const panel = document.getElementById('prop-panel');
    panel.classList.remove('hidden');
    
    document.getElementById('prop-panel-title').textContent = 'Configuración';

    if (Simulation.mode === 'ATOMIC') {
      document.getElementById('settings-cosmic').classList.add('hidden');
      document.getElementById('settings-atomic').classList.remove('hidden');

      // Sync slide values
      const tempSlider = document.getElementById('slide-temp');
      const coulombSlider = document.getElementById('slide-coulomb');
      const strongSlider = document.getElementById('slide-strong');
      const gammaSlider = document.getElementById('slide-gamma');

      if (tempSlider) tempSlider.value = Simulation.temperature;
      document.getElementById('disp-temp').textContent = Simulation.temperature === 0 ? '0 K (Cero Absoluto)' : Simulation.temperature.toFixed(0) + ' K (Equiv)';
      
      if (coulombSlider) coulombSlider.value = Simulation.coulombK;
      document.getElementById('disp-coulomb').textContent = Simulation.coulombK.toFixed(1) + ' (Const. Coulomb)';
      
      if (strongSlider) strongSlider.value = Simulation.strongK;
      document.getElementById('disp-strong').textContent = Simulation.strongK.toFixed(1) + ' (Const. Fuerza Fuerte)';
      
      if (gammaSlider) gammaSlider.value = Simulation.langevinGamma;
      document.getElementById('disp-gamma').textContent = Simulation.langevinGamma.toFixed(2) + ' (Damping)';
    } else {
      document.getElementById('settings-cosmic').classList.remove('hidden');
      document.getElementById('settings-atomic').classList.add('hidden');
    }
  }

  // ── HUD update ────────────────────────────────────────────

  function updateHUD() {
    document.getElementById('sim-time').textContent  = Simulation.formattedSimTime();
    
    const countLabel = Simulation.mode === 'ATOMIC' ? ' partículas' : ' objetos';
    document.getElementById('body-count').textContent = Simulation.bodies.filter(b => b.isAlive).length + countLabel;

    // Update property panel live stats
    if (_selectedBodyId !== null) {
      const body = Simulation.bodies.find(b => b.id === _selectedBodyId);
      if (body && body.isAlive) {
        const info = body.displayInfo();
        const el_speed = document.getElementById('prop-speed');
        const el_dist  = document.getElementById('prop-dist');
        if (el_speed) el_speed.textContent = info.speedKms;
        if (el_dist)  el_dist.textContent  = info.distAU;
      }
    }
  }

  return { init, updateHUD, refresh: _refreshBodyList };
})();
