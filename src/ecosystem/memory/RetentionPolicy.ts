export type PortalRecordType = 'active' | 'memory' | 'recovery' | 'collection';

export type PortalVisualState = 'active' | 'saved' | 'lost' | 'pinned';

export type PortalRarity = 'common' | 'rare' | 'hidden' | 'legendary';

export type PortalCategoryLabel =
  | 'Search Gateway'
  | 'Active Gate'
  | 'Memory Gate'
  | 'Forgotten Gate'
  | 'Archive Gate'
  | 'Research Gate'
  | 'Work Gate'
  | 'Private Gate';

export type PortalRegionId =
  | 'central_sanctuary'
  | 'active_gateway'
  | 'memory_forest'
  | 'forgotten_ruins'
  | 'archive_mountains'
  | 'portal_halls';

export interface PortalRegionMeta {
  id: PortalRegionId;
  name: string;
  subtitle: string;
  accentHex: string;
  accentNum: number;
  centerX: number;
  centerZ: number;
}

export const PORTAL_REGIONS: Record<PortalRegionId, PortalRegionMeta> = {
  central_sanctuary: {
    id: 'central_sanctuary',
    name: 'Central Sanctuary',
    subtitle: 'Main Navigation Hub',
    accentHex: '#58e1ff',
    accentNum: 0x58e1ff,
    centerX: 0,
    centerZ: 0,
  },
  active_gateway: {
    id: 'active_gateway',
    name: 'Active Gateway District',
    subtitle: 'Current Open Browser Tabs',
    accentHex: '#2de3ff',
    accentNum: 0x2de3ff,
    centerX: 0,
    centerZ: 54,
  },
  memory_forest: {
    id: 'memory_forest',
    name: 'Memory Forest',
    subtitle: 'Recent Browsing History',
    accentHex: '#3de095',
    accentNum: 0x3de095,
    centerX: 112,
    centerZ: 28,
  },
  forgotten_ruins: {
    id: 'forgotten_ruins',
    name: 'Forgotten Ruins',
    subtitle: 'Lost Sessions & Closed Tabs',
    accentHex: '#a855f7',
    accentNum: 0xa855f7,
    centerX: -108,
    centerZ: -84,
  },
  archive_mountains: {
    id: 'archive_mountains',
    name: 'Archive Mountains',
    subtitle: 'Older Saved Records & Offline Cache',
    accentHex: '#34d399',
    accentNum: 0x34d399,
    centerX: 168,
    centerZ: -148,
  },
  portal_halls: {
    id: 'portal_halls',
    name: 'Portal Halls',
    subtitle: 'Collections & Pinned Gateways',
    accentHex: '#f2c14e',
    accentNum: 0xf2c14e,
    centerX: -116,
    centerZ: 88,
  },
};

export interface PortalRecord {
  id: string;
  type: PortalRecordType;
  visualState: PortalVisualState;
  url: string;
  title: string;
  domain: string;
  faviconGlyph: string;
  accentHex: string;
  tabId?: string;
  tabCount: number;
  lastVisitedAt: number;
  createdAt: number;
  closedAt?: number;
  crashed?: boolean;
  recoverable: boolean;
  pinned: boolean;
  saved: boolean;
  collectionIds: string[];
  regionId: PortalRegionId;
  visitCount: number;
  loading?: boolean;
  privateSession?: boolean;
  collectionId?: string;
  sessionMeta?: string;
}

export interface PortalCollection {
  id: string;
  name: string;
  description: string;
  colorHex: string;
  iconGlyph: string;
  portalUrls: string[];
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface CrashJournalTabEntry {
  tabId: string;
  url: string;
  title: string;
  portalVariant: 'A' | 'B';
}

export interface CrashJournalSnapshot {
  sessionId: string;
  updatedAt: number;
  cleanShutdown: boolean;
  activeTabs: CrashJournalTabEntry[];
}

export interface RetentionPolicyConfig {
  memoryMaxDays: number;
  memoryMaxRecords: number;
  recoveryMaxDays: number;
  recoveryMaxRecords: number;
  archiveThresholdDays: number;
  syncPrivateRecords: boolean;
}

export const DEFAULT_RETENTION_POLICY: RetentionPolicyConfig = {
  memoryMaxDays: 90,
  memoryMaxRecords: 400,
  recoveryMaxDays: 30,
  recoveryMaxRecords: 80,
  archiveThresholdDays: 7,
  syncPrivateRecords: false,
};

export const DAY_MS = 24 * 60 * 60 * 1000;

export function extractPortalDomain(rawUrl: string): string {
  const trimmed = String(rawUrl ?? '').trim();
  if (!trimmed) return 'portal.local';
  if (trimmed.toLowerCase().startsWith('chrome://')) {
    return trimmed.slice(0, 42);
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.hostname.replace(/^www\./i, '') || trimmed.slice(0, 40);
  } catch {
    return trimmed.replace(/^https?:\/\//i, '').split('/')[0] || 'portal.local';
  }
}

export function extractFaviconGlyph(title: string, domain: string): string {
  const source = (domain.replace(/^chrome:\/\//i, '').trim() || title.trim() || 'P').toUpperCase();
  const letters = source.replace(/[^A-Z0-9]/g, '');
  if (letters.length >= 2) return letters.slice(0, 2);
  if (letters.length === 1) return letters;
  return 'PT';
}

export function derivePortalVisualState(
  record: Pick<PortalRecord, 'type' | 'pinned' | 'saved' | 'recoverable'>,
): PortalVisualState {
  if (record.pinned) return 'pinned';
  if (record.type === 'active') return 'active';
  if (record.type === 'recovery') return 'lost';
  if (record.type === 'collection') return 'pinned';
  if (record.saved) return 'saved';
  return 'saved';
}

export function derivePortalRegion(
  record: Pick<PortalRecord, 'type' | 'pinned' | 'saved' | 'lastVisitedAt'>,
  nowMs = Date.now(),
  config: RetentionPolicyConfig = DEFAULT_RETENTION_POLICY,
): PortalRegionId {
  if (record.type === 'active') return 'active_gateway';
  if (record.type === 'recovery') return 'forgotten_ruins';
  if (record.type === 'collection' || record.pinned) return 'portal_halls';
  const ageDays = Math.max(0, (nowMs - record.lastVisitedAt) / DAY_MS);
  if (ageDays >= config.archiveThresholdDays || record.saved) {
    return ageDays >= config.archiveThresholdDays ? 'archive_mountains' : 'memory_forest';
  }
  return 'memory_forest';
}

/**
 * Visual discovery rarity tier — strictly an atmospheric exploration cue.
 * Never hides or deletes important user browsing history.
 */
export function derivePortalRarity(
  record: Pick<PortalRecord, 'type' | 'pinned' | 'saved' | 'lastVisitedAt' | 'collectionIds' | 'visitCount'>,
  nowMs = Date.now(),
): PortalRarity {
  if (record.type === 'collection' || record.pinned) return 'legendary';
  if (record.type === 'recovery') return 'rare';
  const ageDays = Math.max(0, (nowMs - record.lastVisitedAt) / DAY_MS);
  if (record.collectionIds.length > 0 || (record.saved && ageDays >= 3)) return 'hidden';
  if (ageDays >= 7) return 'rare';
  return 'common';
}

export function derivePortalCategoryLabel(
  record: Pick<PortalRecord, 'type' | 'regionId' | 'pinned' | 'privateSession' | 'url' | 'collectionIds'>,
): PortalCategoryLabel {
  if (record.privateSession) return 'Private Gate';
  if (record.url.toLowerCase().includes('newtab') || record.url.toLowerCase().includes('duckduckgo')) {
    return 'Search Gateway';
  }
  if (record.type === 'active') return 'Active Gate';
  if (record.type === 'recovery') return 'Forgotten Gate';
  if (record.type === 'collection') return record.pinned ? 'Work Gate' : 'Research Gate';
  if (record.regionId === 'archive_mountains') return 'Archive Gate';
  if (record.collectionIds.length > 0) return 'Research Gate';
  return 'Memory Gate';
}

/**
 * Enforces separate retention rules for Active sessions, Memory records, Recovery records,
 * and Collection hubs. Private records are excluded from sync and retention if syncPrivateRecords is false.
 */
export function applyRetentionPolicy(
  records: readonly PortalRecord[],
  nowMs = Date.now(),
  config: RetentionPolicyConfig = DEFAULT_RETENTION_POLICY,
): PortalRecord[] {
  const active: PortalRecord[] = [];
  const collections: PortalRecord[] = [];
  const pinnedOrSavedMemory: PortalRecord[] = [];
  const regularMemory: PortalRecord[] = [];
  const recovery: PortalRecord[] = [];

  const memoryCutoff = nowMs - config.memoryMaxDays * DAY_MS;
  const recoveryCutoff = nowMs - config.recoveryMaxDays * DAY_MS;

  for (const rec of records) {
    if (rec.privateSession && !config.syncPrivateRecords && rec.type !== 'active') {
      continue;
    }
    if (rec.type === 'active') {
      active.push(rec);
    } else if (rec.type === 'collection') {
      collections.push(rec);
    } else if (rec.type === 'recovery') {
      const ts = rec.closedAt ?? rec.lastVisitedAt;
      if (ts >= recoveryCutoff) {
        recovery.push(rec);
      }
    } else {
      // memory record
      if (rec.pinned || rec.saved) {
        pinnedOrSavedMemory.push(rec);
      } else if (rec.lastVisitedAt >= memoryCutoff) {
        regularMemory.push(rec);
      }
    }
  }

  regularMemory.sort((a, b) => b.lastVisitedAt - a.lastVisitedAt);
  recovery.sort((a, b) => (b.closedAt ?? b.lastVisitedAt) - (a.closedAt ?? a.lastVisitedAt));

  const remainingMemoryBudget = Math.max(0, config.memoryMaxRecords - pinnedOrSavedMemory.length);
  const keptMemory = [...pinnedOrSavedMemory, ...regularMemory.slice(0, remainingMemoryBudget)];
  const keptRecovery = recovery.slice(0, config.recoveryMaxRecords);

  return [...active, ...collections, ...keptMemory, ...keptRecovery];
}

export function formatRelativeVisitTime(timestampMs: number, nowMs = Date.now()): string {
  if (!timestampMs || !Number.isFinite(timestampMs)) return 'Unknown';
  const deltaSec = Math.max(0, Math.floor((nowMs - timestampMs) / 1000));
  if (deltaSec < 45) return 'Just now';
  if (deltaSec < 3600) return `${Math.floor(deltaSec / 60)}m ago`;
  if (deltaSec < 86400) return `${Math.floor(deltaSec / 3600)}h ago`;
  const days = Math.floor(deltaSec / 86400);
  if (days < 14) return `${days}d ago`;
  try {
    return new Date(timestampMs).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return `${days}d ago`;
  }
}

export interface PortalSearchOptions {
  query?: string;
  regionId?: PortalRegionId | 'all';
  type?: PortalRecordType | 'all';
  dateFromMs?: number;
  dateToMs?: number;
}

export function searchPortalRecords(
  records: readonly PortalRecord[],
  options: PortalSearchOptions = {},
): PortalRecord[] {
  const q = (options.query ?? '').trim().toLowerCase();
  const region = options.regionId ?? 'all';
  const type = options.type ?? 'all';
  const from = options.dateFromMs ?? 0;
  const to = options.dateToMs ?? Number.MAX_SAFE_INTEGER;

  return records.filter((rec) => {
    if (region !== 'all' && rec.regionId !== region) return false;
    if (type !== 'all' && rec.type !== type) return false;
    if (rec.lastVisitedAt < from || rec.lastVisitedAt > to) return false;
    if (!q) return true;
    let dateText = '';
    try {
      dateText = new Date(rec.lastVisitedAt).toISOString().slice(0, 10);
    } catch {
      dateText = '';
    }
    const regionName = PORTAL_REGIONS[rec.regionId]?.name ?? rec.regionId;
    const hay = `${rec.title} ${rec.domain} ${rec.url} ${rec.visualState} ${rec.type} ${regionName} ${dateText} ${rec.sessionMeta ?? ''}`.toLowerCase();
    return hay.includes(q);
  });
}
