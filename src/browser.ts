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
}

export interface PortalBookmark {
  title: string;
  url: string;
  badge: string;
  accentHex: string;
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

const STORAGE_KEY = 'SERPENT_PEAKS_PORTAL_TABS_V1';

/**
 * Pure helper that resolves any Chromium Omnibox input (chrome:// URL, full URL,
 * bare domain like "wikipedia.org", or natural-language search query) into a target URL.
 */
export function resolveOmniboxInput(rawInput: string): ResolvedOmniboxTarget {
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

  // Natural language search query -> DuckDuckGo Lite HTML search (works reliably in proxy & iframe)
  const searchUrl = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(trimmed)}`;
  return {
    url: searchUrl,
    displayUrl: searchUrl,
    titleGuess: `${trimmed} - Web Search`,
    isInternal: false,
  };
}

export interface RollingTabOrbitNode {
  index: number;
  angleRad: number;
  xNorm: number; // -1..+1 horizontal orbit offset
  yNorm: number; // -1..+1 vertical tilt offset
  zDepth: number; // -1 (far back) .. +1 (closest front)
  rotateYDeg: number;
  scale: number;
  opacity: number;
  zIndex: number;
  isFront: boolean;
}

/**
 * Pure helper that computes 3D orbital carousel transforms for every tab rolling around
 * inside the Portal Pocket World, sorted or indexed for 3D CSS & 2D Canvas rendering.
 */
export function computeRollingTabOrbitLayout(
  tabCount: number,
  orbitAngleRad: number,
): RollingTabOrbitNode[] {
  const count = Math.max(1, Math.floor(tabCount));
  const nodes: RollingTabOrbitNode[] = [];
  let bestFrontIdx = 0;
  let maxZ = -Infinity;

  for (let i = 0; i < count; i++) {
    const theta = orbitAngleRad + (i * Math.PI * 2) / count;
    const xNorm = Math.sin(theta);
    const zDepth = Math.cos(theta); // +1 = closest to viewer, -1 = farthest in background
    const yNorm = -zDepth * 0.22 + Math.sin(theta * 2) * 0.05;
    const depth01 = (zDepth + 1) * 0.5; // 0..1
    const scale = Number((0.62 + depth01 * 0.46).toFixed(3));
    const opacity = Number((0.38 + depth01 * 0.62).toFixed(3));
    const rotateYDeg = Number((xNorm * -34).toFixed(2));
    const zIndex = Math.round(10 + depth01 * 90);

    if (zDepth > maxZ) {
      maxZ = zDepth;
      bestFrontIdx = i;
    }

    nodes.push({
      index: i,
      angleRad: theta,
      xNorm,
      yNorm,
      zDepth,
      rotateYDeg,
      scale,
      opacity,
      zIndex,
      isFront: false,
    });
  }

  if (nodes[bestFrontIdx]) {
    nodes[bestFrontIdx].isFront = true;
  }
  return nodes;
}

function createDefaultTabs(): ChromiumTab[] {
  return [
    {
      id: 'ptab-a-1',
      title: 'Wikipedia — Encyclopedia',
      url: 'https://en.m.wikipedia.org/wiki/Main_Page',
      displayUrl: 'https://en.m.wikipedia.org/wiki/Main_Page',
      portalVariant: 'A',
      history: ['https://en.m.wikipedia.org/wiki/Main_Page'],
      historyIndex: 0,
      proxyMode: true,
      isLoading: false,
    },
    {
      id: 'ptab-a-2',
      title: 'DuckDuckGo — Web Search',
      url: 'https://lite.duckduckgo.com/lite/',
      displayUrl: 'https://lite.duckduckgo.com/lite/',
      portalVariant: 'A',
      history: ['https://lite.duckduckgo.com/lite/'],
      historyIndex: 0,
      proxyMode: true,
      isLoading: false,
    },
    {
      id: 'ptab-b-1',
      title: 'Serpent Peaks Trial Atlas',
      url: 'chrome://peaks-atlas',
      displayUrl: 'chrome://peaks-atlas',
      portalVariant: 'B',
      history: ['chrome://peaks-atlas'],
      historyIndex: 0,
      proxyMode: true,
      isLoading: false,
    },
    {
      id: 'ptab-a-3',
      title: 'Hacker News — Tech Feed',
      url: 'https://news.ycombinator.com/',
      displayUrl: 'https://news.ycombinator.com/',
      portalVariant: 'A',
      history: ['https://news.ycombinator.com/'],
      historyIndex: 0,
      proxyMode: true,
      isLoading: false,
    },
    {
      id: 'ptab-b-2',
      title: 'Portal New Tab Hub',
      url: 'chrome://newtab',
      displayUrl: 'chrome://newtab',
      portalVariant: 'B',
      history: ['chrome://newtab'],
      historyIndex: 0,
      proxyMode: true,
      isLoading: false,
    },
    {
      id: 'ptab-b-3',
      title: 'About Chromium — Engine',
      url: 'chrome://version',
      displayUrl: 'chrome://version',
      portalVariant: 'B',
      history: ['chrome://version'],
      historyIndex: 0,
      proxyMode: true,
      isLoading: false,
    },
  ];
}

export class PortalChromiumManager {
  private tabs: ChromiumTab[] = [];
  private activeTabId = '';
  private activePortalVariant: PortalVariant = 'A';
  private listeners: Array<() => void> = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as {
          tabs?: ChromiumTab[];
          activeTabId?: string;
          activePortalVariant?: PortalVariant;
        };
        if (Array.isArray(parsed.tabs) && parsed.tabs.length > 0) {
          this.tabs = parsed.tabs.map((t) => ({
            id: String(t.id || `ptab-${Date.now()}`),
            title: String(t.title || 'New Tab'),
            url: String(t.url || 'chrome://newtab'),
            displayUrl: String(t.displayUrl || t.url || 'chrome://newtab'),
            portalVariant: t.portalVariant === 'B' ? 'B' : 'A',
            history: Array.isArray(t.history) && t.history.length > 0 ? t.history : [String(t.url || 'chrome://newtab')],
            historyIndex: typeof t.historyIndex === 'number' ? Math.max(0, t.historyIndex) : 0,
            proxyMode: t.proxyMode !== false,
            isLoading: false,
          }));
          this.activePortalVariant = parsed.activePortalVariant === 'B' ? 'B' : 'A';
          this.activeTabId =
            parsed.activeTabId && this.tabs.some((t) => t.id === parsed.activeTabId)
              ? parsed.activeTabId
              : this.tabs[0].id;
          return;
        }
      }
    } catch {
      // ignore storage errors
    }
    this.tabs = createDefaultTabs();
    this.activeTabId = this.tabs[0].id;
    this.activePortalVariant = 'A';
  }

  private saveToStorage(): void {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
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
      this.tabs = createDefaultTabs();
    }
    this.activeTabId = this.tabs[0].id;
    return this.tabs[0];
  }

  public activateTab(id: string): ChromiumTab {
    const found = this.tabs.find((t) => t.id === id);
    if (found) {
      this.activeTabId = found.id;
      this.activePortalVariant = found.portalVariant;
      this.emitChange();
      return found;
    }
    return this.getActiveTab();
  }

  public createTab(
    initialInput = 'chrome://newtab',
    variant: PortalVariant = this.activePortalVariant,
  ): ChromiumTab {
    const resolved = resolveOmniboxInput(initialInput);
    const newTab: ChromiumTab = {
      id: `ptab-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: resolved.titleGuess,
      url: resolved.url,
      displayUrl: resolved.displayUrl,
      portalVariant: variant,
      history: [resolved.url],
      historyIndex: 0,
      proxyMode: true,
      isLoading: !resolved.isInternal,
    };
    this.tabs.push(newTab);
    this.activeTabId = newTab.id;
    this.activePortalVariant = variant;
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
    const resolved = resolveOmniboxInput(rawInput);
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
      const resolved = resolveOmniboxInput(target);
      tab.url = resolved.url;
      tab.displayUrl = resolved.displayUrl;
      tab.title = resolved.titleGuess;
      tab.isLoading = !resolved.isInternal;
      this.emitChange();
    }
    return tab;
  }

  public goForward(): ChromiumTab {
    const tab = this.getActiveTab();
    if (tab.historyIndex < tab.history.length - 1) {
      tab.historyIndex++;
      const target = tab.history[tab.historyIndex];
      const resolved = resolveOmniboxInput(target);
      tab.url = resolved.url;
      tab.displayUrl = resolved.displayUrl;
      tab.title = resolved.titleGuess;
      tab.isLoading = !resolved.isInternal;
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

  public getIframeSrcForTab(tab: ChromiumTab): { src?: string; srcdoc?: string } {
    if (tab.url.startsWith('chrome://')) {
      return { srcdoc: this.buildInternalPageHtml(tab) };
    }
    if (tab.proxyMode) {
      return { src: `/api/browser/proxy?url=${encodeURIComponent(tab.url)}` };
    }
    return { src: tab.url };
  }

  private buildInternalPageHtml(tab: ChromiumTab): string {
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

    // Default: chrome://newtab
    const tilesHtml = PORTAL_BOOKMARKS.filter((b) => b.url !== 'chrome://newtab')
      .map(
        (b) => `
      <button class="tile" data-url="${b.url}">
        <span class="tile-icon" style="border-color:${b.accentHex};color:${b.accentHex}">${b.badge}</span>
        <span class="tile-title">${b.title}</span>
        <span class="tile-url">${b.url.replace(/^https?:\/\//, '').slice(0, 26)}</span>
      </button>`,
      )
      .join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>New Tab — Portal Chromium</title>
<style>
  * { box-sizing:border-box; }
  body {
    background: radial-gradient(circle at 50% 18%, #122936 0%, #071015 75%);
    color:#eaf7f2;
    font-family:system-ui,-apple-system,sans-serif;
    margin:0;
    padding:28px 20px;
    text-align:center;
  }
  .logo-badge {
    display:inline-flex;
    align-items:center;
    gap:8px;
    padding:5px 13px;
    border-radius:999px;
    background:rgba(45,227,255,0.12);
    border:1px solid ${accent};
    color:${accent};
    font-size:11px;
    font-weight:800;
    letter-spacing:0.1em;
    margin-bottom:10px;
  }
  h1 {
    font-size:24px;
    margin:0 0 6px;
    letter-spacing:0.03em;
    color:#ffffff;
  }
  p.sub {
    margin:0 auto 20px;
    max-width:520px;
    font-size:13px;
    color:#97bfb3;
  }
  form {
    max-width:540px;
    margin:0 auto 24px;
    display:flex;
    gap:8px;
  }
  input {
    flex:1;
    height:42px;
    padding:0 16px;
    border-radius:10px;
    border:1.5px solid rgba(56,189,248,0.38);
    background:rgba(8,18,24,0.9);
    color:#fff;
    font-size:14px;
    outline:none;
  }
  input:focus {
    border-color:${accent};
    box-shadow:0 0 0 3px rgba(45,227,255,0.18);
  }
  button.go {
    height:42px;
    padding:0 18px;
    border-radius:10px;
    border:1px solid ${accent};
    background:${accent};
    color:#061318;
    font-weight:800;
    font-size:13px;
    cursor:pointer;
  }
  .grid {
    max-width:620px;
    margin:0 auto;
    display:grid;
    grid-template-columns:repeat(auto-fill,minmax(138px,1fr));
    gap:12px;
  }
  .tile {
    display:flex;
    flex-direction:column;
    align-items:center;
    gap:6px;
    padding:14px 10px;
    border-radius:12px;
    background:rgba(15,30,38,0.86);
    border:1px solid rgba(255,255,255,0.1);
    color:#e2f2ec;
    cursor:pointer;
    transition:transform 0.14s ease, border-color 0.14s ease;
  }
  .tile:hover {
    transform:translateY(-2px);
    border-color:${accent};
  }
  .tile-icon {
    width:36px;
    height:36px;
    border-radius:10px;
    border:1.5px solid;
    display:flex;
    align-items:center;
    justify-content:center;
    font-size:16px;
    font-weight:800;
    background:rgba(0,0,0,0.28);
  }
  .tile-title { font-size:12.5px; font-weight:700; }
  .tile-url { font-size:10.5px; color:#7fa69a; }
</style>
</head>
<body>
  <div class="logo-badge">● PORTAL ${tab.portalVariant} · CHROMIUM 131</div>
  <h1>Portal Chromium Wormhole Browser</h1>
  <p class="sub">Search the web or open multiple tabs directly inside the 3D mountain portals.</p>
  <form id="ntpForm">
    <input id="ntpInput" type="text" placeholder="Search the web or type a URL (e.g. wikipedia.org)..." autocomplete="off" />
    <button type="submit" class="go">Browse</button>
  </form>
  <div class="grid">${tilesHtml}</div>
  <script>
    document.getElementById('ntpForm').addEventListener('submit', function(e) {
      e.preventDefault();
      var val = document.getElementById('ntpInput').value.trim();
      if (val) {
        window.parent.postMessage({ type: 'SERPENT_PORTAL_NAVIGATE', url: val }, '*');
      }
    });
    document.querySelectorAll('.tile').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var u = btn.getAttribute('data-url');
        if (u) window.parent.postMessage({ type: 'SERPENT_PORTAL_NAVIGATE', url: u }, '*');
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

    // 3. Top Dimensional Portal Header Banner
    ctx.fillStyle = 'rgba(8, 18, 28, 0.88)';
    ctx.beginPath();
    ctx.roundRect(22, 22, w - 44, 42, 14);
    ctx.fill();
    ctx.strokeStyle = secondary;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = accent;
    ctx.textAlign = 'center';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText(
      `🌌 PORTAL ${variant} OTHERWORLD · ${allTabs.length} TABS ROLLING`,
      cx,
      48,
    );

    // 4. Draw Every Open Tab Rolling Around the 3D Orbit (back-to-front depth sorted!)
    const orbitLayout = computeRollingTabOrbitLayout(allTabs.length, pulsePhase * 0.85);
    const sorted = [...orbitLayout].sort((a, b) => a.zDepth - b.zDepth);

    for (const node of sorted) {
      const tab = allTabs[node.index];
      if (!tab) continue;
      const cardX = cx + node.xNorm * 142;
      const cardY = cy + 6 + node.yNorm * 115;
      const cardW = 148 * node.scale;
      const cardH = 82 * node.scale;
      const isSelected = tab.id === activeTab.id || node.isFront;

      ctx.save();
      ctx.globalAlpha = node.opacity;
      ctx.fillStyle = isSelected ? 'rgba(18, 42, 58, 0.96)' : 'rgba(9, 20, 30, 0.88)';
      ctx.beginPath();
      ctx.roundRect(cardX - cardW * 0.5, cardY - cardH * 0.5, cardW, cardH, 12 * node.scale);
      ctx.fill();

      ctx.lineWidth = isSelected ? 3 : 1.5;
      ctx.strokeStyle = tab.portalVariant === 'A' ? '#2de3ff' : '#ff6be0';
      ctx.stroke();

      // Miniature window header bar
      ctx.fillStyle = tab.portalVariant === 'A' ? 'rgba(45, 227, 255, 0.22)' : 'rgba(255, 107, 224, 0.22)';
      ctx.beginPath();
      ctx.roundRect(
        cardX - cardW * 0.5 + 3,
        cardY - cardH * 0.5 + 3,
        cardW - 6,
        20 * node.scale,
        [9 * node.scale, 9 * node.scale, 0, 0],
      );
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.font = `bold ${Math.max(9, Math.round(12 * node.scale))}px system-ui, sans-serif`;
      ctx.fillText(tab.title.slice(0, 15), cardX, cardY + 2 * node.scale);

      ctx.fillStyle = '#9bd5c4';
      ctx.font = `600 ${Math.max(8, Math.round(10 * node.scale))}px monospace`;
      ctx.fillText(
        tab.displayUrl.replace(/^https?:\/\//, '').slice(0, 18),
        cardX,
        cardY + 22 * node.scale,
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
