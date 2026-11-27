/**
 * Mobile Tactile Haptic Feedback Engine (Web Vibration API).
 *
 * Delivers subtle, short-pulse tactile feedback mapped by event severity
 * (`subtle`, `moderate`, `heavy`, `critical`, `breakthrough`) for combat hits,
 * cultivation arts, Qi absorption, portal awakening, and evolution breakthroughs
 * on supported mobile devices.
 *
 * Gracefully no-ops on desktop / unsupported browsers (e.g., iOS Safari) and
 * enforces priority + cooldown throttling so rapid multi-hits never feel muddy
 * or clip higher-priority combat beats.
 */

export const HAPTICS_ENABLED_STORAGE_KEY = 'SERPENT_PEAKS_HAPTICS_ENABLED';

/**
 * Escalating haptic severity tiers used to map gameplay impact to vibration
 * cadence, pulse length, priority preemption, and cooldown windows.
 */
export type HapticSeverity =
  | 'subtle'
  | 'moderate'
  | 'heavy'
  | 'critical'
  | 'breakthrough';

export interface HapticSeveritySpec {
  /** Alternating [vibrateMs, pauseMs, vibrateMs, ...] sequence for navigator.vibrate(). */
  readonly pattern: readonly number[];
  /** Higher priority beats (1..5) can preempt lower-priority pulses in flight. */
  readonly priority: number;
  /** Minimum cooldown in ms before this severity tier can fire again. */
  readonly minIntervalMs: number;
}

/**
 * Severity-driven vibration presets.
 * Vibrate pulse lengths stay crisp (10–52 ms) so feedback feels like modern
 * mobile action haptics rather than long notification buzzes.
 */
export const HAPTIC_SEVERITY_PATTERNS: Record<HapticSeverity, HapticSeveritySpec> = {
  subtle: {
    pattern: [10],
    priority: 1,
    minIntervalMs: 75,
  },
  moderate: {
    pattern: [16, 18, 14],
    priority: 2,
    minIntervalMs: 95,
  },
  heavy: {
    pattern: [24, 20, 32],
    priority: 3,
    minIntervalMs: 120,
  },
  critical: {
    pattern: [28, 18, 38, 20, 24],
    priority: 4,
    minIntervalMs: 140,
  },
  breakthrough: {
    pattern: [20, 26, 32, 26, 52],
    priority: 5,
    minIntervalMs: 300,
  },
};

export type HapticEvent =
  | 'cast_primary'
  | 'cultivation_shockwave'
  | 'cultivation_dash'
  | 'cultivation_ultimate'
  | 'enemy_hit'
  | 'enemy_crit'
  | 'enemy_defeat'
  | 'boss_defeat'
  | 'player_hit'
  | 'qi_absorb'
  | 'golden_crystal'
  | 'evolution_breakthrough'
  | 'portal_awakening'
  | 'portal_sealed';

export interface HapticPatternSpec extends HapticSeveritySpec {
  /** Semantic severity tier associated with this named gameplay event. */
  readonly severity: HapticSeverity;
}

/**
 * Carefully tuned, subtle millisecond pulse sequences per named gameplay event.
 * Vibrate durations stay crisp (8–56 ms) to feel like modern mobile action haptics
 * rather than long notification buzzes.
 */
export const HAPTIC_PATTERNS: Record<HapticEvent, HapticPatternSpec> = {
  qi_absorb: {
    severity: 'subtle',
    pattern: [8],
    priority: 1,
    minIntervalMs: 75,
  },
  cast_primary: {
    severity: 'subtle',
    pattern: [10],
    priority: 1,
    minIntervalMs: 85,
  },
  golden_crystal: {
    severity: 'moderate',
    pattern: [12, 18, 16],
    priority: 2,
    minIntervalMs: 110,
  },
  enemy_hit: {
    severity: 'moderate',
    pattern: [14],
    priority: 2,
    minIntervalMs: 60,
  },
  portal_sealed: {
    severity: 'moderate',
    pattern: [14, 20, 14],
    priority: 2,
    minIntervalMs: 260,
  },
  cultivation_dash: {
    severity: 'heavy',
    pattern: [16, 18, 12],
    priority: 3,
    minIntervalMs: 140,
  },
  cultivation_shockwave: {
    severity: 'heavy',
    pattern: [18, 22, 26],
    priority: 3,
    minIntervalMs: 160,
  },
  enemy_crit: {
    severity: 'critical',
    pattern: [20, 18, 32],
    priority: 4,
    minIntervalMs: 90,
  },
  enemy_defeat: {
    severity: 'critical',
    pattern: [18, 22, 34],
    priority: 4,
    minIntervalMs: 120,
  },
  player_hit: {
    severity: 'critical',
    pattern: [34, 24, 28],
    priority: 4,
    minIntervalMs: 180,
  },
  portal_awakening: {
    severity: 'critical',
    pattern: [16, 24, 26, 22, 36],
    priority: 4,
    minIntervalMs: 250,
  },
  cultivation_ultimate: {
    severity: 'breakthrough',
    pattern: [24, 26, 36, 24, 48],
    priority: 5,
    minIntervalMs: 260,
  },
  boss_defeat: {
    severity: 'breakthrough',
    pattern: [26, 26, 38, 24, 48],
    priority: 5,
    minIntervalMs: 260,
  },
  evolution_breakthrough: {
    severity: 'breakthrough',
    pattern: [22, 28, 34, 28, 56],
    priority: 5,
    minIntervalMs: 320,
  },
};

export interface CombatHitHapticInput {
  /** Fraction of target max HP removed by the strike (0..1+). */
  damageRatio?: number;
  /** Whether the strike was a critical hit or Counter Clash parry. */
  isCrit?: boolean;
  /** Whether this strike defeated the enemy / banished the sentry. */
  isDefeat?: boolean;
  /** Whether the target is a Peak Guardian or Soul Elder boss. */
  isBoss?: boolean;
  /** True when the player received the hit rather than dealing it. */
  isPlayerHit?: boolean;
}

export type VibrateFn = (pattern: number | number[]) => boolean;

export interface HapticEngineOptions {
  /** Optional custom vibrate implementation (defaults to navigator.vibrate). */
  vibrateFn?: VibrateFn | null;
  /** Optional monotonic clock in ms (defaults to performance.now / Date.now). */
  nowFn?: () => number;
  /** Optional initial enabled override (defaults to persisted localStorage preference or true). */
  initialEnabled?: boolean;
}

export function isVibrationApiSupported(
  nav: { vibrate?: unknown } | undefined = typeof navigator !== 'undefined' ? navigator : undefined,
): boolean {
  return Boolean(nav && typeof nav.vibrate === 'function');
}

/**
 * Resolves the appropriate haptic severity tier for a combat hit based on
 * damage ratio, critical/defeat status, boss weight, and hit direction.
 */
export function resolveCombatHitSeverity(input: CombatHitHapticInput): HapticSeverity {
  const ratio = Number.isFinite(input.damageRatio) ? Math.max(0, input.damageRatio ?? 0) : 0;

  if (input.isPlayerHit) {
    if (ratio >= 0.35) return 'critical';
    if (ratio >= 0.16) return 'heavy';
    return 'moderate';
  }

  if (input.isBoss && input.isDefeat) {
    return 'critical';
  }
  if (input.isDefeat || input.isCrit) {
    return input.isBoss || ratio >= 0.45 ? 'critical' : 'heavy';
  }
  if (ratio >= 0.28 || input.isBoss) {
    return 'moderate';
  }
  return 'subtle';
}

/**
 * Scales only the vibration-pulse entries (even indices) while preserving pause gaps
 * and clamping pulse lengths to subtle tactile bounds [6 ms .. 72 ms].
 */
export function scaleHapticPattern(
  pattern: readonly number[],
  intensityScale = 1,
): number[] {
  const safeScale = Math.max(0.65, Math.min(1.35, Number.isFinite(intensityScale) ? intensityScale : 1));
  return pattern.map((ms, idx) => {
    if (idx % 2 === 1) {
      // Preserve crisp pause spacing between pulses
      return Math.max(8, Math.round(ms));
    }
    return Math.max(6, Math.min(72, Math.round(ms * safeScale)));
  });
}

/**
 * Returns a scaled vibration pulse sequence for the given severity tier.
 */
export function getVibrationPatternForSeverity(
  severity: HapticSeverity,
  intensityScale = 1,
): number[] {
  const spec = HAPTIC_SEVERITY_PATTERNS[severity];
  return scaleHapticPattern(spec.pattern, intensityScale);
}

export function computePatternDurationMs(pattern: readonly number[]): number {
  let total = 0;
  for (let i = 0; i < pattern.length; i++) {
    total += Math.max(0, pattern[i]);
  }
  return total;
}

export function loadSavedHapticsEnabled(fallback = true): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return fallback;
  try {
    const raw = window.localStorage.getItem(HAPTICS_ENABLED_STORAGE_KEY);
    if (raw === '0' || raw === 'false') return false;
    if (raw === '1' || raw === 'true') return true;
  } catch {
    // Ignore storage read failures in private/restricted webviews
  }
  return fallback;
}

export function saveHapticsEnabled(enabled: boolean): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(HAPTICS_ENABLED_STORAGE_KEY, enabled ? '1' : '0');
  } catch {
    // Ignore storage write failures
  }
}

function defaultNowMs(): number {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}

export class HapticFeedbackEngine {
  private readonly vibrateFn: VibrateFn | null;
  private readonly nowFn: () => number;
  private enabled: boolean;
  private readonly lastTriggerMs = new Map<string, number>();
  private activeUntilMs = 0;
  private activePriority = 0;

  constructor(options: HapticEngineOptions = {}) {
    if (options.vibrateFn !== undefined) {
      this.vibrateFn = options.vibrateFn;
    } else if (isVibrationApiSupported()) {
      this.vibrateFn = (pattern) => navigator.vibrate(pattern);
    } else {
      this.vibrateFn = null;
    }
    this.nowFn = options.nowFn ?? defaultNowMs;
    this.enabled =
      options.initialEnabled !== undefined
        ? options.initialEnabled
        : loadSavedHapticsEnabled(true);
  }

  public isSupported(): boolean {
    return this.vibrateFn !== null;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(enabled: boolean, persist = true): void {
    this.enabled = enabled;
    if (persist) {
      saveHapticsEnabled(enabled);
    }
    if (!enabled) {
      this.cancel();
    }
  }

  /**
   * Triggers a subtle mobile haptic pattern directly from a severity tier.
   * Returns true if the Vibration API was invoked, false if suppressed/unsupported.
   */
  public triggerBySeverity(severity: HapticSeverity, intensityScale = 1): boolean {
    const spec = HAPTIC_SEVERITY_PATTERNS[severity];
    if (!spec) return false;
    return this.dispatchSpec(`severity:${severity}`, spec, intensityScale);
  }

  /**
   * Triggers a subtle mobile haptic pattern for a named gameplay event.
   * Returns true if the Vibration API was invoked, false if suppressed/unsupported.
   */
  public trigger(event: HapticEvent, intensityScale = 1): boolean {
    const spec = HAPTIC_PATTERNS[event];
    if (!spec) return false;
    return this.dispatchSpec(`event:${event}`, spec, intensityScale);
  }

  /**
   * Resolves event severity for a combat hit (dealt or received) and fires the
   * corresponding vibration cadence scaled subtly by strike impact.
   */
  public triggerCombatHit(input: CombatHitHapticInput): boolean {
    const severity = resolveCombatHitSeverity(input);
    const ratio = Number.isFinite(input.damageRatio) ? Math.max(0, Math.min(1, input.damageRatio ?? 0)) : 0;
    const bossBoost = input.isBoss ? 0.1 : 0;
    const scale = 0.92 + ratio * 0.24 + bossBoost;
    return this.triggerBySeverity(severity, scale);
  }

  /**
   * Triggers an ascending multi-pulse haptic resonance for a cultivation tier
   * breakthrough, intensifying subtly for higher tiers and final human ascension.
   */
  public triggerBreakthrough(level: number, isFinalAscension = false): boolean {
    const clampedLevel = Math.max(1, Math.min(12, Number.isFinite(level) ? level : 1));
    const scale = 0.92 + ((clampedLevel - 1) / 11) * 0.2 + (isFinalAscension ? 0.12 : 0);
    return this.triggerBySeverity('breakthrough', scale);
  }

  /** Stops any currently playing vibration pattern cleanly (e.g. on pause or reset). */
  public cancel(): void {
    this.activeUntilMs = 0;
    this.activePriority = 0;
    if (!this.vibrateFn) return;
    try {
      this.vibrateFn(0);
    } catch {
      // Ignore cancellation errors on unsupported hosts
    }
  }

  private dispatchSpec(
    throttleKey: string,
    spec: HapticSeveritySpec,
    intensityScale: number,
  ): boolean {
    if (!this.enabled || !this.vibrateFn) return false;

    const now = this.nowFn();
    const lastFired = this.lastTriggerMs.get(throttleKey);
    if (lastFired !== undefined && now - lastFired < spec.minIntervalMs) {
      return false;
    }

    // Never allow a low-priority micro-tap to clip an active higher-priority combat pulse
    if (now < this.activeUntilMs && spec.priority < this.activePriority) {
      return false;
    }

    const scaled = scaleHapticPattern(spec.pattern, intensityScale);
    const payload: number | number[] = scaled.length === 1 ? scaled[0] : scaled;

    try {
      const ok = this.vibrateFn(payload);
      if (ok !== false) {
        this.lastTriggerMs.set(throttleKey, now);
        this.activeUntilMs = now + computePatternDurationMs(scaled);
        this.activePriority = spec.priority;
        return true;
      }
    } catch {
      // Safely ignore security/gesture-lock errors in embedded iframes or strict webviews
    }
    return false;
  }
}
