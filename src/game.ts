import { SoundEngine } from './audio';
import { PortalChromiumManager, PortalVariant } from './browser';
import {
  ComplimentEventKind,
  ComplimentNotice,
  FloatingTauntNotice,
  SerpentComplimentOracle,
  SerpentTauntOracle,
  TauntMoment,
} from './compliments';
import {
  BESTIARY_CATALOG,
  BestiarySnapshot,
  buildBestiarySnapshot,
  countUnlockedLoreForEntry,
  createEmptyBestiaryRecord,
  resolveBestiaryId,
} from './bestiary';
import {
  EVOLUTION_STAGES,
  EVOLUTION_TRAIT_LABELS,
  EvolutionStage,
  EvolutionUnlockSummary,
  JourneyLifetimeStats,
  JourneyMilestone,
  MAX_EVOLUTION_LEVEL,
  MilestoneKind,
  clearJourneyProgress,
  computeAutonomousDifficulty,
  computeEvolutionLevel,
  computeHumanityMetrics,
  computeScaledEnemyStats,
  createEmptyLifetimeStats,
  getLevelEnvironment,
  getMagicTierForLevel,
  getNextStage,
  getStageForLevel,
  loadJourneyProgress,
  saveJourneyProgress,
} from './evolution';
import {
  PRESET_FORMATIONS,
  cloneFormation,
  decodeFormationCode,
  encodeFormationCode,
  loadBestScore,
  loadSavedFormations,
  saveBestScore,
  saveCustomFormation,
} from './formations';
import {
  MountainLandmark,
  WORLD_LANDMARKS,
  getZoneNameAt,
  isDeepWater,
  isInWorldBounds,
  isNearSpawn,
  terrainDownhillGradient,
  terrainHeightAt,
  terrainNormalAt,
} from './terrain';
import {
  BeastKind,
  BeastState,
  BestiaryEntryId,
  BestiaryRecord,
  BiomeId,
  BuilderTool,
  CameraMode,
  CollectibleOrb,
  EnemyFaction,
  FormationData,
  FormationProp,
  GameMode,
  GroundFissure,
  HudSnapshot,
  MagicProjectile,
  MinimapSnapshot,
  PropType,
  RollingBoulder,
  ShockwaveEffect,
  SoulPresenceState,
  SpeedPreset,
  WATER_LEVEL,
  WORLD_PLAY_RADIUS,
  WeatherMode,
  WildBeast,
  WorldObstacle,
} from './types';
import { RenderSnakeState, SnakePose3D, WorldEngine } from './world';

interface PathSample {
  x: number;
  y: number;
  z: number;
  nx: number;
  ny: number;
  nz: number;
  heading: number;
  cumDist: number;
}

export const FIXED_ENEMY_HP = 200;

export const WEATHER_ORDER: WeatherMode[] = [
  'clear',
  'mist',
  'fog',
  'rain',
  'storm',
  'blizzard',
  'ashstorm',
];

export const WEATHER_LABELS: Record<WeatherMode, string> = {
  clear: 'Clear Mountain Skies',
  mist: 'Chilling Mountain Mist',
  fog: 'Suffocating Valley Fog',
  rain: 'Driving Mountain Rain',
  storm: 'Thunder Tempest',
  blizzard: 'Whiteout Blizzard',
  ashstorm: 'Volcanic Ash Storm',
};

export const SPEED_CONFIG: Record<
  SpeedPreset,
  {
    baseSpeed: number;
    turnRate: number;
    boulderCount: number;
    grazeThreshold: number;
    climate: WeatherMode;
    shiftMinSec: number;
    shiftMaxSec: number;
  }
> = {
  chill: {
    baseSpeed: 3.7,
    turnRate: 1.72,
    boulderCount: 9,
    grazeThreshold: 0.72,
    climate: 'mist',
    shiftMinSec: 36,
    shiftMaxSec: 50,
  },
  classic: {
    baseSpeed: 4.5,
    turnRate: 1.88,
    boulderCount: 12,
    grazeThreshold: 0.56,
    climate: 'rain',
    shiftMinSec: 26,
    shiftMaxSec: 38,
  },
  turbo: {
    baseSpeed: 5.4,
    turnRate: 2.02,
    boulderCount: 15,
    grazeThreshold: 0.42,
    climate: 'storm',
    shiftMinSec: 20,
    shiftMaxSec: 32,
  },
};

export const CLIMATE_EFFECTS: Record<
  WeatherMode,
  { speedMult: number; hpDrainPerSec: number; realmDrainMult: number }
> = {
  clear: { speedMult: 1.04, hpDrainPerSec: 0, realmDrainMult: 0.85 },
  mist: { speedMult: 0.96, hpDrainPerSec: 0.3, realmDrainMult: 1.05 },
  fog: { speedMult: 0.87, hpDrainPerSec: 1.0, realmDrainMult: 1.25 },
  rain: { speedMult: 0.85, hpDrainPerSec: 1.6, realmDrainMult: 1.38 },
  storm: { speedMult: 0.79, hpDrainPerSec: 2.5, realmDrainMult: 1.55 },
  blizzard: { speedMult: 0.73, hpDrainPerSec: 3.3, realmDrainMult: 1.72 },
  ashstorm: { speedMult: 0.77, hpDrainPerSec: 4.1, realmDrainMult: 1.88 },
};

export interface ClimateTraversalModifier {
  weather: WeatherMode;
  isDifficultTraversal: boolean;
  speedDragMult: number;
  turnAgilityMult: number;
  steerInertiaMult: number;
  traversalStrain01: number;
  wakeColorHex: number;
  accentColorHex: number;
}

/**
 * Pure traversal modifier for extreme climates ('blizzard' & 'ashstorm').
 * Adjusts movement speed and turning agility slightly to simulate deep snowdrift
 * or volcanic ash-mire resistance, while driving the 3D traversal wake VFX.
 */
export function computeClimateTraversalModifier(
  weather: WeatherMode,
  isSheltered = false,
): ClimateTraversalModifier {
  if (weather === 'blizzard') {
    return {
      weather,
      isDifficultTraversal: true,
      speedDragMult: isSheltered ? 0.97 : 0.91,
      turnAgilityMult: isSheltered ? 0.94 : 0.82,
      steerInertiaMult: isSheltered ? 0.88 : 0.68,
      traversalStrain01: isSheltered ? 0.26 : 0.9,
      wakeColorHex: 0xbae6fd,
      accentColorHex: 0x38bdf8,
    };
  }
  if (weather === 'ashstorm') {
    return {
      weather,
      isDifficultTraversal: true,
      speedDragMult: isSheltered ? 0.97 : 0.92,
      turnAgilityMult: isSheltered ? 0.95 : 0.85,
      steerInertiaMult: isSheltered ? 0.9 : 0.72,
      traversalStrain01: isSheltered ? 0.24 : 0.85,
      wakeColorHex: 0xfb923c,
      accentColorHex: 0xfacc15,
    };
  }
  return {
    weather,
    isDifficultTraversal: false,
    speedDragMult: 1.0,
    turnAgilityMult: 1.0,
    steerInertiaMult: 1.0,
    traversalStrain01: 0,
    wakeColorHex: 0xffffff,
    accentColorHex: 0xffffff,
  };
}

export type ClimateLogSeverity = 'calm' | 'caution' | 'harsh' | 'extreme';

export interface ClimateLogNotice {
  weather: WeatherMode;
  label: string;
  message: string;
  effectNote: string;
  severity: ClimateLogSeverity;
}

export const CLIMATE_LOG_MESSAGES: Record<WeatherMode, readonly string[]> = {
  clear: [
    'The storm clouds part, revealing crisp alpine light across the peaks.',
    'Warm mountain currents steady the ridge and clear the skies.',
    'Sunlight breaks through the canopy as the highland air settles.',
  ],
  mist: [
    'Cool highland mist drifts down from the crags, dampening the trail.',
    'Pale ribbons of mountain vapor coil silently around the slopes.',
    'A quiet chill gathers as drifting mist blankets the valley ridges.',
  ],
  fog: [
    'Dense valley fog closes in, swallowing the distant ridges.',
    'A suffocating wall of gray mist settles heavily over the paths.',
    'Visibility fades as thick mountain fog rolls across the highlands.',
  ],
  rain: [
    'Dark clouds break overhead as driving mountain rain lashes the slopes.',
    'Cold downpours sweep the crags, turning every ridge slick underfoot.',
    'Steady rain hammers the canopy and chills the surrounding air.',
  ],
  storm: [
    'Thunder fractures the upper peaks as a violent tempest descends.',
    'Lightning forks above the ridge while gale winds tear across the pass.',
    'The sky blackens and roaring storm squalls engulf the mountain.',
  ],
  blizzard: [
    'The air grows heavy with impending frost...',
    'Biting glacial gales surge across the peaks in a blinding whiteout.',
    'Ice needles whip through the pass as bitter frost creeps inward.',
  ],
  ashstorm: [
    'Scorching embers drift down as a volcanic ash storm engulfs the range.',
    'The horizon burns crimson beneath choking waves of cinders and soot.',
    'Superheated ash sweeps across the highlands, searing every breath.',
  ],
};

export function createClimateLogNotice(
  weather: WeatherMode,
  variantIndex = 0,
): ClimateLogNotice {
  const lines = CLIMATE_LOG_MESSAGES[weather];
  const safeIdx = ((Math.floor(variantIndex) % lines.length) + lines.length) % lines.length;
  const effect = CLIMATE_EFFECTS[weather];
  const pacePct = Math.round(effect.speedMult * 100);
  const effectNote =
    effect.hpDrainPerSec > 0
      ? `-${effect.hpDrainPerSec.toFixed(1)} HP/s · ${pacePct}% pace`
      : `Safe Climate · ${pacePct}% pace`;
  const severity: ClimateLogSeverity =
    weather === 'blizzard' || weather === 'ashstorm'
      ? 'extreme'
      : weather === 'rain' || weather === 'storm'
        ? 'harsh'
        : weather === 'mist' || weather === 'fog'
          ? 'caution'
          : 'calm';

  return {
    weather,
    label: WEATHER_LABELS[weather],
    message: lines[safeIdx],
    effectNote,
    severity,
  };
}

export interface CombatStrikeResolution {
  damage: number;
  triggeredParry: boolean;
  triggeredStaggerBonus: boolean;
}

/**
 * Pure tactical duel resolver: interrupting an enemy's windup or lunge with a
 * melee/shockwave/dash strike triggers a Counter-Parry Clash (1.55x dmg + stagger),
 * while striking an already staggered enemy deals 1.5x posture-break damage.
 */
export function resolveCombatStrike(
  baseDamage: number,
  enemyState: BeastState,
  canCounterParry: boolean,
): CombatStrikeResolution {
  if (canCounterParry && (enemyState === 'windup' || enemyState === 'lunge')) {
    return {
      damage: Math.round(baseDamage * 1.55),
      triggeredParry: true,
      triggeredStaggerBonus: false,
    };
  }
  if (enemyState === 'stagger') {
    return {
      damage: Math.round(baseDamage * 1.5),
      triggeredParry: false,
      triggeredStaggerBonus: true,
    };
  }
  return {
    damage: Math.round(baseDamage),
    triggeredParry: false,
    triggeredStaggerBonus: false,
  };
}

export interface GunRecoilPhysics {
  fallbackVel: number;
  speedDrop: number;
  visualStrength: number;
  bulletSpeedMult: number;
  knockbackForce: number;
}

/**
 * Half-human stages (Level 8 Naga Initiate through Level 12 Ascended Human)
 * wield the runic hand cannon in the right hand.
 */
export function hasHalfHumanGun(level: number): boolean {
  return level >= 8;
}

/**
 * Pure recoil & ballistic scaling for the half-human hand cannon.
 * Produces real physical backward fallback velocity, forward momentum check,
 * animation/camera kick intensity, and enemy stopping knockback.
 */
export function computeGunRecoilPhysics(level: number): GunRecoilPhysics {
  const tier = Math.max(0, Math.min(4, Math.floor(level) - 8));
  return {
    fallbackVel: Number((7.6 + tier * 0.65).toFixed(2)),
    speedDrop: Number((2.2 + tier * 0.25).toFixed(2)),
    visualStrength: Number((0.95 + tier * 0.08).toFixed(2)),
    bulletSpeedMult: Number((1.48 + tier * 0.06).toFixed(2)),
    knockbackForce: Number((7.6 + tier * 0.75).toFixed(2)),
  };
}

const SEGMENT_SPACING = 0.72;
const INITIAL_LENGTH = 8;
const MAX_LENGTH = 115;
const TARGET_ORBS = 36;
const GOLDEN_ORB_COUNT = 12;
const COMBO_WINDOW = 9.5;
const OBSTACLE_CELL = 12;

export class SnakeGameController {
  public readonly world: WorldEngine;
  public readonly sound: SoundEngine;

  private onHudUpdate: (snapshot: HudSnapshot) => void;
  private onMinimapUpdate: (snapshot: MinimapSnapshot) => void;
  private onToast: (msg: string) => void;
  private onLevelUp?: (summary: EvolutionUnlockSummary) => void;
  private onClimateNotice?: (notice: ClimateLogNotice) => void;
  private onCompliment?: (notice: ComplimentNotice) => void;
  private onCombatTaunt?: (notice: FloatingTauntNotice) => void;
  private onTauntAnchorUpdate?: (pos: { x: number; y: number; visible: boolean }) => void;
  private onPortalBrowserOpen?: (variant: PortalVariant, hasTwinWarp: boolean) => void;
  public readonly portalBrowser = new PortalChromiumManager();
  private pendingPortalWarp: { x: number; z: number; variant: PortalVariant } | null = null;
  private portalTextureAnimAccum = 0;
  private portalWarpSeq = 0;
  private climateMessageSeq: Partial<Record<WeatherMode, number>> = {};
  private readonly complimentOracle = new SerpentComplimentOracle();
  private readonly tauntOracle = new SerpentTauntOracle();
  private complimentTimer = 14;
  private combatTauntCooldown = 0;
  private lastTauntedBeastId: number | null = null;
  private currentSteerRate = 0;
  private currentTraversalStrain = 0;
  private traversalWakeAccum = 0;
  private recoilVelX = 0;
  private recoilVelZ = 0;
  private hitstopTimer = 0;

  private mode: GameMode = 'title';
  private cameraMode: CameraMode = 'ant';
  private speedPreset: SpeedPreset = 'classic';
  private weather: WeatherMode = 'mist';
  private builderTool: BuilderTool = 'wall';
  private builderMirror = false;

  private formation: FormationData;
  private savedFormations: FormationData[];

  // Continuous 360° Snake GTA state
  private headX = 0;
  private headZ = 4;
  private headY = 3.2;
  private heading = Math.PI; // facing North (-Z) toward Whispering Foothill & the northern peaks
  private currentSpeed = 7.6;
  private snakeLength = INITIAL_LENGTH;
  private pathHistory: PathSample[] = [];
  private totalTravelDist = 0;
  private stamina = 1.0;

  // Held analog controls
  private steerLeftHeld = false;
  private steerRightHeld = false;
  private boostHeld = false;
  private brakeHeld = false;
  private touchSteerAxis = 0; // -1..+1

  // Cooldowns & buffs
  private boostPadTimer = 0;
  private portalCooldown = 0;
  private grazeCooldown = 0;
  private invulnTimer = 0;

  // World collectibles, dynamic boulders, roaming wild beasts & magical combat
  private orbs: CollectibleOrb[] = [];
  private nextOrbId = 1;
  private rollingBoulders: RollingBoulder[] = [];
  private nextBoulderId = 1;
  private beasts: WildBeast[] = [];
  private nextBeastId = 1;
  private projectiles: MagicProjectile[] = [];
  private nextProjectileId = 1;
  private shockwaves: ShockwaveEffect[] = [];
  private nextShockwaveId = 1;
  private fissures: GroundFissure[] = [];
  private nextFissureId = 1;
  private visitedLandmarks = new Set<string>();
  private orbRecycleAccum = 0;
  private beastSpawnAccum = 0;

  // Player Vitality, Dou Qi, 4 Fighting Skills, Environment Drain & Soul Clan Heat
  private hp = 100;
  private maxHp = 100;
  private qi = 100;
  private maxQi = 100;
  private hpRegenDelay = 0;
  private hurtInvuln = 0;
  private recentHurtPulse = 0;
  private primarySpellCd = 0;
  private shockwaveCd = 0;
  private dashCd = 0;
  private ultimateCd = 0;
  private primarySpellMaxCd = 0.42;
  private shockwaveMaxCd = 3.8;
  private dashMaxCd = 4.8;
  private ultimateMaxCd = 11.5;
  private dashActiveTimer = 0;
  private dashHitIds = new Set<number>();
  private dashSparkAccum = 0;
  private lastEngagedBeastId: number | null = null;
  private lastEngagedTimer = 0;

  // Harsh environment & Vice-City Soul Clan Ambush state
  private isSheltered = false;
  private currentEnvDrainPerSec = 0;
  private weatherShiftTimer = 24;
  private clanHeatValue = 0; // 0..100 -> 0..5 Skulls
  private ghostAmbushTimer = 11;
  private ambushBannerTimer = 0;

  // Persistent 12-level Serpent -> Human Ascension Journey + Historical Milestones
  private xp = 0;
  private level = 1;
  private lastCheckpointId: string | null = null;
  private hasAscended = false;
  private xpLostOnCrash = 0;
  private lifetimeStats: JourneyLifetimeStats = createEmptyLifetimeStats();
  private milestones: JourneyMilestone[] = [];
  private bestiaryRecords: Partial<Record<BestiaryEntryId, BestiaryRecord>> = {};
  private statsSaveAccum = 0;
  private pendingEvolutionSummary: EvolutionUnlockSummary | null = null;
  private evolutionModalDelay = 0;
  private modalFreeze = false;

  // Cached combined obstacles + 2D spatial hash grid for fast O(1) collision queries
  private activeObstacles: WorldObstacle[] = [];
  private obstacleGrid = new Map<string, WorldObstacle[]>();

  // Score & stats
  private score = 0;
  private bestScore = 0;
  private combo = 0;
  private maxCombo = 0;
  private comboTimer = 0;
  private fruitsEaten = 0;
  private deathReason = '';
  private isNewBest = false;

  // Title autopilot state
  private demoPhase = 0;
  private hudEmitAccum = 0;
  private minimapEmitAccum = 0;

  constructor(
    container: HTMLElement,
    onHudUpdate: (snapshot: HudSnapshot) => void,
    onMinimapUpdate: (snapshot: MinimapSnapshot) => void,
    onToast: (msg: string) => void,
    onLevelUp?: (summary: EvolutionUnlockSummary) => void,
    onClimateNotice?: (notice: ClimateLogNotice) => void,
    onCompliment?: (notice: ComplimentNotice) => void,
    onCombatTaunt?: (notice: FloatingTauntNotice) => void,
    onTauntAnchorUpdate?: (pos: { x: number; y: number; visible: boolean }) => void,
    onPortalBrowserOpen?: (variant: PortalVariant, hasTwinWarp: boolean) => void,
  ) {
    this.onHudUpdate = onHudUpdate;
    this.onMinimapUpdate = onMinimapUpdate;
    this.onToast = onToast;
    this.onLevelUp = onLevelUp;
    this.onClimateNotice = onClimateNotice;
    this.onCompliment = onCompliment;
    this.onCombatTaunt = onCombatTaunt;
    this.onTauntAnchorUpdate = onTauntAnchorUpdate;
    this.onPortalBrowserOpen = onPortalBrowserOpen;

    this.sound = new SoundEngine();
    this.world = new WorldEngine(container);
    this.portalBrowser.onChange(() => {
      this.syncPortalTextures();
    });

    this.savedFormations = loadSavedFormations();
    this.bestScore = loadBestScore();
    this.formation = cloneFormation(PRESET_FORMATIONS[0]);

    // Restore persistent 12-level ascension journey, lifetime telemetry & milestones
    const saved = loadJourneyProgress();
    this.xp = saved.xp;
    this.visitedLandmarks = new Set(
      saved.visitedLandmarkIds.filter((id) => WORLD_LANDMARKS.some((lm) => lm.id === id)),
    );
    this.level = Math.max(
      saved.level,
      computeEvolutionLevel(this.xp, this.visitedLandmarks.size),
    );
    this.lastCheckpointId =
      saved.lastCheckpointId && WORLD_LANDMARKS.some((lm) => lm.id === saved.lastCheckpointId)
        ? saved.lastCheckpointId
        : null;
    this.hasAscended = saved.hasAscended || this.level >= MAX_EVOLUTION_LEVEL;
    this.lifetimeStats = saved.stats;
    this.milestones = saved.milestones;
    this.bestiaryRecords = saved.bestiary ? { ...saved.bestiary } : {};
    this.ensureOriginMilestone();
    this.syncAutonomousDifficulty();

    this.applyFormationToWorld(true);
    this.world.setWeather(this.weather);
    this.sound.setWeather(this.weather);
    this.sound.setWeatherAudioCueListener((cue) => this.world.triggerWeatherAudioCue(cue));
    this.sound.setEvolutionTier(this.level, false);
    this.resetRunState(false);

    this.world.start((dt) => this.tick(dt));
  }

  // ==================== PUBLIC ACCESSORS ====================

  public getFormation(): FormationData {
    return this.formation;
  }

  public getSavedFormations(): FormationData[] {
    return this.savedFormations;
  }

  public getEvolutionStages(): EvolutionStage[] {
    return EVOLUTION_STAGES;
  }

  public getBestiarySnapshot(): BestiarySnapshot {
    return buildBestiarySnapshot(this.bestiaryRecords, this.level);
  }

  public setModalFreeze(frozen: boolean): void {
    this.modalFreeze = frozen;
    if (frozen) {
      this.clearHeldInputs();
      if (this.mode === 'playing') {
        this.sound.setPausedDuck(true);
      }
    } else if (this.mode === 'playing') {
      this.sound.setPausedDuck(false);
    }
  }

  public getEvolutionSummary(
    previousLevel = Math.max(1, this.level - 1),
    latestMilestoneId: string | null = null,
  ): EvolutionUnlockSummary {
    const stage = getStageForLevel(this.level);
    const magic = getMagicTierForLevel(this.level);
    const nextStage = getNextStage(this.level);
    const humanity = computeHumanityMetrics(
      this.level,
      this.visitedLandmarks.size,
      WORLD_LANDMARKS.length,
    );
    return {
      level: this.level,
      previousLevel,
      stage,
      magic,
      nextStage,
      isHuman: this.level >= MAX_EVOLUTION_LEVEL,
      xp: this.xp,
      visitedCount: this.visitedLandmarks.size,
      totalLandmarks: WORLD_LANDMARKS.length,
      humanity,
      stats: { ...this.lifetimeStats },
      milestones: [...this.milestones],
      latestMilestoneId,
    };
  }

  public getMode(): GameMode {
    return this.mode;
  }

  public getCameraMode(): CameraMode {
    return this.cameraMode;
  }

  public getBuilderTool(): BuilderTool {
    return this.builderTool;
  }

  public getBuilderMirror(): boolean {
    return this.builderMirror;
  }

  public setBuilderTool(tool: BuilderTool): void {
    this.builderTool = tool;
    this.sound.playClick();
  }

  public toggleBuilderMirror(): boolean {
    this.builderMirror = !this.builderMirror;
    this.sound.playClick();
    return this.builderMirror;
  }

  public setBiome(biome: BiomeId): void {
    if (this.formation.biome === biome) return;
    this.formation.biome = biome;
    this.applyFormationToWorld(true);
    this.spawnInitialOrbs();
    this.spawnRollingBoulders();
    this.spawnInitialBeasts();
    this.sound.playClick();
    this.emitHud();
  }

  private syncAutonomousDifficulty(): void {
    this.speedPreset = computeAutonomousDifficulty(this.level);
  }

  public getWeather(): WeatherMode {
    return this.weather;
  }

  private rollNextShiftDelay(): number {
    const cfg = SPEED_CONFIG[this.speedPreset];
    return cfg.shiftMinSec + Math.random() * (cfg.shiftMaxSec - cfg.shiftMinSec);
  }

  private pickNextDynamicWeather(): WeatherMode {
    // Weighted toward harsh/severe climates based on difficulty & progression,
    // guaranteed to pick a different climate every time.
    const pool: WeatherMode[] =
      this.speedPreset === 'chill'
        ? ['mist', 'fog', 'rain', 'storm', 'blizzard', 'clear']
        : this.speedPreset === 'turbo'
          ? ['rain', 'storm', 'blizzard', 'ashstorm', 'storm', 'blizzard', 'ashstorm', 'fog']
          : ['fog', 'rain', 'storm', 'blizzard', 'ashstorm', 'mist', 'storm', 'blizzard'];
    const candidates = pool.filter((w) => w !== this.weather);
    return candidates[Math.floor(Math.random() * candidates.length)] ?? 'storm';
  }

  private shiftClimateDynamically(announce: boolean): void {
    const next = this.pickNextDynamicWeather();
    this.weather = next;
    this.world.setWeather(next);
    this.sound.setWeather(next);
    this.weatherShiftTimer = this.rollNextShiftDelay();
    if (announce) {
      const seq = this.climateMessageSeq[next] ?? 0;
      this.climateMessageSeq[next] = seq + 1;
      const notice = createClimateLogNotice(next, seq);
      if (this.onClimateNotice) {
        this.onClimateNotice(notice);
      } else {
        this.onToast(`${notice.label} — ${notice.message}`);
      }
      if (this.mode === 'playing' && (next === 'storm' || next === 'blizzard' || next === 'ashstorm')) {
        this.triggerCompliment('climate_endured', 'normal');
      }
    }
    this.emitHud();
  }

  private triggerCompliment(
    event: ComplimentEventKind,
    priority: 'normal' | 'high' = 'normal',
    enemyName?: string,
  ): void {
    if (!this.onCompliment) return;
    if (this.mode !== 'playing' && event !== 'evolution') return;
    const stage = getStageForLevel(this.level);
    const magic = getMagicTierForLevel(this.level);
    void this.complimentOracle
      .requestCompliment(
        {
          event,
          stageTitle: stage.title,
          level: this.level,
          realmName: magic.realmName,
          weather: this.weather,
          enemyName,
          combo: this.combo,
          peaksVisited: this.visitedLandmarks.size,
        },
        priority,
      )
      .then((notice) => {
        if (notice && (this.mode === 'playing' || this.mode === 'paused' || event === 'evolution')) {
          this.onCompliment?.(notice);
        }
      });
  }

  private triggerCombatTaunt(
    beast: WildBeast,
    moment: TauntMoment,
    priority: 'normal' | 'high' = 'normal',
  ): void {
    if (!this.onCombatTaunt) return;
    if (this.mode !== 'playing') return;
    const stage = getStageForLevel(this.level);
    const magic = getMagicTierForLevel(this.level);
    this.lastTauntedBeastId = beast.id;
    this.combatTauntCooldown = priority === 'high' ? 4.5 : 8.5;
    void this.tauntOracle
      .requestTaunt(
        {
          enemyKind: beast.kind,
          enemyName: beast.name,
          enemyFaction: beast.faction,
          isBoss: beast.isBoss,
          moment,
          stageTitle: stage.title,
          level: this.level,
          realmName: magic.realmName,
          hasGun: hasHalfHumanGun(this.level),
          weather: this.weather,
        },
        priority,
      )
      .then((notice) => {
        if (notice && this.mode === 'playing') {
          this.onCombatTaunt?.(notice);
        }
      });
  }

  public cycleCameraMode(): CameraMode {
    const order: CameraMode[] = ['ant', 'chase', 'aerial'];
    const idx = order.indexOf(this.cameraMode);
    const next = order[(idx + 1) % order.length];
    this.cameraMode = next;
    this.sound.playClick();
    this.emitHud();
    return this.cameraMode;
  }

  public loadPreset(id: string): void {
    const preset =
      PRESET_FORMATIONS.find((p) => p.id === id) ||
      this.savedFormations.find((p) => p.id === id);
    if (!preset) return;
    this.formation = cloneFormation(preset);
    this.applyFormationToWorld(true);
    this.resetRunState(this.mode !== 'title');
    this.sound.playClick();
    this.emitHud();
  }

  public clearFormation(): void {
    this.formation = {
      id: `custom-${Date.now()}`,
      name: 'Custom Mountain',
      biome: this.formation.biome,
      props: [],
    };
    this.applyFormationToWorld(false);
    this.sound.playPlaceBlock(true);
    this.emitHud();
  }

  public saveCurrentFormation(name: string): void {
    const clean = name.trim().slice(0, 24) || 'Custom Mountain';
    this.formation.name = clean;
    if (PRESET_FORMATIONS.some((p) => p.id === this.formation.id)) {
      this.formation.id = `custom-${Date.now()}`;
    }
    this.savedFormations = saveCustomFormation(this.formation);
    this.sound.playClick();
    this.onToast(`Saved "${clean}" to your mountain courses!`);
    this.emitHud();
  }

  public exportShareCode(): string {
    return encodeFormationCode(this.formation);
  }

  public importShareCode(code: string): boolean {
    const decoded = decodeFormationCode(code);
    if (!decoded) return false;
    this.formation = decoded;
    this.applyFormationToWorld(true);
    this.resetRunState(this.mode !== 'title');
    this.sound.playEat(3, true);
    this.onToast(`Loaded shared mountain "${decoded.name}"!`);
    this.emitHud();
    return true;
  }

  // ==================== GAME FLOW & JOURNEY ====================

  public startGame(): void {
    this.sound.unlock();
    this.sound.setPausedDuck(false);
    this.sound.playClick();
    this.pendingEvolutionSummary = null;
    this.evolutionModalDelay = 0;
    this.mode = 'playing';
    this.world.setBuilderOverlayVisible(false);
    this.resetRunState(true);
    this.emitHud();
    this.emitMinimap();
  }

  public dismissEvolutionSummary(): void {
    if (this.mode !== 'evolving') return;
    if (this.pendingEvolutionSummary) {
      const pending = this.pendingEvolutionSummary;
      this.pendingEvolutionSummary = null;
      this.evolutionModalDelay = 0;
      this.onLevelUp?.(pending);
      return;
    }
    this.sound.unlock();
    this.sound.setPausedDuck(false);
    this.sound.playClick();
    this.mode = 'playing';
    this.invulnTimer = Math.max(this.invulnTimer, 2.2);
    this.emitHud();
  }

  public continueAsHuman(): void {
    if (this.mode === 'ascended' && this.pendingEvolutionSummary) {
      const pending = this.pendingEvolutionSummary;
      this.pendingEvolutionSummary = null;
      this.evolutionModalDelay = 0;
      this.onLevelUp?.(pending);
      return;
    }
    this.sound.unlock();
    this.sound.setPausedDuck(false);
    this.sound.playClick();
    this.mode = 'playing';
    this.invulnTimer = 2.2;
    this.emitHud();
    this.onToast('Roam the continent freely as an Ascended Human!');
  }

  /** Delegate graphics quality to the renderer. */
  public setGraphicsQuality(quality: 'low' | 'medium' | 'high'): void {
    this.world.setGraphicsQuality(quality);
  }

  public resetJourney(): void {
    this.sound.unlock();
    this.sound.setPausedDuck(false);
    this.sound.playClick();
    this.pendingEvolutionSummary = null;
    this.evolutionModalDelay = 0;
    clearJourneyProgress();
    this.xp = 0;
    this.level = 1;
    this.syncAutonomousDifficulty();
    this.sound.setEvolutionTier(1, false);
    this.visitedLandmarks.clear();
    this.lastCheckpointId = null;
    this.hasAscended = false;
    this.xpLostOnCrash = 0;
    this.lifetimeStats = createEmptyLifetimeStats();
    this.milestones = [];
    this.bestiaryRecords = {};
    this.ensureOriginMilestone();
    this.mode = 'playing';
    this.world.setBuilderOverlayVisible(false);
    this.resetRunState(false);
    this.persistJourney();
    this.emitHud();
    this.emitMinimap();
    this.onToast('New Odyssey begun! Climb all 12 Trial Peaks to become Human.');
  }

  public enterBuilder(): void {
    this.sound.unlock();
    this.sound.setPausedDuck(false);
    this.sound.playClick();
    this.pendingEvolutionSummary = null;
    this.evolutionModalDelay = 0;
    this.mode = 'builder';
    this.clearHeldInputs();
    this.world.setBuilderOverlayVisible(true);
    this.world.resetBuilderCamera();
    this.emitHud();
  }

  public returnToTitle(): void {
    this.sound.setPausedDuck(false);
    this.sound.playClick();
    this.pendingEvolutionSummary = null;
    this.evolutionModalDelay = 0;
    this.mode = 'title';
    this.clearHeldInputs();
    this.world.setBuilderOverlayVisible(false);
    this.resetRunState(false);
    this.emitHud();
  }

  public togglePause(): void {
    if (this.mode === 'playing') {
      this.mode = 'paused';
      this.clearHeldInputs();
      this.sound.setPausedDuck(true);
      this.sound.playClick();
      this.emitHud();
    } else if (this.mode === 'paused') {
      this.mode = 'playing';
      this.sound.setPausedDuck(false);
      this.sound.playClick();
      this.emitHud();
    }
  }

  private ensureOriginMilestone(): void {
    if (this.milestones.length > 0) return;
    this.milestones.push({
      id: 'origin-hatchling',
      kind: 'evolution',
      title: 'Awakened as Valley Hatchling',
      detail: 'Entered the alpine valley to begin the 12-peak path to Humanity.',
      level: 1,
      altitudeMeters: 45,
      elapsedSeconds: 0,
      recordedAt: Date.now(),
    });
  }

  private recordMilestone(
    id: string,
    kind: MilestoneKind,
    title: string,
    detail: string,
    levelOverride?: number,
  ): boolean {
    if (this.milestones.some((m) => m.id === id)) return false;
    const altMeters = Math.max(0, Math.round((this.headY - WATER_LEVEL) * 14));
    this.milestones.push({
      id,
      kind,
      title,
      detail,
      level: levelOverride ?? this.level,
      altitudeMeters: altMeters,
      elapsedSeconds: Math.round(this.lifetimeStats.timePlayedSeconds),
      recordedAt: Date.now(),
    });
    if (this.milestones.length > 48) {
      this.milestones = this.milestones.slice(-48);
    }
    return true;
  }

  private persistJourney(): void {
    saveJourneyProgress({
      xp: this.xp,
      level: this.level,
      visitedLandmarkIds: Array.from(this.visitedLandmarks),
      lastCheckpointId: this.lastCheckpointId,
      hasAscended: this.hasAscended,
      stats: this.lifetimeStats,
      milestones: this.milestones,
      bestiary: this.bestiaryRecords,
    });
  }

  public markBestiaryInspected(speciesId: BestiaryEntryId): boolean {
    const prev = this.bestiaryRecords[speciesId];
    if (prev?.inspected) return false;
    const updated: BestiaryRecord = prev
      ? { ...prev, inspected: true }
      : { ...createEmptyBestiaryRecord(), inspected: true };
    this.bestiaryRecords[speciesId] = updated;
    this.persistJourney();
    return true;
  }

  private recordBeastEncounter(speciesId: BestiaryEntryId): void {
    const existing = this.bestiaryRecords[speciesId];
    if (existing?.encountered) return;
    const rec = existing ? { ...existing, encountered: true } : { ...createEmptyBestiaryRecord(), encountered: true };
    this.bestiaryRecords[speciesId] = rec;
    this.persistJourney();
  }

  private recordBeastDefeat(beast: WildBeast): { newlyCataloged: boolean; newlyUnlockedLore: boolean } {
    const def = BESTIARY_CATALOG.find((e) => e.id === beast.speciesId);
    const prev = this.bestiaryRecords[beast.speciesId] ?? createEmptyBestiaryRecord();
    const prevLore = def ? countUnlockedLoreForEntry(def, prev.defeatedCount) : 0;
    const nextCount = prev.defeatedCount + 1;
    const altMeters = Math.max(0, Math.round((beast.y - WATER_LEVEL) * 14));

    const updated: BestiaryRecord = {
      encountered: true,
      inspected: prev.inspected,
      defeatedCount: nextCount,
      firstDefeatedAt: prev.firstDefeatedAt ?? Date.now(),
      firstDefeatedLevel: prev.defeatedCount === 0 ? this.level : prev.firstDefeatedLevel,
      lowestTierDefeated:
        prev.lowestTierDefeated === null ? this.level : Math.min(prev.lowestTierDefeated, this.level),
      highestAltitudeMeters: Math.max(prev.highestAltitudeMeters, altMeters),
    };
    this.bestiaryRecords[beast.speciesId] = updated;

    const nextLore = def ? countUnlockedLoreForEntry(def, nextCount) : 0;
    const newlyCataloged = prev.defeatedCount === 0;
    const newlyUnlockedLore = !newlyCataloged && nextLore > prevLore;

    const discoveredTotal = Object.values(this.bestiaryRecords).filter(
      (r) => r && r.defeatedCount > 0,
    ).length;
    if (discoveredTotal >= 5) {
      this.recordMilestone(
        'feat-bestiary-half',
        'feat',
        'Field Naturalist (5/10 Species)',
        'Cataloged five distinct magical beasts and Soul Clan spirits in the Bestiary.',
      );
    }
    if (discoveredTotal >= BESTIARY_CATALOG.length) {
      this.recordMilestone(
        'feat-bestiary-complete',
        'feat',
        `Master of the Bestiary (${BESTIARY_CATALOG.length}/${BESTIARY_CATALOG.length} Species)`,
        'Defeated and documented every magical beast and Soul Clan entity across the continent.',
      );
    }

    this.persistJourney();
    return { newlyCataloged, newlyUnlockedLore };
  }

  private getNextTargetLandmark(): MountainLandmark | null {
    for (const lm of WORLD_LANDMARKS) {
      if (!this.visitedLandmarks.has(lm.id)) {
        return lm;
      }
    }
    return null;
  }

  private getCheckpointName(): string {
    if (!this.lastCheckpointId) return 'Valley Start';
    const lm = WORLD_LANDMARKS.find((l) => l.id === this.lastCheckpointId);
    return lm ? `${lm.name} (Tier ${lm.tier})` : 'Valley Start';
  }

  // ==================== HELD ANALOG INPUTS ====================

  public setSteerLeft(held: boolean): void {
    this.steerLeftHeld = held;
  }

  public setSteerRight(held: boolean): void {
    this.steerRightHeld = held;
  }

  public setBoostHeld(held: boolean): void {
    this.boostHeld = held;
  }

  public setBrakeHeld(held: boolean): void {
    this.brakeHeld = held;
  }

  public setTouchSteerAxis(axis: number): void {
    this.touchSteerAxis = Math.max(-1, Math.min(1, axis));
  }

  public clearHeldInputs(): void {
    this.steerLeftHeld = false;
    this.steerRightHeld = false;
    this.boostHeld = false;
    this.brakeHeld = false;
    this.touchSteerAxis = 0;
  }

  // ==================== ESCALATING SERPENT MAGIC COMBAT ====================

  public castPrimaryMagic(): void {
    if (this.mode !== 'playing') return;
    if (this.primarySpellCd > 0) return;

    const magic = getMagicTierForLevel(this.level);
    this.primarySpellMaxCd = magic.boltCooldown;
    this.primarySpellCd = magic.boltCooldown;

    // Gentle forward-cone auto-aim toward the closest threatening beast ahead
    let aimHeading = this.heading;
    let bestScore = Infinity;
    for (const beast of this.beasts) {
      const dx = beast.x - this.headX;
      const dz = beast.z - this.headZ;
      const dist = Math.hypot(dx, dz);
      if (dist > 46 || dist < 1.2) continue;
      const angleToBeast = Math.atan2(dx, dz);
      const diff = Math.abs(((angleToBeast - this.heading + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      if (diff <= 0.78) {
        const weighted = dist * (1 + diff * 0.9);
        if (weighted < bestScore) {
          bestScore = weighted;
          aimHeading = angleToBeast;
        }
      }
    }

    const count = magic.boltCount;
    const usingGun = hasHalfHumanGun(this.level);
    const recoil = usingGun ? computeGunRecoilPhysics(this.level) : null;
    const baseY = this.headY + (this.level >= 10 ? 1.35 : 0.9);
    const muzzlePos = usingGun ? this.world.getGunMuzzleWorldPosition() : null;
    const boltStyle = usingGun ? 'bullet' : this.level >= 5 ? 'flame' : 'bolt';
    const shotColor = usingGun ? 0xffc857 : magic.manaColorHex;
    const shotDamage = usingGun ? Math.round(magic.boltDamage * 1.08) : magic.boltDamage;

    for (let i = 0; i < count; i++) {
      const offsetFrac = count === 1 ? 0 : i / (count - 1) - 0.5;
      const spreadScale = usingGun ? magic.boltSpreadRad * 1.15 : magic.boltSpreadRad * 2;
      const shotAngle = aimHeading + offsetFrac * spreadScale;
      const dx = Math.sin(shotAngle);
      const dz = Math.cos(shotAngle);

      const projSpeed = usingGun && recoil
        ? magic.boltSpeed * recoil.bulletSpeedMult
        : magic.boltSpeed * 0.72;
      const spawnX = muzzlePos
        ? muzzlePos.x + dx * 0.18
        : this.headX + dx * 1.15 + (usingGun ? Math.cos(aimHeading) * 0.34 : 0);
      const spawnY = muzzlePos ? muzzlePos.y : baseY;
      const spawnZ = muzzlePos
        ? muzzlePos.z + dz * 0.18
        : this.headZ + dz * 1.15 - (usingGun ? Math.sin(aimHeading) * 0.34 : 0);

      this.projectiles.push({
        id: this.nextProjectileId++,
        fromPlayer: true,
        x: spawnX,
        y: spawnY,
        z: spawnZ,
        vx: dx * projSpeed,
        vy: 0,
        vz: dz * projSpeed,
        radius: usingGun ? 0.38 : 0.46 + (this.level >= 9 ? 0.12 : 0),
        damage: shotDamage,
        colorHex: shotColor,
        life: usingGun ? 1.75 : 2.1,
        maxLife: usingGun ? 1.75 : 2.1,
        homing: usingGun ? false : magic.boltHoming,
        style: boltStyle,
      });
    }

    // Close-quarters Serpent Fang Strike: striking within melee range bites directly and can parry wind-ups!
    for (let i = this.beasts.length - 1; i >= 0; i--) {
      const b = this.beasts[i];
      if (b.state === 'emerging' && b.emergeProgress < 0.45) continue;
      const bdx = b.x - this.headX;
      const bdz = b.z - this.headZ;
      const bDist = Math.hypot(bdx, bdz);
      if (bDist <= b.radius + 4.4) {
        const angToB = Math.atan2(bdx, bdz);
        const angDiff = Math.abs(((angToB - this.heading + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
        if (angDiff <= 1.18) {
          const nx = bDist > 0.01 ? bdx / bDist : Math.sin(this.heading);
          const nz = bDist > 0.01 ? bdz / bDist : Math.cos(this.heading);
          this.applyDuelHitToBeast(b, magic.boltDamage * 0.92, nx, nz, b.isBoss ? 4.2 : 7.5, true);
        }
      }
    }

    if (this.projectiles.length > 52) {
      this.projectiles.splice(0, this.projectiles.length - 52);
    }

    if (usingGun && recoil) {
      // Real physical fallback recoil shoves the half-human character backward opposite the shot
      const kickDirX = Math.sin(aimHeading);
      const kickDirZ = Math.cos(aimHeading);
      this.recoilVelX -= kickDirX * recoil.fallbackVel;
      this.recoilVelZ -= kickDirZ * recoil.fallbackVel;
      this.currentSpeed = Math.max(0.45, this.currentSpeed - recoil.speedDrop);

      this.world.triggerGunRecoil(recoil.visualStrength);
      this.sound.playGunshot(this.level);
    } else {
      this.sound.playCastSpell(this.level);
      const castX = this.headX + Math.sin(this.heading) * 1.1;
      const castZ = this.headZ + Math.cos(this.heading) * 1.1;
      this.world.spawnBurst(castX, baseY, castZ, magic.manaColorHex, 8 + Math.min(8, this.level));
      this.world.triggerSoulSkillEffect(
        castX,
        baseY - 0.35,
        castZ,
        0.34 + Math.min(0.24, this.level * 0.02),
      );
    }
  }

  public castShockwave(): void {
    if (this.mode !== 'playing') return;
    if (this.shockwaveCd > 0) return;

    const magic = getMagicTierForLevel(this.level);
    this.shockwaveMaxCd = magic.shockwaveCooldown;
    this.shockwaveCd = magic.shockwaveCooldown;

    this.shockwaves.push({
      id: this.nextShockwaveId++,
      fromPlayer: true,
      x: this.headX,
      y: this.headY,
      z: this.headZ,
      radius: 0.8,
      maxRadius: magic.shockwaveRadius,
      age: 0,
      life: 0.56,
      colorHex: magic.manaColorHex,
    });
    if (this.shockwaves.length > 12) {
      this.shockwaves.shift();
    }

    // Immediate shockwave impact: clash-parry wind-ups, stagger foes, dispel hostile spells, shatter boulders at Lv 4+
    for (let i = this.beasts.length - 1; i >= 0; i--) {
      const b = this.beasts[i];
      if (b.state === 'emerging' && b.emergeProgress < 0.35) continue;
      const dx = b.x - this.headX;
      const dz = b.z - this.headZ;
      const dist = Math.hypot(dx, dz);
      if (dist <= magic.shockwaveRadius + b.radius) {
        const nx = dist > 0.01 ? dx / dist : Math.sin(this.heading);
        const nz = dist > 0.01 ? dz / dist : Math.cos(this.heading);
        const push = b.isBoss ? 5.8 : 10.2;
        this.applyDuelHitToBeast(b, magic.shockwaveDamage, nx, nz, push, true);
      }
    }

    // Dispel incoming enemy spells inside the shockwave radius
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      if (p.fromPlayer) continue;
      if (Math.hypot(p.x - this.headX, p.z - this.headZ) <= magic.shockwaveRadius) {
        this.world.spawnBurst(p.x, p.y, p.z, magic.manaColorHex, 8);
        this.projectiles.splice(i, 1);
      }
    }

    // At Lv 4+ (Da Dou Shi and above), shockwave shatters nearby rolling avalanche boulders!
    if (magic.breaksBoulders) {
      for (let i = 0; i < this.rollingBoulders.length; i++) {
        const b = this.rollingBoulders[i];
        if (Math.hypot(b.x - this.headX, b.z - this.headZ) <= magic.shockwaveRadius + b.radius) {
          this.world.spawnBurst(b.x, b.y + b.radius, b.z, 0xffd24d, 18);
          this.addScore(80);
          this.rollingBoulders[i] = this.createRollingBoulderInstance();
        }
      }
    }

    this.sound.playShockwave(this.level);
    this.world.triggerShake(0.24 + (this.level / 12) * 0.22);
    this.world.spawnBurst(
      this.headX,
      this.headY + 1.0,
      this.headZ,
      magic.manaColorHex,
      18 + this.level * 2,
    );
    this.world.triggerSoulSkillEffect(this.headX, this.headY + 0.6, this.headZ, 0.74);
  }

  /**
   * Skill 3 [E / 3]: High-speed Dou Qi Fighting Dash — lunges forward invulnerably,
   * piercing enemies along the path for burst damage, stagger, and Qi sparks.
   */
  public castDashStrike(): void {
    if (this.mode !== 'playing') return;
    if (this.dashCd > 0) return;

    const magic = getMagicTierForLevel(this.level);
    if (this.qi < magic.dashQiCost) {
      this.onToast(`Need ${magic.dashQiCost} Dou Qi for ${magic.dashSkillName}!`);
      return;
    }

    this.qi = Math.max(0, this.qi - magic.dashQiCost);
    this.dashMaxCd = magic.dashCooldown;
    this.dashCd = magic.dashCooldown;
    this.dashActiveTimer = 0.48;
    this.dashHitIds.clear();
    this.invulnTimer = Math.max(this.invulnTimer, 0.56);
    this.boostPadTimer = Math.max(this.boostPadTimer, 0.55);

    this.shockwaves.push({
      id: this.nextShockwaveId++,
      fromPlayer: true,
      x: this.headX,
      y: this.headY,
      z: this.headZ,
      radius: 0.6,
      maxRadius: 4.8,
      age: 0,
      life: 0.3,
      colorHex: 0xffe066,
    });
    if (this.shockwaves.length > 12) this.shockwaves.shift();

    this.sound.playDashStrike(this.level);
    this.world.triggerShake(0.28);
    this.world.spawnBurst(
      this.headX,
      this.headY + 1.0,
      this.headZ,
      magic.manaColorHex,
      24,
    );
    this.world.triggerSoulSkillEffect(this.headX, this.headY + 0.7, this.headZ, 0.84);
    this.emitHud();
  }

  /**
   * Skill 4 [R / 4]: Ultimate Heavenly Flame Lotus (BTTH Signature Art) —
   * unleashes layered lotus shockwaves + 8 homing flame-lotus orbs + massive AoE blast.
   */
  public castUltimateLotus(): void {
    if (this.mode !== 'playing') return;
    if (this.ultimateCd > 0) return;

    const magic = getMagicTierForLevel(this.level);
    if (this.qi < magic.ultimateQiCost) {
      this.onToast(`Need ${magic.ultimateQiCost} Dou Qi for ${magic.ultimateSkillName}!`);
      return;
    }

    this.qi = Math.max(0, this.qi - magic.ultimateQiCost);
    this.ultimateMaxCd = magic.ultimateCooldown;
    this.ultimateCd = magic.ultimateCooldown;
    this.invulnTimer = Math.max(this.invulnTimer, 0.9);

    // Triple layered Heavenly Flame Lotus rings (jade -> gold -> solar flame)
    const ringColors = [magic.manaColorHex, 0xffd24d, 0xff5a36];
    for (let r = 0; r < 3; r++) {
      this.shockwaves.push({
        id: this.nextShockwaveId++,
        fromPlayer: true,
        x: this.headX,
        y: this.headY + r * 0.25,
        z: this.headZ,
        radius: 0.8 + r * 0.6,
        maxRadius: magic.ultimateRadius * (0.72 + r * 0.16),
        age: 0,
        life: 0.55 + r * 0.14,
        colorHex: ringColors[r],
      });
    }
    while (this.shockwaves.length > 14) this.shockwaves.shift();

    // Radial barrage of 8 homing Flame-Lotus orbs
    const petalCount = 8;
    const petalDmg = Math.max(16, Math.round(magic.ultimateDamage * 0.36));
    const baseY = this.headY + 1.4;
    for (let i = 0; i < petalCount; i++) {
      const ang = this.heading + (i / petalCount) * Math.PI * 2;
      const spd = magic.boltSpeed * 0.92;
      this.projectiles.push({
        id: this.nextProjectileId++,
        fromPlayer: true,
        x: this.headX + Math.sin(ang) * 1.4,
        y: baseY,
        z: this.headZ + Math.cos(ang) * 1.4,
        vx: Math.sin(ang) * spd,
        vy: 0,
        vz: Math.cos(ang) * spd,
        radius: 0.58,
        damage: petalDmg,
        colorHex: i % 2 === 0 ? 0xff7b3d : magic.manaColorHex,
        life: 2.1,
        maxLife: 2.1,
        homing: true,
        style: 'lotus',
      });
    }
    if (this.projectiles.length > 52) {
      this.projectiles.splice(0, this.projectiles.length - 52);
    }

    // Immediate catastrophic Lotus detonation against all foes inside ultimateRadius
    for (let i = this.beasts.length - 1; i >= 0; i--) {
      const b = this.beasts[i];
      const dx = b.x - this.headX;
      const dz = b.z - this.headZ;
      const dist = Math.hypot(dx, dz);
      if (dist <= magic.ultimateRadius + b.radius) {
        const nx = dist > 0.01 ? dx / dist : Math.sin(this.heading);
        const nz = dist > 0.01 ? dz / dist : Math.cos(this.heading);
        const push = b.isBoss ? 9.5 : 15.0;
        b.vx = nx * push;
        b.vz = nz * push;
        b.state = 'recover';
        b.stateTimer = 1.25;
        this.damageBeast(b, magic.ultimateDamage);
      }
    }

    // Dispel all enemy projectiles & shatter rolling boulders inside the Lotus bloom
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      if (p.fromPlayer) continue;
      if (Math.hypot(p.x - this.headX, p.z - this.headZ) <= magic.ultimateRadius * 1.25) {
        this.world.spawnBurst(p.x, p.y, p.z, 0xffd24d, 8);
        this.projectiles.splice(i, 1);
      }
    }
    for (let i = 0; i < this.rollingBoulders.length; i++) {
      const b = this.rollingBoulders[i];
      if (Math.hypot(b.x - this.headX, b.z - this.headZ) <= magic.ultimateRadius + b.radius) {
        this.world.spawnBurst(b.x, b.y + b.radius, b.z, 0xff9f43, 22);
        this.addScore(110);
        this.rollingBoulders[i] = this.createRollingBoulderInstance();
      }
    }

    this.sound.playUltimateLotus(this.level);
    this.world.triggerShake(0.58);
    this.world.spawnBurst(this.headX, this.headY + 1.4, this.headZ, 0xff9f43, 44);
    this.world.spawnBurst(this.headX, this.headY + 1.8, this.headZ, magic.manaColorHex, 32);
    this.world.triggerSoulSkillEffect(this.headX, this.headY + 0.9, this.headZ, 1.0);
    this.onToast(`${magic.ultimateSkillName}!`);
    this.emitHud();
  }

  // ==================== 3D MOUNTAIN FORMATION BUILDER ====================

  public applyBuilderAt(wx: number, wz: number, forceErase = false): void {
    if (this.mode !== 'builder') return;
    if (!isInWorldBounds(wx, wz)) return;

    const tool: BuilderTool = forceErase ? 'erase' : this.builderTool;

    if (tool === 'erase') {
      const before = this.formation.props.length;
      this.formation.props = this.formation.props.filter(
        (p) => Math.hypot(p.x - wx, p.z - wz) > 4.2,
      );
      if (this.formation.props.length !== before) {
        this.applyFormationToWorld(false);
        this.sound.playPlaceBlock(true);
      }
      return;
    }

    if (isNearSpawn(wx, wz, 7.5)) {
      this.onToast('Keep the starting valley meadow clear!');
      return;
    }
    if (isDeepWater(wx, wz, this.formation.biome)) {
      this.onToast('Place props on mountain land, not deep water!');
      return;
    }

    const targets: Array<{ x: number; z: number }> = [{ x: wx, z: wz }];
    if (this.builderMirror && tool !== 'portalA' && tool !== 'portalB') {
      const mx = -wx;
      if (!isNearSpawn(mx, wz, 7.5) && !isDeepWater(mx, wz, this.formation.biome)) {
        targets.push({ x: mx, z: wz });
      }
    }

    let placedAny = false;
    for (const t of targets) {
      const duplicate = this.formation.props.some(
        (p) => Math.hypot(p.x - t.x, p.z - t.z) < 2.6,
      );
      if (duplicate && tool !== 'portalA' && tool !== 'portalB') continue;

      if (tool === 'portalA' || tool === 'portalB') {
        this.formation.props = this.formation.props.filter((p) => p.type !== tool);
      }
      this.formation.props.push({
        id: `b-${Date.now()}-${Math.round(t.x)}-${Math.round(t.z)}`,
        type: tool as PropType,
        x: Math.round(t.x * 10) / 10,
        z: Math.round(t.z * 10) / 10,
      });
      placedAny = true;
    }

    if (placedAny) {
      this.applyFormationToWorld(false);
      this.sound.playPlaceBlock(false);
    }
  }

  // ==================== WORLD SYNC & SPATIAL GRID ====================

  private applyFormationToWorld(updateBiome: boolean): void {
    if (updateBiome) {
      this.world.setBiome(this.formation.biome);
      this.sound.setBiome(this.formation.biome);
    }
    this.world.syncFormation(this.formation);
    this.syncPortalTextures();
    this.rebuildObstacleCache();
  }

  public syncPortalTextures(): void {
    this.world.refreshPortalBrowserTextures((ctx, variant, phase) => {
      this.portalBrowser.drawPortalBrowserTexture(ctx, variant, phase);
    });
  }

  public hasPendingPortalWarp(): boolean {
    return this.pendingPortalWarp !== null;
  }

  private findNextPortalDestination(
    fromX: number,
    fromZ: number,
    activeVariant: PortalVariant,
  ): FormationProp | null {
    const pairType: PropType = activeVariant === 'A' ? 'portalB' : 'portalA';
    const twinCandidates = this.formation.props.filter(
      (p) => p.type === pairType && Math.hypot(p.x - fromX, p.z - fromZ) > 6,
    );
    if (twinCandidates.length > 0) {
      const chosen = twinCandidates[this.portalWarpSeq % twinCandidates.length];
      this.portalWarpSeq++;
      return chosen;
    }
    const anyPortal = this.formation.props.filter(
      (p) => (p.type === 'portalA' || p.type === 'portalB') && Math.hypot(p.x - fromX, p.z - fromZ) > 6,
    );
    if (anyPortal.length > 0) {
      const chosen = anyPortal[this.portalWarpSeq % anyPortal.length];
      this.portalWarpSeq++;
      return chosen;
    }
    return null;
  }

  public executePendingPortalWarp(): boolean {
    const target = this.pendingPortalWarp;
    const activeVariant = target ? target.variant : this.portalBrowser.getActivePortalVariant();
    const dest =
      target ||
      this.findNextPortalDestination(this.headX, this.headZ, activeVariant);
    this.pendingPortalWarp = null;
    if (!dest) {
      this.onToast('No twin destination portal placed on this mountain course.');
      return false;
    }
    this.world.spawnBurst(this.headX, this.headY + 0.8, this.headZ, 0x2de3ff, 22);
    this.headX = dest.x + Math.sin(this.heading) * 4.5;
    this.headZ = dest.z + Math.cos(this.heading) * 4.5;
    this.headY = terrainHeightAt(this.headX, this.headZ, this.formation.biome);
    this.portalCooldown = 2.8;
    this.invulnTimer = 1.1;
    this.rebuildInitialPathHistory();
    this.sound.playPortal();
    this.world.spawnBurst(this.headX, this.headY + 0.8, this.headZ, 0xff6be0, 26);
    this.onToast(
      `Warped via Portal ${activeVariant} to Dimensional Gate (${Math.round(dest.x)}, ${Math.round(dest.z)})!`,
    );
    this.emitHud();
    return true;
  }

  private cellKey(cx: number, cz: number): string {
    return `${cx},${cz}`;
  }

  private rebuildObstacleCache(): void {
    const combined: WorldObstacle[] = [...this.world.getNaturalObstacles()];
    for (const prop of this.formation.props) {
      if (prop.type === 'wall') {
        combined.push({ x: prop.x, z: prop.z, radius: 1.45, kind: 'wall' });
      } else if (prop.type === 'totem') {
        combined.push({ x: prop.x, z: prop.z, radius: 1.15, kind: 'totem' });
      }
    }
    this.activeObstacles = combined;
    this.obstacleGrid.clear();
    for (const obs of combined) {
      const cx = Math.floor(obs.x / OBSTACLE_CELL);
      const cz = Math.floor(obs.z / OBSTACLE_CELL);
      const key = this.cellKey(cx, cz);
      let bucket = this.obstacleGrid.get(key);
      if (!bucket) {
        bucket = [];
        this.obstacleGrid.set(key, bucket);
      }
      bucket.push(obs);
    }
  }

  private hasObstacleNear(x: number, z: number, pad: number): boolean {
    const cx = Math.floor(x / OBSTACLE_CELL);
    const cz = Math.floor(z / OBSTACLE_CELL);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const bucket = this.obstacleGrid.get(this.cellKey(cx + dx, cz + dz));
        if (!bucket) continue;
        for (const o of bucket) {
          if (Math.hypot(o.x - x, o.z - z) < o.radius + pad) return true;
        }
      }
    }
    return false;
  }

  private resetRunState(useCheckpoint: boolean): void {
    let spawnX = 0;
    let spawnZ = 4;
    let spawnHeading = Math.PI; // North (-Z) toward Whispering Foothill

    if (useCheckpoint && this.lastCheckpointId) {
      const cp = WORLD_LANDMARKS.find((lm) => lm.id === this.lastCheckpointId);
      if (cp) {
        const nextLm = this.getNextTargetLandmark();
        const towardCenter = Math.atan2(-cp.x, -cp.z);
        const offsetDist = cp.radius + 3.2;
        const candX = cp.x + Math.sin(towardCenter) * offsetDist;
        const candZ = cp.z + Math.cos(towardCenter) * offsetDist;
        if (isInWorldBounds(candX, candZ) && !isDeepWater(candX, candZ, this.formation.biome)) {
          spawnX = candX;
          spawnZ = candZ;
        } else {
          spawnX = cp.x;
          spawnZ = cp.z + 5;
        }
        if (nextLm) {
          spawnHeading = Math.atan2(nextLm.x - spawnX, nextLm.z - spawnZ);
        } else {
          spawnHeading = towardCenter;
        }
      }
    }

    this.syncAutonomousDifficulty();
    const stage = getStageForLevel(this.level);
    const magic = getMagicTierForLevel(this.level);
    this.headX = spawnX;
    this.headZ = spawnZ;
    this.headY = terrainHeightAt(this.headX, this.headZ, this.formation.biome);
    this.heading = spawnHeading;
    this.currentSteerRate = 0;
    this.currentTraversalStrain = 0;
    this.traversalWakeAccum = 0;
    this.recoilVelX = 0;
    this.recoilVelZ = 0;
    this.hitstopTimer = 0;
    this.currentSpeed = SPEED_CONFIG[this.speedPreset].baseSpeed * stage.speedBonus;
    this.snakeLength = Math.min(MAX_LENGTH, INITIAL_LENGTH + (this.level - 1) * 3);
    this.stamina = 1.0;
    this.maxHp = magic.maxHp;
    this.hp = this.maxHp;
    this.maxQi = magic.maxQi;
    this.qi = this.maxQi;
    this.hpRegenDelay = 0;
    this.hurtInvuln = 0;
    this.recentHurtPulse = 0;
    this.primarySpellCd = 0;
    this.shockwaveCd = 0;
    this.dashCd = 0;
    this.ultimateCd = 0;
    this.dashActiveTimer = 0;
    this.dashHitIds.clear();
    this.primarySpellMaxCd = magic.boltCooldown;
    this.shockwaveMaxCd = magic.shockwaveCooldown;
    this.dashMaxCd = magic.dashCooldown;
    this.ultimateMaxCd = magic.ultimateCooldown;
    this.lastEngagedBeastId = null;
    this.lastEngagedTimer = 0;
    this.projectiles = [];
    this.shockwaves = [];
    this.fissures = [];
    this.isSheltered = false;
    this.currentEnvDrainPerSec = 0;
    this.weatherShiftTimer = this.rollNextShiftDelay();
    this.complimentTimer = 18;
    if (this.mode === 'playing') {
      // Shift to a fresh climate every run/respawn so every expedition starts under new skies
      this.shiftClimateDynamically(true);
      this.complimentOracle.resetSession();
      this.triggerCompliment('expedition_start', 'high');
    }
    this.clanHeatValue = Math.min(60, Math.max(0, (this.level - 1) * 7));
    this.ghostAmbushTimer = 10.0;
    this.ambushBannerTimer = 0;

    this.boostPadTimer = 0;
    this.portalCooldown = 0;
    this.grazeCooldown = 0;
    this.invulnTimer = 2.0;

    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.comboTimer = 0;
    this.fruitsEaten = 0;
    this.deathReason = '';
    this.xpLostOnCrash = 0;
    this.isNewBest = false;

    this.rebuildInitialPathHistory();
    this.world.snapCameraHeading(this.heading);
    this.spawnInitialOrbs();
    this.spawnRollingBoulders();
    this.spawnInitialBeasts();
  }

  private rebuildInitialPathHistory(): void {
    this.pathHistory = [];
    this.totalTravelDist = 0;
    const step = 0.25;
    const totalLen = (this.snakeLength + 4) * SEGMENT_SPACING;
    const steps = Math.ceil(totalLen / step);
    const dirX = Math.sin(this.heading);
    const dirZ = Math.cos(this.heading);

    for (let i = steps; i >= 0; i--) {
      const px = this.headX - dirX * i * step;
      const pz = this.headZ - dirZ * i * step;
      const py = terrainHeightAt(px, pz, this.formation.biome);
      const n = terrainNormalAt(px, pz, this.formation.biome);
      const dist = (steps - i) * step;
      this.pathHistory.push({
        x: px,
        y: py,
        z: pz,
        nx: n.x,
        ny: n.y,
        nz: n.z,
        heading: this.heading,
        cumDist: dist,
      });
    }
    this.totalTravelDist = this.pathHistory[this.pathHistory.length - 1].cumDist;
  }

  private spawnInitialOrbs(): void {
    this.orbs = [];
    WORLD_LANDMARKS.forEach((lm, idx) => {
      const angle = idx * 1.15 + 0.55;
      const ox = lm.x + Math.cos(angle) * (lm.radius * 0.72);
      const oz = lm.z + Math.sin(angle) * (lm.radius * 0.72);
      const oy = terrainHeightAt(ox, oz, this.formation.biome);
      this.orbs.push({ id: this.nextOrbId++, x: ox, y: oy, z: oz, golden: true });
    });

    while (this.orbs.length < TARGET_ORBS) {
      const nearPlayer = this.orbs.length < GOLDEN_ORB_COUNT + 16;
      this.spawnOneOrb(false, nearPlayer);
    }
  }

  private spawnOneOrb(golden: boolean, nearPlayer = true): void {
    const biome = this.formation.biome;
    for (let attempt = 0; attempt < 75; attempt++) {
      let x = 0;
      let z = 0;

      if (nearPlayer && !golden) {
        const ang = Math.random() * Math.PI * 2;
        const dist = 16 + Math.sqrt(Math.random()) * 110;
        x = this.headX + Math.cos(ang) * dist;
        z = this.headZ + Math.sin(ang) * dist;
      } else {
        const angle = Math.random() * Math.PI * 2;
        const dist = golden
          ? 36 + Math.random() * (WORLD_PLAY_RADIUS - 48)
          : 14 + Math.sqrt(Math.random()) * (WORLD_PLAY_RADIUS - 24);
        x = Math.cos(angle) * dist;
        z = Math.sin(angle) * dist;
      }

      if (!isInWorldBounds(x, z)) continue;
      if (isDeepWater(x, z, biome)) continue;
      const y = terrainHeightAt(x, z, biome);
      if (y < WATER_LEVEL + 0.8) continue;
      if (golden && y < 14) continue;
      if (Math.hypot(x - this.headX, z - this.headZ) < 12) continue;
      if (this.hasObstacleNear(x, z, 1.9)) continue;
      if (this.orbs.some((o) => Math.hypot(o.x - x, o.z - z) < 11)) continue;

      this.orbs.push({ id: this.nextOrbId++, x, y, z, golden });
      return;
    }

    const fx = Math.max(
      -WORLD_PLAY_RADIUS + 20,
      Math.min(WORLD_PLAY_RADIUS - 20, this.headX + (Math.random() - 0.5) * 60),
    );
    const fz = Math.max(
      -WORLD_PLAY_RADIUS + 20,
      Math.min(WORLD_PLAY_RADIUS - 20, this.headZ + (Math.random() - 0.5) * 60),
    );
    this.orbs.push({
      id: this.nextOrbId++,
      x: fx,
      y: terrainHeightAt(fx, fz, biome),
      z: fz,
      golden,
    });
  }

  private getTargetBoulderCount(): number {
    const base = SPEED_CONFIG[this.speedPreset].boulderCount;
    const extra = Math.floor((this.level - 1) / 2);
    return Math.min(22, base + extra);
  }

  private spawnRollingBoulders(): void {
    this.rollingBoulders = [];
    const target = this.getTargetBoulderCount();
    for (let i = 0; i < target; i++) {
      this.rollingBoulders.push(this.createRollingBoulderInstance());
    }
  }

  private createRollingBoulderInstance(): RollingBoulder {
    const biome = this.formation.biome;
    for (let attempt = 0; attempt < 50; attempt++) {
      const useLocal = attempt < 36;
      let x = 0;
      let z = 0;
      if (useLocal) {
        const ang = Math.random() * Math.PI * 2;
        const r = 34 + Math.random() * 82;
        x = this.headX + Math.cos(ang) * r;
        z = this.headZ + Math.sin(ang) * r;
      } else {
        const lm = WORLD_LANDMARKS[Math.floor(Math.random() * WORLD_LANDMARKS.length)];
        const ang = Math.random() * Math.PI * 2;
        const r = 8 + Math.random() * 18;
        x = lm.x + Math.cos(ang) * r;
        z = lm.z + Math.sin(ang) * r;
      }

      if (!isInWorldBounds(x, z)) continue;
      if (Math.hypot(x - this.headX, z - this.headZ) < 30) continue;
      const y = terrainHeightAt(x, z, biome);
      if (y < 8) continue;

      const grad = terrainDownhillGradient(x, z, biome);
      const slopeMag = Math.hypot(grad.gx, grad.gz);
      if (useLocal && slopeMag < 0.08 && attempt < 24) continue;

      return {
        id: this.nextBoulderId++,
        x,
        y,
        z,
        vx: grad.gx * 5.2,
        vz: grad.gz * 5.2,
        radius: 1.05 + Math.random() * 0.55,
        rotX: Math.random() * Math.PI,
        rotZ: Math.random() * Math.PI,
        life: 11 + Math.random() * 13,
      };
    }

    const x = 14;
    const z = -44;
    return {
      id: this.nextBoulderId++,
      x,
      y: terrainHeightAt(x, z, biome),
      z,
      vx: 0,
      vz: 4,
      radius: 1.2,
      rotX: 0,
      rotZ: 0,
      life: 12,
    };
  }

  // ==================== EVOLUTION & XP ENGINE ====================

  private awardXp(amount: number): void {
    if (amount <= 0) return;
    this.xp += Math.round(amount);
    this.checkEvolutionProgress();
    this.persistJourney();
  }

  private checkEvolutionProgress(): void {
    const targetLevel = computeEvolutionLevel(this.xp, this.visitedLandmarks.size);
    if (targetLevel <= this.level) return;

    const prevLevel = this.level;
    this.level = targetLevel;
    this.syncAutonomousDifficulty();
    const stage = getStageForLevel(this.level);
    const isHuman = this.level >= MAX_EVOLUTION_LEVEL;

    // Record an evolution historical milestone for every newly crossed tier
    let latestMilestoneId: string | null = null;
    for (let lvl = prevLevel + 1; lvl <= this.level; lvl++) {
      const unlockedStage = getStageForLevel(lvl);
      const mid = `evo-${lvl}`;
      this.recordMilestone(
        mid,
        'evolution',
        `Evolved to ${unlockedStage.title} (Tier ${lvl})`,
        EVOLUTION_TRAIT_LABELS[lvl] ?? unlockedStage.subtitle,
        lvl,
      );
      latestMilestoneId = mid;
    }

    this.stamina = 1.0;
    const magic = getMagicTierForLevel(this.level);
    this.maxHp = magic.maxHp;
    this.hp = this.maxHp;
    this.maxQi = magic.maxQi;
    this.qi = this.maxQi;
    this.primarySpellMaxCd = magic.boltCooldown;
    this.shockwaveMaxCd = magic.shockwaveCooldown;
    this.dashMaxCd = magic.dashCooldown;
    this.ultimateMaxCd = magic.ultimateCooldown;
    this.dashCd = 0;
    this.ultimateCd = 0;
    this.clanHeatValue = Math.min(100, Math.max(this.clanHeatValue, (this.level - 1) * 8));
    this.invulnTimer = Math.max(this.invulnTimer, 2.4);

    // Sync avalanche intensity & rescale active enemies for the new cultivation stage
    const targetBoulders = this.getTargetBoulderCount();
    while (this.rollingBoulders.length < targetBoulders) {
      this.rollingBoulders.push(this.createRollingBoulderInstance());
    }
    this.rescaleActiveBeastsForStage();

    this.sound.playLevelUp(this.level, isHuman);
    this.sound.setEvolutionTier(this.level, true);
    this.world.triggerShake(isHuman ? 0.65 : 0.38);
    const bodyTrail = this.sampleBodySegments().slice(0, 8);
    this.world.spawnEvolutionExplosion(
      this.headX,
      this.headY + 1.15,
      this.headZ,
      stage.scaleColorHex,
      magic.manaColorHex,
      this.level,
      isHuman,
      bodyTrail,
    );

    this.clearHeldInputs();
    if (isHuman && !this.hasAscended) {
      this.hasAscended = true;
      this.mode = 'ascended';
    } else {
      this.mode = 'evolving';
    }

    this.persistJourney();
    const summary = this.getEvolutionSummary(prevLevel, latestMilestoneId);
    const stageScale = computeScaledEnemyStats(FIXED_ENEMY_HP, this.level, this.speedPreset, false);

    this.onToast(
      isHuman
        ? `FINAL ASCENSION · DOU DI! (${stageScale.tierLabel}: ${stageScale.hpMultiplier.toFixed(1)}x HP · ${stageScale.damageMultiplier.toFixed(1)}x DMG)`
        : `EVOLUTION TIER ${this.level} · ${stage.title}! (Foes ${stageScale.hpMultiplier.toFixed(1)}x HP · ${stageScale.damageMultiplier.toFixed(1)}x DMG)`,
    );

    if (this.onLevelUp) {
      // Give the player a brief unobstructed showcase beat to enjoy the WebGL explosion
      // and 360° camera orbit around their evolved form before opening the Summary Modal
      this.pendingEvolutionSummary = summary;
      this.evolutionModalDelay = isHuman ? 1.75 : 1.25;
    }

    this.emitHud();
  }

  private checkExpeditionFeats(altMeters: number): void {
    let recorded = false;
    if (altMeters >= 350) {
      recorded =
        this.recordMilestone(
          'feat-alt-350',
          'feat',
          'Skyline Climber',
          'Scaled past 350m into the upper alpine cloud belt.',
        ) || recorded;
    }
    if (altMeters >= 700) {
      recorded =
        this.recordMilestone(
          'feat-alt-700',
          'feat',
          'Roof of the Continent',
          'Ascended above 700m along the highest glacial ridges.',
        ) || recorded;
    }
    if (this.lifetimeStats.distanceMeters >= 1000) {
      recorded =
        this.recordMilestone(
          'feat-dist-1000',
          'feat',
          '1,000m Mountain Trek',
          'Slithered over one full kilometer across rugged mountain slopes.',
        ) || recorded;
    }
    if (this.lifetimeStats.distanceMeters >= 5000) {
      recorded =
        this.recordMilestone(
          'feat-dist-5000',
          'feat',
          '5,000m Continental March',
          'Endured five kilometers of ridges, valleys, and avalanches.',
        ) || recorded;
    }
    if (recorded) {
      this.persistJourney();
    }
  }

  // ==================== MAIN TICK LOOP ====================

  private tick(dt: number): void {
    if (this.mode === 'playing' && !this.modalFreeze) {
      let simDt = dt;
      if (this.hitstopTimer > 0) {
        this.hitstopTimer = Math.max(0, this.hitstopTimer - dt);
        simDt = dt * 0.18;
      }
      this.updatePlaying(simDt);
    } else if (this.mode === 'title') {
      this.updateTitleAutopilot(dt);
    } else if (
      (this.mode === 'evolving' || this.mode === 'ascended') &&
      this.pendingEvolutionSummary
    ) {
      this.evolutionModalDelay -= dt;
      if (this.evolutionModalDelay <= 0) {
        const readySummary = this.pendingEvolutionSummary;
        this.pendingEvolutionSummary = null;
        this.evolutionModalDelay = 0;
        this.onLevelUp?.(readySummary);
      }
    }

    const snakeRender = this.buildRenderSnakeState();
    const nextLm = this.getNextTargetLandmark();
    this.world.updateVisuals(
      dt,
      snakeRender,
      this.orbs,
      this.rollingBoulders,
      this.beasts,
      this.projectiles,
      this.shockwaves,
      this.visitedLandmarks,
      this.mode,
      this.cameraMode,
      this.level,
      nextLm ? nextLm.id : null,
      this.fissures,
    );

    const altNorm = Math.max(0, Math.min(1, (this.headY - 2) / 52));
    this.world.setWeatherContext(altNorm, this.isSheltered);
    this.sound.setAltitudeFactor(altNorm);
    this.sound.setRainIntensity(this.world.getLiveRainIntensity());
    const lightningStrike = this.world.consumeLightningStrike();
    if (lightningStrike > 0) {
      this.sound.playLightningThunder(lightningStrike);
    }

    this.portalTextureAnimAccum += dt;
    if (this.portalTextureAnimAccum >= 0.11) {
      this.portalTextureAnimAccum = 0;
      this.syncPortalTextures();
    }

    if (this.mode === 'playing') {
      this.onTauntAnchorUpdate?.(this.world.getSerpentBubbleScreenPosition(this.level));
      this.hudEmitAccum += dt;
      if (this.hudEmitAccum >= 0.08) {
        this.hudEmitAccum = 0;
        this.emitHud();
      }
      this.minimapEmitAccum += dt;
      if (this.minimapEmitAccum >= 0.05) {
        this.minimapEmitAccum = 0;
        this.emitMinimap();
      }
    }
  }

  private updateTitleAutopilot(dt: number): void {
    this.demoPhase += dt;
    const targetX = Math.sin(this.demoPhase * 0.14) * 38;
    const targetZ = Math.cos(this.demoPhase * 0.11) * 34 - 16;
    const desiredHeading = Math.atan2(targetX - this.headX, targetZ - this.headZ);
    const diff = ((desiredHeading - this.heading + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    this.heading += Math.max(-1.25 * dt, Math.min(1.25 * dt, diff));
    this.advanceSnakeAlongTerrain(dt, 4.1);
    this.updateRollingBoulders(dt, false);
    this.updateBeasts(dt, false, false);
  }

  private updatePlaying(dt: number): void {
    const cfg = SPEED_CONFIG[this.speedPreset];
    const stage = getStageForLevel(this.level);

    if (this.comboTimer > 0) {
      this.comboTimer = Math.max(0, this.comboTimer - dt);
      if (this.comboTimer === 0) this.combo = 0;
    }
    if (this.boostPadTimer > 0) this.boostPadTimer = Math.max(0, this.boostPadTimer - dt);
    if (this.portalCooldown > 0) this.portalCooldown = Math.max(0, this.portalCooldown - dt);
    if (this.grazeCooldown > 0) this.grazeCooldown = Math.max(0, this.grazeCooldown - dt);
    if (this.invulnTimer > 0) this.invulnTimer = Math.max(0, this.invulnTimer - dt);
    if (this.hurtInvuln > 0) this.hurtInvuln = Math.max(0, this.hurtInvuln - dt);
    if (this.recentHurtPulse > 0) this.recentHurtPulse = Math.max(0, this.recentHurtPulse - dt * 1.9);
    if (this.primarySpellCd > 0) this.primarySpellCd = Math.max(0, this.primarySpellCd - dt);
    if (this.shockwaveCd > 0) this.shockwaveCd = Math.max(0, this.shockwaveCd - dt);
    if (this.dashCd > 0) this.dashCd = Math.max(0, this.dashCd - dt);
    if (this.ultimateCd > 0) this.ultimateCd = Math.max(0, this.ultimateCd - dt);
    if (this.ambushBannerTimer > 0) this.ambushBannerTimer = Math.max(0, this.ambushBannerTimer - dt);
    if (this.combatTauntCooldown > 0) this.combatTauntCooldown = Math.max(0, this.combatTauntCooldown - dt);
    if (this.lastEngagedTimer > 0) {
      this.lastEngagedTimer = Math.max(0, this.lastEngagedTimer - dt);
      if (this.lastEngagedTimer === 0) this.lastEngagedBeastId = null;
    }

    // Dou Qi passive cultivation regeneration
    const qiRegenRate = 8.5 + this.level * 0.7;
    this.qi = Math.min(this.maxQi, this.qi + qiRegenRate * dt);

    // Check if player is sheltered inside any conquered Trial Peak Shrine sanctuary
    let sheltered = false;
    for (const lm of WORLD_LANDMARKS) {
      if (!this.visitedLandmarks.has(lm.id)) continue;
      if (Math.hypot(this.headX - lm.x, this.headZ - lm.z) <= lm.radius + 10) {
        sheltered = true;
        break;
      }
    }
    this.isSheltered = sheltered;

    // Dynamic Climate Shifting — weather continuously shifts into harsher storms during play
    this.weatherShiftTimer -= dt;
    if (this.weatherShiftTimer <= 0) {
      this.shiftClimateDynamically(true);
    }

    // Level-driven Realm Environment + Climate Vitality Drain vs. Shrine Sanctuary / Safe Out-of-Combat Regen
    const env = getLevelEnvironment(this.level);
    const climate = CLIMATE_EFFECTS[this.weather];
    const effectiveDrain =
      (env.hpDrainPerSec > 0 ? env.hpDrainPerSec * climate.realmDrainMult : 0) + climate.hpDrainPerSec;

    if (this.isSheltered) {
      this.currentEnvDrainPerSec = 0;
      this.hp = Math.min(this.maxHp, this.hp + 6.5 * dt);
      this.qi = Math.min(this.maxQi, this.qi + 14.0 * dt);
    } else if (effectiveDrain > 0) {
      this.currentEnvDrainPerSec = Number(effectiveDrain.toFixed(2));
      if (this.invulnTimer <= 0) {
        this.hp = Math.max(0, this.hp - effectiveDrain * dt);
        if (this.hp <= 0) {
          const source =
            climate.hpDrainPerSec >= env.hpDrainPerSec
              ? WEATHER_LABELS[this.weather]
              : env.envName;
          this.triggerGameOver(`Vitality drained by the brutal ${source}!`);
          return;
        }
      }
    } else {
      this.currentEnvDrainPerSec = 0;
      if (this.hp < this.maxHp) {
        if (this.hpRegenDelay > 0) {
          this.hpRegenDelay = Math.max(0, this.hpRegenDelay - dt);
        } else {
          this.hp = Math.min(this.maxHp, this.hp + 4.2 * dt);
        }
      }
    }

    // Vice-City Soul Clan Heat decay toward level baseline & periodic ground-eruption ambushes
    const heatFloor = Math.min(60, Math.max(0, (this.level - 1) * 7));
    if (this.clanHeatValue > heatFloor && this.lastEngagedTimer <= 0) {
      this.clanHeatValue = Math.max(heatFloor, this.clanHeatValue - dt * 1.15);
    }
    this.updateFissures(dt);
    this.ghostAmbushTimer -= dt;
    if (this.ghostAmbushTimer <= 0) {
      const heatLvl = this.getClanHeatLevel();
      this.triggerGhostClanAmbush();
      this.ghostAmbushTimer = Math.max(11.5, 25 - heatLvl * 2.5);
    }

    // Continuous Gemini mountain spirit encouragement so the serpent always receives compliments
    this.complimentTimer -= dt;
    if (this.complimentTimer <= 0) {
      this.complimentTimer = 22 + Math.random() * 8;
      this.triggerCompliment('roaming', 'normal');
    }

    // 1. Weighted 360° analog steering with realistic serpent turning inertia & blizzard/ashstorm traversal resistance
    const traversal = computeClimateTraversalModifier(this.weather, this.isSheltered);
    this.currentTraversalStrain +=
      (traversal.traversalStrain01 - this.currentTraversalStrain) * (1 - Math.exp(-3.8 * dt));

    let steerInput = this.touchSteerAxis;
    if (this.steerLeftHeld) steerInput += 1;
    if (this.steerRightHeld) steerInput -= 1;
    steerInput = Math.max(-1, Math.min(1, steerInput));
    const targetSteerRate = steerInput * cfg.turnRate * traversal.turnAgilityMult;
    const steerLambda = 7.5 * traversal.steerInertiaMult;
    this.currentSteerRate +=
      (targetSteerRate - this.currentSteerRate) * (1 - Math.exp(-steerLambda * dt));
    this.heading += this.currentSteerRate * dt;

    // 2. Stamina & boost calculation
    const usingManualBoost = this.boostHeld && this.stamina > 0.04;
    if (usingManualBoost) {
      this.stamina = Math.max(0, this.stamina - (dt * 0.21) / stage.staminaBonus);
    } else {
      this.stamina = Math.min(1, this.stamina + dt * 0.18 * stage.staminaBonus);
    }
    const boostActive = usingManualBoost || this.boostPadTimer > 0 || this.dashActiveTimer > 0;

    // 3. Realistic mountain slope gravity & momentum physics
    const dirX = Math.sin(this.heading);
    const dirZ = Math.cos(this.heading);
    const hNow = terrainHeightAt(this.headX, this.headZ, this.formation.biome);
    const hAhead = terrainHeightAt(this.headX + dirX * 1.2, this.headZ + dirZ * 1.2, this.formation.biome);
    const slope = (hAhead - hNow) / 1.2;

    let slopeMultiplier = 1.0;
    if (slope > 0) {
      slopeMultiplier = Math.max(boostActive ? 0.78 : 0.56, 1 - slope * (boostActive ? 0.30 : 0.52));
    } else {
      slopeMultiplier = Math.min(1.28, 1 + Math.abs(slope) * 0.30);
    }

    // Gently compress stage speed bonus so late-game movement still feels grounded & lifelike
    const groundedStageBonus = 1 + (stage.speedBonus - 1) * 0.55;
    let targetSpeed =
      cfg.baseSpeed *
      groundedStageBonus *
      slopeMultiplier *
      climate.speedMult *
      traversal.speedDragMult;
    if (this.dashActiveTimer > 0) {
      targetSpeed *= 1.88;
      this.dashActiveTimer = Math.max(0, this.dashActiveTimer - dt);
      this.dashSparkAccum += dt;
      if (this.dashSparkAccum >= 0.055) {
        this.dashSparkAccum = 0;
        const magic = getMagicTierForLevel(this.level);
        this.world.spawnBurst(this.headX, this.headY + 0.8, this.headZ, magic.manaColorHex, 6);
      }
    } else if (this.boostPadTimer > 0) {
      targetSpeed *= 1.44;
    } else if (usingManualBoost) {
      targetSpeed *= 1.34;
    } else if (this.brakeHeld) {
      targetSpeed *= 0.46;
    }

    this.currentSpeed += (targetSpeed - this.currentSpeed) * (1 - Math.exp(-4.2 * dt));

    // Emit ground-churn snow-spray / ash-cinder wake particles during difficult traversal
    if (traversal.isDifficultTraversal && this.currentTraversalStrain > 0.15) {
      const turnEffort = Math.min(1, Math.abs(this.currentSteerRate) / Math.max(0.1, cfg.turnRate));
      this.traversalWakeAccum += dt * (1.0 + turnEffort * 1.65);
      if (this.traversalWakeAccum >= 0.16) {
        this.traversalWakeAccum = 0;
        const rightX = Math.cos(this.heading);
        const rightZ = -Math.sin(this.heading);
        const flankSide =
          Math.abs(this.currentSteerRate) > 0.15
            ? this.currentSteerRate > 0
              ? 1
              : -1
            : Math.random() < 0.5
              ? 1
              : -1;
        const wakeX = this.headX - dirX * 0.35 + rightX * flankSide * (0.45 + turnEffort * 0.35);
        const wakeZ = this.headZ - dirZ * 0.35 + rightZ * flankSide * (0.45 + turnEffort * 0.35);
        const burstColor =
          Math.random() < 0.65 ? traversal.wakeColorHex : traversal.accentColorHex;
        this.world.spawnBurst(wakeX, this.headY + 0.22, wakeZ, burstColor, turnEffort > 0.35 ? 4 : 2);
      }
    }

    // 4. Advance serpent/human smoothly over 3D mountain terrain & integrate gun fallback recoil
    const stepDist = this.advanceSnakeAlongTerrain(dt, this.currentSpeed);
    const recoilSpeed = Math.hypot(this.recoilVelX, this.recoilVelZ);
    if (recoilSpeed > 0.04) {
      const candX = this.headX + this.recoilVelX * dt;
      const candZ = this.headZ + this.recoilVelZ * dt;
      if (
        isInWorldBounds(candX, candZ) &&
        !isDeepWater(candX, candZ, this.formation.biome) &&
        !this.hasObstacleNear(candX, candZ, 0.95)
      ) {
        this.headX = candX;
        this.headZ = candZ;
        this.headY = terrainHeightAt(this.headX, this.headZ, this.formation.biome);
      } else {
        this.recoilVelX *= 0.3;
        this.recoilVelZ *= 0.3;
      }
      const damp = Math.exp(-8.2 * dt);
      this.recoilVelX *= damp;
      this.recoilVelZ *= damp;
    } else {
      this.recoilVelX = 0;
      this.recoilVelZ = 0;
    }
    this.lifetimeStats.timePlayedSeconds += dt;
    this.lifetimeStats.distanceMeters += stepDist * 1.4;
    const altMeters = Math.max(0, Math.round((this.headY - WATER_LEVEL) * 14));
    if (altMeters > this.lifetimeStats.highestAltitudeMeters) {
      this.lifetimeStats.highestAltitudeMeters = altMeters;
    }
    this.checkExpeditionFeats(altMeters);

    this.statsSaveAccum += dt;
    if (this.statsSaveAccum >= 6.0) {
      this.statsSaveAccum = 0;
      this.persistJourney();
    }

    // 5. Outer continent wall soft-deflection
    const radial = Math.hypot(this.headX, this.headZ);
    if (radial > WORLD_PLAY_RADIUS) {
      const nx = this.headX / radial;
      const nz = this.headZ / radial;
      this.headX = nx * WORLD_PLAY_RADIUS;
      this.headZ = nz * WORLD_PLAY_RADIUS;
      this.headY = terrainHeightAt(this.headX, this.headZ, this.formation.biome);
      const inwardAngle = Math.atan2(-nx, -nz);
      const diff = ((inwardAngle - this.heading + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      this.heading += diff * Math.min(1, dt * 6.5);
      if (this.grazeCooldown <= 0) {
        this.grazeCooldown = 0.45;
        this.sound.playGraze();
        this.world.spawnBurst(this.headX, this.headY + 0.5, this.headZ, 0xcbd5e1, 10);
      }
    }

    // 6. Check Deep Water Hazard
    if (this.invulnTimer <= 0 && isDeepWater(this.headX, this.headZ, this.formation.biome)) {
      const lakeName = this.formation.biome === 'jungle' ? 'Emerald Lagoon' : 'freezing Glacial Lake';
      this.triggerGameOver(`Plunged into the ${lakeName}!`);
      return;
    }

    // 7. Check Boost Pads & Twin Warp Portals
    this.checkFormationTriggers();

    // 8. Check Mountain Obstacles
    if (this.invulnTimer <= 0) {
      const effectiveGraze = Math.max(0.28, cfg.grazeThreshold - (this.level - 1) * 0.016);
      const hitCrash = this.checkStaticObstacles(effectiveGraze);
      if (hitCrash) return;
    }

    // 9. Update & Check Dynamic Rolling Mountain Boulders
    const boulderHit = this.updateRollingBoulders(dt, this.invulnTimer <= 0);
    if (boulderHit) return;

    // 9b. Update Roaming Wild Beasts, Spell Projectiles & Expanding Shockwaves
    const beastFatal = this.updateBeasts(dt, true, boostActive);
    if (beastFatal || this.mode !== 'playing') return;

    const spellFatal = this.updateProjectilesAndShockwaves(dt);
    if (spellFatal || this.mode !== 'playing') return;

    // 10. Check Self-Tail Collision (disabled at Lv 12 Ascended Human)
    if (this.invulnTimer <= 0 && this.level < MAX_EVOLUTION_LEVEL && this.snakeLength > 11) {
      const bodyPoses = this.sampleBodySegments();
      for (let i = 9; i < bodyPoses.length; i++) {
        const seg = bodyPoses[i];
        const dist = Math.hypot(this.headX - seg.x, this.headZ - seg.z);
        if (dist < 0.72 && Math.abs(this.headY - seg.y) < 1.2) {
          this.triggerGameOver('Tangled in your own serpent tail!');
          return;
        }
      }
    }

    // 11. Check Collectibles & periodically relocate far-away non-golden orbs
    this.checkCollectibles();
    if (this.mode !== 'playing') return;

    this.orbRecycleAccum += dt;
    if (this.orbRecycleAccum >= 2.2) {
      this.orbRecycleAccum = 0;
      this.recycleDistantOrbs();
    }

    // 12. Check 12 Tiered Mountain Trial Peak Shrines!
    this.checkLandmarks();
  }

  private recycleDistantOrbs(): void {
    let recycled = 0;
    for (let i = this.orbs.length - 1; i >= 0 && recycled < 2; i--) {
      const o = this.orbs[i];
      if (o.golden) continue;
      if (Math.hypot(o.x - this.headX, o.z - this.headZ) > 165) {
        this.orbs.splice(i, 1);
        this.spawnOneOrb(false, true);
        recycled++;
      }
    }
  }

  private advanceSnakeAlongTerrain(dt: number, speed: number): number {
    const stepDist = speed * dt;
    this.headX += Math.sin(this.heading) * stepDist;
    this.headZ += Math.cos(this.heading) * stepDist;
    this.headY = terrainHeightAt(this.headX, this.headZ, this.formation.biome);

    const n = terrainNormalAt(this.headX, this.headZ, this.formation.biome);
    this.totalTravelDist += stepDist;

    this.pathHistory.push({
      x: this.headX,
      y: this.headY,
      z: this.headZ,
      nx: n.x,
      ny: n.y,
      nz: n.z,
      heading: this.heading,
      cumDist: this.totalTravelDist,
    });

    const neededDist = (this.snakeLength + 4) * SEGMENT_SPACING;
    const minKeepDist = this.totalTravelDist - neededDist;
    while (this.pathHistory.length > 4 && this.pathHistory[1].cumDist < minKeepDist) {
      this.pathHistory.shift();
    }
    return stepDist;
  }

  private checkFormationTriggers(): void {
    for (const prop of this.formation.props) {
      const d = Math.hypot(this.headX - prop.x, this.headZ - prop.z);
      if (prop.type === 'boost' && d < 2.2) {
        if (this.boostPadTimer < 2.0) {
          this.boostPadTimer = 2.8;
          this.stamina = Math.min(1, this.stamina + 0.4);
          this.sound.playBoost();
          this.world.spawnBurst(this.headX, this.headY + 0.6, this.headZ, 0xffe066, 16);
        }
      } else if ((prop.type === 'portalA' || prop.type === 'portalB') && d < 4.2 && this.portalCooldown <= 0) {
        const variant: PortalVariant = prop.type === 'portalA' ? 'A' : 'B';
        const dest = this.findNextPortalDestination(prop.x, prop.z, variant);
        this.portalCooldown = 3.4;
        this.invulnTimer = 1.2;
        this.sound.playPortal();
        this.world.spawnBurst(
          this.headX,
          this.headY + 1.1,
          this.headZ,
          variant === 'A' ? 0x2de3ff : 0xff6be0,
          28,
        );
        this.portalBrowser.setActivePortalVariant(variant);
        if (this.onPortalBrowserOpen) {
          this.pendingPortalWarp = dest ? { x: dest.x, z: dest.z, variant } : null;
          // Nudge serpent past the colossal portal ring so closing the browser doesn't immediately re-trigger
          this.headX += Math.sin(this.heading) * 4.4;
          this.headZ += Math.cos(this.heading) * 4.4;
          this.headY = terrainHeightAt(this.headX, this.headZ, this.formation.biome);
          this.onPortalBrowserOpen(variant, Boolean(dest));
        } else if (dest) {
          this.pendingPortalWarp = { x: dest.x, z: dest.z, variant };
          this.executePendingPortalWarp();
        }
      }
    }
  }

  private checkStaticObstacles(grazeThreshold: number): boolean {
    const headRadius = 0.56;
    const dirX = Math.sin(this.heading);
    const dirZ = Math.cos(this.heading);

    const cx = Math.floor(this.headX / OBSTACLE_CELL);
    const cz = Math.floor(this.headZ / OBSTACLE_CELL);

    for (let gx = cx - 1; gx <= cx + 1; gx++) {
      for (let gz = cz - 1; gz <= cz + 1; gz++) {
        const bucket = this.obstacleGrid.get(this.cellKey(gx, gz));
        if (!bucket) continue;

        for (const obs of bucket) {
          const dx = this.headX - obs.x;
          const dz = this.headZ - obs.z;
          const minDist = obs.radius + headRadius;
          const distSq = dx * dx + dz * dz;
          if (distSq >= minDist * minDist) continue;

          const dist = Math.sqrt(distSq) || 0.001;
          const nx = dx / dist;
          const nz = dz / dist;
          const headOn = -(dirX * nx + dirZ * nz);

          if (headOn > grazeThreshold) {
            const label =
              obs.kind === 'tree'
                ? this.formation.biome === 'jungle'
                  ? 'giant jungle tree'
                  : 'towering alpine pine'
                : obs.kind === 'totem'
                  ? 'ancient mountain totem'
                  : 'mountain boulder';
            this.triggerGameOver(`Crashed head-on into a ${label}!`);
            return true;
          }

          this.headX = obs.x + nx * (minDist + 0.06);
          this.headZ = obs.z + nz * (minDist + 0.06);
          this.headY = terrainHeightAt(this.headX, this.headZ, this.formation.biome);

          const cross = dirX * nz - dirZ * nx;
          this.heading += (cross >= 0 ? 1 : -1) * 0.24;

          if (this.grazeCooldown <= 0) {
            this.grazeCooldown = 0.35;
            this.sound.playGraze();
            this.world.triggerShake(0.22);
            this.world.spawnBurst(this.headX, this.headY + 0.5, this.headZ, 0xffe4b5, 8);
          }
        }
      }
    }
    return false;
  }

  private updateRollingBoulders(dt: number, checkCollision: boolean): boolean {
    const biome = this.formation.biome;
    const levelSpeedBonus = 1 + (this.level - 1) * 0.022;
    const maxSpd = (this.speedPreset === 'turbo' ? 11.8 : 9.4) * levelSpeedBonus;

    for (let i = 0; i < this.rollingBoulders.length; i++) {
      const b = this.rollingBoulders[i];
      b.life -= dt;

      const grad = terrainDownhillGradient(b.x, b.z, biome);
      b.vx += grad.gx * 10.5 * levelSpeedBonus * dt;
      b.vz += grad.gz * 10.5 * levelSpeedBonus * dt;

      const drag = Math.exp(-0.55 * dt);
      b.vx *= drag;
      b.vz *= drag;

      const speed = Math.hypot(b.vx, b.vz);
      if (speed > maxSpd) {
        b.vx = (b.vx / speed) * maxSpd;
        b.vz = (b.vz / speed) * maxSpd;
      }

      b.x += b.vx * dt;
      b.z += b.vz * dt;
      b.y = terrainHeightAt(b.x, b.z, biome);

      b.rotX += (b.vz * dt) / b.radius;
      b.rotZ -= (b.vx * dt) / b.radius;

      const distToPlayer = Math.hypot(this.headX - b.x, this.headZ - b.z);
      if (
        b.life <= 0 ||
        !isInWorldBounds(b.x, b.z) ||
        b.y < WATER_LEVEL - 0.1 ||
        distToPlayer > 150 ||
        (speed < 0.7 && b.life < 8)
      ) {
        this.rollingBoulders[i] = this.createRollingBoulderInstance();
        continue;
      }

      if (checkCollision) {
        if (distToPlayer < b.radius + 0.62 && Math.abs(this.headY - b.y) < b.radius + 1.0) {
          this.triggerGameOver('Crushed by a rolling avalanche boulder!');
          return true;
        }
      }
    }
    return false;
  }

  // ==================== WILD MOUNTAIN BEASTS & MAGICAL RESISTANCE ====================

  private getTargetBeastCount(): number {
    const base = this.speedPreset === 'chill' ? 10 : this.speedPreset === 'turbo' ? 15 : 13;
    return Math.min(18, base + Math.floor((this.level - 1) / 3));
  }

  private spawnInitialBeasts(): void {
    this.beasts = [];
    // Ensure Mythic Peak Guardians stand near the next unconquered higher-tier Trial Peak
    const nextLm = this.getNextTargetLandmark();
    if (nextLm && nextLm.tier >= 2) {
      const g = this.createBeastInstance('guardian', nextLm.x + 8, nextLm.z + 6, nextLm.id);
      if (g) this.beasts.push(g);
    }

    const target = this.getTargetBeastCount();
    for (let i = this.beasts.length; i < target; i++) {
      const b = this.spawnBeastNearPlayer(i < 3);
      if (b) this.beasts.push(b);
    }
  }

  private pickBeastKindForSpot(x: number, z: number, y: number): BeastKind {
    const radial = Math.hypot(x, z);
    const tierPressure = Math.max(this.level, Math.floor(radial / 20) + 1);
    const r = Math.random();
    if (tierPressure >= 8 && r < 0.24) return 'guardian';
    if ((tierPressure >= 5 || y > 20) && r < 0.56) return 'eagle';
    if ((tierPressure >= 3 || y > 10) && r < 0.78) return 'boar';
    return 'wolf';
  }

  private getClanHeatLevel(): number {
    return Math.max(0, Math.min(5, Math.floor(this.clanHeatValue / 20)));
  }

  private updateFissures(dt: number): void {
    for (let i = this.fissures.length - 1; i >= 0; i--) {
      const f = this.fissures[i];
      f.age += dt;
      if (f.age >= f.life) {
        this.fissures.splice(i, 1);
      }
    }
  }

  /**
   * Triggers a Soul Clan (Hall of Souls) ground ambush: cracked glowing earth fissures
   * tear open around the player and Nether Earth Wraiths (+ a Soul Hall Reaper at higher heat)
   * claw vertically out of the ground to hunt the player!
   */
  private triggerGhostClanAmbush(): void {
    const biome = this.formation.biome;
    const heat = this.getClanHeatLevel();
    const activeWraiths = this.beasts.filter((b) => b.kind === 'wraith').length;
    const activeElders = this.beasts.filter((b) => b.kind === 'soul_elder').length;

    const wantWraiths = Math.min(5 - activeWraiths, 1 + Math.floor(heat / 2) + (this.level >= 4 ? 1 : 0));
    const wantElder = (heat >= 3 || this.level >= 5) && activeElders < 2 ? 1 : 0;

    if (wantWraiths <= 0 && wantElder <= 0) return;

    const spawnList: BeastKind[] = [];
    for (let i = 0; i < wantWraiths; i++) spawnList.push('wraith');
    if (wantElder > 0) spawnList.push('soul_elder');

    let spawnedCount = 0;
    let spawnedElder = false;

    for (let s = 0; s < spawnList.length; s++) {
      const kind = spawnList[s];
      const isBoss = kind === 'soul_elder';
      for (let attempt = 0; attempt < 26; attempt++) {
        // Place fissures ahead & flanking the player so they visibly tear open on screen!
        const spreadAng = this.heading + (Math.random() - 0.5) * 1.9;
        const dist = 14 + Math.random() * 14;
        const fx = this.headX + Math.sin(spreadAng) * dist;
        const fz = this.headZ + Math.cos(spreadAng) * dist;
        if (!isInWorldBounds(fx, fz) || isDeepWater(fx, fz, biome)) continue;
        const fy = terrainHeightAt(fx, fz, biome);
        if (fy < WATER_LEVEL + 0.7) continue;
        if (this.hasObstacleNear(fx, fz, 1.9)) continue;

        const ghost = this.createBeastInstance(kind, fx, fz, null, true);
        if (!ghost) continue;

        this.beasts.push(ghost);
        this.fissures.push({
          id: this.nextFissureId++,
          x: fx,
          y: fy,
          z: fz,
          radius: isBoss ? 2.8 : 1.95,
          age: 0,
          life: 3.4,
          colorHex: isBoss ? 0xd946ef : 0x38f2a8,
          isBoss,
        });
        if (this.fissures.length > 10) this.fissures.shift();

        this.world.spawnBurst(fx, fy + 0.5, fz, isBoss ? 0xd946ef : 0x38f2a8, isBoss ? 26 : 16);
        spawnedCount++;
        if (isBoss) spawnedElder = true;
        break;
      }
    }

    if (spawnedCount > 0) {
      this.ambushBannerTimer = 5.2;
      this.sound.playClanAmbushAlert();
      this.sound.playGhostEmerge(spawnedElder);
      this.world.triggerShake(spawnedElder ? 0.36 : 0.22);
      this.onToast(
        spawnedElder
          ? 'SOUL CLAN AMBUSH · A Soul Hall Reaper erupts from the earth!'
          : `Soul Clan Ambush · ${spawnedCount} Nether Wraith${spawnedCount > 1 ? 's' : ''} rising from the ground!`,
      );
      this.emitHud();
    }
  }

  private createBeastInstance(
    kind: BeastKind,
    x: number,
    z: number,
    landmarkId: string | null = null,
    emergeFromGround = false,
  ): WildBeast | null {
    const biome = this.formation.biome;
    if (!isInWorldBounds(x, z) || isDeepWater(x, z, biome)) return null;
    const groundY = terrainHeightAt(x, z, biome);
    if (groundY < WATER_LEVEL + 0.6) return null;

    const speedFactor = this.speedPreset === 'chill' ? 0.96 : this.speedPreset === 'turbo' ? 1.28 : 1.14;

    const defs: Record<
      BeastKind,
      {
        name: string;
        faction: EnemyFaction;
        hp: number;
        speed: number;
        radius: number;
        scale: number;
        aggro: number;
        xp: number;
        boss: boolean;
      }
    > = {
      wolf: {
        name: biome === 'jungle' ? 'Shadow Panther-Wolf' : 'Dire Ridge Wolf',
        faction: 'beast',
        hp: FIXED_ENEMY_HP,
        speed: 5.5 * speedFactor,
        radius: 1.05,
        scale: 1.08,
        aggro: 42,
        xp: 115,
        boss: false,
      },
      boar: {
        name: biome === 'jungle' ? 'Ember-Tusk Ravager' : 'Ironhorn Boar',
        faction: 'beast',
        hp: FIXED_ENEMY_HP,
        speed: 4.9 * speedFactor,
        radius: 1.35,
        scale: 1.16,
        aggro: 38,
        xp: 155,
        boss: false,
      },
      eagle: {
        name: biome === 'jungle' ? 'Tempest Canopy Hawk' : 'Storm Talon Griffin',
        faction: 'beast',
        hp: FIXED_ENEMY_HP,
        speed: 6.3 * speedFactor,
        radius: 1.25,
        scale: 1.12,
        aggro: 52,
        xp: 205,
        boss: false,
      },
      guardian: {
        name: biome === 'jungle' ? 'Ancient Spirit Stag' : 'Mythic Peak Guardian',
        faction: 'beast',
        hp: FIXED_ENEMY_HP,
        speed: 4.6 * speedFactor,
        radius: 1.75,
        scale: 1.18,
        aggro: 56,
        xp: 340,
        boss: true,
      },
      wraith: {
        name: 'Nether Earth Wraith',
        faction: 'ghost_clan',
        hp: FIXED_ENEMY_HP,
        speed: 5.9 * speedFactor,
        radius: 1.18,
        scale: 1.12,
        aggro: 62,
        xp: 225,
        boss: false,
      },
      soul_elder: {
        name: 'Soul Hall Reaper',
        faction: 'ghost_clan',
        hp: FIXED_ENEMY_HP,
        speed: 5.2 * speedFactor,
        radius: 1.62,
        scale: 1.22,
        aggro: 68,
        xp: 420,
        boss: true,
      },
    };

    const d = defs[kind];
    const scaled = computeScaledEnemyStats(FIXED_ENEMY_HP, this.level, this.speedPreset, d.boss);
    const startEmerging = emergeFromGround || d.faction === 'ghost_clan';
    return {
      id: this.nextBeastId++,
      speciesId: resolveBestiaryId(kind, biome),
      kind,
      faction: d.faction,
      name: d.name,
      x,
      y: startEmerging ? groundY - 3.4 : groundY,
      z,
      groundY,
      vx: 0,
      vz: 0,
      heading: Math.atan2(this.headX - x, this.headZ - z),
      homeX: x,
      homeZ: z,
      landmarkId,
      radius: d.radius,
      scale: d.scale,
      hp: scaled.maxHp,
      maxHp: scaled.maxHp,
      speed: d.speed * scaled.speedMultiplier,
      baseSpeed: d.speed,
      aggroRadius: d.aggro,
      state: startEmerging ? 'emerging' : 'patrol',
      stateTimer: startEmerging ? 1.1 : 1.4 + Math.random() * 1.8,
      flankDir: Math.random() < 0.5 ? 1 : -1,
      emergeProgress: startEmerging ? 0 : 1,
      attackCooldown: startEmerging ? 1.1 : 0.9 + Math.random() * 0.8,
      hitFlash: 0,
      animPhase: Math.random() * Math.PI * 2,
      xpReward: Math.round(d.xp * (1 + (scaled.hpMultiplier - 1) * 0.25)),
      baseXpReward: d.xp,
      isBoss: d.boss,
    };
  }

  /**
   * Rescales all currently active enemies when the player advances to a higher
   * cultivation stage, preserving each enemy's current HP percentage.
   */
  private rescaleActiveBeastsForStage(): void {
    for (const b of this.beasts) {
      const ratio = b.maxHp > 0 ? Math.max(0.05, Math.min(1, b.hp / b.maxHp)) : 1;
      const scaled = computeScaledEnemyStats(FIXED_ENEMY_HP, this.level, this.speedPreset, b.isBoss);
      b.maxHp = scaled.maxHp;
      b.hp = Math.max(1, Math.round(scaled.maxHp * ratio));
      b.speed = b.baseSpeed * scaled.speedMultiplier;
      b.xpReward = Math.round(b.baseXpReward * (1 + (scaled.hpMultiplier - 1) * 0.25));
    }
  }

  private spawnBeastNearPlayer(closer = false): WildBeast | null {
    const biome = this.formation.biome;
    for (let attempt = 0; attempt < 40; attempt++) {
      const ang = Math.random() * Math.PI * 2;
      const dist = closer ? 24 + Math.random() * 28 : 34 + Math.random() * 68;
      const x = this.headX + Math.cos(ang) * dist;
      const z = this.headZ + Math.sin(ang) * dist;
      if (!isInWorldBounds(x, z) || isNearSpawn(x, z, 15)) continue;
      if (isDeepWater(x, z, biome)) continue;
      if (this.hasObstacleNear(x, z, 2.2)) continue;
      if (this.beasts.some((b) => Math.hypot(b.x - x, b.z - z) < 12)) continue;

      const y = terrainHeightAt(x, z, biome);
      const kind = this.pickBeastKindForSpot(x, z, y);
      // Respect pool limits per kind
      const maxPerKind: Record<BeastKind, number> = {
        wolf: 6,
        boar: 5,
        eagle: 5,
        guardian: 3,
        wraith: 5,
        soul_elder: 2,
      };
      const countOfKind = this.beasts.filter((b) => b.kind === kind).length;
      const finalKind: BeastKind = countOfKind >= maxPerKind[kind] ? 'wolf' : kind;
      return this.createBeastInstance(finalKind, x, z, null, false);
    }
    return null;
  }

  /**
   * Executes a tactile duel hit against a beast: handles Counter-Parry Clash
   * when catching an enemy mid-windup or lunge, posture-break stagger bonuses,
   * knockback recoil, hitstop, and sparks.
   */
  private applyDuelHitToBeast(
    beast: WildBeast,
    baseDamage: number,
    pushNx: number,
    pushNz: number,
    pushForce: number,
    canCounterParry: boolean,
  ): void {
    const res = resolveCombatStrike(baseDamage, beast.state, canCounterParry);
    beast.vx = pushNx * (res.triggeredParry ? pushForce * 1.25 : pushForce);
    beast.vz = pushNz * (res.triggeredParry ? pushForce * 1.25 : pushForce);

    if (res.triggeredParry) {
      beast.state = 'stagger';
      beast.stateTimer = beast.isBoss ? 1.15 : 1.45;
      beast.attackCooldown = Math.max(beast.attackCooldown, 1.8);
      this.hitstopTimer = Math.max(this.hitstopTimer, 0.075);
      this.hp = Math.min(this.maxHp, this.hp + 8);
      this.qi = Math.min(this.maxQi, this.qi + 18);
      this.world.triggerShake(0.32);
      this.world.spawnBurst(beast.x, beast.y + 1.35, beast.z, 0xfde047, 26);
      this.shockwaves.push({
        id: this.nextShockwaveId++,
        fromPlayer: true,
        x: beast.x,
        y: beast.y + 0.15,
        z: beast.z,
        radius: 0.5,
        maxRadius: 4.2,
        age: 0,
        life: 0.32,
        colorHex: 0xfde047,
      });
      if (this.shockwaves.length > 12) this.shockwaves.shift();
      this.sound.playShockwave(this.level);
      this.onToast(`COUNTER CLASH! Staggered ${beast.name} (+18 Qi · 1.55× DMG)`);
      this.triggerCompliment('combat_parry', 'high', beast.name);
      this.triggerCombatTaunt(beast, 'parry', 'high');
    } else if (res.triggeredStaggerBonus) {
      this.hitstopTimer = Math.max(this.hitstopTimer, 0.045);
      this.world.spawnBurst(beast.x, beast.y + 1.2, beast.z, 0xffd24d, 14);
      if (this.combatTauntCooldown <= 0) {
        this.triggerCombatTaunt(beast, 'stagger', 'normal');
      }
    } else if (beast.state !== 'stagger') {
      beast.state = 'recover';
      beast.stateTimer = Math.max(beast.stateTimer, beast.isBoss ? 0.45 : 0.68);
    }

    this.damageBeast(beast, res.damage);
  }

  private damageBeast(beast: WildBeast, amount: number): void {
    beast.hp -= amount;
    beast.hitFlash = 0.24;
    this.lastEngagedBeastId = beast.id;
    this.lastEngagedTimer = 5.5;
    this.recordBeastEncounter(beast.speciesId);

    if (beast.hp <= 0) {
      const idx = this.beasts.indexOf(beast);
      if (idx >= 0) this.beasts.splice(idx, 1);

      this.hitstopTimer = Math.max(this.hitstopTimer, beast.isBoss ? 0.095 : 0.055);
      this.lifetimeStats.beastsDefeated++;
      if (beast.faction === 'ghost_clan') {
        this.lifetimeStats.ghostsDefeated++;
      }

      // Vice-City Soul Clan Heat rises when slaying hostile beasts or Clan ghosts
      const heatGain = beast.isBoss ? 22 : beast.faction === 'ghost_clan' ? 15 : 9;
      this.clanHeatValue = Math.min(100, this.clanHeatValue + heatGain);

      // Combat siphon: defeating enemies restores HP, Dou Qi & Stamina (crucial in harsh climates!)
      const hpRestore = beast.isBoss ? 45 : 18;
      const qiRestore = beast.isBoss ? 65 : 30;
      this.hp = Math.min(this.maxHp, this.hp + hpRestore);
      this.qi = Math.min(this.maxQi, this.qi + qiRestore);
      this.stamina = Math.min(1, this.stamina + (beast.isBoss ? 0.65 : 0.34));

      const discovery = this.recordBeastDefeat(beast);
      const pts = beast.isBoss ? 520 : beast.faction === 'ghost_clan' ? 240 : 180;
      this.addScore(pts);

      const burstColor =
        beast.kind === 'soul_elder'
          ? 0xd946ef
          : beast.kind === 'wraith'
            ? 0x38f2a8
            : beast.kind === 'guardian'
              ? 0xc084fc
              : beast.kind === 'eagle'
                ? 0x58e8ff
                : beast.kind === 'boar'
                  ? 0xff7b3d
                  : 0xffc24d;
      this.world.spawnBurst(beast.x, beast.y + 1.4, beast.z, burstColor, beast.isBoss ? 48 : 28);
      this.sound.playBeastDefeat(beast.isBoss);
      this.world.triggerShake(beast.isBoss ? 0.38 : 0.18);

      // Record combat historical milestones
      this.recordMilestone(
        'feat-first-beast',
        'feat',
        'First Mountain Beast Defeated',
        `Vanquished a ${beast.name} using Dou Qi combat arts.`,
      );
      if (beast.faction === 'ghost_clan') {
        this.recordMilestone(
          'feat-ghost-clan',
          'feat',
          'Defied the Soul Clan',
          `Repelled a subterranean ${beast.name} sent from the Hall of Souls.`,
        );
      }
      if (this.lifetimeStats.beastsDefeated >= 10) {
        this.recordMilestone(
          'feat-10-beasts',
          'feat',
          'Slayer of 10 Magical Beasts',
          'Overcame ten hostile beasts and spirit hunters across the continent.',
        );
      }
      if (beast.isBoss) {
        this.recordMilestone(
          'feat-guardian-slain',
          'feat',
          beast.kind === 'soul_elder' ? 'Soul Hall Reaper Banished' : 'Peak Guardian Vanquished',
          `Overcame a towering ${beast.name} in a duel of Dou Qi power.`,
        );
      }

      const prevLvl = this.level;
      this.awardXp(beast.xpReward);
      if (this.level === prevLvl) {
        if (discovery.newlyCataloged) {
          this.onToast(`Bestiary Cataloged: ${beast.name}! +${beast.xpReward} XP · +${hpRestore} HP`);
        } else if (discovery.newlyUnlockedLore) {
          this.onToast(`New Lore Discovered: ${beast.name}! +${beast.xpReward} XP`);
        } else {
          this.onToast(`Vanquished ${beast.name}! +${beast.xpReward} XP · +${hpRestore} HP`);
        }
        this.triggerCompliment('combat_victory', 'high', beast.name);
      } else {
        this.triggerCompliment('evolution', 'high');
      }
      this.triggerCombatTaunt(beast, 'execute', 'high');
    } else {
      this.sound.playBeastHit();
      this.world.spawnBurst(beast.x, beast.y + 1.1, beast.z, 0xffe4b5, 10);
      if (beast.state === 'patrol') {
        beast.state = 'chase';
      }
      if (this.lastTauntedBeastId !== beast.id || this.combatTauntCooldown <= 0) {
        this.triggerCombatTaunt(beast, 'engage', 'normal');
      }
    }
  }

  private applyPlayerDamage(amount: number, sourceName: string, pushX: number, pushZ: number): boolean {
    if (this.invulnTimer > 0 || this.hurtInvuln > 0) return false;

    this.hp = Math.max(0, this.hp - amount);
    this.hurtInvuln = 0.82;
    this.recentHurtPulse = 1.0;
    this.hpRegenDelay = 4.5;

    // Gentle knockback impulse so player isn't trapped inside the attacker
    const pLen = Math.hypot(pushX, pushZ);
    if (pLen > 0.01) {
      const nx = pushX / pLen;
      const nz = pushZ / pLen;
      const candX = this.headX + nx * 1.45;
      const candZ = this.headZ + nz * 1.45;
      if (isInWorldBounds(candX, candZ) && !isDeepWater(candX, candZ, this.formation.biome)) {
        this.headX = candX;
        this.headZ = candZ;
        this.headY = terrainHeightAt(this.headX, this.headZ, this.formation.biome);
      }
    }

    this.sound.playPlayerHurt();
    this.world.triggerShake(0.42);
    this.world.spawnBurst(this.headX, this.headY + 1.0, this.headZ, 0xff5a45, 22);

    if (this.hp <= 0) {
      this.triggerGameOver(`Overwhelmed by ${sourceName}!`);
      return true;
    }

    this.onToast(`${sourceName} struck you! -${Math.round(amount)} HP`);
    this.emitHud();
    return false;
  }

  private fireBeastProjectile(
    beast: WildBeast,
    speed: number,
    colorHex: number,
    damage: number,
    homing = false,
    style: 'bolt' | 'soul_chain' = 'bolt',
  ): void {
    const dx = this.headX - beast.x;
    const dz = this.headZ - beast.z;
    const dist = Math.hypot(dx, dz) || 1;
    const startY = beast.y + (beast.kind === 'eagle' ? 2.1 : 2.3);
    const targetY = this.headY + 1.0;
    const flightTime = Math.max(0.25, dist / speed);

    this.projectiles.push({
      id: this.nextProjectileId++,
      fromPlayer: false,
      x: beast.x + (dx / dist) * (beast.radius + 0.4),
      y: startY,
      z: beast.z + (dz / dist) * (beast.radius + 0.4),
      vx: (dx / dist) * speed,
      vy: (targetY - startY) / flightTime,
      vz: (dz / dist) * speed,
      radius: beast.isBoss ? 0.54 : 0.4,
      damage,
      colorHex,
      life: 2.6,
      maxLife: 2.6,
      homing,
      style,
    });
  }

  private updateBeasts(dt: number, combatEnabled: boolean, playerBoosting: boolean): boolean {
    const biome = this.formation.biome;
    const magic = getMagicTierForLevel(this.level);

    // Recycle distant beasts & maintain lively resistance around the player's mountain sector
    this.beastSpawnAccum += dt;
    if (this.beastSpawnAccum >= 2.0) {
      this.beastSpawnAccum = 0;
      for (let i = this.beasts.length - 1; i >= 0; i--) {
        const b = this.beasts[i];
        if (!b.landmarkId && Math.hypot(b.x - this.headX, b.z - this.headZ) > 130) {
          this.beasts.splice(i, 1);
        }
      }
      const wildCount = this.beasts.filter((b) => b.faction === 'beast').length;
      const targetCount = this.getTargetBeastCount();
      if (wildCount < targetCount) {
        const spawned = this.spawnBeastNearPlayer(false);
        if (spawned) this.beasts.push(spawned);
      }
      // Keep a Mythic Peak Guardian guarding the next unconquered Tier 2+ Trial Peak when player approaches
      const nextLm = this.getNextTargetLandmark();
      if (nextLm && nextLm.tier >= 2) {
        const dNext = Math.hypot(nextLm.x - this.headX, nextLm.z - this.headZ);
        const alreadyGuarded = this.beasts.some((b) => b.landmarkId === nextLm.id);
        const guardianCount = this.beasts.filter((b) => b.kind === 'guardian').length;
        if (dNext < 95 && !alreadyGuarded && guardianCount < 3) {
          const ang = Math.atan2(this.headX - nextLm.x, this.headZ - nextLm.z);
          const g = this.createBeastInstance(
            'guardian',
            nextLm.x + Math.sin(ang) * 9,
            nextLm.z + Math.cos(ang) * 9,
            nextLm.id,
            false,
          );
          if (g) this.beasts.push(g);
        }
      }
    }

    const stageCombat = computeScaledEnemyStats(FIXED_ENEMY_HP, this.level, this.speedPreset, false);
    const dmgScale = stageCombat.damageMultiplier;
    const projSpeedScale = 1 + (stageCombat.speedMultiplier - 1) * 0.65;

    for (let i = this.beasts.length - 1; i >= 0; i--) {
      const b = this.beasts[i];
      if (b.hitFlash > 0) b.hitFlash = Math.max(0, b.hitFlash - dt);
      if (b.attackCooldown > 0) b.attackCooldown = Math.max(0, b.attackCooldown - dt);

      const dx = this.headX - b.x;
      const dz = this.headZ - b.z;
      const dist = Math.hypot(dx, dz);
      const angleToPlayer = Math.atan2(dx, dz);

      // Handle subterranean Ghost Clan vertical emergence out of the earth!
      if (b.state === 'emerging') {
        b.heading = angleToPlayer;
        b.emergeProgress = Math.min(1, b.emergeProgress + dt / 0.95);
        const easeOut = 1 - Math.pow(1 - b.emergeProgress, 3);
        b.groundY = terrainHeightAt(b.x, b.z, biome);
        b.y = b.groundY - (1 - easeOut) * 3.4;
        b.animPhase += dt * 4.8;
        if (Math.random() < dt * 7) {
          this.world.spawnBurst(
            b.x,
            b.groundY + 0.35,
            b.z,
            b.kind === 'soul_elder' ? 0xd946ef : 0x38f2a8,
            4,
          );
        }
        if (b.emergeProgress >= 1) {
          b.y = b.groundY;
          b.state = 'chase';
          this.lastEngagedBeastId = b.id;
          this.lastEngagedTimer = 5.0;
          this.recordBeastEncounter(b.speciesId);
          this.sound.playBeastGrowl(b.kind);
          if (this.combatTauntCooldown <= 0) {
            this.triggerCombatTaunt(b, 'engage', 'normal');
          }
        }
        continue;
      }

      if (!combatEnabled) {
        b.state = 'patrol';
      } else if (b.state === 'patrol') {
        if (dist < b.aggroRadius) {
          b.state = 'chase';
          this.lastEngagedBeastId = b.id;
          this.lastEngagedTimer = 4.5;
          this.recordBeastEncounter(b.speciesId);
          this.sound.playBeastGrowl(b.kind);
          if (this.combatTauntCooldown <= 0) {
            this.triggerCombatTaunt(b, 'engage', 'normal');
          }
        }
      } else if (b.state === 'chase' || b.state === 'circle') {
        if (b.faction === 'beast' && dist > b.aggroRadius * 1.75) {
          b.state = 'patrol';
        } else {
          const triggerDist =
            b.kind === 'soul_elder'
              ? 28
              : b.kind === 'guardian'
                ? 25
                : b.kind === 'wraith'
                  ? 22
                  : b.kind === 'eagle'
                    ? 23
                    : b.kind === 'boar'
                      ? 13.5
                      : 10.5;
          if (dist < triggerDist && b.attackCooldown <= 0) {
            b.state = 'windup';
            // Clear, readable telegraph wind-up windows so the player can dodge or counter-parry!
            b.stateTimer =
              b.kind === 'soul_elder' || b.kind === 'guardian'
                ? 0.92
                : b.kind === 'boar'
                  ? 0.82
                  : 0.68;
            b.heading = angleToPlayer;
            this.sound.playBeastGrowl(b.kind);
            // Emit a visible ground telegraph warning ring at enemy feet
            this.shockwaves.push({
              id: this.nextShockwaveId++,
              fromPlayer: false,
              x: b.x,
              y: b.y + 0.08,
              z: b.z,
              radius: 0.4,
              maxRadius: b.radius + 2.4,
              age: 0,
              life: b.stateTimer * 0.85,
              colorHex:
                b.faction === 'ghost_clan'
                  ? 0x3ef5b8
                  : b.isBoss
                    ? 0xc084fc
                    : 0xff4b3e,
            });
            if (this.shockwaves.length > 14) this.shockwaves.shift();
          } else if (b.state === 'chase' && dist < triggerDist * 1.15 && b.attackCooldown > 0.25) {
            // Stalk & circle around the serpent like a real predator waiting for an opening
            b.state = 'circle';
            b.stateTimer = 0.8 + Math.random() * 0.9;
            b.flankDir = Math.random() < 0.5 ? 1 : -1;
          }
        }
      }

      let moveSpeed = 0;
      if (b.state === 'patrol') {
        b.stateTimer -= dt;
        if (b.stateTimer <= 0) {
          b.stateTimer = 1.8 + Math.random() * 2.2;
          const homeDx = b.homeX - b.x;
          const homeDz = b.homeZ - b.z;
          b.heading =
            Math.hypot(homeDx, homeDz) > 16
              ? Math.atan2(homeDx, homeDz)
              : b.heading + (Math.random() - 0.5) * 1.6;
        }
        moveSpeed = b.speed * 0.46;
        b.vx = Math.sin(b.heading) * moveSpeed;
        b.vz = Math.cos(b.heading) * moveSpeed;
      } else if (b.state === 'chase') {
        const diff = ((angleToPlayer - b.heading + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        b.heading += Math.max(-3.6 * dt, Math.min(3.6 * dt, diff));
        const preferredDist =
          b.kind === 'eagle'
            ? 10.5
            : b.kind === 'guardian' || b.kind === 'soul_elder'
              ? 9.5
              : b.kind === 'wraith'
                ? 7.5
                : 4.5;
        moveSpeed = dist > preferredDist ? b.speed : b.speed * 0.52;
        b.vx = Math.sin(b.heading) * moveSpeed;
        b.vz = Math.cos(b.heading) * moveSpeed;
      } else if (b.state === 'circle') {
        // Predator flanking orbit: keeps eyes locked on the serpent while strafing sideways
        const diff = ((angleToPlayer - b.heading + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        b.heading += Math.max(-4.2 * dt, Math.min(4.2 * dt, diff));
        const orbitAngle = angleToPlayer + b.flankDir * (Math.PI * 0.44);
        const radialAdjust = dist < 5.5 ? -0.35 : dist > 11.5 ? 0.35 : 0;
        const strafeSpd = b.speed * 0.72;
        b.vx = Math.sin(orbitAngle) * strafeSpd + Math.sin(angleToPlayer) * (b.speed * radialAdjust);
        b.vz = Math.cos(orbitAngle) * strafeSpd + Math.cos(angleToPlayer) * (b.speed * radialAdjust);
        b.stateTimer -= dt;
        if (b.stateTimer <= 0 || dist > b.aggroRadius * 1.1) {
          b.state = 'chase';
        }
      } else if (b.state === 'windup') {
        const diff = ((angleToPlayer - b.heading + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        b.heading += Math.max(-2.6 * dt, Math.min(2.6 * dt, diff));
        b.vx *= Math.exp(-8 * dt);
        b.vz *= Math.exp(-8 * dt);
        b.stateTimer -= dt;
        if (b.stateTimer <= 0) {
          if (b.kind === 'eagle') {
            this.fireBeastProjectile(b, 17.5 * projSpeedScale, 0x58e8ff, Math.round(18 * dmgScale), true);
            b.state = 'lunge';
            b.stateTimer = 0.54;
            b.attackCooldown = 2.1;
            b.vx = Math.sin(b.heading) * (b.speed * 1.65);
            b.vz = Math.cos(b.heading) * (b.speed * 1.65);
          } else if (b.kind === 'wraith') {
            this.fireBeastProjectile(b, 16.5 * projSpeedScale, 0x38f2a8, Math.round(20 * dmgScale), true, 'soul_chain');
            b.state = 'lunge';
            b.stateTimer = 0.5;
            b.attackCooldown = 2.0;
            const flankAngle = b.heading + (Math.random() < 0.5 ? 0.42 : -0.42);
            b.vx = Math.sin(flankAngle) * (b.speed * 1.7);
            b.vz = Math.cos(flankAngle) * (b.speed * 1.7);
            this.world.spawnBurst(b.x, b.y + 1.2, b.z, 0x38f2a8, 12);
          } else if (b.kind === 'soul_elder' || b.kind === 'guardian') {
            const isReaper = b.kind === 'soul_elder';
            const ringHex = isReaper ? 0xd946ef : 0xc084fc;
            const bossDmg = Math.round((isReaper ? 28 : 24) * dmgScale);
            if (dist < 11.5) {
              this.shockwaves.push({
                id: this.nextShockwaveId++,
                fromPlayer: false,
                x: b.x,
                y: b.y,
                z: b.z,
                radius: 0.9,
                maxRadius: isReaper ? 13.0 : 11.8,
                age: 0,
                life: 0.62,
                colorHex: ringHex,
              });
              this.world.spawnBurst(b.x, b.y + 1.2, b.z, ringHex, 28);
              const fatal = this.applyPlayerDamage(bossDmg, b.name, this.headX - b.x, this.headZ - b.z);
              if (fatal) return true;
            } else {
              for (const spread of [-0.36, -0.18, 0, 0.18, 0.36]) {
                const shotAng = angleToPlayer + spread;
                const spd = (isReaper ? 17.5 : 16.0) * projSpeedScale;
                this.projectiles.push({
                  id: this.nextProjectileId++,
                  fromPlayer: false,
                  x: b.x + Math.sin(shotAng) * 2.1,
                  y: b.y + 2.4,
                  z: b.z + Math.cos(shotAng) * 2.1,
                  vx: Math.sin(shotAng) * spd,
                  vy: ((this.headY + 1.0) - (b.y + 2.4)) / Math.max(0.45, dist / spd),
                  vz: Math.cos(shotAng) * spd,
                  radius: 0.52,
                  damage: Math.round(bossDmg * 0.82),
                  colorHex: ringHex,
                  life: 3.4,
                  maxLife: 3.4,
                  homing: isReaper && Math.abs(spread) <= 0.18,
                  style: isReaper ? 'soul_chain' : 'bolt',
                });
              }
            }
            b.state = 'recover';
            b.stateTimer = 0.78;
            b.attackCooldown = isReaper ? 2.25 : 2.45;
          } else {
            b.state = 'lunge';
            b.stateTimer = b.kind === 'boar' ? 0.76 : 0.56;
            b.attackCooldown = b.kind === 'boar' ? 2.15 : 1.85;
            const chargeMult = b.kind === 'boar' ? 2.15 : 1.95;
            b.vx = Math.sin(b.heading) * (b.speed * chargeMult);
            b.vz = Math.cos(b.heading) * (b.speed * chargeMult);
            this.world.spawnBurst(b.x, b.y + 0.6, b.z, b.kind === 'boar' ? 0xff7b3d : 0xdbeafe, 10);
          }
        }
      } else if (b.state === 'lunge') {
        b.stateTimer -= dt;
        if (b.stateTimer <= 0) {
          b.state = 'recover';
          b.stateTimer = 0.62;
        }
      } else if (b.state === 'stagger') {
        b.vx *= Math.exp(-5.2 * dt);
        b.vz *= Math.exp(-5.2 * dt);
        b.stateTimer -= dt;
        if (b.stateTimer <= 0) {
          b.state = 'circle';
          b.stateTimer = 0.75;
          b.flankDir = -b.flankDir;
        }
      } else if (b.state === 'recover') {
        b.vx *= Math.exp(-6.0 * dt);
        b.vz *= Math.exp(-6.0 * dt);
        b.stateTimer -= dt;
        if (b.stateTimer <= 0) {
          b.state = b.faction === 'ghost_clan' || dist < b.aggroRadius * 1.4 ? 'circle' : 'patrol';
          b.stateTimer = 0.9 + Math.random() * 0.7;
        }
      }

      // Integrate beast/ghost motion hugging terrain
      const nextX = b.x + b.vx * dt;
      const nextZ = b.z + b.vz * dt;
      if (isInWorldBounds(nextX, nextZ) && !isDeepWater(nextX, nextZ, biome)) {
        b.x = nextX;
        b.z = nextZ;
      } else {
        b.heading += Math.PI * 0.75;
        b.vx = -b.vx * 0.5;
        b.vz = -b.vz * 0.5;
      }
      b.groundY = terrainHeightAt(b.x, b.z, biome);
      b.y = b.groundY;
      b.animPhase += dt * (2.2 + Math.hypot(b.vx, b.vz) * 0.34);

      // Melee / Dash-Strike / Counter-Clash Collision Check between Snake and Enemy
      if (combatEnabled) {
        const cdx = this.headX - b.x;
        const cdz = this.headZ - b.z;
        const cDist = Math.hypot(cdx, cdz);

        // Skill 3 Dash Strike pierces enemies and triggers Counter-Parry Clash against wind-ups/lunges!
        if (this.dashActiveTimer > 0 && cDist < b.radius + 1.95 && Math.abs(this.headY - b.y) < 3.4) {
          if (!this.dashHitIds.has(b.id)) {
            this.dashHitIds.add(b.id);
            const nx = cDist > 0.01 ? -cdx / cDist : Math.sin(this.heading);
            const nz = cDist > 0.01 ? -cdz / cDist : Math.cos(this.heading);
            this.world.triggerShake(0.24);
            this.world.spawnBurst(b.x, b.y + 1.3, b.z, 0xffe066, 20);
            this.applyDuelHitToBeast(b, magic.dashDamage, nx, nz, 10.5, true);
          }
          continue;
        }

        if (cDist < b.radius + 0.92 && Math.abs(this.headY - b.y) < 2.8) {
          const nx = cDist > 0.01 ? -cdx / cDist : Math.sin(this.heading);
          const nz = cDist > 0.01 ? -cdz / cDist : Math.cos(this.heading);
          if (playerBoosting && (b.state === 'windup' || b.state === 'stagger' || (b.state !== 'lunge' && !b.isBoss))) {
            // Boosted Fang Ram: interrupts wind-ups for a real melee clash or punishes staggered foes!
            const ramDmg = Math.round(magic.boltDamage * 1.0);
            this.applyDuelHitToBeast(b, ramDmg, nx, nz, 8.2, true);
          } else if (b.state !== 'stagger') {
            const meleeDmg = Math.round(
              (b.kind === 'soul_elder'
                ? 28
                : b.kind === 'guardian'
                  ? 24
                  : b.kind === 'boar'
                    ? 20
                    : b.kind === 'wraith'
                      ? 19
                      : 17) * dmgScale,
            );
            const fatal = this.applyPlayerDamage(meleeDmg, b.name, cdx, cdz);
            if (fatal) return true;
            this.hitstopTimer = Math.max(this.hitstopTimer, 0.045);
            b.vx = nx * 4.5;
            b.vz = nz * 4.5;
            b.state = 'recover';
            b.stateTimer = 0.72;
          }
        }
      }
    }
    return false;
  }

  private updateProjectilesAndShockwaves(dt: number): boolean {
    const biome = this.formation.biome;

    // 1. Update expanding 3D shockwave rings
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.age += dt;
      if (sw.age >= sw.life) {
        this.shockwaves.splice(i, 1);
        continue;
      }
      const u = sw.age / sw.life;
      sw.radius = 0.8 + (sw.maxRadius - 0.8) * (1 - Math.pow(1 - u, 2));
    }

    // 2. Update magical spell projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.projectiles.splice(i, 1);
        continue;
      }

      if (p.fromPlayer && p.homing && this.beasts.length > 0) {
        let nearest: WildBeast | null = null;
        let bestDist = p.style === 'lotus' ? 42 : 30;
        for (const b of this.beasts) {
          if (b.state === 'emerging' && b.emergeProgress < 0.35) continue;
          const d = Math.hypot(b.x - p.x, b.z - p.z);
          if (d < bestDist) {
            bestDist = d;
            nearest = b;
          }
        }
        if (nearest) {
          const spd = Math.hypot(p.vx, p.vz) || 30;
          const desiredAngle = Math.atan2(nearest.x - p.x, nearest.z - p.z);
          const curAngle = Math.atan2(p.vx, p.vz);
          const diff = ((desiredAngle - curAngle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
          const turnRate = p.style === 'lotus' ? 6.2 : 4.5;
          const steer = Math.max(-turnRate * dt, Math.min(turnRate * dt, diff));
          const nextAng = curAngle + steer;
          p.vx = Math.sin(nextAng) * spd;
          p.vz = Math.cos(nextAng) * spd;
        }
      } else if (!p.fromPlayer && p.homing) {
        // Mild homing for Ghost Clan Soul-Chain orbs (dodgeable with a turn or boost!)
        const spd = Math.hypot(p.vx, p.vz) || 20;
        const desiredAngle = Math.atan2(this.headX - p.x, this.headZ - p.z);
        const curAngle = Math.atan2(p.vx, p.vz);
        const diff = ((desiredAngle - curAngle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        const steer = Math.max(-1.45 * dt, Math.min(1.45 * dt, diff));
        const nextAng = curAngle + steer;
        p.vx = Math.sin(nextAng) * spd;
        p.vz = Math.cos(nextAng) * spd;
      }

      p.x += p.vx * dt;
      p.z += p.vz * dt;
      const groundY = terrainHeightAt(p.x, p.z, biome);
      if (p.fromPlayer) {
        const targetY = groundY + 1.15;
        p.y += (targetY - p.y) * Math.min(1, dt * 10);
      } else {
        p.y += p.vy * dt;
        if (p.y < groundY + 0.35) {
          this.world.spawnBurst(p.x, groundY + 0.4, p.z, p.colorHex, 8);
          this.projectiles.splice(i, 1);
          continue;
        }
      }

      if (!isInWorldBounds(p.x, p.z)) {
        this.projectiles.splice(i, 1);
        continue;
      }

      if (p.fromPlayer) {
        let hit = false;
        for (let j = this.beasts.length - 1; j >= 0; j--) {
          const b = this.beasts[j];
          if (b.state === 'emerging' && b.emergeProgress < 0.35) continue;
          const hitDist = b.radius + p.radius + 0.7;
          if (Math.hypot(b.x - p.x, b.z - p.z) <= hitDist) {
            // Landing primary bolts restores a touch of Dou Qi to reward aggressive spellweaving
            if (p.style !== 'lotus') {
              this.qi = Math.min(this.maxQi, this.qi + 4);
            }
            const strike = resolveCombatStrike(p.damage, b.state, false);
            if (p.style === 'bullet') {
              const bSpd = Math.hypot(p.vx, p.vz) || 1;
              const recoilCfg = computeGunRecoilPhysics(this.level);
              const push = b.isBoss ? recoilCfg.knockbackForce * 0.48 : recoilCfg.knockbackForce;
              b.vx += (p.vx / bSpd) * push;
              b.vz += (p.vz / bSpd) * push;
              this.hitstopTimer = Math.max(this.hitstopTimer, 0.022);
              this.world.spawnBurst(p.x, p.y, p.z, 0xffd166, 12);
            }
            if (strike.triggeredStaggerBonus) {
              this.world.spawnBurst(b.x, b.y + 1.25, b.z, 0xfde047, 12);
            }
            this.damageBeast(b, strike.damage);
            this.projectiles.splice(i, 1);
            hit = true;
            break;
          }
        }
        if (hit) continue;
      } else {
        const dPlayer = Math.hypot(this.headX - p.x, this.headZ - p.z);
        if (dPlayer < p.radius + 1.0 && Math.abs(this.headY + 0.9 - p.y) < 2.4) {
          this.projectiles.splice(i, 1);
          const sourceLabel = p.style === 'soul_chain' ? 'a Soul Clan chain bolt' : 'a magical beast bolt';
          const fatal = this.applyPlayerDamage(p.damage, sourceLabel, p.vx, p.vz);
          if (fatal) return true;
        }
      }
    }
    return false;
  }

  private checkCollectibles(): void {
    for (let i = this.orbs.length - 1; i >= 0; i--) {
      const orb = this.orbs[i];
      const dist = Math.hypot(this.headX - orb.x, this.headZ - orb.z);
      if (dist < 1.9) {
        this.orbs.splice(i, 1);
        this.fruitsEaten++;
        this.lifetimeStats.crystalsCollected++;
        if (orb.golden) {
          this.lifetimeStats.goldenCrystalsCollected++;
          this.recordMilestone(
            'feat-first-gold',
            'feat',
            'First Golden Summit Crystal',
            'Harvested a rare high-altitude summit crystal.',
          );
        }

        this.snakeLength = Math.min(MAX_LENGTH, this.snakeLength + (orb.golden ? 3 : 2));
        this.stamina = Math.min(1, this.stamina + (orb.golden ? 0.55 : 0.25));
        this.hp = Math.min(this.maxHp, this.hp + (orb.golden ? 22 : 7));
        this.qi = Math.min(this.maxQi, this.qi + (orb.golden ? 42 : 16));

        this.combo = this.comboTimer > 0 ? Math.min(8, this.combo + 1) : 1;
        this.maxCombo = Math.max(this.maxCombo, this.combo);
        if (this.combo > this.lifetimeStats.bestCombo) {
          this.lifetimeStats.bestCombo = this.combo;
        }
        if (this.combo >= 5) {
          this.recordMilestone(
            'feat-combo-5',
            'feat',
            '5x Essence Streak',
            'Chained five consecutive alpine crystals without breaking stride.',
          );
        }
        this.comboTimer = COMBO_WINDOW;

        const basePts = orb.golden ? 150 : 60;
        const gained = basePts * this.combo;
        this.addScore(gained);

        const altBonus = 1 + Math.min(1.1, Math.max(0, (orb.y - 6) / 38));
        const baseXp = orb.golden ? 135 : 38;
        const xpGain = Math.round(baseXp * (1 + (this.combo - 1) * 0.18) * altBonus);

        this.sound.playEat(this.combo, orb.golden);
        this.world.spawnBurst(
          orb.x,
          orb.y + 0.8,
          orb.z,
          orb.golden ? 0xffd24d : 0x58e1ff,
          orb.golden ? 30 : 20,
        );

        const prevLvl = this.level;
        this.awardXp(xpGain);

        if (orb.golden && this.level === prevLvl) {
          this.world.triggerShake(0.18);
          this.onToast(`Golden Summit Crystal! +${xpGain} XP`);
        }

        const currentGold = this.orbs.filter((o) => o.golden).length;
        this.spawnOneOrb(currentGold < GOLDEN_ORB_COUNT, true);
        if (this.mode !== 'playing') return;
      }
    }
  }

  private checkLandmarks(): void {
    for (const lm of WORLD_LANDMARKS) {
      if (this.visitedLandmarks.has(lm.id)) continue;
      if (Math.hypot(this.headX - lm.x, this.headZ - lm.z) <= lm.radius) {
        this.visitedLandmarks.add(lm.id);
        this.lastCheckpointId = lm.id;
        this.addScore(350 + lm.tier * 120);
        this.stamina = 1.0;
        this.hp = this.maxHp;
        this.qi = this.maxQi;
        this.clanHeatValue = Math.min(100, this.clanHeatValue + 18);

        this.recordMilestone(
          `peak-${lm.id}`,
          'peak',
          `Conquered ${lm.name}`,
          `Tier ${lm.tier} Peak Shrine · ${lm.region} (+${lm.xpReward} XP)`,
        );

        this.sound.playLandmark();
        const ly = terrainHeightAt(lm.x, lm.z, this.formation.biome);
        this.world.spawnBurst(lm.x, ly + 2.8, lm.z, lm.accentHex, 44);
        this.world.triggerShake(0.24);

        const prevLvl = this.level;
        this.awardXp(lm.xpReward);

        if (this.level === prevLvl) {
          const nextStage = getNextStage(this.level);
          if (nextStage && this.xp < nextStage.xpRequired) {
            const needXp = nextStage.xpRequired - this.xp;
            this.onToast(
              `Tier ${lm.tier} Conquered: ${lm.name}! (+${lm.xpReward} XP · Need ${needXp} more XP for Lv ${nextStage.level})`,
            );
          } else {
            this.onToast(`Tier ${lm.tier} Conquered: ${lm.name}! Checkpoint saved (+${lm.xpReward} XP)`);
          }
          this.triggerCompliment('peak_conquered', 'high');
        } else {
          this.triggerCompliment('evolution', 'high');
        }
        this.emitHud();
        if (this.mode !== 'playing') return;
      }
    }
  }

  private addScore(points: number): void {
    this.score += points;
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      this.isNewBest = true;
      saveBestScore(this.bestScore);
    }
  }

  private triggerGameOver(reason: string): void {
    this.mode = 'gameover';
    this.deathReason = reason;
    this.clearHeldInputs();
    this.lifetimeStats.crashesSurvived++;

    const floorXp = getStageForLevel(this.level).xpRequired;
    const progressAboveFloor = Math.max(0, this.xp - floorXp);
    this.xpLostOnCrash = Math.floor(progressAboveFloor * 0.35);
    if (this.xpLostOnCrash > 0) {
      this.xp -= this.xpLostOnCrash;
    }
    this.persistJourney();

    this.sound.playCrash();
    this.world.triggerShake(0.9);
    this.world.spawnBurst(this.headX, this.headY + 0.8, this.headZ, 0xff5a36, 36);
    this.emitHud();
  }

  // ==================== PATH SAMPLING & SNAPSHOTS ====================

  private sampleBodySegments(): SnakePose3D[] {
    const result: SnakePose3D[] = [];
    const hist = this.pathHistory;
    if (hist.length === 0) return result;

    let cursor = hist.length - 1;
    for (let segIdx = 0; segIdx < this.snakeLength; segIdx++) {
      const targetDist = this.totalTravelDist - (segIdx + 1) * SEGMENT_SPACING;
      while (cursor > 0 && hist[cursor].cumDist > targetDist) {
        cursor--;
      }
      const a = hist[cursor];
      const b = hist[Math.min(cursor + 1, hist.length - 1)];
      const span = b.cumDist - a.cumDist;
      const t = span > 0.0001 ? Math.max(0, Math.min(1, (targetDist - a.cumDist) / span)) : 0;

      result.push({
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
        z: a.z + (b.z - a.z) * t,
        nx: a.nx + (b.nx - a.nx) * t,
        ny: a.ny + (b.ny - a.ny) * t,
        nz: a.nz + (b.nz - a.nz) * t,
        heading: a.heading,
      });
    }
    return result;
  }

  private buildRenderSnakeState(): RenderSnakeState {
    const n = terrainNormalAt(this.headX, this.headZ, this.formation.biome);
    const boostActive = (this.boostHeld && this.stamina > 0.04) || this.boostPadTimer > 0;
    const cfg = SPEED_CONFIG[this.speedPreset];
    const steerRateNorm = Math.max(
      -1,
      Math.min(1, this.currentSteerRate / Math.max(0.1, cfg.turnRate)),
    );
    return {
      head: {
        x: this.headX,
        y: this.headY,
        z: this.headZ,
        nx: n.x,
        ny: n.y,
        nz: n.z,
        heading: this.heading,
      },
      segments: this.sampleBodySegments(),
      boostActive,
      speedRatio: this.currentSpeed / cfg.baseSpeed,
      traversalStrain: this.currentTraversalStrain,
      steerRateNorm,
      traversalClimate: this.weather,
    };
  }

  public emitHud(): void {
    const altMeters = Math.max(0, Math.round((this.headY - WATER_LEVEL) * 14));
    const speedKmh = Math.round(this.currentSpeed * 4.5);
    const stage = getStageForLevel(this.level);
    const nextStage = getNextStage(this.level);
    const levelFloorXp = stage.xpRequired;
    const nextLevelXp = nextStage ? nextStage.xpRequired : stage.xpRequired;
    const xpProgress = nextStage
      ? Math.max(0, Math.min(1, (this.xp - levelFloorXp) / Math.max(1, nextLevelXp - levelFloorXp)))
      : 1;

    const nextLm = this.getNextTargetLandmark();
    let nextShrineDist = 0;
    let nextShrineBearing = 0;
    if (nextLm) {
      const dx = nextLm.x - this.headX;
      const dz = nextLm.z - this.headZ;
      nextShrineDist = Math.round(Math.hypot(dx, dz));
      const worldAngle = Math.atan2(dx, dz);
      nextShrineBearing = ((this.heading - worldAngle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    }

    const magic = getMagicTierForLevel(this.level);
    const env = getLevelEnvironment(this.level);
    const clanHeat = this.getClanHeatLevel();
    const activeFissureCount = this.fissures.length;
    let activeGhostCount = 0;
    let nearestGhostDist = Infinity;
    for (const b of this.beasts) {
      if (b.faction === 'ghost_clan') {
        activeGhostCount++;
        const d = Math.hypot(b.x - this.headX, b.z - this.headZ);
        if (d < nearestGhostDist) nearestGhostDist = d;
      }
    }
    const soulAmbushEta = Math.max(0, this.ghostAmbushTimer);
    const etaRamp = Math.max(0, Math.min(1, 1 - soulAmbushEta / 6.5));
    const soulInfluence = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          this.clanHeatValue * 0.52 +
            etaRamp * 26 +
            activeGhostCount * 16 +
            activeFissureCount * 7,
        ),
      ),
    );
    let soulPresenceState: SoulPresenceState = 'dormant';
    if (activeGhostCount > 0 || activeFissureCount > 0 || this.ambushBannerTimer > 0) {
      soulPresenceState = 'active';
    } else if (soulAmbushEta <= 4.5 || nearestGhostDist < 28) {
      soulPresenceState = 'imminent';
    } else if (soulInfluence >= 28 || soulAmbushEta <= 9.5) {
      soulPresenceState = 'stirring';
    }

    // Find active/closest hostile beast or ghost (prioritizing nearby Bosses & high-tier foes for Boss Mode HUD)
    let engagedBeast: WildBeast | null = null;
    if (this.lastEngagedBeastId !== null) {
      engagedBeast = this.beasts.find((b) => b.id === this.lastEngagedBeastId) ?? null;
    }
    // Always let a nearby active Boss take focus if we aren't actively damaging a different Boss
    if (!engagedBeast || !engagedBeast.isBoss) {
      let bestBossDist = 54;
      let nearestBoss: WildBeast | null = null;
      for (const b of this.beasts) {
        if (!b.isBoss) continue;
        const d = Math.hypot(b.x - this.headX, b.z - this.headZ);
        if (d < bestBossDist) {
          bestBossDist = d;
          nearestBoss = b;
        }
      }
      if (nearestBoss) {
        engagedBeast = nearestBoss;
      }
    }
    if (!engagedBeast) {
      let bestDist = 42;
      for (const b of this.beasts) {
        const isHighTierCandidate = b.isBoss || this.level >= 5 || b.maxHp >= 420;
        if (!isHighTierCandidate && b.state === 'patrol' && b.hp >= b.maxHp) continue;
        const d = Math.hypot(b.x - this.headX, b.z - this.headZ);
        if (d < bestDist) {
          bestDist = d;
          engagedBeast = b;
        }
      }
    }

    const stageDiff = computeScaledEnemyStats(FIXED_ENEMY_HP, this.level, this.speedPreset, false);
    const hostileDiff = engagedBeast
      ? computeScaledEnemyStats(FIXED_ENEMY_HP, this.level, this.speedPreset, engagedBeast.isBoss)
      : stageDiff;
    const nearbyHostileIsHighTier = Boolean(
      engagedBeast &&
        (engagedBeast.isBoss ||
          engagedBeast.faction === 'ghost_clan' && this.level >= 4 ||
          this.level >= 5 ||
          engagedBeast.maxHp >= 420),
    );

    this.onHudUpdate({
      mode: this.mode,
      biome: this.formation.biome,
      weather: this.weather,
      weatherLabel: WEATHER_LABELS[this.weather],
      score: this.score,
      bestScore: this.bestScore,
      length: this.snakeLength,
      combo: this.combo,
      comboProgress: this.combo > 0 ? this.comboTimer / COMBO_WINDOW : 0,
      speedPreset: this.speedPreset,
      cameraMode: this.cameraMode,
      muted: this.sound.isMuted(),
      formationName: this.formation.name,
      deathReason: this.deathReason,
      maxCombo: this.maxCombo,
      fruitsEaten: this.fruitsEaten,
      boostTimer: this.boostPadTimer,
      stamina: this.stamina,
      altitude: altMeters,
      speedKmh,
      zoneName: getZoneNameAt(this.headX, this.headZ, this.formation.biome),
      visitedCount: this.visitedLandmarks.size,
      totalLandmarks: WORLD_LANDMARKS.length,
      isNewBest: this.isNewBest,
      level: this.level,
      maxLevel: MAX_EVOLUTION_LEVEL,
      stageTitle: stage.title,
      stageSubtitle: stage.subtitle,
      realmName: magic.realmName,
      xp: this.xp,
      levelFloorXp,
      nextLevelXp,
      xpProgress,
      shrinesRequiredForNext: nextStage ? nextStage.shrinesRequired : WORLD_LANDMARKS.length,
      nextShrineName: nextLm ? `T${nextLm.tier} ${nextLm.name}` : 'All 12 Peaks Conquered',
      nextShrineDist,
      nextShrineBearing,
      xpLostOnCrash: this.xpLostOnCrash,
      checkpointName: this.getCheckpointName(),
      isHuman: this.level >= MAX_EVOLUTION_LEVEL,
      visitedLandmarkIds: Array.from(this.visitedLandmarks),
      hp: this.hp,
      maxHp: this.maxHp,
      qi: this.qi,
      maxQi: this.maxQi,
      magicTierName: magic.magicTitle,
      primarySpellName: hasHalfHumanGun(this.level)
        ? this.level >= 11
          ? 'Ascended Hand Cannon'
          : 'Runic Hand Cannon'
        : magic.primarySpell,
      shockwaveName: magic.shockwaveSpell,
      dashSkillName: magic.dashSkillName,
      ultimateSkillName: magic.ultimateSkillName,
      primaryCooldownFrac: this.primarySpellMaxCd > 0 ? this.primarySpellCd / this.primarySpellMaxCd : 0,
      shockwaveCooldownFrac: this.shockwaveMaxCd > 0 ? this.shockwaveCd / this.shockwaveMaxCd : 0,
      dashCooldownFrac: this.dashMaxCd > 0 ? this.dashCd / this.dashMaxCd : 0,
      ultimateCooldownFrac: this.ultimateMaxCd > 0 ? this.ultimateCd / this.ultimateMaxCd : 0,
      dashQiCost: magic.dashQiCost,
      ultimateQiCost: magic.ultimateQiCost,
      envHazardName: env.envName,
      envHazardSeverity: env.severity,
      envHpDrainPerSec: this.currentEnvDrainPerSec,
      isSheltered: this.isSheltered,
      clanHeat,
      clanHeatProgress: (this.clanHeatValue % 20) / 20,
      soulInfluence,
      soulPresenceState,
      soulAmbushEta,
      activeFissureCount,
      ambushActive: this.ambushBannerTimer > 0 || activeGhostCount > 0,
      activeGhostCount,
      ghostsDefeated: this.lifetimeStats.ghostsDefeated,
      beastsDefeated: this.lifetimeStats.beastsDefeated,
      recentHurtPulse: this.recentHurtPulse,
      nearbyHostileId: engagedBeast ? engagedBeast.id : null,
      nearbyHostileKind: engagedBeast ? engagedBeast.kind : null,
      nearbyHostileName: engagedBeast ? engagedBeast.name : null,
      nearbyHostileHp: engagedBeast ? Math.max(0, Math.ceil(engagedBeast.hp)) : 0,
      nearbyHostileMaxHp: engagedBeast ? engagedBeast.maxHp : 0,
      nearbyHostileBoss: engagedBeast ? engagedBeast.isBoss : false,
      nearbyHostileIsHighTier,
      nearbyHostileHpMult: hostileDiff.hpMultiplier,
      nearbyHostileFaction: engagedBeast ? engagedBeast.faction : null,
      difficultyHpMult: stageDiff.hpMultiplier,
      difficultyDamageMult: stageDiff.damageMultiplier,
      difficultyTierLabel: stageDiff.tierLabel,
    });
  }

  private emitMinimap(): void {
    const body = this.sampleBodySegments();
    const trail: Array<{ x: number; z: number }> = [];
    for (let i = 0; i < body.length; i += 2) {
      trail.push({ x: body[i].x, z: body[i].z });
    }
    const portals: Array<{ x: number; z: number; variant: 'A' | 'B' }> = [];
    for (const p of this.formation.props) {
      if (p.type === 'portalA') portals.push({ x: p.x, z: p.z, variant: 'A' });
      else if (p.type === 'portalB') portals.push({ x: p.x, z: p.z, variant: 'B' });
    }
    const nextLm = this.getNextTargetLandmark();
    this.onMinimapUpdate({
      biome: this.formation.biome,
      headX: this.headX,
      headZ: this.headZ,
      heading: this.heading,
      trail,
      orbs: this.orbs.map((o) => ({ x: o.x, z: o.z, golden: o.golden })),
      boulders: this.rollingBoulders.map((b) => ({ x: b.x, z: b.z })),
      beasts: this.beasts.map((b) => ({
        x: b.x,
        z: b.z,
        kind: b.kind,
        faction: b.faction,
        aggro: b.state !== 'patrol',
      })),
      fissures: this.fissures.map((f) => ({
        x: f.x,
        z: f.z,
        isBoss: f.isBoss,
      })),
      projectiles: this.projectiles.map((p) => ({
        x: p.x,
        z: p.z,
        fromPlayer: p.fromPlayer,
      })),
      portals,
      visitedLandmarkIds: Array.from(this.visitedLandmarks),
      nextLandmarkId: nextLm ? nextLm.id : null,
    });
  }
}
