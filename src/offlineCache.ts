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
 * Coordinates registration of /sw.js, live online/offline detection, automatic warming of
 * core Vite JS/CSS/icon bundles, syncing saved bookmarks & portal history into Cache Storage,
 * and proactively caching bookmarked portal pages for offline viewing.
 */
export class PortalOfflineCacheController {
  private registration: ServiceWorkerRegistration | null = null;
  private online = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private status: OfflineCacheStatus = {
    ...EMPTY_OFFLINE_CACHE_STATUS,
    supported: typeof navigator !== 'undefined' && 'serviceWorker' in navigator,
  };
  private cachedUrlSet = new Set<string>();
  private listeners = new Set<() => void>();
  private syncTimer: number | null = null;
  private pendingSnapshot: PortalOfflineStateSnapshot | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.online = true;
        this.emit();
        void this.refreshStatus();
      });
      window.addEventListener('offline', () => {
        this.online = false;
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
      this.emit();
      return;
    }

    try {
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
      this.emit();
    }
  }

  public async warmCurrentPageCoreAssets(): Promise<number> {
    if (typeof document === 'undefined' || typeof window === 'undefined') return 0;
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
      if (el.href && (el.rel === 'stylesheet' || el.rel === 'modulepreload' || el.rel === 'icon' || el.rel === 'apple-touch-icon' || el.rel === 'manifest')) {
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
    return res?.cachedCount ?? 0;
  }

  public schedulePortalStateSync(snapshot: PortalOfflineStateSnapshot): void {
    this.pendingSnapshot = snapshot;
    if (typeof window === 'undefined') return;
    if (this.syncTimer !== null) {
      window.clearTimeout(this.syncTimer);
    }
    this.syncTimer = window.setTimeout(() => {
      this.syncTimer = null;
      if (this.pendingSnapshot) {
        void this.syncPortalStateNow(this.pendingSnapshot);
      }
    }, 240);
  }

  public async syncPortalStateNow(snapshot: PortalOfflineStateSnapshot): Promise<boolean> {
    this.pendingSnapshot = snapshot;
    // Also write directly to Cache API if available so state is persisted immediately even before SW claims the first load
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
    this.status = {
      ...this.status,
      stateSyncedAt: snapshot.savedAt,
      bookmarksCount: snapshot.customBookmarks.length,
      historyCount: snapshot.browsingHistory.length,
      searchHistoryCount: snapshot.searchHistory.length,
    };
    this.emit();
    return Boolean(res?.ok || wroteDirectly);
  }

  public async readCachedPortalState(): Promise<PortalOfflineStateSnapshot | null> {
    if (typeof caches === 'undefined') return null;
    try {
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
    const res = await this.sendWorkerMessage<{ ok?: boolean; attempted?: number; cached?: number }>(
      {
        type: 'PRECACHE_PORTAL_URLS',
        urls: Array.from(urls),
        shield: settings?.trackerShield === false ? '0' : '1',
        ua: settings?.userAgentPreset ?? 'serpent_portal',
      },
      15000,
    );
    await this.refreshStatus();
    return {
      attempted: res?.attempted ?? 0,
      cached: res?.cached ?? 0,
    };
  }

  public async clearCachedPortalPages(): Promise<boolean> {
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
    return Boolean(res?.ok ?? true);
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
      this.emit();
      return this.status;
    }

    // Fallback direct Cache API inspection if SW controller hasn't claimed yet
    if (typeof caches !== 'undefined') {
      try {
        const [coreCache, pageCache, stateSnapshot] = await Promise.all([
          caches.open(SW_CACHE_NAMES.core),
          caches.open(SW_CACHE_NAMES.portalPages),
          this.readCachedPortalState(),
        ]);
        const [coreKeys, pageKeys] = await Promise.all([coreCache.keys(), pageCache.keys()]);
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
        this.emit();
      } catch {
        // ignore
      }
    }
    return this.status;
  }
}
