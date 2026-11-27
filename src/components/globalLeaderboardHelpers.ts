import type {
  CultivationSubmissionInput,
  GlobalRankingEntry,
  PlayerRankingStanding,
  RankingSortMode,
} from '../ranking';

export const CANONICAL_STAGE_TITLES: readonly string[] = [
  'Valley Hatchling',
  'Foothill Viper',
  'Ridge Python',
  'Horned Adder',
  'Highland Wyrm',
  'Cliffside Drake',
  'Cloud Serpent',
  'Naga Initiate',
  'Mountain Naga',
  'Half-Human Mystic',
  'Almost Human',
  'Ascended Human',
];

export const CANONICAL_REALM_NAMES: readonly string[] = [
  'Dou Zhi Qi',
  'Dou Zhe',
  'Dou Shi',
  'Da Dou Shi',
  'Dou Ling',
  'Dou Wang',
  'Dou Huang',
  'Dou Zong',
  'Dou Zun',
  'Ban Sheng',
  'Dou Sheng',
  'Dou Di',
];

export interface StorageLike {
  getItem(key: string): string | null;
}

export interface LocalCultivationSummary {
  hasProgress: boolean;
  submission: CultivationSubmissionInput;
}

export type LeaderboardErrorKind =
  | 'quota'
  | 'offline'
  | 'permission'
  | 'unavailable'
  | 'generic';

export interface ClassifiedLeaderboardError {
  kind: LeaderboardErrorKind;
  title: string;
  message: string;
}

export function escapeLeaderboardHtml(raw: string): string {
  return String(raw).replace(/[<>&"']/g, (ch) => {
    switch (ch) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case '"':
        return '&quot;';
      case "'":
        return '&#39;';
      default:
        return ch;
    }
  });
}

export function sanitizeLeaderboardCallsign(raw: string | null | undefined): string {
  const cleaned = String(raw ?? '')
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9_ \-'.!()[\]]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 32);
  return cleaned.length >= 1 ? cleaned : 'Jade Cultivator';
}

export function getCanonicalStageTitle(level: number): string {
  const idx = Math.max(0, Math.min(CANONICAL_STAGE_TITLES.length - 1, Math.round(level) - 1));
  return CANONICAL_STAGE_TITLES[idx] ?? CANONICAL_STAGE_TITLES[0];
}

export function getCanonicalRealmName(level: number): string {
  const idx = Math.max(0, Math.min(CANONICAL_REALM_NAMES.length - 1, Math.round(level) - 1));
  return CANONICAL_REALM_NAMES[idx] ?? CANONICAL_REALM_NAMES[0];
}

export function formatCultivationProgressPercent(level: number): number {
  if (!Number.isFinite(level)) return 8;
  const clamped = Math.max(1, Math.min(12, Math.round(level)));
  return Math.round((clamped / 12) * 100);
}

export function sortLeaderboardEntries(
  entries: readonly GlobalRankingEntry[],
  sortMode: RankingSortMode,
): GlobalRankingEntry[] {
  const copy = [...entries];
  copy.sort((a, b) => {
    if (sortMode === 'cultivation') {
      if (b.level !== a.level) return b.level - a.level;
      if (b.xp !== a.xp) return b.xp - a.xp;
      return b.score - a.score;
    }
    if (sortMode === 'souls') {
      if (b.soulsCollected !== a.soulsCollected) return b.soulsCollected - a.soulsCollected;
      if (b.level !== a.level) return b.level - a.level;
      return b.score - a.score;
    }
    if (sortMode === 'shrines') {
      if (b.shrinesConquered !== a.shrinesConquered) return b.shrinesConquered - a.shrinesConquered;
      if (b.level !== a.level) return b.level - a.level;
      return b.score - a.score;
    }
    if (b.score !== a.score) return b.score - a.score;
    if (b.level !== a.level) return b.level - a.level;
    return b.xp - a.xp;
  });
  return copy;
}

export function filterLeaderboardEntries(
  entries: readonly GlobalRankingEntry[],
  searchQuery: string,
): GlobalRankingEntry[] {
  const q = searchQuery.trim().toLowerCase();
  if (!q) return [...entries];
  return entries.filter((entry) => {
    return (
      entry.displayName.toLowerCase().includes(q) ||
      entry.stageTitle.toLowerCase().includes(q) ||
      entry.realmName.toLowerCase().includes(q)
    );
  });
}

export function computeLeaderboardStanding(
  sortedEntries: readonly GlobalRankingEntry[],
  currentScore: number,
  currentUserId: string | null,
): PlayerRankingStanding {
  const totalEntries = sortedEntries.length;
  const leader = sortedEntries[0] ?? null;

  if (currentUserId) {
    const idx = sortedEntries.findIndex((e) => e.userId === currentUserId);
    if (idx >= 0) {
      const rank = idx + 1;
      const nextRival = idx > 0 ? sortedEntries[idx - 1] : null;
      const scoreGapToNext = nextRival ? Math.max(0, nextRival.score - sortedEntries[idx].score) : 0;
      const percentileTop = Math.max(
        1,
        Math.min(100, Math.ceil((rank / Math.max(1, totalEntries)) * 100)),
      );
      return {
        rank,
        totalEntries,
        percentileTop,
        isSubmitted: true,
        nextRival,
        leader,
        scoreGapToNext,
      };
    }
  }

  let projectedRank = 1;
  for (const entry of sortedEntries) {
    if (entry.score > currentScore) {
      projectedRank++;
    } else {
      break;
    }
  }
  const projectedTotal = totalEntries + 1;
  const nextRival = projectedRank > 1 ? sortedEntries[projectedRank - 2] ?? null : null;
  const scoreGapToNext = nextRival ? Math.max(0, nextRival.score - currentScore) : 0;
  const percentileTop = Math.max(
    1,
    Math.min(100, Math.ceil((projectedRank / projectedTotal) * 100)),
  );

  return {
    rank: projectedRank,
    totalEntries,
    percentileTop,
    isSubmitted: false,
    nextRival,
    leader,
    scoreGapToNext,
  };
}

export function formatRelativeTime(updatedAtMs: number, nowMs: number = Date.now()): string {
  if (!Number.isFinite(updatedAtMs) || updatedAtMs <= 0) return '—';
  const diffSec = Math.max(0, Math.floor((nowMs - updatedAtMs) / 1000));
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths}mo ago`;
}

export function classifyLeaderboardError(rawError: unknown): ClassifiedLeaderboardError {
  const raw =
    rawError instanceof Error
      ? rawError.message
      : typeof rawError === 'string'
        ? rawError
        : String(rawError ?? '');
  const lower = raw.toLowerCase();

  if (lower.includes('quota exceeded') || lower.includes('resource-exhausted')) {
    return {
      kind: 'quota',
      title: 'Daily Leaderboard Quota Reached',
      message:
        'The Firebase Firestore free-tier daily quota has been exceeded. Rankings will automatically resume tomorrow, or the project owner can upgrade the Firebase billing plan to increase capacity.',
    };
  }

  if (
    lower.includes('client is offline') ||
    lower.includes('network') ||
    lower.includes('failed to fetch') ||
    lower.includes('unavailable')
  ) {
    return {
      kind: 'offline',
      title: 'Unable to Reach Firebase',
      message:
        'Could not connect to the Global Leaderboard service right now. Check your internet connection and try refreshing.',
    };
  }

  if (lower.includes('permission') || lower.includes('insufficient')) {
    return {
      kind: 'permission',
      title: 'Access Verification Required',
      message:
        'Firestore security rules rejected this request. Make sure you are signed in with a verified Google account before submitting a record.',
    };
  }

  if (lower.includes('not initialized')) {
    return {
      kind: 'unavailable',
      title: 'Leaderboard Service Offline',
      message:
        'Firebase is not configured in this environment. You can still play and save your cultivation progress locally.',
    };
  }

  return {
    kind: 'generic',
    title: 'Sync Interrupted',
    message:
      'Unable to synchronize the Global Cultivation Leaderboard right now. Try refreshing in a moment.',
  };
}

/**
 * Reads local Serpent Peaks cultivation progress from storage (without touching Three.js)
 * so players can inspect and inscribe their saved progress directly from the front-page modal.
 */
export function readLocalCultivationSnapshot(
  callsign: string,
  storage?: StorageLike | null,
): LocalCultivationSummary {
  const safeName = sanitizeLeaderboardCallsign(callsign);
  const defaultSummary: LocalCultivationSummary = {
    hasProgress: false,
    submission: {
      displayName: safeName,
      score: 0,
      level: 1,
      xp: 0,
      stageTitle: getCanonicalStageTitle(1),
      realmName: getCanonicalRealmName(1),
      shrinesConquered: 0,
      soulsCollected: 0,
      bestiaryCount: 0,
      isHuman: false,
      biome: 'mountain',
      weather: 'clear',
      speedPreset: 'classic',
      portalWave: 0,
      preserveHigherRecord: true,
    },
  };

  const store =
    storage !== undefined
      ? storage
      : typeof window !== 'undefined' && window.localStorage
        ? window.localStorage
        : null;
  if (!store) return defaultSummary;

  try {
    const rawJourney = store.getItem('SERPENT_PEAKS_JOURNEY_V1');
    const rawBest = store.getItem('SERPENT_PEAKS_BEST_SCORE');
    const rawMissions = store.getItem('SERPENT_PEAKS_SOUL_MISSIONS_V1');

    const bestScore = rawBest ? Math.max(0, Math.min(100_000_000, parseInt(rawBest, 10) || 0)) : 0;

    let level = 1;
    let xp = 0;
    let shrinesConquered = 0;
    let bestiaryCount = 0;

    if (rawJourney) {
      const parsed = JSON.parse(rawJourney) as {
        level?: unknown;
        xp?: unknown;
        visitedLandmarkIds?: unknown;
        bestiary?: Record<string, { discovered?: boolean }>;
      };
      if (typeof parsed.level === 'number' && Number.isFinite(parsed.level)) {
        level = Math.max(1, Math.min(12, Math.round(parsed.level)));
      }
      if (typeof parsed.xp === 'number' && Number.isFinite(parsed.xp)) {
        xp = Math.max(0, Math.min(100_000_000, Math.round(parsed.xp)));
      }
      if (Array.isArray(parsed.visitedLandmarkIds)) {
        shrinesConquered = Math.max(
          0,
          Math.min(12, parsed.visitedLandmarkIds.filter((s) => typeof s === 'string').length),
        );
      }
      if (parsed.bestiary && typeof parsed.bestiary === 'object') {
        const discovered = Object.values(parsed.bestiary).filter(
          (rec) => rec && typeof rec === 'object' && Boolean(rec.discovered),
        ).length;
        bestiaryCount = Math.max(0, Math.min(20, discovered));
      }
    }

    let soulsCollected = 0;
    if (rawMissions) {
      const parsedMissions = JSON.parse(rawMissions) as { collectedSouls?: unknown };
      if (
        typeof parsedMissions.collectedSouls === 'number' &&
        Number.isFinite(parsedMissions.collectedSouls)
      ) {
        soulsCollected = Math.max(0, Math.min(14, Math.floor(parsedMissions.collectedSouls)));
      }
    }

    const hasProgress =
      bestScore > 0 || level > 1 || xp > 0 || shrinesConquered > 0 || soulsCollected > 0;

    return {
      hasProgress,
      submission: {
        displayName: safeName,
        score: bestScore,
        level,
        xp,
        stageTitle: getCanonicalStageTitle(level),
        realmName: getCanonicalRealmName(level),
        shrinesConquered,
        soulsCollected,
        bestiaryCount,
        isHuman: level >= 12,
        biome: 'mountain',
        weather: 'clear',
        speedPreset: 'classic',
        portalWave: 0,
        preserveHigherRecord: true,
      },
    };
  } catch {
    return defaultSummary;
  }
}
