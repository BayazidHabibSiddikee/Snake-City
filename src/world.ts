import * as THREE from 'three';
import { CSM } from 'three/addons/csm/CSM.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { getLevelEnvironment, getMagicTierForLevel, getStageForLevel } from './evolution';
import {
  AscensionAvatarRig,
  BeastRig,
  GroundFissureRig,
  PlayerAuraRig,
  TraversalWakeRig,
  createAscensionAvatar,
  createBeastModel,
  createBoostBlock,
  createFruitModel,
  createGroundFissureVisual,
  createLandmarkShrine,
  createPlayerAuraRig,
  createPortalBlock,
  createRollingBoulder,
  createSerpentHead,
  createSerpentSegment,
  createTotemBlock,
  createTraversalWakeRig,
  createWallBlock,
  ModelResources,
} from './models';
import {
  WORLD_LAKES,
  WORLD_LANDMARKS,
  isDeepWater,
  isNearSpawn,
  terrainHeightAt,
  terrainNormalAt,
} from './terrain';
import {
  createContactShadowTexture,
  createMistTexture,
  createSnakeScaleTexture,
  createSparkGlowTexture,
  createTerrainTexture,
} from './textures';
import {
  BeastKind,
  BiomeId,
  CameraMode,
  CollectibleOrb,
  FormationData,
  GameMode,
  GroundFissure,
  MagicProjectile,
  RollingBoulder,
  ShockwaveEffect,
  WATER_LEVEL,
  WORLD_PLAY_RADIUS,
  WeatherMode,
  WildBeast,
  WorldObstacle,
  WorldPoint2D,
} from './types';
import { WeatherAudioCueEvent } from './audio';

export interface WeatherVfxIntensity {
  rainSplash: number;
  frostTarget: number;
  condensation: number;
  heatAsh: number;
}

/**
 * Pure intensity curve mapping active climate, live rain swell, altitude,
 * and shrine shelter status to subtle screen-space lens VFX weights (0..1).
 */
export function computeWeatherVfxIntensity(
  weather: WeatherMode,
  liveRainIntensity: number,
  altitudeNorm: number,
  isSheltered: boolean,
): WeatherVfxIntensity {
  const rain = Math.max(0, Math.min(1, liveRainIntensity));
  const alt = Math.max(0, Math.min(1, altitudeNorm));
  const shelterMul = isSheltered ? 0.28 : 1.0;

  let rainSplash = 0;
  let frostTarget = 0;
  let condensation = 0;
  let heatAsh = 0;

  switch (weather) {
    case 'clear':
      break;
    case 'mist':
      condensation = (0.28 + alt * 0.16) * shelterMul;
      break;
    case 'fog':
      condensation = (0.58 + alt * 0.22) * shelterMul;
      break;
    case 'rain':
      rainSplash = Math.min(1, (0.34 + rain * 0.56) * shelterMul);
      condensation = (0.22 + rain * 0.16) * shelterMul;
      break;
    case 'storm':
      rainSplash = Math.min(1, (0.58 + rain * 0.42 + alt * 0.12) * shelterMul);
      condensation = (0.3 + rain * 0.18) * shelterMul;
      break;
    case 'blizzard':
      frostTarget = Math.min(1, (0.52 + alt * 0.48) * (isSheltered ? 0.18 : 1.0));
      break;
    case 'ashstorm':
      heatAsh = Math.min(1, (0.52 + alt * 0.38) * shelterMul);
      break;
  }

  return { rainSplash, frostTarget, condensation, heatAsh };
}

export interface BlizzardFrostParams {
  effectiveIntensity: number;
  opacity: number;
  blurRadiusPx: number;
  edgeReach: number;
}

/**
 * Pure scaling curve mapping progressive blizzard frost intensity (0..1) and
 * ice-gust audio surges to shader opacity, frosted-glass edge-blur radius (px),
 * and inward viewport edge reach so environmental hostility reads unmistakably.
 */
export function computeBlizzardFrostParams(
  frostIntensity01: number,
  gustPulse01: number,
): BlizzardFrostParams {
  const effectiveIntensity = Math.max(0, Math.min(1, frostIntensity01 + gustPulse01 * 0.28));
  const opacity = effectiveIntensity <= 0.001 ? 0 : Math.pow(effectiveIntensity, 0.85) * 0.8;
  const blurRadiusPx = effectiveIntensity <= 0.001 ? 0 : effectiveIntensity * 14.5;
  const edgeReach = 0.14 + effectiveIntensity * 0.36;
  return { effectiveIntensity, opacity, blurRadiusPx, edgeReach };
}

export interface PortalClimateLightProfile {
  colorHex: number;
  pulseTintHex: number;
  baseIntensity: number;
  pulseAmp: number;
  pulseFreq: number;
  baseDistance: number;
}

export const PORTAL_CLIMATE_LIGHT_PROFILES: Record<WeatherMode, PortalClimateLightProfile> = {
  clear: {
    colorHex: 0xffcf48, // Warm Golden Alpine Sun
    pulseTintHex: 0xffe999,
    baseIntensity: 19.0,
    pulseAmp: 6.5,
    pulseFreq: 2.2,
    baseDistance: 34,
  },
  mist: {
    colorHex: 0x5eead4, // Highland Jade-Teal Vapor
    pulseTintHex: 0xa7f3d0,
    baseIntensity: 17.5,
    pulseAmp: 5.8,
    pulseFreq: 1.85,
    baseDistance: 32,
  },
  fog: {
    colorHex: 0x93c5fd, // Ethereal Silver-Slate Mist
    pulseTintHex: 0xe0f2fe,
    baseIntensity: 18.5,
    pulseAmp: 6.2,
    pulseFreq: 1.65,
    baseDistance: 34,
  },
  rain: {
    colorHex: 0x3b82f6, // Cobalt Downpour Azure
    pulseTintHex: 0x7dd3fc,
    baseIntensity: 20.5,
    pulseAmp: 7.4,
    pulseFreq: 2.85,
    baseDistance: 35,
  },
  storm: {
    colorHex: 0xa855f7, // Tempest Lightning Violet
    pulseTintHex: 0xf0abfc,
    baseIntensity: 23.0,
    pulseAmp: 9.8,
    pulseFreq: 3.9,
    baseDistance: 38,
  },
  blizzard: {
    colorHex: 0x22d3ee, // Glacial Frost Cyan
    pulseTintHex: 0xcffafe,
    baseIntensity: 24.5,
    pulseAmp: 9.2,
    pulseFreq: 3.25,
    baseDistance: 38,
  },
  ashstorm: {
    colorHex: 0xff6b1a, // Volcanic Magma Orange
    pulseTintHex: 0xfbbf24,
    baseIntensity: 25.0,
    pulseAmp: 9.6,
    pulseFreq: 3.45,
    baseDistance: 38,
  },
};

export interface PortalClimateLightState {
  weather: WeatherMode;
  colorHex: number;
  pulseTintHex: number;
  wave01: number;
  intensity: number;
  distance: number;
}

/**
 * Computes the dynamic pulsing PointLight state for a 3D portal center matched
 * to the active climate (e.g. golden for Clear, cyan for Blizzard, orange for Ashstorm).
 */
export function computePortalClimateLightState(
  weather: WeatherMode,
  elapsedSec: number,
  portalIndex = 0,
  lightningFlash = 0,
): PortalClimateLightState {
  const profile = PORTAL_CLIMATE_LIGHT_PROFILES[weather] ?? PORTAL_CLIMATE_LIGHT_PROFILES.clear;
  const phase = elapsedSec * profile.pulseFreq + portalIndex * 1.15;
  const primaryWave = Math.sin(phase);
  const harmonicWave = Math.sin(phase * 2.15 + 0.6) * 0.32;
  const wave01 = Math.max(0, Math.min(1, 0.5 + (primaryWave + harmonicWave) * 0.38));
  const lightningBoost = weather === 'storm' ? Math.max(0, lightningFlash) * 14.0 : 0;
  const intensity = Number(
    (profile.baseIntensity + (wave01 - 0.5) * 2 * profile.pulseAmp + lightningBoost).toFixed(3),
  );
  const distance = Number((profile.baseDistance + wave01 * 6.5).toFixed(2));

  return {
    weather,
    colorHex: profile.colorHex,
    pulseTintHex: profile.pulseTintHex,
    wave01: Number(wave01.toFixed(4)),
    intensity,
    distance,
  };
}

export interface SnakePose3D {
  x: number;
  y: number;
  z: number;
  nx: number;
  ny: number;
  nz: number;
  heading: number;
}

export interface RenderSnakeState {
  head: SnakePose3D;
  segments: SnakePose3D[];
  boostActive: boolean;
  speedRatio: number;
  traversalStrain?: number;
  steerRateNorm?: number;
  traversalClimate?: WeatherMode;
}

interface BurstParticle {
  active: boolean;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  age: number;
  life: number;
  scale: number;
  color: THREE.Color;
}

interface EvoShardParticle {
  active: boolean;
  kind: 'core' | 'ring' | 'helix';
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  originX: number;
  originY: number;
  originZ: number;
  orbitAngle: number;
  orbitRadius: number;
  orbitSpeed: number;
  riseSpeed: number;
  delay: number;
  age: number;
  life: number;
  scale: number;
  spinX: number;
  spinY: number;
  color: THREE.Color;
}

interface EvoSparkParticle {
  active: boolean;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  delay: number;
  age: number;
  life: number;
  baseColor: THREE.Color;
}

interface EvoShockRing {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  delay: number;
  age: number;
  life: number;
  maxRadius: number;
  riseSpeed: number;
}

interface MistParticle {
  x: number;
  z: number;
  yOffset: number;
  driftX: number;
  driftZ: number;
  phase: number;
}

interface RainDrop {
  x: number;
  y: number;
  z: number;
  speed: number;
  len: number;
}

interface RainSplash {
  active: boolean;
  x: number;
  y: number;
  z: number;
  nx: number;
  ny: number;
  nz: number;
  age: number;
  life: number;
  maxScale: number;
}

interface WeatherAtmosphere {
  fogDensity: number;
  skyHex: number;
  fogHex: number;
  sunScale: number;
  hemiScale: number;
  rimScale: number;
  exposure: number;
  mistOpacity: number;
  mistSize: number;
  mistTint: number;
  // Dynamic GPU climate particle shader parameters
  particleOpacity: number;
  particleSize: number;
  particleWindX: number;
  particleWindZ: number;
  particleVelY: number;
  particleColorA: number;
  particleColorB: number;
  particleStyle: number; // 0 = mist/mote, 1 = blizzard snowflake, 2 = ash & ember, 3 = storm spark/spray
  overlayTint: number;
}

const WEATHER_PRESETS: Record<BiomeId, Record<WeatherMode, WeatherAtmosphere>> = {
  mountain: {
    clear: {
      fogDensity: 0.0038,
      skyHex: 0x2c5680,
      fogHex: 0x426c96,
      sunScale: 1.06,
      hemiScale: 1.0,
      rimScale: 1.0,
      exposure: 1.08,
      mistOpacity: 0.0,
      mistSize: 15,
      mistTint: 0xdbeeff,
      particleOpacity: 0.22,
      particleSize: 2.2,
      particleWindX: 0.8,
      particleWindZ: 0.3,
      particleVelY: 0.35,
      particleColorA: 0xe6f6ff,
      particleColorB: 0xfff0c2,
      particleStyle: 0,
      overlayTint: 0x8cc8ff,
    },
    mist: {
      fogDensity: 0.0084,
      skyHex: 0x4b6a82,
      fogHex: 0x6d8aa0,
      sunScale: 0.82,
      hemiScale: 1.02,
      rimScale: 0.86,
      exposure: 1.03,
      mistOpacity: 0.32,
      mistSize: 18,
      mistTint: 0xdcebf7,
      particleOpacity: 0.42,
      particleSize: 3.0,
      particleWindX: 2.2,
      particleWindZ: 0.8,
      particleVelY: -0.45,
      particleColorA: 0xdceeff,
      particleColorB: 0x9fc4de,
      particleStyle: 0,
      overlayTint: 0x9ec0d9,
    },
    fog: {
      fogDensity: 0.0215,
      skyHex: 0x718594,
      fogHex: 0x899ba8,
      sunScale: 0.38,
      hemiScale: 1.15,
      rimScale: 0.48,
      exposure: 0.96,
      mistOpacity: 0.56,
      mistSize: 26,
      mistTint: 0xd9e3eb,
      particleOpacity: 0.58,
      particleSize: 4.4,
      particleWindX: 1.5,
      particleWindZ: -0.6,
      particleVelY: -0.25,
      particleColorA: 0xd8e4ed,
      particleColorB: 0x9fb2bf,
      particleStyle: 0,
      overlayTint: 0xb7cad8,
    },
    rain: {
      fogDensity: 0.0135,
      skyHex: 0x2c4054,
      fogHex: 0x42586e,
      sunScale: 0.46,
      hemiScale: 0.9,
      rimScale: 0.68,
      exposure: 0.94,
      mistOpacity: 0.28,
      mistSize: 17,
      mistTint: 0xb7cadc,
      particleOpacity: 0.65,
      particleSize: 2.8,
      particleWindX: -5.4,
      particleWindZ: -1.8,
      particleVelY: -13.5,
      particleColorA: 0xcbe8ff,
      particleColorB: 0x7cb6e6,
      particleStyle: 3,
      overlayTint: 0x5c8ab5,
    },
    storm: {
      fogDensity: 0.0185,
      skyHex: 0x162233,
      fogHex: 0x24364d,
      sunScale: 0.3,
      hemiScale: 0.72,
      rimScale: 0.95,
      exposure: 0.9,
      mistOpacity: 0.4,
      mistSize: 21,
      mistTint: 0x8ea7c2,
      particleOpacity: 0.88,
      particleSize: 3.4,
      particleWindX: -12.5,
      particleWindZ: -4.2,
      particleVelY: -22.0,
      particleColorA: 0xc8ebff,
      particleColorB: 0x6ec3ff,
      particleStyle: 3,
      overlayTint: 0x3b6fa3,
    },
    blizzard: {
      fogDensity: 0.0255,
      skyHex: 0x9bb7cc,
      fogHex: 0xbcd4e6,
      sunScale: 0.42,
      hemiScale: 1.24,
      rimScale: 0.78,
      exposure: 1.0,
      mistOpacity: 0.58,
      mistSize: 24,
      mistTint: 0xeaf6ff,
      particleOpacity: 0.96,
      particleSize: 4.5,
      particleWindX: -15.5,
      particleWindZ: -5.5,
      particleVelY: -8.5,
      particleColorA: 0xffffff,
      particleColorB: 0xbde7ff,
      particleStyle: 1,
      overlayTint: 0xd9f2ff,
    },
    ashstorm: {
      fogDensity: 0.0235,
      skyHex: 0x3d1c16,
      fogHex: 0x5c2a1e,
      sunScale: 0.44,
      hemiScale: 0.86,
      rimScale: 1.15,
      exposure: 0.94,
      mistOpacity: 0.52,
      mistSize: 23,
      mistTint: 0x8f503c,
      particleOpacity: 0.95,
      particleSize: 4.2,
      particleWindX: 9.8,
      particleWindZ: 3.6,
      particleVelY: 4.6,
      particleColorA: 0xff8a3d,
      particleColorB: 0x3c2c28,
      particleStyle: 2,
      overlayTint: 0xff6229,
    },
  },
  jungle: {
    clear: {
      fogDensity: 0.0046,
      skyHex: 0x1a423c,
      fogHex: 0x23524b,
      sunScale: 1.05,
      hemiScale: 1.0,
      rimScale: 1.0,
      exposure: 1.08,
      mistOpacity: 0.0,
      mistSize: 15,
      mistTint: 0xd4f5ea,
      particleOpacity: 0.28,
      particleSize: 2.4,
      particleWindX: 0.6,
      particleWindZ: 0.4,
      particleVelY: 0.45,
      particleColorA: 0xaefce0,
      particleColorB: 0xffe999,
      particleStyle: 0,
      overlayTint: 0x56d9a8,
    },
    mist: {
      fogDensity: 0.0092,
      skyHex: 0x2b5752,
      fogHex: 0x41726c,
      sunScale: 0.82,
      hemiScale: 1.02,
      rimScale: 0.88,
      exposure: 1.02,
      mistOpacity: 0.34,
      mistSize: 19,
      mistTint: 0xd4f0e7,
      particleOpacity: 0.44,
      particleSize: 3.2,
      particleWindX: 2.0,
      particleWindZ: 0.9,
      particleVelY: -0.35,
      particleColorA: 0xcff7e9,
      particleColorB: 0x88c7b6,
      particleStyle: 0,
      overlayTint: 0x7ac7b4,
    },
    fog: {
      fogDensity: 0.022,
      skyHex: 0x4c6e69,
      fogHex: 0x658782,
      sunScale: 0.36,
      hemiScale: 1.16,
      rimScale: 0.48,
      exposure: 0.95,
      mistOpacity: 0.58,
      mistSize: 26,
      mistTint: 0xcce3dd,
      particleOpacity: 0.6,
      particleSize: 4.5,
      particleWindX: 1.4,
      particleWindZ: -0.5,
      particleVelY: -0.2,
      particleColorA: 0xcde6df,
      particleColorB: 0x8ab0a7,
      particleStyle: 0,
      overlayTint: 0x99bfb6,
    },
    rain: {
      fogDensity: 0.0142,
      skyHex: 0x183032,
      fogHex: 0x2b4b4d,
      sunScale: 0.45,
      hemiScale: 0.9,
      rimScale: 0.68,
      exposure: 0.93,
      mistOpacity: 0.3,
      mistSize: 17,
      mistTint: 0xaad0cc,
      particleOpacity: 0.68,
      particleSize: 2.9,
      particleWindX: -5.2,
      particleWindZ: -2.0,
      particleVelY: -14.0,
      particleColorA: 0xc4f2ee,
      particleColorB: 0x67b5b0,
      particleStyle: 3,
      overlayTint: 0x428f8b,
    },
    storm: {
      fogDensity: 0.0195,
      skyHex: 0x102126,
      fogHex: 0x1d353b,
      sunScale: 0.28,
      hemiScale: 0.72,
      rimScale: 0.96,
      exposure: 0.89,
      mistOpacity: 0.42,
      mistSize: 22,
      mistTint: 0x7ca6ab,
      particleOpacity: 0.9,
      particleSize: 3.5,
      particleWindX: -12.8,
      particleWindZ: -4.5,
      particleVelY: -22.5,
      particleColorA: 0xc2f6ff,
      particleColorB: 0x52c7d9,
      particleStyle: 3,
      overlayTint: 0x2f7d8f,
    },
    blizzard: {
      fogDensity: 0.025,
      skyHex: 0x7da3a8,
      fogHex: 0xa2c6cc,
      sunScale: 0.42,
      hemiScale: 1.22,
      rimScale: 0.8,
      exposure: 0.99,
      mistOpacity: 0.56,
      mistSize: 24,
      mistTint: 0xe3f7fa,
      particleOpacity: 0.95,
      particleSize: 4.5,
      particleWindX: -15.0,
      particleWindZ: -5.2,
      particleVelY: -8.4,
      particleColorA: 0xffffff,
      particleColorB: 0xb2ecf5,
      particleStyle: 1,
      overlayTint: 0xcbf2fa,
    },
    ashstorm: {
      fogDensity: 0.024,
      skyHex: 0x3b1a14,
      fogHex: 0x59291c,
      sunScale: 0.42,
      hemiScale: 0.85,
      rimScale: 1.15,
      exposure: 0.93,
      mistOpacity: 0.54,
      mistSize: 23,
      mistTint: 0x8f4e39,
      particleOpacity: 0.95,
      particleSize: 4.2,
      particleWindX: 9.6,
      particleWindZ: 3.4,
      particleVelY: 4.8,
      particleColorA: 0xff8533,
      particleColorB: 0x382824,
      particleStyle: 2,
      overlayTint: 0xff5e26,
    },
  },
};

const MAX_SNAKE_SEGMENTS = 120;
const MAX_BURST_PARTICLES = 180;
const MAX_EVO_SHARDS = 260;
const MAX_EVO_SPARKS = 220;
const MAX_COLLECTIBLES = 42;
const MAX_ROLLING_BOULDERS = 24;
const MAX_PROJECTILES = 56;
const MAX_SHOCKWAVES = 14;
const MAX_FISSURES = 10;

// Scratch objects reused per frame (zero per-frame heap allocation)
const _vec3A = new THREE.Vector3();
const _vec3B = new THREE.Vector3();
const _up = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _right = new THREE.Vector3();
const _basisMat = new THREE.Matrix4();
const _mat4 = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3();
const _euler = new THREE.Euler();
const _color = new THREE.Color();
const _targetSkyColor = new THREE.Color();
const _targetFogColor = new THREE.Color();
const _targetMistColor = new THREE.Color();
const _targetSunColor = new THREE.Color();
const _targetHemiSkyColor = new THREE.Color();
const _targetHemiGroundColor = new THREE.Color();
const _targetRimColor = new THREE.Color();
const _levelTintColor = new THREE.Color();
const _yAxis = new THREE.Vector3(0, 1, 0);

export class WorldEngine {
  public readonly container: HTMLElement;
  public readonly renderer: THREE.WebGLRenderer;
  public readonly scene: THREE.Scene;
  public readonly camera: THREE.PerspectiveCamera;
  public readonly isSoftwareGl: boolean;

  private readonly worldRoot = new THREE.Group();
  private readonly envGroup = new THREE.Group();
  private readonly propsGroup = new THREE.Group();
  private readonly snakeGroup = new THREE.Group();
  private readonly collectiblesGroup = new THREE.Group();
  private readonly bouldersGroup = new THREE.Group();
  private readonly beastsGroup = new THREE.Group();
  private readonly combatFxGroup = new THREE.Group();
  private readonly lastSnakeHeadPos = new THREE.Vector3(0, 0, 4);
  private readonly evoExplosionGroup = new THREE.Group();
  private readonly landmarksGroup = new THREE.Group();
  private readonly weatherGroup = new THREE.Group();

  private readonly maxAnisotropy: number;
  private biome: BiomeId = 'mountain';
  private weather: WeatherMode = 'mist';
  private activeEvolutionLevel = 1;

  // Terrain mesh (also raycast target in Builder mode)
  private terrainMesh: THREE.Mesh | null = null;
  private naturalObstacles: WorldObstacle[] = [];

  // Lighting & Cascaded Shadow Maps (CSM)
  private csm: CSM | null = null;
  private fallbackSunLight: THREE.DirectionalLight | null = null;
  private lastCsmFov = 58;
  private baseSunIntensity = 2.55;
  private baseHemiIntensity = 0.9;
  private baseRimIntensity = 0.58;
  private hemiLight!: THREE.HemisphereLight;
  private rimLight!: THREE.DirectionalLight;
  private waterMeshes: THREE.Mesh[] = [];

  // Ambient floating particles (snowflakes / jungle fireflies)
  private ambientMotes: THREE.Points | null = null;
  private ambientMotePositions: Float32Array | null = null;

  // Procedural Weather System (drifting mist/fog puffs, slanted light rain, ground splashes)
  private mistTexture!: THREE.CanvasTexture;
  private mistPoints!: THREE.Points;
  private mistMat!: THREE.PointsMaterial;
  private mistPositions!: Float32Array;
  private mistParticles: MistParticle[] = [];

  private rainLines!: THREE.LineSegments;
  private rainMat!: THREE.LineBasicMaterial;
  private rainPositions!: Float32Array;
  private rainDrops: RainDrop[] = [];
  private rainCyclePhase = Math.PI * 0.45;
  private liveRainIntensity = 0;

  private splashInstanced!: THREE.InstancedMesh;
  private splashMat!: THREE.MeshBasicMaterial;
  private rainSplashes: RainSplash[] = [];
  private splashCursor = 0;
  private weatherNormalScratch = { x: 0, y: 1, z: 0 };

  // GPU-driven Dynamic Weather Particle System (snowflakes, ash/embers, storm spray, mist motes)
  private climateParticles!: THREE.Points;
  private climateParticleMat!: THREE.ShaderMaterial;

  // Fullscreen Three.js ShaderMaterial Atmospheric Climate Overlay
  private overlayScene!: THREE.Scene;
  private overlayCamera!: THREE.OrthographicCamera;
  private weatherOverlayMesh!: THREE.Mesh;
  private weatherOverlayMat!: THREE.ShaderMaterial;
  private weatherShiftPulse = 0;
  private lightningFlash = 0;
  private lightningTimer = 3.2;
  private pendingLightningStrike = 0;

  // Audio-Synchronized Weather Screen-Space VFX (lens raindrop splashes, crystalline frost, mist condensation, ash cinders)
  private weatherAltitudeNorm = 0.2;
  private weatherSheltered = false;
  private blizzardExposure = 0;
  private screenFrostLevel = 0;
  private frostGustPulse = 0;
  private frostBiasX = 0;
  private condensationLevel = 0;
  private ashCinderPulse = 0;
  private ashBiasX = 0;
  private rainSprayPulse = 0;
  private screenDropletSpawnAccum = 0;
  private screenDropletCursor = 0;
  private screenDropletUniforms: THREE.Vector4[] = Array.from({ length: 12 }, () => new THREE.Vector4(0.5, 0.5, 0.02, 0));
  private screenDropletMeta: Array<{
    active: boolean;
    age: number;
    life: number;
    slideSpeed: number;
    driftX: number;
  }> = Array.from({ length: 12 }, () => ({
    active: false,
    age: 0,
    life: 1.5,
    slideSpeed: 0.04,
    driftX: 0,
  }));

  // Dedicated Shader-Based Screen Frost Edge-Blur Overlay (uses FramebufferTexture for real frosted-glass blur)
  private frostOverlayScene!: THREE.Scene;
  private frostOverlayMesh!: THREE.Mesh;
  private frostOverlayMat!: THREE.ShaderMaterial;
  private frostFrameTexture: THREE.FramebufferTexture | null = null;
  private frostBufferSize = new THREE.Vector2(0, 0);
  private frostSizeScratch = new THREE.Vector2(0, 0);

  // Soul Clan Skill VFX: temporary purple screen-space distortion + 3D vortex particle burst
  private soulSkillPulse = 0;
  private soulSkillPhase = 0;
  private soulSkillPower = 0;
  private soulVortexPoints!: THREE.Points;
  private soulVortexMat!: THREE.PointsMaterial;
  private soulVortexPositions!: Float32Array;
  private soulVortexColors!: Float32Array;
  private soulVortexParticles: Array<{
    active: boolean;
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
    originX: number;
    originZ: number;
    swirlSpeed: number;
    age: number;
    life: number;
    r: number;
    g: number;
    b: number;
  }> = [];
  private soulVortexRingMesh!: THREE.Mesh;
  private soulVortexRingMat!: THREE.MeshBasicMaterial;
  private soulVortexRingAge = 0;
  private soulVortexRingLife = 0;
  private soulVortexRingMaxRadius = 6;
  private soulVortexRingOrigin = new THREE.Vector3();

  // Snake & 12-Stage Ascension Human Avatar visuals
  private snakeHeadGroup!: THREE.Group;
  private snakeTongue!: THREE.Group;
  private snakeHeadMat!: THREE.MeshStandardMaterial;
  private snakeLeftHorn!: THREE.Mesh;
  private snakeRightHorn!: THREE.Mesh;
  private snakeCrown!: THREE.Mesh;
  private snakeBodyPool: THREE.Group[] = [];
  private snakeBodyMat!: THREE.MeshStandardMaterial;
  private snakeCrestMat!: THREE.MeshStandardMaterial;
  private snakeBellyMat!: THREE.MeshStandardMaterial;
  private ascensionRig!: AscensionAvatarRig;
  private playerAuraRig!: PlayerAuraRig;
  private traversalWakeRig!: TraversalWakeRig;
  private gaitPhase = 0;
  private snakeScaleMap!: THREE.Texture;
  private contactShadowMap!: THREE.Texture;

  // Dynamic world collectibles (14+ simultaneously across mountains)
  private collectiblePool: Array<{
    group: THREE.Group;
    golden: boolean;
    active: boolean;
  }> = [];

  // Dynamic rolling mountain boulders
  private rollingBoulderPool: THREE.Group[] = [];

  // Dynamic wild mountain beasts, Soul Clan ghosts & magical combat FX pools
  private beastPools: Record<BeastKind, BeastRig[]> = {
    wolf: [],
    boar: [],
    eagle: [],
    guardian: [],
    wraith: [],
    soul_elder: [],
  };
  private groundFissurePool: GroundFissureRig[] = [];
  private projectilePool: Array<{
    group: THREE.Group;
    coreMat: THREE.MeshBasicMaterial;
    haloMat: THREE.MeshBasicMaterial;
  }> = [];
  private shockwavePool: Array<{
    group: THREE.Group;
    ringMat: THREE.MeshBasicMaterial;
    discMat: THREE.MeshBasicMaterial;
  }> = [];

  // Landmark shrines on the 5 mountain peaks
  private landmarkVisuals: Array<{
    id: string;
    group: THREE.Group;
    crystal: THREE.Mesh;
    ring: THREE.Mesh;
    beam: THREE.Mesh;
  }> = [];

  // Animated player-placed props
  private animatedTotems: Array<{ core: THREE.Object3D; ring: THREE.Object3D; baseY: number }> = [];
  private animatedPortals: Array<{
    halo: THREE.Object3D;
    innerWheel?: THREE.Object3D | null;
    orbitGroup?: THREE.Object3D | null;
    skyBeam?: THREE.Object3D | null;
    climateLight?: THREE.PointLight | null;
    climateCore?: THREE.Mesh | null;
    s1: THREE.Object3D;
    s2: THREE.Object3D;
    screen?: THREE.Object3D | null;
    crest?: THREE.Object3D | null;
  }> = [];
  private animatedBoosts: Array<{ core: THREE.Object3D; ring: THREE.Object3D }> = [];
  private portalCanvasA: HTMLCanvasElement | null = null;
  private portalCanvasB: HTMLCanvasElement | null = null;
  private portalTexA: THREE.CanvasTexture | null = null;
  private portalTexB: THREE.CanvasTexture | null = null;

  // Builder hover ghost & raycaster
  private hoverGhost!: THREE.Group;
  private boundaryRing!: THREE.Mesh;
  private raycaster = new THREE.Raycaster();
  private pointerNdc = new THREE.Vector2();

  // Burst particles (pooled InstancedMesh)
  private burstInstanced!: THREE.InstancedMesh;
  private burstParticles: BurstParticle[] = [];

  // Celebratory Evolution Tier-Up WebGL Particle Explosion (pooled, zero-GC)
  private sparkGlowMap!: THREE.CanvasTexture;
  private evoShardInstanced!: THREE.InstancedMesh;
  private evoShards: EvoShardParticle[] = [];
  private evoSparkPoints!: THREE.Points;
  private evoSparkPositions!: Float32Array;
  private evoSparkColors!: Float32Array;
  private evoSparkMat!: THREE.PointsMaterial;
  private evoSparks: EvoSparkParticle[] = [];
  private evoRings: EvoShockRing[] = [];
  private evoPillarMesh!: THREE.Mesh;
  private evoPillarMat!: THREE.MeshBasicMaterial;
  private evoFlashLight!: THREE.PointLight;
  private evoActive = false;
  private evoAge = 0;
  private evoDuration = 3.2;
  private evoOrigin = new THREE.Vector3();
  private evoFlashPeak = 16;

  // Camera state
  private cameraTargetPos = new THREE.Vector3(0, 14, 24);
  private cameraLookAt = new THREE.Vector3(0, 6, -24);
  private currentLookAt = new THREE.Vector3(0, 6, -24);
  private smoothHeading = Math.PI; // facing -Z toward Grand Glacier Peak
  private titleOrbitAngle = 0.25;
  private builderYaw = 0.4;
  private builderPitch = 0.92;
  private builderDist = 82;
  private builderFocus = new THREE.Vector3(0, 8, -12);
  private shakeIntensity = 0;

  // Half-human hand cannon procedural weapon recoil & 2D screen-space camera shake state
  private gunRecoil = 0;
  private gunRecoilVel = 0;
  private gunTwist = 0;
  private gunTwistVel = 0;
  private gunBlowback = 0;
  private gunBlowbackVel = 0;
  private gunSlideKick = 0;
  private gunHammerKick = 0;
  private gunTriggerPull = 0;
  private gunFlashTimer = 0;
  private gunCamKick = 0;
  private gunScreenShakeX = 0;
  private gunScreenShakeY = 0;
  private gunScreenShakeVelX = 0;
  private gunScreenShakeVelY = 0;
  private gunScreenRoll = 0;
  private gunScreenRollVel = 0;
  private gunScreenFovKick = 0;
  private gunScreenPulse = 0;
  private gunShotParity = 1;

  // Loop & XR state
  private running = false;
  private frameId = 0;
  private lastTickPerf = 0;
  private elapsed = 0;
  private onFrameCallback: ((dt: number) => void) | null = null;
  private xrActive = false;

  constructor(container: HTMLElement) {
    this.container = container;
    this.isSoftwareGl = WorldEngine.detectSoftwareWebGL();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(
      container.clientWidth || window.innerWidth,
      container.clientHeight || window.innerHeight,
    );
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.06;
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    container.appendChild(this.renderer.domElement);

    this.maxAnisotropy = Math.min(this.renderer.capabilities.getMaxAnisotropy(), 8);

    this.scene = new THREE.Scene();

    // Procedural IBL reflection environment on all devices
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.42;
    pmrem.dispose();

    this.camera = new THREE.PerspectiveCamera(
      58,
      (container.clientWidth || window.innerWidth) /
        Math.max(1, container.clientHeight || window.innerHeight),
      0.2,
      940,
    );
    this.camera.position.set(0, 18, 26);

    this.scene.add(this.worldRoot);
    this.worldRoot.add(
      this.envGroup,
      this.landmarksGroup,
      this.propsGroup,
      this.collectiblesGroup,
      this.bouldersGroup,
      this.beastsGroup,
      this.combatFxGroup,
      this.evoExplosionGroup,
      this.snakeGroup,
      this.weatherGroup,
    );

    this.snakeScaleMap = createSnakeScaleTexture(this.maxAnisotropy);
    this.contactShadowMap = createContactShadowTexture();
    this.mistTexture = createMistTexture();
    this.sparkGlowMap = createSparkGlowTexture();

    this.initLighting();
    this.initSnakeVisuals();
    this.initCombatFxPools();
    this.initBuilderHelpers();
    this.initBurstParticles();
    this.initSoulSkillEffect();
    this.initEvolutionExplosion();
    this.initWeatherSystem();
    this.setBiome('mountain');
    this.applyWeatherImmediate();

    window.addEventListener('resize', this.handleResize);
  }

  private static detectSoftwareWebGL(): boolean {
    try {
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl2') || c.getContext('webgl');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const rendererName = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
      return /SwiftShader|llvmpipe|Software|Mesa OffScreen/i.test(rendererName);
    } catch {
      return false;
    }
  }

  public getNaturalObstacles(): WorldObstacle[] {
    return this.naturalObstacles;
  }

  private getModelResources(): ModelResources {
    return {
      scaleMap: this.snakeScaleMap,
      contactShadow: this.contactShadowMap,
      biome: this.biome,
      castShadows: !this.isSoftwareGl,
    };
  }

  private initLighting(): void {
    this.hemiLight = new THREE.HemisphereLight(0xa3d4ff, 0x263544, 0.92);
    this.scene.add(this.hemiLight);

    if (!this.isSoftwareGl) {
      // High-quality 4-cascade 2048px Cascaded Shadow Maps for crisp close-up snake shadows
      // and sweeping mountain ridge, tree, and boulder shadows across the entire valley
      this.csm = new CSM({
        camera: this.camera,
        parent: this.scene,
        cascades: 4,
        maxFar: 220,
        mode: 'practical',
        shadowMapSize: 2048,
        shadowBias: -0.00022,
        lightDirection: new THREE.Vector3(-0.62, -0.68, -0.39).normalize(),
        lightIntensity: 2.5,
        lightNear: 1,
        lightFar: 520,
        lightMargin: 120,
      });
      this.csm.fade = true;
      this.configureCsmCascadeBiases();
      this.csm.updateFrustums();
      this.lastCsmFov = this.camera.fov;
    } else {
      // Lightweight fallback sun for software WebGL where shadow maps are disabled
      this.fallbackSunLight = new THREE.DirectionalLight(0xffe7cf, 2.45);
      this.fallbackSunLight.position.set(36, 58, 28);
      this.scene.add(this.fallbackSunLight);
      this.scene.add(this.fallbackSunLight.target);
    }

    this.rimLight = new THREE.DirectionalLight(0x88ccff, 0.58);
    this.rimLight.position.set(-42, 24, -36);
    this.rimLight.castShadow = false;
    this.scene.add(this.rimLight);
  }

  private configureCsmCascadeBiases(): void {
    if (!this.csm) return;
    // Progressive per-cascade bias: tight near snake for grounded contact, smooth on distant cliffs
    const biases = [-0.00016, -0.00024, -0.00034, -0.00046];
    const normalBiases = [0.022, 0.042, 0.068, 0.095];
    const radii = [1.5, 1.8, 2.1, 2.4];

    this.csm.lights.forEach((light, i) => {
      light.shadow.bias = biases[i] ?? -0.0003;
      light.shadow.normalBias = normalBiases[i] ?? 0.05;
      light.shadow.radius = radii[i] ?? 1.8;
    });
  }

  /**
   * Registers all lit PBR materials under an Object3D subtree with CSM once.
   */
  private registerCsmMaterials(root: THREE.Object3D): void {
    if (!this.csm) return;
    const csm = this.csm;
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh || !mesh.material) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const mat of mats) {
        if (
          (mat as THREE.MeshStandardMaterial).isMeshStandardMaterial ||
          (mat as THREE.MeshPhysicalMaterial).isMeshPhysicalMaterial
        ) {
          if (!csm.shaders.has(mat)) {
            csm.setupMaterial(mat);
          }
        }
      }
    });
  }

  /**
   * Unregisters materials from CSM shader map and disposes geometries/materials in a group.
   */
  private disposeGroupWithCsm(group: THREE.Group): void {
    group.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh || (obj as THREE.Points).isPoints) {
        const m = obj as THREE.Mesh;
        m.geometry?.dispose();
        if (Array.isArray(m.material)) {
          m.material.forEach((mat) => {
            this.csm?.shaders.delete(mat);
            mat.dispose();
          });
        } else if (m.material) {
          this.csm?.shaders.delete(m.material);
          m.material.dispose();
        }
      }
    });
    group.clear();
  }

  private initSnakeVisuals(): void {
    const res = this.getModelResources();
    const head = createSerpentHead(res);
    this.snakeHeadGroup = head.group;
    this.snakeTongue = head.tongue;
    this.snakeHeadMat = head.headMat;
    this.snakeLeftHorn = head.leftHorn;
    this.snakeRightHorn = head.rightHorn;
    this.snakeCrown = head.crown;
    this.snakeHeadGroup.scale.setScalar(0.72);
    this.snakeGroup.add(this.snakeHeadGroup);

    // 12-stage Evolution & Ascended Human composite articulated rig
    this.ascensionRig = createAscensionAvatar(res);
    this.ascensionRig.group.visible = false;
    this.snakeGroup.add(this.ascensionRig.group);

    // Escalating Player Arcane Aura (orbiting rune shards + ground halo)
    this.playerAuraRig = createPlayerAuraRig();
    this.snakeGroup.add(this.playerAuraRig.group);

    // 3D Blizzard / Ashstorm Difficult Traversal Wake & Flank Drift Rig
    this.traversalWakeRig = createTraversalWakeRig();
    this.snakeGroup.add(this.traversalWakeRig.group);

    const bodyGeo = new THREE.SphereGeometry(0.37, 14, 12);
    const crestGeo = new THREE.OctahedronGeometry(0.11, 0);
    crestGeo.scale(0.65, 1.0, 1.45);
    const bellyGeo = new THREE.BoxGeometry(0.42, 0.12, 0.48);

    this.snakeBodyMat = new THREE.MeshStandardMaterial({
      color: 0x1bb373,
      map: this.snakeScaleMap,
      roughness: 0.3,
      metalness: 0.12,
      transparent: true,
      opacity: 1.0,
    });
    this.snakeCrestMat = new THREE.MeshStandardMaterial({
      color: 0xf4c44e,
      roughness: 0.28,
      metalness: 0.78,
      transparent: true,
      opacity: 1.0,
    });
    this.snakeBellyMat = new THREE.MeshStandardMaterial({
      color: 0xd9c282,
      roughness: 0.65,
      metalness: 0.05,
      transparent: true,
      opacity: 1.0,
    });

    for (let i = 0; i < MAX_SNAKE_SEGMENTS; i++) {
      const seg = createSerpentSegment(
        bodyGeo,
        crestGeo,
        bellyGeo,
        this.snakeBodyMat,
        this.snakeCrestMat,
        this.snakeBellyMat,
        !this.isSoftwareGl,
      );
      seg.visible = false;
      this.snakeBodyPool.push(seg);
      this.snakeGroup.add(seg);
    }
    this.registerCsmMaterials(this.snakeGroup);
  }

  private initCollectiblePool(): void {
    this.disposeGroupWithCsm(this.collectiblesGroup);
    this.collectiblePool = [];

    const res = this.getModelResources();
    for (let i = 0; i < MAX_COLLECTIBLES; i++) {
      const golden = i < 14; // first 14 slots are golden summit crystals with tall sky beacons
      const g = createFruitModel(res, golden);
      g.scale.setScalar(golden ? 1.55 : 1.3);
      g.visible = false;
      this.collectiblesGroup.add(g);
      this.collectiblePool.push({ group: g, golden, active: false });
    }
    this.registerCsmMaterials(this.collectiblesGroup);
  }

  private initRollingBoulderPool(): void {
    this.disposeGroupWithCsm(this.bouldersGroup);
    this.rollingBoulderPool = [];

    const res = this.getModelResources();
    for (let i = 0; i < MAX_ROLLING_BOULDERS; i++) {
      const b = createRollingBoulder(res);
      b.visible = false;
      this.bouldersGroup.add(b);
      this.rollingBoulderPool.push(b);
    }
    this.registerCsmMaterials(this.bouldersGroup);
  }

  private initBeastPools(): void {
    this.disposeGroupWithCsm(this.beastsGroup);
    this.beastPools = { wolf: [], boar: [], eagle: [], guardian: [], wraith: [], soul_elder: [] };

    const res = this.getModelResources();
    const counts: Record<BeastKind, number> = {
      wolf: 7,
      boar: 6,
      eagle: 6,
      guardian: 4,
      wraith: 8,
      soul_elder: 3,
    };

    for (const kind of ['wolf', 'boar', 'eagle', 'guardian', 'wraith', 'soul_elder'] as BeastKind[]) {
      for (let i = 0; i < counts[kind]; i++) {
        const rig = createBeastModel(res, kind);
        rig.group.visible = false;
        this.beastsGroup.add(rig.group);
        this.beastPools[kind].push(rig);
      }
    }
    this.registerCsmMaterials(this.beastsGroup);
  }

  private initCombatFxPools(): void {
    this.combatFxGroup.clear();
    this.projectilePool = [];
    this.shockwavePool = [];
    this.groundFissurePool = [];

    for (let i = 0; i < MAX_FISSURES; i++) {
      const fRig = createGroundFissureVisual();
      this.combatFxGroup.add(fRig.group);
      this.groundFissurePool.push(fRig);
    }

    const coreGeo = new THREE.OctahedronGeometry(0.32, 1);
    const haloGeo = new THREE.TorusGeometry(0.46, 0.055, 6, 16);
    for (let i = 0; i < MAX_PROJECTILES; i++) {
      const group = new THREE.Group();
      const coreMat = new THREE.MeshBasicMaterial({ color: 0x3de095 });
      const haloMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.78,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const core = new THREE.Mesh(coreGeo, coreMat);
      const halo = new THREE.Mesh(haloGeo, haloMat);
      group.add(core, halo);
      group.visible = false;
      this.combatFxGroup.add(group);
      this.projectilePool.push({ group, coreMat, haloMat });
    }

    const ringGeo = new THREE.TorusGeometry(1, 0.09, 8, 36);
    ringGeo.rotateX(Math.PI / 2);
    const discGeo = new THREE.RingGeometry(0.76, 1.0, 36);
    discGeo.rotateX(-Math.PI / 2);
    for (let i = 0; i < MAX_SHOCKWAVES; i++) {
      const group = new THREE.Group();
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x3de095,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const discMat = new THREE.MeshBasicMaterial({
        color: 0x3de095,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      const disc = new THREE.Mesh(discGeo, discMat);
      group.add(ring, disc);
      group.visible = false;
      this.combatFxGroup.add(group);
      this.shockwavePool.push({ group, ringMat, discMat });
    }
  }

  private initBuilderHelpers(): void {
    // Glowing terrain placement cursor ring
    this.hoverGhost = new THREE.Group();
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.35, 0.12, 8, 28),
      new THREE.MeshBasicMaterial({
        color: 0x58e1ff,
        transparent: true,
        opacity: 0.88,
      }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.25;
    this.hoverGhost.add(ring);

    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.3, 6.0, 8, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0x58e1ff,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    beam.position.y = 3.2;
    this.hoverGhost.add(beam);
    this.hoverGhost.visible = false;
    this.worldRoot.add(this.hoverGhost);

    // Subtle playable mountain boundary ring shown ONLY in Builder mode
    this.boundaryRing = new THREE.Mesh(
      new THREE.RingGeometry(WORLD_PLAY_RADIUS - 0.5, WORLD_PLAY_RADIUS + 0.5, 96),
      new THREE.MeshBasicMaterial({
        color: 0x7be0ff,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    this.boundaryRing.rotation.x = -Math.PI / 2;
    this.boundaryRing.position.y = 14;
    this.boundaryRing.visible = false;
    this.worldRoot.add(this.boundaryRing);
  }

  private initBurstParticles(): void {
    const geo = new THREE.OctahedronGeometry(0.18, 0);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.7,
      roughness: 0.2,
      metalness: 0.2,
    });
    this.burstInstanced = new THREE.InstancedMesh(geo, mat, MAX_BURST_PARTICLES);
    this.burstInstanced.frustumCulled = false;

    for (let i = 0; i < MAX_BURST_PARTICLES; i++) {
      this.burstParticles.push({
        active: false,
        pos: new THREE.Vector3(0, -200, 0),
        vel: new THREE.Vector3(),
        age: 0,
        life: 0.65,
        scale: 1,
        color: new THREE.Color(0xffd24d),
      });
      _mat4.makeScale(0, 0, 0);
      this.burstInstanced.setMatrixAt(i, _mat4);
      this.burstInstanced.setColorAt(i, _color.setHex(0xffd24d));
    }
    this.burstInstanced.instanceMatrix.needsUpdate = true;
    if (this.burstInstanced.instanceColor) {
      this.burstInstanced.instanceColor.needsUpdate = true;
    }
    this.worldRoot.add(this.burstInstanced);
    this.registerCsmMaterials(this.burstInstanced);
  }

  public spawnBurst(x: number, y: number, z: number, colorHex: number, count = 20): void {
    let spawned = 0;
    for (let i = 0; i < MAX_BURST_PARTICLES && spawned < count; i++) {
      const p = this.burstParticles[i];
      if (!p.active) {
        p.active = true;
        p.pos.set(x, y, z);
        const angle = Math.random() * Math.PI * 2;
        const speed = 2.2 + Math.random() * 5.2;
        p.vel.set(Math.cos(angle) * speed, 2.8 + Math.random() * 4.8, Math.sin(angle) * speed);
        p.age = 0;
        p.life = 0.48 + Math.random() * 0.4;
        p.scale = 0.75 + Math.random() * 0.95;
        p.color.setHex(colorHex);
        spawned++;
      }
    }
  }

  private initSoulSkillEffect(): void {
    const count = 96;
    this.soulVortexPositions = new Float32Array(count * 3);
    this.soulVortexColors = new Float32Array(count * 3);
    this.soulVortexParticles = [];
    for (let i = 0; i < count; i++) {
      this.soulVortexPositions[i * 3 + 1] = -400;
      this.soulVortexColors[i * 3] = 0.72;
      this.soulVortexColors[i * 3 + 1] = 0.28;
      this.soulVortexColors[i * 3 + 2] = 1.0;
      this.soulVortexParticles.push({
        active: false,
        x: 0,
        y: -400,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        originX: 0,
        originZ: 0,
        swirlSpeed: 0,
        age: 0,
        life: 0.7,
        r: 0.72,
        g: 0.28,
        b: 1.0,
      });
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.soulVortexPositions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.soulVortexColors, 3));
    this.soulVortexMat = new THREE.PointsMaterial({
      size: 1.15,
      map: this.sparkGlowMap,
      vertexColors: true,
      transparent: true,
      opacity: 0.94,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    this.soulVortexPoints = new THREE.Points(geo, this.soulVortexMat);
    this.soulVortexPoints.frustumCulled = false;
    this.soulVortexPoints.visible = false;
    this.soulVortexPoints.renderOrder = 5;
    this.combatFxGroup.add(this.soulVortexPoints);

    const ringGeo = new THREE.TorusGeometry(1, 0.085, 8, 40);
    ringGeo.rotateX(Math.PI / 2);
    this.soulVortexRingMat = new THREE.MeshBasicMaterial({
      color: 0xc084fc,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.soulVortexRingMesh = new THREE.Mesh(ringGeo, this.soulVortexRingMat);
    this.soulVortexRingMesh.visible = false;
    this.soulVortexRingMesh.renderOrder = 5;
    this.combatFxGroup.add(this.soulVortexRingMesh);
  }

  /**
   * Triggers a dramatic Three.js Soul Clan skill visual effect:
   * 1) Temporary purple screen-space concentric distortion & arcane violet vignette pulse.
   * 2) 3D spiraling purple/magenta/indigo particle burst & expanding arcane torus ring.
   */
  public triggerSoulSkillEffect(x: number, y: number, z: number, intensity = 0.8): void {
    const clamped = Math.max(0.25, Math.min(1.0, intensity));
    this.soulSkillPulse = Math.max(this.soulSkillPulse, clamped);
    this.soulSkillPower = Math.max(this.soulSkillPower, clamped);
    this.soulSkillPhase = 0;

    // Expanding 3D violet arcane ring
    this.soulVortexRingOrigin.set(x, y + 0.55, z);
    this.soulVortexRingAge = 0;
    this.soulVortexRingLife = 0.48 + clamped * 0.34;
    this.soulVortexRingMaxRadius = 3.2 + clamped * 7.5;
    this.soulVortexRingMesh.visible = true;
    this.soulVortexRingMesh.position.copy(this.soulVortexRingOrigin);
    this.soulVortexRingMesh.scale.setScalar(0.5);

    // Spiraling 3D Soul Clan violet/magenta particle burst
    const palette = [
      [0.49, 0.23, 0.93], // Deep indigo-purple (#7c3aed)
      [0.75, 0.52, 0.99], // Luminous spectral violet (#c084fc)
      [0.91, 0.30, 0.96], // Soul Clan magenta-orchid (#e879f9)
    ];
    const desired = Math.round(24 + clamped * 56);
    let spawned = 0;
    for (let i = 0; i < this.soulVortexParticles.length && spawned < desired; i++) {
      const p = this.soulVortexParticles[i];
      if (p.active && spawned < desired * 0.65) continue;
      const ang = (spawned / desired) * Math.PI * 2 + Math.random() * 0.45;
      const startRad = 0.35 + Math.random() * 0.85;
      const outSpeed = (2.8 + Math.random() * 5.6) * (0.65 + clamped * 0.65);
      const col = palette[spawned % palette.length];
      p.active = true;
      p.originX = x;
      p.originZ = z;
      p.x = x + Math.cos(ang) * startRad;
      p.y = y + 0.35 + Math.random() * 0.9;
      p.z = z + Math.sin(ang) * startRad;
      p.vx = Math.cos(ang) * outSpeed;
      p.vy = 2.2 + Math.random() * (3.6 + clamped * 3.4);
      p.vz = Math.sin(ang) * outSpeed;
      p.swirlSpeed = (spawned % 2 === 0 ? 1 : -1) * (3.2 + Math.random() * 3.4);
      p.age = 0;
      p.life = 0.46 + Math.random() * (0.38 + clamped * 0.25);
      p.r = col[0];
      p.g = col[1];
      p.b = col[2];
      spawned++;
    }
    this.soulVortexPoints.visible = true;

    // Layer crisp faceted violet burst shards for extra 3D depth
    this.spawnBurst(x, y + 0.9, z, clamped >= 0.8 ? 0xd946ef : 0xa855f7, Math.round(10 + clamped * 16));
  }

  private updateSoulSkillEffect(dt: number): void {
    // Update 3D violet vortex particles
    let anyActive = false;
    const posArr = this.soulVortexPositions;
    const colArr = this.soulVortexColors;
    for (let i = 0; i < this.soulVortexParticles.length; i++) {
      const p = this.soulVortexParticles[i];
      const idx = i * 3;
      if (!p.active) {
        posArr[idx + 1] = -400;
        continue;
      }
      p.age += dt;
      if (p.age >= p.life) {
        p.active = false;
        posArr[idx + 1] = -400;
        continue;
      }
      anyActive = true;
      // Tangential vortex swirl around cast origin + buoyant upward drift
      const rx = p.x - p.originX;
      const rz = p.z - p.originZ;
      const swirl = p.swirlSpeed * dt;
      const cosS = Math.cos(swirl);
      const sinS = Math.sin(swirl);
      const rotX = rx * cosS - rz * sinS;
      const rotZ = rx * sinS + rz * cosS;
      p.x = p.originX + rotX + p.vx * dt;
      p.z = p.originZ + rotZ + p.vz * dt;
      p.y += p.vy * dt;
      p.vx *= Math.max(0, 1 - dt * 1.9);
      p.vz *= Math.max(0, 1 - dt * 1.9);
      p.vy -= 3.2 * dt;

      const fade = Math.max(0, 1 - p.age / p.life);
      const bright = fade * fade;
      posArr[idx] = p.x;
      posArr[idx + 1] = p.y;
      posArr[idx + 2] = p.z;
      colArr[idx] = p.r * bright;
      colArr[idx + 1] = p.g * bright;
      colArr[idx + 2] = p.b * bright;
    }
    this.soulVortexPoints.visible = anyActive;
    if (anyActive) {
      (this.soulVortexPoints.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      (this.soulVortexPoints.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    }

    // Update expanding 3D purple arcane torus ring
    if (this.soulVortexRingMesh.visible) {
      this.soulVortexRingAge += dt;
      if (this.soulVortexRingAge >= this.soulVortexRingLife) {
        this.soulVortexRingMesh.visible = false;
        this.soulVortexRingMat.opacity = 0;
      } else {
        const u = this.soulVortexRingAge / this.soulVortexRingLife;
        const easeOut = 1 - Math.pow(1 - u, 3);
        const radius = 0.5 + easeOut * this.soulVortexRingMaxRadius;
        this.soulVortexRingMesh.position.set(
          this.soulVortexRingOrigin.x,
          this.soulVortexRingOrigin.y + easeOut * 1.35,
          this.soulVortexRingOrigin.z,
        );
        this.soulVortexRingMesh.scale.set(radius, 1 + (1 - u) * 1.2, radius);
        this.soulVortexRingMesh.rotation.y += dt * 5.2;
        this.soulVortexRingMat.opacity = (1 - u) * 0.82;
      }
    }
  }

  private initEvolutionExplosion(): void {
    this.evoExplosionGroup.visible = false;

    // 1. Faceted Luminous Celebration Shards (InstancedMesh, additive glow)
    const shardGeo = new THREE.OctahedronGeometry(0.24, 0);
    shardGeo.scale(0.68, 1.45, 0.68);
    const shardMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.evoShardInstanced = new THREE.InstancedMesh(shardGeo, shardMat, MAX_EVO_SHARDS);
    this.evoShardInstanced.frustumCulled = false;
    this.evoShardInstanced.renderOrder = 5;

    this.evoShards = [];
    for (let i = 0; i < MAX_EVO_SHARDS; i++) {
      this.evoShards.push({
        active: false,
        kind: 'core',
        pos: new THREE.Vector3(0, -300, 0),
        vel: new THREE.Vector3(),
        originX: 0,
        originY: 0,
        originZ: 0,
        orbitAngle: 0,
        orbitRadius: 1,
        orbitSpeed: 3,
        riseSpeed: 3,
        delay: 0,
        age: 0,
        life: 1.4,
        scale: 1,
        spinX: 6,
        spinY: 8,
        color: new THREE.Color(0xffe066),
      });
      _mat4.makeScale(0, 0, 0);
      this.evoShardInstanced.setMatrixAt(i, _mat4);
      this.evoShardInstanced.setColorAt(i, _color.setHex(0xffe066));
    }
    this.evoShardInstanced.instanceMatrix.needsUpdate = true;
    if (this.evoShardInstanced.instanceColor) {
      this.evoShardInstanced.instanceColor.needsUpdate = true;
    }
    this.evoExplosionGroup.add(this.evoShardInstanced);

    // 2. Radiant Star-Spark Bokeh Cloud (THREE.Points with vertex colors + additive glow)
    this.evoSparkPositions = new Float32Array(MAX_EVO_SPARKS * 3);
    this.evoSparkColors = new Float32Array(MAX_EVO_SPARKS * 3);
    this.evoSparks = [];
    for (let i = 0; i < MAX_EVO_SPARKS; i++) {
      this.evoSparkPositions[i * 3 + 1] = -300;
      this.evoSparkColors[i * 3] = 1;
      this.evoSparkColors[i * 3 + 1] = 0.92;
      this.evoSparkColors[i * 3 + 2] = 0.55;
      this.evoSparks.push({
        active: false,
        pos: new THREE.Vector3(0, -300, 0),
        vel: new THREE.Vector3(),
        delay: 0,
        age: 0,
        life: 1.6,
        baseColor: new THREE.Color(0xffe066),
      });
    }
    const sparkGeo = new THREE.BufferGeometry();
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(this.evoSparkPositions, 3));
    sparkGeo.setAttribute('color', new THREE.BufferAttribute(this.evoSparkColors, 3));
    this.evoSparkMat = new THREE.PointsMaterial({
      map: this.sparkGlowMap,
      size: 1.55,
      transparent: true,
      opacity: 0.96,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this.evoSparkPoints = new THREE.Points(sparkGeo, this.evoSparkMat);
    this.evoSparkPoints.frustumCulled = false;
    this.evoSparkPoints.renderOrder = 6;
    this.evoExplosionGroup.add(this.evoSparkPoints);

    // 3. Three Staggered Expanding Ascension Shockwave Torus Rings
    const ringGeo = new THREE.TorusGeometry(1, 0.085, 10, 48);
    ringGeo.rotateX(Math.PI / 2);
    this.evoRings = [];
    for (let i = 0; i < 3; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: i === 0 ? 0xfff5c0 : 0xffe066,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(ringGeo, mat);
      mesh.visible = false;
      mesh.renderOrder = 5;
      this.evoExplosionGroup.add(mesh);
      this.evoRings.push({
        mesh,
        mat,
        delay: i * 0.14,
        age: 0,
        life: 1.15 + i * 0.22,
        maxRadius: 12 + i * 3.8,
        riseSpeed: 0.65 + i * 0.55,
      });
    }

    // 4. Translucent Ascension Sky Light Pillar
    const pillarGeo = new THREE.CylinderGeometry(0.45, 2.0, 34, 18, 1, true);
    pillarGeo.translate(0, 17, 0);
    this.evoPillarMat = new THREE.MeshBasicMaterial({
      color: 0xffe999,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.evoPillarMesh = new THREE.Mesh(pillarGeo, this.evoPillarMat);
    this.evoPillarMesh.visible = false;
    this.evoPillarMesh.renderOrder = 4;
    this.evoExplosionGroup.add(this.evoPillarMesh);

    // 5. Transient Dynamic Illumination Flash on Surrounding Mountain Terrain & Serpent
    this.evoFlashLight = new THREE.PointLight(0xffe699, 0, 38, 1.5);
    this.evoExplosionGroup.add(this.evoFlashLight);
  }

  /**
   * Triggers a celebratory multi-layered WebGL particle explosion at the snake's location
   * whenever a new Evolution Tier is reached (scaled up for Tier 12 Ascended Human).
   */
  public spawnEvolutionExplosion(
    x: number,
    y: number,
    z: number,
    scaleColorHex: number,
    manaColorHex: number,
    level: number,
    isHuman: boolean,
    bodyTrail?: Array<{ x: number; y: number; z: number }>,
  ): void {
    this.evoActive = true;
    this.evoAge = 0;
    this.evoDuration = isHuman ? 3.8 : 3.0;
    this.evoOrigin.set(x, y, z);
    this.evoExplosionGroup.visible = true;

    const powerScale = isHuman ? 1.45 : 0.92 + (level / 12) * 0.42;
    const palette = [
      0xfff8dc, // incandescent white-gold core
      0xffe066, // radiant ascension gold
      manaColorHex, // newly awakened magic tier color
      scaleColorHex, // newly evolved scale/form hue
    ];

    // Configure 260 faceted shards across 3 choreographed layers:
    // [0..109] Core Radial Supernova, [110..179] Equatorial Crown Ring, [180..259] Ascending Spirit Helix
    for (let i = 0; i < MAX_EVO_SHARDS; i++) {
      const p = this.evoShards[i];
      p.active = true;
      p.age = 0;
      p.spinX = (Math.random() - 0.5) * 14;
      p.spinY = (Math.random() - 0.5) * 14;

      if (i < 110) {
        // Wave 1: Spherical-hemisphere supernova explosion
        p.kind = 'core';
        const trailPt =
          bodyTrail && bodyTrail.length > 0 && i % 4 === 0
            ? bodyTrail[i % bodyTrail.length]
            : null;
        const ox = trailPt ? trailPt.x : x;
        const oy = trailPt ? trailPt.y + 0.7 : y;
        const oz = trailPt ? trailPt.z : z;
        p.pos.set(ox, oy, oz);
        p.originX = ox;
        p.originY = oy;
        p.originZ = oz;

        const theta = Math.random() * Math.PI * 2;
        const elev = -0.15 + Math.random() * 1.45;
        const speed = (6.8 + Math.random() * 11.5) * powerScale;
        const horiz = Math.cos(elev) * speed;
        p.vel.set(
          Math.cos(theta) * horiz,
          Math.sin(elev) * speed + 2.4 * powerScale,
          Math.sin(theta) * horiz,
        );
        p.delay = Math.random() * 0.08;
        p.life = 1.25 + Math.random() * 0.95;
        p.scale = (0.85 + Math.random() * 1.15) * (isHuman ? 1.2 : 1.0);
        p.color.setHex(palette[i % palette.length]);
      } else if (i < 180) {
        // Wave 2: Crisp horizontal equatorial crown burst
        p.kind = 'ring';
        const ringIdx = i - 110;
        const theta = (ringIdx / 70) * Math.PI * 2 + (Math.random() - 0.5) * 0.06;
        const speed = (10.5 + Math.random() * 4.2) * powerScale;
        p.pos.set(x + Math.cos(theta) * 0.5, y + 0.15, z + Math.sin(theta) * 0.5);
        p.originX = x;
        p.originY = y;
        p.originZ = z;
        p.vel.set(Math.cos(theta) * speed, 1.2 + Math.random() * 2.2, Math.sin(theta) * speed);
        p.delay = 0.06 + (ringIdx % 2) * 0.09;
        p.life = 1.1 + Math.random() * 0.55;
        p.scale = (0.9 + Math.random() * 0.65) * (isHuman ? 1.22 : 1.0);
        p.color.setHex(ringIdx % 2 === 0 ? 0xffe066 : manaColorHex);
      } else {
        // Wave 3: Ascending dual-helix spirit embers spiraling skyward around the evolved form
        p.kind = 'helix';
        const hIdx = i - 180;
        p.originX = x;
        p.originY = y - 0.2;
        p.originZ = z;
        p.orbitAngle = (hIdx % 2) * Math.PI + (hIdx / 80) * Math.PI * 4;
        p.orbitRadius = 0.95 + Math.random() * 2.4 * powerScale;
        p.orbitSpeed = (2.6 + Math.random() * 2.2) * (hIdx % 2 === 0 ? 1 : -1);
        p.riseSpeed = (2.8 + Math.random() * 4.4) * powerScale;
        p.delay = 0.05 + Math.random() * 0.55;
        p.life = 1.85 + Math.random() * 1.1;
        p.scale = (0.65 + Math.random() * 0.85) * (isHuman ? 1.25 : 1.0);
        p.pos.set(
          x + Math.cos(p.orbitAngle) * p.orbitRadius,
          p.originY,
          z + Math.sin(p.orbitAngle) * p.orbitRadius,
        );
        p.vel.set(0, 0, 0);
        p.color.setHex(hIdx % 3 === 0 ? 0xfff8dc : hIdx % 3 === 1 ? 0xffe066 : manaColorHex);
      }
    }

    // Configure 220 glowing additive star-spark motes
    this.evoSparkMat.size = isHuman ? 2.0 : 1.55;
    for (let i = 0; i < MAX_EVO_SPARKS; i++) {
      const sp = this.evoSparks[i];
      sp.active = true;
      sp.age = 0;
      sp.delay = Math.random() * 0.24;
      sp.life = 1.45 + Math.random() * 1.35;
      const theta = Math.random() * Math.PI * 2;
      const phi = -0.1 + Math.random() * 1.55;
      const speed = (3.4 + Math.random() * 12.0) * powerScale;
      const h = Math.cos(phi) * speed;
      sp.pos.set(
        x + (Math.random() - 0.5) * 1.4,
        y + (Math.random() - 0.5) * 0.8,
        z + (Math.random() - 0.5) * 1.4,
      );
      sp.vel.set(Math.cos(theta) * h, Math.sin(phi) * speed + 2.8 * powerScale, Math.sin(theta) * h);
      sp.baseColor.setHex(palette[i % palette.length]);
    }

    // Configure 3 staggered expanding ascension rings
    const ringColors = [0xfff6cc, manaColorHex, isHuman ? 0xffe066 : scaleColorHex];
    for (let i = 0; i < this.evoRings.length; i++) {
      const r = this.evoRings[i];
      r.age = 0;
      r.delay = i * 0.14;
      r.life = (1.1 + i * 0.22) * (isHuman ? 1.25 : 1.0);
      r.maxRadius = (11.5 + i * 3.6) * powerScale;
      r.riseSpeed = 0.65 + i * 0.65;
      r.mat.color.setHex(ringColors[i]);
      r.mat.opacity = 0;
      r.mesh.position.set(x, y + 0.15, z);
      r.mesh.scale.setScalar(0.5);
      r.mesh.visible = true;
    }

    // Configure vertical ascension sky beam
    this.evoPillarMat.color.setHex(isHuman ? 0xfff0a8 : manaColorHex);
    this.evoPillarMat.opacity = 0.55;
    this.evoPillarMesh.position.set(x, y - 0.4, z);
    this.evoPillarMesh.scale.set(1, 1, 1);
    this.evoPillarMesh.visible = true;

    // Configure dynamic local flash PointLight
    this.evoFlashLight.position.set(x, y + 2.2, z);
    this.evoFlashLight.color.setHex(isHuman ? 0xffe999 : manaColorHex);
    this.evoFlashPeak = isHuman ? 24 : 15;
    this.evoFlashLight.intensity = this.evoFlashPeak;

    // Also fire a crisp burst of solid sparks right at the origin for layered depth
    this.spawnBurst(x, y + 0.4, z, 0xffe066, isHuman ? 48 : 28);
  }

  private updateEvolutionExplosion(dt: number): void {
    if (!this.evoActive) return;
    this.evoAge += dt;

    let anyAlive = false;

    // 1. Update 260 faceted shards
    for (let i = 0; i < MAX_EVO_SHARDS; i++) {
      const p = this.evoShards[i];
      if (!p.active) continue;

      if (this.evoAge < p.delay) {
        anyAlive = true;
        _mat4.makeScale(0, 0, 0);
        this.evoShardInstanced.setMatrixAt(i, _mat4);
        continue;
      }

      p.age += dt;
      if (p.age >= p.life) {
        p.active = false;
        _mat4.makeScale(0, 0, 0);
        this.evoShardInstanced.setMatrixAt(i, _mat4);
        continue;
      }

      anyAlive = true;
      const u = p.age / p.life;

      if (p.kind === 'helix') {
        const ang = p.orbitAngle + p.age * p.orbitSpeed;
        const rad = p.orbitRadius * (1 + u * 0.95);
        p.pos.set(
          p.originX + Math.cos(ang) * rad,
          p.originY + p.age * p.riseSpeed,
          p.originZ + Math.sin(ang) * rad,
        );
      } else {
        const drag = p.kind === 'ring' ? Math.exp(-2.1 * dt) : Math.exp(-1.35 * dt);
        p.vel.x *= drag;
        p.vel.z *= drag;
        p.vel.y = p.vel.y * Math.exp(-0.9 * dt) - (p.kind === 'ring' ? 3.2 : 6.4) * dt;
        p.pos.addScaledVector(p.vel, dt);
      }

      // Snappy pop-in then silky shrink-out
      const env = u < 0.12 ? u / 0.12 : Math.pow(1 - (u - 0.12) / 0.88, 1.35);
      const s = Math.max(0.001, p.scale * env);
      _euler.set(p.age * p.spinX, p.age * p.spinY, p.age * 3.2);
      _quat.setFromEuler(_euler);
      _scale.setScalar(s);
      _mat4.compose(p.pos, _quat, _scale);
      this.evoShardInstanced.setMatrixAt(i, _mat4);
      this.evoShardInstanced.setColorAt(i, p.color);
    }
    this.evoShardInstanced.instanceMatrix.needsUpdate = true;
    if (this.evoShardInstanced.instanceColor) {
      this.evoShardInstanced.instanceColor.needsUpdate = true;
    }

    // 2. Update 220 glowing star-spark bokeh motes
    const sparkPosAttr = this.evoSparkPoints.geometry.attributes.position as THREE.BufferAttribute;
    const sparkColAttr = this.evoSparkPoints.geometry.attributes.color as THREE.BufferAttribute;
    for (let i = 0; i < MAX_EVO_SPARKS; i++) {
      const sp = this.evoSparks[i];
      const idx = i * 3;
      if (!sp.active || this.evoAge < sp.delay) {
        if (sp.active) anyAlive = true;
        this.evoSparkPositions[idx] = 0;
        this.evoSparkPositions[idx + 1] = -300;
        this.evoSparkPositions[idx + 2] = 0;
        continue;
      }
      sp.age += dt;
      if (sp.age >= sp.life) {
        sp.active = false;
        this.evoSparkPositions[idx + 1] = -300;
        continue;
      }
      anyAlive = true;
      const drag = Math.exp(-1.7 * dt);
      sp.vel.x *= drag;
      sp.vel.z *= drag;
      sp.vel.y = sp.vel.y * Math.exp(-1.1 * dt) - 2.1 * dt;
      sp.pos.addScaledVector(sp.vel, dt);

      const u = sp.age / sp.life;
      const shimmer = 0.72 + 0.28 * Math.sin(sp.age * 24 + i * 1.7);
      const brightness = Math.pow(1 - u, 1.4) * shimmer;

      this.evoSparkPositions[idx] = sp.pos.x;
      this.evoSparkPositions[idx + 1] = sp.pos.y;
      this.evoSparkPositions[idx + 2] = sp.pos.z;
      this.evoSparkColors[idx] = sp.baseColor.r * brightness;
      this.evoSparkColors[idx + 1] = sp.baseColor.g * brightness;
      this.evoSparkColors[idx + 2] = sp.baseColor.b * brightness;
    }
    sparkPosAttr.needsUpdate = true;
    sparkColAttr.needsUpdate = true;

    // 3. Update 3 staggered expanding shockwave torus rings
    for (let i = 0; i < this.evoRings.length; i++) {
      const r = this.evoRings[i];
      if (this.evoAge < r.delay) {
        r.mesh.visible = false;
        anyAlive = true;
        continue;
      }
      r.age += dt;
      if (r.age >= r.life) {
        r.mesh.visible = false;
        continue;
      }
      anyAlive = true;
      r.mesh.visible = true;
      const u = r.age / r.life;
      const easeOut = 1 - Math.pow(1 - u, 2.4);
      const radius = 0.55 + (r.maxRadius - 0.55) * easeOut;
      r.mesh.position.set(this.evoOrigin.x, this.evoOrigin.y + 0.15 + r.age * r.riseSpeed, this.evoOrigin.z);
      r.mesh.scale.set(radius, 1 + (1 - u) * 0.6, radius);
      r.mat.opacity = Math.pow(1 - u, 1.6) * 0.92;
    }

    // 4. Update Ascension Sky Light Pillar
    const pillarLife = 1.45;
    if (this.evoAge < pillarLife) {
      anyAlive = true;
      const pu = this.evoAge / pillarLife;
      const widthPulse = pu < 0.18 ? 0.4 + (pu / 0.18) * 1.35 : 1.75 * (1 - (pu - 0.18) / 0.82);
      this.evoPillarMesh.visible = true;
      this.evoPillarMesh.scale.set(Math.max(0.05, widthPulse), 1 + pu * 0.35, Math.max(0.05, widthPulse));
      this.evoPillarMesh.rotation.y += dt * 1.8;
      this.evoPillarMat.opacity = Math.pow(1 - pu, 1.45) * 0.52;
    } else {
      this.evoPillarMesh.visible = false;
    }

    // 5. Update Dynamic Local PointLight Flash
    const flashLife = 1.15;
    if (this.evoAge < flashLife) {
      anyAlive = true;
      const fu = this.evoAge / flashLife;
      this.evoFlashLight.intensity = this.evoFlashPeak * Math.pow(1 - fu, 2.1);
    } else {
      this.evoFlashLight.intensity = 0;
    }

    if (!anyAlive || this.evoAge >= this.evoDuration) {
      this.evoActive = false;
      this.evoExplosionGroup.visible = false;
      this.evoFlashLight.intensity = 0;
    }
  }

  public triggerShake(amount: number): void {
    this.shakeIntensity = Math.min(1.4, Math.max(this.shakeIntensity, amount));
  }

  /**
   * Fires multi-DOF procedural weapon recoil (muzzle climb pitch, rifling torque twist,
   * axial blowback, short-recoil barrel tilt, reciprocating slide, skeletonized hammer snap,
   * and trigger squeeze) paired with 2D screen-space camera projection shake, roll punch,
   * FOV kick, and ballistic shockwave shader pulse.
   */
  public triggerGunRecoil(strength = 1.0): void {
    const s = Math.max(0.4, Math.min(1.8, strength));
    this.gunShotParity = -this.gunShotParity;
    const parity = this.gunShotParity;

    // 1. Multi-DOF Procedural Weapon Model Spring-Damper Impulses
    this.gunRecoil = Math.min(1.65, this.gunRecoil + 0.85 * s);
    this.gunRecoilVel = Math.min(18, this.gunRecoilVel + 7.6 * s);
    this.gunTwist = Math.max(-1.2, Math.min(1.2, this.gunTwist + parity * 0.62 * s));
    this.gunTwistVel = Math.max(-14, Math.min(14, this.gunTwistVel + parity * 5.8 * s));
    this.gunBlowback = Math.min(1.4, this.gunBlowback + 0.92 * s);
    this.gunBlowbackVel = Math.min(16, this.gunBlowbackVel + 6.4 * s);
    this.gunSlideKick = 1.0;
    this.gunHammerKick = 1.0;
    this.gunTriggerPull = 1.0;
    this.gunFlashTimer = 0.078;

    // 2. 2D Screen-Space Camera Projection Shake, Roll, FOV Punch & Shader Concussion Pulse
    this.gunCamKick = Math.min(0.75, this.gunCamKick + 0.38 * s);
    this.gunScreenShakeY = Math.min(0.055, this.gunScreenShakeY + 0.022 * s);
    this.gunScreenShakeVelY = Math.min(0.85, this.gunScreenShakeVelY + 0.36 * s);
    this.gunScreenShakeX = Math.max(-0.04, Math.min(0.04, this.gunScreenShakeX + parity * 0.014 * s));
    this.gunScreenShakeVelX = Math.max(-0.65, Math.min(0.65, this.gunScreenShakeVelX + parity * 0.24 * s));
    this.gunScreenRoll = Math.max(-0.045, Math.min(0.045, this.gunScreenRoll + parity * 0.018 * s));
    this.gunScreenRollVel = Math.max(-0.7, Math.min(0.7, this.gunScreenRollVel + parity * 0.28 * s));
    this.gunScreenFovKick = Math.min(2.8, this.gunScreenFovKick + 1.55 * s);
    this.gunScreenPulse = Math.min(1.0, this.gunScreenPulse + 0.85 * s);
    this.triggerShake(0.32 * s);

    const rig = this.ascensionRig;
    rig.gunMuzzleFlash.rotation.z = Math.random() * Math.PI * 2;
    if (rig.group.visible && rig.gunGroup.visible) {
      rig.group.updateMatrixWorld(true);
      rig.gunMuzzleAnchor.getWorldPosition(_vec3A);
      this.spawnBurst(_vec3A.x, _vec3A.y, _vec3A.z, 0xffd166, 14);
      this.spawnBurst(_vec3A.x, _vec3A.y, _vec3A.z, 0xcbd5e1, 6);

      rig.gunEjectAnchor.getWorldPosition(_vec3B);
      this.spawnBurst(_vec3B.x, _vec3B.y, _vec3B.z, 0xfbbf24, 5);
    }
  }

  /**
   * Returns current world-space coordinates of the half-human hand cannon muzzle when equipped.
   */
  public getGunMuzzleWorldPosition(): { x: number; y: number; z: number } | null {
    const rig = this.ascensionRig;
    if (!rig.group.visible || !rig.gunGroup.visible) return null;
    rig.group.updateMatrixWorld(true);
    rig.gunMuzzleAnchor.getWorldPosition(_vec3A);
    return { x: _vec3A.x, y: _vec3A.y, z: _vec3A.z };
  }

  private initWeatherSystem(): void {
    // 1. Drifting Mountain Mist & Dense Fog Billows (soft translucent sprites hugging terrain)
    const mistCount = this.isSoftwareGl ? 84 : 168;
    this.mistPositions = new Float32Array(mistCount * 3);
    this.mistParticles = [];

    for (let i = 0; i < mistCount; i++) {
      const ang = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * 64;
      const x = Math.cos(ang) * r;
      const z = Math.sin(ang) * r;
      const yOffset = 1.6 + Math.random() * 8.5;
      this.mistParticles.push({
        x,
        z,
        yOffset,
        driftX: 1.0 + Math.random() * 1.4,
        driftZ: (Math.random() - 0.5) * 0.9,
        phase: Math.random() * Math.PI * 2,
      });
      this.mistPositions[i * 3] = x;
      this.mistPositions[i * 3 + 1] = terrainHeightAt(x, z, this.biome) + yOffset;
      this.mistPositions[i * 3 + 2] = z;
    }

    const mistGeo = new THREE.BufferGeometry();
    mistGeo.setAttribute('position', new THREE.BufferAttribute(this.mistPositions, 3));
    this.mistMat = new THREE.PointsMaterial({
      map: this.mistTexture,
      color: 0xdcebf7,
      size: 17,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this.mistPoints = new THREE.Points(mistGeo, this.mistMat);
    this.mistPoints.frustumCulled = false;
    this.mistPoints.renderOrder = 2;
    this.weatherGroup.add(this.mistPoints);

    // 2. Slanted Wind-Blown Mountain Rain Streaks
    const rainCount = this.isSoftwareGl ? 220 : 520;
    this.rainPositions = new Float32Array(rainCount * 6); // 2 vertices per streak
    this.rainDrops = [];
    for (let i = 0; i < rainCount; i++) {
      const rx = (Math.random() - 0.5) * 58;
      const ry = Math.random() * 32;
      const rz = (Math.random() - 0.5) * 58;
      this.rainDrops.push({
        x: rx,
        y: ry,
        z: rz,
        speed: 25 + Math.random() * 11,
        len: 1.05 + Math.random() * 0.65,
      });
    }
    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute('position', new THREE.BufferAttribute(this.rainPositions, 3));
    this.rainMat = new THREE.LineBasicMaterial({
      color: 0xd4ecff,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
    });
    this.rainLines = new THREE.LineSegments(rainGeo, this.rainMat);
    this.rainLines.frustumCulled = false;
    this.rainLines.visible = false;
    this.rainLines.renderOrder = 3;
    this.weatherGroup.add(this.rainLines);

    // 3. Pooled Terrain-Aligned Rain Splash Rings
    const splashCount = this.isSoftwareGl ? 24 : 48;
    const splashGeo = new THREE.RingGeometry(0.14, 0.26, 12);
    splashGeo.rotateX(-Math.PI / 2);
    this.splashMat = new THREE.MeshBasicMaterial({
      color: 0xd9f0ff,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.splashInstanced = new THREE.InstancedMesh(splashGeo, this.splashMat, splashCount);
    this.splashInstanced.frustumCulled = false;
    this.splashInstanced.visible = false;
    this.splashInstanced.renderOrder = 3;

    this.rainSplashes = [];
    for (let i = 0; i < splashCount; i++) {
      this.rainSplashes.push({
        active: false,
        x: 0,
        y: -200,
        z: 0,
        nx: 0,
        ny: 1,
        nz: 0,
        age: 0,
        life: 0.28,
        maxScale: 1.1,
      });
      _mat4.makeScale(0, 0, 0);
      this.splashInstanced.setMatrixAt(i, _mat4);
    }
    this.splashInstanced.instanceMatrix.needsUpdate = true;
    this.weatherGroup.add(this.splashInstanced);

    // 4. GPU-Driven Dynamic Climate Particle System (ShaderMaterial: snow, embers/ash, storm sparks, mist)
    const climateCount = this.isSoftwareGl ? 360 : 820;
    const climatePos = new Float32Array(climateCount * 3);
    const climateSeeds = new Float32Array(climateCount * 4);
    for (let i = 0; i < climateCount; i++) {
      climatePos[i * 3] = (Math.random() - 0.5) * 64;
      climatePos[i * 3 + 1] = Math.random() * 30;
      climatePos[i * 3 + 2] = (Math.random() - 0.5) * 64;

      climateSeeds[i * 4] = Math.random() * Math.PI * 2; // phase
      climateSeeds[i * 4 + 1] = 0.65 + Math.random() * 0.85; // speed scale
      climateSeeds[i * 4 + 2] = 0.6 + Math.random() * 1.15; // size scale
      climateSeeds[i * 4 + 3] = Math.random(); // color mix
    }
    const climateGeo = new THREE.BufferGeometry();
    climateGeo.setAttribute('position', new THREE.BufferAttribute(climatePos, 3));
    climateGeo.setAttribute('aSeed', new THREE.BufferAttribute(climateSeeds, 4));

    this.climateParticleMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uFocus: { value: new THREE.Vector3(0, 8, 0) },
        uWind: { value: new THREE.Vector3(1.5, -0.4, 0.5) },
        uSize: { value: 3.0 },
        uOpacity: { value: 0.4 },
        uColorA: { value: new THREE.Color(0xdceeff) },
        uColorB: { value: new THREE.Color(0x9fc4de) },
        uStyle: { value: 0.0 },
        uPixelRatio: { value: this.renderer.getPixelRatio() },
      },
      vertexShader: `
        attribute vec4 aSeed;
        uniform float uTime;
        uniform vec3 uFocus;
        uniform vec3 uWind;
        uniform float uSize;
        uniform float uStyle;
        uniform float uPixelRatio;

        varying float vMix;
        varying float vAlpha;
        varying float vPhase;
        varying float vStyle;

        void main() {
          vec3 box = vec3(64.0, 30.0, 64.0);
          float phase = aSeed.x;
          float spd = aSeed.y;
          float sizeMul = aSeed.z;

          vec3 drift = uWind * (uTime * spd);
          float swirlAmp = mix(0.85, 2.6, clamp(uStyle, 0.0, 1.0));
          drift.x += sin(uTime * 1.35 + phase) * swirlAmp;
          drift.z += cos(uTime * 1.1 + phase * 1.3) * swirlAmp;
          drift.y += sin(uTime * 0.9 + phase * 0.7) * 0.7;

          vec3 rel = mod(position + drift - uFocus + box * 0.5, box) - box * 0.5;
          vec3 worldPos = uFocus + rel;

          vec4 mvPos = modelViewMatrix * vec4(worldPos, 1.0);
          gl_Position = projectionMatrix * mvPos;

          float radial = length(rel.xz) / 32.0;
          float edgeFade = 1.0 - smoothstep(0.68, 1.0, radial);
          float vertFade = smoothstep(-15.0, -9.0, rel.y) * (1.0 - smoothstep(10.0, 15.0, rel.y));
          vAlpha = edgeFade * vertFade;
          vMix = aSeed.w;
          vPhase = phase + uTime * (1.8 + spd);
          vStyle = uStyle;

          float depthScale = 235.0 / max(2.0, -mvPos.z);
          gl_PointSize = clamp(uSize * sizeMul * uPixelRatio * depthScale * 0.14, 1.5, 26.0);
        }
      `,
      fragmentShader: `
        uniform float uOpacity;
        uniform vec3 uColorA;
        uniform vec3 uColorB;

        varying float vMix;
        varying float vAlpha;
        varying float vPhase;
        varying float vStyle;

        void main() {
          vec2 uv = gl_PointCoord - vec2(0.5);
          float d = length(uv);
          if (d > 0.5) discard;

          vec3 col = mix(uColorA, uColorB, vMix);
          float shape = smoothstep(0.5, 0.05, d);

          if (vStyle > 0.5 && vStyle < 1.5) {
            // Blizzard crystalline 6-point snowflake
            float ang = atan(uv.y, uv.x) + vPhase * 0.35;
            float arms = pow(abs(cos(ang * 3.0)), 3.0);
            float crystal = smoothstep(0.5, 0.08, d) * (0.55 + 0.45 * arms);
            float core = smoothstep(0.22, 0.0, d);
            shape = clamp(crystal + core * 0.65, 0.0, 1.0);
          } else if (vStyle >= 1.5 && vStyle < 2.5) {
            // Volcanic ash & glowing embers (hot flicker on embers, smoky soot on ash)
            float emberFlag = step(0.42, vMix);
            float flicker = 0.65 + 0.35 * sin(vPhase * 3.8);
            vec3 emberCol = mix(vec3(1.0, 0.32, 0.08), vec3(1.0, 0.88, 0.42), flicker);
            vec3 ashCol = vec3(0.2, 0.16, 0.15);
            col = mix(emberCol, ashCol, emberFlag);
            shape = mix(smoothstep(0.46, 0.02, d) * (0.75 + 0.25 * flicker), smoothstep(0.48, 0.14, d) * 0.82, emberFlag);
          } else if (vStyle >= 2.5) {
            // Storm wind-driven spray / electric glint
            float stretch = length(vec2(uv.x * 1.9, uv.y * 0.7));
            shape = smoothstep(0.5, 0.04, stretch);
          }

          float alpha = shape * vAlpha * uOpacity;
          if (alpha < 0.01) discard;
          gl_FragColor = vec4(col, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });

    this.climateParticles = new THREE.Points(climateGeo, this.climateParticleMat);
    this.climateParticles.frustumCulled = false;
    this.climateParticles.renderOrder = 4;
    this.weatherGroup.add(this.climateParticles);

    // 5. Fullscreen Three.js ShaderMaterial Atmospheric Climate Overlay
    this.overlayScene = new THREE.Scene();
    this.overlayCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const w = this.container.clientWidth || window.innerWidth;
    const h = Math.max(1, this.container.clientHeight || window.innerHeight);

    this.weatherOverlayMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uAspect: { value: w / h },
        uMistAmt: { value: 0 },
        uFogAmt: { value: 0 },
        uRainAmt: { value: 0 },
        uStormAmt: { value: 0 },
        uBlizzardAmt: { value: 0 },
        uAshAmt: { value: 0 },
        uLightning: { value: 0 },
        uShiftPulse: { value: 0 },
        uTint: { value: new THREE.Color(0x9ec0d9) },
        uSoulPulse: { value: 0 },
        uSoulPhase: { value: 0 },
        uSoulPower: { value: 0 },
        uDroplets: { value: this.screenDropletUniforms },
        uRainVfx: { value: 0 },
        uFrostLevel: { value: 0 },
        uFrostPulse: { value: 0 },
        uFrostBiasX: { value: 0 },
        uCondensation: { value: 0 },
        uAshCinderPulse: { value: 0 },
        uAshBiasX: { value: 0 },
        uGunRecoilPulse: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uAspect;
        uniform float uMistAmt;
        uniform float uFogAmt;
        uniform float uRainAmt;
        uniform float uStormAmt;
        uniform float uBlizzardAmt;
        uniform float uAshAmt;
        uniform float uLightning;
        uniform float uShiftPulse;
        uniform vec3 uTint;
        uniform float uSoulPulse;
        uniform float uSoulPhase;
        uniform float uSoulPower;
        uniform vec4 uDroplets[12];
        uniform float uRainVfx;
        uniform float uFrostLevel;
        uniform float uFrostPulse;
        uniform float uFrostBiasX;
        uniform float uCondensation;
        uniform float uAshCinderPulse;
        uniform float uAshBiasX;
        uniform float uGunRecoilPulse;

        varying vec2 vUv;

        float hash21(vec2 p) {
          p = fract(p * vec2(123.34, 456.21));
          p += dot(p, p + 45.32);
          return fract(p.x * p.y);
        }

        float vnoise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          float a = hash21(i);
          float b = hash21(i + vec2(1.0, 0.0));
          float c = hash21(i + vec2(0.0, 1.0));
          float d = hash21(i + vec2(1.0, 1.0));
          return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
        }

        float fbm(vec2 p) {
          float v = 0.0;
          v += 0.55 * vnoise(p);
          v += 0.30 * vnoise(p * 2.07 + vec2(1.7, 9.2));
          v += 0.15 * vnoise(p * 4.13 + vec2(8.3, 2.8));
          return v;
        }

        void main() {
          vec2 centered = (vUv - 0.5) * vec2(uAspect, 1.0);
          float rad = length(centered);
          float edge = smoothstep(0.36, 0.96, rad);
          float outerEdge = smoothstep(0.52, 1.06, rad);

          vec3 col = vec3(0.0);
          float alpha = 0.0;

          // 1. Mist & Dense Fog creeping perimeter veil
          float fogWeight = uMistAmt * 0.42 + uFogAmt;
          if (fogWeight > 0.005) {
            float wisp = fbm(vec2(vUv.x * 3.2 * uAspect + uTime * 0.08, vUv.y * 2.8 - uTime * 0.03));
            float topFog = smoothstep(0.45, 1.0, vUv.y) * 0.45;
            float fogMask = clamp((edge * 0.85 + topFog) * (0.55 + 0.65 * wisp), 0.0, 1.0) * fogWeight * 0.52;
            col = mix(col, mix(vec3(0.78, 0.86, 0.91), uTint, 0.45), clamp(fogMask / max(0.001, alpha + fogMask), 0.0, 1.0));
            alpha += fogMask;
          }

          // 2. Rain & Thunder Tempest diagonal rain-sheen + storm gloom + lightning flash
          float wetWeight = max(uRainAmt, uStormAmt);
          if (wetWeight > 0.005) {
            vec2 rainUv = vec2(vUv.x * uAspect * 14.0 + vUv.y * 4.5, vUv.y * 4.0 + uTime * (2.8 + uStormAmt * 2.2));
            float streak = pow(vnoise(rainUv), 4.0);
            float rainMask = streak * (0.12 + edge * 0.24) * (uRainAmt * 0.55 + uStormAmt * 0.9);
            float gloom = outerEdge * uStormAmt * 0.34;
            col += vec3(0.55, 0.78, 0.96) * rainMask + vec3(0.05, 0.10, 0.18) * gloom;
            alpha += rainMask * 0.75 + gloom;
          }

          // 3. Whiteout Blizzard crystalline frost vignette + howling horizontal squall bands
          if (uBlizzardAmt > 0.005) {
            float frostNoise = fbm(vec2(vUv.x * 7.5 * uAspect, vUv.y * 7.5));
            float frostRim = smoothstep(0.42, 0.98, rad + (frostNoise - 0.5) * 0.32) * uBlizzardAmt;
            float squall = fbm(vec2(vUv.x * 2.6 * uAspect + uTime * 1.85, vUv.y * 8.5 + uTime * 0.55));
            float squallMask = smoothstep(0.48, 0.9, squall) * (0.14 + edge * 0.26) * uBlizzardAmt;
            float bAlpha = frostRim * 0.52 + squallMask * 0.45;
            vec3 iceCol = mix(vec3(0.76, 0.91, 1.0), vec3(0.95, 0.99, 1.0), squall);
            col += iceCol * bAlpha;
            alpha += bAlpha;
          }

          // 4. Volcanic Ash Storm scorching soot vignette + fiery rising ember shimmer
          if (uAshAmt > 0.005) {
            float smoke = fbm(vec2(vUv.x * 3.4 * uAspect - uTime * 0.38, vUv.y * 3.4 - uTime * 0.28));
            float sootRim = edge * (0.55 + 0.55 * smoke) * uAshAmt * 0.58;
            float emberGlow = pow(vnoise(vec2(vUv.x * 16.0 * uAspect - uTime * 1.4, vUv.y * 12.0 - uTime * 2.2)), 6.0) * uAshAmt;
            vec3 ashCol = mix(vec3(0.16, 0.07, 0.05), vec3(1.0, 0.36, 0.08), clamp(smoke * 0.75, 0.0, 1.0));
            col += ashCol * sootRim + vec3(1.0, 0.58, 0.18) * emberGlow * 0.85;
            alpha += sootRim + emberGlow * 0.55;
          }

          // 5. Storm Lightning Flash
          if (uLightning > 0.005) {
            float skyBias = mix(0.45, 1.0, vUv.y);
            float flashAmt = uLightning * skyBias * 0.42;
            col += vec3(0.82, 0.92, 1.0) * flashAmt;
            alpha += flashAmt;
          }

          // 6. Climate Shift Atmospheric Front Sweep (visual feedback whenever climate changes)
          if (uShiftPulse > 0.005) {
            float wavePos = 1.15 - uShiftPulse * 1.3;
            float band = exp(-pow((vUv.y - wavePos) * 5.2, 2.0)) * uShiftPulse;
            float rimPulse = edge * uShiftPulse * 0.24;
            float pulseAmt = band * 0.26 + rimPulse;
            col += uTint * pulseAmt;
            alpha += pulseAmt;
          }

          // 6b. Audio-Synced Screen-Space Raindrop Splashes & Gravity Trickle Beads
          if (uRainVfx > 0.004) {
            float dropLight = 0.0;
            float dropAlpha = 0.0;
            for (int i = 0; i < 12; i++) {
              vec4 d = uDroplets[i];
              if (d.w <= 0.002) continue;
              vec2 dp = (vUv - d.xy) * vec2(uAspect, 1.0);
              float r = d.z;
              // Teardrop bead body
              float beadDist = length(vec2(dp.x, dp.y * 0.78));
              float beadMask = smoothstep(r, r * 0.42, beadDist);
              float rimRing = smoothstep(r * 1.15, r * 0.85, beadDist) * smoothstep(r * 0.55, r * 0.82, beadDist);
              // Upper-left crisp specular glint on water bead
              float specDist = length(dp - vec2(-r * 0.28, r * 0.30));
              float spec = smoothstep(r * 0.42, 0.0, specDist);
              // Initial contact splash ring right as the raindrop hits the lens
              float splashRing = 0.0;
              if (d.w > 0.70) {
                float sp = (1.0 - d.w) / 0.30;
                float sRad = r * (0.95 + sp * 2.35);
                splashRing = exp(-pow((length(dp) - sRad) / max(0.003, r * 0.26), 2.0)) * (1.0 - sp) * 0.85;
              }
              // Delicate trailing wet trickle above sliding droplet
              float trailMask = 0.0;
              if (dp.y > 0.0 && dp.y < r * 3.6) {
                float ty = dp.y / (r * 3.6);
                float tWidth = r * mix(0.45, 0.08, ty);
                trailMask = smoothstep(tWidth, 0.0, abs(dp.x)) * (1.0 - ty) * 0.38;
              }
              float lifeFade = smoothstep(0.0, 0.28, d.w);
              float wScale = lifeFade * (0.45 + 0.55 * uRainVfx);
              dropLight += (spec * 0.92 + rimRing * 0.42 + splashRing * 0.78 + trailMask * 0.35) * wScale;
              dropAlpha += (beadMask * 0.16 + rimRing * 0.24 + spec * 0.36 + splashRing * 0.34 + trailMask * 0.16) * wScale;
            }
            if (dropAlpha > 0.002) {
              vec3 waterCol = mix(vec3(0.68, 0.86, 0.98), vec3(0.94, 0.99, 1.0), clamp(dropLight, 0.0, 1.0));
              col += waterCol * min(0.85, dropAlpha + dropLight * 0.35);
              alpha += min(0.42, dropAlpha);
            }
          }

          // 6d. Subtle Mist / Fog Corner Lens Condensation
          if (uCondensation > 0.004) {
            float dewNoise = fbm(vec2(vUv.x * 5.2 * uAspect + uTime * 0.04, vUv.y * 5.2));
            float dewMask = outerEdge * (0.5 + 0.5 * dewNoise) * uCondensation * 0.22;
            col += vec3(0.84, 0.92, 0.96) * dewMask;
            alpha += dewMask;
          }

          // 6e. Volcanic Ash Audio-Synced Cinder Sparks & Scorching Rim Pulse
          if (uAshCinderPulse > 0.004) {
            float sideHeat = clamp(0.65 + (vUv.x - 0.5) * uAshBiasX * 1.4, 0.2, 1.35);
            float cinder = pow(vnoise(vec2(vUv.x * 22.0 * uAspect - uTime * 1.9, vUv.y * 16.0 - uTime * 3.1)), 7.0);
            float heatRim = outerEdge * sideHeat * uAshCinderPulse * 0.24;
            float sparkAmt = cinder * (0.35 + edge * 0.65) * sideHeat * uAshCinderPulse * 0.65;
            col += vec3(1.0, 0.42, 0.12) * heatRim + vec3(1.0, 0.78, 0.34) * sparkAmt;
            alpha += heatRim * 0.65 + sparkAmt * 0.55;
          }

          // 7. Soul Clan Skill Temporary Purple Screen-Space Distortion & Arcane Ripple Wave
          if (uSoulPulse > 0.004) {
            float ang = atan(centered.y, centered.x);
            float waveRad = mix(0.06, 1.12, uSoulPhase);
            float ringDist = abs(rad - waveRad);
            float shockRing = exp(-pow(ringDist * 11.5, 2.0));
            // Swirling screen-space void warp & concentric purple interference ripples
            vec2 warpUv = vec2(ang * 2.2 + rad * 4.5 - uTime * 3.8, rad * 6.5 - uSoulPhase * 5.0);
            float vortexNoise = fbm(warpUv);
            float ripple = 0.5 + 0.5 * sin((rad - waveRad) * 38.0 + vortexNoise * 5.2 - uTime * 15.0);
            // Prismatic chromatic split bands around the expanding shock ring
            float chromaOuter = exp(-pow(abs(rad - (waveRad + 0.032)) * 18.0, 2.0));
            float chromaInner = exp(-pow(abs(rad - max(0.0, waveRad - 0.028)) * 18.0, 2.0));
            float soulVignette = smoothstep(0.28, 1.02, rad + (vortexNoise - 0.5) * 0.22);

            float power = uSoulPulse * (0.55 + 0.45 * uSoulPower);
            float ringStrength = shockRing * (0.45 + 0.55 * ripple) * power * 0.72;
            float vigStrength = soulVignette * (0.42 + 0.58 * vortexNoise) * power * 0.54;

            vec3 deepViolet = vec3(0.42, 0.14, 0.85);
            vec3 brightOrchid = vec3(0.86, 0.34, 1.0);
            vec3 coreLavender = vec3(0.95, 0.76, 1.0);

            vec3 soulCol =
              deepViolet * (vigStrength + chromaOuter * power * 0.38) +
              brightOrchid * (ringStrength + chromaInner * power * 0.34) +
              coreLavender * (shockRing * ripple * power * 0.28);

            float soulAlpha = ringStrength * 0.82 + vigStrength * 0.78 + (chromaOuter + chromaInner) * power * 0.22;
            col += soulCol;
            alpha += soulAlpha;
          }

          // 8. Half-Human Hand Cannon Screen-Space Ballistic Concussion Ring & Muzzle Perimeter Flash
          if (uGunRecoilPulse > 0.004) {
            float shockRad = mix(0.18, 0.92, 1.0 - uGunRecoilPulse);
            float shockBand = exp(-pow((rad - shockRad) * 16.0, 2.0)) * uGunRecoilPulse;
            float muzzleRim = outerEdge * uGunRecoilPulse * 0.34;
            vec3 brassFlash = vec3(1.0, 0.76, 0.32);
            vec3 hotCore = vec3(1.0, 0.94, 0.78);
            col += brassFlash * muzzleRim + hotCore * shockBand * 0.52;
            alpha += muzzleRim * 0.75 + shockBand * 0.38;
          }

          alpha = clamp(alpha, 0.0, 0.76);
          if (alpha < 0.004) discard;
          gl_FragColor = vec4(col / max(0.25, alpha + 0.35), alpha);
        }
      `,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });

    const overlayGeo = new THREE.PlaneGeometry(2, 2);
    this.weatherOverlayMesh = new THREE.Mesh(overlayGeo, this.weatherOverlayMat);
    this.weatherOverlayMesh.frustumCulled = false;
    this.overlayScene.add(this.weatherOverlayMesh);

    // 6. Dedicated Shader-Based Screen Frost Edge-Blur Overlay (frosted-glass blur + progressive rime opacity)
    this.frostOverlayScene = new THREE.Scene();
    this.frostOverlayMat = new THREE.ShaderMaterial({
      uniforms: {
        tScene: { value: null },
        uHasSceneTex: { value: 0 },
        uTime: { value: 0 },
        uAspect: { value: w / h },
        uTexelSize: { value: new THREE.Vector2(1 / Math.max(1, w), 1 / Math.max(1, h)) },
        uFrostIntensity: { value: 0 },
        uFrostOpacity: { value: 0 },
        uFrostBlurPx: { value: 0 },
        uFrostReach: { value: 0.14 },
        uFrostPulse: { value: 0 },
        uFrostBiasX: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tScene;
        uniform float uHasSceneTex;
        uniform float uTime;
        uniform float uAspect;
        uniform vec2 uTexelSize;
        uniform float uFrostIntensity;
        uniform float uFrostOpacity;
        uniform float uFrostBlurPx;
        uniform float uFrostReach;
        uniform float uFrostPulse;
        uniform float uFrostBiasX;

        varying vec2 vUv;

        float fHash21(vec2 p) {
          p = fract(p * vec2(127.1, 311.7));
          p += dot(p, p + 34.23);
          return fract(p.x * p.y);
        }

        float fNoise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(fHash21(i), fHash21(i + vec2(1.0, 0.0)), u.x),
            mix(fHash21(i + vec2(0.0, 1.0)), fHash21(i + vec2(1.0, 1.0)), u.x),
            u.y
          );
        }

        // Anisotropic crystalline ice-fern veins & faceted frost shards
        float iceCrystalField(vec2 uv) {
          vec2 a = vec2(uv.x * 0.80 - uv.y * 0.60, uv.x * 0.60 + uv.y * 0.80);
          vec2 b = vec2(uv.x * 0.56 + uv.y * 0.83, -uv.x * 0.83 + uv.y * 0.56);
          float n1 = 1.0 - abs(fNoise(a * 11.5) * 2.0 - 1.0);
          float n2 = 1.0 - abs(fNoise(b * 21.0 + vec2(4.2, 8.7)) * 2.0 - 1.0);
          float n3 = fNoise(uv * 34.0 - vec2(1.9, 5.3));
          return clamp(n1 * 0.48 + n2 * 0.36 + n3 * 0.16, 0.0, 1.0);
        }

        void main() {
          if (uFrostIntensity <= 0.003) discard;

          vec2 fUv = vUv * vec2(uAspect, 1.0);
          float crystals = iceCrystalField(fUv);
          float coarse = fNoise(fUv * 5.2 + vec2(0.6, 2.1));

          // Elliptical + corner-weighted distance from viewport center so frost frames the screen naturally
          vec2 p = vUv - 0.5;
          float boxEdge = max(abs(p.x) * 1.12, abs(p.y) * 1.08);
          float radEdge = length(vec2(p.x * 1.06, p.y * 1.04));
          float edgeDist = mix(radEdge, boxEdge, 0.55);

          // Stereo-panned blizzard gust biases frost slightly toward the windward edge
          float windBias = 1.0 + clamp(p.x * uFrostBiasX * 1.5, -0.28, 0.55) * uFrostPulse;

          // Progressive inward frost creep controlled by uFrostReach (0.14 -> 0.50)
          float innerStart = clamp(0.66 - uFrostReach * 0.78, 0.24, 0.58);
          float jagged = (crystals - 0.45) * 0.19 + (coarse - 0.5) * 0.12;
          float frostMask = smoothstep(innerStart, 0.74, edgeDist + jagged) * windBias;
          frostMask = clamp(frostMask * (0.72 + 0.48 * crystals), 0.0, 1.0);

          if (frostMask <= 0.004) discard;

          // Subtle cold rim tint & sparkling specular ice needles
          float veinSpark = pow(crystals, 4.2) * (0.45 + 0.55 * sin(uTime * 3.1 + fUv.x * 12.0 + fUv.y * 9.0));
          float gustGlint = veinSpark * (0.4 + 0.6 * uFrostPulse);
          vec3 iceRimeCol = mix(vec3(0.72, 0.89, 0.99), vec3(0.95, 0.99, 1.0), clamp(crystals * 0.85 + gustGlint * 0.45, 0.0, 1.0));
          vec3 glacialEdgeTint = vec3(0.56, 0.80, 0.96);

          if (uHasSceneTex > 0.5) {
            // Compute crystal refraction gradient + 12-tap Vogel-disk frosted-glass edge blur
            float eps = 0.004;
            float cx = iceCrystalField(fUv + vec2(eps, 0.0)) - crystals;
            float cy = iceCrystalField(fUv + vec2(0.0, eps)) - crystals;
            vec2 refractOffset = vec2(cx, cy) * (0.016 * frostMask * (0.4 + 0.6 * uFrostIntensity));
            vec2 blurStep = uTexelSize * uFrostBlurPx * frostMask;

            vec3 blurred = vec3(0.0);
            float totalW = 0.0;
            // Golden-angle Vogel spiral taps for smooth, artifact-free frosted glass diffusion
            const float GOLDEN_ANGLE = 2.39996323;
            for (int i = 0; i < 12; i++) {
              float fi = float(i);
              float r = sqrt((fi + 0.5) / 12.0);
              float theta = fi * GOLDEN_ANGLE + coarse * 6.2831;
              vec2 tapUv = clamp(vUv + refractOffset + vec2(cos(theta), sin(theta)) * r * blurStep, vec2(0.002), vec2(0.998));
              float w = 1.0 - r * 0.35;
              blurred += texture2D(tScene, tapUv).rgb * w;
              totalW += w;
            }
            blurred /= max(0.001, totalW);

            // Desaturate and chill the blurred background through frosted ice
            float lum = dot(blurred, vec3(0.299, 0.587, 0.114));
            vec3 chilledScene = mix(blurred, vec3(lum) * glacialEdgeTint * 1.18, 0.32 * uFrostIntensity);

            // Blend progressively opaque crystalline ice rime over the frosted blurred edge
            float rimeBlend = clamp(uFrostOpacity * (0.36 + 0.64 * crystals) * frostMask, 0.0, 0.86);
            vec3 finalRgb = mix(chilledScene, iceRimeCol, rimeBlend) + vec3(0.92, 0.98, 1.0) * gustGlint * frostMask * 0.28;

            // Smooth alpha transition so the blurred glass fades seamlessly into the crisp central scene
            float edgeAlpha = clamp(smoothstep(0.0, 0.32, frostMask) * (0.38 + 0.62 * uFrostIntensity), 0.0, 0.96);
            gl_FragColor = vec4(finalRgb, edgeAlpha);
          } else {
            // Software WebGL fallback: clean procedural milky frosted glass + crystalline rime
            float milkyAlpha = clamp(frostMask * uFrostOpacity * (0.62 + 0.48 * crystals), 0.0, 0.72);
            vec3 finalRgb = mix(glacialEdgeTint, iceRimeCol, clamp(crystals + gustGlint * 0.4, 0.0, 1.0));
            gl_FragColor = vec4(finalRgb, milkyAlpha);
          }
        }
      `,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });

    const frostGeo = new THREE.PlaneGeometry(2, 2);
    this.frostOverlayMesh = new THREE.Mesh(frostGeo, this.frostOverlayMat);
    this.frostOverlayMesh.frustumCulled = false;
    this.frostOverlayScene.add(this.frostOverlayMesh);
  }

  private ensureFrostFrameTexture(): THREE.FramebufferTexture {
    this.renderer.getDrawingBufferSize(this.frostSizeScratch);
    const w = Math.max(1, Math.floor(this.frostSizeScratch.x));
    const h = Math.max(1, Math.floor(this.frostSizeScratch.y));
    if (!this.frostFrameTexture || this.frostBufferSize.x !== w || this.frostBufferSize.y !== h) {
      this.frostFrameTexture?.dispose();
      const tex = new THREE.FramebufferTexture(w, h);
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.generateMipmaps = false;
      this.frostFrameTexture = tex;
      this.frostBufferSize.set(w, h);
      (this.frostOverlayMat.uniforms.uTexelSize.value as THREE.Vector2).set(1 / w, 1 / h);
    }
    return this.frostFrameTexture;
  }

  public setWeather(weather: WeatherMode): void {
    if (this.weather === weather) return;
    this.weather = weather;
    this.weatherShiftPulse = 1.0;
    if (weather === 'rain' || weather === 'storm') {
      // Begin near an active shower/tempest peak so rainfall is immediately visible on transition
      this.rainCyclePhase = Math.PI * 0.42;
    }
    if (weather === 'storm') {
      this.lightningFlash = 0.85;
      this.pendingLightningStrike = 0.9;
      this.lightningTimer = 2.6 + Math.random() * 3.0;
    }
  }

  public getWeather(): WeatherMode {
    return this.weather;
  }

  public getLiveRainIntensity(): number {
    return this.liveRainIntensity;
  }

  /**
   * Updates environmental context used by screen-space weather VFX
   * (altitude boosts blizzard frost/storm spray; Shrine shelter warms & thaws frost).
   */
  public setWeatherContext(altitudeNorm: number, isSheltered: boolean): void {
    this.weatherAltitudeNorm = Math.max(0, Math.min(1, altitudeNorm));
    this.weatherSheltered = isSheltered;
  }

  /**
   * Synchronizes subtle screen-space lens VFX directly with real-time Web Audio weather cues.
   */
  public triggerWeatherAudioCue(cue: WeatherAudioCueEvent): void {
    const intensity = Math.max(0.15, Math.min(1.2, cue.intensity));
    const biasX = Math.max(-1, Math.min(1, cue.pan));

    switch (cue.kind) {
      case 'rain_splash': {
        if (this.weatherSheltered && Math.random() < 0.65) return;
        const count = intensity > 0.72 ? 2 : 1;
        for (let i = 0; i < count; i++) {
          this.spawnScreenDroplet(intensity, biasX);
        }
        this.rainSprayPulse = Math.max(this.rainSprayPulse, 0.25 + intensity * 0.45);
        break;
      }
      case 'thunder_jolt': {
        if (this.weather === 'rain' || this.weather === 'storm') {
          const count = this.weatherSheltered ? 1 : intensity > 0.75 ? 3 : 2;
          for (let i = 0; i < count; i++) {
            this.spawnScreenDroplet(Math.min(1, intensity), biasX);
          }
          this.rainSprayPulse = Math.max(this.rainSprayPulse, Math.min(1, 0.45 + intensity * 0.55));
        } else if (this.weather === 'ashstorm') {
          this.ashCinderPulse = Math.max(this.ashCinderPulse, 0.45 + intensity * 0.4);
          this.ashBiasX = biasX;
        }
        break;
      }
      case 'blizzard_gust': {
        const shelterScale = this.weatherSheltered ? 0.25 : 1.0;
        this.frostGustPulse = Math.max(this.frostGustPulse, intensity * shelterScale);
        this.frostBiasX = biasX;
        if (!this.weatherSheltered) {
          this.screenFrostLevel = Math.min(1, this.screenFrostLevel + 0.08 * intensity);
        }
        break;
      }
      case 'ash_cinder': {
        const shelterScale = this.weatherSheltered ? 0.3 : 1.0;
        this.ashCinderPulse = Math.max(this.ashCinderPulse, intensity * shelterScale);
        this.ashBiasX = biasX;
        break;
      }
      case 'wind_surge': {
        if (this.weather === 'storm' && !this.weatherSheltered) {
          this.spawnScreenDroplet(intensity * 0.8, biasX);
        } else if (this.weather === 'blizzard' && !this.weatherSheltered) {
          this.frostGustPulse = Math.max(this.frostGustPulse, intensity * 0.6);
          this.frostBiasX = biasX;
        }
        break;
      }
    }
  }

  private spawnScreenDroplet(intensity: number, panBiasX?: number): void {
    const idx = this.screenDropletCursor;
    this.screenDropletCursor = (this.screenDropletCursor + 1) % this.screenDropletUniforms.length;

    const u = this.screenDropletUniforms[idx];
    const m = this.screenDropletMeta[idx];

    // Bias slightly toward outer viewing regions so the center gameplay crosshair stays clear
    let uvX: number;
    if (typeof panBiasX === 'number') {
      uvX = Math.max(0.06, Math.min(0.94, 0.5 + panBiasX * 0.36 + (Math.random() - 0.5) * 0.22));
    } else {
      uvX = 0.06 + Math.random() * 0.88;
    }
    let uvY = 0.16 + Math.random() * 0.78;
    // Nudge away from dead-center focal region so droplets stay subtle and unobtrusive
    if (Math.abs(uvX - 0.5) < 0.14 && Math.abs(uvY - 0.5) < 0.14) {
      uvY = uvY >= 0.5 ? Math.min(0.92, uvY + 0.2) : Math.max(0.14, uvY - 0.18);
    }

    const radius = (0.011 + Math.random() * 0.015) * (0.78 + intensity * 0.38);
    u.set(uvX, uvY, radius, 1.0);
    m.active = true;
    m.age = 0;
    m.life = 1.15 + Math.random() * 1.45;
    m.slideSpeed = (0.022 + Math.random() * 0.055) * (0.7 + intensity * 0.65);
    m.driftX = (this.weather === 'storm' ? 0.028 : 0.008) * (Math.random() * 0.6 + 0.4);
  }

  public consumeLightningStrike(): number {
    const val = this.pendingLightningStrike;
    this.pendingLightningStrike = 0;
    return val;
  }

  private applyWeatherImmediate(): void {
    const preset = WEATHER_PRESETS[this.biome][this.weather];
    if (!this.xrActive) {
      if (this.scene.background instanceof THREE.Color) {
        this.scene.background.setHex(preset.skyHex);
      } else {
        this.scene.background = new THREE.Color(preset.skyHex);
      }
    }
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.setHex(preset.fogHex);
      this.scene.fog.density = preset.fogDensity;
    } else {
      this.scene.fog = new THREE.FogExp2(preset.fogHex, preset.fogDensity);
    }
    this.mistMat.opacity = preset.mistOpacity;
    this.mistMat.size = preset.mistSize;
    this.mistMat.color.setHex(preset.mistTint);
    this.mistPoints.visible = preset.mistOpacity > 0.01;
    this.renderer.toneMappingExposure = preset.exposure;
    this.applyWeatherLightIntensities(preset.sunScale, preset.hemiScale, preset.rimScale);
  }

  private applyWeatherLightIntensities(sunScale: number, hemiScale: number, rimScale: number): void {
    const sunVal = this.baseSunIntensity * sunScale;
    if (this.csm) {
      this.csm.lightIntensity = sunVal;
      for (const light of this.csm.lights) {
        light.intensity = sunVal;
      }
    } else if (this.fallbackSunLight) {
      this.fallbackSunLight.intensity = sunVal;
    }
    this.hemiLight.intensity = this.baseHemiIntensity * hemiScale;
    this.rimLight.intensity = this.baseRimIntensity * rimScale;
  }

  private updateWeather(dt: number, focusX: number, focusY: number, focusZ: number): void {
    const preset = WEATHER_PRESETS[this.biome][this.weather];
    const lvlEnv = getLevelEnvironment(this.activeEvolutionLevel);
    const wBlend = lvlEnv.blendWeight;
    const dampT = 1 - Math.exp(-2.2 * dt);
    const t = this.elapsed;

    // 0. Storm Lightning Flash Oscillator & Climate Transition Sweep Pulse
    if (this.weather === 'storm') {
      this.lightningTimer -= dt;
      if (this.lightningTimer <= 0) {
        this.lightningFlash = 0.78 + Math.random() * 0.35;
        this.pendingLightningStrike = this.lightningFlash;
        this.lightningTimer = 3.2 + Math.random() * 5.2;
      }
    }
    this.lightningFlash = THREE.MathUtils.damp(this.lightningFlash, 0, 7.5, dt);
    this.weatherShiftPulse = Math.max(0, this.weatherShiftPulse - dt * 0.82);
    if (this.soulSkillPulse > 0.002) {
      this.soulSkillPulse = Math.max(0, this.soulSkillPulse - dt * (1.28 - this.soulSkillPower * 0.32));
      this.soulSkillPhase = Math.min(1.15, this.soulSkillPhase + dt * 1.48);
      if (this.soulSkillPulse <= 0.002) {
        this.soulSkillPulse = 0;
        this.soulSkillPower = 0;
      }
    }

    // 1. Smoothly blend Weather Preset + Cultivation Level Environment (sky, fog, sun, hemi, rim, motes)
    const lightningSkyBoost = this.lightningFlash * 0.38;
    if (!this.xrActive) {
      if (!(this.scene.background instanceof THREE.Color)) {
        this.scene.background = new THREE.Color(preset.skyHex);
      }
      _targetSkyColor.setHex(preset.skyHex).lerp(_levelTintColor.setHex(lvlEnv.skyHex), wBlend * 0.58);
      if (lightningSkyBoost > 0.01) {
        _targetSkyColor.lerp(_color.setHex(0xd8ecff), lightningSkyBoost);
      }
      this.scene.background.lerp(_targetSkyColor, dampT);
    }

    if (this.scene.fog instanceof THREE.FogExp2) {
      _targetFogColor.setHex(preset.fogHex).lerp(_levelTintColor.setHex(lvlEnv.fogHex), wBlend * 0.58);
      if (lightningSkyBoost > 0.01) {
        _targetFogColor.lerp(_color.setHex(0xd8ecff), lightningSkyBoost * 0.75);
      }
      this.scene.fog.color.lerp(_targetFogColor, dampT);
      const targetDensity = preset.fogDensity + lvlEnv.fogDensityBoost;
      this.scene.fog.density = THREE.MathUtils.damp(this.scene.fog.density, targetDensity, 2.2, dt);
    }

    this.renderer.toneMappingExposure = THREE.MathUtils.damp(
      this.renderer.toneMappingExposure,
      preset.exposure + this.lightningFlash * 0.24,
      2.4,
      dt,
    );

    const curSun = this.csm
      ? this.csm.lightIntensity
      : (this.fallbackSunLight?.intensity ?? this.baseSunIntensity);
    const nextSun = THREE.MathUtils.damp(
      curSun,
      this.baseSunIntensity * (preset.sunScale + this.lightningFlash * 1.15),
      2.4,
      dt,
    );
    _targetSunColor.setHex(0xffffff).lerp(_levelTintColor.setHex(lvlEnv.sunHex), Math.min(0.85, wBlend + 0.15));
    if (this.csm) {
      this.csm.lightIntensity = nextSun;
      for (const light of this.csm.lights) {
        light.intensity = nextSun;
        light.color.lerp(_targetSunColor, dampT);
      }
    } else if (this.fallbackSunLight) {
      this.fallbackSunLight.intensity = nextSun;
      this.fallbackSunLight.color.lerp(_targetSunColor, dampT);
    }

    this.hemiLight.intensity = THREE.MathUtils.damp(
      this.hemiLight.intensity,
      this.baseHemiIntensity * (preset.hemiScale + this.lightningFlash * 0.55),
      2.4,
      dt,
    );
    _targetHemiSkyColor.setHex(lvlEnv.hemiSkyHex);
    _targetHemiGroundColor.setHex(lvlEnv.hemiGroundHex);
    this.hemiLight.color.lerp(_targetHemiSkyColor, dampT);
    this.hemiLight.groundColor.lerp(_targetHemiGroundColor, dampT);

    this.rimLight.intensity = THREE.MathUtils.damp(
      this.rimLight.intensity,
      this.baseRimIntensity * (preset.rimScale + (this.activeEvolutionLevel >= 5 ? 0.35 : 0)),
      2.4,
      dt,
    );
    _targetRimColor.setHex(lvlEnv.rimHex);
    this.rimLight.color.lerp(_targetRimColor, dampT);

    if (this.ambientMotes) {
      const moteMat = this.ambientMotes.material as THREE.PointsMaterial;
      _levelTintColor.setHex(lvlEnv.moteHex);
      moteMat.color.lerp(_levelTintColor, dampT);
    }

    // 2. Drifting 3D Valley Mist, Blizzard Squalls & Volcanic Smoke Puffs
    const envMistBoost = this.activeEvolutionLevel >= 5 ? 0.08 : 0;
    this.mistMat.opacity = THREE.MathUtils.damp(
      this.mistMat.opacity,
      Math.min(0.68, preset.mistOpacity + envMistBoost),
      2.6,
      dt,
    );
    this.mistMat.size = THREE.MathUtils.damp(this.mistMat.size, preset.mistSize, 2.6, dt);
    _targetMistColor.setHex(preset.mistTint).lerp(_levelTintColor.setHex(lvlEnv.fogHex), wBlend * 0.35);
    this.mistMat.color.lerp(_targetMistColor, 1 - Math.exp(-2.6 * dt));

    const mistVisible = this.mistMat.opacity > 0.008;
    this.mistPoints.visible = mistVisible;
    if (mistVisible) {
      const mistRadius = 64;
      const windSpeedMul =
        this.weather === 'blizzard'
          ? 2.85
          : this.weather === 'storm'
            ? 2.4
            : this.weather === 'ashstorm'
              ? 2.1
              : this.weather === 'rain'
                ? 1.55
                : this.weather === 'fog'
                  ? 0.72
                  : 1.0;
      const posAttr = this.mistPoints.geometry.attributes.position as THREE.BufferAttribute;

      for (let i = 0; i < this.mistParticles.length; i++) {
        const p = this.mistParticles[i];
        p.x += p.driftX * windSpeedMul * dt;
        p.z += (p.driftZ + Math.sin(t * 0.25 + p.phase) * 0.45) * windSpeedMul * dt;

        // Wrap puffs inside a moving volume around the active focal point
        let dx = p.x - focusX;
        let dz = p.z - focusZ;
        if (dx > mistRadius) p.x -= mistRadius * 2;
        else if (dx < -mistRadius) p.x += mistRadius * 2;
        if (dz > mistRadius) p.z -= mistRadius * 2;
        else if (dz < -mistRadius) p.z += mistRadius * 2;

        dx = p.x - focusX;
        dz = p.z - focusZ;
        if (dx * dx + dz * dz > mistRadius * mistRadius * 1.2) {
          const ang = Math.random() * Math.PI * 2;
          const rad = (0.35 + Math.random() * 0.65) * mistRadius;
          p.x = focusX + Math.cos(ang) * rad;
          p.z = focusZ + Math.sin(ang) * rad;
        }

        const groundY = terrainHeightAt(p.x, p.z, this.biome);
        const bob = Math.sin(t * 0.42 + p.phase) * 0.75;
        this.mistPositions[i * 3] = p.x;
        this.mistPositions[i * 3 + 1] = groundY + p.yOffset + bob;
        this.mistPositions[i * 3 + 2] = p.z;
      }
      posAttr.needsUpdate = true;
    }

    // 3. Driving Rain & Thunder Tempest Oscillator, Slanted Rain Streaks & Ground Splashes
    let targetRain = 0;
    if (this.weather === 'rain') {
      this.rainCyclePhase += dt * 0.26;
      const showerWave =
        0.68 +
        0.24 * Math.sin(this.rainCyclePhase) +
        0.08 * Math.sin(this.rainCyclePhase * 2.3 + 0.7);
      targetRain = THREE.MathUtils.clamp(showerWave, 0.36, 0.96);
    } else if (this.weather === 'storm') {
      this.rainCyclePhase += dt * 0.42;
      targetRain = THREE.MathUtils.clamp(0.92 + 0.08 * Math.sin(this.rainCyclePhase * 1.9), 0.85, 1.0);
    }
    this.liveRainIntensity = THREE.MathUtils.damp(this.liveRainIntensity, targetRain, 2.2, dt);

    const rainActive = this.liveRainIntensity > 0.02;
    this.rainLines.visible = rainActive;
    if (rainActive) {
      const isStorm = this.weather === 'storm';
      this.rainMat.opacity = (isStorm ? 0.32 : 0.18) + this.liveRainIntensity * (isStorm ? 0.52 : 0.42);
      const halfSpan = 28;
      const boxHeight = 30;
      const windX = isStorm ? -9.5 : -3.8;
      const windZ = isStorm ? -3.4 : -1.4;
      const speedMul = isStorm ? 1.45 : 1.05;
      const activeCount = Math.floor(
        this.rainDrops.length * (isStorm ? 1.0 : 0.3 + this.liveRainIntensity * 0.7),
      );
      const rainAttr = this.rainLines.geometry.attributes.position as THREE.BufferAttribute;

      for (let i = 0; i < this.rainDrops.length; i++) {
        const d = this.rainDrops[i];
        const base = i * 6;

        if (i >= activeCount) {
          this.rainPositions[base] = 0;
          this.rainPositions[base + 1] = -300;
          this.rainPositions[base + 2] = 0;
          this.rainPositions[base + 3] = 0;
          this.rainPositions[base + 4] = -300;
          this.rainPositions[base + 5] = 0;
          continue;
        }

        d.x += windX * dt;
        d.y -= d.speed * speedMul * dt;
        d.z += windZ * dt;

        // Wrap horizontally around focal point
        if (d.x - focusX > halfSpan) d.x -= halfSpan * 2;
        else if (d.x - focusX < -halfSpan) d.x += halfSpan * 2;
        if (d.z - focusZ > halfSpan) d.z -= halfSpan * 2;
        else if (d.z - focusZ < -halfSpan) d.z += halfSpan * 2;

        const groundY = Math.max(WATER_LEVEL, terrainHeightAt(d.x, d.z, this.biome));
        if (d.y < groundY) {
          // Spawn a subtle ground splash ring if drop hits near the player/camera
          const distSq = (d.x - focusX) * (d.x - focusX) + (d.z - focusZ) * (d.z - focusZ);
          if (distSq < 26 * 26 && Math.random() < (isStorm ? 0.38 : 0.24) * this.liveRainIntensity) {
            this.spawnRainSplash(d.x, groundY, d.z);
          }
          d.x = focusX + (Math.random() - 0.5) * halfSpan * 2;
          d.z = focusZ + (Math.random() - 0.5) * halfSpan * 2;
          const spawnGround = Math.max(WATER_LEVEL, terrainHeightAt(d.x, d.z, this.biome));
          d.y = Math.max(focusY + 14, spawnGround + 16) + Math.random() * boxHeight * 0.5;
        }

        const slantScale = (d.len * (isStorm ? 1.35 : 1.0)) / (d.speed * speedMul);
        this.rainPositions[base] = d.x;
        this.rainPositions[base + 1] = d.y;
        this.rainPositions[base + 2] = d.z;
        this.rainPositions[base + 3] = d.x - windX * slantScale;
        this.rainPositions[base + 4] = d.y + d.len * (isStorm ? 1.35 : 1.0);
        this.rainPositions[base + 5] = d.z - windZ * slantScale;
      }
      rainAttr.needsUpdate = true;
    }

    // 5. Update Dynamic GPU Climate Particle System (snowflakes, ash/embers, storm spray, mist motes)
    const pUniforms = this.climateParticleMat.uniforms;
    pUniforms.uTime.value = t;
    (pUniforms.uFocus.value as THREE.Vector3).set(focusX, focusY + 6.5, focusZ);
    const windVec = pUniforms.uWind.value as THREE.Vector3;
    windVec.x = THREE.MathUtils.damp(windVec.x, preset.particleWindX, 2.4, dt);
    windVec.y = THREE.MathUtils.damp(windVec.y, preset.particleVelY, 2.4, dt);
    windVec.z = THREE.MathUtils.damp(windVec.z, preset.particleWindZ, 2.4, dt);
    pUniforms.uSize.value = THREE.MathUtils.damp(pUniforms.uSize.value as number, preset.particleSize, 2.6, dt);
    pUniforms.uOpacity.value = THREE.MathUtils.damp(
      pUniforms.uOpacity.value as number,
      preset.particleOpacity,
      2.6,
      dt,
    );
    (pUniforms.uColorA.value as THREE.Color).lerp(_color.setHex(preset.particleColorA), dampT);
    (pUniforms.uColorB.value as THREE.Color).lerp(_levelTintColor.setHex(preset.particleColorB), dampT);
    pUniforms.uStyle.value = preset.particleStyle;
    pUniforms.uPixelRatio.value = this.renderer.getPixelRatio();
    this.climateParticles.visible = (pUniforms.uOpacity.value as number) > 0.02;

    // 6. Update Fullscreen Atmospheric Climate Shader Overlay uniforms
    const oUniforms = this.weatherOverlayMat.uniforms;
    oUniforms.uTime.value = t;
    oUniforms.uMistAmt.value = THREE.MathUtils.damp(
      oUniforms.uMistAmt.value as number,
      this.weather === 'mist' ? 1.0 : 0.0,
      2.5,
      dt,
    );
    oUniforms.uFogAmt.value = THREE.MathUtils.damp(
      oUniforms.uFogAmt.value as number,
      this.weather === 'fog' ? 1.0 : 0.0,
      2.5,
      dt,
    );
    oUniforms.uRainAmt.value = THREE.MathUtils.damp(
      oUniforms.uRainAmt.value as number,
      this.weather === 'rain' ? 1.0 : 0.0,
      2.5,
      dt,
    );
    oUniforms.uStormAmt.value = THREE.MathUtils.damp(
      oUniforms.uStormAmt.value as number,
      this.weather === 'storm' ? 1.0 : 0.0,
      2.5,
      dt,
    );
    oUniforms.uBlizzardAmt.value = THREE.MathUtils.damp(
      oUniforms.uBlizzardAmt.value as number,
      this.weather === 'blizzard' ? 1.0 : 0.0,
      2.5,
      dt,
    );
    oUniforms.uAshAmt.value = THREE.MathUtils.damp(
      oUniforms.uAshAmt.value as number,
      this.weather === 'ashstorm' ? 1.0 : 0.0,
      2.5,
      dt,
    );
    oUniforms.uLightning.value = this.lightningFlash;
    oUniforms.uShiftPulse.value = this.weatherShiftPulse;
    (oUniforms.uTint.value as THREE.Color).lerp(_color.setHex(preset.overlayTint), dampT);
    oUniforms.uSoulPulse.value = this.soulSkillPulse;
    oUniforms.uSoulPhase.value = this.soulSkillPhase;
    oUniforms.uSoulPower.value = this.soulSkillPower;
    this.gunScreenPulse = THREE.MathUtils.damp(this.gunScreenPulse, 0, 18, dt);
    if (this.gunScreenPulse < 0.002) this.gunScreenPulse = 0;
    oUniforms.uGunRecoilPulse.value = this.gunScreenPulse;

    // 6b. Update Intensity-Scaled & Audio-Synced Screen-Space Weather VFX (droplets, frost, condensation, cinders)
    const vfx = computeWeatherVfxIntensity(
      this.weather,
      this.liveRainIntensity,
      this.weatherAltitudeNorm,
      this.weatherSheltered,
    );

    // Spawn continuous ambient lens droplets during rain/storm proportional to weather intensity
    if (vfx.rainSplash > 0.04) {
      const dropletsPerSec = 0.65 + vfx.rainSplash * (this.weather === 'storm' ? 5.2 : 2.9);
      this.screenDropletSpawnAccum += dt * dropletsPerSec;
      while (this.screenDropletSpawnAccum >= 1) {
        this.screenDropletSpawnAccum -= 1;
        this.spawnScreenDroplet(vfx.rainSplash);
      }
    } else {
      this.screenDropletSpawnAccum = 0;
    }

    // Advance sliding screen droplets & decay splash pulses
    let anyActiveDroplet = false;
    for (let i = 0; i < this.screenDropletUniforms.length; i++) {
      const m = this.screenDropletMeta[i];
      const u = this.screenDropletUniforms[i];
      if (!m.active) {
        u.w = 0;
        continue;
      }
      m.age += dt;
      if (m.age >= m.life) {
        m.active = false;
        u.w = 0;
        continue;
      }
      anyActiveDroplet = true;
      const life01 = Math.max(0, 1 - m.age / m.life);
      // Droplets pause briefly on impact then trickle downward under gravity
      const slideFactor = m.age > 0.16 ? 1.0 : 0.15;
      u.x = Math.max(0.02, Math.min(0.98, u.x + m.driftX * slideFactor * dt));
      u.y -= m.slideSpeed * slideFactor * dt;
      u.w = life01;
      if (u.y < -0.05) {
        m.active = false;
        u.w = 0;
      }
    }

    // Progressive blizzard exposure & hostility buildup: frost gradually thickens & blurs edges
    // the longer the player endures exposed blizzard conditions (faster at high altitude, thawing in Shrine Shelter)
    if (this.weather === 'blizzard' && !this.weatherSheltered) {
      const climbAccel = 0.048 + this.weatherAltitudeNorm * 0.045;
      this.blizzardExposure = Math.min(1, this.blizzardExposure + dt * climbAccel);
    } else {
      const thawSpeed = this.weatherSheltered ? 0.34 : 0.24;
      this.blizzardExposure = Math.max(0, this.blizzardExposure - dt * thawSpeed);
    }
    const squallWave = 0.88 + 0.12 * Math.sin(t * 0.45);
    const progressiveFrostTarget =
      this.weather === 'blizzard'
        ? Math.min(1, vfx.frostTarget * (0.28 + 0.72 * this.blizzardExposure) * squallWave)
        : 0;

    // Smoothly creep or thaw screen frost, mist condensation, and decay audio-triggered weather pulses
    const frostRate = progressiveFrostTarget > this.screenFrostLevel ? 0.65 : 1.25;
    this.screenFrostLevel = THREE.MathUtils.damp(this.screenFrostLevel, progressiveFrostTarget, frostRate, dt);
    this.frostGustPulse = THREE.MathUtils.damp(this.frostGustPulse, 0, 2.2, dt);
    this.condensationLevel = THREE.MathUtils.damp(this.condensationLevel, vfx.condensation, 1.8, dt);
    this.ashCinderPulse = THREE.MathUtils.damp(
      this.ashCinderPulse,
      vfx.heatAsh * 0.24,
      2.6,
      dt,
    );
    this.rainSprayPulse = THREE.MathUtils.damp(this.rainSprayPulse, 0, 3.2, dt);

    oUniforms.uRainVfx.value = anyActiveDroplet
      ? Math.max(vfx.rainSplash, this.rainSprayPulse, 0.22)
      : 0;
    oUniforms.uFrostLevel.value = this.screenFrostLevel;
    oUniforms.uFrostPulse.value = this.frostGustPulse;
    oUniforms.uFrostBiasX.value = this.frostBiasX;
    oUniforms.uCondensation.value = this.condensationLevel;
    oUniforms.uAshCinderPulse.value = this.ashCinderPulse;
    oUniforms.uAshBiasX.value = this.ashBiasX;

    // Update dedicated Shader-Based Screen Frost Edge-Blur Overlay uniforms
    const frostParams = computeBlizzardFrostParams(this.screenFrostLevel, this.frostGustPulse);
    const fUniforms = this.frostOverlayMat.uniforms;
    fUniforms.uTime.value = t;
    fUniforms.uFrostIntensity.value = frostParams.effectiveIntensity;
    fUniforms.uFrostOpacity.value = frostParams.opacity;
    fUniforms.uFrostBlurPx.value = frostParams.blurRadiusPx;
    fUniforms.uFrostReach.value = frostParams.edgeReach;
    fUniforms.uFrostPulse.value = this.frostGustPulse;
    fUniforms.uFrostBiasX.value = this.frostBiasX;

    // 4. Update Expanding Ground Rain Splash Rings
    let anySplash = false;
    for (let i = 0; i < this.rainSplashes.length; i++) {
      const sp = this.rainSplashes[i];
      if (!sp.active) continue;
      sp.age += dt;
      if (sp.age >= sp.life) {
        sp.active = false;
        _mat4.makeScale(0, 0, 0);
        this.splashInstanced.setMatrixAt(i, _mat4);
        continue;
      }
      anySplash = true;
      const u = sp.age / sp.life;
      // Quick outward ring expansion then soft shrink-out
      const ringScale = u < 0.72 ? (0.25 + (u / 0.72) * 0.95) * sp.maxScale : (1 - (u - 0.72) / 0.28) * 1.2 * sp.maxScale;
      _up.set(sp.nx, sp.ny, sp.nz);
      _quat.setFromUnitVectors(_yAxis, _up);
      _scale.set(Math.max(0.001, ringScale), 1, Math.max(0.001, ringScale));
      _mat4.compose(_vec3A.set(sp.x, sp.y + 0.06, sp.z), _quat, _scale);
      this.splashInstanced.setMatrixAt(i, _mat4);
    }
    this.splashInstanced.visible = anySplash;
    if (anySplash) {
      this.splashMat.opacity = 0.22 + this.liveRainIntensity * 0.34;
      this.splashInstanced.instanceMatrix.needsUpdate = true;
    }
  }

  private spawnRainSplash(x: number, groundY: number, z: number): void {
    const sp = this.rainSplashes[this.splashCursor];
    this.splashCursor = (this.splashCursor + 1) % this.rainSplashes.length;
    sp.active = true;
    sp.x = x;
    sp.y = groundY;
    sp.z = z;
    if (groundY <= WATER_LEVEL + 0.05) {
      sp.nx = 0;
      sp.ny = 1;
      sp.nz = 0;
    } else {
      terrainNormalAt(x, z, this.biome, this.weatherNormalScratch);
      sp.nx = this.weatherNormalScratch.x;
      sp.ny = this.weatherNormalScratch.y;
      sp.nz = this.weatherNormalScratch.z;
    }
    sp.age = 0;
    sp.life = 0.24 + Math.random() * 0.14;
    sp.maxScale = 0.85 + Math.random() * 0.75;
  }

  public setBiome(biome: BiomeId): void {
    this.biome = biome;
    const isJungle = biome === 'jungle';

    const sunColor = isJungle ? 0xffebc2 : 0xffe8cf;
    this.baseSunIntensity = isJungle ? 2.4 : 2.55;
    this.baseHemiIntensity = isJungle ? 0.88 : 0.9;
    this.baseRimIntensity = 0.58;

    if (this.csm) {
      this.csm.lightDirection
        .set(isJungle ? -0.54 : -0.62, isJungle ? -0.76 : -0.68, isJungle ? -0.36 : -0.39)
        .normalize();
      for (const light of this.csm.lights) {
        light.color.setHex(sunColor);
      }
    } else if (this.fallbackSunLight) {
      this.fallbackSunLight.color.setHex(sunColor);
    }

    if (isJungle) {
      this.hemiLight.color.setHex(0x88e5d0);
      this.hemiLight.groundColor.setHex(0x1f3822);
      this.rimLight.color.setHex(0x52d6a6);
    } else {
      this.hemiLight.color.setHex(0xa8d8ff);
      this.hemiLight.groundColor.setHex(0x283645);
      this.rimLight.color.setHex(0x8cc8ff);
    }

    this.applyWeatherImmediate();
    this.rebuildMountainWorld();
    this.initCollectiblePool();
    this.initRollingBoulderPool();
    this.initBeastPools();
    this.rebuildLandmarks();
  }

  private rebuildLandmarks(): void {
    this.disposeGroupWithCsm(this.landmarksGroup);
    this.landmarkVisuals = [];

    const res = this.getModelResources();
    for (const lm of WORLD_LANDMARKS) {
      const y = terrainHeightAt(lm.x, lm.z, this.biome);
      const shrine = createLandmarkShrine(res, lm.accentHex);
      shrine.group.position.set(lm.x, y - 0.15, lm.z);
      // Orient summit gateway facing center of valley
      shrine.group.rotation.y = Math.atan2(-lm.x, -lm.z);
      this.landmarksGroup.add(shrine.group);
      this.landmarkVisuals.push({
        id: lm.id,
        ...shrine,
      });
    }
    this.registerCsmMaterials(this.landmarksGroup);
  }

  private rebuildMountainWorld(): void {
    this.disposeGroupWithCsm(this.envGroup);
    this.terrainMesh = null;
    this.waterMeshes = [];
    this.ambientMotes = null;
    this.naturalObstacles = [];

    const isJungle = this.biome === 'jungle';

    // 1. Colossal Explorable 3D Mountain Continent (680 x 680 units, 220 x 220 resolution)
    const terrainSize = 680;
    const terrainSegs = this.isSoftwareGl ? 124 : 220;
    const terrainGeo = new THREE.PlaneGeometry(terrainSize, terrainSize, terrainSegs, terrainSegs);
    terrainGeo.rotateX(-Math.PI / 2);

    const pos = terrainGeo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const nScratch = { x: 0, y: 1, z: 0 };

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = terrainHeightAt(x, z, this.biome);
      pos.setY(i, y);

      terrainNormalAt(x, z, this.biome, nScratch);
      const steepness = 1 - nScratch.y;

      if (isJungle) {
        if (y < WATER_LEVEL + 0.7) {
          _color.setHex(0x2d4a3a); // lagoon shore
        } else if (steepness > 0.25) {
          _color.setHex(0x4c584e); // mossy granite cliff rock
        } else if (y < 11) {
          _color.setHex(0x2a6b3b); // lush valley grass
        } else if (y < 24) {
          _color.setHex(0x3a8243); // highland foliage slopes
        } else if (y < 38) {
          _color.setHex(0x638853); // misty cloud forest
        } else {
          _color.setHex(0xc8dcc4); // sunlit celestial mist summit
        }
      } else {
        if (y < WATER_LEVEL + 0.7) {
          _color.setHex(0x384d5e); // glacial lake pebbles
        } else if (steepness > 0.24 && y < 34) {
          _color.setHex(0x5b6a78); // exposed alpine granite cliffs
        } else if (y < 9.5) {
          _color.setHex(0x3a6448); // alpine meadow & pine valley floor
        } else if (y < 18.5) {
          _color.setHex(0x556e5c); // rocky sub-alpine ridge
        } else if (y < 28.0) {
          _color.setHex(0x7d8c9a); // high mountain scree
        } else {
          _color.setHex(0xeef6ff); // gleaming snow-capped colossal peaks
        }
      }
      colors[i * 3] = _color.r;
      colors[i * 3 + 1] = _color.g;
      colors[i * 3 + 2] = _color.b;
    }

    terrainGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    terrainGeo.computeVertexNormals();

    const terrainTex = createTerrainTexture(this.biome, this.maxAnisotropy);
    terrainTex.repeat.set(64, 64);
    const terrainMat = new THREE.MeshStandardMaterial({
      map: terrainTex,
      vertexColors: true,
      roughness: 0.9,
      metalness: 0.02,
      flatShading: false,
    });

    this.terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    this.terrainMesh.castShadow = !this.isSoftwareGl;
    this.terrainMesh.receiveShadow = true;
    this.envGroup.add(this.terrainMesh);

    // 2. Alpine Glacial Lakes / Emerald Lagoons nestled in continental basins
    const waterMat = new THREE.MeshStandardMaterial({
      color: isJungle ? 0x16948c : 0x3b8ec4,
      emissive: isJungle ? 0x063d3b : 0x0d3254,
      emissiveIntensity: 0.35,
      roughness: 0.12,
      metalness: 0.35,
      transparent: true,
      opacity: 0.85,
    });
    for (const lake of WORLD_LAKES) {
      const waterGeo = new THREE.CircleGeometry(lake.radius * 1.45, 36);
      waterGeo.rotateX(-Math.PI / 2);
      const wm = new THREE.Mesh(waterGeo, waterMat);
      wm.position.set(lake.x, WATER_LEVEL, lake.z);
      wm.receiveShadow = true;
      this.envGroup.add(wm);
      this.waterMeshes.push(wm);
    }

    // 3. Instanced Continental Mountain Forest (~740 towering pines/jungle trees across the 480-unit world!)
    let seed = isJungle ? 4219 : 7331;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    const treePlacements: Array<{ x: number; y: number; z: number; s: number; rot: number; tint: number }> = [];
    const targetTrees = this.isSoftwareGl ? 360 : 740;

    let attempts = 0;
    while (treePlacements.length < targetTrees && attempts < 12000) {
      attempts++;
      const angle = rand() * Math.PI * 2;
      const dist = 14 + Math.sqrt(rand()) * (WORLD_PLAY_RADIUS + 26);
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;

      // Keep spawn meadow and initial northern sightline open
      if (isNearSpawn(x, z, 13.5)) continue;
      if (Math.abs(x) < 6.5 && z < 0 && z > -28) continue;
      if (isDeepWater(x, z, this.biome)) continue;

      // Keep all 12 Peak Shrines clear
      if (WORLD_LANDMARKS.some((lm) => Math.hypot(x - lm.x, z - lm.z) < lm.radius + 2.2)) continue;

      const y = terrainHeightAt(x, z, this.biome);
      if (y < WATER_LEVEL + 1.2) continue;
      if (!isJungle && y > 27.5) continue; // Alpine treeline stops below high glacial peaks!
      if (isJungle && y > 39.0) continue;

      terrainNormalAt(x, z, this.biome, nScratch);
      if (nScratch.y < 0.8) continue;

      if (treePlacements.some((tp) => Math.hypot(tp.x - x, tp.z - z) < 5.0)) continue;

      const s = 1.7 + rand() * 2.2;
      treePlacements.push({ x, y, z, s, rot: rand() * Math.PI * 2, tint: 0.88 + rand() * 0.24 });

      if (dist <= WORLD_PLAY_RADIUS + 3) {
        this.naturalObstacles.push({
          x,
          z,
          radius: 0.44 * s,
          kind: 'tree',
        });
      }
    }

    const trunkGeo = isJungle
      ? new THREE.CylinderGeometry(0.18, 0.34, 3.2, 7)
      : new THREE.CylinderGeometry(0.15, 0.3, 2.4, 7);
    trunkGeo.translate(0, isJungle ? 1.5 : 1.1, 0);

    const canopyLowGeo = isJungle
      ? new THREE.DodecahedronGeometry(1.5, 1)
      : new THREE.ConeGeometry(1.45, 3.2, 7);
    canopyLowGeo.translate(0, isJungle ? 3.2 : 3.0, 0);

    const canopyHighGeo = isJungle
      ? new THREE.DodecahedronGeometry(1.08, 1)
      : new THREE.ConeGeometry(1.0, 2.5, 7);
    canopyHighGeo.translate(0, isJungle ? 4.35 : 4.75, 0);

    const trunkMat = new THREE.MeshStandardMaterial({
      color: isJungle ? 0x563924 : 0x4b382a,
      roughness: 0.92,
      metalness: 0.02,
    });
    const canopyLowMat = new THREE.MeshStandardMaterial({
      color: isJungle ? 0x25783c : 0x1f5446,
      roughness: 0.78,
      metalness: 0.02,
      flatShading: true,
    });
    const canopyHighMat = new THREE.MeshStandardMaterial({
      color: isJungle ? 0x47a84d : 0xddeeff,
      roughness: isJungle ? 0.72 : 0.45,
      metalness: 0.02,
      flatShading: true,
    });

    const tCount = treePlacements.length;
    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, tCount);
    const canopiesLow = new THREE.InstancedMesh(canopyLowGeo, canopyLowMat, tCount);
    const canopiesHigh = new THREE.InstancedMesh(canopyHighGeo, canopyHighMat, tCount);

    for (let i = 0; i < tCount; i++) {
      const p = treePlacements[i];
      _euler.set(0, p.rot, 0);
      _quat.setFromEuler(_euler);
      _scale.set(p.s, p.s * (0.92 + (i % 5) * 0.05), p.s);
      _mat4.compose(_vec3A.set(p.x, p.y - 0.35, p.z), _quat, _scale);
      trunks.setMatrixAt(i, _mat4);
      canopiesLow.setMatrixAt(i, _mat4);
      canopiesHigh.setMatrixAt(i, _mat4);
      _color.setRGB(p.tint, p.tint, p.tint);
      canopiesLow.setColorAt(i, _color);
    }
    trunks.instanceMatrix.needsUpdate = true;
    canopiesLow.instanceMatrix.needsUpdate = true;
    canopiesHigh.instanceMatrix.needsUpdate = true;
    if (canopiesLow.instanceColor) canopiesLow.instanceColor.needsUpdate = true;

    trunks.computeBoundingSphere();
    canopiesLow.computeBoundingSphere();
    canopiesHigh.computeBoundingSphere();

    if (!this.isSoftwareGl) {
      trunks.castShadow = true;
      trunks.receiveShadow = true;
      canopiesLow.castShadow = true;
      canopiesLow.receiveShadow = true;
      canopiesHigh.castShadow = true;
      canopiesHigh.receiveShadow = true;
    }
    this.envGroup.add(trunks, canopiesLow, canopiesHigh);

    // 4. Instanced Natural Continental Boulders & Crags (~310 collidable rock hazards!)
    const rockCount = this.isSoftwareGl ? 170 : 310;
    const rockPlacements: Array<{ x: number; y: number; z: number; sx: number; sy: number; sz: number; rot: number; tint: number }> = [];
    let rAttempts = 0;
    while (rockPlacements.length < rockCount && rAttempts < 6000) {
      rAttempts++;
      const angle = rand() * Math.PI * 2;
      const dist = 16 + Math.sqrt(rand()) * (WORLD_PLAY_RADIUS + 18);
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      if (isNearSpawn(x, z, 14)) continue;
      if (Math.abs(x) < 6 && z < 0 && z > -26) continue;
      if (isDeepWater(x, z, this.biome)) continue;
      if (WORLD_LANDMARKS.some((lm) => Math.hypot(x - lm.x, z - lm.z) < lm.radius + 2.0)) continue;
      if (rockPlacements.some((rp) => Math.hypot(rp.x - x, rp.z - z) < 5.5)) continue;

      const y = terrainHeightAt(x, z, this.biome);
      const sx = 1.3 + rand() * 2.2;
      const sy = 1.2 + rand() * 2.8;
      const sz = 1.3 + rand() * 2.2;
      rockPlacements.push({ x, y, z, sx, sy, sz, rot: rand() * Math.PI * 2, tint: 0.85 + rand() * 0.28 });

      if (dist <= WORLD_PLAY_RADIUS + 2) {
        this.naturalObstacles.push({
          x,
          z,
          radius: Math.max(sx, sz) * 0.72,
          kind: 'rock',
        });
      }
    }

    const rockGeo = new THREE.DodecahedronGeometry(1.0, 0);
    const rockMat = new THREE.MeshStandardMaterial({
      color: isJungle ? 0x536358 : 0x67788a,
      roughness: 0.88,
      metalness: 0.05,
      flatShading: true,
    });
    const rocks = new THREE.InstancedMesh(rockGeo, rockMat, rockPlacements.length);
    for (let i = 0; i < rockPlacements.length; i++) {
      const r = rockPlacements[i];
      _euler.set(rand() * 0.35, r.rot, rand() * 0.35);
      _quat.setFromEuler(_euler);
      _scale.set(r.sx, r.sy, r.sz);
      _mat4.compose(_vec3A.set(r.x, r.y + r.sy * 0.35, r.z), _quat, _scale);
      rocks.setMatrixAt(i, _mat4);
      _color.setRGB(r.tint, r.tint, r.tint);
      rocks.setColorAt(i, _color);
    }
    rocks.instanceMatrix.needsUpdate = true;
    if (rocks.instanceColor) rocks.instanceColor.needsUpdate = true;
    rocks.computeBoundingSphere();
    rocks.receiveShadow = true;
    if (!this.isSoftwareGl) rocks.castShadow = true;
    this.envGroup.add(rocks);

    // 5. Atmospheric Mountain Snowdrifts / Jungle Fireflies (wrapping smoothly around the player)
    const moteCount = 320;
    const motePositions = new Float32Array(moteCount * 3);
    for (let i = 0; i < moteCount; i++) {
      const mx = (rand() - 0.5) * 140;
      const mz = (rand() - 0.5) * 140;
      const my = terrainHeightAt(mx, mz, this.biome) + 2 + rand() * 26;
      motePositions[i * 3] = mx;
      motePositions[i * 3 + 1] = my;
      motePositions[i * 3 + 2] = mz;
    }
    const moteGeo = new THREE.BufferGeometry();
    moteGeo.setAttribute('position', new THREE.BufferAttribute(motePositions, 3));
    const moteMat = new THREE.PointsMaterial({
      color: isJungle ? 0xe6ff7a : 0xeef8ff,
      size: isJungle ? 0.36 : 0.28,
      transparent: true,
      opacity: isJungle ? 0.82 : 0.65,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.ambientMotePositions = motePositions;
    this.ambientMotes = new THREE.Points(moteGeo, moteMat);
    this.ambientMotes.frustumCulled = false;
    this.envGroup.add(this.ambientMotes);

    // Register terrain, water, instanced trees, and instanced boulders with CSM
    this.registerCsmMaterials(this.envGroup);
  }

  /**
   * Rebuilds all player-placed or preset mountain course props flush onto the 3D mountain terrain.
   */
  public syncFormation(formation: FormationData): void {
    this.disposeGroupWithCsm(this.propsGroup);
    this.animatedTotems = [];
    this.animatedPortals = [];
    this.animatedBoosts = [];

    const res = this.getModelResources();
    const nScratch = { x: 0, y: 1, z: 0 };

    for (const prop of formation.props) {
      let block: THREE.Group | null = null;
      const y = terrainHeightAt(prop.x, prop.z, this.biome);
      terrainNormalAt(prop.x, prop.z, this.biome, nScratch);

      if (prop.type === 'wall') {
        block = createWallBlock(res);
        block.scale.setScalar(1.95);
        block.rotation.y = ((Math.abs(prop.x * 7 + prop.z * 13) % 4) * Math.PI) / 2;
      } else if (prop.type === 'totem') {
        block = createTotemBlock(res);
        block.scale.setScalar(1.75);
        const core = block.getObjectByName('totemCore');
        const ring = block.getObjectByName('totemRing');
        if (core && ring) {
          this.animatedTotems.push({ core, ring, baseY: 2.75 });
        }
      } else if (prop.type === 'portalA' || prop.type === 'portalB') {
        const variant = prop.type === 'portalA' ? 'A' : 'B';
        block = createPortalBlock(res, variant);
        block.scale.setScalar(3.4);
        const halo = block.getObjectByName('portalHalo');
        const innerWheel = block.getObjectByName('portalInnerWheel');
        const orbitGroup = block.getObjectByName('portalOrbitGroup');
        const skyBeam = block.getObjectByName('portalSkyBeam');
        const climateLight = block.getObjectByName('portalClimateLight') as THREE.PointLight | undefined;
        const climateCore = block.getObjectByName('portalClimateCore') as THREE.Mesh | undefined;
        const s1 = block.getObjectByName('portalShard1');
        const s2 = block.getObjectByName('portalShard2');
        const screen = block.getObjectByName(
          variant === 'A' ? 'portalBrowserScreenA' : 'portalBrowserScreenB',
        ) as THREE.Mesh | undefined;
        const crest = block.getObjectByName('portalTabCrest');
        if (screen) {
          const tex = this.ensurePortalBrowserTexture(variant);
          if (tex && screen.material instanceof THREE.MeshBasicMaterial) {
            screen.material.map = tex;
            screen.material.needsUpdate = true;
          }
        }
        if (halo && s1 && s2) {
          this.animatedPortals.push({
            halo,
            innerWheel,
            orbitGroup,
            skyBeam,
            climateLight,
            climateCore,
            s1,
            s2,
            screen,
            crest,
          });
        }
      } else if (prop.type === 'boost') {
        block = createBoostBlock(res);
        block.scale.setScalar(2.35);
        // Align boost pad cleanly to mountain slope normal!
        _up.set(nScratch.x, nScratch.y, nScratch.z);
        block.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), _up);
        const core = block.getObjectByName('boostCore');
        const ring = block.getObjectByName('boostRing');
        if (core && ring) {
          this.animatedBoosts.push({ core, ring });
        }
      }

      if (block) {
        block.position.set(prop.x, y - (prop.type === 'boost' ? 0.02 : 0.15), prop.z);
        this.propsGroup.add(block);
      }
    }
    this.registerCsmMaterials(this.propsGroup);
  }

  public setBuilderOverlayVisible(visible: boolean): void {
    this.boundaryRing.visible = visible;
    if (!visible) {
      this.hoverGhost.visible = false;
    }
  }

  public resetBuilderCamera(): void {
    this.builderYaw = 0.28;
    this.builderPitch = 0.94;
    this.builderDist = 175;
    this.builderFocus.set(0, 12, -30);
  }

  public adjustBuilderOrbit(dx: number, dy: number): void {
    this.builderYaw -= dx * 0.007;
    this.builderPitch = THREE.MathUtils.clamp(this.builderPitch + dy * 0.006, 0.35, 1.48);
  }

  public adjustBuilderZoom(deltaY: number): void {
    this.builderDist = THREE.MathUtils.clamp(this.builderDist + deltaY * 0.14, 34, 340);
  }

  /**
   * Raycasts pointer directly onto the 3D sculpted mountain terrain for placing props anywhere!
   */
  public pickMountainPoint(clientX: number, clientY: number): WorldPoint2D | null {
    if (!this.terrainMesh) return null;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    const hits = this.raycaster.intersectObject(this.terrainMesh, false);
    if (hits.length > 0) {
      const pt = hits[0].point;
      if (Math.hypot(pt.x, pt.z) <= WORLD_PLAY_RADIUS - 2) {
        this.hoverGhost.visible = true;
        this.hoverGhost.position.set(pt.x, pt.y + 0.1, pt.z);
        return { x: pt.x, z: pt.z };
      }
    }
    this.hoverGhost.visible = false;
    return null;
  }

  public hideHoverGhost(): void {
    this.hoverGhost.visible = false;
  }

  public snapCameraHeading(heading: number): void {
    this.smoothHeading = heading;
  }

  /**
   * Builds a surface-hugging 3D orientation quaternion from terrain normal + heading.
   */
  private applyTerrainPose(obj: THREE.Object3D, pose: SnakePose3D, yLift = 0.04): void {
    obj.position.set(pose.x, pose.y + yLift, pose.z);

    _up.set(pose.nx, pose.ny, pose.nz).normalize();
    _fwd.set(Math.sin(pose.heading), 0, Math.cos(pose.heading));
    // Project forward tangent onto slope plane
    _fwd.addScaledVector(_up, -_fwd.dot(_up));
    if (_fwd.lengthSq() < 0.0001) {
      _fwd.set(0, 0, 1);
    } else {
      _fwd.normalize();
    }
    _right.crossVectors(_up, _fwd).normalize();
    _basisMat.makeBasis(_right, _up, _fwd);
    obj.quaternion.setFromRotationMatrix(_basisMat);
  }

  public updateVisuals(
    dt: number,
    snake: RenderSnakeState,
    orbs: CollectibleOrb[],
    boulders: RollingBoulder[],
    beasts: WildBeast[],
    projectiles: MagicProjectile[],
    shockwaves: ShockwaveEffect[],
    visitedLandmarkIds: Set<string>,
    gameMode: GameMode,
    cameraMode: CameraMode,
    evolutionLevel = 1,
    nextLandmarkId: string | null = null,
    fissures: GroundFissure[] = [],
  ): void {
    this.elapsed += dt;
    this.activeEvolutionLevel = evolutionLevel;
    this.lastSnakeHeadPos.set(snake.head.x, snake.head.y, snake.head.z);
    const t = this.elapsed;
    const stage = getStageForLevel(evolutionLevel);
    const magic = getMagicTierForLevel(evolutionLevel);

    // 1. Update fallback directional light position if running without CSM
    if (this.fallbackSunLight) {
      this.fallbackSunLight.position.set(snake.head.x + 36, snake.head.y + 52, snake.head.z + 28);
      this.fallbackSunLight.target.position.set(snake.head.x, snake.head.y, snake.head.z);
      this.fallbackSunLight.target.updateMatrixWorld();
    }

    // 2. Update 12-Stage Morphing Serpent -> Naga -> Ascended Human Avatar!
    const traversalStrain = Math.max(0, Math.min(1, snake.traversalStrain ?? 0));
    const steerNorm = Math.max(-1, Math.min(1, snake.steerRateNorm ?? 0));
    const isAshTraversal =
      (snake.traversalClimate ?? this.weather) === 'ashstorm';

    const showSerpentHead = stage.humanFaceBlend < 0.85 && stage.serpentScale > 0.05;
    this.snakeHeadGroup.visible = showSerpentHead;
    if (showSerpentHead) {
      const headScale = stage.serpentScale * (1 - stage.humanFaceBlend * 0.45);
      this.applyTerrainPose(this.snakeHeadGroup, snake.head, 0.03);
      if (traversalStrain > 0.01) {
        // Bank head against heavy snowdrift/ash resistance when turning & buffet slightly in headwind
        this.snakeHeadGroup.rotateZ(steerNorm * traversalStrain * 0.28);
        this.snakeHeadGroup.rotateY(Math.sin(t * 9.5) * 0.055 * traversalStrain);
      }
      this.snakeHeadGroup.scale.setScalar(headScale);
      const hornS = Math.max(0.001, stage.hornScale);
      this.snakeLeftHorn.scale.setScalar(hornS);
      this.snakeRightHorn.scale.setScalar(hornS);
      this.snakeCrown.scale.set(0.8 * hornS, 0.45 * hornS, 1.5 * hornS);

      // Tongue flick
      const flick = Math.max(0, Math.sin(t * 7.2) * Math.sin(t * 2.1));
      this.snakeTongue.scale.z = 0.25 + flick * 1.1;
      this.snakeTongue.rotation.y = Math.sin(t * 20) * 0.16 * flick;
    }

    // Scale color progression + sprint boost glow + blizzard frost rime / ashstorm cinder coating
    _color.setHex(stage.scaleColorHex);
    if (traversalStrain > 0.02) {
      const weatherTintHex = isAshTraversal ? 0xf97316 : 0xbae6fd;
      const rT = ((weatherTintHex >> 16) & 255) / 255;
      const gT = ((weatherTintHex >> 8) & 255) / 255;
      const bT = (weatherTintHex & 255) / 255;
      const blend = traversalStrain * 0.26;
      _color.r = _color.r * (1 - blend) + rT * blend;
      _color.g = _color.g * (1 - blend) + gT * blend;
      _color.b = _color.b * (1 - blend) + bT * blend;
    }
    this.snakeHeadMat.color.lerp(_color, 1 - Math.exp(-3 * dt));
    this.snakeBodyMat.color.lerp(_color, 1 - Math.exp(-3 * dt));

    const targetEmissive = snake.boostActive ? 0.55 : stage.auraIntensity * 0.18;
    this.snakeHeadMat.emissive.setHex(0xffe066);
    this.snakeHeadMat.emissiveIntensity = THREE.MathUtils.damp(
      this.snakeHeadMat.emissiveIntensity,
      targetEmissive,
      8,
      dt,
    );
    this.snakeBodyMat.emissive.setHex(stage.level >= 10 ? 0xffe066 : 0x28c78a);
    this.snakeBodyMat.emissiveIntensity = THREE.MathUtils.damp(
      this.snakeBodyMat.emissiveIntensity,
      snake.boostActive ? 0.38 : stage.level >= 11 ? 0.5 : 0.0,
      8,
      dt,
    );

    // Serpent body segments (fade into ethereal spirit trail at Lv 11, completely gone at Lv 12 Ascended Human!)
    const showTail = stage.tailOpacity > 0.02;
    this.snakeBodyMat.opacity = stage.tailOpacity;
    this.snakeCrestMat.opacity = stage.tailOpacity;
    this.snakeBellyMat.opacity = stage.tailOpacity;

    const segCount = showTail ? Math.min(snake.segments.length, MAX_SNAKE_SEGMENTS) : 0;
    const bodyScaleBase = Math.max(0.55, stage.serpentScale);
    for (let i = 0; i < MAX_SNAKE_SEGMENTS; i++) {
      const segMesh = this.snakeBodyPool[i];
      if (i >= segCount) {
        segMesh.visible = false;
        continue;
      }
      segMesh.visible = true;
      const pose = snake.segments[i];
      this.applyTerrainPose(segMesh, pose, 0.03);
      if (traversalStrain > 0.02) {
        // Labored lateral coil heave as the serpent pushes through deep snowdrifts or volcanic ash
        const lateralStrain =
          Math.sin(t * 7.2 - i * 0.55) * 0.085 * traversalStrain * (1 + Math.abs(steerNorm) * 0.7);
        segMesh.translateX(lateralStrain);
      }

      const ratio = segCount > 1 ? i / (segCount - 1) : 0;
      const taper = THREE.MathUtils.lerp(0.92, 0.42, Math.pow(ratio, 1.35)) * bodyScaleBase;
      const pulse = 1 + Math.sin(t * 8.0 - i * 0.48) * 0.04;
      segMesh.scale.setScalar(taper * pulse);
    }

    // 2a-ii. 3D Difficult Traversal Wake & Turning Resistance VFX ('blizzard' snowplow / 'ashstorm' cinder wake)
    const wakeRig = this.traversalWakeRig;
    const showWake = traversalStrain > 0.015 && gameMode === 'playing';
    wakeRig.group.visible = showWake;
    if (showWake) {
      this.applyTerrainPose(wakeRig.group, snake.head, 0.02);
      const primaryHex = isAshTraversal ? 0xfb923c : 0xdbeafe;
      const secondaryHex = isAshTraversal ? 0xfacc15 : 0x38bdf8;
      const moteHex = isAshTraversal ? 0xfdba74 : 0xe0f2fe;
      const moteEmissiveHex = isAshTraversal ? 0xea580c : 0x0284c7;

      wakeRig.primaryMat.color.setHex(primaryHex);
      wakeRig.secondaryMat.color.setHex(secondaryHex);
      wakeRig.moteMat.color.setHex(moteHex);
      wakeRig.moteMat.emissive.setHex(moteEmissiveHex);

      const speedFactor = Math.max(0.45, Math.min(1.4, snake.speedRatio));
      const turnEffort = Math.abs(steerNorm);
      wakeRig.primaryMat.opacity = Math.min(0.82, traversalStrain * (0.44 + speedFactor * 0.22 + turnEffort * 0.16));
      wakeRig.secondaryMat.opacity = Math.min(0.74, traversalStrain * (0.34 + turnEffort * 0.28));
      wakeRig.moteMat.opacity = Math.min(0.92, traversalStrain * 0.88);

      // Forward snowplow / ash-drift crescent bow wave pulses and banks with steering
      const bowScale = (0.82 + speedFactor * 0.28 + Math.sin(t * 9.0) * 0.06) * (0.75 + traversalStrain * 0.35);
      wakeRig.bowWaveMesh.scale.set(bowScale + turnEffort * 0.18, bowScale, 1 + traversalStrain * 0.4);
      wakeRig.bowWaveMesh.rotation.z = Math.PI * 0.025 - steerNorm * 0.32;

      // Asymmetric flank V-wake ribbons: turning left (steerNorm > 0) flares the outside right wake & vice versa!
      const leftFlare = 1 + Math.max(0, -steerNorm) * 0.85 + turnEffort * 0.2;
      const rightFlare = 1 + Math.max(0, steerNorm) * 0.85 + turnEffort * 0.2;
      wakeRig.leftWakeMesh.scale.set(leftFlare, 1, 0.78 + speedFactor * 0.34);
      wakeRig.rightWakeMesh.scale.set(rightFlare, 1, 0.78 + speedFactor * 0.34);
      wakeRig.leftWakeMesh.rotation.y = -0.34 - Math.max(0, -steerNorm) * 0.26;
      wakeRig.rightWakeMesh.rotation.y = 0.34 + Math.max(0, steerNorm) * 0.26;

      // Swirling ground traction eddy ring
      wakeRig.eddyRingMesh.rotation.z = t * (2.6 + turnEffort * 3.2) * (steerNorm >= 0 ? 1 : -1);
      const eddyScale = 0.88 + traversalStrain * 0.32 + Math.sin(t * 7.5) * 0.07;
      wakeRig.eddyRingMesh.scale.setScalar(eddyScale);

      // 8 faceted drift motes streaming backward from the bow wave along both flanks
      const moteCount = wakeRig.driftMotes.length;
      for (let i = 0; i < moteCount; i++) {
        const mote = wakeRig.driftMotes[i];
        const side = i % 2 === 0 ? 1 : -1;
        const phase = (t * (1.85 + speedFactor * 0.95) + i / moteCount) % 1;
        const zPos = 0.58 - phase * 2.45;
        const sideBoost = side * steerNorm < 0 ? 1.35 : 0.85;
        const xPos =
          side * (0.42 + phase * 0.92 * sideBoost) - steerNorm * phase * 0.48;
        const yPos = 0.12 + Math.sin(phase * Math.PI) * (0.46 + turnEffort * 0.28);
        mote.position.set(xPos, yPos, zPos);
        mote.rotation.set(t * 5.2 + i, t * 6.4 - i, t * 4.1);
        const s = Math.sin(phase * Math.PI) * (0.75 + traversalStrain * 0.55);
        mote.scale.setScalar(Math.max(0.01, s));
      }
    }

    // Articulated Evolution & Ascended Human Rig (Lv 5+ forelimbs/wings -> Lv 8+ Naga -> Lv 11-12 Full Human!)
    const showAscensionRig = stage.nagaTorsoBlend > 0.05 || stage.wingBlend > 0.05 || stage.legsBlend > 0.05;
    this.ascensionRig.group.visible = showAscensionRig;
    if (showAscensionRig) {
      const rig = this.ascensionRig;
      // Keep human/naga standing mostly upright on slopes with gentle lean into terrain
      rig.group.position.set(snake.head.x, snake.head.y + 0.02, snake.head.z);
      _up.set(snake.head.nx * 0.25, 1.0, snake.head.nz * 0.25).normalize();
      _fwd.set(Math.sin(snake.head.heading), 0, Math.cos(snake.head.heading));
      _fwd.addScaledVector(_up, -_fwd.dot(_up)).normalize();
      _right.crossVectors(_up, _fwd).normalize();
      _basisMat.makeBasis(_right, _up, _fwd);
      rig.group.quaternion.setFromRotationMatrix(_basisMat);

      // Advance running gait phase proportional to speed (slightly heavier cadence against blizzard/ashstorm drag)
      const gaitDrag = 1 - traversalStrain * 0.14;
      this.gaitPhase += dt * (4.2 + snake.speedRatio * 4.8) * gaitDrag;
      const stride = Math.sin(this.gaitPhase);

      // Scale whole human rig cleanly (1.05 height at Ascended Human so mountains still feel monumental!)
      const rigScale = THREE.MathUtils.lerp(0.76, 1.08, stage.nagaTorsoBlend);
      rig.group.scale.setScalar(rigScale);

      // Legs emerge at Lv 10-12
      const hasLegs = stage.legsBlend > 0.05;
      rig.legsGroup.visible = hasLegs;
      if (hasLegs) {
        rig.legsGroup.scale.set(1, stage.legsBlend, 1);
        const legSwing = stride * 0.68 * stage.legsBlend;
        rig.leftLegPivot.rotation.x = legSwing;
        rig.rightLegPivot.rotation.x = -legSwing;
        rig.upperBody.position.y = 0.26 + stage.legsBlend * 0.68 + Math.abs(Math.cos(this.gaitPhase)) * 0.05;
      } else {
        // Seated upright atop the front serpent coils (Naga / Wyrm form)
        rig.upperBody.position.y = 0.22 + stage.nagaTorsoBlend * 0.16;
      }

      // Multi-DOF spring-damped hand cannon recoil, blowback slide, tilting barrel, hammer & trigger kinematics
      const recoilAccel = -175 * this.gunRecoil - 19 * this.gunRecoilVel;
      this.gunRecoilVel += recoilAccel * dt;
      this.gunRecoil = Math.max(-0.18, this.gunRecoil + this.gunRecoilVel * dt);
      if (Math.abs(this.gunRecoil) < 0.002 && Math.abs(this.gunRecoilVel) < 0.01) {
        this.gunRecoil = 0;
        this.gunRecoilVel = 0;
      }

      const twistAccel = -210 * this.gunTwist - 22 * this.gunTwistVel;
      this.gunTwistVel += twistAccel * dt;
      this.gunTwist += this.gunTwistVel * dt;
      if (Math.abs(this.gunTwist) < 0.002 && Math.abs(this.gunTwistVel) < 0.01) {
        this.gunTwist = 0;
        this.gunTwistVel = 0;
      }

      const blowbackAccel = -230 * this.gunBlowback - 24 * this.gunBlowbackVel;
      this.gunBlowbackVel += blowbackAccel * dt;
      this.gunBlowback = Math.max(-0.08, this.gunBlowback + this.gunBlowbackVel * dt);
      if (Math.abs(this.gunBlowback) < 0.002 && Math.abs(this.gunBlowbackVel) < 0.01) {
        this.gunBlowback = 0;
        this.gunBlowbackVel = 0;
      }

      this.gunSlideKick = THREE.MathUtils.damp(this.gunSlideKick, 0, 26, dt);
      this.gunHammerKick = THREE.MathUtils.damp(this.gunHammerKick, 0, 22, dt);
      this.gunTriggerPull = THREE.MathUtils.damp(this.gunTriggerPull, 0, 30, dt);
      this.gunFlashTimer = Math.max(0, this.gunFlashTimer - dt);

      // Forelimbs / Arms + Half-Human Mounted Hand Cannon (Lv 8+)
      const armScale = Math.max(0.01, stage.nagaTorsoBlend);
      rig.leftArmPivot.scale.setScalar(armScale);
      rig.rightArmPivot.scale.setScalar(armScale);
      rig.leftArmPivot.rotation.x = -stride * 0.58 - Math.max(0, this.gunRecoil) * 0.18;
      rig.leftArmPivot.rotation.z = 0.14 + Math.sin(t * 2.5) * 0.04 + Math.max(0, this.gunRecoil) * 0.14;

      const showGun = evolutionLevel >= 8;
      rig.gunGroup.visible = showGun;
      if (showGun) {
        // Right arm locks into forward firing stance with vertical recoil flip, rifling twist & axial blowback
        const kick = Math.max(0, this.gunRecoil);
        const blowback = Math.max(0, this.gunBlowback);
        rig.rightArmPivot.rotation.x = -Math.PI * 0.46 + stride * 0.07 - kick * 0.62;
        rig.rightArmPivot.rotation.z = -0.07 - kick * 0.11 + this.gunTwist * 0.09;
        rig.rightArmPivot.rotation.y = -0.05 + this.gunTwist * 0.07;

        rig.gunGroup.position.set(
          this.gunTwist * 0.016,
          -0.68 + kick * 0.115 - blowback * 0.045,
          0.11 - blowback * 0.088,
        );
        rig.gunGroup.rotation.x = Math.PI * 0.46 - kick * 0.34;
        rig.gunGroup.rotation.y = this.gunTwist * 0.12;
        rig.gunGroup.rotation.z = this.gunTwist * 0.25;

        // Reciprocating blowback slide, short-recoil tilting barrel, skeletonized hammer & trigger squeeze
        rig.gunSlide.position.z = -this.gunSlideKick * 0.165;
        rig.gunBarrelGroup.position.z = -this.gunSlideKick * 0.042;
        rig.gunBarrelGroup.rotation.x = -this.gunSlideKick * 0.068;
        rig.gunHammerPivot.rotation.x = -this.gunHammerKick * 0.92;
        rig.gunTrigger.rotation.x = 0.28 + this.gunTriggerPull * 0.42;
        rig.gunTrigger.position.z = 0.072 - this.gunTriggerPull * 0.014;

        // Full upper-body fallback recoil rock on firing + forward headwind lean in blizzard/ashstorm
        rig.upperBody.rotation.x = traversalStrain * 0.16 - kick * 0.26;
        rig.upperBody.rotation.y = this.gunTwist * 0.08;
        rig.upperBody.rotation.z = -steerNorm * traversalStrain * 0.2;
        rig.upperBody.position.z = -kick * 0.21;

        const flashFrac = this.gunFlashTimer / 0.078;
        rig.gunMuzzleFlash.visible = flashFrac > 0;
        if (flashFrac > 0) {
          rig.gunMuzzleFlash.scale.setScalar(0.76 + flashFrac * 0.74);
          rig.gunMuzzleLight.intensity = 8.2 * flashFrac;
        } else {
          rig.gunMuzzleLight.intensity = 0;
        }
        rig.gunCoreMat.emissiveIntensity = 1.25 + kick * 3.1;
      } else {
        rig.rightArmPivot.rotation.x = stride * 0.58;
        rig.rightArmPivot.rotation.z = -0.14 - Math.sin(t * 2.5) * 0.04;
        rig.rightArmPivot.rotation.y = 0;
        rig.upperBody.rotation.x = traversalStrain * 0.16;
        rig.upperBody.rotation.y = 0;
        rig.upperBody.rotation.z = -steerNorm * traversalStrain * 0.2;
        rig.upperBody.position.z = 0;
        rig.gunMuzzleFlash.visible = false;
        rig.gunMuzzleLight.intensity = 0;
      }

      // Skin color shifts from emerald-tinted scaled Naga to warm Human skin!
      _color.setHex(stage.humanFaceBlend > 0.65 ? 0xe6b992 : 0x74b898);
      rig.skinMat.color.lerp(_color, 1 - Math.exp(-4 * dt));

      // Human head emerges at Lv 8+
      rig.humanHeadGroup.visible = stage.humanFaceBlend > 0.15;
      if (rig.humanHeadGroup.visible) {
        rig.humanHeadGroup.scale.setScalar(0.55 + stage.humanFaceBlend * 0.48);
        rig.humanHeadGroup.rotation.y = Math.sin(t * 1.4) * 0.06;
      }

      // Cloak appears on Naga & Human forms and billows back with speed + storm gusts
      rig.cloak.visible = stage.nagaTorsoBlend >= 0.8;
      if (rig.cloak.visible) {
        rig.cloak.rotation.x =
          0.18 +
          snake.speedRatio * 0.28 +
          traversalStrain * 0.22 +
          Math.sin(t * (7.5 + traversalStrain * 5.0)) * (0.08 + traversalStrain * 0.09);
        rig.cloak.rotation.z =
          traversalStrain > 0.02
            ? Math.sin(t * 11.2) * 0.14 * traversalStrain - steerNorm * 0.16 * traversalStrain
            : 0;
      }

      // Drake Wings flap at Lv 6-9
      const showWings = stage.wingBlend > 0.05;
      rig.leftWingPivot.visible = showWings;
      rig.rightWingPivot.visible = showWings;
      if (showWings) {
        const ws = stage.wingBlend;
        rig.leftWingPivot.scale.setScalar(ws);
        rig.rightWingPivot.scale.setScalar(ws);
        const flap = Math.sin(t * (snake.boostActive ? 11 : 6.2)) * 0.34;
        rig.leftWingPivot.rotation.y = 0.28 + flap;
        rig.rightWingPivot.rotation.y = -0.28 - flap;
      }

      // Golden Ascension Halo
      rig.auraRing.visible = stage.auraIntensity > 0.2;
      if (rig.auraRing.visible) {
        rig.auraRing.rotation.z = t * 1.1;
        rig.auraRing.scale.setScalar(0.65 + stage.auraIntensity * 0.5);
        rig.auraMat.opacity = 0.25 + stage.auraIntensity * 0.65;
        rig.auraMat.emissiveIntensity = snake.boostActive ? 1.8 : 1.0 + stage.auraIntensity * 0.5;
      }
    }

    // 2b. Escalating Player Arcane Aura (orbiting rune shards + glowing rune circle)
    const auraRig = this.playerAuraRig;
    const orbCount = magic.auraOrbs;
    auraRig.group.visible = orbCount > 0;
    if (orbCount > 0) {
      auraRig.group.position.set(snake.head.x, snake.head.y + 0.08, snake.head.z);
      auraRig.orbMat.color.setHex(magic.manaColorHex);
      auraRig.orbMat.emissive.setHex(magic.manaColorHex);
      auraRig.orbMat.emissiveIntensity = snake.boostActive ? 2.2 : 1.35 + (evolutionLevel / 12) * 0.7;

      const orbitRadius = 1.05 + evolutionLevel * 0.045;
      const orbitSpeed = 1.8 + evolutionLevel * 0.12;
      const baseHeight = stage.legsBlend > 0.4 ? 1.35 : 0.92;
      for (let i = 0; i < auraRig.orbs.length; i++) {
        const orbMesh = auraRig.orbs[i];
        if (i >= orbCount) {
          orbMesh.visible = false;
          continue;
        }
        orbMesh.visible = true;
        const angle = t * orbitSpeed + (i * Math.PI * 2) / orbCount;
        orbMesh.position.set(
          Math.cos(angle) * orbitRadius,
          baseHeight + Math.sin(t * 3.2 + i * 1.3) * 0.22,
          Math.sin(angle) * orbitRadius,
        );
        orbMesh.rotation.set(t * 2.1 + i, t * 2.8, 0);
        const orbScale = 0.8 + (evolutionLevel / 12) * 0.55;
        orbMesh.scale.setScalar(orbScale);
      }

      const showGroundRune = evolutionLevel >= 4;
      auraRig.groundRing.visible = showGroundRune;
      if (showGroundRune) {
        auraRig.ringMat.color.setHex(magic.manaColorHex);
        auraRig.ringMat.opacity = 0.14 + ((evolutionLevel - 3) / 9) * 0.28 + Math.sin(t * 3.5) * 0.05;
        auraRig.groundRing.rotation.z = t * 0.7;
        auraRig.groundRing.scale.setScalar(0.95 + (evolutionLevel / 12) * 0.45);
      }
    }

    // 3. Sync & Animate World Collectibles across the Continent
    let goldenIdx = 0;
    let normalIdx = 14;
    for (const slot of this.collectiblePool) {
      slot.active = false;
      slot.group.visible = false;
    }
    for (const orb of orbs) {
      let slotIdx = -1;
      if (orb.golden && goldenIdx < 14) {
        slotIdx = goldenIdx++;
      } else if (!orb.golden && normalIdx < MAX_COLLECTIBLES) {
        slotIdx = normalIdx++;
      }
      if (slotIdx < 0) continue;
      const slot = this.collectiblePool[slotIdx];
      slot.active = true;
      slot.group.visible = true;
      slot.group.position.set(orb.x, orb.y + 0.15, orb.z);

      const core = slot.group.getObjectByName('fruitCore');
      const halo = slot.group.getObjectByName('fruitHalo');
      if (core) {
        core.rotation.y = t * (orb.golden ? 2.4 : 1.7) + orb.id;
        core.position.y = 0.56 + Math.sin(t * 3.1 + orb.id) * 0.12;
      }
      if (halo) {
        halo.rotation.z = t * 2.2 + orb.id;
        halo.position.y = 0.56 + Math.sin(t * 3.1 + orb.id) * 0.12;
      }
    }

    // 4. Sync & Animate Dynamic Rolling Mountain Boulders
    for (let i = 0; i < MAX_ROLLING_BOULDERS; i++) {
      const mesh = this.rollingBoulderPool[i];
      const b = boulders[i];
      if (!b) {
        mesh.visible = false;
        continue;
      }
      mesh.visible = true;
      mesh.position.set(b.x, b.y + b.radius * 0.88, b.z);
      mesh.scale.setScalar(b.radius);
      mesh.rotation.set(b.rotX, 0, b.rotZ);
    }

    // 4b. Sync & Animate Roaming Wild Mountain Animals, Peak Guardians & Subterranean Ghost Clan
    const usedByKind: Record<BeastKind, number> = {
      wolf: 0,
      boar: 0,
      eagle: 0,
      guardian: 0,
      wraith: 0,
      soul_elder: 0,
    };
    for (const kind of ['wolf', 'boar', 'eagle', 'guardian', 'wraith', 'soul_elder'] as BeastKind[]) {
      for (const rig of this.beastPools[kind]) {
        rig.group.visible = false;
      }
    }
    for (let i = 0; i < beasts.length; i++) {
      const beast = beasts[i];
      const pool = this.beastPools[beast.kind];
      const idx = usedByKind[beast.kind];
      if (!pool || idx >= pool.length) continue;
      usedByKind[beast.kind] = idx + 1;

      const rig = pool[idx];
      rig.group.visible = true;
      rig.group.position.set(beast.x, beast.y, beast.z);
      rig.group.rotation.y = beast.heading;
      const emergeScale = beast.state === 'emerging' ? 0.55 + beast.emergeProgress * 0.45 : 1.0;
      rig.group.scale.setScalar(beast.scale * emergeScale);

      // Articulated gait / wing flap / ghostly hover / emerging rise + real duel body telegraphs
      const speedNorm = Math.min(1.6, Math.hypot(beast.vx, beast.vz) / Math.max(1, beast.speed));
      rig.bodyGroup.position.z =
        beast.state === 'windup'
          ? -0.34
          : beast.state === 'lunge'
            ? 0.42
            : beast.state === 'stagger'
              ? -0.28
              : 0;
      rig.bodyGroup.rotation.z =
        beast.state === 'stagger'
          ? Math.sin(t * 26 + beast.id) * 0.24
          : beast.state === 'circle'
            ? beast.flankDir * 0.14
            : 0;
      rig.bodyGroup.rotation.x =
        beast.state === 'windup'
          ? -0.18
          : beast.state === 'lunge'
            ? 0.16
            : beast.state === 'stagger'
              ? -0.22
              : 0;

      if (beast.kind === 'eagle') {
        const hoverY = 1.65 + Math.sin(beast.animPhase * 1.4) * 0.32;
        rig.bodyGroup.position.y =
          beast.state === 'lunge' ? hoverY - 0.72 : beast.state === 'stagger' ? hoverY - 0.35 : hoverY;
        const flap = Math.sin(beast.animPhase * 2.8) * (beast.state === 'windup' ? 0.68 : 0.42);
        if (rig.wings[0]) rig.wings[0].rotation.z = flap;
        if (rig.wings[1]) rig.wings[1].rotation.z = -flap;
      } else if (beast.kind === 'wraith' || beast.kind === 'soul_elder') {
        const floatBob = Math.sin(beast.animPhase * 2.1 + beast.id) * 0.24;
        rig.bodyGroup.position.y = beast.state === 'emerging' ? 0 : 0.22 + floatBob;
        const armWave = Math.sin(beast.animPhase * 2.5) * 0.32;
        for (let l = 0; l < rig.limbs.length; l++) {
          const sign = l % 2 === 0 ? 1 : -1;
          rig.limbs[l].rotation.x =
            beast.state === 'windup'
              ? -0.95
              : beast.state === 'stagger'
                ? 0.55
                : armWave * sign - 0.25;
        }
        if (rig.accentObj) {
          rig.accentObj.rotation.z = t * (beast.state === 'windup' ? 5.6 : beast.state === 'stagger' ? 0.5 : 2.1);
          rig.accentObj.rotation.y = t * 1.4;
        }
      } else {
        const stride = Math.sin(beast.animPhase * 2.2) * 0.62 * Math.max(0.12, speedNorm);
        for (let l = 0; l < rig.limbs.length; l++) {
          const sign = l % 2 === 0 ? 1 : -1;
          rig.limbs[l].rotation.x = beast.state === 'stagger' ? -0.32 * sign : stride * sign;
        }
        rig.bodyGroup.position.y =
          beast.state === 'windup'
            ? 0.14 + Math.sin(t * 28) * 0.07
            : beast.state === 'stagger'
              ? 0.04
              : Math.abs(Math.cos(beast.animPhase * 2.2)) * 0.08 * speedNorm;
        if (beast.kind === 'guardian' && rig.accentObj) {
          rig.accentObj.rotation.z = t * (beast.state === 'windup' ? 4.6 : beast.state === 'stagger' ? 0.4 : 1.5);
        } else if (beast.kind === 'wolf' && rig.accentObj) {
          rig.accentObj.rotation.y = Math.sin(beast.animPhase * 2.6) * 0.35;
        }
      }

      // Hit-flash white emissive, posture-break gold stagger, or clear crimson/violet attack windup telegraph
      if (beast.hitFlash > 0) {
        rig.primaryMat.emissive.setHex(0xffffff);
        rig.primaryMat.emissiveIntensity = Math.min(1.4, beast.hitFlash * 5.5);
      } else if (beast.state === 'stagger') {
        rig.primaryMat.emissive.setHex(0xfacc15);
        rig.primaryMat.emissiveIntensity = 0.65 + Math.sin(t * 18) * 0.28;
      } else if (beast.state === 'emerging') {
        rig.primaryMat.emissive.setHex(beast.kind === 'soul_elder' ? 0xd946ef : 0x22e8a8);
        rig.primaryMat.emissiveIntensity = 0.75 + Math.sin(t * 22) * 0.35;
      } else if (beast.state === 'windup') {
        rig.primaryMat.emissive.setHex(
          beast.faction === 'ghost_clan'
            ? 0x3ef5b8
            : beast.kind === 'guardian'
              ? 0xc084fc
              : 0xff3b2f,
        );
        rig.primaryMat.emissiveIntensity = 0.85 + Math.sin(t * 28) * 0.42;
      } else {
        rig.primaryMat.emissive.setHex(0x000000);
        rig.primaryMat.emissiveIntensity = 0;
      }
      rig.glowMat.emissiveIntensity =
        beast.state === 'windup' || beast.state === 'emerging' || beast.state === 'stagger' ? 3.0 : 1.6;

      // Overhead billboarded HP bar when damaged or actively aggroed
      const showHp = beast.hp < beast.maxHp || beast.state !== 'patrol';
      rig.hpBarGroup.visible = showHp;
      if (showHp) {
        rig.hpBarGroup.lookAt(this.camera.position);
        const frac = Math.max(0.02, Math.min(1, beast.hp / Math.max(1, beast.maxHp)));
        rig.hpFillMesh.scale.x = frac;
      }
    }

    // 4b-ii. Sync & Animate Cracked Subterranean Ghost Clan Earth Fissures
    for (let i = 0; i < MAX_FISSURES; i++) {
      const fRig = this.groundFissurePool[i];
      const f = fissures[i];
      if (!f) {
        fRig.group.visible = false;
        continue;
      }
      fRig.group.visible = true;
      const u = Math.max(0, Math.min(1, f.age / Math.max(0.1, f.life)));
      const openFactor = u < 0.25 ? u / 0.25 : u > 0.75 ? (1 - u) / 0.25 : 1;
      const rad = Math.max(0.25, f.radius * openFactor);
      fRig.group.position.set(f.x, f.y + 0.04, f.z);
      fRig.outerRing.scale.setScalar(rad);
      fRig.outerRing.rotation.z = t * (f.isBoss ? 2.8 : 1.9);
      fRig.innerDisc.scale.setScalar(rad * 0.96);
      fRig.vortexCone.scale.set(rad * 0.82, 0.4 + openFactor * (f.isBoss ? 1.55 : 1.05), rad * 0.82);
      fRig.vortexCone.rotation.y = -t * 3.2;
      fRig.ringMat.color.setHex(f.colorHex);
      fRig.ringMat.opacity = 0.85 * openFactor;
      fRig.discMat.opacity = 0.88 * openFactor;
      fRig.vortexMat.color.setHex(f.isBoss ? 0xe879f9 : 0x3ef5b8);
      fRig.vortexMat.opacity = 0.45 * openFactor;
    }

    // 4c. Sync & Animate Pooled Magical Spell Projectiles
    for (let i = 0; i < MAX_PROJECTILES; i++) {
      const slot = this.projectilePool[i];
      const p = projectiles[i];
      if (!p) {
        slot.group.visible = false;
        continue;
      }
      slot.group.visible = true;
      slot.group.position.set(p.x, p.y, p.z);
      if (p.style === 'bullet') {
        slot.group.scale.set(p.radius * 0.72, p.radius * 0.72, p.radius * 3.8);
        slot.group.rotation.set(0, Math.atan2(p.vx, p.vz), 0);
        slot.coreMat.color.setHex(0xfff3c4);
        slot.haloMat.color.setHex(p.colorHex);
      } else {
        const styleScale = p.style === 'lotus' ? 2.85 : p.style === 'soul_chain' ? 2.3 : 2.1;
        slot.group.scale.setScalar(p.radius * styleScale);
        slot.group.rotation.set(t * 7.5 + p.id, t * 9.4, p.style === 'lotus' ? t * 6.0 : 0);
        slot.coreMat.color.setHex(p.colorHex);
        slot.haloMat.color.setHex(
          p.style === 'lotus' ? 0xffe48f : p.style === 'soul_chain' ? 0x3ef5b8 : p.fromPlayer ? 0xffffff : p.colorHex,
        );
      }
    }

    // 4d. Sync & Animate Expanding Arcane Shockwave Rings
    for (let i = 0; i < MAX_SHOCKWAVES; i++) {
      const slot = this.shockwavePool[i];
      const sw = shockwaves[i];
      if (!sw) {
        slot.group.visible = false;
        continue;
      }
      slot.group.visible = true;
      const u = Math.max(0, Math.min(1, sw.age / Math.max(0.05, sw.life)));
      const fade = 1 - u;
      slot.group.position.set(sw.x, sw.y + 0.35, sw.z);
      slot.group.scale.set(Math.max(0.2, sw.radius), 1, Math.max(0.2, sw.radius));
      slot.ringMat.color.setHex(sw.colorHex);
      slot.ringMat.opacity = fade * 0.92;
      slot.discMat.color.setHex(sw.colorHex);
      slot.discMat.opacity = fade * 0.38;
    }

    // 5. Animate all 12 Summit Trial Shrines (highlighting the next target peak with a towering golden sky-beam!)
    for (let i = 0; i < this.landmarkVisuals.length; i++) {
      const lv = this.landmarkVisuals[i];
      const visited = visitedLandmarkIds.has(lv.id);
      const isNext = lv.id === nextLandmarkId;
      lv.crystal.rotation.y = t * (visited ? 0.7 : isNext ? 2.5 : 1.6) + i;
      lv.crystal.position.y = 5.85 + Math.sin(t * 2.2 + i) * 0.25;
      lv.ring.rotation.z = -t * (isNext ? 2.2 : 1.3);
      const beamMat = lv.beam.material as THREE.MeshBasicMaterial;
      if (visited) {
        beamMat.opacity = 0.05;
        lv.beam.scale.set(1, 0.7, 1);
      } else if (isNext) {
        beamMat.opacity = 0.34 + Math.sin(t * 3.2) * 0.06;
        lv.beam.scale.set(1.6, 2.2, 1.6);
      } else {
        beamMat.opacity = 0.16 + Math.sin(t * 2.2 + i) * 0.04;
        lv.beam.scale.set(1, 1.15, 1);
      }
    }

    // 6. Animate Formation Props (Totems, Portals, Boosts)
    for (let i = 0; i < this.animatedTotems.length; i++) {
      const tm = this.animatedTotems[i];
      tm.core.rotation.y = t * 1.8 + i;
      tm.core.position.y = tm.baseY + Math.sin(t * 2.8 + i) * 0.1;
      tm.ring.rotation.z = -t * 1.5;
    }
    const portalLightLerp = 1 - Math.exp(-5.5 * dt);
    for (let i = 0; i < this.animatedPortals.length; i++) {
      const pt = this.animatedPortals[i];
      const sway = Math.sin(t * 0.9 + i) * 0.24;
      const lightState = computePortalClimateLightState(this.weather, t, i, this.lightningFlash);
      _color.setHex(lightState.colorHex).lerp(_levelTintColor.setHex(lightState.pulseTintHex), lightState.wave01 * 0.45);

      if (pt.climateLight) {
        pt.climateLight.color.lerp(_color, portalLightLerp);
        pt.climateLight.intensity = lightState.intensity;
        pt.climateLight.distance = lightState.distance;
        pt.climateLight.position.y = 1.18 + Math.sin(t * 2.2 + i) * 0.04;
      }
      if (pt.climateCore && pt.climateCore.material instanceof THREE.MeshBasicMaterial) {
        pt.climateCore.material.color.lerp(_color, portalLightLerp);
        pt.climateCore.material.opacity = 0.26 + lightState.wave01 * 0.34;
        pt.climateCore.rotation.y = sway * 0.85;
        pt.climateCore.scale.setScalar(0.94 + lightState.wave01 * 0.14);
      }

      pt.halo.rotation.y = sway;
      pt.halo.rotation.z = t * 0.65 + i;
      if (pt.innerWheel) {
        pt.innerWheel.rotation.y = sway;
        pt.innerWheel.rotation.z = -t * 1.45 - i;
      }
      if (pt.orbitGroup) {
        pt.orbitGroup.rotation.y = sway;
        const spin = t * 1.25 + i * 0.8;
        pt.orbitGroup.rotation.z = spin;
        for (let c = 0; c < pt.orbitGroup.children.length; c++) {
          pt.orbitGroup.children[c].rotation.z = -spin;
        }
      }
      if (pt.skyBeam) {
        const beamPulse = 0.88 + Math.sin(t * 2.8 + i) * 0.18;
        pt.skyBeam.scale.set(beamPulse, 1, beamPulse);
        if (pt.skyBeam instanceof THREE.Mesh && pt.skyBeam.material instanceof THREE.MeshBasicMaterial) {
          pt.skyBeam.material.color.lerp(_color, portalLightLerp * 0.65);
          pt.skyBeam.material.opacity = 0.22 + lightState.wave01 * 0.14;
        }
      }
      pt.s1.position.y = 1.98 + Math.sin(t * 3.2 + i) * 0.14;
      pt.s2.position.y = 1.98 + Math.cos(t * 3.2 + i) * 0.14;
      if (pt.screen) {
        pt.screen.rotation.y = sway * 0.85;
        pt.screen.position.y = 1.18 + Math.sin(t * 2.2 + i) * 0.035;
      }
      if (pt.crest) {
        pt.crest.rotation.y = sway * 0.85;
        pt.crest.position.y = 1.74 + Math.sin(t * 2.2 + i) * 0.035;
      }
    }
    for (let i = 0; i < this.animatedBoosts.length; i++) {
      const bs = this.animatedBoosts[i];
      bs.core.rotation.y = t * 2.4 + i;
      bs.ring.scale.setScalar(0.92 + Math.sin(t * 4.5 + i) * 0.08);
    }

    // 7. Animate Alpine Lakes & Floating Snow / Fireflies (wrapping smoothly around the player)
    for (const wm of this.waterMeshes) {
      wm.position.y = WATER_LEVEL + Math.sin(t * 1.3) * 0.06;
    }
    if (this.ambientMotes && this.ambientMotePositions) {
      const posAttr = this.ambientMotes.geometry.attributes.position as THREE.BufferAttribute;
      const isJungle = this.biome === 'jungle';
      const wrapR = 72;
      for (let i = 0; i < this.ambientMotePositions.length / 3; i++) {
        const ix = i * 3;
        if (isJungle) {
          this.ambientMotePositions[ix] += Math.sin(t * 0.6 + i) * dt * 0.4;
          this.ambientMotePositions[ix + 1] += Math.cos(t * 0.8 + i * 0.7) * dt * 0.25;
        } else {
          this.ambientMotePositions[ix] += Math.sin(t * 0.4 + i) * dt * 0.75;
          this.ambientMotePositions[ix + 1] -= dt * 1.35;
        }
        // Keep ambient motes wrapped around player across the massive 480-unit continent
        const dx = this.ambientMotePositions[ix] - snake.head.x;
        const dz = this.ambientMotePositions[ix + 2] - snake.head.z;
        if (dx > wrapR) this.ambientMotePositions[ix] -= wrapR * 2;
        else if (dx < -wrapR) this.ambientMotePositions[ix] += wrapR * 2;
        if (dz > wrapR) this.ambientMotePositions[ix + 2] -= wrapR * 2;
        else if (dz < -wrapR) this.ambientMotePositions[ix + 2] += wrapR * 2;

        const groundY = terrainHeightAt(
          this.ambientMotePositions[ix],
          this.ambientMotePositions[ix + 2],
          this.biome,
        );
        if (this.ambientMotePositions[ix + 1] < groundY + 0.5 || this.ambientMotePositions[ix + 1] > groundY + 32) {
          this.ambientMotePositions[ix + 1] = groundY + (isJungle ? 3 + (i % 14) : 24);
        }
      }
      posAttr.needsUpdate = true;
    }

    // 8. Update Pooled Burst Particles
    let anyActive = false;
    for (let i = 0; i < MAX_BURST_PARTICLES; i++) {
      const p = this.burstParticles[i];
      if (!p.active) continue;
      anyActive = true;
      p.age += dt;
      if (p.age >= p.life) {
        p.active = false;
        _mat4.makeScale(0, 0, 0);
        this.burstInstanced.setMatrixAt(i, _mat4);
        continue;
      }
      p.vel.y -= 10.5 * dt;
      p.pos.addScaledVector(p.vel, dt);
      const s = p.scale * (1 - p.age / p.life);
      _euler.set(p.age * 7, p.age * 5, 0);
      _quat.setFromEuler(_euler);
      _scale.setScalar(Math.max(0.001, s));
      _mat4.compose(p.pos, _quat, _scale);
      this.burstInstanced.setMatrixAt(i, _mat4);
      this.burstInstanced.setColorAt(i, p.color);
    }
    if (anyActive) {
      this.burstInstanced.instanceMatrix.needsUpdate = true;
      if (this.burstInstanced.instanceColor) {
        this.burstInstanced.instanceColor.needsUpdate = true;
      }
    }

    // 8b. Update Soul Clan Skill 3D Vortex Particles & Celebratory Evolution Explosion
    this.updateSoulSkillEffect(dt);
    this.updateEvolutionExplosion(dt);

    // 9. Smooth Terrain-Aware GTA / Ant Camera + Cascaded Shadow Map Update
    if (!this.xrActive) {
      this.updateCamera(dt, snake, gameMode, cameraMode);
    }

    // 10. Procedural Mountain Weather (mist/fog billows, slanted light rain, splashes, atmospheric damping)
    const weatherFocusX = gameMode === 'playing' || gameMode === 'paused' ? snake.head.x : this.currentLookAt.x;
    const weatherFocusY = gameMode === 'playing' || gameMode === 'paused' ? snake.head.y : this.currentLookAt.y;
    const weatherFocusZ = gameMode === 'playing' || gameMode === 'paused' ? snake.head.z : this.currentLookAt.z;
    this.updateWeather(dt, weatherFocusX, weatherFocusY, weatherFocusZ);

    if (this.csm) {
      this.camera.updateMatrixWorld();
      if (Math.abs(this.camera.fov - this.lastCsmFov) > 0.25) {
        this.lastCsmFov = this.camera.fov;
        this.csm.updateFrustums();
      }
      this.csm.update();
    }
  }

  private updateCamera(
    dt: number,
    snake: RenderSnakeState,
    gameMode: GameMode,
    cameraMode: CameraMode,
  ): void {
    let targetFov = 54;
    let dampLambda = 5.2;

    if (gameMode === 'title') {
      // Sweeping scenic flyover across the snow-capped mountains & valleys!
      this.titleOrbitAngle += dt * 0.085;
      const radius = 64;
      const cx = Math.sin(this.titleOrbitAngle) * radius;
      const cz = Math.cos(this.titleOrbitAngle) * radius - 14;
      const groundAtCam = terrainHeightAt(cx, cz, this.biome);
      this.cameraTargetPos.set(cx, Math.max(groundAtCam + 12, 28 + Math.sin(this.titleOrbitAngle * 0.8) * 5), cz);
      this.cameraLookAt.set(0, 12, -24);
      targetFov = 52;
      dampLambda = 2.2;
    } else if (gameMode === 'ascended' || gameMode === 'evolving') {
      // Triumphant 360° showcase orbit around your newly evolved form atop the mountain!
      this.titleOrbitAngle += dt * 0.42;
      const orbitR = gameMode === 'ascended' ? 6.2 : 7.4;
      const cx = snake.head.x + Math.sin(this.titleOrbitAngle) * orbitR;
      const cz = snake.head.z + Math.cos(this.titleOrbitAngle) * orbitR;
      const groundAtCam = terrainHeightAt(cx, cz, this.biome);
      this.cameraTargetPos.set(cx, Math.max(groundAtCam + 1.8, snake.head.y + 2.8), cz);
      this.cameraLookAt.set(snake.head.x, snake.head.y + 1.5, snake.head.z);
      targetFov = 48;
      dampLambda = 3.8;
    } else if (gameMode === 'builder') {
      const horiz = Math.cos(this.builderPitch) * this.builderDist;
      const cx = this.builderFocus.x + Math.sin(this.builderYaw) * horiz;
      const cy = this.builderFocus.y + Math.sin(this.builderPitch) * this.builderDist;
      const cz = this.builderFocus.z + Math.cos(this.builderYaw) * horiz;
      const minGround = terrainHeightAt(cx, cz, this.biome) + 6;
      this.cameraTargetPos.set(cx, Math.max(cy, minGround), cz);
      this.cameraLookAt.copy(this.builderFocus);
      targetFov = 48;
      dampLambda = 5.5;
    } else {
      // Smooth heading follow with shortest-arc wrapping
      const angleDiff =
        ((snake.head.heading - this.smoothHeading + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      this.smoothHeading += angleDiff * (1 - Math.exp(-6.0 * dt));

      const dirX = Math.sin(this.smoothHeading);
      const dirZ = Math.cos(this.smoothHeading);

      if (cameraMode === 'ant') {
        // ANT VIEW: low-to-the-ground wide GTA chase hugging the mountainside so peaks & pines tower overhead!
        const backDist = 5.6;
        const camX = snake.head.x - dirX * backDist;
        const camZ = snake.head.z - dirZ * backDist;
        const groundBehind = terrainHeightAt(camX, camZ, this.biome);
        const camY = Math.max(snake.head.y + 2.15, groundBehind + 1.65);

        const lookAheadDist = 9.0;
        const lookX = snake.head.x + dirX * lookAheadDist;
        const lookZ = snake.head.z + dirZ * lookAheadDist;
        const lookGround = terrainHeightAt(lookX, lookZ, this.biome);
        const lookY = Math.max(snake.head.y + 1.45, lookGround + 1.35);

        this.cameraTargetPos.set(camX, camY, camZ);
        this.cameraLookAt.set(lookX, lookY, lookZ);
        targetFov = snake.boostActive ? 65 : 60;
        dampLambda = 6.2;
      } else if (cameraMode === 'chase') {
        // GTA MOUNTAIN CHASE: commanding cinematic 3rd-person view over slopes & valleys
        const backDist = 11.8;
        const camX = snake.head.x - dirX * backDist;
        const camZ = snake.head.z - dirZ * backDist;
        const groundBehind = terrainHeightAt(camX, camZ, this.biome);
        const camY = Math.max(snake.head.y + 5.4, groundBehind + 2.6);

        const lookAheadDist = 8.5;
        const lookX = snake.head.x + dirX * lookAheadDist;
        const lookZ = snake.head.z + dirZ * lookAheadDist;
        const lookGround = terrainHeightAt(lookX, lookZ, this.biome);
        const lookY = Math.max(snake.head.y + 1.2, lookGround + 0.8);

        this.cameraTargetPos.set(camX, camY, camZ);
        this.cameraLookAt.set(lookX, lookY, lookZ);
        targetFov = snake.boostActive ? 57 : 52;
        dampLambda = 5.4;
      } else {
        // EAGLE MAP VIEW: high soaring alpine panorama following your serpent
        const camX = snake.head.x - dirX * 16;
        const camZ = snake.head.z - dirZ * 16;
        const camY = Math.max(snake.head.y + 30, terrainHeightAt(camX, camZ, this.biome) + 22);
        this.cameraTargetPos.set(camX, camY, camZ);
        this.cameraLookAt.set(snake.head.x + dirX * 5, snake.head.y + 1, snake.head.z + dirZ * 5);
        targetFov = 48;
        dampLambda = 4.6;
      }
    }

    // Step 2D screen-space camera projection shake, roll & FOV recoil punch
    this.gunScreenFovKick = THREE.MathUtils.damp(this.gunScreenFovKick, 0, 18, dt);
    if (this.gunScreenFovKick < 0.005) this.gunScreenFovKick = 0;
    const effectiveTargetFov = targetFov + this.gunScreenFovKick;

    if (Math.abs(this.camera.fov - effectiveTargetFov) > 0.02) {
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, effectiveTargetFov, 8.5, dt);
      this.camera.updateProjectionMatrix();
    }

    const ssAccelX = -255 * this.gunScreenShakeX - 21 * this.gunScreenShakeVelX;
    const ssAccelY = -255 * this.gunScreenShakeY - 21 * this.gunScreenShakeVelY;
    const ssAccelR = -240 * this.gunScreenRoll - 20 * this.gunScreenRollVel;
    this.gunScreenShakeVelX += ssAccelX * dt;
    this.gunScreenShakeVelY += ssAccelY * dt;
    this.gunScreenRollVel += ssAccelR * dt;
    this.gunScreenShakeX += this.gunScreenShakeVelX * dt;
    this.gunScreenShakeY += this.gunScreenShakeVelY * dt;
    this.gunScreenRoll += this.gunScreenRollVel * dt;

    const hasScreenSpaceShake =
      Math.abs(this.gunScreenShakeX) > 0.0002 ||
      Math.abs(this.gunScreenShakeY) > 0.0002 ||
      Math.abs(this.gunScreenShakeVelX) > 0.001 ||
      Math.abs(this.gunScreenShakeVelY) > 0.001 ||
      Math.abs(this.gunScreenRoll) > 0.0002;

    if (!hasScreenSpaceShake) {
      if (this.gunScreenShakeX !== 0 || this.gunScreenShakeY !== 0 || this.gunScreenRoll !== 0) {
        this.gunScreenShakeX = 0;
        this.gunScreenShakeY = 0;
        this.gunScreenShakeVelX = 0;
        this.gunScreenShakeVelY = 0;
        this.gunScreenRoll = 0;
        this.gunScreenRollVel = 0;
        this.camera.updateProjectionMatrix();
      }
    }

    this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, this.cameraTargetPos.x, dampLambda, dt);
    this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, this.cameraTargetPos.y, dampLambda, dt);
    this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, this.cameraTargetPos.z, dampLambda, dt);

    // Safety clamp so damped camera never dips inside a hillside
    if (gameMode !== 'title') {
      const floorY = terrainHeightAt(this.camera.position.x, this.camera.position.z, this.biome) + 1.2;
      if (this.camera.position.y < floorY) {
        this.camera.position.y = floorY;
      }
    }

    this.currentLookAt.x = THREE.MathUtils.damp(this.currentLookAt.x, this.cameraLookAt.x, dampLambda + 1.8, dt);
    this.currentLookAt.y = THREE.MathUtils.damp(this.currentLookAt.y, this.cameraLookAt.y, dampLambda + 1.8, dt);
    this.currentLookAt.z = THREE.MathUtils.damp(this.currentLookAt.z, this.cameraLookAt.z, dampLambda + 1.8, dt);

    const kickY = this.gunCamKick > 0.002 ? this.gunCamKick * 1.18 : 0;
    if (this.gunCamKick > 0.002) {
      this.gunCamKick = THREE.MathUtils.damp(this.gunCamKick, 0, 14, dt);
    } else {
      this.gunCamKick = 0;
    }

    if (this.shakeIntensity > 0.004 || kickY > 0) {
      const sx = this.shakeIntensity > 0.004 ? (Math.random() - 0.5) * this.shakeIntensity : 0;
      const sy = (this.shakeIntensity > 0.004 ? (Math.random() - 0.5) * this.shakeIntensity * 0.7 : 0) + kickY;
      _vec3B.copy(this.currentLookAt).add(_vec3A.set(sx, sy, 0));
      this.camera.lookAt(_vec3B);
      this.shakeIntensity = THREE.MathUtils.damp(this.shakeIntensity, 0, 11, dt);
    } else {
      this.shakeIntensity = 0;
      this.camera.lookAt(this.currentLookAt);
    }

    // Apply 2D screen-space camera roll & NDC projection matrix shake offset
    if (hasScreenSpaceShake) {
      this.camera.rotation.z += this.gunScreenRoll;
      this.camera.updateProjectionMatrix();
      this.camera.projectionMatrix.elements[8] += this.gunScreenShakeX;
      this.camera.projectionMatrix.elements[9] += this.gunScreenShakeY;
      this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert();
    }
  }

  /**
   * Optional WebXR tabletop AR/VR session launcher (kept available under the hood).
   */
  public async tryEnterXR(): Promise<{ supported: boolean; message: string }> {
    const nav = navigator as Navigator & { xr?: XRSystem };
    if (!nav.xr) {
      return {
        supported: false,
        message: 'No WebXR headset detected on this browser.',
      };
    }
    try {
      const arSupported = await nav.xr.isSessionSupported('immersive-ar');
      const vrSupported = !arSupported && (await nav.xr.isSessionSupported('immersive-vr'));
      if (!arSupported && !vrSupported) {
        return { supported: false, message: 'No WebXR headset connected.' };
      }
      const mode = arSupported ? 'immersive-ar' : 'immersive-vr';
      const session = await nav.xr.requestSession(mode, {
        optionalFeatures: ['local-floor', 'hand-tracking'],
      });
      this.renderer.xr.enabled = true;
      await this.renderer.xr.setSession(session);
      this.xrActive = true;
      this.worldRoot.scale.setScalar(0.015);
      this.worldRoot.position.set(0, 0.85, -1.2);
      if (arSupported) this.scene.background = null;
      session.addEventListener('end', () => {
        this.xrActive = false;
        this.worldRoot.scale.setScalar(1);
        this.worldRoot.position.set(0, 0, 0);
        this.setBiome(this.biome);
      });
      return { supported: true, message: `Entered ${mode.toUpperCase()} Mode!` };
    } catch {
      return { supported: false, message: 'Could not start WebXR session.' };
    }
  }

  public start(onFrame: (dt: number) => void): void {
    this.onFrameCallback = onFrame;
    this.running = true;
    this.lastTickPerf = performance.now();

    if (this.isSoftwareGl) {
      this.tickSoftware();
    } else {
      this.renderer.setAnimationLoop(this.tickHardware);
    }
  }

  private renderFrame(): void {
    if (this.xrActive) {
      this.renderer.autoClear = true;
      this.renderer.render(this.scene, this.camera);
      return;
    }
    this.renderer.autoClear = false;
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
    this.renderer.clearDepth();
    this.renderer.render(this.overlayScene, this.overlayCamera);

    // Shader-based Screen Frost Edge-Blur pass (only runs while blizzard frost is visible)
    const frostIntensity = this.frostOverlayMat.uniforms.uFrostIntensity.value as number;
    if (frostIntensity > 0.004) {
      if (!this.isSoftwareGl) {
        const sceneTex = this.ensureFrostFrameTexture();
        this.renderer.copyFramebufferToTexture(sceneTex);
        this.frostOverlayMat.uniforms.tScene.value = sceneTex;
        this.frostOverlayMat.uniforms.uHasSceneTex.value = 1.0;
      } else {
        this.frostOverlayMat.uniforms.uHasSceneTex.value = 0.0;
      }
      this.renderer.render(this.frostOverlayScene, this.overlayCamera);
    }
  }

  private tickHardware = (): void => {
    if (!this.running) return;
    const now = performance.now();
    const rawDt = (now - this.lastTickPerf) / 1000;
    this.lastTickPerf = now;
    const dt = Math.min(Math.max(rawDt, 0.001), 0.05);

    this.onFrameCallback?.(dt);
    this.renderFrame();
  };

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (gl && typeof gl.fenceSync === 'function') {
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (!this.running) {
          if (sync) gl.deleteSync(sync);
          return;
        }
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          this.frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          this.frameId = window.setTimeout(cb, 80);
        }
      };
      this.frameId = window.setTimeout(poll, 5);
    } else {
      this.frameId = window.setTimeout(cb, 80);
    }
  }

  private tickSoftware = (): void => {
    if (!this.running) return;
    const now = performance.now();
    const rawDt = (now - this.lastTickPerf) / 1000;
    this.lastTickPerf = now;
    const dt = Math.min(Math.max(rawDt, 0.001), 0.05);

    this.onFrameCallback?.(dt);
    this.renderFrame();
    this.afterDraw(this.tickSoftware);
  };

  private handleResize = (): void => {
    const w = this.container.clientWidth || window.innerWidth;
    const h = Math.max(1, this.container.clientHeight || window.innerHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    if (this.weatherOverlayMat) {
      this.weatherOverlayMat.uniforms.uAspect.value = w / h;
    }
    if (this.frostOverlayMat) {
      this.frostOverlayMat.uniforms.uAspect.value = w / h;
    }
    this.csm?.updateFrustums();
  };

  /**
   * Apply a graphics quality preset: 'low' | 'medium' | 'high'.
   * Safe to call at any time — no restart required.
   */
  public setGraphicsQuality(quality: 'low' | 'medium' | 'high'): void {
    if (this.isSoftwareGl) return; // software renderer — keep fixed settings
    switch (quality) {
      case 'low':
        this.renderer.setPixelRatio(1);
        this.renderer.shadowMap.enabled = false;
        this.renderer.shadowMap.type = THREE.BasicShadowMap;
        if (this.csm) { this.csm.maxFar = 60; this.csm.updateFrustums(); }
        this.renderer.toneMappingExposure = 0.98;
        break;
      case 'medium':
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFShadowMap;
        if (this.csm) { this.csm.maxFar = 120; this.csm.updateFrustums(); }
        this.renderer.toneMappingExposure = 1.02;
        break;
      case 'high':
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        if (this.csm) { this.csm.maxFar = 200; this.csm.updateFrustums(); }
        this.renderer.toneMappingExposure = 1.06;
        break;
    }
  }

  /**
   * Projects a 3D world point directly above the serpent's head or half-human crown
   * into viewport pixel coordinates so floating combat taunt bubbles track the player in 3D.
   */
  public getSerpentBubbleScreenPosition(
    evolutionLevel = this.activeEvolutionLevel,
  ): { x: number; y: number; visible: boolean } {
    const heightOffset = evolutionLevel >= 10 ? 2.55 : evolutionLevel >= 8 ? 2.2 : 1.65;
    _vec3A.set(
      this.lastSnakeHeadPos.x,
      this.lastSnakeHeadPos.y + heightOffset,
      this.lastSnakeHeadPos.z,
    );
    _vec3A.project(this.camera);

    const width = this.container.clientWidth || window.innerWidth || 1280;
    const height = this.container.clientHeight || window.innerHeight || 720;

    // Behind camera frustum check
    if (_vec3A.z > 1.0 || _vec3A.z < -1.0) {
      return { x: width * 0.5, y: height * 0.38, visible: false };
    }

    const rawX = (_vec3A.x * 0.5 + 0.5) * width;
    const rawY = (-_vec3A.y * 0.5 + 0.5) * height;
    const padX = Math.min(180, width * 0.2);
    const padTop = 76;
    const padBottom = 110;

    const x = Math.max(padX, Math.min(width - padX, rawX));
    const y = Math.max(padTop, Math.min(height - padBottom, rawY));
    return { x, y, visible: true };
  }

  private ensurePortalBrowserTexture(variant: 'A' | 'B'): THREE.CanvasTexture | null {
    if (typeof document === 'undefined') return null;
    if (variant === 'A') {
      if (!this.portalCanvasA) {
        this.portalCanvasA = document.createElement('canvas');
        this.portalCanvasA.width = 480;
        this.portalCanvasA.height = 396;
        this.portalTexA = new THREE.CanvasTexture(this.portalCanvasA);
        this.portalTexA.colorSpace = THREE.SRGBColorSpace;
      }
      return this.portalTexA;
    }
    if (!this.portalCanvasB) {
      this.portalCanvasB = document.createElement('canvas');
      this.portalCanvasB.width = 480;
      this.portalCanvasB.height = 396;
      this.portalTexB = new THREE.CanvasTexture(this.portalCanvasB);
      this.portalTexB.colorSpace = THREE.SRGBColorSpace;
    }
    return this.portalTexB;
  }

  /**
   * Redraws the 3D holographic Chromium browser tab canvas textures inside Portal A & Portal B.
   */
  public refreshPortalBrowserTextures(
    drawFn: (ctx: CanvasRenderingContext2D, variant: 'A' | 'B', pulsePhase: number) => void,
  ): void {
    const texA = this.ensurePortalBrowserTexture('A');
    if (texA && this.portalCanvasA) {
      const ctxA = this.portalCanvasA.getContext('2d');
      if (ctxA) {
        drawFn(ctxA, 'A', this.elapsed);
        texA.needsUpdate = true;
      }
    }
    const texB = this.ensurePortalBrowserTexture('B');
    if (texB && this.portalCanvasB) {
      const ctxB = this.portalCanvasB.getContext('2d');
      if (ctxB) {
        drawFn(ctxB, 'B', this.elapsed);
        texB.needsUpdate = true;
      }
    }
  }

  public dispose(): void {
    this.running = false;
    this.renderer.setAnimationLoop(null);
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    window.removeEventListener('resize', this.handleResize);
    if (this.csm) {
      this.csm.remove();
      this.csm.dispose();
      this.csm = null;
    }
    this.mistTexture?.dispose();
    this.sparkGlowMap?.dispose();
    this.evoShardInstanced?.geometry.dispose();
    (this.evoShardInstanced?.material as THREE.Material | undefined)?.dispose();
    this.evoSparkPoints?.geometry.dispose();
    this.evoSparkMat?.dispose();
    if (this.evoRings.length > 0) {
      this.evoRings[0].mesh.geometry.dispose();
      for (const r of this.evoRings) r.mat.dispose();
    }
    this.evoPillarMesh?.geometry.dispose();
    this.evoPillarMat?.dispose();
    this.mistPoints?.geometry.dispose();
    this.mistMat?.dispose();
    this.rainLines?.geometry.dispose();
    this.rainMat?.dispose();
    this.splashInstanced?.geometry.dispose();
    this.splashMat?.dispose();
    this.climateParticles?.geometry.dispose();
    this.climateParticleMat?.dispose();
    this.weatherOverlayMesh?.geometry.dispose();
    this.weatherOverlayMat?.dispose();
    this.frostOverlayMesh?.geometry.dispose();
    this.frostOverlayMat?.dispose();
    this.frostFrameTexture?.dispose();
    this.soulVortexPoints?.geometry.dispose();
    this.soulVortexMat?.dispose();
    this.soulVortexRingMesh?.geometry.dispose();
    this.soulVortexRingMat?.dispose();
    this.renderer.dispose();
  }
}
