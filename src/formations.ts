import { isDeepWater, isInWorldBounds, isNearSpawn, WORLD_LANDMARKS } from './terrain';
import { BiomeId, FormationData, FormationProp, PropType, WORLD_PLAY_RADIUS } from './types';

export const PORTAL_NETWORK_TARGET_COUNT = 28;

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
 * Open-world mountain expedition formations placed directly across peaks, passes, and valleys.
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
      // Dimensional Pocket-World Portals (Portal A & Portal B) placed right in front of spawn & across 12 mountain landmarks!
      [0, -12, 'portalA'],
      [-10, -20, 'portalB'],
      [10, -20, 'portalA'],
      [0, -40, 'portalB'],
      [-18, -56, 'portalA'],
      [44, -24, 'portalB'],
      [-46, -32, 'portalA'],
      [56, 52, 'portalB'],
      [-56, 48, 'portalA'],
      [14, -96, 'portalB'],
      [-12, -146, 'portalA'],
      [22, 42, 'portalB'],
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
      // Multi-point Dimensional Portals across the Gauntlet (starting right ahead at [0, -12])
      [0, -12, 'portalA'],
      [-10, -20, 'portalB'],
      [12, -46, 'portalB'],
      [-38, -26, 'portalA'],
      [38, -26, 'portalB'],
      [-132, 82, 'portalA'],
      [126, -62, 'portalB'],
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
      // Jungle sanctuary multi-point dimensional portals (starting right ahead at [0, -12])
      [0, -12, 'portalA'],
      [-10, -20, 'portalB'],
      [12, -44, 'portalB'],
      [-42, -30, 'portalA'],
      [42, -30, 'portalB'],
      [-136, -78, 'portalA'],
      [134, 72, 'portalB'],
    ]),
  },
  {
    id: 'pure-wild',
    name: 'Pure Untamed Continent',
    biome: 'mountain',
    props: buildProps([
      [0, -30, 'boost'],
      [0, -148, 'boost'],
      [0, -12, 'portalA'],
      [-10, -20, 'portalB'],
      [12, -52, 'portalB'],
      [14, -126, 'portalA'],
      [-98, 96, 'portalB'],
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
 * Generates additional randomized colossal 3D portals across the expanded 360m-radius continent
 * so every expedition has 26-28+ discoverable mission & browser portals across inner valleys,
 * mid ridges, and outer mountain frontiers without overlapping landmarks or deep lakes.
 */
export function generateRandomPortalNetwork(
  existingProps: FormationProp[],
  biome: BiomeId,
  targetPortalCount = PORTAL_NETWORK_TARGET_COUNT,
  seed?: number,
): FormationProp[] {
  const baseProps = existingProps.filter(
    (p) => !p.id.startsWith('rand-portal-') && !p.id.startsWith('shift-portal-'),
  );
  const portals: Array<{ x: number; z: number; type: 'portalA' | 'portalB' }> = [];
  for (const p of baseProps) {
    if (p.type === 'portalA' || p.type === 'portalB') {
      portals.push({ x: p.x, z: p.z, type: p.type });
    }
  }

  const needed = Math.max(0, Math.floor(targetPortalCount) - portals.length);
  if (needed === 0) return baseProps;

  // Deterministic LCG when seed provided (for reproducible tests) or fresh random per run
  let s =
    typeof seed === 'number' && Number.isFinite(seed)
      ? Math.max(1, Math.floor(Math.abs(seed)) % 2147483647)
      : Math.max(1, Math.floor(Math.random() * 2147483646));
  const rand = (): number => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };

  const added: FormationProp[] = [];
  const maxRadius = WORLD_PLAY_RADIUS - 22;
  const minSpacing = 36;
  let attempts = 0;

  while (added.length < needed && attempts < needed * 85) {
    attempts++;
    // Stratified radial bands so inner, mid, and outer 360m zones all get portals
    const band = added.length % 3;
    const minR = band === 0 ? 34 : band === 1 ? 120 : 225;
    const maxR = band === 0 ? 125 : band === 1 ? 235 : maxRadius;
    const dist = minR + Math.sqrt(rand()) * Math.max(12, maxR - minR);
    const angle = rand() * Math.PI * 2;
    const x = Math.round(Math.cos(angle) * dist * 10) / 10;
    const z = Math.round(Math.sin(angle) * dist * 10) / 10;

    if (!isInWorldBounds(x, z) || isNearSpawn(x, z, 22)) continue;
    if (isDeepWater(x, z, biome)) continue;
    if (WORLD_LANDMARKS.some((lm) => Math.hypot(x - lm.x, z - lm.z) < lm.radius + 14)) continue;
    if (portals.some((pt) => Math.hypot(x - pt.x, z - pt.z) < minSpacing)) continue;
    if (
      baseProps.some(
        (bp) => bp.type !== 'portalA' && bp.type !== 'portalB' && Math.hypot(x - bp.x, z - bp.z) < 12,
      )
    ) {
      continue;
    }

    const portalType: 'portalA' | 'portalB' = (portals.length + added.length) % 2 === 0 ? 'portalA' : 'portalB';
    const prop: FormationProp = {
      id: `rand-portal-${added.length + 1}-${Math.round(x)}_${Math.round(z)}`,
      type: portalType,
      x,
      z,
    };
    added.push(prop);
    portals.push({ x, z, type: portalType });
  }

  return [...baseProps, ...added];
}

/**
 * Dynamically relocates the just-completed portal and shifts a wave of additional portals
 * to fresh valid dry locations across the 360m-radius continent after a player completes a
 * Portal Mission. Every relocated portal receives a new unique ID so it automatically binds
 * to a fresh uncompleted Trial Floor mission, keeping exploration endlessly replayable.
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
    shiftWaveCount = 5,
    targetPortalCount = PORTAL_NETWORK_TARGET_COUNT,
    shiftSequence = 1,
    seed,
  } = options;

  let s =
    typeof seed === 'number' && Number.isFinite(seed)
      ? Math.max(1, Math.floor(Math.abs(seed)) % 2147483647)
      : Math.max(1, Math.floor(Math.random() * 2147483646));
  const rand = (): number => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };

  const nonPortals: FormationProp[] = [];
  const portals: FormationProp[] = [];
  for (const p of existingProps) {
    if (p.type === 'portalA' || p.type === 'portalB') {
      portals.push({ ...p });
    } else {
      nonPortals.push({ ...p });
    }
  }

  const indicesToShift = new Set<number>();
  let completedIdx = -1;
  if (completedPortalKey) {
    completedIdx = portals.findIndex((p) => p.id === completedPortalKey);
    if (completedIdx >= 0) {
      indicesToShift.add(completedIdx);
    }
  }

  // Pick additional portals to shift across the continent (shuffled deterministically via rand)
  const candidateIndices: number[] = [];
  for (let i = 0; i < portals.length; i++) {
    if (!indicesToShift.has(i)) candidateIndices.push(i);
  }
  for (let i = candidateIndices.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = candidateIndices[i];
    candidateIndices[i] = candidateIndices[j];
    candidateIndices[j] = tmp;
  }

  const extraCount = Math.min(Math.max(0, Math.floor(shiftWaveCount)), candidateIndices.length);
  for (let k = 0; k < extraCount; k++) {
    indicesToShift.add(candidateIndices[k]);
  }

  const stationaryPortals = portals.filter((_, idx) => !indicesToShift.has(idx));
  const occupiedPortals: Array<{ x: number; z: number }> = stationaryPortals.map((p) => ({
    x: p.x,
    z: p.z,
  }));

  const maxRadius = WORLD_PLAY_RADIUS - 22;
  const minPortalSpacing = 36;
  const minShiftDistance = 42;
  const minPlayerClearance = 26;

  const findFreshSpot = (oldX: number, oldZ: number, bandIdx: number): { x: number; z: number } | null => {
    for (let attempt = 0; attempt < 110; attempt++) {
      const band = (bandIdx + Math.floor(attempt / 30)) % 3;
      const minR = band === 0 ? 34 : band === 1 ? 122 : 228;
      const maxR = band === 0 ? 126 : band === 1 ? 236 : maxRadius;
      const dist = minR + Math.sqrt(rand()) * Math.max(12, maxR - minR);
      const angle = rand() * Math.PI * 2;
      const x = Math.round(Math.cos(angle) * dist * 10) / 10;
      const z = Math.round(Math.sin(angle) * dist * 10) / 10;

      if (!isInWorldBounds(x, z) || isNearSpawn(x, z, 18)) continue;
      if (isDeepWater(x, z, biome)) continue;
      if (Math.hypot(x - oldX, z - oldZ) < minShiftDistance) continue;
      if (Math.hypot(x - playerX, z - playerZ) < minPlayerClearance) continue;
      if (WORLD_LANDMARKS.some((lm) => Math.hypot(x - lm.x, z - lm.z) < lm.radius + 14)) continue;
      if (occupiedPortals.some((pt) => Math.hypot(x - pt.x, z - pt.z) < minPortalSpacing)) continue;
      if (nonPortals.some((np) => Math.hypot(x - np.x, z - np.z) < 12)) continue;

      return { x, z };
    }
    return null;
  };

  const shifted: PortalShiftEntry[] = [];
  const nextPortals: FormationProp[] = [...stationaryPortals];
  let completedPortalRelocated = false;
  let shiftOrdinal = 0;

  for (const idx of indicesToShift) {
    const oldProp = portals[idx];
    const portalType = oldProp.type === 'portalB' ? 'portalB' : 'portalA';
    const fresh = findFreshSpot(oldProp.x, oldProp.z, shiftOrdinal);
    shiftOrdinal++;

    if (fresh) {
      const newId = `shift-portal-s${shiftSequence}-${shiftOrdinal}-${Math.round(fresh.x)}_${Math.round(fresh.z)}`;
      const movedProp: FormationProp = {
        id: newId,
        type: portalType,
        x: fresh.x,
        z: fresh.z,
      };
      nextPortals.push(movedProp);
      occupiedPortals.push({ x: fresh.x, z: fresh.z });
      shifted.push({
        oldId: oldProp.id,
        newId,
        type: portalType,
        oldX: oldProp.x,
        oldZ: oldProp.z,
        newX: fresh.x,
        newZ: fresh.z,
      });
      if (idx === completedIdx) {
        completedPortalRelocated = true;
      }
    } else {
      // Fallback: keep original if no valid spot found
      nextPortals.push(oldProp);
      occupiedPortals.push({ x: oldProp.x, z: oldProp.z });
    }
  }

  // Ensure total portal count stays at least targetPortalCount across the continent
  let topUpGuard = 0;
  while (nextPortals.length < targetPortalCount && topUpGuard < 32) {
    topUpGuard++;
    const fresh = findFreshSpot(playerX, playerZ, nextPortals.length);
    if (!fresh) break;
    const portalType: 'portalA' | 'portalB' = nextPortals.length % 2 === 0 ? 'portalA' : 'portalB';
    const newId = `shift-portal-s${shiftSequence}-topup-${topUpGuard}-${Math.round(fresh.x)}_${Math.round(fresh.z)}`;
    nextPortals.push({ id: newId, type: portalType, x: fresh.x, z: fresh.z });
    occupiedPortals.push({ x: fresh.x, z: fresh.z });
    shifted.push({
      oldId: 'spawned-fresh',
      newId,
      type: portalType,
      oldX: playerX,
      oldZ: playerZ,
      newX: fresh.x,
      newZ: fresh.z,
    });
  }

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
