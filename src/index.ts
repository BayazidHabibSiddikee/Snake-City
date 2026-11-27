import {
  resolveInitialStartupMode,
  syncModeQueryParam,
  type AppStartupMode,
} from './app/router';

interface ActiveSubsystem {
  mode: AppStartupMode;
  destroy: () => void;
}

/**
 * Snake City modular bootstrap orchestrator (`src/index.ts`).
 * Uses strict dynamic imports (`import(...)`) for the Main Menu, Game World (Three.js),
 * and Standalone Portal Browser subsystems so each initializes independently based on
 * the user's selected mode with zero unnecessary bundle evaluation.
 */
document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('root') || document.body;
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
      const { MainMenuShell } = await import('./app/MainMenuShell');
      if (seq !== transitionSeq) return;
      const shell = new MainMenuShell(root, {
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
      // Independent Portal Browser subsystem: zero Three.js / WebGL loaded!
      const { StandaloneBrowserShell } = await import('./browser/StandaloneBrowserShell');
      if (seq !== transitionSeq) return;
      const shell = new StandaloneBrowserShell(
        root,
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

    // 3D Game World subsystem: dynamically loads Three.js, WorldEngine, Foundry, and Portal Memory
    const { mountGameRuntime } = await import('./game/GameRuntime');
    if (seq !== transitionSeq) return;
    const handle = mountGameRuntime(root, {
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
});
