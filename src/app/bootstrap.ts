import {
  resolveInitialStartupMode,
  syncModeQueryParam,
  type AppStartupMode,
} from './router';
import {
  PageFlipTransitionController,
  captureMainMenuSnapshotCanvas,
  createFallbackGameSnapshotCanvas,
} from './PageFlipTransition';

export interface ActiveSubsystem {
  mode: AppStartupMode;
  destroy: () => void;
  captureSnapshot?: () => HTMLCanvasElement | null;
}

export interface AppBootstrapController {
  launchMode: (mode: AppStartupMode, autoEnterWorld?: boolean) => Promise<void>;
  getCurrentSubsystem: () => ActiveSubsystem | null;
  destroy: () => void;
}

function waitNextFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

function renderLoadingTransition(root: HTMLElement, title: string, detail: string): HTMLDivElement {
  const overlay = document.createElement('div');
  overlay.className = 'scm-loading-overlay';
  overlay.setAttribute('role', 'status');
  overlay.setAttribute('aria-live', 'polite');
  overlay.innerHTML = `
    <div class="scm-loading-card">
      <div class="scm-loading-ring" aria-hidden="true"></div>
      <h2 class="scm-loading-title">${title}</h2>
      <p class="scm-loading-detail">${detail}</p>
    </div>
  `;
  root.appendChild(overlay);
  return overlay;
}

function renderRecoveryFallback(
  root: HTMLElement,
  mode: AppStartupMode,
  err: unknown,
  actions: {
    onRetry: () => void;
    onOpenBrowser: () => void;
    onReturnMenu: () => void;
  },
): void {
  const message = err instanceof Error ? err.message : String(err || 'Unexpected initialization error');
  const escaped = message.replace(/[<>&"']/g, (ch) => {
    const map: Record<string, string> = {
      '<': '&lt;',
      '>': '&gt;',
      '&': '&amp;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return map[ch] ?? ch;
  });

  root.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'scm-loading-overlay';
  wrap.setAttribute('role', 'alert');
  wrap.innerHTML = `
    <div class="scm-error-card">
      <p class="scm-kicker">Startup Recovery</p>
      <h2 class="scm-loading-title">Could not start ${mode === 'game' ? '3D Game World' : 'selected mode'}</h2>
      <p class="scm-loading-detail">${escaped}</p>
      <div class="scm-error-actions">
        <button type="button" class="scm-btn-primary" id="scmRecoveryRetryBtn">Retry Launch</button>
        ${mode !== 'browser' ? '<button type="button" class="scm-btn-secondary" id="scmRecoveryBrowserBtn">Open Portal Browser</button>' : ''}
        <button type="button" class="scm-btn-ghost" id="scmRecoveryMenuBtn">Return to Front Page</button>
      </div>
    </div>
  `;
  root.appendChild(wrap);
  wrap.querySelector('#scmRecoveryRetryBtn')?.addEventListener('click', actions.onRetry);
  wrap.querySelector('#scmRecoveryBrowserBtn')?.addEventListener('click', actions.onOpenBrowser);
  wrap.querySelector('#scmRecoveryMenuBtn')?.addEventListener('click', actions.onReturnMenu);
}

/**
 * Initializes the Serpent Peaks app bootstrap router.
 * Dynamically imports and initializes the Main Menu, 3D Game World, or Standalone Browser
 * subsystems only when requested, ensuring zero eager loading of Three.js or heavy subsystems.
 */
export function initAppBootstrap(rootElement: HTMLElement = document.body): AppBootstrapController {
  let activeSubsystem: ActiveSubsystem | null = null;
  let transitionSeq = 0;
  const pageFlip = new PageFlipTransitionController();
  const overlayParent = rootElement.parentElement ?? document.body;

  const unmountCurrent = () => {
    if (activeSubsystem) {
      activeSubsystem.destroy();
      activeSubsystem = null;
    }
  };

  const launchMode = async (mode: AppStartupMode, autoEnterWorld = false): Promise<void> => {
    const seq = ++transitionSeq;
    const prevMode = activeSubsystem?.mode ?? null;
    let loaderEl: HTMLDivElement | null = null;
    let usedPageFlip = false;

    try {
      if (mode === 'game') {
        if (prevMode === 'menu') {
          usedPageFlip = true;
          const menuSnap = captureMainMenuSnapshotCanvas(rootElement);
          pageFlip.start({
            direction: 'menu-to-game',
            frontCanvas: menuSnap,
            loadingLabel: 'Turning to Serpent Peaks…',
            mountParent: overlayParent,
          });
        } else {
          loaderEl = renderLoadingTransition(
            rootElement,
            'Awakening Serpent Peaks',
            'Loading 3D alpine terrain, WebGL shaders, and Sanctuary portals…',
          );
        }

        const { mountGameRuntime } = await import('../game/GameRuntime');
        if (seq !== transitionSeq) {
          loaderEl?.remove();
          if (usedPageFlip) pageFlip.cancel();
          return;
        }
        unmountCurrent();
        syncModeQueryParam(mode);
        const handle = mountGameRuntime(rootElement, {
          autoStartInSanctuary: autoEnterWorld,
          onSwitchToMainMenu: () => {
            void launchMode('menu', false);
          },
          onSwitchToStandaloneBrowser: () => {
            void launchMode('browser', false);
          },
        });
        activeSubsystem = {
          mode: 'game',
          destroy: () => handle.destroy(),
          captureSnapshot: () => handle.captureViewportSnapshot(),
        };
        if (usedPageFlip) {
          rootElement.classList.remove('pf-menu-reveal');
          rootElement.classList.add('pf-world-reveal');
          // Let the newly mounted 3D WebGL scene paint its first live frame before peeling open
          await waitNextFrame();
          if (seq === transitionSeq) {
            await pageFlip.complete(780);
            rootElement.classList.remove('pf-world-reveal');
          }
        }
        return;
      }

      if (mode === 'browser') {
        pageFlip.cancel();
        loaderEl = renderLoadingTransition(
          rootElement,
          'Opening Portal Browser',
          'Initializing isolated proxy tabs and offline cache…',
        );
        const { StandaloneBrowserShell } = await import('../browser/StandaloneBrowserShell');
        if (seq !== transitionSeq) {
          loaderEl.remove();
          return;
        }
        unmountCurrent();
        syncModeQueryParam(mode);
        const shell = new StandaloneBrowserShell(
          rootElement,
          () => {
            void launchMode('game', true);
          },
          () => {
            void launchMode('menu', false);
          },
        );
        activeSubsystem = { mode: 'browser', destroy: () => shell.destroy() };
        return;
      }

      if (prevMode === 'game') {
        usedPageFlip = true;
        const worldSnap =
          activeSubsystem?.captureSnapshot?.() ?? createFallbackGameSnapshotCanvas();
        pageFlip.start({
          direction: 'game-to-menu',
          frontCanvas: worldSnap,
          mountParent: overlayParent,
        });
      }

      const { MainMenuShell } = await import('./MainMenuShell');
      if (seq !== transitionSeq) {
        if (usedPageFlip) pageFlip.cancel();
        return;
      }
      unmountCurrent();
      syncModeQueryParam(mode);
      const shell = new MainMenuShell(rootElement, {
        onEnterSnakeCity: () => {
          void launchMode('game', true);
        },
        onOpenQuickBrowser: () => {
          void launchMode('browser', false);
        },
      });
      activeSubsystem = { mode: 'menu', destroy: () => shell.destroy() };
      if (usedPageFlip) {
        rootElement.classList.remove('pf-world-reveal');
        rootElement.classList.add('pf-menu-reveal');
        await waitNextFrame();
        if (seq === transitionSeq) {
          await pageFlip.complete(720);
          rootElement.classList.remove('pf-menu-reveal');
        }
      }
    } catch (err) {
      console.error(`Failed to launch "${mode}" subsystem:`, err);
      loaderEl?.remove();
      if (usedPageFlip) pageFlip.cancel();
      if (seq !== transitionSeq) return;
      unmountCurrent();
      renderRecoveryFallback(rootElement, mode, err, {
        onRetry: () => void launchMode(mode, autoEnterWorld),
        onOpenBrowser: () => void launchMode('browser', false),
        onReturnMenu: () => void launchMode('menu', false),
      });
    }
  };

  const initialMode = resolveInitialStartupMode();
  void launchMode(initialMode, initialMode === 'game');

  return {
    launchMode,
    getCurrentSubsystem: () => activeSubsystem,
    destroy: () => {
      pageFlip.cancel();
      unmountCurrent();
    },
  };
}
