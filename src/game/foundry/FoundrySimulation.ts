import { GameplayEventBus } from '../core/EventBus.ts';

export const FOUNDRY_STORAGE_KEY = 'SERPENT_PEAKS_FOUNDRY_V1';
export const FOUNDRY_FIXED_DT = 1 / 60;

// World placement of The Forgotten Soul Foundry complex (western mountain basin)
export const FOUNDRY_WORLD_ORIGIN = {
  x: -148,
  z: 118,
  radius: 68,
} as const;

export type MovementFsmState =
  | 'IDLE'
  | 'MOVE'
  | 'SPRINT'
  | 'JUMPING'
  | 'DODGING'
  | 'WALL_RUN'
  | 'LANDING';

export type AttackPhase = 'IDLE' | 'STARTUP' | 'ACTIVE' | 'RECOVERY';
export type AttackKind = 'none' | 'light' | 'heavy' | 'dash_strike' | 'finisher';

export type SoulDisciplineId = 'soulblade' | 'soulguard' | 'soulshade' | 'soulweaver';

export type SoulClanRank =
  | 'Initiate'
  | 'Awakened'
  | 'Soul Adept'
  | 'Soul Knight'
  | 'Soul Ascendant';

export interface SoulDisciplineSpec {
  id: SoulDisciplineId;
  name: string;
  role: string;
  accent: string;
  seCost: number;
  cooldownSec: number;
  summary: string;
}

export const SOUL_DISCIPLINES: Record<SoulDisciplineId, SoulDisciplineSpec> = {
  soulblade: {
    id: 'soulblade',
    name: 'Soulblade',
    role: 'Offensive Discipline',
    accent: '#fb7185',
    seCost: 24,
    cooldownSec: 4.5,
    summary: 'Projects rapid energy-infused slashes and multi-hit dash combos.',
  },
  soulguard: {
    id: 'soulguard',
    name: 'Soulguard',
    role: 'Defensive Discipline',
    accent: '#38bdf8',
    seCost: 20,
    cooldownSec: 5.5,
    summary: 'Raises a resonant Soul Aegis with widened perfect-parry and damage reflection.',
  },
  soulshade: {
    id: 'soulshade',
    name: 'Soulshade',
    role: 'Mobility Discipline',
    accent: '#a855f7',
    seCost: 22,
    cooldownSec: 4.0,
    summary: 'Blinks through barriers with shadow clones and backstab crit bonuses.',
  },
  soulweaver: {
    id: 'soulweaver',
    name: 'Soulweaver',
    role: 'Control Discipline',
    accent: '#3de095',
    seCost: 28,
    cooldownSec: 6.5,
    summary: 'Binds enemies in soul energy chains, pulling them into environmental traps.',
  },
};

export interface DualDisciplineSynergy {
  pair: [SoulDisciplineId, SoulDisciplineId];
  name: string;
  effect: string;
}

export const SOUL_SYNERGIES: DualDisciplineSynergy[] = [
  {
    pair: ['soulblade', 'soulshade'],
    name: 'Phantom Cleave',
    effect: 'Blink behind target and unleash a +35% crit Soulblade flurry.',
  },
  {
    pair: ['soulguard', 'soulweaver'],
    name: 'Aegis Snare',
    effect: 'Perfect Parry automatically chains the attacker for 2.2s.',
  },
  {
    pair: ['soulblade', 'soulweaver'],
    name: 'Vortex Guillotine',
    effect: 'Pull nearby foes into one zone and cleave across rotating traps.',
  },
  {
    pair: ['soulguard', 'soulshade'],
    name: 'Mirage Counter',
    effect: 'Leaves a reflective decoy on dodge that restores +14 SE when struck.',
  },
];

export function resolveActiveSynergy(
  primary: SoulDisciplineId,
  secondary: SoulDisciplineId | null,
): DualDisciplineSynergy | null {
  if (!secondary || primary === secondary) return null;
  for (const syn of SOUL_SYNERGIES) {
    if (
      (syn.pair[0] === primary && syn.pair[1] === secondary) ||
      (syn.pair[1] === primary && syn.pair[0] === secondary)
    ) {
      return syn;
    }
  }
  return null;
}

export function deriveSoulClanRank(masteryPoints: number, bossDefeated: boolean): SoulClanRank {
  if (bossDefeated && masteryPoints >= 220) return 'Soul Ascendant';
  if (masteryPoints >= 160) return 'Soul Knight';
  if (masteryPoints >= 95) return 'Soul Adept';
  if (masteryPoints >= 35) return 'Awakened';
  return 'Initiate';
}

export interface AttackFrameSpec {
  kind: Exclude<AttackKind, 'none'>;
  startupSec: number;
  activeSec: number;
  recoverySec: number;
  staminaCost: number;
  damage: number;
  range: number;
  seGainOnHit: number;
  dodgeCancelableInRecovery: boolean;
}

export const ATTACK_SPECS: Record<Exclude<AttackKind, 'none'>, AttackFrameSpec> = {
  light: {
    kind: 'light',
    startupSec: 0.14,
    activeSec: 0.14,
    recoverySec: 0.24,
    staminaCost: 12,
    damage: 24,
    range: 7.2,
    seGainOnHit: 8,
    dodgeCancelableInRecovery: true,
  },
  heavy: {
    kind: 'heavy',
    startupSec: 0.42,
    activeSec: 0.18,
    recoverySec: 0.58,
    staminaCost: 28,
    damage: 58,
    range: 8.6,
    seGainOnHit: 16,
    dodgeCancelableInRecovery: false,
  },
  dash_strike: {
    kind: 'dash_strike',
    startupSec: 0.16,
    activeSec: 0.2,
    recoverySec: 0.34,
    staminaCost: 22,
    damage: 38,
    range: 9.8,
    seGainOnHit: 12,
    dodgeCancelableInRecovery: true,
  },
  finisher: {
    kind: 'finisher',
    startupSec: 0.22,
    activeSec: 0.24,
    recoverySec: 0.42,
    staminaCost: 18,
    damage: 96,
    range: 8.4,
    seGainOnHit: 24,
    dodgeCancelableInRecovery: false,
  },
};

// ── Engineering Trap Definitions ────────────────────────────────────────────

export interface RotatingBladeTrap {
  id: string;
  label: string;
  localX: number;
  localZ: number;
  radius: number;
  angleRad: number;
  initialAngleRad: number;
  baseAngularVel: number; // rad/s (signed for direction)
  currentAngularVel: number;
  driveShaftHp: number;
  driveShaftMaxHp: number;
  driveShaftDamaged: boolean;
  damagePerHit: number;
  hitCooldownByActor: Record<string, number>;
}

export interface PressurePlateMechanism {
  id: string;
  label: string;
  localX: number;
  localZ: number;
  radius: number;
  forceThreshold: number;
  currentForce: number;
  active: boolean;
  linkedAction: 'open_hydraulic_gate' | 'surge_conduit';
}

export interface HydraulicSystemState {
  valveOpenRatio: number; // 0..1
  pipeArea: number; // m^2
  fluidVelocity: number; // m/s
  flowRateQ: number; // Q = A * v
  pressureP: number; // kPa
  pistonAreaA: number; // m^2
  pistonForceF: number; // F = P * A
  tankALevel: number; // 0..100
  tankBLevel: number; // 0..100
  bridgeRaised: boolean; // raised when |tankA - tankB| <= 12 && tankB >= 42
}

export interface GearPuzzleState {
  driveRpm: number; // fixed input drive ω1
  gear1Radius: number; // r1 (selectable: 1, 2, 3)
  gear2Radius: number; // r2 (selectable: 1, 2, 3)
  gear3Radius: number; // r3 (selectable: 2, 3, 4)
  reverseIdlerEngaged: boolean; // flips final output direction
  targetOutputRpm: number; // e.g. -18 RPM
  torqueLimit: number; // max safe torque
  computedOutputRpm: number;
  computedTorqueLoad: number;
  overTorqued: boolean;
  solved: boolean;
}

export interface EnergyRoutingPuzzleState {
  sourceVoltage: number; // V = 24V
  switchA: boolean; // routes Core -> Node 1
  switchB: boolean; // routes Node 1 -> Node 2 (Receiver 1 + 2)
  switchC: boolean; // shortcut bypass -> Overloaded Conduit (low resistance!)
  proximitySensor: boolean; // player near Foundry Forge Gate
  pressureSensor: boolean; // pressure plate pressed
  energyThreshold: number; // minimum energy units required
  deliveredEnergy: number;
  currentAmps: number; // I = V / R
  overloaded: boolean;
  receiversPowered: number; // 0..2
  gateUnlocked: boolean; // IF proximity && pressure && energy >= threshold
  solved: boolean;
}

export type FoundryEnemyRole = 'soul_guardian' | 'soul_engineer';
export type FoundryEnemyAiState =
  | 'IDLE'
  | 'PATROL'
  | 'BLOCKING'
  | 'WINDUP'
  | 'STRIKE'
  | 'TRIGGER_TRAP'
  | 'STAGGERED'
  | 'DEFEATED';

export interface FoundryEnemy {
  id: string;
  name: string;
  role: FoundryEnemyRole;
  localX: number;
  localZ: number;
  hp: number;
  maxHp: number;
  posture: number;
  maxPosture: number;
  state: FoundryEnemyAiState;
  stateTimer: number;
  chainedTimer: number;
  targetPlateId?: string;
}

export type ColossusBossState =
  | 'DORMANT'
  | 'SWEEP_WINDUP'
  | 'SHOCKWAVE'
  | 'SHIELDED_OVERLOAD'
  | 'OVERHEATED_VULNERABLE'
  | 'SOUL_FLURRY_WINDUP'
  | 'SOUL_FLURRY'
  | 'STAGGERED'
  | 'DEFEATED';

export interface SoulboundColossusState {
  id: string;
  name: string;
  localX: number;
  localZ: number;
  hp: number;
  maxHp: number;
  phase: 1 | 2 | 3;
  phase2Triggered: boolean;
  phase3Triggered: boolean;
  armorAngleRad: number;
  shieldActive: boolean;
  overheatTimer: number;
  state: ColossusBossState;
  stateTimer: number;
  activeShockwaveRadius: number;
  defeated: boolean;
}

export interface PlayerCombatResources {
  hp: number;
  maxHp: number;
  sp: number; // Stamina
  maxSp: number;
  se: number; // Soul Energy (never negative)
  maxSe: number;
  movementState: MovementFsmState;
  attackKind: AttackKind;
  attackPhase: AttackPhase;
  attackPhaseTimer: number;
  hitRegisteredIds: string[];
  dodgeTimer: number;
  parryWindowTimer: number;
  blocking: boolean;
  aegisShieldTimer: number;
  disciplineCooldowns: Record<SoulDisciplineId, number>;
  primaryDiscipline: SoulDisciplineId;
  secondaryDiscipline: SoulDisciplineId | null;
  masteryPoints: number;
  rank: SoulClanRank;
  comboCount: number;
}

export interface FoundryPersistedState {
  version: 1;
  gearSolved: boolean;
  energySolved: boolean;
  bridgeRaised: boolean;
  colossusDefeated: boolean;
  primaryDiscipline: SoulDisciplineId;
  secondaryDiscipline: SoulDisciplineId | null;
  masteryPoints: number;
}

export interface FoundrySimulationState {
  simTime: number;
  playerLocalX: number;
  playerLocalY: number;
  playerLocalZ: number;
  playerSpeed: number;
  playerVelY: number;
  playerAccel: number;
  playerCollisionRadius: number;
  landingTimer: number;
  wallRunTimer: number;
  wallRunUsedThisJump: boolean;
  resources: PlayerCombatResources;
  blades: RotatingBladeTrap[];
  plates: PressurePlateMechanism[];
  hydraulics: HydraulicSystemState;
  gearPuzzle: GearPuzzleState;
  energyPuzzle: EnergyRoutingPuzzleState;
  conduitActiveTimer: number;
  enemies: FoundryEnemy[];
  boss: SoulboundColossusState;
  eventLog: string[];
}

/**
 * Pure mechanical equation: ideal meshed gear train ω_out = (±) ω_1 * (r1 / r2) * (r2 / r3) = (±) ω_1 * (r1 / r3)
 * with torque load scaling inversely with speed ratio so extreme torque loads trip the safety limiter.
 */
export function evaluateGearTrain(puzzle: GearPuzzleState): GearPuzzleState {
  // Stage 1: ω2 = -ω1 * (r1 / r2), Stage 2: ω3 = -ω2 * (r2 / r3) = +ω1 * (r1 / r3)
  // Engaging the reverse idler gear flips the final direction to negative!
  const speedRatio = puzzle.gear1Radius / Math.max(1, puzzle.gear3Radius);
  const intermediateRatio = puzzle.gear1Radius / Math.max(1, puzzle.gear2Radius);
  const directionSign = puzzle.reverseIdlerEngaged ? -1 : 1;
  const computedOutputRpm = Math.round(puzzle.driveRpm * speedRatio * directionSign * 10) / 10;
  const computedTorqueLoad =
    Math.round((45 / Math.max(0.25, speedRatio) + intermediateRatio * 18) * 10) / 10;
  const overTorqued = computedTorqueLoad > puzzle.torqueLimit;
  const solved =
    !overTorqued && Math.abs(computedOutputRpm - puzzle.targetOutputRpm) <= 0.6;
  return {
    ...puzzle,
    computedOutputRpm,
    computedTorqueLoad,
    overTorqued,
    solved: puzzle.solved || solved,
  };
}

/**
 * Pure electrical & control-logic equation: V = I * R + automated IF/AND gate logic.
 */
export function evaluateEnergyRouting(puzzle: EnergyRoutingPuzzleState): EnergyRoutingPuzzleState {
  // Switch C shorts across a 0.8Ω fault conduit -> I = 24 / 0.8 = 30A > 16A overload breaker!
  let resistance = Infinity;
  let receiversPowered = 0;

  if (puzzle.switchA && puzzle.switchC) {
    resistance = 0.8; // short-circuit overload path
  } else if (puzzle.switchA && puzzle.switchB) {
    resistance = 2.4; // balanced dual-receiver circuit: I = 10A, 100 energy units
    receiversPowered = 2;
  } else if (puzzle.switchA) {
    resistance = 4.8; // single-node path: I = 5A, 50 energy units
    receiversPowered = 1;
  }

  const currentAmps = Number.isFinite(resistance)
    ? Math.round((puzzle.sourceVoltage / resistance) * 10) / 10
    : 0;
  const overloaded = currentAmps > 16;
  const deliveredEnergy = overloaded ? 0 : receiversPowered * 50;
  const circuitSolved = !overloaded && receiversPowered === 2;
  const gateUnlocked =
    puzzle.proximitySensor &&
    puzzle.pressureSensor &&
    deliveredEnergy >= puzzle.energyThreshold &&
    !overloaded;

  return {
    ...puzzle,
    currentAmps,
    overloaded,
    receiversPowered,
    deliveredEnergy,
    gateUnlocked,
    solved: puzzle.solved || circuitSolved,
  };
}

/**
 * Pure hydraulic equation: Q = A * v and F = P * A.
 */
export function stepHydraulicSystem(
  hyd: HydraulicSystemState,
  dt: number,
): HydraulicSystemState {
  const open = Math.max(0, Math.min(1, hyd.valveOpenRatio));
  const fluidVelocity = open * 3.6;
  const flowRateQ = Math.round(hyd.pipeArea * fluidVelocity * 100) / 100;
  const transfer = flowRateQ * 18 * dt;
  let tankA = hyd.tankALevel;
  let tankB = hyd.tankBLevel;

  if (open > 0.01 && tankA > tankB) {
    const moved = Math.min(transfer, (tankA - tankB) * 0.5);
    tankA -= moved;
    tankB += moved;
  } else if (open === 0 && tankB > 18 && !hyd.bridgeRaised) {
    // Gentle back-drain if left unbalanced before locking the bridge
    tankB = Math.max(18, tankB - 2.2 * dt);
    tankA = Math.min(92, tankA + 2.2 * dt);
  }

  const pressureP = Math.round((20 + tankB * 1.45) * 10) / 10;
  const pistonForceF = Math.round(pressureP * hyd.pistonAreaA * 10) / 10;
  const balanced = Math.abs(tankA - tankB) <= 12 && tankB >= 42;

  return {
    ...hyd,
    fluidVelocity: Math.round(fluidVelocity * 100) / 100,
    flowRateQ,
    pressureP,
    pistonForceF,
    tankALevel: tankA,
    tankBLevel: tankB,
    bridgeRaised: hyd.bridgeRaised || balanced,
  };
}

/**
 * Creates a clean initial deterministic state for The Forgotten Soul Foundry.
 */
export function createInitialFoundryState(
  persisted?: Partial<FoundryPersistedState>,
): FoundrySimulationState {
  const primaryDiscipline = persisted?.primaryDiscipline ?? 'soulblade';
  const secondaryDiscipline = persisted?.secondaryDiscipline ?? null;
  const masteryPoints = Math.max(0, Math.floor(persisted?.masteryPoints ?? 0));
  const colossusDefeated = Boolean(persisted?.colossusDefeated);

  const gearBase: GearPuzzleState = {
    driveRpm: 36,
    gear1Radius: 2,
    gear2Radius: 2,
    gear3Radius: 2, // default gives +36 RPM; solving sets r1=1, r3=2, reverse=true -> -18 RPM!
    reverseIdlerEngaged: false,
    targetOutputRpm: -18,
    torqueLimit: 120,
    computedOutputRpm: 36,
    computedTorqueLoad: 63,
    overTorqued: false,
    solved: Boolean(persisted?.gearSolved),
  };

  const energyBase: EnergyRoutingPuzzleState = {
    sourceVoltage: 24,
    switchA: false,
    switchB: false,
    switchC: false,
    proximitySensor: false,
    pressureSensor: false,
    energyThreshold: 80,
    deliveredEnergy: 0,
    currentAmps: 0,
    overloaded: false,
    receiversPowered: 0,
    gateUnlocked: false,
    solved: Boolean(persisted?.energySolved),
  };

  return {
    simTime: 0,
    playerLocalX: 0,
    playerLocalY: 0,
    playerLocalZ: -54,
    playerSpeed: 0,
    playerVelY: 0,
    playerAccel: 0,
    playerCollisionRadius: 1.8,
    landingTimer: 0,
    wallRunTimer: 0,
    wallRunUsedThisJump: false,
    resources: {
      hp: 100,
      maxHp: 100,
      sp: 100,
      maxSp: 100,
      se: 25,
      maxSe: 100,
      movementState: 'IDLE',
      attackKind: 'none',
      attackPhase: 'IDLE',
      attackPhaseTimer: 0,
      hitRegisteredIds: [],
      dodgeTimer: 0,
      parryWindowTimer: 0,
      blocking: false,
      aegisShieldTimer: 0,
      disciplineCooldowns: {
        soulblade: 0,
        soulguard: 0,
        soulshade: 0,
        soulweaver: 0,
      },
      primaryDiscipline,
      secondaryDiscipline,
      masteryPoints,
      rank: deriveSoulClanRank(masteryPoints, colossusDefeated),
      comboCount: 0,
    },
    blades: [
      {
        id: 'blade_alpha',
        label: 'Saw Assembly Alpha',
        localX: -14,
        localZ: -24,
        radius: 6.2,
        angleRad: 0,
        initialAngleRad: 0,
        baseAngularVel: 1.65,
        currentAngularVel: 1.65,
        driveShaftHp: 45,
        driveShaftMaxHp: 45,
        driveShaftDamaged: false,
        damagePerHit: 14,
        hitCooldownByActor: {},
      },
      {
        id: 'blade_beta',
        label: 'Saw Assembly Beta',
        localX: 0,
        localZ: -12,
        radius: 6.6,
        angleRad: 1.15,
        initialAngleRad: 1.15,
        baseAngularVel: -2.15,
        currentAngularVel: -2.15,
        driveShaftHp: 55,
        driveShaftMaxHp: 55,
        driveShaftDamaged: false,
        damagePerHit: 16,
        hitCooldownByActor: {},
      },
      {
        id: 'blade_gamma',
        label: 'Saw Assembly Gamma',
        localX: 14,
        localZ: -24,
        radius: 6.2,
        angleRad: 2.3,
        initialAngleRad: 2.3,
        baseAngularVel: 1.9,
        currentAngularVel: 1.9,
        driveShaftHp: 45,
        driveShaftMaxHp: 45,
        driveShaftDamaged: false,
        damagePerHit: 14,
        hitCooldownByActor: {},
      },
    ],
    plates: [
      {
        id: 'plate_gate',
        label: 'Forge Logic Pressure Plate',
        localX: -18,
        localZ: 4,
        radius: 4.5,
        forceThreshold: 80,
        currentForce: 0,
        active: false,
        linkedAction: 'open_hydraulic_gate',
      },
      {
        id: 'plate_conduit',
        label: 'Conduit Surge Plate',
        localX: 18,
        localZ: 4,
        radius: 4.5,
        forceThreshold: 80,
        currentForce: 0,
        active: false,
        linkedAction: 'surge_conduit',
      },
    ],
    hydraulics: {
      valveOpenRatio: persisted?.bridgeRaised ? 0.8 : 0,
      pipeArea: 0.45,
      fluidVelocity: 0,
      flowRateQ: 0,
      pressureP: 46,
      pistonAreaA: 1.8,
      pistonForceF: 82.8,
      tankALevel: persisted?.bridgeRaised ? 52 : 84,
      tankBLevel: persisted?.bridgeRaised ? 50 : 18,
      bridgeRaised: Boolean(persisted?.bridgeRaised),
    },
    gearPuzzle: evaluateGearTrain(gearBase),
    energyPuzzle: evaluateEnergyRouting(energyBase),
    conduitActiveTimer: 0,
    enemies: [
      {
        id: 'foundry_guardian',
        name: 'Soul Clan Shield-Warden',
        role: 'soul_guardian',
        localX: -12,
        localZ: 12,
        hp: 140,
        maxHp: 140,
        posture: 100,
        maxPosture: 100,
        state: 'PATROL',
        stateTimer: 0,
        chainedTimer: 0,
      },
      {
        id: 'foundry_engineer',
        name: 'Soul Clan Trap-Engineer',
        role: 'soul_engineer',
        localX: 14,
        localZ: 10,
        hp: 110,
        maxHp: 110,
        posture: 80,
        maxPosture: 80,
        state: 'PATROL',
        stateTimer: 0,
        chainedTimer: 0,
        targetPlateId: 'plate_conduit',
      },
    ],
    boss: {
      id: 'soulbound_colossus',
      name: 'The Soulbound Colossus',
      localX: 0,
      localZ: 34,
      hp: colossusDefeated ? 0 : 420,
      maxHp: 420,
      phase: colossusDefeated ? 3 : 1,
      phase2Triggered: colossusDefeated,
      phase3Triggered: colossusDefeated,
      armorAngleRad: 0,
      shieldActive: false,
      overheatTimer: 0,
      state: colossusDefeated ? 'DEFEATED' : 'DORMANT',
      stateTimer: 0,
      activeShockwaveRadius: 0,
      defeated: colossusDefeated,
    },
    eventLog: ['Entered Forgotten Soul Foundry simulation layer.'],
  };
}

export function exportFoundryPersistedState(
  state: FoundrySimulationState,
): FoundryPersistedState {
  return {
    version: 1,
    gearSolved: state.gearPuzzle.solved,
    energySolved: state.energyPuzzle.solved,
    bridgeRaised: state.hydraulics.bridgeRaised,
    colossusDefeated: state.boss.defeated,
    primaryDiscipline: state.resources.primaryDiscipline,
    secondaryDiscipline: state.resources.secondaryDiscipline,
    masteryPoints: state.resources.masteryPoints,
  };
}

function pushLog(state: FoundrySimulationState, line: string): void {
  state.eventLog.unshift(line);
  if (state.eventLog.length > 14) state.eventLog.length = 14;
}

/**
 * Adds or deducts Soul Energy while enforcing the invariant 0 <= SE <= maxSe.
 */
export function adjustSoulEnergy(state: FoundrySimulationState, delta: number): number {
  const next = Math.max(0, Math.min(state.resources.maxSe, state.resources.se + delta));
  state.resources.se = Math.round(next * 10) / 10;
  return state.resources.se;
}

/**
 * Initiates a player attack respecting STARTUP -> ACTIVE -> RECOVERY commitment rules.
 */
export function startPlayerAttack(
  state: FoundrySimulationState,
  kind: Exclude<AttackKind, 'none'>,
): boolean {
  const r = state.resources;
  if (r.attackPhase !== 'IDLE') return false;
  const spec = ATTACK_SPECS[kind];
  if (r.sp < spec.staminaCost) return false;
  r.sp = Math.max(0, r.sp - spec.staminaCost);
  r.attackKind = kind;
  r.attackPhase = 'STARTUP';
  r.attackPhaseTimer = spec.startupSec;
  r.hitRegisteredIds = [];
  r.blocking = false;
  return true;
}

/**
 * Engages or releases the player's defensive Block stance (reduces incoming damage by 60% while consuming SP).
 */
export function setPlayerBlocking(state: FoundrySimulationState, active: boolean): boolean {
  const r = state.resources;
  if (!active) {
    r.blocking = false;
    return false;
  }
  if (r.attackPhase !== 'IDLE' || r.dodgeTimer > 0 || r.sp < 6) {
    r.blocking = false;
    return false;
  }
  r.blocking = true;
  return true;
}

/**
 * Triggers a vertical Jump (or Wall-Jump when wall-running) governed by v = u + at and d = ut + ½at².
 */
export function triggerPlayerJump(state: FoundrySimulationState): boolean {
  const r = state.resources;
  const isGrounded = state.playerLocalY <= 0.05;
  const isWallRunning = state.wallRunTimer > 0;
  if (!isGrounded && !isWallRunning) return false;
  if (r.sp < 14) return false;
  if (r.attackPhase === 'STARTUP' || r.attackPhase === 'ACTIVE') return false;

  r.sp = Math.max(0, r.sp - 14);
  r.blocking = false;
  state.playerVelY = isWallRunning ? 10.2 : 11.4;
  state.playerLocalY = Math.max(state.playerLocalY, 0.08);
  state.wallRunTimer = 0;
  state.wallRunUsedThisJump = false;
  state.landingTimer = 0;
  r.movementState = 'JUMPING';
  return true;
}

function applyMitigatedPlayerDamage(state: FoundrySimulationState, rawDamage: number): number {
  const r = state.resources;
  let dmg = rawDamage;
  if (r.blocking && r.sp > 4) {
    r.sp = Math.max(0, r.sp - Math.min(14, rawDamage * 0.7));
    dmg = Math.max(1, Math.round(rawDamage * 0.4));
    if (r.sp <= 0.5) r.blocking = false;
  } else if (r.aegisShieldTimer > 0) {
    dmg = Math.max(1, Math.round(rawDamage * 0.5));
  }
  r.hp = Math.max(0, r.hp - dmg);
  return dmg;
}

/**
 * Triggers a Dodge with invulnerability window; can cancel light attacks in RECOVERY,
 * but never cancels heavy attacks mid-commitment.
 */
export function triggerPlayerDodge(
  state: FoundrySimulationState,
  bus?: GameplayEventBus,
): boolean {
  const r = state.resources;
  if (r.dodgeTimer > 0) return false;
  if (r.sp < 22) return false;

  if (r.attackPhase !== 'IDLE') {
    const spec = r.attackKind !== 'none' ? ATTACK_SPECS[r.attackKind] : null;
    const canCancel = Boolean(spec && r.attackPhase === 'RECOVERY' && spec.dodgeCancelableInRecovery);
    if (!canCancel) return false;
    r.attackPhase = 'IDLE';
    r.attackKind = 'none';
  }

  r.sp = Math.max(0, r.sp - 22);
  r.dodgeTimer = 0.34;
  r.movementState = 'DODGING';

  // Perfect dodge check: dodging while a nearby enemy/boss is actively winding up or striking
  const threatNear =
    state.enemies.some(
      (e) =>
        (e.state === 'WINDUP' || e.state === 'STRIKE') &&
        Math.hypot(e.localX - state.playerLocalX, e.localZ - state.playerLocalZ) <= 13,
    ) ||
    ((state.boss.state === 'SWEEP_WINDUP' || state.boss.state === 'SOUL_FLURRY_WINDUP') &&
      Math.hypot(state.boss.localX - state.playerLocalX, state.boss.localZ - state.playerLocalZ) <= 18);

  if (threatNear) {
    const syn = resolveActiveSynergy(r.primaryDiscipline, r.secondaryDiscipline);
    const seGain = syn?.name === 'Mirage Counter' ? 24 : 16;
    adjustSoulEnergy(state, seGain);
    r.comboCount += 1;
    pushLog(state, `Perfect Dodge! +${seGain} Soul Energy.`);
    bus?.emit('combat.dodge', { perfect: true, soulEnergyGain: seGain });
  } else {
    bus?.emit('combat.dodge', { perfect: false, soulEnergyGain: 0 });
  }
  return true;
}

/**
 * Opens a crisp 0.28s Perfect Parry window (widened to 0.42s under Soulguard Aegis).
 */
export function triggerPlayerParry(
  state: FoundrySimulationState,
  bus?: GameplayEventBus,
): boolean {
  const r = state.resources;
  if (r.sp < 12) return false;
  r.sp = Math.max(0, r.sp - 12);
  r.parryWindowTimer = r.aegisShieldTimer > 0 ? 0.42 : 0.28;

  // Immediate parry resolution if an enemy or Colossus is in WINDUP / STRIKE in melee range
  for (const enemy of state.enemies) {
    if (enemy.state === 'DEFEATED') continue;
    const dist = Math.hypot(enemy.localX - state.playerLocalX, enemy.localZ - state.playerLocalZ);
    if (dist <= 11.5 && (enemy.state === 'WINDUP' || enemy.state === 'STRIKE')) {
      enemy.state = 'STAGGERED';
      enemy.stateTimer = 2.4;
      enemy.posture = 0;
      const syn = resolveActiveSynergy(r.primaryDiscipline, r.secondaryDiscipline);
      if (syn?.name === 'Aegis Snare') {
        enemy.chainedTimer = 2.2;
      }
      const seGain = 28;
      adjustSoulEnergy(state, seGain);
      r.masteryPoints += 12;
      r.rank = deriveSoulClanRank(r.masteryPoints, state.boss.defeated);
      r.comboCount += 1;
      pushLog(state, `Perfect Parry vs ${enemy.name}! Staggered (+${seGain} SE).`);
      bus?.emit('combat.parry', { attackerId: enemy.id, soulEnergyGain: seGain });
      return true;
    }
  }

  const bossDist = Math.hypot(
    state.boss.localX - state.playerLocalX,
    state.boss.localZ - state.playerLocalZ,
  );
  if (
    !state.boss.defeated &&
    bossDist <= 16.5 &&
    (state.boss.state === 'SWEEP_WINDUP' ||
      state.boss.state === 'SOUL_FLURRY_WINDUP' ||
      state.boss.state === 'SOUL_FLURRY')
  ) {
    state.boss.state = 'STAGGERED';
    state.boss.stateTimer = 2.8;
    const seGain = 34;
    adjustSoulEnergy(state, seGain);
    r.masteryPoints += 18;
    r.rank = deriveSoulClanRank(r.masteryPoints, state.boss.defeated);
    pushLog(state, `Perfect Parry shattered ${state.boss.name}'s guard (+${seGain} SE)!`);
    bus?.emit('combat.parry', { attackerId: state.boss.id, soulEnergyGain: seGain });
    return true;
  }

  return true;
}

/**
 * Casts the player's active Soul Clan discipline skill (consuming SE >= 0).
 */
export function castSoulDisciplineSkill(
  state: FoundrySimulationState,
  discipline: SoulDisciplineId = state.resources.primaryDiscipline,
  bus?: GameplayEventBus,
): { cast: boolean; message: string } {
  const r = state.resources;
  const spec = SOUL_DISCIPLINES[discipline];
  if (r.disciplineCooldowns[discipline] > 0) {
    return { cast: false, message: `${spec.name} is recharging.` };
  }
  if (r.se < spec.seCost) {
    return { cast: false, message: `Requires ${spec.seCost} Soul Energy.` };
  }

  adjustSoulEnergy(state, -spec.seCost);
  r.disciplineCooldowns[discipline] = spec.cooldownSec;
  r.masteryPoints += 10;
  r.rank = deriveSoulClanRank(r.masteryPoints, state.boss.defeated);

  const synergy = resolveActiveSynergy(r.primaryDiscipline, r.secondaryDiscipline);
  let msg = `${spec.name} unleashed!`;

  if (discipline === 'soulblade') {
    const mult = synergy?.name === 'Phantom Cleave' ? 1.35 : 1;
    const dmg = Math.round(48 * mult);
    let hits = 0;
    for (const enemy of state.enemies) {
      if (enemy.state === 'DEFEATED') continue;
      if (Math.hypot(enemy.localX - state.playerLocalX, enemy.localZ - state.playerLocalZ) <= 15) {
        enemy.hp = Math.max(0, enemy.hp - dmg);
        if (enemy.hp === 0) enemy.state = 'DEFEATED';
        hits += 1;
      }
    }
    if (
      !state.boss.defeated &&
      Math.hypot(state.boss.localX - state.playerLocalX, state.boss.localZ - state.playerLocalZ) <= 19
    ) {
      applyBossDamage(state, dmg, bus);
      hits += 1;
    }
    msg = `${spec.name} Cleave hit ${hits} foe(s) for ${dmg} dmg${synergy ? ` (${synergy.name})` : ''}.`;
  } else if (discipline === 'soulguard') {
    r.aegisShieldTimer = 6.0;
    msg = `Soulguard Aegis active (6s) — Parry window widened & trap damage halved.`;
  } else if (discipline === 'soulshade') {
    r.dodgeTimer = Math.max(r.dodgeTimer, 0.55);
    r.sp = Math.min(r.maxSp, r.sp + 24);
    msg = `Soulshade Blink phased through hazards (+24 SP, 0.55s i-frames).`;
  } else if (discipline === 'soulweaver') {
    // Pull nearby enemies toward the nearest active Rotating Blade or Conduit trap!
    const anchorBlade = state.blades[1];
    let bound = 0;
    for (const enemy of state.enemies) {
      if (enemy.state === 'DEFEATED') continue;
      if (Math.hypot(enemy.localX - state.playerLocalX, enemy.localZ - state.playerLocalZ) <= 26) {
        enemy.chainedTimer = 3.2;
        enemy.localX += (anchorBlade.localX - enemy.localX) * 0.45;
        enemy.localZ += (anchorBlade.localZ - enemy.localZ) * 0.45;
        bound += 1;
      }
    }
    msg = `Soulweaver Chains bound ${bound} foe(s) and dragged them toward Saw Assembly Beta!`;
  }

  pushLog(state, msg);
  bus?.emit('soul.discipline_cast', {
    discipline,
    synergy: synergy?.name,
    costSe: spec.seCost,
  });
  return { cast: true, message: msg };
}

/**
 * Mutates Gear Synchronization Puzzle settings and emits events when synchronized.
 */
export function updateGearPuzzleConfig(
  state: FoundrySimulationState,
  patch: Partial<Pick<GearPuzzleState, 'gear1Radius' | 'gear2Radius' | 'gear3Radius' | 'reverseIdlerEngaged'>>,
  bus?: GameplayEventBus,
): GearPuzzleState {
  const wasSolved = state.gearPuzzle.solved;
  const next = evaluateGearTrain({
    ...state.gearPuzzle,
    ...patch,
  });
  state.gearPuzzle = next;
  bus?.emit('gear.meshed', {
    outputRpm: next.computedOutputRpm,
    torqueLoad: next.computedTorqueLoad,
    synchronized: next.solved,
  });
  if (!wasSolved && next.solved) {
    adjustSoulEnergy(state, 25);
    state.resources.masteryPoints += 30;
    state.resources.rank = deriveSoulClanRank(state.resources.masteryPoints, state.boss.defeated);
    pushLog(state, `Gear Train Synchronized at ${next.computedOutputRpm} RPM! (+25 SE)`);
    bus?.emit('foundry.puzzle_solved', { puzzleId: 'gear_sync', rewardSe: 25 });
  }
  return next;
}

/**
 * Toggles Energy Routing switches A/B/C, evaluates V=IR + overload + Colossus Phase 2 shield overheat!
 */
export function toggleEnergySwitch(
  state: FoundrySimulationState,
  which: 'switchA' | 'switchB' | 'switchC',
  bus?: GameplayEventBus,
): EnergyRoutingPuzzleState {
  const wasSolved = state.energyPuzzle.solved;
  const next = evaluateEnergyRouting({
    ...state.energyPuzzle,
    [which]: !state.energyPuzzle[which],
  });
  state.energyPuzzle = next;

  bus?.emit('circuit.routed', {
    receiverPoweredCount: next.receiversPowered,
    overloaded: next.overloaded,
    totalCurrent: next.currentAmps,
  });

  if (next.overloaded) {
    state.conduitActiveTimer = Math.max(state.conduitActiveTimer, 4.0);
    pushLog(state, `Circuit OVERLOAD (${next.currentAmps}A)! Electrified floor surged for 4s.`);
    bus?.emit('circuit.overloaded', { reason: 'Short-circuit bypass through Switch C' });
  }

  // Phase 2 Boss Counterplay: routing clean dual-receiver energy overheats the Colossus shield!
  if (
    !next.overloaded &&
    next.receiversPowered === 2 &&
    state.boss.phase === 2 &&
    state.boss.shieldActive
  ) {
    state.boss.shieldActive = false;
    state.boss.state = 'OVERHEATED_VULNERABLE';
    state.boss.overheatTimer = 7.5;
    state.boss.stateTimer = 7.5;
    pushLog(state, `Foundry Energy overloaded the Colossus Core! Armor vulnerable for 7.5s!`);
  }

  if (!wasSolved && next.solved) {
    adjustSoulEnergy(state, 30);
    state.resources.masteryPoints += 35;
    state.resources.rank = deriveSoulClanRank(state.resources.masteryPoints, state.boss.defeated);
    pushLog(state, `Energy Routing Laboratory restored (${next.currentAmps}A, 2/2 Receivers)! (+30 SE)`);
    bus?.emit('foundry.puzzle_solved', { puzzleId: 'energy_routing', rewardSe: 30 });
  }
  return next;
}

/**
 * Adjusts hydraulic valve opening ratio (0..1) to balance Tank A & Tank B and raise the Foundry Bridge.
 */
export function setHydraulicValve(
  state: FoundrySimulationState,
  openRatio: number,
  bus?: GameplayEventBus,
): HydraulicSystemState {
  const clamped = Math.max(0, Math.min(1, openRatio));
  state.hydraulics.valveOpenRatio = clamped;
  const stepped = stepHydraulicSystem(state.hydraulics, 0);
  state.hydraulics = stepped;
  bus?.emit('valve.adjusted', {
    valveId: 'foundry_main_valve',
    openRatio: clamped,
    flowRate: stepped.flowRateQ,
  });
  return stepped;
}

/**
 * Applies damage to the Soulbound Colossus while enforcing strict one-time phase transitions
 * (Phase 1 -> Phase 2 at <= 65% HP, Phase 2 -> Phase 3 at <= 30% HP).
 */
export function applyBossDamage(
  state: FoundrySimulationState,
  rawDamage: number,
  bus?: GameplayEventBus,
): number {
  const boss = state.boss;
  if (boss.defeated || rawDamage <= 0) return 0;

  let effective = rawDamage;
  if (boss.shieldActive) {
    effective = Math.round(rawDamage * 0.15); // Heavily armored until energy overheats core
  } else if (boss.state === 'OVERHEATED_VULNERABLE' || boss.state === 'STAGGERED') {
    effective = Math.round(rawDamage * 1.45);
  }

  boss.hp = Math.max(0, boss.hp - effective);
  const ratio = boss.hp / boss.maxHp;

  // Phase 2 transition fires strictly once
  if (!boss.phase2Triggered && ratio <= 0.65 && boss.hp > 0) {
    boss.phase2Triggered = true;
    const prev = boss.phase;
    boss.phase = 2;
    boss.shieldActive = true;
    boss.state = 'SHIELDED_OVERLOAD';
    boss.stateTimer = 10.0;
    pushLog(
      state,
      `Phase 2 — Energy Overload! Route clean Foundry Energy (Switches A + B) to shatter the Colossus Shield!`,
    );
    bus?.emit('boss.phase_changed', {
      bossId: boss.id,
      previousPhase: prev,
      nextPhase: 2,
    });
  }

  // Phase 3 transition fires strictly once
  if (!boss.phase3Triggered && ratio <= 0.3 && boss.hp > 0) {
    boss.phase3Triggered = true;
    const prev = boss.phase;
    boss.phase = 3;
    boss.shieldActive = false;
    boss.state = 'SOUL_FLURRY_WINDUP';
    boss.stateTimer = 1.4;
    pushLog(state, `Phase 3 — Soul Combat! Parry the Colossus's Soul Flurry for the final opening!`);
    bus?.emit('boss.phase_changed', {
      bossId: boss.id,
      previousPhase: prev,
      nextPhase: 3,
    });
  }

  if (boss.hp === 0 && !boss.defeated) {
    boss.defeated = true;
    boss.state = 'DEFEATED';
    boss.shieldActive = false;
    state.resources.masteryPoints += 90;
    state.resources.rank = deriveSoulClanRank(state.resources.masteryPoints, true);
    adjustSoulEnergy(state, 50);
    pushLog(state, `The Soulbound Colossus vanquished! Soul Awakening rank: ${state.resources.rank}.`);
    bus?.emit('foundry.boss_defeated', {
      bossId: boss.id,
      unlockedRank: state.resources.rank,
    });
  }

  return effective;
}

/**
 * Deterministic fixed-step simulation tick for The Forgotten Soul Foundry.
 * Evaluates rotating blades (θ(t) = θ0 + ωt), pressure plates, hydraulics,
 * combat attack active windows (single-hit guaranteed), Soul Engineer AI,
 * environmental trap damage to BOTH player & lured enemies, and Boss FSM.
 */
export function stepFoundrySimulation(
  state: FoundrySimulationState,
  dtRaw: number,
  input: {
    playerLocalX: number;
    playerLocalZ: number;
    playerSpeed: number;
    playerMassForce?: number;
    isBoosting?: boolean;
  },
  bus?: GameplayEventBus,
): { playerDamageTaken: number; enemyHits: number } {
  const dt = Math.max(0.001, Math.min(0.05, dtRaw));
  const prevSpeed = state.playerSpeed;
  state.simTime += dt;
  state.playerLocalX = input.playerLocalX;
  state.playerLocalZ = input.playerLocalZ;
  state.playerSpeed = input.playerSpeed;
  state.playerAccel = Math.round(((input.playerSpeed - prevSpeed) / dt) * 10) / 10;

  let playerDamageTaken = 0;
  let enemyHits = 0;

  const r = state.resources;
  // Stamina regeneration & timers
  r.sp = Math.min(r.maxSp, r.sp + (r.blocking ? -12 : 24) * dt);
  if (r.sp <= 0.5) {
    r.sp = Math.max(0, r.sp);
    r.blocking = false;
  }
  r.dodgeTimer = Math.max(0, r.dodgeTimer - dt);
  r.parryWindowTimer = Math.max(0, r.parryWindowTimer - dt);
  r.aegisShieldTimer = Math.max(0, r.aegisShieldTimer - dt);
  state.landingTimer = Math.max(0, state.landingTimer - dt);
  for (const key of Object.keys(r.disciplineCooldowns) as SoulDisciplineId[]) {
    r.disciplineCooldowns[key] = Math.max(0, r.disciplineCooldowns[key] - dt);
  }

  // Vertical Jump, Wall-Run, and Landing kinematics (v = u + at, d = ut + ½at²)
  const radialFromCenter = Math.hypot(state.playerLocalX, state.playerLocalZ);
  const nearFoundryWall = radialFromCenter >= 43 && radialFromCenter <= FOUNDRY_WORLD_ORIGIN.radius;
  if (state.playerLocalY > 0 || state.playerVelY > 0) {
    if (nearFoundryWall && input.playerSpeed >= 8 && state.playerLocalY >= 0.4 && state.playerVelY <= 2.5) {
      if (state.wallRunTimer <= 0 && !state.wallRunUsedThisJump) {
        state.wallRunTimer = 0.85;
        state.wallRunUsedThisJump = true;
      } else if (state.wallRunTimer > 0) {
        state.wallRunTimer = Math.max(0, state.wallRunTimer - dt);
      }
    } else {
      state.wallRunTimer = 0;
    }

    const gravity = state.wallRunTimer > 0 ? -5.5 : -26;
    const u = state.playerVelY;
    const nextY = state.playerLocalY + u * dt + 0.5 * gravity * dt * dt;
    state.playerVelY = u + gravity * dt;

    if (nextY <= 0) {
      state.playerLocalY = 0;
      state.playerVelY = 0;
      state.wallRunTimer = 0;
      state.wallRunUsedThisJump = false;
      state.landingTimer = 0.16;
    } else {
      state.playerLocalY = Math.round(nextY * 1000) / 1000;
    }
  } else {
    state.wallRunTimer = 0;
    state.wallRunUsedThisJump = false;
  }

  if (r.dodgeTimer > 0) {
    r.movementState = 'DODGING';
  } else if (state.wallRunTimer > 0) {
    r.movementState = 'WALL_RUN';
  } else if (state.playerLocalY > 0) {
    r.movementState = 'JUMPING';
  } else if (state.landingTimer > 0) {
    r.movementState = 'LANDING';
  } else if (input.isBoosting && input.playerSpeed > 12) {
    r.movementState = 'SPRINT';
  } else if (input.playerSpeed > 1.5) {
    r.movementState = 'MOVE';
  } else {
    r.movementState = 'IDLE';
  }

  // 1. Player Attack Frame State Machine (STARTUP -> ACTIVE -> RECOVERY -> IDLE)
  if (r.attackPhase !== 'IDLE' && r.attackKind !== 'none') {
    const spec = ATTACK_SPECS[r.attackKind];
    r.attackPhaseTimer -= dt;

    if (r.attackPhase === 'ACTIVE') {
      // Single-hit registration per target per attack activation!
      for (const blade of state.blades) {
        if (blade.driveShaftDamaged || r.hitRegisteredIds.includes(blade.id)) continue;
        const d = Math.hypot(blade.localX - state.playerLocalX, blade.localZ - state.playerLocalZ);
        if (d <= spec.range + 2.4) {
          r.hitRegisteredIds.push(blade.id);
          blade.driveShaftHp = Math.max(0, blade.driveShaftHp - spec.damage);
          if (blade.driveShaftHp === 0) {
            blade.driveShaftDamaged = true;
            blade.currentAngularVel = blade.baseAngularVel * 0.35;
            pushLog(state, `${blade.label} drive shaft damaged! Blade slowed to 35%.`);
          }
        }
      }

      for (const enemy of state.enemies) {
        if (enemy.state === 'DEFEATED' || r.hitRegisteredIds.includes(enemy.id)) continue;
        const d = Math.hypot(enemy.localX - state.playerLocalX, enemy.localZ - state.playerLocalZ);
        if (d <= spec.range) {
          r.hitRegisteredIds.push(enemy.id);
          const blocked = enemy.state === 'BLOCKING' && r.attackKind === 'light';
          const dmg = blocked ? Math.round(spec.damage * 0.35) : spec.damage;
          enemy.hp = Math.max(0, enemy.hp - dmg);
          enemy.posture = Math.max(0, enemy.posture - (r.attackKind === 'heavy' ? 42 : 18));
          adjustSoulEnergy(state, spec.seGainOnHit);
          enemyHits += 1;
          if (enemy.hp === 0) {
            enemy.state = 'DEFEATED';
            r.masteryPoints += 25;
            r.rank = deriveSoulClanRank(r.masteryPoints, state.boss.defeated);
            adjustSoulEnergy(state, 18);
            bus?.emit('combat.finisher', { targetId: enemy.id, soulEnergyGain: 18 });
          } else if (enemy.posture === 0) {
            enemy.state = 'STAGGERED';
            enemy.stateTimer = 2.0;
          }
        }
      }

      if (!state.boss.defeated && !r.hitRegisteredIds.includes(state.boss.id)) {
        const bd = Math.hypot(
          state.boss.localX - state.playerLocalX,
          state.boss.localZ - state.playerLocalZ,
        );
        if (bd <= spec.range + 4.5) {
          r.hitRegisteredIds.push(state.boss.id);
          applyBossDamage(state, spec.damage, bus);
          adjustSoulEnergy(state, spec.seGainOnHit);
          enemyHits += 1;
        }
      }
    }

    if (r.attackPhaseTimer <= 0) {
      if (r.attackPhase === 'STARTUP') {
        r.attackPhase = 'ACTIVE';
        r.attackPhaseTimer = spec.activeSec;
      } else if (r.attackPhase === 'ACTIVE') {
        r.attackPhase = 'RECOVERY';
        r.attackPhaseTimer = spec.recoverySec;
      } else {
        r.attackPhase = 'IDLE';
        r.attackKind = 'none';
        r.attackPhaseTimer = 0;
        r.hitRegisteredIds = [];
      }
    }
  }

  // 2. Mechanical Traps: Hall of Rotating Teeth (θ(t) = θ0 + ωt)
  for (const blade of state.blades) {
    blade.angleRad = (blade.angleRad + blade.currentAngularVel * dt) % (Math.PI * 2);
    for (const actorKey of Object.keys(blade.hitCooldownByActor)) {
      blade.hitCooldownByActor[actorKey] = Math.max(0, blade.hitCooldownByActor[actorKey] - dt);
    }

    // Check blade sweep hit against player AND lured enemies (systemic hazard!)
    const actors: Array<{ id: string; x: number; z: number; isPlayer: boolean; enemy?: FoundryEnemy }> = [
      { id: 'player', x: state.playerLocalX, z: state.playerLocalZ, isPlayer: true },
      ...state.enemies
        .filter((e) => e.state !== 'DEFEATED')
        .map((e) => ({ id: e.id, x: e.localX, z: e.localZ, isPlayer: false, enemy: e })),
    ];

    for (const actor of actors) {
      if ((blade.hitCooldownByActor[actor.id] ?? 0) > 0) continue;
      const dx = actor.x - blade.localX;
      const dz = actor.z - blade.localZ;
      const dist = Math.hypot(dx, dz);
      if (dist > blade.radius || dist < 1.1) continue;

      // Two opposite blades at angleRad and angleRad + π: check angular proximity (< 0.34 rad)
      const actorAngle = Math.atan2(dz, dx);
      const diffA = Math.abs(Math.atan2(Math.sin(actorAngle - blade.angleRad), Math.cos(actorAngle - blade.angleRad)));
      const diffB = Math.abs(
        Math.atan2(
          Math.sin(actorAngle - (blade.angleRad + Math.PI)),
          Math.cos(actorAngle - (blade.angleRad + Math.PI)),
        ),
      );

      if (Math.min(diffA, diffB) <= 0.34) {
        if (actor.isPlayer) {
          if (r.dodgeTimer > 0 || state.playerLocalY > 2.2) continue; // Dodge i-frames or high jump clear rotating blades!
          const dmg = applyMitigatedPlayerDamage(state, blade.damagePerHit);
          playerDamageTaken += dmg;
          blade.hitCooldownByActor[actor.id] = 0.85;
          bus?.emit('trap.damaged_entity', {
            trapId: blade.id,
            trapKind: 'blade',
            targetId: 'player',
            damage: dmg,
          });
        } else if (actor.enemy) {
          // Enemies lured or chained into blades take heavy trap damage!
          const dmg = blade.damagePerHit * 2;
          actor.enemy.hp = Math.max(0, actor.enemy.hp - dmg);
          if (actor.enemy.hp === 0) actor.enemy.state = 'DEFEATED';
          blade.hitCooldownByActor[actor.id] = 0.75;
          pushLog(state, `${actor.enemy.name} sliced by ${blade.label} (-${dmg} HP)!`);
          bus?.emit('trap.damaged_entity', {
            trapId: blade.id,
            trapKind: 'blade',
            targetId: actor.enemy.id,
            damage: dmg,
          });
        }
      }
    }
  }

  // 3. Pressure Plates -> Event-driven automation (also triggered by Soul Engineer!)
  const playerMass = input.playerMassForce ?? 115;
  let anyGatePlateActive = false;
  for (const plate of state.plates) {
    let force = 0;
    let triggerActor = '';

    if (Math.hypot(state.playerLocalX - plate.localX, state.playerLocalZ - plate.localZ) <= plate.radius) {
      force += playerMass;
      triggerActor = 'player';
    }
    for (const enemy of state.enemies) {
      if (enemy.state === 'DEFEATED') continue;
      if (Math.hypot(enemy.localX - plate.localX, enemy.localZ - plate.localZ) <= plate.radius) {
        force += 95;
        triggerActor = triggerActor || enemy.id;
      }
    }

    const wasActive = plate.active;
    plate.currentForce = force;
    plate.active = force >= plate.forceThreshold;

    if (plate.active && !wasActive) {
      bus?.emit('pressure_plate.activated', {
        plateId: plate.id,
        actorId: triggerActor || 'unknown',
        force,
      });
      if (plate.linkedAction === 'surge_conduit') {
        state.conduitActiveTimer = 3.5;
        pushLog(state, `${plate.label} triggered by ${triggerActor}! Electrical Conduit surged.`);
      }
    } else if (!plate.active && wasActive) {
      bus?.emit('pressure_plate.released', { plateId: plate.id });
    }

    if (plate.id === 'plate_gate' && plate.active) {
      anyGatePlateActive = true;
    }
  }

  // Update Logic Control Gate sensors
  const nearForgeGate = Math.hypot(state.playerLocalX - 0, state.playerLocalZ - 16) <= 22;
  if (
    state.energyPuzzle.proximitySensor !== nearForgeGate ||
    state.energyPuzzle.pressureSensor !== anyGatePlateActive
  ) {
    state.energyPuzzle = evaluateEnergyRouting({
      ...state.energyPuzzle,
      proximitySensor: nearForgeGate,
      pressureSensor: anyGatePlateActive,
    });
  }

  // 4. Hydraulics Step (F = P * A, Q = A * v)
  const wasBridgeRaised = state.hydraulics.bridgeRaised;
  state.hydraulics = stepHydraulicSystem(state.hydraulics, dt);
  if (!wasBridgeRaised && state.hydraulics.bridgeRaised) {
    adjustSoulEnergy(state, 20);
    pushLog(state, `Hydraulic tanks balanced (${state.hydraulics.pistonForceF} kN)! Foundry Bridge raised.`);
    bus?.emit('foundry.puzzle_solved', { puzzleId: 'hydraulic_bridge', rewardSe: 20 });
  }

  // 5. Electrified Conduit Floor Hazard (damages un-dodging player & enemies on central conduit)
  if (state.conduitActiveTimer > 0) {
    state.conduitActiveTimer = Math.max(0, state.conduitActiveTimer - dt);
    const inConduitZone = (x: number, z: number) => Math.abs(x) <= 9 && z >= -2 && z <= 10;
    if (inConduitZone(state.playerLocalX, state.playerLocalZ) && r.dodgeTimer <= 0 && state.playerLocalY <= 1.2) {
      const dmg = 14 * dt;
      r.hp = Math.max(0, r.hp - dmg);
      playerDamageTaken += dmg;
    }
    for (const enemy of state.enemies) {
      if (enemy.state === 'DEFEATED') continue;
      if (inConduitZone(enemy.localX, enemy.localZ)) {
        const dmg = 26 * dt;
        enemy.hp = Math.max(0, enemy.hp - dmg);
        if (enemy.hp === 0) enemy.state = 'DEFEATED';
      }
    }
  }

  // 6. Soul Clan Intelligent Faction AI (Guardian + Trap-Operating Soul Engineer)
  for (const enemy of state.enemies) {
    if (enemy.state === 'DEFEATED') continue;
    enemy.chainedTimer = Math.max(0, enemy.chainedTimer - dt);
    enemy.stateTimer = Math.max(0, enemy.stateTimer - dt);

    if (enemy.state === 'STAGGERED') {
      if (enemy.stateTimer <= 0) {
        enemy.state = 'PATROL';
        enemy.posture = enemy.maxPosture;
      }
      continue;
    }

    const dx = state.playerLocalX - enemy.localX;
    const dz = state.playerLocalZ - enemy.localZ;
    const dist = Math.hypot(dx, dz);

    if (enemy.role === 'soul_engineer') {
      // Soul Engineer notices player near conduit zone -> sprints to Conduit Surge Plate to trap player!
      const conduitPlate = state.plates.find((p) => p.id === 'plate_conduit');
      const playerNearConduit = Math.abs(state.playerLocalX) <= 14 && state.playerLocalZ >= -6 && state.playerLocalZ <= 14;
      if (conduitPlate && playerNearConduit && state.conduitActiveTimer <= 0.2 && enemy.chainedTimer <= 0) {
        enemy.state = 'TRIGGER_TRAP';
        const px = conduitPlate.localX - enemy.localX;
        const pz = conduitPlate.localZ - enemy.localZ;
        const pd = Math.hypot(px, pz);
        if (pd > 0.8) {
          enemy.localX += (px / pd) * 6.4 * dt;
          enemy.localZ += (pz / pd) * 6.4 * dt;
        }
        continue;
      }
    }

    if (dist <= 26) {
      if (enemy.state === 'WINDUP') {
        if (enemy.stateTimer <= 0) {
          enemy.state = 'STRIKE';
          enemy.stateTimer = 0.24;
          if (dist <= 9.5) {
            if (r.parryWindowTimer > 0) {
              enemy.state = 'STAGGERED';
              enemy.stateTimer = 2.4;
              adjustSoulEnergy(state, 28);
              bus?.emit('combat.parry', { attackerId: enemy.id, soulEnergyGain: 28 });
            } else if (r.dodgeTimer <= 0) {
              const dmg = applyMitigatedPlayerDamage(state, 12);
              playerDamageTaken += dmg;
            }
          }
        }
      } else if (enemy.state === 'STRIKE') {
        if (enemy.stateTimer <= 0) {
          enemy.state = enemy.role === 'soul_guardian' ? 'BLOCKING' : 'PATROL';
          enemy.stateTimer = 1.4;
        }
      } else if (dist <= 8.5) {
        enemy.state = 'WINDUP';
        enemy.stateTimer = 0.65;
      } else if (enemy.chainedTimer <= 0) {
        enemy.state = enemy.role === 'soul_guardian' && dist < 13 ? 'BLOCKING' : 'PATROL';
        const moveSpd = enemy.state === 'BLOCKING' ? 2.4 : 4.6;
        enemy.localX += (dx / Math.max(0.01, dist)) * moveSpd * dt;
        enemy.localZ += (dz / Math.max(0.01, dist)) * moveSpd * dt;
      }
    }
  }

  // 7. Three-Phase Boss: The Soulbound Colossus
  const boss = state.boss;
  if (!boss.defeated) {
    boss.armorAngleRad = (boss.armorAngleRad + (boss.phase === 3 ? 2.4 : 1.1) * dt) % (Math.PI * 2);
    const bDist = Math.hypot(state.playerLocalX - boss.localX, state.playerLocalZ - boss.localZ);

    if (boss.state === 'DORMANT' && bDist <= 34) {
      boss.state = 'SWEEP_WINDUP';
      boss.stateTimer = 1.8;
      pushLog(state, `${boss.name} awakens — Phase 1: Mechanical Defense!`);
    } else if (boss.state !== 'DORMANT') {
      boss.stateTimer = Math.max(0, boss.stateTimer - dt);
      boss.overheatTimer = Math.max(0, boss.overheatTimer - dt);
      if (boss.activeShockwaveRadius > 0) {
        boss.activeShockwaveRadius += 16 * dt;
        if (boss.activeShockwaveRadius > 22) boss.activeShockwaveRadius = 0;
      }

      if (boss.stateTimer <= 0) {
        if (boss.state === 'SWEEP_WINDUP') {
          boss.state = 'SHOCKWAVE';
          boss.stateTimer = 1.4;
          boss.activeShockwaveRadius = 2.0;
          if (bDist <= 16 && r.dodgeTimer <= 0 && state.playerLocalY <= 1.6) {
            const dmg = applyMitigatedPlayerDamage(state, 18);
            playerDamageTaken += dmg;
            bus?.emit('trap.damaged_entity', {
              trapId: boss.id,
              trapKind: 'shockwave',
              targetId: 'player',
              damage: dmg,
            });
          }
        } else if (boss.state === 'SOUL_FLURRY_WINDUP') {
          boss.state = 'SOUL_FLURRY';
          boss.stateTimer = 0.8;
          if (bDist <= 15 && r.dodgeTimer <= 0 && r.parryWindowTimer <= 0) {
            const dmg = applyMitigatedPlayerDamage(state, 22);
            playerDamageTaken += dmg;
          }
        } else if (boss.state === 'OVERHEATED_VULNERABLE') {
          boss.shieldActive = boss.phase === 2;
          boss.state = boss.phase === 2 ? 'SHIELDED_OVERLOAD' : 'SWEEP_WINDUP';
          boss.stateTimer = 4.5;
        } else {
          boss.state = boss.phase === 3 ? 'SOUL_FLURRY_WINDUP' : 'SWEEP_WINDUP';
          boss.stateTimer = boss.phase === 3 ? 1.45 : 2.2;
        }
      }
    }
  }

  return { playerDamageTaken, enemyHits };
}
