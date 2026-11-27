import type {
  BrowserHistoryEntry,
  ChromiumTab,
  PortalBookmark,
} from '../../browser';
import { MemoryRepository } from './MemoryRepository';
import {
  DEFAULT_RETENTION_POLICY,
  PortalCollection,
  PortalRecord,
  PortalRegionId,
  PortalSearchOptions,
  RetentionPolicyConfig,
  applyRetentionPolicy,
  derivePortalRegion,
  derivePortalVisualState,
  extractFaviconGlyph,
  extractPortalDomain,
  searchPortalRecords,
} from './RetentionPolicy';

const COLLECTION_PALETTE = ['#f2c14e', '#2de3ff', '#3de095', '#a855f7', '#fb7185', '#38bdf8'];

function normalizePortalKeyUrl(raw: string): string {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) return '';
  if (trimmed.toLowerCase().startsWith('chrome://')) return trimmed.toLowerCase();
  try {
    const u = new URL(trimmed);
    u.hash = '';
    return u.toString();
  } catch {
    return trimmed;
  }
}

function stableUrlHash(url: string): string {
  let h = 2166136261;
  for (let i = 0; i < url.length; i++) {
    h ^= url.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

function isNavigablePortalUrl(url: string): boolean {
  const lower = String(url ?? '').trim().toLowerCase();
  if (!lower) return false;
  if (
    lower === 'chrome://newtab' ||
    lower === 'chrome://settings' ||
    lower === 'chrome://history' ||
    lower === 'chrome://bookmarks'
  ) {
    return false;
  }
  return lower.startsWith('http://') || lower.startsWith('https://') || lower.startsWith('chrome://');
}

export interface MemoryServiceDeletionHooks {
  onDeleteUrlFromBrowser?: (url: string) => void;
  onDeleteUrlFromOfflineCache?: (url: string) => void;
  onClearBrowserHistory?: () => void;
}

export interface PortalMemoryStats {
  total: number;
  activeCount: number;
  memoryCount: number;
  recoveryCount: number;
  collectionCount: number;
  pinnedCount: number;
  crashedRecoveredCount: number;
}

/**
 * Controlled domain service separating the 3D Portal World from raw browser storage.
 * Enforces distinct Active / Memory / Recovery / Collection semantics, crash-recovery
 * reconstruction, Gateway Hub collections, pinning, search, and genuine privacy deletion.
 */
export class MemoryService {
  private readonly repo: MemoryRepository;
  private readonly policy: RetentionPolicyConfig;
  private readonly sessionId: string;
  private records = new Map<string, PortalRecord>();
  private collections = new Map<string, PortalCollection>();
  private listeners = new Set<() => void>();
  private deletionHooks: MemoryServiceDeletionHooks = {};
  private crashedRecoveredCount = 0;
  private hydrated = false;

  constructor(
    repository?: MemoryRepository,
    policy: Partial<RetentionPolicyConfig> = {},
  ) {
    this.repo = repository ?? new MemoryRepository();
    this.policy = { ...DEFAULT_RETENTION_POLICY, ...policy };
    this.sessionId = `pm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  }

  public setDeletionHooks(hooks: MemoryServiceDeletionHooks): void {
    this.deletionHooks = hooks;
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

  public getStats(): PortalMemoryStats {
    let activeCount = 0;
    let memoryCount = 0;
    let recoveryCount = 0;
    let collectionCount = 0;
    let pinnedCount = 0;

    this.records.forEach((rec) => {
      if (rec.type === 'active') activeCount++;
      else if (rec.type === 'memory') memoryCount++;
      else if (rec.type === 'recovery') recoveryCount++;
      else if (rec.type === 'collection') collectionCount++;
      if (rec.pinned) pinnedCount++;
    });

    return {
      total: this.records.size,
      activeCount,
      memoryCount,
      recoveryCount,
      collectionCount,
      pinnedCount,
      crashedRecoveredCount: this.crashedRecoveredCount,
    };
  }

  public getAllRecords(): PortalRecord[] {
    return Array.from(this.records.values());
  }

  public getRecordById(id: string): PortalRecord | undefined {
    return this.records.get(id);
  }

  public getCollections(): PortalCollection[] {
    return Array.from(this.collections.values()).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  public search(options: PortalSearchOptions = {}): PortalRecord[] {
    return searchPortalRecords(this.getAllRecords(), options).sort(
      (a, b) => b.lastVisitedAt - a.lastVisitedAt,
    );
  }

  /**
   * Hydrates durable records from IndexedDB, reconstructs any crashed previous session
   * from the crash-recovery journal into Forgotten Ruins, and synchronizes current
   * browser tabs, saved bookmarks, and browsing history.
   */
  public async initializeFromBrowserState(input: {
    tabs: readonly ChromiumTab[];
    bookmarks: readonly PortalBookmark[];
    history: readonly BrowserHistoryEntry[];
  }): Promise<{ crashedRecovered: number }> {
    const [storedRecords, storedCollections, prevJournal] = await Promise.all([
      this.repo.getAllRecords(),
      this.repo.getAllCollections(),
      this.repo.readCrashJournal(),
    ]);

    this.records.clear();
    const now = Date.now();
    const retained = applyRetentionPolicy(storedRecords, now, this.policy);
    for (const rec of retained) {
      // Old 'active' records from a previous runtime are cleared & replaced by live tabs
      if (rec.type === 'active') continue;
      this.records.set(rec.id, {
        ...rec,
        visualState: derivePortalVisualState(rec),
        regionId: derivePortalRegion(rec, now, this.policy),
      });
    }

    this.collections.clear();
    for (const col of storedCollections) {
      this.collections.set(col.id, { ...col, portalUrls: [...col.portalUrls] });
    }

    // Seed a default starter collection on very first launch so Portal Halls feels alive
    if (this.collections.size === 0 && input.bookmarks.length > 0) {
      const starter: PortalCollection = {
        id: 'col-sanctuary-research',
        name: 'Sanctuary Research Hall',
        description: 'Pinned bookmarks & core knowledge gateways',
        colorHex: '#f2c14e',
        iconGlyph: 'SR',
        portalUrls: input.bookmarks.slice(0, 6).map((b) => normalizePortalKeyUrl(b.url)).filter(Boolean),
        pinned: true,
        createdAt: now,
        updatedAt: now,
      };
      this.collections.set(starter.id, starter);
      void this.repo.putCollection(starter);
    }

    // Reconstruct crashed tabs if previous session exited uncleanly
    let crashedRecovered = 0;
    if (prevJournal && !prevJournal.cleanShutdown && prevJournal.sessionId !== this.sessionId) {
      const openUrlsNow = new Set(input.tabs.map((t) => normalizePortalKeyUrl(t.displayUrl || t.url)));
      for (const crashedTab of prevJournal.activeTabs) {
        const normUrl = normalizePortalKeyUrl(crashedTab.url);
        if (!isNavigablePortalUrl(normUrl) || openUrlsNow.has(normUrl)) continue;
        this.upsertRecoveryRecord({
          url: normUrl,
          title: crashedTab.title || extractPortalDomain(normUrl),
          crashed: true,
          closedAt: prevJournal.updatedAt || now - 60_000,
          sessionMeta: 'Recovered from interrupted session',
        });
        crashedRecovered++;
      }
    }
    this.crashedRecoveredCount = crashedRecovered;

    // Sync collections into Portal Halls records
    this.rebuildCollectionRecords();

    // Merge bookmarks, browsing history, and active tabs
    this.syncBrowserSnapshot(input.tabs, input.bookmarks, input.history);
    this.hydrated = true;

    // Start live crash journal heartbeat (marked unclean until clean pagehide/unload)
    this.recordSessionHeartbeat(input.tabs, false);
    this.emit();
    return { crashedRecovered };
  }

  public isHydrated(): boolean {
    return this.hydrated;
  }

  public syncBrowserSnapshot(
    tabs: readonly ChromiumTab[],
    bookmarks: readonly PortalBookmark[],
    history: readonly BrowserHistoryEntry[],
  ): void {
    const now = Date.now();
    const bookmarkedUrls = new Set<string>();
    const bookmarkMap = new Map<string, PortalBookmark>();
    for (const bm of bookmarks) {
      const norm = normalizePortalKeyUrl(bm.url);
      if (!isNavigablePortalUrl(norm)) continue;
      bookmarkedUrls.add(norm);
      bookmarkMap.set(norm, bm);
    }

    // 1. Replace Active Portals (Active Gateway District)
    const oldActiveIds: string[] = [];
    this.records.forEach((rec, id) => {
      if (rec.type === 'active') oldActiveIds.push(id);
    });
    for (const id of oldActiveIds) {
      this.records.delete(id);
    }

    // Group open tabs by normalized URL so duplicate tabs display a clean tab counter
    const tabGroups = new Map<string, ChromiumTab[]>();
    for (const tab of tabs) {
      const rawUrl = tab.displayUrl || tab.url;
      if (!isNavigablePortalUrl(rawUrl)) continue;
      const norm = normalizePortalKeyUrl(rawUrl);
      const list = tabGroups.get(norm) ?? [];
      list.push(tab);
      tabGroups.set(norm, list);
    }

    const toPersist: PortalRecord[] = [];

    tabGroups.forEach((groupTabs, normUrl) => {
      const primary = groupTabs[0];
      const domain = extractPortalDomain(normUrl);
      const id = `active-${stableUrlHash(normUrl)}`;
      const existingMem = this.records.get(`mem-${stableUrlHash(normUrl)}`);
      const rec: PortalRecord = {
        id,
        type: 'active',
        visualState: existingMem?.pinned ? 'pinned' : 'active',
        url: normUrl,
        title: (primary.title || domain).slice(0, 72),
        domain,
        faviconGlyph: extractFaviconGlyph(primary.title || domain, domain),
        accentHex: '#2de3ff',
        tabId: primary.id,
        tabCount: groupTabs.length,
        lastVisitedAt: now,
        createdAt: existingMem?.createdAt ?? now,
        recoverable: false,
        pinned: Boolean(existingMem?.pinned),
        saved: bookmarkedUrls.has(normUrl),
        collectionIds: this.getCollectionIdsForUrl(normUrl),
        regionId: 'active_gateway',
        visitCount: Math.max(1, existingMem?.visitCount ?? 1),
        loading: Boolean(primary.isLoading),
        sessionMeta: groupTabs.length > 1 ? `${groupTabs.length} open tabs` : `Portal ${primary.portalVariant} tab`,
      };
      this.records.set(id, rec);
    });

    // 2. Sync Memory Records (Memory Forest & Archive Mountains)
    for (const entry of history) {
      const normUrl = normalizePortalKeyUrl(entry.url);
      if (!isNavigablePortalUrl(normUrl)) continue;
      const id = `mem-${stableUrlHash(normUrl)}`;
      const existing = this.records.get(id);
      const domain = extractPortalDomain(normUrl);
      const saved = bookmarkedUrls.has(normUrl) || Boolean(existing?.saved);
      const pinned = Boolean(existing?.pinned);
      const lastVisitedAt = Math.max(entry.visitedAt || now, existing?.lastVisitedAt ?? 0);
      const base: PortalRecord = {
        id,
        type: 'memory',
        visualState: 'saved',
        url: normUrl,
        title: (entry.title || existing?.title || domain).slice(0, 72),
        domain,
        faviconGlyph: extractFaviconGlyph(entry.title || domain, domain),
        accentHex: saved ? '#3de095' : '#5eead4',
        tabCount: 1,
        lastVisitedAt,
        createdAt: existing?.createdAt ?? lastVisitedAt,
        recoverable: true,
        pinned,
        saved,
        collectionIds: this.getCollectionIdsForUrl(normUrl),
        regionId: 'memory_forest',
        visitCount: Math.max(entry.visitCount || 1, existing?.visitCount ?? 1),
        sessionMeta: entry.portalLabel || 'Browsing memory',
      };
      base.visualState = derivePortalVisualState(base);
      base.regionId = derivePortalRegion(base, now, this.policy);
      this.records.set(id, base);
      toPersist.push(base);
    }

    // Ensure every saved bookmark is represented as a Saved Memory Portal even if not yet in history
    bookmarkMap.forEach((bm, normUrl) => {
      const id = `mem-${stableUrlHash(normUrl)}`;
      const existing = this.records.get(id);
      const domain = extractPortalDomain(normUrl);
      const lastVisitedAt = existing?.lastVisitedAt ?? bm.savedAt ?? now;
      const rec: PortalRecord = existing
        ? { ...existing, saved: true, title: bm.title || existing.title }
        : {
            id,
            type: 'memory',
            visualState: 'saved',
            url: normUrl,
            title: (bm.title || domain).slice(0, 72),
            domain,
            faviconGlyph: extractFaviconGlyph(bm.title || domain, domain),
            accentHex: '#3de095',
            tabCount: 1,
            lastVisitedAt,
            createdAt: bm.savedAt || now,
            recoverable: true,
            pinned: false,
            saved: true,
            collectionIds: this.getCollectionIdsForUrl(normUrl),
            regionId: 'archive_mountains',
            visitCount: 1,
            sessionMeta: 'Saved bookmark',
          };
      rec.visualState = derivePortalVisualState(rec);
      rec.regionId = derivePortalRegion(rec, now, this.policy);
      this.records.set(id, rec);
      toPersist.push(rec);
    });

    // Apply retention bounds cleanly
    const pruned = applyRetentionPolicy(this.getAllRecords(), now, this.policy);
    this.records.clear();
    for (const r of pruned) {
      this.records.set(r.id, r);
    }

    this.recordSessionHeartbeat(tabs, false);
    if (toPersist.length > 0) {
      void this.repo.putRecordsBulk(toPersist);
    }
    this.emit();
  }

  /**
   * Captures a closed tab as a purple Lost Portal in the Forgotten Ruins so
   * accidentally closed tabs can always be rediscovered and restored.
   */
  public recordClosedTab(tab: Pick<ChromiumTab, 'id' | 'url' | 'displayUrl' | 'title' | 'portalVariant'>): PortalRecord | null {
    const normUrl = normalizePortalKeyUrl(tab.displayUrl || tab.url);
    if (!isNavigablePortalUrl(normUrl)) return null;
    const rec = this.upsertRecoveryRecord({
      url: normUrl,
      title: tab.title || extractPortalDomain(normUrl),
      crashed: false,
      closedAt: Date.now(),
      sessionMeta: `Closed from Portal ${tab.portalVariant}`,
    });
    this.emit();
    return rec;
  }

  public upsertRecoveryRecord(input: {
    url: string;
    title: string;
    crashed: boolean;
    closedAt?: number;
    sessionMeta?: string;
  }): PortalRecord {
    const normUrl = normalizePortalKeyUrl(input.url);
    const domain = extractPortalDomain(normUrl);
    const now = input.closedAt ?? Date.now();
    const id = `rec-${stableUrlHash(normUrl)}`;
    const existing = this.records.get(id);
    const rec: PortalRecord = {
      id,
      type: 'recovery',
      visualState: 'lost',
      url: normUrl,
      title: (input.title || existing?.title || domain).slice(0, 72),
      domain,
      faviconGlyph: extractFaviconGlyph(input.title || domain, domain),
      accentHex: '#a855f7',
      tabCount: (existing?.tabCount ?? 0) + 1,
      lastVisitedAt: now,
      createdAt: existing?.createdAt ?? now,
      closedAt: now,
      crashed: input.crashed || Boolean(existing?.crashed),
      recoverable: true,
      pinned: false,
      saved: false,
      collectionIds: this.getCollectionIdsForUrl(normUrl),
      regionId: 'forgotten_ruins',
      visitCount: (existing?.visitCount ?? 0) + 1,
      sessionMeta:
        input.sessionMeta ??
        (input.crashed ? 'Reconstructed after session crash' : 'Accidentally closed tab'),
    };
    this.records.set(id, rec);
    void this.repo.putRecord(rec);
    return rec;
  }

  public async markRecovered(recordId: string): Promise<PortalRecord | null> {
    const rec = this.records.get(recordId);
    if (!rec) return null;
    if (rec.type === 'recovery') {
      this.records.delete(recordId);
      await this.repo.deleteRecord(recordId);
      this.emit();
    }
    return rec;
  }

  public recordSessionHeartbeat(tabs: readonly ChromiumTab[], cleanShutdown = false): void {
    const activeTabs = tabs
      .filter((t) => isNavigablePortalUrl(t.displayUrl || t.url))
      .slice(0, 24)
      .map((t) => ({
        tabId: t.id,
        url: normalizePortalKeyUrl(t.displayUrl || t.url),
        title: t.title || extractPortalDomain(t.displayUrl || t.url),
        portalVariant: t.portalVariant,
      }));
    this.repo.writeCrashJournalSync({
      sessionId: this.sessionId,
      updatedAt: Date.now(),
      cleanShutdown,
      activeTabs,
    });
  }

  public async togglePinRecord(recordId: string): Promise<boolean> {
    const rec = this.records.get(recordId);
    if (!rec) return false;
    rec.pinned = !rec.pinned;
    rec.visualState = derivePortalVisualState(rec);
    rec.regionId = derivePortalRegion(rec, Date.now(), this.policy);
    await this.repo.putRecord(rec);
    // Also mirror pin state onto matching memory record if toggling an active portal
    if (rec.type === 'active') {
      const memId = `mem-${stableUrlHash(rec.url)}`;
      const memRec = this.records.get(memId);
      if (memRec) {
        memRec.pinned = rec.pinned;
        memRec.visualState = derivePortalVisualState(memRec);
        memRec.regionId = derivePortalRegion(memRec, Date.now(), this.policy);
        await this.repo.putRecord(memRec);
      }
    }
    this.emit();
    return rec.pinned;
  }

  public createCollection(name: string, description = '', colorHex?: string): PortalCollection {
    const cleanName = name.trim().slice(0, 48) || 'Custom Portal Hall';
    const now = Date.now();
    const color =
      colorHex && /^#[0-9a-f]{6}$/i.test(colorHex)
        ? colorHex
        : COLLECTION_PALETTE[this.collections.size % COLLECTION_PALETTE.length];
    const col: PortalCollection = {
      id: `col-${now.toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
      name: cleanName,
      description: description.trim().slice(0, 120) || 'Curated browsing portal hub',
      colorHex: color,
      iconGlyph: extractFaviconGlyph(cleanName, cleanName),
      portalUrls: [],
      pinned: true,
      createdAt: now,
      updatedAt: now,
    };
    this.collections.set(col.id, col);
    void this.repo.putCollection(col);
    this.rebuildCollectionRecords();
    this.emit();
    return col;
  }

  public addUrlToCollection(collectionId: string, rawUrl: string): boolean {
    const col = this.collections.get(collectionId);
    const norm = normalizePortalKeyUrl(rawUrl);
    if (!col || !isNavigablePortalUrl(norm)) return false;
    if (!col.portalUrls.includes(norm)) {
      col.portalUrls.push(norm);
      col.updatedAt = Date.now();
      void this.repo.putCollection(col);
      this.rebuildCollectionRecords();
      this.emit();
    }
    return true;
  }

  public removeUrlFromCollection(collectionId: string, rawUrl: string): boolean {
    const col = this.collections.get(collectionId);
    const norm = normalizePortalKeyUrl(rawUrl);
    if (!col) return false;
    const before = col.portalUrls.length;
    col.portalUrls = col.portalUrls.filter((u) => u !== norm);
    if (col.portalUrls.length !== before) {
      col.updatedAt = Date.now();
      void this.repo.putCollection(col);
      this.rebuildCollectionRecords();
      this.emit();
      return true;
    }
    return false;
  }

  public async deleteCollection(collectionId: string): Promise<boolean> {
    if (!this.collections.has(collectionId)) return false;
    this.collections.delete(collectionId);
    this.records.delete(`hub-${collectionId}`);
    await this.repo.deleteCollection(collectionId);
    await this.repo.deleteRecord(`hub-${collectionId}`);
    this.emit();
    return true;
  }

  public encodeCollectionShareCode(collectionId: string): string | null {
    const col = this.collections.get(collectionId);
    if (!col) return null;
    const payload = {
      v: 1,
      n: col.name,
      d: col.description,
      c: col.colorHex,
      u: col.portalUrls.slice(0, 24),
    };
    try {
      const json = JSON.stringify(payload);
      const b64 =
        typeof btoa === 'function'
          ? btoa(unescape(encodeURIComponent(json)))
          : Buffer.from(json, 'utf-8').toString('base64');
      return `PMHUB1|${b64}`;
    } catch {
      return null;
    }
  }

  public importCollectionShareCode(rawCode: string): PortalCollection | null {
    const trimmed = String(rawCode ?? '').trim();
    if (!trimmed.startsWith('PMHUB1|')) return null;
    try {
      const b64 = trimmed.slice('PMHUB1|'.length);
      const json =
        typeof atob === 'function'
          ? decodeURIComponent(escape(atob(b64)))
          : Buffer.from(b64, 'base64').toString('utf-8');
      const parsed = JSON.parse(json) as { n?: string; d?: string; c?: string; u?: string[] };
      if (!parsed || typeof parsed.n !== 'string') return null;
      const col = this.createCollection(parsed.n, parsed.d ?? '', parsed.c);
      if (Array.isArray(parsed.u)) {
        for (const url of parsed.u) {
          this.addUrlToCollection(col.id, url);
        }
      }
      return col;
    } catch {
      return null;
    }
  }

  private getCollectionIdsForUrl(normUrl: string): string[] {
    const ids: string[] = [];
    this.collections.forEach((col) => {
      if (col.portalUrls.includes(normUrl)) ids.push(col.id);
    });
    return ids;
  }

  private rebuildCollectionRecords(): void {
    // Remove stale hub records
    const staleHubIds: string[] = [];
    this.records.forEach((rec, id) => {
      if (rec.type === 'collection') staleHubIds.push(id);
    });
    for (const id of staleHubIds) {
      this.records.delete(id);
    }

    this.collections.forEach((col) => {
      const hubId = `hub-${col.id}`;
      const rec: PortalRecord = {
        id: hubId,
        type: 'collection',
        visualState: 'pinned',
        url: col.portalUrls[0] ?? 'chrome://bookmarks',
        title: col.name,
        domain: `${col.portalUrls.length} portal${col.portalUrls.length === 1 ? '' : 's'} · Gateway Hub`,
        faviconGlyph: col.iconGlyph,
        accentHex: col.colorHex,
        tabCount: col.portalUrls.length,
        lastVisitedAt: col.updatedAt,
        createdAt: col.createdAt,
        recoverable: false,
        pinned: true,
        saved: true,
        collectionIds: [col.id],
        collectionId: col.id,
        regionId: 'portal_halls',
        visitCount: col.portalUrls.length,
        sessionMeta: col.description,
      };
      this.records.set(hubId, rec);
    });
  }

  /**
   * Genuine privacy-respecting permanent deletion: removes the record from Portal World,
   * deletes it from IndexedDB, removes it from collections, and triggers deletion hooks
   * for browser history & Service Worker offline cache.
   */
  public async deleteRecordPermanently(recordId: string): Promise<boolean> {
    const target = this.records.get(recordId);
    if (!target) return false;
    const targetUrl = target.url;

    // Delete matching record + any shadow records for the same URL (except collections themselves)
    const idsToErase: string[] = [recordId];
    if (target.type !== 'collection') {
      this.records.forEach((rec, id) => {
        if (id !== recordId && rec.type !== 'collection' && rec.url === targetUrl) {
          idsToErase.push(id);
        }
      });
    } else if (target.collectionId) {
      await this.deleteCollection(target.collectionId);
      return true;
    }

    for (const id of idsToErase) {
      this.records.delete(id);
      await this.repo.deleteRecord(id);
    }

    // Remove from any collections
    this.collections.forEach((col) => {
      if (col.portalUrls.includes(targetUrl)) {
        col.portalUrls = col.portalUrls.filter((u) => u !== targetUrl);
        void this.repo.putCollection(col);
      }
    });
    this.rebuildCollectionRecords();

    // Propagate genuine deletion to Browser history & Service Worker Cache Storage
    this.deletionHooks.onDeleteUrlFromBrowser?.(targetUrl);
    this.deletionHooks.onDeleteUrlFromOfflineCache?.(targetUrl);

    this.emit();
    return true;
  }

  public async clearMemoryHistory(includeSaved = false): Promise<number> {
    const idsToDelete: string[] = [];
    this.records.forEach((rec, id) => {
      if (rec.type === 'memory' && (includeSaved || (!rec.saved && !rec.pinned))) {
        idsToDelete.push(id);
      }
    });
    for (const id of idsToDelete) {
      const rec = this.records.get(id);
      this.records.delete(id);
      await this.repo.deleteRecord(id);
      if (rec) {
        this.deletionHooks.onDeleteUrlFromOfflineCache?.(rec.url);
      }
    }
    this.deletionHooks.onClearBrowserHistory?.();
    this.emit();
    return idsToDelete.length;
  }

  public async clearRecoveryRecords(): Promise<number> {
    const removed = await this.repo.deleteRecordsByType('recovery');
    const ids: string[] = [];
    this.records.forEach((rec, id) => {
      if (rec.type === 'recovery') ids.push(id);
    });
    for (const id of ids) {
      this.records.delete(id);
    }
    this.emit();
    return Math.max(removed, ids.length);
  }

  public getRegionSummary(): Array<{ regionId: PortalRegionId; count: number }> {
    const counts = new Map<PortalRegionId, number>([
      ['central_sanctuary', 5],
      ['active_gateway', 0],
      ['memory_forest', 0],
      ['forgotten_ruins', 0],
      ['archive_mountains', 0],
      ['portal_halls', 0],
    ]);
    this.records.forEach((rec) => {
      counts.set(rec.regionId, (counts.get(rec.regionId) ?? 0) + 1);
    });
    return Array.from(counts.entries()).map(([regionId, count]) => ({ regionId, count }));
  }
}
