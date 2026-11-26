import { EVOLUTION_STAGES } from './evolution';
import { WORLD_LANDMARKS } from './terrain';

export type PortalVariant = 'A' | 'B';

export interface ChromiumTab {
  id: string;
  title: string;
  url: string;
  displayUrl: string;
  portalVariant: PortalVariant;
  history: string[];
  historyIndex: number;
  proxyMode: boolean;
  isLoading: boolean;
}

export interface ResolvedOmniboxTarget {
  url: string;
  displayUrl: string;
  titleGuess: string;
  isInternal: boolean;
  searchQuery?: string;
  searchEngine?: SearchEngineId;
}

export interface PortalBookmark {
  title: string;
  url: string;
  badge: string;
  accentHex: string;
  savedAt?: number;
  portalVariant?: PortalVariant;
  portalLabel?: string;
  isCustom?: boolean;
}

export const CHROMIUM_ENGINE_META = {
  browserName: 'Portal Chromium',
  engineVersion: 'Chromium 131.0.6778.86 (Official Portal Blink Build) (64-bit)',
  blinkVersion: '537.36 (@portal-wormhole-compositor)',
  v8Version: '13.1.201.8-webgl2',
  userAgent:
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 SerpentPeaksPortal/2.4',
  commandLine:
    '--enable-features=PortalWormholeCompositor,WebGL2Compute --ozone-platform=threejs-portal --process-per-portal-tab',
} as const;

export const PORTAL_BOOKMARKS: PortalBookmark[] = [
  {
    title: 'New Tab',
    url: 'chrome://newtab',
    badge: '✦',
    accentHex: '#38bdf8',
  },
  {
    title: 'Wikipedia',
    url: 'https://en.m.wikipedia.org/wiki/Main_Page',
    badge: 'W',
    accentHex: '#60a5fa',
  },
  {
    title: 'DuckDuckGo Search',
    url: 'https://lite.duckduckgo.com/lite/',
    badge: '🔍',
    accentHex: '#fb923c',
  },
  {
    title: 'Hacker News',
    url: 'https://news.ycombinator.com/',
    badge: 'Y',
    accentHex: '#f97316',
  },
  {
    title: 'Peaks Atlas',
    url: 'chrome://peaks-atlas',
    badge: '⛰',
    accentHex: '#34d399',
  },
  {
    title: 'Example.com',
    url: 'https://example.com/',
    badge: '🌐',
    accentHex: '#a78bfa',
  },
  {
    title: 'chrome://version',
    url: 'chrome://version',
    badge: '⚙',
    accentHex: '#e879f9',
  },
];

export type SearchEngineId = 'duckduckgo' | 'wikipedia' | 'brave' | 'ecosia' | 'bing' | 'google';
export type UserAgentPreset = 'serpent_portal' | 'desktop_chrome' | 'mobile_chrome';
export type StartupMode = 'game' | 'browser';
export type NewTabBehavior = 'newtab' | 'mirror_house' | 'homepage';

export interface SearchEngineDef {
  id: SearchEngineId;
  name: string;
  queryTemplate: string;
  homeUrl: string;
  note: string;
}

export const SEARCH_ENGINE_CATALOG: Record<SearchEngineId, SearchEngineDef> = {
  duckduckgo: {
    id: 'duckduckgo',
    name: 'DuckDuckGo Lite',
    queryTemplate: 'https://lite.duckduckgo.com/lite/?q={q}',
    homeUrl: 'https://lite.duckduckgo.com/lite/',
    note: 'Fast private HTML search (best proxy compatibility)',
  },
  wikipedia: {
    id: 'wikipedia',
    name: 'Wikipedia',
    queryTemplate: 'https://en.m.wikipedia.org/w/index.php?search={q}',
    homeUrl: 'https://en.m.wikipedia.org/wiki/Main_Page',
    note: 'Encyclopedia knowledge search',
  },
  brave: {
    id: 'brave',
    name: 'Brave Search',
    queryTemplate: 'https://search.brave.com/search?q={q}',
    homeUrl: 'https://search.brave.com/',
    note: 'Independent privacy-first web index',
  },
  ecosia: {
    id: 'ecosia',
    name: 'Ecosia',
    queryTemplate: 'https://www.ecosia.org/search?q={q}',
    homeUrl: 'https://www.ecosia.org/',
    note: 'Eco-focused web search',
  },
  bing: {
    id: 'bing',
    name: 'Bing',
    queryTemplate: 'https://www.bing.com/search?q={q}',
    homeUrl: 'https://www.bing.com/',
    note: 'Broad web results',
  },
  google: {
    id: 'google',
    name: 'Google',
    queryTemplate: 'https://www.google.com/search?q={q}',
    homeUrl: 'https://www.google.com/',
    note: 'Standard Google search',
  },
};

export interface BrowserSettings {
  startupMode: StartupMode;
  searchEngine: SearchEngineId;
  homepageUrl: string;
  newTabBehavior: NewTabBehavior;
  defaultProxyMode: boolean;
  trackerShield: boolean;
  userAgentPreset: UserAgentPreset;
  zoomPercent: number;
  showBookmarksBar: boolean;
  standaloneFullscreen: boolean;
}

export interface BrowserHistoryEntry {
  id: string;
  url: string;
  title: string;
  visitedAt: number;
  portalVariant: PortalVariant;
  portalLabel: string;
  sessionId: string;
  profileId: string;
  visitCount: number;
}

export type BrowserHistoryTimeBucket = 'Today' | 'Yesterday' | 'Earlier This Week' | 'Older';

export interface BrowserHistoryFilterOptions {
  query?: string;
  portalVariant?: 'all' | PortalVariant;
  sessionId?: string;
  profileId?: string;
}

export interface BrowserHistoryGroup {
  bucket: BrowserHistoryTimeBucket;
  entries: BrowserHistoryEntry[];
}

export interface BrowserHistoryStats {
  totalEntries: number;
  sessionEntries: number;
  uniqueHosts: number;
  portalAEntries: number;
  portalBEntries: number;
  totalSearches: number;
  customBookmarks: number;
}

export interface SearchHistoryEntry {
  id: string;
  query: string;
  searchEngine: SearchEngineId;
  resolvedUrl: string;
  searchedAt: number;
  portalVariant: PortalVariant;
  portalLabel: string;
  sessionId: string;
  searchCount: number;
}

export interface SearchHistoryFilterOptions {
  query?: string;
  portalVariant?: 'all' | PortalVariant;
  sessionId?: string;
}

export const MAX_BROWSER_HISTORY_ENTRIES = 200;
export const MAX_SEARCH_HISTORY_ENTRIES = 100;

export interface PortalVisitRecord {
  portalId: string;
  label: string;
  variant: PortalVariant;
  x: number;
  z: number;
  visitCount: number;
  lastVisitedAt: number;
  floorNumber: number;
  missionTitle: string;
  completed: boolean;
}

export interface NewTabSuggestedPortal {
  portalId: string;
  label: string;
  variant: PortalVariant;
  x: number;
  z: number;
  floorNumber: number;
  missionTitle: string;
  completed: boolean;
}

export interface NewTabCultivationSnapshot {
  level: number;
  maxLevel: number;
  stageTitle: string;
  realmName: string;
  xp: number;
  nextLevelXp: number;
  xpProgressPct: number;
  nextStageTitle: string;
  isHuman: boolean;
  shrinesConquered: number;
  totalShrines: number;
  nextShrineName: string;
  soulsCollected: number;
  soulTarget: number;
  comaClock: string;
  bestiaryDiscovered: number;
  bestiaryTotal: number;
  archivesUnlocked: number;
  archivesTotal: number;
  cultivationMult: number;
  activeBuffName: string;
  rareMaterialsCount: number;
  discoveredMaterialsCount: number;
  totalMaterialsCount: number;
  suggestedPortals: NewTabSuggestedPortal[];
}

export function derivePortalLandmarkName(
  x: number,
  z: number,
  variant: PortalVariant,
): string {
  let nearestName = 'Emerald Valley';
  let bestDist = Infinity;
  for (const lm of WORLD_LANDMARKS) {
    const d = Math.hypot(lm.x - x, lm.z - z);
    if (d < bestDist) {
      bestDist = d;
      nearestName = lm.name;
    }
  }
  const suffix = variant === 'A' ? 'Azure Gate' : 'Crimson Gate';
  return `${nearestName} · ${suffix}`;
}

export function rankFrequentPortals(
  visits: PortalVisitRecord[],
  limit = 6,
): PortalVisitRecord[] {
  const max = Math.max(1, Math.floor(limit));
  return [...visits]
    .filter((v) => v && typeof v.portalId === 'string' && v.visitCount > 0)
    .sort((a, b) => {
      if (b.visitCount !== a.visitCount) return b.visitCount - a.visitCount;
      return b.lastVisitedAt - a.lastVisitedAt;
    })
    .slice(0, max);
}

export function isTrackableHistoryUrl(rawUrl: string): boolean {
  const trimmed = String(rawUrl ?? '').trim();
  if (!trimmed) return false;
  const lower = trimmed.toLowerCase();
  if (
    lower === 'chrome://newtab' ||
    lower === 'chrome://settings' ||
    lower === 'chrome://history' ||
    lower === 'chrome://bookmarks' ||
    lower === 'serpent://newtab' ||
    lower === 'serpent://settings' ||
    lower === 'serpent://history' ||
    lower === 'serpent://bookmarks'
  ) {
    return false;
  }
  return (
    lower.startsWith('http://') ||
    lower.startsWith('https://') ||
    lower.startsWith('chrome://')
  );
}

export function extractHistoryHost(rawUrl: string): string {
  const trimmed = String(rawUrl ?? '').trim();
  if (trimmed.toLowerCase().startsWith('chrome://')) {
    return trimmed.toLowerCase().split(/[/?#]/)[0];
  }
  try {
    return new URL(trimmed).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return trimmed.replace(/^https?:\/\//i, '').split('/')[0].toLowerCase() || 'unknown';
  }
}

export function sanitizeHistoryEntry(
  raw: Partial<BrowserHistoryEntry> | null | undefined,
  fallbackIndex = 0,
): BrowserHistoryEntry | null {
  if (!raw || typeof raw.url !== 'string') return null;
  const cleanUrl = raw.url.trim().slice(0, 512);
  if (!isTrackableHistoryUrl(cleanUrl)) return null;
  const visitedAt =
    typeof raw.visitedAt === 'number' && Number.isFinite(raw.visitedAt) && raw.visitedAt > 0
      ? Math.floor(raw.visitedAt)
      : Date.now();
  const cleanTitle =
    typeof raw.title === 'string' && raw.title.trim()
      ? raw.title.trim().slice(0, 96)
      : extractHistoryHost(cleanUrl) || cleanUrl.slice(0, 64);
  const id =
    typeof raw.id === 'string' && raw.id.trim()
      ? raw.id.trim().slice(0, 64)
      : `hist-${visitedAt.toString(36)}-${fallbackIndex}`;
  const portalVariant: PortalVariant = raw.portalVariant === 'B' ? 'B' : 'A';
  const portalLabel =
    typeof raw.portalLabel === 'string' && raw.portalLabel.trim()
      ? raw.portalLabel.trim().slice(0, 64)
      : 'Portal Session';
  const sessionId =
    typeof raw.sessionId === 'string' && raw.sessionId.trim()
      ? raw.sessionId.trim().slice(0, 48)
      : 'previous-session';
  const profileId =
    typeof raw.profileId === 'string' && raw.profileId.trim()
      ? raw.profileId.trim().slice(0, 48)
      : 'serpent-sovereign';
  const visitCount =
    typeof raw.visitCount === 'number' && Number.isFinite(raw.visitCount)
      ? Math.max(1, Math.floor(raw.visitCount))
      : 1;

  return {
    id,
    url: cleanUrl,
    title: cleanTitle,
    visitedAt,
    portalVariant,
    portalLabel,
    sessionId,
    profileId,
    visitCount,
  };
}

export function filterBrowserHistory(
  entries: BrowserHistoryEntry[],
  options: BrowserHistoryFilterOptions = {},
): BrowserHistoryEntry[] {
  const query = (options.query ?? '').trim().toLowerCase();
  const variant = options.portalVariant ?? 'all';
  const sessionId = options.sessionId?.trim() || '';
  const profileId = options.profileId?.trim() || '';

  return entries.filter((entry) => {
    if (variant !== 'all' && entry.portalVariant !== variant) return false;
    if (sessionId && entry.sessionId !== sessionId) return false;
    if (profileId && entry.profileId !== profileId) return false;
    if (!query) return true;
    const haystack = `${entry.title} ${entry.url} ${entry.portalLabel} portal ${entry.portalVariant}`.toLowerCase();
    return haystack.includes(query);
  });
}

export function groupHistoryByTimeBucket(
  entries: BrowserHistoryEntry[],
  nowMs = Date.now(),
): BrowserHistoryGroup[] {
  const nowDate = new Date(nowMs);
  const startOfToday = new Date(
    nowDate.getFullYear(),
    nowDate.getMonth(),
    nowDate.getDate(),
  ).getTime();
  const msPerDay = 24 * 60 * 60 * 1000;
  const startOfYesterday = startOfToday - msPerDay;
  const startOfWeek = startOfToday - 6 * msPerDay;

  const buckets: Record<BrowserHistoryTimeBucket, BrowserHistoryEntry[]> = {
    Today: [],
    Yesterday: [],
    'Earlier This Week': [],
    Older: [],
  };

  const sorted = [...entries].sort((a, b) => b.visitedAt - a.visitedAt);
  for (const entry of sorted) {
    if (entry.visitedAt >= startOfToday) {
      buckets.Today.push(entry);
    } else if (entry.visitedAt >= startOfYesterday) {
      buckets.Yesterday.push(entry);
    } else if (entry.visitedAt >= startOfWeek) {
      buckets['Earlier This Week'].push(entry);
    } else {
      buckets.Older.push(entry);
    }
  }

  const order: BrowserHistoryTimeBucket[] = ['Today', 'Yesterday', 'Earlier This Week', 'Older'];
  const groups: BrowserHistoryGroup[] = [];
  for (const bucket of order) {
    if (buckets[bucket].length > 0) {
      groups.push({ bucket, entries: buckets[bucket] });
    }
  }
  return groups;
}

export function normalizeBookmarkUrl(rawUrl: string): string | null {
  const trimmed = String(rawUrl ?? '').trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  if (
    lower === 'chrome://newtab' ||
    lower === 'chrome://settings' ||
    lower === 'chrome://history' ||
    lower === 'chrome://bookmarks' ||
    lower === 'serpent://newtab' ||
    lower === 'serpent://settings' ||
    lower === 'serpent://history' ||
    lower === 'serpent://bookmarks'
  ) {
    return null;
  }
  if (lower.startsWith('chrome://') || lower.startsWith('serpent://')) {
    return trimmed.replace(/^serpent:\/\//i, 'chrome://').slice(0, 320);
  }
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      return new URL(trimmed).toString().slice(0, 320);
    } catch {
      return null;
    }
  }
  if (!/\s/.test(trimmed) && /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/.*)?$/i.test(trimmed)) {
    try {
      return new URL(`https://${trimmed}`).toString().slice(0, 320);
    } catch {
      return null;
    }
  }
  return null;
}

export function sanitizeSearchHistoryEntry(
  raw: Partial<SearchHistoryEntry> | null | undefined,
  fallbackIndex = 0,
): SearchHistoryEntry | null {
  if (!raw || typeof raw.query !== 'string') return null;
  const cleanQuery = raw.query.trim().slice(0, 140);
  if (!cleanQuery) return null;
  const searchedAt =
    typeof raw.searchedAt === 'number' && Number.isFinite(raw.searchedAt) && raw.searchedAt > 0
      ? Math.floor(raw.searchedAt)
      : Date.now();
  const engine: SearchEngineId =
    raw.searchEngine && raw.searchEngine in SEARCH_ENGINE_CATALOG
      ? raw.searchEngine
      : 'duckduckgo';
  const resolvedUrl =
    typeof raw.resolvedUrl === 'string' && raw.resolvedUrl.trim().startsWith('http')
      ? raw.resolvedUrl.trim().slice(0, 512)
      : SEARCH_ENGINE_CATALOG[engine].queryTemplate.replace('{q}', encodeURIComponent(cleanQuery));
  const id =
    typeof raw.id === 'string' && raw.id.trim()
      ? raw.id.trim().slice(0, 64)
      : `srch-${searchedAt.toString(36)}-${fallbackIndex}`;
  const portalVariant: PortalVariant = raw.portalVariant === 'B' ? 'B' : 'A';
  const portalLabel =
    typeof raw.portalLabel === 'string' && raw.portalLabel.trim()
      ? raw.portalLabel.trim().slice(0, 64)
      : 'Portal Session';
  const sessionId =
    typeof raw.sessionId === 'string' && raw.sessionId.trim()
      ? raw.sessionId.trim().slice(0, 48)
      : 'previous-session';
  const searchCount =
    typeof raw.searchCount === 'number' && Number.isFinite(raw.searchCount)
      ? Math.max(1, Math.floor(raw.searchCount))
      : 1;

  return {
    id,
    query: cleanQuery,
    searchEngine: engine,
    resolvedUrl,
    searchedAt,
    portalVariant,
    portalLabel,
    sessionId,
    searchCount,
  };
}

export function filterSearchHistory(
  entries: SearchHistoryEntry[],
  options: SearchHistoryFilterOptions = {},
): SearchHistoryEntry[] {
  const query = (options.query ?? '').trim().toLowerCase();
  const variant = options.portalVariant ?? 'all';
  const sessionId = (options.sessionId ?? '').trim();

  return entries.filter((entry) => {
    if (variant !== 'all' && entry.portalVariant !== variant) return false;
    if (sessionId && entry.sessionId !== sessionId) return false;
    if (!query) return true;
    const engineName = SEARCH_ENGINE_CATALOG[entry.searchEngine]?.name ?? entry.searchEngine;
    const haystack = `${entry.query} ${engineName} ${entry.portalLabel} portal ${entry.portalVariant}`.toLowerCase();
    return haystack.includes(query);
  });
}

function escapeHtml(raw: string): string {
  return String(raw ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const DEFAULT_BROWSER_SETTINGS: BrowserSettings = {
  startupMode: 'game',
  searchEngine: 'duckduckgo',
  homepageUrl: 'chrome://newtab',
  newTabBehavior: 'newtab',
  defaultProxyMode: true,
  trackerShield: true,
  userAgentPreset: 'serpent_portal',
  zoomPercent: 100,
  showBookmarksBar: true,
  standaloneFullscreen: false,
};

const STORAGE_KEY = 'SERPENT_PEAKS_PORTAL_TABS_V1';
const SETTINGS_STORAGE_KEY = 'SERPENT_PEAKS_BROWSER_SETTINGS_V1';

export function sanitizeBrowserSettings(raw: Partial<BrowserSettings> | null | undefined): BrowserSettings {
  const base = { ...DEFAULT_BROWSER_SETTINGS };
  if (!raw || typeof raw !== 'object') return base;
  if (raw.startupMode === 'game' || raw.startupMode === 'browser') {
    base.startupMode = raw.startupMode;
  }
  if (typeof raw.searchEngine === 'string' && raw.searchEngine in SEARCH_ENGINE_CATALOG) {
    base.searchEngine = raw.searchEngine as SearchEngineId;
  }
  if (typeof raw.homepageUrl === 'string' && raw.homepageUrl.trim().length > 0) {
    base.homepageUrl = raw.homepageUrl.trim().slice(0, 260);
  }
  if (raw.newTabBehavior === 'newtab' || raw.newTabBehavior === 'mirror_house' || raw.newTabBehavior === 'homepage') {
    base.newTabBehavior = raw.newTabBehavior;
  }
  if (typeof raw.defaultProxyMode === 'boolean') base.defaultProxyMode = raw.defaultProxyMode;
  if (typeof raw.trackerShield === 'boolean') base.trackerShield = raw.trackerShield;
  if (
    raw.userAgentPreset === 'serpent_portal' ||
    raw.userAgentPreset === 'desktop_chrome' ||
    raw.userAgentPreset === 'mobile_chrome'
  ) {
    base.userAgentPreset = raw.userAgentPreset;
  }
  if (typeof raw.zoomPercent === 'number' && Number.isFinite(raw.zoomPercent)) {
    base.zoomPercent = Math.max(75, Math.min(140, Math.round(raw.zoomPercent)));
  }
  if (typeof raw.showBookmarksBar === 'boolean') base.showBookmarksBar = raw.showBookmarksBar;
  if (typeof raw.standaloneFullscreen === 'boolean') base.standaloneFullscreen = raw.standaloneFullscreen;
  return base;
}

/**
 * Pure helper that resolves any Chromium Omnibox input (chrome:// URL, full URL,
 * bare domain like "wikipedia.org", or natural-language search query) into a target URL
 * using the configured Search Engine.
 */
export function resolveOmniboxInput(
  rawInput: string,
  searchEngine: SearchEngineId = 'duckduckgo',
): ResolvedOmniboxTarget {
  const trimmed = String(rawInput ?? '').trim();
  if (!trimmed) {
    return {
      url: 'chrome://newtab',
      displayUrl: 'chrome://newtab',
      titleGuess: 'New Tab',
      isInternal: true,
    };
  }

  const lower = trimmed.toLowerCase();
  if (lower.startsWith('chrome://') || lower.startsWith('serpent://')) {
    const normalized = lower.replace(/^serpent:\/\//, 'chrome://');
    const slug = normalized.replace(/^chrome:\/\//, '').split(/[/?#]/)[0] || 'newtab';
    const titleMap: Record<string, string> = {
      newtab: 'New Tab — Portal Chromium',
      version: 'About Version — chrome://version',
      settings: 'Browser Settings — chrome://settings',
      history: 'Browsing History — chrome://history',
      'peaks-atlas': 'Serpent Peaks Continental Atlas',
      bookmarks: 'Portal Bookmarks',
    };
    return {
      url: `chrome://${slug}`,
      displayUrl: `chrome://${slug}`,
      titleGuess: titleMap[slug] ?? `chrome://${slug}`,
      isInternal: true,
    };
  }

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const u = new URL(trimmed);
      return {
        url: u.toString(),
        displayUrl: u.toString(),
        titleGuess: u.hostname.replace(/^www\./, ''),
        isInternal: false,
      };
    } catch {
      // fall through to search
    }
  }

  // Looks like a domain name (e.g., "wikipedia.org", "news.ycombinator.com/news")
  if (!/\s/.test(trimmed) && /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/.*)?$/i.test(trimmed)) {
    const withHttps = `https://${trimmed}`;
    try {
      const u = new URL(withHttps);
      return {
        url: u.toString(),
        displayUrl: u.toString(),
        titleGuess: u.hostname.replace(/^www\./, ''),
        isInternal: false,
      };
    } catch {
      // fall through
    }
  }

  // Natural language search query -> configured search engine
  const engine = SEARCH_ENGINE_CATALOG[searchEngine] ?? SEARCH_ENGINE_CATALOG.duckduckgo;
  const searchUrl = engine.queryTemplate.replace('{q}', encodeURIComponent(trimmed));
  return {
    url: searchUrl,
    displayUrl: searchUrl,
    titleGuess: `${trimmed} - ${engine.name}`,
    isInternal: false,
    searchQuery: trimmed,
    searchEngine: engine.id,
  };
}

export interface RollingTabOrbitNode {
  index: number;
  angleRad: number;
  xNorm: number; // -1..+1 horizontal orbit offset
  yNorm: number; // -1..+1 vertical tilt offset
  zDepth: number; // -1 (far back) .. +1 (closest front)
  rotateYDeg: number;
  rotateXDeg: number;
  scale: number;
  opacity: number;
  zIndex: number;
  isFront: boolean;
  tier: -1 | 0 | 1;
  reflectionAlpha: number;
}

export interface ChromiumBrowserProfile {
  id: string;
  name: string;
  handle: string;
  avatarEmoji: string;
  accentHex: string;
  realmBadge: string;
}

export const DEFAULT_CHROMIUM_PROFILES: ChromiumBrowserProfile[] = [
  {
    id: 'serpent-sovereign',
    name: 'Serpent Sovereign',
    handle: 'sovereign@serpent.peaks',
    avatarEmoji: '🐉',
    accentHex: '#2de3ff',
    realmBadge: 'DOU DI SOVEREIGN · 12 MIRROR TABS',
  },
  {
    id: 'arcane-scholar',
    name: 'Arcane Dev & Scholar',
    handle: 'scholar@chromium.realm',
    avatarEmoji: '🔮',
    accentHex: '#a855f7',
    realmBadge: 'WEBGL & SHADER ARCHIVE · 12 MIRROR TABS',
  },
  {
    id: 'shadow-hunter',
    name: 'Soul Hall Tactician',
    handle: 'hunter@soulhall.void',
    avatarEmoji: '⚔️',
    accentHex: '#f43f5e',
    realmBadge: 'COMBAT & LORE VAULT · 12 MIRROR TABS',
  },
];

/**
 * Pure helper that computes 3D Mirror-House Rotunda & orbital carousel transforms for every tab
 * rolling around inside the Portal Pocket World, supporting multi-tiered Hall-of-Mirrors rings
 * when 9+ tabs are open while preserving single-ring circular geometry for smaller tab counts.
 */
export function computeRollingTabOrbitLayout(
  tabCount: number,
  orbitAngleRad: number,
): RollingTabOrbitNode[] {
  const count = Math.max(1, Math.floor(tabCount));
  const nodes: RollingTabOrbitNode[] = [];
  let bestFrontIdx = 0;
  let maxScore = -Infinity;
  const multiRing = count >= 9;

  for (let i = 0; i < count; i++) {
    let tier: -1 | 0 | 1 = 0;
    let theta: number;
    if (multiRing) {
      // Distribute tabs across 3 kaleidoscopic Mirror-House gallery tiers:
      // even indices -> equatorial Grand Mirror Gallery (tier 0),
      // odd indices alternate between Upper Kaleidoscope Crown (+1) & Lower Reflection Hall (-1)
      if (i % 3 === 0 || i % 3 === 1) {
        tier = i % 3 === 0 ? 0 : i % 2 === 1 ? 1 : -1;
      } else {
        tier = -1;
      }
      const tierPattern: Array<-1 | 0 | 1> = [0, 1, 0, -1, 0, 1, 0, -1, 0, 1, 0, -1];
      tier = tierPattern[i % tierPattern.length];
      theta = orbitAngleRad * (tier === 0 ? 1 : 0.86) + (i * Math.PI * 2) / count;
    } else {
      theta = orbitAngleRad + (i * Math.PI * 2) / count;
    }

    const radiusMul = tier === 0 ? 1.0 : 0.88;
    const xNorm = Number((Math.sin(theta) * radiusMul).toFixed(4));
    const zDepth = Number(Math.cos(theta).toFixed(4)); // +1 = closest to viewer, -1 = farthest in background
    const tierYOffset = tier * 0.44;
    const yNorm = Number((tierYOffset - zDepth * 0.22 + Math.sin(theta * 2) * 0.05).toFixed(4));
    const depth01 = (zDepth + 1) * 0.5; // 0..1
    const tierScaleMul = tier === 0 ? 1.0 : 0.91;
    const scale = Number(((0.62 + depth01 * 0.46) * tierScaleMul).toFixed(3));
    const opacity = Number((0.38 + depth01 * 0.62).toFixed(3));
    // Faceted Hall-of-Mirrors inward angle so every surrounding mirror faces the observer
    const rotateYDeg = Number((xNorm * -38).toFixed(2));
    const rotateXDeg = Number((tier * -14 + (1 - depth01) * 4).toFixed(2));
    const zIndex = Math.round(10 + depth01 * 90 - Math.abs(tier) * 4);
    const reflectionAlpha = Number((0.22 + depth01 * 0.52).toFixed(3));

    const frontScore = zDepth - Math.abs(tier) * 0.08;
    if (frontScore > maxScore) {
      maxScore = frontScore;
      bestFrontIdx = i;
    }

    nodes.push({
      index: i,
      angleRad: theta,
      xNorm,
      yNorm,
      zDepth,
      rotateYDeg,
      rotateXDeg,
      scale,
      opacity,
      zIndex,
      isFront: false,
      tier,
      reflectionAlpha,
    });
  }

  if (nodes[bestFrontIdx]) {
    nodes[bestFrontIdx].isFront = true;
  }
  return nodes;
}

function createProfileDefaultTabs(profileId: string): ChromiumTab[] {
  const mk = (
    idx: number,
    title: string,
    url: string,
    variant: PortalVariant,
  ): ChromiumTab => ({
    id: `ptab-${profileId}-${idx}`,
    title,
    url,
    displayUrl: url,
    portalVariant: variant,
    history: [url],
    historyIndex: 0,
    proxyMode: true,
    isLoading: false,
  });

  if (profileId === 'arcane-scholar') {
    return [
      mk(1, 'Three.js — WebGL 3D Engine', 'https://en.m.wikipedia.org/wiki/Three.js', 'A'),
      mk(2, 'WebGL — Shader Pipeline', 'https://en.m.wikipedia.org/wiki/WebGL', 'B'),
      mk(3, 'Hacker News — Frontpage', 'https://news.ycombinator.com/', 'A'),
      mk(4, 'GLSL Shading Language', 'https://en.m.wikipedia.org/wiki/OpenGL_Shading_Language', 'B'),
      mk(5, 'Serpent Peaks Trial Atlas', 'chrome://peaks-atlas', 'A'),
      mk(6, 'DuckDuckGo — Dev Search', 'https://lite.duckduckgo.com/lite/?q=threejs+webgl+shaders', 'B'),
      mk(7, 'Ray Tracing & Optics', 'https://en.m.wikipedia.org/wiki/Ray_tracing_(graphics)', 'A'),
      mk(8, 'Chromium Blink Telemetry', 'chrome://version', 'B'),
      mk(9, 'Procedural Generation', 'https://en.m.wikipedia.org/wiki/Procedural_generation', 'A'),
      mk(10, 'Quantum Wormholes', 'https://en.m.wikipedia.org/wiki/Wormhole', 'B'),
      mk(11, 'Portal New Tab Hub', 'chrome://newtab', 'A'),
      mk(12, 'WebXR Immersive Spec', 'https://en.m.wikipedia.org/wiki/WebXR', 'B'),
    ];
  }

  if (profileId === 'shadow-hunter') {
    return [
      mk(1, 'Wuxia — Martial Heroes', 'https://en.m.wikipedia.org/wiki/Wuxia', 'B'),
      mk(2, 'Serpent Peaks Trial Atlas', 'chrome://peaks-atlas', 'A'),
      mk(3, 'Chinese Dragon Lore', 'https://en.m.wikipedia.org/wiki/Chinese_dragon', 'B'),
      mk(4, 'Naga — Half-Human Serpent', 'https://en.m.wikipedia.org/wiki/N%C4%81ga', 'A'),
      mk(5, 'DuckDuckGo — Lore Search', 'https://lite.duckduckgo.com/lite/?q=wuxia+cultivation+realms', 'B'),
      mk(6, 'Qigong & Inner Qi', 'https://en.m.wikipedia.org/wiki/Qigong', 'A'),
      mk(7, 'Kunlun Mythic Mountains', 'https://en.m.wikipedia.org/wiki/Kunlun_Mountains_(mythology)', 'B'),
      mk(8, 'Hacker News — Live Dispatch', 'https://news.ycombinator.com/', 'A'),
      mk(9, 'Mount Tai — Sacred Peak', 'https://en.m.wikipedia.org/wiki/Mount_Tai', 'B'),
      mk(10, 'Portal New Tab Sanctuary', 'chrome://newtab', 'A'),
      mk(11, 'Sacred Lotus Symbolism', 'https://en.m.wikipedia.org/wiki/Nelumbo_nucifera', 'B'),
      mk(12, 'About Portal Chromium', 'chrome://version', 'A'),
    ];
  }

  // Default: 'serpent-sovereign' — 12 surrounding Mirror-House tabs!
  return [
    mk(1, 'Wikipedia — World Encyclopedia', 'https://en.m.wikipedia.org/wiki/Main_Page', 'A'),
    mk(2, 'Serpent Peaks Trial Atlas', 'chrome://peaks-atlas', 'B'),
    mk(3, 'DuckDuckGo — Web Search', 'https://lite.duckduckgo.com/lite/', 'A'),
    mk(4, 'Hacker News — Tech Feed', 'https://news.ycombinator.com/', 'B'),
    mk(5, 'Wuxia Cultivation Lore', 'https://en.m.wikipedia.org/wiki/Wuxia', 'A'),
    mk(6, 'Mythic Naga Ascension', 'https://en.m.wikipedia.org/wiki/N%C4%81ga', 'B'),
    mk(7, 'Portal New Tab Hub', 'chrome://newtab', 'A'),
    mk(8, 'Himalayas — Roof of the World', 'https://en.m.wikipedia.org/wiki/Himalayas', 'B'),
    mk(9, 'Chinese Dragon Mythology', 'https://en.m.wikipedia.org/wiki/Chinese_dragon', 'A'),
    mk(10, 'About Chromium — Engine', 'chrome://version', 'B'),
    mk(11, 'Hall of Mirrors — Optics', 'https://en.m.wikipedia.org/wiki/infinity_mirror', 'A'),
    mk(12, 'Example Domain — Sandbox', 'https://example.com/', 'B'),
  ];
}

export class PortalChromiumManager {
  private profiles: ChromiumBrowserProfile[] = [...DEFAULT_CHROMIUM_PROFILES];
  private activeProfileId = DEFAULT_CHROMIUM_PROFILES[0].id;
  private profileTabs: Record<string, ChromiumTab[]> = {};
  private tabs: ChromiumTab[] = [];
  private activeTabId = '';
  private activePortalVariant: PortalVariant = 'A';
  private settings: BrowserSettings = { ...DEFAULT_BROWSER_SETTINGS };
  private customBookmarks: PortalBookmark[] = [];
  private browsingHistory: BrowserHistoryEntry[] = [];
  private searchHistory: SearchHistoryEntry[] = [];
  private portalVisits: Record<string, PortalVisitRecord> = {};
  private readonly currentSessionId = `sess-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  private activePortalContextLabel = 'Standalone Session';
  private listeners: Array<() => void> = [];

  constructor() {
    this.loadSettingsFromStorage();
    this.loadFromStorage();
  }

  private loadSettingsFromStorage(): void {
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(SETTINGS_STORAGE_KEY) : null;
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        settings?: Partial<BrowserSettings>;
        customBookmarks?: PortalBookmark[];
        browsingHistory?: Array<Partial<BrowserHistoryEntry>>;
        searchHistory?: Array<Partial<SearchHistoryEntry>>;
        portalVisits?: Record<string, PortalVisitRecord>;
      };
      this.settings = sanitizeBrowserSettings(parsed.settings);
      if (Array.isArray(parsed.customBookmarks)) {
        this.customBookmarks = parsed.customBookmarks
          .filter((b) => b && typeof b.url === 'string' && typeof b.title === 'string')
          .slice(0, 48)
          .map((b) => ({
            title: b.title.trim().slice(0, 48) || extractHistoryHost(b.url),
            url: b.url.trim().slice(0, 320),
            badge: typeof b.badge === 'string' && b.badge ? b.badge.slice(0, 2) : '★',
            accentHex: typeof b.accentHex === 'string' ? b.accentHex : '#f2c14e',
            savedAt:
              typeof b.savedAt === 'number' && Number.isFinite(b.savedAt)
                ? Math.floor(b.savedAt)
                : Date.now(),
            portalVariant: b.portalVariant === 'B' ? 'B' : 'A',
            portalLabel:
              typeof b.portalLabel === 'string' && b.portalLabel.trim()
                ? b.portalLabel.trim().slice(0, 64)
                : undefined,
            isCustom: true,
          }));
      }
      if (Array.isArray(parsed.browsingHistory)) {
        const sanitized: BrowserHistoryEntry[] = [];
        for (let i = 0; i < parsed.browsingHistory.length; i++) {
          const clean = sanitizeHistoryEntry(parsed.browsingHistory[i], i);
          if (clean) sanitized.push(clean);
          if (sanitized.length >= MAX_BROWSER_HISTORY_ENTRIES) break;
        }
        this.browsingHistory = sanitized;
      }
      if (Array.isArray(parsed.searchHistory)) {
        const sanitizedSearches: SearchHistoryEntry[] = [];
        for (let i = 0; i < parsed.searchHistory.length; i++) {
          const clean = sanitizeSearchHistoryEntry(parsed.searchHistory[i], i);
          if (clean) sanitizedSearches.push(clean);
          if (sanitizedSearches.length >= MAX_SEARCH_HISTORY_ENTRIES) break;
        }
        this.searchHistory = sanitizedSearches;
      }
      if (parsed.portalVisits && typeof parsed.portalVisits === 'object') {
        const cleaned: Record<string, PortalVisitRecord> = {};
        for (const [key, rec] of Object.entries(parsed.portalVisits)) {
          if (!rec || typeof rec.portalId !== 'string') continue;
          const variant: PortalVariant = rec.variant === 'B' ? 'B' : 'A';
          const x = Number.isFinite(rec.x) ? Math.round(rec.x) : 0;
          const z = Number.isFinite(rec.z) ? Math.round(rec.z) : 0;
          cleaned[key] = {
            portalId: rec.portalId.slice(0, 80),
            label:
              typeof rec.label === 'string' && rec.label.trim()
                ? rec.label.slice(0, 64)
                : derivePortalLandmarkName(x, z, variant),
            variant,
            x,
            z,
            visitCount: Math.max(1, Math.floor(Number(rec.visitCount) || 1)),
            lastVisitedAt: Number.isFinite(rec.lastVisitedAt) ? rec.lastVisitedAt : Date.now(),
            floorNumber: Math.max(1, Math.min(5, Math.floor(Number(rec.floorNumber) || 1))),
            missionTitle:
              typeof rec.missionTitle === 'string' && rec.missionTitle.trim()
                ? rec.missionTitle.slice(0, 64)
                : 'Portal Trial',
            completed: Boolean(rec.completed),
          };
        }
        this.portalVisits = cleaned;
      }
    } catch {
      // ignore storage issues
    }
  }

  private saveSettingsToStorage(): void {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(
          SETTINGS_STORAGE_KEY,
          JSON.stringify({
            settings: this.settings,
            customBookmarks: this.customBookmarks,
            browsingHistory: this.browsingHistory,
            searchHistory: this.searchHistory,
            portalVisits: this.portalVisits,
          }),
        );
      }
    } catch {
      // ignore storage quota errors
    }
  }

  public recordPortalVisit(input: {
    portalId: string;
    variant: PortalVariant;
    x: number;
    z: number;
    floorNumber: number;
    missionTitle: string;
    completed: boolean;
  }): PortalVisitRecord {
    const cleanId = input.portalId.trim().slice(0, 80);
    const rx = Math.round(input.x);
    const rz = Math.round(input.z);
    const prev = this.portalVisits[cleanId];
    const record: PortalVisitRecord = {
      portalId: cleanId,
      label: prev?.label || derivePortalLandmarkName(rx, rz, input.variant),
      variant: input.variant,
      x: rx,
      z: rz,
      visitCount: (prev?.visitCount ?? 0) + 1,
      lastVisitedAt: Date.now(),
      floorNumber: Math.max(1, Math.min(5, Math.floor(input.floorNumber))),
      missionTitle: input.missionTitle.slice(0, 64),
      completed: Boolean(prev?.completed || input.completed),
    };
    this.portalVisits[cleanId] = record;

    // Keep storage bounded to top 36 most relevant portals
    const entries = Object.values(this.portalVisits);
    if (entries.length > 36) {
      const keep = rankFrequentPortals(entries, 36);
      const nextMap: Record<string, PortalVisitRecord> = {};
      for (const item of keep) nextMap[item.portalId] = item;
      this.portalVisits = nextMap;
    }

    this.saveSettingsToStorage();
    return record;
  }

  public markPortalVisitCompleted(portalId?: string): void {
    if (!portalId) return;
    const rec = this.portalVisits[portalId];
    if (!rec) return;
    rec.completed = true;
    rec.lastVisitedAt = Date.now();
    this.saveSettingsToStorage();
  }

  public getFrequentPortals(limit = 6): PortalVisitRecord[] {
    return rankFrequentPortals(Object.values(this.portalVisits), limit);
  }

  public getTotalPortalVisitCount(): number {
    let total = 0;
    for (const rec of Object.values(this.portalVisits)) {
      total += rec.visitCount;
    }
    return total;
  }

  public clearPortalVisits(): void {
    this.portalVisits = {};
    this.saveSettingsToStorage();
    this.emitChange();
  }

  public getSettings(): Readonly<BrowserSettings> {
    return this.settings;
  }

  public updateSettings(patch: Partial<BrowserSettings>): BrowserSettings {
    this.settings = sanitizeBrowserSettings({ ...this.settings, ...patch });
    this.saveSettingsToStorage();
    this.emitChange();
    return this.settings;
  }

  public resetSettings(): BrowserSettings {
    this.settings = { ...DEFAULT_BROWSER_SETTINGS };
    this.saveSettingsToStorage();
    this.emitChange();
    return this.settings;
  }

  public getAllBookmarks(): PortalBookmark[] {
    const combined: PortalBookmark[] = this.customBookmarks.map((cb) => ({
      ...cb,
      isCustom: true,
    }));
    for (const def of PORTAL_BOOKMARKS) {
      if (!combined.some((b) => b.url === def.url)) {
        combined.push({ ...def, isCustom: false });
      }
    }
    return combined;
  }

  public getCustomBookmarks(): PortalBookmark[] {
    return this.customBookmarks.map((b) => ({ ...b, isCustom: true }));
  }

  public isBookmarked(url: string): boolean {
    const normalized = normalizeBookmarkUrl(url) ?? url.trim();
    return this.getAllBookmarks().some((b) => b.url === normalized || b.url === url.trim());
  }

  public isCustomBookmarked(url: string): boolean {
    const normalized = normalizeBookmarkUrl(url) ?? url.trim();
    return this.customBookmarks.some((b) => b.url === normalized || b.url === url.trim());
  }

  public addOrUpdateBookmark(input: {
    url: string;
    title?: string;
    portalVariant?: PortalVariant;
    portalLabel?: string;
  }): PortalBookmark | null {
    const cleanUrl = normalizeBookmarkUrl(input.url);
    if (!cleanUrl) return null;
    const hostGuess = extractHistoryHost(cleanUrl);
    const cleanTitle = (input.title?.trim() || hostGuess || cleanUrl).slice(0, 48);
    const variant: PortalVariant = input.portalVariant ?? this.activePortalVariant;
    const portalLabel = (input.portalLabel?.trim() || this.activePortalContextLabel).slice(0, 64);
    const accentHex = variant === 'B' ? '#f472b6' : '#f2c14e';
    const nextBookmark: PortalBookmark = {
      title: cleanTitle || 'Saved Portal URL',
      url: cleanUrl,
      badge: cleanTitle.charAt(0).toUpperCase() || '★',
      accentHex,
      savedAt: Date.now(),
      portalVariant: variant,
      portalLabel,
      isCustom: true,
    };

    const existingIdx = this.customBookmarks.findIndex((b) => b.url === cleanUrl);
    if (existingIdx >= 0) {
      this.customBookmarks.splice(existingIdx, 1);
    }
    this.customBookmarks.unshift(nextBookmark);
    this.customBookmarks = this.customBookmarks.slice(0, 48);
    this.saveSettingsToStorage();
    this.emitChange();
    return nextBookmark;
  }

  public toggleBookmark(title: string, url: string, portalVariant?: PortalVariant): boolean {
    const cleanUrl = normalizeBookmarkUrl(url);
    if (!cleanUrl) return false;
    const existingIdx = this.customBookmarks.findIndex((b) => b.url === cleanUrl);
    if (existingIdx >= 0) {
      this.customBookmarks.splice(existingIdx, 1);
      this.saveSettingsToStorage();
      this.emitChange();
      return false;
    }
    this.addOrUpdateBookmark({
      url: cleanUrl,
      title,
      portalVariant: portalVariant ?? this.activePortalVariant,
      portalLabel: this.activePortalContextLabel,
    });
    return true;
  }

  public removeCustomBookmark(url: string): boolean {
    const cleanUrl = normalizeBookmarkUrl(url) ?? url.trim();
    const next = this.customBookmarks.filter((b) => b.url !== cleanUrl && b.url !== url.trim());
    if (next.length !== this.customBookmarks.length) {
      this.customBookmarks = next;
      this.saveSettingsToStorage();
      this.emitChange();
      return true;
    }
    return false;
  }

  public setActivePortalContext(label: string, variant?: PortalVariant): void {
    const clean = label.trim().slice(0, 64);
    this.activePortalContextLabel = clean || 'Portal Session';
    if (variant) {
      this.activePortalVariant = variant;
    }
  }

  public getActivePortalContextLabel(): string {
    return this.activePortalContextLabel;
  }

  public getCurrentSessionId(): string {
    return this.currentSessionId;
  }

  public getHistory(options?: BrowserHistoryFilterOptions): BrowserHistoryEntry[] {
    if (!options) return [...this.browsingHistory];
    return filterBrowserHistory(this.browsingHistory, options);
  }

  public getSearchHistory(options?: SearchHistoryFilterOptions): SearchHistoryEntry[] {
    if (!options) return [...this.searchHistory];
    return filterSearchHistory(this.searchHistory, options);
  }

  public recordSearchQuery(
    query: string,
    searchEngine: SearchEngineId = this.settings.searchEngine,
    resolvedUrl?: string,
    variantOverride?: PortalVariant,
  ): SearchHistoryEntry | null {
    const cleanQuery = query.trim().slice(0, 140);
    if (!cleanQuery) return null;
    const now = Date.now();
    const variant: PortalVariant = variantOverride ?? this.activePortalVariant;
    const engine = SEARCH_ENGINE_CATALOG[searchEngine] ?? SEARCH_ENGINE_CATALOG.duckduckgo;
    const finalUrl =
      resolvedUrl && resolvedUrl.startsWith('http')
        ? resolvedUrl.slice(0, 512)
        : engine.queryTemplate.replace('{q}', encodeURIComponent(cleanQuery));

    const existingIdx = this.searchHistory.findIndex(
      (entry) => entry.query.toLowerCase() === cleanQuery.toLowerCase(),
    );
    const prevCount = existingIdx >= 0 ? this.searchHistory[existingIdx].searchCount : 0;
    if (existingIdx >= 0) {
      this.searchHistory.splice(existingIdx, 1);
    }

    const entry: SearchHistoryEntry = {
      id: `srch-${now.toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      query: cleanQuery,
      searchEngine: engine.id,
      resolvedUrl: finalUrl,
      searchedAt: now,
      portalVariant: variant,
      portalLabel: this.activePortalContextLabel,
      sessionId: this.currentSessionId,
      searchCount: prevCount + 1,
    };

    this.searchHistory.unshift(entry);
    this.searchHistory = this.searchHistory.slice(0, MAX_SEARCH_HISTORY_ENTRIES);
    this.saveSettingsToStorage();
    return entry;
  }

  public removeSearchHistoryEntry(id: string): boolean {
    const next = this.searchHistory.filter((entry) => entry.id !== id);
    if (next.length === this.searchHistory.length) return false;
    this.searchHistory = next;
    this.saveSettingsToStorage();
    this.emitChange();
    return true;
  }

  public clearSearchHistory(): void {
    if (this.searchHistory.length === 0) return;
    this.searchHistory = [];
    this.saveSettingsToStorage();
    this.emitChange();
  }

  public getHistoryStats(): BrowserHistoryStats {
    const uniqueHosts = new Set<string>();
    let sessionEntries = 0;
    let portalAEntries = 0;
    let portalBEntries = 0;
    for (const entry of this.browsingHistory) {
      uniqueHosts.add(extractHistoryHost(entry.url));
      if (entry.sessionId === this.currentSessionId) sessionEntries++;
      if (entry.portalVariant === 'B') portalBEntries++;
      else portalAEntries++;
    }
    return {
      totalEntries: this.browsingHistory.length,
      sessionEntries,
      uniqueHosts: uniqueHosts.size,
      portalAEntries,
      portalBEntries,
      totalSearches: this.searchHistory.length,
      customBookmarks: this.customBookmarks.length,
    };
  }

  public removeHistoryEntry(id: string): boolean {
    const next = this.browsingHistory.filter((entry) => entry.id !== id);
    if (next.length === this.browsingHistory.length) return false;
    this.browsingHistory = next;
    this.saveSettingsToStorage();
    this.emitChange();
    return true;
  }

  public clearCurrentSessionHistory(): number {
    const before = this.browsingHistory.length;
    this.browsingHistory = this.browsingHistory.filter(
      (entry) => entry.sessionId !== this.currentSessionId,
    );
    const removed = before - this.browsingHistory.length;
    if (removed > 0) {
      this.saveSettingsToStorage();
      this.emitChange();
    }
    return removed;
  }

  public clearHistory(): void {
    this.browsingHistory = [];
    for (const tab of this.tabs) {
      tab.history = [tab.url];
      tab.historyIndex = 0;
    }
    this.saveSettingsToStorage();
    this.emitChange();
  }

  public resetSessionTabs(): void {
    this.profileTabs[this.activeProfileId] = createProfileDefaultTabs(this.activeProfileId);
    this.tabs = this.profileTabs[this.activeProfileId];
    this.activeTabId = this.tabs[0].id;
    this.emitChange();
  }

  private recordHistoryVisit(
    url: string,
    title: string,
    variantOverride?: PortalVariant,
  ): void {
    const cleanUrl = url.trim().slice(0, 512);
    if (!isTrackableHistoryUrl(cleanUrl)) return;
    const now = Date.now();
    const variant: PortalVariant = variantOverride ?? this.activePortalVariant;
    const cleanTitle = (title || extractHistoryHost(cleanUrl) || cleanUrl).trim().slice(0, 96);
    const last = this.browsingHistory[0];
    if (
      last &&
      last.url === cleanUrl &&
      last.sessionId === this.currentSessionId &&
      now - last.visitedAt < 8000
    ) {
      if (cleanTitle) last.title = cleanTitle;
      last.visitedAt = now;
      last.portalVariant = variant;
      last.portalLabel = this.activePortalContextLabel;
      this.saveSettingsToStorage();
      return;
    }

    const priorForUrl = this.browsingHistory.find((entry) => entry.url === cleanUrl);
    const nextVisitCount = priorForUrl ? priorForUrl.visitCount + 1 : 1;
    const newEntry: BrowserHistoryEntry = {
      id: `hist-${now.toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      url: cleanUrl,
      title: cleanTitle,
      visitedAt: now,
      portalVariant: variant,
      portalLabel: this.activePortalContextLabel,
      sessionId: this.currentSessionId,
      profileId: this.activeProfileId,
      visitCount: nextVisitCount,
    };
    this.browsingHistory.unshift(newEntry);
    this.browsingHistory = this.browsingHistory.slice(0, MAX_BROWSER_HISTORY_ENTRIES);
    this.saveSettingsToStorage();
  }

  private loadFromStorage(): void {
    for (const prof of this.profiles) {
      this.profileTabs[prof.id] = createProfileDefaultTabs(prof.id);
    }
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as {
          profiles?: ChromiumBrowserProfile[];
          activeProfileId?: string;
          profileTabs?: Record<string, ChromiumTab[]>;
          tabs?: ChromiumTab[];
          activeTabId?: string;
          activePortalVariant?: PortalVariant;
        };
        if (Array.isArray(parsed.profiles) && parsed.profiles.length > 0) {
          this.profiles = parsed.profiles;
        }
        if (parsed.profileTabs && typeof parsed.profileTabs === 'object') {
          for (const [pid, tList] of Object.entries(parsed.profileTabs)) {
            if (Array.isArray(tList) && tList.length > 0) {
              this.profileTabs[pid] = tList.map((t, idx) => ({
                id: String(t.id || `ptab-${pid}-${idx}`),
                title: String(t.title || 'New Tab'),
                url: String(t.url || 'chrome://newtab'),
                displayUrl: String(t.displayUrl || t.url || 'chrome://newtab'),
                portalVariant: t.portalVariant === 'B' ? 'B' : 'A',
                history:
                  Array.isArray(t.history) && t.history.length > 0
                    ? t.history
                    : [String(t.url || 'chrome://newtab')],
                historyIndex: typeof t.historyIndex === 'number' ? Math.max(0, t.historyIndex) : 0,
                proxyMode: t.proxyMode !== false,
                isLoading: false,
              }));
            }
          }
        } else if (Array.isArray(parsed.tabs) && parsed.tabs.length >= 8) {
          this.profileTabs[this.activeProfileId] = parsed.tabs;
        }
        if (
          parsed.activeProfileId &&
          this.profiles.some((p) => p.id === parsed.activeProfileId)
        ) {
          this.activeProfileId = parsed.activeProfileId;
        }
        this.tabs =
          this.profileTabs[this.activeProfileId] ||
          createProfileDefaultTabs(this.activeProfileId);
        // Ensure at least 10 Mirror-House tabs so the Hall of Mirrors feels full all around
        if (this.tabs.length < 10) {
          const defaults = createProfileDefaultTabs(this.activeProfileId);
          for (const d of defaults) {
            if (this.tabs.length >= 12) break;
            if (!this.tabs.some((t) => t.url === d.url)) {
              this.tabs.push(d);
            }
          }
          this.profileTabs[this.activeProfileId] = this.tabs;
        }
        this.activePortalVariant = parsed.activePortalVariant === 'B' ? 'B' : 'A';
        this.activeTabId =
          parsed.activeTabId && this.tabs.some((t) => t.id === parsed.activeTabId)
            ? parsed.activeTabId
            : this.tabs[0].id;
        return;
      }
    } catch {
      // ignore storage errors
    }
    this.activeProfileId = this.profiles[0].id;
    this.tabs = this.profileTabs[this.activeProfileId];
    this.activeTabId = this.tabs[0].id;
    this.activePortalVariant = 'A';
  }

  private saveToStorage(): void {
    this.profileTabs[this.activeProfileId] = this.tabs;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          profiles: this.profiles,
          activeProfileId: this.activeProfileId,
          profileTabs: this.profileTabs,
          tabs: this.tabs,
          activeTabId: this.activeTabId,
          activePortalVariant: this.activePortalVariant,
        }),
      );
    } catch {
      // ignore storage quota errors
    }
  }

  public onChange(fn: () => void): void {
    this.listeners.push(fn);
  }

  private emitChange(): void {
    this.saveToStorage();
    for (const fn of this.listeners) {
      fn();
    }
  }

  public getProfiles(): ChromiumBrowserProfile[] {
    return this.profiles;
  }

  public getActiveProfile(): ChromiumBrowserProfile {
    return (
      this.profiles.find((p) => p.id === this.activeProfileId) || this.profiles[0]
    );
  }

  public switchProfile(profileId: string): ChromiumBrowserProfile {
    const found = this.profiles.find((p) => p.id === profileId);
    if (!found) return this.getActiveProfile();
    this.profileTabs[this.activeProfileId] = this.tabs;
    this.activeProfileId = found.id;
    if (!this.profileTabs[found.id] || this.profileTabs[found.id].length === 0) {
      this.profileTabs[found.id] = createProfileDefaultTabs(found.id);
    }
    this.tabs = this.profileTabs[found.id];
    this.activeTabId = this.tabs[0].id;
    this.emitChange();
    return found;
  }

  public createProfile(
    name: string,
    avatarEmoji = '🌌',
    accentHex = '#38bdf8',
  ): ChromiumBrowserProfile {
    const cleanName = name.trim().slice(0, 24) || `Cultivator ${this.profiles.length + 1}`;
    const slug = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-') || `profile-${Date.now()}`;
    const id = `${slug}-${Date.now().toString(36).slice(-3)}`;
    const newProf: ChromiumBrowserProfile = {
      id,
      name: cleanName,
      handle: `${slug}@serpent.peaks`,
      avatarEmoji,
      accentHex,
      realmBadge: 'CUSTOM MIRROR REALM · 12 MIRROR TABS',
    };
    this.profiles.push(newProf);
    this.profileTabs[id] = createProfileDefaultTabs('serpent-sovereign').map((t, i) => ({
      ...t,
      id: `ptab-${id}-${i + 1}`,
    }));
    return this.switchProfile(id);
  }

  /**
   * Spawns a burst of 4 additional curated Mirror-House tabs around the 360° rotunda.
   */
  public populateMirrorHouseTabs(): ChromiumTab[] {
    const extraSeeds: Array<{ title: string; url: string; variant: PortalVariant }> = [
      { title: 'Kaleidoscope Mirror Optics', url: 'https://en.m.wikipedia.org/wiki/Kaleidoscope', variant: 'A' },
      { title: 'Serpent Peaks Trial Atlas', url: 'chrome://peaks-atlas', variant: 'B' },
      { title: 'Hacker News — Top Stories', url: 'https://news.ycombinator.com/', variant: 'A' },
      { title: 'Sacred Mountain Shrines', url: 'https://en.m.wikipedia.org/wiki/Sacred_mountains', variant: 'B' },
    ];
    for (const seed of extraSeeds) {
      if (this.tabs.length >= 18) break;
      this.tabs.push({
        id: `ptab-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: seed.title,
        url: seed.url,
        displayUrl: seed.url,
        portalVariant: seed.variant,
        history: [seed.url],
        historyIndex: 0,
        proxyMode: true,
        isLoading: false,
      });
    }
    this.emitChange();
    return this.tabs;
  }

  public getTabs(): ChromiumTab[] {
    return this.tabs;
  }

  public getTabsForPortal(variant: PortalVariant): ChromiumTab[] {
    const matching = this.tabs.filter((t) => t.portalVariant === variant);
    return matching.length > 0 ? matching : this.tabs;
  }

  public getActivePortalVariant(): PortalVariant {
    return this.activePortalVariant;
  }

  public setActivePortalVariant(variant: PortalVariant): void {
    this.activePortalVariant = variant;
    const current = this.getActiveTab();
    if (current.portalVariant !== variant) {
      const candidate = this.tabs.find((t) => t.portalVariant === variant);
      if (candidate) {
        this.activeTabId = candidate.id;
      }
    }
    this.emitChange();
  }

  public getActiveTab(): ChromiumTab {
    const found = this.tabs.find((t) => t.id === this.activeTabId);
    if (found) return found;
    if (this.tabs.length === 0) {
      this.tabs = createProfileDefaultTabs(this.activeProfileId);
    }
    this.activeTabId = this.tabs[0].id;
    return this.tabs[0];
  }

  public activateTab(id: string): ChromiumTab {
    const found = this.tabs.find((t) => t.id === id);
    if (found) {
      const switched = this.activeTabId !== found.id;
      this.activeTabId = found.id;
      this.activePortalVariant = found.portalVariant;
      if (switched && isTrackableHistoryUrl(found.displayUrl)) {
        this.recordHistoryVisit(found.displayUrl, found.title, found.portalVariant);
      }
      this.emitChange();
      return found;
    }
    return this.getActiveTab();
  }

  public createTab(
    initialInput?: string,
    variant: PortalVariant = this.activePortalVariant,
  ): ChromiumTab {
    const defaultStart =
      initialInput ??
      (this.settings.newTabBehavior === 'homepage' ? this.settings.homepageUrl : 'chrome://newtab');
    const resolved = resolveOmniboxInput(defaultStart, this.settings.searchEngine);
    const newTab: ChromiumTab = {
      id: `ptab-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: resolved.titleGuess,
      url: resolved.url,
      displayUrl: resolved.displayUrl,
      portalVariant: variant,
      history: [resolved.url],
      historyIndex: 0,
      proxyMode: this.settings.defaultProxyMode,
      isLoading: !resolved.isInternal,
    };
    this.tabs.push(newTab);
    this.activeTabId = newTab.id;
    this.activePortalVariant = variant;
    if (resolved.searchQuery) {
      this.recordSearchQuery(
        resolved.searchQuery,
        resolved.searchEngine ?? this.settings.searchEngine,
        resolved.url,
        variant,
      );
    }
    if (isTrackableHistoryUrl(resolved.url)) {
      this.recordHistoryVisit(resolved.url, resolved.titleGuess, variant);
    }
    this.emitChange();
    return newTab;
  }

  public closeTab(id: string): ChromiumTab {
    if (this.tabs.length <= 1) {
      // Reset the last remaining tab to chrome://newtab instead of leaving 0 tabs
      this.navigateActiveTab('chrome://newtab');
      return this.getActiveTab();
    }
    const idx = this.tabs.findIndex((t) => t.id === id);
    if (idx >= 0) {
      const closedVariant = this.tabs[idx].portalVariant;
      this.tabs.splice(idx, 1);
      if (this.activeTabId === id) {
        const samePortal = this.tabs.find((t) => t.portalVariant === closedVariant);
        const fallback = samePortal || this.tabs[Math.max(0, idx - 1)] || this.tabs[0];
        this.activeTabId = fallback.id;
        this.activePortalVariant = fallback.portalVariant;
      }
      this.emitChange();
    }
    return this.getActiveTab();
  }

  public navigateActiveTab(rawInput: string, pushHistory = true): ChromiumTab {
    const tab = this.getActiveTab();
    const resolved = resolveOmniboxInput(rawInput, this.settings.searchEngine);
    tab.url = resolved.url;
    tab.displayUrl = resolved.displayUrl;
    tab.title = resolved.titleGuess;
    tab.isLoading = !resolved.isInternal;

    if (pushHistory) {
      tab.history = tab.history.slice(0, tab.historyIndex + 1);
      if (tab.history[tab.history.length - 1] !== resolved.url) {
        tab.history.push(resolved.url);
      }
      tab.historyIndex = tab.history.length - 1;
    }
    if (resolved.searchQuery) {
      this.recordSearchQuery(
        resolved.searchQuery,
        resolved.searchEngine ?? this.settings.searchEngine,
        resolved.url,
        tab.portalVariant,
      );
    }
    if (isTrackableHistoryUrl(resolved.url)) {
      this.recordHistoryVisit(resolved.url, resolved.titleGuess, tab.portalVariant);
    }
    this.emitChange();
    return tab;
  }

  public updateActiveTabMetadata(finalUrl?: string, title?: string): void {
    const tab = this.getActiveTab();
    if (finalUrl && finalUrl.startsWith('http')) {
      tab.displayUrl = finalUrl;
    }
    if (title && title.trim()) {
      tab.title = title.trim().slice(0, 56);
    }
    tab.isLoading = false;
    if (isTrackableHistoryUrl(tab.displayUrl)) {
      this.recordHistoryVisit(tab.displayUrl, tab.title, tab.portalVariant);
    }
    this.emitChange();
  }

  public canGoBack(): boolean {
    const tab = this.getActiveTab();
    return tab.historyIndex > 0;
  }

  public canGoForward(): boolean {
    const tab = this.getActiveTab();
    return tab.historyIndex < tab.history.length - 1;
  }

  public goBack(): ChromiumTab {
    const tab = this.getActiveTab();
    if (tab.historyIndex > 0) {
      tab.historyIndex--;
      const target = tab.history[tab.historyIndex];
      const resolved = resolveOmniboxInput(target, this.settings.searchEngine);
      tab.url = resolved.url;
      tab.displayUrl = resolved.displayUrl;
      tab.title = resolved.titleGuess;
      tab.isLoading = !resolved.isInternal;
      if (isTrackableHistoryUrl(resolved.url)) {
        this.recordHistoryVisit(resolved.url, resolved.titleGuess, tab.portalVariant);
      }
      this.emitChange();
    }
    return tab;
  }

  public goForward(): ChromiumTab {
    const tab = this.getActiveTab();
    if (tab.historyIndex < tab.history.length - 1) {
      tab.historyIndex++;
      const target = tab.history[tab.historyIndex];
      const resolved = resolveOmniboxInput(target, this.settings.searchEngine);
      tab.url = resolved.url;
      tab.displayUrl = resolved.displayUrl;
      tab.title = resolved.titleGuess;
      tab.isLoading = !resolved.isInternal;
      if (isTrackableHistoryUrl(resolved.url)) {
        this.recordHistoryVisit(resolved.url, resolved.titleGuess, tab.portalVariant);
      }
      this.emitChange();
    }
    return tab;
  }

  public toggleProxyMode(): ChromiumTab {
    const tab = this.getActiveTab();
    tab.proxyMode = !tab.proxyMode;
    this.emitChange();
    return tab;
  }

  public assignActiveTabToPortal(variant: PortalVariant): ChromiumTab {
    const tab = this.getActiveTab();
    tab.portalVariant = variant;
    this.activePortalVariant = variant;
    this.emitChange();
    return tab;
  }

  public getIframeSrcForTab(
    tab: ChromiumTab,
    newTabContext?: NewTabCultivationSnapshot,
  ): { src?: string; srcdoc?: string } {
    if (tab.url.startsWith('chrome://')) {
      return { srcdoc: this.buildInternalPageHtml(tab, newTabContext) };
    }
    if (tab.proxyMode) {
      const shield = this.settings.trackerShield ? '1' : '0';
      const ua = encodeURIComponent(this.settings.userAgentPreset);
      return {
        src: `/api/browser/proxy?url=${encodeURIComponent(tab.url)}&shield=${shield}&ua=${ua}`,
      };
    }
    return { src: tab.url };
  }

  private buildInternalPageHtml(
    tab: ChromiumTab,
    newTabContext?: NewTabCultivationSnapshot,
  ): string {
    const slug = tab.url.replace(/^chrome:\/\//, '').split(/[/?#]/)[0] || 'newtab';
    const accent = tab.portalVariant === 'A' ? '#2de3ff' : '#ff6be0';

    if (slug === 'version') {
      return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>About Version — chrome://version</title>
<style>
  body { background:#091116; color:#e2f2ec; font-family:'JetBrains Mono',monospace,system-ui; margin:0; padding:26px 28px; }
  .wrap { max-width:740px; margin:0 auto; background:#0f1c24; border:1px solid rgba(56,189,248,0.28); border-radius:14px; padding:22px 26px; }
  .head { display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid rgba(255,255,255,0.09); padding-bottom:14px; margin-bottom:16px; }
  h1 { font-size:18px; margin:0; color:${accent}; letter-spacing:0.04em; }
  .badge { font-size:11px; padding:4px 10px; border-radius:6px; background:rgba(56,189,248,0.14); color:${accent}; font-weight:700; }
  table { width:100%; border-collapse:collapse; font-size:12.5px; }
  td { padding:9px 8px; border-bottom:1px solid rgba(255,255,255,0.06); vertical-align:top; }
  td.k { width:170px; color:#89b4a6; font-weight:700; }
  td.v { color:#f1f5f9; word-break:break-all; }
</style>
</head>
<body>
  <div class="wrap">
    <div class="head">
      <h1>PORTAL CHROMIUM // ENGINE TELEMETRY</h1>
      <span class="badge">PORTAL ${tab.portalVariant} CHANNEL</span>
    </div>
    <table>
      <tr><td class="k">Chromium</td><td class="v">${CHROMIUM_ENGINE_META.engineVersion}</td></tr>
      <tr><td class="k">Blink Compositor</td><td class="v">${CHROMIUM_ENGINE_META.blinkVersion}</td></tr>
      <tr><td class="k">JavaScript V8</td><td class="v">${CHROMIUM_ENGINE_META.v8Version}</td></tr>
      <tr><td class="k">User-Agent</td><td class="v">${CHROMIUM_ENGINE_META.userAgent}</td></tr>
      <tr><td class="k">Command-Line</td><td class="v">${CHROMIUM_ENGINE_META.commandLine}</td></tr>
      <tr><td class="k">Active Portal Tabs</td><td class="v">${this.tabs.length} tabs synced across Twin Portals A &amp; B</td></tr>
    </table>
  </div>
</body>
</html>`;
    }

    if (slug === 'peaks-atlas') {
      const peakRows = WORLD_LANDMARKS.map(
        (lm) => `
        <div class="peak-card">
          <div class="peak-tier">TIER ${lm.tier}</div>
          <div class="peak-name">${lm.name}</div>
          <div class="peak-coords">Coords: (${Math.round(lm.x)}, ${Math.round(lm.z)}) · Radius ${lm.radius}m</div>
        </div>`,
      ).join('');

      const stageRows = EVOLUTION_STAGES.slice(0, 12)
        .map(
          (st) =>
            `<span class="stage-chip">Lv ${st.level}: ${st.title} (${st.xpRequired} XP)</span>`,
        )
        .join('');

      return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Serpent Peaks Continental Atlas</title>
<style>
  body { background:#081216; color:#e6f5ef; font-family:system-ui,-apple-system,sans-serif; margin:0; padding:22px 24px; }
  h1 { font-size:19px; margin:0 0 6px; color:${accent}; }
  p.sub { margin:0 0 16px; font-size:13px; color:#99bfb2; }
  .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(195px,1fr)); gap:10px; margin-bottom:18px; }
  .peak-card { background:#102129; border:1px solid rgba(56,189,248,0.22); border-radius:10px; padding:10px 12px; }
  .peak-tier { font-size:10px; font-weight:800; color:#f2c14e; letter-spacing:0.08em; }
  .peak-name { font-size:13.5px; font-weight:700; color:#fff; margin:3px 0; }
  .peak-coords { font-size:11px; color:#8ab5a6; }
  .stages { display:flex; flex-wrap:wrap; gap:6px; }
  .stage-chip { font-size:11px; background:#12262e; border:1px solid rgba(242,193,78,0.28); padding:4px 9px; border-radius:6px; color:#fde68a; }
</style>
</head>
<body>
  <h1>⛰ Serpent Peaks Continental Trial Atlas (chrome://peaks-atlas)</h1>
  <p class="sub">Live internal Chromium reference for all 12 Trial Peak Shrines &amp; Serpent-to-Human Cultivation Realms.</p>
  <div class="grid">${peakRows}</div>
  <div class="stages">${stageRows}</div>
</body>
</html>`;
    }

    // Default: chrome://newtab — Frequent Portals & Cultivation Milestones Landing Page
    const activeEngine =
      SEARCH_ENGINE_CATALOG[this.settings.searchEngine] ?? SEARCH_ENGINE_CATALOG.duckduckgo;
    const activeProfile = this.getActiveProfile();
    const frequentPortals = this.getFrequentPortals(6);
    const hasVisitedPortals = frequentPortals.length > 0;

    const portalEntries = hasVisitedPortals
      ? frequentPortals.map((p, idx) => ({
          rank: String(idx + 1).padStart(2, '0'),
          portalId: p.portalId,
          label: p.label,
          variant: p.variant,
          x: p.x,
          z: p.z,
          floorNumber: p.floorNumber,
          missionTitle: p.missionTitle,
          completed: p.completed,
          visitsLabel: `${p.visitCount} ${p.visitCount === 1 ? 'visit' : 'visits'}`,
        }))
      : (newTabContext?.suggestedPortals ?? []).slice(0, 5).map((p, idx) => ({
          rank: String(idx + 1).padStart(2, '0'),
          portalId: p.portalId,
          label: p.label,
          variant: p.variant,
          x: p.x,
          z: p.z,
          floorNumber: p.floorNumber,
          missionTitle: p.missionTitle,
          completed: p.completed,
          visitsLabel: 'Unvisited gate',
        }));

    const portalsHtml =
      portalEntries.length > 0
        ? portalEntries
            .map((p) => {
              const chanColor = p.variant === 'A' ? '#58e1ff' : '#e879f9';
              const statusText = p.completed ? 'Trial cleared' : `Floor ${p.floorNumber} ready`;
              return `
          <div class="list-row">
            <div class="row-rank" style="color:${chanColor}">${p.rank}</div>
            <div class="row-main">
              <div class="row-title">${escapeHtml(p.label)}</div>
              <div class="row-meta">
                <span>${escapeHtml(p.visitsLabel)}</span>
                <span aria-hidden="true">·</span>
                <span>Floor ${p.floorNumber}: ${escapeHtml(p.missionTitle)}</span>
                <span aria-hidden="true">·</span>
                <span>(${p.x}, ${p.z})</span>
                <span aria-hidden="true">·</span>
                <span class="${p.completed ? 'meta-ok' : 'meta-gold'}">${statusText}</span>
              </div>
            </div>
            <div class="row-actions">
              <button
                type="button"
                class="row-btn"
                data-portal-action="mission"
                data-portal-id="${escapeHtml(p.portalId)}"
                data-portal-variant="${p.variant}"
                data-portal-x="${p.x}"
                data-portal-z="${p.z}"
              >Trial</button>
              <button
                type="button"
                class="row-btn primary"
                data-portal-action="warp"
                data-portal-id="${escapeHtml(p.portalId)}"
                data-portal-variant="${p.variant}"
                data-portal-x="${p.x}"
                data-portal-z="${p.z}"
              >Warp</button>
            </div>
          </div>`;
            })
            .join('')
        : `<div class="empty-block">
            <p class="empty-copy">No portals discovered yet. Enter the 3D mountain world and pass through a dimensional gate to record your most visited portals here.</p>
            <button type="button" class="row-btn primary" data-action="play_game">Explore Mountain</button>
          </div>`;

    const c = newTabContext ?? {
      level: 1,
      maxLevel: 12,
      stageTitle: 'Jade Hatchling',
      realmName: 'Dou Zhi Qi',
      xp: 0,
      nextLevelXp: 180,
      xpProgressPct: 0,
      nextStageTitle: 'Forest Viper',
      isHuman: false,
      shrinesConquered: 0,
      totalShrines: 12,
      nextShrineName: 'Jade Base Valley',
      soulsCollected: 0,
      soulTarget: 14,
      comaClock: '40:00:00',
      bestiaryDiscovered: 0,
      bestiaryTotal: 10,
      archivesUnlocked: 0,
      archivesTotal: 12,
      cultivationMult: 1,
      activeBuffName: '',
      rareMaterialsCount: 0,
      discoveredMaterialsCount: 0,
      totalMaterialsCount: 8,
      suggestedPortals: [],
    };

    const progressCaption = c.isHuman
      ? `Maximum ascension reached · ${c.xp.toLocaleString()} XP`
      : `${c.xp.toLocaleString()} / ${c.nextLevelXp.toLocaleString()} XP · Next: ${escapeHtml(c.nextStageTitle)}`;

    const speedSummary = c.activeBuffName
      ? `${c.cultivationMult.toFixed(2)}× (${escapeHtml(c.activeBuffName)}) · ${c.discoveredMaterialsCount}/${c.totalMaterialsCount} materials`
      : `${c.cultivationMult.toFixed(2)}× base rate · ${c.rareMaterialsCount} materials stored`;

    const allBookmarks = this.getAllBookmarks().filter((b) => b.url !== 'chrome://newtab');
    const customBookmarkCount = this.customBookmarks.length;
    const bookmarksHtml = allBookmarks
      .slice(0, 12)
      .map((b) => {
        const metaHost = b.isCustom && b.portalLabel
          ? `Portal ${b.portalVariant ?? 'A'} · ${b.portalLabel}`
          : b.url.replace(/^https?:\/\//, '').slice(0, 30);
        return `
      <div class="bm-card-wrap">
        <button type="button" class="bm-card" data-url="${escapeHtml(b.url)}" title="${escapeHtml(b.url)}">
          <span class="bm-mark" style="color:${escapeHtml(b.accentHex)}">${escapeHtml(b.isCustom ? '★' : b.badge)}</span>
          <span class="bm-copy">
            <span class="bm-title">${escapeHtml(b.title)}</span>
            <span class="bm-host">${escapeHtml(metaHost)}</span>
          </span>
        </button>
        ${
          b.isCustom
            ? `<button type="button" class="bm-remove" data-remove-bm="${escapeHtml(b.url)}" title="Remove bookmark" aria-label="Remove ${escapeHtml(b.title)}">×</button>`
            : ''
        }
      </div>`;
      })
      .join('');

    const recentSearches = this.searchHistory.slice(0, 6);
    const recentSearchesHtml =
      recentSearches.length > 0
        ? `
      <div class="recent-searches" aria-label="Recent searches">
        <span class="recent-label">Recent searches</span>
        <div class="recent-items">
          ${recentSearches
            .map(
              (sr) => `
            <span class="recent-item">
              <button type="button" class="recent-query" data-search-query="${escapeHtml(sr.query)}" title="Search again: ${escapeHtml(sr.query)}">${escapeHtml(sr.query)}</button>
              <button type="button" class="recent-del" data-remove-search="${escapeHtml(sr.id)}" title="Remove search" aria-label="Remove ${escapeHtml(sr.query)}">×</button>
            </span>`,
            )
            .join('')}
        </div>
        <button type="button" class="recent-clear" data-action="clear_search_history">Clear</button>
      </div>`
        : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>New Tab — Portal Chromium</title>
<style>
  :root {
    --bg: #081115;
    --surface: #0e1a20;
    --surface-hover: #13232b;
    --border: rgba(182, 224, 206, 0.14);
    --border-strong: rgba(182, 224, 206, 0.28);
    --text: #edf7f2;
    --muted: #8fb3a5;
    --gold: #f2c14e;
    --jade: #3de095;
    --accent: ${accent};
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100vh;
    background: radial-gradient(circle at 50% 0%, #10252e 0%, var(--bg) 58%);
    color: var(--text);
    font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
    -webkit-font-smoothing: antialiased;
    padding: 20px 28px 36px;
  }
  .page {
    max-width: 1120px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 28px;
  }
  /* 3-zone top bar */
  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
    padding-bottom: 14px;
    border-bottom: 1px solid var(--border);
  }
  .brand-wordmark {
    font-family: 'Cinzel', Georgia, serif;
    font-size: 15px;
    font-weight: 700;
    letter-spacing: 0.04em;
    color: var(--text);
    white-space: nowrap;
    flex-shrink: 0;
  }
  .top-nav {
    display: flex;
    align-items: center;
    gap: 22px;
    overflow-x: auto;
  }
  .nav-link {
    appearance: none;
    border: 0;
    background: transparent;
    color: var(--muted);
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    padding: 4px 0;
    cursor: pointer;
    white-space: nowrap;
    flex-shrink: 0;
    transition: color 0.16s ease;
  }
  .nav-link:hover, .nav-link:focus-visible {
    color: var(--text);
    text-decoration: underline;
    text-underline-offset: 4px;
    outline: none;
  }
  .top-cta {
    appearance: none;
    border: 1px solid rgba(61, 224, 149, 0.45);
    background: rgba(61, 224, 149, 0.14);
    color: #e9fff5;
    font-family: inherit;
    font-size: 12.5px;
    font-weight: 700;
    padding: 8px 16px;
    border-radius: 8px;
    cursor: pointer;
    white-space: nowrap;
    flex-shrink: 0;
    transition: background-color 0.16s ease, border-color 0.16s ease;
  }
  .top-cta:hover, .top-cta:focus-visible {
    background: rgba(61, 224, 149, 0.24);
    border-color: var(--jade);
    outline: none;
  }

  /* Focal Search Hero */
  .hero {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 10px;
    padding: 8px 0 4px;
  }
  .hero-meta {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    flex-wrap: wrap;
    font-size: 12.5px;
    font-weight: 500;
    color: var(--muted);
    font-variant-numeric: tabular-nums;
  }
  .hero-title {
    margin: 0;
    font-family: 'Cinzel', Georgia, serif;
    font-size: clamp(24px, 3vw, 34px);
    font-weight: 700;
    line-height: 1.16;
    text-wrap: balance;
    color: #f6fbf8;
  }
  .search-form {
    width: min(640px, 100%);
    margin-top: 6px;
    display: flex;
    gap: 8px;
  }
  .search-input {
    flex: 1;
    height: 44px;
    padding: 0 16px;
    border-radius: 10px;
    border: 1px solid var(--border-strong);
    background: var(--surface);
    color: var(--text);
    font-family: inherit;
    font-size: 14px;
    outline: none;
    transition: border-color 0.16s ease, box-shadow 0.16s ease;
  }
  .search-input::placeholder { color: #709387; }
  .search-input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(88, 225, 255, 0.16);
  }
  .search-submit {
    height: 44px;
    padding: 0 20px;
    border-radius: 10px;
    border: 1px solid rgba(242, 193, 78, 0.52);
    background: var(--gold);
    color: #091316;
    font-family: inherit;
    font-size: 13.5px;
    font-weight: 700;
    cursor: pointer;
    white-space: nowrap;
    flex-shrink: 0;
    transition: transform 0.15s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.15s ease;
  }
  .search-submit:hover { opacity: 0.92; }
  .search-submit:active { transform: translateY(1px); }
  .search-submit:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }

  /* Two-Column Workspace */
  .workspace-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
    gap: 24px;
    align-items: start;
  }
  .panel {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 18px 20px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .panel-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--border);
  }
  .panel-title {
    margin: 0;
    font-size: 15px;
    font-weight: 700;
    color: var(--text);
  }
  .panel-sub {
    font-size: 12px;
    font-weight: 500;
    color: var(--muted);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .panel-note {
    margin: 0;
    font-size: 12.5px;
    line-height: 1.45;
    color: var(--muted);
  }

  /* Hairline Data Rows (no nested card sandwiches) */
  .rows {
    display: flex;
    flex-direction: column;
  }
  .list-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 11px 0;
    border-bottom: 1px solid rgba(182, 224, 206, 0.08);
  }
  .list-row:first-child { padding-top: 2px; }
  .list-row:last-child { border-bottom: 0; padding-bottom: 2px; }
  .row-rank {
    font-family: ui-monospace, 'JetBrains Mono', monospace;
    font-size: 12px;
    font-weight: 700;
    width: 24px;
    flex-shrink: 0;
    font-variant-numeric: tabular-nums;
  }
  .row-main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .row-title {
    font-size: 13.5px;
    font-weight: 600;
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .row-meta {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    font-size: 12px;
    color: var(--muted);
    font-variant-numeric: tabular-nums;
  }
  .meta-ok { color: var(--jade); }
  .meta-gold { color: var(--gold); }
  .row-actions {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }
  .row-btn {
    appearance: none;
    border: 1px solid var(--border-strong);
    background: transparent;
    color: #d6ebe2;
    font-family: inherit;
    font-size: 12px;
    font-weight: 600;
    padding: 6px 11px;
    border-radius: 7px;
    cursor: pointer;
    white-space: nowrap;
    transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
  }
  .row-btn:hover, .row-btn:focus-visible {
    background: var(--surface-hover);
    border-color: var(--accent);
    color: #fff;
    outline: none;
  }
  .row-btn.primary {
    border-color: rgba(88, 225, 255, 0.42);
    background: rgba(88, 225, 255, 0.12);
    color: #e6f9ff;
  }
  .row-btn.primary:hover, .row-btn.primary:focus-visible {
    background: rgba(88, 225, 255, 0.22);
    border-color: var(--accent);
  }

  /* Evolution Stage Progress Bar */
  .evo-summary {
    display: flex;
    flex-direction: column;
    gap: 7px;
    padding-bottom: 12px;
    border-bottom: 1px solid rgba(182, 224, 206, 0.1);
  }
  .evo-top {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
    flex-wrap: wrap;
  }
  .evo-stage {
    font-size: 14px;
    font-weight: 700;
    color: var(--gold);
  }
  .evo-realm {
    font-size: 12px;
    font-weight: 600;
    color: var(--muted);
    font-variant-numeric: tabular-nums;
  }
  .evo-track {
    width: 100%;
    height: 6px;
    border-radius: 3px;
    background: rgba(255, 255, 255, 0.08);
    overflow: hidden;
  }
  .evo-fill {
    height: 100%;
    border-radius: 3px;
    background: linear-gradient(90deg, var(--jade) 0%, var(--gold) 100%);
  }
  .evo-caption {
    font-size: 12px;
    color: var(--muted);
    font-variant-numeric: tabular-nums;
  }

  /* Recent Search History Row */
  .recent-searches {
    width: min(640px, 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    flex-wrap: wrap;
    margin-top: 2px;
    font-size: 12px;
    color: var(--muted);
  }
  .recent-label {
    font-weight: 600;
    color: #7ea396;
    white-space: nowrap;
  }
  .recent-items {
    display: inline-flex;
    align-items: center;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
  }
  .recent-item {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    border-bottom: 1px solid rgba(182, 224, 206, 0.16);
    padding-bottom: 1px;
  }
  .recent-query {
    appearance: none;
    border: 0;
    background: transparent;
    color: #cfe6dc;
    font-family: inherit;
    font-size: 12px;
    font-weight: 500;
    padding: 2px 3px;
    cursor: pointer;
    max-width: 150px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .recent-query:hover, .recent-query:focus-visible {
    color: var(--gold);
    outline: none;
  }
  .recent-del, .recent-clear {
    appearance: none;
    border: 0;
    background: transparent;
    color: #74988c;
    font-family: inherit;
    font-size: 12px;
    padding: 1px 4px;
    cursor: pointer;
    white-space: nowrap;
  }
  .recent-del:hover, .recent-clear:hover {
    color: #fca5a5;
  }

  /* Bookmarks Strip */
  .bookmarks-section {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .section-bar {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }
  .section-heading {
    margin: 0;
    font-size: 13.5px;
    font-weight: 700;
    color: #cfe4db;
    font-variant-numeric: tabular-nums;
  }
  .bm-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
    gap: 10px;
  }
  .bm-card-wrap {
    position: relative;
    display: flex;
    align-items: stretch;
  }
  .bm-card {
    appearance: none;
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 30px 10px 12px;
    border-radius: 9px;
    background: var(--surface);
    border: 1px solid var(--border);
    color: var(--text);
    text-align: left;
    cursor: pointer;
    font-family: inherit;
    transition: background-color 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
  }
  .bm-card:hover, .bm-card:focus-visible {
    background: var(--surface-hover);
    border-color: var(--border-strong);
    transform: translateY(-1px);
    outline: none;
  }
  .bm-remove {
    position: absolute;
    right: 6px;
    top: 50%;
    transform: translateY(-50%);
    appearance: none;
    border: 0;
    background: transparent;
    color: #7ea396;
    font-size: 15px;
    line-height: 1;
    width: 22px;
    height: 22px;
    border-radius: 5px;
    cursor: pointer;
    display: grid;
    place-items: center;
  }
  .bm-remove:hover {
    color: #fca5a5;
    background: rgba(239, 68, 68, 0.14);
  }
  .bm-mark {
    width: 28px;
    height: 28px;
    border-radius: 7px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid var(--border);
    display: grid;
    place-items: center;
    font-size: 13px;
    font-weight: 700;
    flex-shrink: 0;
  }
  .bm-copy {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  .bm-title {
    font-size: 12.5px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .bm-host {
    font-size: 11px;
    color: var(--muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .empty-block {
    padding: 12px 0;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  .empty-copy {
    margin: 0;
    font-size: 13px;
    line-height: 1.5;
    color: var(--muted);
  }
  @media (max-width: 860px) {
    body { padding: 16px 16px 28px; }
    .workspace-grid { grid-template-columns: 1fr; }
    .top-nav { display: none; }
  }
  @media (prefers-reduced-motion: reduce) {
    * { transition: none !important; }
  }
</style>
</head>
<body>
  <div class="page">
    <header class="topbar">
      <span class="brand-wordmark">Serpent Peaks</span>
      <nav class="top-nav" aria-label="Browser Shortcuts">
        <button type="button" class="nav-link" data-action="open_mirror_house">Mirror House</button>
        <button type="button" class="nav-link" data-url="chrome://peaks-atlas">Peaks Atlas</button>
        <button type="button" class="nav-link" data-url="chrome://history">History</button>
        <button type="button" class="nav-link" data-action="open_settings">Settings</button>
      </nav>
      <button type="button" class="top-cta" data-action="play_game">Return to World</button>
    </header>

    <section class="hero" aria-label="Web Search">
      <div class="hero-meta">
        <span>${escapeHtml(activeProfile.name)}</span>
        <span aria-hidden="true">·</span>
        <span>Portal Channel ${tab.portalVariant}</span>
        <span aria-hidden="true">·</span>
        <span>${escapeHtml(activeEngine.name)}</span>
        <span aria-hidden="true">·</span>
        <span>${this.settings.trackerShield ? 'Privacy Shield active' : 'Privacy Shield off'}</span>
      </div>
      <h1 class="hero-title">Portal Chromium</h1>
      <form class="search-form" id="ntpForm">
        <input
          class="search-input"
          id="ntpInput"
          type="text"
          placeholder="Search ${escapeHtml(activeEngine.name)} or enter a web address..."
          autocomplete="off"
          aria-label="Search the web or enter URL"
        />
        <button type="submit" class="search-submit">Search</button>
      </form>
      ${recentSearchesHtml}
    </section>

    <main class="workspace-grid">
      <section class="panel" aria-labelledby="frequentPortalsHeading">
        <div class="panel-head">
          <h2 class="panel-title" id="frequentPortalsHeading">Frequently Visited Portals</h2>
          <span class="panel-sub">${hasVisitedPortals ? `${frequentPortals.length} tracked` : 'Nearby mountain gates'}</span>
        </div>
        ${
          hasVisitedPortals
            ? ''
            : '<p class="panel-note">No portal visits recorded yet. Jump into an active mountain gate below to begin ranking your most frequently visited portals.</p>'
        }
        <div class="rows">${portalsHtml}</div>
      </section>

      <section class="panel" aria-labelledby="milestonesHeading">
        <div class="panel-head">
          <h2 class="panel-title" id="milestonesHeading">Cultivation Milestones</h2>
          <span class="panel-sub">Stage ${c.level} / ${c.maxLevel}</span>
        </div>

        <div class="evo-summary">
          <div class="evo-top">
            <span class="evo-stage">${escapeHtml(c.stageTitle)}</span>
            <span class="evo-realm">${escapeHtml(c.realmName)}</span>
          </div>
          <div class="evo-track" role="progressbar" aria-valuenow="${c.xpProgressPct}" aria-valuemin="0" aria-valuemax="100">
            <div class="evo-fill" style="width:${c.xpProgressPct}%"></div>
          </div>
          <div class="evo-caption">${progressCaption}</div>
        </div>

        <div class="rows">
          <div class="list-row">
            <div class="row-main">
              <div class="row-title">12-Stage Cultivation Journey</div>
              <div class="row-meta">
                <span>${c.shrinesConquered} / ${c.totalShrines} Trial Peaks conquered</span>
                <span aria-hidden="true">·</span>
                <span>Next peak: ${escapeHtml(c.nextShrineName)}</span>
              </div>
            </div>
            <button type="button" class="row-btn" data-milestone="journey">Open</button>
          </div>

          <div class="list-row">
            <div class="row-main">
              <div class="row-title">Humanity Path Summary</div>
              <div class="row-meta">
                <span>${escapeHtml(c.realmName)}</span>
                <span aria-hidden="true">·</span>
                <span>${c.xp.toLocaleString()} total XP</span>
              </div>
            </div>
            <button type="button" class="row-btn" data-milestone="summary">Open</button>
          </div>

          <div class="list-row">
            <div class="row-main">
              <div class="row-title">Portal Soul Trials</div>
              <div class="row-meta">
                <span>${c.soulsCollected} / ${c.soulTarget} Soul Fragments</span>
                <span aria-hidden="true">·</span>
                <span>Coma Clock ${escapeHtml(c.comaClock)}</span>
              </div>
            </div>
            <button type="button" class="row-btn primary" data-milestone="mission">Enter</button>
          </div>

          <div class="list-row">
            <div class="row-main">
              <div class="row-title">Loot Reliquary &amp; Elixirs</div>
              <div class="row-meta">
                <span>${speedSummary}</span>
              </div>
            </div>
            <button type="button" class="row-btn" data-milestone="reliquary">Open</button>
          </div>

          <div class="list-row">
            <div class="row-main">
              <div class="row-title">Soul Clan Archives</div>
              <div class="row-meta">
                <span>${c.archivesUnlocked} / ${c.archivesTotal} chronicles unlocked</span>
              </div>
            </div>
            <button type="button" class="row-btn" data-milestone="archives">Open</button>
          </div>

          <div class="list-row">
            <div class="row-main">
              <div class="row-title">Bestiary &amp; Global Rankings</div>
              <div class="row-meta">
                <span>${c.bestiaryDiscovered} / ${c.bestiaryTotal} creatures logged</span>
              </div>
            </div>
            <div class="row-actions">
              <button type="button" class="row-btn" data-milestone="bestiary">Bestiary</button>
              <button type="button" class="row-btn" data-milestone="ranking">Rankings</button>
            </div>
          </div>
        </div>
      </section>
    </main>

    <section class="bookmarks-section" aria-labelledby="bookmarksHeading">
      <div class="section-bar">
        <h2 class="section-heading" id="bookmarksHeading">Saved Bookmarks &amp; Quick Sites${customBookmarkCount > 0 ? ` · ${customBookmarkCount} saved` : ''}</h2>
        <button type="button" class="nav-link" data-url="chrome://history">Open history &amp; bookmarks</button>
      </div>
      <div class="bm-grid">${bookmarksHtml}</div>
    </section>
  </div>

  <script>
    document.getElementById('ntpForm').addEventListener('submit', function(e) {
      e.preventDefault();
      var val = document.getElementById('ntpInput').value.trim();
      if (val) {
        window.parent.postMessage({ type: 'SERPENT_PORTAL_NAVIGATE', url: val }, '*');
      }
    });
    document.querySelectorAll('[data-url]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var u = btn.getAttribute('data-url');
        if (u) window.parent.postMessage({ type: 'SERPENT_PORTAL_NAVIGATE', url: u }, '*');
      });
    });
    document.querySelectorAll('[data-search-query]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var q = btn.getAttribute('data-search-query');
        if (q) window.parent.postMessage({ type: 'SERPENT_PORTAL_NAVIGATE', url: q }, '*');
      });
    });
    document.querySelectorAll('[data-remove-search]').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        var id = btn.getAttribute('data-remove-search');
        if (id) window.parent.postMessage({ type: 'SERPENT_PORTAL_ACTION', action: 'remove_search_history', target: id }, '*');
      });
    });
    document.querySelectorAll('[data-remove-bm]').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        var u = btn.getAttribute('data-remove-bm');
        if (u) window.parent.postMessage({ type: 'SERPENT_PORTAL_ACTION', action: 'remove_bookmark', target: u }, '*');
      });
    });
    document.querySelectorAll('[data-milestone]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var target = btn.getAttribute('data-milestone');
        if (target) {
          window.parent.postMessage({ type: 'SERPENT_PORTAL_ACTION', action: 'open_milestone', target: target }, '*');
        }
      });
    });
    document.querySelectorAll('[data-portal-action]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var mode = btn.getAttribute('data-portal-action');
        var portalId = btn.getAttribute('data-portal-id') || '';
        var variant = btn.getAttribute('data-portal-variant') === 'B' ? 'B' : 'A';
        var x = Number(btn.getAttribute('data-portal-x') || 0);
        var z = Number(btn.getAttribute('data-portal-z') || 0);
        window.parent.postMessage({
          type: 'SERPENT_PORTAL_ACTION',
          action: 'open_portal',
          mode: mode,
          portalId: portalId,
          variant: variant,
          x: x,
          z: z
        }, '*');
      });
    });
    document.querySelectorAll('[data-action]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var act = btn.getAttribute('data-action');
        if (act) {
          window.parent.postMessage({ type: 'SERPENT_PORTAL_ACTION', action: act }, '*');
        }
      });
    });
  </script>
</body>
</html>`;
  }

  /**
   * Renders a live 3D Pocket-Dimension "Another World" onto the 3D Portal CanvasTexture
   * where every open Chromium tab rolls/orbits around a central cosmic wormhole vortex!
   */
  public drawPortalBrowserTexture(
    ctx: CanvasRenderingContext2D,
    variant: PortalVariant,
    pulsePhase = 0,
  ): void {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    const isA = variant === 'A';
    const accent = isA ? '#2de3ff' : '#ff6be0';
    const secondary = isA ? '#38bdf8' : '#c084fc';
    const allTabs = this.getTabs();
    const activeTab = this.getActiveTab();

    ctx.clearRect(0, 0, w, h);

    // 1. Deep Pocket-Dimension Cosmic Nebula Backdrop
    const bgGrad = ctx.createRadialGradient(w * 0.5, h * 0.48, 12, w * 0.5, h * 0.48, w * 0.52);
    if (isA) {
      bgGrad.addColorStop(0, 'rgba(22, 78, 118, 0.98)');
      bgGrad.addColorStop(0.45, 'rgba(9, 28, 48, 0.96)');
      bgGrad.addColorStop(1, 'rgba(4, 11, 20, 0.95)');
    } else {
      bgGrad.addColorStop(0, 'rgba(98, 28, 118, 0.98)');
      bgGrad.addColorStop(0.45, 'rgba(34, 11, 52, 0.96)');
      bgGrad.addColorStop(1, 'rgba(11, 4, 20, 0.95)');
    }
    ctx.fillStyle = bgGrad;
    ctx.beginPath();
    ctx.roundRect(10, 12, w - 20, h - 24, 28);
    ctx.fill();

    ctx.lineWidth = 4;
    ctx.strokeStyle = accent;
    ctx.stroke();

    // 2. Concentric Rotating Astrolabe / Wormhole Orbit Tracks inside the Pocket World
    const cx = w * 0.5;
    const cy = h * 0.5;
    ctx.save();
    ctx.strokeStyle = isA ? 'rgba(45, 227, 255, 0.28)' : 'rgba(255, 107, 224, 0.28)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 8, 165, 66, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = isA ? 'rgba(56, 189, 248, 0.18)' : 'rgba(192, 132, 252, 0.18)';
    ctx.beginPath();
    ctx.arc(cx, cy - 4, 118, 0, Math.PI * 2);
    ctx.stroke();

    // Glowing wormhole singularity core
    const coreGlow = ctx.createRadialGradient(cx, cy - 2, 4, cx, cy - 2, 54);
    coreGlow.addColorStop(0, '#ffffff');
    coreGlow.addColorStop(0.35, accent);
    coreGlow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = coreGlow;
    ctx.beginPath();
    ctx.arc(cx, cy - 2, 54, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 3. Top Dimensional Portal Header Banner + Active Profile Badge
    const activeProfile = this.getActiveProfile();
    ctx.fillStyle = 'rgba(8, 18, 28, 0.88)';
    ctx.beginPath();
    ctx.roundRect(22, 22, w - 44, 42, 14);
    ctx.fill();
    ctx.strokeStyle = secondary;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = accent;
    ctx.textAlign = 'center';
    ctx.font = 'bold 14.5px system-ui, sans-serif';
    ctx.fillText(
      `🪞 ${activeProfile.avatarEmoji} ${activeProfile.name.toUpperCase()} · ${allTabs.length} MIRROR TABS`,
      cx,
      48,
    );

    // 4. Draw Every Open Tab Rolling Around the 3D Mirror-House Rotunda (back-to-front depth sorted!)
    const orbitLayout = computeRollingTabOrbitLayout(allTabs.length, pulsePhase * 0.85);
    const sorted = [...orbitLayout].sort((a, b) => a.zDepth - b.zDepth);

    for (const node of sorted) {
      const tab = allTabs[node.index];
      if (!tab) continue;
      const cardX = cx + node.xNorm * 162;
      const cardY = cy + 6 + node.yNorm * 108;
      const cardW = 136 * node.scale;
      const cardH = 74 * node.scale;
      const isSelected = tab.id === activeTab.id || node.isFront;

      ctx.save();
      ctx.globalAlpha = node.opacity;
      ctx.fillStyle = isSelected ? 'rgba(18, 42, 58, 0.96)' : 'rgba(9, 20, 30, 0.88)';
      ctx.beginPath();
      ctx.roundRect(cardX - cardW * 0.5, cardY - cardH * 0.5, cardW, cardH, 10 * node.scale);
      ctx.fill();

      ctx.lineWidth = isSelected ? 2.8 : 1.4;
      ctx.strokeStyle = tab.portalVariant === 'A' ? '#2de3ff' : '#ff6be0';
      ctx.stroke();

      // Miniature window header bar
      ctx.fillStyle = tab.portalVariant === 'A' ? 'rgba(45, 227, 255, 0.22)' : 'rgba(255, 107, 224, 0.22)';
      ctx.beginPath();
      ctx.roundRect(
        cardX - cardW * 0.5 + 3,
        cardY - cardH * 0.5 + 3,
        cardW - 6,
        18 * node.scale,
        [8 * node.scale, 8 * node.scale, 0, 0],
      );
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.font = `bold ${Math.max(8, Math.round(11.5 * node.scale))}px system-ui, sans-serif`;
      ctx.fillText(tab.title.slice(0, 14), cardX, cardY + 2 * node.scale);

      ctx.fillStyle = '#9bd5c4';
      ctx.font = `600 ${Math.max(7, Math.round(9.5 * node.scale))}px monospace`;
      ctx.fillText(
        tab.displayUrl.replace(/^https?:\/\//, '').slice(0, 16),
        cardX,
        cardY + 19 * node.scale,
      );
      ctx.restore();
    }

    // 5. Bottom Callout Footer
    ctx.fillStyle = 'rgba(10, 22, 32, 0.92)';
    ctx.beginPath();
    ctx.roundRect(22, h - 62, w - 44, 40, 14);
    ctx.fill();

    ctx.fillStyle = '#fde047';
    ctx.textAlign = 'center';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillText('⚡ ENTER PORTAL TO SPIN & SELECT A TAB WORLD', cx, h - 37);
    ctx.textAlign = 'left';
  }
}
