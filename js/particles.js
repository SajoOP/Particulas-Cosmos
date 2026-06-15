// ============================================================
// EXPLOSION PARTICLE SYSTEM
// ============================================================

const Particles = (() => {
  let _container = null;   // PIXI.ParticleContainer or Container
  let _particles  = [];

  const PARTICLE_COUNT = 80;
  const PARTICLE_LIFETIME = 1.2; // seconds

  function init(pixiStage) {
    _container = new PIXI.Container();
    pixiStage.addChild(_container);
  }

  /**
   * Spawn an explosion at world position (wx, wy) with given color.
   */
  function explode(wx, wy, color, radius) {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const angle  = Math.random() * Math.PI * 2;
      const speed  = (0.3 + Math.random() * 1.2) * radius;
      const size   = 2 + Math.random() * 5;
      const life   = PARTICLE_LIFETIME * (0.5 + Math.random() * 0.5);

      const g = new PIXI.Graphics();
      g.beginFill(color, 1);
      g.drawCircle(0, 0, size);
      g.endFill();

      // Screen position set externally in tick
      _container.addChild(g);

      _particles.push({
        gfx:   g,
        wx, wy,       // starting world position
        dvx:   Math.cos(angle) * speed,  // pixel/s drift
        dvy:   Math.sin(angle) * speed,
        life,
        maxLife: life,
        size,
        color,
        sx: 0, sy: 0, // screen position (set in tick)
      });
    }

    // Bright flash ring
    const ring = new PIXI.Graphics();
    ring.lineStyle(3, 0xFFFFFF, 0.9);
    ring.drawCircle(0, 0, radius * 0.5);
    _container.addChild(ring);
    _particles.push({
      gfx: ring,
      wx, wy,
      dvx: 0, dvy: 0,
      life: 0.3,
      maxLife: 0.3,
      size: radius,
      color: 0xFFFFFF,
      isRing: true,
      sx: 0, sy: 0,
    });
  }

  /**
   * Update and render particles.
   * @param {number} dtReal  — real elapsed seconds (NOT scaled)
   * @param {Function} worldToScreen — camera transform
   */
  function tick(dtReal, worldToScreen) {
    const toRemove = [];
    for (let i = 0; i < _particles.length; i++) {
      const p = _particles[i];
      p.life -= dtReal;
      if (p.life <= 0) {
        _container.removeChild(p.gfx);
        p.gfx.destroy();
        toRemove.push(i);
        continue;
      }
      const t = p.life / p.maxLife; // 1 → 0
      const screen = worldToScreen(p.wx, p.wy);

      if (p.isRing) {
        p.gfx.x = screen.x;
        p.gfx.y = screen.y;
        const scale = 1 + (1 - t) * 4;
        p.gfx.scale.set(scale);
        p.gfx.alpha = t * 0.8;
      } else {
        // Move in screen-space drift
        p.sx += p.dvx * dtReal;
        p.sy += p.dvy * dtReal;
        p.gfx.x = screen.x + p.sx;
        p.gfx.y = screen.y + p.sy;
        p.gfx.alpha = t;
        p.gfx.scale.set(t * 0.8 + 0.2);
        // Fade color towards orange/red
        const r = 255;
        const g_ = Math.floor(t * 180);
        const b  = Math.floor(t * t * 50);
        p.gfx.tint = (r << 16) | (g_ << 8) | b;
      }
    }
    // Remove dead particles in reverse order
    for (let i = toRemove.length - 1; i >= 0; i--) {
      _particles.splice(toRemove[i], 1);
    }
  }

  function hasActive() {
    return _particles.length > 0;
  }

  return { init, explode, tick, hasActive };
})();
