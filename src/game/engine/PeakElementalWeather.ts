import * as THREE from 'three';
import { WORLD_LANDMARKS } from '../../terrain.ts';

/**
 * Elemental particle archetype associated with each of the 12 Trial Peaks.
 * Maps smoothly onto 4 continuous GPU shader shape weights + celestial starlight flare
 * so particles can cross-fade and morph organically as the player travels between peaks.
 */
export type PeakParticleKind =
  | 'petal'
  | 'snow'
  | 'ember'
  | 'spark'
  | 'rain_mist'
  | 'celestial';

export interface PeakElementalTheme {
  readonly landmarkId: string;
  readonly tier: number;
  readonly elementName: string;
  readonly particleKind: PeakParticleKind;
  /** Spatial Gaussian falloff radius (meters) controlling blend reach around this peak. */
  readonly influenceRadius: number;
  // Atmospheric sky & fog colors
  readonly skyHex: number;
  readonly fogHex: number;
  readonly fogDensityOffset: number;
  readonly mistTintHex: number;
  readonly exposureOffset: number;
  // 3-point & hemisphere environment lighting colors / scales
  readonly sunHex: number;
  readonly sunScale: number;
  readonly hemiSkyHex: number;
  readonly hemiGroundHex: number;
  readonly hemiScale: number;
  readonly rimHex: number;
  readonly rimScale: number;
  // Elemental particle appearance & kinematics
  readonly particleColorAHex: number;
  readonly particleColorBHex: number;
  readonly particleWindX: number;
  readonly particleVelY: number;
  readonly particleWindZ: number;
  readonly particleSize: number;
  readonly particleOpacity: number;
  readonly particleSwirl: number;
  /** Occasional ambient lightning shimmer rate (0 = none, >0 = storm peaks). */
  readonly ambientLightningRate: number;
}

/**
 * Elemental weather profiles for all 12 Trial Peaks (`WORLD_LANDMARKS`).
 * Each peak shifts sky/fog tint, directional + hemisphere + rim lighting,
 * and GPU-driven 3D elemental particles (falling petals, snowflakes, mist spray,
 * glowing volcanic embers, storm sparks, and celestial starlight).
 */
export const PEAK_ELEMENTAL_THEMES: Record<string, PeakElementalTheme> = {
  'whispering-foothill': {
    landmarkId: 'whispering-foothill',
    tier: 1,
    elementName: 'Blossom Wind',
    particleKind: 'petal',
    influenceRadius: 72,
    skyHex: 0x5c968b,
    fogHex: 0x629688,
    fogDensityOffset: -0.0004,
    mistTintHex: 0xcdf5e6,
    exposureOffset: 0.04,
    sunHex: 0xfff4d6,
    sunScale: 1.06,
    hemiSkyHex: 0xaef2dd,
    hemiGroundHex: 0x2f4d3b,
    hemiScale: 1.04,
    rimHex: 0x7ef7c4,
    rimScale: 1.05,
    particleColorAHex: 0xffc6d9,
    particleColorBHex: 0x8df5c8,
    particleWindX: 2.3,
    particleVelY: -1.65,
    particleWindZ: 1.1,
    particleSize: 4.8,
    particleOpacity: 0.78,
    particleSwirl: 2.35,
    ambientLightningRate: 0,
  },
  'pinecrest-lookout': {
    landmarkId: 'pinecrest-lookout',
    tier: 2,
    elementName: 'Pinecrest Breeze',
    particleKind: 'petal',
    influenceRadius: 78,
    skyHex: 0x4f89a6,
    fogHex: 0x5c8ea8,
    fogDensityOffset: 0.0002,
    mistTintHex: 0xcbe8f5,
    exposureOffset: 0.02,
    sunHex: 0xfff1cc,
    sunScale: 1.04,
    hemiSkyHex: 0x9edbff,
    hemiGroundHex: 0x264236,
    hemiScale: 1.0,
    rimHex: 0x7be0ff,
    rimScale: 1.05,
    particleColorAHex: 0x7be8a8,
    particleColorBHex: 0xf4d87a,
    particleWindX: 3.1,
    particleVelY: -1.85,
    particleWindZ: -1.2,
    particleSize: 4.3,
    particleOpacity: 0.72,
    particleSwirl: 2.1,
    ambientLightningRate: 0,
  },
  'emerald-tarn-ridge': {
    landmarkId: 'emerald-tarn-ridge',
    tier: 3,
    elementName: 'Azure Lake Mist',
    particleKind: 'rain_mist',
    influenceRadius: 78,
    skyHex: 0x356d8c,
    fogHex: 0x3f7896,
    fogDensityOffset: 0.0018,
    mistTintHex: 0xaee6ff,
    exposureOffset: -0.02,
    sunHex: 0xdff6ff,
    sunScale: 0.94,
    hemiSkyHex: 0x82d8ff,
    hemiGroundHex: 0x1d3b4a,
    hemiScale: 1.02,
    rimHex: 0x38bdf8,
    rimScale: 1.12,
    particleColorAHex: 0xa6ecff,
    particleColorBHex: 0x56c8f5,
    particleWindX: -2.2,
    particleVelY: -3.2,
    particleWindZ: 1.5,
    particleSize: 3.4,
    particleOpacity: 0.68,
    particleSwirl: 1.35,
    ambientLightningRate: 0,
  },
  'misty-pass': {
    landmarkId: 'misty-pass',
    tier: 4,
    elementName: 'Amethyst Cloud Spirits',
    particleKind: 'celestial',
    influenceRadius: 80,
    skyHex: 0x5c4f82,
    fogHex: 0x6c5d94,
    fogDensityOffset: 0.0028,
    mistTintHex: 0xd8c7ff,
    exposureOffset: -0.01,
    sunHex: 0xeed9ff,
    sunScale: 0.9,
    hemiSkyHex: 0xc5a8ff,
    hemiGroundHex: 0x2c2544,
    hemiScale: 1.02,
    rimHex: 0xc084fc,
    rimScale: 1.24,
    particleColorAHex: 0xe3b8ff,
    particleColorBHex: 0x99d9ff,
    particleWindX: 1.2,
    particleVelY: 0.65,
    particleWindZ: -0.9,
    particleSize: 4.5,
    particleOpacity: 0.78,
    particleSwirl: 2.2,
    ambientLightningRate: 0,
  },
  'ironback-ridge': {
    landmarkId: 'ironback-ridge',
    tier: 5,
    elementName: 'Verdant Gale',
    particleKind: 'petal',
    influenceRadius: 82,
    skyHex: 0x375952,
    fogHex: 0x3f635a,
    fogDensityOffset: 0.0014,
    mistTintHex: 0xa7d9c3,
    exposureOffset: -0.02,
    sunHex: 0xe6f7dc,
    sunScale: 0.96,
    hemiSkyHex: 0x8cd9b2,
    hemiGroundHex: 0x21362c,
    hemiScale: 0.98,
    rimHex: 0x4ade80,
    rimScale: 1.18,
    particleColorAHex: 0x62e894,
    particleColorBHex: 0xc6f09c,
    particleWindX: -5.4,
    particleVelY: -1.4,
    particleWindZ: 2.8,
    particleSize: 4.6,
    particleOpacity: 0.76,
    particleSwirl: 2.8,
    ambientLightningRate: 0,
  },
  'grand-glacier': {
    landmarkId: 'grand-glacier',
    tier: 6,
    elementName: 'Glacial Snowfall',
    particleKind: 'snow',
    influenceRadius: 96,
    skyHex: 0x94bfd9,
    fogHex: 0xa9cde2,
    fogDensityOffset: 0.0038,
    mistTintHex: 0xeaf6ff,
    exposureOffset: 0.06,
    sunHex: 0xe8f6ff,
    sunScale: 0.95,
    hemiSkyHex: 0xd9f1ff,
    hemiGroundHex: 0x4b6a82,
    hemiScale: 1.12,
    rimHex: 0x7dd3fc,
    rimScale: 1.25,
    particleColorAHex: 0xffffff,
    particleColorBHex: 0xbce6ff,
    particleWindX: 3.4,
    particleVelY: -2.4,
    particleWindZ: 1.6,
    particleSize: 5.4,
    particleOpacity: 0.88,
    particleSwirl: 2.3,
    ambientLightningRate: 0,
  },
  'sunstone-citadel': {
    landmarkId: 'sunstone-citadel',
    tier: 7,
    elementName: 'Solar Lotus Gales',
    particleKind: 'petal',
    influenceRadius: 102,
    skyHex: 0x9c6e3b,
    fogHex: 0xa87c45,
    fogDensityOffset: 0.0012,
    mistTintHex: 0xffe4b3,
    exposureOffset: 0.07,
    sunHex: 0xffe09e,
    sunScale: 1.14,
    hemiSkyHex: 0xffd98a,
    hemiGroundHex: 0x5c3720,
    hemiScale: 1.08,
    rimHex: 0xfbbf24,
    rimScale: 1.32,
    particleColorAHex: 0xffe27a,
    particleColorBHex: 0xffa857,
    particleWindX: 2.8,
    particleVelY: -1.1,
    particleWindZ: -1.4,
    particleSize: 5.0,
    particleOpacity: 0.82,
    particleSwirl: 2.4,
    ambientLightningRate: 0,
  },
  'sapphire-abyss': {
    landmarkId: 'sapphire-abyss',
    tier: 8,
    elementName: 'Thunderhorn Tempest',
    particleKind: 'spark',
    influenceRadius: 104,
    skyHex: 0x2c2947,
    fogHex: 0x3b3559,
    fogDensityOffset: 0.0034,
    mistTintHex: 0x9a8ec9,
    exposureOffset: -0.06,
    sunHex: 0xffcba0,
    sunScale: 0.82,
    hemiSkyHex: 0x8c97e8,
    hemiGroundHex: 0x251d33,
    hemiScale: 0.92,
    rimHex: 0xf97316,
    rimScale: 1.42,
    particleColorAHex: 0xffb36b,
    particleColorBHex: 0x93c5fd,
    particleWindX: -6.8,
    particleVelY: -3.9,
    particleWindZ: 3.1,
    particleSize: 4.5,
    particleOpacity: 0.84,
    particleSwirl: 2.9,
    ambientLightningRate: 0.22,
  },
  'obsidian-saddle': {
    landmarkId: 'obsidian-saddle',
    tier: 9,
    elementName: 'Volcanic Embers',
    particleKind: 'ember',
    influenceRadius: 106,
    skyHex: 0x471b1c,
    fogHex: 0x5c2524,
    fogDensityOffset: 0.0042,
    mistTintHex: 0xd97059,
    exposureOffset: -0.05,
    sunHex: 0xff9366,
    sunScale: 0.9,
    hemiSkyHex: 0xff8060,
    hemiGroundHex: 0x4d1514,
    hemiScale: 0.98,
    rimHex: 0xf43f5e,
    rimScale: 1.48,
    particleColorAHex: 0xff6229,
    particleColorBHex: 0xffd166,
    particleWindX: 2.4,
    particleVelY: 2.6,
    particleWindZ: -1.8,
    particleSize: 5.2,
    particleOpacity: 0.9,
    particleSwirl: 2.6,
    ambientLightningRate: 0,
  },
  'frostfang-bastion': {
    landmarkId: 'frostfang-bastion',
    tier: 10,
    elementName: 'Aurora Blizzard',
    particleKind: 'snow',
    influenceRadius: 108,
    skyHex: 0x565a8c,
    fogHex: 0x6f72a6,
    fogDensityOffset: 0.0048,
    mistTintHex: 0xd4d2ff,
    exposureOffset: 0.03,
    sunHex: 0xdce6ff,
    sunScale: 0.88,
    hemiSkyHex: 0xbcb5ff,
    hemiGroundHex: 0x2d3257,
    hemiScale: 1.06,
    rimHex: 0xa78bfa,
    rimScale: 1.38,
    particleColorAHex: 0xf2f0ff,
    particleColorBHex: 0xa78bfa,
    particleWindX: -5.8,
    particleVelY: -3.2,
    particleWindZ: -2.6,
    particleSize: 5.8,
    particleOpacity: 0.92,
    particleSwirl: 3.1,
    ambientLightningRate: 0,
  },
  'dragonspine-spire': {
    landmarkId: 'dragonspine-spire',
    tier: 11,
    elementName: 'Jade Dragon Tempest',
    particleKind: 'spark',
    influenceRadius: 110,
    skyHex: 0x1a4452,
    fogHex: 0x225563,
    fogDensityOffset: 0.0036,
    mistTintHex: 0x8ef2e2,
    exposureOffset: -0.02,
    sunHex: 0xc2fff4,
    sunScale: 0.92,
    hemiSkyHex: 0x62ebd8,
    hemiGroundHex: 0x14333d,
    hemiScale: 1.04,
    rimHex: 0x2dd4bf,
    rimScale: 1.5,
    particleColorAHex: 0x5efce8,
    particleColorBHex: 0xb8fff6,
    particleWindX: 6.4,
    particleVelY: -2.4,
    particleWindZ: 3.6,
    particleSize: 4.8,
    particleOpacity: 0.86,
    particleSwirl: 3.2,
    ambientLightningRate: 0.28,
  },
  'crown-of-humanity': {
    landmarkId: 'crown-of-humanity',
    tier: 12,
    elementName: 'Celestial Ascension',
    particleKind: 'celestial',
    influenceRadius: 120,
    skyHex: 0x6b6091,
    fogHex: 0x8273a6,
    fogDensityOffset: 0.001,
    mistTintHex: 0xfff0c2,
    exposureOffset: 0.08,
    sunHex: 0xfff1bd,
    sunScale: 1.18,
    hemiSkyHex: 0xffe8a3,
    hemiGroundHex: 0x3b2f59,
    hemiScale: 1.15,
    rimHex: 0xffe066,
    rimScale: 1.55,
    particleColorAHex: 0xffe780,
    particleColorBHex: 0xffffff,
    particleWindX: 1.1,
    particleVelY: 1.55,
    particleWindZ: 0.8,
    particleSize: 5.5,
    particleOpacity: 0.9,
    particleSwirl: 2.25,
    ambientLightningRate: 0,
  },
};

export interface PeakWeatherSample {
  dominantLandmarkId: string;
  dominantPeakName: string;
  dominantElementName: string;
  dominantTier: number;
  dominantParticleKind: PeakParticleKind;
  /** Combined elemental presence in [0, 1] — smooth Gaussian proximity to the 12 peaks. */
  influence: number;
  skyHex: number;
  fogHex: number;
  fogDensityOffset: number;
  mistTintHex: number;
  exposureOffset: number;
  sunHex: number;
  sunScale: number;
  hemiSkyHex: number;
  hemiGroundHex: number;
  hemiScale: number;
  rimHex: number;
  rimScale: number;
  particleColorAHex: number;
  particleColorBHex: number;
  particleWindX: number;
  particleVelY: number;
  particleWindZ: number;
  particleSize: number;
  particleOpacity: number;
  particleSwirl: number;
  /** Normalized 4-channel GPU shape weights: [petal, snow, ember, sparkOrMist]. */
  petalWeight: number;
  snowWeight: number;
  emberWeight: number;
  sparkWeight: number;
  celestialWeight: number;
  ambientLightningRate: number;
}

export function createPeakWeatherSample(): PeakWeatherSample {
  return {
    dominantLandmarkId: 'whispering-foothill',
    dominantPeakName: 'Whispering Foothill',
    dominantElementName: 'Blossom Wind',
    dominantTier: 1,
    dominantParticleKind: 'petal',
    influence: 0,
    skyHex: 0x5c968b,
    fogHex: 0x629688,
    fogDensityOffset: 0,
    mistTintHex: 0xcdf5e6,
    exposureOffset: 0,
    sunHex: 0xfff4d6,
    sunScale: 1,
    hemiSkyHex: 0xaef2dd,
    hemiGroundHex: 0x2f4d3b,
    hemiScale: 1,
    rimHex: 0x7ef7c4,
    rimScale: 1,
    particleColorAHex: 0xffc6d9,
    particleColorBHex: 0x8df5c8,
    particleWindX: 2.0,
    particleVelY: -1.5,
    particleWindZ: 1.0,
    particleSize: 4.5,
    particleOpacity: 0.0,
    particleSwirl: 2.0,
    petalWeight: 1,
    snowWeight: 0,
    emberWeight: 0,
    sparkWeight: 0,
    celestialWeight: 0,
    ambientLightningRate: 0,
  };
}

function packRgb(r: number, g: number, b: number): number {
  const rr = Math.max(0, Math.min(255, Math.round(r)));
  const gg = Math.max(0, Math.min(255, Math.round(g)));
  const bb = Math.max(0, Math.min(255, Math.round(b)));
  return (rr << 16) | (gg << 8) | bb;
}

/**
 * Pure, allocation-free spatial weather sampler across all 12 Trial Peaks.
 * Smoothly blends lighting, sky/fog colors, and elemental particle parameters using
 * normalized Gaussian influence fields around each peak so transitions never snap.
 */
export function samplePeakElementalWeather(
  x: number,
  z: number,
  out: PeakWeatherSample = createPeakWeatherSample(),
): PeakWeatherSample {
  let weightSum = 0;
  let peakMaxWeight = 0;
  let dominantTheme = PEAK_ELEMENTAL_THEMES['whispering-foothill'];
  let dominantName = WORLD_LANDMARKS[0]?.name ?? 'Whispering Foothill';

  let skyR = 0, skyG = 0, skyB = 0;
  let fogR = 0, fogG = 0, fogB = 0;
  let mistR = 0, mistG = 0, mistB = 0;
  let sunR = 0, sunG = 0, sunB = 0;
  let hemiSkyR = 0, hemiSkyG = 0, hemiSkyB = 0;
  let hemiGndR = 0, hemiGndG = 0, hemiGndB = 0;
  let rimR = 0, rimG = 0, rimB = 0;
  let pAR = 0, pAG = 0, pAB = 0;
  let pBR = 0, pBG = 0, pBB = 0;

  let fogDensityOffset = 0;
  let exposureOffset = 0;
  let sunScale = 0;
  let hemiScale = 0;
  let rimScale = 0;
  let windX = 0;
  let velY = 0;
  let windZ = 0;
  let pSize = 0;
  let pOpacity = 0;
  let pSwirl = 0;
  let petalW = 0;
  let snowW = 0;
  let emberW = 0;
  let sparkW = 0;
  let celestialW = 0;
  let lightningRate = 0;

  for (let i = 0; i < WORLD_LANDMARKS.length; i++) {
    const lm = WORLD_LANDMARKS[i];
    const theme = PEAK_ELEMENTAL_THEMES[lm.id];
    if (!theme) continue;

    const dx = x - lm.x;
    const dz = z - lm.z;
    const d2 = dx * dx + dz * dz;
    const sigma = theme.influenceRadius * 0.62;
    const rawW = Math.exp(-d2 / (2 * sigma * sigma));

    if (rawW > peakMaxWeight) {
      peakMaxWeight = rawW;
      dominantTheme = theme;
      dominantName = lm.name;
    }

    // Keep small tail contributions smooth while ignoring negligible distant peaks
    if (rawW < 0.002) continue;

    weightSum += rawW;

    skyR += ((theme.skyHex >> 16) & 255) * rawW;
    skyG += ((theme.skyHex >> 8) & 255) * rawW;
    skyB += (theme.skyHex & 255) * rawW;

    fogR += ((theme.fogHex >> 16) & 255) * rawW;
    fogG += ((theme.fogHex >> 8) & 255) * rawW;
    fogB += (theme.fogHex & 255) * rawW;

    mistR += ((theme.mistTintHex >> 16) & 255) * rawW;
    mistG += ((theme.mistTintHex >> 8) & 255) * rawW;
    mistB += (theme.mistTintHex & 255) * rawW;

    sunR += ((theme.sunHex >> 16) & 255) * rawW;
    sunG += ((theme.sunHex >> 8) & 255) * rawW;
    sunB += (theme.sunHex & 255) * rawW;

    hemiSkyR += ((theme.hemiSkyHex >> 16) & 255) * rawW;
    hemiSkyG += ((theme.hemiSkyHex >> 8) & 255) * rawW;
    hemiSkyB += (theme.hemiSkyHex & 255) * rawW;

    hemiGndR += ((theme.hemiGroundHex >> 16) & 255) * rawW;
    hemiGndG += ((theme.hemiGroundHex >> 8) & 255) * rawW;
    hemiGndB += (theme.hemiGroundHex & 255) * rawW;

    rimR += ((theme.rimHex >> 16) & 255) * rawW;
    rimG += ((theme.rimHex >> 8) & 255) * rawW;
    rimB += (theme.rimHex & 255) * rawW;

    pAR += ((theme.particleColorAHex >> 16) & 255) * rawW;
    pAG += ((theme.particleColorAHex >> 8) & 255) * rawW;
    pAB += (theme.particleColorAHex & 255) * rawW;

    pBR += ((theme.particleColorBHex >> 16) & 255) * rawW;
    pBG += ((theme.particleColorBHex >> 8) & 255) * rawW;
    pBB += (theme.particleColorBHex & 255) * rawW;

    fogDensityOffset += theme.fogDensityOffset * rawW;
    exposureOffset += theme.exposureOffset * rawW;
    sunScale += theme.sunScale * rawW;
    hemiScale += theme.hemiScale * rawW;
    rimScale += theme.rimScale * rawW;
    windX += theme.particleWindX * rawW;
    velY += theme.particleVelY * rawW;
    windZ += theme.particleWindZ * rawW;
    pSize += theme.particleSize * rawW;
    pOpacity += theme.particleOpacity * rawW;
    pSwirl += theme.particleSwirl * rawW;
    lightningRate += theme.ambientLightningRate * rawW;

    if (theme.particleKind === 'petal') {
      petalW += rawW;
    } else if (theme.particleKind === 'snow') {
      snowW += rawW;
    } else if (theme.particleKind === 'ember') {
      emberW += rawW;
    } else if (theme.particleKind === 'celestial') {
      celestialW += rawW;
    } else {
      // 'spark' and 'rain_mist' map to directional streak/glint channel
      sparkW += rawW;
    }
  }

  out.dominantLandmarkId = dominantTheme.landmarkId;
  out.dominantPeakName = dominantName;
  out.dominantElementName = dominantTheme.elementName;
  out.dominantTier = dominantTheme.tier;
  out.dominantParticleKind = dominantTheme.particleKind;

  if (weightSum <= 0.0001) {
    out.influence = 0;
    out.skyHex = dominantTheme.skyHex;
    out.fogHex = dominantTheme.fogHex;
    out.fogDensityOffset = 0;
    out.mistTintHex = dominantTheme.mistTintHex;
    out.exposureOffset = 0;
    out.sunHex = dominantTheme.sunHex;
    out.sunScale = 1;
    out.hemiSkyHex = dominantTheme.hemiSkyHex;
    out.hemiGroundHex = dominantTheme.hemiGroundHex;
    out.hemiScale = 1;
    out.rimHex = dominantTheme.rimHex;
    out.rimScale = 1;
    out.particleColorAHex = dominantTheme.particleColorAHex;
    out.particleColorBHex = dominantTheme.particleColorBHex;
    out.particleWindX = dominantTheme.particleWindX;
    out.particleVelY = dominantTheme.particleVelY;
    out.particleWindZ = dominantTheme.particleWindZ;
    out.particleSize = dominantTheme.particleSize;
    out.particleOpacity = 0;
    out.particleSwirl = dominantTheme.particleSwirl;
    out.petalWeight = dominantTheme.particleKind === 'petal' ? 1 : 0;
    out.snowWeight = dominantTheme.particleKind === 'snow' ? 1 : 0;
    out.emberWeight = dominantTheme.particleKind === 'ember' ? 1 : 0;
    out.sparkWeight =
      dominantTheme.particleKind === 'spark' || dominantTheme.particleKind === 'rain_mist' ? 1 : 0;
    out.celestialWeight = dominantTheme.particleKind === 'celestial' ? 1 : 0;
    out.ambientLightningRate = 0;
    return out;
  }

  const inv = 1 / weightSum;
  // Smooth S-curve influence ramp so outer lowlands gently transition into peak weather
  const rawInfluence = Math.max(0, Math.min(1, peakMaxWeight * 1.15 + Math.min(0.25, weightSum * 0.18)));
  const smoothInfluence = rawInfluence * rawInfluence * (3 - 2 * rawInfluence);

  out.influence = Number(smoothInfluence.toFixed(4));
  out.skyHex = packRgb(skyR * inv, skyG * inv, skyB * inv);
  out.fogHex = packRgb(fogR * inv, fogG * inv, fogB * inv);
  out.mistTintHex = packRgb(mistR * inv, mistG * inv, mistB * inv);
  out.sunHex = packRgb(sunR * inv, sunG * inv, sunB * inv);
  out.hemiSkyHex = packRgb(hemiSkyR * inv, hemiSkyG * inv, hemiSkyB * inv);
  out.hemiGroundHex = packRgb(hemiGndR * inv, hemiGndG * inv, hemiGndB * inv);
  out.rimHex = packRgb(rimR * inv, rimG * inv, rimB * inv);
  out.particleColorAHex = packRgb(pAR * inv, pAG * inv, pAB * inv);
  out.particleColorBHex = packRgb(pBR * inv, pBG * inv, pBB * inv);

  out.fogDensityOffset = fogDensityOffset * inv;
  out.exposureOffset = exposureOffset * inv;
  out.sunScale = sunScale * inv;
  out.hemiScale = hemiScale * inv;
  out.rimScale = rimScale * inv;
  out.particleWindX = windX * inv;
  out.particleVelY = velY * inv;
  out.particleWindZ = windZ * inv;
  out.particleSize = pSize * inv;
  out.particleOpacity = pOpacity * inv * smoothInfluence;
  out.particleSwirl = pSwirl * inv;
  out.petalWeight = petalW * inv;
  out.snowWeight = snowW * inv;
  out.emberWeight = emberW * inv;
  out.sparkWeight = sparkW * inv;
  out.celestialWeight = celestialW * inv;
  out.ambientLightningRate = lightningRate * inv * smoothInfluence;

  return out;
}

/**
 * Custom GLSL Vertex Shader for the single-draw-call 12-Peak Elemental Particle System.
 * Wraps particles smoothly in a 3D toroidal volume centered on the player while
 * adding wind sway, petal flutter oscillation, and distance-based point attenuation.
 */
export const PEAK_WEATHER_VERTEX_SHADER = `
attribute vec4 aSeed;
attribute vec2 aFlutter;

uniform float uTime;
uniform vec3 uFocus;
uniform vec3 uWind;
uniform float uSize;
uniform float uSwirl;
uniform float uPixelRatio;
uniform vec4 uShapeWeights;

varying float vMix;
varying float vAlpha;
varying float vPhase;
varying float vSpin;

void main() {
  vec3 box = vec3(68.0, 32.0, 68.0);
  float phase = aSeed.x;
  float spd = aSeed.y;
  float sizeMul = aSeed.z;
  float flutterFreq = aFlutter.x;
  float spinDir = aFlutter.y;

  vec3 drift = uWind * (uTime * spd);
  // Extra organic side-to-side flutter when falling petals dominate
  float petalBoost = 1.0 + uShapeWeights.x * 0.75;
  drift.x += sin(uTime * flutterFreq + phase) * uSwirl * petalBoost;
  drift.z += cos(uTime * (flutterFreq * 0.82) + phase * 1.37) * uSwirl * petalBoost;
  drift.y += sin(uTime * (flutterFreq * 0.65) + phase * 0.9) * (0.55 + uShapeWeights.x * 0.45);

  vec3 rel = mod(position + drift - uFocus + box * 0.5, box) - box * 0.5;
  vec3 worldPos = uFocus + rel;

  vec4 mvPos = modelViewMatrix * vec4(worldPos, 1.0);
  gl_Position = projectionMatrix * mvPos;

  float radial = length(rel.xz) / 34.0;
  float edgeFade = 1.0 - smoothstep(0.62, 1.0, radial);
  float vertFade = smoothstep(-16.0, -9.5, rel.y) * (1.0 - smoothstep(9.5, 16.0, rel.y));
  vAlpha = edgeFade * vertFade;
  vMix = aSeed.w;
  vPhase = phase + uTime * (1.6 + spd * 1.4);
  vSpin = phase + uTime * flutterFreq * 1.65 * spinDir;

  float depthScale = 240.0 / max(2.2, -mvPos.z);
  gl_PointSize = clamp(uSize * sizeMul * uPixelRatio * depthScale * 0.145, 2.0, 30.0);
}
`;

/**
 * Custom GLSL Fragment Shader rendering 5 procedural elemental particle shapes
 * with continuous weight blending (zero branch popping when crossing between peaks):
 * - Petals / Leaves (uShapeWeights.x): tumbling notched blossom petal silhouette
 * - Snowflakes (uShapeWeights.y): rotating 6-point crystalline snowflake
 * - Volcanic Embers & Ash (uShapeWeights.z): flickering glowing cinder + soot flake
 * - Storm Sparks / Lake Spray (uShapeWeights.w): wind-stretched electric/mist glint
 * - Celestial Starlight (uCelestialWeight): 4-point heavenly star bloom
 */
export const PEAK_WEATHER_FRAGMENT_SHADER = `
precision highp float;

uniform float uOpacity;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec4 uShapeWeights;
uniform float uCelestialWeight;

varying float vMix;
varying float vAlpha;
varying float vPhase;
varying float vSpin;

void main() {
  vec2 uv = gl_PointCoord - vec2(0.5);
  float d = length(uv);
  if (d > 0.5) discard;

  // Rotate sprite local coordinates per-particle for tumbling petals & spinning snow
  float cs = cos(vSpin);
  float sn = sin(vSpin);
  vec2 ruv = vec2(uv.x * cs - uv.y * sn, uv.x * sn + uv.y * cs);

  // 1. Tumbling Blossom Petal / Leaf shape with 3D foreshortening
  float tumble = 0.42 + 0.58 * abs(cos(vSpin * 0.72));
  vec2 puv = vec2(ruv.x / max(0.32, tumble), ruv.y);
  float petalDist = length(vec2(puv.x * 1.55, (puv.y - 0.04) * 1.08));
  float tipNotch = smoothstep(0.14, 0.0, length(puv - vec2(0.0, -0.34))) * 0.22;
  float petalShape = smoothstep(0.46, 0.12, petalDist + tipNotch);

  // 2. Rotating 6-point Crystalline Snowflake
  float snowAng = atan(ruv.y, ruv.x);
  float arms = pow(abs(cos(snowAng * 3.0)), 3.0);
  float snowShape = clamp(smoothstep(0.49, 0.08, d) * (0.48 + 0.52 * arms) + smoothstep(0.22, 0.0, d) * 0.6, 0.0, 1.0);

  // 3. Volcanic Ember & Soot Ash
  float emberFlag = step(0.46, vMix);
  float flicker = 0.62 + 0.38 * sin(vPhase * 4.2);
  float emberShape = mix(
    smoothstep(0.45, 0.02, d) * (0.72 + 0.28 * flicker),
    smoothstep(0.46, 0.14, length(vec2(ruv.x * 1.3, ruv.y * 0.95))) * 0.78,
    emberFlag
  );

  // 4. Tempest Spark / Lake Mist Streak
  float sparkShape = smoothstep(0.48, 0.03, length(vec2(ruv.x * 2.2, ruv.y * 0.65)));

  // 5. Celestial 4-point Starlight Bloom
  float starCross = max(
    smoothstep(0.11, 0.0, abs(ruv.x)) * smoothstep(0.48, 0.04, abs(ruv.y)),
    smoothstep(0.11, 0.0, abs(ruv.y)) * smoothstep(0.48, 0.04, abs(ruv.x))
  );
  float celestialShape = clamp(smoothstep(0.34, 0.0, d) * 0.9 + starCross * 0.85, 0.0, 1.0);

  float totalWeight = max(
    0.001,
    uShapeWeights.x + uShapeWeights.y + uShapeWeights.z + uShapeWeights.w + uCelestialWeight
  );
  float shape = (
    petalShape * uShapeWeights.x +
    snowShape * uShapeWeights.y +
    emberShape * uShapeWeights.z +
    sparkShape * uShapeWeights.w +
    celestialShape * uCelestialWeight
  ) / totalWeight;

  vec3 baseCol = mix(uColorA, uColorB, vMix);
  // Subtle incandescent ember flicker & celestial core gleam
  vec3 emberTint = mix(vec3(1.0, 0.36, 0.1), vec3(1.0, 0.88, 0.42), flicker);
  vec3 ashTint = vec3(0.22, 0.17, 0.17);
  vec3 volcanicCol = mix(emberTint, ashTint, emberFlag);
  vec3 col = mix(baseCol, volcanicCol, clamp(uShapeWeights.z, 0.0, 1.0));
  col += vec3(1.0, 0.95, 0.78) * (uCelestialWeight * smoothstep(0.28, 0.0, d) * 0.45);
  // Soft inner petal sheen
  col += vec3(0.16, 0.12, 0.12) * (uShapeWeights.x * smoothstep(0.22, 0.0, abs(puv.x)) * 0.45);

  float alpha = shape * vAlpha * uOpacity;
  if (alpha < 0.012) discard;
  gl_FragColor = vec4(col, alpha);
}
`;

const _scratchColorA = new THREE.Color();
const _scratchColorB = new THREE.Color();
const _scratchShapeVec = new THREE.Vector4();

/**
 * Single-draw-call GPU particle emitter managed by `WorldEngine` that smoothly
 * morphs between falling petals, snowflakes, mist droplets, volcanic embers,
 * storm sparks, and celestial starlight as the player moves between the 12 peaks.
 */
export class PeakElementalParticleSystem {
  public readonly points: THREE.Points;
  public readonly geometry: THREE.BufferGeometry;
  public readonly material: THREE.ShaderMaterial;

  constructor(particleCount = 600, pixelRatio = 1) {
    const count = Math.max(64, Math.floor(particleCount));
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count * 4);
    const flutter = new Float32Array(count * 2);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 68;
      positions[i * 3 + 1] = Math.random() * 32;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 68;

      seeds[i * 4] = Math.random() * Math.PI * 2; // phase
      seeds[i * 4 + 1] = 0.65 + Math.random() * 0.85; // speed scale
      seeds[i * 4 + 2] = 0.65 + Math.random() * 1.05; // size scale
      seeds[i * 4 + 3] = Math.random(); // color mix

      flutter[i * 2] = 1.0 + Math.random() * 1.45; // flutter frequency
      flutter[i * 2 + 1] = Math.random() < 0.5 ? -1.0 : 1.0; // spin direction
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
    this.geometry.setAttribute('aFlutter', new THREE.BufferAttribute(flutter, 2));

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uFocus: { value: new THREE.Vector3(0, 8, 0) },
        uWind: { value: new THREE.Vector3(2.0, -1.5, 1.0) },
        uSize: { value: 4.5 },
        uSwirl: { value: 2.0 },
        uOpacity: { value: 0.0 },
        uColorA: { value: new THREE.Color(0xffc6d9) },
        uColorB: { value: new THREE.Color(0x8df5c8) },
        uShapeWeights: { value: new THREE.Vector4(1, 0, 0, 0) },
        uCelestialWeight: { value: 0 },
        uPixelRatio: { value: pixelRatio },
      },
      vertexShader: PEAK_WEATHER_VERTEX_SHADER,
      fragmentShader: PEAK_WEATHER_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 4;
    this.points.visible = false;
  }

  public update(
    dt: number,
    elapsed: number,
    focusX: number,
    focusY: number,
    focusZ: number,
    sample: PeakWeatherSample,
    pixelRatio: number,
    opacityScale = 1,
  ): void {
    const safeDt = Math.max(0, Math.min(0.15, dt));
    const dampT = 1 - Math.exp(-2.4 * safeDt);
    const u = this.material.uniforms;

    u.uTime.value = elapsed;
    (u.uFocus.value as THREE.Vector3).set(focusX, focusY + 7.2, focusZ);

    const wind = u.uWind.value as THREE.Vector3;
    wind.x = THREE.MathUtils.damp(wind.x, sample.particleWindX, 2.2, safeDt);
    wind.y = THREE.MathUtils.damp(wind.y, sample.particleVelY, 2.2, safeDt);
    wind.z = THREE.MathUtils.damp(wind.z, sample.particleWindZ, 2.2, safeDt);

    u.uSize.value = THREE.MathUtils.damp(u.uSize.value as number, sample.particleSize, 2.4, safeDt);
    u.uSwirl.value = THREE.MathUtils.damp(u.uSwirl.value as number, sample.particleSwirl, 2.4, safeDt);

    const targetOpacity = Math.max(0, Math.min(0.95, sample.particleOpacity * opacityScale));
    u.uOpacity.value = THREE.MathUtils.damp(u.uOpacity.value as number, targetOpacity, 2.4, safeDt);

    _scratchColorA.setHex(sample.particleColorAHex);
    _scratchColorB.setHex(sample.particleColorBHex);
    (u.uColorA.value as THREE.Color).lerp(_scratchColorA, dampT);
    (u.uColorB.value as THREE.Color).lerp(_scratchColorB, dampT);

    _scratchShapeVec.set(
      sample.petalWeight,
      sample.snowWeight,
      sample.emberWeight,
      sample.sparkWeight,
    );
    (u.uShapeWeights.value as THREE.Vector4).lerp(_scratchShapeVec, dampT);
    u.uCelestialWeight.value = THREE.MathUtils.damp(
      u.uCelestialWeight.value as number,
      sample.celestialWeight,
      2.4,
      safeDt,
    );

    u.uPixelRatio.value = pixelRatio;
    this.points.visible = (u.uOpacity.value as number) > 0.015;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.points.removeFromParent();
  }
}
