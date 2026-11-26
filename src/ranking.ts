import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { isDeepWater, isInWorldBounds, WORLD_LANDMARKS } from './terrain';
import {
  BiomeId,
  FormationProp,
  SpeedPreset,
  WeatherMode,
  WORLD_PLAY_RADIUS,
} from './types';

export const GLOBAL_RANKINGS_COLLECTION = 'globalRankings';

// Verbatim constraints synchronized with firebase-blueprint.json & firestore.rules
export const RANKING_CALLSIGN_MAX_LEN = 32;
export const RANKING_CALLSIGN_PATTERN = /^[a-zA-Z0-9_ \-'.!()[\]]{1,32}$/;
export const RANKING_STAGE_TITLE_MAX_LEN = 48;
export const RANKING_REALM_NAME_MAX_LEN = 40;
export const RANKING_MAX_SCORE = 100_000_000;
export const RANKING_MAX_XP = 100_000_000;
export const RANKING_QUERY_LIMIT_MAX = 100;

const VALID_BIOMES: ReadonlySet<BiomeId> = new Set(['mountain', 'jungle']);
const VALID_WEATHERS: ReadonlySet<WeatherMode> = new Set([
  'clear',
  'mist',
  'fog',
  'rain',
  'storm',
  'blizzard',
  'ashstorm',
]);
const VALID_SPEED_PRESETS: ReadonlySet<SpeedPreset> = new Set(['chill', 'classic', 'turbo']);

export const GLOBAL_RANKING_PORTAL_CONFIG = {
  firstSpawnDelaySec: 18,
  activeDurationSec: 75,
  cooldownMinSec: 55,
  cooldownMaxSec: 85,
  triggerRadius: 6.2,
  minSpawnDistFromPlayer: 52,
  maxSpawnDistFromPlayer: 132,
  portalSubmissionBonusXp: 150,
} as const;

export type RankingSortMode = 'score' | 'cultivation' | 'souls' | 'shrines';

export interface GlobalRankingEntry {
  userId: string;
  displayName: string;
  score: number;
  level: number;
  xp: number;
  stageTitle: string;
  realmName: string;
  shrinesConquered: number;
  soulsCollected: number;
  bestiaryCount: number;
  isHuman: boolean;
  biome: BiomeId;
  weather: WeatherMode;
  speedPreset: SpeedPreset;
  submissionsCount: number;
  portalWave: number;
  createdAtMs: number;
  updatedAtMs: number;
}

export interface CultivationSubmissionInput {
  displayName: string;
  score: number;
  level: number;
  xp: number;
  stageTitle: string;
  realmName: string;
  shrinesConquered: number;
  soulsCollected: number;
  bestiaryCount: number;
  isHuman: boolean;
  biome: BiomeId;
  weather: WeatherMode;
  speedPreset: SpeedPreset;
  portalWave: number;
  preserveHigherRecord?: boolean;
}

export interface SanitizedRankingPayload {
  userId: string;
  displayName: string;
  score: number;
  level: number;
  xp: number;
  stageTitle: string;
  realmName: string;
  shrinesConquered: number;
  soulsCollected: number;
  bestiaryCount: number;
  isHuman: boolean;
  biome: BiomeId;
  weather: WeatherMode;
  speedPreset: SpeedPreset;
  submissionsCount: number;
  portalWave: number;
}

export interface PlayerRankingStanding {
  rank: number; // 1-based position (projected if not yet submitted)
  totalEntries: number;
  percentileTop: number; // 1..100 (lower is better, e.g. Top 10%)
  isSubmitted: boolean;
  nextRival: GlobalRankingEntry | null;
  leader: GlobalRankingEntry | null;
  scoreGapToNext: number;
}

/**
 * Sanitizes any player display name to strictly conform to firebase-blueprint.json & firestore.rules.
 */
export function sanitizeCallsign(raw: string | null | undefined): string {
  const cleaned = String(raw ?? '')
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9_ \-'.!()[\]]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, RANKING_CALLSIGN_MAX_LEN);
  if (cleaned.length >= 1 && RANKING_CALLSIGN_PATTERN.test(cleaned)) {
    return cleaned;
  }
  return 'Jade Cultivator';
}

function clampInt(val: number, min: number, max: number): number {
  if (!Number.isFinite(val)) return min;
  return Math.max(min, Math.min(max, Math.round(val)));
}

function clampNum(val: number, min: number, max: number): number {
  if (!Number.isFinite(val)) return min;
  return Math.max(min, Math.min(max, Math.round(val)));
}

function sanitizeLabel(raw: string | null | undefined, maxLen: number, fallback: string): string {
  const cleaned = String(raw ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
  return cleaned.length >= 1 ? cleaned : fallback;
}

/**
 * Builds a strictly schema-conformant Firestore payload before any write executes.
 */
export function buildSanitizedRankingPayload(
  userId: string,
  input: CultivationSubmissionInput,
  existing?: GlobalRankingEntry | null,
): SanitizedRankingPayload {
  const keepHigher = input.preserveHigherRecord !== false && Boolean(existing);

  const score = clampNum(
    keepHigher && existing ? Math.max(existing.score, input.score) : input.score,
    0,
    RANKING_MAX_SCORE,
  );
  const xp = clampNum(
    keepHigher && existing ? Math.max(existing.xp, input.xp) : input.xp,
    0,
    RANKING_MAX_XP,
  );
  const level = clampInt(
    keepHigher && existing ? Math.max(existing.level, input.level) : input.level,
    1,
    12,
  );
  const shrinesConquered = clampInt(
    keepHigher && existing
      ? Math.max(existing.shrinesConquered, input.shrinesConquered)
      : input.shrinesConquered,
    0,
    12,
  );
  const soulsCollected = clampInt(
    keepHigher && existing
      ? Math.max(existing.soulsCollected, input.soulsCollected)
      : input.soulsCollected,
    0,
    14,
  );
  const bestiaryCount = clampInt(
    keepHigher && existing
      ? Math.max(existing.bestiaryCount, input.bestiaryCount)
      : input.bestiaryCount,
    0,
    20,
  );
  const isHuman = Boolean((keepHigher && existing?.isHuman) || input.isHuman || level >= 12);
  const useExistingStage = keepHigher && existing && existing.level > input.level;

  const biome: BiomeId = VALID_BIOMES.has(input.biome) ? input.biome : 'mountain';
  const weather: WeatherMode = VALID_WEATHERS.has(input.weather) ? input.weather : 'clear';
  const speedPreset: SpeedPreset = VALID_SPEED_PRESETS.has(input.speedPreset)
    ? input.speedPreset
    : 'classic';

  const submissionsCount = existing
    ? clampInt(existing.submissionsCount + 1, 1, 100_000)
    : 1;

  return {
    userId,
    displayName: sanitizeCallsign(input.displayName),
    score,
    level,
    xp,
    stageTitle: sanitizeLabel(
      useExistingStage && existing ? existing.stageTitle : input.stageTitle,
      RANKING_STAGE_TITLE_MAX_LEN,
      'Valley Hatchling',
    ),
    realmName: sanitizeLabel(
      useExistingStage && existing ? existing.realmName : input.realmName,
      RANKING_REALM_NAME_MAX_LEN,
      'Dou Zhi Qi',
    ),
    shrinesConquered,
    soulsCollected,
    bestiaryCount,
    isHuman,
    biome,
    weather,
    speedPreset,
    submissionsCount,
    portalWave: clampInt(input.portalWave, 0, 100_000),
  };
}

/**
 * Picks an accessible, scenic 3D world coordinate for a periodic Global Ranking Portal manifestation.
 * Spawns within 52m..132m of the player so it is always reachable before fading, while avoiding
 * deep alpine/jungle lakes, Trial Peak shrines, existing props, and outer continent cliffs.
 */
export function pickGlobalRankingPortalLocation(
  playerX: number,
  playerZ: number,
  biome: BiomeId,
  existingProps: readonly FormationProp[],
  wave: number,
  rng: () => number = Math.random,
): { x: number; z: number } {
  const maxR = WORLD_PLAY_RADIUS - 32;
  const minDist = GLOBAL_RANKING_PORTAL_CONFIG.minSpawnDistFromPlayer;
  const maxDist = GLOBAL_RANKING_PORTAL_CONFIG.maxSpawnDistFromPlayer;

  const isSpotSafe = (x: number, z: number, minPropClearance: number): boolean => {
    if (!isInWorldBounds(x, z)) return false;
    if (Math.hypot(x, z) > maxR) return false;
    if (isDeepWater(x, z, biome)) return false;
    for (const lm of WORLD_LANDMARKS) {
      if (Math.hypot(x - lm.x, z - lm.z) < 17) return false;
    }
    for (const p of existingProps) {
      if (Math.hypot(x - p.x, z - p.z) < minPropClearance) return false;
    }
    return true;
  };

  for (let attempt = 0; attempt < 96; attempt++) {
    // Rotate base azimuth across waves so each manifestation appears in a fresh direction
    const waveBias = (wave * 2.3999632) % (Math.PI * 2);
    const angle = waveBias + (rng() - 0.5) * Math.PI * 1.65;
    const dist = minDist + rng() * (maxDist - minDist);
    const x = Math.round((playerX + Math.sin(angle) * dist) * 10) / 10;
    const z = Math.round((playerZ + Math.cos(angle) * dist) * 10) / 10;
    if (isSpotSafe(x, z, 13)) {
      return { x, z };
    }
  }

  // Fallback ring aimed back toward continent center so it is never out-of-bounds
  const towardCenter = Math.atan2(-playerX, -playerZ);
  for (let step = 0; step < 24; step++) {
    const ang = towardCenter + (step * Math.PI) / 12;
    const x = Math.round((playerX + Math.sin(ang) * 64) * 10) / 10;
    const z = Math.round((playerZ + Math.cos(ang) * 64) * 10) / 10;
    if (isSpotSafe(x, z, 7)) {
      return { x, z };
    }
  }

  return { x: 0, z: -64 };
}

export function sortRankingEntries(
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
    // Default: score
    if (b.score !== a.score) return b.score - a.score;
    if (b.level !== a.level) return b.level - a.level;
    return b.xp - a.xp;
  });
  return copy;
}

export function computePlayerStanding(
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
      const percentileTop = Math.max(1, Math.min(100, Math.ceil((rank / Math.max(1, totalEntries)) * 100)));
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

  // Projected rank if not yet submitted
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
  const percentileTop = Math.max(1, Math.min(100, Math.ceil((projectedRank / projectedTotal) * 100)));

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

function timestampToMs(val: unknown): number {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  if (typeof val === 'object' && 'toMillis' in val && typeof (val as Timestamp).toMillis === 'function') {
    return (val as Timestamp).toMillis();
  }
  return 0;
}

function docToRankingEntry(id: string, data: Record<string, unknown>): GlobalRankingEntry {
  const biomeRaw = String(data.biome ?? 'mountain') as BiomeId;
  const weatherRaw = String(data.weather ?? 'clear') as WeatherMode;
  const speedRaw = String(data.speedPreset ?? 'classic') as SpeedPreset;
  return {
    userId: typeof data.userId === 'string' ? data.userId : id,
    displayName: sanitizeCallsign(typeof data.displayName === 'string' ? data.displayName : 'Jade Cultivator'),
    score: clampNum(Number(data.score ?? 0), 0, RANKING_MAX_SCORE),
    level: clampInt(Number(data.level ?? 1), 1, 12),
    xp: clampNum(Number(data.xp ?? 0), 0, RANKING_MAX_XP),
    stageTitle: sanitizeLabel(String(data.stageTitle ?? 'Valley Hatchling'), RANKING_STAGE_TITLE_MAX_LEN, 'Valley Hatchling'),
    realmName: sanitizeLabel(String(data.realmName ?? 'Dou Zhi Qi'), RANKING_REALM_NAME_MAX_LEN, 'Dou Zhi Qi'),
    shrinesConquered: clampInt(Number(data.shrinesConquered ?? 0), 0, 12),
    soulsCollected: clampInt(Number(data.soulsCollected ?? 0), 0, 14),
    bestiaryCount: clampInt(Number(data.bestiaryCount ?? 0), 0, 20),
    isHuman: Boolean(data.isHuman),
    biome: VALID_BIOMES.has(biomeRaw) ? biomeRaw : 'mountain',
    weather: VALID_WEATHERS.has(weatherRaw) ? weatherRaw : 'clear',
    speedPreset: VALID_SPEED_PRESETS.has(speedRaw) ? speedRaw : 'classic',
    submissionsCount: clampInt(Number(data.submissionsCount ?? 1), 1, 100_000),
    portalWave: clampInt(Number(data.portalWave ?? 0), 0, 100_000),
    createdAtMs: timestampToMs(data.createdAt),
    updatedAtMs: timestampToMs(data.updatedAt),
  };
}

/**
 * Fetches top global ranking records using a single-field bounded query matching firestore.rules.
 */
export async function fetchGlobalRankings(maxResults = 50): Promise<GlobalRankingEntry[]> {
  if (!db) return [];
  const boundedLimit = clampInt(maxResults, 1, RANKING_QUERY_LIMIT_MAX);
  try {
    const q = query(
      collection(db, GLOBAL_RANKINGS_COLLECTION),
      where('score', '>=', 0),
      orderBy('score', 'desc'),
      limit(boundedLimit),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => docToRankingEntry(d.id, d.data() as Record<string, unknown>));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, GLOBAL_RANKINGS_COLLECTION);
  }
}

/**
 * Subscribes to live Firestore Global Ranking updates with mandatory error callback.
 */
export function subscribeGlobalRankings(
  onData: (entries: GlobalRankingEntry[]) => void,
  onError: (message: string) => void,
  maxResults = 50,
): Unsubscribe {
  if (!db) {
    onData([]);
    return () => {};
  }
  const boundedLimit = clampInt(maxResults, 1, RANKING_QUERY_LIMIT_MAX);
  const q = query(
    collection(db, GLOBAL_RANKINGS_COLLECTION),
    where('score', '>=', 0),
    orderBy('score', 'desc'),
    limit(boundedLimit),
  );
  return onSnapshot(
    q,
    (snap) => {
      const rows = snap.docs.map((d) => docToRankingEntry(d.id, d.data() as Record<string, unknown>));
      onData(rows);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, GLOBAL_RANKINGS_COLLECTION);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped.message : String(error));
      }
    },
  );
}

/**
 * Submits or updates the signed-in cultivator's Global Ranking record in Firestore.
 */
export async function submitCultivationRanking(
  input: CultivationSubmissionInput,
): Promise<GlobalRankingEntry> {
  if (!db || !auth) {
    throw new Error('Firebase is not initialized.');
  }
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Sign in with Google to inscribe your cultivation progress on the Global Ranking Stele.');
  }
  if (!user.emailVerified) {
    throw new Error('Your Google account email must be verified before inscribing on the Global Ranking.');
  }

  const docPath = `${GLOBAL_RANKINGS_COLLECTION}/${user.uid}`;
  const docRef = doc(db, GLOBAL_RANKINGS_COLLECTION, user.uid);

  let existingEntry: GlobalRankingEntry | null = null;
  try {
    const existingSnap = await getDoc(docRef);
    if (existingSnap.exists()) {
      existingEntry = docToRankingEntry(existingSnap.id, existingSnap.data() as Record<string, unknown>);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, docPath);
  }

  const payload = buildSanitizedRankingPayload(user.uid, input, existingEntry);

  if (existingEntry) {
    try {
      await updateDoc(docRef, {
        displayName: payload.displayName,
        score: payload.score,
        level: payload.level,
        xp: payload.xp,
        stageTitle: payload.stageTitle,
        realmName: payload.realmName,
        shrinesConquered: payload.shrinesConquered,
        soulsCollected: payload.soulsCollected,
        bestiaryCount: payload.bestiaryCount,
        isHuman: payload.isHuman,
        biome: payload.biome,
        weather: payload.weather,
        speedPreset: payload.speedPreset,
        submissionsCount: payload.submissionsCount,
        portalWave: payload.portalWave,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, docPath);
    }
  } else {
    try {
      await setDoc(docRef, {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, docPath);
    }
  }

  const now = Date.now();
  return {
    ...payload,
    createdAtMs: existingEntry?.createdAtMs || now,
    updatedAtMs: now,
  };
}

/**
 * Removes the signed-in cultivator's own record from the Global Ranking Stele.
 */
export async function deleteOwnRankingRecord(): Promise<void> {
  if (!db || !auth?.currentUser) return;
  const uid = auth.currentUser.uid;
  const docPath = `${GLOBAL_RANKINGS_COLLECTION}/${uid}`;
  try {
    await deleteDoc(doc(db, GLOBAL_RANKINGS_COLLECTION, uid));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}
