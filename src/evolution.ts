import { sanitizeBestiaryRecords } from './bestiary';
import { BestiaryEntryId, BestiaryRecord, EnvHazardSeverity, SpeedPreset } from './types';

export interface EvolutionStage {
  level: number;
  title: string;
  subtitle: string;
  xpRequired: number;
  shrinesRequired: number;
  serpentScale: number;
  hornScale: number;
  wingBlend: number;
  nagaTorsoBlend: number;
  humanFaceBlend: number;
  legsBlend: number;
  tailOpacity: number;
  auraIntensity: number;
  scaleColorHex: number;
  speedBonus: number;
  staminaBonus: number;
}

export type MilestoneKind = 'evolution' | 'peak' | 'feat';

export interface JourneyMilestone {
  id: string;
  kind: MilestoneKind;
  title: string;
  detail: string;
  level: number;
  altitudeMeters: number;
  elapsedSeconds: number;
  recordedAt: number;
}

export interface MagicTierInfo {
  level: number;
  realmName: string;
  magicTitle: string;
  primarySpell: string;
  shockwaveSpell: string;
  dashSkillName: string;
  ultimateSkillName: string;
  manaColorHex: number;
  boltCount: number;
  boltSpreadRad: number;
  boltDamage: number;
  boltSpeed: number;
  boltCooldown: number;
  boltHoming: boolean;
  shockwaveDamage: number;
  shockwaveRadius: number;
  shockwaveCooldown: number;
  dashDamage: number;
  dashCooldown: number;
  dashQiCost: number;
  ultimateDamage: number;
  ultimateRadius: number;
  ultimateCooldown: number;
  ultimateQiCost: number;
  breaksBoulders: boolean;
  auraOrbs: number;
  maxHp: number;
  maxQi: number;
}

export interface RealmEnvironmentProfile {
  level: number;
  realmName: string;
  envName: string;
  severity: EnvHazardSeverity;
  hpDrainPerSec: number;
  skyHex: number;
  fogHex: number;
  sunHex: number;
  hemiSkyHex: number;
  hemiGroundHex: number;
  rimHex: number;
  moteHex: number;
  fogDensityBoost: number;
  blendWeight: number;
  hazardNote: string;
}

export interface JourneyLifetimeStats {
  distanceMeters: number;
  timePlayedSeconds: number;
  crystalsCollected: number;
  goldenCrystalsCollected: number;
  highestAltitudeMeters: number;
  bestCombo: number;
  crashesSurvived: number;
  beastsDefeated: number;
  ghostsDefeated: number;
}

export interface HumanityPathMetrics {
  humanityPercent: number;
  posturePercent: number;
  visagePercent: number;
  shedPercent: number;
  peakMasteryPercent: number;
  speedGainPercent: number;
  staminaGainPercent: number;
  phaseLabel: string;
  traitUnlocked: string;
}

export interface EvolutionUnlockSummary {
  level: number;
  previousLevel: number;
  stage: EvolutionStage;
  magic: MagicTierInfo;
  nextStage: EvolutionStage | null;
  isHuman: boolean;
  xp: number;
  visitedCount: number;
  totalLandmarks: number;
  humanity: HumanityPathMetrics;
  stats: JourneyLifetimeStats;
  milestones: JourneyMilestone[];
  latestMilestoneId: string | null;
}

export interface CultivationDifficultyProfile {
  level: number;
  realmName: string;
  tierLabel: string;
  enemyHpMultiplier: number;
  enemyDamageMultiplier: number;
  enemySpeedMultiplier: number;
  bossHpBonus: number;
}

export interface ScaledEnemyStats {
  maxHp: number;
  hpMultiplier: number;
  damageMultiplier: number;
  speedMultiplier: number;
  tierLabel: string;
}

export const MAX_EVOLUTION_LEVEL = 12;

/**
 * Escalating cultivation-stage difficulty multipliers (Stages 1..12).
 * Scales enemy health, damage, and speed steeply in higher realms so late-stage
 * Dou Huang -> Dou Di encounters remain formidable against high-tier Dou Qi skills.
 */
export const CULTIVATION_DIFFICULTY_PROFILES: readonly CultivationDifficultyProfile[] = [
  { level: 1,  realmName: 'Dou Zhi Qi', tierLabel: 'Mortal Trial',         enemyHpMultiplier: 1.0,  enemyDamageMultiplier: 1.0,  enemySpeedMultiplier: 1.0,  bossHpBonus: 1.0  },
  { level: 2,  realmName: 'Dou Zhe',    tierLabel: 'Mortal Trial',         enemyHpMultiplier: 1.2,  enemyDamageMultiplier: 1.15, enemySpeedMultiplier: 1.03, bossHpBonus: 1.08 },
  { level: 3,  realmName: 'Dou Shi',    tierLabel: 'Awakened Peril',       enemyHpMultiplier: 1.45, enemyDamageMultiplier: 1.32, enemySpeedMultiplier: 1.06, bossHpBonus: 1.15 },
  { level: 4,  realmName: 'Da Dou Shi', tierLabel: 'Awakened Peril',       enemyHpMultiplier: 1.75, enemyDamageMultiplier: 1.5,  enemySpeedMultiplier: 1.09, bossHpBonus: 1.22 },
  { level: 5,  realmName: 'Dou Ling',   tierLabel: 'Spirit Calamity',      enemyHpMultiplier: 2.15, enemyDamageMultiplier: 1.72, enemySpeedMultiplier: 1.13, bossHpBonus: 1.3  },
  { level: 6,  realmName: 'Dou Wang',   tierLabel: 'Spirit Calamity',      enemyHpMultiplier: 2.65, enemyDamageMultiplier: 1.98, enemySpeedMultiplier: 1.17, bossHpBonus: 1.38 },
  { level: 7,  realmName: 'Dou Huang',  tierLabel: 'Sovereign Crucible',   enemyHpMultiplier: 3.25, enemyDamageMultiplier: 2.28, enemySpeedMultiplier: 1.21, bossHpBonus: 1.46 },
  { level: 8,  realmName: 'Dou Zong',   tierLabel: 'Sovereign Crucible',   enemyHpMultiplier: 3.95, enemyDamageMultiplier: 2.62, enemySpeedMultiplier: 1.25, bossHpBonus: 1.54 },
  { level: 9,  realmName: 'Dou Zun',    tierLabel: 'Venerate Tribulation', enemyHpMultiplier: 4.75, enemyDamageMultiplier: 3.0,  enemySpeedMultiplier: 1.29, bossHpBonus: 1.62 },
  { level: 10, realmName: 'Ban Sheng',  tierLabel: 'Saint Tribulation',    enemyHpMultiplier: 5.65, enemyDamageMultiplier: 3.42, enemySpeedMultiplier: 1.33, bossHpBonus: 1.72 },
  { level: 11, realmName: 'Dou Sheng',  tierLabel: 'Saint Tribulation',    enemyHpMultiplier: 6.7,  enemyDamageMultiplier: 3.9,  enemySpeedMultiplier: 1.37, bossHpBonus: 1.82 },
  { level: 12, realmName: 'Dou Di',     tierLabel: 'Heavenly Cataclysm',   enemyHpMultiplier: 8.0,  enemyDamageMultiplier: 4.5,  enemySpeedMultiplier: 1.42, bossHpBonus: 2.0  },
];

export const SPEED_PRESET_COMBAT_MULT: Record<SpeedPreset, { hp: number; damage: number }> = {
  chill: { hp: 0.85, damage: 0.85 },
  classic: { hp: 1.0, damage: 1.0 },
  turbo: { hp: 1.25, damage: 1.25 },
};

/**
 * Autonomously determines the active difficulty tier from the player's
 * current cultivation stage so difficulty escalates naturally with progression.
 */
export function computeAutonomousDifficulty(level: number): SpeedPreset {
  if (level >= 8) return 'turbo';
  if (level >= 4) return 'classic';
  return 'chill';
}

export function getCultivationDifficulty(level: number): CultivationDifficultyProfile {
  const idx = Math.max(0, Math.min(CULTIVATION_DIFFICULTY_PROFILES.length - 1, Math.round(level) - 1));
  return CULTIVATION_DIFFICULTY_PROFILES[idx];
}

export function computeScaledEnemyStats(
  baseHp: number,
  level: number,
  speedPreset: SpeedPreset,
  isBoss: boolean,
): ScaledEnemyStats {
  const profile = getCultivationDifficulty(level);
  const presetMult = SPEED_PRESET_COMBAT_MULT[speedPreset];
  const hpMultiplier = profile.enemyHpMultiplier * presetMult.hp * (isBoss ? profile.bossHpBonus : 1.0);
  const damageMultiplier = profile.enemyDamageMultiplier * presetMult.damage;
  return {
    maxHp: Math.max(1, Math.round(baseHp * hpMultiplier)),
    hpMultiplier,
    damageMultiplier,
    speedMultiplier: profile.enemySpeedMultiplier,
    tierLabel: profile.tierLabel,
  };
}

export interface BossBarSegmentMetrics {
  segmentCount: number;
  hpPerSegment: number;
  activeSegments: number;
  segmentFills: number[];
}

/**
 * Computes the segmented Boss Mode HP bar layout scaled to the enemy's difficulty
 * and total health (4..16 discrete segments, each filling from 0..1).
 */
export function computeBossBarSegments(
  maxHp: number,
  hp: number,
  difficultyHpMult: number,
  isBoss: boolean,
): BossBarSegmentMetrics {
  const safeMax = Math.max(1, maxHp);
  const safeHp = Math.max(0, Math.min(safeMax, hp));
  const rawSegments =
    3 +
    Math.sqrt(Math.max(1, safeMax / 35)) +
    (difficultyHpMult >= 2 ? Math.min(3, (difficultyHpMult - 1.5) * 0.45) : 0) +
    (isBoss ? 1 : 0);
  const segmentCount = Math.max(4, Math.min(16, Math.round(rawSegments)));
  const hpPerSegment = safeMax / segmentCount;
  const segmentFills: number[] = [];
  let activeSegments = 0;

  for (let i = 0; i < segmentCount; i++) {
    const segStart = i * hpPerSegment;
    const fill = Math.max(0, Math.min(1, (safeHp - segStart) / hpPerSegment));
    segmentFills.push(fill);
    if (fill > 0.001) activeSegments++;
  }

  return {
    segmentCount,
    hpPerSegment,
    activeSegments,
    segmentFills,
  };
}

export const LEVEL_ENVIRONMENTS: RealmEnvironmentProfile[] = [
  {
    level: 1,
    realmName: 'Dou Zhi Qi',
    envName: 'Jade Mist Valley',
    severity: 'safe',
    hpDrainPerSec: 0,
    skyHex: 0x76b8d8,
    fogHex: 0x99cbd9,
    sunHex: 0xfff0d4,
    hemiSkyHex: 0xaadfff,
    hemiGroundHex: 0x3b634a,
    rimHex: 0x5ef2a8,
    moteHex: 0x9df7c4,
    fogDensityBoost: 0,
    blendWeight: 0.14,
    hazardNote: 'Calm valley spirit aura · No vitality drain',
  },
  {
    level: 2,
    realmName: 'Dou Zhe',
    envName: 'Emerald Foothills',
    severity: 'safe',
    hpDrainPerSec: 0,
    skyHex: 0x6ab4cf,
    fogHex: 0x8fc5cb,
    sunHex: 0xffe8c6,
    hemiSkyHex: 0x9ad8f0,
    hemiGroundHex: 0x345e4b,
    rimHex: 0x4ae8b0,
    moteHex: 0x8ef5c8,
    fogDensityBoost: 0.0001,
    blendWeight: 0.22,
    hazardNote: 'Crisp mountain air · Safe for young serpents',
  },
  {
    level: 3,
    realmName: 'Dou Shi',
    envName: 'Amber Dusk Ridge',
    severity: 'mild',
    hpDrainPerSec: 0.55,
    skyHex: 0xc2855c,
    fogHex: 0xc99672,
    sunHex: 0xffc680,
    hemiSkyHex: 0xf0be8e,
    hemiGroundHex: 0x4c3c30,
    rimHex: 0xffa652,
    moteHex: 0xffcf78,
    fogDensityBoost: 0.00028,
    blendWeight: 0.42,
    hazardNote: 'Thinning twilight air · Mild vitality drain',
  },
  {
    level: 4,
    realmName: 'Da Dou Shi',
    envName: 'Copper Canyon Winds',
    severity: 'mild',
    hpDrainPerSec: 0.95,
    skyHex: 0xa86752,
    fogHex: 0xb67a62,
    sunHex: 0xffaa68,
    hemiSkyHex: 0xe6a17c,
    hemiGroundHex: 0x49312a,
    rimHex: 0xff824c,
    moteHex: 0xffb36b,
    fogDensityBoost: 0.00042,
    blendWeight: 0.52,
    hazardNote: 'Scorching updrafts · Steady Qi burn required',
  },
  {
    level: 5,
    realmName: 'Dou Ling',
    envName: 'Stormfront Crags',
    severity: 'harsh',
    hpDrainPerSec: 1.45,
    skyHex: 0x3d5b7a,
    fogHex: 0x4b6c88,
    sunHex: 0xa8d4ff,
    hemiSkyHex: 0x7ab0d8,
    hemiGroundHex: 0x263544,
    rimHex: 0x4ce2ff,
    moteHex: 0x76e8ff,
    fogDensityBoost: 0.00062,
    blendWeight: 0.62,
    hazardNote: 'Harsh storm pressure · HP slowly drains in open air',
  },
  {
    level: 6,
    realmName: 'Dou Wang',
    envName: 'Thunderhead Peaks',
    severity: 'harsh',
    hpDrainPerSec: 1.9,
    skyHex: 0x2d4469,
    fogHex: 0x3c587a,
    sunHex: 0x94c4ff,
    hemiSkyHex: 0x6e98d6,
    hemiGroundHex: 0x222c42,
    rimHex: 0x58c8ff,
    moteHex: 0x8cd9ff,
    fogDensityBoost: 0.00075,
    blendWeight: 0.68,
    hazardNote: 'Crackling tempest zone · Slay foes or shelter at Shrines',
  },
  {
    level: 7,
    realmName: 'Dou Huang',
    envName: 'Scorching Magma Mist',
    severity: 'extreme',
    hpDrainPerSec: 2.35,
    skyHex: 0x6e2829,
    fogHex: 0x853830,
    sunHex: 0xff8954,
    hemiSkyHex: 0xd96c52,
    hemiGroundHex: 0x3a1c19,
    rimHex: 0xff5a36,
    moteHex: 0xff8a4d,
    fogDensityBoost: 0.00088,
    blendWeight: 0.74,
    hazardNote: 'Extreme volcanic haze · Rapid environmental vitality drain',
  },
  {
    level: 8,
    realmName: 'Dou Zong',
    envName: 'Blood-Moon Caldera',
    severity: 'extreme',
    hpDrainPerSec: 2.8,
    skyHex: 0x591e2f,
    fogHex: 0x722b3e,
    sunHex: 0xff7070,
    hemiSkyHex: 0xc45873,
    hemiGroundHex: 0x2f1522,
    rimHex: 0xff4d7a,
    moteHex: 0xff7c9a,
    fogDensityBoost: 0.00095,
    blendWeight: 0.78,
    hazardNote: 'Crimson eclipse aura · Soul Hall ambushes intensify',
  },
  {
    level: 9,
    realmName: 'Dou Zun',
    envName: 'Nether Frost Abyss',
    severity: 'extreme',
    hpDrainPerSec: 3.25,
    skyHex: 0x24264f,
    fogHex: 0x34386b,
    sunHex: 0xa2b4ff,
    hemiSkyHex: 0x717ed6,
    hemiGroundHex: 0x181b34,
    rimHex: 0x7f8cff,
    moteHex: 0xaab4ff,
    fogDensityBoost: 0.00105,
    blendWeight: 0.82,
    hazardNote: 'Biting abyssal frost · Sustained vitality drain',
  },
  {
    level: 10,
    realmName: 'Ban Sheng',
    envName: 'Soul Eclipse Expanse',
    severity: 'tribulation',
    hpDrainPerSec: 3.7,
    skyHex: 0x2d1847,
    fogHex: 0x422462,
    sunHex: 0xd99cff,
    hemiSkyHex: 0xa56be6,
    hemiGroundHex: 0x1d112d,
    rimHex: 0xc86bff,
    moteHex: 0xdca0ff,
    fogDensityBoost: 0.00112,
    blendWeight: 0.85,
    hazardNote: 'Soul Eclipse Tribulation · Severe HP drain & Ghost Clan hunt',
  },
  {
    level: 11,
    realmName: 'Dou Sheng',
    envName: 'Astral Lightning Heavens',
    severity: 'tribulation',
    hpDrainPerSec: 4.1,
    skyHex: 0x3d2459,
    fogHex: 0x5b3b75,
    sunHex: 0xffd27a,
    hemiSkyHex: 0xd29bff,
    hemiGroundHex: 0x2a1b3a,
    rimHex: 0xffd460,
    moteHex: 0xffe48c,
    fogDensityBoost: 0.00105,
    blendWeight: 0.84,
    hazardNote: 'Heavenly Tribulation lightning · Fight to siphon essence',
  },
  {
    level: 12,
    realmName: 'Dou Di',
    envName: 'Sovereign Golden Heavens',
    severity: 'tribulation',
    hpDrainPerSec: 4.4,
    skyHex: 0x5c3c24,
    fogHex: 0x876037,
    sunHex: 0xfff0b0,
    hemiSkyHex: 0xffd785,
    hemiGroundHex: 0x362417,
    rimHex: 0xffe066,
    moteHex: 0xfff1a8,
    fogDensityBoost: 0.00085,
    blendWeight: 0.8,
    hazardNote: 'Imperial Heavenly Pressure · Only a Dou Di endures',
  },
];

export function getLevelEnvironment(level: number): RealmEnvironmentProfile {
  const idx = Math.max(0, Math.min(LEVEL_ENVIRONMENTS.length - 1, level - 1));
  return LEVEL_ENVIRONMENTS[idx];
}

export const MAGIC_TIERS: MagicTierInfo[] = [
  {
    level: 1,
    realmName: 'Dou Zhi Qi',
    magicTitle: 'Primal Qi Awakening',
    primarySpell: 'Jade Qi Bolt',
    shockwaveSpell: 'Coil Shockwave',
    dashSkillName: 'Fang Lunge',
    ultimateSkillName: 'Ember Lotus Burst',
    manaColorHex: 0x3de095,
    boltCount: 1,
    boltSpreadRad: 0,
    boltDamage: 16,
    boltSpeed: 32,
    boltCooldown: 0.42,
    boltHoming: true,
    shockwaveDamage: 24,
    shockwaveRadius: 7.0,
    shockwaveCooldown: 3.8,
    dashDamage: 32,
    dashCooldown: 4.8,
    dashQiCost: 22,
    ultimateDamage: 62,
    ultimateRadius: 13.5,
    ultimateCooldown: 11.5,
    ultimateQiCost: 55,
    breaksBoulders: false,
    auraOrbs: 1,
    maxHp: 100,
    maxQi: 100,
  },
  {
    level: 2,
    realmName: 'Dou Zhe',
    magicTitle: 'Foothill Flame Qi',
    primarySpell: 'Venom Flame Lance',
    shockwaveSpell: 'Scale Repulse',
    dashSkillName: 'Viper Flash Dash',
    ultimateSkillName: 'Jade Flame Lotus',
    manaColorHex: 0x3ef0a0,
    boltCount: 1,
    boltSpreadRad: 0,
    boltDamage: 20,
    boltSpeed: 35,
    boltCooldown: 0.4,
    boltHoming: true,
    shockwaveDamage: 30,
    shockwaveRadius: 8.0,
    shockwaveCooldown: 3.6,
    dashDamage: 40,
    dashCooldown: 4.5,
    dashQiCost: 22,
    ultimateDamage: 78,
    ultimateRadius: 15.0,
    ultimateCooldown: 11.0,
    ultimateQiCost: 56,
    breaksBoulders: false,
    auraOrbs: 1,
    maxHp: 115,
    maxQi: 110,
  },
  {
    level: 3,
    realmName: 'Dou Shi',
    magicTitle: 'Dou Qi Armor',
    primarySpell: 'Emerald Fang Volley',
    shockwaveSpell: 'Spirit Ring Blast',
    dashSkillName: 'Octane Coil Strike',
    ultimateSkillName: 'Crimson Spark Lotus',
    manaColorHex: 0x34e8c4,
    boltCount: 2,
    boltSpreadRad: 0.13,
    boltDamage: 16,
    boltSpeed: 37,
    boltCooldown: 0.38,
    boltHoming: true,
    shockwaveDamage: 36,
    shockwaveRadius: 9.0,
    shockwaveCooldown: 3.4,
    dashDamage: 48,
    dashCooldown: 4.3,
    dashQiCost: 24,
    ultimateDamage: 94,
    ultimateRadius: 16.5,
    ultimateCooldown: 10.5,
    ultimateQiCost: 58,
    breaksBoulders: false,
    auraOrbs: 2,
    maxHp: 132,
    maxQi: 120,
  },
  {
    level: 4,
    realmName: 'Da Dou Shi',
    magicTitle: 'Obsidian Flame Arts',
    primarySpell: 'Obsidian Qi Darts',
    shockwaveSpell: 'Crest Flame Ring',
    dashSkillName: 'Eight-Extreme Lunge',
    ultimateSkillName: 'Purple Flame Lotus',
    manaColorHex: 0x34dcff,
    boltCount: 2,
    boltSpreadRad: 0.15,
    boltDamage: 20,
    boltSpeed: 39,
    boltCooldown: 0.36,
    boltHoming: true,
    shockwaveDamage: 42,
    shockwaveRadius: 10.0,
    shockwaveCooldown: 3.2,
    dashDamage: 56,
    dashCooldown: 4.1,
    dashQiCost: 24,
    ultimateDamage: 112,
    ultimateRadius: 17.5,
    ultimateCooldown: 10.0,
    ultimateQiCost: 60,
    breaksBoulders: true,
    auraOrbs: 2,
    maxHp: 150,
    maxQi: 132,
  },
  {
    level: 5,
    realmName: 'Dou Ling',
    magicTitle: 'Spirit Wyrm Arts',
    primarySpell: 'Twin Drake Spears',
    shockwaveSpell: 'Gale Flame Nova',
    dashSkillName: 'Thunder-Coil Dash',
    ultimateSkillName: 'Azure Heart Lotus',
    manaColorHex: 0x38f2d8,
    boltCount: 2,
    boltSpreadRad: 0.16,
    boltDamage: 24,
    boltSpeed: 41,
    boltCooldown: 0.35,
    boltHoming: true,
    shockwaveDamage: 48,
    shockwaveRadius: 11.2,
    shockwaveCooldown: 3.0,
    dashDamage: 66,
    dashCooldown: 3.9,
    dashQiCost: 25,
    ultimateDamage: 132,
    ultimateRadius: 19.0,
    ultimateCooldown: 9.6,
    ultimateQiCost: 62,
    breaksBoulders: true,
    auraOrbs: 3,
    maxHp: 170,
    maxQi: 145,
  },
  {
    level: 6,
    realmName: 'Dou Wang',
    magicTitle: 'Heavenly Winged Qi',
    primarySpell: 'Tempest Flame Spears',
    shockwaveSpell: 'Windstorm Nova',
    dashSkillName: 'Three-Thousand Flash',
    ultimateSkillName: 'Fallen Heart Lotus',
    manaColorHex: 0x5ae8ff,
    boltCount: 3,
    boltSpreadRad: 0.19,
    boltDamage: 21,
    boltSpeed: 43,
    boltCooldown: 0.34,
    boltHoming: true,
    shockwaveDamage: 56,
    shockwaveRadius: 12.2,
    shockwaveCooldown: 2.9,
    dashDamage: 76,
    dashCooldown: 3.7,
    dashQiCost: 26,
    ultimateDamage: 154,
    ultimateRadius: 20.5,
    ultimateCooldown: 9.2,
    ultimateQiCost: 64,
    breaksBoulders: true,
    auraOrbs: 3,
    maxHp: 190,
    maxQi: 160,
  },
  {
    level: 7,
    realmName: 'Dou Huang',
    magicTitle: 'Emperor Flame Domain',
    primarySpell: 'Tri-Flame Volley',
    shockwaveSpell: 'Emperor Shockwave',
    dashSkillName: 'Blazing Meteor Dash',
    ultimateSkillName: 'Dual-Flame Fury Lotus',
    manaColorHex: 0x7ef7ff,
    boltCount: 3,
    boltSpreadRad: 0.2,
    boltDamage: 25,
    boltSpeed: 45,
    boltCooldown: 0.32,
    boltHoming: true,
    shockwaveDamage: 64,
    shockwaveRadius: 13.5,
    shockwaveCooldown: 2.7,
    dashDamage: 88,
    dashCooldown: 3.5,
    dashQiCost: 26,
    ultimateDamage: 178,
    ultimateRadius: 22.0,
    ultimateCooldown: 8.8,
    ultimateQiCost: 68,
    breaksBoulders: true,
    auraOrbs: 4,
    maxHp: 212,
    maxQi: 175,
  },
  {
    level: 8,
    realmName: 'Dou Zong',
    magicTitle: 'Ancestor Spirit Seal',
    primarySpell: 'Runic Triad Lances',
    shockwaveSpell: 'Spatial Shatter Ring',
    dashSkillName: 'Void-Step Fang',
    ultimateSkillName: 'Tri-Flame Angry Lotus',
    manaColorHex: 0x8ef5c8,
    boltCount: 3,
    boltSpreadRad: 0.21,
    boltDamage: 29,
    boltSpeed: 47,
    boltCooldown: 0.31,
    boltHoming: true,
    shockwaveDamage: 72,
    shockwaveRadius: 14.5,
    shockwaveCooldown: 2.6,
    dashDamage: 100,
    dashCooldown: 3.4,
    dashQiCost: 28,
    ultimateDamage: 205,
    ultimateRadius: 23.5,
    ultimateCooldown: 8.4,
    ultimateQiCost: 70,
    breaksBoulders: true,
    auraOrbs: 4,
    maxHp: 235,
    maxQi: 190,
  },
  {
    level: 9,
    realmName: 'Dou Zun',
    magicTitle: 'Venerate Soul Fire',
    primarySpell: 'Solar Soul Lances',
    shockwaveSpell: 'Sunburst Shatter',
    dashSkillName: 'Sky-Rending Blitz',
    ultimateSkillName: 'Buddha Fury Flame Lotus',
    manaColorHex: 0xcff78e,
    boltCount: 4,
    boltSpreadRad: 0.24,
    boltDamage: 27,
    boltSpeed: 49,
    boltCooldown: 0.3,
    boltHoming: true,
    shockwaveDamage: 82,
    shockwaveRadius: 15.8,
    shockwaveCooldown: 2.4,
    dashDamage: 114,
    dashCooldown: 3.2,
    dashQiCost: 28,
    ultimateDamage: 235,
    ultimateRadius: 25.0,
    ultimateCooldown: 8.0,
    ultimateQiCost: 74,
    breaksBoulders: true,
    auraOrbs: 5,
    maxHp: 258,
    maxQi: 208,
  },
  {
    level: 10,
    realmName: 'Ban Sheng',
    magicTitle: 'Half-Saint Astral Qi',
    primarySpell: 'Astral Flame Barrage',
    shockwaveSpell: 'Starfall Cataclysm',
    dashSkillName: 'Astral Phantom Rush',
    ultimateSkillName: 'Destruction Fire Lotus',
    manaColorHex: 0xffe066,
    boltCount: 4,
    boltSpreadRad: 0.26,
    boltDamage: 32,
    boltSpeed: 51,
    boltCooldown: 0.29,
    boltHoming: true,
    shockwaveDamage: 92,
    shockwaveRadius: 17.0,
    shockwaveCooldown: 2.3,
    dashDamage: 128,
    dashCooldown: 3.0,
    dashQiCost: 30,
    ultimateDamage: 270,
    ultimateRadius: 26.5,
    ultimateCooldown: 7.6,
    ultimateQiCost: 78,
    breaksBoulders: true,
    auraOrbs: 5,
    maxHp: 280,
    maxQi: 225,
  },
  {
    level: 11,
    realmName: 'Dou Sheng',
    magicTitle: 'Saint Sovereign Flame',
    primarySpell: 'Saint Golden Barrage',
    shockwaveSpell: 'Radiant Cataclysm',
    dashSkillName: 'Heavenly Flash Cleave',
    ultimateSkillName: 'Purifying Demon Lotus',
    manaColorHex: 0xffd24d,
    boltCount: 5,
    boltSpreadRad: 0.28,
    boltDamage: 32,
    boltSpeed: 53,
    boltCooldown: 0.27,
    boltHoming: true,
    shockwaveDamage: 104,
    shockwaveRadius: 18.2,
    shockwaveCooldown: 2.1,
    dashDamage: 145,
    dashCooldown: 2.8,
    dashQiCost: 30,
    ultimateDamage: 310,
    ultimateRadius: 28.0,
    ultimateCooldown: 7.2,
    ultimateQiCost: 82,
    breaksBoulders: true,
    auraOrbs: 6,
    maxHp: 300,
    maxQi: 242,
  },
  {
    level: 12,
    realmName: 'Dou Di',
    magicTitle: 'Flame Emperor Sovereign',
    primarySpell: 'Emperor Flame Volley',
    shockwaveSpell: 'Heaven-Splitting Wave',
    dashSkillName: 'Dou Di Void Flash',
    ultimateSkillName: 'Emperor Heavenly Lotus',
    manaColorHex: 0xfff08a,
    boltCount: 5,
    boltSpreadRad: 0.32,
    boltDamage: 38,
    boltSpeed: 56,
    boltCooldown: 0.25,
    boltHoming: true,
    shockwaveDamage: 120,
    shockwaveRadius: 20.0,
    shockwaveCooldown: 1.9,
    dashDamage: 168,
    dashCooldown: 2.6,
    dashQiCost: 32,
    ultimateDamage: 360,
    ultimateRadius: 30.0,
    ultimateCooldown: 6.8,
    ultimateQiCost: 85,
    breaksBoulders: true,
    auraOrbs: 6,
    maxHp: 325,
    maxQi: 260,
  },
];

export function getMagicTierForLevel(level: number): MagicTierInfo {
  const idx = Math.max(0, Math.min(MAGIC_TIERS.length - 1, level - 1));
  return MAGIC_TIERS[idx];
}

export const EVOLUTION_TRAIT_LABELS: Record<number, string> = {
  1: 'Hatchling coils adapted to alpine valleys',
  2: 'Tempered foothill scales and faster reflexes',
  3: 'Heavy mountain musculature for steep ascents',
  4: 'Swept obsidian horns and gilded brow crest',
  5: 'Clawed forelimbs emerging from serpent coils',
  6: 'Golden drake pinions catching mountain updrafts',
  7: 'Full cloud wings and high-altitude solar halo',
  8: 'Upright torso awakening with human arms',
  9: 'Sun-armored Mountain Naga sage posture',
  10: 'Human visage, flowing cloak, and emerging stride',
  11: 'Full bipedal stride with fading spirit ribbon',
  12: 'Complete Human form — serpent scales shed forever',
};

/**
 * 12-stage hard-earned mountain evolution ladder from tiny Hatchling Serpent to Ascended Human.
 * Requires BOTH steep Essence XP totals and conquering Peak Trial Shrines across the continent.
 */
export const EVOLUTION_STAGES: EvolutionStage[] = [
  {
    level: 1,
    title: 'Valley Hatchling',
    subtitle: 'A tiny serpent crawling beneath towering alpine pines.',
    xpRequired: 0,
    shrinesRequired: 0,
    serpentScale: 0.72,
    hornScale: 0.45,
    wingBlend: 0,
    nagaTorsoBlend: 0,
    humanFaceBlend: 0,
    legsBlend: 0,
    tailOpacity: 1.0,
    auraIntensity: 0,
    scaleColorHex: 0x1bb373,
    speedBonus: 1.0,
    staminaBonus: 1.0,
  },
  {
    level: 2,
    title: 'Foothill Viper',
    subtitle: 'Hardened emerald scales and sharper mountain reflexes.',
    xpRequired: 400,
    shrinesRequired: 1,
    serpentScale: 0.8,
    hornScale: 0.65,
    wingBlend: 0,
    nagaTorsoBlend: 0,
    humanFaceBlend: 0,
    legsBlend: 0,
    tailOpacity: 1.0,
    auraIntensity: 0,
    scaleColorHex: 0x20bf7c,
    speedBonus: 1.03,
    staminaBonus: 1.04,
  },
  {
    level: 3,
    title: 'Ridge Python',
    subtitle: 'Thick coiled muscle built to scale steep granite ridges.',
    xpRequired: 1050,
    shrinesRequired: 2,
    serpentScale: 0.88,
    hornScale: 0.85,
    wingBlend: 0,
    nagaTorsoBlend: 0,
    humanFaceBlend: 0,
    legsBlend: 0,
    tailOpacity: 1.0,
    auraIntensity: 0,
    scaleColorHex: 0x22a882,
    speedBonus: 1.06,
    staminaBonus: 1.08,
  },
  {
    level: 4,
    title: 'Horned Adder',
    subtitle: 'Swept obsidian horns and a gilded crest crown your brow.',
    xpRequired: 2050,
    shrinesRequired: 3,
    serpentScale: 0.94,
    hornScale: 1.25,
    wingBlend: 0,
    nagaTorsoBlend: 0,
    humanFaceBlend: 0,
    legsBlend: 0,
    tailOpacity: 1.0,
    auraIntensity: 0.15,
    scaleColorHex: 0x1e9b8a,
    speedBonus: 1.09,
    staminaBonus: 1.12,
  },
  {
    level: 5,
    title: 'Highland Wyrm',
    subtitle: 'Clawed forelimbs break free from the ancient coils.',
    xpRequired: 3500,
    shrinesRequired: 4,
    serpentScale: 1.0,
    hornScale: 1.45,
    wingBlend: 0,
    nagaTorsoBlend: 0.35,
    humanFaceBlend: 0,
    legsBlend: 0,
    tailOpacity: 1.0,
    auraIntensity: 0.25,
    scaleColorHex: 0x269c94,
    speedBonus: 1.12,
    staminaBonus: 1.16,
  },
  {
    level: 6,
    title: 'Cliffside Drake',
    subtitle: 'Golden energy wings unfurl along the roaring wind.',
    xpRequired: 5450,
    shrinesRequired: 5,
    serpentScale: 1.02,
    hornScale: 1.6,
    wingBlend: 0.68,
    nagaTorsoBlend: 0.45,
    humanFaceBlend: 0,
    legsBlend: 0,
    tailOpacity: 1.0,
    auraIntensity: 0.4,
    scaleColorHex: 0x2f9b9f,
    speedBonus: 1.15,
    staminaBonus: 1.2,
  },
  {
    level: 7,
    title: 'Cloud Serpent',
    subtitle: 'Full drake pinions and a luminous high-altitude halo.',
    xpRequired: 8000,
    shrinesRequired: 6,
    serpentScale: 1.04,
    hornScale: 1.5,
    wingBlend: 1.0,
    nagaTorsoBlend: 0.55,
    humanFaceBlend: 0,
    legsBlend: 0,
    tailOpacity: 1.0,
    auraIntensity: 0.6,
    scaleColorHex: 0x3da8a6,
    speedBonus: 1.17,
    staminaBonus: 1.24,
  },
  {
    level: 8,
    title: 'Naga Initiate',
    subtitle: 'Your upper torso rises upright—human arms awaken!',
    xpRequired: 11250,
    shrinesRequired: 7,
    serpentScale: 0.96,
    hornScale: 1.0,
    wingBlend: 0.5,
    nagaTorsoBlend: 0.85,
    humanFaceBlend: 0.35,
    legsBlend: 0,
    tailOpacity: 1.0,
    auraIntensity: 0.72,
    scaleColorHex: 0x4db59a,
    speedBonus: 1.19,
    staminaBonus: 1.28,
  },
  {
    level: 9,
    title: 'Mountain Naga',
    subtitle: 'A sculpted sun-armored sage riding mighty serpent coils.',
    xpRequired: 15300,
    shrinesRequired: 8,
    serpentScale: 0.9,
    hornScale: 0.55,
    wingBlend: 0.2,
    nagaTorsoBlend: 1.0,
    humanFaceBlend: 0.72,
    legsBlend: 0,
    tailOpacity: 0.92,
    auraIntensity: 0.82,
    scaleColorHex: 0x62c29b,
    speedBonus: 1.21,
    staminaBonus: 1.32,
  },
  {
    level: 10,
    title: 'Half-Human Mystic',
    subtitle: 'A human face and flowing cloak emerge above fading scales.',
    xpRequired: 20300,
    shrinesRequired: 9,
    serpentScale: 0.75,
    hornScale: 0,
    wingBlend: 0,
    nagaTorsoBlend: 1.0,
    humanFaceBlend: 1.0,
    legsBlend: 0.55,
    tailOpacity: 0.62,
    auraIntensity: 0.9,
    scaleColorHex: 0x7fd4ad,
    speedBonus: 1.24,
    staminaBonus: 1.36,
  },
  {
    level: 11,
    title: 'Almost Human',
    subtitle: 'Bipedal strides across the peaks—only a spirit ribbon trails.',
    xpRequired: 26500,
    shrinesRequired: 11,
    serpentScale: 0.55,
    hornScale: 0,
    wingBlend: 0,
    nagaTorsoBlend: 1.0,
    humanFaceBlend: 1.0,
    legsBlend: 1.0,
    tailOpacity: 0.28,
    auraIntensity: 0.95,
    scaleColorHex: 0x99e8c8,
    speedBonus: 1.26,
    staminaBonus: 1.4,
  },
  {
    level: 12,
    title: 'Ascended Human',
    subtitle: 'The long mountain trial is complete. You walk as a Human.',
    xpRequired: 34000,
    shrinesRequired: 12,
    serpentScale: 0,
    hornScale: 0,
    wingBlend: 0,
    nagaTorsoBlend: 1.0,
    humanFaceBlend: 1.0,
    legsBlend: 1.0,
    tailOpacity: 0.0,
    auraIntensity: 1.0,
    scaleColorHex: 0xf2c14e,
    speedBonus: 1.3,
    staminaBonus: 1.48,
  },
];

export function getStageForLevel(level: number): EvolutionStage {
  const idx = Math.max(0, Math.min(EVOLUTION_STAGES.length - 1, level - 1));
  return EVOLUTION_STAGES[idx];
}

export function getNextStage(level: number): EvolutionStage | null {
  if (level >= MAX_EVOLUTION_LEVEL) return null;
  return EVOLUTION_STAGES[level];
}

export function computeEvolutionLevel(xp: number, shrinesVisited: number): number {
  let lvl = 1;
  for (let i = 1; i < EVOLUTION_STAGES.length; i++) {
    const st = EVOLUTION_STAGES[i];
    if (xp >= st.xpRequired && shrinesVisited >= st.shrinesRequired) {
      lvl = st.level;
    } else {
      break;
    }
  }
  return lvl;
}

export function computeHumanityMetrics(
  level: number,
  visitedCount: number,
  totalLandmarks: number,
): HumanityPathMetrics {
  const stage = getStageForLevel(level);
  const clampedTotal = Math.max(1, totalLandmarks);
  const tierRatio = (stage.level - 1) / (MAX_EVOLUTION_LEVEL - 1);
  const postureRatio = stage.nagaTorsoBlend * 0.52 + stage.legsBlend * 0.48;
  const visageRatio = stage.humanFaceBlend;
  const shedRatio = 1 - stage.tailOpacity;
  const peakRatio = Math.min(1, visitedCount / clampedTotal);

  const humanityPercent =
    stage.level >= MAX_EVOLUTION_LEVEL
      ? 100
      : Math.round(
          (tierRatio * 0.55 + postureRatio * 0.2 + visageRatio * 0.12 + shedRatio * 0.13) * 100,
        );

  let phaseLabel = 'Primal Serpent';
  if (stage.level >= 12) phaseLabel = 'Ascended Human';
  else if (stage.level >= 10) phaseLabel = 'Human Awakening';
  else if (stage.level >= 8) phaseLabel = 'Naga Ascension';
  else if (stage.level >= 5) phaseLabel = 'Winged Wyrm';

  return {
    humanityPercent: Math.max(0, Math.min(100, humanityPercent)),
    posturePercent: Math.round(postureRatio * 100),
    visagePercent: Math.round(visageRatio * 100),
    shedPercent: Math.round(shedRatio * 100),
    peakMasteryPercent: Math.round(peakRatio * 100),
    speedGainPercent: Math.round((stage.speedBonus - 1) * 100),
    staminaGainPercent: Math.round((stage.staminaBonus - 1) * 100),
    phaseLabel,
    traitUnlocked: EVOLUTION_TRAIT_LABELS[stage.level] ?? stage.subtitle,
  };
}

export function createEmptyLifetimeStats(): JourneyLifetimeStats {
  return {
    distanceMeters: 0,
    timePlayedSeconds: 0,
    crystalsCollected: 0,
    goldenCrystalsCollected: 0,
    highestAltitudeMeters: 0,
    bestCombo: 0,
    crashesSurvived: 0,
    beastsDefeated: 0,
    ghostsDefeated: 0,
  };
}

export interface SavedJourneyData {
  xp: number;
  level: number;
  visitedLandmarkIds: string[];
  lastCheckpointId: string | null;
  hasAscended: boolean;
  stats: JourneyLifetimeStats;
  milestones: JourneyMilestone[];
  bestiary?: Partial<Record<BestiaryEntryId, BestiaryRecord>>;
}

const JOURNEY_STORAGE_KEY = 'serpent_peaks_ascension_journey_v1';

function sanitizeStats(raw: Partial<JourneyLifetimeStats> | undefined): JourneyLifetimeStats {
  const clean = createEmptyLifetimeStats();
  if (!raw || typeof raw !== 'object') return clean;
  if (typeof raw.distanceMeters === 'number' && Number.isFinite(raw.distanceMeters)) {
    clean.distanceMeters = Math.max(0, raw.distanceMeters);
  }
  if (typeof raw.timePlayedSeconds === 'number' && Number.isFinite(raw.timePlayedSeconds)) {
    clean.timePlayedSeconds = Math.max(0, raw.timePlayedSeconds);
  }
  if (typeof raw.crystalsCollected === 'number' && Number.isFinite(raw.crystalsCollected)) {
    clean.crystalsCollected = Math.max(0, Math.floor(raw.crystalsCollected));
  }
  if (typeof raw.goldenCrystalsCollected === 'number' && Number.isFinite(raw.goldenCrystalsCollected)) {
    clean.goldenCrystalsCollected = Math.max(0, Math.floor(raw.goldenCrystalsCollected));
  }
  if (typeof raw.highestAltitudeMeters === 'number' && Number.isFinite(raw.highestAltitudeMeters)) {
    clean.highestAltitudeMeters = Math.max(0, Math.floor(raw.highestAltitudeMeters));
  }
  if (typeof raw.bestCombo === 'number' && Number.isFinite(raw.bestCombo)) {
    clean.bestCombo = Math.max(0, Math.floor(raw.bestCombo));
  }
  if (typeof raw.crashesSurvived === 'number' && Number.isFinite(raw.crashesSurvived)) {
    clean.crashesSurvived = Math.max(0, Math.floor(raw.crashesSurvived));
  }
  if (typeof raw.beastsDefeated === 'number' && Number.isFinite(raw.beastsDefeated)) {
    clean.beastsDefeated = Math.max(0, Math.floor(raw.beastsDefeated));
  }
  if (typeof raw.ghostsDefeated === 'number' && Number.isFinite(raw.ghostsDefeated)) {
    clean.ghostsDefeated = Math.max(0, Math.floor(raw.ghostsDefeated));
  }
  return clean;
}

function sanitizeMilestones(raw: unknown): JourneyMilestone[] {
  if (!Array.isArray(raw)) return [];
  const validKinds = new Set<MilestoneKind>(['evolution', 'peak', 'feat']);
  const out: JourneyMilestone[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const m = item as Partial<JourneyMilestone>;
    if (typeof m.id !== 'string' || typeof m.title !== 'string' || typeof m.detail !== 'string') continue;
    const kind: MilestoneKind = m.kind && validKinds.has(m.kind) ? m.kind : 'feat';
    out.push({
      id: m.id,
      kind,
      title: m.title,
      detail: m.detail,
      level: typeof m.level === 'number' && Number.isFinite(m.level) ? m.level : 1,
      altitudeMeters:
        typeof m.altitudeMeters === 'number' && Number.isFinite(m.altitudeMeters)
          ? Math.max(0, Math.round(m.altitudeMeters))
          : 0,
      elapsedSeconds:
        typeof m.elapsedSeconds === 'number' && Number.isFinite(m.elapsedSeconds)
          ? Math.max(0, Math.round(m.elapsedSeconds))
          : 0,
      recordedAt: typeof m.recordedAt === 'number' && Number.isFinite(m.recordedAt) ? m.recordedAt : Date.now(),
    });
  }
  return out.slice(-48);
}

export function loadJourneyProgress(): SavedJourneyData {
  try {
    const raw = localStorage.getItem(JOURNEY_STORAGE_KEY);
    if (!raw) {
      return {
        xp: 0,
        level: 1,
        visitedLandmarkIds: [],
        lastCheckpointId: null,
        hasAscended: false,
        stats: createEmptyLifetimeStats(),
        milestones: [],
        bestiary: {},
      };
    }
    const parsed = JSON.parse(raw) as Partial<SavedJourneyData>;
    const xp = typeof parsed.xp === 'number' && Number.isFinite(parsed.xp) ? Math.max(0, Math.floor(parsed.xp)) : 0;
    const visitedLandmarkIds = Array.isArray(parsed.visitedLandmarkIds)
      ? parsed.visitedLandmarkIds.filter((s): s is string => typeof s === 'string')
      : [];
    const computedLevel = computeEvolutionLevel(xp, visitedLandmarkIds.length);
    const level = Math.max(
      1,
      Math.min(
        MAX_EVOLUTION_LEVEL,
        typeof parsed.level === 'number' ? Math.max(computedLevel, parsed.level) : computedLevel,
      ),
    );
    return {
      xp,
      level,
      visitedLandmarkIds,
      lastCheckpointId: typeof parsed.lastCheckpointId === 'string' ? parsed.lastCheckpointId : null,
      hasAscended: Boolean(parsed.hasAscended || level >= MAX_EVOLUTION_LEVEL),
      stats: sanitizeStats(parsed.stats),
      milestones: sanitizeMilestones(parsed.milestones),
      bestiary: sanitizeBestiaryRecords(parsed.bestiary),
    };
  } catch {
    return {
      xp: 0,
      level: 1,
      visitedLandmarkIds: [],
      lastCheckpointId: null,
      hasAscended: false,
      stats: createEmptyLifetimeStats(),
      milestones: [],
      bestiary: {},
    };
  }
}

export function saveJourneyProgress(data: SavedJourneyData): void {
  try {
    localStorage.setItem(JOURNEY_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore storage quota errors
  }
}

export function clearJourneyProgress(): void {
  try {
    localStorage.removeItem(JOURNEY_STORAGE_KEY);
  } catch {
    // ignore
  }
}
