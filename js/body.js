// ============================================================
// CELESTIAL BODY CLASS
// ============================================================

let _bodyIdCounter = 0;

class CelestialBody {
  /**
   * @param {object} opts
   * @param {string}  opts.name
   * @param {string}  opts.type       - key of BODY_TYPES
   * @param {number}  opts.mass       - in Solar Masses
   * @param {number}  opts.x          - position in AU
   * @param {number}  opts.y          - position in AU
   * @param {number}  opts.vx         - velocity in AU/s
   * @param {number}  opts.vy         - velocity in AU/s
   * @param {number}  [opts.color]    - 0xRRGGBB
   */
  constructor(opts) {
    this.id   = _bodyIdCounter++;
    this.name = opts.name || 'Cuerpo ' + this.id;
    this.type = opts.type || 'PLANET';
    this.mass = opts.mass;
    this.x    = opts.x;
    this.y    = opts.y;
    this.vx   = opts.vx || 0;
    this.vy   = opts.vy || 0;
    this.ax   = 0;
    this.ay   = 0;
    this.color = opts.color !== undefined ? opts.color
               : (BODY_COLORS[this.type] || [0xFFFFFF])[0];

    // Trail (array of {x,y} positions)
    this.trail = [];

    // The visual radius is now dynamic, computed on the fly based on zoom

    // Flags
    this.isAlive     = true;
    this.isMerging   = false;   // set true during explosion animation
    this.selected    = false;

    // Glow flag
    this.hasGlow = BODY_TYPES[this.type]?.glow ?? false;
  }

  getVisualRadius(zoom) {
    // Physical radius in AU
    const physAU = this.type === 'BLACK_HOLE' ? 2e-8 * this.mass : 0.00465 * Math.pow(Math.max(this.mass, 1e-15), 0.333);
    const physPx = physAU * zoom;

    // Minimum visible radius in pixels (so planets are always at least a tiny dot)
    const baseMin = { STAR: 2.0, BLACK_HOLE: 2.0, NEUTRON_STAR: 1.5, GAS_GIANT: 1.5, PLANET: 1.0, MOON: 0.8, ASTEROID: 0.5 }[this.type] || 1.0;
    const massFactor = Math.pow(Math.max(this.mass, 1e-15) * 1e6, 0.05);
    const minPx = baseMin * massFactor;

    return Math.max(physPx, minPx);
  }

  /** Call after changing type */
  refresh() {
    this.hasGlow = BODY_TYPES[this.type]?.glow ?? false;
  }

  /** Add current position to trail */
  recordTrail() {
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > SIM_DEFAULTS.maxTrailLength) {
      this.trail.shift();
    }
  }

  /** Returns kinetic energy (AU^2 / s^2 * Msun) */
  kineticEnergy() {
    return 0.5 * this.mass * (this.vx * this.vx + this.vy * this.vy);
  }

  /** Returns display info string */
  displayInfo() {
    const massKg = (this.mass * MSUN).toExponential(2) + ' kg';
    const massSun = this.mass < 0.01
      ? (this.mass * MSUN / 5.972e24).toFixed(3) + ' M⊕'
      : this.mass.toFixed(4) + ' M☉';
    const speedAUs = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    const speedKms = (speedAUs * AU / 1000).toExponential(3) + ' km/s';
    const distAU   = Math.sqrt(this.x * this.x + this.y * this.y).toFixed(4) + ' AU';
    return { massSun, speedKms, distAU };
  }
}
