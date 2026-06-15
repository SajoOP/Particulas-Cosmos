// ============================================================
// APP ENTRY POINT — Main game loop
// ============================================================

(function () {
  let _lastTime = performance.now();

  function main() {
    const canvas = document.getElementById('sim-canvas');

    // Init subsystems (order matters)
    Renderer.init(canvas);
    Camera.init(canvas, () => {});
    UI.init();

    // Load default scenario
    Simulation.loadScenario('solarSystem');
    document.getElementById('scenario-title').textContent = 'Sistema Solar';

    // Resize handler
    window.addEventListener('resize', () => {
      Renderer.resize(window.innerWidth, window.innerHeight);
    });

    // Start loop
    requestAnimationFrame(loop);
  }

  function loop(now) {
    const dtReal = Math.min((now - _lastTime) / 1000, 0.1);
    _lastTime = now;

    Camera.tick();
    Simulation.tick(dtReal);
    Renderer.render(Simulation.bodies.filter(b => b.isAlive), dtReal);
    UI.updateHUD();

    requestAnimationFrame(loop);
  }

  // Wait for DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main);
  } else {
    main();
  }
})();
