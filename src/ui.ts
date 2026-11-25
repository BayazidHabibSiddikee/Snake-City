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
  computeBossBarSegments,
  getMagicTierForLevel,
} from './evolution';
import {
  CHROMIUM_ENGINE_META,
  PORTAL_BOOKMARKS,
  PortalVariant,
  computeRollingTabOrbitLayout,
} from './browser';
import { ComplimentNotice, FloatingTauntNotice } from './compliments';
import { PRESET_FORMATIONS } from './formations';
import { ClimateLogNotice, SnakeGameController } from './game';
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
  private climateLogStackEl!: HTMLElement;
  private climateLogTimers = new Set<number>();
  private complimentBannerEl!: HTMLElement;
  private complimentLabelEl!: HTMLElement;
  private complimentTextEl!: HTMLElement;
  private complimentTimer = 0;
  private tauntBubbleEl!: HTMLElement;
  private tauntBadgeEl!: HTMLElement;
  private tauntTextEl!: HTMLElement;
  private tauntTimer = 0;
  private tauntBubbleActive = false;

  // Portal Chromium Browser & 3D Rolling Tab Otherworld nodes
  private portalBrowserModal!: HTMLElement;
  private chromiumTabListEl!: HTMLElement;
  private chromiumOmniboxForm!: HTMLFormElement;
  private chromiumOmniboxInput!: HTMLInputElement;
  private chromiumBackBtn!: HTMLButtonElement;
  private chromiumFwdBtn!: HTMLButtonElement;
  private chromiumProxyBtn!: HTMLButtonElement;
  private chromiumWarpBtn!: HTMLButtonElement;
  private chromiumPipBtn!: HTMLButtonElement;
  private chromiumOrbitToggleBtn!: HTMLButtonElement;
  private chromiumPortalABtn!: HTMLButtonElement;
  private chromiumPortalBBtn!: HTMLButtonElement;
  private chromiumBookmarksBarEl!: HTMLElement;
  private chromiumOtherworldEl!: HTMLElement;
  private chromiumOrbitStageEl!: HTMLElement;
  private chromiumViewportFrame!: HTMLIFrameElement;
  private chromiumStatusTextEl!: HTMLElement;
  private lastLoadedIframeKey = '';
  private portalBrowserPip = false;
  private portalWorldOrbitMode = true;
  private portalOrbitAngle = 0;
  private portalOrbitVel = 0.34;
  private portalOrbitRafId = 0;
  private portalOrbitHoverPaused = false;
  private portalOrbitLastPerf = 0;

  // Mobile Landscape, Virtual Moving Cursor & Arcade Fighting Skill nodes
  private mobileLeftClusterEl!: HTMLElement;
  private mobileActionRowEl!: HTMLElement;
  private mobileVirtualCursorEl!: HTMLElement;
  private mobileCursorPadEl!: HTMLElement;
  private mobileCursorPuckEl!: HTMLElement;
  private mobileSkill1Btn!: HTMLButtonElement;
  private mobileSkill1LabelEl!: HTMLElement;
  private mobileSkill1CdEl!: HTMLElement;
  private mobileSkill2Btn!: HTMLButtonElement;
  private mobileSkill2LabelEl!: HTMLElement;
  private mobileSkill2CdEl!: HTMLElement;
  private mobileSkill3Btn!: HTMLButtonElement;
  private mobileSkill3LabelEl!: HTMLElement;
  private mobileSkill3CdEl!: HTMLElement;
  private mobileSkill4Btn!: HTMLButtonElement;
  private mobileSkill4LabelEl!: HTMLElement;
  private mobileSkill4CdEl!: HTMLElement;
  private virtualCursorX = typeof window !== 'undefined' ? window.innerWidth * 0.5 : 640;
  private virtualCursorY = typeof window !== 'undefined' ? window.innerHeight * 0.42 : 320;
  private virtualCursorEnabled = false;

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
  private hostileBossHeaderEl!: HTMLElement;
  private hostileBossBadgeEl!: HTMLElement;
  private hostileBossTierEl!: HTMLElement;
  private hostileNameEl!: HTMLElement;
  private hostileHpTextEl!: HTMLElement;
  private hostileHpTrackEl!: HTMLElement;
  private hostileHpFillEl!: HTMLElement;
  private bossSegmentShellEl!: HTMLElement;
  private bossSegmentTrackEl!: HTMLElement;
  private bossHpLagFillEl!: HTMLElement;
  private bossSegmentMetaEl!: HTMLElement;
  private bossSegmentFills: HTMLElement[] = [];
  private lastBossTargetId: number | null = null;
  private bossLagPct = 100;
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

      <!-- TRANSIENT UPPER-CENTER CLIMATE NOTIFICATION LOG -->
      <div
        class="climate-log-stack hidden"
        id="climateLogStack"
        role="log"
        aria-live="polite"
        aria-relevant="additions text"
        aria-label="Climate updates"
      ></div>

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

      <!-- ENGAGED HOSTILE / BOSS MODE HEALTH BAR -->
      <div class="hostile-target-bar hidden" id="hostileBarWrap" aria-live="polite">
        <div class="boss-mode-header hidden" id="hostileBossHeader">
          <span class="boss-mode-badge" id="hostileBossBadge">
            <svg class="boss-crown-svg" viewBox="0 0 18 14" aria-hidden="true">
              <path d="M1.5 11.5L3 4l4 3.5L9 1.5l2 6L15 4l1.5 7.5z" fill="currentColor" />
            </svg>
            <span id="hostileBossBadgeText">BOSS MODE</span>
          </span>
          <span class="boss-mode-tier" id="hostileBossTier">Sovereign Crucible · 3.3× HP</span>
        </div>
        <div class="hostile-target-top">
          <span class="hostile-target-name" id="hostileName">Dire Ridge Wolf</span>
          <span class="hostile-target-hp" id="hostileHpText">200 / 200 HP</span>
        </div>
        <div class="hostile-hp-track" id="hostileHpTrack">
          <div class="hostile-hp-fill" id="hostileHpFill"></div>
        </div>
        <div class="boss-segment-shell hidden" id="bossSegmentShell">
          <div class="boss-hp-lag-fill" id="bossHpLagFill"></div>
          <div class="boss-segment-track" id="bossSegmentTrack"></div>
        </div>
        <div class="boss-segment-footer hidden" id="bossSegmentMeta"></div>
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
            <span class="dock-label">MOUNTAIN COURSE</span>
            <div class="dock-inline">
              <select id="builderPresetSelect" class="dark-select compact"></select>
              <button type="button" class="small-btn" id="builderBiomeBtn">Biome: Alpine</button>
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
          <p class="modal-sub">Catch your breath above the valley, inspect your Humanity Path stats, or review your expedition.</p>
          <div class="modal-actions">
            <button type="button" class="primary-cta" id="resumeBtn">Resume</button>
            <button type="button" class="secondary-cta" id="pausePortalBrowserBtn">🌐 Portal Chromium Browser (G)</button>
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

      <!-- LIVE GEMINI SERPENT COMPLIMENT WHISPER -->
      <div class="compliment-whisper hidden" id="complimentWhisper" role="status" aria-live="polite">
        <span class="compliment-label" id="complimentLabel">Mountain Spirit</span>
        <p class="compliment-text" id="complimentText"></p>
      </div>

      <!-- 3D-TRACKED FLOATING SERPENT COMBAT TAUNT SPEECH BUBBLE -->
      <div class="serpent-taunt-bubble hidden" id="serpentTauntBubble" role="status" aria-live="polite">
        <div class="taunt-bubble-card">
          <span class="taunt-bubble-badge" id="tauntBubbleBadge">VS PACK STALKER</span>
          <p class="taunt-bubble-text" id="tauntBubbleText"></p>
        </div>
        <span class="taunt-bubble-tail" aria-hidden="true"></span>
      </div>

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
          <div class="settings-section">
            <span class="settings-label">Mobile Touch Controls &amp; Virtual Cursor</span>
            <div class="settings-row">
              <button type="button" class="secondary-cta compact" id="toggleMobileControlsBtn">Toggle Touch Pad &amp; Cursor</button>
              <button type="button" class="secondary-cta compact" id="lockLandscapeSettingsBtn">⟳ Lock Landscape</button>
            </div>
          </div>
          <div class="modal-actions">
            <button type="button" class="primary-cta" id="closeSettingsBtn">Close</button>
          </div>
        </div>
      </div>

      <!-- PORTAL CHROMIUM MULTI-TAB BROWSER MODAL (OPENS WHEN ENTERING 3D PORTALS OR PRESSING [G]) -->
      <div class="chromium-portal-backdrop hidden" id="portalBrowserModal" role="dialog" aria-modal="true" aria-label="Portal Chromium Browser">
        <div class="chromium-window">
          <!-- CHROMIUM TOP TAB STRIP -->
          <div class="chromium-tabstrip-row">
            <div class="chromium-window-controls" aria-hidden="true">
              <span class="c-dot close"></span>
              <span class="c-dot min"></span>
              <span class="c-dot max"></span>
            </div>
            <div class="chromium-portal-channel-group" role="group" aria-label="Portal Channel">
              <button type="button" class="chromium-channel-btn active-a" id="chromiumPortalABtn" title="View Portal A Dimension">● Portal A</button>
              <button type="button" class="chromium-channel-btn" id="chromiumPortalBBtn" title="View Portal B Dimension">● Portal B</button>
            </div>
            <button type="button" class="chromium-orbit-mode-btn is-active" id="chromiumOrbitToggleBtn" title="Return to the 3D Rolling Tab Cosmos">🌌 Rolling Tab World</button>
            <div class="chromium-tabs-scroll" id="chromiumTabList" role="tablist"></div>
            <button type="button" class="chromium-newtab-btn" id="chromiumNewTabBtn" title="Spawn New Rolling Tab World" aria-label="New Tab">+</button>
            <div class="chromium-window-actions">
              <button type="button" class="chromium-win-btn" id="chromiumPipBtn" title="Dock Picture-in-Picture while playing">⧉ PiP Dock</button>
              <button type="button" class="chromium-win-btn close" id="chromiumCloseBtn" title="Close Portal Browser (Esc)">✕</button>
            </div>
          </div>

          <!-- CHROMIUM NAVIGATION & OMNIBOX BAR -->
          <div class="chromium-toolbar-row">
            <div class="chromium-nav-btns">
              <button type="button" class="chromium-nav-btn" id="chromiumBackBtn" title="Back" aria-label="Back">←</button>
              <button type="button" class="chromium-nav-btn" id="chromiumFwdBtn" title="Forward" aria-label="Forward">→</button>
              <button type="button" class="chromium-nav-btn" id="chromiumReloadBtn" title="Reload Tab" aria-label="Reload">↻</button>
              <button type="button" class="chromium-nav-btn" id="chromiumHomeBtn" title="Open 3D Rolling Tab Cosmos" aria-label="Home">🌌</button>
            </div>
            <form class="chromium-omnibox-form" id="chromiumOmniboxForm">
              <span class="chromium-omnibox-lock" aria-hidden="true">🔒</span>
              <input
                type="text"
                class="chromium-omnibox-input"
                id="chromiumOmniboxInput"
                placeholder="Search DuckDuckGo or enter URL to launch a rolling tab world..."
                autocomplete="off"
                spellcheck="false"
              />
              <button type="submit" class="chromium-omnibox-go">Enter World</button>
            </form>
            <div class="chromium-toolbar-right">
              <button type="button" class="chromium-proxy-btn is-on" id="chromiumProxyBtn" title="Toggle Server-Side Chromium Proxy vs Direct Iframe">Proxy: ON</button>
              <button type="button" class="chromium-warp-btn" id="chromiumWarpBtn" title="Physically teleport your serpent to the next Dimensional Portal across the mountain">⚡ Warp Next Portal ➔</button>
            </div>
          </div>

          <!-- CHROMIUM BOOKMARKS BAR -->
          <div class="chromium-bookmarks-bar" id="chromiumBookmarksBar"></div>

          <!-- CHROMIUM POCKET DIMENSION VIEWPORT: 3D ROLLING TAB COSMOS + LIVE WEB IFRAME -->
          <div class="chromium-viewport-wrap">
            <!-- OTHERWORLD 3D ROLLING TAB ORBIT ("ANOTHER WORLD INSIDE THE PORTAL") -->
            <div class="chromium-otherworld-cosmos" id="chromiumOtherworldCosmos">
              <div class="otherworld-nebula-bg" aria-hidden="true">
                <div class="otherworld-astrolabe-ring ring-outer"></div>
                <div class="otherworld-astrolabe-ring ring-mid"></div>
                <div class="otherworld-astrolabe-ring ring-inner"></div>
                <div class="otherworld-horizon-grid"></div>
              </div>

              <div class="otherworld-header-hud">
                <span class="otherworld-kicker">🌌 DIMENSIONAL PORTAL POCKET WORLD · CHROMIUM 131 MULTIVERSE</span>
                <h3 class="otherworld-title">Every Tab is Rolling Around in Orbit — Select Any Tab World to Enter</h3>
                <p class="otherworld-subtitle">Click or tap any orbiting tab portal below to dive into its live web world, drag/scroll to spin the orbit, or spawn a new tab.</p>
              </div>

              <!-- 3D PERSPECTIVE ORBIT STAGE WHERE EVERY TAB ROLLS AROUND -->
              <div class="otherworld-orbit-stage" id="chromiumOrbitStage" role="region" aria-label="3D Rolling Tabs Orbit"></div>

              <!-- ORBIT CONTROLS FOOTER -->
              <div class="otherworld-orbit-controls">
                <button type="button" class="otherworld-ctrl-btn" id="orbitSpinLeftBtn">⟲ Spin Left</button>
                <button type="button" class="otherworld-ctrl-btn primary" id="orbitEnterFrontBtn">⚡ Enter Front Tab World</button>
                <button type="button" class="otherworld-ctrl-btn" id="orbitSpawnTabBtn">+ New Rolling Tab</button>
                <button type="button" class="otherworld-ctrl-btn" id="orbitSpinRightBtn">⟳ Spin Right</button>
              </div>
            </div>

            <iframe
              id="chromiumViewportFrame"
              class="chromium-viewport-frame"
              title="Portal Chromium Active Tab"
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
            ></iframe>
          </div>

          <!-- CHROMIUM FOOTER STATUS BAR -->
          <div class="chromium-statusbar">
            <span class="chromium-status-left" id="chromiumStatusText">Chromium 131.0.6778.86 · Blink Portal Wormhole Compositor</span>
            <span class="chromium-status-right">Synced to 8 Colossal 3D Mountain Portals · Press [G] or [Esc] to return</span>
          </div>
        </div>
      </div>

      <!-- FIRST-RUN TUTORIAL OVERLAY -->
      <div class="tutorial-overlay hidden" id="tutorialOverlay" role="dialog" aria-modal="true">
        <div class="tutorial-card">
          <h2 class="tutorial-title">How to Play</h2>
          <ul class="tutorial-list">
            <li><span class="keycap">A / D</span> or left thumbpad to steer &amp; move virtual cursor</li>
            <li><span class="keycap">W / Space</span> to boost uphill (drains Stamina) · <span class="keycap">S</span> to brake</li>
            <li><span class="keycap">F / 1</span> Attack / Gun · <span class="keycap">Q / 2</span> Shockwave · <span class="keycap">E / 3</span> Dash · <span class="keycap">R / 4</span> Flame Lotus</li>
            <li>🌐 Slither into glowing 3D <strong>Portals</strong> (or press <span class="keycap">G</span>) to browse multi-tab <strong>Portal Chromium</strong> websites or warp across the peaks!</li>
            <li>Conquer all 12 Trial Peak Shrines to evolve into an Ascended Human</li>
            <li>⚠️ Severe climates shift automatically on every run &amp; mid-climb — seek Shrine Shelter to recover HP &amp; Qi</li>
          </ul>
          <button type="button" class="primary-cta" id="closeTutorialBtn">▶ Start Playing</button>
          <p style="margin:12px 0 0;font-size:12px;opacity:0.5;text-align:center">Press Enter or Escape to skip</p>
        </div>
      </div>

      <!-- MOBILE PORTRAIT-TO-LANDSCAPE ROTATION HELPER BANNER -->
      <div class="mobile-orientation-banner" id="mobileOrientationBanner">
        <span>📱 Rotate phone to <strong>Landscape</strong> for best 3D view, virtual cursor &amp; fighting skills</span>
        <div class="mobile-orientation-actions">
          <button type="button" class="mobile-orient-btn" id="mobileBannerLockLandscapeBtn">⟳ Lock Landscape</button>
          <button type="button" class="mobile-orient-close" id="mobileBannerDismissBtn" aria-label="Dismiss">✕</button>
        </div>
      </div>

      <!-- MOBILE ON-SCREEN MOVING VIRTUAL CURSOR -->
      <div class="mobile-virtual-cursor hidden" id="mobileVirtualCursor" aria-hidden="true">
        <div class="virtual-cursor-ring"></div>
        <div class="virtual-cursor-dot"></div>
      </div>

      <!-- MOBILE LEFT-THUMB MOVING CURSOR TRACKPAD & QUICK UTILITY BAR -->
      <div class="mobile-left-cluster hidden" id="mobileLeftCluster" aria-hidden="true">
        <div class="mobile-utility-pills">
          <button type="button" class="mobile-util-pill" id="mobileLandscapeBtn" title="Fullscreen & Lock Landscape">⟳ Landscape</button>
          <button type="button" class="mobile-util-pill portal" id="mobilePortalBtn" title="Open Portal Chromium Browser">🌐 Portal Tabs</button>
          <button type="button" class="mobile-util-pill click" id="mobileCursorClickBtn" title="Click or Fire at Virtual Cursor">🎯 Click</button>
        </div>
        <div class="mobile-cursor-pad" id="mobileCursorPad" aria-label="Virtual Cursor and Steering Trackpad">
          <span class="mobile-pad-label">CURSOR &amp; STEER</span>
          <div class="mobile-cursor-puck" id="mobileCursorPuck"></div>
        </div>
      </div>

      <!-- MOBILE RIGHT-THUMB ARCADE FIGHTING SKILLS + BOOST/BRAKE CLUSTER -->
      <div class="mobile-action-row hidden" id="mobileActionRow" aria-hidden="true">
        <div class="mobile-skills-grid">
          <button type="button" class="mobile-skill-btn s1" id="mobileSkill1Btn" aria-label="Primary Skill 1">
            <span class="mskill-cd" id="mobileSkill1Cd"></span>
            <span class="mskill-key">1</span>
            <span class="mskill-name" id="mobileSkill1Label">Fang Bolt</span>
          </button>
          <button type="button" class="mobile-skill-btn s2" id="mobileSkill2Btn" aria-label="Shockwave Skill 2">
            <span class="mskill-cd" id="mobileSkill2Cd"></span>
            <span class="mskill-key">2</span>
            <span class="mskill-name" id="mobileSkill2Label">Shockwave</span>
          </button>
          <button type="button" class="mobile-skill-btn s3" id="mobileSkill3Btn" aria-label="Dash Skill 3">
            <span class="mskill-cd" id="mobileSkill3Cd"></span>
            <span class="mskill-key">3</span>
            <span class="mskill-name" id="mobileSkill3Label">Coil Dash</span>
          </button>
          <button type="button" class="mobile-skill-btn s4" id="mobileSkill4Btn" aria-label="Ultimate Skill 4">
            <span class="mskill-cd" id="mobileSkill4Cd"></span>
            <span class="mskill-key">4</span>
            <span class="mskill-name" id="mobileSkill4Label">Flame Lotus</span>
          </button>
        </div>
        <div class="mobile-drive-col">
          <button type="button" class="mobile-action-btn accent" id="mobileBoostBtn" aria-label="Boost">▲ Boost</button>
          <button type="button" class="mobile-action-btn" id="mobileBrakeBtn" aria-label="Brake">▼ Brake</button>
        </div>
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
    this.climateLogStackEl = uiLayer.querySelector('#climateLogStack')!;
    this.complimentBannerEl = uiLayer.querySelector('#complimentWhisper')!;
    this.complimentLabelEl = uiLayer.querySelector('#complimentLabel')!;
    this.complimentTextEl = uiLayer.querySelector('#complimentText')!;
    this.tauntBubbleEl = uiLayer.querySelector('#serpentTauntBubble')!;
    this.tauntBadgeEl = uiLayer.querySelector('#tauntBubbleBadge')!;
    this.tauntTextEl = uiLayer.querySelector('#tauntBubbleText')!;
    this.settingsModal = uiLayer.querySelector('#settingsModal')!;
    this.tutorialOverlay = uiLayer.querySelector('#tutorialOverlay')!;

    this.portalBrowserModal = uiLayer.querySelector('#portalBrowserModal')!;
    this.chromiumTabListEl = uiLayer.querySelector('#chromiumTabList')!;
    this.chromiumOmniboxForm = uiLayer.querySelector('#chromiumOmniboxForm')!;
    this.chromiumOmniboxInput = uiLayer.querySelector('#chromiumOmniboxInput')!;
    this.chromiumBackBtn = uiLayer.querySelector('#chromiumBackBtn')!;
    this.chromiumFwdBtn = uiLayer.querySelector('#chromiumFwdBtn')!;
    this.chromiumProxyBtn = uiLayer.querySelector('#chromiumProxyBtn')!;
    this.chromiumWarpBtn = uiLayer.querySelector('#chromiumWarpBtn')!;
    this.chromiumPipBtn = uiLayer.querySelector('#chromiumPipBtn')!;
    this.chromiumOrbitToggleBtn = uiLayer.querySelector('#chromiumOrbitToggleBtn')!;
    this.chromiumPortalABtn = uiLayer.querySelector('#chromiumPortalABtn')!;
    this.chromiumPortalBBtn = uiLayer.querySelector('#chromiumPortalBBtn')!;
    this.chromiumBookmarksBarEl = uiLayer.querySelector('#chromiumBookmarksBar')!;
    this.chromiumOtherworldEl = uiLayer.querySelector('#chromiumOtherworldCosmos')!;
    this.chromiumOrbitStageEl = uiLayer.querySelector('#chromiumOrbitStage')!;
    this.chromiumViewportFrame = uiLayer.querySelector('#chromiumViewportFrame')!;
    this.chromiumStatusTextEl = uiLayer.querySelector('#chromiumStatusText')!;

    this.mobileLeftClusterEl = uiLayer.querySelector('#mobileLeftCluster')!;
    this.mobileActionRowEl = uiLayer.querySelector('#mobileActionRow')!;
    this.mobileVirtualCursorEl = uiLayer.querySelector('#mobileVirtualCursor')!;
    this.mobileCursorPadEl = uiLayer.querySelector('#mobileCursorPad')!;
    this.mobileCursorPuckEl = uiLayer.querySelector('#mobileCursorPuck')!;
    this.mobileSkill1Btn = uiLayer.querySelector('#mobileSkill1Btn')!;
    this.mobileSkill1LabelEl = uiLayer.querySelector('#mobileSkill1Label')!;
    this.mobileSkill1CdEl = uiLayer.querySelector('#mobileSkill1Cd')!;
    this.mobileSkill2Btn = uiLayer.querySelector('#mobileSkill2Btn')!;
    this.mobileSkill2LabelEl = uiLayer.querySelector('#mobileSkill2Label')!;
    this.mobileSkill2CdEl = uiLayer.querySelector('#mobileSkill2Cd')!;
    this.mobileSkill3Btn = uiLayer.querySelector('#mobileSkill3Btn')!;
    this.mobileSkill3LabelEl = uiLayer.querySelector('#mobileSkill3Label')!;
    this.mobileSkill3CdEl = uiLayer.querySelector('#mobileSkill3Cd')!;
    this.mobileSkill4Btn = uiLayer.querySelector('#mobileSkill4Btn')!;
    this.mobileSkill4LabelEl = uiLayer.querySelector('#mobileSkill4Label')!;
    this.mobileSkill4CdEl = uiLayer.querySelector('#mobileSkill4Cd')!;

    // Show mobile touch controls, fighting skill buttons & virtual cursor on touch devices or mobile viewports
    const isTouchOrMobile =
      window.matchMedia('(pointer: coarse)').matches || window.innerWidth <= 920;
    if (isTouchOrMobile) {
      this.setMobileControlsEnabled(true);
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
    this.hostileBossHeaderEl = uiLayer.querySelector('#hostileBossHeader')!;
    this.hostileBossBadgeEl = uiLayer.querySelector('#hostileBossBadgeText')!;
    this.hostileBossTierEl = uiLayer.querySelector('#hostileBossTier')!;
    this.hostileNameEl = uiLayer.querySelector('#hostileName')!;
    this.hostileHpTextEl = uiLayer.querySelector('#hostileHpText')!;
    this.hostileHpTrackEl = uiLayer.querySelector('#hostileHpTrack')!;
    this.hostileHpFillEl = uiLayer.querySelector('#hostileHpFill')!;
    this.bossSegmentShellEl = uiLayer.querySelector('#bossSegmentShell')!;
    this.bossSegmentTrackEl = uiLayer.querySelector('#bossSegmentTrack')!;
    this.bossHpLagFillEl = uiLayer.querySelector('#bossHpLagFill')!;
    this.bossSegmentMetaEl = uiLayer.querySelector('#bossSegmentMeta')!;
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
    this.root.querySelector('#pausePortalBrowserBtn')!.addEventListener('click', () => {
      this.pauseModal.classList.add('hidden');
      this.openPortalBrowserModal();
    });
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
    // "Begin Adventure" dismisses tutorial AND immediately starts the game
    this.root.querySelector('#closeTutorialBtn')!.addEventListener('click', () => {
      this.tutorialOverlay.classList.add('hidden');
      this.game.setModalFreeze(false);
      localStorage.setItem('SERPENT_PEAKS_TUTORIAL_SEEN', '1');
      this.game.startGame();
    });
    // Also allow pressing Escape or Enter to dismiss
    document.addEventListener('keydown', (e) => {
      if (!this.tutorialOverlay.classList.contains('hidden') &&
          (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ')) {
        this.tutorialOverlay.classList.add('hidden');
        this.game.setModalFreeze(false);
        localStorage.setItem('SERPENT_PEAKS_TUTORIAL_SEEN', '1');
        this.game.startGame();
      }
    });

    // --- Mobile Boost / Brake, Fighting Skills, Landscape Lock, Virtual Cursor & Portal Chromium Browser ---
    const mobileBoostBtn = this.root.querySelector<HTMLButtonElement>('#mobileBoostBtn');
    const mobileBrakeBtn = this.root.querySelector<HTMLButtonElement>('#mobileBrakeBtn');
    if (mobileBoostBtn) {
      mobileBoostBtn.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        this.game.setBoostHeld(true);
      });
      mobileBoostBtn.addEventListener('pointerup', () => this.game.setBoostHeld(false));
      mobileBoostBtn.addEventListener('pointercancel', () => this.game.setBoostHeld(false));
    }
    if (mobileBrakeBtn) {
      mobileBrakeBtn.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        this.game.setBrakeHeld(true);
      });
      mobileBrakeBtn.addEventListener('pointerup', () => this.game.setBrakeHeld(false));
      mobileBrakeBtn.addEventListener('pointercancel', () => this.game.setBrakeHeld(false));
    }

    this.mobileSkill1Btn.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this.game.castPrimaryMagic();
    });
    this.mobileSkill2Btn.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this.game.castShockwave();
    });
    this.mobileSkill3Btn.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this.game.castDashStrike();
    });
    this.mobileSkill4Btn.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this.game.castUltimateLotus();
    });

    this.bindMobileCursorAndLandscapeEvents();
    this.bindPortalChromiumEvents();

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
    const portalBlocking =
      !this.portalBrowserModal.classList.contains('hidden') && !this.portalBrowserPip;
    const anyBlockingModal =
      portalBlocking ||
      !this.bestiaryModal.classList.contains('hidden') ||
      !this.journeyModal.classList.contains('hidden') ||
      !this.evolutionSummaryModal.classList.contains('hidden');
    this.game.setModalFreeze(anyBlockingModal);
  }

  public isModalOpen(): boolean {
    return (
      (!this.portalBrowserModal.classList.contains('hidden') && !this.portalBrowserPip) ||
      !this.shareModal.classList.contains('hidden') ||
      !this.journeyModal.classList.contains('hidden') ||
      !this.evolutionSummaryModal.classList.contains('hidden') ||
      !this.bestiaryModal.classList.contains('hidden')
    );
  }

  public isPortalBrowserOpen(): boolean {
    return !this.portalBrowserModal.classList.contains('hidden');
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
    this.portalBrowserModal.classList.add('hidden');
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

  public pushClimateNotice(notice: ClimateLogNotice): void {
    const stack = this.climateLogStackEl;
    if (!stack) return;

    const entry = document.createElement('div');
    entry.className = `climate-log-entry climate-${notice.weather} severity-${notice.severity}`;

    const messageEl = document.createElement('div');
    messageEl.className = 'climate-log-message';
    messageEl.textContent = notice.message;

    const metaEl = document.createElement('div');
    metaEl.className = 'climate-log-meta';
    metaEl.textContent = `${notice.label} · ${notice.effectNote}`;

    const timerLineEl = document.createElement('div');
    timerLineEl.className = 'climate-log-timer';
    timerLineEl.setAttribute('aria-hidden', 'true');

    entry.appendChild(messageEl);
    entry.appendChild(metaEl);
    entry.appendChild(timerLineEl);

    // Prepend newest notice at top of the log stack
    stack.prepend(entry);
    stack.classList.remove('hidden');

    const dismissEntry = (node: HTMLElement) => {
      if (!node.isConnected || node.classList.contains('is-leaving')) return;
      node.classList.add('is-leaving');
      const removeTimer = window.setTimeout(() => {
        this.climateLogTimers.delete(removeTimer);
        node.remove();
        if (stack.childElementCount === 0) {
          stack.classList.add('hidden');
        }
      }, 340);
      this.climateLogTimers.add(removeTimer);
    };

    // Cap visible active notices at 3 so the upper viewport stays uncluttered
    const activeNodes = Array.from(stack.children).filter(
      (child): child is HTMLElement =>
        child instanceof HTMLElement && !child.classList.contains('is-leaving'),
    );
    while (activeNodes.length > 3) {
      const oldest = activeNodes.pop();
      if (oldest) dismissEntry(oldest);
    }

    const holdMs = 5200;
    const fadeTimer = window.setTimeout(() => {
      this.climateLogTimers.delete(fadeTimer);
      dismissEntry(entry);
    }, holdMs);
    this.climateLogTimers.add(fadeTimer);
  }

  public clearClimateNotices(): void {
    for (const timerId of this.climateLogTimers) {
      window.clearTimeout(timerId);
    }
    this.climateLogTimers.clear();
    if (this.climateLogStackEl) {
      this.climateLogStackEl.replaceChildren();
      this.climateLogStackEl.classList.add('hidden');
    }
  }

  public showCompliment(notice: ComplimentNotice): void {
    if (!this.complimentBannerEl) return;
    window.clearTimeout(this.complimentTimer);
    this.complimentLabelEl.textContent = notice.label;
    this.complimentTextEl.textContent = notice.text;
    this.complimentBannerEl.classList.toggle('is-error', Boolean(notice.isError));
    this.complimentBannerEl.classList.remove('hidden', 'is-leaving');
    // Restart subtle entrance animation cleanly
    void this.complimentBannerEl.offsetWidth;
    this.complimentBannerEl.classList.add('is-visible');

    const durationMs = notice.isError ? 4600 : 6800;
    this.complimentTimer = window.setTimeout(() => {
      this.complimentBannerEl.classList.add('is-leaving');
      this.complimentTimer = window.setTimeout(() => {
        this.complimentBannerEl.classList.add('hidden');
        this.complimentBannerEl.classList.remove('is-visible', 'is-leaving');
      }, 340);
    }, durationMs);
  }

  public clearCompliment(): void {
    window.clearTimeout(this.complimentTimer);
    if (this.complimentBannerEl) {
      this.complimentBannerEl.classList.add('hidden');
      this.complimentBannerEl.classList.remove('is-visible', 'is-leaving');
    }
  }

  public showCombatTaunt(notice: FloatingTauntNotice): void {
    if (!this.tauntBubbleEl) return;
    window.clearTimeout(this.tauntTimer);
    this.tauntBubbleActive = true;
    this.tauntBadgeEl.textContent = notice.badgeLabel;
    this.tauntTextEl.textContent = notice.text;
    this.tauntBubbleEl.style.setProperty('--taunt-accent', notice.accentHex);
    this.tauntBubbleEl.dataset.enemyKind = notice.enemyKind;
    this.tauntBubbleEl.dataset.moment = notice.moment;
    this.tauntBubbleEl.classList.toggle('is-error', Boolean(notice.isError));
    this.tauntBubbleEl.classList.remove('hidden', 'is-leaving');
    void this.tauntBubbleEl.offsetWidth;
    this.tauntBubbleEl.classList.add('is-visible');

    const durationMs = notice.isError ? 3600 : 4400;
    this.tauntTimer = window.setTimeout(() => {
      this.tauntBubbleEl.classList.add('is-leaving');
      this.tauntTimer = window.setTimeout(() => {
        this.tauntBubbleActive = false;
        this.tauntBubbleEl.classList.add('hidden');
        this.tauntBubbleEl.classList.remove('is-visible', 'is-leaving');
      }, 280);
    }, durationMs);
  }

  public updateTauntBubblePosition(pos: { x: number; y: number; visible: boolean }): void {
    if (!this.tauntBubbleEl || !this.tauntBubbleActive) return;
    this.tauntBubbleEl.style.setProperty('--taunt-x', `${pos.x.toFixed(1)}px`);
    this.tauntBubbleEl.style.setProperty('--taunt-y', `${pos.y.toFixed(1)}px`);
    this.tauntBubbleEl.classList.toggle('is-offscreen', !pos.visible);
  }

  public clearCombatTaunt(): void {
    window.clearTimeout(this.tauntTimer);
    this.tauntBubbleActive = false;
    if (this.tauntBubbleEl) {
      this.tauntBubbleEl.classList.add('hidden');
      this.tauntBubbleEl.classList.remove('is-visible', 'is-leaving', 'is-offscreen');
    }
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
    if (snap.mode !== 'playing') {
      this.clearCombatTaunt();
    }

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
    this.evoRealmEl.textContent = `${snap.realmName} · ${snap.difficultyHpMult.toFixed(1)}×`;
    const evoBox = this.root.querySelector<HTMLElement>('#hudEvoTrigger');
    if (evoBox) {
      evoBox.title = `${snap.difficultyTierLabel} · Enemy HP ${snap.difficultyHpMult.toFixed(2)}× · Enemy DMG ${snap.difficultyDamageMult.toFixed(2)}× — Click to inspect Humanity Path`;
    }
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
      this.envHazardEl.textContent = `${snap.weatherLabel} · Shrine Shelter (Restoring HP & Qi)`;
    } else if (snap.envHpDrainPerSec > 0) {
      this.envHazardEl.textContent = `${snap.weatherLabel} · ${snap.envHazardName} · -${snap.envHpDrainPerSec.toFixed(1)} HP/s`;
    } else {
      this.envHazardEl.textContent = `${snap.weatherLabel} · ${snap.envHazardName} · Safe Climate`;
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

    // Engaged hostile / Boss Mode health bar (top-center)
    const showHostile = snap.mode === 'playing' && snap.nearbyHostileName !== null;
    this.hostileBarWrap.classList.toggle('hidden', !showHostile);

    // Keep upper-center climate log & lower-center compliment whisper clean outside gameplay
    const allowClimateLog = snap.mode === 'playing' || snap.mode === 'paused';
    if (!allowClimateLog) {
      if (this.climateLogStackEl.childElementCount > 0) {
        this.clearClimateNotices();
      }
      if (!this.complimentBannerEl.classList.contains('hidden')) {
        this.clearCompliment();
      }
    } else {
      const isBossOverlay = showHostile && (snap.nearbyHostileIsHighTier || snap.nearbyHostileBoss);
      this.climateLogStackEl.classList.toggle('has-ambush', showAmbush && !showHostile);
      this.climateLogStackEl.classList.toggle('has-hostile', showHostile && !isBossOverlay);
      this.climateLogStackEl.classList.toggle('has-boss', isBossOverlay);
    }

    if (showHostile && snap.nearbyHostileName) {
      const isGhost = snap.nearbyHostileFaction === 'ghost_clan';
      const isBossMode = snap.nearbyHostileIsHighTier || snap.nearbyHostileBoss;
      // Purple glow for Soul Clan bosses/wraiths & arcane elders; Gold glow for Peak Guardians & Apex wild beasts
      const usePurpleGlow = isGhost || snap.nearbyHostileKind === 'soul_elder' || snap.nearbyHostileKind === 'wraith';
      const curHp = Math.max(0, Math.ceil(snap.nearbyHostileHp));
      const maxHp = Math.max(1, Math.ceil(snap.nearbyHostileMaxHp));
      const hpPct = Math.max(0, Math.min(100, (snap.nearbyHostileHp / maxHp) * 100));

      this.hostileBarWrap.classList.toggle('is-boss', snap.nearbyHostileBoss);
      this.hostileBarWrap.classList.toggle('is-ghost', isGhost);
      this.hostileBarWrap.classList.toggle('is-boss-mode', isBossMode);
      this.hostileBarWrap.classList.toggle('boss-theme-purple', isBossMode && usePurpleGlow);
      this.hostileBarWrap.classList.toggle('boss-theme-gold', isBossMode && !usePurpleGlow);
      this.hostileBarWrap.classList.toggle('is-critical', isBossMode && hpPct <= 25);

      this.hostileBossHeaderEl.classList.toggle('hidden', !isBossMode);
      this.hostileHpTrackEl.classList.toggle('hidden', isBossMode);
      this.bossSegmentShellEl.classList.toggle('hidden', !isBossMode);
      this.bossSegmentMetaEl.classList.toggle('hidden', !isBossMode);

      if (isBossMode) {
        if (this.lastBossTargetId !== snap.nearbyHostileId) {
          this.lastBossTargetId = snap.nearbyHostileId;
          this.bossLagPct = hpPct;
        } else {
          this.bossLagPct = hpPct > this.bossLagPct ? hpPct : this.bossLagPct + (hpPct - this.bossLagPct) * 0.22;
        }
        this.bossHpLagFillEl.style.width = `${this.bossLagPct.toFixed(1)}%`;

        this.hostileBossBadgeEl.textContent = snap.nearbyHostileBoss
          ? isGhost
            ? 'BOSS MODE · SOUL HALL'
            : 'BOSS MODE · GUARDIAN'
          : isGhost
            ? 'HIGH-TIER · SOUL CLAN'
            : 'HIGH-TIER · APEX FOE';
        this.hostileBossTierEl.textContent = `${snap.difficultyTierLabel} · ${snap.nearbyHostileHpMult.toFixed(1)}× HP · ${snap.difficultyDamageMult.toFixed(1)}× ATK`;

        this.hostileNameEl.textContent = snap.nearbyHostileName;
        this.hostileHpTextEl.textContent = `${curHp.toLocaleString()} / ${maxHp.toLocaleString()} HP`;

        const segs = computeBossBarSegments(maxHp, curHp, snap.nearbyHostileHpMult, snap.nearbyHostileBoss);
        if (this.bossSegmentFills.length !== segs.segmentCount) {
          this.bossSegmentTrackEl.innerHTML = '';
          this.bossSegmentFills = [];
          this.bossSegmentTrackEl.style.setProperty('--boss-seg-count', String(segs.segmentCount));
          for (let i = 0; i < segs.segmentCount; i++) {
            const cell = document.createElement('div');
            cell.className = 'boss-hp-seg';
            const fill = document.createElement('div');
            fill.className = 'boss-hp-seg-fill';
            cell.appendChild(fill);
            this.bossSegmentTrackEl.appendChild(cell);
            this.bossSegmentFills.push(fill);
          }
        }
        for (let i = 0; i < segs.segmentCount; i++) {
          const pct = Math.round(segs.segmentFills[i] * 1000) / 10;
          const fillEl = this.bossSegmentFills[i];
          fillEl.style.width = `${pct}%`;
          fillEl.parentElement?.classList.toggle('is-empty', pct <= 0.1);
          fillEl.parentElement?.classList.toggle('is-active-edge', pct > 0.1 && pct < 99.9);
        }
        this.bossSegmentMetaEl.textContent = `${segs.activeSegments} / ${segs.segmentCount} SEGMENTS · ~${Math.round(segs.hpPerSegment)} HP/BAR`;
      } else {
        this.lastBossTargetId = null;
        const prefix = isGhost ? 'Soul Clan · ' : '';
        this.hostileNameEl.textContent = `${prefix}${snap.nearbyHostileName}`;
        this.hostileHpTextEl.textContent = `${curHp} / ${maxHp} HP · ${snap.difficultyDamageMult.toFixed(1)}× ATK`;
        this.hostileHpFillEl.style.width = `${hpPct.toFixed(1)}%`;
      }
    } else {
      this.lastBossTargetId = null;
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

    // Sync Mobile Arcade Fighting Skill Buttons
    this.mobileSkill1LabelEl.textContent = snap.primarySpellName;
    this.mobileSkill1CdEl.style.height = `${(snap.primaryCooldownFrac * 100).toFixed(1)}%`;
    this.mobileSkill1Btn.classList.toggle('is-ready', snap.primaryCooldownFrac <= 0.01);

    this.mobileSkill2LabelEl.textContent = snap.shockwaveName;
    this.mobileSkill2CdEl.style.height = `${(snap.shockwaveCooldownFrac * 100).toFixed(1)}%`;
    this.mobileSkill2Btn.classList.toggle('is-ready', snap.shockwaveCooldownFrac <= 0.01);

    this.mobileSkill3LabelEl.textContent = `${snap.dashSkillName} (${snap.dashQiCost})`;
    this.mobileSkill3CdEl.style.height = `${(snap.dashCooldownFrac * 100).toFixed(1)}%`;
    this.mobileSkill3Btn.classList.toggle('is-ready', snap.dashCooldownFrac <= 0.01 && dashHasQi);
    this.mobileSkill3Btn.classList.toggle('no-qi', !dashHasQi);

    this.mobileSkill4LabelEl.textContent = `${snap.ultimateSkillName} (${snap.ultimateQiCost})`;
    this.mobileSkill4CdEl.style.height = `${(snap.ultimateCooldownFrac * 100).toFixed(1)}%`;
    this.mobileSkill4Btn.classList.toggle('is-ready', snap.ultimateCooldownFrac <= 0.01 && ultHasQi);
    this.mobileSkill4Btn.classList.toggle('no-qi', !ultHasQi);

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

    this.root.querySelectorAll<HTMLButtonElement>('.biome-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.biome === snap.biome);
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

  // ==================== MOBILE LANDSCAPE, MOVING CURSOR & ARCADE CONTROLS ====================

  public setMobileControlsEnabled(enabled: boolean): void {
    this.virtualCursorEnabled = enabled;
    this.mobileLeftClusterEl.classList.toggle('hidden', !enabled);
    this.mobileLeftClusterEl.setAttribute('aria-hidden', enabled ? 'false' : 'true');
    this.mobileActionRowEl.classList.toggle('hidden', !enabled);
    this.mobileActionRowEl.setAttribute('aria-hidden', enabled ? 'false' : 'true');
    this.mobileVirtualCursorEl.classList.toggle('hidden', !enabled);
    this.mobileVirtualCursorEl.setAttribute('aria-hidden', enabled ? 'false' : 'true');
    if (enabled) {
      this.virtualCursorX = Math.max(40, Math.min(window.innerWidth - 40, this.virtualCursorX));
      this.virtualCursorY = Math.max(40, Math.min(window.innerHeight - 40, this.virtualCursorY));
      this.updateVirtualCursorPosition();
    }
  }

  private updateVirtualCursorPosition(): void {
    this.mobileVirtualCursorEl.style.transform = `translate3d(${this.virtualCursorX.toFixed(1)}px, ${this.virtualCursorY.toFixed(1)}px, 0) translate(-50%, -50%)`;
  }

  public async requestLandscapeMode(): Promise<void> {
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen().catch(() => {});
      }
      const orient = (screen as Screen & { orientation?: { lock?: (mode: string) => Promise<void> } })
        .orientation;
      if (orient && typeof orient.lock === 'function') {
        await orient.lock('landscape');
      }
      this.root.querySelector('#mobileOrientationBanner')?.classList.add('hidden');
      this.setMobileControlsEnabled(true);
      this.showToast('Landscape Arcade Mode & Virtual Cursor active!');
    } catch {
      this.root.querySelector('#mobileOrientationBanner')?.classList.add('hidden');
      this.setMobileControlsEnabled(true);
      this.showToast('Rotate your phone horizontally for full Landscape view!');
    }
  }

  private triggerVirtualCursorAction(): void {
    this.mobileVirtualCursorEl.classList.add('is-clicking');
    window.setTimeout(() => this.mobileVirtualCursorEl.classList.remove('is-clicking'), 180);

    // Temporarily hide cursor overlay to hit-test the element underneath
    const prevDisplay = this.mobileVirtualCursorEl.style.display;
    this.mobileVirtualCursorEl.style.display = 'none';
    const hitEl = document.elementFromPoint(this.virtualCursorX, this.virtualCursorY) as HTMLElement | null;
    this.mobileVirtualCursorEl.style.display = prevDisplay;

    if (
      hitEl &&
      (hitEl.tagName === 'BUTTON' ||
        hitEl.tagName === 'A' ||
        hitEl.tagName === 'INPUT' ||
        hitEl.tagName === 'SELECT' ||
        hitEl.closest('button, a, .bestiary-row, .chromium-tab'))
    ) {
      const clickable =
        (hitEl.closest('button, a, .bestiary-row, .chromium-tab') as HTMLElement | null) || hitEl;
      clickable.click();
      if (clickable instanceof HTMLInputElement) {
        clickable.focus();
      }
      return;
    }

    // If over the 3D game world while playing, fire primary fighting skill / hand cannon!
    if (this.game.getMode() === 'playing') {
      this.game.castPrimaryMagic();
    }
  }

  private bindMobileCursorAndLandscapeEvents(): void {
    const toggleBtn = this.root.querySelector<HTMLButtonElement>('#toggleMobileControlsBtn');
    toggleBtn?.addEventListener('click', () => {
      this.setMobileControlsEnabled(!this.virtualCursorEnabled);
      this.showToast(
        this.virtualCursorEnabled
          ? 'Mobile Virtual Cursor & Fighting Skill Buttons enabled!'
          : 'Mobile Virtual Cursor hidden.',
      );
    });

    const lockBtns = [
      this.root.querySelector<HTMLButtonElement>('#mobileLandscapeBtn'),
      this.root.querySelector<HTMLButtonElement>('#lockLandscapeSettingsBtn'),
      this.root.querySelector<HTMLButtonElement>('#mobileBannerLockLandscapeBtn'),
    ];
    for (const btn of lockBtns) {
      btn?.addEventListener('click', (e) => {
        e.stopPropagation();
        void this.requestLandscapeMode();
      });
    }

    this.root.querySelector('#mobileBannerDismissBtn')?.addEventListener('click', () => {
      this.root.querySelector('#mobileOrientationBanner')?.classList.add('hidden');
    });

    this.root.querySelector('#mobilePortalBtn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.togglePortalBrowserModal();
    });

    this.root.querySelector('#mobileCursorClickBtn')?.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this.triggerVirtualCursorAction();
    });

    // Virtual Cursor & Steer Trackpad
    let padActive = false;
    let padPointerId = -1;
    let padStartX = 0;
    let padStartY = 0;
    let padMovedDist = 0;

    const updatePadFromPointer = (clientX: number, clientY: number) => {
      const rect = this.mobileCursorPadEl.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const maxR = Math.max(24, rect.width * 0.38);
      const dx = clientX - cx;
      const dy = clientY - cy;
      const dist = Math.hypot(dx, dy);
      const clampedR = Math.min(maxR, dist);
      const ang = Math.atan2(dy, dx);
      const px = Math.cos(ang) * clampedR;
      const py = Math.sin(ang) * clampedR;

      this.mobileCursorPuckEl.style.transform = `translate3d(${px.toFixed(1)}px, ${py.toFixed(1)}px, 0)`;

      const normX = px / maxR; // -1..+1
      const normY = py / maxR; // -1..+1

      // Steer serpent in 3D when playing
      this.game.setTouchSteerAxis(-normX);

      // Glide on-screen virtual cursor smoothly across viewport
      this.virtualCursorX = Math.max(
        18,
        Math.min(window.innerWidth - 18, this.virtualCursorX + normX * 13.5),
      );
      this.virtualCursorY = Math.max(
        18,
        Math.min(window.innerHeight - 18, this.virtualCursorY + normY * 13.5),
      );
      this.updateVirtualCursorPosition();
    };

    this.mobileCursorPadEl.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      padActive = true;
      padPointerId = e.pointerId;
      padStartX = e.clientX;
      padStartY = e.clientY;
      padMovedDist = 0;
      this.mobileCursorPadEl.setPointerCapture(e.pointerId);
      updatePadFromPointer(e.clientX, e.clientY);
    });

    this.mobileCursorPadEl.addEventListener('pointermove', (e) => {
      if (!padActive || e.pointerId !== padPointerId) return;
      e.stopPropagation();
      padMovedDist += Math.hypot(e.clientX - padStartX, e.clientY - padStartY);
      padStartX = e.clientX;
      padStartY = e.clientY;
      updatePadFromPointer(e.clientX, e.clientY);
    });

    const endPad = (e: PointerEvent) => {
      if (!padActive || e.pointerId !== padPointerId) return;
      padActive = false;
      padPointerId = -1;
      this.mobileCursorPuckEl.style.transform = 'translate3d(0px, 0px, 0)';
      this.game.setTouchSteerAxis(0);
      if (padMovedDist < 10) {
        this.triggerVirtualCursorAction();
      }
    };
    this.mobileCursorPadEl.addEventListener('pointerup', endPad);
    this.mobileCursorPadEl.addEventListener('pointercancel', endPad);
  }

  // ==================== PORTAL CHROMIUM MULTI-TAB BROWSER & 3D ROLLING TAB OTHERWORLD ====================

  private bindPortalChromiumEvents(): void {
    // Render bookmarks bar once
    this.chromiumBookmarksBarEl.innerHTML = PORTAL_BOOKMARKS.map(
      (b) => `
        <button type="button" class="chromium-bookmark-chip" data-burl="${b.url}">
          <span class="cbm-badge" style="color:${b.accentHex}">${b.badge}</span>
          <span>${b.title}</span>
        </button>
      `,
    ).join('');

    this.chromiumBookmarksBarEl.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.chromium-bookmark-chip');
      if (!btn || !btn.dataset.burl) return;
      this.game.sound.playClick();
      this.game.portalBrowser.navigateActiveTab(btn.dataset.burl);
      this.portalWorldOrbitMode = false;
      this.renderPortalChromiumBrowser(true);
    });

    this.chromiumOrbitToggleBtn.addEventListener('click', () => {
      this.game.sound.playClick();
      this.portalWorldOrbitMode = !this.portalWorldOrbitMode;
      this.renderPortalChromiumBrowser(false);
    });

    this.chromiumTabListEl.addEventListener('click', (e) => {
      const closeBtn = (e.target as HTMLElement).closest<HTMLButtonElement>('.chromium-tab-close');
      if (closeBtn && closeBtn.dataset.closeid) {
        e.stopPropagation();
        this.game.sound.playClick();
        this.game.portalBrowser.closeTab(closeBtn.dataset.closeid);
        this.renderPortalChromiumBrowser(true);
        return;
      }
      const tabBtn = (e.target as HTMLElement).closest<HTMLElement>('.chromium-tab');
      if (tabBtn && tabBtn.dataset.tabid) {
        this.game.sound.playClick();
        const prevId = this.game.portalBrowser.getActiveTab().id;
        this.game.portalBrowser.activateTab(tabBtn.dataset.tabid);
        this.portalWorldOrbitMode = false;
        this.renderPortalChromiumBrowser(prevId !== tabBtn.dataset.tabid);
      }
    });

    // Clicking any 3D rolling tab card in the Otherworld Orbit enters that tab's world!
    this.chromiumOrbitStageEl.addEventListener('click', (e) => {
      const closeBtn = (e.target as HTMLElement).closest<HTMLButtonElement>('.orbit-tab-close');
      if (closeBtn && closeBtn.dataset.closeid) {
        e.stopPropagation();
        this.game.sound.playClick();
        this.game.portalBrowser.closeTab(closeBtn.dataset.closeid);
        this.renderPortalChromiumBrowser(true);
        return;
      }
      const card = (e.target as HTMLElement).closest<HTMLElement>('.orbit-tab-card');
      if (card && card.dataset.tabid) {
        this.game.sound.playPortal();
        this.game.portalBrowser.activateTab(card.dataset.tabid);
        this.portalWorldOrbitMode = false;
        this.renderPortalChromiumBrowser(true);
      }
    });

    this.chromiumOrbitStageEl.addEventListener('pointerenter', () => {
      this.portalOrbitHoverPaused = true;
    });
    this.chromiumOrbitStageEl.addEventListener('pointerleave', () => {
      this.portalOrbitHoverPaused = false;
    });
    this.chromiumOrbitStageEl.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        this.portalOrbitAngle += (e.deltaY || e.deltaX) * 0.0032;
        this.updateRollingTabOrbitPositions();
      },
      { passive: false },
    );

    this.root.querySelector('#orbitSpinLeftBtn')?.addEventListener('click', () => {
      this.game.sound.playClick();
      const count = Math.max(1, this.game.portalBrowser.getTabs().length);
      this.portalOrbitAngle -= (Math.PI * 2) / count;
      this.updateRollingTabOrbitPositions();
    });

    this.root.querySelector('#orbitSpinRightBtn')?.addEventListener('click', () => {
      this.game.sound.playClick();
      const count = Math.max(1, this.game.portalBrowser.getTabs().length);
      this.portalOrbitAngle += (Math.PI * 2) / count;
      this.updateRollingTabOrbitPositions();
    });

    this.root.querySelector('#orbitEnterFrontBtn')?.addEventListener('click', () => {
      this.game.sound.playPortal();
      const tabs = this.game.portalBrowser.getTabs();
      const layout = computeRollingTabOrbitLayout(tabs.length, this.portalOrbitAngle);
      const frontNode = layout.find((n) => n.isFront) || layout[0];
      if (frontNode && tabs[frontNode.index]) {
        this.game.portalBrowser.activateTab(tabs[frontNode.index].id);
      }
      this.portalWorldOrbitMode = false;
      this.renderPortalChromiumBrowser(true);
    });

    this.root.querySelector('#orbitSpawnTabBtn')?.addEventListener('click', () => {
      this.game.sound.playClick();
      this.game.portalBrowser.createTab('chrome://newtab');
      this.renderPortalChromiumBrowser(false);
    });

    this.root.querySelector('#chromiumNewTabBtn')!.addEventListener('click', () => {
      this.game.sound.playClick();
      this.game.portalBrowser.createTab('chrome://newtab');
      this.renderPortalChromiumBrowser(true);
      this.chromiumOmniboxInput.focus();
      this.chromiumOmniboxInput.select();
    });

    this.chromiumPortalABtn.addEventListener('click', () => {
      this.game.sound.playClick();
      this.game.portalBrowser.setActivePortalVariant('A');
      this.renderPortalChromiumBrowser(true);
    });

    this.chromiumPortalBBtn.addEventListener('click', () => {
      this.game.sound.playClick();
      this.game.portalBrowser.setActivePortalVariant('B');
      this.renderPortalChromiumBrowser(true);
    });

    this.chromiumBackBtn.addEventListener('click', () => {
      if (!this.game.portalBrowser.canGoBack()) return;
      this.game.sound.playClick();
      this.game.portalBrowser.goBack();
      this.portalWorldOrbitMode = false;
      this.renderPortalChromiumBrowser(true);
    });

    this.chromiumFwdBtn.addEventListener('click', () => {
      if (!this.game.portalBrowser.canGoForward()) return;
      this.game.sound.playClick();
      this.game.portalBrowser.goForward();
      this.portalWorldOrbitMode = false;
      this.renderPortalChromiumBrowser(true);
    });

    this.root.querySelector('#chromiumReloadBtn')!.addEventListener('click', () => {
      this.game.sound.playClick();
      this.lastLoadedIframeKey = '';
      this.portalWorldOrbitMode = false;
      this.renderPortalChromiumBrowser(true);
    });

    this.root.querySelector('#chromiumHomeBtn')!.addEventListener('click', () => {
      this.game.sound.playClick();
      this.portalWorldOrbitMode = true;
      this.renderPortalChromiumBrowser(false);
    });

    this.chromiumOmniboxForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = this.chromiumOmniboxInput.value.trim();
      if (!val) return;
      this.game.sound.playClick();
      this.game.portalBrowser.navigateActiveTab(val);
      this.portalWorldOrbitMode = false;
      this.renderPortalChromiumBrowser(true);
      this.chromiumOmniboxInput.blur();
    });

    this.chromiumProxyBtn.addEventListener('click', () => {
      this.game.sound.playClick();
      const tab = this.game.portalBrowser.toggleProxyMode();
      this.showToast(
        tab.proxyMode
          ? 'Chromium Server Proxy enabled (bypasses X-Frame-Options).'
          : 'Direct Iframe Embed mode active.',
      );
      this.lastLoadedIframeKey = '';
      this.renderPortalChromiumBrowser(true);
    });

    this.chromiumWarpBtn.addEventListener('click', () => {
      this.closePortalBrowserModal();
      this.game.executePendingPortalWarp();
    });

    this.chromiumPipBtn.addEventListener('click', () => {
      this.game.sound.playClick();
      this.portalBrowserPip = !this.portalBrowserPip;
      if (this.portalBrowserPip) {
        this.portalWorldOrbitMode = false;
      }
      this.portalBrowserModal.classList.toggle('is-pip', this.portalBrowserPip);
      this.chromiumPipBtn.textContent = this.portalBrowserPip ? '⤢ Expand' : '⧉ PiP Dock';
      this.renderPortalChromiumBrowser(false);
      this.syncModalFreeze();
    });

    this.root.querySelector('#chromiumCloseBtn')!.addEventListener('click', () => {
      this.closePortalBrowserModal();
    });

    // Listen for navigation & title postMessages from proxied pages and chrome://newtab
    window.addEventListener('message', (e) => {
      const data = e.data as { type?: string; url?: string; title?: string } | null;
      if (!data || typeof data !== 'object') return;
      if (data.type === 'SERPENT_PORTAL_NAVIGATE' && typeof data.url === 'string') {
        this.game.portalBrowser.navigateActiveTab(data.url);
        this.portalWorldOrbitMode = false;
        this.renderPortalChromiumBrowser(true);
      } else if (data.type === 'SERPENT_PORTAL_TAB_LOADED') {
        this.game.portalBrowser.updateActiveTabMetadata(data.url, data.title);
        this.renderPortalChromiumBrowser(false);
      }
    });
  }

  private startPortalOrbitAnimation(): void {
    if (this.portalOrbitRafId) return;
    this.portalOrbitLastPerf = performance.now();
    const step = (now: number) => {
      if (this.portalBrowserModal.classList.contains('hidden')) {
        this.portalOrbitRafId = 0;
        return;
      }
      const dt = Math.min(0.08, Math.max(0.001, (now - this.portalOrbitLastPerf) / 1000));
      this.portalOrbitLastPerf = now;
      if (this.portalWorldOrbitMode && !this.portalOrbitHoverPaused) {
        this.portalOrbitAngle += this.portalOrbitVel * dt;
        this.updateRollingTabOrbitPositions();
      }
      this.portalOrbitRafId = window.requestAnimationFrame(step);
    };
    this.portalOrbitRafId = window.requestAnimationFrame(step);
  }

  private updateRollingTabOrbitPositions(): void {
    const cards = Array.from(
      this.chromiumOrbitStageEl.querySelectorAll<HTMLElement>('.orbit-tab-card'),
    );
    if (cards.length === 0) return;
    const layout = computeRollingTabOrbitLayout(cards.length, this.portalOrbitAngle);
    const radiusX = Math.min(340, Math.max(175, this.chromiumOrbitStageEl.clientWidth * 0.34));
    const radiusY = Math.min(92, Math.max(48, this.chromiumOrbitStageEl.clientHeight * 0.22));

    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      const node = layout[i];
      if (!node) continue;
      const tx = (node.xNorm * radiusX).toFixed(1);
      const ty = (node.yNorm * radiusY).toFixed(1);
      const tz = (node.zDepth * 145).toFixed(1);
      card.style.transform = `translate3d(-50%, -50%, 0) translate3d(${tx}px, ${ty}px, ${tz}px) rotateY(${node.rotateYDeg}deg) scale(${node.scale})`;
      card.style.opacity = String(node.opacity);
      card.style.zIndex = String(node.zIndex);
      card.classList.toggle('is-front', node.isFront);
    }
  }

  public openPortalBrowserModal(variant?: PortalVariant): void {
    if (variant) {
      this.game.portalBrowser.setActivePortalVariant(variant);
    }
    // Always open into the 3D Rolling Tab Otherworld so every tab is visibly rolling around!
    this.portalWorldOrbitMode = true;
    this.portalBrowserModal.classList.remove('hidden');
    this.renderPortalChromiumBrowser(false);
    this.startPortalOrbitAnimation();
    this.syncModalFreeze();
  }

  public closePortalBrowserModal(): void {
    if (this.portalBrowserModal.classList.contains('hidden')) return;
    this.portalBrowserModal.classList.add('hidden');
    if (this.portalOrbitRafId) {
      window.cancelAnimationFrame(this.portalOrbitRafId);
      this.portalOrbitRafId = 0;
    }
    this.portalBrowserPip = false;
    this.portalBrowserModal.classList.remove('is-pip');
    this.chromiumPipBtn.textContent = '⧉ PiP Dock';
    this.syncModalFreeze();
    this.game.sound.playClick();
  }

  public togglePortalBrowserModal(): void {
    if (this.portalBrowserModal.classList.contains('hidden')) {
      this.openPortalBrowserModal();
    } else {
      this.closePortalBrowserModal();
    }
  }

  private renderPortalChromiumBrowser(forceReloadIframe = false): void {
    const mgr = this.game.portalBrowser;
    const allTabs = mgr.getTabs();
    const activeTab = mgr.getActiveTab();
    const activeVariant = mgr.getActivePortalVariant();

    this.chromiumPortalABtn.classList.toggle('active-a', activeVariant === 'A');
    this.chromiumPortalBBtn.classList.toggle('active-b', activeVariant === 'B');
    this.chromiumOrbitToggleBtn.classList.toggle('is-active', this.portalWorldOrbitMode);
    this.chromiumOrbitToggleBtn.textContent = this.portalWorldOrbitMode
      ? `🌌 Orbiting (${allTabs.length} Tabs)`
      : `🌌 Rolling Tab World (${allTabs.length})`;

    this.chromiumOtherworldEl.classList.toggle('hidden', !this.portalWorldOrbitMode);

    this.chromiumTabListEl.innerHTML = allTabs
      .map((t) => {
        const isAct = t.id === activeTab.id && !this.portalWorldOrbitMode;
        const vClass = t.portalVariant === 'A' ? 'variant-a' : 'variant-b';
        const safeTitle = t.title.replace(/[<>&"]/g, '');
        return `
          <div class="chromium-tab ${isAct ? 'active' : ''} ${vClass}" data-tabid="${t.id}" role="tab" aria-selected="${isAct}">
            <span class="ctab-portal-dot" title="Portal ${t.portalVariant}">${t.portalVariant}</span>
            <span class="ctab-title">${safeTitle}</span>
            <button type="button" class="chromium-tab-close" data-closeid="${t.id}" aria-label="Close tab">×</button>
          </div>
        `;
      })
      .join('');

    // Render 3D Rolling Tab Cards inside the Otherworld Orbit Stage
    this.chromiumOrbitStageEl.innerHTML = `
      <div class="otherworld-wormhole-core" aria-hidden="true">
        <div class="wormhole-core-ring"></div>
        <span class="wormhole-core-label">PORTAL ${activeVariant} SINGULARITY</span>
      </div>
      ${allTabs
        .map((t, idx) => {
          const isAct = t.id === activeTab.id;
          const vClass = t.portalVariant === 'A' ? 'variant-a' : 'variant-b';
          const safeTitle = t.title.replace(/[<>&"]/g, '');
          const cleanHost = t.displayUrl.replace(/^https?:\/\//, '').slice(0, 34);
          return `
            <div class="orbit-tab-card ${vClass} ${isAct ? 'is-active-tab' : ''}" data-tabid="${t.id}" data-orbitidx="${idx}">
              <div class="orbit-card-top">
                <span class="orbit-portal-pill">● PORTAL ${t.portalVariant} · TAB #${idx + 1}</span>
                <button type="button" class="orbit-tab-close" data-closeid="${t.id}" title="Close Tab World" aria-label="Close Tab">×</button>
              </div>
              <div class="orbit-card-body">
                <div class="orbit-card-emblem">${t.url.startsWith('chrome://') ? '⛰' : '🌐'}</div>
                <div class="orbit-card-title">${safeTitle}</div>
                <div class="orbit-card-url">${cleanHost}</div>
              </div>
              <div class="orbit-card-footer">
                <span class="orbit-enter-cta">⚡ SELECT TO ENTER WORLD ➔</span>
              </div>
            </div>
          `;
        })
        .join('')}
    `;
    this.updateRollingTabOrbitPositions();

    if (document.activeElement !== this.chromiumOmniboxInput) {
      this.chromiumOmniboxInput.value = activeTab.displayUrl;
    }

    this.chromiumBackBtn.disabled = !mgr.canGoBack();
    this.chromiumFwdBtn.disabled = !mgr.canGoForward();

    this.chromiumProxyBtn.textContent = activeTab.proxyMode ? 'Proxy: ON' : 'Direct Embed';
    this.chromiumProxyBtn.classList.toggle('is-on', activeTab.proxyMode);

    this.chromiumStatusTextEl.textContent = this.portalWorldOrbitMode
      ? `🌌 Portal ${activeVariant} Pocket Dimension · ${allTabs.length} Tab Worlds Rolling in 3D Orbit — Click Any Tab to Enter`
      : `${CHROMIUM_ENGINE_META.engineVersion} · Active World: ${activeTab.title}`;

    const frameTarget = mgr.getIframeSrcForTab(activeTab);
    const frameKey = `${activeTab.id}|${activeTab.url}|${activeTab.proxyMode ? 'proxy' : 'direct'}`;
    if (forceReloadIframe || this.lastLoadedIframeKey !== frameKey) {
      this.lastLoadedIframeKey = frameKey;
      if (frameTarget.srcdoc !== undefined) {
        this.chromiumViewportFrame.removeAttribute('src');
        this.chromiumViewportFrame.srcdoc = frameTarget.srcdoc;
      } else if (frameTarget.src) {
        this.chromiumViewportFrame.removeAttribute('srcdoc');
        this.chromiumViewportFrame.src = frameTarget.src;
      }
    }
  }
}
