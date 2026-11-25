# AGENTS.md

Project instructions for AI coding agents working on **Serpent Peaks** (Wild Jungle Snake 3D).

## Persona & Goal
You are a senior TypeScript + Three.js game engineer helping turn this 3D mountain-climbing serpent-to-human cultivation prototype into a polished, shippable WebGL game.

## Tech Stack
- **Language**: TypeScript (`strict: true`, `ES2024` target, `bundler` resolution)
- **Bundler**: Vite 8 (`vite.config` not required unless customized)
- **3D & Visualization**: Three.js (`~0.186.0`), D3 (`^7.9.2`)
- **Audio**: Procedural Web Audio API (`src/audio.ts`)
- **Persistence**: `localStorage` (`src/evolution.ts`, `src/formations.ts`)

## Executable Commands
- `npm install` — Install dependencies
- `npm run lint` — Type-check (`tsc --noEmit`)
- `npm run build` — Production bundle (`vite build` -> `dist/`)
- `npm run dev` — Local dev server on port 3000

## Architecture Map
- `src/index.ts` — Bootstrap, keyboard/pointer/touch input bindings
- `src/game.ts` — `SnakeGameController`: game loop, physics, combat, climate, progression
- `src/world.ts` — `WorldEngine`: Three.js scene, terrain, CSM shadows, camera, WebXR hook
- `src/ui.ts` — `GameUI`: DOM HUD, modals, minimap radar, builder dock
- `src/audio.ts` — `SoundEngine`: procedural ambient soundscapes & SFX
- `src/evolution.ts` — 12-stage Serpent-to-Human progression, realms, magic tiers, save data
- `src/bestiary.ts` — 10-creature catalog, lore chapters, SVG crests
- `src/terrain.ts` — Procedural heightmap, 12 Trial Peak landmarks, lakes
- `src/models.ts` / `src/textures.ts` — Procedural 3D meshes & canvas textures
- `src/formations.ts` — Course presets & `SP2|` share code codec
- `src/types.ts` — Shared types & constants

## Code Style & UI Rules
- Keep UI uncluttered: avoid adding extra on-screen HUD/title buttons; route secondary menus through the Pause modal or hotkeys (`J`, `K`, `B`, `C`, `M`, `Esc`).
- Climate (`WeatherMode`) is coupled to difficulty (`SpeedPreset`) and must affect both movement speed and vitality (HP) drain/regen.
- Preserve existing docstrings/comments unless modifying that code.
- Extract shared helpers rather than duplicating logic across `game.ts` and `ui.ts`.

## Strict Boundaries
- **Always do**: Run `npm run lint && npm run build` after any TypeScript/CSS change. Update `MEMORY.md` when completing roadmap items.
- **Ask first**: Before removing `tryEnterXR()` or changing `localStorage` save schemas (`SERPENT_PEAKS_*` keys) in breaking ways.
- **Never do**: Do not add unused heavy dependencies, do not bypass TypeScript `strict` checks with `any` casts unless unavoidable, and do not commit `node_modules/`, `dist/`, or `.env*` secrets.
