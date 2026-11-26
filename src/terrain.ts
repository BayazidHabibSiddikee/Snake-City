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
  {
    nameAlpine: 'Mirror Spire Basin',
    nameJungle: 'Lotus Mist Caldera',
    x: 196,
    z: -168,
    radius: 20,
    depth: 11.2,
  },
];

/**
 * Twelve monumental climbable Trial Peaks spiraling outward across the massive 720-unit continent,
 * culminating at Tier 12: Crown of Humanity at the soaring northern roof of the world.
 */
export const WORLD_LANDMARKS: MountainLandmark[] = [
  {
    id: 'whispering-foothill',
    tier: 1,
    name: 'Whispering Foothill',
    region: 'Inner Foothills',
    x: 0,
    z: -52,
    radius: 10.5,
    accentHex: 0x5ef2a8,
    xpReward: 260,
  },
  {
    id: 'pinecrest-lookout',
    tier: 2,
    name: 'Pinecrest Lookout',
    region: 'Eastern Timberline',
    x: 78,
    z: -28,
    radius: 10.5,
    accentHex: 0x7be0ff,
    xpReward: 360,
  },
  {
    id: 'emerald-tarn-ridge',
    tier: 3,
    name: 'Tarn Overlook',
    region: 'Basin Rim',
    x: 76,
    z: 74,
    radius: 10.5,
    accentHex: 0x38bdf8,
    xpReward: 480,
  },
  {
    id: 'misty-pass',
    tier: 4,
    name: 'Misty Highland Pass',
    region: 'Cloudstep Valley',
    x: -74,
    z: 68,
    radius: 10.5,
    accentHex: 0xc084fc,
    xpReward: 620,
  },
  {
    id: 'ironback-ridge',
    tier: 5,
    name: 'Ironback Crag',
    region: 'Western Escarpment',
    x: -98,
    z: -46,
    radius: 11.0,
    accentHex: 0x4ade80,
    xpReward: 780,
  },
  {
    id: 'grand-glacier',
    tier: 6,
    name: 'Grand Glacier Peak',
    region: 'Northern Icefield',
    x: -6,
    z: -158,
    radius: 11.5,
    accentHex: 0x7dd3fc,
    xpReward: 980,
  },
  {
    id: 'sunstone-citadel',
    tier: 7,
    name: 'Sunstone Citadel',
    region: 'Golden High-Mesa',
    x: 196,
    z: -98,
    radius: 11.5,
    accentHex: 0xfbbf24,
    xpReward: 1220,
  },
  {
    id: 'sapphire-abyss',
    tier: 8,
    name: 'Thunderhorn Spire',
    region: 'Eastern Colossi',
    x: 218,
    z: 118,
    radius: 11.5,
    accentHex: 0xf97316,
    xpReward: 1500,
  },
  {
    id: 'obsidian-saddle',
    tier: 9,
    name: 'Obsidian Saddle',
    region: 'Southern Abyss',
    x: 14,
    z: 248,
    radius: 12.0,
    accentHex: 0xf43f5e,
    xpReward: 1850,
  },
  {
    id: 'frostfang-bastion',
    tier: 10,
    name: 'Frostfang Bastion',
    region: 'SW Frozen Peaks',
    x: -228,
    z: 142,
    radius: 12.0,
    accentHex: 0xa78bfa,
    xpReward: 2250,
  },
  {
    id: 'dragonspine-spire',
    tier: 11,
    name: 'Dragonspine Spire',
    region: 'NW Stormwall',
    x: -224,
    z: -144,
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
    z: -304,
    radius: 14.5,
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
 * Massive continuous 3D mountain continent heightfield (720-unit playable diameter, 960-unit mesh).
 * Elevates dramatically from the central foothills outward toward the 12 soaring Trial Peaks
 * and the colossal Crown of Humanity in the far north.
 */
export function terrainHeightAt(x: number, z: number, biome: BiomeId): number {
  const scale = biome === 'jungle' ? 0.88 : 1.0;

  let h = 2.8;

  // --- Inner Ring Peaks (Tiers 1-5) ---
  h += gaussian(x - 0, z + 52, 24, 22.0 * scale); // Whispering Foothill
  h += gaussian(x - 78, z + 28, 26, 26.5 * scale); // Pinecrest Lookout
  h += gaussian(x - 76, z - 74, 26, 28.0 * scale); // Tarn Overlook
  h += gaussian(x + 74, z - 68, 27, 26.0 * scale); // Misty Highland Pass
  h += gaussian(x + 98, z + 46, 28, 30.5 * scale); // Ironback Crag

  // --- Mid & Outer Colossal Mountain Peaks (Tiers 6-11) ---
  h += gaussian(x + 6, z + 158, 36, 41.5 * scale); // Grand Glacier Peak
  h += gaussian(x - 196, z + 98, 40, 44.5 * scale); // Sunstone Citadel
  h += gaussian(x - 218, z - 118, 42, 46.5 * scale); // Thunderhorn Spire
  h += gaussian(x - 14, z - 248, 44, 45.5 * scale); // Obsidian Saddle
  h += gaussian(x + 228, z - 142, 44, 48.5 * scale); // Frostfang Bastion
  h += gaussian(x + 224, z + 144, 45, 52.5 * scale); // Dragonspine Spire

  // --- Tier 12 Final Monumental Summit: Crown of Humanity ---
  h += gaussian(x - 0, z + 304, 52, 66.0 * scale);

  // --- Connecting High-Altitude Mountain Saddles & Outer Frontier Ridges ---
  h += gaussian(x - 40, z + 40, 20, 11.5 * scale);
  h += gaussian(x + 44, z + 42, 21, 12.5 * scale);
  h += gaussian(x - 94, z + 124, 32, 18.5 * scale);
  h += gaussian(x + 98, z + 132, 32, 19.5 * scale);
  h += gaussian(x - 142, z - 14, 30, 16.5 * scale);
  h += gaussian(x + 150, z - 16, 30, 17.5 * scale);
  h += gaussian(x - 118, z - 178, 36, 20.5 * scale);
  h += gaussian(x + 118, z - 180, 36, 21.5 * scale);
  h += gaussian(x - 2, z + 232, 32, 28.0 * scale); // High sky-bridge saddle to Crown of Humanity!
  // Outer frontier mesas for the expanded 360m world
  h += gaussian(x - 285, z + 12, 38, 28.0 * scale);
  h += gaussian(x + 285, z - 16, 38, 29.0 * scale);
  h += gaussian(x - 165, z - 245, 36, 27.0 * scale);
  h += gaussian(x + 165, z - 245, 36, 27.5 * scale);
  h += gaussian(x - 158, z + 242, 36, 31.0 * scale);
  h += gaussian(x + 158, z + 242, 36, 32.0 * scale);

  // --- Multi-octave continental mountain topography ---
  h += Math.sin(x * 0.026 + 0.4) * Math.cos(z * 0.025 - 0.3) * 5.6 * scale;
  h += Math.sin((x - z) * 0.048) * 2.5 * scale;
  h += ridge(x + 16, z - 11, 0.032, 3.8 * scale);
  h += Math.cos(x * 0.1 - z * 0.09) * 0.85;

  // --- Gentle starting meadow around (0, 0) looking straight up at Whispering Foothill & Crown of Humanity ---
  const spawnDist = Math.hypot(x, z);
  const spawnBlend = Math.exp(-(spawnDist * spawnDist) / (2 * 15 * 15));
  h = h * (1 - spawnBlend * 0.58) + 3.2 * (spawnBlend * 0.58);

  // --- Scenic glacial/lagoon basins ---
  for (const lake of WORLD_LAKES) {
    h -= gaussian(x - lake.x, z - lake.z, lake.radius * 0.82, lake.depth);
  }
  // Small rocky islet near first lake shore
  h += gaussian(x - 20, z - 22, 6.2, 3.4);

  // --- Colossal Outer Himalayan Rim enclosing the 720-unit continent ---
  const radial = Math.hypot(x, z);
  if (radial > WORLD_PLAY_RADIUS - 10) {
    const t = Math.max(0, (radial - (WORLD_PLAY_RADIUS - 10)) / 46);
    const crag = 1 + 0.3 * Math.sin(Math.atan2(z, x) * 18 + radial * 0.08);
    h += Math.pow(t, 1.8) * 84 * crag;
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
