import {
  BestiaryEntrySnapshot,
  BestiaryFilter,
  BestiarySnapshot,
  matchesBestiaryQuery,
  renderBestiaryCrestSvg,
  renderThreatBadgeHtml,
} from './bestiary';
import {
  EVOLUTION_STAGES,
  EvolutionUnlockSummary,
  MAX_EVOLUTION_LEVEL,
  getMagicTierForLevel,
} from './evolution';
import { PRESET_FORMATIONS } from './formations';
import { SnakeGameController } from './game';
import { renderHumanityGrowthChart } from './humanityChart';
import { WORLD_LANDMARKS, terrainHeightAt } from './terrain';
import {
  BestiaryEntryId,
  BiomeId,
  BuilderTool,
  CameraMode,
  HudSnapshot,
  MinimapSnapshot,
  SpeedPreset,
  WATER_LEVEL,
  WORLD_PLAY_RADIUS,
  WeatherMode,
} from './types';

function formatElapsedTime(totalSeconds: number): string {
  const secs = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(secs / 3600);
  const mins = Math.floor((secs % 3600) / 60);
  const rem = secs % 60;
  if (hrs > 0) {
    return `${hrs}h ${String(mins).padStart(2, '0')}m`;
  }
  return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

function formatDistanceMeters(meters: number): string {
  const rounded = Math.max(0, Math.round(meters));
  if (rounded >= 1000) {
    return `${(rounded / 1000).toFixed(2)} km`;
  }
  return `${rounded} m`;
}

function renderPhaseGlyphSvg(level: number): string {
  if (level >= 12) {
    // Ascended Human solar figure crest
    return `
      <svg viewBox="0 0 64 64" width="44" height="44" aria-hidden="true">
        <circle cx="32" cy="17" r="6" fill="none" stroke="#ffe48f" stroke-width="2.2" />
        <path d="M22 30 Q32 25 42 30 M32 24 L32 43 M32 43 L24 56 M32 43 L40 56 M23 31 L18 41 M41 31 L46 41" fill="none" stroke="#f2c14e" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M16 14 L21 17 M48 14 L43 17 M32 6 L32 9" stroke="#ffe9a8" stroke-width="1.6" stroke-linecap="round" />
      </svg>
    `;
  }
  if (level >= 8) {
    // Upright Naga sage silhouette
    return `
      <svg viewBox="0 0 64 64" width="44" height="44" aria-hidden="true">
        <circle cx="32" cy="15" r="5" fill="none" stroke="#ffe48f" stroke-width="2.2" />
        <path d="M23 26 Q32 22 41 26 M32 21 L32 37 M23 27 L18 35 M41 27 L46 35" fill="none" stroke="#f2c14e" stroke-width="2.1" stroke-linecap="round" />
        <path d="M32 37 C32 45 20 44 20 51 C20 56 32 57 44 54" fill="none" stroke="#5ef2a8" stroke-width="2.4" stroke-linecap="round" />
      </svg>
    `;
  }
  if (level >= 5) {
    // Winged Drake / Wyrm crest
    return `
      <svg viewBox="0 0 64 64" width="44" height="44" aria-hidden="true">
        <path d="M32 32 C22 20 12 18 8 27 C15 29 21 32 27 36" fill="none" stroke="#f2c14e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M32 32 C42 20 52 18 56 27 C49 29 43 32 37 36" fill="none" stroke="#f2c14e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M32 16 C37 22 36 33 28 40 C21 46 25 54 38 54" fill="none" stroke="#5ef2a8" stroke-width="2.4" stroke-linecap="round" />
        <circle cx="32" cy="15" r="3" fill="#ffe48f" />
      </svg>
    `;
  }
  // Primal Serpent coil crest
  return `
    <svg viewBox="0 0 64 64" width="44" height="44" aria-hidden="true">
      <path d="M22 18 C34 12 45 20 38 30 C32 38 18 36 22 47 C25 54 38 55 46 49" fill="none" stroke="#5ef2a8" stroke-width="2.5" stroke-linecap="round" />
      <circle cx="21" cy="18" r="3.2" fill="#f2c14e" />
      <path d="M16 14 L20 16 M18 11 L22 15" stroke="#ffe48f" stroke-width="1.6" stroke-linecap="round" />
    </svg>
  `;
}

export class GameUI {
  private root: HTMLElement;
  private game: SnakeGameController;

  // Screen overlays
  private titleOverlay!: HTMLElement;
  private playingHud!: HTMLElement;
  private playBottomHud!: HTMLElement;
  private builderDockWrap!: HTMLElement;
  private pauseModal!: HTMLElement;
  private gameOverModal!: HTMLElement;
  private shareModal!: HTMLElement;
  private journeyModal!: HTMLElement;
  private evolutionSummaryModal!: HTMLElement;
  private bestiaryModal!: HTMLElement;
  private toastEl!: HTMLElement;

  // Title progress nodes
  private startPlayBtn!: HTMLButtonElement;
  private titleProgressLine!: HTMLElement;

  // Dynamic HUD nodes
  private combatVignetteEl!: HTMLElement;
  private evoLevelEl!: HTMLElement;
  private evoTitleEl!: HTMLElement;
  private evoRealmEl!: HTMLElement;
  private xpFillEl!: HTMLElement;
  private xpMetaEl!: HTMLElement;
  private scoreValEl!: HTMLElement;
  private peaksValEl!: HTMLElement;
  private altValEl!: HTMLElement;
  private comboBadgeEl!: HTMLElement;
  private comboFillEl!: HTMLElement;
  private zoneBadgeEl!: HTMLElement;
  private envHazardEl!: HTMLElement;
  private clanHeatSkulls!: HTMLElement[];
  private soulInfluenceFloatEl!: HTMLElement;
  private soulInfluenceArcEl!: SVGCircleElement;
  private soulInfluenceValEl!: HTMLElement;
  private soulInfluenceStatusEl!: HTMLElement;
  private soulInfluenceSegs!: HTMLElement[];
  private ambushAlertEl!: HTMLElement;
  private ambushAlertTextEl!: HTMLElement;
  private speedValEl!: HTMLElement;
  private staminaFillEl!: HTMLElement;
  private compassArrowEl!: HTMLElement;
  private compassNameEl!: HTMLElement;
  private compassDistEl!: HTMLElement;
  private camBtnEl!: HTMLButtonElement;
  private muteBtnEl!: HTMLButtonElement;
  private dockBodyEl!: HTMLElement;
  private dockToggleBtn!: HTMLButtonElement;
  private dockCollapsed = false;

  // Combat, Vitality, Dou Qi & 4-Skill Action Bar nodes
  private hostileBarWrap!: HTMLElement;
  private hostileNameEl!: HTMLElement;
  private hostileHpTextEl!: HTMLElement;
  private hostileHpFillEl!: HTMLElement;
  private hpFillEl!: HTMLElement;
  private hpTextEl!: HTMLElement;
  private hpStatusTagEl!: HTMLElement;
  private qiFillEl!: HTMLElement;
  private qiTextEl!: HTMLElement;
  private primarySpellBtn!: HTMLButtonElement;
  private primarySpellNameEl!: HTMLElement;
  private primaryCdFillEl!: HTMLElement;
  private shockwaveBtn!: HTMLButtonElement;
  private shockwaveNameEl!: HTMLElement;
  private shockwaveCdFillEl!: HTMLElement;
  private dashSkillBtn!: HTMLButtonElement;
  private dashSkillNameEl!: HTMLElement;
  private dashQiCostEl!: HTMLElement;
  private dashCdFillEl!: HTMLElement;
  private ultimateSkillBtn!: HTMLButtonElement;
  private ultimateSkillNameEl!: HTMLElement;
  private ultimateQiCostEl!: HTMLElement;
  private ultimateCdFillEl!: HTMLElement;

  // GTA Circular Minimap
  private minimapCanvas!: HTMLCanvasElement;
  private minimapCtx!: CanvasRenderingContext2D;
  private terrainMapCache: HTMLCanvasElement | null = null;
  private cachedMapBiome: BiomeId | null = null;

  // Game Over stats
  private goScoreEl!: HTMLElement;
  private goLevelEl!: HTMLElement;
  private goXpLossEl!: HTMLElement;
  private goPeaksEl!: HTMLElement;
  private goReasonEl!: HTMLElement;
  private goCheckpointEl!: HTMLElement;
  private goNewBestEl!: HTMLElement;

  // Journey modal nodes
  private journeySummaryEl!: HTMLElement;
  private journeyListEl!: HTMLElement;

  // Evolution Tier Visual Summary Modal nodes
  private evoSumCardEl!: HTMLElement;
  private evoSumMetaEl!: HTMLElement;
  private evoSumTitleEl!: HTMLElement;
  private evoSumSubtitleEl!: HTMLElement;
  private evoSumPerkLineEl!: HTMLElement;
  private evoSumTrackEl!: HTMLElement;
  private evoSumChartEl!: HTMLElement;
  private evoSumChartReadoutEl!: HTMLElement;
  private evoSumRingArcEl!: SVGCircleElement;
  private evoSumRingPctEl!: HTMLElement;
  private evoSumPhaseGlyphEl!: HTMLElement;
  private evoSumPhaseNameEl!: HTMLElement;
  private evoSumBarsEl!: HTMLElement;
  private evoSumTelemetryEl!: HTMLElement;
  private evoSumNextGateEl!: HTMLElement;
  private evoSumMilestonesCountEl!: HTMLElement;
  private evoSumMilestonesListEl!: HTMLElement;
  private evoSumPrimaryBtn!: HTMLButtonElement;
  private evoSumSecondaryBtn!: HTMLButtonElement;
  private evoSummaryContext: 'unlock' | 'ascended' | 'review' = 'review';

  // Bestiary Catalog Modal nodes & state
  private bestiarySummaryMetaEl!: HTMLElement;
  private bestiarySearchInput!: HTMLInputElement;
  private bestiarySearchClearBtn!: HTMLButtonElement;
  private bestiaryIndexEl!: HTMLElement;
  private bestiaryDossierEl!: HTMLElement;
  private bestiaryFilter: BestiaryFilter = 'all';
  private bestiaryQuery = '';
  private selectedBestiaryId: BestiaryEntryId = 'dire_ridge_wolf';

  // Builder controls
  private presetSelectEl!: HTMLSelectElement;
  private mirrorBtnEl!: HTMLButtonElement;
  private arenaNameInput!: HTMLInputElement;
  private shareCodeInput!: HTMLTextAreaElement;

  private toastTimer = 0;
  private lastHudSnap: HudSnapshot | null = null;
  private settingsModal!: HTMLElement;
  private tutorialOverlay!: HTMLElement;
  private tutorialShown = false;
  private graphicsQuality: 'low' | 'medium' | 'high' = 'high';

  constructor(root: HTMLElement, game: SnakeGameController) {
    this.root = root;
    this.game = game;
    this.buildDOM();
    this.bindEvents();
    // First-run tutorial
    if (!localStorage.getItem('SERPENT_PEAKS_TUTORIAL_SEEN')) {
      this.tutorialOverlay.classList.remove('hidden');
      this.game.setModalFreeze(true);
    }
  }

  private buildDOM(): void {
    const uiLayer = document.createElement('div');
    uiLayer.className = 'ui-layer';

    uiLayer.innerHTML = `
      <!-- SCREEN-EDGE COMBAT & ENVIRONMENT VIGNETTE (NON-BLOCKING) -->
      <div class="combat-vignette" id="combatVignette" aria-hidden="true"></div>

      <!-- TITLE SCREEN -->
      <section class="title-screen" id="titleScreen">
        <div class="title-top-bar">
          <div class="biome-switch" role="group" aria-label="Choose mountain biome">
            <button type="button" class="biome-btn active" data-biome="mountain">Alpine Continent</button>
            <button type="button" class="biome-btn" data-biome="jungle">Jungle Highlands</button>
          </div>
        </div>

        <div class="title-hero">
          <div class="title-lockup">
            <svg class="title-emblem" viewBox="0 0 420 124" width="420" height="124" aria-label="Serpent Peaks">
              <defs>
                <linearGradient id="goldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stop-color="#fff4c2" />
                  <stop offset="52%" stop-color="#f2c14e" />
                  <stop offset="100%" stop-color="#b87d1e" />
                </linearGradient>
                <linearGradient id="jadeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stop-color="#3de095" />
                  <stop offset="100%" stop-color="#58e1ff" />
                </linearGradient>
              </defs>
              <path d="M158 38 L188 10 L208 26 L228 6 L262 38 Z" fill="none" stroke="url(#goldGrad)" stroke-width="2.4" stroke-linejoin="round"/>
              <path d="M144 40 Q178 24 210 36 T276 32" fill="none" stroke="url(#jadeGrad)" stroke-width="3.2" stroke-linecap="round"/>
              <circle cx="278" cy="31" r="3.4" fill="#ffe066"/>
              <text x="210" y="84" text-anchor="middle" fill="url(#goldGrad)" font-family="Cinzel, Georgia, serif" font-size="42" font-weight="800" letter-spacing="5">SERPENT PEAKS</text>
              <text x="210" y="108" text-anchor="middle" fill="#c7e8da" font-family="Plus Jakarta Sans, sans-serif" font-size="11.2" font-weight="600" letter-spacing="3.2">12-LEVEL MOUNTAIN ASCENSION ODYSSEY</text>
            </svg>
          </div>

          <p class="title-progress-line" id="titleProgressLine">
            Begin as a tiny Valley Hatchling · Conquer 12 Trial Peaks across the continent to ascend into a Human
          </p>

          <div class="title-actions">
            <button type="button" class="primary-cta" id="startPlayBtn">
              Begin Odyssey
            </button>
            <button type="button" class="secondary-cta" id="openBestiaryTitleBtn">
              Bestiary
            </button>
            <button type="button" class="secondary-cta" id="openBuilderBtn">
              Build Course
            </button>
            <button type="button" class="ghost-btn" id="openSettingsTitleBtn">
              Settings
            </button>
          </div>

          <div class="title-quick-row">
            <label class="inline-select-label">
              <span>Continent</span>
              <select id="titlePresetSelect" class="dark-select"></select>
            </label>
            <div class="speed-group" role="group" aria-label="Difficulty and climate">
              <button type="button" class="speed-btn" data-speed="chill">Chill · Clear</button>
              <button type="button" class="speed-btn active" data-speed="classic">Classic · Mist</button>
              <button type="button" class="speed-btn" data-speed="turbo">Turbo · Rain</button>
            </div>
          </div>

          <p class="control-hint">A / D Steer · W / Space Boost · F/1 Bolt · Q/2 Wave · E/3 Dash Strike · R/4 Flame Lotus · C Camera · K Bestiary · Esc Pause</p>
        </div>
      </section>

      <!-- PLAYING & BUILDER TOP HUD -->
      <header class="hud-top hidden" id="playingHud">
        <div class="hud-stats-cluster">
          <div class="hud-evo-box" id="hudEvoTrigger" title="Inspect Humanity Path & Cultivation Realm">
            <div class="evo-head-row">
              <span class="evo-lvl-badge" id="hudEvoLevel">LV 1/12</span>
              <span class="evo-stage-name" id="hudEvoTitle">Valley Hatchling</span>
              <span class="evo-realm-tag" id="hudEvoRealm">Dou Zhi Qi</span>
            </div>
            <div class="xp-bar-track">
              <div class="xp-bar-fill" id="hudXpFill"></div>
            </div>
            <span class="xp-meta-text" id="hudXpMeta">0 / 400 XP</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-box">
            <span class="stat-label">PEAKS</span>
            <span class="stat-value accent" id="hudPeaks">0/12</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-box">
            <span class="stat-label">SCORE</span>
            <span class="stat-value" id="hudScore">0</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-box">
            <span class="stat-label">ALT</span>
            <span class="stat-value muted" id="hudAlt">45m</span>
          </div>
          <div class="combo-wrap hidden" id="hudComboWrap">
            <span class="combo-text" id="hudComboText">x2</span>
            <div class="combo-bar"><div class="combo-fill" id="hudComboFill"></div></div>
          </div>
        </div>

        <div class="hud-center-cluster">
          <div class="hud-arena-tag" id="hudZoneName">Valley Start</div>
          <div class="env-hazard-line severity-safe" id="hudEnvHazard">Jade Mist Valley · Safe Climate</div>
          <div class="clan-heat-bar" title="Soul Clan Heat — Higher wanted level draws Soul Hall ambushes from the earth">
            <span class="clan-heat-label">SOUL CLAN</span>
            <div class="clan-heat-skulls" id="hudClanHeatSkulls" aria-label="Soul Clan heat level">
              ${Array.from({ length: 5 }, (_, i) => `
                <span class="heat-skull" data-heat-idx="${i}" aria-hidden="true">
                  <svg viewBox="0 0 20 20" width="13" height="13">
                    <path d="M10 2.2C6 2.2 3.2 5 3.2 8.7c0 2.3 1.1 4.1 2.5 5.1v2.6c0 .7.5 1.2 1.2 1.2h6.2c.7 0 1.2-.5 1.2-1.2v-2.6c1.4-1 2.5-2.8 2.5-5.1C16.8 5 14 2.2 10 2.2z" fill="currentColor"/>
                    <circle cx="7.4" cy="9.2" r="1.4" fill="#0b1414"/>
                    <circle cx="12.6" cy="9.2" r="1.4" fill="#0b1414"/>
                  </svg>
                </span>
              `).join('')}
            </div>
          </div>
        </div>

        <div class="hud-controls-cluster">
          <button type="button" class="hud-icon-btn" id="hudCamBtn" title="Switch Camera View (C)">
            <span id="hudCamLabel">Ant View</span>
          </button>
          <button type="button" class="hud-icon-btn" id="hudMuteBtn" title="Toggle Sound (M)">
            SFX On
          </button>
          <button type="button" class="hud-icon-btn" id="hudPauseBtn" title="Pause / Menu (Esc)">
            Pause
          </button>
        </div>
      </header>

      <!-- NON-BLOCKING SOUL CLAN AMBUSH ALERT STRIP -->
      <div class="ambush-alert-banner hidden" id="ambushAlertBanner" role="status" aria-live="polite">
        <span class="ambush-alert-text" id="ambushAlertText">SOUL CLAN AMBUSH · SPIRITS RISING FROM THE EARTH</span>
      </div>

      <!-- FLOATING SOUL CLAN INFLUENCE COUNTER -->
      <button
        type="button"
        class="soul-influence-float state-dormant hidden"
        id="soulInfluenceFloat"
        aria-live="polite"
        title="Soul Clan Influence — Visualizes Nether ghost activity intensity. Click to inspect Soul Clan spirits in the Bestiary."
      >
        <span class="soul-pulse-ring" aria-hidden="true"></span>
        <div class="soul-gauge-wrap" aria-hidden="true">
          <svg class="soul-gauge-svg" viewBox="0 0 46 46" width="44" height="44">
            <circle class="soul-gauge-track" cx="23" cy="23" r="19" />
            <circle class="soul-gauge-arc" id="soulInfluenceArc" cx="23" cy="23" r="19" />
          </svg>
          <svg class="soul-sigil-svg" viewBox="0 0 24 24" width="18" height="18">
            <path
              d="M12 3C7.6 3 4.5 6.1 4.5 10.4c0 2.7 1.1 5.1 1.6 7.9.1.7.9 1 1.4.5l1.9-1.8 1.9 1.9c.4.4 1 .4 1.4 0l1.9-1.9 1.9 1.8c.5.5 1.3.2 1.4-.5.5-2.8 1.6-5.2 1.6-7.9C19.5 6.1 16.4 3 12 3z"
              fill="currentColor"
            />
            <circle cx="9.3" cy="10.4" r="1.5" fill="#0d0a16" />
            <circle cx="14.7" cy="10.4" r="1.5" fill="#0d0a16" />
          </svg>
        </div>
        <div class="soul-influence-body">
          <div class="soul-influence-top">
            <span class="soul-influence-title">SOUL CLAN</span>
            <span class="soul-beacon" aria-hidden="true"></span>
            <span class="soul-influence-val" id="soulInfluenceVal">0%</span>
          </div>
          <div class="soul-intensity-bars" id="soulInfluenceSegs" aria-hidden="true">
            <span class="soul-seg"></span>
            <span class="soul-seg"></span>
            <span class="soul-seg"></span>
            <span class="soul-seg"></span>
            <span class="soul-seg"></span>
          </div>
          <span class="soul-influence-status" id="soulInfluenceStatus">Earth Calm</span>
        </div>
      </button>

      <!-- ENGAGED HOSTILE BEAST / GHOST BAR -->
      <div class="hostile-target-bar hidden" id="hostileBarWrap" aria-live="polite">
        <div class="hostile-target-top">
          <span class="hostile-target-name" id="hostileName">Dire Ridge Wolf</span>
          <span class="hostile-target-hp" id="hostileHpText">46 / 46 HP</span>
        </div>
        <div class="hostile-hp-track">
          <div class="hostile-hp-fill" id="hostileHpFill"></div>
        </div>
      </div>

      <!-- PLAYING BOTTOM PERIMETER HUD (Vitals & Compass | 4-Skill Action Bar | Continent Radar) -->
      <aside class="play-bottom-hud hidden" id="playBottomHud">
        <div class="speed-stamina-card">
          <div class="speed-row">
            <span class="speed-num" id="hudSpeedVal">32</span>
            <span class="speed-unit">KM/H</span>
            <span class="hp-status-tag hidden" id="hudHpStatusTag">-1.5/s</span>
          </div>
          <div class="bar-label-row">
            <span>VITALITY</span>
            <span class="vitality-val" id="hudHpText">100 / 100 HP</span>
          </div>
          <div class="vitality-track" title="Serpent Vitality — Drains in harsh higher-level realms; restored by slaying foes, crystals, or Trial Peak Shrines">
            <div class="vitality-fill" id="hudHpFill"></div>
          </div>
          <div class="bar-label-row">
            <span>DOU QI</span>
            <span class="qi-val" id="hudQiText">100 / 100 QI</span>
          </div>
          <div class="qi-track" title="Dou Qi Energy — Fuels Dash Strike (E/3) and Heavenly Flame Lotus (R/4)">
            <div class="qi-fill" id="hudQiFill"></div>
          </div>
          <div class="stamina-label-row">
            <span>CLIMB BOOST</span>
            <span class="keycap">W / SPACE</span>
          </div>
          <div class="stamina-track">
            <div class="stamina-fill" id="hudStaminaFill"></div>
          </div>
          <div class="compass-row" id="compassRow">
            <div class="compass-dial" aria-hidden="true">
              <span class="compass-arrow" id="compassArrow">▲</span>
            </div>
            <div class="compass-info">
              <span class="compass-name" id="compassName">T1 Whispering Foothill</span>
              <span class="compass-dist" id="compassDist">52m away</span>
            </div>
          </div>
        </div>

        <!-- 4-SKILL DOU QI FIGHTING ACTION BAR (BOTTOM-CENTER) -->
        <div class="action-skill-bar" role="group" aria-label="Dou Qi Combat Skills">
          <button type="button" class="skill-slot is-ready" id="hudPrimarySpellBtn" title="Primary Qi Bolt Volley (F, 1, or Left-Click)">
            <div class="skill-slot-head">
              <span class="keycap">F / 1</span>
              <span class="skill-cost free">QI +4</span>
            </div>
            <span class="skill-slot-name" id="hudPrimarySpellName">Jade Qi Bolt</span>
            <div class="magic-cd-track"><div class="magic-cd-fill" id="hudPrimaryCdFill"></div></div>
          </button>

          <button type="button" class="skill-slot is-ready" id="hudShockwaveBtn" title="AoE Qi Shockwave (Q, 2, or Right-Click)">
            <div class="skill-slot-head">
              <span class="keycap">Q / 2</span>
              <span class="skill-cost free">FREE</span>
            </div>
            <span class="skill-slot-name" id="hudShockwaveName">Coil Shockwave</span>
            <div class="magic-cd-track"><div class="magic-cd-fill wave" id="hudShockwaveCdFill"></div></div>
          </button>

          <button type="button" class="skill-slot is-ready" id="hudDashSkillBtn" title="Invulnerable Piercing Fighting Dash (E or 3)">
            <div class="skill-slot-head">
              <span class="keycap">E / 3</span>
              <span class="skill-cost qi" id="hudDashQiCost">22 QI</span>
            </div>
            <span class="skill-slot-name" id="hudDashSkillName">Fang Lunge</span>
            <div class="magic-cd-track"><div class="magic-cd-fill dash" id="hudDashCdFill"></div></div>
          </button>

          <button type="button" class="skill-slot is-ready is-ult" id="hudUltimateSkillBtn" title="Ultimate Heavenly Flame Lotus (R or 4)">
            <div class="skill-slot-head">
              <span class="keycap">R / 4</span>
              <span class="skill-cost ult" id="hudUltimateQiCost">55 QI</span>
            </div>
            <span class="skill-slot-name" id="hudUltimateSkillName">Ember Lotus Burst</span>
            <div class="magic-cd-track"><div class="magic-cd-fill ult" id="hudUltimateCdFill"></div></div>
          </button>
        </div>

        <div class="minimap-shell" title="Continental Radar — Gold diamond is next Peak, orange triangles are Beasts, jade/magenta diamonds are Soul Clan ghosts">
          <canvas id="minimapCanvas" width="148" height="148"></canvas>
          <div class="minimap-caption">CONTINENT RADAR</div>
        </div>
      </aside>

      <!-- 3D MOUNTAIN COURSE BUILDER DOCK -->
      <aside class="builder-dock-wrap hidden" id="builderDockWrap">
        <div class="dock-toggle-row">
          <button type="button" class="dock-collapse-btn" id="dockToggleBtn">▾ Hide Course Dock (H)</button>
          <span class="builder-hint">Click any mountainside to place · Right-click erase · Shift+Drag orbit · Scroll zoom</span>
          <button type="button" class="primary-cta compact" id="playFromBuilderBtn">Explore This Mountain ▶</button>
        </div>

        <div class="builder-dock" id="builderDockBody">
          <div class="dock-section">
            <span class="dock-label">PROPS</span>
            <div class="tool-palette" id="toolPalette">
              <button type="button" class="tool-btn active" data-tool="wall">Boulder</button>
              <button type="button" class="tool-btn" data-tool="totem">Totem</button>
              <button type="button" class="tool-btn" data-tool="boost">Boost Rune</button>
              <button type="button" class="tool-btn" data-tool="portalA">Portal A</button>
              <button type="button" class="tool-btn" data-tool="portalB">Portal B</button>
              <button type="button" class="tool-btn danger" data-tool="erase">Erase</button>
            </div>
          </div>

          <div class="dock-section">
            <span class="dock-label">MOUNTAIN &amp; WEATHER</span>
            <div class="dock-inline">
              <select id="builderPresetSelect" class="dark-select compact"></select>
              <button type="button" class="small-btn" id="builderBiomeBtn">Biome: Alpine</button>
              <button type="button" class="small-btn" id="builderWeatherBtn">Weather: Mist</button>
              <button type="button" class="small-btn" id="builderMirrorBtn">Mirror: Off</button>
              <button type="button" class="small-btn danger" id="builderClearBtn">Clear Props</button>
            </div>
          </div>

          <div class="dock-section">
            <span class="dock-label">SAVE &amp; SHARE</span>
            <div class="dock-inline">
              <input type="text" id="arenaNameInput" class="dark-input" maxlength="24" placeholder="Mountain course name..." />
              <button type="button" class="small-btn accent" id="saveFormationBtn">Save</button>
              <button type="button" class="small-btn" id="shareFormationBtn">Share Code</button>
            </div>
          </div>
        </div>
      </aside>

      <!-- EVOLUTION TIER VISUAL SUMMARY MODAL (UNLOCKS ON NEW TIER + REVIEWABLE ANYTIME) -->
      <div class="modal-backdrop hidden" id="evolutionSummaryModal" role="dialog" aria-modal="true" aria-labelledby="evoSumTitle">
        <div class="modal-card evo-summary-card" id="evoSumCard">
          <div class="evo-summary-header">
            <p class="evo-summary-meta" id="evoSumMeta">Evolution Tier 2 of 12 · Primal Serpent · 8% Humanity</p>
            <h2 class="evo-summary-title" id="evoSumTitle">Foothill Viper</h2>
            <p class="evo-summary-sub" id="evoSumSubtitle">Hardened emerald scales and sharper mountain reflexes.</p>
            <p class="evo-summary-perk" id="evoSumPerkLine">Unlocked trait · +3% climb speed · +4% boost endurance</p>
          </div>

          <div class="humanity-track-section" aria-label="12-tier Humanity progression track">
            <div class="humanity-track-labels">
              <span>Valley Hatchling</span>
              <span>Humanity Path</span>
              <span>Ascended Human</span>
            </div>
            <div class="humanity-track" id="evoSumTrack"></div>
          </div>

          <section class="humanity-chart-section" aria-label="Humanity growth line chart">
            <div class="humanity-chart-head">
              <div class="humanity-chart-title-row">
                <h3 class="evo-col-title">Humanity Growth Curve</h3>
                <div class="humanity-chart-legend" aria-hidden="true">
                  <span class="hlegend-item"><span class="hlegend-swatch achieved"></span>Achieved</span>
                  <span class="hlegend-item"><span class="hlegend-swatch projected"></span>Projected</span>
                </div>
              </div>
              <p class="humanity-chart-readout" id="evoSumChartReadout">Tier 1 · Valley Hatchling · 0% Humanity</p>
            </div>
            <div class="humanity-chart-canvas" id="evoSumChart"></div>
          </section>

          <div class="evo-summary-columns">
            <!-- LEFT COLUMN: HUMANITY PATH STATS -->
            <section class="evo-summary-col">
              <div class="evo-col-head">
                <h3 class="evo-col-title">Humanity Path Stats</h3>
                <span class="evo-col-note" id="evoSumPhaseName">Primal Serpent</span>
              </div>

              <div class="humanity-gauge-row">
                <div class="humanity-ring-wrap">
                  <svg class="humanity-ring-svg" viewBox="0 0 112 112" width="112" height="112" aria-hidden="true">
                    <circle class="humanity-ring-track" cx="56" cy="56" r="46" />
                    <circle class="humanity-ring-arc" id="evoSumRingArc" cx="56" cy="56" r="46" />
                  </svg>
                  <div class="humanity-ring-center">
                    <div id="evoSumPhaseGlyph"></div>
                  </div>
                </div>

                <div class="humanity-readout">
                  <div class="humanity-pct-val" id="evoSumRingPct">0%</div>
                  <div class="humanity-pct-label">Humanity Achieved</div>
                  <p class="humanity-next-gate" id="evoSumNextGate">Next tier at 400 XP &amp; 1 Trial Peak</p>
                </div>
              </div>

              <div class="humanity-bars" id="evoSumBars"></div>

              <div class="evo-telemetry-grid" id="evoSumTelemetry"></div>
            </section>

            <!-- RIGHT COLUMN: HISTORICAL MILESTONES -->
            <section class="evo-summary-col evo-summary-col-history">
              <div class="evo-col-head">
                <h3 class="evo-col-title">Historical Milestones</h3>
                <span class="evo-col-note" id="evoSumMilestonesCount">1 recorded</span>
              </div>
              <ol class="milestones-timeline" id="evoSumMilestonesList"></ol>
            </section>
          </div>

          <div class="evo-summary-footer">
            <button type="button" class="primary-cta" id="evoSumPrimaryBtn">Continue Climb</button>
            <button type="button" class="secondary-cta" id="evoSumSecondaryBtn">View All 12 Stages</button>
          </div>
        </div>
      </div>

      <!-- 12-STAGE ASCENSION JOURNEY MODAL -->
      <div class="modal-backdrop hidden" id="journeyModal">
        <div class="modal-card wide-modal">
          <h2 class="modal-title">12-Stage Ascension Journey</h2>
          <p class="modal-sub" id="journeySummary">
            Gather Essence XP and conquer all 12 Trial Peaks across the continent to transform from a tiny Hatchling Serpent into an Ascended Human.
          </p>
          <div class="journey-list" id="journeyList"></div>
          <div class="modal-actions horizontal">
            <button type="button" class="primary-cta compact" id="closeJourneyBtn">Continue Climb</button>
            <button type="button" class="secondary-cta compact" id="openSummaryFromJourneyBtn">Humanity Summary</button>
            <button type="button" class="secondary-cta compact" id="openBestiaryFromJourneyBtn">Bestiary</button>
            <button type="button" class="ghost-btn compact danger-outline" id="resetJourneyBtn">Reset Journey</button>
          </div>
        </div>
      </div>

      <!-- MAGICAL BESTIARY CATALOG MODAL -->
      <div class="modal-backdrop hidden" id="bestiaryModal" role="dialog" aria-modal="true" aria-labelledby="bestiaryModalTitle">
        <div class="modal-card bestiary-card">
          <div class="bestiary-header">
            <div class="bestiary-header-copy">
              <p class="bestiary-meta-line" id="bestiarySummaryMeta">0 of 8 Species Cataloged · 0 of 24 Lore Chapters · 0 Beasts Vanquished</p>
              <h2 class="bestiary-title" id="bestiaryModalTitle">Magical Bestiary</h2>
              <p class="bestiary-sub">Defeat mountain and jungle beasts with serpent magic to unlock their combat profiles and field lore.</p>
            </div>
            <div class="bestiary-controls-row">
              <div class="bestiary-search-wrap">
                <svg class="bestiary-search-icon" viewBox="0 0 20 20" width="15" height="15" aria-hidden="true">
                  <circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" stroke-width="1.8" />
                  <line x1="12.7" y1="12.7" x2="17.2" y2="17.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                </svg>
                <input
                  type="search"
                  id="bestiarySearchInput"
                  class="bestiary-search-input"
                  placeholder="Filter by creature name or lore keyword..."
                  aria-label="Filter creatures by name or lore keyword"
                  autocomplete="off"
                  spellcheck="false"
                />
                <button
                  type="button"
                  id="bestiarySearchClearBtn"
                  class="bestiary-search-clear hidden"
                  aria-label="Clear search query"
                >
                  ×
                </button>
              </div>
              <div class="bestiary-filter-bar" role="tablist" aria-label="Filter bestiary species">
                <button type="button" class="bestiary-filter-btn active" data-bfilter="all" role="tab" aria-selected="true">All</button>
                <button type="button" class="bestiary-filter-btn" data-bfilter="discovered" role="tab" aria-selected="false">Cataloged</button>
                <button type="button" class="bestiary-filter-btn" data-bfilter="mountain" role="tab" aria-selected="false">Alpine</button>
                <button type="button" class="bestiary-filter-btn" data-bfilter="jungle" role="tab" aria-selected="false">Jungle</button>
                <span class="bestiary-filter-sep" aria-hidden="true"></span>
                <button type="button" class="bestiary-filter-btn filter-threat-common" data-bfilter="common" role="tab" aria-selected="false">Common</button>
                <button type="button" class="bestiary-filter-btn filter-threat-elite" data-bfilter="elite" role="tab" aria-selected="false">Elite</button>
                <button type="button" class="bestiary-filter-btn filter-threat-legendary" data-bfilter="legendary" role="tab" aria-selected="false">Legendary</button>
              </div>
            </div>
          </div>

          <div class="bestiary-columns">
            <nav class="bestiary-index" id="bestiaryIndex" aria-label="Bestiary species index"></nav>
            <article class="bestiary-dossier" id="bestiaryDossier"></article>
          </div>

          <div class="bestiary-footer">
            <button type="button" class="secondary-cta compact" id="openSummaryFromBestiaryBtn">Humanity Path</button>
            <button type="button" class="primary-cta compact" id="closeBestiaryBtn">Close Bestiary</button>
          </div>
        </div>
      </div>

      <!-- PAUSE MODAL -->
      <div class="modal-backdrop hidden" id="pauseModal">
        <div class="modal-card">
          <h2 class="modal-title">Expedition Paused</h2>
          <p class="modal-sub">Catch your breath above the valley, inspect your Humanity Path stats, or adjust difficulty &amp; weather.</p>
          <div class="modal-controls-row">
            <span class="modal-field-label">Difficulty</span>
            <div class="speed-group" role="group">
              <button type="button" class="speed-btn" data-speed="chill">Chill</button>
              <button type="button" class="speed-btn active" data-speed="classic">Classic</button>
              <button type="button" class="speed-btn" data-speed="turbo">Turbo</button>
            </div>
          </div>
          <div class="modal-controls-row">
            <span class="modal-field-label">Weather</span>
            <div class="weather-switch compact" role="group" aria-label="Mountain weather">
              <button type="button" class="weather-btn" data-weather="clear">Clear</button>
              <button type="button" class="weather-btn active" data-weather="mist">Mist</button>
              <button type="button" class="weather-btn" data-weather="fog">Fog</button>
              <button type="button" class="weather-btn" data-weather="rain">Rain</button>
            </div>
          </div>
          <div class="modal-actions">
            <button type="button" class="primary-cta" id="resumeBtn">Resume</button>
            <button type="button" class="secondary-cta" id="pauseSettingsBtn">Settings</button>
            <button type="button" class="secondary-cta" id="pauseBestiaryBtn">Bestiary Catalog</button>
            <button type="button" class="secondary-cta" id="pauseSummaryBtn">Humanity Path Summary</button>
            <button type="button" class="secondary-cta" id="pauseJourneyBtn">12-Stage Journey</button>
            <button type="button" class="secondary-cta" id="pauseRestartBtn">Respawn at Checkpoint</button>
            <button type="button" class="secondary-cta" id="pauseBuilderBtn">Edit Mountain</button>
            <button type="button" class="ghost-btn" id="pauseTitleBtn">Main Menu</button>
          </div>
        </div>
      </div>

      <!-- GAME OVER MODAL -->
      <div class="modal-backdrop hidden" id="gameOverModal">
        <div class="modal-card">
          <div class="new-best-banner hidden" id="goNewBest">NEW HIGH SCORE!</div>
          <h2 class="modal-title">Climb Interrupted</h2>
          <p class="modal-reason" id="goReason">Crashed into a mountain boulder!</p>
          <p class="go-checkpoint-note" id="goCheckpoint">Checkpoint: Valley Start</p>
          <div class="go-stats-grid">
            <div class="go-stat">
              <span class="stat-label">EVOLUTION</span>
              <span class="go-val" id="goLevel">Lv 1/12</span>
            </div>
            <div class="go-stat">
              <span class="stat-label">XP SETBACK</span>
              <span class="go-val danger-text" id="goXpLoss">-0 XP</span>
            </div>
            <div class="go-stat">
              <span class="stat-label">PEAKS</span>
              <span class="go-val" id="goPeaks">0/12</span>
            </div>
            <div class="go-stat">
              <span class="stat-label">RUN SCORE</span>
              <span class="go-val" id="goScore">0</span>
            </div>
          </div>
          <div class="modal-actions">
            <button type="button" class="primary-cta" id="retryBtn">Respawn at Checkpoint</button>
            <button type="button" class="secondary-cta" id="goSummaryBtn">Humanity Path Summary</button>
            <button type="button" class="ghost-btn" id="goTitleBtn">Main Menu</button>
          </div>
        </div>
      </div>

      <!-- SHARE FORMATION CODE MODAL -->
      <div class="modal-backdrop hidden" id="shareModal">
        <div class="modal-card">
          <h2 class="modal-title">Share Mountain Course</h2>
          <p class="modal-sub">Copy this code to send your custom mountain course to friends, or paste one below to load it.</p>
          <textarea id="shareCodeInput" class="share-textarea" rows="3" spellcheck="false" placeholder="Paste SP2|... mountain code here"></textarea>
          <div class="modal-actions horizontal">
            <button type="button" class="primary-cta compact" id="copyCodeBtn">Copy Code</button>
            <button type="button" class="secondary-cta compact" id="importCodeBtn">Load Code</button>
            <button type="button" class="ghost-btn compact" id="closeShareBtn">Close</button>
          </div>
        </div>
      </div>

      <!-- TOAST NOTIFICATION -->
      <div class="toast hidden" id="toastEl" role="status" aria-live="polite"></div>

      <!-- SETTINGS MODAL -->
      <div class="modal-backdrop hidden" id="settingsModal" role="dialog" aria-modal="true" aria-labelledby="settingsTitle">
        <div class="modal-card">
          <h2 class="modal-title" id="settingsTitle">Settings</h2>
          <div class="settings-section">
            <span class="settings-label">Master Volume</span>
            <div class="settings-row">
              <input type="range" class="settings-slider" id="settingsMasterVol" min="0" max="100" value="82" />
              <span class="settings-val" id="settingsMasterVolVal">82%</span>
            </div>
          </div>
          <div class="settings-section">
            <span class="settings-label">Ambient Volume</span>
            <div class="settings-row">
              <input type="range" class="settings-slider" id="settingsAmbientVol" min="0" max="100" value="100" />
              <span class="settings-val" id="settingsAmbientVolVal">100%</span>
            </div>
          </div>
          <div class="settings-section">
            <span class="settings-label">SFX Volume</span>
            <div class="settings-row">
              <input type="range" class="settings-slider" id="settingsSfxVol" min="0" max="100" value="100" />
              <span class="settings-val" id="settingsSfxVolVal">100%</span>
            </div>
          </div>
          <div class="settings-section">
            <span class="settings-label">Graphics Quality</span>
            <div class="speed-group" role="group">
              <button type="button" class="speed-btn" data-quality="low">Low</button>
              <button type="button" class="speed-btn" data-quality="medium">Medium</button>
              <button type="button" class="speed-btn active" data-quality="high">High</button>
            </div>
          </div>
          <div class="modal-actions">
            <button type="button" class="primary-cta" id="closeSettingsBtn">Close</button>
          </div>
        </div>
      </div>

      <!-- FIRST-RUN TUTORIAL OVERLAY -->
      <div class="tutorial-overlay hidden" id="tutorialOverlay" role="dialog" aria-modal="true">
        <div class="tutorial-card">
          <h2 class="tutorial-title">How to Play</h2>
          <ul class="tutorial-list">
            <li><span class="keycap">A / D</span> or drag to steer the serpent</li>
            <li><span class="keycap">W / Space</span> to boost uphill (drains Stamina)</li>
            <li><span class="keycap">S</span> to brake</li>
            <li><span class="keycap">F / 1</span> Qi Bolt &nbsp;·&nbsp; <span class="keycap">Q / 2</span> Shockwave</li>
            <li><span class="keycap">E / 3</span> Dash &nbsp;·&nbsp; <span class="keycap">R / 4</span> Flame Lotus</li>
            <li>Conquer all 12 Trial Peak Shrines to evolve into an Ascended Human</li>
            <li>⚠️ Harsh climates drain Vitality — seek Shrine Shelter to recover HP &amp; Qi</li>
            <li>🌧️ Difficulty sets climate: Chill = Clear, Classic = Mist, Turbo = Rain</li>
          </ul>
          <button type="button" class="primary-cta" id="closeTutorialBtn">Begin Adventure</button>
        </div>
      </div>

      <!-- MOBILE BOOST / BRAKE TOUCH BUTTONS (shown only on touch devices) -->
      <div class="mobile-action-row hidden" id="mobileActionRow" aria-hidden="true">
        <button type="button" class="mobile-action-btn" id="mobileBrakeBtn" aria-label="Brake">▼ Brake</button>
        <button type="button" class="mobile-action-btn accent" id="mobileBoostBtn" aria-label="Boost">▲ Boost</button>
      </div>
    `;

    this.root.appendChild(uiLayer);

    this.titleOverlay = uiLayer.querySelector('#titleScreen')!;
    this.playingHud = uiLayer.querySelector('#playingHud')!;
    this.playBottomHud = uiLayer.querySelector('#playBottomHud')!;
    this.builderDockWrap = uiLayer.querySelector('#builderDockWrap')!;
    this.pauseModal = uiLayer.querySelector('#pauseModal')!;
    this.gameOverModal = uiLayer.querySelector('#gameOverModal')!;
    this.shareModal = uiLayer.querySelector('#shareModal')!;
    this.journeyModal = uiLayer.querySelector('#journeyModal')!;
    this.evolutionSummaryModal = uiLayer.querySelector('#evolutionSummaryModal')!;
    this.bestiaryModal = uiLayer.querySelector('#bestiaryModal')!;
    this.toastEl = uiLayer.querySelector('#toastEl')!;
    this.settingsModal = uiLayer.querySelector('#settingsModal')!;
    this.tutorialOverlay = uiLayer.querySelector('#tutorialOverlay')!;

    // Show mobile boost/brake on touch devices
    if (window.matchMedia('(pointer: coarse)').matches) {
      const mobileRow = uiLayer.querySelector<HTMLElement>('#mobileActionRow')!;
      mobileRow.classList.remove('hidden');
      mobileRow.setAttribute('aria-hidden', 'false');
    }

    this.startPlayBtn = uiLayer.querySelector('#startPlayBtn')!;
    this.titleProgressLine = uiLayer.querySelector('#titleProgressLine')!;

    this.combatVignetteEl = uiLayer.querySelector('#combatVignette')!;
    this.evoLevelEl = uiLayer.querySelector('#hudEvoLevel')!;
    this.evoTitleEl = uiLayer.querySelector('#hudEvoTitle')!;
    this.evoRealmEl = uiLayer.querySelector('#hudEvoRealm')!;
    this.xpFillEl = uiLayer.querySelector('#hudXpFill')!;
    this.xpMetaEl = uiLayer.querySelector('#hudXpMeta')!;
    this.scoreValEl = uiLayer.querySelector('#hudScore')!;
    this.peaksValEl = uiLayer.querySelector('#hudPeaks')!;
    this.altValEl = uiLayer.querySelector('#hudAlt')!;
    this.comboBadgeEl = uiLayer.querySelector('#hudComboWrap')!;
    this.comboFillEl = uiLayer.querySelector('#hudComboFill')!;
    this.zoneBadgeEl = uiLayer.querySelector('#hudZoneName')!;
    this.envHazardEl = uiLayer.querySelector('#hudEnvHazard')!;
    this.clanHeatSkulls = Array.from(uiLayer.querySelectorAll<HTMLElement>('#hudClanHeatSkulls .heat-skull'));
    this.soulInfluenceFloatEl = uiLayer.querySelector('#soulInfluenceFloat')!;
    this.soulInfluenceArcEl = uiLayer.querySelector('#soulInfluenceArc')!;
    this.soulInfluenceValEl = uiLayer.querySelector('#soulInfluenceVal')!;
    this.soulInfluenceStatusEl = uiLayer.querySelector('#soulInfluenceStatus')!;
    this.soulInfluenceSegs = Array.from(uiLayer.querySelectorAll<HTMLElement>('#soulInfluenceSegs .soul-seg'));
    this.ambushAlertEl = uiLayer.querySelector('#ambushAlertBanner')!;
    this.ambushAlertTextEl = uiLayer.querySelector('#ambushAlertText')!;
    this.speedValEl = uiLayer.querySelector('#hudSpeedVal')!;
    this.staminaFillEl = uiLayer.querySelector('#hudStaminaFill')!;
    this.compassArrowEl = uiLayer.querySelector('#compassArrow')!;
    this.compassNameEl = uiLayer.querySelector('#compassName')!;
    this.compassDistEl = uiLayer.querySelector('#compassDist')!;
    this.camBtnEl = uiLayer.querySelector('#hudCamBtn')!;
    this.muteBtnEl = uiLayer.querySelector('#hudMuteBtn')!;
    this.dockBodyEl = uiLayer.querySelector('#builderDockBody')!;
    this.dockToggleBtn = uiLayer.querySelector('#dockToggleBtn')!;

    this.hostileBarWrap = uiLayer.querySelector('#hostileBarWrap')!;
    this.hostileNameEl = uiLayer.querySelector('#hostileName')!;
    this.hostileHpTextEl = uiLayer.querySelector('#hostileHpText')!;
    this.hostileHpFillEl = uiLayer.querySelector('#hostileHpFill')!;
    this.hpFillEl = uiLayer.querySelector('#hudHpFill')!;
    this.hpTextEl = uiLayer.querySelector('#hudHpText')!;
    this.hpStatusTagEl = uiLayer.querySelector('#hudHpStatusTag')!;
    this.qiFillEl = uiLayer.querySelector('#hudQiFill')!;
    this.qiTextEl = uiLayer.querySelector('#hudQiText')!;
    this.primarySpellBtn = uiLayer.querySelector('#hudPrimarySpellBtn')!;
    this.primarySpellNameEl = uiLayer.querySelector('#hudPrimarySpellName')!;
    this.primaryCdFillEl = uiLayer.querySelector('#hudPrimaryCdFill')!;
    this.shockwaveBtn = uiLayer.querySelector('#hudShockwaveBtn')!;
    this.shockwaveNameEl = uiLayer.querySelector('#hudShockwaveName')!;
    this.shockwaveCdFillEl = uiLayer.querySelector('#hudShockwaveCdFill')!;
    this.dashSkillBtn = uiLayer.querySelector('#hudDashSkillBtn')!;
    this.dashSkillNameEl = uiLayer.querySelector('#hudDashSkillName')!;
    this.dashQiCostEl = uiLayer.querySelector('#hudDashQiCost')!;
    this.dashCdFillEl = uiLayer.querySelector('#hudDashCdFill')!;
    this.ultimateSkillBtn = uiLayer.querySelector('#hudUltimateSkillBtn')!;
    this.ultimateSkillNameEl = uiLayer.querySelector('#hudUltimateSkillName')!;
    this.ultimateQiCostEl = uiLayer.querySelector('#hudUltimateQiCost')!;
    this.ultimateCdFillEl = uiLayer.querySelector('#hudUltimateCdFill')!;

    this.minimapCanvas = uiLayer.querySelector('#minimapCanvas')!;
    this.minimapCtx = this.minimapCanvas.getContext('2d')!;

    this.goScoreEl = uiLayer.querySelector('#goScore')!;
    this.goLevelEl = uiLayer.querySelector('#goLevel')!;
    this.goXpLossEl = uiLayer.querySelector('#goXpLoss')!;
    this.goPeaksEl = uiLayer.querySelector('#goPeaks')!;
    this.goReasonEl = uiLayer.querySelector('#goReason')!;
    this.goCheckpointEl = uiLayer.querySelector('#goCheckpoint')!;
    this.goNewBestEl = uiLayer.querySelector('#goNewBest')!;

    this.journeySummaryEl = uiLayer.querySelector('#journeySummary')!;
    this.journeyListEl = uiLayer.querySelector('#journeyList')!;

    this.evoSumCardEl = uiLayer.querySelector('#evoSumCard')!;
    this.evoSumMetaEl = uiLayer.querySelector('#evoSumMeta')!;
    this.evoSumTitleEl = uiLayer.querySelector('#evoSumTitle')!;
    this.evoSumSubtitleEl = uiLayer.querySelector('#evoSumSubtitle')!;
    this.evoSumPerkLineEl = uiLayer.querySelector('#evoSumPerkLine')!;
    this.evoSumTrackEl = uiLayer.querySelector('#evoSumTrack')!;
    this.evoSumChartEl = uiLayer.querySelector('#evoSumChart')!;
    this.evoSumChartReadoutEl = uiLayer.querySelector('#evoSumChartReadout')!;
    this.evoSumRingArcEl = uiLayer.querySelector('#evoSumRingArc')!;
    this.evoSumRingPctEl = uiLayer.querySelector('#evoSumRingPct')!;
    this.evoSumPhaseGlyphEl = uiLayer.querySelector('#evoSumPhaseGlyph')!;
    this.evoSumPhaseNameEl = uiLayer.querySelector('#evoSumPhaseName')!;
    this.evoSumBarsEl = uiLayer.querySelector('#evoSumBars')!;
    this.evoSumTelemetryEl = uiLayer.querySelector('#evoSumTelemetry')!;
    this.evoSumNextGateEl = uiLayer.querySelector('#evoSumNextGate')!;
    this.evoSumMilestonesCountEl = uiLayer.querySelector('#evoSumMilestonesCount')!;
    this.evoSumMilestonesListEl = uiLayer.querySelector('#evoSumMilestonesList')!;
    this.evoSumPrimaryBtn = uiLayer.querySelector('#evoSumPrimaryBtn')!;
    this.evoSumSecondaryBtn = uiLayer.querySelector('#evoSumSecondaryBtn')!;

    this.bestiarySummaryMetaEl = uiLayer.querySelector('#bestiarySummaryMeta')!;
    this.bestiarySearchInput = uiLayer.querySelector('#bestiarySearchInput')!;
    this.bestiarySearchClearBtn = uiLayer.querySelector('#bestiarySearchClearBtn')!;
    this.bestiaryIndexEl = uiLayer.querySelector('#bestiaryIndex')!;
    this.bestiaryDossierEl = uiLayer.querySelector('#bestiaryDossier')!;

    this.presetSelectEl = uiLayer.querySelector('#builderPresetSelect')!;
    this.mirrorBtnEl = uiLayer.querySelector('#builderMirrorBtn')!;
    this.arenaNameInput = uiLayer.querySelector('#arenaNameInput')!;
    this.shareCodeInput = uiLayer.querySelector('#shareCodeInput')!;

    this.refreshPresetSelects();
  }

  private refreshPresetSelects(): void {
    const titleSel = this.root.querySelector('#titlePresetSelect') as HTMLSelectElement;
    const saved = this.game.getSavedFormations();
    const currentId = this.game.getFormation().id;

    const buildOptions = (sel: HTMLSelectElement) => {
      sel.innerHTML = '';
      const g1 = document.createElement('optgroup');
      g1.label = 'Continental Expeditions';
      for (const p of PRESET_FORMATIONS) {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.name;
        g1.appendChild(opt);
      }
      sel.appendChild(g1);

      if (saved.length > 0) {
        const g2 = document.createElement('optgroup');
        g2.label = 'Your Saved Courses';
        for (const p of saved) {
          const opt = document.createElement('option');
          opt.value = p.id;
          opt.textContent = p.name;
          g2.appendChild(opt);
        }
        sel.appendChild(g2);
      }
      sel.value = currentId;
    };

    buildOptions(titleSel);
    buildOptions(this.presetSelectEl);
  }

  private bindEvents(): void {
    this.startPlayBtn.addEventListener('click', () => {
      this.game.startGame();
    });
    this.root.querySelector('#openBestiaryTitleBtn')!.addEventListener('click', () => {
      this.openBestiaryModal();
    });
    this.root.querySelector('#openBuilderBtn')!.addEventListener('click', () => {
      this.arenaNameInput.value = this.game.getFormation().name;
      this.game.enterBuilder();
    });

    this.root.querySelectorAll<HTMLButtonElement>('.biome-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const biome = btn.dataset.biome as BiomeId;
        this.game.setBiome(biome);
      });
    });

    this.root.querySelectorAll<HTMLButtonElement>('.weather-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const weather = btn.dataset.weather as WeatherMode;
        this.game.setWeather(weather);
      });
    });

    this.root.querySelectorAll<HTMLButtonElement>('.speed-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const preset = btn.dataset.speed as SpeedPreset;
        this.game.setSpeedPreset(preset);
      });
    });

    const titlePresetSel = this.root.querySelector('#titlePresetSelect') as HTMLSelectElement;
    titlePresetSel.addEventListener('change', () => {
      this.game.loadPreset(titlePresetSel.value);
      this.presetSelectEl.value = titlePresetSel.value;
    });

    // Top HUD
    this.root.querySelector('#hudEvoTrigger')!.addEventListener('click', () => {
      this.openCurrentSummaryForReview();
    });
    this.soulInfluenceFloatEl.addEventListener('click', () => {
      const targetId =
        this.lastHudSnap && (this.lastHudSnap.clanHeat >= 3 || this.lastHudSnap.soulInfluence >= 75)
          ? 'soul_hall_reaper'
          : 'nether_earth_wraith';
      this.openBestiaryModal(targetId);
    });
    this.camBtnEl.addEventListener('click', () => {
      this.game.cycleCameraMode();
    });
    this.muteBtnEl.addEventListener('click', () => {
      this.game.sound.toggleMute();
      this.game.emitHud();
    });
    this.root.querySelector('#hudPauseBtn')!.addEventListener('click', () => {
      if (this.game.getMode() === 'builder') {
        this.game.returnToTitle();
      } else {
        this.game.togglePause();
      }
    });

    // Clickable 4-Skill Dou Qi Combat Action Bar (mouse / touch convenience)
    this.primarySpellBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.game.castPrimaryMagic();
    });
    this.shockwaveBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.game.castShockwave();
    });
    this.dashSkillBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.game.castDashStrike();
    });
    this.ultimateSkillBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.game.castUltimateLotus();
    });

    // Evolution Tier Visual Summary Modal actions
    this.evoSumPrimaryBtn.addEventListener('click', () => {
      this.handleEvolutionSummaryPrimary();
    });
    this.evoSumSecondaryBtn.addEventListener('click', () => {
      this.handleEvolutionSummarySecondary();
    });

    // Journey Modal
    this.root.querySelector('#closeJourneyBtn')!.addEventListener('click', () => {
      this.journeyModal.classList.add('hidden');
      this.syncModalFreeze();
    });
    this.root.querySelector('#openSummaryFromJourneyBtn')!.addEventListener('click', () => {
      this.journeyModal.classList.add('hidden');
      this.openCurrentSummaryForReview();
    });
    this.root.querySelector('#openBestiaryFromJourneyBtn')!.addEventListener('click', () => {
      this.journeyModal.classList.add('hidden');
      this.openBestiaryModal();
    });
    this.root.querySelector('#resetJourneyBtn')!.addEventListener('click', () => {
      this.journeyModal.classList.add('hidden');
      this.evolutionSummaryModal.classList.add('hidden');
      this.bestiaryModal.classList.add('hidden');
      this.syncModalFreeze();
      this.game.resetJourney();
    });

    // Bestiary Catalog Modal
    this.root.querySelector('#closeBestiaryBtn')!.addEventListener('click', () => {
      this.closeBestiaryModal();
    });
    this.root.querySelector('#openSummaryFromBestiaryBtn')!.addEventListener('click', () => {
      this.bestiaryModal.classList.add('hidden');
      this.openCurrentSummaryForReview();
    });
    this.bestiaryModal.addEventListener('click', (e) => {
      if (e.target === this.bestiaryModal) {
        this.closeBestiaryModal();
      }
    });
    this.bestiarySearchInput.addEventListener('input', () => {
      this.bestiaryQuery = this.bestiarySearchInput.value;
      this.bestiarySearchClearBtn.classList.toggle('hidden', this.bestiaryQuery.length === 0);
      this.renderBestiary(false);
    });
    this.bestiarySearchClearBtn.addEventListener('click', () => {
      this.bestiaryQuery = '';
      this.bestiarySearchInput.value = '';
      this.bestiarySearchClearBtn.classList.add('hidden');
      this.game.sound.playClick();
      this.renderBestiary(false);
      this.bestiarySearchInput.focus();
    });
    this.root.querySelectorAll<HTMLButtonElement>('.bestiary-filter-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const nextFilter = btn.dataset.bfilter as BestiaryFilter;
        if (!nextFilter) return;
        this.bestiaryFilter = nextFilter;
        const playedLegendary = this.renderBestiary(true);
        if (!playedLegendary) this.game.sound.playClick();
      });
    });
    this.bestiaryIndexEl.addEventListener('click', (e) => {
      const target = (e.target as HTMLElement).closest<HTMLButtonElement>('.bestiary-row');
      if (!target || !target.dataset.species) return;
      this.selectedBestiaryId = target.dataset.species as BestiaryEntryId;
      const playedLegendary = this.renderBestiary(true);
      if (!playedLegendary) this.game.sound.playClick();
    });
    this.bestiaryDossierEl.addEventListener('click', (e) => {
      const resetBtn = (e.target as HTMLElement).closest<HTMLButtonElement>('#bestiaryEmptyResetBtn');
      if (!resetBtn) return;
      this.bestiaryQuery = '';
      this.bestiarySearchInput.value = '';
      this.bestiarySearchClearBtn.classList.add('hidden');
      this.bestiaryFilter = 'all';
      this.game.sound.playClick();
      this.renderBestiary(false);
    });

    // Builder dock
    this.dockToggleBtn.addEventListener('click', () => this.toggleDockCollapse());
    this.root.querySelector('#playFromBuilderBtn')!.addEventListener('click', () => {
      this.game.startGame();
    });

    this.root.querySelectorAll<HTMLButtonElement>('#toolPalette .tool-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tool = btn.dataset.tool as BuilderTool;
        this.game.setBuilderTool(tool);
        this.root.querySelectorAll('#toolPalette .tool-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    this.presetSelectEl.addEventListener('change', () => {
      this.game.loadPreset(this.presetSelectEl.value);
      titlePresetSel.value = this.presetSelectEl.value;
      this.arenaNameInput.value = this.game.getFormation().name;
    });

    this.root.querySelector('#builderBiomeBtn')!.addEventListener('click', () => {
      const next = this.game.getFormation().biome === 'jungle' ? 'mountain' : 'jungle';
      this.game.setBiome(next);
    });

    this.root.querySelector('#builderWeatherBtn')!.addEventListener('click', () => {
      this.game.cycleWeather();
    });

    this.mirrorBtnEl.addEventListener('click', () => {
      const mirrored = this.game.toggleBuilderMirror();
      this.mirrorBtnEl.textContent = `Mirror: ${mirrored ? 'On' : 'Off'}`;
      this.mirrorBtnEl.classList.toggle('active-toggle', mirrored);
    });

    this.root.querySelector('#builderClearBtn')!.addEventListener('click', () => {
      this.game.clearFormation();
      this.arenaNameInput.value = this.game.getFormation().name;
    });

    this.root.querySelector('#saveFormationBtn')!.addEventListener('click', () => {
      this.game.saveCurrentFormation(this.arenaNameInput.value || this.game.getFormation().name);
      this.refreshPresetSelects();
    });

    this.root.querySelector('#shareFormationBtn')!.addEventListener('click', () => {
      this.shareCodeInput.value = this.game.exportShareCode();
      this.shareModal.classList.remove('hidden');
      this.shareCodeInput.select();
    });

    // Pause modal
    this.root.querySelector('#resumeBtn')!.addEventListener('click', () => this.game.togglePause());
    this.root.querySelector('#pauseBestiaryBtn')!.addEventListener('click', () => this.openBestiaryModal());
    this.root.querySelector('#pauseSummaryBtn')!.addEventListener('click', () => this.openCurrentSummaryForReview());
    this.root.querySelector('#pauseJourneyBtn')!.addEventListener('click', () => this.openJourneyModal());
    this.root.querySelector('#pauseRestartBtn')!.addEventListener('click', () => this.game.startGame());
    this.root.querySelector('#pauseBuilderBtn')!.addEventListener('click', () => this.game.enterBuilder());
    this.root.querySelector('#pauseTitleBtn')!.addEventListener('click', () => this.game.returnToTitle());

    // Game Over modal
    this.root.querySelector('#retryBtn')!.addEventListener('click', () => this.game.startGame());
    this.root.querySelector('#goSummaryBtn')!.addEventListener('click', () => this.openCurrentSummaryForReview());
    this.root.querySelector('#goTitleBtn')!.addEventListener('click', () => this.game.returnToTitle());

    // Share modal
    this.root.querySelector('#closeShareBtn')!.addEventListener('click', () => {
      this.shareModal.classList.add('hidden');
    });

    // --- Settings Modal ---
    const openSettingsModal = () => {
      this.settingsModal.classList.remove('hidden');
      this.game.setModalFreeze(true);
    };
    this.root.querySelector('#openSettingsTitleBtn')?.addEventListener('click', openSettingsModal);
    this.root.querySelector('#pauseSettingsBtn')?.addEventListener('click', openSettingsModal);
    this.root.querySelector('#closeSettingsBtn')!.addEventListener('click', () => {
      this.settingsModal.classList.add('hidden');
      this.game.setModalFreeze(false);
    });

    const masterSlider = this.root.querySelector<HTMLInputElement>('#settingsMasterVol')!;
    const ambientSlider = this.root.querySelector<HTMLInputElement>('#settingsAmbientVol')!;
    const sfxSlider = this.root.querySelector<HTMLInputElement>('#settingsSfxVol')!;

    masterSlider.addEventListener('input', () => {
      const v = Number(masterSlider.value) / 100;
      this.game.sound.setMasterVolume(v);
      this.root.querySelector('#settingsMasterVolVal')!.textContent = `${masterSlider.value}%`;
    });
    ambientSlider.addEventListener('input', () => {
      const v = Number(ambientSlider.value) / 100;
      this.game.sound.setAmbientVolume(v);
      this.root.querySelector('#settingsAmbientVolVal')!.textContent = `${ambientSlider.value}%`;
    });
    sfxSlider.addEventListener('input', () => {
      const v = Number(sfxSlider.value) / 100;
      this.game.sound.setSfxVolume(v);
      this.root.querySelector('#settingsSfxVolVal')!.textContent = `${sfxSlider.value}%`;
    });

    this.root.querySelectorAll<HTMLButtonElement>('[data-quality]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const q = btn.dataset.quality as 'low' | 'medium' | 'high';
        this.graphicsQuality = q;
        this.game.setGraphicsQuality(q);
        this.root.querySelectorAll('[data-quality]').forEach((b) =>
          b.classList.toggle('active', (b as HTMLButtonElement).dataset.quality === q),
        );
      });
    });

    // --- Tutorial Overlay ---
    this.root.querySelector('#closeTutorialBtn')!.addEventListener('click', () => {
      this.tutorialOverlay.classList.add('hidden');
      this.game.setModalFreeze(false);
      localStorage.setItem('SERPENT_PEAKS_TUTORIAL_SEEN', '1');
    });

    // --- Mobile Boost / Brake ---
    const mobileBoostBtn = this.root.querySelector<HTMLButtonElement>('#mobileBoostBtn');
    const mobileBrakeBtn = this.root.querySelector<HTMLButtonElement>('#mobileBrakeBtn');
    if (mobileBoostBtn) {
      mobileBoostBtn.addEventListener('pointerdown', () => this.game.setBoostHeld(true));
      mobileBoostBtn.addEventListener('pointerup', () => this.game.setBoostHeld(false));
      mobileBoostBtn.addEventListener('pointercancel', () => this.game.setBoostHeld(false));
    }
    if (mobileBrakeBtn) {
      mobileBrakeBtn.addEventListener('pointerdown', () => this.game.setBrakeHeld(true));
      mobileBrakeBtn.addEventListener('pointerup', () => this.game.setBrakeHeld(false));
      mobileBrakeBtn.addEventListener('pointercancel', () => this.game.setBrakeHeld(false));
    }
    this.root.querySelector('#copyCodeBtn')!.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(this.shareCodeInput.value);
        this.showToast('Mountain course code copied!');
      } catch {
        this.shareCodeInput.select();
        this.showToast('Press Ctrl+C / Cmd+C to copy!');
      }
    });
    this.root.querySelector('#importCodeBtn')!.addEventListener('click', () => {
      const ok = this.game.importShareCode(this.shareCodeInput.value);
      if (ok) {
        this.arenaNameInput.value = this.game.getFormation().name;
        this.refreshPresetSelects();
        this.shareModal.classList.add('hidden');
      } else {
        this.showToast('Invalid mountain code. Make sure it starts with SP2|');
      }
    });
  }

  private handleEvolutionSummaryPrimary(): void {
    this.evolutionSummaryModal.classList.add('hidden');
    if (this.evoSummaryContext === 'ascended' || this.game.getMode() === 'ascended') {
      this.game.continueAsHuman();
    } else if (this.evoSummaryContext === 'unlock' || this.game.getMode() === 'evolving') {
      this.game.dismissEvolutionSummary();
    }
    this.syncModalFreeze();
  }

  private handleEvolutionSummarySecondary(): void {
    if (this.evoSummaryContext === 'ascended') {
      this.evolutionSummaryModal.classList.add('hidden');
      this.syncModalFreeze();
      this.game.resetJourney();
      return;
    }
    this.evolutionSummaryModal.classList.add('hidden');
    if (this.game.getMode() === 'evolving') {
      this.game.dismissEvolutionSummary();
    }
    this.openJourneyModal();
  }

  public showEvolutionSummaryModal(
    summary: EvolutionUnlockSummary,
    context: 'unlock' | 'ascended' | 'review' = summary.isHuman ? 'ascended' : 'unlock',
  ): void {
    this.evoSummaryContext = context;
    this.renderEvolutionSummary(summary, context);
    this.journeyModal.classList.add('hidden');
    this.shareModal.classList.add('hidden');
    this.bestiaryModal.classList.add('hidden');
    this.evolutionSummaryModal.classList.remove('hidden');
    this.syncModalFreeze();
  }

  public openCurrentSummaryForReview(): void {
    const summary = this.game.getEvolutionSummary();
    this.showEvolutionSummaryModal(summary, 'review');
  }

  private renderEvolutionSummary(
    summary: EvolutionUnlockSummary,
    context: 'unlock' | 'ascended' | 'review',
  ): void {
    const { stage, magic, nextStage, humanity, stats, milestones } = summary;
    const isAscended = context === 'ascended' || (summary.isHuman && context === 'unlock');

    this.evoSumCardEl.classList.toggle('is-ascended', summary.isHuman);

    // Header copy (clean unboxed metadata with typographic separators, zero pills)
    const statusLead =
      context === 'review'
        ? `Evolution Tier ${summary.level} of ${MAX_EVOLUTION_LEVEL}`
        : isAscended
          ? `Final Ascension · Tier ${MAX_EVOLUTION_LEVEL} of ${MAX_EVOLUTION_LEVEL}`
          : `New Evolution Tier Unlocked · Tier ${summary.level} of ${MAX_EVOLUTION_LEVEL}`;
    this.evoSumMetaEl.textContent = `${statusLead} · ${humanity.phaseLabel} · ${humanity.humanityPercent}% Humanity`;
    this.evoSumTitleEl.textContent = isAscended ? 'Ascended Human' : stage.title;
    this.evoSumSubtitleEl.textContent = stage.subtitle;

    const bonuses: string[] = [];
    if (humanity.speedGainPercent > 0) bonuses.push(`+${humanity.speedGainPercent}% speed`);
    if (humanity.staminaGainPercent > 0) bonuses.push(`+${humanity.staminaGainPercent}% boost`);
    const spellCountNote = magic.boltCount > 1 ? ` ×${magic.boltCount}` : '';
    const boulderNote = magic.breaksBoulders ? ' · Shatters Boulders' : '';
    const bonusSuffix = bonuses.length > 0 ? ` · ${bonuses.join(' · ')}` : '';
    this.evoSumPerkLineEl.textContent = `${magic.realmName} · ${magic.primarySpell}${spellCountNote} · ${magic.dashSkillName} · ${magic.ultimateSkillName}${boulderNote}${bonusSuffix}`;

    // 12-Node Connected Humanity Path Track
    this.evoSumTrackEl.innerHTML = EVOLUTION_STAGES.map((st) => {
      const state =
        st.level < summary.level
          ? 'done'
          : st.level === summary.level
            ? 'current'
            : 'locked';
      const titleAttr = `Tier ${st.level}: ${st.title} (${st.xpRequired.toLocaleString()} XP, ${st.shrinesRequired} Peaks)`;
      return `
        <div class="htrack-node ${state}" title="${titleAttr}">
          <span class="htrack-num">${st.level}</span>
        </div>
      `;
    }).join('');

    // D3 Humanity Growth Line Chart across all 12 evolution tiers
    renderHumanityGrowthChart(
      this.evoSumChartEl,
      this.evoSumChartReadoutEl,
      summary.level,
      context !== 'review',
    );

    // SVG Radial Humanity Ring (circumference = 2 * PI * 46 ~= 289.03)
    const circumference = 2 * Math.PI * 46;
    const dashOffset = circumference * (1 - humanity.humanityPercent / 100);
    this.evoSumRingArcEl.style.strokeDasharray = `${circumference.toFixed(2)}`;
    this.evoSumRingArcEl.style.strokeDashoffset = `${dashOffset.toFixed(2)}`;
    this.evoSumRingPctEl.textContent = `${humanity.humanityPercent}%`;
    this.evoSumPhaseGlyphEl.innerHTML = renderPhaseGlyphSvg(summary.level);
    this.evoSumPhaseNameEl.textContent = humanity.phaseLabel;

    if (nextStage) {
      this.evoSumNextGateEl.textContent = `Next: Tier ${nextStage.level} ${nextStage.title} (${nextStage.xpRequired.toLocaleString()} XP · ${nextStage.shrinesRequired} Peaks)`;
    } else {
      this.evoSumNextGateEl.textContent = 'All 12 stages of the Humanity Path complete';
    }

    // Anatomical & Path Progress Bars (real morph weights from EvolutionStage)
    const bars: Array<{ label: string; value: number; detail: string }> = [
      {
        label: 'Upright Posture & Limbs',
        value: humanity.posturePercent,
        detail: `${humanity.posturePercent}%`,
      },
      {
        label: 'Human Visage',
        value: humanity.visagePercent,
        detail: `${humanity.visagePercent}%`,
      },
      {
        label: 'Serpent Scales Shed',
        value: humanity.shedPercent,
        detail: `${humanity.shedPercent}%`,
      },
      {
        label: 'Trial Peaks Conquered',
        value: humanity.peakMasteryPercent,
        detail: `${summary.visitedCount}/${summary.totalLandmarks}`,
      },
    ];

    this.evoSumBarsEl.innerHTML = bars
      .map(
        (bar) => `
          <div class="hbar-row">
            <div class="hbar-top">
              <span class="hbar-label">${bar.label}</span>
              <span class="hbar-val">${bar.detail}</span>
            </div>
            <div class="hbar-track">
              <div class="hbar-fill" style="width:${bar.value}%"></div>
            </div>
          </div>
        `,
      )
      .join('');

    // Lifetime Expedition Telemetry (clean tabular metrics separated by hairline rules)
    const telemetryItems: Array<{ label: string; value: string }> = [
      { label: 'Essence XP', value: summary.xp.toLocaleString() },
      { label: 'Beasts Vanquished', value: String(stats.beastsDefeated) },
      { label: 'Soul Clan Banished', value: String(stats.ghostsDefeated) },
      { label: 'Highest Altitude', value: `${stats.highestAltitudeMeters} m` },
      { label: 'Distance Traveled', value: formatDistanceMeters(stats.distanceMeters) },
      { label: 'Expedition Time', value: formatElapsedTime(stats.timePlayedSeconds) },
    ];

    this.evoSumTelemetryEl.innerHTML = telemetryItems
      .map(
        (item) => `
          <div class="evo-tel-item">
            <span class="evo-tel-label">${item.label}</span>
            <span class="evo-tel-val">${item.value}</span>
          </div>
        `,
      )
      .join('');

    // Historical Milestones Ledger (newest first)
    const ordered = [...milestones].reverse();
    this.evoSumMilestonesCountEl.textContent = `${ordered.length} milestone${ordered.length === 1 ? '' : 's'} achieved`;

    const kindLabel: Record<'evolution' | 'peak' | 'feat', string> = {
      evolution: 'Evolution',
      peak: 'Trial Peak',
      feat: 'Expedition Feat',
    };

    if (ordered.length === 0) {
      this.evoSumMilestonesListEl.innerHTML = `
        <li class="milestone-row">
          <div class="milestone-head">
            <span class="milestone-title">Journey Just Begun</span>
            <span class="milestone-meta">Tier 1 · 00:00</span>
          </div>
          <p class="milestone-detail">Conquer your first Peak Trial Shrine and gather Essence XP to record milestones.</p>
        </li>
      `;
    } else {
      this.evoSumMilestonesListEl.innerHTML = ordered
        .map((m) => {
          const isNew = summary.latestMilestoneId !== null && m.id === summary.latestMilestoneId;
          return `
            <li class="milestone-row${isNew ? ' is-latest' : ''}">
              <div class="milestone-head">
                <span class="milestone-title">${m.title}</span>
                <span class="milestone-meta">${kindLabel[m.kind]} · ${m.altitudeMeters}m · ${formatElapsedTime(m.elapsedSeconds)}</span>
              </div>
              <p class="milestone-detail">${m.detail}</p>
            </li>
          `;
        })
        .join('');
    }

    // Footer buttons (plain everyday language)
    if (isAscended) {
      this.evoSumPrimaryBtn.textContent = 'Keep Exploring as Human';
      this.evoSumSecondaryBtn.textContent = 'Start New Odyssey';
    } else if (context === 'unlock') {
      this.evoSumPrimaryBtn.textContent = 'Continue Climb';
      this.evoSumSecondaryBtn.textContent = 'View All 12 Stages';
    } else {
      this.evoSumPrimaryBtn.textContent = 'Close Summary';
      this.evoSumSecondaryBtn.textContent = 'View All 12 Stages';
    }
  }

  public toggleDockCollapse(): void {
    this.dockCollapsed = !this.dockCollapsed;
    this.dockBodyEl.classList.toggle('collapsed', this.dockCollapsed);
    this.dockToggleBtn.textContent = this.dockCollapsed
      ? '▴ Show Course Dock (H)'
      : '▾ Hide Course Dock (H)';
  }

  public openJourneyModal(): void {
    this.bestiaryModal.classList.add('hidden');
    this.evolutionSummaryModal.classList.add('hidden');
    this.renderJourneyList();
    this.journeyModal.classList.remove('hidden');
    this.syncModalFreeze();
  }

  public toggleJourneyModal(): void {
    if (this.journeyModal.classList.contains('hidden')) {
      this.openJourneyModal();
    } else {
      this.journeyModal.classList.add('hidden');
      this.syncModalFreeze();
    }
  }

  public openBestiaryModal(focusSpecies?: BestiaryEntryId): void {
    if (focusSpecies) {
      this.selectedBestiaryId = focusSpecies;
    } else {
      const snap = this.game.getBestiarySnapshot();
      const currentEntry = snap.entries.find((e) => e.def.id === this.selectedBestiaryId);
      if (!currentEntry || !currentEntry.discovered) {
        const firstDiscovered = snap.entries.find((e) => e.discovered);
        if (firstDiscovered) {
          this.selectedBestiaryId = firstDiscovered.def.id;
        }
      }
    }
    this.journeyModal.classList.add('hidden');
    this.evolutionSummaryModal.classList.add('hidden');
    this.shareModal.classList.add('hidden');
    this.bestiaryModal.classList.remove('hidden');
    const playedLegendary = this.renderBestiary(true);
    this.syncModalFreeze();
    if (!playedLegendary) this.game.sound.playClick();
  }

  public closeBestiaryModal(): void {
    if (this.bestiaryModal.classList.contains('hidden')) return;
    this.bestiaryModal.classList.add('hidden');
    this.syncModalFreeze();
    this.game.sound.playClick();
  }

  public toggleBestiaryModal(): void {
    if (this.bestiaryModal.classList.contains('hidden')) {
      this.openBestiaryModal();
    } else {
      this.closeBestiaryModal();
    }
  }

  private syncModalFreeze(): void {
    const anyBlockingModal =
      !this.bestiaryModal.classList.contains('hidden') ||
      !this.journeyModal.classList.contains('hidden') ||
      !this.evolutionSummaryModal.classList.contains('hidden');
    this.game.setModalFreeze(anyBlockingModal);
  }

  public isModalOpen(): boolean {
    return (
      !this.shareModal.classList.contains('hidden') ||
      !this.journeyModal.classList.contains('hidden') ||
      !this.evolutionSummaryModal.classList.contains('hidden') ||
      !this.bestiaryModal.classList.contains('hidden')
    );
  }

  public isEvolutionSummaryOpen(): boolean {
    return !this.evolutionSummaryModal.classList.contains('hidden');
  }

  public isBestiaryOpen(): boolean {
    return !this.bestiaryModal.classList.contains('hidden');
  }

  public closeOpenInfoModals(): void {
    if (!this.evolutionSummaryModal.classList.contains('hidden')) {
      this.handleEvolutionSummaryPrimary();
    }
    this.shareModal.classList.add('hidden');
    this.journeyModal.classList.add('hidden');
    this.bestiaryModal.classList.add('hidden');
    this.syncModalFreeze();
  }

  private renderBestiary(allowRevealTrigger = false): boolean {
    const snap: BestiarySnapshot = this.game.getBestiarySnapshot();

    this.bestiarySummaryMetaEl.textContent =
      `${snap.discoveredCount} of ${snap.totalSpeciesCount} Species Cataloged · ` +
      `${snap.unlockedLoreCount} of ${snap.totalLoreCount} Lore Chapters · ` +
      `${snap.totalDefeated} Beast${snap.totalDefeated === 1 ? '' : 's'} Vanquished`;

    this.root.querySelectorAll<HTMLButtonElement>('.bestiary-filter-btn').forEach((btn) => {
      const active = btn.dataset.bfilter === this.bestiaryFilter;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
    });

    const hasSearch = this.bestiaryQuery.trim().length > 0;
    const filtered = snap.entries.filter((entry) => {
      if (this.bestiaryFilter === 'discovered' && !entry.discovered) return false;
      if (this.bestiaryFilter === 'mountain' && entry.def.biome !== 'mountain') return false;
      if (this.bestiaryFilter === 'jungle' && entry.def.biome !== 'jungle') return false;
      if (
        (this.bestiaryFilter === 'common' ||
          this.bestiaryFilter === 'elite' ||
          this.bestiaryFilter === 'legendary') &&
        entry.threat.rating !== this.bestiaryFilter
      ) {
        return false;
      }
      return matchesBestiaryQuery(entry, this.bestiaryQuery);
    });

    if (filtered.length === 0) {
      if (hasSearch) {
        const safeQuery = this.bestiaryQuery
          .trim()
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
        this.bestiaryIndexEl.innerHTML = `
          <div class="bestiary-empty-index">
            <p class="bestiary-empty-title">No matching creatures</p>
            <p class="bestiary-empty-copy">No Bestiary entries matched “${safeQuery}” under the active filter.</p>
          </div>
        `;
        this.bestiaryDossierEl.innerHTML = `
          <div class="bestiary-empty-dossier">
            <div class="bestiary-empty-crest">${renderBestiaryCrestSvg('wolf')}</div>
            <h3 class="bestiary-empty-heading">No Specimens Match “${safeQuery}”</h3>
            <p class="bestiary-empty-copy">Try another creature name, habitat, or lore keyword such as frost, antlers, monsoon, or shrine.</p>
            <button type="button" class="secondary-cta compact" id="bestiaryEmptyResetBtn">Clear Search &amp; Filter</button>
          </div>
        `;
      } else {
        this.bestiaryIndexEl.innerHTML = `
          <div class="bestiary-empty-index">
            <p class="bestiary-empty-title">No cataloged beasts yet</p>
            <p class="bestiary-empty-copy">Use serpent magic (F or Click) and Shockwave (Q or Right-Click) to defeat wild mountain and jungle creatures.</p>
          </div>
        `;
        this.bestiaryDossierEl.innerHTML = `
          <div class="bestiary-empty-dossier">
            <div class="bestiary-empty-crest">${renderBestiaryCrestSvg('guardian')}</div>
            <h3 class="bestiary-empty-heading">Field Catalog Awaiting Specimens</h3>
            <p class="bestiary-empty-copy">Switch to All to preview regional habitats and sighting rumors across the Alpine Continent and Jungle Highlands.</p>
          </div>
        `;
      }
      return false;
    }

    if (!filtered.some((e) => e.def.id === this.selectedBestiaryId)) {
      this.selectedBestiaryId = filtered[0].def.id;
    }

    const selected = filtered.find((e) => e.def.id === this.selectedBestiaryId) ?? filtered[0];

    this.bestiaryIndexEl.innerHTML = filtered
      .map((entry) => {
        const isSel = entry.def.id === selected.def.id;
        const biomeName = entry.def.biome === 'jungle' ? 'Jungle' : 'Alpine';
        const statusLine = entry.discovered
          ? `${biomeName} · ${entry.record.defeatedCount} vanquished · ${entry.unlockedLoreCount}/${entry.totalLoreCount} lore`
          : entry.sightedOnly
            ? `${biomeName} · Sighted · Undefeated`
            : hasSearch
              ? `${biomeName} · Uncharted · Matches query`
              : `${biomeName} · Uncharted`;
        const displayTitle = entry.discovered || entry.sightedOnly ? entry.def.name : 'Uncharted Specimen';
        const thumbClass = entry.discovered ? entry.def.portraitToneClass : 'is-masked';
        return `
          <button type="button" class="bestiary-row${isSel ? ' active' : ''}${entry.discovered ? ' discovered' : ''}${entry.def.isBoss ? ' is-boss' : ''} row-threat-${entry.threat.rating}" data-species="${entry.def.id}">
            <div class="bestiary-thumb-wrap ${thumbClass}">
              <img class="bestiary-thumb-img" src="${entry.def.portraitUrl}" alt="${displayTitle}" referrerpolicy="no-referrer" />
              <div class="bestiary-thumb-fallback hidden">${renderBestiaryCrestSvg(entry.def.kind)}</div>
            </div>
            <div class="bestiary-row-body">
              <div class="bestiary-row-top">
                <span class="bestiary-row-title">${displayTitle}</span>
                ${renderThreatBadgeHtml(entry.threat, 'compact', !entry.discovered)}
              </div>
              <div class="bestiary-row-meta">${statusLine}</div>
            </div>
          </button>
        `;
      })
      .join('');

    let isLegendaryFirstReveal = false;
    if (allowRevealTrigger) {
      const isFirstInspect = this.game.markBestiaryInspected(selected.def.id);
      if (isFirstInspect && selected.threat.rating === 'legendary') {
        isLegendaryFirstReveal = true;
        this.game.sound.playLegendaryReveal();
      }
    }

    this.renderBestiaryDossier(selected, snap.playerLevel, isLegendaryFirstReveal);

    // Attach resilient image fallback handlers (Zero-Broken-Image Policy)
    this.bestiaryModal.querySelectorAll<HTMLImageElement>('img.bestiary-thumb-img, img.bestiary-hero-img').forEach((img) => {
      img.addEventListener(
        'error',
        () => {
          img.classList.add('hidden');
          const fallback = img.nextElementSibling as HTMLElement | null;
          fallback?.classList.remove('hidden');
        },
        { once: true },
      );
    });

    return isLegendaryFirstReveal;
  }

  private renderBestiaryDossier(
    entry: BestiaryEntrySnapshot,
    playerLevel: number,
    isLegendaryFirstReveal = false,
  ): void {
    const {
      def,
      record,
      threat,
      discovered,
      sightedOnly,
      scaledHp,
      unlockedLoreCount,
      totalLoreCount,
      nextLoreThreshold,
    } = entry;
    const biomeLabel = def.biome === 'jungle' ? 'Jungle Highlands' : 'Alpine Continent';
    const titleText = discovered || sightedOnly ? def.name : 'Uncharted Magical Beast';
    const epithetText = discovered
      ? def.epithet
      : sightedOnly
        ? 'Encountered in the wild — vanquish to complete specimen profile'
        : 'Unknown species rumored across the higher slopes';
    const metaLine = discovered
      ? `${biomeLabel} · ${def.classification} · Tier ${def.minTier}+ · ${def.xpReward} XP`
      : `${biomeLabel} · ${def.isBoss ? 'Shrine Guardian' : 'Wild Fauna'} · Tier ${def.minTier}+`;

    const firstDefeatedDate =
      record.firstDefeatedAt !== null
        ? new Date(record.firstDefeatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
        : '—';

    const statsRows: Array<{ label: string; value: string }> = discovered
      ? [
          { label: `Vitality (Lv ${playerLevel})`, value: `${scaledHp} HP` },
          { label: 'Pursuit Speed', value: `${def.baseSpeed.toFixed(1)} m/s` },
          { label: 'Aggro Radius', value: `${def.aggroRadius} m` },
          { label: 'Essence Yield', value: `+${def.xpReward} XP` },
          { label: 'Vanquished', value: String(record.defeatedCount) },
          {
            label: 'Lowest Tier Slain',
            value: record.lowestTierDefeated !== null ? `Tier ${record.lowestTierDefeated}` : '—',
          },
          { label: 'Highest Altitude', value: `${record.highestAltitudeMeters} m` },
          { label: 'First Cataloged', value: `${firstDefeatedDate} (Lv ${record.firstDefeatedLevel})` },
        ]
      : [
          { label: 'Known Habitat', value: def.habitat },
          { label: 'Threat Threshold', value: `Evolution Tier ${def.minTier}+` },
          { label: 'Essence Yield', value: `+${def.xpReward} XP` },
          { label: 'Catalog Status', value: sightedOnly ? 'Sighted · Undefeated' : 'Uncharted' },
        ];

    const loreMarkup = def.loreChapters
      .map((ch) => {
        const unlocked = record.defeatedCount >= ch.requiredDefeats;
        if (unlocked) {
          return `
            <div class="bestiary-lore-item unlocked">
              <div class="bestiary-lore-head">
                <span class="bestiary-lore-title">${ch.chapterTitle}</span>
                <span class="bestiary-lore-status">Discovered</span>
              </div>
              <p class="bestiary-lore-text">${ch.text}</p>
            </div>
          `;
        }
        const remaining = Math.max(1, ch.requiredDefeats - record.defeatedCount);
        return `
          <div class="bestiary-lore-item locked">
            <div class="bestiary-lore-head">
              <span class="bestiary-lore-title">${ch.chapterTitle}</span>
              <span class="bestiary-lore-status">Defeat ${ch.requiredDefeats} total (${remaining} more)</span>
            </div>
            <p class="bestiary-lore-text">Field notes sealed. Vanquish additional specimens of this creature during gameplay to uncover this lore entry.</p>
          </div>
        `;
      })
      .join('');

    const behaviorSection = discovered
      ? `
        <section class="bestiary-section">
          <div class="bestiary-section-head">
            <h4 class="bestiary-section-title">Combat Profile &amp; Habitat</h4>
            <span class="bestiary-section-note">${def.habitat}</span>
          </div>
          <div class="bestiary-behavior-lines">
            <p class="bestiary-behavior-line"><strong>Signature Attack:</strong> ${def.attackStyle}</p>
            <p class="bestiary-behavior-line"><strong>Counter-Tactic:</strong> ${def.tacticalNote}</p>
          </div>
        </section>
      `
      : `
        <section class="bestiary-section">
          <div class="bestiary-section-head">
            <h4 class="bestiary-section-title">Field Rumor</h4>
            <span class="bestiary-section-note">${biomeLabel}</span>
          </div>
          <p class="bestiary-rumor-text">${def.fieldRumor}</p>
        </section>
      `;

    const loreProgressNote =
      nextLoreThreshold !== null
        ? `${unlockedLoreCount}/${totalLoreCount} unlocked · Next at ${nextLoreThreshold} vanquished`
        : `${unlockedLoreCount}/${totalLoreCount} chapters complete`;

    this.bestiaryDossierEl.innerHTML = `
      <div class="bestiary-hero-frame ${discovered ? def.portraitToneClass : 'is-masked'} hero-threat-${threat.rating}${isLegendaryFirstReveal ? ' is-legendary-reveal' : ''}">
        <img class="bestiary-hero-img" src="${def.portraitUrl}" alt="${titleText}" referrerpolicy="no-referrer" />
        <div class="bestiary-hero-fallback hidden">
          ${renderBestiaryCrestSvg(def.kind)}
        </div>
        <div class="bestiary-hero-threat-slot">
          ${renderThreatBadgeHtml(threat, 'hero', !discovered)}
        </div>
        <div class="bestiary-hero-scrim">
          <p class="bestiary-hero-meta">${metaLine}</p>
          <h3 class="bestiary-hero-title">${titleText}</h3>
          <p class="bestiary-hero-epithet">${epithetText}</p>
        </div>
      </div>

      <section class="bestiary-threat-strip" aria-label="Threat assessment">
        <div class="bestiary-threat-top">
          <div class="bestiary-threat-left">
            <span class="bestiary-threat-kicker">Threat Rating</span>
            ${renderThreatBadgeHtml(threat, 'inline', !discovered)}
          </div>
          <span class="bestiary-threat-score">Power ${threat.powerScore} / 100</span>
        </div>
        <div class="bestiary-threat-track" role="progressbar" aria-valuenow="${threat.powerScore}" aria-valuemin="0" aria-valuemax="100" aria-label="Creature power level">
          <div class="bestiary-threat-fill threat-${threat.rating}" style="width:${threat.powerScore}%"></div>
        </div>
        <p class="bestiary-threat-note">${threat.summary}</p>
      </section>

      <section class="bestiary-section">
        <div class="bestiary-section-head">
          <h4 class="bestiary-section-title">${discovered ? 'Creature Stats & Hunt Record' : 'Known Field Intelligence'}</h4>
          <span class="bestiary-section-note">${discovered ? 'Live tier-scaled stats' : 'Defeat to reveal stats'}</span>
        </div>
        <div class="bestiary-stats-grid${discovered ? '' : ' compact'}">
          ${statsRows
            .map(
              (row) => `
                <div class="bestiary-stat-cell">
                  <span class="bestiary-stat-label">${row.label}</span>
                  <span class="bestiary-stat-val">${row.value}</span>
                </div>
              `,
            )
            .join('')}
        </div>
      </section>

      ${behaviorSection}

      <section class="bestiary-section">
        <div class="bestiary-section-head">
          <h4 class="bestiary-section-title">Discovered Lore</h4>
          <span class="bestiary-section-note">${loreProgressNote}</span>
        </div>
        <div class="bestiary-lore-list">
          ${loreMarkup}
        </div>
      </section>
    `;
  }

  public showToast(msg: string): void {
    this.toastEl.textContent = msg;
    this.toastEl.classList.remove('hidden');
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => {
      this.toastEl.classList.add('hidden');
    }, 3600);
  }

  private renderJourneyList(): void {
    const snap = this.lastHudSnap;
    const curLevel = snap ? snap.level : 1;
    const curXp = snap ? snap.xp : 0;
    const curPeaks = snap ? snap.visitedCount : 0;
    const visitedSet = new Set(snap ? snap.visitedLandmarkIds : []);

    this.journeySummaryEl.textContent =
      curLevel >= MAX_EVOLUTION_LEVEL
        ? `Ascension complete! ${curXp.toLocaleString()} XP earned and ${curPeaks}/${WORLD_LANDMARKS.length} Trial Peaks conquered.`
        : `Currently Lv ${curLevel}/${MAX_EVOLUTION_LEVEL} · ${curXp.toLocaleString()} Essence XP · ${curPeaks}/${WORLD_LANDMARKS.length} Trial Peaks conquered. Crashing costs 35% of your current level's XP progress.`;

    this.journeyListEl.innerHTML = EVOLUTION_STAGES.map((st) => {
      const status =
        st.level < curLevel ? 'done' : st.level === curLevel ? 'current' : 'locked';
      const lm = WORLD_LANDMARKS[st.level - 1];
      const mt = getMagicTierForLevel(st.level);
      const peakDone = lm ? visitedSet.has(lm.id) : false;
      const statusText =
        status === 'done'
          ? 'Mastered'
          : status === 'current'
            ? 'Current Form'
            : `Tier ${st.level}`;
      const reqText =
        st.level === 1
          ? 'Starting Form · Valley Start'
          : `${st.xpRequired.toLocaleString()} XP + ${st.shrinesRequired} Peak${st.shrinesRequired > 1 ? 's' : ''}`;
      const peakTag = lm
        ? `Peak T${lm.tier}: ${lm.name}${peakDone ? ' ✓' : ''}`
        : '';
      const magicNote = `Magic: ${mt.magicTitle} · ${mt.primarySpell}${mt.boltCount > 1 ? ` (×${mt.boltCount})` : ''} & ${mt.shockwaveSpell}`;

      return `
        <div class="journey-item ${status}">
          <div class="journey-item-top">
            <span class="journey-stage-title">Tier ${st.level} · ${st.title}</span>
            <span class="journey-status-text ${status}">${statusText}</span>
          </div>
          <div class="journey-stage-sub">${st.subtitle}</div>
          <div class="journey-magic-line">${magicNote}</div>
          <div class="journey-req-row">
            <span>${reqText}</span>
            <span class="${peakDone ? 'peak-done' : ''}">${peakTag}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  public renderHud(snap: HudSnapshot): void {
    this.lastHudSnap = snap;

    this.titleOverlay.classList.toggle('hidden', snap.mode !== 'title');
    this.playingHud.classList.toggle('hidden', snap.mode === 'title');
    this.playBottomHud.classList.toggle(
      'hidden',
      snap.mode !== 'playing' && snap.mode !== 'paused',
    );
    this.builderDockWrap.classList.toggle('hidden', snap.mode !== 'builder');
    this.pauseModal.classList.toggle('hidden', snap.mode !== 'paused');
    this.gameOverModal.classList.toggle('hidden', snap.mode !== 'gameover');

    // Title screen progress CTA
    if (snap.level > 1 || snap.xp > 0 || snap.visitedCount > 0) {
      this.startPlayBtn.textContent = snap.isHuman
        ? 'Roam as Human (Lv 12)'
        : `Continue Odyssey (Lv ${snap.level})`;
      this.titleProgressLine.textContent = `Current Form: Lv ${snap.level}/${snap.maxLevel} ${snap.stageTitle} · ${snap.xp.toLocaleString()} XP · ${snap.visitedCount}/${snap.totalLandmarks} Peaks · Checkpoint: ${snap.checkpointName}`;
    } else {
      this.startPlayBtn.textContent = 'Begin Odyssey';
      this.titleProgressLine.textContent =
        'Begin as a tiny Valley Hatchling · Conquer 12 Trial Peaks across the continent to ascend into a Human';
    }

    // Top-left evolution, Cultivation Realm & stats
    this.evoLevelEl.textContent = `LV ${snap.level}/${snap.maxLevel}`;
    this.evoTitleEl.textContent = snap.stageTitle;
    this.evoRealmEl.textContent = snap.realmName;
    this.xpFillEl.style.width = `${Math.round(snap.xpProgress * 100)}%`;
    this.xpFillEl.classList.toggle('human-full', snap.isHuman);
    if (snap.isHuman) {
      this.xpMetaEl.textContent = `${snap.xp.toLocaleString()} XP · Dou Di Ascended`;
    } else if (snap.xp >= snap.nextLevelXp && snap.visitedCount < snap.shrinesRequiredForNext) {
      this.xpMetaEl.textContent = `XP Ready · Need Peak ${snap.shrinesRequiredForNext}`;
    } else {
      this.xpMetaEl.textContent = `${snap.xp.toLocaleString()} / ${snap.nextLevelXp.toLocaleString()} XP`;
    }

    this.scoreValEl.textContent = String(snap.score);
    this.peaksValEl.textContent = `${snap.visitedCount}/${snap.totalLandmarks}`;
    this.altValEl.textContent = `${snap.altitude}m`;
    this.zoneBadgeEl.textContent = snap.mode === 'builder' ? snap.formationName : snap.zoneName;

    // Realm Environment Climate Hazard readout
    this.envHazardEl.className = `env-hazard-line ${snap.isSheltered ? 'is-sheltered' : `severity-${snap.envHazardSeverity}`}`;
    if (snap.isSheltered) {
      this.envHazardEl.textContent = `Shrine Shelter · Restoring HP & Qi`;
    } else if (snap.envHpDrainPerSec > 0) {
      this.envHazardEl.textContent = `${snap.envHazardName} · -${snap.envHpDrainPerSec.toFixed(1)} HP/s`;
    } else {
      this.envHazardEl.textContent = `${snap.envHazardName} · Safe Climate`;
    }

    // Vice-City Soul Clan Heat (5-Skull Meter)
    this.clanHeatSkulls.forEach((skull, idx) => {
      skull.classList.toggle('lit', idx < snap.clanHeat);
      skull.classList.toggle('extreme', snap.clanHeat >= 4 && idx < snap.clanHeat);
    });

    // Floating Soul Clan Influence Counter (intensity gauge + imminent presence pulse)
    const showSoulFloat = snap.mode === 'playing' || snap.mode === 'paused';
    this.soulInfluenceFloatEl.classList.toggle('hidden', !showSoulFloat);
    if (showSoulFloat) {
      const pct = Math.max(0, Math.min(100, Math.round(snap.soulInfluence)));
      this.soulInfluenceFloatEl.classList.remove(
        'state-dormant',
        'state-stirring',
        'state-imminent',
        'state-active',
      );
      this.soulInfluenceFloatEl.classList.add(`state-${snap.soulPresenceState}`);
      this.soulInfluenceValEl.textContent = `${pct}%`;

      const arcCircumference = 2 * Math.PI * 19; // r = 19 (~119.38)
      const dashOffset = arcCircumference * (1 - pct / 100);
      this.soulInfluenceArcEl.style.strokeDasharray = `${arcCircumference.toFixed(2)}`;
      this.soulInfluenceArcEl.style.strokeDashoffset = `${dashOffset.toFixed(2)}`;

      const litSegs = pct <= 0 ? 0 : Math.min(5, Math.ceil(pct / 20));
      this.soulInfluenceSegs.forEach((seg, idx) => {
        seg.classList.toggle('lit', idx < litSegs);
      });

      const etaSec = Math.max(0.1, snap.soulAmbushEta);
      if (snap.soulPresenceState === 'active') {
        if (snap.activeGhostCount > 0) {
          this.soulInfluenceStatusEl.textContent = `MANIFEST · ${snap.activeGhostCount} Spirit${snap.activeGhostCount === 1 ? '' : 's'} Hunting`;
        } else {
          this.soulInfluenceStatusEl.textContent = `FISSURE OPEN · Rising Now`;
        }
      } else if (snap.soulPresenceState === 'imminent') {
        this.soulInfluenceStatusEl.textContent = `IMMINENT · Eruption ${etaSec.toFixed(1)}s`;
      } else if (snap.soulPresenceState === 'stirring') {
        this.soulInfluenceStatusEl.textContent = `Stirring · Tremor ${Math.ceil(etaSec)}s`;
      } else {
        this.soulInfluenceStatusEl.textContent = `Earth Calm · ${Math.ceil(etaSec)}s`;
      }
    }

    // Non-blocking Soul Clan Ambush strip
    const showAmbush = snap.mode === 'playing' && snap.ambushActive;
    this.ambushAlertEl.classList.toggle('hidden', !showAmbush);
    if (showAmbush) {
      this.ambushAlertTextEl.textContent =
        snap.activeGhostCount > 0
          ? `SOUL CLAN AMBUSH · ${snap.activeGhostCount} SPIRIT${snap.activeGhostCount === 1 ? '' : 'S'} HUNTING YOU`
          : 'SOUL CLAN FISSURE · SPIRITS EMERGING FROM THE EARTH';
    }

    // Screen-edge combat damage & harsh-environment vignette
    const isHarshDrain = snap.mode === 'playing' && !snap.isSheltered && snap.envHpDrainPerSec >= 1.3;
    this.combatVignetteEl.classList.toggle('is-harsh', isHarshDrain);
    this.combatVignetteEl.classList.toggle(
      'is-tribulation',
      isHarshDrain && (snap.envHazardSeverity === 'extreme' || snap.envHazardSeverity === 'tribulation'),
    );
    this.combatVignetteEl.style.setProperty('--hurt-alpha', snap.mode === 'playing' ? snap.recentHurtPulse.toFixed(2) : '0');

    // Engaged hostile beast / ghost bar (top-center)
    const showHostile = snap.mode === 'playing' && snap.nearbyHostileName !== null;
    this.hostileBarWrap.classList.toggle('hidden', !showHostile);
    if (showHostile && snap.nearbyHostileName) {
      const isGhost = snap.nearbyHostileFaction === 'ghost_clan';
      this.hostileBarWrap.classList.toggle('is-boss', snap.nearbyHostileBoss);
      this.hostileBarWrap.classList.toggle('is-ghost', isGhost);
      const prefix = isGhost
        ? snap.nearbyHostileBoss
          ? 'Soul Hall Boss · '
          : 'Soul Clan · '
        : snap.nearbyHostileBoss
          ? 'Peak Guardian · '
          : '';
      this.hostileNameEl.textContent = `${prefix}${snap.nearbyHostileName}`;
      const curHp = Math.max(0, Math.ceil(snap.nearbyHostileHp));
      const maxHp = Math.max(1, Math.ceil(snap.nearbyHostileMaxHp));
      this.hostileHpTextEl.textContent = `${curHp} / ${maxHp} HP`;
      this.hostileHpFillEl.style.width = `${Math.max(0, Math.min(100, (snap.nearbyHostileHp / Math.max(1, snap.nearbyHostileMaxHp)) * 100)).toFixed(1)}%`;
    }

    // Bottom-left speedometer, Vitality (HP), Dou Qi, Climb Boost & Peak Compass
    this.speedValEl.textContent = String(snap.speedKmh);
    const hpPct = Math.max(0, Math.min(100, (snap.hp / Math.max(1, snap.maxHp)) * 100));
    this.hpTextEl.textContent = `${Math.max(0, Math.ceil(snap.hp))} / ${snap.maxHp} HP`;
    this.hpFillEl.style.width = `${hpPct.toFixed(1)}%`;
    this.hpFillEl.classList.toggle('low', hpPct <= 30);
    this.hpFillEl.classList.toggle('draining', !snap.isSheltered && snap.envHpDrainPerSec > 0);

    if (snap.isSheltered) {
      this.hpStatusTagEl.textContent = 'SHELTER';
      this.hpStatusTagEl.className = 'hp-status-tag sheltered';
    } else if (snap.envHpDrainPerSec > 0) {
      this.hpStatusTagEl.textContent = `-${snap.envHpDrainPerSec.toFixed(1)}/s`;
      this.hpStatusTagEl.className = 'hp-status-tag draining';
    } else {
      this.hpStatusTagEl.className = 'hp-status-tag hidden';
    }

    const qiPct = Math.max(0, Math.min(100, (snap.qi / Math.max(1, snap.maxQi)) * 100));
    this.qiTextEl.textContent = `${Math.floor(snap.qi)} / ${snap.maxQi} QI`;
    this.qiFillEl.style.width = `${qiPct.toFixed(1)}%`;

    this.staminaFillEl.style.width = `${Math.round(snap.stamina * 100)}%`;
    this.staminaFillEl.classList.toggle('boosting', snap.boostTimer > 0);

    // Bottom-center 4-Skill Dou Qi Combat Action Bar
    this.primarySpellNameEl.textContent = snap.primarySpellName;
    const primaryReadyPct = Math.max(0, Math.min(100, (1 - snap.primaryCooldownFrac) * 100));
    this.primaryCdFillEl.style.width = `${primaryReadyPct.toFixed(1)}%`;
    this.primarySpellBtn.classList.toggle('is-ready', snap.primaryCooldownFrac <= 0.01);

    this.shockwaveNameEl.textContent = snap.shockwaveName;
    const waveReadyPct = Math.max(0, Math.min(100, (1 - snap.shockwaveCooldownFrac) * 100));
    this.shockwaveCdFillEl.style.width = `${waveReadyPct.toFixed(1)}%`;
    this.shockwaveBtn.classList.toggle('is-ready', snap.shockwaveCooldownFrac <= 0.01);

    this.dashSkillNameEl.textContent = snap.dashSkillName;
    this.dashQiCostEl.textContent = `${snap.dashQiCost} QI`;
    const dashReadyPct = Math.max(0, Math.min(100, (1 - snap.dashCooldownFrac) * 100));
    this.dashCdFillEl.style.width = `${dashReadyPct.toFixed(1)}%`;
    const dashHasQi = snap.qi >= snap.dashQiCost;
    this.dashSkillBtn.classList.toggle('is-ready', snap.dashCooldownFrac <= 0.01 && dashHasQi);
    this.dashSkillBtn.classList.toggle('no-qi', !dashHasQi);

    this.ultimateSkillNameEl.textContent = snap.ultimateSkillName;
    this.ultimateQiCostEl.textContent = `${snap.ultimateQiCost} QI`;
    const ultReadyPct = Math.max(0, Math.min(100, (1 - snap.ultimateCooldownFrac) * 100));
    this.ultimateCdFillEl.style.width = `${ultReadyPct.toFixed(1)}%`;
    const ultHasQi = snap.qi >= snap.ultimateQiCost;
    this.ultimateSkillBtn.classList.toggle('is-ready', snap.ultimateCooldownFrac <= 0.01 && ultHasQi);
    this.ultimateSkillBtn.classList.toggle('no-qi', !ultHasQi);

    const deg = (snap.nextShrineBearing * 180) / Math.PI;
    this.compassArrowEl.style.transform = `rotate(${deg.toFixed(1)}deg)`;
    this.compassNameEl.textContent = snap.nextShrineName;
    this.compassDistEl.textContent =
      snap.visitedCount >= snap.totalLandmarks ? 'Continent Mastered' : `${snap.nextShrineDist}m away`;

    if (snap.combo > 1 && snap.mode === 'playing') {
      this.comboBadgeEl.classList.remove('hidden');
      this.root.querySelector('#hudComboText')!.textContent = `x${snap.combo}`;
      this.comboFillEl.style.width = `${Math.round(snap.comboProgress * 100)}%`;
    } else {
      this.comboBadgeEl.classList.add('hidden');
    }

    const weatherShort: Record<WeatherMode, string> = {
      clear: 'Clear',
      mist: 'Mist',
      fog: 'Fog',
      rain: 'Rain',
    };

    const camNames: Record<CameraMode, string> = {
      ant: 'Ant View',
      chase: 'GTA Chase',
      aerial: 'Eagle Map',
    };
    this.root.querySelector('#hudCamLabel')!.textContent = camNames[snap.cameraMode];
    this.muteBtnEl.textContent = snap.muted ? 'SFX Off' : 'SFX On';

    const pauseBtn = this.root.querySelector('#hudPauseBtn')!;
    pauseBtn.textContent = snap.mode === 'builder' ? 'Menu' : 'Pause';

    const biomeBtn = this.root.querySelector('#builderBiomeBtn')!;
    biomeBtn.textContent = `Biome: ${snap.biome === 'jungle' ? 'Jungle' : 'Alpine'}`;
    const builderWeatherBtn = this.root.querySelector('#builderWeatherBtn')!;
    builderWeatherBtn.textContent = `Weather: ${weatherShort[snap.weather]}`;

    this.root.querySelectorAll<HTMLButtonElement>('.biome-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.biome === snap.biome);
    });
    this.root.querySelectorAll<HTMLButtonElement>('.weather-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.weather === snap.weather);
    });
    this.root.querySelectorAll<HTMLButtonElement>('.speed-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.speed === snap.speedPreset);
    });

    if (snap.mode === 'gameover') {
      this.goLevelEl.textContent = `Lv ${snap.level}/${snap.maxLevel}`;
      this.goXpLossEl.textContent = snap.xpLostOnCrash > 0 ? `-${snap.xpLostOnCrash} XP` : '0 XP';
      this.goPeaksEl.textContent = `${snap.visitedCount}/${snap.totalLandmarks}`;
      this.goScoreEl.textContent = String(snap.score);
      this.goReasonEl.textContent = snap.deathReason || 'Climb interrupted!';
      this.goCheckpointEl.textContent = `Respawn Checkpoint: ${snap.checkpointName}`;
      this.goNewBestEl.classList.toggle('hidden', !snap.isNewBest);
    }

    if (!this.journeyModal.classList.contains('hidden')) {
      this.renderJourneyList();
    }
    if (!this.bestiaryModal.classList.contains('hidden')) {
      this.renderBestiary();
    }
  }

  /**
   * Pre-renders a crisp topographic contour terrain backdrop once per biome for the Continental Radar.
   */
  private ensureTerrainMapCache(biome: BiomeId): HTMLCanvasElement {
    if (this.terrainMapCache && this.cachedMapBiome === biome) {
      return this.terrainMapCache;
    }
    const size = 240;
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const ctx = c.getContext('2d')!;
    const img = ctx.createImageData(size, size);
    const data = img.data;
    const range = WORLD_PLAY_RADIUS * 1.12;
    const isJungle = biome === 'jungle';

    for (let py = 0; py < size; py++) {
      for (let px = 0; px < size; px++) {
        const wx = ((px / size) * 2 - 1) * range;
        const wz = ((py / size) * 2 - 1) * range;
        const h = terrainHeightAt(wx, wz, biome);
        const idx = (py * size + px) * 4;

        let r = 24;
        let g = 46;
        let b = 52;
        if (h < WATER_LEVEL) {
          r = isJungle ? 18 : 34;
          g = isJungle ? 95 : 108;
          b = isJungle ? 102 : 162;
        } else if (h < 10) {
          r = isJungle ? 28 : 36;
          g = isJungle ? 74 : 68;
          b = isJungle ? 46 : 58;
        } else if (h < 22) {
          r = isJungle ? 46 : 68;
          g = isJungle ? 98 : 88;
          b = isJungle ? 56 : 94;
        } else if (h < 36) {
          r = isJungle ? 76 : 122;
          g = isJungle ? 128 : 138;
          b = isJungle ? 78 : 154;
        } else {
          r = isJungle ? 126 : 216;
          g = isJungle ? 168 : 230;
          b = isJungle ? 106 : 246;
        }

        const mod = Math.abs(h % 5);
        if (mod < 0.34 && h > WATER_LEVEL) {
          r = Math.min(255, r + 24);
          g = Math.min(255, g + 26);
          b = Math.min(255, b + 28);
        }

        data[idx] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(img, 0, 0);
    this.terrainMapCache = c;
    this.cachedMapBiome = biome;
    return c;
  }

  /**
   * Renders the rotating GTA-style circular Continental Radar showing elevation, 12 Trial Peaks, trail, orbs & avalanches.
   */
  public renderMinimap(snap: MinimapSnapshot): void {
    const ctx = this.minimapCtx;
    const w = this.minimapCanvas.width;
    const h = this.minimapCanvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const radius = w / 2 - 4;
    const mapZoom = 0.54;

    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.clip();

    ctx.fillStyle = '#0c161e';
    ctx.fillRect(0, 0, w, h);

    const rot = snap.heading - Math.PI;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);

    const cache = this.ensureTerrainMapCache(snap.biome);
    const cacheWorldSpan = WORLD_PLAY_RADIUS * 2.24;
    const drawSize = cacheWorldSpan * mapZoom;
    ctx.globalAlpha = 0.86;
    ctx.drawImage(
      cache,
      -snap.headX * mapZoom - drawSize / 2,
      -snap.headZ * mapZoom - drawSize / 2,
      drawSize,
      drawSize,
    );
    ctx.globalAlpha = 1;

    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(-snap.headX * mapZoom, -snap.headZ * mapZoom, WORLD_PLAY_RADIUS * mapZoom, 0, Math.PI * 2);
    ctx.stroke();

    for (const p of snap.portals) {
      const px = (p.x - snap.headX) * mapZoom;
      const pz = (p.z - snap.headZ) * mapZoom;
      ctx.strokeStyle = p.variant === 'A' ? '#2de3ff' : '#ff6be0';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(px, pz, 3.6, 0, Math.PI * 2);
      ctx.stroke();
    }

    for (const o of snap.orbs) {
      const ox = (o.x - snap.headX) * mapZoom;
      const oz = (o.z - snap.headZ) * mapZoom;
      if (ox * ox + oz * oz > radius * radius) continue;
      ctx.fillStyle = o.golden ? '#ffe066' : '#58e1ff';
      ctx.beginPath();
      ctx.arc(ox, oz, o.golden ? 2.8 : 1.9, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const b of snap.boulders) {
      const bx = (b.x - snap.headX) * mapZoom;
      const bz = (b.z - snap.headZ) * mapZoom;
      if (bx * bx + bz * bz > radius * radius) continue;
      ctx.fillStyle = '#ff5436';
      ctx.beginPath();
      ctx.arc(bx, bz, 2.9, 0, Math.PI * 2);
      ctx.fill();
    }

    // Active Ground Fissures (Soul Clan earth eruptions)
    for (const f of snap.fissures) {
      const fx = (f.x - snap.headX) * mapZoom;
      const fz = (f.z - snap.headZ) * mapZoom;
      if (fx * fx + fz * fz > radius * radius) continue;
      ctx.strokeStyle = f.isBoss ? '#e879f9' : '#38f2a8';
      ctx.lineWidth = f.isBoss ? 2.0 : 1.4;
      ctx.beginPath();
      ctx.arc(fx, fz, f.isBoss ? 5.6 : 4.2, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Wild Mountain Beasts, Peak Guardians & Soul Clan Ghosts
    for (const bst of snap.beasts) {
      const bx = (bst.x - snap.headX) * mapZoom;
      const bz = (bst.z - snap.headZ) * mapZoom;
      if (bx * bx + bz * bz > radius * radius) continue;
      if (bst.kind === 'soul_elder' || bst.kind === 'guardian') {
        const s = 4.8;
        ctx.fillStyle = bst.kind === 'soul_elder' ? '#e879f9' : bst.aggro ? '#ff5ef5' : '#c06bff';
        ctx.strokeStyle = bst.kind === 'soul_elder' ? '#38f2a8' : '#ffe066';
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        ctx.moveTo(bx, bz - s);
        ctx.lineTo(bx + s * 0.42, bz - s * 0.42);
        ctx.lineTo(bx + s, bz);
        ctx.lineTo(bx + s * 0.42, bz + s * 0.42);
        ctx.lineTo(bx, bz + s);
        ctx.lineTo(bx - s * 0.42, bz + s * 0.42);
        ctx.lineTo(bx - s, bz);
        ctx.lineTo(bx - s * 0.42, bz - s * 0.42);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (bst.faction === 'ghost_clan') {
        const s = 3.9;
        ctx.fillStyle = '#38f2a8';
        ctx.strokeStyle = '#3b0764';
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(bx, bz - s);
        ctx.lineTo(bx + s * 0.78, bz);
        ctx.lineTo(bx, bz + s);
        ctx.lineTo(bx - s * 0.78, bz);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        const s = bst.aggro ? 3.8 : 3.1;
        ctx.fillStyle = bst.aggro ? '#ff4f42' : '#ff9f43';
        ctx.strokeStyle = '#140908';
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(bx, bz - s);
        ctx.lineTo(bx + s * 0.9, bz + s * 0.8);
        ctx.lineTo(bx - s * 0.9, bz + s * 0.8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }

    // Active Magic Bolts
    for (const pr of snap.projectiles) {
      const px = (pr.x - snap.headX) * mapZoom;
      const pz = (pr.z - snap.headZ) * mapZoom;
      if (px * px + pz * pz > radius * radius) continue;
      ctx.fillStyle = pr.fromPlayer ? '#5ef2a8' : '#ff6b78';
      ctx.beginPath();
      ctx.arc(px, pz, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    if (snap.trail.length > 1) {
      ctx.strokeStyle = '#3de095';
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      for (const seg of snap.trail) {
        ctx.lineTo((seg.x - snap.headX) * mapZoom, (seg.z - snap.headZ) * mapZoom);
      }
      ctx.stroke();
    }

    const visitedSet = new Set(snap.visitedLandmarkIds);
    for (const lm of WORLD_LANDMARKS) {
      let lx = (lm.x - snap.headX) * mapZoom;
      let lz = (lm.z - snap.headZ) * mapZoom;
      const d = Math.hypot(lx, lz);
      const isNext = lm.id === snap.nextLandmarkId;
      const visited = visitedSet.has(lm.id);

      const maxR = radius - (isNext ? 7 : 9);
      if (d > maxR) {
        if (!isNext && d > radius * 2.4) continue;
        lx = (lx / d) * maxR;
        lz = (lz / d) * maxR;
      }

      const sz = isNext ? 5.6 : 3.4;
      ctx.fillStyle = isNext ? '#ffe46b' : visited ? 'rgba(94, 242, 168, 0.72)' : 'rgba(242, 193, 78, 0.65)';
      ctx.strokeStyle = isNext ? '#ffffff' : '#091015';
      ctx.lineWidth = isNext ? 1.5 : 1.0;
      ctx.beginPath();
      ctx.moveTo(lx, lz - sz);
      ctx.lineTo(lx + sz, lz);
      ctx.lineTo(lx, lz + sz);
      ctx.lineTo(lx - sz, lz);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();

    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#071014';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 6.5);
    ctx.lineTo(cx + 5, cy + 5.5);
    ctx.lineTo(cx, cy + 2.5);
    ctx.lineTo(cx - 5, cy + 5.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();

    ctx.strokeStyle = 'rgba(242, 193, 78, 0.68)';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();

    const northAngle = rot - Math.PI / 2;
    const nx = cx + Math.cos(northAngle) * (radius - 2);
    const ny = cy + Math.sin(northAngle) * (radius - 2);
    ctx.fillStyle = '#0b151e';
    ctx.beginPath();
    ctx.arc(nx, ny, 7.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f2c14e';
    ctx.font = 'bold 9px Plus Jakarta Sans, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', nx, ny + 0.5);
  }
}
