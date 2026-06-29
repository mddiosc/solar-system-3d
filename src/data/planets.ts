import * as THREE from 'three';

export type TextureKind = 'rocky' | 'earth' | 'gas' | 'ice' | 'mars' | 'venus' | 'mercury';

/** Real-world style facts shown in the info card. Values are approximate. */
export type BodyFacts = {
  /** Short type label, e.g. "Gas giant". */
  type: string;
  /** Mean diameter, human readable. */
  diameter: string;
  /** Number of known moons, human readable. */
  moons: string;
  /** Length of one rotation (day). */
  day: string;
  /** Length of one orbit (year). */
  year: string;
  /** Representative temperature. */
  temp: string;
  /** Descriptive note for the card. */
  note: string;
};

/** A natural satellite rendered as a child of its planet. */
export type MoonData = {
  name: string;
  label: string;
  /** Sphere radius in scene units. */
  radius: number;
  /** Orbital radius from the planet center, in scene units. */
  distance: number;
  /** Angular speed multiplier. */
  orbitSpeed: number;
  /** Base color when no texture image is provided. */
  color: number;
  /** Optional texture image path (e.g. the Moon). */
  texture?: string;
};

export type BodyData = {
  name: string;
  label: string;
  /** Sphere radius in scene units (artistic scale). */
  radius: number;
  /** Semi-major axis in scene units (artistic scale). 0 for the Sun. */
  distance: number;
  rotationSpeed: number;
  orbitSpeed: number;
  texture: TextureKind;
  colors: [number, number, number];
  /** Axial tilt in radians. */
  axialTilt: number;
  /** Orbital eccentricity (0 = circle). */
  eccentricity: number;
  hasClouds?: boolean;
  hasRings?: boolean;
  /** Natural satellites orbiting this planet. */
  moons?: MoonData[];
  facts: BodyFacts;
};

const deg = THREE.MathUtils.degToRad;

/** The Sun, kept separate because it does not orbit. */
export const SUN: BodyData = {
  name: 'Sun',
  label: 'Sun',
  radius: 4,
  distance: 0,
  rotationSpeed: 0.22,
  orbitSpeed: 0,
  texture: 'gas',
  colors: [0xfff4b0, 0xff9f1c, 0xc92a0e],
  axialTilt: deg(7.25),
  eccentricity: 0,
  facts: {
    type: 'Star',
    diameter: '1,391,000 km',
    moons: '8 planets',
    day: '~25 days (equator)',
    year: 'Center of the system',
    temp: '~5,500 °C (surface)',
    note: 'The light source and visual scale reference for the whole scene.',
  },
};

export const PLANETS: BodyData[] = [
  {
    name: 'Mercury',
    label: 'Mercury',
    radius: 0.42,
    distance: 8,
    rotationSpeed: 0.5,
    orbitSpeed: 0.82,
    texture: 'mercury',
    colors: [0x8a8178, 0xc0b7aa, 0x514a45],
    axialTilt: deg(0.03),
    eccentricity: 0.206,
    facts: {
      type: 'Rocky',
      diameter: '4,879 km',
      moons: 'None',
      day: '1,408 h',
      year: '88 days',
      temp: '−173 to 427 °C',
      note: 'Small, fast and cratered. The most eccentric orbit.',
    },
  },
  {
    name: 'Venus',
    label: 'Venus',
    radius: 0.9,
    distance: 11,
    rotationSpeed: -0.18,
    orbitSpeed: 0.62,
    texture: 'venus',
    colors: [0xd9a441, 0xffd17a, 0x8f5f24],
    axialTilt: deg(177.4),
    eccentricity: 0.007,
    hasClouds: true,
    facts: {
      type: 'Cloudy rocky',
      diameter: '12,104 km',
      moons: 'None',
      day: '5,832 h (retrograde)',
      year: '225 days',
      temp: '~464 °C',
      note: 'Dense golden atmosphere. Spins backwards and very slowly.',
    },
  },
  {
    name: 'Earth',
    label: 'Earth',
    radius: 1,
    distance: 14.5,
    rotationSpeed: 1.2,
    orbitSpeed: 0.5,
    texture: 'earth',
    colors: [0x1b5fb8, 0x2fa36b, 0xf2efe2],
    axialTilt: deg(23.4),
    eccentricity: 0.017,
    hasClouds: true,
    moons: [
      {
        name: 'Moon',
        label: 'Moon',
        radius: 0.27,
        distance: 2.8,
        orbitSpeed: 1.8,
        color: 0xb8b8b8,
        texture: '/textures/moon_1024.jpg',
      },
    ],
    facts: {
      type: 'Ocean world',
      diameter: '12,742 km',
      moons: '1 (the Moon)',
      day: '24 h',
      year: '365 days',
      temp: '~15 °C (average)',
      note: 'The only known world with liquid water and life.',
    },
  },
  {
    name: 'Mars',
    label: 'Mars',
    radius: 0.65,
    distance: 18,
    rotationSpeed: 1,
    orbitSpeed: 0.4,
    texture: 'mars',
    colors: [0xb4532a, 0xe18655, 0x5c2f24],
    axialTilt: deg(25.2),
    eccentricity: 0.093,
    facts: {
      type: 'Rocky',
      diameter: '6,779 km',
      moons: '2 (Phobos and Deimos)',
      day: '24.6 h',
      year: '687 days',
      temp: '~−63 °C (average)',
      note: 'Rust tones and polar ice caps.',
    },
  },
  {
    name: 'Jupiter',
    label: 'Jupiter',
    radius: 2.45,
    distance: 25,
    rotationSpeed: 1.7,
    orbitSpeed: 0.22,
    texture: 'gas',
    colors: [0xd8b38a, 0x9d6b45, 0xf2dfc2],
    axialTilt: deg(3.1),
    eccentricity: 0.049,
    moons: [
      { name: 'Io', label: 'Io', radius: 0.22, distance: 3.6, orbitSpeed: 2.6, color: 0xe8d98a },
      { name: 'Europa', label: 'Europa', radius: 0.2, distance: 4.4, orbitSpeed: 2, color: 0xd9c8a6 },
      { name: 'Ganymede', label: 'Ganymede', radius: 0.3, distance: 5.4, orbitSpeed: 1.5, color: 0x9a8d7a },
      { name: 'Callisto', label: 'Callisto', radius: 0.28, distance: 6.6, orbitSpeed: 1.1, color: 0x6f6256 },
    ],
    facts: {
      type: 'Gas giant',
      diameter: '139,820 km',
      moons: '95 known',
      day: '9.9 h',
      year: '11.9 years',
      temp: '~−108 °C',
      note: 'The largest planet. Turbulent bands and the Great Red Spot.',
    },
  },
  {
    name: 'Saturn',
    label: 'Saturn',
    radius: 2.05,
    distance: 33,
    rotationSpeed: 1.35,
    orbitSpeed: 0.16,
    texture: 'gas',
    colors: [0xd8c28b, 0x8f7b4f, 0xf6e6b2],
    axialTilt: deg(26.7),
    eccentricity: 0.052,
    hasRings: true,
    moons: [{ name: 'Titan', label: 'Titan', radius: 0.32, distance: 5.6, orbitSpeed: 1.2, color: 0xd9952f }],
    facts: {
      type: 'Gas giant',
      diameter: '116,460 km',
      moons: '146 known',
      day: '10.7 h',
      year: '29.5 years',
      temp: '~−138 °C',
      note: 'Famous for its system of ice and rock rings.',
    },
  },
  {
    name: 'Uranus',
    label: 'Uranus',
    radius: 1.45,
    distance: 40,
    rotationSpeed: 1.05,
    orbitSpeed: 0.11,
    texture: 'ice',
    colors: [0x7bdff2, 0xb2f7ef, 0x338ea6],
    axialTilt: deg(97.8),
    eccentricity: 0.047,
    facts: {
      type: 'Ice giant',
      diameter: '50,724 km',
      moons: '28 known',
      day: '17.2 h',
      year: '84 years',
      temp: '~−195 °C',
      note: 'Spins almost on its side: it rolls instead of spinning.',
    },
  },
  {
    name: 'Neptune',
    label: 'Neptune',
    radius: 1.42,
    distance: 47,
    rotationSpeed: 1.1,
    orbitSpeed: 0.08,
    texture: 'ice',
    colors: [0x2454d6, 0x6ea8fe, 0x122a78],
    axialTilt: deg(28.3),
    eccentricity: 0.01,
    facts: {
      type: 'Ice giant',
      diameter: '49,244 km',
      moons: '16 known',
      day: '16.1 h',
      year: '165 years',
      temp: '~−201 °C',
      note: 'The farthest and windiest, with the fastest winds in the system.',
    },
  },
];

/** Configuration for the asteroid belt between Mars and Jupiter. */
export const ASTEROID_BELT = {
  count: 1400,
  innerRadius: 20.5,
  outerRadius: 23.2,
  thickness: 0.7,
  minSize: 0.015,
  maxSize: 0.07,
};

/**
 * Extra orbital data keyed by BodyData.name. Kept separate from PLANETS so the
 * artistic layout stays untouched while the "real scale" and "by date" modes
 * read accurate numbers from here.
 * - realDistanceAu: real semi-major axis in astronomical units.
 * - periodDays: sidereal orbital period in days.
 * - meanLongitude: mean longitude at the J2000 epoch, in degrees.
 */
export type OrbitalData = {
  realDistanceAu: number;
  periodDays: number;
  meanLongitude: number;
};

export const ORBITAL_DATA: Record<string, OrbitalData> = {
  Mercury: { realDistanceAu: 0.387, periodDays: 87.969, meanLongitude: 252.25 },
  Venus: { realDistanceAu: 0.723, periodDays: 224.701, meanLongitude: 181.98 },
  Earth: { realDistanceAu: 1.0, periodDays: 365.256, meanLongitude: 100.46 },
  Mars: { realDistanceAu: 1.524, periodDays: 686.98, meanLongitude: 355.43 },
  Jupiter: { realDistanceAu: 5.203, periodDays: 4332.589, meanLongitude: 34.35 },
  Saturn: { realDistanceAu: 9.537, periodDays: 10759.22, meanLongitude: 49.94 },
  Uranus: { realDistanceAu: 19.191, periodDays: 30688.5, meanLongitude: 313.23 },
  Neptune: { realDistanceAu: 30.07, periodDays: 60182.0, meanLongitude: 304.88 },
};

/**
 * A single comet on a long, highly eccentric and inclined orbit, with a tail
 * that always points away from the Sun. Artistic scale.
 */
export const COMET = {
  name: 'Comet',
  label: 'Comet',
  radius: 0.18,
  /** Semi-major axis in scene units. */
  semiMajor: 60,
  eccentricity: 0.85,
  /** Inclination of the comet's orbital plane, in radians. */
  inclination: deg(22),
  orbitSpeed: 0.05,
  facts: {
    type: 'Comet',
    diameter: '~11 km (nucleus)',
    moons: 'None',
    day: '—',
    year: 'Highly elliptical orbit',
    temp: 'Varies with distance to the Sun',
    note: 'Its gas and dust tail always points away from the Sun.',
  } satisfies BodyFacts,
};
