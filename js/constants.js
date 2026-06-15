// ============================================================
// PHYSICAL CONSTANTS
// ============================================================

// Gravitational constant (m^3 kg^-1 s^-2)
const G_REAL = 6.674e-11;

// Simulation uses "AU units" internally for numerical stability
// 1 AU = 1.496e11 meters
// Masses in Solar Mass units (1 Msun = 1.989e30 kg)
// Time in seconds

// Scaled G for AU / Solar Mass / seconds
// G_sim = G_REAL * Msun / AU^3 * s^2
const AU = 1.496e11;      // meters per AU
const MSUN = 1.989e30;    // kg per solar mass
const G_SIM = (G_REAL * MSUN) / (AU * AU * AU); // ~4.302e-3 AU^3 / (Msun * yr^2)

// For display: convert AU to km
const AU_TO_KM = 1.496e8; // 1 AU = 149,600,000 km

// Body type definitions
const BODY_TYPES = {
  STAR:         { label: 'Estrella',       minMass: 0.08,   maxMass: 150,    color: 0xFFD060, glow: true  },
  PLANET:       { label: 'Planeta',        minMass: 1e-7,   maxMass: 0.01,   color: 0x4488FF, glow: false },
  GAS_GIANT:    { label: 'Gigante Gaseoso',minMass: 3e-4,   maxMass: 0.01,   color: 0xF4A460, glow: false },
  MOON:         { label: 'Luna',           minMass: 1e-9,   maxMass: 1e-5,   color: 0xAAAAAA, glow: false },
  ASTEROID:     { label: 'Asteroide',      minMass: 1e-15,  maxMass: 1e-9,   color: 0x887766, glow: false },
  BLACK_HOLE:   { label: 'Agujero Negro',  minMass: 1,      maxMass: 1e9,    color: 0x220033, glow: true  },
  NEUTRON_STAR: { label: 'Estrella de Neutrones', minMass: 1, maxMass: 3,   color: 0x88FFFF, glow: true  },
};

// Visual radii for rendering (NOT physical — just for display)
// Physical radius in AU is impractically small, so we use visual scaling
const VISUAL_RADIUS = {
  STAR:         { base: 18, massExp: 0.3 },
  PLANET:       { base: 8,  massExp: 0.2 },
  GAS_GIANT:    { base: 12, massExp: 0.25 },
  MOON:         { base: 4,  massExp: 0.15 },
  ASTEROID:     { base: 3,  massExp: 0.1  },
  BLACK_HOLE:   { base: 14, massExp: 0.2  },
  NEUTRON_STAR: { base: 6,  massExp: 0.1  },
};

// Color palettes for each type
const BODY_COLORS = {
  STAR:         [0xFFFF88, 0xFFDD44, 0xFF8822, 0xFFFFCC, 0x88CCFF],
  PLANET:       [0x4488FF, 0x44CC88, 0xFF6644, 0xAA88FF, 0x66AACC],
  GAS_GIANT:    [0xF4A460, 0xDAA520, 0xCD853F, 0xD2691E, 0xB8860B],
  MOON:         [0xCCCCCC, 0xAAAAAA, 0x888888, 0xDDCCAA],
  ASTEROID:     [0x887766, 0x665544, 0x998877],
  BLACK_HOLE:   [0x220033, 0x110022, 0x440066],
  NEUTRON_STAR: [0x88FFFF, 0xAAFFFF, 0x66EEFF],
};

// Simulation defaults
const SIM_DEFAULTS = {
  timeScale: 1,         // 1 = real time (but we'll use years as unit)
  maxTrailLength: 300,  // max points in orbit trail
  softening: 0.001,     // AU softening factor to prevent singularities
  minMergeDistance: 0.8, // fraction of sum of visual radii to trigger merge
};

// Time scale options (seconds per simulation second)
const TIME_SCALES = [
  { label: '1 seg/seg',  value: 1 },
  { label: '1 minuto/seg',  value: 60 },
  { label: '1 hora/seg', value: 3600 },
  { label: '1 día/seg',  value: 86400 },
  { label: '1 mes/seg',  value: 86400 * 30 },
  { label: '1 año/seg',  value: 86400 * 365.25 },
  { label: '10 años/seg',value: 86400 * 365.25 * 10 },
  { label: '100 años/seg',value: 86400 * 365.25 * 100 },
  { label: '1000 años/seg',value: 86400 * 365.25 * 1000 },
];

// Atomic / Subatomic particle types (microcosmos)
const ATOMIC_BODY_TYPES = {
  PROTON:       { label: 'Protón',      mass: 1.0,      charge: 1.0,  color: 0xFF5533, glow: true  },
  NEUTRON:      { label: 'Neutrón',     mass: 1.0,      charge: 0.0,  color: 0x8899A6, glow: false },
  ELECTRON:     { label: 'Electrón',    mass: 0.00054,  charge: -1.0, color: 0x33FF55, glow: true  },
  QUARK_UP:     { label: 'Quark Up',    mass: 0.002,    charge: 0.667,color: 0xFF33CC, glow: false },
  QUARK_DOWN:   { label: 'Quark Down',  mass: 0.005,    charge: -0.333,color: 0x9933FF, glow: false },
  NEUTRINO:     { label: 'Neutrino',    mass: 1e-6,     charge: 0.0,  color: 0xFFFFFF, glow: false }
};

// Default constants for atomic simulation
const ATOMIC_DEFAULTS = {
  coulombK: 10.0,
  strongK: 40.0,
  strongRange: 2.0,
  temperature: 0.0,
  langevinGamma: 0.2,
};

