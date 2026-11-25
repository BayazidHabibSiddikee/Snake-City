import { BeastKind, WeatherMode, WildBeast } from './types';

export type ComplimentEventKind =
  | 'expedition_start'
  | 'roaming'
  | 'combo'
  | 'combat_parry'
  | 'combat_victory'
  | 'peak_conquered'
  | 'climate_endured'
  | 'evolution';

export type TauntMoment = 'engage' | 'parry' | 'stagger' | 'execute';

export interface EnemyTauntProfile {
  badgeLabel: string;
  archetype: string;
  accentHex: string;
}

export const ENEMY_TAUNT_PROFILES: Record<BeastKind, EnemyTauntProfile> = {
  wolf: {
    badgeLabel: 'VS PACK STALKER',
    archetype: 'fang-baring pack predator',
    accentHex: '#38bdf8',
  },
  boar: {
    badgeLabel: 'VS IRON TUSK',
    archetype: 'armored crag charger',
    accentHex: '#fb923c',
  },
  eagle: {
    badgeLabel: 'VS SKY TALON',
    archetype: 'diving gale raptor',
    accentHex: '#22d3ee',
  },
  guardian: {
    badgeLabel: 'VS PEAK GUARDIAN',
    archetype: 'ancient summit colossus',
    accentHex: '#facc15',
  },
  wraith: {
    badgeLabel: 'VS NETHER WRAITH',
    archetype: 'Ghost Clan shadow assassin',
    accentHex: '#34d399',
  },
  soul_elder: {
    badgeLabel: 'VS SOUL REAPER',
    archetype: 'Soul Hall chain reaper',
    accentHex: '#e879f9',
  },
};

export const TAUNT_MOMENT_TAGS: Record<TauntMoment, string> = {
  engage: 'CLASH TAUNT',
  parry: 'PARRY RIPOSTE',
  stagger: 'GUARD SHATTER',
  execute: 'VANQUISH',
};

export interface TauntRequestContext {
  enemyKind: BeastKind;
  enemyName: string;
  enemyFaction: WildBeast['faction'];
  isBoss: boolean;
  moment: TauntMoment;
  stageTitle: string;
  level: number;
  realmName: string;
  hasGun: boolean;
  weather: WeatherMode;
}

export interface FloatingTauntNotice {
  text: string;
  enemyKind: BeastKind;
  enemyName: string;
  moment: TauntMoment;
  badgeLabel: string;
  accentHex: string;
  isError?: boolean;
}

/**
 * Pure helper to format and sanitize a floating speech bubble taunt notice
 * tailored to the target enemy type and combat moment.
 */
export function formatFloatingTauntNotice(
  rawText: string,
  enemyKind: BeastKind,
  enemyName: string,
  moment: TauntMoment,
  isError = false,
): FloatingTauntNotice {
  const profile = ENEMY_TAUNT_PROFILES[enemyKind] ?? ENEMY_TAUNT_PROFILES.wolf;
  const momentTag = TAUNT_MOMENT_TAGS[moment] ?? TAUNT_MOMENT_TAGS.engage;
  const cleanedText = rawText
    .replace(/^["'“”]+|["'“”]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);

  return {
    text: cleanedText || 'Face my coils!',
    enemyKind,
    enemyName,
    moment,
    badgeLabel: isError ? 'TAUNT VOICE UNAVAILABLE' : `${profile.badgeLabel} · ${momentTag}`,
    accentHex: isError ? '#f87171' : profile.accentHex,
    isError,
  };
}

export interface ComplimentRequestContext {
  event: ComplimentEventKind;
  stageTitle: string;
  level: number;
  realmName: string;
  weather: WeatherMode;
  enemyName?: string;
  combo?: number;
  peaksVisited: number;
}

export interface ComplimentNotice {
  text: string;
  event: ComplimentEventKind;
  label: string;
  isError?: boolean;
}

export const COMPLIMENT_EVENT_LABELS: Record<ComplimentEventKind, string> = {
  expedition_start: 'Mountain Spirit',
  roaming: 'Spirit Whisper',
  combo: 'Graceful Flow',
  combat_parry: 'Masterful Clash',
  combat_victory: 'Duel Praise',
  peak_conquered: 'Peak Tribute',
  climate_endured: 'Steadfast Spirit',
  evolution: 'Ascension Praise',
};

/**
 * Client-side orchestrator for live Gemini serpent compliments via /api/compliment.
 * Handles request pacing, duplicate suppression, and clean retry/error propagation.
 */
export class SerpentComplimentOracle {
  private inFlight = false;
  private lastRequestAt = 0;
  private recentCompliments: string[] = [];
  private consecutiveErrors = 0;

  public resetSession(): void {
    this.lastRequestAt = 0;
    this.consecutiveErrors = 0;
  }

  public canRequest(priority: 'normal' | 'high' = 'normal'): boolean {
    if (this.inFlight) return false;
    const now = Date.now();
    const minIntervalMs = priority === 'high' ? 7500 : 14000;
    const backoffMs = this.consecutiveErrors > 0 ? Math.min(45000, this.consecutiveErrors * 12000) : 0;
    return now - this.lastRequestAt >= Math.max(minIntervalMs, backoffMs);
  }

  public async requestCompliment(
    ctx: ComplimentRequestContext,
    priority: 'normal' | 'high' = 'normal',
  ): Promise<ComplimentNotice | null> {
    if (!this.canRequest(priority)) return null;
    this.inFlight = true;
    this.lastRequestAt = Date.now();

    const payload = {
      ...ctx,
      recentCompliments: this.recentCompliments.slice(-5),
    };

    try {
      let lastErr = 'Unable to reach the compliment spirit right now.';
      for (let attempt = 0; attempt < 2; attempt++) {
        const res = await fetch('/api/compliment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        let data: { compliment?: string; error?: string } = {};
        try {
          data = (await res.json()) as { compliment?: string; error?: string };
        } catch {
          data = {};
        }

        if (res.ok && typeof data.compliment === 'string' && data.compliment.trim()) {
          const text = data.compliment.trim();
          this.consecutiveErrors = 0;
          this.recentCompliments.push(text);
          if (this.recentCompliments.length > 8) {
            this.recentCompliments.shift();
          }
          return {
            text,
            event: ctx.event,
            label: COMPLIMENT_EVENT_LABELS[ctx.event],
          };
        }

        lastErr = data.error || `Compliment service error (${res.status})`;
        // Do not retry 4xx configuration/auth/quota errors
        if (res.status >= 400 && res.status < 500) {
          break;
        }
        if (attempt === 0) {
          await new Promise((resolve) => window.setTimeout(resolve, 450));
        }
      }

      this.consecutiveErrors++;
      return {
        text: lastErr,
        event: ctx.event,
        label: 'Spirit Voice Unavailable',
        isError: true,
      };
    } catch {
      this.consecutiveErrors++;
      return {
        text: 'Could not reach the compliment service. Check your connection.',
        event: ctx.event,
        label: 'Spirit Voice Unavailable',
        isError: true,
      };
    } finally {
      this.inFlight = false;
    }
  }
}

/**
 * Client-side orchestrator for live Gemini floating combat taunts via /api/taunt.
 * Generates enemy-specific taunts displayed in a 3D-tracked speech bubble above the serpent.
 */
export class SerpentTauntOracle {
  private inFlight = false;
  private lastRequestAt = 0;
  private recentTaunts: string[] = [];
  private consecutiveErrors = 0;

  public resetSession(): void {
    this.lastRequestAt = 0;
    this.consecutiveErrors = 0;
  }

  public canRequest(priority: 'normal' | 'high' = 'normal'): boolean {
    if (this.inFlight) return false;
    const now = Date.now();
    const minIntervalMs = priority === 'high' ? 4000 : 8500;
    const backoffMs = this.consecutiveErrors > 0 ? Math.min(36000, this.consecutiveErrors * 10000) : 0;
    return now - this.lastRequestAt >= Math.max(minIntervalMs, backoffMs);
  }

  public async requestTaunt(
    ctx: TauntRequestContext,
    priority: 'normal' | 'high' = 'normal',
  ): Promise<FloatingTauntNotice | null> {
    if (!this.canRequest(priority)) return null;
    this.inFlight = true;
    this.lastRequestAt = Date.now();

    const payload = {
      ...ctx,
      recentTaunts: this.recentTaunts.slice(-5),
    };

    try {
      let lastErr = 'Unable to reach Gemini combat taunt service.';
      for (let attempt = 0; attempt < 2; attempt++) {
        const res = await fetch('/api/taunt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        let data: { taunt?: string; error?: string } = {};
        try {
          data = (await res.json()) as { taunt?: string; error?: string };
        } catch {
          data = {};
        }

        if (res.ok && typeof data.taunt === 'string' && data.taunt.trim()) {
          const text = data.taunt.trim();
          this.consecutiveErrors = 0;
          this.recentTaunts.push(text);
          if (this.recentTaunts.length > 8) {
            this.recentTaunts.shift();
          }
          return formatFloatingTauntNotice(text, ctx.enemyKind, ctx.enemyName, ctx.moment, false);
        }

        lastErr = data.error || `Combat taunt service error (${res.status})`;
        if (res.status >= 400 && res.status < 500) {
          break;
        }
        if (attempt === 0) {
          await new Promise((resolve) => window.setTimeout(resolve, 400));
        }
      }

      this.consecutiveErrors++;
      return formatFloatingTauntNotice(lastErr, ctx.enemyKind, ctx.enemyName, ctx.moment, true);
    } catch {
      this.consecutiveErrors++;
      return formatFloatingTauntNotice(
        'Could not reach combat taunt service.',
        ctx.enemyKind,
        ctx.enemyName,
        ctx.moment,
        true,
      );
    } finally {
      this.inFlight = false;
    }
  }
}
