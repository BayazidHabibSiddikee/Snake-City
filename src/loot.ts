import type { PortalMissionDef } from './missions';
import type { SpeedPreset, WeatherMode } from './types';

export type LootRarity = 'uncommon' | 'rare' | 'epic' | 'mythic';

export type MissionDifficultyRank =
  | 'initiate'
  | 'adept'
  | 'vanguard'
  | 'sovereign'
  | 'cataclysm';

export interface MissionDifficultyProfile {
  rank: MissionDifficultyRank;
  label: string;
  score: number; // 1.0 .. 3.4+
  accentHex: string;
  guaranteedMinRarity: LootRarity;
  materialRolls: number;
  multiplierBonusPct: number;
}

export interface RareMaterialDef {
  id: string;
  name: string;
  rarity: LootRarity;
  minFloor: 1 | 2 | 3 | 4 | 5;
  accentHex: string;
  origin: string;
  description: string;
}

export interface CultivationMultiplierReward {
  id: string;
  name: string;
  rarity: LootRarity;
  multiplier: number; // e.g. 1.35, 1.65, 2.0, 2.5
  durationSec: number;
  accentHex: string;
  description: string;
}

export interface DroppedMaterialEntry {
  materialId: string;
  name: string;
  rarity: LootRarity;
  quantity: number;
  accentHex: string;
  firstDiscovery: boolean;
}

export interface PortalLootDrop {
  id: string;
  timestamp: number;
  missionId: string;
  missionTitle: string;
  floorNumber: 1 | 2 | 3 | 4 | 5;
  difficulty: MissionDifficultyProfile;
  multiplierReward: CultivationMultiplierReward;
  materials: DroppedMaterialEntry[];
  highestRarity: LootRarity;
  resonanceBonusPct: number;
}

export interface ActiveCultivationBuff {
  id: string;
  name: string;
  rarity: LootRarity;
  multiplier: number;
  remainingSec: number;
  totalDurationSec: number;
  accentHex: string;
}

export interface LootRefinementRecipe {
  id: string;
  title: string;
  rarity: LootRarity;
  requiredRarity: LootRarity;
  requiredCount: number;
  reward: CultivationMultiplierReward;
  summary: string;
}

export interface PortalLootSaveState {
  materials: Record<string, number>;
  discoveredMaterialIds: string[];
  activeBuff: ActiveCultivationBuff | null;
  recentDrops: PortalLootDrop[];
  totalDropsClaimed: number;
  totalRefinements: number;
}

const LOOT_STORAGE_KEY = 'SERPENT_PEAKS_PORTAL_LOOT_V1';

export const LOOT_RARITY_META: Record<
  LootRarity,
  { label: string; rank: number; accentHex: string }
> = {
  uncommon: { label: 'Uncommon', rank: 1, accentHex: '#3de095' },
  rare: { label: 'Rare', rank: 2, accentHex: '#58e1ff' },
  epic: { label: 'Epic', rank: 3, accentHex: '#c084fc' },
  mythic: { label: 'Mythic', rank: 4, accentHex: '#f2c14e' },
};

export const RARE_MATERIALS_CATALOG: readonly RareMaterialDef[] = [
  {
    id: 'spirit_jade_shard',
    name: 'Spirit Jade Shard',
    rarity: 'uncommon',
    minFloor: 1,
    accentHex: '#3de095',
    origin: 'Floor 1+ Archive Portals',
    description: 'Crystallized mountain Dou Qi condensed along the outer rim of stable portal frames.',
  },
  {
    id: 'mirror_glass_prism',
    name: 'Mirror-Glass Prism',
    rarity: 'uncommon',
    minFloor: 1,
    accentHex: '#2dd4bf',
    origin: 'Floor 1+ Hall of Mirrors',
    description: 'Refractive sliver from the 360-degree Mirror-House that bends ambient cultivation essence inward.',
  },
  {
    id: 'thunderheart_ore',
    name: 'Thunderheart Ore',
    rarity: 'rare',
    minFloor: 2,
    accentHex: '#58e1ff',
    origin: 'Floor 2+ Tactical Rifts',
    description: 'Storm-tempered alpine metal humming with high-voltage resonance for rapid meridian expansion.',
  },
  {
    id: 'glacial_meridian_dew',
    name: 'Glacial Meridian Dew',
    rarity: 'rare',
    minFloor: 2,
    accentHex: '#60a5fa',
    origin: 'Floor 2+ Frost Conduits',
    description: 'Sub-zero spirit condensate that cools overheating meridians during accelerated cultivation.',
  },
  {
    id: 'nether_silk_filament',
    name: 'Nether Silk Filament',
    rarity: 'epic',
    minFloor: 3,
    accentHex: '#c084fc',
    origin: 'Floor 3+ Relay Sanctums',
    description: 'Luminous spectral thread spun from severed Soul Clan relay anchors.',
  },
  {
    id: 'sunstone_core',
    name: 'Sunstone Core',
    rarity: 'epic',
    minFloor: 3,
    accentHex: '#fb923c',
    origin: 'Floor 3+ High-Peak Portals',
    description: 'Dense golden-amber heartstone forged under summit lightning pressure.',
  },
  {
    id: 'void_lotus_petal',
    name: 'Void Lotus Petal',
    rarity: 'mythic',
    minFloor: 4,
    accentHex: '#f43f5e',
    origin: 'Floor 4+ Alchemy Crucibles',
    description: 'Weightless crimson-violet petal harvested only from stabilized dimensional breaches.',
  },
  {
    id: 'celestial_dragon_marrow',
    name: 'Celestial Dragon Marrow',
    rarity: 'mythic',
    minFloor: 5,
    accentHex: '#f2c14e',
    origin: 'Floor 5 29-Card Sanctums',
    description: 'Sovereign ascension essence prized by Dou Sheng elders to multiply cultivation speed.',
  },
];

export const CULTIVATION_ELIXIR_TIERS: Record<
  MissionDifficultyRank,
  CultivationMultiplierReward
> = {
  initiate: {
    id: 'elixir_jade_meridian',
    name: 'Jade Meridian Draught',
    rarity: 'uncommon',
    multiplier: 1.35,
    durationSec: 180,
    accentHex: '#3de095',
    description: 'Accelerates Essence XP gain and passive Dou Qi flow by 1.35× for 3 minutes.',
  },
  adept: {
    id: 'elixir_gale_focus',
    name: 'Gale Conduit Elixir',
    rarity: 'rare',
    multiplier: 1.55,
    durationSec: 210,
    accentHex: '#58e1ff',
    description: 'Accelerates Essence XP gain and passive Dou Qi flow by 1.55× for 3m 30s.',
  },
  vanguard: {
    id: 'elixir_azure_catalyst',
    name: 'Azure Storm Catalyst',
    rarity: 'rare',
    multiplier: 1.75,
    durationSec: 240,
    accentHex: '#38bdf8',
    description: 'Accelerates Essence XP gain and passive Dou Qi flow by 1.75× for 4 minutes.',
  },
  sovereign: {
    id: 'elixir_starlight_tonic',
    name: 'Starlight Prism Tonic',
    rarity: 'epic',
    multiplier: 2.1,
    durationSec: 300,
    accentHex: '#c084fc',
    description: 'Accelerates Essence XP gain and passive Dou Qi flow by 2.10× for 5 minutes.',
  },
  cataclysm: {
    id: 'elixir_celestial_nectar',
    name: 'Celestial Dou Di Nectar',
    rarity: 'mythic',
    multiplier: 2.5,
    durationSec: 360,
    accentHex: '#f2c14e',
    description: 'Accelerates Essence XP gain and passive Dou Qi flow by 2.50× for 6 minutes.',
  },
};

export const REFINEMENT_RECIPES: readonly LootRefinementRecipe[] = [
  {
    id: 'refine_uncommon',
    title: 'Distill Jade Meridian Draught',
    rarity: 'uncommon',
    requiredRarity: 'uncommon',
    requiredCount: 2,
    reward: {
      id: 'crafted_jade_meridian',
      name: 'Refined Jade Draught',
      rarity: 'uncommon',
      multiplier: 1.45,
      durationSec: 210,
      accentHex: '#3de095',
      description: '1.45× Essence XP & Qi cultivation speed for 3m 30s.',
    },
    summary: '2 Uncommon materials → 1.45× cultivation speed (3m 30s)',
  },
  {
    id: 'refine_rare',
    title: 'Synthesize Azure Storm Catalyst',
    rarity: 'rare',
    requiredRarity: 'rare',
    requiredCount: 2,
    reward: {
      id: 'crafted_azure_catalyst',
      name: 'Refined Storm Catalyst',
      rarity: 'rare',
      multiplier: 1.8,
      durationSec: 270,
      accentHex: '#58e1ff',
      description: '1.80× Essence XP & Qi cultivation speed for 4m 30s.',
    },
    summary: '2 Rare materials → 1.80× cultivation speed (4m 30s)',
  },
  {
    id: 'refine_epic',
    title: 'Condense Starlight Prism Tonic',
    rarity: 'epic',
    requiredRarity: 'epic',
    requiredCount: 2,
    reward: {
      id: 'crafted_starlight_tonic',
      name: 'Refined Starlight Tonic',
      rarity: 'epic',
      multiplier: 2.2,
      durationSec: 330,
      accentHex: '#c084fc',
      description: '2.20× Essence XP & Qi cultivation speed for 5m 30s.',
    },
    summary: '2 Epic materials → 2.20× cultivation speed (5m 30s)',
  },
  {
    id: 'refine_mythic',
    title: 'Awaken Celestial Dou Di Nectar',
    rarity: 'mythic',
    requiredRarity: 'mythic',
    requiredCount: 1,
    reward: {
      id: 'crafted_celestial_nectar',
      name: 'Sovereign Dou Di Nectar',
      rarity: 'mythic',
      multiplier: 2.65,
      durationSec: 420,
      accentHex: '#f2c14e',
      description: '2.65× Essence XP & Qi cultivation speed for 7 minutes.',
    },
    summary: '1 Mythic material → 2.65× cultivation speed (7m 00s)',
  },
];

export const PERMANENT_RESONANCE_PCT_PER_MATERIAL = 3; // +3% permanent XP per unique material discovered (max +24%)

export interface MissionDifficultyContext {
  floorNumber: 1 | 2 | 3 | 4 | 5;
  speedPreset?: SpeedPreset;
  weather?: WeatherMode;
  level?: number;
}

/**
 * Pure helper computing the effective Portal Mission Difficulty Rank from the portal's
 * trial floor (1..5), active climate/difficulty tier, and player cultivation level.
 */
export function computeMissionDifficultyTier(
  ctx: MissionDifficultyContext,
): MissionDifficultyProfile {
  const floorBase = [0, 1.0, 1.38, 1.8, 2.28, 2.85][ctx.floorNumber] ?? 1.0;
  const presetBonus =
    ctx.speedPreset === 'turbo' ? 0.28 : ctx.speedPreset === 'classic' ? 0.12 : 0;
  const harshWeatherBonus =
    ctx.weather === 'blizzard' || ctx.weather === 'ashstorm' || ctx.weather === 'storm'
      ? 0.22
      : ctx.weather === 'rain' || ctx.weather === 'fog'
        ? 0.08
        : 0;
  const stageBonus = ctx.level && ctx.level >= 9 ? 0.18 : ctx.level && ctx.level >= 5 ? 0.08 : 0;

  const score = Number((floorBase + presetBonus + harshWeatherBonus + stageBonus).toFixed(2));

  if (ctx.floorNumber >= 5 || score >= 2.75) {
    return {
      rank: 'cataclysm',
      label: 'Tier V · Cataclysm',
      score,
      accentHex: '#f2c14e',
      guaranteedMinRarity: 'mythic',
      materialRolls: 3,
      multiplierBonusPct: 150,
    };
  }
  if (ctx.floorNumber === 4 || score >= 2.2) {
    return {
      rank: 'sovereign',
      label: 'Tier IV · Sovereign',
      score,
      accentHex: '#c084fc',
      guaranteedMinRarity: 'epic',
      materialRolls: 2,
      multiplierBonusPct: 110,
    };
  }
  if (ctx.floorNumber === 3 || score >= 1.72) {
    return {
      rank: 'vanguard',
      label: 'Tier III · Vanguard',
      score,
      accentHex: '#38bdf8',
      guaranteedMinRarity: 'rare',
      materialRolls: 2,
      multiplierBonusPct: 75,
    };
  }
  if (ctx.floorNumber === 2 || score >= 1.32) {
    return {
      rank: 'adept',
      label: 'Tier II · Adept',
      score,
      accentHex: '#58e1ff',
      guaranteedMinRarity: 'rare',
      materialRolls: 2,
      multiplierBonusPct: 55,
    };
  }
  return {
    rank: 'initiate',
    label: 'Tier I · Initiate',
    score,
    accentHex: '#3de095',
    guaranteedMinRarity: 'uncommon',
    materialRolls: 1,
    multiplierBonusPct: 35,
  };
}

function highestLootRarity(a: LootRarity, b: LootRarity): LootRarity {
  return LOOT_RARITY_META[b].rank > LOOT_RARITY_META[a].rank ? b : a;
}

/**
 * Pure deterministic loot roller for completed Portal Missions.
 * Guarantees difficulty-scaled Cultivation Speed Multiplier reward + Rare Materials
 * whose rarity, quantity, and multiplier scale cleanly with portal floor & hazard difficulty.
 */
export function rollPortalMissionLoot(
  mission: Pick<PortalMissionDef, 'id' | 'title' | 'floorNumber'>,
  ctx: Omit<MissionDifficultyContext, 'floorNumber'>,
  discoveredMaterialIds: readonly string[] = [],
  rng: () => number = Math.random,
): PortalLootDrop {
  const difficulty = computeMissionDifficultyTier({
    floorNumber: mission.floorNumber,
    ...ctx,
  });

  const baseElixir = CULTIVATION_ELIXIR_TIERS[difficulty.rank];
  // Harsh storms / higher difficulty score add a modest precision bonus to the rolled multiplier
  const extraMult =
    difficulty.score >= 3.1 ? 0.2 : difficulty.score >= 2.5 ? 0.1 : difficulty.score >= 1.9 ? 0.05 : 0;
  const multiplierReward: CultivationMultiplierReward = {
    ...baseElixir,
    multiplier: Number((baseElixir.multiplier + extraMult).toFixed(2)),
    description: `Accelerates Essence XP & Qi cultivation by ${(baseElixir.multiplier + extraMult).toFixed(2)}× for ${Math.round(baseElixir.durationSec / 60)}m${baseElixir.durationSec % 60 ? ` ${baseElixir.durationSec % 60}s` : ''}.`,
  };

  const discoveredSet = new Set(discoveredMaterialIds);
  const droppedMap = new Map<string, DroppedMaterialEntry>();
  let highest: LootRarity = multiplierReward.rarity;

  // Roll 1: guaranteed material at or above difficulty.guaranteedMinRarity (eligible for this floor or unlocked by score)
  const minRank = LOOT_RARITY_META[difficulty.guaranteedMinRarity].rank;
  const guaranteedPool = RARE_MATERIALS_CATALOG.filter(
    (m) =>
      LOOT_RARITY_META[m.rarity].rank >= minRank &&
      m.minFloor <= Math.min(5, mission.floorNumber + (difficulty.rank === 'cataclysm' ? 1 : 0)),
  );
  const fallbackPool = RARE_MATERIALS_CATALOG.filter((m) => m.minFloor <= mission.floorNumber);
  const primaryPool = guaranteedPool.length > 0 ? guaranteedPool : fallbackPool;

  for (let rollIdx = 0; rollIdx < difficulty.materialRolls; rollIdx++) {
    const pool = rollIdx === 0 ? primaryPool : fallbackPool;
    const picked = pool[Math.floor(Math.max(0, Math.min(0.9999, rng())) * pool.length)] ?? RARE_MATERIALS_CATALOG[0];
    const qty = rollIdx === 0 && difficulty.score >= 2.4 ? 2 : 1;
    highest = highestLootRarity(highest, picked.rarity);

    const existing = droppedMap.get(picked.id);
    if (existing) {
      existing.quantity += qty;
    } else {
      const isNew = !discoveredSet.has(picked.id);
      if (isNew) discoveredSet.add(picked.id);
      droppedMap.set(picked.id, {
        materialId: picked.id,
        name: picked.name,
        rarity: picked.rarity,
        quantity: qty,
        accentHex: picked.accentHex,
        firstDiscovery: isNew,
      });
    }
  }

  const materials = Array.from(droppedMap.values()).sort(
    (a, b) => LOOT_RARITY_META[b.rarity].rank - LOOT_RARITY_META[a.rarity].rank,
  );

  return {
    id: `loot-${Date.now().toString(36)}-${Math.floor(rng() * 1e5).toString(36)}`,
    timestamp: Date.now(),
    missionId: mission.id,
    missionTitle: mission.title,
    floorNumber: mission.floorNumber,
    difficulty,
    multiplierReward,
    materials,
    highestRarity: highest,
    resonanceBonusPct: discoveredSet.size * PERMANENT_RESONANCE_PCT_PER_MATERIAL,
  };
}

export function formatLootDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.ceil(totalSeconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${String(rem).padStart(2, '0')}`;
}

export function renderLootIconSvg(kind: 'elixir' | 'material', accentHex: string, rarity: LootRarity): string {
  if (kind === 'elixir') {
    return `<svg viewBox="0 0 28 28" width="24" height="24" aria-hidden="true">
      <rect x="11" y="3" width="6" height="3" rx="1" fill="${accentHex}" opacity="0.9" />
      <path d="M12 6h4v4.2l5.2 7.4A4.5 4.5 0 0 1 17.5 25h-7a4.5 4.5 0 0 1-3.7-7.4L12 10.2V6z" fill="rgba(10,20,24,0.85)" stroke="${accentHex}" stroke-width="1.6" stroke-linejoin="round" />
      <path d="M9.4 17.5h9.2l1.2 1.8a2.5 2.5 0 0 1-2.1 3.7h-7.4a2.5 2.5 0 0 1-2.1-3.7l1.2-1.8z" fill="${accentHex}" opacity="${rarity === 'mythic' ? '0.92' : '0.72'}" />
    </svg>`;
  }
  return `<svg viewBox="0 0 28 28" width="24" height="24" aria-hidden="true">
    <polygon points="14,3 23,10 19.5,24 8.5,24 5,10" fill="rgba(10,20,24,0.85)" stroke="${accentHex}" stroke-width="1.6" stroke-linejoin="round" />
    <polygon points="14,7.2 19.2,11.6 17,20.5 11,20.5 8.8,11.6" fill="${accentHex}" opacity="${rarity === 'mythic' ? '0.88' : '0.62'}" />
    <line x1="14" y1="3" x2="14" y2="24" stroke="#ffffff" stroke-opacity="0.3" stroke-width="1" />
  </svg>`;
}

export class PortalLootManager {
  private state: PortalLootSaveState = {
    materials: {},
    discoveredMaterialIds: [],
    activeBuff: null,
    recentDrops: [],
    totalDropsClaimed: 0,
    totalRefinements: 0,
  };

  private saveAccumSec = 0;

  constructor() {
    this.load();
  }

  private load(): void {
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(LOOT_STORAGE_KEY) : null;
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<PortalLootSaveState>;
      const validIds = new Set(RARE_MATERIALS_CATALOG.map((m) => m.id));
      const cleanMaterials: Record<string, number> = {};
      if (parsed.materials && typeof parsed.materials === 'object') {
        for (const [k, v] of Object.entries(parsed.materials)) {
          if (validIds.has(k) && typeof v === 'number' && Number.isFinite(v) && v > 0) {
            cleanMaterials[k] = Math.min(999, Math.floor(v));
          }
        }
      }
      const discovered = Array.isArray(parsed.discoveredMaterialIds)
        ? Array.from(
            new Set([
              ...parsed.discoveredMaterialIds.filter((id): id is string => typeof id === 'string' && validIds.has(id)),
              ...Object.keys(cleanMaterials),
            ]),
          )
        : Object.keys(cleanMaterials);

      let activeBuff: ActiveCultivationBuff | null = null;
      if (parsed.activeBuff && typeof parsed.activeBuff === 'object') {
        const b = parsed.activeBuff;
        if (
          typeof b.multiplier === 'number' &&
          Number.isFinite(b.multiplier) &&
          b.multiplier > 1 &&
          typeof b.remainingSec === 'number' &&
          Number.isFinite(b.remainingSec) &&
          b.remainingSec > 1
        ) {
          activeBuff = {
            id: String(b.id || 'buff'),
            name: String(b.name || 'Cultivation Catalyst'),
            rarity:
              b.rarity === 'mythic' || b.rarity === 'epic' || b.rarity === 'rare' || b.rarity === 'uncommon'
                ? b.rarity
                : 'rare',
            multiplier: Math.max(1.1, Math.min(4.0, b.multiplier)),
            remainingSec: Math.min(1800, b.remainingSec),
            totalDurationSec: Math.max(b.remainingSec, Number(b.totalDurationSec) || b.remainingSec),
            accentHex: typeof b.accentHex === 'string' ? b.accentHex : '#58e1ff',
          };
        }
      }

      this.state = {
        materials: cleanMaterials,
        discoveredMaterialIds: discovered,
        activeBuff,
        recentDrops: Array.isArray(parsed.recentDrops) ? parsed.recentDrops.slice(0, 12) : [],
        totalDropsClaimed:
          typeof parsed.totalDropsClaimed === 'number' && Number.isFinite(parsed.totalDropsClaimed)
            ? Math.max(0, Math.floor(parsed.totalDropsClaimed))
            : 0,
        totalRefinements:
          typeof parsed.totalRefinements === 'number' && Number.isFinite(parsed.totalRefinements)
            ? Math.max(0, Math.floor(parsed.totalRefinements))
            : 0,
      };
    } catch {
      // ignore storage errors
    }
  }

  private save(): void {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(LOOT_STORAGE_KEY, JSON.stringify(this.state));
      }
    } catch {
      // ignore quota errors
    }
  }

  public getState(): Readonly<PortalLootSaveState> {
    return this.state;
  }

  public getActiveBuff(): ActiveCultivationBuff | null {
    return this.state.activeBuff;
  }

  public getPermanentResonancePct(): number {
    return this.state.discoveredMaterialIds.length * PERMANENT_RESONANCE_PCT_PER_MATERIAL;
  }

  /**
   * Effective cultivation speed multiplier combining any active timed elixir and
   * permanent material discovery resonance.
   */
  public getEffectiveCultivationMultiplier(): number {
    const permMult = 1 + this.getPermanentResonancePct() / 100;
    const buffMult = this.state.activeBuff ? this.state.activeBuff.multiplier : 1.0;
    return Number((buffMult * permMult).toFixed(2));
  }

  public getTotalMaterialCount(): number {
    let total = 0;
    for (const v of Object.values(this.state.materials)) {
      total += v;
    }
    return total;
  }

  public getMaterialCountByRarity(rarity: LootRarity): number {
    let total = 0;
    for (const def of RARE_MATERIALS_CATALOG) {
      if (def.rarity === rarity) {
        total += this.state.materials[def.id] ?? 0;
      }
    }
    return total;
  }

  public tick(dt: number): boolean {
    if (!this.state.activeBuff || dt <= 0) return false;
    this.state.activeBuff.remainingSec = Math.max(0, this.state.activeBuff.remainingSec - dt);
    this.saveAccumSec += dt;
    if (this.state.activeBuff.remainingSec <= 0) {
      this.state.activeBuff = null;
      this.saveAccumSec = 0;
      this.save();
      return true; // expired
    }
    if (this.saveAccumSec >= 8) {
      this.saveAccumSec = 0;
      this.save();
    }
    return false;
  }

  public activateMultiplierReward(reward: CultivationMultiplierReward): ActiveCultivationBuff {
    const current = this.state.activeBuff;
    if (current && current.remainingSec > 0) {
      const upgraded = reward.multiplier >= current.multiplier;
      const mergedDuration = Math.min(900, current.remainingSec + Math.round(reward.durationSec * 0.75));
      this.state.activeBuff = {
        id: upgraded ? reward.id : current.id,
        name: upgraded ? reward.name : current.name,
        rarity: upgraded ? reward.rarity : current.rarity,
        multiplier: Math.max(current.multiplier, reward.multiplier),
        remainingSec: mergedDuration,
        totalDurationSec: Math.max(mergedDuration, reward.durationSec),
        accentHex: upgraded ? reward.accentHex : current.accentHex,
      };
    } else {
      this.state.activeBuff = {
        id: reward.id,
        name: reward.name,
        rarity: reward.rarity,
        multiplier: reward.multiplier,
        remainingSec: reward.durationSec,
        totalDurationSec: reward.durationSec,
        accentHex: reward.accentHex,
      };
    }
    this.save();
    return this.state.activeBuff;
  }

  public claimMissionLoot(
    mission: Pick<PortalMissionDef, 'id' | 'title' | 'floorNumber'>,
    ctx: Omit<MissionDifficultyContext, 'floorNumber'>,
    rng: () => number = Math.random,
  ): PortalLootDrop {
    const drop = rollPortalMissionLoot(mission, ctx, this.state.discoveredMaterialIds, rng);

    for (const mat of drop.materials) {
      this.state.materials[mat.materialId] = (this.state.materials[mat.materialId] ?? 0) + mat.quantity;
      if (!this.state.discoveredMaterialIds.includes(mat.materialId)) {
        this.state.discoveredMaterialIds.push(mat.materialId);
      }
    }

    this.activateMultiplierReward(drop.multiplierReward);
    this.state.totalDropsClaimed += 1;
    this.state.recentDrops = [drop, ...this.state.recentDrops].slice(0, 12);
    this.save();
    return drop;
  }

  public canRefine(recipeId: string): boolean {
    const recipe = REFINEMENT_RECIPES.find((r) => r.id === recipeId);
    if (!recipe) return false;
    return this.getMaterialCountByRarity(recipe.requiredRarity) >= recipe.requiredCount;
  }

  public refineMaterials(recipeId: string): { ok: boolean; buff?: ActiveCultivationBuff; recipe?: LootRefinementRecipe } {
    const recipe = REFINEMENT_RECIPES.find((r) => r.id === recipeId);
    if (!recipe || !this.canRefine(recipeId)) {
      return { ok: false };
    }

    let remainingToSpend = recipe.requiredCount;
    const matchingDefs = RARE_MATERIALS_CATALOG.filter((m) => m.rarity === recipe.requiredRarity);
    // Spend from the highest-stockpile materials of that rarity first
    matchingDefs.sort((a, b) => (this.state.materials[b.id] ?? 0) - (this.state.materials[a.id] ?? 0));

    for (const def of matchingDefs) {
      if (remainingToSpend <= 0) break;
      const have = this.state.materials[def.id] ?? 0;
      if (have <= 0) continue;
      const take = Math.min(have, remainingToSpend);
      this.state.materials[def.id] = have - take;
      if (this.state.materials[def.id] <= 0) {
        delete this.state.materials[def.id];
      }
      remainingToSpend -= take;
    }

    this.state.totalRefinements += 1;
    const buff = this.activateMultiplierReward(recipe.reward);
    return { ok: true, buff, recipe };
  }
}
