/**
 * Phase 0 Security Rules Specification Test Harness for Serpent Peaks Global Rankings.
 * Verifies that all "Dirty Dozen" adversarial payloads are rejected and legitimate
 * cultivator operations match the exact Firestore Security Rules invariants.
 */

export interface MockAuth {
  uid: string;
  token: {
    email_verified: boolean;
  };
}

export interface RankingPayload {
  userId?: unknown;
  displayName?: unknown;
  score?: unknown;
  level?: unknown;
  xp?: unknown;
  stageTitle?: unknown;
  realmName?: unknown;
  shrinesConquered?: unknown;
  soulsCollected?: unknown;
  bestiaryCount?: unknown;
  isHuman?: unknown;
  biome?: unknown;
  weather?: unknown;
  speedPreset?: unknown;
  submissionsCount?: unknown;
  portalWave?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
  [extraKey: string]: unknown;
}

const VALID_BIOMES = new Set(['mountain', 'jungle']);
const VALID_WEATHERS = new Set(['clear', 'mist', 'fog', 'rain', 'storm', 'blizzard', 'ashstorm']);
const VALID_SPEEDS = new Set(['chill', 'classic', 'turbo']);
const REQUIRED_KEYS = [
  'userId',
  'displayName',
  'score',
  'level',
  'xp',
  'stageTitle',
  'realmName',
  'shrinesConquered',
  'soulsCollected',
  'bestiaryCount',
  'isHuman',
  'biome',
  'weather',
  'speedPreset',
  'submissionsCount',
  'portalWave',
  'createdAt',
  'updatedAt',
];

const MUTABLE_UPDATE_KEYS = new Set([
  'displayName',
  'score',
  'level',
  'xp',
  'stageTitle',
  'realmName',
  'shrinesConquered',
  'soulsCollected',
  'bestiaryCount',
  'isHuman',
  'biome',
  'weather',
  'speedPreset',
  'submissionsCount',
  'portalWave',
  'updatedAt',
]);

export function isValidId(id: string): boolean {
  return typeof id === 'string' && id.length >= 1 && id.length <= 128 && /^[a-zA-Z0-9_-]+$/.test(id);
}

export function isValidGlobalRankingRule(data: RankingPayload, auth: MockAuth | null): boolean {
  if (!auth) return false;
  const keys = Object.keys(data);
  if (!REQUIRED_KEYS.every((k) => keys.includes(k))) return false;
  if (!keys.every((k) => REQUIRED_KEYS.includes(k))) return false;
  if (typeof data.userId !== 'string' || !isValidId(data.userId) || data.userId !== auth.uid) return false;
  if (
    typeof data.displayName !== 'string' ||
    data.displayName.length < 1 ||
    data.displayName.length > 32 ||
    !/^[\w\s\-'.!()[\]]{1,32}$/.test(data.displayName)
  ) {
    return false;
  }
  if (typeof data.score !== 'number' || !Number.isFinite(data.score) || data.score < 0 || data.score > 100000000) return false;
  if (typeof data.level !== 'number' || !Number.isInteger(data.level) || data.level < 1 || data.level > 12) return false;
  if (typeof data.xp !== 'number' || !Number.isFinite(data.xp) || data.xp < 0 || data.xp > 100000000) return false;
  if (typeof data.stageTitle !== 'string' || data.stageTitle.length < 1 || data.stageTitle.length > 48) return false;
  if (typeof data.realmName !== 'string' || data.realmName.length < 1 || data.realmName.length > 40) return false;
  if (typeof data.shrinesConquered !== 'number' || !Number.isInteger(data.shrinesConquered) || data.shrinesConquered < 0 || data.shrinesConquered > 12) return false;
  if (typeof data.soulsCollected !== 'number' || !Number.isInteger(data.soulsCollected) || data.soulsCollected < 0 || data.soulsCollected > 14) return false;
  if (typeof data.bestiaryCount !== 'number' || !Number.isInteger(data.bestiaryCount) || data.bestiaryCount < 0 || data.bestiaryCount > 20) return false;
  if (typeof data.isHuman !== 'boolean') return false;
  if (typeof data.biome !== 'string' || !VALID_BIOMES.has(data.biome)) return false;
  if (typeof data.weather !== 'string' || !VALID_WEATHERS.has(data.weather)) return false;
  if (typeof data.speedPreset !== 'string' || !VALID_SPEEDS.has(data.speedPreset)) return false;
  if (typeof data.submissionsCount !== 'number' || !Number.isInteger(data.submissionsCount) || data.submissionsCount < 1 || data.submissionsCount > 100000) return false;
  if (typeof data.portalWave !== 'number' || !Number.isInteger(data.portalWave) || data.portalWave < 0 || data.portalWave > 100000) return false;
  return true;
}

export function simulateCreateRule(
  pathUserId: string,
  incoming: RankingPayload,
  auth: MockAuth | null,
  requestTime: number,
): 'ALLOW' | 'PERMISSION_DENIED' {
  if (!auth || !auth.token.email_verified) return 'PERMISSION_DENIED';
  if (!isValidId(pathUserId) || pathUserId !== auth.uid) return 'PERMISSION_DENIED';
  if (!isValidGlobalRankingRule(incoming, auth)) return 'PERMISSION_DENIED';
  if (incoming.createdAt !== requestTime || incoming.updatedAt !== requestTime) return 'PERMISSION_DENIED';
  return 'ALLOW';
}

export function simulateUpdateRule(
  pathUserId: string,
  existing: RankingPayload,
  incoming: RankingPayload,
  auth: MockAuth | null,
  requestTime: number,
): 'ALLOW' | 'PERMISSION_DENIED' {
  if (!auth || !auth.token.email_verified) return 'PERMISSION_DENIED';
  if (!isValidId(pathUserId) || pathUserId !== auth.uid) return 'PERMISSION_DENIED';
  if (!isValidGlobalRankingRule(incoming, auth)) return 'PERMISSION_DENIED';
  if (incoming.userId !== existing.userId || incoming.createdAt !== existing.createdAt) return 'PERMISSION_DENIED';
  if (incoming.updatedAt !== requestTime) return 'PERMISSION_DENIED';
  const changedKeys = Object.keys(incoming).filter((k) => incoming[k] !== existing[k]);
  if (!changedKeys.every((k) => MUTABLE_UPDATE_KEYS.has(k))) return 'PERMISSION_DENIED';
  return 'ALLOW';
}

export function simulateListRule(
  queryHasScoreBound: boolean,
  queryLimit: number,
): 'ALLOW' | 'PERMISSION_DENIED' {
  if (!queryHasScoreBound) return 'PERMISSION_DENIED';
  if (queryLimit < 1 || queryLimit > 100) return 'PERMISSION_DENIED';
  return 'ALLOW';
}

export const DIRTY_DOZEN_CASES = [
  '1. Identity Spoofing (path UID mismatch)',
  '2. Body UID mismatch',
  '3. Unverified Email Bypass',
  '4. Shadow/Ghost Field Injection (isAdmin / email)',
  '5. ID Poisoning (>128 chars or path traversal)',
  '6. Value Poisoning (level 999 / negative score)',
  '7. Denial-of-Wallet Oversized String',
  '8. Type Confusion on Update (string score)',
  '9. Timestamp Forgery on Create',
  '10. Immortal Field Mutation (createdAt changed on update)',
  '11. Invalid Enum Injection (biome volcano)',
  '12. Unbounded Scraping List Query (limit 500)',
];
