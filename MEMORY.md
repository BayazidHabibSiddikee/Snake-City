# MEMORY.md

Persistent project state & roadmap for **Serpent Peaks** (`Snake-City`).

## Current State (2026-11-25)
- Extracted project from `wild-jungle-snake-3d-&-xr-blocks-explorer.zip`.
- Initialized Git (`main` branch, `origin` -> `https://github.com/BayazidHabibSiddikee/Snake-City.git`).
- Verified `npm test`, `npm run lint` (`tsc --noEmit`), and `npm run build` (`vite build`) pass cleanly.
- **Completed in this session**:
  1. **Climate-Difficulty Coupling**: Coupled climate (`WeatherMode`) to difficulty presets (`SpeedPreset`: Chill->Clear, Classic->Mist, Turbo->Rain).
  2. **Climate Speed & Vitality Drain**: Climate directly modifies movement speed (`CLIMATE_EFFECTS.speedMult`) and causes climate/realm HP drain unless resting under a conquered Shrine Shelter.
  3. **Decluttered Viewport**: Removed redundant weather bar and clutter from Title Screen and Playing HUD, keeping essential controls (`Cam`, `SFX`, `Pause`) visible while routing deeper menus through Pause modal and hotkeys.
  4. **Cleaned Unused Template Dependencies**: Stripped ~12 unused heavy dependencies (`xrblocks`, `@dimforge/rapier3d-simd-compat`, `@google/genai`, `openai`, `@mediapipe/*`, `@pmndrs/uikit`, `@sparkjsdev/spark`, `lit`, etc.) from `package.json`, deleted `src/bg.svg`, and updated `metadata.json`, `index.html`, and `README.md` to proper Serpent Peaks branding.
  5. **Audio Volume Controls**: Added Master, Ambient, and SFX volume channels with dynamic scaling to `src/audio.ts` (`setMasterVolume`, `setAmbientVolume`, `setSfxVolume`).
  6. **Graphics Quality Presets**: Added Low / Medium / High graphics presets to `src/world.ts` (`setGraphicsQuality`) dynamically adjusting pixel ratio, shadow map filtering, and CSM cascade distances.
  7. **Settings Modal**: Integrated a full Settings dialog in `src/ui.ts` accessible from Title Screen and Pause Menu featuring volume sliders and graphics quality buttons.
  8. **First-Run Interactive Onboarding**: Added a responsive "How to Play" tutorial overlay on first launch explaining steering, stamina climbing, combat skills, shrine shelters, and climate hazards.
  9. **Mobile Touch Controls**: Added dedicated touch Boost / Brake action buttons for mobile & touchscreen devices.
  10. **Automated Unit Tests**: Created `tests/game-logic.test.mjs` verifying XP progression thresholds, `SP2|` formation codec serialization/deserialization, math helpers, and climate speed & drain multipliers (14 passing tests via `npm test`).

  11. **Game Logo PNG**: Generated 1024×1024 and 512×512 Serpent Peaks logo (jade serpent + mountain peak); placed at `src/assets/logo.png`, `src/assets/logo-512.png`, and `public/icons/icon-*.png`.
  12. **PWA Support**: Added `public/manifest.json`, `public/sw.js` (service worker with network-first nav + cache-first assets), registered SW in `src/index.ts`; favicon + apple-touch-icon wired in `index.html`.
  13. **Curl Install Script**: `install.sh` at repo root — one-liner `curl -sSL .../install.sh | bash` clones, builds, and serves the game via `npx serve dist`.
  14. **Capacitor App Store Wrapper**: Installed `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`; `capacitor.config.json` configured with `appId: com.serpentpeaks.game`. Run `npx cap add android` → `npx cap sync` → Android Studio to build APK/AAB.
  15. **Vite Config**: Created `vite.config.ts` with `manualChunks` splitting Three.js into its own chunk — reduced main app bundle from 984KB to 329KB.

## Remaining Backlog (To Polish for Production Release)
1. **Ghost Clan Bestiary Portraits**: Add dedicated artwork for `nether_earth_wraith` and `soul_hall_reaper` in `src/bestiary.ts` (currently reusing `guardianPlate`).
2. **Endgame & Replayability**: Add post-Lv-12 loop (New Game+, Boss Rush mode, timed Peak trial runs, or multi-run local leaderboard).
3. **Modularize Monoliths**: Incrementally decouple `src/game.ts`, `src/world.ts`, and `src/ui.ts` into smaller specialized subsystems (combat, beast AI, builder).
