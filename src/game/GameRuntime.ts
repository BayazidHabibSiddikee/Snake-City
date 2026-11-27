import { SnakeGameController } from '../game';
import { GameUI } from '../ui';
import { extractBookmarkCacheableUrls } from '../offlineCache';

export interface GameRuntimeHandle {
  destroy: () => void;
  captureViewportSnapshot: () => HTMLCanvasElement | null;
}

export interface GameRuntimeOptions {
  autoStartInSanctuary?: boolean;
  onSwitchToMainMenu?: () => void;
  onSwitchToStandaloneBrowser?: () => void;
}

/**
 * Dynamically imported 3D Game World runtime (`src/game/GameRuntime.ts`).
 * Keeps Three.js, WorldEngine, and GameUI strictly isolated from `?mode=browser`
 * and Main Menu startup, and cleanly disposes all event listeners on subsystem switch.
 */
export function mountGameRuntime(
  root: HTMLElement,
  options: GameRuntimeOptions = {},
): GameRuntimeHandle {
  root.innerHTML = '';
  const canvasHost = document.createElement('div');
  canvasHost.className = 'webgl-stage';
  root.appendChild(canvasHost);

  let disposed = false;
  let ui: GameUI | null = null;

  const game = new SnakeGameController(
    canvasHost,
    (snapshot) => {
      ui?.renderHud(snapshot);
    },
    (minimapSnap) => {
      ui?.renderMinimap(minimapSnap);
    },
    (toastMsg) => {
      ui?.showToast(toastMsg);
    },
    (summary) => {
      ui?.showEvolutionSummaryModal(summary, summary.isHuman ? 'ascended' : 'unlock');
    },
    (climateNotice) => {
      ui?.pushClimateNotice(climateNotice);
    },
    (compliment) => {
      ui?.showCompliment(compliment);
    },
    (combatTaunt) => {
      ui?.showCombatTaunt(combatTaunt);
    },
    (anchorPos) => {
      ui?.updateTauntBubblePosition(anchorPos);
    },
    (portalVariant, _hasTwinWarp, portalKey) => {
      ui?.openPortalBrowserModal(portalVariant, portalKey);
    },
    (ctx) => {
      ui?.openGlobalRankingModal(ctx.enteredViaPortal);
    },
    (notice) => {
      ui?.showLoreUnlockedToast(notice);
    },
  );

  ui = new GameUI(root, game);

  const webglCanvas = game.world.renderer.domElement;
  const onWebglContextLost = (ev: Event) => {
    ev.preventDefault();
    ui?.showToast('3D graphics context paused — restoring viewport…');
  };
  const onWebglContextRestored = () => {
    ui?.showToast('3D graphics context restored.');
    game.emitHud();
  };
  webglCanvas.addEventListener('webglcontextlost', onWebglContextLost);
  webglCanvas.addEventListener('webglcontextrestored', onWebglContextRestored);

  // Hook game main menu & standalone browser triggers to orchestrator callbacks
  const origReturnToTitle = game.returnToTitle.bind(game);
  game.returnToTitle = () => {
    origReturnToTitle();
    if (options.onSwitchToMainMenu) {
      options.onSwitchToMainMenu();
    }
  };

  if (options.autoStartInSanctuary) {
    game.startGame();
  } else {
    game.emitHud();
  }

  // Unlock procedural Web Audio soundscape on first user gesture
  const unlockAmbientOnce = () => {
    game.sound.unlock();
    window.removeEventListener('pointerdown', unlockAmbientOnce);
    window.removeEventListener('keydown', unlockAmbientOnce);
  };
  window.addEventListener('pointerdown', unlockAmbientOnce, { passive: true });
  window.addEventListener('keydown', unlockAmbientOnce, { passive: true });

  const onVisibilityChange = () => {
    game.sound.setTabHidden(document.hidden);
  };
  document.addEventListener('visibilitychange', onVisibilityChange);

  const onKeyDown = (e: KeyboardEvent) => {
    if (disposed) return;
    const activeTag = document.activeElement?.tagName;
    if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT') {
      if (e.key === 'Escape') {
        (document.activeElement as HTMLElement).blur();
      }
      return;
    }

    if (e.key === 'F3') {
      e.preventDefault();
      ui?.toggleFoundryDebugOverlay();
      return;
    }

    if (e.key === 'F4' || e.code === 'Backquote') {
      e.preventDefault();
      ui?.togglePortalAtlasModal();
      return;
    }

    if (ui && ui.isEvolutionSummaryOpen()) {
      if (e.key === 'Escape' || e.key === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        ui.closeOpenInfoModals();
      }
      return;
    }

    if (e.code === 'KeyG' && !e.repeat) {
      e.preventDefault();
      ui?.togglePortalBrowserModal();
      return;
    }

    if (e.code === 'KeyJ') {
      ui?.toggleJourneyModal();
      return;
    }

    if (e.code === 'KeyK') {
      ui?.toggleBestiaryModal();
      return;
    }

    if (e.code === 'KeyL' && !e.repeat) {
      e.preventDefault();
      ui?.toggleGlobalRankingModal();
      return;
    }

    if (e.code === 'KeyN' && !e.repeat) {
      e.preventDefault();
      ui?.toggleSoulArchivesModal();
      return;
    }

    if (e.code === 'KeyI' && !e.repeat) {
      e.preventDefault();
      ui?.toggleLootReliquaryModal();
      return;
    }

    if (e.code === 'KeyP' && !e.repeat) {
      e.preventDefault();
      ui?.togglePortalAtlasModal();
      return;
    }

    if (e.code === 'KeyO' && !e.repeat) {
      e.preventDefault();
      ui?.toggleFoundryConsoleModal();
      return;
    }

    if (ui && ui.isModalOpen()) {
      if (e.key === 'Escape') {
        ui.closeOpenInfoModals();
      }
      return;
    }

    const mode = game.getMode();

    if (e.key === 'Escape') {
      if (mode === 'playing' || mode === 'paused') {
        e.preventDefault();
        game.togglePause();
      } else if (mode === 'builder') {
        e.preventDefault();
        game.returnToTitle();
      }
      return;
    }

    if ((mode === 'title' || mode === 'gameover') && (e.key === 'Enter' || e.code === 'Space')) {
      e.preventDefault();
      game.startGame();
      return;
    }

    if (mode === 'evolving' && (e.key === 'Enter' || e.code === 'Space')) {
      e.preventDefault();
      game.dismissEvolutionSummary();
      return;
    }

    if (mode === 'ascended' && (e.key === 'Enter' || e.code === 'Space')) {
      e.preventDefault();
      game.continueAsHuman();
      return;
    }

    if (e.code === 'KeyM') {
      game.sound.toggleMute();
      game.emitHud();
      return;
    }

    if (e.code === 'KeyC' && (mode === 'playing' || mode === 'paused')) {
      game.cycleCameraMode();
      return;
    }

    if (e.code === 'KeyV' && (mode === 'playing' || mode === 'paused')) {
      game.toggleFpvCameraMode();
      return;
    }

    if (e.code === 'KeyB') {
      if (mode === 'builder') {
        game.startGame();
      } else {
        game.enterBuilder();
      }
      return;
    }

    if (e.code === 'KeyH' && mode === 'builder') {
      ui?.toggleDockCollapse();
      return;
    }

    if (mode === 'playing') {
      switch (e.code) {
        case 'ArrowLeft':
        case 'KeyA':
          e.preventDefault();
          game.setSteerLeft(true);
          break;
        case 'ArrowRight':
        case 'KeyD':
          e.preventDefault();
          game.setSteerRight(true);
          break;
        case 'ArrowUp':
        case 'KeyW':
        case 'Space':
          e.preventDefault();
          game.setBoostHeld(true);
          break;
        case 'ArrowDown':
        case 'KeyS':
          e.preventDefault();
          game.setBrakeHeld(true);
          break;
        case 'KeyF':
        case 'Digit1':
          e.preventDefault();
          game.castPrimaryMagic();
          game.foundry.performAttack('light');
          break;
        case 'KeyQ':
        case 'Digit2':
          e.preventDefault();
          game.castShockwave();
          game.foundry.performAttack('heavy');
          break;
        case 'KeyE':
        case 'Digit3':
          e.preventDefault();
          game.castDashStrike();
          game.foundry.performAttack('dash_strike');
          break;
        case 'KeyR':
        case 'Digit4':
          e.preventDefault();
          game.castUltimateLotus();
          game.foundry.performAttack('finisher');
          break;
        case 'KeyZ':
          if (!e.repeat) {
            e.preventDefault();
            if (game.foundry.performDodge()) {
              ui?.showToast('Dodge Roll — i-frames active!');
            }
          }
          break;
        case 'KeyT':
          if (!e.repeat) {
            e.preventDefault();
            if (game.foundry.performParry()) {
              ui?.showToast('Parry stance raised!');
            }
          }
          break;
        case 'KeyY':
          if (!e.repeat) {
            e.preventDefault();
            const res = game.foundry.castDiscipline();
            ui?.showToast(res.message);
          }
          break;
        case 'KeyH':
          if (!e.repeat) {
            e.preventDefault();
            game.foundry.setBlocking(true);
          }
          break;
        case 'Digit5':
        case 'Enter':
          if (!e.repeat) {
            e.preventDefault();
            if (game.foundry.performJump()) {
              ui?.showToast('Foundry Leap — Jump / Wall-Run active!');
            }
          }
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          game.setStealthHeld(true);
          break;
        case 'KeyX':
          if (!e.repeat) {
            e.preventDefault();
            game.toggleStealthVeil();
          }
          break;
        case 'KeyU':
          if (!e.repeat) {
            const activated = game.portalWorld.activateNearestPortal();
            if (activated) {
              e.preventDefault();
            }
          }
          break;
      }
    }
  };

  const onKeyUp = (e: KeyboardEvent) => {
    if (disposed) return;
    switch (e.code) {
      case 'ArrowLeft':
      case 'KeyA':
        game.setSteerLeft(false);
        break;
      case 'ArrowRight':
      case 'KeyD':
        game.setSteerRight(false);
        break;
      case 'ArrowUp':
      case 'KeyW':
      case 'Space':
        game.setBoostHeld(false);
        break;
      case 'ArrowDown':
      case 'KeyS':
        game.setBrakeHeld(false);
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        game.setStealthHeld(false);
        break;
      case 'KeyH':
        game.foundry.setBlocking(false);
        break;
    }
  };

  const onBlur = () => {
    game.clearHeldInputs();
  };

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);

  // 3D Mountain Raycasting Controls for Course Builder & Playing Attacks
  const canvas = game.world.renderer.domElement;
  let isOrbiting = false;
  let lastPtrX = 0;
  let lastPtrY = 0;
  let lastHoverTs = 0;

  canvas.addEventListener('contextmenu', (e) => {
    const mode = game.getMode();
    if (mode === 'builder' || mode === 'playing') {
      e.preventDefault();
    }
  });

  canvas.addEventListener('pointerdown', (e) => {
    const mode = game.getMode();
    if (mode === 'playing') {
      if (e.button === 0) {
        game.castPrimaryMagic();
        game.foundry.performAttack('light');
      } else if (e.button === 2) {
        game.castShockwave();
        game.foundry.performAttack('heavy');
      }
      return;
    }

    if (mode !== 'builder') return;
    canvas.setPointerCapture(e.pointerId);
    lastPtrX = e.clientX;
    lastPtrY = e.clientY;

    if (e.shiftKey || e.button === 1) {
      isOrbiting = true;
      return;
    }

    const isErasing = e.button === 2;
    const pt = game.world.pickMountainPoint(e.clientX, e.clientY);
    if (pt) {
      game.applyBuilderAt(pt.x, pt.z, isErasing);
    }
  });

  canvas.addEventListener('pointermove', (e) => {
    if (game.getMode() !== 'builder') return;

    if (isOrbiting) {
      const dx = e.clientX - lastPtrX;
      const dy = e.clientY - lastPtrY;
      lastPtrX = e.clientX;
      lastPtrY = e.clientY;
      game.world.adjustBuilderOrbit(dx, dy);
      return;
    }

    const now = performance.now();
    if (now - lastHoverTs < 32) return;
    lastHoverTs = now;
    game.world.pickMountainPoint(e.clientX, e.clientY);
  });

  const endPointer = () => {
    isOrbiting = false;
  };
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);
  canvas.addEventListener('pointerleave', () => {
    if (game.getMode() === 'builder') {
      game.world.hideHoverGhost();
    }
  });

  canvas.addEventListener(
    'wheel',
    (e) => {
      if (game.getMode() !== 'builder') return;
      e.preventDefault();
      game.world.adjustBuilderZoom(e.deltaY);
    },
    { passive: false },
  );

  // Touch drag steering
  let touchAnchorX = 0;
  canvas.addEventListener(
    'touchstart',
    (e) => {
      if (game.getMode() !== 'playing' || e.touches.length !== 1) return;
      touchAnchorX = e.touches[0].clientX;
    },
    { passive: true },
  );

  canvas.addEventListener(
    'touchmove',
    (e) => {
      if (game.getMode() !== 'playing' || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - touchAnchorX;
      game.setTouchSteerAxis(-dx / 64);
    },
    { passive: true },
  );

  canvas.addEventListener(
    'touchend',
    () => {
      game.setTouchSteerAxis(0);
    },
    { passive: true },
  );

  // PWA Service Worker & Offline Portal Cache warmup
  const initOfflineCache = async () => {
    try {
      const cachedState = await game.offlineCache.readCachedPortalState();
      if (cachedState) {
        game.portalBrowser.hydrateFromOfflineStateSnapshot(cachedState);
      }
      await game.offlineCache.registerAndWarm(game.portalBrowser.exportOfflineStateSnapshot());
      if (game.offlineCache.isOnline()) {
        const bookmarkUrls = extractBookmarkCacheableUrls(
          game.portalBrowser.getCustomBookmarks(),
          game.portalBrowser.getHistory().slice(0, 6),
          12,
        );
        if (bookmarkUrls.length > 0) {
          void game.offlineCache.precachePortalUrls(bookmarkUrls, game.portalBrowser.getSettings());
        }
      }
    } catch {
      // keep running cleanly if SW is blocked
    }
  };

  if (document.readyState === 'complete') {
    void initOfflineCache();
  } else {
    window.addEventListener('load', () => {
      if (!disposed) void initOfflineCache();
    });
  }

  return {
    captureViewportSnapshot: () => {
      if (disposed) return null;
      try {
        game.world.renderer.render(game.world.scene, game.world.camera);
        const srcCanvas = game.world.renderer.domElement;
        if (!srcCanvas || srcCanvas.width === 0 || srcCanvas.height === 0) return null;
        const maxW = 1280;
        const scale = srcCanvas.width > maxW ? maxW / srcCanvas.width : 1;
        const snap = document.createElement('canvas');
        snap.width = Math.max(320, Math.round(srcCanvas.width * scale));
        snap.height = Math.max(240, Math.round(srcCanvas.height * scale));
        const ctx = snap.getContext('2d');
        if (!ctx) return null;
        ctx.drawImage(srcCanvas, 0, 0, snap.width, snap.height);
        return snap;
      } catch {
        return null;
      }
    },
    destroy: () => {
      if (disposed) return;
      disposed = true;
      window.removeEventListener('pointerdown', unlockAmbientOnce);
      window.removeEventListener('keydown', unlockAmbientOnce);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      webglCanvas.removeEventListener('webglcontextlost', onWebglContextLost);
      webglCanvas.removeEventListener('webglcontextrestored', onWebglContextRestored);
      game.world.dispose();
      root.innerHTML = '';
    },
  };
}
