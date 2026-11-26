export type BiomeId = 'jungle' | 'mountain';

export type WeatherMode = 'clear' | 'mist' | 'fog' | 'rain' | 'storm' | 'blizzard' | 'ashstorm';

export type PropType = 'wall' | 'totem' | 'portalA' | 'portalB' | 'boost';

export type BuilderTool = PropType | 'erase';

export type GameMode = 'title' | 'playing' | 'paused' | 'gameover' | 'builder' | 'evolving' | 'ascended';

export type CameraMode = 'ant' | 'fpv' | 'chase' | 'aerial';

export type SpeedPreset = 'chill' | 'classic' | 'turbo';

export interface WorldPoint2D {
  x: number;
  z: number;
}

export interface FormationProp {
  id: string;
  type: PropType;
  x: number;
  z: number;
}

export interface FormationData {
  id: string;
  name: string;
  biome: BiomeId;
  props: FormationProp[];
}

export interface WorldObstacle {
  x: number;
  z: number;
  radius: number;
  kind: 'tree' | 'rock' | 'wall' | 'totem';
}

export interface CollectibleOrb {
  id: number;
  x: number;
  y: number;
  z: number;
  golden: boolean;
}

export interface RollingBoulder {
  id: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  radius: number;
  rotX: number;
  rotZ: number;
  life: number;
}

export type BeastKind = 'wolf' | 'boar' | 'eagle' | 'guardian' | 'wraith' | 'soul_elder';

export type EnemyFaction = 'beast' | 'ghost_clan';

export type EnvHazardSeverity = 'safe' | 'mild' | 'harsh' | 'extreme' | 'tribulation';

export type SoulPresenceState = 'dormant' | 'stirring' | 'imminent' | 'active';

export type BestiaryEntryId =
  | 'dire_ridge_wolf'
  | 'shadow_panther_wolf'
  | 'ironhorn_boar'
  | 'ember_tusk_ravager'
  | 'storm_talon_griffin'
  | 'tempest_canopy_hawk'
  | 'mythic_peak_guardian'
  | 'ancient_spirit_stag'
  | 'nether_earth_wraith'
  | 'soul_hall_reaper';

export interface BestiaryRecord {
  encountered: boolean;
  inspected: boolean;
  defeatedCount: number;
  firstDefeatedAt: number | null;
  firstDefeatedLevel: number;
  lowestTierDefeated: number | null;
  highestAltitudeMeters: number;
}

export type BeastState =
  | 'emerging'
  | 'patrol'
  | 'chase'
  | 'circle'
  | 'windup'
  | 'lunge'
  | 'stagger'
  | 'recover';

export interface WildBeast {
  id: number;
  speciesId: BestiaryEntryId;
  kind: BeastKind;
  faction: EnemyFaction;
  name: string;
  x: number;
  y: number;
  z: number;
  groundY: number;
  vx: number;
  vz: number;
  heading: number;
  homeX: number;
  homeZ: number;
  landmarkId: string | null;
  radius: number;
  scale: number;
  hp: number;
  maxHp: number;
  speed: number;
  baseSpeed: number;
  aggroRadius: number;
  state: BeastState;
  stateTimer: number;
  flankDir: number;
  emergeProgress: number; // 0 = buried underground, 1 = fully risen
  attackCooldown: number;
  hitFlash: number;
  animPhase: number;
  xpReward: number;
  baseXpReward: number;
  isBoss: boolean;
}

export interface GroundFissure {
  id: number;
  x: number;
  y: number;
  z: number;
  radius: number;
  age: number;
  life: number;
  colorHex: number;
  isBoss: boolean;
}

export interface MagicProjectile {
  id: number;
  fromPlayer: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  radius: number;
  damage: number;
  colorHex: number;
  life: number;
  maxLife: number;
  homing: boolean;
  style?: 'bolt' | 'lotus' | 'soul_chain' | 'flame' | 'bullet';
}

export interface ShockwaveEffect {
  id: number;
  fromPlayer: boolean;
  x: number;
  y: number;
  z: number;
  radius: number;
  maxRadius: number;
  age: number;
  life: number;
  colorHex: number;
}

export interface GlobalRankingPortalState {
  active: boolean;
  wave: number;
  x: number;
  z: number;
  y: number;
  timeRemainingSec: number;
  durationSec: number;
  nextSpawnInSec: number;
  submittedThisWave: boolean;
  distToPlayer: number;
  bearingRel: number;
}

export interface SentryMinimapPoint {
  x: number;
  z: number;
  heading: number;
  patrolMode: 'circular' | 'search' | 'alert' | 'banished';
  visionRange: number;
  visionHalfAngle: number;
  portalLocked: boolean;
}

export interface SentryHudAlert {
  id: string;
  name: string;
  subtitle: string;
  patrolMode: 'circular' | 'search' | 'alert' | 'banished';
  suspicion: number; // 0..1
  dist: number;
  portalLockTimer: number;
}

export interface MinimapSnapshot {
  biome: BiomeId;
  headX: number;
  headZ: number;
  heading: number;
  trail: Array<{ x: number; z: number }>;
  orbs: Array<{ x: number; z: number; golden: boolean }>;
  boulders: Array<{ x: number; z: number }>;
  beasts: Array<{ x: number; z: number; kind: BeastKind; faction: EnemyFaction; aggro: boolean }>;
  fissures: Array<{ x: number; z: number; isBoss: boolean }>;
  projectiles: Array<{ x: number; z: number; fromPlayer: boolean }>;
  portals: Array<{ x: number; z: number; variant: 'A' | 'B' }>;
  sentries: SentryMinimapPoint[];
  globalRankingPortal: { x: number; z: number; timeRemainingSec: number; wave: number } | null;
  visitedLandmarkIds: string[];
  nextLandmarkId: string | null;
}

export interface HudSnapshot {
  mode: GameMode;
  biome: BiomeId;
  weather: WeatherMode;
  weatherLabel: string;
  score: number;
  bestScore: number;
  length: number;
  combo: number;
  comboProgress: number; // 0..1
  speedPreset: SpeedPreset;
  cameraMode: CameraMode;
  muted: boolean;
  formationName: string;
  deathReason: string;
  maxCombo: number;
  fruitsEaten: number;
  boostTimer: number;
  stamina: number; // 0..1
  altitude: number; // meters
  speedKmh: number;
  zoneName: string;
  visitedCount: number;
  totalLandmarks: number;
  isNewBest: boolean;
  // 12-Level Serpent-to-Human Evolution & Cultivation state
  level: number;
  maxLevel: number;
  stageTitle: string;
  stageSubtitle: string;
  realmName: string;
  xp: number;
  levelFloorXp: number;
  nextLevelXp: number;
  xpProgress: number; // 0..1
  shrinesRequiredForNext: number;
  nextShrineName: string;
  nextShrineDist: number;
  nextShrineBearing: number; // relative radians (-PI..PI)
  xpLostOnCrash: number;
  checkpointName: string;
  isHuman: boolean;
  visitedLandmarkIds: string[];
  // Magical Combat, Dou Qi, 4 Fighting Skills, Harsh Environments & Soul Clan Heat
  hp: number;
  maxHp: number;
  qi: number;
  maxQi: number;
  magicTierName: string;
  primarySpellName: string;
  shockwaveName: string;
  dashSkillName: string;
  ultimateSkillName: string;
  primaryCooldownFrac: number; // 0 = ready, 1 = just cast
  shockwaveCooldownFrac: number; // 0 = ready, 1 = just cast
  dashCooldownFrac: number;
  ultimateCooldownFrac: number;
  dashQiCost: number;
  ultimateQiCost: number;
  envHazardName: string;
  envHazardSeverity: EnvHazardSeverity;
  envHpDrainPerSec: number;
  isSheltered: boolean;
  clanHeat: number; // 0..5 Vice-City wanted skulls
  clanHeatProgress: number; // 0..1
  soulInfluence: number; // 0..100 Soul Clan ghost activity intensity
  soulPresenceState: SoulPresenceState;
  soulAmbushEta: number; // seconds until next ground eruption
  activeFissureCount: number;
  ambushActive: boolean;
  activeGhostCount: number;
  ghostsDefeated: number;
  beastsDefeated: number;
  recentHurtPulse: number; // 0..1 screen edge flash
  nearbyHostileId: number | null;
  nearbyHostileKind: BeastKind | null;
  nearbyHostileName: string | null;
  nearbyHostileHp: number;
  nearbyHostileMaxHp: number;
  nearbyHostileBoss: boolean;
  nearbyHostileIsHighTier: boolean;
  nearbyHostileHpMult: number;
  nearbyHostileFaction: EnemyFaction | null;
  difficultyHpMult: number;
  difficultyDamageMult: number;
  difficultyTierLabel: string;
  globalRankingPortal: GlobalRankingPortalState;
  stealthActive: boolean;
  nearestSentryAlert: SentryHudAlert | null;
  soulArchivesUnlockedCount: number;
  soulArchivesTotalCount: number;
  cultivationMult: number;
  cultivationBuffName: string | null;
  cultivationBuffRemainingSec: number;
  permanentResonancePct: number;
  rareMaterialCount: number;
}

export const WORLD_PLAY_RADIUS = 360;
export const WATER_LEVEL = -1.2;
