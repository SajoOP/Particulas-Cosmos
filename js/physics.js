// ============================================================
// PHYSICS ENGINE — N-body gravity, Velocity Verlet integration
// ============================================================

const Physics = (() => {

  /**
   * Compute gravitational acceleration on all bodies.
   * Uses softened potential: a = G*m / (r^2 + eps^2)^1.5 * r_hat
   * @param {CelestialBody[]} bodies
   */
  function computeAccelerations(bodies) {
    const eps2 = SIM_DEFAULTS.softening * SIM_DEFAULTS.softening;
    const n = bodies.length;

    for (let i = 0; i < n; i++) {
      bodies[i].ax = 0;
      bodies[i].ay = 0;
    }

    for (let i = 0; i < n; i++) {
      const bi = bodies[i];
      for (let j = i + 1; j < n; j++) {
        const bj = bodies[j];

        const dx = bj.x - bi.x;
        const dy = bj.y - bi.y;
        const r2 = dx * dx + dy * dy + eps2;
        const r  = Math.sqrt(r2);
        const r3 = r2 * r;

        // Force magnitude / m_i and / m_j respectively
        const F = G_SIM / r3;

        bi.ax += F * bj.mass * dx;
        bi.ay += F * bj.mass * dy;
        bj.ax -= F * bi.mass * dx;
        bj.ay -= F * bi.mass * dy;
      }
    }
  }

  /**
   * Velocity Verlet integration step
   * Position: x(t+dt) = x(t) + v(t)*dt + 0.5*a(t)*dt^2
   * Velocity: v(t+dt) = v(t) + 0.5*(a(t)+a(t+dt))*dt
   * @param {CelestialBody[]} bodies
   * @param {number} dt  — time step in seconds
   */
  function integrateStep(bodies, dt) {
    const n = bodies.length;

    // Save old accelerations
    const ax0 = new Float64Array(n);
    const ay0 = new Float64Array(n);

    for (let i = 0; i < n; i++) {
      ax0[i] = bodies[i].ax;
      ay0[i] = bodies[i].ay;
    }

    // Update positions
    for (let i = 0; i < n; i++) {
      const b = bodies[i];
      b.x += b.vx * dt + 0.5 * b.ax * dt * dt;
      b.y += b.vy * dt + 0.5 * b.ay * dt * dt;
    }

    // Recompute accelerations at new positions
    computeAccelerations(bodies);

    // Update velocities
    for (let i = 0; i < n; i++) {
      const b = bodies[i];
      b.vx += 0.5 * (ax0[i] + b.ax) * dt;
      b.vy += 0.5 * (ay0[i] + b.ay) * dt;
    }
  }

  /**
   * Detect collision pairs based on visual radii overlap.
   * @param {CelestialBody[]} bodies
   * @param {number} pixelsPerAU — to convert visual radii to AU
   * @returns {{ i, j }[]}
   */
  function detectCollisions(bodies, pixelsPerAU) {
    const pairs = [];
    const n = bodies.length;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const bi = bodies[i];
        const bj = bodies[j];
        if (bi.isMerging || bj.isMerging) continue;

        const dx = bj.x - bi.x;
        const dy = bj.y - bi.y;
        const distAU = Math.sqrt(dx * dx + dy * dy);

        // Use approximate physical radius for collisions (independent of zoom)
        // 1 Solar mass ~ 0.00465 AU radius. We use mass^0.333 for rough density scaling.
        const getRadiusAU = (body) => {
          if (body.type === 'BLACK_HOLE') return 2e-8 * body.mass;
          return 0.00465 * Math.pow(Math.max(body.mass, 1e-15), 0.333);
        };
        const riAU = getRadiusAU(bi);
        const rjAU = getRadiusAU(bj);
        
        // Multiplier for leniency (e.g., merge when surfaces touch + a small margin)
        const threshold = (riAU + rjAU) * 1.5;

        if (distAU < threshold) {
          pairs.push({ i, j });
        }
      }
    }
    return pairs;
  }

  /**
   * Merge two bodies into one (conservation of momentum & mass).
   * Returns new CelestialBody, marks old ones as isMerging.
   * @param {CelestialBody} a
   * @param {CelestialBody} b
   * @returns {CelestialBody}
   */
  function mergeBodies(a, b) {
    const totalMass = a.mass + b.mass;
    // Center of mass position
    const cx = (a.x * a.mass + b.x * b.mass) / totalMass;
    const cy = (a.y * a.mass + b.y * b.mass) / totalMass;
    // Conservation of momentum
    const cvx = (a.vx * a.mass + b.vx * b.mass) / totalMass;
    const cvy = (a.vy * a.mass + b.vy * b.mass) / totalMass;

    // Determine dominant type (heavier body wins)
    const dominant = a.mass >= b.mass ? a : b;

    // Blend colors
    const ac = a.color, bc = b.color;
    const ar = (ac >> 16) & 0xFF, ag = (ac >> 8) & 0xFF, ab_ = ac & 0xFF;
    const br = (bc >> 16) & 0xFF, bg = (bc >> 8) & 0xFF, bb_ = bc & 0xFF;
    const t = b.mass / totalMass;
    const nr = Math.round(ar + (br - ar) * t);
    const ng = Math.round(ag + (bg - ag) * t);
    const nb = Math.round(ab_ + (bb_ - ab_) * t);
    const newColor = (nr << 16) | (ng << 8) | nb;

    const merged = new CelestialBody({
      name:  dominant.name + (dominant === a ? '+' + b.name : '+' + a.name),
      type:  dominant.type,
      mass:  totalMass,
      x: cx, y: cy,
      vx: cvx, vy: cvy,
      color: newColor,
    });
    return merged;
  }

  /**
   * Compute total system energy (kinetic + potential)
   */
  function totalEnergy(bodies) {
    let K = 0, U = 0;
    const eps2 = SIM_DEFAULTS.softening * SIM_DEFAULTS.softening;
    for (let i = 0; i < bodies.length; i++) {
      K += bodies[i].kineticEnergy();
      for (let j = i + 1; j < bodies.length; j++) {
        const dx = bodies[j].x - bodies[i].x;
        const dy = bodies[j].y - bodies[i].y;
        const r  = Math.sqrt(dx * dx + dy * dy + eps2);
        U -= G_SIM * bodies[i].mass * bodies[j].mass / r;
      }
    }
    return K + U;
  }

  return { computeAccelerations, integrateStep, detectCollisions, mergeBodies, totalEnergy };
})();
