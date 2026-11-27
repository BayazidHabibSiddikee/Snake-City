import {
  resolveInitialStartupMode,
  syncModeQueryParam,
  type AppStartupMode,
} from './router';

export interface ActiveSubsystem {
  mode: AppStartupMode;
  destroy: () => void;
}

export interface AppBootstrapController {
  launchMode: (mode: AppStartupMode, autoEnterWorld?: boolean) => Promise<void>;
  getCurrentSubsystem: () => ActiveSubsystem | null;
  destroy: () => void;
}

/**
 * Initializes the Serpent Peaks app bootstrap router.
 * Dynamically imports and initializes the Main Menu, 3D Game World, or Standalone Browser
 * subsystems only when requested, ensuring zero eager loading of Three.js or heavy subsystems.
 */
export function initAppBootstrap(rootElement: HTMLElement = document.body): AppBootstrapController {
  let activeSubsystem: ActiveSubsystem | null = null;
  let transitionSeq = 0;

  const unmountCurrent = () => {
    if (activeSubsystem) {
      activeSubsystem.destroy();
      activeSubsystem = null;
    }
  };

  const launchMode = async (mode: AppStartupMode, autoEnterWorld = false): Promise<void> => {
    const seq = ++transitionSeq;
    unmountCurrent();
    syncModeQueryParam(mode);

    if (mode === 'menu') {
      const { MainMenuShell } = await import('./MainMenuShell');
      if (seq !== transitionSeq) return;
      const shell = new MainMenuShell(rootElement, {
        onEnterSnakeCity: () => {
          void launchMode('game', true);
        },
        onOpenQuickBrowser: () => {
          void launchMode('browser', false);
        },
      });
      activeSubsystem = { mode: 'menu', destroy: () => shell.destroy() };
      return;
    }

    if (mode === 'browser') {
      const { StandaloneBrowserShell } = await import('../browser/StandaloneBrowserShell');
      if (seq !== transitionSeq) return;
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

    // 3D Game World subsystem
    const { mountGameRuntime } = await import('../game/GameRuntime');
    if (seq !== transitionSeq) return;
    const handle = mountGameRuntime(rootElement, {
      autoStartInSanctuary: autoEnterWorld,
      onSwitchToMainMenu: () => {
        void launchMode('menu', false);
      },
      onSwitchToStandaloneBrowser: () => {
        void launchMode('browser', false);
      },
    });
    activeSubsystem = { mode: 'game', destroy: () => handle.destroy() };
  };

  const initialMode = resolveInitialStartupMode();
  void launchMode(initialMode, initialMode === 'game');

  return {
    launchMode,
    getCurrentSubsystem: () => activeSubsystem,
    destroy: () => {
      unmountCurrent();
    },
  };
}
