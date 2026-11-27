export type WorldRegionId =
  | 'central_sanctuary'
  | 'soul_clan_territories'
  | 'mechanical_wastes'
  | 'memory_forest'
  | 'forgotten_ruins'
  | 'the_abyss'
  | 'portal_mountains'
  | 'the_unknown';

export type WorldActivityId =
  | 'soul_trials'
  | 'engineers_trials'
  | 'serpent_racing'
  | 'dungeon_survival'
  | 'portal_explorer'
  | 'treasure_hunt';

export type RegionStreamingState = 'active' | 'lod' | 'distant';

/**
 * Dynamic WorldRegion model — intentionally decoupled from Portal Memory records
 * so portals can relocate or regroup without mutating browsing history.
 */
export interface WorldRegion {
  id: WorldRegionId;
  seed: number;
  type: 'handcrafted' | 'procedural';
  name: string;
  subtitle: string;
  biome: string;
  difficulty: number;
  unlocked: boolean;
  centerX: number;
  centerZ: number;
  radius: number;
  accentHex: string;
  discoveredLocations: string[];
  activeEvents: string[];
  activities: WorldActivityId[];
}

export interface WorldActivitySpec {
  id: WorldActivityId;
  code: string;
  name: string;
  category: string;
  regionId: WorldRegionId;
  summary: string;
  actionLabel: string;
}

export interface ProceduralDungeonRoom {
  roomIndex: number;
  kind: 'traps' | 'ambush' | 'mechanical_lock' | 'treasure_vault' | 'boss';
  title: string;
  hazard: string;
  rewardSe: number;
  difficulty: number;
  cleared: boolean;
}

export interface ProceduralDungeonRun {
  seed: number;
  title: string;
  rooms: ProceduralDungeonRoom[];
  currentRoomIndex: number;
  completed: boolean;
  elapsedSec: number;
}

export interface TreasureHuntClue {
  id: string;
  regionId: WorldRegionId;
  title: string;
  riddle: string;
  targetX: number;
  targetZ: number;
  rewardSe: number;
  discovered: boolean;
}

export interface RacingCheckpoint {
  index: number;
  label: string;
  x: number;
  z: number;
  radius: number;
}

export const WORLD_ECOSYSTEM_STORAGE_KEY = 'SERPENT_PEAKS_ECOSYSTEM_V1';

export const WORLD_ACTIVITIES: WorldActivitySpec[] = [
  {
    id: 'soul_trials',
    code: 'A',
    name: 'Combat Arena — Soul Trials',
    category: 'Combat',
    regionId: 'soul_clan_territories',
    summary: 'Wave survival, 1v1 Soul Clan duels, parry challenges, and boss encounters for Clan ranks.',
    actionLabel: 'Enter Soul Arena',
  },
  {
    id: 'engineers_trials',
    code: 'B',
    name: "Mechanical Challenge — The Engineer's Trials",
    category: 'Engineering',
    regionId: 'mechanical_wastes',
    summary: 'Gear synchronization, V=IR circuits, hydraulic pressure balancing, and sensor-logic gates.',
    actionLabel: 'Open Foundry Trials',
  },
  {
    id: 'serpent_racing',
    code: 'C',
    name: 'Serpent Racing',
    category: 'Movement',
    regionId: 'central_sanctuary',
    summary: 'High-speed 5-gate continental obstacle & ridge time trial across connected mountain routes.',
    actionLabel: 'Start Time Trial',
  },
  {
    id: 'dungeon_survival',
    code: 'D',
    name: 'Dungeon Survival',
    category: 'Procedural',
    regionId: 'the_abyss',
    summary: 'Seeded 5-room procedural dungeon with randomized traps, ambushes, vaults, and a final boss.',
    actionLabel: 'Generate Dungeon Run',
  },
  {
    id: 'portal_explorer',
    code: 'E',
    name: 'Portal Explorer',
    category: 'Browser Ecosystem',
    regionId: 'portal_mountains',
    summary: 'Navigate Active Tabs, Memory Forest history, Forgotten Ruins recovery, and Research collections.',
    actionLabel: 'Open Portal Atlas',
  },
  {
    id: 'treasure_hunt',
    code: 'F',
    name: 'Treasure Hunt & Mysteries',
    category: 'Exploration',
    regionId: 'forgotten_ruins',
    summary: 'Multi-region riddles, ancient shrines, and hidden coordinates scattered across Snake City.',
    actionLabel: 'Track Clues',
  },
];

export const SERPENT_RACING_TRACK: RacingCheckpoint[] = [
  { index: 0, label: 'Sanctuary Arch', x: 0, z: -26, radius: 13 },
  { index: 1, label: 'Memory Forest Ridge', x: 78, z: 18, radius: 14 },
  { index: 2, label: 'Foundry Overpass', x: -72, z: 68, radius: 14 },
  { index: 3, label: 'Forgotten Ruins Causeway', x: -86, z: -58, radius: 14 },
  { index: 4, label: 'Central Sanctuary Finish', x: 0, z: 12, radius: 14 },
];

export function createInitialTreasureClues(): TreasureHuntClue[] {
  return [
    {
      id: 'clue_foundry_gear',
      regionId: 'mechanical_wastes',
      title: 'The Reversed Tooth',
      riddle: 'Where three spinning saws guard a twin-tank bridge, engage the idler to turn forward into reverse.',
      targetX: -148,
      targetZ: 118,
      rewardSe: 20,
      discovered: false,
    },
    {
      id: 'clue_memory_canopy',
      regionId: 'memory_forest',
      title: 'Echoes of Yesterday',
      riddle: 'East of Central Sanctuary, recent footsteps crystallize into emerald gateways beneath the canopy.',
      targetX: 118,
      targetZ: 32,
      rewardSe: 18,
      discovered: false,
    },
    {
      id: 'clue_forgotten_shard',
      regionId: 'forgotten_ruins',
      title: 'The Severed Thread',
      riddle: 'Northwest among shattered arches wait purple fragments of journeys abandoned before their end.',
      targetX: -108,
      targetZ: -84,
      rewardSe: 22,
      discovered: false,
    },
    {
      id: 'clue_unknown_horizon',
      regionId: 'the_unknown',
      title: 'Beyond the Charted Seed',
      riddle: 'Follow the western frontier beyond the industrial rim where procedural vaults reshape each dawn.',
      targetX: -215,
      targetZ: 22,
      rewardSe: 30,
      discovered: false,
    },
  ];
}

/**
 * Deterministic Mulberry32 PRNG for reproducible procedural regions, dungeons, and events.
 */
export function createSeededRng(seed: number): () => number {
  let state = (seed >>> 0) || 0x9e3779b9;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createInitialWorldRegions(): WorldRegion[] {
  return [
    {
      id: 'central_sanctuary',
      seed: 1001,
      type: 'handcrafted',
      name: 'Central Sanctuary',
      subtitle: 'Main hub, major portals, portal discovery, and regional gateways',
      biome: 'Jade Mountain Basin',
      difficulty: 1,
      unlocked: true,
      centerX: 0,
      centerZ: 0,
      radius: 78,
      accentHex: '#58e1ff',
      discoveredLocations: ['Sanctuary Plaza', 'Search Gateway'],
      activeEvents: ['Sanctuary Beacon Lit'],
      activities: ['portal_explorer', 'serpent_racing'],
    },
    {
      id: 'soul_clan_territories',
      seed: 2048,
      type: 'handcrafted',
      name: 'Soul Clan Territories',
      subtitle: 'Ancient fortresses, combat schools, rival warriors, and Soul Trials',
      biome: 'Obsidian Highland',
      difficulty: 3,
      unlocked: true,
      centerX: -150,
      centerZ: -140,
      radius: 86,
      accentHex: '#fb7185',
      discoveredLocations: ['Outer Ward Gate'],
      activeEvents: ['Soul Clan Sparring Challenge'],
      activities: ['soul_trials'],
    },
    {
      id: 'mechanical_wastes',
      seed: 3141,
      type: 'handcrafted',
      name: 'Mechanical Wastes',
      subtitle: 'Forgotten Soul Foundry, massive gears, hydraulics, electrical puzzles, and machine traps',
      biome: 'Industrial Ruins',
      difficulty: 3,
      unlocked: true,
      centerX: -148,
      centerZ: 118,
      radius: 88,
      accentHex: '#f59e0b',
      discoveredLocations: ['The Forgotten Soul Foundry'],
      activeEvents: ['Conduit Surge Warning'],
      activities: ['engineers_trials'],
    },
    {
      id: 'memory_forest',
      seed: 4096,
      type: 'handcrafted',
      name: 'Memory Forest',
      subtitle: 'Browsing-history portals, saved websites, forgotten searches, and verdant trails',
      biome: 'Emerald Canopy',
      difficulty: 1,
      unlocked: true,
      centerX: 118,
      centerZ: 32,
      radius: 82,
      accentHex: '#3de095',
      discoveredLocations: ['Recent History Clearing'],
      activeEvents: ['Fresh Memory Portals Blooming'],
      activities: ['portal_explorer', 'treasure_hunt'],
    },
    {
      id: 'forgotten_ruins',
      seed: 5120,
      type: 'handcrafted',
      name: 'Forgotten Ruins',
      subtitle: 'Closed-tab recovery, abandoned portals, hidden chambers, and rare loot',
      biome: 'Shattered Violet Ruins',
      difficulty: 2,
      unlocked: true,
      centerX: -108,
      centerZ: -84,
      radius: 78,
      accentHex: '#a855f7',
      discoveredLocations: ['Abandoned Session Vault'],
      activeEvents: ['Unknown Portal Fragment Detected'],
      activities: ['portal_explorer', 'treasure_hunt'],
    },
    {
      id: 'the_abyss',
      seed: 6660,
      type: 'handcrafted',
      name: 'The Abyss',
      subtitle: 'High-intensity combat, deadly traps, movement gauntlets, and Dungeon Survival',
      biome: 'Volcanic Rift',
      difficulty: 5,
      unlocked: true,
      centerX: 175,
      centerZ: 168,
      radius: 86,
      accentHex: '#ef4444',
      discoveredLocations: ['Abyssal Descent'],
      activeEvents: ['Procedural Dungeon Rift Open'],
      activities: ['dungeon_survival', 'soul_trials'],
    },
    {
      id: 'portal_mountains',
      seed: 7777,
      type: 'handcrafted',
      name: 'Portal Mountains',
      subtitle: 'Browser gateways, search portals, workspaces, collections, and archived destinations',
      biome: 'Alpine Peaks',
      difficulty: 2,
      unlocked: true,
      centerX: 168,
      centerZ: -148,
      radius: 92,
      accentHex: '#34d399',
      discoveredLocations: ['Archive Summit'],
      activeEvents: ['Workspace Hub Resonance'],
      activities: ['portal_explorer'],
    },
    {
      id: 'the_unknown',
      seed: 8888,
      type: 'procedural',
      name: 'The Unknown',
      subtitle: 'Procedurally generated exploration, secret dungeons, random encounters, and expansion frontier',
      biome: 'Shifting Frontier',
      difficulty: 4,
      unlocked: true,
      centerX: -215,
      centerZ: 22,
      radius: 95,
      accentHex: '#38bdf8',
      discoveredLocations: ['Frontier Cairn'],
      activeEvents: ['Seeded Vault Materialized'],
      activities: ['dungeon_survival', 'treasure_hunt', 'serpent_racing'],
    },
  ];
}

/**
 * Evaluates world streaming state per region around the player's current coordinates.
 * Central Sanctuary and nearby regions load in full active detail; mid-range use LOD;
 * far regions stay unloaded/distant so Three.js never renders the entire world at full detail.
 */
export function evaluateRegionStreaming(
  playerX: number,
  playerZ: number,
  regions: readonly WorldRegion[],
): Array<{ region: WorldRegion; distanceM: number; streaming: RegionStreamingState }> {
  return regions.map((region) => {
    const dist = Math.hypot(region.centerX - playerX, region.centerZ - playerZ);
    const activeThreshold = region.radius + 75;
    const lodThreshold = region.radius + 195;
    let streaming: RegionStreamingState = 'distant';
    if (dist <= activeThreshold || region.id === 'central_sanctuary') {
      streaming = dist <= activeThreshold ? 'active' : 'lod';
    } else if (dist <= lodThreshold) {
      streaming = 'lod';
    }
    return {
      region,
      distanceM: Math.round(dist),
      streaming,
    };
  });
}

export function resolveActiveWorldRegion(
  playerX: number,
  playerZ: number,
  regions: readonly WorldRegion[],
): WorldRegion {
  let best = regions[0];
  let bestDist = Infinity;
  for (const r of regions) {
    const d = Math.hypot(r.centerX - playerX, r.centerZ - playerZ);
    if (d <= r.radius && d < bestDist) {
      bestDist = d;
      best = r;
    }
  }
  if (bestDist < Infinity) return best;

  // Fallback to closest region
  for (const r of regions) {
    const d = Math.hypot(r.centerX - playerX, r.centerZ - playerZ);
    if (d < bestDist) {
      bestDist = d;
      best = r;
    }
  }
  return best;
}

/**
 * Deterministically builds a 5-room Dungeon Survival run from a numeric seed
 * so any player or session can reconstruct the exact same dungeon layout.
 */
export function generateProceduralDungeon(seed: number): ProceduralDungeonRun {
  const rng = createSeededRng(seed);
  const middlePool: Array<{
    kind: Exclude<ProceduralDungeonRoom['kind'], 'boss'>;
    title: string;
    hazard: string;
    rewardSe: number;
  }> = [
    {
      kind: 'traps',
      title: 'Hall of Pendulum Teeth',
      hazard: 'Rotating saw assemblies & synchronized floor vents',
      rewardSe: 18,
    },
    {
      kind: 'ambush',
      title: 'Soul Clan Crucible',
      hazard: 'Twin Shield-Wardens flanked by a Trap-Engineer',
      rewardSe: 24,
    },
    {
      kind: 'mechanical_lock',
      title: 'Overloaded Conduit Chamber',
      hazard: 'Short-circuited relay gates requiring balanced current',
      rewardSe: 20,
    },
    {
      kind: 'treasure_vault',
      title: 'Sunken Archive Vault',
      hazard: 'Pressure-plate seal guarding rare Soul Essence crystals',
      rewardSe: 30,
    },
    {
      kind: 'traps',
      title: 'Collapsing Hydraulic Span',
      hazard: 'Unbalanced twin pressure tanks above an abyssal drop',
      rewardSe: 22,
    },
  ];

  const rooms: ProceduralDungeonRoom[] = [];
  for (let i = 0; i < 4; i += 1) {
    const pick = middlePool[Math.floor(rng() * middlePool.length)];
    rooms.push({
      roomIndex: i + 1,
      kind: pick.kind,
      title: pick.title,
      hazard: pick.hazard,
      rewardSe: pick.rewardSe,
      difficulty: Math.min(5, 1 + i + Math.floor(rng() * 2)),
      cleared: false,
    });
  }

  rooms.push({
    roomIndex: 5,
    kind: 'boss',
    title: 'Sanctum of the Abyssal Warden',
    hazard: 'Multi-phase Mechanical-Soul construct with shielded overload core',
    rewardSe: 55,
    difficulty: 5,
    cleared: false,
  });

  const prefixPool = ['Iron', 'Jade', 'Shattered', 'Astral', 'Forgotten'];
  const suffixPool = ['Vault', 'Spire', 'Labyrinth', 'Foundry', 'Chasm'];
  const title = `${prefixPool[Math.floor(rng() * prefixPool.length)]} ${suffixPool[Math.floor(rng() * suffixPool.length)]} #${(seed >>> 0) % 9999}`;

  return {
    seed: seed >>> 0,
    title,
    rooms,
    currentRoomIndex: 0,
    completed: false,
    elapsedSec: 0,
  };
}

export function rollDynamicWorldEvents(seed: number): Record<WorldRegionId, string> {
  const rng = createSeededRng(seed);
  const pools: Record<WorldRegionId, string[]> = {
    central_sanctuary: ['Sanctuary Beacon Lit', 'Twin Search Portals Aligned', 'Sanctuary Time Trial Open'],
    soul_clan_territories: ['Soul Clan Duelists Active', 'Banner of the Wardens Raised', 'Boss Rush Challenge Open'],
    mechanical_wastes: ['Conduit Surge Warning', 'Abandoned Factory Powered', 'Hydraulic Valve Pressure Spike'],
    memory_forest: ['Fresh Memory Portals Blooming', 'Forgotten Library Trail Revealed', 'Canopy Echoes Active'],
    forgotten_ruins: ['Unknown Portal Fragment Detected', 'Lost Session Vault Unsealed', 'Ancient Riddle Resonance'],
    the_abyss: ['Procedural Dungeon Rift Open', 'Abyssal Trap Gauntlet Active', 'High-Rank Warden Sighted'],
    portal_mountains: ['Workspace Hub Resonance', 'Archive Summit Clear Skies', 'Research Gateway Surge'],
    the_unknown: ['Seeded Vault Materialized', 'Uncharted Frontier Shifting', 'Hidden Relic Signal'],
  };

  const out = {} as Record<WorldRegionId, string>;
  for (const key of Object.keys(pools) as WorldRegionId[]) {
    const arr = pools[key];
    out[key] = arr[Math.floor(rng() * arr.length)];
  }
  return out;
}
