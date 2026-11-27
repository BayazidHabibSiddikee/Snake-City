import { WORLD_LANDMARKS, type MountainLandmark } from './terrain.ts';

export type PortalActivationPhase = 'sealed' | 'awakening' | 'igniting' | 'open';

export const PORTAL_ACTIVATION_TRIGGER_RADIUS = 28;
export const PORTAL_OPEN_DURATION_SEC = 2.6;
export const PORTAL_ENTRY_READY_THRESHOLD = 0.92;
/** Maximum horizontal distance (meters) at which the top HUD Portal Distance indicator appears. */
export const PORTAL_DISTANCE_HUD_RANGE = 95;

export interface NearestPeakPortalInfo {
  portalId: string;
  peakTier: number;
  peakName: string;
  distanceMeters: number;
  maxRangeMeters: number;
  proximityFrac: number;
  requiredRank: number;
  unlocked: boolean;
  phase: PortalActivationPhase;
  accentHex: number;
}

export interface PortalActivationState {
  portalId: string;
  requiredRank: number;
  landmarkId: string | null;
  landmarkName: string;
  accentHex: number;
  phase: PortalActivationPhase;
  /** Monotonic activation progress in [0, 1] once triggered by a qualified cultivator. */
  openProgress: number;
  /** True once the player has met the rank and triggered the opening sequence at least once. */
  triggered: boolean;
}

export interface PortalActivationSnapshot extends PortalActivationState {
  unlocked: boolean;
  canEnter: boolean;
  ringSpinSpeed: number;
  vortexAperture: number;
  particleSwirl: number;
  shockwaveFlash: number;
  skyBeamFactor: number;
  screenOpacity: number;
  emissiveIntensity: number;
}

export interface PortalActivationStepResult {
  snapshot: PortalActivationSnapshot;
  justStartedOpening: boolean;
  justFinishedOpening: boolean;
}

/**
 * Parses the required Cultivation Rank (1..12) from a Trial Peak portal ID
 * (`peak-portal-<tier>-<landmarkId>`). Defaults to 1 for custom builder portals.
 */
export function getPortalRequiredRank(portalId: string): number {
  const match = /^peak-portal-(\d+)-/.exec(portalId);
  if (match) {
    const parsed = parseInt(match[1], 10);
    if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 12) {
      return parsed;
    }
  }
  return 1;
}

/**
 * Resolves the Trial Peak landmark associated with a peak portal ID (if any).
 */
export function getPortalLandmark(portalId: string): MountainLandmark | null {
  const rank = getPortalRequiredRank(portalId);
  if (!portalId.startsWith('peak-portal-')) return null;
  return WORLD_LANDMARKS.find((lm) => lm.tier === rank) ?? null;
}

export function createInitialPortalActivation(portalId: string): PortalActivationState {
  const requiredRank = getPortalRequiredRank(portalId);
  const landmark = getPortalLandmark(portalId);
  return {
    portalId,
    requiredRank,
    landmarkId: landmark?.id ?? null,
    landmarkName: landmark?.name ?? `Rank ${requiredRank} Peak`,
    accentHex: landmark?.accentHex ?? 0x2de3ff,
    phase: 'sealed',
    openProgress: 0,
    triggered: false,
  };
}

/**
 * Computes derived 3D shader, particle, lighting, and spin parameters from the
 * portal's current activation progress and player rank eligibility.
 */
export function computePortalActivationSnapshot(
  state: PortalActivationState,
  playerRank: number,
): PortalActivationSnapshot {
  const unlocked = playerRank >= state.requiredRank;
  const p = unlocked ? Math.max(0, Math.min(1, state.openProgress)) : 0;

  let phase: PortalActivationPhase = 'sealed';
  if (unlocked && (state.triggered || p > 0)) {
    if (p >= PORTAL_ENTRY_READY_THRESHOLD) {
      phase = 'open';
    } else if (p >= 0.42) {
      phase = 'igniting';
    } else {
      phase = 'awakening';
    }
  }

  // Smooth S-curve iris opening starting during awakening and blooming through ignition
  const irisRaw = Math.max(0, Math.min(1, (p - 0.12) / 0.76));
  const vortexAperture = Number(
    (irisRaw * irisRaw * (3 - 2 * irisRaw)).toFixed(4),
  );

  // Ignition shockwave peaks sharply around openProgress = 0.72 as the rift tears open
  const shockDist = (p - 0.72) / 0.18;
  const shockwaveFlash =
    unlocked && p > 0.38 && p < 0.99
      ? Number(Math.exp(-shockDist * shockDist * 2.2).toFixed(4))
      : 0;

  // Ring spin: nearly motionless when sealed, surges up to 4.8x during opening, settles to 1.4x
  const surgeBell = Math.sin(Math.PI * Math.min(1, p));
  const ringSpinSpeed =
    phase === 'sealed'
      ? 0.08
      : Number((0.45 + p * 0.95 + surgeBell * 3.4).toFixed(3));

  // Particle swirl intensity: dormant dust when sealed, high-energy funnel/burst during opening
  const particleSwirl =
    phase === 'sealed'
      ? 0.0
      : Number((0.25 + p * 0.75 + surgeBell * 0.85).toFixed(3));

  // Sky beacon: whisper-faint dormant column when sealed, flares dramatically on ignition
  const skyBeamFactor =
    phase === 'sealed'
      ? 0.05
      : Number((0.12 + vortexAperture * 0.88 + shockwaveFlash * 0.55).toFixed(3));

  // Holographic Chromium screen only materializes once the vortex has torn open
  const screenOpacity =
    phase === 'sealed'
      ? 0
      : Number(Math.max(0, Math.min(1, (p - 0.64) / 0.3)).toFixed(3));

  // Emissive rune intensity
  const emissiveIntensity =
    phase === 'sealed'
      ? 0.16
      : Number((0.35 + p * 1.4 + shockwaveFlash * 1.15).toFixed(3));

  const canEnter = unlocked && p >= PORTAL_ENTRY_READY_THRESHOLD;

  return {
    ...state,
    phase,
    openProgress: Number(p.toFixed(4)),
    unlocked,
    canEnter,
    ringSpinSpeed,
    vortexAperture,
    particleSwirl,
    shockwaveFlash,
    skyBeamFactor,
    screenOpacity,
    emissiveIntensity,
  };
}

/**
 * Advances a single portal's rank-gated opening sequence by `dt` seconds.
 * - Remains strictly `sealed` (`openProgress = 0`, `canEnter = false`) whenever
 *   `playerRank < requiredRank`.
 * - Once `playerRank >= requiredRank` and the player approaches within
 *   `PORTAL_ACTIVATION_TRIGGER_RADIUS` (28m), initiates the 2.6-second animated
 *   opening sequence (`awakening -> igniting -> open`).
 */
export function stepPortalActivation(
  prev: PortalActivationState,
  playerRank: number,
  distanceToPlayer: number,
  dt: number,
): PortalActivationStepResult {
  const safeDt = Math.max(0, Math.min(0.25, Number.isFinite(dt) ? dt : 0));
  const unlocked = playerRank >= prev.requiredRank;

  if (!unlocked) {
    const sealedState: PortalActivationState = {
      ...prev,
      phase: 'sealed',
      openProgress: 0,
      triggered: false,
    };
    return {
      snapshot: computePortalActivationSnapshot(sealedState, playerRank),
      justStartedOpening: false,
      justFinishedOpening: false,
    };
  }

  let triggered = prev.triggered;
  let justStartedOpening = false;
  if (!triggered && distanceToPlayer <= PORTAL_ACTIVATION_TRIGGER_RADIUS) {
    triggered = true;
    justStartedOpening = true;
  }

  const prevReady = prev.openProgress >= PORTAL_ENTRY_READY_THRESHOLD;
  let nextProgress = prev.openProgress;
  if (triggered && nextProgress < 1) {
    nextProgress = Math.min(1, nextProgress + safeDt / PORTAL_OPEN_DURATION_SEC);
  }

  const nextState: PortalActivationState = {
    ...prev,
    triggered,
    openProgress: nextProgress,
    phase: !triggered
      ? 'sealed'
      : nextProgress >= PORTAL_ENTRY_READY_THRESHOLD
        ? 'open'
        : nextProgress >= 0.42
          ? 'igniting'
          : 'awakening',
  };

  const snapshot = computePortalActivationSnapshot(nextState, playerRank);
  const justFinishedOpening = !prevReady && snapshot.canEnter;

  return {
    snapshot,
    justStartedOpening,
    justFinishedOpening,
  };
}

/**
 * Finds the nearest of the 12 Trial Peak portals within `maxRangeMeters` of the
 * player for the top HUD 'Portal Distance' indicator. Returns `null` when the
 * player is outside range of all 12 peak portals.
 */
export function findNearestPeakPortalInRange(
  props: ReadonlyArray<{ id: string; type: string; x: number; z: number }>,
  playerX: number,
  playerZ: number,
  playerRank: number,
  activations?: ReadonlyMap<string, PortalActivationSnapshot>,
  maxRangeMeters = PORTAL_DISTANCE_HUD_RANGE,
): NearestPeakPortalInfo | null {
  const safeRange = Math.max(1, Number.isFinite(maxRangeMeters) ? maxRangeMeters : PORTAL_DISTANCE_HUD_RANGE);
  let bestProp: { id: string; type: string; x: number; z: number } | null = null;
  let bestDist = Infinity;

  for (const prop of props) {
    if (prop.type !== 'portalA' && prop.type !== 'portalB') continue;
    if (!prop.id.startsWith('peak-portal-')) continue;
    const dist = Math.hypot(prop.x - playerX, prop.z - playerZ);
    if (dist <= safeRange && dist < bestDist) {
      bestDist = dist;
      bestProp = prop;
    }
  }

  if (!bestProp) return null;

  const requiredRank = getPortalRequiredRank(bestProp.id);
  const landmark = getPortalLandmark(bestProp.id);
  const activation = activations?.get(bestProp.id);
  const unlocked = playerRank >= requiredRank;
  const phase: PortalActivationPhase = unlocked ? (activation?.phase ?? 'sealed') : 'sealed';
  const proximityFrac = Number(Math.max(0, Math.min(1, 1 - bestDist / safeRange)).toFixed(3));

  return {
    portalId: bestProp.id,
    peakTier: landmark?.tier ?? requiredRank,
    peakName: activation?.landmarkName ?? landmark?.name ?? `Peak ${requiredRank}`,
    distanceMeters: Math.max(0, Math.round(bestDist)),
    maxRangeMeters: safeRange,
    proximityFrac,
    requiredRank,
    unlocked,
    phase,
    accentHex: activation?.accentHex ?? landmark?.accentHex ?? 0x58e1ff,
  };
}

/**
 * Custom GLSL Vertex Shader for the 12-Peak Dimensional Vortex & Ancient Seal aperture.
 */
export const PORTAL_VORTEX_VERTEX_SHADER = `
varying vec2 vUv;
varying vec3 vLocalPos;

void main() {
  vUv = uv;
  vLocalPos = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

/**
 * Custom GLSL Fragment Shader rendering two distinct physical states plus a dramatic
 * animated opening tear:
 * 1. Sealed (uOpenProgress == 0): Ancient dark obsidian-jade rune seal with slow
 *    geometric fracture lines and dormant metallic glyphs.
 * 2. Awakening / Igniting (0 < uOpenProgress < 1): Fractures flare molten gold,
 *    a logarithmic polar plasma vortex spins up from center, an expanding circular
 *    rift iris tears open with a crackling gold-white rim, and a shockwave sweeps out.
 * 3. Open (uOpenProgress == 1): Luminous swirling dimensional aura framing the active
 *    portal gateway without obscuring the inner holographic screen.
 */
export const PORTAL_VORTEX_FRAGMENT_SHADER = `
precision highp float;

varying vec2 vUv;
varying vec3 vLocalPos;

uniform float uTime;
uniform float uOpenProgress;
uniform float uVortexAperture;
uniform float uShockwave;
uniform float uUnlocked;
uniform vec3 uPrimaryColor;
uniform vec3 uSecondaryColor;
uniform vec3 uPeakAccent;

const float PI = 3.14159265359;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float amp = 0.52;
  for (int i = 0; i < 4; i++) {
    v += amp * valueNoise(p);
    p = p * 2.05 + vec2(13.7, -9.2);
    amp *= 0.5;
  }
  return v;
}

void main() {
  vec2 centered = (vUv - 0.5) * 2.0;
  float r = length(centered);
  if (r > 1.0) discard;

  float angle = atan(centered.y, centered.x);
  float edgeMask = 1.0 - smoothstep(0.92, 1.0, r);

  // --- 1. Dormant Ancient Seal Barrier (visible when sealed / early awakening) ---
  float runeRings = smoothstep(0.035, 0.0, abs(fract(r * 3.0) - 0.5) - 0.44);
  float spokeCount = 6.0;
  float spokeWave = abs(sin(angle * spokeCount + r * 1.4));
  float sealRunes = max(runeRings * 0.7, smoothstep(0.96, 1.0, spokeWave) * smoothstep(0.18, 0.9, r));

  // Cracks ignite gold during early awakening before the iris tears open
  float crackWake = smoothstep(0.0, 0.42, uOpenProgress);
  float dormantPulse = 0.5 + 0.5 * sin(uTime * 1.6 + r * 4.0);
  vec3 sealedBase = vec3(0.045, 0.068, 0.095);
  vec3 dormantRuneCol = mix(vec3(0.28, 0.36, 0.44), vec3(0.96, 0.78, 0.34), uUnlocked * 0.45 + crackWake * 0.55);
  vec3 sealedColor = sealedBase + dormantRuneCol * sealRunes * (0.32 + dormantPulse * 0.22 + crackWake * 1.45);
  float sealedAlpha = (0.76 - uVortexAperture * 0.72) * edgeMask;

  // --- 2. Swirling Polar Dimensional Plasma Vortex ---
  float twist = angle + 4.8 * log(max(0.06, r)) - uTime * (1.6 + uOpenProgress * 2.4);
  vec2 polarUv = vec2(cos(twist), sin(twist)) * (r * 2.8) + vec2(uTime * 0.35, -uTime * 0.28);
  float plasma = fbm(polarUv * 1.65);
  float spiralStreams = 0.5 + 0.5 * sin(angle * 5.0 - r * 11.0 + uTime * 3.4 + plasma * 4.2);

  // Expanding dimensional iris radius
  float irisRadius = mix(0.02, 1.02, uVortexAperture);
  float insideIris = 1.0 - smoothstep(irisRadius - 0.14, irisRadius + 0.04, r);
  float riftLip = exp(-pow((r - irisRadius) / 0.065, 2.0)) * smoothstep(0.02, 0.18, uOpenProgress) * (1.0 - smoothstep(0.86, 1.0, uOpenProgress));

  vec3 vortexCol = mix(uPrimaryColor, uSecondaryColor, plasma);
  vortexCol = mix(vortexCol, uPeakAccent, spiralStreams * 0.48);
  vortexCol += vec3(1.0, 0.92, 0.72) * pow(spiralStreams, 3.0) * 0.42;

  // Expanding shockwave ring crest at peak ignition
  float shockRingPos = mix(0.08, 0.98, clamp((uOpenProgress - 0.42) / 0.52, 0.0, 1.0));
  float shockRing = exp(-pow((r - shockRingPos) / 0.075, 2.0)) * uShockwave;

  // Once fully open, keep center softly translucent so the holographic portal screen stays crisp,
  // while keeping an intense swirling plasma frame along the rim (r > 0.55)
  float openRimWeight = mix(1.0, smoothstep(0.32, 0.92, r) * 0.88 + 0.18, smoothstep(0.75, 1.0, uOpenProgress));
  float vortexAlpha = insideIris * (0.42 + plasma * 0.48) * openRimWeight * edgeMask;

  // Composite sealed barrier + active vortex + gold rift tear + ignition shockwave
  vec3 finalColor = mix(sealedColor, vortexCol, insideIris * smoothstep(0.05, 0.35, uOpenProgress));
  finalColor += vec3(1.0, 0.9, 0.62) * (riftLip * 1.45 + shockRing * 1.85);

  float finalAlpha = clamp(max(sealedAlpha, vortexAlpha) + riftLip * 0.92 + shockRing * 0.85, 0.0, 0.98) * edgeMask;
  gl_FragColor = vec4(finalColor, finalAlpha);
}
`;

/**
 * Custom GLSL Vertex Shader for the 3D GPU Particle Vortex around each Trial Peak Portal.
 * Runs 100% on the GPU:
 * - Sealed: tiny dormant dust motes resting low near the stone dais.
 * - Awakening: particles funnel inward & accelerate around the portal ring.
 * - Igniting: particles erupt radially outward & spiral upward in a 3D double helix.
 * - Open: graceful luminous orbital streams cycling continuously around the open gateway.
 */
export const PORTAL_PARTICLE_VERTEX_SHADER = `
attribute float aAngle;
attribute float aRadius;
attribute float aHeight;
attribute float aSpeed;
attribute float aSeed;
attribute float aSize;

uniform float uTime;
uniform float uOpenProgress;
uniform float uShockwave;
uniform float uPixelRatio;

varying float vAlpha;
varying float vHeat;
varying float vSeed;

void main() {
  float p = clamp(uOpenProgress, 0.0, 1.0);
  float wake = smoothstep(0.0, 0.45, p);
  float ignite = smoothstep(0.42, 0.92, p);

  // Spin velocity accelerates dramatically during opening sequence
  float spinRate = mix(0.22, 2.35, wake) + sin(3.14159265 * p) * 1.85;
  float theta = aAngle + uTime * aSpeed * spinRate + aSeed * 6.28318;

  // Radial choreography:
  // Sealed -> wide calm perimeter; Awakening -> tight inward pull; Ignition -> shockwave expansion; Open -> crisp orbital halo
  float inwardPull = sin(3.14159265 * min(1.0, p * 1.55)) * 0.34;
  float burstPush = uShockwave * (0.42 + aSeed * 0.45);
  float radius = max(0.14, aRadius * mix(0.95, 1.05, ignite) - inwardPull + burstPush);

  // Vertical helical lift centered around portal ring height (y = 1.18)
  float cycle = fract(aHeight + uTime * (0.06 + ignite * 0.24) * (0.65 + aSpeed * 0.5));
  float sealedY = 0.22 + aSeed * 0.45 + sin(uTime * 1.2 + aSeed * 9.0) * 0.05;
  float activeY = 0.25 + cycle * (1.95 + ignite * 0.85);
  float y = mix(sealedY, activeY, smoothstep(0.04, 0.55, p));

  // Depth oscillation through the portal archway plane
  float zWave = sin(theta * 1.5 + aSeed * 5.0) * mix(0.16, 0.42, ignite);
  vec3 pos = vec3(cos(theta) * radius, y, sin(theta) * (radius * 0.55) + zWave);

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  float baseSize = aSize * mix(0.42, 1.28, wake) * (1.0 + uShockwave * 0.65);
  gl_PointSize = clamp(baseSize * uPixelRatio * (18.0 / max(1.5, -mvPosition.z)), 1.5, 42.0);

  // Soft fade at top & bottom of vertical helical cycle
  float heightFade = smoothstep(0.0, 0.16, cycle) * (1.0 - smoothstep(0.82, 1.0, cycle));
  vAlpha = mix(0.16, 0.92 * heightFade, smoothstep(0.02, 0.35, p)) + uShockwave * 0.35;
  vHeat = clamp(wake * 0.5 + uShockwave * 0.75 + (1.0 - radius) * 0.35, 0.0, 1.0);
  vSeed = aSeed;
}
`;

/**
 * Custom GLSL Fragment Shader rendering glowing soft-core 3D energy motes with
 * gold-to-peak-accent color ramp.
 */
export const PORTAL_PARTICLE_FRAGMENT_SHADER = `
precision highp float;

uniform vec3 uPrimaryColor;
uniform vec3 uPeakAccent;

varying float vAlpha;
varying float vHeat;
varying float vSeed;

void main() {
  vec2 d = gl_PointCoord - 0.5;
  float dist = length(d);
  if (dist > 0.5) discard;

  float core = smoothstep(0.5, 0.06, dist);
  float hotCenter = smoothstep(0.24, 0.0, dist);

  vec3 baseCol = mix(uPrimaryColor, uPeakAccent, vSeed);
  vec3 goldCol = vec3(1.0, 0.89, 0.56);
  vec3 col = mix(baseCol, goldCol, vHeat * 0.62) + vec3(1.0) * hotCenter * 0.45;

  float alpha = core * clamp(vAlpha, 0.0, 1.0);
  gl_FragColor = vec4(col, alpha);
}
`;
