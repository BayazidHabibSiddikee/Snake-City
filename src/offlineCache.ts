import type {
  BrowserHistoryEntry,
  BrowserSettings,
  PortalBookmark,
  PortalVisitRecord,
  SearchHistoryEntry,
} from './browser';

export const SW_CACHE_NAMES = {
  core: 'serpent-peaks-core-v2',
  portalPages: 'serpent-peaks-portal-pages-v2',
  portalState: 'serpent-peaks-portal-state-v2',
  fonts: 'serpent-peaks-fonts-v2',
} as const;

export const PORTAL_OFFLINE_STATE_ENDPOINT = '/__portal_cache__/state.json';

export type OfflineSyncPhase =
  | 'initializing'
  | 'pending'
  | 'caching'
  | 'synced'
  | 'clearing'
  | 'cleared'
  | 'offline_cached'
  | 'unsupported'
  | 'error';

export type OfflineSyncTone = 'emerald' | 'cyan' | 'amber' | 'rose' | 'muted';

export interface OfflineSyncIndicator {
  phase: OfflineSyncPhase;
  tone: OfflineSyncTone;
  shortBadge: string;
  headline: string;
  detail: string;
  activeOperation: string;
  pendingCount: number;
  lastSyncedAt: number;
  lastClearedAt: number;
}

export interface PortalOfflineStateSnapshot {
  savedAt: number;
  settings: Partial<BrowserSettings>;
  customBookmarks: PortalBookmark[];
  browsingHistory: BrowserHistoryEntry[];
  searchHistory: SearchHistoryEntry[];
  portalVisits: Record<string, PortalVisitRecord>;
}

export interface OfflineCacheStatus {
  supported: boolean;
  registered: boolean;
  swVersion: string;
  coreAssetCount: number;
  cachedPageCount: number;
  cachedUrls: string[];
  stateSyncedAt: number;
  bookmarksCount: number;
  historyCount: number;
  searchHistoryCount: number;
}

export type CacheBucketKey = 'core' | 'portalPages' | 'portalState' | 'fonts';

export interface CacheBucketUsage {
  key: CacheBucketKey;
  label: string;
  cacheName: string;
  bytes: number;
  entries: number;
}

export interface CachedPortalItemUsage {
  url: string;
  bytes: number;
  cachedAt: number;
}

export interface StorageUsageBreakdown {
  measuredAt: number;
  totalCacheBytes: number;
  browserEstimatedUsageBytes: number | null;
  browserQuotaBytes: number | null;
  buckets: Record<CacheBucketKey, CacheBucketUsage>;
  cachedItems: CachedPortalItemUsage[];
}

export const EMPTY_STORAGE_USAGE: StorageUsageBreakdown = {
  measuredAt: 0,
  totalCacheBytes: 0,
  browserEstimatedUsageBytes: null,
  browserQuotaBytes: null,
  buckets: {
    core: { key: 'core', label: 'Core App & 3D Assets', cacheName: SW_CACHE_NAMES.core, bytes: 0, entries: 0 },
    portalPages: { key: 'portalPages', label: 'Cached Bookmark & Portal Pages', cacheName: SW_CACHE_NAMES.portalPages, bytes: 0, entries: 0 },
    portalState: { key: 'portalState', label: 'Bookmarks & Browser History Index', cacheName: SW_CACHE_NAMES.portalState, bytes: 0, entries: 0 },
    fonts: { key: 'fonts', label: 'Typography & Fonts Cache', cacheName: SW_CACHE_NAMES.fonts, bytes: 0, entries: 0 },
  },
  cachedItems: [],
};

export const EMPTY_OFFLINE_CACHE_STATUS: OfflineCacheStatus = {
  supported: false,
  registered: false,
  swVersion: '2.0.0',
  coreAssetCount: 0,
  cachedPageCount: 0,
  cachedUrls: [],
  stateSyncedAt: 0,
  bookmarksCount: 0,
  historyCount: 0,
  searchHistoryCount: 0,
};

/**
 * Formats a byte count into a clean human-readable unit (B, KB, MB, GB).
 */
export function formatStorageBytes(bytes: number): string {
  const safe = Number.isFinite(bytes) && bytes > 0 ? bytes : 0;
  if (safe < 1024) return `${Math.round(safe)} B`;
  if (safe < 1024 * 1024) return `${(safe / 1024).toFixed(safe < 10 * 1024 ? 1 : 0)} KB`;
  if (safe < 1024 * 1024 * 1024) return `${(safe / (1024 * 1024)).toFixed(2)} MB`;
  return `${(safe / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * Computes normalized percentage shares across the 4 Service Worker cache buckets.
 */
export function computeStorageBucketShares(
  usage: StorageUsageBreakdown,
): Array<CacheBucketUsage & { sharePct: number }> {
  const order: CacheBucketKey[] = ['core', 'portalPages', 'portalState', 'fonts'];
  const total = Math.max(0, usage.totalCacheBytes);
  return order.map((key) => {
    const bucket = usage.buckets[key];
    const sharePct = total > 0 ? Number(((bucket.bytes / total) * 100).toFixed(1)) : 0;
    return { ...bucket, sharePct };
  });
}

/**
 * Pure helper that removes a single cached portal URL from a StorageUsageBreakdown snapshot
 * and updates portalPages & totalCacheBytes cleanly.
 */
export function removeCachedUrlFromUsage(
  usage: StorageUsageBreakdown,
  rawUrl: string,
): { nextUsage: StorageUsageBreakdown; freedBytes: number; removed: boolean } {
  const norm = normalizeCacheablePortalUrl(rawUrl);
  if (!norm) return { nextUsage: usage, freedBytes: 0, removed: false };
  const idx = usage.cachedItems.findIndex((item) => normalizeCacheablePortalUrl(item.url) === norm);
  if (idx < 0) return { nextUsage: usage, freedBytes: 0, removed: false };

  const target = usage.cachedItems[idx];
  const freedBytes = Math.max(0, target.bytes);
  const nextItems = usage.cachedItems.filter((_, i) => i !== idx);
  const nextPortalBytes = Math.max(0, usage.buckets.portalPages.bytes - freedBytes);
  const nextPortalEntries = Math.max(0, usage.buckets.portalPages.entries - 1);
  const nextTotal = Math.max(0, usage.totalCacheBytes - freedBytes);

  return {
    removed: true,
    freedBytes,
    nextUsage: {
      ...usage,
      measuredAt: Date.now(),
      totalCacheBytes: nextTotal,
      buckets: {
        ...usage.buckets,
        portalPages: {
          ...usage.buckets.portalPages,
          bytes: nextPortalBytes,
          entries: nextPortalEntries,
        },
      },
      cachedItems: nextItems,
    },
  };
}

/**
 * Normalizes an external HTTP(S) portal URL into its canonical offline cache key
 * (strips hash fragment, validates protocol). Returns null for internal chrome:// or invalid URLs.
 */
export function normalizeCacheablePortalUrl(rawUrl: string): string | null {
  try {
    const trimmed = String(rawUrl ?? '').trim();
    if (!trimmed) return null;
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Produces the canonical cache path used by public/sw.js so cached portal snapshots
 * match regardless of User-Agent or Tracker Shield query variations.
 */
export function canonicalizePortalProxyCacheKey(targetUrl: string): string | null {
  const normalized = normalizeCacheablePortalUrl(targetUrl);
  if (!normalized) return null;
  return `/__portal_cache__/page?url=${encodeURIComponent(normalized)}`;
}

/**
 * Collects unique cacheable external URLs prioritized by user-saved bookmarks first,
 * followed by recent browser history URLs, bounded by maxCount.
 */
export function extractBookmarkCacheableUrls(
  bookmarks: readonly PortalBookmark[],
  history: readonly BrowserHistoryEntry[] = [],
  maxCount = 20,
): string[] {
  const cap = Math.max(1, Math.min(50, Math.floor(maxCount)));
  const seen = new Set<string>();
  const urls: string[] = [];

  for (const bm of bookmarks) {
    const norm = normalizeCacheablePortalUrl(bm.url);
    if (!norm || seen.has(norm)) continue;
    seen.add(norm);
    urls.push(norm);
    if (urls.length >= cap) return urls;
  }

  for (const entry of history) {
    const norm = normalizeCacheablePortalUrl(entry.url);
    if (!norm || seen.has(norm)) continue;
    seen.add(norm);
    urls.push(norm);
    if (urls.length >= cap) return urls;
  }

  return urls;
}

/**
 * Constructs a bounded, sanitized offline state snapshot suitable for Service Worker Cache Storage.
 */
export function buildPortalOfflineStateSnapshot(input: {
  settings: Partial<BrowserSettings>;
  customBookmarks: readonly PortalBookmark[];
  browsingHistory: readonly BrowserHistoryEntry[];
  searchHistory: readonly SearchHistoryEntry[];
  portalVisits: Readonly<Record<string, PortalVisitRecord>>;
  savedAt?: number;
}): PortalOfflineStateSnapshot {
  return {
    savedAt: typeof input.savedAt === 'number' && Number.isFinite(input.savedAt) ? Math.floor(input.savedAt) : Date.now(),
    settings: { ...input.settings },
    customBookmarks: input.customBookmarks.slice(0, 64).map((b) => ({ ...b })),
    browsingHistory: input.browsingHistory.slice(0, 200).map((h) => ({ ...h })),
    searchHistory: input.searchHistory.slice(0, 100).map((s) => ({ ...s })),
    portalVisits: { ...input.portalVisits },
  };
}

function formatClockTime(timestampMs: number): string {
  if (!timestampMs || !Number.isFinite(timestampMs)) return '';
  try {
    return new Date(timestampMs).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return '';
  }
}

/**
 * Pure helper that derives the real-time Service Worker synchronization visual indicator
 * (phase, semantic color tone, concise badge, headline, and tabular cache metrics).
 */
export function deriveOfflineSyncIndicator(input: {
  status: OfflineCacheStatus;
  isOnline: boolean;
  phase: OfflineSyncPhase;
  pendingCount: number;
  activeOperation: string;
  lastSyncedAt: number;
  lastClearedAt: number;
}): OfflineSyncIndicator {
  const { status, isOnline, pendingCount, activeOperation, lastSyncedAt, lastClearedAt } = input;
  const metrics = `${status.coreAssetCount} core assets · ${status.cachedPageCount} page${status.cachedPageCount === 1 ? '' : 's'} · ${status.bookmarksCount} bookmark${status.bookmarksCount === 1 ? '' : 's'} · ${status.historyCount} history`;
  const syncClock = formatClockTime(lastSyncedAt || status.stateSyncedAt);
  const clearClock = formatClockTime(lastClearedAt);

  if (!status.supported) {
    return {
      phase: 'unsupported',
      tone: 'muted',
      shortBadge: 'Local Only',
      headline: 'Service Worker unavailable in this browser context',
      detail: `${isOnline ? 'Online' : 'Offline'} · Bookmarks and history remain saved in local storage`,
      activeOperation: '',
      pendingCount: 0,
      lastSyncedAt,
      lastClearedAt,
    };
  }

  if (input.phase === 'clearing') {
    return {
      phase: 'clearing',
      tone: 'rose',
      shortBadge: 'Clearing...',
      headline: activeOperation || 'Wiping Service Worker offline caches...',
      detail: 'Removing cached bookmarks, portal history, saved pages, and core assets',
      activeOperation,
      pendingCount: 0,
      lastSyncedAt,
      lastClearedAt,
    };
  }

  if (input.phase === 'caching') {
    return {
      phase: 'caching',
      tone: 'cyan',
      shortBadge: 'Caching...',
      headline: activeOperation || 'Caching portal history & bookmarks...',
      detail: `${isOnline ? 'Online' : 'Offline'} · ${metrics}`,
      activeOperation,
      pendingCount,
      lastSyncedAt,
      lastClearedAt,
    };
  }

  if (input.phase === 'pending' || pendingCount > 0) {
    const queued = Math.max(1, pendingCount);
    return {
      phase: 'pending',
      tone: 'amber',
      shortBadge: 'Pending Sync',
      headline: isOnline
        ? `Pending sync — ${queued} portal history/bookmark update${queued === 1 ? '' : 's'} queued`
        : `Offline — ${queued} update${queued === 1 ? '' : 's'} pending online sync`,
      detail: `${metrics}${syncClock ? ` · Last synced ${syncClock}` : ''}`,
      activeOperation: activeOperation || 'Queued for Service Worker cache sync',
      pendingCount: queued,
      lastSyncedAt,
      lastClearedAt,
    };
  }

  if (input.phase === 'cleared') {
    return {
      phase: 'cleared',
      tone: 'amber',
      shortBadge: 'Cache Cleared',
      headline: 'Offline cache wiped — force refresh or sync to rebuild clean assets',
      detail: `${clearClock ? `Cleared at ${clearClock} · ` : ''}${metrics}`,
      activeOperation: '',
      pendingCount: 0,
      lastSyncedAt: 0,
      lastClearedAt,
    };
  }

  if (input.phase === 'error') {
    return {
      phase: 'error',
      tone: 'rose',
      shortBadge: 'Sync Error',
      headline: activeOperation || 'Service Worker cache sync encountered an error',
      detail: `${isOnline ? 'Online' : 'Offline'} · Try Clear Offline Cache to reset`,
      activeOperation,
      pendingCount,
      lastSyncedAt,
      lastClearedAt,
    };
  }

  if (!isOnline) {
    return {
      phase: 'offline_cached',
      tone: 'amber',
      shortBadge: 'Offline Cached',
      headline: 'Offline Mode — Serving cached bookmarks & local portal history',
      detail: `${metrics}${syncClock ? ` · Synced ${syncClock}` : ''}`,
      activeOperation: '',
      pendingCount: 0,
      lastSyncedAt,
      lastClearedAt,
    };
  }

  if (!status.registered || input.phase === 'initializing') {
    return {
      phase: 'initializing',
      tone: 'cyan',
      shortBadge: 'Starting SW...',
      headline: 'Registering Service Worker for offline portal caching...',
      detail: `Online · ${metrics}`,
      activeOperation: 'Registering /sw.js',
      pendingCount: 0,
      lastSyncedAt,
      lastClearedAt,
    };
  }

  return {
    phase: 'synced',
    tone: 'emerald',
    shortBadge: 'Synced',
    headline: syncClock
      ? `Service Worker synced · Portal history & bookmarks cached (${syncClock})`
      : 'Service Worker active · Portal history & bookmarks cached',
    detail: `Online · SW v${status.swVersion} · ${metrics}`,
    activeOperation: '',
    pendingCount: 0,
    lastSyncedAt,
    lastClearedAt,
  };
}

/**
 * Formats a concise human-readable summary of offline availability & cached items.
 */
export function formatOfflineCacheSummary(status: OfflineCacheStatus, isOnline: boolean): string {
  const conn = isOnline ? 'Online' : 'Offline Mode';
  if (!status.supported) {
    return `${conn} · Local bookmarks & history stored on device`;
  }
  if (!status.registered) {
    return `${conn} · Initializing offline service worker...`;
  }
  return `${conn} · ${status.coreAssetCount} core assets · ${status.cachedPageCount} offline page${status.cachedPageCount === 1 ? '' : 's'} · ${status.bookmarksCount} bookmark${status.bookmarksCount === 1 ? '' : 's'} · ${status.historyCount} history item${status.historyCount === 1 ? '' : 's'}`;
}

export function isStandalonePwa(): boolean {
  if (typeof window === 'undefined') return false;
  const mediaStandalone =
    typeof window.matchMedia === 'function' &&
    (window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches);
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return mediaStandalone || iosStandalone;
}

export function isIosSafariDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

/**
 * Coordinates registration of /sw.js, live online/offline detection, real-time sync status
 * tracking (initializing -> pending -> caching -> synced / clearing -> cleared), automatic
 * warming of core Vite JS/CSS/icon bundles, syncing saved bookmarks & portal history into
 * Cache Storage, and full offline cache wipes to recover from corrupted assets.
 */
export class PortalOfflineCacheController {
  private registration: ServiceWorkerRegistration | null = null;
  private online = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private status: OfflineCacheStatus = {
    ...EMPTY_OFFLINE_CACHE_STATUS,
    supported: typeof navigator !== 'undefined' && 'serviceWorker' in navigator,
  };
  private phase: OfflineSyncPhase =
    typeof navigator !== 'undefined' && 'serviceWorker' in navigator ? 'initializing' : 'unsupported';
  private activeOperation = '';
  private pendingChangesCount = 0;
  private lastSyncedAt = 0;
  private lastClearedAt = 0;
  private cachedUrlSet = new Set<string>();
  private storageUsage: StorageUsageBreakdown = {
    ...EMPTY_STORAGE_USAGE,
    buckets: {
      core: { ...EMPTY_STORAGE_USAGE.buckets.core },
      portalPages: { ...EMPTY_STORAGE_USAGE.buckets.portalPages },
      portalState: { ...EMPTY_STORAGE_USAGE.buckets.portalState },
      fonts: { ...EMPTY_STORAGE_USAGE.buckets.fonts },
    },
    cachedItems: [],
  };
  private listeners = new Set<() => void>();
  private syncTimer: number | null = null;
  private pendingSnapshot: PortalOfflineStateSnapshot | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.online = true;
        if (this.pendingSnapshot && this.pendingChangesCount > 0) {
          void this.syncPortalStateNow(this.pendingSnapshot);
        } else {
          if (this.phase === 'offline_cached') this.phase = 'synced';
          this.emit();
          void this.refreshStatus();
        }
      });
      window.addEventListener('offline', () => {
        this.online = false;
        if (this.phase === 'synced') {
          this.phase = 'offline_cached';
        }
        this.emit();
      });
    }
  }

  public isOnline(): boolean {
    return this.online;
  }

  public getStatus(): Readonly<OfflineCacheStatus> {
    return this.status;
  }

  public getStorageUsage(): Readonly<StorageUsageBreakdown> {
    return this.storageUsage;
  }

  public getCachedUrlByteSize(url: string): number {
    const norm = normalizeCacheablePortalUrl(url);
    if (!norm) return 0;
    const hit = this.storageUsage.cachedItems.find(
      (item) => normalizeCacheablePortalUrl(item.url) === norm,
    );
    return hit ? hit.bytes : 0;
  }

  public getSyncIndicator(): OfflineSyncIndicator {
    return deriveOfflineSyncIndicator({
      status: this.status,
      isOnline: this.online,
      phase: this.phase,
      pendingCount: this.pendingChangesCount,
      activeOperation: this.activeOperation,
      lastSyncedAt: this.lastSyncedAt,
      lastClearedAt: this.lastClearedAt,
    });
  }

  public isUrlCachedOffline(url: string): boolean {
    const trimmed = String(url ?? '').trim();
    if (trimmed.toLowerCase().startsWith('chrome://')) return true;
    const norm = normalizeCacheablePortalUrl(trimmed);
    return norm ? this.cachedUrlSet.has(norm) : false;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    this.listeners.forEach((fn) => fn());
  }

  private setPhase(phase: OfflineSyncPhase, activeOperation = ''): void {
    this.phase = phase;
    this.activeOperation = activeOperation;
    this.emit();
  }

  private getActiveWorker(): ServiceWorker | null {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null;
    return (
      navigator.serviceWorker.controller ||
      this.registration?.active ||
      this.registration?.waiting ||
      this.registration?.installing ||
      null
    );
  }

  private sendWorkerMessage<T = Record<string, unknown>>(
    message: Record<string, unknown>,
    timeoutMs = 5000,
  ): Promise<T | null> {
    const worker = this.getActiveWorker();
    if (!worker) return Promise.resolve(null);

    return new Promise<T | null>((resolve) => {
      let settled = false;
      const timer = window.setTimeout(() => {
        if (!settled) {
          settled = true;
          resolve(null);
        }
      }, timeoutMs);

      try {
        const channel = new MessageChannel();
        channel.port1.onmessage = (ev: MessageEvent) => {
          if (!settled) {
            settled = true;
            window.clearTimeout(timer);
            resolve((ev.data ?? null) as T | null);
          }
        };
        worker.postMessage(message, [channel.port2]);
      } catch {
        if (!settled) {
          settled = true;
          window.clearTimeout(timer);
          resolve(null);
        }
      }
    });
  }

  public async registerAndWarm(initialSnapshot: PortalOfflineStateSnapshot): Promise<void> {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      this.status = { ...EMPTY_OFFLINE_CACHE_STATUS, supported: false };
      this.setPhase('unsupported');
      return;
    }

    try {
      this.setPhase('initializing', 'Registering Service Worker...');
      this.registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      await navigator.serviceWorker.ready;
      this.status = {
        ...this.status,
        supported: true,
        registered: true,
      };

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        void this.warmCurrentPageCoreAssets();
        if (this.pendingSnapshot) {
          void this.syncPortalStateNow(this.pendingSnapshot);
        }
        void this.refreshStatus();
      });

      await this.warmCurrentPageCoreAssets();
      await this.syncPortalStateNow(initialSnapshot);
      await this.refreshStatus();
    } catch {
      this.status = {
        ...this.status,
        supported: true,
        registered: false,
      };
      this.setPhase('error', 'Service Worker registration blocked');
    }
  }

  public async warmCurrentPageCoreAssets(): Promise<number> {
    if (typeof document === 'undefined' || typeof window === 'undefined') return 0;
    this.setPhase('caching', 'Caching core browser & game assets...');
    const urls = new Set<string>([
      '/',
      '/?mode=browser',
      '/manifest.json',
      '/favicon.ico',
      '/icons/icon-192.png',
      '/icons/icon-512.png',
      '/icons/apple-touch-icon.png',
    ]);

    document.querySelectorAll<HTMLScriptElement>('script[src]').forEach((el) => {
      if (el.src) urls.add(el.src);
    });
    document.querySelectorAll<HTMLLinkElement>('link[href]').forEach((el) => {
      if (
        el.href &&
        (el.rel === 'stylesheet' ||
          el.rel === 'modulepreload' ||
          el.rel === 'icon' ||
          el.rel === 'apple-touch-icon' ||
          el.rel === 'manifest')
      ) {
        urls.add(el.href);
      }
    });

    if (typeof performance !== 'undefined' && typeof performance.getEntriesByType === 'function') {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      for (const entry of resources) {
        if (!entry.name) continue;
        try {
          const u = new URL(entry.name);
          if (u.origin === window.location.origin && !u.pathname.startsWith('/api/')) {
            urls.add(u.href);
          }
        } catch {
          // ignore
        }
      }
    }

    const res = await this.sendWorkerMessage<{ ok?: boolean; cachedCount?: number }>({
      type: 'WARM_CORE_ASSETS',
      urls: Array.from(urls),
    });
    if (this.phase === 'caching') {
      this.setPhase(this.online ? 'synced' : 'offline_cached');
    }
    return res?.cachedCount ?? 0;
  }

  public schedulePortalStateSync(snapshot: PortalOfflineStateSnapshot): void {
    this.pendingSnapshot = snapshot;
    this.pendingChangesCount += 1;
    this.setPhase('pending', 'Portal history & bookmarks pending sync...');
    if (typeof window === 'undefined') return;
    if (this.syncTimer !== null) {
      window.clearTimeout(this.syncTimer);
    }
    this.syncTimer = window.setTimeout(() => {
      this.syncTimer = null;
      if (this.pendingSnapshot) {
        void this.syncPortalStateNow(this.pendingSnapshot);
      }
    }, 360);
  }

  public async syncPortalStateNow(snapshot: PortalOfflineStateSnapshot): Promise<boolean> {
    this.pendingSnapshot = snapshot;
    this.setPhase('caching', 'Caching portal history & saved bookmarks...');

    let wroteDirectly = false;
    if (typeof caches !== 'undefined') {
      try {
        const cache = await caches.open(SW_CACHE_NAMES.portalState);
        await cache.put(
          PORTAL_OFFLINE_STATE_ENDPOINT,
          new Response(JSON.stringify(snapshot), {
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
          }),
        );
        wroteDirectly = true;
      } catch {
        // ignore
      }
    }

    const res = await this.sendWorkerMessage<{ ok?: boolean }>({
      type: 'SYNC_PORTAL_STATE',
      payload: snapshot,
    });
    const ok = Boolean(res?.ok || wroteDirectly);
    const now = Date.now();
    this.status = {
      ...this.status,
      stateSyncedAt: ok ? snapshot.savedAt || now : this.status.stateSyncedAt,
      bookmarksCount: snapshot.customBookmarks.length,
      historyCount: snapshot.browsingHistory.length,
      searchHistoryCount: snapshot.searchHistory.length,
    };
    if (ok) {
      this.pendingChangesCount = 0;
      this.lastSyncedAt = now;
      this.setPhase(this.online ? 'synced' : 'offline_cached');
    } else {
      this.setPhase('error', 'Failed to sync portal history to Service Worker');
    }
    return ok;
  }

  public async readCachedPortalState(): Promise<PortalOfflineStateSnapshot | null> {
    if (typeof caches === 'undefined') return null;
    try {
      const hasState = await caches.has(SW_CACHE_NAMES.portalState);
      if (!hasState) return null;
      const cache = await caches.open(SW_CACHE_NAMES.portalState);
      const hit = await cache.match(PORTAL_OFFLINE_STATE_ENDPOINT);
      if (!hit) return null;
      const parsed = (await hit.json()) as Partial<PortalOfflineStateSnapshot>;
      if (!parsed || typeof parsed !== 'object') return null;
      return {
        savedAt: typeof parsed.savedAt === 'number' ? parsed.savedAt : 0,
        settings: parsed.settings && typeof parsed.settings === 'object' ? parsed.settings : {},
        customBookmarks: Array.isArray(parsed.customBookmarks) ? parsed.customBookmarks : [],
        browsingHistory: Array.isArray(parsed.browsingHistory) ? parsed.browsingHistory : [],
        searchHistory: Array.isArray(parsed.searchHistory) ? parsed.searchHistory : [],
        portalVisits: parsed.portalVisits && typeof parsed.portalVisits === 'object' ? parsed.portalVisits : {},
      };
    } catch {
      return null;
    }
  }

  public async precachePortalUrls(
    urls: readonly string[],
    settings?: Pick<BrowserSettings, 'trackerShield' | 'userAgentPreset'>,
  ): Promise<{ attempted: number; cached: number }> {
    if (!this.online || urls.length === 0) {
      return { attempted: 0, cached: 0 };
    }
    this.setPhase(
      'caching',
      `Caching ${urls.length} saved bookmark/history page${urls.length === 1 ? '' : 's'}...`,
    );
    const res = await this.sendWorkerMessage<{ ok?: boolean; attempted?: number; cached?: number }>(
      {
        type: 'PRECACHE_PORTAL_URLS',
        urls: Array.from(urls),
        shield: settings?.trackerShield === false ? '0' : '1',
        ua: settings?.userAgentPreset ?? 'serpent_portal',
      },
      15000,
    );
    this.lastSyncedAt = Date.now();
    await this.refreshStatus();
    this.setPhase(this.online ? 'synced' : 'offline_cached');
    return {
      attempted: res?.attempted ?? 0,
      cached: res?.cached ?? 0,
    };
  }

  /**
   * Synchronizes portal history/bookmarks state, warms core assets, and caches saved URLs in sequence.
   */
  public async syncAllNow(
    snapshot: PortalOfflineStateSnapshot,
    urls: readonly string[],
    settings?: Pick<BrowserSettings, 'trackerShield' | 'userAgentPreset'>,
  ): Promise<{ stateSynced: boolean; attempted: number; cached: number }> {
    if (this.syncTimer !== null && typeof window !== 'undefined') {
      window.clearTimeout(this.syncTimer);
      this.syncTimer = null;
    }
    await this.warmCurrentPageCoreAssets();
    const stateSynced = await this.syncPortalStateNow(snapshot);
    const pageRes =
      this.online && urls.length > 0
        ? await this.precachePortalUrls(urls, settings)
        : { attempted: 0, cached: 0 };
    await this.refreshStatus();
    return {
      stateSynced,
      attempted: pageRes.attempted,
      cached: pageRes.cached,
    };
  }

  public async clearCachedPortalPages(): Promise<boolean> {
    this.setPhase('clearing', 'Clearing cached webpage snapshots...');
    const res = await this.sendWorkerMessage<{ ok?: boolean }>({
      type: 'CLEAR_PORTAL_PAGE_CACHE',
    });
    if (typeof caches !== 'undefined') {
      try {
        await caches.delete(SW_CACHE_NAMES.portalPages);
      } catch {
        // ignore
      }
    }
    this.cachedUrlSet.clear();
    await this.refreshStatus();
    this.setPhase(this.online ? 'synced' : 'offline_cached');
    return Boolean(res?.ok ?? true);
  }

  /**
   * Wipes ALL Service Worker offline caches (saved bookmarks snapshot, portal history snapshot,
   * cached webpage snapshots, core app assets, and cached fonts) so users can recover from
   * corrupted assets and force a clean reload or fresh re-sync.
   */
  public async clearAllOfflineCaches(): Promise<{ ok: boolean; clearedCount: number }> {
    if (this.syncTimer !== null && typeof window !== 'undefined') {
      window.clearTimeout(this.syncTimer);
      this.syncTimer = null;
    }
    this.pendingSnapshot = null;
    this.pendingChangesCount = 0;
    this.setPhase('clearing', 'Wiping Service Worker caches for bookmarks, history & core assets...');

    const res = await this.sendWorkerMessage<{ ok?: boolean; clearedCaches?: string[] }>({
      type: 'CLEAR_ALL_OFFLINE_CACHES',
    });

    let deletedDirectly = 0;
    if (typeof caches !== 'undefined') {
      const names = Object.values(SW_CACHE_NAMES);
      for (const name of names) {
        try {
          const removed = await caches.delete(name);
          if (removed) deletedDirectly++;
        } catch {
          // ignore
        }
      }
    }

    this.cachedUrlSet.clear();
    this.storageUsage = {
      ...EMPTY_STORAGE_USAGE,
      measuredAt: Date.now(),
      buckets: {
        core: { ...EMPTY_STORAGE_USAGE.buckets.core },
        portalPages: { ...EMPTY_STORAGE_USAGE.buckets.portalPages },
        portalState: { ...EMPTY_STORAGE_USAGE.buckets.portalState },
        fonts: { ...EMPTY_STORAGE_USAGE.buckets.fonts },
      },
      cachedItems: [],
    };
    this.lastSyncedAt = 0;
    this.lastClearedAt = Date.now();
    this.status = {
      ...this.status,
      coreAssetCount: 0,
      cachedPageCount: 0,
      cachedUrls: [],
      stateSyncedAt: 0,
      bookmarksCount: 0,
      historyCount: 0,
      searchHistoryCount: 0,
    };
    this.setPhase('cleared');
    return {
      ok: Boolean(res?.ok ?? true),
      clearedCount: Math.max(deletedDirectly, res?.clearedCaches?.length ?? 0),
    };
  }

  /**
   * Deletes the cached offline snapshot of a single bookmark/portal URL from the
   * Service Worker's portal-pages cache without clearing other cached bookmarks or core assets.
   */
  public async deleteCachedPortalUrl(
    rawUrl: string,
  ): Promise<{ ok: boolean; deleted: boolean; freedBytes: number }> {
    const normalized = normalizeCacheablePortalUrl(rawUrl);
    if (!normalized) return { ok: false, deleted: false, freedBytes: 0 };

    const res = await this.sendWorkerMessage<{
      ok?: boolean;
      deleted?: boolean;
      freedBytes?: number;
      usage?: Partial<StorageUsageBreakdown>;
    }>({
      type: 'DELETE_CACHED_PORTAL_URL',
      url: normalized,
    });

    let deletedDirect = false;
    let directFreed = 0;
    if (typeof caches !== 'undefined') {
      try {
        const hasPages = await caches.has(SW_CACHE_NAMES.portalPages);
        if (hasPages) {
          const cache = await caches.open(SW_CACHE_NAMES.portalPages);
          const keyPath = canonicalizePortalProxyCacheKey(normalized);
          if (keyPath) {
            const fullKey =
              typeof window !== 'undefined' ? `${window.location.origin}${keyPath}` : keyPath;
            const hit = (await cache.match(fullKey)) ?? (await cache.match(keyPath));
            if (hit) {
              try {
                directFreed = (await hit.clone().arrayBuffer()).byteLength;
              } catch {
                directFreed = 0;
              }
              deletedDirect = (await cache.delete(fullKey)) || (await cache.delete(keyPath));
            }
          }
        }
      } catch {
        // ignore direct Cache API fallback error
      }
    }

    this.cachedUrlSet.delete(normalized);
    const localUpdated = removeCachedUrlFromUsage(this.storageUsage, normalized);
    if (res?.usage) {
      await this.applyRawStorageUsage(res.usage);
    } else {
      this.storageUsage = localUpdated.nextUsage;
    }

    this.status = {
      ...this.status,
      cachedUrls: Array.from(this.cachedUrlSet),
      cachedPageCount: this.cachedUrlSet.size,
    };
    this.emit();

    return {
      ok: Boolean(res?.ok ?? true),
      deleted: Boolean(res?.deleted || deletedDirect || localUpdated.removed),
      freedBytes: Math.max(res?.freedBytes ?? 0, directFreed, localUpdated.freedBytes),
    };
  }

  private async readBrowserStorageEstimate(): Promise<{ usage: number | null; quota: number | null }> {
    if (typeof navigator === 'undefined' || !navigator.storage?.estimate) {
      return { usage: null, quota: null };
    }
    try {
      const est = await navigator.storage.estimate();
      return {
        usage: typeof est.usage === 'number' && Number.isFinite(est.usage) ? est.usage : null,
        quota: typeof est.quota === 'number' && Number.isFinite(est.quota) ? est.quota : null,
      };
    } catch {
      return { usage: null, quota: null };
    }
  }

  private async applyRawStorageUsage(raw: Partial<StorageUsageBreakdown>): Promise<StorageUsageBreakdown> {
    const estimate = await this.readBrowserStorageEstimate();
    const rawBuckets = raw.buckets;
    const buckets: Record<CacheBucketKey, CacheBucketUsage> = {
      core: rawBuckets?.core ?? { ...EMPTY_STORAGE_USAGE.buckets.core },
      portalPages: rawBuckets?.portalPages ?? { ...EMPTY_STORAGE_USAGE.buckets.portalPages },
      portalState: rawBuckets?.portalState ?? { ...EMPTY_STORAGE_USAGE.buckets.portalState },
      fonts: rawBuckets?.fonts ?? { ...EMPTY_STORAGE_USAGE.buckets.fonts },
    };
    const cachedItems = Array.isArray(raw.cachedItems)
      ? raw.cachedItems.map((it) => ({
          url: String(it.url ?? ''),
          bytes: Number.isFinite(it.bytes) ? Math.max(0, Math.floor(it.bytes)) : 0,
          cachedAt: Number.isFinite(it.cachedAt) ? Math.floor(it.cachedAt) : 0,
        }))
      : [];
    const totalCacheBytes =
      typeof raw.totalCacheBytes === 'number' && Number.isFinite(raw.totalCacheBytes)
        ? Math.max(0, Math.floor(raw.totalCacheBytes))
        : buckets.core.bytes + buckets.portalPages.bytes + buckets.portalState.bytes + buckets.fonts.bytes;

    this.storageUsage = {
      measuredAt: typeof raw.measuredAt === 'number' ? raw.measuredAt : Date.now(),
      totalCacheBytes,
      browserEstimatedUsageBytes: estimate.usage,
      browserQuotaBytes: estimate.quota,
      buckets,
      cachedItems,
    };
    return this.storageUsage;
  }

  public async refreshStorageUsage(): Promise<StorageUsageBreakdown> {
    const res = await this.sendWorkerMessage<{ ok?: boolean; usage?: Partial<StorageUsageBreakdown> }>(
      { type: 'GET_STORAGE_USAGE' },
      7000,
    );
    if (res?.ok && res.usage) {
      await this.applyRawStorageUsage(res.usage);
      this.emit();
      return this.storageUsage;
    }

    // Fallback direct Cache API byte inspection
    if (typeof caches !== 'undefined') {
      const measureDirect = async (
        key: CacheBucketKey,
        label: string,
        cacheName: string,
        isPages = false,
      ): Promise<{ bucket: CacheBucketUsage; items: CachedPortalItemUsage[] }> => {
        const items: CachedPortalItemUsage[] = [];
        try {
          if (!(await caches.has(cacheName))) {
            return { bucket: { key, label, cacheName, bytes: 0, entries: 0 }, items };
          }
          const cache = await caches.open(cacheName);
          const keys = await cache.keys();
          let bytes = 0;
          for (const req of keys) {
            const hit = await cache.match(req);
            let sz = 0;
            if (hit) {
              try {
                sz = (await hit.clone().arrayBuffer()).byteLength;
              } catch {
                sz = Number(hit.headers.get('content-length') || '0') || 0;
              }
            }
            bytes += sz;
            if (isPages) {
              try {
                const u = new URL(req.url);
                const target = u.searchParams.get('url');
                if (target) {
                  items.push({
                    url: target,
                    bytes: sz,
                    cachedAt: Number(hit?.headers.get('X-Serpent-Cached-At') || '0') || 0,
                  });
                }
              } catch {
                // ignore
              }
            }
          }
          return { bucket: { key, label, cacheName, bytes, entries: keys.length }, items };
        } catch {
          return { bucket: { key, label, cacheName, bytes: 0, entries: 0 }, items };
        }
      };

      const [core, pages, state, fonts] = await Promise.all([
        measureDirect('core', 'Core App & 3D Assets', SW_CACHE_NAMES.core),
        measureDirect('portalPages', 'Cached Bookmark & Portal Pages', SW_CACHE_NAMES.portalPages, true),
        measureDirect('portalState', 'Bookmarks & Browser History Index', SW_CACHE_NAMES.portalState),
        measureDirect('fonts', 'Typography & Fonts Cache', SW_CACHE_NAMES.fonts),
      ]);

      await this.applyRawStorageUsage({
        measuredAt: Date.now(),
        totalCacheBytes:
          core.bucket.bytes + pages.bucket.bytes + state.bucket.bytes + fonts.bucket.bytes,
        buckets: {
          core: core.bucket,
          portalPages: pages.bucket,
          portalState: state.bucket,
          fonts: fonts.bucket,
        },
        cachedItems: pages.items.sort((a, b) => b.bytes - a.bytes),
      });
      this.emit();
      return this.storageUsage;
    }

    const estimate = await this.readBrowserStorageEstimate();
    this.storageUsage = {
      ...this.storageUsage,
      measuredAt: Date.now(),
      browserEstimatedUsageBytes: estimate.usage,
      browserQuotaBytes: estimate.quota,
    };
    this.emit();
    return this.storageUsage;
  }

  public async refreshStatus(): Promise<OfflineCacheStatus> {
    const res = await this.sendWorkerMessage<{ ok?: boolean; status?: Partial<OfflineCacheStatus> }>({
      type: 'GET_OFFLINE_STATUS',
    });

    if (res?.ok && res.status) {
      const nextUrls = Array.isArray(res.status.cachedUrls) ? res.status.cachedUrls : [];
      this.cachedUrlSet = new Set(nextUrls);
      this.status = {
        supported: true,
        registered: true,
        swVersion: res.status.swVersion ?? '2.0.0',
        coreAssetCount: res.status.coreAssetCount ?? 0,
        cachedPageCount: res.status.cachedPageCount ?? nextUrls.length,
        cachedUrls: nextUrls,
        stateSyncedAt: res.status.stateSyncedAt ?? 0,
        bookmarksCount: res.status.bookmarksCount ?? 0,
        historyCount: res.status.historyCount ?? 0,
        searchHistoryCount: res.status.searchHistoryCount ?? 0,
      };
      if (this.status.stateSyncedAt > this.lastSyncedAt) {
        this.lastSyncedAt = this.status.stateSyncedAt;
      }
      if (this.phase === 'initializing') {
        this.phase = this.online ? 'synced' : 'offline_cached';
      }
      void this.refreshStorageUsage();
      this.emit();
      return this.status;
    }

    // Fallback direct Cache API inspection if SW controller hasn't claimed yet
    if (typeof caches !== 'undefined') {
      try {
        const [hasCore, hasPages, stateSnapshot] = await Promise.all([
          caches.has(SW_CACHE_NAMES.core),
          caches.has(SW_CACHE_NAMES.portalPages),
          this.readCachedPortalState(),
        ]);
        const coreKeys = hasCore ? await (await caches.open(SW_CACHE_NAMES.core)).keys() : [];
        const pageKeys = hasPages ? await (await caches.open(SW_CACHE_NAMES.portalPages)).keys() : [];
        const nextUrls: string[] = [];
        for (const req of pageKeys) {
          try {
            const u = new URL(req.url);
            const target = u.searchParams.get('url');
            if (target) nextUrls.push(target);
          } catch {
            // ignore
          }
        }
        this.cachedUrlSet = new Set(nextUrls);
        this.status = {
          supported: typeof navigator !== 'undefined' && 'serviceWorker' in navigator,
          registered: Boolean(this.registration),
          swVersion: '2.0.0',
          coreAssetCount: coreKeys.length,
          cachedPageCount: nextUrls.length,
          cachedUrls: nextUrls,
          stateSyncedAt: stateSnapshot?.savedAt ?? 0,
          bookmarksCount: stateSnapshot?.customBookmarks.length ?? 0,
          historyCount: stateSnapshot?.browsingHistory.length ?? 0,
          searchHistoryCount: stateSnapshot?.searchHistory.length ?? 0,
        };
        if (this.status.stateSyncedAt > this.lastSyncedAt) {
          this.lastSyncedAt = this.status.stateSyncedAt;
        }
        void this.refreshStorageUsage();
        this.emit();
      } catch {
        // ignore
      }
    }
    return this.status;
  }
}
