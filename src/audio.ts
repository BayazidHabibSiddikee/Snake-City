import type { BiomeId, WeatherMode } from './types.ts';

export type WeatherAudioCueKind =
  | 'rain_splash'
  | 'thunder_jolt'
  | 'blizzard_gust'
  | 'ash_cinder'
  | 'wind_surge';

export interface WeatherAudioCueEvent {
  kind: WeatherAudioCueKind;
  intensity: number;
  /** Stereo pan in [-1, 1] (-1 = left, +1 = right) so screen-space VFX bias matches audio direction */
  pan: number;
}

export interface PortalTemporalDroneParams {
  proximity01: number;
  carrierHz: number;
  harmonicHz: number;
  modulatorHz: number;
  fmDepthHz: number;
  lfoWobbleHz: number;
  lfoPitchDepthHz: number;
  filterCutoffHz: number;
  filterQ: number;
  shimmerHz: number;
  shimmerGain: number;
  droneGain: number;
}

/**
 * Pure synthesizer curve for the procedural portal 'temporal distortion' drone effect.
 * As the player approaches any portal center (`minDistance` decreases from `maxHearRadius`
 * down to `coreRadius`), pitch (`carrierHz`, `harmonicHz`, `modulatorHz`, `shimmerHz`),
 * FM phase-warp modulation depth, time-dilation LFO wobble frequency, filter resonance,
 * and drone intensity increase monotonically.
 */
export function computePortalTemporalDroneParams(
  minDistance: number,
  variant: 'A' | 'B' = 'A',
  maxHearRadius = 46,
  coreRadius = 3.5,
): PortalTemporalDroneParams {
  if (!Number.isFinite(minDistance) || minDistance >= maxHearRadius) {
    const baseRoot = variant === 'A' ? 58 : 54;
    return {
      proximity01: 0,
      carrierHz: baseRoot,
      harmonicHz: Number((baseRoot * 1.498).toFixed(2)),
      modulatorHz: baseRoot * 2,
      fmDepthHz: 3,
      lfoWobbleHz: 0.75,
      lfoPitchDepthHz: 2,
      filterCutoffHz: 190,
      filterQ: 2.0,
      shimmerHz: baseRoot * 4,
      shimmerGain: 0,
      droneGain: 0,
    };
  }

  const span = Math.max(0.1, maxHearRadius - coreRadius);
  const linear01 = Math.max(0, Math.min(1, 1 - (minDistance - coreRadius) / span));
  const proximity01 = Number(Math.pow(linear01, 1.38).toFixed(4));

  const baseRoot = variant === 'A' ? 58 : 54;
  // Pitch climbs over ~1.8 octaves as the player approaches the portal singularity
  const carrierHz = Number((baseRoot + proximity01 * 144).toFixed(2));
  // Slight fifth-to-tritone harmonic shift creates temporal binaural phase beating
  const harmonicRatio = 1.498 - proximity01 * 0.084;
  const harmonicHz = Number((carrierHz * harmonicRatio).toFixed(2));
  // Non-integer FM modulator ratio produces metallic time-dilation sidebands near center
  const modulatorHz = Number((carrierHz * (2.0 + proximity01 * 0.72)).toFixed(2));
  const fmDepthHz = Number((3 + Math.pow(proximity01, 1.25) * 135).toFixed(2));
  const lfoWobbleHz = Number((0.75 + Math.pow(proximity01, 1.15) * 8.25).toFixed(2));
  const lfoPitchDepthHz = Number((2 + proximity01 * 44).toFixed(2));
  const filterCutoffHz = Number((190 + Math.pow(proximity01, 1.2) * 2650).toFixed(1));
  const filterQ = Number((2.0 + proximity01 * 7.2).toFixed(2));
  const shimmerHz = Number((carrierHz * 4.0).toFixed(2));
  const shimmerGain = Number((Math.pow(proximity01, 1.8) * 0.085).toFixed(4));
  const droneGain = Number((proximity01 * 0.21).toFixed(4));

  return {
    proximity01,
    carrierHz,
    harmonicHz,
    modulatorHz,
    fmDepthHz,
    lfoWobbleHz,
    lfoPitchDepthHz,
    filterCutoffHz,
    filterQ,
    shimmerHz,
    shimmerGain,
    droneGain,
  };
}

export type MirrorTabShimmerAction = 'orbit' | 'spin' | 'select' | 'enter' | 'spawn' | 'profile';

export interface MirrorTabShimmerOptions {
  /** Horizontal 3D mirror position in [-1, 1] (-1 = far left, +1 = far right) */
  xNorm?: number;
  /** Vertical 3D gallery elevation in [-1, 1] */
  yNorm?: number;
  /** Depth in the 360° Mirror House in [-1, 1] (+1 = closest front mirror, -1 = rear gallery) */
  zDepth?: number;
  /** Mirror-House gallery tier: -1 (Lower Reflection), 0 (Grand Rotunda), +1 (Upper Crown) */
  tier?: -1 | 0 | 1;
  /** Portal channel harmonic coloring */
  portalVariant?: 'A' | 'B';
  /** Zero-based tab index used to step across a crystalline Lydian pentatonic scale */
  tabIndex?: number;
  /** Navigation event intensity */
  action?: MirrorTabShimmerAction;
}

export interface MirrorTabShimmerParams {
  spatialX: number;
  spatialY: number;
  spatialZ: number;
  stereoPan: number;
  fundamentalHz: number;
  harmonicFreqs: number[];
  shimmerSweepStartHz: number;
  shimmerSweepEndHz: number;
  durationSec: number;
  masterGain: number;
  echoWet: number;
  echoDelayLeftSec: number;
  echoDelayRightSec: number;
}

// Crystalline Lydian / glass-harp intervals for Mirror-House tab navigation
const MIRROR_SHIMMER_SCALE_A = [523.25, 587.33, 659.25, 739.99, 783.99, 987.77, 1046.5, 1174.66];
const MIRROR_SHIMMER_SCALE_B = [493.88, 554.37, 659.25, 739.99, 830.61, 987.77, 1108.73, 1318.51];

/**
 * Pure spatial synthesizer curve for the Mirror-House shimmering resonance effect
 * triggered whenever the user navigates, spins, or steps between Mirror-House tabs.
 * Maps the 3D Mirror-House coordinates (`xNorm`, `yNorm`, `zDepth`, `tier`) into
 * HRTF 3D spatial sound placement, crystalline overtone frequencies, and hall-of-mirrors echoes.
 */
export function computeMirrorTabShimmerParams(
  opts: MirrorTabShimmerOptions = {},
): MirrorTabShimmerParams {
  const xNorm = Math.max(-1, Math.min(1, Number.isFinite(opts.xNorm) ? (opts.xNorm as number) : 0));
  const yNorm = Math.max(-1, Math.min(1, Number.isFinite(opts.yNorm) ? (opts.yNorm as number) : 0));
  const zDepth = Math.max(-1, Math.min(1, Number.isFinite(opts.zDepth) ? (opts.zDepth as number) : 0.85));
  const tier: -1 | 0 | 1 = opts.tier === 1 ? 1 : opts.tier === -1 ? -1 : 0;
  const variant = opts.portalVariant === 'B' ? 'B' : 'A';
  const action: MirrorTabShimmerAction = opts.action ?? 'select';
  const idx = Math.abs(Math.floor(opts.tabIndex ?? 0));

  const scale = variant === 'A' ? MIRROR_SHIMMER_SCALE_A : MIRROR_SHIMMER_SCALE_B;
  const tierOctaveMul = tier === 1 ? 1.25 : tier === -1 ? 0.84 : 1.0;
  const baseHz = scale[idx % scale.length] * tierOctaveMul;
  const fundamentalHz = Number(baseHz.toFixed(2));

  // Crystalline harmonics: fundamental, fifth, shimmer octave, glass bell partial (2.756x)
  const harmonicFreqs = [
    fundamentalHz,
    Number((fundamentalHz * (variant === 'A' ? 1.498 : 1.5)).toFixed(2)),
    Number((fundamentalHz * 2.0).toFixed(2)),
    Number((fundamentalHz * 2.756).toFixed(2)),
  ];

  // 3D HRTF spatial placement around the listener (origin = listener head inside Mirror House)
  const spatialX = Number((xNorm * 3.4).toFixed(3));
  const spatialY = Number((yNorm * 1.9 + tier * 0.55).toFixed(3));
  // Front mirror (zDepth = +1) sits close in front (-1.1m); rear mirror (-1) sits farther (-3.6m)
  const depth01 = (zDepth + 1) * 0.5;
  const spatialZ = Number((-(1.1 + (1 - depth01) * 2.5)).toFixed(3));
  const stereoPan = Number(Math.max(-0.92, Math.min(0.92, xNorm * 0.88)).toFixed(3));

  const actionDurationMap: Record<MirrorTabShimmerAction, number> = {
    orbit: 0.42,
    spin: 0.56,
    select: 0.68,
    spawn: 0.84,
    enter: 0.96,
    profile: 1.15,
  };
  const actionGainMap: Record<MirrorTabShimmerAction, number> = {
    orbit: 0.068,
    spin: 0.095,
    select: 0.115,
    spawn: 0.128,
    enter: 0.145,
    profile: 0.135,
  };

  const distanceAtten = 0.72 + depth01 * 0.28;
  const durationSec = actionDurationMap[action];
  const masterGain = Number((actionGainMap[action] * distanceAtten).toFixed(4));
  const shimmerSweepStartHz = Number(Math.min(6800, fundamentalHz * 2.4).toFixed(1));
  const shimmerSweepEndHz = Number(Math.min(10800, fundamentalHz * (action === 'enter' ? 5.6 : 4.2)).toFixed(1));
  const echoWet = Number((action === 'orbit' ? 0.28 : action === 'enter' ? 0.48 : 0.38).toFixed(3));
  // Slight left/right asymmetry creates wide kaleidoscopic Hall-of-Mirrors stereo bounce
  const echoDelayLeftSec = Number((0.068 + Math.max(0, -xNorm) * 0.035).toFixed(4));
  const echoDelayRightSec = Number((0.094 + Math.max(0, xNorm) * 0.035).toFixed(4));

  return {
    spatialX,
    spatialY,
    spatialZ,
    stereoPan,
    fundamentalHz,
    harmonicFreqs,
    shimmerSweepStartHz,
    shimmerSweepEndHz,
    durationSec,
    masterGain,
    echoWet,
    echoDelayLeftSec,
    echoDelayRightSec,
  };
}

type TierTriggerKind =
  | 'cicadaPulse'
  | 'bambooClack'
  | 'woodenMarimba'
  | 'tribalDrum'
  | 'bambooFlute'
  | 'stormStaticChime'
  | 'canyonHorn'
  | 'singingBowl'
  | 'mysticHarp'
  | 'crystalChimes'
  | 'etherealChoir'
  | 'solarAscensionChime';

export interface WeatherSoundscapeMix {
  toneCutoffHz: number;
  windGainMul: number;
  windFreqOffset: number;
  windQ: number;
  windLfoHz: number;
  howlGain: number;
  howlFreqA: number;
  howlFreqB: number;
  howlQ: number;
  howlLfoHz: number;
  leafGainMul: number;
  leafFreqOffset: number;
  leafLfoHz: number;
  rainBaseLevel: number;
  rainBodyMul: number;
  rainHighMul: number;
  rainWashMul: number;
  streamGainMul: number;
  mistHushGain: number;
  sleetHissGain: number;
  ashRumbleGain: number;
  wildlifeGain: number;
}

/**
 * Weather-adaptive ambient soundscape stem mix table.
 * Each weather setting smoothly crossfades across 6 continuous stems:
 * wind bed, dual stereo howling wind, 3-band rainfall, rustling leaves/canopy,
 * valley stream + mist hush, and blizzard sleet / volcanic ash rumble.
 */
export const WEATHER_SOUNDSCAPE_MIX: Record<WeatherMode, WeatherSoundscapeMix> = {
  clear: {
    toneCutoffHz: 14500,
    windGainMul: 0.92,
    windFreqOffset: 0,
    windQ: 2.2,
    windLfoHz: 0.095,
    howlGain: 0.0001,
    howlFreqA: 560,
    howlFreqB: 840,
    howlQ: 8.0,
    howlLfoHz: 0.08,
    leafGainMul: 1.18,
    leafFreqOffset: 140,
    leafLfoHz: 0.22,
    rainBaseLevel: 0,
    rainBodyMul: 0,
    rainHighMul: 0,
    rainWashMul: 0,
    streamGainMul: 1.12,
    mistHushGain: 0.0001,
    sleetHissGain: 0.0001,
    ashRumbleGain: 0.0001,
    wildlifeGain: 0.95,
  },
  mist: {
    toneCutoffHz: 6800,
    windGainMul: 0.82,
    windFreqOffset: -55,
    windQ: 1.9,
    windLfoHz: 0.085,
    howlGain: 0.004,
    howlFreqA: 510,
    howlFreqB: 760,
    howlQ: 7.5,
    howlLfoHz: 0.075,
    leafGainMul: 0.84,
    leafFreqOffset: -180,
    leafLfoHz: 0.17,
    rainBaseLevel: 0,
    rainBodyMul: 0,
    rainHighMul: 0,
    rainWashMul: 0,
    streamGainMul: 1.0,
    mistHushGain: 0.055,
    sleetHissGain: 0.0001,
    ashRumbleGain: 0.0001,
    wildlifeGain: 0.82,
  },
  fog: {
    toneCutoffHz: 2450,
    windGainMul: 0.66,
    windFreqOffset: -135,
    windQ: 1.6,
    windLfoHz: 0.065,
    howlGain: 0.012,
    howlFreqA: 420,
    howlFreqB: 630,
    howlQ: 6.5,
    howlLfoHz: 0.06,
    leafGainMul: 0.38,
    leafFreqOffset: -550,
    leafLfoHz: 0.12,
    rainBaseLevel: 0,
    rainBodyMul: 0,
    rainHighMul: 0,
    rainWashMul: 0,
    streamGainMul: 0.72,
    mistHushGain: 0.098,
    sleetHissGain: 0.0001,
    ashRumbleGain: 0.015,
    wildlifeGain: 0.52,
  },
  rain: {
    toneCutoffHz: 9200,
    windGainMul: 1.14,
    windFreqOffset: 25,
    windQ: 2.3,
    windLfoHz: 0.145,
    howlGain: 0.024,
    howlFreqA: 540,
    howlFreqB: 810,
    howlQ: 8.5,
    howlLfoHz: 0.11,
    leafGainMul: 1.32,
    leafFreqOffset: 220,
    leafLfoHz: 0.34,
    rainBaseLevel: 0.74,
    rainBodyMul: 1.0,
    rainHighMul: 1.05,
    rainWashMul: 0.55,
    streamGainMul: 1.18,
    mistHushGain: 0.025,
    sleetHissGain: 0.0001,
    ashRumbleGain: 0.008,
    wildlifeGain: 0.45,
  },
  storm: {
    toneCutoffHz: 8100,
    windGainMul: 1.54,
    windFreqOffset: 115,
    windQ: 3.0,
    windLfoHz: 0.21,
    howlGain: 0.145,
    howlFreqA: 640,
    howlFreqB: 980,
    howlQ: 11.0,
    howlLfoHz: 0.16,
    leafGainMul: 1.58,
    leafFreqOffset: 420,
    leafLfoHz: 0.48,
    rainBaseLevel: 0.94,
    rainBodyMul: 1.38,
    rainHighMul: 1.42,
    rainWashMul: 1.32,
    streamGainMul: 0.85,
    mistHushGain: 0.02,
    sleetHissGain: 0.018,
    ashRumbleGain: 0.052,
    wildlifeGain: 0.62,
  },
  blizzard: {
    toneCutoffHz: 5100,
    windGainMul: 1.72,
    windFreqOffset: 250,
    windQ: 4.1,
    windLfoHz: 0.25,
    howlGain: 0.22,
    howlFreqA: 760,
    howlFreqB: 1180,
    howlQ: 13.5,
    howlLfoHz: 0.19,
    leafGainMul: 0.96,
    leafFreqOffset: 680,
    leafLfoHz: 0.42,
    rainBaseLevel: 0,
    rainBodyMul: 0,
    rainHighMul: 0,
    rainWashMul: 0,
    streamGainMul: 0.35,
    mistHushGain: 0.036,
    sleetHissGain: 0.105,
    ashRumbleGain: 0.024,
    wildlifeGain: 0.48,
  },
  ashstorm: {
    toneCutoffHz: 2250,
    windGainMul: 1.46,
    windFreqOffset: -175,
    windQ: 1.75,
    windLfoHz: 0.17,
    howlGain: 0.088,
    howlFreqA: 340,
    howlFreqB: 520,
    howlQ: 9.2,
    howlLfoHz: 0.125,
    leafGainMul: 0.68,
    leafFreqOffset: -360,
    leafLfoHz: 0.28,
    rainBaseLevel: 0,
    rainBodyMul: 0,
    rainHighMul: 0,
    rainWashMul: 0,
    streamGainMul: 0.24,
    mistHushGain: 0.044,
    sleetHissGain: 0.038,
    ashRumbleGain: 0.21,
    wildlifeGain: 0.56,
  },
};

interface EvolutionSoundscapeProfile {
  level: number;
  name: string;
  rootHz: number;
  fifthHz: number;
  shimmerHz: number;
  oscTypeA: OscillatorType;
  oscTypeB: OscillatorType;
  filterHz: number;
  droneGain: number;
  shimmerGain: number;
  lfoHz: number;
  lfoDepth: number;
  windPitchBias: number;
  triggerKind: TierTriggerKind;
  minIntervalMs: number;
  maxIntervalMs: number;
}

/**
 * 12 unique ambient soundscape profiles spanning Tier 1 (Valley Hatchling)
 * through Tier 12 (Ascended Human). Progresses organically from low earthy
 * jungle-floor drones & insect/bamboo textures up to temple singing bowls,
 * crystalline ridge chimes, celestial choir swells, and radiant solar harmonies.
 */
const TIER_SOUNDSCAPES: readonly EvolutionSoundscapeProfile[] = [
  {
    level: 1,
    name: 'Valley Hatchling',
    rootHz: 73.42, // D2
    fifthHz: 110.0, // A2
    shimmerHz: 293.66, // D4
    oscTypeA: 'sine',
    oscTypeB: 'sine',
    filterHz: 310,
    droneGain: 0.024,
    shimmerGain: 0.003,
    lfoHz: 0.08,
    lfoDepth: 45,
    windPitchBias: -25,
    triggerKind: 'cicadaPulse',
    minIntervalMs: 3600,
    maxIntervalMs: 6200,
  },
  {
    level: 2,
    name: 'Foothill Viper',
    rootHz: 82.41, // E2
    fifthHz: 123.47, // B2
    shimmerHz: 329.63, // E4
    oscTypeA: 'sine',
    oscTypeB: 'triangle',
    filterHz: 350,
    droneGain: 0.026,
    shimmerGain: 0.004,
    lfoHz: 0.095,
    lfoDepth: 55,
    windPitchBias: -15,
    triggerKind: 'bambooClack',
    minIntervalMs: 3500,
    maxIntervalMs: 6000,
  },
  {
    level: 3,
    name: 'Mossback Cobra',
    rootHz: 92.5, // F#2
    fifthHz: 138.59, // C#3
    shimmerHz: 369.99, // F#4
    oscTypeA: 'sine',
    oscTypeB: 'triangle',
    filterHz: 400,
    droneGain: 0.028,
    shimmerGain: 0.005,
    lfoHz: 0.105,
    lfoDepth: 65,
    windPitchBias: -5,
    triggerKind: 'woodenMarimba',
    minIntervalMs: 3800,
    maxIntervalMs: 6500,
  },
  {
    level: 4,
    name: 'Horned Ridge Serpent',
    rootHz: 98.0, // G2
    fifthHz: 146.83, // D3
    shimmerHz: 392.0, // G4
    oscTypeA: 'triangle',
    oscTypeB: 'sine',
    filterHz: 440,
    droneGain: 0.031,
    shimmerGain: 0.006,
    lfoHz: 0.115,
    lfoDepth: 75,
    windPitchBias: 10,
    triggerKind: 'tribalDrum',
    minIntervalMs: 4200,
    maxIntervalMs: 7200,
  },
  {
    level: 5,
    name: 'Timber Wyrm',
    rootHz: 110.0, // A2
    fifthHz: 164.81, // E3
    shimmerHz: 440.0, // A4
    oscTypeA: 'sine',
    oscTypeB: 'triangle',
    filterHz: 500,
    droneGain: 0.032,
    shimmerGain: 0.008,
    lfoHz: 0.125,
    lfoDepth: 85,
    windPitchBias: 24,
    triggerKind: 'bambooFlute',
    minIntervalMs: 4400,
    maxIntervalMs: 7400,
  },
  {
    level: 6,
    name: 'Storm Drake',
    rootHz: 123.47, // B2
    fifthHz: 185.0, // F#3
    shimmerHz: 493.88, // B4
    oscTypeA: 'triangle',
    oscTypeB: 'triangle',
    filterHz: 580,
    droneGain: 0.035,
    shimmerGain: 0.01,
    lfoHz: 0.155,
    lfoDepth: 115,
    windPitchBias: 42,
    triggerKind: 'stormStaticChime',
    minIntervalMs: 3900,
    maxIntervalMs: 6800,
  },
  {
    level: 7,
    name: 'Cloud Serpent',
    rootHz: 138.59, // C#3
    fifthHz: 207.65, // G#3
    shimmerHz: 554.37, // C#5
    oscTypeA: 'sine',
    oscTypeB: 'triangle',
    filterHz: 650,
    droneGain: 0.036,
    shimmerGain: 0.012,
    lfoHz: 0.14,
    lfoDepth: 120,
    windPitchBias: 58,
    triggerKind: 'canyonHorn',
    minIntervalMs: 4600,
    maxIntervalMs: 7800,
  },
  {
    level: 8,
    name: 'Emerald Naga',
    rootHz: 146.83, // D3
    fifthHz: 220.0, // A3
    shimmerHz: 587.33, // D5
    oscTypeA: 'sine',
    oscTypeB: 'sine',
    filterHz: 740,
    droneGain: 0.038,
    shimmerGain: 0.015,
    lfoHz: 0.13,
    lfoDepth: 130,
    windPitchBias: 72,
    triggerKind: 'singingBowl',
    minIntervalMs: 4800,
    maxIntervalMs: 8000,
  },
  {
    level: 9,
    name: 'Mythic Naga Sage',
    rootHz: 164.81, // E3
    fifthHz: 246.94, // B3
    shimmerHz: 659.25, // E5
    oscTypeA: 'sine',
    oscTypeB: 'triangle',
    filterHz: 840,
    droneGain: 0.04,
    shimmerGain: 0.017,
    lfoHz: 0.145,
    lfoDepth: 145,
    windPitchBias: 88,
    triggerKind: 'mysticHarp',
    minIntervalMs: 4200,
    maxIntervalMs: 7200,
  },
  {
    level: 10,
    name: 'Awakened Stalker',
    rootHz: 185.0, // F#3
    fifthHz: 277.18, // C#4
    shimmerHz: 739.99, // F#5
    oscTypeA: 'sine',
    oscTypeB: 'triangle',
    filterHz: 940,
    droneGain: 0.042,
    shimmerGain: 0.019,
    lfoHz: 0.165,
    lfoDepth: 165,
    windPitchBias: 104,
    triggerKind: 'crystalChimes',
    minIntervalMs: 4000,
    maxIntervalMs: 6900,
  },
  {
    level: 11,
    name: 'Celestial Humanoid',
    rootHz: 196.0, // G3
    fifthHz: 293.66, // D4
    shimmerHz: 783.99, // G5
    oscTypeA: 'sine',
    oscTypeB: 'sine',
    filterHz: 1050,
    droneGain: 0.045,
    shimmerGain: 0.022,
    lfoHz: 0.12,
    lfoDepth: 180,
    windPitchBias: 120,
    triggerKind: 'etherealChoir',
    minIntervalMs: 4800,
    maxIntervalMs: 8000,
  },
  {
    level: 12,
    name: 'Ascended Human',
    rootHz: 220.0, // A3
    fifthHz: 329.63, // E4
    shimmerHz: 880.0, // A5
    oscTypeA: 'sine',
    oscTypeB: 'triangle',
    filterHz: 1180,
    droneGain: 0.048,
    shimmerGain: 0.025,
    lfoHz: 0.11,
    lfoDepth: 200,
    windPitchBias: 138,
    triggerKind: 'solarAscensionChime',
    minIntervalMs: 4500,
    maxIntervalMs: 7600,
  },
];

export type PeakAcousticCharacter =
  | 'foothill_breeze'
  | 'pine_wind'
  | 'tarn_water'
  | 'mist_veil'
  | 'crag_resonance'
  | 'glacier_crystal'
  | 'sunstone_radiance'
  | 'thunder_charge'
  | 'obsidian_abyss'
  | 'frostfang_chime'
  | 'dragonspine_gale'
  | 'crown_celestial';

export interface CultivationPeakSoundscapeProfile {
  peakId: string;
  tier: number;
  character: PeakAcousticCharacter;
  rootHz: number;
  masteryIntervalRatio: number;
  tensionIntervalRatio: number;
  overtoneRatio: number;
  airBandHz: number;
  airQ: number;
  airBaseGain: number;
  padBaseFilterHz: number;
  breathLfoHz: number;
}

/**
 * 12 bespoke acoustic signatures matching the 12 Trial Peaks in WORLD_LANDMARKS.
 * Each peak blends its elemental air texture and modal harmony with the player's
 * current Cultivation Tier (1..12) to create an evolving atmospheric soundscape.
 */
export const CULTIVATION_PEAK_SOUNDSCAPES: readonly CultivationPeakSoundscapeProfile[] = [
  {
    peakId: 'whispering-foothill',
    tier: 1,
    character: 'foothill_breeze',
    rootHz: 110.0, // A2
    masteryIntervalRatio: 1.5, // Perfect 5th
    tensionIntervalRatio: 1.335, // Sus4
    overtoneRatio: 3.0,
    airBandHz: 540,
    airQ: 2.2,
    airBaseGain: 0.048,
    padBaseFilterHz: 420,
    breathLfoHz: 0.11,
  },
  {
    peakId: 'pinecrest-lookout',
    tier: 2,
    character: 'pine_wind',
    rootHz: 123.47, // B2
    masteryIntervalRatio: 1.5,
    tensionIntervalRatio: 1.335,
    overtoneRatio: 3.0,
    airBandHz: 1180,
    airQ: 3.1,
    airBaseGain: 0.052,
    padBaseFilterHz: 480,
    breathLfoHz: 0.13,
  },
  {
    peakId: 'emerald-tarn-ridge',
    tier: 3,
    character: 'tarn_water',
    rootHz: 130.81, // C3
    masteryIntervalRatio: 1.498,
    tensionIntervalRatio: 1.335,
    overtoneRatio: 4.0,
    airBandHz: 1460,
    airQ: 4.2,
    airBaseGain: 0.056,
    padBaseFilterHz: 560,
    breathLfoHz: 0.14,
  },
  {
    peakId: 'misty-pass',
    tier: 4,
    character: 'mist_veil',
    rootHz: 146.83, // D3
    masteryIntervalRatio: 1.5,
    tensionIntervalRatio: 1.414, // Tritone mist suspension
    overtoneRatio: 3.0,
    airBandHz: 780,
    airQ: 2.6,
    airBaseGain: 0.062,
    padBaseFilterHz: 520,
    breathLfoHz: 0.095,
  },
  {
    peakId: 'ironback-ridge',
    tier: 5,
    character: 'crag_resonance',
    rootHz: 98.0, // G2 deep granite resonance
    masteryIntervalRatio: 1.5,
    tensionIntervalRatio: 1.189, // Minor 3rd dark crag
    overtoneRatio: 2.5,
    airBandHz: 380,
    airQ: 4.6,
    airBaseGain: 0.064,
    padBaseFilterHz: 460,
    breathLfoHz: 0.085,
  },
  {
    peakId: 'grand-glacier',
    tier: 6,
    character: 'glacier_crystal',
    rootHz: 164.81, // E3
    masteryIntervalRatio: 1.5,
    tensionIntervalRatio: 1.414,
    overtoneRatio: 4.0,
    airBandHz: 2680,
    airQ: 5.5,
    airBaseGain: 0.068,
    padBaseFilterHz: 740,
    breathLfoHz: 0.16,
  },
  {
    peakId: 'sunstone-citadel',
    tier: 7,
    character: 'sunstone_radiance',
    rootHz: 174.61, // F3
    masteryIntervalRatio: 1.5, // Warm Lydian-bright fifth
    tensionIntervalRatio: 1.335,
    overtoneRatio: 3.375, // Major 9th glint
    airBandHz: 1320,
    airQ: 3.2,
    airBaseGain: 0.058,
    padBaseFilterHz: 860,
    breathLfoHz: 0.12,
  },
  {
    peakId: 'sapphire-abyss',
    tier: 8,
    character: 'thunder_charge',
    rootHz: 146.83, // D3
    masteryIntervalRatio: 1.5,
    tensionIntervalRatio: 1.414,
    overtoneRatio: 3.5,
    airBandHz: 920,
    airQ: 6.2,
    airBaseGain: 0.072,
    padBaseFilterHz: 790,
    breathLfoHz: 0.21,
  },
  {
    peakId: 'obsidian-saddle',
    tier: 9,
    character: 'obsidian_abyss',
    rootHz: 87.31, // F2 volcanic abyss
    masteryIntervalRatio: 1.498,
    tensionIntervalRatio: 1.059, // Minor 2nd abyssal dread
    overtoneRatio: 2.828,
    airBandHz: 260,
    airQ: 3.8,
    airBaseGain: 0.076,
    padBaseFilterHz: 440,
    breathLfoHz: 0.075,
  },
  {
    peakId: 'frostfang-bastion',
    tier: 10,
    character: 'frostfang_chime',
    rootHz: 196.0, // G3
    masteryIntervalRatio: 1.5,
    tensionIntervalRatio: 1.414,
    overtoneRatio: 4.5,
    airBandHz: 3150,
    airQ: 6.4,
    airBaseGain: 0.074,
    padBaseFilterHz: 940,
    breathLfoHz: 0.18,
  },
  {
    peakId: 'dragonspine-spire',
    tier: 11,
    character: 'dragonspine_gale',
    rootHz: 207.65, // G#3
    masteryIntervalRatio: 1.5,
    tensionIntervalRatio: 1.335,
    overtoneRatio: 4.0,
    airBandHz: 1850,
    airQ: 5.0,
    airBaseGain: 0.078,
    padBaseFilterHz: 1080,
    breathLfoHz: 0.19,
  },
  {
    peakId: 'crown-of-humanity',
    tier: 12,
    character: 'crown_celestial',
    rootHz: 220.0, // A3 radiant summit
    masteryIntervalRatio: 1.5,
    tensionIntervalRatio: 1.414, // Lydian #4 celestial lift
    overtoneRatio: 4.5, // Celestial major 9th halo
    airBandHz: 2280,
    airQ: 4.4,
    airBaseGain: 0.07,
    padBaseFilterHz: 1320,
    breathLfoHz: 0.125,
  },
];

export interface PeakTierSoundscapeParams {
  activePeakId: string;
  peakTier: number;
  playerTier: number;
  character: PeakAcousticCharacter;
  proximity01: number;
  masteryResonance: boolean;
  harmonicTension01: number;
  padRootHz: number;
  padIntervalHz: number;
  padOvertoneHz: number;
  padFilterHz: number;
  padGain: number;
  overtoneGain: number;
  airFilterHz: number;
  airFilterQ: number;
  airGain: number;
  breathLfoHz: number;
}

/**
 * Pure synthesizer curve blending the active Cultivation Peak's elemental signature
 * with the player's current Cultivation Tier (1..12) and biome.
 * - Approaching a peak smoothly raises harmonic pad & elemental air intensity.
 * - Climbing a peak above the player's tier introduces modal harmonic tension;
 *   matching or surpassing the peak's tier blooms into consonant mastery resonance.
 */
export function computePeakTierSoundscapeParams(
  peakId: string | null | undefined,
  peakTier: number,
  proximity01: number,
  playerTier: number,
  biome: BiomeId = 'mountain',
): PeakTierSoundscapeParams {
  const clampedPeakTier = Math.max(1, Math.min(12, Math.round(peakTier || 1)));
  const clampedPlayerTier = Math.max(1, Math.min(12, Math.round(playerTier || 1)));
  const clampedProx = Math.max(0, Math.min(1, Number.isFinite(proximity01) ? proximity01 : 0));

  const profile =
    CULTIVATION_PEAK_SOUNDSCAPES.find((p) => p.peakId === peakId) ??
    CULTIVATION_PEAK_SOUNDSCAPES[clampedPeakTier - 1] ??
    CULTIVATION_PEAK_SOUNDSCAPES[0];

  const tierNorm = (clampedPlayerTier - 1) / 11; // 0..1 across 12 tiers
  const tierDelta = clampedPeakTier - clampedPlayerTier;
  const masteryResonance = clampedPlayerTier >= clampedPeakTier;
  const harmonicTension01 = masteryResonance
    ? 0
    : Number(Math.min(1, tierDelta / 6).toFixed(4));

  // Blend modal interval between mastery resonance and perilous higher-peak tension
  const intervalRatio =
    profile.masteryIntervalRatio * (1 - harmonicTension01) +
    profile.tensionIntervalRatio * harmonicTension01;

  // Higher player tiers lift the peak's tonal center slightly and open harmonic brightness
  const tierPitchLift = 1 + tierNorm * 0.14;
  const biomeWarmthMul = biome === 'jungle' ? 0.92 : 1.0;

  const padRootHz = Number((profile.rootHz * tierPitchLift * biomeWarmthMul).toFixed(2));
  const padIntervalHz = Number((padRootHz * intervalRatio).toFixed(2));
  const padOvertoneHz = Number(
    (padRootHz * profile.overtoneRatio * (masteryResonance ? 1.0 : 0.94)).toFixed(2),
  );

  const smoothProx = Math.pow(clampedProx, 1.2);
  const padFilterHz = Number(
    (
      (profile.padBaseFilterHz + tierNorm * 580 + smoothProx * 340 - harmonicTension01 * 140) *
      biomeWarmthMul
    ).toFixed(1),
  );
  const padGain = Number(
    (smoothProx * (0.022 + tierNorm * 0.02 + (masteryResonance ? 0.006 : 0.002))).toFixed(4),
  );
  const overtoneGain = Number(
    (
      smoothProx *
      (0.004 + tierNorm * 0.015) *
      (masteryResonance ? 1.18 : 0.65)
    ).toFixed(4),
  );

  const airFilterHz = Number(
    Math.max(180, profile.airBandHz * (biome === 'jungle' ? 0.84 : 1.0) + tierNorm * 180).toFixed(1),
  );
  const airFilterQ = Number((profile.airQ + harmonicTension01 * 1.4).toFixed(2));
  const airGain = Number(
    (smoothProx * profile.airBaseGain * (0.82 + tierNorm * 0.35)).toFixed(4),
  );
  const breathLfoHz = Number((profile.breathLfoHz + harmonicTension01 * 0.09).toFixed(3));

  return {
    activePeakId: profile.peakId,
    peakTier: profile.tier,
    playerTier: clampedPlayerTier,
    character: profile.character,
    proximity01: Number(clampedProx.toFixed(4)),
    masteryResonance,
    harmonicTension01,
    padRootHz,
    padIntervalHz,
    padOvertoneHz,
    padFilterHz,
    padGain,
    overtoneGain,
    airFilterHz,
    airFilterQ,
    airGain,
    breathLfoHz,
  };
}

/**
 * Procedural Web Audio synthesizer + dynamic biome-, weather-, and 12-tier
 * evolution-adaptive ambient soundscape.
 * Generates zero-asset SFX and looping ambient mountain/jungle audio layers
 * (wind gusts, rustling leaves, mist/fog acoustics, light rain patter, distant
 * birds/hawks, plus a 12-tier shifting harmonic bed & unique tier ambient triggers).
 */
export class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;
  private biome: BiomeId = 'mountain';
  private weather: WeatherMode = 'mist';
  private rainIntensity = 0;
  private evolutionLevel = 1;
  private pausedDuck = false;
  private tabHidden = false;

  // Volume levels: 0..1
  private masterVolume = 0.82;
  private ambientVolume = 1.0;
  private sfxVolume = 1.0;
  private musicVolume = 1.0;
  // A single master gain node that all SFX route through
  private sfxBus: GainNode | null = null;

  // Ambient soundscape graph nodes
  private ambientStarted = false;
  private pinkNoiseBuffer: AudioBuffer | null = null;
  private whiteNoiseBuffer: AudioBuffer | null = null;
  private ambientMasterGain: GainNode | null = null;
  private weatherToneFilter: BiquadFilterNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private windGain: GainNode | null = null;
  private windLfo: OscillatorNode | null = null;
  private windLfoGain: GainNode | null = null;
  private howlFilterA: BiquadFilterNode | null = null;
  private howlFilterB: BiquadFilterNode | null = null;
  private howlLfoA: OscillatorNode | null = null;
  private howlLfoB: OscillatorNode | null = null;
  private howlGain: GainNode | null = null;
  private leafFilter: BiquadFilterNode | null = null;
  private leafGain: GainNode | null = null;
  private leafLfo: OscillatorNode | null = null;
  private streamFilter: BiquadFilterNode | null = null;
  private streamGain: GainNode | null = null;
  private mistHushGain: GainNode | null = null;
  private rainBodyGain: GainNode | null = null;
  private rainHighGain: GainNode | null = null;
  private rainWashGain: GainNode | null = null;
  private sleetHissGain: GainNode | null = null;
  private ashRumbleGain: GainNode | null = null;
  private birdBus: GainNode | null = null;
  private ambientTimer = 0;

  // 12-Tier Evolution Soundscape nodes
  private tierOscA: OscillatorNode | null = null;
  private tierOscB: OscillatorNode | null = null;
  private tierOscShimmer: OscillatorNode | null = null;
  private tierShimmerGain: GainNode | null = null;
  private tierDroneFilter: BiquadFilterNode | null = null;
  private tierDroneGain: GainNode | null = null;
  private tierLfo: OscillatorNode | null = null;
  private tierLfoGain: GainNode | null = null;
  private tierTriggerBus: GainNode | null = null;
  private tierAmbientTimer = 0;
  private tierTransitionTimer = 0;
  private onWeatherAudioCue: ((cue: WeatherAudioCueEvent) => void) | null = null;

  // Portal 'Temporal Distortion' Proximity Drone nodes
  private portalCarrierOsc: OscillatorNode | null = null;
  private portalHarmonicOsc: OscillatorNode | null = null;
  private portalFmModOsc: OscillatorNode | null = null;
  private portalFmDepthGain: GainNode | null = null;
  private portalShimmerOsc: OscillatorNode | null = null;
  private portalShimmerGain: GainNode | null = null;
  private portalTimeLfo: OscillatorNode | null = null;
  private portalTimeLfoFilterGain: GainNode | null = null;
  private portalTimeLfoPitchGain: GainNode | null = null;
  private portalDroneFilter: BiquadFilterNode | null = null;
  private portalDronePanner: StereoPannerNode | null = null;
  private portalDroneGain: GainNode | null = null;
  private lastMirrorOrbitShimmerAt = 0;

  // Dynamic Cultivation Peak + Player Tier Atmosphere nodes
  private activePeakId: string | null = null;
  private activePeakTier = 1;
  private activePeakProximity = 0;
  private lastAnnouncedPeakId: string | null = null;
  private lastPeakAccentAt = 0;
  private peakOscA: OscillatorNode | null = null;
  private peakOscB: OscillatorNode | null = null;
  private peakOvertoneOsc: OscillatorNode | null = null;
  private peakOvertoneGain: GainNode | null = null;
  private peakPadFilter: BiquadFilterNode | null = null;
  private peakPadGain: GainNode | null = null;
  private peakBreathLfo: OscillatorNode | null = null;
  private peakBreathLfoGain: GainNode | null = null;
  private peakAirFilter: BiquadFilterNode | null = null;
  private peakAirGain: GainNode | null = null;

  public setWeatherAudioCueListener(fn: ((cue: WeatherAudioCueEvent) => void) | null): void {
    this.onWeatherAudioCue = fn;
  }

  private emitWeatherCue(kind: WeatherAudioCueKind, intensity: number, pan: number): void {
    if (!this.onWeatherAudioCue) return;
    this.onWeatherAudioCue({
      kind,
      intensity: Math.max(0.1, Math.min(1.2, intensity)),
      pan: Math.max(-1, Math.min(1, pan)),
    });
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && !this.sfxBus) {
      const bus = this.ctx.createGain();
      bus.gain.setValueAtTime(
        this.muted ? 0.0001 : Math.max(0.0001, this.sfxVolume * this.masterVolume),
        this.ctx.currentTime,
      );
      bus.connect(this.ctx.destination);
      this.sfxBus = bus;
    }
    if (this.ctx && this.ctx.state === 'suspended' && !this.muted) {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private getSfxDest(ctx: AudioContext): AudioNode {
    return this.sfxBus ?? ctx.destination;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(m: boolean): void {
    this.muted = m;
    this.updateAmbientGain();
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    if (!this.muted) {
      this.unlock();
      this.playClick();
    } else {
      this.updateAmbientGain();
    }
    return this.muted;
  }

  /** Master volume 0..1 — scales both ambient and SFX. */
  public getMasterVolume(): number { return this.masterVolume; }
  public setMasterVolume(v: number): void {
    this.masterVolume = Math.max(0, Math.min(1, v));
    this.updateAmbientGain();
  }

  /** Ambient-layer volume 0..1 (wind, birds, rain). */
  public getAmbientVolume(): number { return this.ambientVolume; }
  public setAmbientVolume(v: number): void {
    this.ambientVolume = Math.max(0, Math.min(1, v));
    this.updateAmbientGain();
  }

  /** SFX volume 0..1 (clicks, spells, combat). */
  public getSfxVolume(): number { return this.sfxVolume; }
  public setSfxVolume(v: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, v));
    if (this.ctx && this.sfxBus) {
      this.sfxBus.gain.setTargetAtTime(this.muted ? 0.0001 : this.sfxVolume * this.masterVolume, this.ctx.currentTime, 0.05);
    }
  }

  /** Music / Tier soundscape volume 0..1. */
  public getMusicVolume(): number { return this.musicVolume; }
  public setMusicVolume(v: number): void {
    this.musicVolume = Math.max(0, Math.min(1, v));
    this.updateAmbientGain();
  }

  public setPausedDuck(ducked: boolean): void {
    this.pausedDuck = ducked;
    this.updateAmbientGain();
  }

  public setTabHidden(hidden: boolean): void {
    this.tabHidden = hidden;
    this.updateAmbientGain();
  }

  /**
   * Unlocks Web Audio on the first user gesture and starts the procedural ambient layer.
   */
  public unlock(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (!this.ambientStarted) {
      this.startAmbientLayers(ctx);
    }
    this.updateAmbientGain();
  }

  /**
   * Smoothly adapts wind, leaf rustling, stream, and distant bird synthesis to the active biome.
   */
  public setBiome(biome: BiomeId): void {
    this.biome = biome;
    if (!this.ctx || !this.ambientStarted) return;
    this.applyBiomeParams(this.ctx, true);
    this.applyPeakAtmosphereParams(this.ctx, true);
  }

  public setWeather(weather: WeatherMode): void {
    const prev = this.weather;
    const changed = prev !== weather;
    this.weather = weather;
    const mix = WEATHER_SOUNDSCAPE_MIX[weather];
    if (mix.rainBaseLevel <= 0) {
      this.rainIntensity = 0;
    } else if (weather === 'storm') {
      this.rainIntensity = Math.max(this.rainIntensity, mix.rainBaseLevel);
    } else if (this.rainIntensity < 0.25) {
      this.rainIntensity = mix.rainBaseLevel;
    }
    if (!this.ctx || !this.ambientStarted) return;

    // Smooth ~1.15s exponential crossfade across all ambient soundscape stems
    this.applyBiomeParams(this.ctx, true, 1.15);

    if (changed && !this.muted && !this.tabHidden && this.ctx.state === 'running') {
      this.playWeatherTransitionFront(this.ctx, prev, weather);
      this.scheduleNextWildlifeEvent(850 + Math.random() * 650);
    }
  }

  public setRainIntensity(intensity01: number): void {
    const clamped = Math.max(0, Math.min(1, intensity01));
    if (Math.abs(clamped - this.rainIntensity) < 0.025) return;
    this.rainIntensity = clamped;
    if (!this.ctx || !this.ambientStarted) return;
    const now = this.ctx.currentTime;
    const mix = WEATHER_SOUNDSCAPE_MIX[this.weather];
    const active = mix.rainBaseLevel > 0 ? clamped : 0;
    if (this.rainBodyGain) {
      this.rainBodyGain.gain.setTargetAtTime(Math.max(0.0001, active * 0.24 * mix.rainBodyMul), now, 0.65);
    }
    if (this.rainHighGain) {
      this.rainHighGain.gain.setTargetAtTime(Math.max(0.0001, active * 0.115 * mix.rainHighMul), now, 0.65);
    }
    if (this.rainWashGain) {
      this.rainWashGain.gain.setTargetAtTime(Math.max(0.0001, active * 0.13 * mix.rainWashMul), now, 0.75);
    }
  }

  /**
   * Plays a stereo thunder crack + delayed valley rolling rumble synchronized
   * with visual storm lightning flashes in the 3D world.
   */
  public playLightningThunder(intensity = 1): void {
    if (this.muted || this.tabHidden || !this.ctx || !this.ambientStarted || this.ctx.state !== 'running') {
      return;
    }
    const ctx = this.ctx;
    const dest = this.ambientMasterGain ?? ctx.destination;
    const now = ctx.currentTime;
    const amp = Math.max(0.45, Math.min(1.25, intensity));
    const pan = (Math.random() - 0.5) * 1.4;
    const out = this.createPanner(ctx, dest, pan);
    this.emitWeatherCue('thunder_jolt', amp, pan);

    // 1. High-altitude crisp electric crack (short burst of bandpass white noise)
    if (this.whiteNoiseBuffer) {
      const crackSrc = ctx.createBufferSource();
      crackSrc.buffer = this.whiteNoiseBuffer;
      const crackBp = ctx.createBiquadFilter();
      crackBp.type = 'bandpass';
      crackBp.frequency.setValueAtTime(1650 + Math.random() * 550, now);
      crackBp.frequency.exponentialRampToValueAtTime(320, now + 0.28);
      crackBp.Q.value = 1.2;
      const crackGain = ctx.createGain();
      crackGain.gain.setValueAtTime(0.0001, now);
      crackGain.gain.linearRampToValueAtTime(0.14 * amp, now + 0.018);
      crackGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);
      crackSrc.connect(crackBp);
      crackBp.connect(crackGain);
      crackGain.connect(out);
      crackSrc.start(now, Math.random() * 2.5, 0.38);
    }

    // 2. Deep echoing valley thunder roll (delayed slightly for realistic distance)
    if (this.pinkNoiseBuffer) {
      const delayOffset = 0.14 + Math.random() * 0.24;
      const dur = 2.8 + Math.random() * 1.8;
      const rollSrc = ctx.createBufferSource();
      rollSrc.buffer = this.pinkNoiseBuffer;
      rollSrc.loop = true;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(220, now + delayOffset);
      lp.frequency.exponentialRampToValueAtTime(52, now + delayOffset + dur);
      const rollGain = ctx.createGain();
      rollGain.gain.setValueAtTime(0.0001, now + delayOffset);
      rollGain.gain.linearRampToValueAtTime(0.28 * amp, now + delayOffset + 0.22);
      rollGain.gain.exponentialRampToValueAtTime(0.09 * amp, now + delayOffset + dur * 0.45);
      rollGain.gain.linearRampToValueAtTime(0.14 * amp, now + delayOffset + dur * 0.58);
      rollGain.gain.exponentialRampToValueAtTime(0.0001, now + delayOffset + dur);
      rollSrc.connect(lp);
      lp.connect(rollGain);
      rollGain.connect(out);
      rollSrc.start(now + delayOffset, Math.random() * 4.5, dur + 0.1);
    }
  }

  /**
   * Shifts the continuous ambient harmonic bed and periodic soundscape triggers
   * to match the snake's active evolution tier (1..12).
   * When announceTransition is true, immediately plays a gentle tier-shift resonance
   * and introduces the newly unlocked tier's signature ambient trigger.
   */
  public setEvolutionTier(level: number, announceTransition = false): void {
    const clamped = Math.max(1, Math.min(TIER_SOUNDSCAPES.length, Math.round(level)));
    const changed = clamped !== this.evolutionLevel;
    this.evolutionLevel = clamped;
    if (!this.ctx || !this.ambientStarted) return;

    this.applyEvolutionTierParams(this.ctx, true);
    this.applyBiomeParams(this.ctx, true);
    this.applyPeakAtmosphereParams(this.ctx, true);

    if (announceTransition && !this.muted && !this.tabHidden && this.ctx.state === 'running') {
      const profile = this.getTierProfile(clamped);
      this.playTierTransitionSwell(this.ctx, profile);
      window.clearTimeout(this.tierTransitionTimer);
      this.tierTransitionTimer = window.setTimeout(() => {
        if (this.ctx && this.tierTriggerBus && !this.muted && !this.tabHidden && this.ctx.state === 'running') {
          this.playTierTrigger(this.ctx, this.tierTriggerBus, this.getTierProfile(this.evolutionLevel), true);
        }
      }, 420);
      this.scheduleNextTierEvent(4600);
    } else if (changed) {
      this.scheduleNextTierEvent(2200);
    }
  }

  private getTierProfile(level = this.evolutionLevel): EvolutionSoundscapeProfile {
    const idx = Math.max(0, Math.min(TIER_SOUNDSCAPES.length - 1, Math.round(level) - 1));
    return TIER_SOUNDSCAPES[idx];
  }

  private createPinkNoiseBuffer(ctx: AudioContext, seconds = 6): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);

    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      let b0 = 0;
      let b1 = 0;
      let b2 = 0;
      let b3 = 0;
      let b4 = 0;
      let b5 = 0;
      let b6 = 0;

      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.055;
        b6 = white * 0.115926;
      }

      // Crossfade loop seam (last 0.15s blended with first 0.15s) for click-free looping
      const fadeSamples = Math.floor(ctx.sampleRate * 0.15);
      for (let i = 0; i < fadeSamples; i++) {
        const t = i / fadeSamples;
        const endIdx = length - fadeSamples + i;
        data[endIdx] = data[endIdx] * (1 - t) + data[i] * t;
      }
    }
    return buffer;
  }

  private createWhiteNoiseBuffer(ctx: AudioContext, seconds = 4): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.36;
      }
      const fadeSamples = Math.floor(ctx.sampleRate * 0.12);
      for (let i = 0; i < fadeSamples; i++) {
        const t = i / fadeSamples;
        const endIdx = length - fadeSamples + i;
        data[endIdx] = data[endIdx] * (1 - t) + data[i] * t;
      }
    }
    return buffer;
  }

  private startAmbientLayers(ctx: AudioContext): void {
    this.ambientStarted = true;
    const noiseBuffer = this.createPinkNoiseBuffer(ctx, 6);
    const whiteBuffer = this.createWhiteNoiseBuffer(ctx, 4);
    this.pinkNoiseBuffer = noiseBuffer;
    this.whiteNoiseBuffer = whiteBuffer;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, ctx.currentTime);
    master.connect(ctx.destination);
    this.ambientMasterGain = master;

    // Weather acoustic shaper (bright in clear air, softly damped in mist, muffled in dense fog/ash)
    const weatherTone = ctx.createBiquadFilter();
    weatherTone.type = 'lowpass';
    weatherTone.frequency.value = 9500;
    weatherTone.Q.value = 0.5;
    weatherTone.connect(master);
    this.weatherToneFilter = weatherTone;

    // 1. Looping Wind Bed (filtered pink noise + slow organic gust LFOs)
    const windSrc = ctx.createBufferSource();
    windSrc.buffer = noiseBuffer;
    windSrc.loop = true;

    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 340;
    windFilter.Q.value = 1.6;

    const windGain = ctx.createGain();
    windGain.gain.value = 0.24;

    const windLfo = ctx.createOscillator();
    windLfo.type = 'sine';
    windLfo.frequency.value = 0.11;
    const windLfoGain = ctx.createGain();
    windLfoGain.gain.value = 130;
    windLfo.connect(windLfoGain);
    windLfoGain.connect(windFilter.frequency);

    const windAmpLfo = ctx.createOscillator();
    windAmpLfo.type = 'sine';
    windAmpLfo.frequency.value = 0.075;
    const windAmpLfoGain = ctx.createGain();
    windAmpLfoGain.gain.value = 0.08;
    windAmpLfo.connect(windAmpLfoGain);
    windAmpLfoGain.connect(windGain.gain);

    windSrc.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(weatherTone);

    windSrc.start(ctx.currentTime, 0);
    windLfo.start(ctx.currentTime);
    windAmpLfo.start(ctx.currentTime);

    this.windFilter = windFilter;
    this.windGain = windGain;
    this.windLfo = windLfo;
    this.windLfoGain = windLfoGain;

    // 1B. Dedicated Stereo Howling Wind Stem (dual high-Q resonant pitch-swept gales for storm/blizzard/ash)
    const howlBus = ctx.createGain();
    howlBus.gain.value = 0.0001;
    howlBus.connect(master);

    const howlSrcA = ctx.createBufferSource();
    howlSrcA.buffer = noiseBuffer;
    howlSrcA.loop = true;
    const howlFilterA = ctx.createBiquadFilter();
    howlFilterA.type = 'bandpass';
    howlFilterA.frequency.value = 640;
    howlFilterA.Q.value = 10.5;
    const howlLfoA = ctx.createOscillator();
    howlLfoA.type = 'sine';
    howlLfoA.frequency.value = 0.14;
    const howlLfoGainA = ctx.createGain();
    howlLfoGainA.gain.value = 190;
    howlLfoA.connect(howlLfoGainA);
    howlLfoGainA.connect(howlFilterA.frequency);
    const howlPanA = this.createPanner(ctx, howlBus, -0.55);
    howlSrcA.connect(howlFilterA);
    howlFilterA.connect(howlPanA);
    howlSrcA.start(ctx.currentTime, 0.7);
    howlLfoA.start(ctx.currentTime);

    const howlSrcB = ctx.createBufferSource();
    howlSrcB.buffer = noiseBuffer;
    howlSrcB.loop = true;
    const howlFilterB = ctx.createBiquadFilter();
    howlFilterB.type = 'bandpass';
    howlFilterB.frequency.value = 980;
    howlFilterB.Q.value = 12.0;
    const howlLfoB = ctx.createOscillator();
    howlLfoB.type = 'sine';
    howlLfoB.frequency.value = 0.095;
    const howlLfoGainB = ctx.createGain();
    howlLfoGainB.gain.value = 260;
    howlLfoB.connect(howlLfoGainB);
    howlLfoGainB.connect(howlFilterB.frequency);
    const howlGainB = ctx.createGain();
    howlGainB.gain.value = 0.72;
    const howlPanB = this.createPanner(ctx, howlBus, 0.55);
    howlSrcB.connect(howlFilterB);
    howlFilterB.connect(howlGainB);
    howlGainB.connect(howlPanB);
    howlSrcB.start(ctx.currentTime, 3.1);
    howlLfoB.start(ctx.currentTime);

    this.howlFilterA = howlFilterA;
    this.howlFilterB = howlFilterB;
    this.howlLfoA = howlLfoA;
    this.howlLfoB = howlLfoB;
    this.howlGain = howlBus;

    // 2. Looping Rustling Leaves / Pine Needles Layer (offset start so no phasing)
    const leafSrc = ctx.createBufferSource();
    leafSrc.buffer = noiseBuffer;
    leafSrc.loop = true;

    const leafFilter = ctx.createBiquadFilter();
    leafFilter.type = 'bandpass';
    leafFilter.frequency.value = 2850;
    leafFilter.Q.value = 1.1;

    const leafGain = ctx.createGain();
    leafGain.gain.value = 0.11;

    const leafLfo = ctx.createOscillator();
    leafLfo.type = 'sine';
    leafLfo.frequency.value = 0.24;
    const leafLfoGain = ctx.createGain();
    leafLfoGain.gain.value = 0.055;
    leafLfo.connect(leafLfoGain);
    leafLfoGain.connect(leafGain.gain);

    leafSrc.connect(leafFilter);
    leafFilter.connect(leafGain);
    leafGain.connect(weatherTone);

    leafSrc.start(ctx.currentTime, 2.3);
    leafLfo.start(ctx.currentTime);

    this.leafFilter = leafFilter;
    this.leafGain = leafGain;
    this.leafLfo = leafLfo;

    // 3. Distant Jungle River / Alpine Ridge Air Shimmer + Mist/Fog Hush Bed
    const streamSrc = ctx.createBufferSource();
    streamSrc.buffer = noiseBuffer;
    streamSrc.loop = true;

    const streamFilter = ctx.createBiquadFilter();
    streamFilter.type = 'bandpass';
    streamFilter.frequency.value = 1050;
    streamFilter.Q.value = 0.7;

    const streamGain = ctx.createGain();
    streamGain.gain.value = 0.08;

    streamSrc.connect(streamFilter);
    streamFilter.connect(streamGain);
    streamGain.connect(weatherTone);
    streamSrc.start(ctx.currentTime, 4.1);

    this.streamFilter = streamFilter;
    this.streamGain = streamGain;

    // 3B. Soft Atmospheric Mist / Fog Hush Bed (low-mid veiled valley pressure)
    const mistSrc = ctx.createBufferSource();
    mistSrc.buffer = noiseBuffer;
    mistSrc.loop = true;
    const mistFilter = ctx.createBiquadFilter();
    mistFilter.type = 'bandpass';
    mistFilter.frequency.value = 260;
    mistFilter.Q.value = 0.9;
    const mistHushGain = ctx.createGain();
    mistHushGain.gain.value = 0.0001;
    mistSrc.connect(mistFilter);
    mistFilter.connect(mistHushGain);
    mistHushGain.connect(master);
    mistSrc.start(ctx.currentTime, 5.05);
    this.mistHushGain = mistHushGain;

    // 4. Procedural 3-Band Rainfall Layer (warm body patter + crisp droplet hiss + downpour wash)
    const rainBodySrc = ctx.createBufferSource();
    rainBodySrc.buffer = noiseBuffer;
    rainBodySrc.loop = true;
    const rainBodyFilter = ctx.createBiquadFilter();
    rainBodyFilter.type = 'bandpass';
    rainBodyFilter.frequency.value = 1850;
    rainBodyFilter.Q.value = 0.65;
    const rainBodyGain = ctx.createGain();
    rainBodyGain.gain.value = 0.0001;
    rainBodySrc.connect(rainBodyFilter);
    rainBodyFilter.connect(rainBodyGain);
    rainBodyGain.connect(master);
    rainBodySrc.start(ctx.currentTime, 1.15);
    this.rainBodyGain = rainBodyGain;

    const rainHighSrc = ctx.createBufferSource();
    rainHighSrc.buffer = whiteBuffer;
    rainHighSrc.loop = true;
    const rainHighFilter = ctx.createBiquadFilter();
    rainHighFilter.type = 'highpass';
    rainHighFilter.frequency.value = 4800;
    const rainHighGain = ctx.createGain();
    rainHighGain.gain.value = 0.0001;
    rainHighSrc.connect(rainHighFilter);
    rainHighFilter.connect(rainHighGain);
    rainHighGain.connect(master);
    rainHighSrc.start(ctx.currentTime, 0.85);
    this.rainHighGain = rainHighGain;

    const rainWashSrc = ctx.createBufferSource();
    rainWashSrc.buffer = noiseBuffer;
    rainWashSrc.loop = true;
    const rainWashFilter = ctx.createBiquadFilter();
    rainWashFilter.type = 'lowpass';
    rainWashFilter.frequency.value = 680;
    const rainWashGain = ctx.createGain();
    rainWashGain.gain.value = 0.0001;
    rainWashSrc.connect(rainWashFilter);
    rainWashFilter.connect(rainWashGain);
    rainWashGain.connect(master);
    rainWashSrc.start(ctx.currentTime, 3.8);
    this.rainWashGain = rainWashGain;

    // 4B. Blizzard Crystalline Sleet Hiss & Volcanic Ashstorm Deep Rumble Stems
    const sleetSrc = ctx.createBufferSource();
    sleetSrc.buffer = whiteBuffer;
    sleetSrc.loop = true;
    const sleetFilter = ctx.createBiquadFilter();
    sleetFilter.type = 'bandpass';
    sleetFilter.frequency.value = 6200;
    sleetFilter.Q.value = 1.6;
    const sleetLfo = ctx.createOscillator();
    sleetLfo.type = 'sine';
    sleetLfo.frequency.value = 0.29;
    const sleetLfoGain = ctx.createGain();
    sleetLfoGain.gain.value = 1200;
    sleetLfo.connect(sleetLfoGain);
    sleetLfoGain.connect(sleetFilter.frequency);
    const sleetHissGain = ctx.createGain();
    sleetHissGain.gain.value = 0.0001;
    sleetSrc.connect(sleetFilter);
    sleetFilter.connect(sleetHissGain);
    sleetHissGain.connect(master);
    sleetSrc.start(ctx.currentTime, 2.1);
    sleetLfo.start(ctx.currentTime);
    this.sleetHissGain = sleetHissGain;

    const ashSrc = ctx.createBufferSource();
    ashSrc.buffer = noiseBuffer;
    ashSrc.loop = true;
    const ashFilter = ctx.createBiquadFilter();
    ashFilter.type = 'lowpass';
    ashFilter.frequency.value = 145;
    ashFilter.Q.value = 1.3;
    const ashLfo = ctx.createOscillator();
    ashLfo.type = 'sine';
    ashLfo.frequency.value = 0.13;
    const ashLfoGain = ctx.createGain();
    ashLfoGain.gain.value = 38;
    ashLfo.connect(ashLfoGain);
    ashLfoGain.connect(ashFilter.frequency);
    const ashRumbleGain = ctx.createGain();
    ashRumbleGain.gain.value = 0.0001;
    ashSrc.connect(ashFilter);
    ashFilter.connect(ashRumbleGain);
    ashRumbleGain.connect(master);
    ashSrc.start(ctx.currentTime, 1.9);
    ashLfo.start(ctx.currentTime);
    this.ashRumbleGain = ashRumbleGain;

    // 5. Distant Birds & Natural Wildlife Bus (with subtle canyon/canopy slapback echo)
    const birdBus = ctx.createGain();
    birdBus.gain.value = 0.9;

    const delay = ctx.createDelay(0.6);
    delay.delayTime.value = 0.26;
    const echoGain = ctx.createGain();
    echoGain.gain.value = 0.28;
    const echoFilter = ctx.createBiquadFilter();
    echoFilter.type = 'lowpass';
    echoFilter.frequency.value = 1800;

    birdBus.connect(weatherTone);
    birdBus.connect(delay);
    delay.connect(echoFilter);
    echoFilter.connect(echoGain);
    echoGain.connect(weatherTone);

    this.birdBus = birdBus;

    // 6. 12-Tier Evolution Ambient Harmonic Bed & Spatial Trigger Bus
    const tierDroneFilter = ctx.createBiquadFilter();
    tierDroneFilter.type = 'lowpass';
    tierDroneFilter.frequency.value = 340;
    tierDroneFilter.Q.value = 0.7;

    const tierDroneGain = ctx.createGain();
    tierDroneGain.gain.value = 0.024;

    const tierOscA = ctx.createOscillator();
    tierOscA.type = 'sine';
    tierOscA.frequency.value = 73.42;

    const tierOscB = ctx.createOscillator();
    tierOscB.type = 'sine';
    tierOscB.frequency.value = 110.0;
    tierOscB.detune.value = 3;
    const tierOscBGain = ctx.createGain();
    tierOscBGain.gain.value = 0.55;

    const tierOscShimmer = ctx.createOscillator();
    tierOscShimmer.type = 'sine';
    tierOscShimmer.frequency.value = 293.66;
    tierOscShimmer.detune.value = -4;
    const tierShimmerGain = ctx.createGain();
    tierShimmerGain.gain.value = 0.004;

    const tierLfo = ctx.createOscillator();
    tierLfo.type = 'sine';
    tierLfo.frequency.value = 0.09;
    const tierLfoGain = ctx.createGain();
    tierLfoGain.gain.value = 50;
    tierLfo.connect(tierLfoGain);
    tierLfoGain.connect(tierDroneFilter.frequency);

    tierOscA.connect(tierDroneFilter);
    tierOscB.connect(tierOscBGain);
    tierOscBGain.connect(tierDroneFilter);
    tierOscShimmer.connect(tierShimmerGain);
    tierShimmerGain.connect(tierDroneFilter);
    tierDroneFilter.connect(tierDroneGain);
    tierDroneGain.connect(weatherTone);

    tierOscA.start(ctx.currentTime);
    tierOscB.start(ctx.currentTime);
    tierOscShimmer.start(ctx.currentTime);
    tierLfo.start(ctx.currentTime);

    this.tierOscA = tierOscA;
    this.tierOscB = tierOscB;
    this.tierOscShimmer = tierOscShimmer;
    this.tierShimmerGain = tierShimmerGain;
    this.tierDroneFilter = tierDroneFilter;
    this.tierDroneGain = tierDroneGain;
    this.tierLfo = tierLfo;
    this.tierLfoGain = tierLfoGain;

    // Dedicated spacious echo bus for the 12 unique periodic tier ambient triggers
    const tierTriggerBus = ctx.createGain();
    tierTriggerBus.gain.value = 0.92;

    const tierDelay = ctx.createDelay(0.8);
    tierDelay.delayTime.value = 0.34;
    const tierEchoFilter = ctx.createBiquadFilter();
    tierEchoFilter.type = 'lowpass';
    tierEchoFilter.frequency.value = 2400;
    const tierEchoGain = ctx.createGain();
    tierEchoGain.gain.value = 0.34;
    const tierEchoFeedback = ctx.createGain();
    tierEchoFeedback.gain.value = 0.24;

    tierTriggerBus.connect(weatherTone);
    tierTriggerBus.connect(tierDelay);
    tierDelay.connect(tierEchoFilter);
    tierEchoFilter.connect(tierEchoGain);
    tierEchoGain.connect(weatherTone);
    tierEchoFilter.connect(tierEchoFeedback);
    tierEchoFeedback.connect(tierDelay);

    this.tierTriggerBus = tierTriggerBus;

    // 7. Procedural Portal 'Temporal Distortion' Proximity Drone Generator
    // Overlays a time-warping FM + binaural harmonic drone that rises in pitch,
    // LFO time-dilation wobble rate, filter resonance, and intensity as the player
    // approaches any 3D portal center.
    const portalDroneGain = ctx.createGain();
    portalDroneGain.gain.value = 0.0001;

    let portalDest: AudioNode = master;
    if (typeof ctx.createStereoPanner === 'function') {
      const panner = ctx.createStereoPanner();
      panner.pan.value = 0;
      panner.connect(master);
      this.portalDronePanner = panner;
      portalDest = panner;
    }
    portalDroneGain.connect(portalDest);

    const portalDroneFilter = ctx.createBiquadFilter();
    portalDroneFilter.type = 'lowpass';
    portalDroneFilter.frequency.value = 190;
    portalDroneFilter.Q.value = 2.0;
    portalDroneFilter.connect(portalDroneGain);

    const portalCarrierOsc = ctx.createOscillator();
    portalCarrierOsc.type = 'sawtooth';
    portalCarrierOsc.frequency.value = 58;

    const portalHarmonicOsc = ctx.createOscillator();
    portalHarmonicOsc.type = 'triangle';
    portalHarmonicOsc.frequency.value = 86.88;
    const portalHarmonicGain = ctx.createGain();
    portalHarmonicGain.gain.value = 0.72;

    // FM phase-warp modulator driving both carrier & harmonic frequencies
    const portalFmModOsc = ctx.createOscillator();
    portalFmModOsc.type = 'sine';
    portalFmModOsc.frequency.value = 116;
    const portalFmDepthGain = ctx.createGain();
    portalFmDepthGain.gain.value = 3;
    portalFmModOsc.connect(portalFmDepthGain);
    portalFmDepthGain.connect(portalCarrierOsc.frequency);
    portalFmDepthGain.connect(portalHarmonicOsc.frequency);

    // High-octave crystalline event-horizon shimmer oscillator
    const portalShimmerOsc = ctx.createOscillator();
    portalShimmerOsc.type = 'sine';
    portalShimmerOsc.frequency.value = 232;
    const portalShimmerGain = ctx.createGain();
    portalShimmerGain.gain.value = 0.0001;
    portalShimmerOsc.connect(portalShimmerGain);
    portalShimmerGain.connect(portalDroneFilter);

    // Temporal dilation wobble LFO modulating filter cutoff and carrier pitch
    const portalTimeLfo = ctx.createOscillator();
    portalTimeLfo.type = 'sine';
    portalTimeLfo.frequency.value = 0.75;
    const portalTimeLfoFilterGain = ctx.createGain();
    portalTimeLfoFilterGain.gain.value = 85;
    const portalTimeLfoPitchGain = ctx.createGain();
    portalTimeLfoPitchGain.gain.value = 2;
    portalTimeLfo.connect(portalTimeLfoFilterGain);
    portalTimeLfoFilterGain.connect(portalDroneFilter.frequency);
    portalTimeLfo.connect(portalTimeLfoPitchGain);
    portalTimeLfoPitchGain.connect(portalCarrierOsc.frequency);

    portalCarrierOsc.connect(portalDroneFilter);
    portalHarmonicOsc.connect(portalHarmonicGain);
    portalHarmonicGain.connect(portalDroneFilter);

    portalCarrierOsc.start(ctx.currentTime);
    portalHarmonicOsc.start(ctx.currentTime);
    portalFmModOsc.start(ctx.currentTime);
    portalShimmerOsc.start(ctx.currentTime);
    portalTimeLfo.start(ctx.currentTime);

    this.portalCarrierOsc = portalCarrierOsc;
    this.portalHarmonicOsc = portalHarmonicOsc;
    this.portalFmModOsc = portalFmModOsc;
    this.portalFmDepthGain = portalFmDepthGain;
    this.portalShimmerOsc = portalShimmerOsc;
    this.portalShimmerGain = portalShimmerGain;
    this.portalTimeLfo = portalTimeLfo;
    this.portalTimeLfoFilterGain = portalTimeLfoFilterGain;
    this.portalTimeLfoPitchGain = portalTimeLfoPitchGain;
    this.portalDroneFilter = portalDroneFilter;
    this.portalDroneGain = portalDroneGain;

    // 8. Dynamic Cultivation Peak + Player Tier Environmental Soundscape Layer
    // Blends each Trial Peak's elemental air texture and modal harmony with the player's
    // live cultivation tier, creating distinct summit atmospheres across all 12 peaks.
    const peakPadGain = ctx.createGain();
    peakPadGain.gain.value = 0.0001;
    peakPadGain.connect(weatherTone);

    const peakPadFilter = ctx.createBiquadFilter();
    peakPadFilter.type = 'lowpass';
    peakPadFilter.frequency.value = 460;
    peakPadFilter.Q.value = 1.65;
    peakPadFilter.connect(peakPadGain);

    const peakOscA = ctx.createOscillator();
    peakOscA.type = 'sine';
    peakOscA.frequency.value = 110;

    const peakOscB = ctx.createOscillator();
    peakOscB.type = 'triangle';
    peakOscB.frequency.value = 165;
    const peakOscBGain = ctx.createGain();
    peakOscBGain.gain.value = 0.56;

    const peakOvertoneOsc = ctx.createOscillator();
    peakOvertoneOsc.type = 'sine';
    peakOvertoneOsc.frequency.value = 330;
    const peakOvertoneGain = ctx.createGain();
    peakOvertoneGain.gain.value = 0.0001;

    const peakBreathLfo = ctx.createOscillator();
    peakBreathLfo.type = 'sine';
    peakBreathLfo.frequency.value = 0.11;
    const peakBreathLfoGain = ctx.createGain();
    peakBreathLfoGain.gain.value = 95;
    peakBreathLfo.connect(peakBreathLfoGain);
    peakBreathLfoGain.connect(peakPadFilter.frequency);

    peakOscA.connect(peakPadFilter);
    peakOscB.connect(peakOscBGain);
    peakOscBGain.connect(peakPadFilter);
    peakOvertoneOsc.connect(peakOvertoneGain);
    peakOvertoneGain.connect(peakPadFilter);

    // Peak elemental air bed (glacial shimmer, solar wind, granite resonance, abyssal hum)
    const peakAirSrc = ctx.createBufferSource();
    peakAirSrc.buffer = this.pinkNoiseBuffer;
    peakAirSrc.loop = true;
    const peakAirFilter = ctx.createBiquadFilter();
    peakAirFilter.type = 'bandpass';
    peakAirFilter.frequency.value = 540;
    peakAirFilter.Q.value = 2.4;
    const peakAirGain = ctx.createGain();
    peakAirGain.gain.value = 0.0001;
    peakAirSrc.connect(peakAirFilter);
    peakAirFilter.connect(peakAirGain);
    peakAirGain.connect(weatherTone);

    peakOscA.start(ctx.currentTime);
    peakOscB.start(ctx.currentTime);
    peakOvertoneOsc.start(ctx.currentTime);
    peakBreathLfo.start(ctx.currentTime);
    peakAirSrc.start(ctx.currentTime, 1.35);

    this.peakOscA = peakOscA;
    this.peakOscB = peakOscB;
    this.peakOvertoneOsc = peakOvertoneOsc;
    this.peakOvertoneGain = peakOvertoneGain;
    this.peakPadFilter = peakPadFilter;
    this.peakPadGain = peakPadGain;
    this.peakBreathLfo = peakBreathLfo;
    this.peakBreathLfoGain = peakBreathLfoGain;
    this.peakAirFilter = peakAirFilter;
    this.peakAirGain = peakAirGain;

    this.applyEvolutionTierParams(ctx, false);
    this.applyBiomeParams(ctx, false);
    this.applyPeakAtmosphereParams(ctx, false);
    this.scheduleNextWildlifeEvent(1100);
    this.scheduleNextTierEvent(1900);
  }

  /**
   * Dynamically adapts the environmental soundscape to the active Cultivation Peak
   * and the player's current Cultivation Tier (1..12). Smoothly crossfades harmonic
   * resonance and peak-specific elemental air textures as the player ascends each peak.
   */
  public setCultivationPeakAtmosphere(
    peakId: string | null,
    peakTier: number,
    proximity01: number,
    playerTier = this.evolutionLevel,
  ): void {
    const clampedProx = Math.max(0, Math.min(1, Number.isFinite(proximity01) ? proximity01 : 0));
    const clampedTier = Math.max(1, Math.min(12, Math.round(peakTier || 1)));
    const clampedPlayer = Math.max(1, Math.min(12, Math.round(playerTier || this.evolutionLevel)));

    const peakChanged = peakId !== this.activePeakId;
    const proxDelta = Math.abs(clampedProx - this.activePeakProximity);
    const playerChanged = clampedPlayer !== this.evolutionLevel;

    if (!peakChanged && !playerChanged && proxDelta < 0.02) return;

    this.activePeakId = peakId;
    this.activePeakTier = clampedTier;
    this.activePeakProximity = clampedProx;
    if (playerChanged) {
      this.evolutionLevel = clampedPlayer;
    }

    if (!this.ctx || !this.ambientStarted) return;
    const params = this.applyPeakAtmosphereParams(this.ctx, true);

    // Trigger a gentle peak-signature arrival swell when entering a new peak's upper slopes
    const nowMs = performance.now();
    if (
      peakId &&
      clampedProx >= 0.36 &&
      peakId !== this.lastAnnouncedPeakId &&
      nowMs - this.lastPeakAccentAt >= 7500 &&
      !this.muted &&
      !this.tabHidden &&
      this.ctx.state === 'running'
    ) {
      this.lastAnnouncedPeakId = peakId;
      this.lastPeakAccentAt = nowMs;
      this.playPeakArrivalAccent(this.ctx, params);
    } else if (clampedProx < 0.12 && this.lastAnnouncedPeakId === peakId) {
      this.lastAnnouncedPeakId = null;
    }
  }

  private applyPeakAtmosphereParams(
    ctx: AudioContext,
    smooth: boolean,
  ): PeakTierSoundscapeParams {
    const now = ctx.currentTime;
    const tau = smooth ? 0.65 : 0.06;
    const params = computePeakTierSoundscapeParams(
      this.activePeakId,
      this.activePeakTier,
      this.activePeakProximity,
      this.evolutionLevel,
      this.biome,
    );

    const mutedOrSilent = this.muted || this.tabHidden || params.proximity01 <= 0.005;
    if (this.peakPadGain) {
      this.peakPadGain.gain.setTargetAtTime(
        mutedOrSilent ? 0.0001 : Math.max(0.0001, params.padGain),
        now,
        tau,
      );
    }
    if (this.peakOvertoneGain) {
      this.peakOvertoneGain.gain.setTargetAtTime(
        mutedOrSilent ? 0.0001 : Math.max(0.0001, params.overtoneGain),
        now,
        tau,
      );
    }
    if (this.peakAirGain) {
      this.peakAirGain.gain.setTargetAtTime(
        mutedOrSilent ? 0.0001 : Math.max(0.0001, params.airGain),
        now,
        tau * 1.15,
      );
    }
    if (this.peakOscA) {
      this.peakOscA.frequency.setTargetAtTime(params.padRootHz, now, tau);
    }
    if (this.peakOscB) {
      this.peakOscB.frequency.setTargetAtTime(params.padIntervalHz, now, tau);
    }
    if (this.peakOvertoneOsc) {
      this.peakOvertoneOsc.frequency.setTargetAtTime(params.padOvertoneHz, now, tau);
    }
    if (this.peakPadFilter) {
      this.peakPadFilter.frequency.setTargetAtTime(params.padFilterHz, now, tau);
    }
    if (this.peakBreathLfo) {
      this.peakBreathLfo.frequency.setTargetAtTime(params.breathLfoHz, now, tau);
    }
    if (this.peakBreathLfoGain) {
      this.peakBreathLfoGain.gain.setTargetAtTime(
        75 + params.proximity01 * 120 + params.harmonicTension01 * 55,
        now,
        tau,
      );
    }
    if (this.peakAirFilter) {
      this.peakAirFilter.frequency.setTargetAtTime(params.airFilterHz, now, tau);
      this.peakAirFilter.Q.setTargetAtTime(params.airFilterQ, now, tau);
    }
    return params;
  }

  /**
   * Subtle atmospheric harmonic swell played when entering an active Cultivation Peak's zone,
   * voiced according to the peak's tonal center and whether the player's tier resonates with it.
   */
  private playPeakArrivalAccent(ctx: AudioContext, params: PeakTierSoundscapeParams): void {
    if (!this.ambientMasterGain) return;
    const now = ctx.currentTime;
    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, now);
    out.gain.linearRampToValueAtTime(0.042, now + 0.35);
    out.gain.exponentialRampToValueAtTime(0.0001, now + 2.3);
    out.connect(this.ambientMasterGain);

    const freqs = params.masteryResonance
      ? [params.padRootHz * 2, params.padIntervalHz * 2, params.padOvertoneHz]
      : [params.padRootHz * 2, params.padIntervalHz * 2];

    freqs.forEach((hz, idx) => {
      const osc = ctx.createOscillator();
      osc.type = idx === freqs.length - 1 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(Math.min(2600, hz), now + idx * 0.08);
      const voiceGain = ctx.createGain();
      voiceGain.gain.setValueAtTime(idx === 0 ? 0.45 : 0.28, now);
      osc.connect(voiceGain);
      voiceGain.connect(out);
      osc.start(now + idx * 0.08);
      osc.stop(now + 2.35);
    });
  }

  /**
   * Updates the procedural portal 'temporal distortion' drone generator based on the
   * player's live distance and stereo bearing to the nearest portal center.
   */
  public setPortalProximity(minDistance: number, variant: 'A' | 'B' = 'A', stereoPan = 0): void {
    if (!this.ctx || !this.ambientStarted || !this.portalDroneGain) return;
    const now = this.ctx.currentTime;
    const tau = 0.085;
    const params = computePortalTemporalDroneParams(minDistance, variant);

    if (this.muted || this.tabHidden || params.proximity01 <= 0.001) {
      this.portalDroneGain.gain.setTargetAtTime(0.0001, now, 0.14);
      if (this.portalShimmerGain) {
        this.portalShimmerGain.gain.setTargetAtTime(0.0001, now, 0.14);
      }
      return;
    }

    this.portalDroneGain.gain.setTargetAtTime(Math.max(0.0001, params.droneGain), now, tau);
    if (this.portalCarrierOsc) {
      this.portalCarrierOsc.frequency.setTargetAtTime(params.carrierHz, now, tau);
    }
    if (this.portalHarmonicOsc) {
      this.portalHarmonicOsc.frequency.setTargetAtTime(params.harmonicHz, now, tau);
    }
    if (this.portalFmModOsc) {
      this.portalFmModOsc.frequency.setTargetAtTime(params.modulatorHz, now, tau);
    }
    if (this.portalFmDepthGain) {
      this.portalFmDepthGain.gain.setTargetAtTime(params.fmDepthHz, now, tau);
    }
    if (this.portalTimeLfo) {
      this.portalTimeLfo.frequency.setTargetAtTime(params.lfoWobbleHz, now, tau);
    }
    if (this.portalTimeLfoPitchGain) {
      this.portalTimeLfoPitchGain.gain.setTargetAtTime(params.lfoPitchDepthHz, now, tau);
    }
    if (this.portalTimeLfoFilterGain) {
      this.portalTimeLfoFilterGain.gain.setTargetAtTime(65 + params.proximity01 * 520, now, tau);
    }
    if (this.portalDroneFilter) {
      this.portalDroneFilter.frequency.setTargetAtTime(params.filterCutoffHz, now, tau);
      this.portalDroneFilter.Q.setTargetAtTime(params.filterQ, now, tau);
    }
    if (this.portalShimmerOsc) {
      this.portalShimmerOsc.frequency.setTargetAtTime(params.shimmerHz, now, tau);
    }
    if (this.portalShimmerGain) {
      this.portalShimmerGain.gain.setTargetAtTime(Math.max(0.0001, params.shimmerGain), now, tau);
    }
    if (this.portalDronePanner) {
      const clampedPan = Math.max(-0.85, Math.min(0.85, stereoPan * (1 - params.proximity01 * 0.65)));
      this.portalDronePanner.pan.setTargetAtTime(clampedPan, now, tau);
    }
  }

  private applyEvolutionTierParams(ctx: AudioContext, smooth: boolean): void {
    const now = ctx.currentTime;
    const tau = smooth ? 1.15 : 0.06;
    const profile = this.getTierProfile();

    if (this.tierOscA) {
      this.tierOscA.type = profile.oscTypeA;
      this.tierOscA.frequency.setTargetAtTime(profile.rootHz, now, tau);
    }
    if (this.tierOscB) {
      this.tierOscB.type = profile.oscTypeB;
      this.tierOscB.frequency.setTargetAtTime(profile.fifthHz, now, tau);
    }
    if (this.tierOscShimmer) {
      this.tierOscShimmer.frequency.setTargetAtTime(profile.shimmerHz, now, tau);
    }
    if (this.tierShimmerGain) {
      this.tierShimmerGain.gain.setTargetAtTime(profile.shimmerGain, now, tau);
    }
    if (this.tierDroneFilter) {
      this.tierDroneFilter.frequency.setTargetAtTime(profile.filterHz, now, tau);
    }
    if (this.tierDroneGain) {
      this.tierDroneGain.gain.setTargetAtTime(profile.droneGain, now, tau);
    }
    if (this.tierLfo) {
      this.tierLfo.frequency.setTargetAtTime(profile.lfoHz, now, tau);
    }
    if (this.tierLfoGain) {
      this.tierLfoGain.gain.setTargetAtTime(profile.lfoDepth, now, tau);
    }
  }

  private applyBiomeParams(ctx: AudioContext, smooth: boolean, tauOverride?: number): void {
    const now = ctx.currentTime;
    const tau = smooth ? (tauOverride ?? 0.95) : 0.05;
    const isJungle = this.biome === 'jungle';
    const alt = this.altitudeFactor;
    const mix = WEATHER_SOUNDSCAPE_MIX[this.weather];
    const tierProfile = this.getTierProfile();

    // 1. Master Weather Acoustic Brightness Shaper
    if (this.weatherToneFilter) {
      this.weatherToneFilter.frequency.setTargetAtTime(mix.toneCutoffHz, now, tau);
    }

    // 2. Wind Bed Stem (valley breeze -> gale)
    if (this.windFilter && this.windGain && this.windLfoGain) {
      const baseFreq = isJungle ? 310 : 520;
      this.windFilter.frequency.setTargetAtTime(
        Math.max(145, baseFreq + alt * 260 + mix.windFreqOffset + tierProfile.windPitchBias),
        now,
        tau,
      );
      const qVal = isJungle ? Math.max(1.25, mix.windQ * 0.72) : mix.windQ + alt * 0.85;
      this.windFilter.Q.setTargetAtTime(qVal, now, tau);
      this.windGain.gain.setTargetAtTime(
        Math.max(0.0001, ((isJungle ? 0.21 : 0.29) + alt * 0.14) * mix.windGainMul),
        now,
        tau,
      );
      this.windLfoGain.gain.setTargetAtTime(
        ((isJungle ? 115 : 225) + alt * 95) * mix.windGainMul,
        now,
        tau,
      );
      if (this.windLfo) {
        this.windLfo.frequency.setTargetAtTime(mix.windLfoHz + alt * 0.04, now, tau);
      }
    }

    // 3. Stereo Howling Wind Stem (crossfades smoothly into storm/blizzard/ashstorm + faint high-altitude alpine howl)
    if (this.howlGain && this.howlFilterA && this.howlFilterB) {
      const altitudeHowl = isJungle ? 0 : Math.max(0, alt - 0.55) * 0.045;
      const targetHowl = Math.max(0.0001, mix.howlGain + altitudeHowl);
      this.howlGain.gain.setTargetAtTime(targetHowl, now, tau * 1.15);
      this.howlFilterA.frequency.setTargetAtTime(mix.howlFreqA + alt * 120, now, tau);
      this.howlFilterB.frequency.setTargetAtTime(mix.howlFreqB + alt * 150, now, tau);
      this.howlFilterA.Q.setTargetAtTime(mix.howlQ, now, tau);
      this.howlFilterB.Q.setTargetAtTime(mix.howlQ * 1.12, now, tau);
      if (this.howlLfoA) {
        this.howlLfoA.frequency.setTargetAtTime(mix.howlLfoHz, now, tau);
      }
      if (this.howlLfoB) {
        this.howlLfoB.frequency.setTargetAtTime(mix.howlLfoHz * 0.68, now, tau);
      }
    }

    // 4. Rustling Leaves / Canopy Foliage Stem
    if (this.leafFilter && this.leafGain) {
      const baseLeafHz = isJungle ? 2750 : 4050;
      this.leafFilter.frequency.setTargetAtTime(
        Math.max(1200, baseLeafHz + mix.leafFreqOffset),
        now,
        tau,
      );
      this.leafFilter.Q.setTargetAtTime(isJungle ? 1.0 : 1.65, now, tau);
      this.leafGain.gain.setTargetAtTime(
        Math.max(0.0001, (isJungle ? 0.145 : 0.088) * mix.leafGainMul),
        now,
        tau,
      );
      if (this.leafLfo) {
        this.leafLfo.frequency.setTargetAtTime(mix.leafLfoHz, now, tau);
      }
    }

    // 5. Distant Jungle River / Alpine Ridge Stream & Mist/Fog Hush Stems
    if (this.streamFilter && this.streamGain) {
      this.streamFilter.frequency.setTargetAtTime(isJungle ? 980 : 1450, now, tau);
      this.streamGain.gain.setTargetAtTime(
        Math.max(0.0001, (isJungle ? 0.095 : 0.055) * (1 - alt * 0.45) * mix.streamGainMul),
        now,
        tau,
      );
    }
    if (this.mistHushGain) {
      this.mistHushGain.gain.setTargetAtTime(Math.max(0.0001, mix.mistHushGain), now, tau * 1.2);
    }

    // 6. 3-Band Rainfall Stem (body patter, high droplet splash, downpour wash)
    const activeRain = mix.rainBaseLevel > 0 ? Math.max(this.rainIntensity, mix.rainBaseLevel * 0.65) : 0;
    if (this.rainBodyGain) {
      this.rainBodyGain.gain.setTargetAtTime(
        Math.max(0.0001, activeRain * 0.24 * mix.rainBodyMul),
        now,
        tau,
      );
    }
    if (this.rainHighGain) {
      this.rainHighGain.gain.setTargetAtTime(
        Math.max(0.0001, activeRain * 0.115 * mix.rainHighMul),
        now,
        tau,
      );
    }
    if (this.rainWashGain) {
      this.rainWashGain.gain.setTargetAtTime(
        Math.max(0.0001, activeRain * 0.13 * mix.rainWashMul),
        now,
        tau * 1.15,
      );
    }

    // 7. Blizzard Crystalline Sleet Hiss & Volcanic Ashstorm Deep Rumble Stems
    if (this.sleetHissGain) {
      this.sleetHissGain.gain.setTargetAtTime(Math.max(0.0001, mix.sleetHissGain), now, tau * 1.1);
    }
    if (this.ashRumbleGain) {
      this.ashRumbleGain.gain.setTargetAtTime(Math.max(0.0001, mix.ashRumbleGain), now, tau * 1.25);
    }

    // 8. Wildlife & Weather Event Bus
    if (this.birdBus) {
      this.birdBus.gain.setTargetAtTime(Math.max(0.0001, mix.wildlifeGain), now, tau);
    }
  }

  /**
   * Subtle atmospheric front sweep played whenever the weather setting transitions,
   * smoothly bridging the outgoing and incoming soundscapes.
   */
  private playWeatherTransitionFront(ctx: AudioContext, _from: WeatherMode, to: WeatherMode): void {
    const dest = this.ambientMasterGain ?? ctx.destination;
    if (!this.pinkNoiseBuffer) return;
    const now = ctx.currentTime;
    const isSevere = to === 'storm' || to === 'blizzard' || to === 'ashstorm';
    const dur = isSevere ? 2.4 : 1.7;

    const src = ctx.createBufferSource();
    src.buffer = this.pinkNoiseBuffer;
    src.loop = true;

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = to === 'blizzard' ? 4.8 : to === 'ashstorm' ? 1.8 : 2.2;
    const startHz = to === 'ashstorm' ? 180 : to === 'blizzard' ? 480 : 320;
    const peakHz = to === 'blizzard' ? 1650 : to === 'storm' ? 1150 : to === 'ashstorm' ? 420 : 960;
    bp.frequency.setValueAtTime(startHz, now);
    bp.frequency.exponentialRampToValueAtTime(peakHz, now + dur * 0.42);
    bp.frequency.exponentialRampToValueAtTime(startHz * 1.2, now + dur);

    const gain = ctx.createGain();
    const peakGain = isSevere ? 0.16 : 0.085;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peakGain, now + dur * 0.36);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    src.connect(bp);
    bp.connect(gain);
    gain.connect(dest);
    src.start(now, Math.random() * 4.0, dur + 0.08);
  }

  private altitudeFactor = 0;

  public setAltitudeFactor(factor01: number): void {
    const clamped = Math.max(0, Math.min(1, factor01));
    if (Math.abs(clamped - this.altitudeFactor) < 0.04) return;
    this.altitudeFactor = clamped;
    if (!this.ctx || !this.ambientStarted) return;
    this.applyBiomeParams(this.ctx, true);
  }

  private updateAmbientGain(): void {
    if (!this.ctx || !this.ambientMasterGain) return;
    const now = this.ctx.currentTime;
    let target = 0.54 * this.ambientVolume * this.masterVolume;
    if (this.muted || this.tabHidden) {
      target = 0.0001;
    } else if (this.pausedDuck) {
      target = 0.25 * this.ambientVolume * this.masterVolume;
    }
    this.ambientMasterGain.gain.setTargetAtTime(Math.max(0.0001, target), now, 0.35);
    if (this.sfxBus) {
      this.sfxBus.gain.setTargetAtTime(
        this.muted ? 0.0001 : Math.max(0.0001, this.sfxVolume * this.masterVolume),
        now,
        0.1,
      );
    }
    if (this.tierDroneGain) {
      let musicTarget = 0.024 * this.musicVolume * this.masterVolume;
      if (this.muted || this.tabHidden) {
        musicTarget = 0.0001;
      }
      this.tierDroneGain.gain.setTargetAtTime(Math.max(0.0001, musicTarget), now, 0.35);
    }
  }

  private scheduleNextWildlifeEvent(delayMs?: number): void {
    window.clearTimeout(this.ambientTimer);
    const nextMs =
      delayMs ??
      (this.weather === 'storm'
        ? 1100 + Math.random() * 1900
        : this.weather === 'rain'
          ? 1400 + Math.random() * 2300
          : this.weather === 'blizzard'
            ? 1700 + Math.random() * 2600
            : this.weather === 'ashstorm'
              ? 1800 + Math.random() * 2800
              : this.weather === 'fog'
                ? 3200 + Math.random() * 4600
                : this.biome === 'jungle'
                  ? 1800 + Math.random() * 3200
                  : 2900 + Math.random() * 4500);

    this.ambientTimer = window.setTimeout(() => {
      if (this.ctx && this.birdBus && !this.muted && !this.tabHidden && this.ctx.state === 'running') {
        if (this.weather === 'storm') {
          const r = Math.random();
          if (r < 0.44) {
            this.playDistantThunder(this.ctx, this.birdBus);
          } else if (r < 0.74) {
            this.playRainDrip(this.ctx, this.birdBus);
          } else {
            this.playLocalizedLeafRustle(this.ctx, this.birdBus, this.biome === 'jungle');
          }
        } else if (this.weather === 'ashstorm') {
          const r = Math.random();
          if (r < 0.48) {
            this.playAshEmberCrackle(this.ctx, this.birdBus);
          } else if (r < 0.82) {
            this.playDistantThunder(this.ctx, this.birdBus);
          } else {
            this.playLocalizedLeafRustle(this.ctx, this.birdBus, false);
          }
        } else if (this.weather === 'blizzard') {
          const r = Math.random();
          if (r < 0.65) {
            this.playBlizzardIceGust(this.ctx, this.birdBus);
          } else {
            this.playMountainWindWhistle(this.ctx, this.birdBus);
          }
        } else if (this.weather === 'rain' && this.rainIntensity > 0.2) {
          const r = Math.random();
          if (r < 0.56) {
            this.playRainDrip(this.ctx, this.birdBus);
          } else if (r < 0.76) {
            this.playDistantThunder(this.ctx, this.birdBus);
          } else {
            this.playLocalizedLeafRustle(this.ctx, this.birdBus, this.biome === 'jungle');
          }
        } else if (this.biome === 'jungle') {
          const roll = Math.random();
          if (roll < 0.42) {
            this.playJungleSongbird(this.ctx, this.birdBus);
          } else if (roll < 0.68) {
            this.playJungleChirpTrill(this.ctx, this.birdBus);
          } else if (roll < 0.84) {
            this.playJungleDoveCoo(this.ctx, this.birdBus);
          } else {
            this.playLocalizedLeafRustle(this.ctx, this.birdBus, true);
          }
        } else {
          const roll = Math.random();
          if (roll < 0.42) {
            this.playMountainWindWhistle(this.ctx, this.birdBus);
          } else if (roll < 0.74) {
            this.playMountainHawkCall(this.ctx, this.birdBus);
          } else {
            this.playLocalizedLeafRustle(this.ctx, this.birdBus, false);
          }
        }
      }
      this.scheduleNextWildlifeEvent();
    }, nextMs);
  }

  /**
   * Schedules periodic tier-specific ambient soundscape motifs unique to each of the 12 tiers.
   */
  private scheduleNextTierEvent(delayMs?: number): void {
    window.clearTimeout(this.tierAmbientTimer);
    const profile = this.getTierProfile();
    const span = Math.max(800, profile.maxIntervalMs - profile.minIntervalMs);
    const nextMs = delayMs ?? (profile.minIntervalMs + Math.random() * span);

    this.tierAmbientTimer = window.setTimeout(() => {
      if (
        this.ctx &&
        this.tierTriggerBus &&
        !this.muted &&
        !this.tabHidden &&
        this.ctx.state === 'running'
      ) {
        this.playTierTrigger(this.ctx, this.tierTriggerBus, this.getTierProfile(), false);
      }
      this.scheduleNextTierEvent();
    }, nextMs);
  }

  /**
   * Smooth harmonic bridge swell played when crossing into a new evolution tier's soundscape.
   */
  private playTierTransitionSwell(ctx: AudioContext, profile: EvolutionSoundscapeProfile): void {
    if (!this.tierTriggerBus) return;
    const now = ctx.currentTime;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.max(240, profile.filterHz * 0.65), now);
    filter.frequency.exponentialRampToValueAtTime(profile.filterHz * 2.2, now + 0.9);
    filter.frequency.exponentialRampToValueAtTime(profile.filterHz, now + 2.1);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.06, now + 0.55);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.25);

    const voices = [profile.rootHz * 2, profile.fifthHz * 2, profile.shimmerHz];
    voices.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      osc.type = idx === 1 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.detune.value = (idx - 1) * 5;
      osc.connect(filter);
      osc.start(now);
      osc.stop(now + 2.35);
    });

    filter.connect(gain);
    gain.connect(this.tierTriggerBus);
  }

  /**
   * Synthesizes one of 12 distinct ambient soundscape triggers, uniquely tied to the active tier.
   */
  private playTierTrigger(
    ctx: AudioContext,
    dest: AudioNode,
    profile: EvolutionSoundscapeProfile,
    prominent: boolean,
  ): void {
    const boost = prominent ? 1.45 : 1.0;
    const pan = (Math.random() - 0.5) * 1.45;
    const out = this.createPanner(ctx, dest, pan);
    const now = ctx.currentTime;

    switch (profile.triggerKind) {
      case 'cicadaPulse': {
        // Tier 1: Valley Hatchling — rhythmic jungle-floor cicada/cricket chirps
        const chirps = 4 + Math.floor(Math.random() * 3);
        const carrierHz = 4150 + Math.random() * 550;
        for (let i = 0; i < chirps; i++) {
          const t = now + i * 0.082;
          const osc = ctx.createOscillator();
          const bp = ctx.createBiquadFilter();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(carrierHz + (i % 2) * 140, t);
          bp.type = 'bandpass';
          bp.frequency.value = carrierHz;
          bp.Q.value = 6.5;
          gain.gain.setValueAtTime(0.0001, t);
          gain.gain.linearRampToValueAtTime(0.026 * boost, t + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.068);
          osc.connect(bp);
          bp.connect(gain);
          gain.connect(out);
          osc.start(t);
          osc.stop(t + 0.075);
        }
        break;
      }

      case 'bambooClack': {
        // Tier 2: Foothill Viper — hollow jungle bamboo clacks + subtle dry grass hiss
        const hits = [0, 0.14 + Math.random() * 0.06];
        hits.forEach((offset, idx) => {
          const t = now + offset;
          const osc = ctx.createOscillator();
          const bp = ctx.createBiquadFilter();
          const gain = ctx.createGain();
          const pitch = (idx === 0 ? 780 : 940) + Math.random() * 80;
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(pitch * 1.25, t);
          osc.frequency.exponentialRampToValueAtTime(pitch, t + 0.045);
          bp.type = 'bandpass';
          bp.frequency.value = pitch;
          bp.Q.value = 5.0;
          gain.gain.setValueAtTime(0.0001, t);
          gain.gain.linearRampToValueAtTime(0.045 * boost, t + 0.006);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
          osc.connect(bp);
          bp.connect(gain);
          gain.connect(out);
          osc.start(t);
          osc.stop(t + 0.12);
        });
        if (this.pinkNoiseBuffer) {
          const src = ctx.createBufferSource();
          src.buffer = this.pinkNoiseBuffer;
          const hp = ctx.createBiquadFilter();
          hp.type = 'bandpass';
          hp.frequency.setValueAtTime(3400, now + 0.06);
          hp.Q.value = 2.4;
          const nGain = ctx.createGain();
          nGain.gain.setValueAtTime(0.0001, now + 0.05);
          nGain.gain.linearRampToValueAtTime(0.032 * boost, now + 0.12);
          nGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);
          src.connect(hp);
          hp.connect(nGain);
          nGain.connect(out);
          src.start(now + 0.05, Math.random() * 4, 0.32);
        }
        break;
      }

      case 'woodenMarimba': {
        // Tier 3: Mossback Cobra — mossy jungle kalimba / hollow wooden marimba 3-note plink
        const scale = [369.99, 415.3, 493.88, 554.37, 659.25];
        const startIdx = Math.floor(Math.random() * 3);
        [0, 1, 2].forEach((step) => {
          const t = now + step * 0.16;
          const freq = scale[(startIdx + step) % scale.length];
          const osc = ctx.createOscillator();
          const overtone = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          overtone.type = 'triangle';
          osc.frequency.setValueAtTime(freq, t);
          overtone.frequency.setValueAtTime(freq * 3.98, t);
          const otGain = ctx.createGain();
          otGain.gain.setValueAtTime(0.18, t);
          otGain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);

          gain.gain.setValueAtTime(0.0001, t);
          gain.gain.linearRampToValueAtTime(0.042 * boost, t + 0.008);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.36);

          osc.connect(gain);
          overtone.connect(otGain);
          otGain.connect(gain);
          gain.connect(out);
          osc.start(t);
          overtone.start(t);
          osc.stop(t + 0.38);
          overtone.stop(t + 0.08);
        });
        break;
      }

      case 'tribalDrum': {
        // Tier 4: Horned Ridge Serpent — distant resonant jungle log-drum heartbeat double-thump
        const beats = [
          { t: 0, f1: 142, f2: 88, amp: 0.068 },
          { t: 0.24, f1: 122, f2: 76, amp: 0.054 },
        ];
        beats.forEach((b) => {
          const t = now + b.t;
          const osc = ctx.createOscillator();
          const lp = ctx.createBiquadFilter();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(b.f1, t);
          osc.frequency.exponentialRampToValueAtTime(b.f2, t + 0.16);
          lp.type = 'lowpass';
          lp.frequency.value = 320;
          gain.gain.setValueAtTime(0.0001, t);
          gain.gain.linearRampToValueAtTime(b.amp * boost, t + 0.012);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
          osc.connect(lp);
          lp.connect(gain);
          gain.connect(out);
          osc.start(t);
          osc.stop(t + 0.42);
        });
        break;
      }

      case 'bambooFlute': {
        // Tier 5: Timber Wyrm — breathy wooden mountain flute pentatonic sigh
        const pairs = [
          [440.0, 493.88],
          [554.37, 493.88],
          [659.25, 587.33],
        ];
        const [f1, f2] = pairs[Math.floor(Math.random() * pairs.length)];
        const osc = ctx.createOscillator();
        const vib = ctx.createOscillator();
        const vibGain = ctx.createGain();
        const lp = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(f1, now);
        osc.frequency.exponentialRampToValueAtTime(f2, now + 0.48);

        vib.type = 'sine';
        vib.frequency.value = 5.2;
        vibGain.gain.value = 6.5;
        vib.connect(vibGain);
        vibGain.connect(osc.frequency);

        lp.type = 'lowpass';
        lp.frequency.value = 1400;

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.036 * boost, now + 0.18);
        gain.gain.setValueAtTime(0.032 * boost, now + 0.56);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.05);

        osc.connect(lp);
        lp.connect(gain);
        gain.connect(out);
        osc.start(now);
        vib.start(now);
        osc.stop(now + 1.1);
        vib.stop(now + 1.1);

        if (this.pinkNoiseBuffer) {
          const breath = ctx.createBufferSource();
          breath.buffer = this.pinkNoiseBuffer;
          const bp = ctx.createBiquadFilter();
          bp.type = 'bandpass';
          bp.frequency.value = f1 * 2.1;
          bp.Q.value = 4.5;
          const bGain = ctx.createGain();
          bGain.gain.setValueAtTime(0.0001, now);
          bGain.gain.linearRampToValueAtTime(0.02 * boost, now + 0.2);
          bGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.95);
          breath.connect(bp);
          bp.connect(bGain);
          bGain.connect(out);
          breath.start(now, Math.random() * 3, 1.0);
        }
        break;
      }

      case 'stormStaticChime': {
        // Tier 6: Storm Drake — crackling storm-front shimmer + low thunder hum
        const sparks = 3 + Math.floor(Math.random() * 2);
        for (let i = 0; i < sparks; i++) {
          const t = now + i * 0.095 + Math.random() * 0.04;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const f = 1240 + Math.random() * 980;
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(f, t);
          osc.frequency.exponentialRampToValueAtTime(f * 0.68, t + 0.11);
          gain.gain.setValueAtTime(0.0001, t);
          gain.gain.linearRampToValueAtTime(0.025 * boost, t + 0.008);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
          osc.connect(gain);
          gain.connect(out);
          osc.start(t);
          osc.stop(t + 0.15);
        }
        const hum = ctx.createOscillator();
        const humLp = ctx.createBiquadFilter();
        const humGain = ctx.createGain();
        hum.type = 'sawtooth';
        hum.frequency.setValueAtTime(123.47, now);
        hum.frequency.exponentialRampToValueAtTime(92.5, now + 1.15);
        humLp.type = 'lowpass';
        humLp.frequency.value = 240;
        humGain.gain.setValueAtTime(0.0001, now);
        humGain.gain.linearRampToValueAtTime(0.032 * boost, now + 0.25);
        humGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.25);
        hum.connect(humLp);
        humLp.connect(humGain);
        humGain.connect(out);
        hum.start(now);
        hum.stop(now + 1.3);
        break;
      }

      case 'canyonHorn': {
        // Tier 7: Cloud Serpent — distant echoing alpine canyon horn fifth swell
        const freqs = [207.65, 311.13]; // G#3 + D#4
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(420, now);
        lp.frequency.exponentialRampToValueAtTime(1150, now + 0.55);
        lp.frequency.exponentialRampToValueAtTime(380, now + 1.7);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.036 * boost, now + 0.45);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);

        freqs.forEach((f, idx) => {
          const osc = ctx.createOscillator();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(f, now);
          osc.detune.value = idx === 0 ? -4 : 4;
          osc.connect(lp);
          osc.start(now);
          osc.stop(now + 1.85);
        });
        lp.connect(gain);
        gain.connect(out);
        break;
      }

      case 'singingBowl': {
        // Tier 8: Emerald Naga — resonant bronze temple singing bowl with gentle beating overtones
        const base = [293.66, 329.63, 440.0][Math.floor(Math.random() * 3)];
        const partials = [
          { mult: 1.0, detune: 0, amp: 0.038, dur: 2.3 },
          { mult: 1.0, detune: 5.5, amp: 0.022, dur: 2.1 },
          { mult: 2.756, detune: -3, amp: 0.014, dur: 1.5 },
        ];
        partials.forEach((p) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(base * p.mult, now);
          osc.detune.value = p.detune;
          gain.gain.setValueAtTime(0.0001, now);
          gain.gain.linearRampToValueAtTime(p.amp * boost, now + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + p.dur);
          osc.connect(gain);
          gain.connect(out);
          osc.start(now);
          osc.stop(now + p.dur + 0.08);
        });
        break;
      }

      case 'mysticHarp': {
        // Tier 9: Mythic Naga Sage — plucked temple harp / sitar pentatonic glissando
        const notes = [329.63, 392.0, 493.88, 587.33, 659.25];
        const ascending = Math.random() > 0.35;
        const seq = ascending ? notes.slice(0, 4) : notes.slice(1).reverse();
        seq.forEach((freq, idx) => {
          const t = now + idx * 0.115;
          const osc = ctx.createOscillator();
          const lp = ctx.createBiquadFilter();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, t);
          lp.type = 'lowpass';
          lp.frequency.setValueAtTime(freq * 4.2, t);
          lp.frequency.exponentialRampToValueAtTime(freq * 1.4, t + 0.75);
          gain.gain.setValueAtTime(0.0001, t);
          gain.gain.linearRampToValueAtTime(0.036 * boost, t + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.85);
          osc.connect(lp);
          lp.connect(gain);
          gain.connect(out);
          osc.start(t);
          osc.stop(t + 0.9);
        });
        break;
      }

      case 'crystalChimes': {
        // Tier 10: Awakened Stalker — shimmering high-altitude jade/ice wind-chime cluster
        const bellSet = [739.99, 880.0, 1108.73, 1318.51, 1479.98];
        const count = 4;
        for (let i = 0; i < count; i++) {
          const t = now + i * (0.08 + Math.random() * 0.09);
          const freq = bellSet[Math.floor(Math.random() * bellSet.length)];
          const osc = ctx.createOscillator();
          const shimmer = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          shimmer.type = 'sine';
          osc.frequency.setValueAtTime(freq, t);
          shimmer.frequency.setValueAtTime(freq * 2.005, t);
          const sGain = ctx.createGain();
          sGain.gain.value = 0.25;
          gain.gain.setValueAtTime(0.0001, t);
          gain.gain.linearRampToValueAtTime(0.028 * boost, t + 0.012);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.15);
          osc.connect(gain);
          shimmer.connect(sGain);
          sGain.connect(gain);
          gain.connect(out);
          osc.start(t);
          shimmer.start(t);
          osc.stop(t + 1.2);
          shimmer.stop(t + 1.2);
        }
        break;
      }

      case 'etherealChoir': {
        // Tier 11: Celestial Humanoid — ethereal dual-formant vocal choir pad swell
        const chord = [392.0, 493.88, 587.33]; // G4, B4, D5
        const formantA = ctx.createBiquadFilter();
        formantA.type = 'bandpass';
        formantA.frequency.value = 720;
        formantA.Q.value = 3.2;

        const formantB = ctx.createBiquadFilter();
        formantB.type = 'bandpass';
        formantB.frequency.value = 1280;
        formantB.Q.value = 4.0;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.044 * boost, now + 0.72);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.35);

        chord.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, now);
          osc.detune.value = (idx - 1) * 6;
          osc.connect(formantA);
          osc.connect(formantB);
          osc.start(now);
          osc.stop(now + 2.45);
        });

        formantA.connect(gain);
        formantB.connect(gain);
        gain.connect(out);
        break;
      }

      case 'solarAscensionChime': {
        // Tier 12: Ascended Human — radiant solar harp cascade & golden harmonic bell chord
        const chord = [440.0, 554.37, 659.25, 880.0, 1108.73]; // A major celestial ninth
        chord.forEach((freq, idx) => {
          const t = now + idx * 0.095;
          const osc = ctx.createOscillator();
          const over = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          over.type = 'sine';
          osc.frequency.setValueAtTime(freq, t);
          over.frequency.setValueAtTime(freq * 2, t);
          const overGain = ctx.createGain();
          overGain.gain.value = 0.28;

          gain.gain.setValueAtTime(0.0001, t);
          gain.gain.linearRampToValueAtTime(0.032 * boost, t + 0.025);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.85);

          osc.connect(gain);
          over.connect(overGain);
          overGain.connect(gain);
          gain.connect(out);
          osc.start(t);
          over.start(t);
          osc.stop(t + 1.9);
          over.stop(t + 1.9);
        });
        break;
      }
    }
  }

  /**
   * Soft stereo-panned water droplet plink off pine boughs / jungle foliage during light rain.
   */
  private playRainDrip(ctx: AudioContext, dest: AudioNode): void {
    const now = ctx.currentTime;
    const pan = (Math.random() - 0.5) * 1.7;
    const out = this.createPanner(ctx, dest, pan);
    this.emitWeatherCue(
      'rain_splash',
      Math.max(0.35, this.rainIntensity * (this.weather === 'storm' ? 1.1 : 0.88)),
      pan,
    );
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    const startF = 1150 + Math.random() * 850;
    osc.frequency.setValueAtTime(startF, now);
    osc.frequency.exponentialRampToValueAtTime(startF * 1.48, now + 0.055);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.032, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
    osc.connect(gain);
    gain.connect(out);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  /**
   * Very gentle distant mountain valley thunder roll during rain/storm/ashstorm.
   * Reuses the cached pink noise buffer with zero per-event buffer allocation.
   */
  private playDistantThunder(ctx: AudioContext, dest: AudioNode): void {
    if (!this.pinkNoiseBuffer) return;
    const now = ctx.currentTime;
    const dur = 2.6 + Math.random() * 1.6;
    const pan = (Math.random() - 0.5) * 1.2;
    const out = this.createPanner(ctx, dest, pan);
    this.emitWeatherCue(
      'thunder_jolt',
      this.weather === 'storm' ? 0.78 : 0.45,
      pan,
    );
    const src = ctx.createBufferSource();
    src.buffer = this.pinkNoiseBuffer;
    src.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(155, now);
    filter.frequency.exponentialRampToValueAtTime(54, now + dur);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.42);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(out);
    src.start(now, Math.random() * 4.5, dur + 0.08);
  }

  /**
   * Stereo blizzard ice-squall gust: sweeping crystalline sleet spray + eerie high gale whistle.
   */
  private playBlizzardIceGust(ctx: AudioContext, dest: AudioNode): void {
    const now = ctx.currentTime;
    const dur = 1.6 + Math.random() * 1.3;
    const pan = (Math.random() - 0.5) * 1.5;
    const out = this.createPanner(ctx, dest, pan);
    this.emitWeatherCue('blizzard_gust', 0.72 + Math.random() * 0.28, pan);

    if (this.whiteNoiseBuffer) {
      const src = ctx.createBufferSource();
      src.buffer = this.whiteNoiseBuffer;
      src.loop = true;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.value = 3.2;
      bp.frequency.setValueAtTime(2200 + Math.random() * 900, now);
      bp.frequency.exponentialRampToValueAtTime(5400 + Math.random() * 1200, now + dur * 0.45);
      bp.frequency.exponentialRampToValueAtTime(1800, now + dur);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.075, now + dur * 0.35);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      src.connect(bp);
      bp.connect(gain);
      gain.connect(out);
      src.start(now, Math.random() * 2.5, dur + 0.06);
    }

    // Piercing high-altitude howl overtone
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    const f0 = 620 + Math.random() * 340;
    osc.frequency.setValueAtTime(f0, now);
    osc.frequency.linearRampToValueAtTime(f0 * 1.34, now + dur * 0.48);
    osc.frequency.linearRampToValueAtTime(f0 * 0.82, now + dur);
    const oGain = ctx.createGain();
    oGain.gain.setValueAtTime(0.0001, now);
    oGain.gain.linearRampToValueAtTime(0.026, now + dur * 0.38);
    oGain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(oGain);
    oGain.connect(out);
    osc.start(now);
    osc.stop(now + dur + 0.06);
  }

  /**
   * Stereo volcanic ashstorm cinder crackles + muffled tectonic pressure groan.
   */
  private playAshEmberCrackle(ctx: AudioContext, dest: AudioNode): void {
    const now = ctx.currentTime;
    const pan = (Math.random() - 0.5) * 1.6;
    const out = this.createPanner(ctx, dest, pan);
    this.emitWeatherCue('ash_cinder', 0.65 + Math.random() * 0.35, pan);

    if (this.whiteNoiseBuffer) {
      const snaps = 3 + Math.floor(Math.random() * 4);
      for (let i = 0; i < snaps; i++) {
        const t = now + i * (0.065 + Math.random() * 0.09);
        const src = ctx.createBufferSource();
        src.buffer = this.whiteNoiseBuffer;
        const hp = ctx.createBiquadFilter();
        hp.type = 'bandpass';
        hp.frequency.value = 3400 + Math.random() * 2800;
        hp.Q.value = 4.5;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.linearRampToValueAtTime(0.065 + Math.random() * 0.04, t + 0.004);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.032);
        src.connect(hp);
        hp.connect(gain);
        gain.connect(out);
        src.start(t, Math.random() * 3.0, 0.045);
      }
    }

    const groan = ctx.createOscillator();
    groan.type = 'triangle';
    const dur = 1.4 + Math.random() * 0.8;
    groan.frequency.setValueAtTime(76 + Math.random() * 22, now);
    groan.frequency.exponentialRampToValueAtTime(42, now + dur);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 180;
    const gGain = ctx.createGain();
    gGain.gain.setValueAtTime(0.0001, now);
    gGain.gain.linearRampToValueAtTime(0.065, now + 0.35);
    gGain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    groan.connect(lp);
    lp.connect(gGain);
    gGain.connect(out);
    groan.start(now);
    groan.stop(now + dur + 0.06);
  }

  private createPanner(ctx: AudioContext, dest: AudioNode, panVal: number): AudioNode {
    if (typeof ctx.createStereoPanner === 'function') {
      const panner = ctx.createStereoPanner();
      panner.pan.value = Math.max(-0.85, Math.min(0.85, panVal));
      panner.connect(dest);
      return panner;
    }
    return dest;
  }

  /**
   * Distant melodic tropical bird warble (2-3 flute-like glided notes).
   */
  private playJungleSongbird(ctx: AudioContext, dest: AudioNode): void {
    const now = ctx.currentTime;
    const out = this.createPanner(ctx, dest, (Math.random() - 0.5) * 1.5);
    const base = 1450 + Math.random() * 650;
    const notes = [
      { t: 0, f1: base, f2: base * 1.24, dur: 0.14 },
      { t: 0.17, f1: base * 1.28, f2: base * 1.06, dur: 0.18 },
      ...(Math.random() > 0.45
        ? [{ t: 0.39, f1: base * 1.15, f2: base * 1.38, dur: 0.16 }]
        : []),
    ];

    for (const n of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(n.f1, now + n.t);
      osc.frequency.exponentialRampToValueAtTime(n.f2, now + n.t + n.dur);

      const peak = 0.028 + Math.random() * 0.022;
      gain.gain.setValueAtTime(0.0001, now + n.t);
      gain.gain.linearRampToValueAtTime(peak, now + n.t + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + n.t + n.dur);

      osc.connect(gain);
      gain.connect(out);
      osc.start(now + n.t);
      osc.stop(now + n.t + n.dur + 0.03);
    }
  }

  /**
   * Rapid distant canopy bird trill (3-5 crisp chirps).
   */
  private playJungleChirpTrill(ctx: AudioContext, dest: AudioNode): void {
    const now = ctx.currentTime;
    const out = this.createPanner(ctx, dest, (Math.random() - 0.5) * 1.6);
    const count = 3 + Math.floor(Math.random() * 3);
    const startFreq = 2500 + Math.random() * 900;

    for (let i = 0; i < count; i++) {
      const t = now + i * 0.085;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const f = startFreq - i * 110;
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.exponentialRampToValueAtTime(f * 0.76, t + 0.06);

      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.024, t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.068);

      osc.connect(gain);
      gain.connect(out);
      osc.start(t);
      osc.stop(t + 0.08);
    }
  }

  /**
   * Soft warm jungle dove / owl coo in the distance.
   */
  private playJungleDoveCoo(ctx: AudioContext, dest: AudioNode): void {
    const now = ctx.currentTime;
    const out = this.createPanner(ctx, dest, (Math.random() - 0.5) * 1.3);
    const f = 490 + Math.random() * 90;

    for (let i = 0; i < 2; i++) {
      const t = now + i * 0.34;
      const dur = i === 0 ? 0.24 : 0.38;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f * (i === 0 ? 1 : 0.94), t);
      osc.frequency.exponentialRampToValueAtTime(f * (i === 0 ? 1.06 : 0.84), t + dur);

      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.032, t + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

      osc.connect(gain);
      gain.connect(out);
      osc.start(t);
      osc.stop(t + dur + 0.04);
    }
  }

  /**
   * Spacious distant mountain hawk / eagle cry gliding down a valley.
   */
  private playMountainHawkCall(ctx: AudioContext, dest: AudioNode): void {
    const now = ctx.currentTime;
    const out = this.createPanner(ctx, dest, (Math.random() - 0.5) * 1.5);
    const dur = 0.72 + Math.random() * 0.25;

    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(2450 + Math.random() * 350, now);
    osc.frequency.exponentialRampToValueAtTime(1480 + Math.random() * 180, now + dur);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2100, now);
    filter.Q.value = 4.5;

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.035, now + 0.09);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(out);
    osc.start(now);
    osc.stop(now + dur + 0.04);
  }

  /**
   * High-altitude mountain ridge wind whistle swell.
   */
  private playMountainWindWhistle(ctx: AudioContext, dest: AudioNode): void {
    const now = ctx.currentTime;
    const pan = (Math.random() - 0.5) * 1.4;
    const out = this.createPanner(ctx, dest, pan);
    if (this.weather === 'blizzard' || this.weather === 'storm' || this.weather === 'ashstorm') {
      this.emitWeatherCue(this.weather === 'blizzard' ? 'blizzard_gust' : 'wind_surge', 0.48, pan);
    }
    const dur = 1.8 + Math.random() * 1.2;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    const startF = 440 + Math.random() * 220;
    osc.frequency.setValueAtTime(startF, now);
    osc.frequency.linearRampToValueAtTime(startF * 1.22, now + dur * 0.45);
    osc.frequency.linearRampToValueAtTime(startF * 0.92, now + dur);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.022, now + dur * 0.4);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    osc.connect(gain);
    gain.connect(out);
    osc.start(now);
    osc.stop(now + dur + 0.05);
  }

  /**
   * Localized stereo gust of rustling leaves or pine boughs.
   * Reuses the cached pink noise buffer with zero per-event buffer allocation.
   */
  private playLocalizedLeafRustle(ctx: AudioContext, dest: AudioNode, isJungle: boolean): void {
    if (!this.pinkNoiseBuffer) return;
    const now = ctx.currentTime;
    const dur = 0.75 + Math.random() * 0.7;
    const out = this.createPanner(ctx, dest, (Math.random() - 0.5) * 1.6);

    const src = ctx.createBufferSource();
    src.buffer = this.pinkNoiseBuffer;
    src.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(isJungle ? 3100 : 4200, now);
    filter.frequency.linearRampToValueAtTime(isJungle ? 2100 : 3000, now + dur);
    filter.Q.value = 1.4;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(isJungle ? 0.088 : 0.058, now + dur * 0.35);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(out);
    src.start(now, Math.random() * 4.0, dur + 0.05);
  }

  // ==================== TACTILE GAMEPLAY SFX ====================

  public playClick(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(780, now + 0.045);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
    osc.connect(gain);
    gain.connect(this.getSfxDest(ctx));
    osc.start(now);
    osc.stop(now + 0.06);
  }

  public playTurn(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(190, now);
    osc.frequency.exponentialRampToValueAtTime(240, now + 0.035);
    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    osc.connect(gain);
    gain.connect(this.getSfxDest(ctx));
    osc.start(now);
    osc.stop(now + 0.045);
  }

  public playEat(combo: number, golden: boolean): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const scale = [330, 392, 440, 523.25, 587.33, 659.25, 783.99, 880];
    const baseFreq = scale[Math.min(Math.max(combo - 1, 0), scale.length - 1)];

    const notes = golden ? [baseFreq, baseFreq * 1.25, baseFreq * 1.5] : [baseFreq, baseFreq * 1.25];
    notes.forEach((freq, idx) => {
      const start = now + idx * 0.055;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = golden ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, start);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.03, start + 0.14);
      gain.gain.setValueAtTime(0.14, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22);
      osc.connect(gain);
      gain.connect(this.getSfxDest(ctx));
      osc.start(start);
      osc.stop(start + 0.24);
    });
  }

  public playPortal(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc2.type = 'triangle';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(840, now + 0.18);
    osc2.frequency.setValueAtTime(520, now);
    osc2.frequency.exponentialRampToValueAtTime(1260, now + 0.18);
    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(this.getSfxDest(ctx));
    osc.start(now);
    osc2.start(now);
    osc.stop(now + 0.24);
    osc2.stop(now + 0.24);
  }

  /**
   * Procedural 2.2-second dimensional portal awakening sequence sound:
   * deep stone-seal bass swell, rising harmonic Qi chord scaled to the Peak's rank,
   * and a crystalline ignition bloom as the vortex tears open.
   */
  public playPortalOpeningSequence(requiredRank: number): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const dest = this.getSfxDest(ctx);
    const rank = Math.max(1, Math.min(12, Math.round(requiredRank || 1)));
    const baseHz = 110 * Math.pow(2, (rank - 1) / 14);

    // 1. Sub-bass seal unsealing rumble
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(baseHz * 0.5, now);
    subOsc.frequency.exponentialRampToValueAtTime(baseHz * 0.92, now + 1.55);
    subGain.gain.setValueAtTime(0.001, now);
    subGain.gain.linearRampToValueAtTime(0.14, now + 0.45);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 2.15);
    subOsc.connect(subGain);
    subGain.connect(dest);
    subOsc.start(now);
    subOsc.stop(now + 2.2);

    // 2. Rising cultivation harmonic triad (root, fifth, octave)
    const ratios = [1, 1.5, 2.0, 3.0];
    ratios.forEach((ratio, idx) => {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      osc.type = idx % 2 === 0 ? 'triangle' : 'sine';
      const startFreq = baseHz * ratio * 0.86;
      const peakFreq = baseHz * ratio * 1.18;
      osc.frequency.setValueAtTime(startFreq, now + idx * 0.08);
      osc.frequency.exponentialRampToValueAtTime(peakFreq, now + 1.65);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(420, now);
      filter.frequency.exponentialRampToValueAtTime(3400, now + 1.55);

      gain.gain.setValueAtTime(0.0005, now + idx * 0.08);
      gain.gain.linearRampToValueAtTime(0.055 / (1 + idx * 0.25), now + 1.42);
      gain.gain.exponentialRampToValueAtTime(0.0005, now + 2.35);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(dest);
      osc.start(now + idx * 0.08);
      osc.stop(now + 2.4);
    });

    // 3. Crystalline rift-ignition shimmer crest at t + 1.48s
    const burstOsc = ctx.createOscillator();
    const burstGain = ctx.createGain();
    burstOsc.type = 'sine';
    burstOsc.frequency.setValueAtTime(baseHz * 4, now + 1.48);
    burstOsc.frequency.exponentialRampToValueAtTime(baseHz * 6, now + 2.05);
    burstGain.gain.setValueAtTime(0.0005, now + 1.48);
    burstGain.gain.linearRampToValueAtTime(0.075, now + 1.56);
    burstGain.gain.exponentialRampToValueAtTime(0.0005, now + 2.25);
    burstOsc.connect(burstGain);
    burstGain.connect(dest);
    burstOsc.start(now + 1.48);
    burstOsc.stop(now + 2.3);
  }

  /**
   * Muted bronze-and-stone seal chime played when an under-ranked cultivator
   * bumps against a sealed Trial Peak portal.
   */
  public playPortalSealedChime(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const dest = this.getSfxDest(ctx);

    const osc = ctx.createOscillator();
    const overtone = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    overtone.type = 'sine';
    osc.frequency.setValueAtTime(164, now);
    osc.frequency.exponentialRampToValueAtTime(118, now + 0.34);
    overtone.frequency.setValueAtTime(246, now);
    overtone.frequency.exponentialRampToValueAtTime(182, now + 0.3);

    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
    osc.connect(gain);
    overtone.connect(gain);
    gain.connect(dest);
    osc.start(now);
    overtone.start(now);
    osc.stop(now + 0.4);
    overtone.stop(now + 0.4);
  }

  /**
   * Triggers a 3D spatial 'shimmering' glass-resonance sound positioned around the listener
   * whenever the player navigates, spins, or steps between Mirror-House tabs inside a portal.
   * Uses a 3D HRTF PannerNode (with stereo fallback), detuned crystalline shimmer partials,
   * a resonant glass-sparkle bandpass noise sweep, and cross-fed stereo mirror-hall echoes.
   */
  public playMirrorTabShimmer(opts: MirrorTabShimmerOptions = {}): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const nowMs = performance.now();
    if (opts.action === 'orbit' && nowMs - this.lastMirrorOrbitShimmerAt < 72) {
      return;
    }
    if (opts.action === 'orbit') {
      this.lastMirrorOrbitShimmerAt = nowMs;
    }

    const params = computeMirrorTabShimmerParams(opts);
    const now = ctx.currentTime;
    const dest = this.getSfxDest(ctx);

    // Master envelope bus for this shimmer voice
    const voiceMaster = ctx.createGain();
    voiceMaster.gain.setValueAtTime(0.0001, now);
    voiceMaster.gain.linearRampToValueAtTime(1.0, now + 0.014);
    voiceMaster.gain.setValueAtTime(1.0, now + params.durationSec * 0.72);
    voiceMaster.gain.exponentialRampToValueAtTime(0.0001, now + params.durationSec + 0.36);
    voiceMaster.connect(dest);

    // 3D HRTF Spatial Panner anchored to the mirror tab's 3D position in the Hall of Mirrors
    let spatialInput: AudioNode;
    if (typeof ctx.createPanner === 'function') {
      const panner3d = ctx.createPanner();
      panner3d.panningModel = 'HRTF';
      panner3d.distanceModel = 'inverse';
      panner3d.refDistance = 1.2;
      panner3d.maxDistance = 16;
      panner3d.rolloffFactor = 0.85;
      if (panner3d.positionX) {
        panner3d.positionX.setValueAtTime(params.spatialX, now);
        panner3d.positionY.setValueAtTime(params.spatialY, now);
        panner3d.positionZ.setValueAtTime(params.spatialZ, now);
      } else {
        panner3d.setPosition(params.spatialX, params.spatialY, params.spatialZ);
      }
      panner3d.connect(voiceMaster);
      spatialInput = panner3d;
    } else {
      spatialInput = this.createPanner(ctx, voiceMaster, params.stereoPan);
    }

    // Cross-fed stereo Hall-of-Mirrors reflection taps (crystalline bounce between opposing mirrors)
    const mirrorSend = ctx.createGain();
    mirrorSend.gain.value = params.echoWet;

    const delayL = ctx.createDelay(0.4);
    delayL.delayTime.setValueAtTime(params.echoDelayLeftSec, now);
    const delayR = ctx.createDelay(0.4);
    delayR.delayTime.setValueAtTime(params.echoDelayRightSec, now);

    const mirrorToneL = ctx.createBiquadFilter();
    mirrorToneL.type = 'bandpass';
    mirrorToneL.frequency.setValueAtTime(Math.min(6400, params.fundamentalHz * 2.6), now);
    mirrorToneL.Q.value = 1.4;

    const mirrorToneR = ctx.createBiquadFilter();
    mirrorToneR.type = 'bandpass';
    mirrorToneR.frequency.setValueAtTime(Math.min(7200, params.fundamentalHz * 3.1), now);
    mirrorToneR.Q.value = 1.6;

    const fbL = ctx.createGain();
    fbL.gain.value = 0.26;
    const fbR = ctx.createGain();
    fbR.gain.value = 0.26;

    const panL = this.createPanner(ctx, voiceMaster, -0.74);
    const panR = this.createPanner(ctx, voiceMaster, 0.74);

    mirrorSend.connect(delayL);
    mirrorSend.connect(delayR);
    delayL.connect(mirrorToneL);
    mirrorToneL.connect(panL);
    mirrorToneL.connect(fbL);
    fbL.connect(delayR);

    delayR.connect(mirrorToneR);
    mirrorToneR.connect(panR);
    mirrorToneR.connect(fbR);
    fbR.connect(delayL);

    // 1. Crystalline Mirror Resonance Harmonics (paired binaural detune for shimmering chorus beating)
    const partialAmps = [0.46, 0.28, 0.24, 0.14];
    params.harmonicFreqs.forEach((freq, idx) => {
      const start = now + idx * (opts.action === 'profile' ? 0.036 : 0.02);
      const decay = params.durationSec * (1 - idx * 0.11);
      const oscA = ctx.createOscillator();
      const oscB = ctx.createOscillator();
      oscA.type = idx === 0 ? 'triangle' : 'sine';
      oscB.type = 'sine';

      oscA.frequency.setValueAtTime(freq, start);
      oscA.frequency.exponentialRampToValueAtTime(freq * 1.012, start + decay);
      oscB.frequency.setValueAtTime(freq, start);
      oscB.detune.setValueAtTime(idx % 2 === 0 ? 7.5 : -7.5, start);
      oscB.frequency.exponentialRampToValueAtTime(freq * 1.018, start + decay);

      const env = ctx.createGain();
      const peak = params.masterGain * (partialAmps[idx] ?? 0.16);
      env.gain.setValueAtTime(0.0001, start);
      env.gain.linearRampToValueAtTime(peak, start + 0.016);
      env.gain.exponentialRampToValueAtTime(0.0001, start + decay);

      oscA.connect(env);
      oscB.connect(env);
      env.connect(spatialInput);
      env.connect(mirrorSend);

      oscA.start(start);
      oscB.start(start);
      oscA.stop(start + decay + 0.04);
      oscB.stop(start + decay + 0.04);
    });

    // 2. High-Q Resonant Glass-Sparkle Sweep (gossamer shimmering air transient)
    if (!this.whiteNoiseBuffer) {
      this.whiteNoiseBuffer = this.createWhiteNoiseBuffer(ctx, 2);
    }
    const sparkleSrc = ctx.createBufferSource();
    sparkleSrc.buffer = this.whiteNoiseBuffer;
    const sparkleBp = ctx.createBiquadFilter();
    sparkleBp.type = 'bandpass';
    sparkleBp.Q.setValueAtTime(11.5, now);
    sparkleBp.frequency.setValueAtTime(params.shimmerSweepStartHz, now);
    sparkleBp.frequency.exponentialRampToValueAtTime(
      params.shimmerSweepEndHz,
      now + Math.min(0.32, params.durationSec * 0.55),
    );
    const sparkleGain = ctx.createGain();
    sparkleGain.gain.setValueAtTime(0.0001, now);
    sparkleGain.gain.linearRampToValueAtTime(params.masterGain * 0.34, now + 0.025);
    sparkleGain.gain.exponentialRampToValueAtTime(0.0001, now + Math.min(0.38, params.durationSec * 0.65));

    sparkleSrc.connect(sparkleBp);
    sparkleBp.connect(sparkleGain);
    sparkleGain.connect(spatialInput);
    sparkleGain.connect(mirrorSend);
    sparkleSrc.start(now, Math.random() * 1.2, Math.min(0.42, params.durationSec * 0.7));
  }

  public playBoost(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.frequency.exponentialRampToValueAtTime(2400, now + 0.18);
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(480, now + 0.18);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.getSfxDest(ctx));
    osc.start(now);
    osc.stop(now + 0.24);
  }

  public playPlaceBlock(isErase = false): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    if (isErase) {
      osc.frequency.setValueAtTime(340, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.08);
    } else {
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(290, now + 0.07);
    }
    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(gain);
    gain.connect(this.getSfxDest(ctx));
    osc.start(now);
    osc.stop(now + 0.1);
  }

  public playCrash(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(38, now + 0.32);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(650, now);
    filter.frequency.exponentialRampToValueAtTime(90, now + 0.32);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.getSfxDest(ctx));
    osc.start(now);
    osc.stop(now + 0.36);
  }

  public playGraze(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(92, now + 0.11);
    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain);
    gain.connect(this.getSfxDest(ctx));
    osc.start(now);
    osc.stop(now + 0.13);
  }

  public playLandmark(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [392, 523.25, 659.25, 783.99];
    notes.forEach((freq, idx) => {
      const start = now + idx * 0.085;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.13, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.38);
      osc.connect(gain);
      gain.connect(this.getSfxDest(ctx));
      osc.start(start);
      osc.stop(start + 0.4);
    });
  }

  public playLevelUp(level: number, isHuman: boolean): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const base = isHuman ? 261.63 : 220 * Math.pow(1.045, Math.min(12, level));
    const ratios = isHuman ? [1, 1.25, 1.5, 2, 2.5, 3, 4] : [1, 1.25, 1.5, 2, 2.5];
    ratios.forEach((r, idx) => {
      const start = now + idx * (isHuman ? 0.11 : 0.08);
      const osc = ctx.createOscillator();
      const shimmer = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      shimmer.type = 'sine';
      osc.frequency.setValueAtTime(base * r, start);
      shimmer.frequency.setValueAtTime(base * r * 2, start);

      const dur = isHuman ? 0.9 : 0.55;
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(isHuman ? 0.14 : 0.11, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur);

      osc.connect(gain);
      shimmer.connect(gain);
      gain.connect(this.getSfxDest(ctx));
      osc.start(start);
      shimmer.start(start);
      osc.stop(start + dur + 0.05);
      shimmer.stop(start + dur + 0.05);
    });
  }

  public playCastSpell(level: number): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const base = 360 + Math.min(12, level) * 38;

    const osc = ctx.createOscillator();
    const shimmer = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = level >= 7 ? 'triangle' : 'sine';
    shimmer.type = 'sine';
    osc.frequency.setValueAtTime(base, now);
    osc.frequency.exponentialRampToValueAtTime(base * 1.9, now + 0.14);
    shimmer.frequency.setValueAtTime(base * 1.5, now);
    shimmer.frequency.exponentialRampToValueAtTime(base * 2.6, now + 0.16);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.095, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    shimmer.connect(gain);
    gain.connect(this.getSfxDest(ctx));
    osc.start(now);
    shimmer.start(now);
    osc.stop(now + 0.2);
    shimmer.stop(now + 0.2);
  }

  private getGunSaturationCurve(): Float32Array<ArrayBuffer> {
    const samples = 256;
    const curve = new Float32Array(new ArrayBuffer(samples * 4));
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = Math.tanh(x * 3.1);
    }
    return curve;
  }

  /**
   * Realistic multi-layered procedural gunshot for Half-Human mounted hand cannon:
   * 1) Supersonic muzzle crack, 2) Chest-punching sub-bass thump,
   * 3) Saturated gunpowder blast body, 4) Metallic blowback slide cycle clack,
   * 5) Stereo alpine canyon reflections, 6) Spent brass shell casing tinkle.
   */
  public playGunshot(level: number): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const dest = this.getSfxDest(ctx);
    const noiseBuf = this.whiteNoiseBuffer ?? this.createWhiteNoiseBuffer(ctx, 1.2);
    if (!this.whiteNoiseBuffer) {
      this.whiteNoiseBuffer = noiseBuf;
    }

    const tierScale = 1 + Math.max(0, Math.min(4, level - 8)) * 0.06;
    const randOffset = Math.random() * Math.max(0.05, noiseBuf.duration - 0.5);

    // Layer 1: Supersonic muzzle crack (ultra-fast transient snap)
    const crackSrc = ctx.createBufferSource();
    crackSrc.buffer = noiseBuf;
    const crackHp = ctx.createBiquadFilter();
    crackHp.type = 'highpass';
    crackHp.frequency.setValueAtTime(1900, now);
    const crackGain = ctx.createGain();
    crackGain.gain.setValueAtTime(0.001, now);
    crackGain.gain.linearRampToValueAtTime(0.42 * tierScale, now + 0.002);
    crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.036);
    crackSrc.connect(crackHp);
    crackHp.connect(crackGain);
    crackGain.connect(dest);
    crackSrc.start(now, randOffset, 0.045);

    // Layer 2: Chest-punching low-end recoil thump
    const thumpOsc = ctx.createOscillator();
    const subOsc = ctx.createOscillator();
    const thumpGain = ctx.createGain();
    thumpOsc.type = 'triangle';
    subOsc.type = 'sine';
    thumpOsc.frequency.setValueAtTime(195 * tierScale, now);
    thumpOsc.frequency.exponentialRampToValueAtTime(42, now + 0.115);
    subOsc.frequency.setValueAtTime(118, now);
    subOsc.frequency.exponentialRampToValueAtTime(34, now + 0.135);
    thumpGain.gain.setValueAtTime(0.001, now);
    thumpGain.gain.linearRampToValueAtTime(0.32 * tierScale, now + 0.004);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    thumpOsc.connect(thumpGain);
    subOsc.connect(thumpGain);
    thumpGain.connect(dest);
    thumpOsc.start(now);
    subOsc.start(now);
    thumpOsc.stop(now + 0.16);
    subOsc.stop(now + 0.16);

    // Layer 3: Saturated gunpowder blast body
    const bodySrc = ctx.createBufferSource();
    bodySrc.buffer = noiseBuf;
    const bodyBp = ctx.createBiquadFilter();
    bodyBp.type = 'bandpass';
    bodyBp.frequency.setValueAtTime(640, now);
    bodyBp.frequency.exponentialRampToValueAtTime(170, now + 0.16);
    bodyBp.Q.value = 0.72;
    const shaper = ctx.createWaveShaper();
    shaper.curve = this.getGunSaturationCurve();
    shaper.oversample = '2x';
    const bodyGain = ctx.createGain();
    bodyGain.gain.setValueAtTime(0.001, now);
    bodyGain.gain.linearRampToValueAtTime(0.38 * tierScale, now + 0.004);
    bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.17);
    bodySrc.connect(bodyBp);
    bodyBp.connect(shaper);
    shaper.connect(bodyGain);
    bodyGain.connect(dest);
    bodySrc.start(now, (randOffset + 0.23) % Math.max(0.1, noiseBuf.duration - 0.3), 0.2);

    // Layer 4: Mechanical blowback slide cycle (rear stop + lock-in double-clack)
    const slideHits = [
      { delay: 0.052, freq: 3150, amp: 0.11, dur: 0.024 },
      { delay: 0.116, freq: 2550, amp: 0.13, dur: 0.03 },
    ];
    for (const hit of slideHits) {
      const t0 = now + hit.delay;
      const clackSrc = ctx.createBufferSource();
      clackSrc.buffer = noiseBuf;
      const clackBp = ctx.createBiquadFilter();
      clackBp.type = 'bandpass';
      clackBp.frequency.setValueAtTime(hit.freq, t0);
      clackBp.Q.value = 4.2;
      const clackGain = ctx.createGain();
      clackGain.gain.setValueAtTime(0.0008, t0);
      clackGain.gain.linearRampToValueAtTime(hit.amp, t0 + 0.002);
      clackGain.gain.exponentialRampToValueAtTime(0.0008, t0 + hit.dur);
      clackSrc.connect(clackBp);
      clackBp.connect(clackGain);
      clackGain.connect(dest);
      clackSrc.start(t0, (randOffset + hit.delay) % Math.max(0.1, noiseBuf.duration - 0.15), hit.dur + 0.01);
    }

    // Layer 5: Stereo alpine mountain canyon echoes
    const echoes = [
      { delay: 0.165, pan: -0.58, cutoff: 720, amp: 0.12, dur: 0.24 },
      { delay: 0.315, pan: 0.56, cutoff: 520, amp: 0.075, dur: 0.3 },
    ];
    for (const echo of echoes) {
      const t0 = now + echo.delay;
      const eSrc = ctx.createBufferSource();
      eSrc.buffer = noiseBuf;
      const eLp = ctx.createBiquadFilter();
      eLp.type = 'lowpass';
      eLp.frequency.setValueAtTime(echo.cutoff, t0);
      eLp.frequency.exponentialRampToValueAtTime(220, t0 + echo.dur);
      const eGain = ctx.createGain();
      eGain.gain.setValueAtTime(0.0008, t0);
      eGain.gain.linearRampToValueAtTime(echo.amp, t0 + 0.018);
      eGain.gain.exponentialRampToValueAtTime(0.0008, t0 + echo.dur);
      eSrc.connect(eLp);
      eLp.connect(eGain);
      if (typeof ctx.createStereoPanner === 'function') {
        const panner = ctx.createStereoPanner();
        panner.pan.value = echo.pan;
        eGain.connect(panner);
        panner.connect(dest);
      } else {
        eGain.connect(dest);
      }
      eSrc.start(t0, (randOffset + echo.delay) % Math.max(0.1, noiseBuf.duration - 0.35), echo.dur + 0.02);
    }

    // Layer 6: Subtle spent brass casing tinkle on mountain rock
    const brassHits = [
      { delay: 0.275, freq: 5280, amp: 0.024 },
      { delay: 0.365, freq: 6420, amp: 0.016 },
    ];
    for (const b of brassHits) {
      const t0 = now + b.delay;
      const ping = ctx.createOscillator();
      const pGain = ctx.createGain();
      ping.type = 'sine';
      ping.frequency.setValueAtTime(b.freq + (Math.random() - 0.5) * 320, t0);
      pGain.gain.setValueAtTime(0.0005, t0);
      pGain.gain.linearRampToValueAtTime(b.amp, t0 + 0.003);
      pGain.gain.exponentialRampToValueAtTime(0.0004, t0 + 0.055);
      ping.connect(pGain);
      pGain.connect(dest);
      ping.start(t0);
      ping.stop(t0 + 0.065);
    }
  }

  public playShockwave(level: number): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const sub = ctx.createOscillator();
    const chime = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(900 + level * 140, now);
    filter.frequency.exponentialRampToValueAtTime(220, now + 0.42);

    sub.type = 'sawtooth';
    sub.frequency.setValueAtTime(160 + level * 8, now);
    sub.frequency.exponentialRampToValueAtTime(48, now + 0.42);

    chime.type = 'triangle';
    chime.frequency.setValueAtTime(420 + level * 42, now);
    chime.frequency.exponentialRampToValueAtTime(840 + level * 60, now + 0.34);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.16, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.46);

    sub.connect(filter);
    chime.connect(filter);
    filter.connect(gain);
    gain.connect(this.getSfxDest(ctx));
    sub.start(now);
    chime.start(now);
    sub.stop(now + 0.48);
    chime.stop(now + 0.48);
  }

  public playBeastGrowl(kind: 'wolf' | 'boar' | 'eagle' | 'guardian' | 'wraith' | 'soul_elder'): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    if (kind === 'wraith' || kind === 'soul_elder') {
      const isElder = kind === 'soul_elder';
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(isElder ? 210 : 540, now);
      osc.frequency.exponentialRampToValueAtTime(isElder ? 96 : 260, now + 0.36);
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(isElder ? 480 : 1220, now);
      filter.Q.value = 4.2;
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(isElder ? 0.13 : 0.085, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
    } else if (kind === 'eagle') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1900, now);
      osc.frequency.exponentialRampToValueAtTime(1050, now + 0.28);
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1600, now);
      filter.Q.value = 3.5;
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.07, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    } else if (kind === 'guardian') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(125, now);
      osc.frequency.exponentialRampToValueAtTime(82, now + 0.42);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(520, now);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.11, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    } else {
      const startF = kind === 'boar' ? 118 : 175;
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(startF, now);
      osc.frequency.exponentialRampToValueAtTime(startF * 0.62, now + 0.24);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(480, now);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
    }

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.getSfxDest(ctx));
    osc.start(now);
    osc.stop(now + 0.48);
  }

  public playDashStrike(level: number): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const crack = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(750 + level * 120, now);
    filter.frequency.exponentialRampToValueAtTime(2400 + level * 180, now + 0.16);
    filter.Q.value = 1.8;

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220 + level * 22, now);
    osc.frequency.exponentialRampToValueAtTime(760 + level * 52, now + 0.18);

    crack.type = 'triangle';
    crack.frequency.setValueAtTime(920 + level * 55, now);
    crack.frequency.exponentialRampToValueAtTime(180, now + 0.22);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc.connect(filter);
    crack.connect(filter);
    filter.connect(gain);
    gain.connect(this.getSfxDest(ctx));
    osc.start(now);
    crack.start(now);
    osc.stop(now + 0.3);
    crack.stop(now + 0.3);
  }

  public playUltimateLotus(level: number): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 1. Deep Qi detonation boom
    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(150 + level * 6, now);
    sub.frequency.exponentialRampToValueAtTime(34, now + 0.72);
    subGain.gain.setValueAtTime(0.001, now);
    subGain.gain.linearRampToValueAtTime(0.24, now + 0.03);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    sub.connect(subGain);
    subGain.connect(this.getSfxDest(ctx));
    sub.start(now);
    sub.stop(now + 0.84);

    // 2. Fiery lotus roar + ascending heavenly chord
    const notes = [293.66, 440, 587.33, 880, 1174.66];
    notes.forEach((freq, idx) => {
      const start = now + idx * 0.045;
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      osc.type = idx < 2 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(freq * (1 + level * 0.015), start);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.18, start + 0.42);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2400, start);
      filter.frequency.exponentialRampToValueAtTime(620, start + 0.56);
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.09, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.62);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.getSfxDest(ctx));
      osc.start(start);
      osc.stop(start + 0.65);
    });
  }

  public playGhostEmerge(isElder: boolean): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Ground crack rumble
    const rumble = ctx.createOscillator();
    const rGain = ctx.createGain();
    rumble.type = 'sawtooth';
    rumble.frequency.setValueAtTime(isElder ? 72 : 92, now);
    rumble.frequency.exponentialRampToValueAtTime(34, now + 0.65);
    const rFilter = ctx.createBiquadFilter();
    rFilter.type = 'lowpass';
    rFilter.frequency.setValueAtTime(260, now);
    rGain.gain.setValueAtTime(0.001, now);
    rGain.gain.linearRampToValueAtTime(isElder ? 0.16 : 0.11, now + 0.08);
    rGain.gain.exponentialRampToValueAtTime(0.001, now + 0.72);
    rumble.connect(rFilter);
    rFilter.connect(rGain);
    rGain.connect(this.getSfxDest(ctx));
    rumble.start(now);
    rumble.stop(now + 0.76);

    // Rising ghostly chorus wail
    const freqs = isElder ? [220, 261.63, 311.13] : [329.63, 392.0];
    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f * 0.78, now + 0.08);
      osc.frequency.exponentialRampToValueAtTime(f * 1.12, now + 0.52);
      osc.frequency.exponentialRampToValueAtTime(f * 0.92, now + 0.92);
      gain.gain.setValueAtTime(0.0001, now + 0.08);
      gain.gain.linearRampToValueAtTime(0.055 - idx * 0.01, now + 0.28);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.96);
      osc.connect(gain);
      gain.connect(this.getSfxDest(ctx));
      osc.start(now + 0.08);
      osc.stop(now + 1.0);
    });
  }

  public playClanAmbushAlert(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const tones = [220, 207.65, 311.13];
    tones.forEach((freq, i) => {
      const start = now + i * 0.11;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.1, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.34);
      osc.connect(gain);
      gain.connect(this.getSfxDest(ctx));
      osc.start(start);
      osc.stop(start + 0.36);
    });
  }

  public playBeastHit(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(310, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.09);
    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
    osc.connect(gain);
    gain.connect(this.getSfxDest(ctx));
    osc.start(now);
    osc.stop(now + 0.12);
  }

  public playBeastDefeat(isBoss: boolean): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = isBoss ? [293.66, 369.99, 440, 587.33, 739.99] : [329.63, 440, 587.33];
    notes.forEach((freq, idx) => {
      const start = now + idx * 0.06;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = isBoss ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(isBoss ? 0.13 : 0.1, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + (isBoss ? 0.42 : 0.26));
      osc.connect(gain);
      gain.connect(this.getSfxDest(ctx));
      osc.start(start);
      osc.stop(start + (isBoss ? 0.45 : 0.28));
    });
  }

  public playPlayerHurt(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(185, now);
    osc.frequency.exponentialRampToValueAtTime(72, now + 0.2);
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(gain);
    gain.connect(this.getSfxDest(ctx));
    osc.start(now);
    osc.stop(now + 0.24);
  }

  /**
   * Triumphant, high-rarity orchestral-crystalline fanfare triggered the first time
   * a player opens the details of a Legendary creature in the Bestiary catalog.
   */
  public playLegendaryReveal(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Master output + short spacious hall echo bus for regal decay
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.linearRampToValueAtTime(0.95, now + 0.03);
    master.gain.setValueAtTime(0.95, now + 1.45);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 2.55);
    master.connect(this.getSfxDest(ctx));

    const delay = ctx.createDelay(0.5);
    delay.delayTime.value = 0.19;
    const echoFilter = ctx.createBiquadFilter();
    echoFilter.type = 'lowpass';
    echoFilter.frequency.value = 3400;
    const echoFeedback = ctx.createGain();
    echoFeedback.gain.value = 0.28;
    const echoWet = ctx.createGain();
    echoWet.gain.value = 0.34;

    delay.connect(echoFilter);
    echoFilter.connect(echoWet);
    echoWet.connect(master);
    echoFilter.connect(echoFeedback);
    echoFeedback.connect(delay);

    const routeBus = ctx.createGain();
    routeBus.gain.value = 1.0;
    routeBus.connect(master);
    routeBus.connect(delay);

    // 1. Warm Heroic Brass-Pad Foundation (D3 + A3 + D4 with resonant lowpass bloom)
    const brassFilter = ctx.createBiquadFilter();
    brassFilter.type = 'lowpass';
    brassFilter.Q.value = 1.4;
    brassFilter.frequency.setValueAtTime(340, now);
    brassFilter.frequency.exponentialRampToValueAtTime(2450, now + 0.52);
    brassFilter.frequency.exponentialRampToValueAtTime(920, now + 1.85);

    const brassGain = ctx.createGain();
    brassGain.gain.setValueAtTime(0.0001, now);
    brassGain.gain.linearRampToValueAtTime(0.095, now + 0.08);
    brassGain.gain.setValueAtTime(0.085, now + 0.85);
    brassGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.95);

    const brassVoices = [
      { freq: 146.83, detune: -5 }, // D3
      { freq: 220.0, detune: 4 },   // A3
      { freq: 293.66, detune: 0 },  // D4
    ];
    brassVoices.forEach((v) => {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(v.freq, now);
      osc.detune.value = v.detune;
      osc.connect(brassFilter);
      osc.start(now);
      osc.stop(now + 2.0);
    });
    brassFilter.connect(brassGain);
    brassGain.connect(routeBus);

    // 2. Ascending Triumphant Lydian/Major-9th Fanfare Arpeggio
    const fanfareNotes = [
      { t: 0.0, freq: 293.66, amp: 0.085, dur: 0.55, pan: -0.38 },   // D4
      { t: 0.075, freq: 369.99, amp: 0.09, dur: 0.55, pan: -0.22 },  // F#4
      { t: 0.15, freq: 440.0, amp: 0.098, dur: 0.62, pan: -0.08 },   // A4
      { t: 0.23, freq: 587.33, amp: 0.105, dur: 0.72, pan: 0.08 },   // D5
      { t: 0.32, freq: 659.25, amp: 0.108, dur: 0.78, pan: 0.22 },   // E5
      { t: 0.415, freq: 739.99, amp: 0.115, dur: 0.92, pan: 0.34 },  // F#5
      { t: 0.52, freq: 880.0, amp: 0.13, dur: 1.45, pan: 0.0 },      // A5 Apex
    ];
    fanfareNotes.forEach((n) => {
      const start = now + n.t;
      const panner = this.createPanner(ctx, routeBus, n.pan);

      const core = ctx.createOscillator();
      core.type = 'triangle';
      core.frequency.setValueAtTime(n.freq, start);

      const octave = ctx.createOscillator();
      octave.type = 'sine';
      octave.frequency.setValueAtTime(n.freq * 2, start);
      const octGain = ctx.createGain();
      octGain.gain.setValueAtTime(0.35, start);

      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, start);
      env.gain.linearRampToValueAtTime(n.amp, start + 0.018);
      env.gain.exponentialRampToValueAtTime(0.0001, start + n.dur);

      core.connect(env);
      octave.connect(octGain);
      octGain.connect(env);
      env.connect(panner);

      core.start(start);
      octave.start(start);
      core.stop(start + n.dur + 0.06);
      octave.stop(start + n.dur + 0.06);
    });

    // 3. High-Rarity Crystalline Crown Chord & Metallic Bell Shimmer at Apex
    const apexTime = now + 0.52;
    const shimmerPartials = [
      { freq: 1174.66, amp: 0.062, dur: 1.65, pan: -0.45 }, // D6
      { freq: 1479.98, amp: 0.052, dur: 1.55, pan: 0.45 },  // F#6
      { freq: 1760.0, amp: 0.044, dur: 1.45, pan: 0.0 },    // A6
      { freq: 2425.28, amp: 0.022, dur: 1.1, pan: 0.25 },   // Bell harmonic (~2.756 * A5)
    ];
    shimmerPartials.forEach((p, idx) => {
      const start = apexTime + idx * 0.028;
      const panner = this.createPanner(ctx, routeBus, p.pan);
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(p.freq, start);
      osc.detune.value = idx % 2 === 0 ? 3 : -3;

      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, start);
      env.gain.linearRampToValueAtTime(p.amp, start + 0.022);
      env.gain.exponentialRampToValueAtTime(0.0001, start + p.dur);

      osc.connect(env);
      env.connect(panner);
      osc.start(start);
      osc.stop(start + p.dur + 0.06);
    });
  }

  /**
   * Celestial golden bronze gong + ascending imperial pentatonic chime when the
   * periodic Global Ranking Portal manifests on the continent.
   */
  public playGlobalRankingPortalSpawn(): void {
    const ctx = this.ensureContext();
    if (!ctx || this.muted || this.tabHidden || !this.sfxBus) return;
    const now = ctx.currentTime;
    const bus = this.sfxBus;

    // 1. Deep resonant celestial gong foundation
    const gongFreqs = [110, 164.81, 220, 329.63];
    gongFreqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      osc.type = idx === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.008, now + 1.8);

      const g = ctx.createGain();
      const peak = idx === 0 ? 0.16 : 0.065 / (idx + 0.5);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(peak, now + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);

      osc.connect(g);
      g.connect(bus);
      osc.start(now);
      osc.stop(now + 2.3);
    });

    // 2. Ascending golden-jade pentatonic beacon arpeggio (D5-E5-G5-A5-D6)
    const notes = [587.33, 659.25, 783.99, 880.0, 1174.66];
    notes.forEach((freq, i) => {
      const t = now + 0.14 + i * 0.095;
      const panner = this.createPanner(ctx, bus, (i - 2) * 0.28);
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, t);
      env.gain.linearRampToValueAtTime(0.078, t + 0.018);
      env.gain.exponentialRampToValueAtTime(0.0001, t + 0.95);

      osc.connect(env);
      env.connect(panner);
      osc.start(t);
      osc.stop(t + 1.0);
    });
  }

  /**
   * Radiant sovereign seal chord played when a player inscribes their cultivation
   * progress onto the Global Ranking Stele.
   */
  public playGlobalRankingSubmit(): void {
    const ctx = this.ensureContext();
    if (!ctx || this.muted || this.tabHidden || !this.sfxBus) return;
    const now = ctx.currentTime;
    const bus = this.sfxBus;

    const chord = [523.25, 659.25, 783.99, 1046.5, 1318.51];
    chord.forEach((freq, i) => {
      const start = now + i * 0.045;
      const panner = this.createPanner(ctx, bus, (i - 2) * 0.22);
      const osc = ctx.createOscillator();
      osc.type = i < 2 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, start);

      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, start);
      env.gain.linearRampToValueAtTime(0.072, start + 0.02);
      env.gain.exponentialRampToValueAtTime(0.0001, start + 1.15);

      osc.connect(env);
      env.connect(panner);
      osc.start(start);
      osc.stop(start + 1.2);
    });
  }

  /**
   * Liquid-crystalline dimensional shockwave sweep played when a mission is completed
   * and portals ripple & relocate to fresh coordinates across the 3D continent.
   */
  public playPortalShiftRipple(soulAwarded = false): void {
    const ctx = this.ensureContext();
    if (!ctx || this.muted || this.tabHidden || !this.sfxBus) return;
    const now = ctx.currentTime;
    const bus = this.sfxBus;

    // 1. Sub-dimensional pressure dip & upward liquid-warp sweep
    const sweepOsc = ctx.createOscillator();
    sweepOsc.type = 'sine';
    sweepOsc.frequency.setValueAtTime(soulAwarded ? 260 : 215, now);
    sweepOsc.frequency.exponentialRampToValueAtTime(soulAwarded ? 98 : 84, now + 0.24);
    sweepOsc.frequency.exponentialRampToValueAtTime(soulAwarded ? 587.33 : 493.88, now + 0.92);

    const sweepFilter = ctx.createBiquadFilter();
    sweepFilter.type = 'lowpass';
    sweepFilter.frequency.setValueAtTime(920, now);
    sweepFilter.frequency.exponentialRampToValueAtTime(2400, now + 0.72);

    const sweepGain = ctx.createGain();
    sweepGain.gain.setValueAtTime(0.0001, now);
    sweepGain.gain.linearRampToValueAtTime(0.145, now + 0.05);
    sweepGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.15);

    sweepOsc.connect(sweepFilter);
    sweepFilter.connect(sweepGain);
    sweepGain.connect(bus);
    sweepOsc.start(now);
    sweepOsc.stop(now + 1.2);

    // 2. Stereo-widening harmonic ripple chimes matching primary & secondary wavefront crests
    const partials = soulAwarded
      ? [
          { freq: 587.33, delay: 0.06, pan: -0.45, dur: 0.95 },
          { freq: 880.0, delay: 0.14, pan: 0.45, dur: 1.05 },
          { freq: 1174.66, delay: 0.26, pan: -0.25, dur: 1.1 },
          { freq: 1479.98, delay: 0.36, pan: 0.28, dur: 1.15 },
        ]
      : [
          { freq: 523.25, delay: 0.06, pan: -0.42, dur: 0.85 },
          { freq: 783.99, delay: 0.16, pan: 0.42, dur: 0.95 },
          { freq: 1046.5, delay: 0.28, pan: 0.0, dur: 1.0 },
        ];

    partials.forEach((p, idx) => {
      const start = now + p.delay;
      const panner = this.createPanner(ctx, bus, p.pan);
      const osc = ctx.createOscillator();
      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(p.freq * 0.97, start);
      osc.frequency.exponentialRampToValueAtTime(p.freq * 1.02, start + p.dur * 0.6);

      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, start);
      env.gain.linearRampToValueAtTime(0.058, start + 0.025);
      env.gain.exponentialRampToValueAtTime(0.0001, start + p.dur);

      osc.connect(env);
      env.connect(panner);
      osc.start(start);
      osc.stop(start + p.dur + 0.06);
    });
  }

  /**
   * Eerie hollow spirit-chime rising whisper when a Soul Clan Sentry detects player
   * activity near a portal and switches from Circular Patrol into Search behavior.
   */
  public playSentrySearchCue(): void {
    const ctx = this.ensureContext();
    if (!ctx || this.muted || this.tabHidden || !this.sfxBus) return;
    const now = ctx.currentTime;
    const bus = this.sfxBus;

    const freqs = [311.13, 466.16, 622.25];
    freqs.forEach((f, i) => {
      const t = now + i * 0.065;
      const osc = ctx.createOscillator();
      osc.type = i === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(f * 0.94, t);
      osc.frequency.exponentialRampToValueAtTime(f * 1.08, t + 0.36);

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.055 / (i + 0.7), t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.58);

      osc.connect(g);
      g.connect(bus);
      osc.start(t);
      osc.stop(t + 0.62);
    });
  }

  /**
   * Haunting Soul Bell alarm toll when a Soul Clan Sentry detects the player and seals a portal.
   */
  public playSentryAlertBell(): void {
    const ctx = this.ensureContext();
    if (!ctx || this.muted || this.tabHidden || !this.sfxBus) return;
    const now = ctx.currentTime;
    const bus = this.sfxBus;

    const bellPartials = [196, 293.66, 415.3, 622.25];
    bellPartials.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      osc.type = idx % 2 === 0 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(f, now);
      osc.frequency.exponentialRampToValueAtTime(f * 0.96, now + 0.95);

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(f * 1.35, now);
      filter.Q.value = 2.4;

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(0.11 / (idx + 0.8), now + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 1.05);

      osc.connect(filter);
      filter.connect(g);
      g.connect(bus);
      osc.start(now);
      osc.stop(now + 1.1);
    });
  }

  /**
   * Bright cleansing jade-gold exorcism chord when a player banishes a Soul Clan Sentry.
   */
  public playSentryBanish(): void {
    const ctx = this.ensureContext();
    if (!ctx || this.muted || this.tabHidden || !this.sfxBus) return;
    const now = ctx.currentTime;
    const bus = this.sfxBus;

    const notes = [440, 554.37, 659.25, 880, 1108.73];
    notes.forEach((f, i) => {
      const t = now + i * 0.04;
      const panner = this.createPanner(ctx, bus, (i - 2) * 0.24);
      const osc = ctx.createOscillator();
      osc.type = i < 2 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(f, t);

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.068, t + 0.018);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.72);

      osc.connect(g);
      g.connect(panner);
      osc.start(t);
      osc.stop(t + 0.76);
    });
  }

  /**
   * Soft jade-shadow wind whisper when toggling Stealth Veil on/off.
   */
  public playStealthToggle(entering: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx || this.muted || this.tabHidden || !this.sfxBus) return;
    const now = ctx.currentTime;
    const bus = this.sfxBus;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(entering ? 420 : 240, now);
    osc.frequency.exponentialRampToValueAtTime(entering ? 190 : 390, now + 0.22);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.048, now + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.26);

    osc.connect(g);
    g.connect(bus);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  /**
   * Subtle crystalline parchment chime when a new Soul Clan Archives lore entry unlocks.
   */
  public playLoreUnlockedChime(): void {
    const ctx = this.ensureContext();
    if (!ctx || this.muted || this.tabHidden || !this.sfxBus) return;
    const now = ctx.currentTime;
    const bus = this.sfxBus;

    const freqs = [659.25, 987.77]; // E5 -> B5 open fifth
    freqs.forEach((f, idx) => {
      const t = now + idx * 0.085;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t);

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(idx === 0 ? 0.036 : 0.044, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.52);

      osc.connect(g);
      g.connect(bus);
      osc.start(t);
      osc.stop(t + 0.56);
    });
  }

  /**
   * Rarity-scaled crystalline triad/arpeggio chime when claiming Portal Mission loot or refining materials.
   */
  public playLootDropChime(rarity: 'uncommon' | 'rare' | 'epic' | 'mythic' = 'rare'): void {
    const ctx = this.ensureContext();
    if (!ctx || this.muted || this.tabHidden || !this.sfxBus) return;
    const now = ctx.currentTime;
    const bus = this.sfxBus;

    const noteSets: Record<'uncommon' | 'rare' | 'epic' | 'mythic', number[]> = {
      uncommon: [523.25, 659.25, 783.99],
      rare: [587.33, 739.99, 880.0, 1174.66],
      epic: [523.25, 659.25, 783.99, 1046.5, 1318.51],
      mythic: [440.0, 554.37, 659.25, 880.0, 1108.73, 1318.51],
    };
    const notes = noteSets[rarity] ?? noteSets.rare;

    notes.forEach((freq, idx) => {
      const t = now + idx * 0.068;
      const osc = ctx.createOscillator();
      osc.type = rarity === 'mythic' && idx % 2 === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, t);

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(rarity === 'mythic' ? 0.056 : 0.044, t + 0.016);
      g.gain.exponentialRampToValueAtTime(0.0001, t + (rarity === 'mythic' ? 0.72 : 0.5));

      osc.connect(g);
      g.connect(bus);
      osc.start(t);
      osc.stop(t + 0.78);
    });
  }

  /**
   * Spatial HRTF spectral whispering sound effect for nearby Soul Clan spirits in 3D terrain.
   */
  public playSoulSpiritWhisper(x: number, y: number, z: number, proximity01: number): void {
    const ctx = this.ensureContext();
    if (!ctx || this.muted || this.tabHidden || !this.sfxBus) return;
    const now = ctx.currentTime;
    const intensity = Math.max(0.1, Math.min(1.0, proximity01));

    const voiceMaster = ctx.createGain();
    const peakGain = 0.045 * intensity * this.sfxVolume * this.masterVolume;
    voiceMaster.gain.setValueAtTime(0.0001, now);
    voiceMaster.gain.linearRampToValueAtTime(peakGain, now + 0.05);
    voiceMaster.gain.exponentialRampToValueAtTime(0.0001, now + 0.85);

    // HRTF 3D spatial panner
    let audioTarget: AudioNode = voiceMaster;
    if (typeof ctx.createPanner === 'function') {
      const panner3d = ctx.createPanner();
      panner3d.panningModel = 'HRTF';
      panner3d.distanceModel = 'inverse';
      panner3d.refDistance = 1.5;
      panner3d.maxDistance = 22;
      panner3d.rolloffFactor = 1.0;
      if (panner3d.positionX) {
        panner3d.positionX.setValueAtTime(x, now);
        panner3d.positionY.setValueAtTime(y, now);
        panner3d.positionZ.setValueAtTime(z, now);
      } else {
        panner3d.setPosition(x, y, z);
      }
      panner3d.connect(this.sfxBus);
      audioTarget = panner3d;
    } else {
      voiceMaster.connect(this.sfxBus);
    }

    // Spectral whispering noise + formant filter sweep
    if (this.pinkNoiseBuffer) {
      const src = ctx.createBufferSource();
      src.buffer = this.pinkNoiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, now);
      filter.frequency.exponentialRampToValueAtTime(2800, now + 0.4);
      filter.frequency.exponentialRampToValueAtTime(1100, now + 0.85);
      filter.Q.value = 6.0;

      src.connect(filter);
      filter.connect(audioTarget);
      src.start(now);
      src.stop(now + 0.9);
    }

    // Eerie haunting spectral sine formant
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.3);
    osc.frequency.exponentialRampToValueAtTime(280, now + 0.85);
    
    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.0001, now);
    oscGain.gain.linearRampToValueAtTime(peakGain * 0.5, now + 0.1);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.85);

    osc.connect(oscGain);
    oscGain.connect(audioTarget);
    osc.start(now);
    osc.stop(now + 0.9);
  }

  public dispose(): void {
    if (typeof window !== 'undefined') {
      window.clearTimeout(this.ambientTimer);
      window.clearTimeout(this.tierAmbientTimer);
      window.clearTimeout(this.tierTransitionTimer);
    }
    this.ctx?.close().catch(() => {});
    this.ctx = null;
    this.sfxBus = null;
    this.ambientStarted = false;
  }
}
