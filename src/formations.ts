import {
  isDeepWater,
  isInWorldBounds,
  isNearSpawn,
  terrainDownhillGradient,
  terrainHeightAt,
  WORLD_LANDMARKS,
} from './terrain.ts';
import {
  WATER_LEVEL,
  WORLD_PLAY_RADIUS,
  type BiomeId,
  type FormationData,
  type FormationProp,
  type PropType,
} from './types.ts';

export const PORTAL_NETWORK_TARGET_COUNT = 12;
export const SAFE_RESPAWN_MIN_PORTAL_CLEARANCE = 32;

const CUSTOM_STORAGE_KEY = 'serpent_peaks_mountain_courses_v3';
const BEST_SCORE_KEY = 'serpent_peaks_best_score_v1';

function buildProps(entries: Array<[number, number, PropType]>): FormationProp[] {
  const list: FormationProp[] = [];
  entries.forEach(([x, z, type], i) => {
    if (isInWorldBounds(x, z) && !isNearSpawn(x, z, 6.5)) {
      list.push({
        id: `p-${i}-${x}-${z}`,
        type,
        x,
        z,
      });
    }
  });
  return list;
}

/**
 * Computes a clean, dry side-terrace portal coordinate anchored to a specific Trial Peak.
 * Always positioned perpendicular/offset from the origin-to-peak approach so the snake
 * never spawns facing directly into a portal and every peak owns exactly one portal.
 */
function pickPeakPortalSpot(
  landmark: (typeof WORLD_LANDMARKS)[number],
  biome: BiomeId,
  angleStep = 0,
  minPlayerDist = 0,
  playerX = 0,
  playerZ = 0,
): { x: number; z: number } {
  // Base azimuth perpendicular to the spawn->peak vector so Peak 1 (0, -52) sits off to the side
  const fromOriginAngle = Math.atan2(landmark.z, landmark.x);
  const sideSign = landmark.tier % 2 === 1 ? 1 : -1;
  const baseAngle = fromOriginAngle + sideSign * (Math.PI * 0.5) + angleStep * 1.15;
  const ringRadius = landmark.radius + 10.5;

  for (let attempt = 0; attempt < 24; attempt++) {
    const angle = baseAngle + attempt * ((Math.PI * 2) / 24);
    const radius = ringRadius + (attempt >= 12 ? 4.5 : 0);
    const x = Math.round((landmark.x + Math.cos(angle) * radius) * 10) / 10;
    const z = Math.round((landmark.z + Math.sin(angle) * radius) * 10) / 10;

    if (!isInWorldBounds(x, z)) continue;
    if (Math.hypot(x, z) > WORLD_PLAY_RADIUS - 16) continue;
    if (isNearSpawn(x, z, 38)) continue;
    if (isDeepWater(x, z, biome)) continue;
    if (minPlayerDist > 0 && Math.hypot(x - playerX, z - playerZ) < minPlayerDist) continue;
    return { x, z };
  }

  // Fallback directly beside the peak outside spawn clearance
  const fallbackAngle = fromOriginAngle + sideSign * (Math.PI * 0.5);
  return {
    x: Math.round((landmark.x + Math.cos(fallbackAngle) * ringRadius) * 10) / 10,
    z: Math.round((landmark.z + Math.sin(fallbackAngle) * ringRadius) * 10) / 10,
  };
}

/**
 * Builds strictly 12 dedicated portals — exactly one portal anchored beside each
 * of the 12 Trial Peaks in WORLD_LANDMARKS, with zero portals near spawn (0, 0).
 */
export function buildPeakPortalNetwork(
  biome: BiomeId,
  shiftSequence = 0,
): FormationProp[] {
  return WORLD_LANDMARKS.map((landmark, idx) => {
    const spot = pickPeakPortalSpot(landmark, biome, shiftSequence);
    const portalType: 'portalA' | 'portalB' = idx % 2 === 0 ? 'portalA' : 'portalB';
    const suffix = shiftSequence > 0 ? `-s${shiftSequence}` : '';
    return {
      id: `peak-portal-${landmark.tier}-${landmark.id}${suffix}`,
      type: portalType,
      x: spot.x,
      z: spot.z,
    };
  });
}

export interface SafeRespawnOptions {
  minPortalClearance?: number;
  preferredTargetX?: number;
  preferredTargetZ?: number;
  hasObstacleNear?: (x: number, z: number, pad: number) => boolean;
}

export interface SafeRespawnSpot {
  x: number;
  z: number;
  heading: number;
  nearestPortalDist: number;
}

function normalizeAngleDelta(a: number, b: number): number {
  return ((a - b + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
}

function isHeadingAimedAtAnyPortal(
  x: number,
  z: number,
  heading: number,
  portals: readonly FormationProp[],
  coneHalfAngleRad = 0.62,
  corridorDist = 56,
): boolean {
  for (const p of portals) {
    const dx = p.x - x;
    const dz = p.z - z;
    const dist = Math.hypot(dx, dz);
    if (dist <= 0.01 || dist > corridorDist) continue;
    const angleToPortal = Math.atan2(dx, dz);
    if (Math.abs(normalizeAngleDelta(angleToPortal, heading)) < coneHalfAngleRad) {
      return true;
    }
  }
  return false;
}

function isCorridorClearAhead(
  x: number,
  z: number,
  heading: number,
  biome: BiomeId,
  portals: readonly FormationProp[],
  hasObstacleNear?: (x: number, z: number, pad: number) => boolean,
): boolean {
  if (isHeadingAimedAtAnyPortal(x, z, heading, portals)) return false;
  const sinH = Math.sin(heading);
  const cosH = Math.cos(heading);
  for (const step of [8, 16, 24]) {
    const px = x + sinH * step;
    const pz = z + cosH * step;
    if (!isInWorldBounds(px, pz) || Math.hypot(px, pz) > WORLD_PLAY_RADIUS - 18) return false;
    if (isDeepWater(px, pz, biome)) return false;
    if (hasObstacleNear?.(px, pz, 2.2)) return false;
  }
  return true;
}

/**
 * Finds a verified open, dry, obstacle-free respawn coordinate that stays well clear of
 * EVERY portal and shrine structure, and selects an initial heading that points into open
 * free terrain rather than in front of any portal.
 */
export function findSafeFreeRespawnSpot(
  anchorX: number,
  anchorZ: number,
  props: readonly FormationProp[],
  biome: BiomeId,
  options: SafeRespawnOptions = {},
): SafeRespawnSpot {
  const minPortalClearance = options.minPortalClearance ?? SAFE_RESPAWN_MIN_PORTAL_CLEARANCE;
  const portals = props.filter((p) => p.type === 'portalA' || p.type === 'portalB');
  const solidProps = props.filter((p) => p.type === 'wall' || p.type === 'totem');
  const hasObstacleNear = options.hasObstacleNear;

  const nearestPortalDistance = (x: number, z: number): number => {
    let minD = Infinity;
    for (const p of portals) {
      const d = Math.hypot(x - p.x, z - p.z);
      if (d < minD) minD = d;
    }
    return minD;
  };

  const evaluateCandidate = (
    x: number,
    z: number,
    portalMinDist: number,
    requireLandmarkMargin: boolean,
  ): { ok: boolean; score: number; portalDist: number } => {
    if (!isInWorldBounds(x, z) || Math.hypot(x, z) > WORLD_PLAY_RADIUS - 28) {
      return { ok: false, score: -Infinity, portalDist: 0 };
    }
    if (isDeepWater(x, z, biome)) {
      return { ok: false, score: -Infinity, portalDist: 0 };
    }
    const y = terrainHeightAt(x, z, biome);
    if (y < WATER_LEVEL + 0.85) {
      return { ok: false, score: -Infinity, portalDist: 0 };
    }
    const portalDist = nearestPortalDistance(x, z);
    if (portalDist < portalMinDist) {
      return { ok: false, score: -Infinity, portalDist };
    }
    if (requireLandmarkMargin) {
      for (const lm of WORLD_LANDMARKS) {
        if (Math.hypot(x - lm.x, z - lm.z) < lm.radius + 9.5) {
          return { ok: false, score: -Infinity, portalDist };
        }
      }
    }
    for (const sp of solidProps) {
      if (Math.hypot(x - sp.x, z - sp.z) < 6.5) {
        return { ok: false, score: -Infinity, portalDist };
      }
    }
    if (hasObstacleNear?.(x, z, 4.5)) {
      return { ok: false, score: -Infinity, portalDist };
    }
    // Check immediate 6m safety halo for deep water so snake doesn't immediately slide into a lake
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI * 2) / 8;
      if (isDeepWater(x + Math.cos(a) * 6.5, z + Math.sin(a) * 6.5, biome)) {
        return { ok: false, score: -Infinity, portalDist };
      }
    }

    const grad = terrainDownhillGradient(x, z, biome);
    const slope = Math.hypot(grad.gx, grad.gz);
    const distFromAnchor = Math.hypot(x - anchorX, z - anchorZ);
    // Prefer gentle open ground close to the anchor yet generously separated from portals
    const portalBonus = Math.min(28, portalDist - portalMinDist) * 0.6;
    const score = portalBonus - distFromAnchor * 0.42 - slope * 18;
    return { ok: true, score, portalDist };
  };

  let bestX = 0;
  let bestZ = 4;
  let bestScore = -Infinity;
  let bestPortalDist = nearestPortalDistance(bestX, bestZ);
  let found = false;

  // 1. Check anchor itself first (ideal for central open valley spawn)
  const anchorEval = evaluateCandidate(anchorX, anchorZ, minPortalClearance, true);
  if (anchorEval.ok) {
    bestX = anchorX;
    bestZ = anchorZ;
    bestScore = anchorEval.score + 8;
    bestPortalDist = anchorEval.portalDist;
    found = true;
  }

  // 2. Concentric free-area rings around anchor (plus open valley fallbacks)
  const rings = [16, 24, 32, 42, 52, 64, 78];
  const baseAzimuth = Math.atan2(-anchorX, -anchorZ); // bias gently toward open central valley
  for (const radius of rings) {
    const samples = 24;
    for (let i = 0; i < samples; i++) {
      const ang = baseAzimuth + (i * Math.PI * 2) / samples;
      const cx = Math.round((anchorX + Math.sin(ang) * radius) * 10) / 10;
      const cz = Math.round((anchorZ + Math.cos(ang) * radius) * 10) / 10;
      const res = evaluateCandidate(cx, cz, minPortalClearance, true);
      if (res.ok && res.score > bestScore) {
        bestX = cx;
        bestZ = cz;
        bestScore = res.score;
        bestPortalDist = res.portalDist;
        found = true;
      }
    }
    if (found && radius >= 32) break;
  }

  // 3. Fallback to guaranteed open central valley points if anchor was hemmed in
  if (!found) {
    const valleyFallbacks: Array<[number, number]> = [
      [0, 6],
      [14, 14],
      [-14, 14],
      [18, -10],
      [-18, -10],
      [0, 26],
      [26, 20],
      [-26, 20],
    ];
    for (const [fx, fz] of valleyFallbacks) {
      const res = evaluateCandidate(fx, fz, minPortalClearance, false);
      if (res.ok && res.score > bestScore) {
        bestX = fx;
        bestZ = fz;
        bestScore = res.score;
        bestPortalDist = res.portalDist;
        found = true;
      }
    }
  }

  // 4. Pick a heading that leads into open terrain and NEVER directly in front of any portal
  const preferredHeading =
    options.preferredTargetX !== undefined && options.preferredTargetZ !== undefined
      ? Math.atan2(options.preferredTargetX - bestX, options.preferredTargetZ - bestZ)
      : Math.hypot(bestX, bestZ) > 12
        ? Math.atan2(-bestX, -bestZ)
        : Math.PI; // Open north-valley direction

  let chosenHeading = preferredHeading;
  if (!isCorridorClearAhead(bestX, bestZ, chosenHeading, biome, portals, hasObstacleNear)) {
    let bestHeadingScore = -Infinity;
    for (let i = 0; i < 24; i++) {
      const candH = preferredHeading + (i * Math.PI * 2) / 24;
      const clearAhead = isCorridorClearAhead(bestX, bestZ, candH, biome, portals, hasObstacleNear);
      const aimedAtPortal = isHeadingAimedAtAnyPortal(bestX, bestZ, candH, portals);
      // Score clearance away from nearest portal direction
      let minAngularGap = Math.PI;
      for (const p of portals) {
        const d = Math.hypot(p.x - bestX, p.z - bestZ);
        if (d > 85) continue;
        const gap = Math.abs(normalizeAngleDelta(Math.atan2(p.x - bestX, p.z - bestZ), candH));
        if (gap < minAngularGap) minAngularGap = gap;
      }
      const alignmentToPreferred = Math.cos(normalizeAngleDelta(candH, preferredHeading));
      const hScore =
        (clearAhead ? 100 : 0) -
        (aimedAtPortal ? 80 : 0) +
        minAngularGap * 16 +
        alignmentToPreferred * 6;
      if (hScore > bestHeadingScore) {
        bestHeadingScore = hScore;
        chosenHeading = candH;
      }
    }
  }

  return {
    x: bestX,
    z: bestZ,
    heading: chosenHeading,
    nearestPortalDist: bestPortalDist,
  };
}

/**
 * Open-world mountain expedition formations placed directly across peaks, passes, and valleys.
 * Portals are strictly anchored to the 12 Trial Peaks via buildPeakPortalNetwork (never near spawn).
 */
export const PRESET_FORMATIONS: FormationData[] = [
  {
    id: 'alpine-traverse',
    name: 'Grand Continental Odyssey',
    biome: 'mountain',
    props: buildProps([
      // Boost trail guiding north up Whispering Foothill -> Grand Glacier -> Crown of Humanity
      [0, -22, 'boost'],
      [0, -38, 'boost'],
      [-2, -82, 'boost'],
      [-2, -104, 'boost'],
      [-2, -158, 'boost'],
      [0, -184, 'boost'],
      // Ancient summit totems framing continental passes
      [-18, -32, 'totem'],
      [18, -32, 'totem'],
      [44, -18, 'totem'],
      [-48, -24, 'totem'],
      [36, 48, 'totem'],
      [-38, 44, 'totem'],
      [96, -54, 'totem'],
      [-104, -68, 'totem'],
      [94, 72, 'totem'],
      [-102, 82, 'totem'],
      // High-pass stone gates guarding outer colossi
      [112, -62, 'wall'],
      [118, -50, 'wall'],
      [-118, -74, 'wall'],
      [-124, -62, 'wall'],
      [12, 128, 'wall'],
      [-12, 128, 'wall'],
      // Regional sprint boost runes
      [48, -20, 'boost'],
      [98, -48, 'boost'],
      [112, 68, 'boost'],
      [8, 114, 'boost'],
      [-114, 72, 'boost'],
      [-116, -64, 'boost'],
    ]),
  },
  {
    id: 'boulder-pass',
    name: 'Colossus Gauntlet',
    biome: 'mountain',
    props: buildProps([
      // Slalom boulder gates up the northern ascent
      [-9, -22, 'wall'],
      [9, -22, 'wall'],
      [-11, -38, 'wall'],
      [11, -38, 'wall'],
      [-10, -86, 'wall'],
      [10, -86, 'wall'],
      [-10, -162, 'wall'],
      [10, -162, 'wall'],
      [0, -28, 'boost'],
      [0, -96, 'boost'],
      [0, -172, 'boost'],
      // Canyon monoliths across eastern & western passes
      [44, -12, 'totem'],
      [78, -36, 'wall'],
      [108, -48, 'totem'],
      [-46, -16, 'totem'],
      [-86, -42, 'wall'],
      [-120, -68, 'totem'],
      [-44, 48, 'boost'],
      [54, 52, 'boost'],
      [120, 62, 'boost'],
    ]),
  },
  {
    id: 'emerald-expedition',
    name: 'Emerald Highland Continent',
    biome: 'jungle',
    props: buildProps([
      // Ancient jungle temple totems lining the colossal highlands
      [-16, -24, 'totem'],
      [16, -24, 'totem'],
      [-24, -84, 'totem'],
      [24, -84, 'totem'],
      [78, -42, 'totem'],
      [-82, -46, 'totem'],
      [82, 68, 'totem'],
      [-88, 72, 'totem'],
      [-22, -168, 'totem'],
      [22, -168, 'totem'],
      // Boost runes through jungle mountain ridges
      [0, -30, 'boost'],
      [0, -92, 'boost'],
      [0, -174, 'boost'],
      [54, -18, 'boost'],
      [-58, -24, 'boost'],
      [104, 62, 'boost'],
      [-106, 66, 'boost'],
    ]),
  },
  {
    id: 'pure-wild',
    name: 'Pure Untamed Continent',
    biome: 'mountain',
    props: buildProps([
      [0, -30, 'boost'],
      [0, -148, 'boost'],
    ]),
  },
];

export function cloneFormation(f: FormationData): FormationData {
  return {
    id: f.id,
    name: f.name,
    biome: f.biome,
    props: f.props.map((p) => ({ ...p })),
  };
}

export interface PortalShiftEntry {
  oldId: string;
  newId: string;
  type: 'portalA' | 'portalB';
  oldX: number;
  oldZ: number;
  newX: number;
  newZ: number;
}

export interface PortalShiftResult {
  nextProps: FormationProp[];
  shifted: PortalShiftEntry[];
  completedPortalRelocated: boolean;
}

export interface ShiftPortalsOptions {
  completedPortalKey?: string;
  playerX?: number;
  playerZ?: number;
  shiftWaveCount?: number;
  targetPortalCount?: number;
  shiftSequence?: number;
  seed?: number;
}

/**
 * Ensures the world contains strictly 12 portals — one dedicated portal anchored
 * beside each of the 12 Trial Peaks — stripping any stray or spawn-area portals.
 */
export function generateRandomPortalNetwork(
  existingProps: FormationProp[],
  biome: BiomeId,
  targetPortalCount = PORTAL_NETWORK_TARGET_COUNT,
  _seed?: number,
): FormationProp[] {
  const nonPortals = existingProps.filter(
    (p) => p.type !== 'portalA' && p.type !== 'portalB',
  );
  const peakPortals = buildPeakPortalNetwork(biome, 0);
  const count = Math.max(1, Math.min(peakPortals.length, Math.floor(targetPortalCount)));
  return [...nonPortals, ...peakPortals.slice(0, count)];
}

/**
 * Rotates the just-completed peak portal to a fresh dry terrace angle around its same
 * Trial Peak so the world always keeps strictly 12 portals (1 per peak) while granting
 * the relocated portal a new ID for replayable Trial Floor missions.
 */
export function shiftPortalsAfterMission(
  existingProps: FormationProp[],
  biome: BiomeId,
  options: ShiftPortalsOptions = {},
): PortalShiftResult {
  const {
    completedPortalKey,
    playerX = 0,
    playerZ = 0,
    shiftSequence = 1,
  } = options;

  const nonPortals: FormationProp[] = [];
  const existingPortals: FormationProp[] = [];
  for (const p of existingProps) {
    if (p.type === 'portalA' || p.type === 'portalB') {
      existingPortals.push({ ...p });
    } else {
      nonPortals.push({ ...p });
    }
  }

  // Ensure all 12 peaks have exactly one portal mapped to them
  const defaultPeakPortals = buildPeakPortalNetwork(biome, 0);
  const peakPortals: FormationProp[] = WORLD_LANDMARKS.map((landmark, idx) => {
    const existing = existingPortals.find(
      (p) => p.id.startsWith(`peak-portal-${landmark.tier}-${landmark.id}`),
    );
    return existing ?? defaultPeakPortals[idx];
  });

  const shifted: PortalShiftEntry[] = [];
  let completedPortalRelocated = false;

  const nextPortals = peakPortals.map((prop, idx) => {
    const isCompleted = Boolean(completedPortalKey && prop.id === completedPortalKey);
    if (!isCompleted) return prop;

    const landmark = WORLD_LANDMARKS[idx];
    const fresh = pickPeakPortalSpot(landmark, biome, shiftSequence, 18, playerX, playerZ);
    const portalType: 'portalA' | 'portalB' = prop.type === 'portalB' ? 'portalB' : 'portalA';
    const newId = `peak-portal-${landmark.tier}-${landmark.id}-s${shiftSequence}`;
    shifted.push({
      oldId: prop.id,
      newId,
      type: portalType,
      oldX: prop.x,
      oldZ: prop.z,
      newX: fresh.x,
      newZ: fresh.z,
    });
    completedPortalRelocated = true;
    return {
      id: newId,
      type: portalType,
      x: fresh.x,
      z: fresh.z,
    };
  });

  return {
    nextProps: [...nonPortals, ...nextPortals],
    shifted,
    completedPortalRelocated,
  };
}

export function loadBestScore(): number {
  try {
    const v = localStorage.getItem(BEST_SCORE_KEY);
    return v ? Math.max(0, parseInt(v, 10) || 0) : 0;
  } catch {
    return 0;
  }
}

export function saveBestScore(score: number): void {
  try {
    localStorage.setItem(BEST_SCORE_KEY, String(Math.floor(score)));
  } catch {
    // ignore storage errors
  }
}

export function loadSavedFormations(): FormationData[] {
  try {
    const raw = localStorage.getItem(CUSTOM_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (f): f is FormationData =>
        Boolean(f && typeof f.id === 'string' && typeof f.name === 'string' && Array.isArray(f.props)),
    );
  } catch {
    return [];
  }
}

export function saveCustomFormation(formation: FormationData): FormationData[] {
  const existing = loadSavedFormations().filter((f) => f.id !== formation.id);
  const next = [cloneFormation(formation), ...existing].slice(0, 8);
  try {
    localStorage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  return next;
}

const PROP_CODE: Record<PropType, string> = {
  wall: 'W',
  totem: 'T',
  portalA: 'A',
  portalB: 'B',
  boost: 'S',
};

const CODE_TO_PROP: Record<string, PropType> = {
  W: 'wall',
  T: 'totem',
  A: 'portalA',
  B: 'portalB',
  S: 'boost',
};

export function encodeFormationCode(formation: FormationData): string {
  const biomeChar = formation.biome === 'mountain' ? 'M' : 'J';
  const safeName = encodeURIComponent(formation.name.trim().slice(0, 24) || 'Mountain Course');
  const items = formation.props.map((p) => {
    const code = PROP_CODE[p.type];
    const rx = Math.round(p.x);
    const rz = Math.round(p.z);
    return `${code}${rx}_${rz}`;
  });
  return `SP2|${biomeChar}|${safeName}|${items.join('.')}`;
}

export function decodeFormationCode(code: string): FormationData | null {
  try {
    const trimmed = code.trim();
    const parts = trimmed.split('|');
    if (parts.length !== 4 || parts[0] !== 'SP2') return null;
    const biome: BiomeId = parts[1] === 'M' ? 'mountain' : 'jungle';
    const name = decodeURIComponent(parts[2]).slice(0, 24) || 'Shared Mountain';
    const props: FormationProp[] = [];
    if (parts[3].length > 0) {
      const tokens = parts[3].split('.');
      tokens.forEach((tok, idx) => {
        if (tok.length < 4) return;
        const type = CODE_TO_PROP[tok[0]];
        const [xs, zs] = tok.slice(1).split('_');
        const x = parseInt(xs, 10);
        const z = parseInt(zs, 10);
        if (type && Number.isFinite(x) && Number.isFinite(z) && isInWorldBounds(x, z) && !isNearSpawn(x, z, 6)) {
          props.push({ id: `imp-${idx}-${x}-${z}`, type, x, z });
        }
      });
    }
    return {
      id: `shared-${Date.now()}`,
      name,
      biome,
      props,
    };
  } catch {
    return null;
  }
}
