import { BiomeId, WATER_LEVEL, WORLD_PLAY_RADIUS } from './types';

export interface MountainLandmark {
  id: string;
  tier: number;
  name: string;
  region: string;
  x: number;
  z: number;
  radius: number;
  accentHex: number;
  xpReward: number;
}

export interface MountainLake {
  nameAlpine: string;
  nameJungle: string;
  x: number;
  z: number;
  radius: number;
  depth: number;
}

export const WORLD_LAKES: MountainLake[] = [
  {
    nameAlpine: 'Glacial Lake',
    nameJungle: 'Emerald Lagoon',
    x: 34,
    z: 28,
    radius: 15,
    depth: 9.8,
  },
  {
    nameAlpine: 'Sapphire Tarn',
    nameJungle: 'Jade Mirror Basin',
    x: -98,
    z: 66,
    radius: 17,
    depth: 10.5,
  },
];

/**
 * Twelve monumental climbable Trial Peaks spiraling outward across the massive 480-unit continent,
 * culminating at Tier 12: Crown of Humanity at the soaring northern roof of the world.
 */
export const WORLD_LANDMARKS: MountainLandmark[] = [
  {
    id: 'whispering-foothill',
    tier: 1,
    name: 'Whispering Foothill',
    region: 'Inner Foothills',
    x: 0,
    z: -48,
    radius: 10.5,
    accentHex: 0x5ef2a8,
    xpReward: 260,
  },
  {
    id: 'pinecrest-lookout',
    tier: 2,
    name: 'Pinecrest Lookout',
    region: 'Eastern Timberline',
    x: 66,
    z: -24,
    radius: 10.5,
    accentHex: 0x7be0ff,
    xpReward: 360,
  },
  {
    id: 'emerald-tarn-ridge',
    tier: 3,
    name: 'Tarn Overlook',
    region: 'Basin Rim',
    x: 64,
    z: 64,
    radius: 10.5,
    accentHex: 0x38bdf8,
    xpReward: 480,
  },
  {
    id: 'misty-pass',
    tier: 4,
    name: 'Misty Highland Pass',
    region: 'Cloudstep Valley',
    x: -64,
    z: 58,
    radius: 10.5,
    accentHex: 0xc084fc,
    xpReward: 620,
  },
  {
    id: 'ironback-ridge',
    tier: 5,
    name: 'Ironback Crag',
    region: 'Western Escarpment',
    x: -84,
    z: -38,
    radius: 11.0,
    accentHex: 0x4ade80,
    xpReward: 780,
  },
  {
    id: 'grand-glacier',
    tier: 6,
    name: 'Grand Glacier Peak',
    region: 'Northern Icefield',
    x: -4,
    z: -122,
    radius: 11.5,
    accentHex: 0x7dd3fc,
    xpReward: 980,
  },
  {
    id: 'sunstone-citadel',
    tier: 7,
    name: 'Sunstone Citadel',
    region: 'Golden High-Mesa',
    x: 138,
    z: -74,
    radius: 11.5,
    accentHex: 0xfbbf24,
    xpReward: 1220,
  },
  {
    id: 'sapphire-abyss',
    tier: 8,
    name: 'Thunderhorn Spire',
    region: 'Eastern Colossi',
    x: 152,
    z: 82,
    radius: 11.5,
    accentHex: 0xf97316,
    xpReward: 1500,
  },
  {
    id: 'obsidian-saddle',
    tier: 9,
    name: 'Obsidian Saddle',
    region: 'Southern Abyss',
    x: 10,
    z: 164,
    radius: 12.0,
    accentHex: 0xf43f5e,
    xpReward: 1850,
  },
  {
    id: 'frostfang-bastion',
    tier: 10,
    name: 'Frostfang Bastion',
    region: 'SW Frozen Peaks',
    x: -156,
    z: 96,
    radius: 12.0,
    accentHex: 0xa78bfa,
    xpReward: 2250,
  },
  {
    id: 'dragonspine-spire',
    tier: 11,
    name: 'Dragonspine Spire',
    region: 'NW Stormwall',
    x: -154,
    z: -98,
    radius: 12.5,
    accentHex: 0x2dd4bf,
    xpReward: 2750,
  },
  {
    id: 'crown-of-humanity',
    tier: 12,
    name: 'Crown of Humanity',
    region: 'Roof of the World',
    x: 0,
    z: -206,
    radius: 14.0,
    accentHex: 0xffe066,
    xpReward: 3800,
  },
];

function gaussian(dx: number, dz: number, radius: number, height: number): number {
  const d2 = dx * dx + dz * dz;
  const r2 = radius * radius;
  return height * Math.exp(-d2 / (2 * r2));
}

function ridge(x: number, z: number, freq: number, amp: number): number {
  const n = Math.sin(x * freq) * Math.cos(z * freq * 0.91);
  return (1 - Math.abs(n)) * amp;
}

/**
 * Massive continuous 3D mountain continent heightfield (480-unit playable diameter, 680-unit mesh).
 * Elevates dramatically from the central foothills outward toward the 12 soaring Trial Peaks
 * and the colossal 66-unit-tall Crown of Humanity in the far north.
 */
export function terrainHeightAt(x: number, z: number, biome: BiomeId): number {
  const scale = biome === 'jungle' ? 0.88 : 1.0;

  let h = 2.8;

  // --- Inner Ring Peaks (Tiers 1-5) ---
  h += gaussian(x - 0, z + 48, 22, 22.0 * scale); // Whispering Foothill
  h += gaussian(x - 66, z + 24, 24, 26.0 * scale); // Pinecrest Lookout
  h += gaussian(x - 64, z - 64, 24, 27.5 * scale); // Tarn Overlook
  h += gaussian(x + 64, z - 58, 25, 25.5 * scale); // Misty Highland Pass
  h += gaussian(x + 84, z + 38, 25, 30.0 * scale); // Ironback Crag

  // --- Mid & Outer Colossal Mountain Peaks (Tiers 6-11) ---
  h += gaussian(x + 4, z + 122, 30, 40.5 * scale); // Grand Glacier Peak
  h += gaussian(x - 138, z + 74, 32, 43.0 * scale); // Sunstone Citadel
  h += gaussian(x - 152, z - 82, 33, 45.5 * scale); // Thunderhorn Spire
  h += gaussian(x - 10, z - 164, 34, 44.0 * scale); // Obsidian Saddle
  h += gaussian(x + 156, z - 96, 34, 47.0 * scale); // Frostfang Bastion
  h += gaussian(x + 154, z + 98, 35, 51.0 * scale); // Dragonspine Spire

  // --- Tier 12 Final Monumental Summit: Crown of Humanity ---
  h += gaussian(x - 0, z + 206, 40, 62.0 * scale);

  // --- Connecting High-Altitude Mountain Saddles & Traversable Passes ---
  h += gaussian(x - 36, z + 36, 18, 11.5 * scale);
  h += gaussian(x + 42, z + 38, 19, 12.5 * scale);
  h += gaussian(x - 74, z + 96, 26, 18.0 * scale);
  h += gaussian(x + 78, z + 104, 26, 19.0 * scale);
  h += gaussian(x - 106, z - 10, 24, 15.5 * scale);
  h += gaussian(x + 114, z - 12, 24, 16.5 * scale);
  h += gaussian(x - 84, z - 124, 28, 18.5 * scale);
  h += gaussian(x + 84, z - 126, 28, 19.5 * scale);
  h += gaussian(x - 2, z + 162, 24, 26.0 * scale); // High sky-bridge saddle to Crown of Humanity!

  // --- Multi-octave continental mountain topography ---
  h += Math.sin(x * 0.032 + 0.4) * Math.cos(z * 0.03 - 0.3) * 5.2 * scale;
  h += Math.sin((x - z) * 0.055) * 2.4 * scale;
  h += ridge(x + 16, z - 11, 0.036, 3.6 * scale);
  h += Math.cos(x * 0.11 - z * 0.095) * 0.85;

  // --- Gentle starting meadow around (0, 0) looking straight up at Whispering Foothill & Crown of Humanity ---
  const spawnDist = Math.hypot(x, z);
  const spawnBlend = Math.exp(-(spawnDist * spawnDist) / (2 * 14 * 14));
  h = h * (1 - spawnBlend * 0.58) + 3.2 * (spawnBlend * 0.58);

  // --- Two scenic glacial/lagoon basins ---
  for (const lake of WORLD_LAKES) {
    h -= gaussian(x - lake.x, z - lake.z, lake.radius * 0.82, lake.depth);
  }
  // Small rocky islet near first lake shore
  h += gaussian(x - 20, z - 22, 6.2, 3.4);

  // --- Colossal Outer Himalayan Rim enclosing the 480-unit continent ---
  const radial = Math.hypot(x, z);
  if (radial > WORLD_PLAY_RADIUS - 8) {
    const t = Math.max(0, (radial - (WORLD_PLAY_RADIUS - 8)) / 38);
    const crag = 1 + 0.3 * Math.sin(Math.atan2(z, x) * 15 + radial * 0.09);
    h += Math.pow(t, 1.8) * 76 * crag;
  }

  return h;
}

/**
 * Finite-difference unit surface normal at (x, z).
 */
export function terrainNormalAt(
  x: number,
  z: number,
  biome: BiomeId,
  out?: { x: number; y: number; z: number },
): { x: number; y: number; z: number } {
  const eps = 0.65;
  const hL = terrainHeightAt(x - eps, z, biome);
  const hR = terrainHeightAt(x + eps, z, biome);
  const hD = terrainHeightAt(x, z - eps, biome);
  const hU = terrainHeightAt(x, z + eps, biome);

  const nx = hL - hR;
  const ny = 2 * eps;
  const nz = hD - hU;
  const invLen = 1 / Math.hypot(nx, ny, nz);

  if (out) {
    out.x = nx * invLen;
    out.y = ny * invLen;
    out.z = nz * invLen;
    return out;
  }
  return { x: nx * invLen, y: ny * invLen, z: nz * invLen };
}

/**
 * Steepest downhill 2D vector.
 */
export function terrainDownhillGradient(
  x: number,
  z: number,
  biome: BiomeId,
): { gx: number; gz: number; steepness: number } {
  const eps = 0.8;
  const dhdx = (terrainHeightAt(x + eps, z, biome) - terrainHeightAt(x - eps, z, biome)) / (2 * eps);
  const dhdz = (terrainHeightAt(x, z + eps, biome) - terrainHeightAt(x, z - eps, biome)) / (2 * eps);
  const steepness = Math.hypot(dhdx, dhdz);
  return { gx: -dhdx, gz: -dhdz, steepness };
}

export function isDeepWater(x: number, z: number, biome: BiomeId): boolean {
  return terrainHeightAt(x, z, biome) < WATER_LEVEL - 0.55;
}

export function isInWorldBounds(x: number, z: number): boolean {
  return Math.hypot(x, z) <= WORLD_PLAY_RADIUS;
}

export function isNearSpawn(x: number, z: number, radius = 10.5): boolean {
  return Math.hypot(x, z) < radius;
}

export function getZoneNameAt(x: number, z: number, biome: BiomeId): string {
  for (const lm of WORLD_LANDMARKS) {
    if (Math.hypot(x - lm.x, z - lm.z) < lm.radius + 10) {
      return lm.name;
    }
  }
  for (const lake of WORLD_LAKES) {
    if (Math.hypot(x - lake.x, z - lake.z) < lake.radius + 6) {
      return biome === 'jungle' ? lake.nameJungle : lake.nameAlpine;
    }
  }
  const h = terrainHeightAt(x, z, biome);
  if (h > 44) return biome === 'jungle' ? 'Celestial Cloudpeaks' : 'Roof of the World';
  if (h > 28) return biome === 'jungle' ? 'Emerald Sky-Canopy' : 'Alpine Glacier Zone';
  if (h > 14) return biome === 'jungle' ? 'Highland Ridges' : 'High Mountain Pass';
  return biome === 'jungle' ? 'Emerald Foothills' : 'Pine Valley Foothills';
}
