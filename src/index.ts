import { SnakeGameController } from './game';
import { GameUI } from './ui';

document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('root') || document.body;
  root.innerHTML = '';

  const canvasHost = document.createElement('div');
  canvasHost.className = 'webgl-stage';
  root.appendChild(canvasHost);

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
  game.emitHud();

  // Dual Browser + Game Release: launch straight into Standalone Portal Browser if configured or opened via /?mode=browser
  const urlMode = new URLSearchParams(window.location.search).get('mode');
  if (urlMode === 'browser' || game.portalBrowser.getSettings().startupMode === 'browser') {
    ui.launchStandaloneBrowser();
  }

  // Start procedural ambient mountain/jungle soundscape on first user gesture
  const unlockAmbientOnce = () => {
    game.sound.unlock();
    window.removeEventListener('pointerdown', unlockAmbientOnce);
    window.removeEventListener('keydown', unlockAmbientOnce);
  };
  window.addEventListener('pointerdown', unlockAmbientOnce, { passive: true });
  window.addEventListener('keydown', unlockAmbientOnce, { passive: true });

  document.addEventListener('visibilitychange', () => {
    game.sound.setTabHidden(document.hidden);
  });

  // --- Smooth Continuous Analog Steering & Hotkeys ---
  window.addEventListener('keydown', (e) => {
    const activeTag = document.activeElement?.tagName;
    if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT') {
      if (e.key === 'Escape') {
        (document.activeElement as HTMLElement).blur();
      }
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
          break;
        case 'KeyQ':
        case 'Digit2':
          e.preventDefault();
          game.castShockwave();
          break;
        case 'KeyE':
        case 'Digit3':
          e.preventDefault();
          game.castDashStrike();
          break;
        case 'KeyR':
        case 'Digit4':
          e.preventDefault();
          game.castUltimateLotus();
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
      }
    }
  });

  window.addEventListener('keyup', (e) => {
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
    }
  });

  // Always clear held inputs on window blur so controls never stick
  window.addEventListener('blur', () => {
    game.clearHeldInputs();
  });

  // --- 3D Mountain Raycasting Controls for Course Builder ---
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
      } else if (e.button === 2) {
        game.castShockwave();
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

  // --- Smooth Touch Drag Steering for Mobile Mountain Roaming ---
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
      // Left drag = positive steer (+1), right drag = negative steer (-1)
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

  // ── PWA Service Worker ──────────────────────────────────────────────────
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => console.log('[SW] registered, scope:', reg.scope))
        .catch((err) => console.warn('[SW] registration failed:', err));
    });
  }
});
