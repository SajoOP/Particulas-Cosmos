// ============================================================
// PREDEFINED SCENARIOS
// ============================================================

// Orbital velocity helper: v = sqrt(G_SIM * M / r)  (AU/s)
function orbitalVelocity(centralMass, radiusAU) {
  return Math.sqrt(G_SIM * centralMass / radiusAU);
}

const Scenarios = {

  // ── Solar System ────────────────────────────────────────────
  solarSystem: {
    name: 'Sistema Solar',
    description: 'El Sol y los 8 planetas con órbitas precisas en UA.',
    timeScale: 86400 * 30,   // 1 month / second default
    zoom: 60,
    bodies: () => {
      const sun = new CelestialBody({
        name: 'Sol', type: 'STAR', mass: 1.0,
        x: 0, y: 0, vx: 0, vy: 0, color: 0xFFDD44,
      });

      // [name, type, mass (Msun), a (AU), color]
      const planets = [
        ['Mercurio', 'PLANET',    1.651e-7,  0.387, 0xAA9988],
        ['Venus',    'PLANET',    2.448e-6,  0.723, 0xFFCC88],
        ['Tierra',   'PLANET',    3.003e-6,  1.000, 0x4488FF],
        ['Marte',    'PLANET',    3.213e-7,  1.524, 0xFF6644],
        ['Júpiter',  'GAS_GIANT', 9.548e-4,  5.203, 0xF4A460],
        ['Saturno',  'GAS_GIANT', 2.858e-4,  9.537, 0xDAA520],
        ['Urano',    'GAS_GIANT', 4.366e-5, 19.191, 0x88CCFF],
        ['Neptuno',  'GAS_GIANT', 5.151e-5, 30.069, 0x4466FF],
      ];

      const list = [sun];
      for (const [name, type, mass, a, color] of planets) {
        const v = orbitalVelocity(sun.mass, a);
        const angle = Math.random() * Math.PI * 2;
        list.push(new CelestialBody({ 
          name, type, mass, 
          x: a * Math.cos(angle), 
          y: a * Math.sin(angle), 
          vx: -v * Math.sin(angle), 
          vy:  v * Math.cos(angle), 
          color 
        }));
      }
      return list;
    },
  },

  // ── Earth-Moon ──────────────────────────────────────────────
  earthMoon: {
    name: 'Tierra y Luna',
    description: 'Sistema Tierra-Luna con órbita precisa.',
    timeScale: 3600,   // 1 hour / second
    zoom: 5000,
    bodies: () => {
      const earthMass = 3.003e-6;
      const moonMass  = 3.694e-8;
      const moonDist  = 0.00257;  // AU (~384,400 km)
      const v = orbitalVelocity(earthMass, moonDist);

      return [
        new CelestialBody({ name: 'Tierra', type: 'PLANET',  mass: earthMass,
          x: 0, y: 0, vx: 0, vy: 0, color: 0x4488FF }),
        new CelestialBody({ name: 'Luna',   type: 'MOON',    mass: moonMass,
          x: moonDist, y: 0, vx: 0, vy: v, color: 0xCCCCCC }),
      ];
    },
  },

  // ── Binary Star ─────────────────────────────────────────────
  binaryStars: {
    name: 'Sistema Binario',
    description: 'Dos estrellas orbitándose mutuamente.',
    timeScale: 86400 * 365,
    zoom: 150,
    bodies: () => {
      const m1 = 1.2, m2 = 0.8;
      const sep = 2.0; // AU
      const totalM = m1 + m2;
      // Center of mass at origin; each star on opposite side
      const x1 = -(m2 / totalM) * sep / 2;
      const x2 =  (m1 / totalM) * sep / 2;
      const v = orbitalVelocity(totalM, sep) * 0.5;

      return [
        new CelestialBody({ name: 'Alfa',  type: 'STAR', mass: m1,
          x: x1, y: 0, vx: 0, vy: -v * (m2 / totalM) * 2, color: 0xFFFF88 }),
        new CelestialBody({ name: 'Beta',  type: 'STAR', mass: m2,
          x: x2, y: 0, vx: 0, vy:  v * (m1 / totalM) * 2, color: 0xFF8844 }),
      ];
    },
  },

  // ── Black Hole System ───────────────────────────────────────
  blackHole: {
    name: 'Agujero Negro',
    description: 'Agujero negro masivo con estrellas en órbita.',
    timeScale: 86400 * 365 * 10,
    zoom: 30,
    bodies: () => {
      const bhMass = 10;
      const list = [
        new CelestialBody({ name: 'Sgr A*', type: 'BLACK_HOLE', mass: bhMass,
          x: 0, y: 0, vx: 0, vy: 0, color: 0x6600AA }),
      ];
      const starData = [
        ['S1', 0.8, 1.5, 0xFFFF88],
        ['S2', 1.2, 2.8, 0xFFCC44],
        ['S3', 0.6, 4.0, 0xFF9944],
        ['S4', 1.5, 6.5, 0xFF8888],
        ['S5', 0.9, 9.0, 0xAADDFF],
      ];
      for (const [name, mass, r, color] of starData) {
        const angle = Math.random() * Math.PI * 2;
        const v = orbitalVelocity(bhMass, r);
        list.push(new CelestialBody({
          name, type: 'STAR', mass,
          x: r * Math.cos(angle), y: r * Math.sin(angle),
          vx: -v * Math.sin(angle), vy: v * Math.cos(angle),
          color,
        }));
      }
      return list;
    },
  },

  // ── Asteroid Impact ─────────────────────────────────────────
  asteroidImpact: {
    name: 'Impacto de Asteroide',
    description: 'Asteroide masivo en trayectoria de colisión con la Tierra.',
    timeScale: 3600 * 6,
    zoom: 3000,
    bodies: () => {
      const earthMass = 3.003e-6;
      const asteroidMass = 1e-8;  // ~10x Chicxulub
      return [
        new CelestialBody({ name: 'Tierra',    type: 'PLANET',   mass: earthMass,
          x: 0, y: 0, vx: 0, vy: 0, color: 0x4488FF }),
        new CelestialBody({ name: 'Asteroide', type: 'ASTEROID', mass: asteroidMass,
          x: 0.03, y: 0.02, vx: -0.00012, vy: -0.00008, color: 0x997755 }),
      ];
    },
  },

  // ── Gravitational Slingshot ──────────────────────────────────
  slingshot: {
    name: 'Asistencia Gravitacional',
    description: 'Una nave pequeña pasa cerca de un planeta gigante y gana velocidad.',
    timeScale: 3600 * 12,
    zoom: 800,
    bodies: () => {
      const jupMass = 9.548e-4;
      const probeMass = 1e-25;
      return [
        new CelestialBody({ name: 'Júpiter', type: 'GAS_GIANT', mass: jupMass,
          x: 0, y: 0, vx: 0, vy: 0.000013, color: 0xF4A460 }),
        new CelestialBody({ name: 'Sonda',   type: 'ASTEROID',  mass: probeMass,
          x: -0.015, y: -0.008, vx: 0.00004, vy: 0.00002, color: 0xCCFFCC }),
      ];
    },
  },

  // ── Chaotic N-body ──────────────────────────────────────────
  chaos: {
    name: 'Caos Gravitacional',
    description: '7 planetas en órbitas caóticas.',
    timeScale: 86400 * 30,
    zoom: 80,
    bodies: () => {
      const list = [];
      const colors = [0xFF4444, 0x44FF88, 0x4488FF, 0xFFFF44, 0xFF8844, 0xCC44FF, 0x44FFFF];
      for (let i = 0; i < 7; i++) {
        const angle = (i / 7) * Math.PI * 2;
        const r = 2 + Math.random() * 4;
        const mass = 1e-5 + Math.random() * 5e-5;
        const v = orbitalVelocity(1e-4, r) * (0.6 + Math.random() * 0.8);
        list.push(new CelestialBody({
          name: `P${i + 1}`, type: 'PLANET', mass,
          x: r * Math.cos(angle), y: r * Math.sin(angle),
          vx: -v * Math.sin(angle) + (Math.random() - 0.5) * v * 0.3,
          vy:  v * Math.cos(angle) + (Math.random() - 0.5) * v * 0.3,
          color: colors[i],
        }));
      }
      return list;
    },
  },

  // ── Figure-8 Three-Body ──────────────────────────────────────
  figure8: {
    name: 'Coreografía en 8',
    description: 'Solución estable de 3 cuerpos masivos persiguiéndose en un patrón de infinito.',
    timeScale: 86400 * 5,
    zoom: 250,
    bodies: () => {
      const m = 1.0;
      // Original positions and velocities for G=1, M=1
      const q1 = {x: 0.97000436, y: -0.24308753};
      const q2 = {x: -0.97000436, y: 0.24308753};
      const q3 = {x: 0, y: 0};
      
      const v1 = {x: 0.4662036850, y: 0.4323657300};
      const v2 = {x: 0.4662036850, y: 0.4323657300};
      const v3 = {x: -2 * 0.4662036850, y: -2 * 0.4323657300};
      
      // Scale velocity by sqrt(G_SIM) since simulation uses G_SIM instead of 1
      const vScale = Math.sqrt(G_SIM);

      return [
        new CelestialBody({ name: 'Estrella 1', type: 'STAR', mass: m,
          x: q1.x, y: q1.y, vx: v1.x * vScale, vy: v1.y * vScale, color: 0xFF4444 }),
        new CelestialBody({ name: 'Estrella 2', type: 'STAR', mass: m,
          x: q2.x, y: q2.y, vx: v2.x * vScale, vy: v2.y * vScale, color: 0x44FF44 }),
        new CelestialBody({ name: 'Estrella 3', type: 'STAR', mass: m,
          x: q3.x, y: q3.y, vx: v3.x * vScale, vy: v3.y * vScale, color: 0x4444FF }),
      ];
    },
  },

  // ── Rogue Star Invasion ──────────────────────────────────────
  rogueStar: {
    name: 'Estrella Errante',
    description: 'Un sistema solar pacífico es invadido por una estrella errante masiva.',
    timeScale: 86400 * 30,
    zoom: 35,
    bodies: () => {
      const list = [];
      const sun = new CelestialBody({ name: 'Sol', type: 'STAR', mass: 1.0, x: 0, y: 0, vx: 0, vy: 0, color: 0xFFDD44 });
      list.push(sun);
      
      // Peaceful planets
      for (let i = 1; i <= 5; i++) {
        const a = i * 2.5;
        const v = orbitalVelocity(sun.mass, a);
        const angle = Math.random() * Math.PI * 2;
        list.push(new CelestialBody({ 
          name: `Planeta ${i}`, type: 'PLANET', mass: 3e-6 * i, 
          x: a * Math.cos(angle), y: a * Math.sin(angle), 
          vx: -v * Math.sin(angle), vy:  v * Math.cos(angle), 
          color: 0x88CCFF 
        }));
      }

      // Rogue Star coming in fast
      const rogue = new CelestialBody({
        name: 'Némesis', type: 'STAR', mass: 2.5,
        x: 35, y: 15, vx: -1.2, vy: -0.4, color: 0xFF4422
      });
      list.push(rogue);

      return list;
    },
  },

  // ── Galaxy Collision ─────────────────────────────────────────
  galaxyCollision: {
    name: 'Choque de Cúmulos',
    description: 'Dos agujeros negros súpermasivos con sus estrellas chocan entre sí.',
    timeScale: 86400 * 365,
    zoom: 15,
    bodies: () => {
      const list = [];
      
      function createCluster(bhName, x, y, vx, vy, colorBH, colorStars) {
        const bhMass = 50;
        list.push(new CelestialBody({ name: bhName, type: 'BLACK_HOLE', mass: bhMass, x, y, vx, vy, color: colorBH }));
        
        for (let i = 0; i < 40; i++) {
          const r = 3 + Math.random() * 10;
          const angle = Math.random() * Math.PI * 2;
          const vOrbit = orbitalVelocity(bhMass, r);
          list.push(new CelestialBody({
            name: `Estrella`, type: 'STAR', mass: 0.1 + Math.random() * 0.5,
            x: x + r * Math.cos(angle), y: y + r * Math.sin(angle),
            vx: vx - vOrbit * Math.sin(angle), vy: vy + vOrbit * Math.cos(angle),
            color: colorStars
          }));
        }
      }

      // Two incoming clusters
      createCluster('Gargantúa', -25, -10,  1.0,  0.4, 0xAA00FF, 0x88CCFF);
      createCluster('Leviatán',   25,  10, -1.0, -0.4, 0xFF00AA, 0xFFCC88);

      return list;
    },
  },

  // ── Aquí Estás — Full Solar System ────────────────────────────
  hereYouAre: {
    name: 'Aquí Estás',
    description: 'El sistema solar completo: planetas, lunas, asteroides, cometas, planetas enanos y objetos exteriores.',
    timeScale: 86400 * 365,
    zoom: 5,
    bodies: () => {
      const list = [];

      // Helper: place body in circular orbit around a center body
      function orbitAround(centerX, centerY, centerVx, centerVy, centralMass, radiusAU, name, type, mass, color) {
        const v = orbitalVelocity(centralMass, radiusAU);
        const angle = Math.random() * Math.PI * 2;
        return new CelestialBody({
          name, type, mass,
          x: centerX + radiusAU * Math.cos(angle),
          y: centerY + radiusAU * Math.sin(angle),
          vx: centerVx + (-v * Math.sin(angle)),
          vy: centerVy + ( v * Math.cos(angle)),
          color,
        });
      }

      // ═══════════════════ SOL ═══════════════════
      const sun = new CelestialBody({
        name: 'Sol', type: 'STAR', mass: 1.0,
        x: 0, y: 0, vx: 0, vy: 0, color: 0xFFDD44,
      });
      list.push(sun);

      // ═══════════════════ PLANETAS Y LUNAS ═══════════════════

      // --- Mercurio ---
      const mercA = 0.387;
      const mercAngle = Math.random() * Math.PI * 2;
      const mercV = orbitalVelocity(1.0, mercA);
      const merc = new CelestialBody({ name: 'Mercurio', type: 'PLANET', mass: 1.651e-7,
        x: mercA * Math.cos(mercAngle), y: mercA * Math.sin(mercAngle),
        vx: -mercV * Math.sin(mercAngle), vy: mercV * Math.cos(mercAngle), color: 0xAA9988 });
      list.push(merc);

      // --- Venus ---
      const venA = 0.723;
      const venAngle = Math.random() * Math.PI * 2;
      const venV = orbitalVelocity(1.0, venA);
      const venus = new CelestialBody({ name: 'Venus', type: 'PLANET', mass: 2.448e-6,
        x: venA * Math.cos(venAngle), y: venA * Math.sin(venAngle),
        vx: -venV * Math.sin(venAngle), vy: venV * Math.cos(venAngle), color: 0xFFCC88 });
      list.push(venus);

      // --- Tierra + Luna ---
      const eA = 1.0;
      const eAngle = Math.random() * Math.PI * 2;
      const eV = orbitalVelocity(1.0, eA);
      const eMass = 3.003e-6;
      const earth = new CelestialBody({ name: 'Tierra', type: 'PLANET', mass: eMass,
        x: eA * Math.cos(eAngle), y: eA * Math.sin(eAngle),
        vx: -eV * Math.sin(eAngle), vy: eV * Math.cos(eAngle), color: 0x4488FF });
      list.push(earth);
      list.push(orbitAround(earth.x, earth.y, earth.vx, earth.vy, eMass, 0.00257, 'Luna', 'MOON', 3.694e-8, 0xCCCCCC));

      // --- Marte + Fobos, Deimos ---
      const mA = 1.524;
      const mAngle = Math.random() * Math.PI * 2;
      const mV = orbitalVelocity(1.0, mA);
      const mMass = 3.213e-7;
      const mars = new CelestialBody({ name: 'Marte', type: 'PLANET', mass: mMass,
        x: mA * Math.cos(mAngle), y: mA * Math.sin(mAngle),
        vx: -mV * Math.sin(mAngle), vy: mV * Math.cos(mAngle), color: 0xFF6644 });
      list.push(mars);
      list.push(orbitAround(mars.x, mars.y, mars.vx, mars.vy, mMass, 6.27e-5, 'Fobos', 'MOON', 5.37e-18, 0xAA9988));
      list.push(orbitAround(mars.x, mars.y, mars.vx, mars.vy, mMass, 1.57e-4, 'Deimos', 'MOON', 7.35e-19, 0x998877));

      // --- Júpiter + 4 Galileanas + lunas menores ---
      const jA = 5.203;
      const jAngle = Math.random() * Math.PI * 2;
      const jV = orbitalVelocity(1.0, jA);
      const jMass = 9.548e-4;
      const jupiter = new CelestialBody({ name: 'Júpiter', type: 'GAS_GIANT', mass: jMass,
        x: jA * Math.cos(jAngle), y: jA * Math.sin(jAngle),
        vx: -jV * Math.sin(jAngle), vy: jV * Math.cos(jAngle), color: 0xF4A460 });
      list.push(jupiter);
      // Galilean moons (dist in AU from Jupiter)
      list.push(orbitAround(jupiter.x, jupiter.y, jupiter.vx, jupiter.vy, jMass, 0.00282, 'Ío', 'MOON', 4.49e-8, 0xFFDD44));
      list.push(orbitAround(jupiter.x, jupiter.y, jupiter.vx, jupiter.vy, jMass, 0.00449, 'Europa', 'MOON', 2.41e-8, 0xCCDDFF));
      list.push(orbitAround(jupiter.x, jupiter.y, jupiter.vx, jupiter.vy, jMass, 0.00716, 'Ganímedes', 'MOON', 7.45e-8, 0xBBAA99));
      list.push(orbitAround(jupiter.x, jupiter.y, jupiter.vx, jupiter.vy, jMass, 0.01259, 'Calisto', 'MOON', 5.41e-8, 0x887766));
      // Minor moons
      list.push(orbitAround(jupiter.x, jupiter.y, jupiter.vx, jupiter.vy, jMass, 0.00121, 'Amaltea', 'MOON', 1.05e-15, 0xAA7755));
      list.push(orbitAround(jupiter.x, jupiter.y, jupiter.vx, jupiter.vy, jMass, 0.00086, 'Tebe', 'MOON', 3.8e-16, 0x998866));
      list.push(orbitAround(jupiter.x, jupiter.y, jupiter.vx, jupiter.vy, jMass, 0.0777, 'Himalia', 'MOON', 3.38e-15, 0x776655));

      // --- Saturno + lunas ---
      const sA = 9.537;
      const sAngle = Math.random() * Math.PI * 2;
      const sV = orbitalVelocity(1.0, sA);
      const sMass = 2.858e-4;
      const saturn = new CelestialBody({ name: 'Saturno', type: 'GAS_GIANT', mass: sMass,
        x: sA * Math.cos(sAngle), y: sA * Math.sin(sAngle),
        vx: -sV * Math.sin(sAngle), vy: sV * Math.cos(sAngle), color: 0xDAA520 });
      list.push(saturn);
      list.push(orbitAround(saturn.x, saturn.y, saturn.vx, saturn.vy, sMass, 0.00817, 'Titán', 'MOON', 6.76e-8, 0xF4A460));
      list.push(orbitAround(saturn.x, saturn.y, saturn.vx, saturn.vy, sMass, 0.00252, 'Encélado', 'MOON', 5.43e-14, 0xEEFFFF));
      list.push(orbitAround(saturn.x, saturn.y, saturn.vx, saturn.vy, sMass, 0.00159, 'Mimas', 'MOON', 1.88e-14, 0xCCCCCC));
      list.push(orbitAround(saturn.x, saturn.y, saturn.vx, saturn.vy, sMass, 0.00200, 'Tetis', 'MOON', 3.11e-13, 0xDDDDCC));
      list.push(orbitAround(saturn.x, saturn.y, saturn.vx, saturn.vy, sMass, 0.00252, 'Dione', 'MOON', 5.51e-13, 0xCCCCBB));
      list.push(orbitAround(saturn.x, saturn.y, saturn.vx, saturn.vy, sMass, 0.00354, 'Rea', 'MOON', 1.16e-12, 0xBBBBAA));
      list.push(orbitAround(saturn.x, saturn.y, saturn.vx, saturn.vy, sMass, 0.02380, 'Jápeto', 'MOON', 9.05e-13, 0x554433));
      list.push(orbitAround(saturn.x, saturn.y, saturn.vx, saturn.vy, sMass, 0.01230, 'Hiperión', 'MOON', 2.8e-15, 0xAA8866));
      list.push(orbitAround(saturn.x, saturn.y, saturn.vx, saturn.vy, sMass, 0.00094, 'Anillo Int.', 'ASTEROID', 1e-18, 0xDDCCAA));

      // --- Urano + lunas ---
      const uA = 19.191;
      const uAngle = Math.random() * Math.PI * 2;
      const uV = orbitalVelocity(1.0, uA);
      const uMass = 4.366e-5;
      const uranus = new CelestialBody({ name: 'Urano', type: 'GAS_GIANT', mass: uMass,
        x: uA * Math.cos(uAngle), y: uA * Math.sin(uAngle),
        vx: -uV * Math.sin(uAngle), vy: uV * Math.cos(uAngle), color: 0x88CCFF });
      list.push(uranus);
      list.push(orbitAround(uranus.x, uranus.y, uranus.vx, uranus.vy, uMass, 0.00178, 'Miranda', 'MOON', 3.3e-14, 0xBBBBBB));
      list.push(orbitAround(uranus.x, uranus.y, uranus.vx, uranus.vy, uMass, 0.00256, 'Ariel', 'MOON', 6.8e-13, 0xCCCCCC));
      list.push(orbitAround(uranus.x, uranus.y, uranus.vx, uranus.vy, uMass, 0.00355, 'Umbriel', 'MOON', 5.9e-13, 0x888888));
      list.push(orbitAround(uranus.x, uranus.y, uranus.vx, uranus.vy, uMass, 0.00583, 'Titania', 'MOON', 1.77e-12, 0xAABBCC));
      list.push(orbitAround(uranus.x, uranus.y, uranus.vx, uranus.vy, uMass, 0.00776, 'Oberón', 'MOON', 1.53e-12, 0x99AABB));

      // --- Neptuno + lunas ---
      const nA = 30.069;
      const nAngle = Math.random() * Math.PI * 2;
      const nV = orbitalVelocity(1.0, nA);
      const nMass = 5.151e-5;
      const neptune = new CelestialBody({ name: 'Neptuno', type: 'GAS_GIANT', mass: nMass,
        x: nA * Math.cos(nAngle), y: nA * Math.sin(nAngle),
        vx: -nV * Math.sin(nAngle), vy: nV * Math.cos(nAngle), color: 0x4466FF });
      list.push(neptune);
      list.push(orbitAround(neptune.x, neptune.y, neptune.vx, neptune.vy, nMass, 0.00237, 'Tritón', 'MOON', 1.08e-8, 0xCCDDEE));
      list.push(orbitAround(neptune.x, neptune.y, neptune.vx, neptune.vy, nMass, 0.02341, 'Nereida', 'MOON', 1.55e-14, 0xAAAA99));
      list.push(orbitAround(neptune.x, neptune.y, neptune.vx, neptune.vy, nMass, 0.00032, 'Proteo', 'MOON', 2.5e-14, 0x999999));

      // ═══════════════════ PLANETAS ENANOS ═══════════════════

      // Ceres (cinturón de asteroides)
      const ceresA = 2.77;
      const ceresAngle = Math.random() * Math.PI * 2;
      const ceresV = orbitalVelocity(1.0, ceresA);
      list.push(new CelestialBody({ name: 'Ceres', type: 'ASTEROID', mass: 4.73e-10,
        x: ceresA * Math.cos(ceresAngle), y: ceresA * Math.sin(ceresAngle),
        vx: -ceresV * Math.sin(ceresAngle), vy: ceresV * Math.cos(ceresAngle), color: 0xBBAA99 }));

      // Plutón + Caronte
      const plA = 39.48;
      const plAngle = Math.random() * Math.PI * 2;
      const plV = orbitalVelocity(1.0, plA);
      const plMass = 6.58e-9;
      const pluto = new CelestialBody({ name: 'Plutón', type: 'ASTEROID', mass: plMass,
        x: plA * Math.cos(plAngle), y: plA * Math.sin(plAngle),
        vx: -plV * Math.sin(plAngle), vy: plV * Math.cos(plAngle), color: 0xDDBBAA });
      list.push(pluto);
      list.push(orbitAround(pluto.x, pluto.y, pluto.vx, pluto.vy, plMass, 0.000131, 'Caronte', 'MOON', 8.06e-10, 0xAAAAAA));
      list.push(orbitAround(pluto.x, pluto.y, pluto.vx, pluto.vy, plMass, 0.000323, 'Nix', 'MOON', 2.26e-14, 0x999999));
      list.push(orbitAround(pluto.x, pluto.y, pluto.vx, pluto.vy, plMass, 0.000391, 'Hidra', 'MOON', 2.5e-14, 0x888888));

      // Eris
      const erisA = 67.78;
      const erisAngle = Math.random() * Math.PI * 2;
      const erisV = orbitalVelocity(1.0, erisA);
      const erisMass = 8.4e-9;
      const eris = new CelestialBody({ name: 'Eris', type: 'ASTEROID', mass: erisMass,
        x: erisA * Math.cos(erisAngle), y: erisA * Math.sin(erisAngle),
        vx: -erisV * Math.sin(erisAngle), vy: erisV * Math.cos(erisAngle), color: 0xEEDDCC });
      list.push(eris);
      list.push(orbitAround(eris.x, eris.y, eris.vx, eris.vy, erisMass, 0.000249, 'Disnomia', 'MOON', 4e-11, 0xAAAA99));

      // Haumea
      const hauA = 43.13;
      const hauAngle = Math.random() * Math.PI * 2;
      const hauV = orbitalVelocity(1.0, hauA);
      list.push(new CelestialBody({ name: 'Haumea', type: 'ASTEROID', mass: 2.02e-9,
        x: hauA * Math.cos(hauAngle), y: hauA * Math.sin(hauAngle),
        vx: -hauV * Math.sin(hauAngle), vy: hauV * Math.cos(hauAngle), color: 0xDDDDCC }));

      // Makemake
      const makA = 45.79;
      const makAngle = Math.random() * Math.PI * 2;
      const makV = orbitalVelocity(1.0, makA);
      list.push(new CelestialBody({ name: 'Makemake', type: 'ASTEROID', mass: 1.6e-9,
        x: makA * Math.cos(makAngle), y: makA * Math.sin(makAngle),
        vx: -makV * Math.sin(makAngle), vy: makV * Math.cos(makAngle), color: 0xCC9977 }));

      // Sedna
      const sedA = 506;
      const sedAngle = Math.random() * Math.PI * 2;
      const sedV = orbitalVelocity(1.0, sedA);
      list.push(new CelestialBody({ name: 'Sedna', type: 'ASTEROID', mass: 5e-10,
        x: sedA * Math.cos(sedAngle), y: sedA * Math.sin(sedAngle),
        vx: -sedV * Math.sin(sedAngle), vy: sedV * Math.cos(sedAngle), color: 0xFF6644 }));

      // ═══════════════════ CINTURÓN DE ASTEROIDES ═══════════════════

      // Named asteroids
      const namedAsteroids = [
        ['Vesta',    2.362, 1.33e-10, 0xBBBBAA],
        ['Palas',    2.773, 1.06e-10, 0xAAAA99],
        ['Higia',    3.142, 4.43e-11, 0x998877],
        ['Juno',     2.670, 1.43e-11, 0xAA9977],
        ['Davida',   3.164, 1.9e-11,  0x887766],
        ['Interamnia', 3.064, 1.9e-11, 0x776655],
        ['Europa (ast.)', 3.095, 1.1e-11, 0x998888],
        ['Eunomia',  2.644, 1.6e-11,  0xAA9966],
        ['Psique',   2.921, 1.1e-11,  0xCCBBAA],
        ['Eros',     1.458, 3.37e-15, 0xBB9977],
        ['Itokawa',  1.324, 1.76e-20, 0xAA8866],
        ['Bennu',    1.126, 3.92e-20, 0x665544],
        ['Apophis',  0.922, 1.35e-17, 0x887766],
      ];
      for (const [name, a, mass, color] of namedAsteroids) {
        const angle = Math.random() * Math.PI * 2;
        const v = orbitalVelocity(1.0, a);
        list.push(new CelestialBody({ name, type: 'ASTEROID', mass,
          x: a * Math.cos(angle), y: a * Math.sin(angle),
          vx: -v * Math.sin(angle), vy: v * Math.cos(angle), color }));
      }

      // Random main belt asteroids
      for (let i = 0; i < 30; i++) {
        const a = 2.1 + Math.random() * 1.2; // 2.1 - 3.3 AU
        const angle = Math.random() * Math.PI * 2;
        const v = orbitalVelocity(1.0, a);
        list.push(new CelestialBody({
          name: `Ast-${i+1}`, type: 'ASTEROID', mass: 1e-15 + Math.random() * 1e-12,
          x: a * Math.cos(angle), y: a * Math.sin(angle),
          vx: -v * Math.sin(angle), vy: v * Math.cos(angle),
          color: 0x776655,
        }));
      }

      // ═══════════════════ COMETAS ═══════════════════

      const comets = [
        ['Halley',      17.83, 0xCCFFCC],
        ['Hale-Bopp',   186,   0xAAFFDD],
        ['Encke',       2.22,  0xBBDDBB],
        ['Tempel 1',    3.13,  0x99BB99],
        ['Churyumov',   3.46,  0x88AA88],
        ['Swift-Tuttle', 26.09, 0xAADDCC],
        ['Borrelly',    3.61,  0x77AA77],
        ['Neowise',     357,   0xCCEEFF],
      ];
      for (const [name, a, color] of comets) {
        const angle = Math.random() * Math.PI * 2;
        const v = orbitalVelocity(1.0, a);
        // Give comets slightly eccentric velocities
        const eccFactor = 0.7 + Math.random() * 0.3;
        list.push(new CelestialBody({ name, type: 'ASTEROID', mass: 1e-18,
          x: a * Math.cos(angle), y: a * Math.sin(angle),
          vx: -v * Math.sin(angle) * eccFactor, vy: v * Math.cos(angle) * eccFactor,
          color }));
      }

      // ═══════════════════ CINTURÓN DE KUIPER ═══════════════════

      const kbos = [
        ['Quaoar',   43.4,  7.1e-10,  0xBB8866],
        ['Orcus',    39.17, 3.2e-10,  0xAA9988],
        ['Varuna',   43.13, 1.55e-10, 0x997766],
        ['Ixión',    39.68, 1.5e-10,  0x886655],
        ['Gonggong', 67.33, 8.8e-10,  0xCC7755],
      ];
      for (const [name, a, mass, color] of kbos) {
        const angle = Math.random() * Math.PI * 2;
        const v = orbitalVelocity(1.0, a);
        list.push(new CelestialBody({ name, type: 'ASTEROID', mass,
          x: a * Math.cos(angle), y: a * Math.sin(angle),
          vx: -v * Math.sin(angle), vy: v * Math.cos(angle), color }));
      }

      // Random Kuiper belt objects
      for (let i = 0; i < 20; i++) {
        const a = 30 + Math.random() * 25; // 30-55 AU
        const angle = Math.random() * Math.PI * 2;
        const v = orbitalVelocity(1.0, a);
        list.push(new CelestialBody({
          name: `KBO-${i+1}`, type: 'ASTEROID', mass: 1e-12 + Math.random() * 1e-10,
          x: a * Math.cos(angle), y: a * Math.sin(angle),
          vx: -v * Math.sin(angle), vy: v * Math.cos(angle),
          color: 0x665544,
        }));
      }

      // ═══════════════════ OBJETOS EXTERIORES / NUBE DE OORT ═══════════════════

      // Inner Oort Cloud objects
      const oortInner = [
        ['Oort-α', 1000, 0x443344],
        ['Oort-β', 1500, 0x444433],
        ['Oort-γ', 2000, 0x334444],
        ['Oort-δ', 2800, 0x443355],
        ['Oort-ε', 3500, 0x335544],
        ['Oort-ζ', 4200, 0x554433],
      ];
      for (const [name, a, color] of oortInner) {
        const angle = Math.random() * Math.PI * 2;
        const v = orbitalVelocity(1.0, a);
        list.push(new CelestialBody({ name, type: 'ASTEROID', mass: 1e-14,
          x: a * Math.cos(angle), y: a * Math.sin(angle),
          vx: -v * Math.sin(angle), vy: v * Math.cos(angle), color }));
      }

      return list;
    },
  },
  // ── Átomo de Hidrógeno ──────────────────────────────────────
  hydrogen: {
    name: 'Átomo de Hidrógeno',
    description: 'Un protón en el centro y un electrón orbitando a alta velocidad.',
    mode: 'ATOMIC',
    timeScale: 0.02,
    zoom: 1500,
    coulombK: 10.0,
    strongK: 40.0,
    strongRange: 2.0,
    temperature: 0.0,
    bodies: () => [
      new CelestialBody({ name: 'Protón', type: 'PROTON', mass: 1.0, charge: 1.0, x: 0, y: 0, vx: 0, vy: 0 }),
      new CelestialBody({ name: 'Electrón', type: 'ELECTRON', mass: 0.00054, charge: -1.0, x: 0, y: 5.0, vx: -60.8, vy: 0 })
    ]
  },

  // ── Átomo de Helio ──────────────────────────────────────────
  helium: {
    name: 'Átomo de Helio',
    description: 'Un núcleo estable de 2 protones y 2 neutrones orbitado por 2 electrones.',
    mode: 'ATOMIC',
    timeScale: 0.02,
    zoom: 1200,
    coulombK: 10.0,
    strongK: 40.0,
    strongRange: 2.0,
    temperature: 0.0,
    bodies: () => [
      new CelestialBody({ name: 'P1', type: 'PROTON', mass: 1.0, charge: 1.0, x: -0.4, y: 0.4 }),
      new CelestialBody({ name: 'P2', type: 'PROTON', mass: 1.0, charge: 1.0, x: 0.4, y: -0.4 }),
      new CelestialBody({ name: 'N1', type: 'NEUTRON', mass: 1.0, charge: 0.0, x: 0.4, y: 0.4 }),
      new CelestialBody({ name: 'N2', type: 'NEUTRON', mass: 1.0, charge: 0.0, x: -0.4, y: -0.4 }),
      new CelestialBody({ name: 'e1', type: 'ELECTRON', mass: 0.00054, charge: -1.0, x: 0, y: 6.0, vx: -78.6, vy: 0 }),
      new CelestialBody({ name: 'e2', type: 'ELECTRON', mass: 0.00054, charge: -1.0, x: 0, y: -7.0, vx: 72.8, vy: 0 })
    ]
  },

  // ── Molécula de Hidrógeno ───────────────────────────────────
  hydrogenMolecule: {
    name: 'Molécula de Hidrógeno (H₂)',
    description: 'Enlace covalente: dos protones comparten dos electrones en órbitas cruzadas.',
    mode: 'ATOMIC',
    timeScale: 0.02,
    zoom: 1000,
    coulombK: 10.0,
    strongK: 40.0,
    strongRange: 2.0,
    temperature: 0.0,
    bodies: () => [
      new CelestialBody({ name: 'Protón A', type: 'PROTON', mass: 1.0, charge: 1.0, x: -4.0, y: 0 }),
      new CelestialBody({ name: 'Protón B', type: 'PROTON', mass: 1.0, charge: 1.0, x: 4.0, y: 0 }),
      new CelestialBody({ name: 'Electrón 1', type: 'ELECTRON', mass: 0.00054, charge: -1.0, x: 0, y: 3.5, vx: -18.0, vy: 0 }),
      new CelestialBody({ name: 'Electrón 2', type: 'ELECTRON', mass: 0.00054, charge: -1.0, x: 0, y: -3.5, vx: 18.0, vy: 0 })
    ]
  },

  // ── Fusión Nuclear ──────────────────────────────────────────
  nuclearFusion: {
    name: 'Fusión Nuclear (D + T)',
    description: 'Colisión a alta velocidad de Deuterio y Tritio para vencer la barrera de Coulomb y fusionarse.',
    mode: 'ATOMIC',
    timeScale: 0.02,
    zoom: 600,
    coulombK: 8.0,
    strongK: 45.0,
    strongRange: 2.5,
    temperature: 1.0,
    bodies: () => [
      new CelestialBody({ name: 'P (Deuterio)', type: 'PROTON', mass: 1.0, charge: 1.0, x: -16.0, y: -0.2, vx: 65.0, vy: 0 }),
      new CelestialBody({ name: 'N (Deuterio)', type: 'NEUTRON', mass: 1.0, charge: 0.0, x: -17.0, y: 0.2, vx: 65.0, vy: 0 }),
      new CelestialBody({ name: 'P (Tritio)', type: 'PROTON', mass: 1.0, charge: 1.0, x: 16.0, y: 0.2, vx: -65.0, vy: 0 }),
      new CelestialBody({ name: 'N1 (Tritio)', type: 'NEUTRON', mass: 1.0, charge: 0.0, x: 17.2, y: -0.3, vx: -65.0, vy: 0 }),
      new CelestialBody({ name: 'N2 (Tritio)', type: 'NEUTRON', mass: 1.0, charge: 0.0, x: 17.5, y: 0.4, vx: -65.0, vy: 0 })
    ]
  },

  // ── Plasma de Quarks-Gluones ─────────────────────────────────
  quarkPlasma: {
    name: 'Plasma de Quarks',
    description: 'Una sopa caótica hipercaliente de quarks Up y Down moviéndose libremente.',
    mode: 'ATOMIC',
    timeScale: 0.05,
    zoom: 800,
    coulombK: 10.0,
    strongK: 35.0,
    strongRange: 3.0,
    temperature: 45.0,
    bodies: () => {
      const list = [];
      for (let i = 0; i < 12; i++) {
        const angle = Math.random() * Math.PI * 2;
        const r = Math.random() * 8.0;
        const speed = 10.0 + Math.random() * 20.0;
        list.push(new CelestialBody({
          name: `Quark Up`, type: 'QUARK_UP', mass: 0.002, charge: 0.667,
          x: r * Math.cos(angle), y: r * Math.sin(angle),
          vx: -speed * Math.sin(angle), vy: speed * Math.cos(angle)
        }));
      }
      for (let i = 0; i < 12; i++) {
        const angle = Math.random() * Math.PI * 2;
        const r = Math.random() * 8.0;
        const speed = 10.0 + Math.random() * 20.0;
        list.push(new CelestialBody({
          name: `Quark Down`, type: 'QUARK_DOWN', mass: 0.005, charge: -0.333,
          x: r * Math.cos(angle), y: r * Math.sin(angle),
          vx: -speed * Math.sin(angle), vy: speed * Math.cos(angle)
        }));
      }
      for (let i = 0; i < 6; i++) {
        const angle = Math.random() * Math.PI * 2;
        const r = Math.random() * 8.0;
        const speed = 40.0 + Math.random() * 30.0;
        list.push(new CelestialBody({
          name: `Neutrino`, type: 'NEUTRINO', mass: 1e-6, charge: 0.0,
          x: r * Math.cos(angle), y: r * Math.sin(angle),
          vx: -speed * Math.sin(angle), vy: speed * Math.cos(angle)
        }));
      }
      return list;
    }
  },

  // ── Espacio Vacío ────────────────────────────────────────────
  empty: {
    name: 'Espacio Vacío',
    description: 'Canvas en blanco. Agrega tus propios objetos.',
    timeScale: 86400 * 365,
    zoom: 100,
    bodies: () => [],
  },
};

// Scenario Lists for Cosmic and Atomic modes
const COSMIC_SCENARIOS = [
  'solarSystem',
  'earthMoon',
  'binaryStars',
  'blackHole',
  'asteroidImpact',
  'slingshot',
  'chaos',
  'figure8',
  'rogueStar',
  'galaxyCollision',
  'hereYouAre',
  'empty'
];

const ATOMIC_SCENARIOS = [
  'hydrogen',
  'helium',
  'hydrogenMolecule',
  'nuclearFusion',
  'quarkPlasma',
  'empty'
];
