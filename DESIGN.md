# DESIGN.md

Visual & UX guidelines for **Serpent Peaks**.

## Core Principles
1. **Uncluttered Viewport**: The 3D mountain continent is the centerpiece. Keep the Title Screen and In-Game HUD minimal—only essential controls stay on screen (`Cam`, `SFX`, `Pause` in top-right HUD; 4-skill bar + radar at bottom). Secondary screens (`Journey`, `Bestiary`, `Humanity Path`, `Build Course`, `Weather`) live in the Pause modal or keyboard shortcuts.
2. **Climate-Driven Difficulty**:
   - `Chill` -> `Clear` (`+4%` speed, `0` base climate drain, `0.85x` realm drain)
   - `Classic` -> `Light Mist` (`-3%` speed, `0` base climate drain, `1.0x` realm drain)
   - `Turbo` -> `Light Rain` (`-7%` speed, `-0.85 HP/s` storm chill unless sheltered, `1.25x` realm drain)
   - `Dense Fog` -> `-10%` speed, `-0.45 HP/s` chill unless sheltered, `1.15x` realm drain
   - Conquered Trial Peak Shrines act as **Shelters** (`SHELTER` tag), negating climate/realm drain and restoring HP & Qi.

## Typography & Palette
- **Display**: `'Cinzel', Georgia, serif`
- **Body / HUD**: `'Plus Jakarta Sans', sans-serif`
- **Primary Accents**: Gold (`#f2c14e`), Jade (`#3de095`), Sky Cyan (`#58e1ff`), Soul Clan Violet/Magenta (`#c084fc` / `#f43f5e`).
- **Surfaces**: Dark translucent glass (`rgba(10, 20, 20, 0.78)` with subtle `1px` borders).
