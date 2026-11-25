import { isInWorldBounds, isNearSpawn } from './terrain';
import { BiomeId, FormationData, FormationProp, PropType } from './types';

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
      // Continental twin warp portals linking South Obsidian Saddle <-> North Glacier Skybridge
      [14, 146, 'portalA'],
      [14, -138, 'portalB'],
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
      // Far continent shortcut portals
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
      // Jungle sanctuary warp portals
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
