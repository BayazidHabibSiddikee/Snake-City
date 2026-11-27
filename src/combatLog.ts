/**
 * In-Game Combat Log state tracker and text formatter.
 *
 * Captures recent combat exchanges (damage dealt, critical/stagger strikes,
 * Counter Clash parries, enemy defeats, and damage received) along with clear
 * Combat Start / Combat End encounter markers and high-damage event flags in a
 * bounded rolling feed that surfaces while in combat and fades cleanly after
 * combat concludes.
 */

export type CombatLogKind =
  | 'dealt'
  | 'crit'
  | 'received'
  | 'defeat'
  | 'parry'
  | 'combat_start'
  | 'combat_end';

export type CombatSessionState = 'idle' | 'active' | 'ended';

export interface CombatLogInput {
  kind: Exclude<CombatLogKind, 'combat_start' | 'combat_end'>;
  amount: number;
  targetName: string;
  skillName?: string;
  /** Optional damage-to-max-HP ratio (0..1+) used to highlight heavy proportional blows. */
  damageRatio?: number;
}

export interface CombatLogEntry {
  id: number;
  timestampMs: number;
  kind: CombatLogKind;
  amount: number;
  targetName: string;
  skillName?: string;
  damageRatio?: number;
  isHighDamage: boolean;
}

export interface CombatLogSummary {
  totalDealt: number;
  totalReceived: number;
  hitsDealt: number;
  hitsReceived: number;
}

export interface FormattedCombatLogLine {
  kind: CombatLogKind;
  /** Explicit non-color directional cue (WCAG: never rely on hue alone). */
  directionLabel: string;
  /** Concise single-line readable combat narrative. */
  description: string;
  /** Right-aligned tabular numeric delta (e.g. "-48", "-22 HP", "KO"). */
  deltaText: string;
  /** True when the entry represents a high-damage strike or heavy incoming hit. */
  isHighDamage: boolean;
  /** True for Combat Start / Combat End session boundary markers. */
  isSessionMarker: boolean;
}

export const COMBAT_LOG_MAX_ENTRIES = 8;
export const COMBAT_LOG_IDLE_TIMEOUT_MS = 8500;
/** How long the panel remains visible after 'Combat End' before fading away. */
export const COMBAT_LOG_END_HOLD_MS = 2600;
/** Damage thresholds for visual high-damage event highlighting. */
export const COMBAT_LOG_HIGH_DAMAGE_DEALT = 95;
export const COMBAT_LOG_HIGH_DAMAGE_CRIT = 75;
export const COMBAT_LOG_HIGH_DAMAGE_RECEIVED = 30;
export const COMBAT_LOG_HIGH_DAMAGE_DEALT_RATIO = 0.28;
export const COMBAT_LOG_HIGH_DAMAGE_RECEIVED_RATIO = 0.22;

function normalizeTargetName(raw: string): string {
  const trimmed = raw.trim().replace(/^a\s+/i, '');
  if (!trimmed) return 'Hostile';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

/**
 * Determines whether a combat log event qualifies for high-damage visual
 * highlighting based on absolute damage or proportion of target/player max HP.
 */
export function isHighDamageCombatEvent(
  kind: CombatLogKind,
  amount: number,
  damageRatio?: number,
): boolean {
  const safeAmt = Number.isFinite(amount) ? Math.max(0, amount) : 0;
  const safeRatio =
    typeof damageRatio === 'number' && Number.isFinite(damageRatio)
      ? Math.max(0, damageRatio)
      : 0;

  if (kind === 'crit') {
    return (
      safeAmt >= COMBAT_LOG_HIGH_DAMAGE_CRIT ||
      safeRatio >= COMBAT_LOG_HIGH_DAMAGE_DEALT_RATIO
    );
  }
  if (kind === 'dealt') {
    return (
      safeAmt >= COMBAT_LOG_HIGH_DAMAGE_DEALT ||
      safeRatio >= COMBAT_LOG_HIGH_DAMAGE_DEALT_RATIO
    );
  }
  if (kind === 'received') {
    return (
      safeAmt >= COMBAT_LOG_HIGH_DAMAGE_RECEIVED ||
      safeRatio >= COMBAT_LOG_HIGH_DAMAGE_RECEIVED_RATIO
    );
  }
  return false;
}

/**
 * Formats a combat log entry into concise, scannable plain-English text.
 */
export function formatCombatLogEntry(entry: CombatLogEntry): FormattedCombatLogLine {
  const amt = Math.max(0, Math.round(Number.isFinite(entry.amount) ? entry.amount : 0));
  const target = normalizeTargetName(entry.targetName);
  const skill = entry.skillName?.trim();
  const highDamage =
    typeof entry.isHighDamage === 'boolean'
      ? entry.isHighDamage
      : isHighDamageCombatEvent(entry.kind, amt, entry.damageRatio);

  switch (entry.kind) {
    case 'combat_start':
      return {
        kind: 'combat_start',
        directionLabel: 'Start',
        description: `Combat Start · ${target}`,
        deltaText: 'ENGAGED',
        isHighDamage: false,
        isSessionMarker: true,
      };
    case 'combat_end':
      return {
        kind: 'combat_end',
        directionLabel: 'End',
        description: skill ? `Combat End · ${skill}` : 'Combat End',
        deltaText: 'CLEAR',
        isHighDamage: false,
        isSessionMarker: true,
      };
    case 'dealt':
      return {
        kind: 'dealt',
        directionLabel: 'Dealt',
        description: skill ? `${skill} hit ${target}` : `Struck ${target}`,
        deltaText: amt > 0 ? `-${amt}` : 'Hit',
        isHighDamage: highDamage,
        isSessionMarker: false,
      };
    case 'crit':
      return {
        kind: 'crit',
        directionLabel: 'Crit',
        description: skill ? `${skill} on ${target}` : `Critical hit on ${target}`,
        deltaText: amt > 0 ? `-${amt}!` : 'Crit!',
        isHighDamage: highDamage,
        isSessionMarker: false,
      };
    case 'parry':
      return {
        kind: 'parry',
        directionLabel: 'Parry',
        description: `Countered ${target}`,
        deltaText: amt > 0 ? `+${amt} Qi` : 'Parry',
        isHighDamage: false,
        isSessionMarker: false,
      };
    case 'defeat':
      return {
        kind: 'defeat',
        directionLabel: 'Slain',
        description: `Defeated ${target}`,
        deltaText: 'KO',
        isHighDamage: false,
        isSessionMarker: false,
      };
    case 'received':
      return {
        kind: 'received',
        directionLabel: 'Taken',
        description: `${target} hit you`,
        deltaText: amt > 0 ? `-${amt} HP` : '-HP',
        isHighDamage: highDamage,
        isSessionMarker: false,
      };
  }
}

export class CombatLogTracker {
  private readonly maxEntries: number;
  private readonly idleTimeoutMs: number;
  private readonly endHoldMs: number;
  private entries: CombatLogEntry[] = [];
  private nextId = 1;
  private lastCombatMs = 0;
  private combatEndedAtMs = 0;
  private sessionState: CombatSessionState = 'idle';
  private totalDealt = 0;
  private totalReceived = 0;
  private hitsDealt = 0;
  private hitsReceived = 0;

  constructor(
    maxEntries = COMBAT_LOG_MAX_ENTRIES,
    idleTimeoutMs = COMBAT_LOG_IDLE_TIMEOUT_MS,
    endHoldMs = COMBAT_LOG_END_HOLD_MS,
  ) {
    this.maxEntries = Math.max(2, maxEntries);
    this.idleTimeoutMs = Math.max(1500, idleTimeoutMs);
    this.endHoldMs = Math.max(400, endHoldMs);
  }

  public record(input: CombatLogInput, nowMs: number): CombatLogEntry {
    // Start fresh encounter & emit Combat Start marker when entering combat from idle/ended or after calm interval
    const startingFresh =
      this.sessionState !== 'active' ||
      this.entries.length === 0 ||
      nowMs - this.lastCombatMs >= this.idleTimeoutMs;

    if (startingFresh) {
      this.entries = [];
      this.totalDealt = 0;
      this.totalReceived = 0;
      this.hitsDealt = 0;
      this.hitsReceived = 0;
      this.combatEndedAtMs = 0;
      this.sessionState = 'active';
      this.pushEntry({
        id: this.nextId++,
        timestampMs: nowMs,
        kind: 'combat_start',
        amount: 0,
        targetName: input.targetName,
        isHighDamage: false,
      });
    }

    const cleanAmount = Math.max(0, Math.round(Number.isFinite(input.amount) ? input.amount : 0));
    const highDamage = isHighDamageCombatEvent(input.kind, cleanAmount, input.damageRatio);
    const entry: CombatLogEntry = {
      id: this.nextId++,
      timestampMs: nowMs,
      kind: input.kind,
      amount: cleanAmount,
      targetName: input.targetName,
      skillName: input.skillName,
      damageRatio: input.damageRatio,
      isHighDamage: highDamage,
    };

    if (input.kind === 'dealt' || input.kind === 'crit') {
      this.totalDealt += cleanAmount;
      this.hitsDealt += 1;
    } else if (input.kind === 'received') {
      this.totalReceived += cleanAmount;
      this.hitsReceived += 1;
    }

    this.lastCombatMs = nowMs;
    this.pushEntry(entry);

    return entry;
  }

  /**
   * Advances encounter lifecycle state (`active` -> `ended` -> `idle`) so a
   * clear 'Combat End' marker is appended when combat subsides and held briefly
   * before the panel fades out.
   */
  public syncSession(
    nowMs: number,
    isPlaying: boolean,
    hasEngagedHostile = false,
  ): { state: CombatSessionState; stateChanged: boolean } {
    if (!isPlaying) {
      return { state: this.sessionState, stateChanged: false };
    }

    if (this.sessionState === 'active') {
      if (!hasEngagedHostile && this.lastCombatMs > 0 && nowMs - this.lastCombatMs >= this.idleTimeoutMs) {
        this.sessionState = 'ended';
        this.combatEndedAtMs = nowMs;
        this.pushEntry({
          id: this.nextId++,
          timestampMs: nowMs,
          kind: 'combat_end',
          amount: this.totalDealt,
          targetName: 'Encounter',
          skillName: `Dealt ${this.totalDealt} · Taken ${this.totalReceived}`,
          isHighDamage: false,
        });
        return { state: 'ended', stateChanged: true };
      }
      return { state: 'active', stateChanged: false };
    }

    if (this.sessionState === 'ended') {
      if (nowMs - this.combatEndedAtMs >= this.endHoldMs) {
        this.sessionState = 'idle';
        return { state: 'idle', stateChanged: true };
      }
    }

    return { state: this.sessionState, stateChanged: false };
  }

  public getSessionState(): CombatSessionState {
    return this.sessionState;
  }

  public getEntries(): readonly CombatLogEntry[] {
    return this.entries;
  }

  public getSummary(): CombatLogSummary {
    return {
      totalDealt: this.totalDealt,
      totalReceived: this.totalReceived,
      hitsDealt: this.hitsDealt,
      hitsReceived: this.hitsReceived,
    };
  }

  /**
   * Panel is shown during active combat and briefly during the 'Combat End'
   * hold window so the player can read the end-of-encounter indicator.
   */
  public isVisible(
    nowMs: number,
    isPlaying: boolean,
    hasEngagedHostile = false,
  ): boolean {
    if (!isPlaying || this.entries.length === 0) return false;
    if (this.sessionState === 'active') {
      if (hasEngagedHostile) return true;
      return nowMs - this.lastCombatMs < this.idleTimeoutMs;
    }
    if (this.sessionState === 'ended') {
      return nowMs - this.combatEndedAtMs < this.endHoldMs;
    }
    return false;
  }

  public getIdleTimeoutMs(): number {
    return this.idleTimeoutMs;
  }

  public getEndHoldMs(): number {
    return this.endHoldMs;
  }

  public clear(): void {
    this.entries = [];
    this.lastCombatMs = 0;
    this.combatEndedAtMs = 0;
    this.sessionState = 'idle';
    this.totalDealt = 0;
    this.totalReceived = 0;
    this.hitsDealt = 0;
    this.hitsReceived = 0;
  }

  private pushEntry(entry: CombatLogEntry): void {
    this.entries.unshift(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries.length = this.maxEntries;
    }
  }
}
