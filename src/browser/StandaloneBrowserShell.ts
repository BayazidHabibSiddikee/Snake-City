import { PortalChromiumManager } from '../browser';
import { PortalOfflineCacheController, extractBookmarkCacheableUrls } from '../offlineCache';

/**
 * Lightweight Standalone Portal Browser shell mounted when starting in `?mode=browser`.
 * Zero Three.js / WebGL / game-world initialization occurs until the user clicks "Enter 3D World".
 */
export class StandaloneBrowserShell {
  private readonly root: HTMLElement;
  private readonly browser = new PortalChromiumManager();
  private readonly offlineCache = new PortalOfflineCacheController();
  private readonly onEnterGameWorld: () => void;
  private readonly onReturnToMainMenu?: () => void;
  private readonly container: HTMLDivElement;
  private readonly tabStripEl: HTMLDivElement;
  private readonly omniboxEl: HTMLInputElement;
  private readonly bookmarkBtnEl: HTMLButtonElement;
  private readonly proxyBtnEl: HTMLButtonElement;
  private readonly iframeEl: HTMLIFrameElement;
  private readonly statusEl: HTMLSpanElement;
  private readonly messageHandler: (e: MessageEvent) => void;
  private lastFrameKey = '';
  private destroyed = false;

  constructor(
    root: HTMLElement,
    onEnterGameWorld: () => void,
    onReturnToMainMenu?: () => void,
  ) {
    this.root = root;
    this.onEnterGameWorld = onEnterGameWorld;
    this.onReturnToMainMenu = onReturnToMainMenu;

    this.container = document.createElement('div');
    this.container.className = 'standalone-browser-shell';
    this.container.innerHTML = `
      <header class="sbs-topbar">
        <div class="sbs-brand">
          <span class="sbs-brand-mark">SP</span>
          <div class="sbs-brand-text">
            <strong>Snake-City Portal Browser</strong>
            <span>Isolated Web Proxy · Light Startup (3D Engine Idle)</span>
          </div>
        </div>
        <div class="sbs-tabstrip" id="sbsTabStrip"></div>
        <div class="sbs-top-actions">
          <button type="button" class="sbs-btn" id="sbsNewTabBtn" title="New Tab">+ Tab</button>
          ${onReturnToMainMenu ? '<button type="button" class="sbs-btn" id="sbsMainMenuBtn">Main Menu</button>' : ''}
          <button type="button" class="sbs-btn primary" id="sbsEnterWorldBtn">Enter Snake City</button>
        </div>
      </header>
      <div class="sbs-navbar">
        <button type="button" class="sbs-nav-btn" id="sbsBackBtn" title="Back">←</button>
        <button type="button" class="sbs-nav-btn" id="sbsFwdBtn" title="Forward">→</button>
        <button type="button" class="sbs-nav-btn" id="sbsReloadBtn" title="Reload">↻</button>
        <form class="sbs-omnibox-form" id="sbsOmniForm">
          <input
            type="text"
            id="sbsOmnibox"
            class="sbs-omnibox"
            placeholder="Search the web or enter URL (https://..., chrome://newtab, chrome://version)"
            autocomplete="off"
          />
        </form>
        <button type="button" class="sbs-nav-btn" id="sbsBookmarkBtn" title="Bookmark page">☆</button>
        <button type="button" class="sbs-nav-btn" id="sbsProxyBtn" title="Toggle Safe Proxy">Proxy: ON</button>
      </div>
      <main class="sbs-viewport-wrap">
        <iframe
          id="sbsViewport"
          class="sbs-viewport"
          title="Portal Browser Viewport"
          sandbox="allow-scripts allow-forms allow-popups"
          referrerpolicy="no-referrer"
        ></iframe>
      </main>
      <footer class="sbs-statusbar">
        <span id="sbsStatusText">Portal Browser Ready · Opaque Sandbox Isolation Active</span>
        <span>3D WebGL Engine not loaded · Click "Enter 3D World" anytime</span>
      </footer>
    `;

    this.root.innerHTML = '';
    this.root.appendChild(this.container);

    this.tabStripEl = this.container.querySelector('#sbsTabStrip')!;
    this.omniboxEl = this.container.querySelector('#sbsOmnibox')!;
    this.bookmarkBtnEl = this.container.querySelector('#sbsBookmarkBtn')!;
    this.proxyBtnEl = this.container.querySelector('#sbsProxyBtn')!;
    this.iframeEl = this.container.querySelector('#sbsViewport')!;
    this.statusEl = this.container.querySelector('#sbsStatusText')!;

    this.bindEvents();

    this.messageHandler = (e: MessageEvent) => {
      if (this.destroyed) return;
      if (e.source !== this.iframeEl.contentWindow) return;
      if (e.origin !== 'null' && e.origin !== window.location.origin) return;
      const data = e.data as {
        type?: string;
        bridgeToken?: string;
        url?: string;
        title?: string;
        action?: string;
        target?: string;
      } | null;
      if (!data || typeof data !== 'object') return;
      if (data.bridgeToken !== this.browser.getBridgeToken()) return;

      if (data.type === 'SERPENT_PORTAL_NAVIGATE' && typeof data.url === 'string') {
        this.navigate(data.url);
      } else if (data.type === 'SERPENT_PORTAL_TAB_LOADED') {
        this.browser.updateActiveTabMetadata(data.url, data.title);
        this.render(false);
      } else if (data.type === 'SERPENT_PORTAL_ACTION') {
        const activeUrl = this.browser.getActiveTab().url;
        if (!activeUrl.startsWith('chrome://')) return;
        if (data.action === 'remove_bookmark' && data.target) {
          this.browser.removeCustomBookmark(data.target);
          this.render(true);
        } else if (data.action === 'remove_search_history' && data.target) {
          this.browser.removeSearchHistoryEntry(data.target);
          this.render(true);
        } else if (data.action === 'open_milestone' || data.action === 'open_portal') {
          this.transitionToGameWorld();
        }
      }
    };
    window.addEventListener('message', this.messageHandler);

    this.render(true);
    void this.initOfflineCache();
  }

  private bindEvents(): void {
    this.container.querySelector('#sbsNewTabBtn')?.addEventListener('click', () => {
      this.browser.createTab('chrome://newtab');
      this.render(true);
    });

    this.container.querySelector('#sbsEnterWorldBtn')?.addEventListener('click', () => {
      this.transitionToGameWorld();
    });

    this.container.querySelector('#sbsMainMenuBtn')?.addEventListener('click', () => {
      if (!this.onReturnToMainMenu) return;
      this.destroy();
      this.onReturnToMainMenu();
    });

    this.container.querySelector('#sbsBackBtn')?.addEventListener('click', () => {
      this.browser.goBack();
      this.render(true);
    });

    this.container.querySelector('#sbsFwdBtn')?.addEventListener('click', () => {
      this.browser.goForward();
      this.render(true);
    });

    this.container.querySelector('#sbsReloadBtn')?.addEventListener('click', () => {
      this.render(true);
    });

    this.container.querySelector('#sbsOmniForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = this.omniboxEl.value.trim();
      if (input) this.navigate(input);
    });

    this.bookmarkBtnEl.addEventListener('click', () => {
      const tab = this.browser.getActiveTab();
      const added = this.browser.toggleBookmark(tab.title, tab.url, tab.portalVariant);
      this.statusEl.textContent = added
        ? `Saved bookmark: ${tab.title}`
        : `Removed bookmark: ${tab.title}`;
      this.render(false);
    });

    this.proxyBtnEl.addEventListener('click', () => {
      this.browser.toggleProxyMode();
      this.render(true);
    });
  }

  private navigate(raw: string): void {
    this.browser.navigateActiveTab(raw);
    this.render(true);
  }

  private render(forceFrameReload: boolean): void {
    const tabs = this.browser.getTabs();
    const active = this.browser.getActiveTab();

    this.tabStripEl.innerHTML = tabs
      .slice(0, 8)
      .map((t) => {
        const isActive = t.id === active.id;
        const safeTitle = t.title.replace(/[<>&"']/g, '').slice(0, 22);
        return `
          <div class="sbs-tab ${isActive ? 'active' : ''}" data-tab-id="${t.id}">
            <span class="sbs-tab-title">${safeTitle || 'Portal Tab'}</span>
            ${tabs.length > 1 ? `<button type="button" class="sbs-tab-close" data-close-id="${t.id}" aria-label="Close tab">×</button>` : ''}
          </div>
        `;
      })
      .join('');

    this.tabStripEl.querySelectorAll<HTMLElement>('.sbs-tab').forEach((el) => {
      el.addEventListener('click', () => {
        const id = el.dataset.tabId;
        if (id) {
          this.browser.activateTab(id);
          this.render(true);
        }
      });
    });

    this.tabStripEl.querySelectorAll<HTMLButtonElement>('.sbs-tab-close').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.closeId;
        if (id) {
          this.browser.closeTab(id);
          this.render(true);
        }
      });
    });

    this.omniboxEl.value = active.url;
    const isSaved = this.browser.isBookmarked(active.url);
    this.bookmarkBtnEl.textContent = isSaved ? '★' : '☆';
    this.proxyBtnEl.textContent = active.proxyMode ? 'Proxy: ON' : 'Direct';

    const frameTarget = this.browser.getIframeSrcForTab(active);
    const frameKey = `${active.id}|${active.url}|${active.proxyMode ? '1' : '0'}`;
    if (forceFrameReload || this.lastFrameKey !== frameKey) {
      this.lastFrameKey = frameKey;
      if (frameTarget.srcdoc !== undefined) {
        this.iframeEl.removeAttribute('src');
        this.iframeEl.srcdoc = frameTarget.srcdoc;
      } else if (frameTarget.src) {
        this.iframeEl.removeAttribute('srcdoc');
        this.iframeEl.src = frameTarget.src;
      }
    }
  }

  private async initOfflineCache(): Promise<void> {
    try {
      const cachedState = await this.offlineCache.readCachedPortalState();
      if (cachedState) {
        this.browser.hydrateFromOfflineStateSnapshot(cachedState);
        this.render(false);
      }
      await this.offlineCache.registerAndWarm(this.browser.exportOfflineStateSnapshot());
      if (this.offlineCache.isOnline()) {
        const urls = extractBookmarkCacheableUrls(
          this.browser.getCustomBookmarks(),
          this.browser.getHistory().slice(0, 6),
          10,
        );
        if (urls.length > 0) {
          void this.offlineCache.precachePortalUrls(urls, this.browser.getSettings());
        }
      }
    } catch {
      // keep shell running cleanly if SW is unavailable
    }
  }

  private transitionToGameWorld(): void {
    this.destroy();
    this.onEnterGameWorld();
  }

  public destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    window.removeEventListener('message', this.messageHandler);
    this.container.remove();
  }
}
