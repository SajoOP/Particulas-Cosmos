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
    _buildScenarioDropdown();
    _bindTimeControls();
    _bindToolbarButtons();
    _bindAddBodyModal();
    _bindCanvasEvents();
    _bindKeyboard();
    Simulation.onBodyChange(_refreshBodyList);
  }

  // ── Scenario Dropdown ─────────────────────────────────────

  function _buildScenarioDropdown() {
    const menu = document.getElementById('scenario-menu');
    for (const key of SCENARIO_LIST) {
      const s = Scenarios[key];
      const li = document.createElement('li');
      li.dataset.key = key;
      li.innerHTML = `<span class="scenario-icon">${_scenarioIcon(key)}</span> ${s.name}`;
      li.addEventListener('click', () => {
        _loadScenario(key);
        menu.classList.remove('open');
      });
      menu.appendChild(li);
    }

    document.getElementById('scenario-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      menu.classList.toggle('open');
    });
    document.addEventListener('click', () => menu.classList.remove('open'));
  }

  function _scenarioIcon(key) {
    const icons = {
      solarSystem: '☀️', earthMoon: '🌍', binaryStars: '⭐',
      blackHole: '🕳️', asteroidImpact: '☄️', slingshot: '🚀',
      chaos: '🌀', figure8: '♾️', rogueStar: '🌠',
      galaxyCollision: '💥', hereYouAre: '📍', empty: '✨',
    };
    return icons[key] || '🌌';
  }

  function _loadScenario(key) {
    const s = Simulation.loadScenario(key);
    if (!s) return;
    document.getElementById('scenario-title').textContent = s.name;
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
    _hidePropertyPanel();
  }

  // ── Property Panel ────────────────────────────────────────

  function _showPropertyPanel(body) {
    if (!body) { _hidePropertyPanel(); return; }
    const panel = document.getElementById('prop-panel');
    panel.classList.remove('hidden');

    document.getElementById('prop-name').value = body.name;
    document.getElementById('prop-type').value = body.type;
    document.getElementById('prop-mass').value = body.mass;
    document.getElementById('prop-mass-display').textContent = _formatMass(body.mass);
    document.getElementById('prop-vx').value = body.vx.toExponential(4);
    document.getElementById('prop-vy').value = body.vy.toExponential(4);
    document.getElementById('prop-color').value = '#' + body.color.toString(16).padStart(6, '0');

    const info = body.displayInfo();
    document.getElementById('prop-speed').textContent = info.speedKms;
    document.getElementById('prop-dist').textContent  = info.distAU;
  }

  function _hidePropertyPanel() {
    document.getElementById('prop-panel').classList.add('hidden');
  }

  function _formatMass(m) {
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
      Simulation.updateBody(_selectedBodyId, { name, type, mass, vx, vy, color });
      _showPropertyPanel(Simulation.bodies.find(b => b.id === _selectedBodyId));
      _refreshBodyList();
    });

    document.getElementById('prop-follow').addEventListener('click', () => {
      const body = Simulation.bodies.find(b => b.id === _selectedBodyId);
      if (body) Camera.setFollow(body);
    });

    document.getElementById('prop-close').addEventListener('click', _deselectBody);

    document.getElementById('prop-mass').addEventListener('input', (e) => {
      const m = parseFloat(e.target.value) || 0;
      document.getElementById('prop-mass-display').textContent = _formatMass(m);
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
              const v = Math.sqrt(G_SIM * heaviest.mass / r);
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

  // ── HUD update ────────────────────────────────────────────

  function updateHUD() {
    document.getElementById('sim-time').textContent  = Simulation.formattedSimTime();
    document.getElementById('body-count').textContent = Simulation.bodies.filter(b => b.isAlive).length + ' objetos';

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
