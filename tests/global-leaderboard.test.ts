import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { GlobalRankingEntry } from '../src/ranking.ts';
import {
  classifyLeaderboardError,
  computeLeaderboardStanding,
  escapeLeaderboardHtml,
  filterLeaderboardEntries,
  formatCultivationProgressPercent,
  formatRelativeTime,
  getCanonicalRealmName,
  getCanonicalStageTitle,
  readLocalCultivationSnapshot,
  sanitizeLeaderboardCallsign,
  sortLeaderboardEntries,
  type StorageLike,
} from '../src/components/globalLeaderboardHelpers.ts';

function makeEntry(overrides: Partial<GlobalRankingEntry> = {}): GlobalRankingEntry {
  return {
    userId: 'uid-1',
    displayName: 'Jade Sovereign',
    score: 12000,
    level: 8,
    xp: 24500,
    stageTitle: 'Naga Initiate',
    realmName: 'Dou Zong',
    shrinesConquered: 7,
    soulsCollected: 9,
    bestiaryCount: 6,
    isHuman: false,
    biome: 'mountain',
    weather: 'clear',
    speedPreset: 'classic',
    submissionsCount: 2,
    portalWave: 3,
    createdAtMs: 1_700_000_000_000,
    updatedAtMs: 1_700_000_500_000,
    ...overrides,
  };
}

describe('globalLeaderboardHelpers', () => {
  it('sorts leaderboard entries across score, cultivation, shrines, and souls modes', () => {
    const entries = [
      makeEntry({ userId: 'a', displayName: 'Alpha', score: 9000, level: 12, xp: 80000, shrinesConquered: 12, soulsCollected: 5 }),
      makeEntry({ userId: 'b', displayName: 'Beta', score: 25000, level: 6, xp: 12000, shrinesConquered: 4, soulsCollected: 14 }),
      makeEntry({ userId: 'c', displayName: 'Gamma', score: 15000, level: 12, xp: 95000, shrinesConquered: 10, soulsCollected: 11 }),
    ];

    assert.deepEqual(
      sortLeaderboardEntries(entries, 'score').map((e) => e.userId),
      ['b', 'c', 'a'],
    );
    assert.deepEqual(
      sortLeaderboardEntries(entries, 'cultivation').map((e) => e.userId),
      ['c', 'a', 'b'],
    );
    assert.deepEqual(
      sortLeaderboardEntries(entries, 'shrines').map((e) => e.userId),
      ['a', 'c', 'b'],
    );
    assert.deepEqual(
      sortLeaderboardEntries(entries, 'souls').map((e) => e.userId),
      ['b', 'c', 'a'],
    );
  });

  it('filters entries case-insensitively by callsign, stage title, or realm name', () => {
    const entries = [
      makeEntry({ userId: '1', displayName: 'Azure Viper', stageTitle: 'Cloud Serpent', realmName: 'Dou Huang' }),
      makeEntry({ userId: '2', displayName: 'Xiao Yan', stageTitle: 'Ascended Human', realmName: 'Dou Di' }),
      makeEntry({ userId: '3', displayName: 'Mist Walker', stageTitle: 'Foothill Viper', realmName: 'Dou Zhe' }),
    ];

    assert.equal(filterLeaderboardEntries(entries, '').length, 3);
    assert.deepEqual(
      filterLeaderboardEntries(entries, '  xiao ').map((e) => e.userId),
      ['2'],
    );
    assert.deepEqual(
      filterLeaderboardEntries(entries, 'dou huang').map((e) => e.userId),
      ['1'],
    );
    assert.deepEqual(
      filterLeaderboardEntries(entries, 'viper').map((e) => e.userId),
      ['1', '3'],
    );
  });

  it('computes submitted and projected standings accurately', () => {
    const sorted = sortLeaderboardEntries(
      [
        makeEntry({ userId: 'u1', displayName: 'TopOne', score: 30000 }),
        makeEntry({ userId: 'u2', displayName: 'Second', score: 20000 }),
        makeEntry({ userId: 'u3', displayName: 'Third', score: 10000 }),
      ],
      'score',
    );

    const submitted = computeLeaderboardStanding(sorted, 20000, 'u2');
    assert.equal(submitted.isSubmitted, true);
    assert.equal(submitted.rank, 2);
    assert.equal(submitted.totalEntries, 3);
    assert.equal(submitted.nextRival?.userId, 'u1');
    assert.equal(submitted.scoreGapToNext, 10000);

    const projected = computeLeaderboardStanding(sorted, 15000, 'unlisted');
    assert.equal(projected.isSubmitted, false);
    assert.equal(projected.rank, 3);
    assert.equal(projected.nextRival?.userId, 'u2');
    assert.equal(projected.scoreGapToNext, 5000);
  });

  it('classifies Firestore quota, offline, permission, and generic errors cleanly', () => {
    const quota = classifyLeaderboardError(new Error('Firestore Error: Quota exceeded for project'));
    assert.equal(quota.kind, 'quota');
    assert.match(quota.message, /free-tier daily quota/i);

    const offline = classifyLeaderboardError('Failed to get document because the client is offline.');
    assert.equal(offline.kind, 'offline');

    const perm = classifyLeaderboardError('Missing or insufficient permissions.');
    assert.equal(perm.kind, 'permission');

    const unavailable = classifyLeaderboardError('Firebase is not initialized.');
    assert.equal(unavailable.kind, 'unavailable');

    const generic = classifyLeaderboardError('Unexpected stream reset');
    assert.equal(generic.kind, 'generic');
  });

  it('formats relative update times and stage progress percentages cleanly', () => {
    const now = 1_700_100_000_000;
    assert.equal(formatRelativeTime(0, now), '—');
    assert.equal(formatRelativeTime(now - 25_000, now), 'Just now');
    assert.equal(formatRelativeTime(now - 5 * 60_000, now), '5m ago');
    assert.equal(formatRelativeTime(now - 4 * 3_600_000, now), '4h ago');
    assert.equal(formatRelativeTime(now - 3 * 86_400_000, now), '3d ago');

    assert.equal(formatCultivationProgressPercent(1), 8);
    assert.equal(formatCultivationProgressPercent(6), 50);
    assert.equal(formatCultivationProgressPercent(12), 100);
    assert.equal(getCanonicalStageTitle(12), 'Ascended Human');
    assert.equal(getCanonicalRealmName(12), 'Dou Di');
  });

  it('escapes HTML and sanitizes callsigns safely', () => {
    assert.equal(escapeLeaderboardHtml('<script>"alert&\'x</script>'), '&lt;script&gt;&quot;alert&amp;&#39;x&lt;/script&gt;');
    assert.equal(sanitizeLeaderboardCallsign('  Jade <Dragon>  '), 'Jade Dragon');
    assert.equal(sanitizeLeaderboardCallsign('@@@###'), 'Jade Cultivator');
  });

  it('reads local saved Serpent Peaks cultivation progress from storage', () => {
    const data: Record<string, string> = {
      SERPENT_PEAKS_BEST_SCORE: '18450',
      SERPENT_PEAKS_JOURNEY_V1: JSON.stringify({
        level: 9,
        xp: 31200,
        visitedLandmarkIds: ['p1', 'p2', 'p3', 'p4', 'p5'],
        bestiary: {
          wolf: { discovered: true },
          phoenix: { discovered: true },
          yeti: { discovered: false },
        },
      }),
      SERPENT_PEAKS_SOUL_MISSIONS_V1: JSON.stringify({
        collectedSouls: 8,
      }),
    };
    const mockStorage: StorageLike = {
      getItem: (key) => data[key] ?? null,
    };

    const snap = readLocalCultivationSnapshot('Alpine Sage', mockStorage);
    assert.equal(snap.hasProgress, true);
    assert.equal(snap.submission.displayName, 'Alpine Sage');
    assert.equal(snap.submission.score, 18450);
    assert.equal(snap.submission.level, 9);
    assert.equal(snap.submission.xp, 31200);
    assert.equal(snap.submission.stageTitle, 'Mountain Naga');
    assert.equal(snap.submission.realmName, 'Dou Zun');
    assert.equal(snap.submission.shrinesConquered, 5);
    assert.equal(snap.submission.soulsCollected, 8);
    assert.equal(snap.submission.bestiaryCount, 2);
    assert.equal(snap.submission.isHuman, false);
  });
});
