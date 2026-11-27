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
import { MirrorTabShimmerAction } from './audio';
import {
  BrowserHistoryFilterOptions,
  CHROMIUM_ENGINE_META,
  NewTabBehavior,
  PortalVariant,
  SEARCH_ENGINE_CATALOG,
  SearchEngineId,
  StartupMode,
  UserAgentPreset,
  computeRollingTabOrbitLayout,
  extractHistoryHost,
  groupHistoryByTimeBucket,
} from './browser';
import { ComplimentNotice, FloatingTauntNotice } from './compliments';
import {
  CombatLogTracker,
  formatCombatLogEntry,
  type CombatLogInput,
} from './combatLog';
import { PRESET_FORMATIONS, PortalShiftResult } from './formations';
import { ClimateLogNotice, SnakeGameController } from './game';
import {
  ATTACK_SPECS,
  SOUL_DISCIPLINES,
  resolveActiveSynergy,
  type SoulDisciplineId,
} from './game/foundry/FoundrySimulation';
import {
  MobileVirtualCursorController,
  loadSavedMobileControlMode,
  type MobileControlMode,
} from './game/controller/mobile';
import { classifyLeaderboardError } from './components/globalLeaderboardHelpers';
import { renderHumanityGrowthChart } from './humanityChart';
import {
  LOOT_RARITY_META,
  PortalLootDrop,
  RARE_MATERIALS_CATALOG,
  REFINEMENT_RECIPES,
  computeMissionDifficultyTier,
  formatLootDuration,
  renderLootIconSvg,
} from './loot';
import {
  OfflineSyncIndicator,
  computeStorageBucketShares,
  extractBookmarkCacheableUrls,
  formatStorageBytes,
  isIosSafariDevice,
  isStandalonePwa,
} from './offlineCache';
import {
  PORTAL_REGIONS,
  PortalRegionId,
  PortalRegionMeta,
  formatRelativeVisitTime,
} from './ecosystem/memory/RetentionPolicy';
import type { SpatialPortalNode } from './game/portal-world/PortalClusters';
import type { PortalProximityPrompt } from './game/portal-world/PortalInteraction';
import {
  CardDuelParticipant,
  FIFTEENTH_SOUL_EPILOGUE_TEXT,
  HOSPITAL_REVELATION_TEXT,
  PortalMissionDef,
  SOUL_TARGET_COUNT,
  evaluateAlchemyMix,
  evaluateNetworkCircuit,
  resolve29CardEliminationRound,
} from './missions';
import type { User } from 'firebase/auth';
import type { Unsubscribe } from 'firebase/firestore';
import {
  isFirebaseReady,
  signInWithGooglePopup,
  signOutCultivator,
  subscribeAuthState,
} from './firebase';
import {
  GlobalRankingEntry,
  RankingSortMode,
  computePlayerStanding,
  deleteOwnRankingRecord,
  fetchGlobalRankings,
  sanitizeCallsign,
  sortRankingEntries,
  submitCultivationRanking,
  subscribeGlobalRankings,
} from './ranking';
import {
  LoreUnlockNotice,
  SENTRY_ARCHETYPES,
  SoulArchiveSnapshot,
  renderSoulArchiveEmblemSvg,
} from './sentries';
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
  private combatLogPanelEl!: HTMLElement;
  private combatLogListEl!: HTMLOListElement;
  private combatLogSummaryEl!: HTMLElement;
  private combatLogStatusEl!: HTMLElement;
  private readonly combatLogTracker = new CombatLogTracker();
  private combatLogHideTimer = 0;
  private combatLogHasHostile = false;
  private combatLogPlaying = false;
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
  private chromiumBookmarkBtn!: HTMLButtonElement;
  private chromiumSettingsBtn!: HTMLButtonElement;
  private chromiumStandaloneBtn!: HTMLButtonElement;
  private chromiumWarpBtn!: HTMLButtonElement;
  private chromiumPipBtn!: HTMLButtonElement;
  private chromiumOrbitToggleBtn!: HTMLButtonElement;
  private chromiumMissionToggleBtn!: HTMLButtonElement;
  private chromiumSoulClockBadgeEl!: HTMLElement;
  private chromiumPortalABtn!: HTMLButtonElement;
  private chromiumPortalBBtn!: HTMLButtonElement;
  private chromiumProfileBtn!: HTMLButtonElement;
  private chromiumProfilePopoverEl!: HTMLElement;
  private chromiumBookmarkPopoverEl!: HTMLElement;
  private chromiumOmniboxSuggestionsEl!: HTMLElement;
  private chromiumOtherworldProfileStripEl!: HTMLElement;
  private chromiumBookmarksBarEl!: HTMLElement;
  private chromiumOtherworldEl!: HTMLElement;
  private chromiumOrbitStageEl!: HTMLElement;
  private chromiumMissionPanelEl!: HTMLElement;
  private chromiumSettingsPanelEl!: HTMLElement;
  private chromiumLoadingBarEl!: HTMLElement;
  private chromiumViewportFrame!: HTMLIFrameElement;
  private chromiumStatusTextEl!: HTMLElement;
  private lastLoadedIframeKey = '';
  private portalBrowserPip = false;
  private portalBrowserStandalone = false;
  private portalWorldOrbitMode = false;
  private portalMissionViewMode = false;
  private portalBrowserSettingsMode = false;
  private portalBrowserSettingsTab: 'general' | 'privacy' | 'bookmarks' | 'history' | 'audio' = 'general';
  private portalHistorySearchQuery = '';
  private portalHistoryFilter: 'all' | 'session' | 'A' | 'B' = 'all';
  private activePortalKey = 'spawn-guard-portal-a';
  private portalProfilePopoverOpen = false;
  private portalBookmarkPopoverOpen = false;
  private portalOmniboxSuggestionsOpen = false;
  private portalOrbitAngle = 0;
  private portalOrbitPitchDeg = 0;
  private portalOrbitVel = 0.28;
  private portalOrbitRafId = 0;
  private portalOrbitHoverPaused = false;
  private portalOrbitLastPerf = 0;
  private lastOrbitFrontIdx = -1;
  private deferredInstallPrompt: (Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }) | null = null;
  private settingsActiveTab: 'game' | 'browser' = 'game';
  private offlineStatusBannerEl!: HTMLElement;
  private chromiumOfflineTagEl!: HTMLElement;
  private iosInstallModalEl!: HTMLElement;

  // Portal Loot Reliquary modal & latest drop state
  private lootReliquaryModal!: HTMLElement;
  private lootReliquaryBodyEl!: HTMLElement;
  private lootReliquaryMetaEl!: HTMLElement;
  private latestMissionLootDrop: PortalLootDrop | null = null;

  // Portal Memory World HUD prompt, region banner & Atlas Explorer modal
  private portalProximityPromptEl!: HTMLElement;
  private portalRegionBannerEl!: HTMLElement;
  private portalRegionBannerTimer = 0;
  private portalAtlasModal!: HTMLElement;
  private portalAtlasBodyEl!: HTMLElement;
  private portalAtlasMetaEl!: HTMLElement;
  private portalAtlasSearchQuery = '';
  private portalAtlasRegionFilter: PortalRegionId | 'all' = 'all';
  private activeProximityPrompt: PortalProximityPrompt | null = null;
  private foundryConsoleModal!: HTMLElement;
  private foundryConsoleBodyEl!: HTMLElement;
  private foundryDebugOverlayEl!: HTMLElement;
  private foundryDebugVisible = false;

  // Interactive per-portal Mission / 5-Floor Trial / 29-Card Soul Duel state
  private missionQuizHintOpen = false;
  private missionFeedbackMsg = '';
  private missionFeedbackTone: 'neutral' | 'success' | 'error' = 'neutral';
  private missionNetworkToggles: [boolean, boolean, boolean, boolean] = [false, false, false, false];
  private missionAlchemySelected: string[] = [];
  private missionCardParticipants: CardDuelParticipant[] = [];
  private missionCardRound = 1;
  private missionCardLog = '';
  private missionShadowPhase = false;
  private missionShadowPlayerHp = 3;
  private missionShadowBossHp = 3;
  private missionShadowIntent: 'strike' | 'ward' | 'feint' = 'strike';
  private missionRevelationBanner: 'hospital' | 'fifteenth' | null = null;
  private fpvReticleEl!: HTMLElement;
  private portalShiftRippleOverlayEl!: HTMLElement;
  private portalShiftRippleBannerEl!: HTMLElement;
  private portalShiftRippleCoordsEl!: HTMLElement;
  private portalShiftRippleSubEl!: HTMLElement;
  private portalShiftDisplaceEl: SVGFEDisplacementMapElement | null = null;
  private portalShiftRippleTimer = 0;
  private portalShiftDisplaceRaf = 0;
  private pendingReemergenceShift: { newX: number; newZ: number; soulAwarded: boolean } | null = null;

  // Mobile Landscape, Virtual Moving Cursor & Arcade Fighting Skill nodes
  private mobileLeftClusterEl!: HTMLElement;
  private mobileActionRowEl!: HTMLElement;
  private mobileVirtualCursorEl!: HTMLElement;
  private mobileCursorPadEl!: HTMLElement;
  private mobileCursorPuckEl!: HTMLElement;
  private mobileCursorModeBtn!: HTMLButtonElement;
  private mobileController: MobileVirtualCursorController | null = null;
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
  private portalDistEl!: HTMLElement;
  private portalDistPeakEl!: HTMLElement;
  private portalDistMetersEl!: HTMLElement;
  private portalDistStatusEl!: HTMLElement;
  private portalDistFillEl!: HTMLElement;
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
  private minimapCaptionEl!: HTMLElement;
  private terrainMapCache: HTMLCanvasElement | null = null;
  private cachedMapBiome: BiomeId | null = null;

  // Celestial Global Ranking Sanctuary Modal
  private globalRankingModal!: HTMLElement;
  private rankingPortalBannerEl!: HTMLElement;
  private rankingAuthBarEl!: HTMLElement;
  private rankingCallsignInput!: HTMLInputElement;
  private rankingSubmitBtn!: HTMLButtonElement;
  private rankingDeleteOwnBtn!: HTMLButtonElement;
  private rankingDossierStatsEl!: HTMLElement;
  private rankingStatusEl!: HTMLElement;
  private rankingStandingEl!: HTMLElement;
  private rankingPodiumEl!: HTMLElement;
  private rankingCompareEl!: HTMLElement;
  private rankingRowsEl!: HTMLElement;
  private rankingEntries: GlobalRankingEntry[] = [];
  private rankingSortMode: RankingSortMode = 'score';
  private rankingAuthUser: User | null = null;
  private rankingSelectedRivalUid: string | null = null;
  private rankingEnteredViaPortal = false;
  private rankingUnsubscribe: Unsubscribe | null = null;
  private rankingLoading = false;
  private rankingSubmitting = false;
  private rankingStatusMsg = '';
  private rankingStatusTone: 'neutral' | 'success' | 'error' = 'neutral';
  private rankingErrorMsg = '';
  private rankingCallsignDirty = false;

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

  // Soul Clan Sentry stealth indicator & Soul Clan Archives lore gallery
  private sentryStealthBannerEl!: HTMLElement;
  private sentryBannerTitleEl!: HTMLElement;
  private sentryBannerStateEl!: HTMLElement;
  private sentrySuspicionFillEl!: HTMLElement;
  private sentryBannerHintEl!: HTMLElement;
  private soulArchivesModal!: HTMLElement;
  private soulArchivesCountEl!: HTMLElement;
  private soulArchivesListEl!: HTMLElement;
  private soulArchivesReaderEl!: HTMLElement;
  private pauseSoulArchivesBtn!: HTMLButtonElement;
  private soulArchivesFilter: 'all' | 'sentry' | 'chronicle' | 'unlocked' = 'all';
  private selectedSoulArchiveId = 'lantern_watcher';

  // Subtle interactive "New Lore Unlocked" toast notification
  private loreUnlockToastEl!: HTMLElement;
  private loreToastOpenBtn!: HTMLButtonElement;
  private loreToastDismissBtn!: HTMLButtonElement;
  private loreToastEmblemEl!: HTMLElement;
  private loreToastKickerEl!: HTMLElement;
  private loreToastTitleEl!: HTMLElement;
  private loreToastSourceEl!: HTMLElement;
  private loreToastProgressEl!: HTMLElement;
  private loreToastQueue: LoreUnlockNotice[] = [];
  private activeLoreToast: LoreUnlockNotice | null = null;
  private loreToastTimer = 0;
  private loreToastLeaveTimer = 0;
  private loreToastHovered = false;

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

      <!-- FIRST-PERSON VIEW (FPV) CENTER AIMING RETICLE -->
      <div class="fpv-reticle hidden" id="fpvReticle" aria-hidden="true">
        <span class="fpv-tick top"></span>
        <span class="fpv-tick right"></span>
        <span class="fpv-tick bottom"></span>
        <span class="fpv-tick left"></span>
        <span class="fpv-dot"></span>
      </div>

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
            <button type="button" class="secondary-cta" id="launchBrowserTitleBtn">
              Launch Browser
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

          <p class="control-hint">A / D Steer · W / Space Boost · F/1 Bolt · Q/2 Wave · E/3 Dash Strike · R/4 Flame Lotus · V FPV · C Camera · G Portals · K Bestiary · Esc Pause</p>
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
          <div
            class="portal-dist-indicator hidden"
            id="hudPortalDist"
            role="status"
            aria-live="polite"
            title="Nearest Trial Peak Portal within proximity range"
          >
            <div class="portal-dist-row">
              <span class="portal-dist-beacon" aria-hidden="true"></span>
              <span class="portal-dist-kicker">PORTAL</span>
              <span class="portal-dist-peak" id="hudPortalDistPeak">Whispering Foothill</span>
              <span class="portal-dist-sep" aria-hidden="true">·</span>
              <span class="portal-dist-meters" id="hudPortalDistMeters">48m</span>
              <span class="portal-dist-status" id="hudPortalDistStatus">RANK 1</span>
            </div>
            <div class="portal-dist-track" aria-hidden="true">
              <div class="portal-dist-fill" id="hudPortalDistFill"></div>
            </div>
          </div>
        </div>

        <div class="hud-controls-cluster">
          <button type="button" class="hud-icon-btn portal-hud-btn" id="hudPortalBtn" title="Enter 3D Portal Chromium Mirror-House Browser (G)">
            🌐 Portal (G)
          </button>
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

      <!-- SIDE COMBAT LOG PANEL (SURFACES AUTOMATICALLY WHEN IN COMBAT) -->
      <aside
        class="combat-log-panel is-idle"
        id="combatLogPanel"
        role="log"
        aria-live="polite"
        aria-relevant="additions text"
        aria-label="Combat log"
      >
        <div class="combat-log-head">
          <div class="combat-log-title-wrap">
            <span class="combat-log-title">Combat Log</span>
            <span class="combat-log-status state-idle" id="combatLogStatus">Standby</span>
          </div>
          <span class="combat-log-summary" id="combatLogSummary">Dealt 0 · Taken 0</span>
        </div>
        <ol class="combat-log-list" id="combatLogList"></ol>
      </aside>

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

      <!-- EPHEMERAL SOUL CLAN SENTRY & STEALTH VEIL BANNER (SHOWN ONLY IN STEALTH OR NEAR A SENTRY) -->
      <div class="sentry-stealth-banner hidden" id="sentryStealthBanner" aria-live="polite">
        <div class="sentry-banner-top">
          <span class="sentry-banner-title" id="sentryBannerTitle">Veil of Shadow Active</span>
          <span class="sentry-banner-state" id="sentryBannerState">Concealed</span>
        </div>
        <div class="sentry-suspicion-track" id="sentrySuspicionTrack">
          <div class="sentry-suspicion-fill" id="sentrySuspicionFill"></div>
        </div>
        <div class="sentry-banner-hint" id="sentryBannerHint">
          Hold Shift or press X for Stealth Veil · Q Shockwave banishes sentries
        </div>
      </div>

      <!-- SUBTLE INTERACTIVE "NEW LORE UNLOCKED" TOAST LINKING DIRECTLY TO SOUL CLAN ARCHIVES -->
      <div class="lore-unlock-toast hidden" id="loreUnlockToast" role="status" aria-live="polite">
        <button type="button" class="lore-toast-trigger" id="loreToastOpenBtn">
          <span class="lore-toast-emblem" id="loreToastEmblem" aria-hidden="true"></span>
          <span class="lore-toast-body">
            <span class="lore-toast-kicker" id="loreToastKicker">New Lore Unlocked · 1 / 12</span>
            <span class="lore-toast-title" id="loreToastTitle">Lantern Watcher</span>
            <span class="lore-toast-meta">
              <span class="lore-toast-source" id="loreToastSource">New Sentry Encountered</span>
              <span aria-hidden="true">·</span>
              <span class="lore-toast-link">Open Soul Clan Archives ›</span>
            </span>
          </span>
        </button>
        <button type="button" class="lore-toast-dismiss" id="loreToastDismissBtn" aria-label="Dismiss lore notification">✕</button>
        <span class="lore-toast-progress" id="loreToastProgress" aria-hidden="true"></span>
      </div>

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

        <div class="minimap-shell" title="Continental Radar — Gold star is Global Ranking Portal, Gold diamond is next Peak, orange triangles are Beasts, jade/magenta diamonds are Soul Clan ghosts">
          <canvas id="minimapCanvas" width="148" height="148"></canvas>
          <div class="minimap-caption" id="minimapCaption">CONTINENT RADAR</div>
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
            <button type="button" class="secondary-cta" id="pauseGlobalRankingBtn">Global Rankings (L)</button>
            <button type="button" class="secondary-cta" id="pausePortalAtlasBtn">Portal Memory Atlas (P)</button>
            <button type="button" class="secondary-cta" id="pauseFoundryConsoleBtn">Soul Foundry &amp; Disciplines (O)</button>
            <button type="button" class="secondary-cta" id="pausePortalBrowserBtn">Portal Browser (G)</button>
            <button type="button" class="secondary-cta" id="pauseLootReliquaryBtn">Loot Reliquary (I)</button>
            <button type="button" class="secondary-cta" id="pauseSoulArchivesBtn">Soul Clan Archives (N)</button>
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

      <!-- PORTAL LOOT RELIQUARY MODAL -->
      <div class="modal-backdrop hidden" id="lootReliquaryModal" role="dialog" aria-modal="true" aria-label="Portal Loot Reliquary">
        <div class="modal-card reliquary-modal-card">
          <div class="reliquary-header">
            <div>
              <div class="reliquary-eyebrow">Portal Mission Spoils</div>
              <h2 class="modal-title reliquary-title">Loot Reliquary</h2>
            </div>
            <div class="reliquary-header-right">
              <span class="reliquary-meta" id="lootReliquaryMeta">1.00× Cultivation · 0 Materials</span>
              <button type="button" class="ghost-btn compact" id="closeLootReliquaryBtn" aria-label="Close Loot Reliquary">Close</button>
            </div>
          </div>
          <div class="reliquary-body" id="lootReliquaryBody"></div>
          <div class="reliquary-footer">
            <span class="reliquary-hotkey-note">Clear higher-floor portal missions (Floors 1–5) for Mythic materials &amp; stronger cultivation multipliers · [I] Reliquary</span>
            <button type="button" class="primary-cta compact" id="closeLootReliquaryFooterBtn">Return</button>
          </div>
        </div>
      </div>

      <!-- SOUL CLAN ARCHIVES LORE GALLERY MODAL -->
      <div class="modal-backdrop hidden" id="soulArchivesModal" role="dialog" aria-modal="true" aria-label="Soul Clan Archives">
        <div class="modal-card archives-modal-card">
          <div class="archives-header">
            <div class="archives-title-group">
              <div class="archives-eyebrow">NETHER HALL HISTORICAL RECORDS</div>
              <h2 class="modal-title archives-title">Soul Clan Archives</h2>
            </div>
            <div class="archives-header-right">
              <span class="archives-count-readout" id="soulArchivesCount">0 / 8 Deciphered</span>
              <button type="button" class="ghost-btn compact" id="closeSoulArchivesBtn" aria-label="Close Soul Clan Archives">✕ Close</button>
            </div>
          </div>

          <div class="archives-toolbar">
            <p class="archives-subtitle">
              Encounter patrolling Soul Clan Sentries near portals, trigger their search patterns, infiltrate unseen, or banish their wards to unseal ancient records.
            </p>
            <div class="archives-filter-bar" role="tablist" aria-label="Filter Soul Clan Archives">
              <button type="button" class="archives-filter-btn active" data-afilter="all" role="tab" aria-selected="true">All Entries</button>
              <button type="button" class="archives-filter-btn" data-afilter="sentry" role="tab" aria-selected="false">Sentries</button>
              <button type="button" class="archives-filter-btn" data-afilter="chronicle" role="tab" aria-selected="false">Chronicles</button>
              <button type="button" class="archives-filter-btn" data-afilter="unlocked" role="tab" aria-selected="false">Unlocked</button>
            </div>
          </div>

          <div class="archives-columns">
            <nav class="archives-index" id="soulArchivesList" aria-label="Soul Clan Archives Entries"></nav>
            <article class="archives-reader" id="soulArchivesReader"></article>
          </div>

          <div class="archives-footer">
            <span class="archives-hotkey-note">Tip: Hold [Shift] or press [X] for Veil of Shadow · [Q] Shockwave banishes sentries · [N] Archives</span>
            <button type="button" class="primary-cta compact" id="closeSoulArchivesFooterBtn">Return to Mountain</button>
          </div>
        </div>
      </div>

      <!-- CELESTIAL GLOBAL RANKING SANCTUARY MODAL -->
      <div class="modal-backdrop hidden" id="globalRankingModal" role="dialog" aria-modal="true" aria-label="Celestial Global Ranking Sanctuary">
        <div class="modal-card ranking-modal-card">
          <div class="ranking-header">
            <div class="ranking-title-group">
              <div class="ranking-eyebrow">CELESTIAL ASCENSION STELE</div>
              <h2 class="modal-title ranking-title">Global Ranking Portal</h2>
            </div>
            <div class="ranking-header-actions">
              <div class="ranking-auth-bar" id="rankingAuthBar"></div>
              <button type="button" class="ghost-btn compact" id="rankingRefreshBtn" title="Refresh Global Leaderboard">↻ Refresh</button>
              <button type="button" class="ghost-btn compact" id="closeGlobalRankingBtn" aria-label="Close Global Ranking">✕ Close</button>
            </div>
          </div>

          <div class="ranking-portal-banner" id="rankingPortalBanner"></div>

          <div class="ranking-dossier-card">
            <div class="ranking-dossier-top">
              <div>
                <div class="ranking-section-label">YOUR CULTIVATION DOSSIER</div>
                <div class="ranking-dossier-stats" id="rankingDossierStats"></div>
              </div>
              <div class="ranking-submit-box">
                <label class="ranking-callsign-label" for="rankingCallsignInput">Cultivator Callsign</label>
                <div class="ranking-submit-row">
                  <input
                    type="text"
                    id="rankingCallsignInput"
                    class="ranking-callsign-input"
                    maxlength="32"
                    placeholder="Jade Cultivator"
                    autocomplete="off"
                  />
                  <button type="button" class="primary-cta compact ranking-submit-btn" id="rankingSubmitBtn">
                    Inscribe Progress
                  </button>
                  <button type="button" class="ghost-btn compact danger-outline hidden" id="rankingDeleteOwnBtn" title="Remove your public entry from the stele">
                    Remove
                  </button>
                </div>
              </div>
            </div>
            <div class="ranking-status-msg hidden" id="rankingStatusMsg"></div>
          </div>

          <div class="ranking-standing-strip" id="rankingStandingStrip"></div>

          <div class="ranking-sort-bar" role="tablist" aria-label="Sort Global Rankings">
            <button type="button" class="ranking-sort-btn active" data-rsort="score" role="tab" aria-selected="true">Highest Score</button>
            <button type="button" class="ranking-sort-btn" data-rsort="cultivation" role="tab" aria-selected="false">Cultivation Lv &amp; XP</button>
            <button type="button" class="ranking-sort-btn" data-rsort="souls" role="tab" aria-selected="false">Soul Fragments</button>
            <button type="button" class="ranking-sort-btn" data-rsort="shrines" role="tab" aria-selected="false">Trial Shrines</button>
          </div>

          <div class="ranking-podium" id="rankingPodium"></div>

          <div class="ranking-compare-card hidden" id="rankingCompareCard"></div>

          <div class="ranking-table-wrap">
            <table class="ranking-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Cultivator</th>
                  <th>Stage &amp; Realm</th>
                  <th>Score</th>
                  <th>XP</th>
                  <th>Shrines</th>
                  <th>Souls</th>
                  <th>Compare</th>
                </tr>
              </thead>
              <tbody id="rankingRowsBody"></tbody>
            </table>
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

      <!-- UNIFIED GAME & BROWSER SETTINGS MODAL -->
      <div class="modal-backdrop hidden" id="settingsModal" role="dialog" aria-modal="true" aria-labelledby="settingsTitle">
        <div class="modal-card settings-unified-card">
          <div class="settings-modal-head">
            <h2 class="modal-title" id="settingsTitle">Settings</h2>
            <div class="settings-tab-bar" role="tablist" aria-label="Settings Categories">
              <button type="button" class="settings-tab-btn active" data-stab="game" role="tab" aria-selected="true">Game</button>
              <button type="button" class="settings-tab-btn" data-stab="browser" role="tab" aria-selected="false">Browser &amp; Release</button>
            </div>
          </div>

          <div class="settings-pane" id="settingsPaneGame">
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
                <button type="button" class="secondary-cta compact" id="lockLandscapeSettingsBtn">Lock Landscape</button>
                <button type="button" class="secondary-cta compact" id="toggleHapticsBtn" aria-pressed="true">Haptics: On</button>
              </div>
            </div>
          </div>

          <div class="settings-pane hidden" id="settingsPaneBrowser">
            <div class="settings-section">
              <span class="settings-label">App Launch Mode</span>
              <div class="speed-group" role="group" aria-label="Startup Launch Mode">
                <button type="button" class="speed-btn active" data-bsetting-startup="game">Start in 3D Game</button>
                <button type="button" class="speed-btn" data-bsetting-startup="browser">Start as Web Browser</button>
              </div>
            </div>
            <div class="settings-section">
              <span class="settings-label">Default Search Engine</span>
              <select class="dark-select settings-full-select" id="settingsSearchEngineSel">
                <option value="duckduckgo">DuckDuckGo Lite (Recommended for Proxy)</option>
                <option value="wikipedia">Wikipedia</option>
                <option value="brave">Brave Search</option>
                <option value="ecosia">Ecosia</option>
                <option value="bing">Bing</option>
                <option value="google">Google</option>
              </select>
            </div>
            <div class="settings-section">
              <span class="settings-label">Homepage URL</span>
              <div class="settings-row">
                <input type="text" class="dark-select settings-text-input" id="settingsHomepageInput" placeholder="chrome://newtab or https://..." spellcheck="false" />
                <button type="button" class="secondary-cta compact" id="settingsSaveHomepageBtn">Save</button>
              </div>
            </div>
            <div class="settings-section">
              <span class="settings-label">User-Agent Profile</span>
              <select class="dark-select settings-full-select" id="settingsUaSel">
                <option value="serpent_portal">Portal Chromium 131 (Default)</option>
                <option value="desktop_chrome">Desktop Chrome (Windows 10/11)</option>
                <option value="mobile_chrome">Mobile Chrome (Android Pixel)</option>
              </select>
            </div>
            <div class="settings-section">
              <span class="settings-label">Page Zoom</span>
              <div class="settings-row">
                <input type="range" class="settings-slider" id="settingsZoomSlider" min="80" max="130" step="5" value="100" />
                <span class="settings-val" id="settingsZoomVal">100%</span>
              </div>
            </div>
            <div class="settings-section settings-toggle-grid">
              <label class="settings-check-row">
                <input type="checkbox" id="settingsTrackerShieldChk" checked />
                <span>Privacy Tracker Shield (strip analytics &amp; send DNT/GPC)</span>
              </label>
              <label class="settings-check-row">
                <input type="checkbox" id="settingsDefaultProxyChk" checked />
                <span>Default Server Proxy (bypass X-Frame-Options)</span>
              </label>
              <label class="settings-check-row">
                <input type="checkbox" id="settingsBookmarksBarChk" checked />
                <span>Show Bookmarks Bar</span>
              </label>
            </div>
            <div class="settings-section">
              <span class="settings-label">Service Worker &amp; Offline Sync Status</span>
              <div class="sw-sync-card tone-cyan" id="settingsSwSyncCard" role="status" aria-live="polite">
                <div class="sw-sync-top">
                  <span class="sw-sync-dot tone-cyan phase-initializing" id="settingsSwSyncDot" aria-hidden="true"></span>
                  <span class="sw-sync-badge" id="settingsSwSyncBadge">Starting SW...</span>
                  <span class="sw-sync-headline" id="settingsSwSyncHeadline">Registering Service Worker for offline portal caching...</span>
                </div>
                <div class="sw-sync-detail" id="settingsSwSyncDetail">Checking offline caches...</div>
              </div>
              <div class="sw-storage-mini-row" id="settingsStorageSummaryRow">
                <span class="sw-storage-mini-label">Offline Cache Storage:</span>
                <span class="sw-storage-mini-val" id="settingsStorageTotalVal">Calculating...</span>
              </div>
            </div>
            <div class="settings-section">
              <span class="settings-label">Browser Data &amp; App Release</span>
              <div class="settings-row settings-wrap-row">
                <button type="button" class="secondary-cta compact" id="settingsLaunchBrowserNowBtn">Open Standalone Browser</button>
                <button type="button" class="secondary-cta compact" id="settingsOpenHistoryBtn">View Browser History</button>
                <button type="button" class="secondary-cta compact" id="settingsInstallPwaBtn">Install App (PWA)</button>
                <button type="button" class="ghost-btn compact" id="settingsClearOfflineCacheBtn">Clear Offline Cache</button>
                <button type="button" class="ghost-btn compact" id="settingsClearHistoryBtn">Clear History</button>
                <button type="button" class="ghost-btn compact" id="settingsResetBrowserBtn">Reset Browser Defaults</button>
              </div>
            </div>
          </div>

          <div class="modal-actions">
            <button type="button" class="primary-cta" id="closeSettingsBtn">Close</button>
          </div>
        </div>
      </div>

      <!-- BUILT-IN DESKTOP BROWSER MODAL (OPENS VIA LAUNCH BROWSER, PORTALS, OR [G]) -->
      <div class="chromium-portal-backdrop hidden" id="portalBrowserModal" role="dialog" aria-modal="true" aria-label="Web Browser">
        <div class="chromium-window">
          <!-- BROWSER TOP TAB STRIP -->
          <div class="chromium-tabstrip-row">
            <div class="chromium-window-controls" aria-hidden="true">
              <span class="c-dot close"></span>
              <span class="c-dot min"></span>
              <span class="c-dot max"></span>
            </div>
            <div class="chromium-tabs-scroll" id="chromiumTabList" role="tablist"></div>
            <button type="button" class="chromium-newtab-btn" id="chromiumNewTabBtn" title="New Tab" aria-label="New Tab">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 3.25v9.5M3.25 8h9.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
            </button>
            <div class="chromium-window-actions">
              <button type="button" class="chromium-profile-btn" id="chromiumProfileBtn" title="Switch Browser Profile">
                <span class="cprof-avatar" id="chromiumProfileAvatar">S</span>
                <span class="cprof-name" id="chromiumProfileName">Serpent Sovereign</span>
                <span class="cprof-caret" aria-hidden="true">▾</span>
              </button>
              <button type="button" class="chromium-win-btn" id="chromiumStandaloneBtn" title="Toggle Fullscreen">Fullscreen</button>
              <button type="button" class="chromium-win-btn" id="chromiumPipBtn" title="Picture-in-Picture">PiP</button>
              <button type="button" class="chromium-win-btn close" id="chromiumCloseBtn" title="Close Browser and Return to Game (Esc)">Close</button>
            </div>
          </div>

          <!-- BROWSER PROFILE SWITCHER POPOVER -->
          <div class="chromium-profile-popover hidden" id="chromiumProfilePopover" role="dialog" aria-label="Browser Profiles"></div>

          <!-- BOOKMARK POPOVER -->
          <div class="chromium-bookmark-popover hidden" id="chromiumBookmarkPopover" role="dialog" aria-label="Save Bookmark"></div>

          <!-- NAVIGATION & ADDRESS BAR -->
          <div class="chromium-toolbar-row">
            <div class="chromium-nav-btns">
              <button type="button" class="chromium-nav-btn" id="chromiumBackBtn" title="Back" aria-label="Back">
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M10.25 3.5L5.75 8l4.5 4.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </button>
              <button type="button" class="chromium-nav-btn" id="chromiumFwdBtn" title="Forward" aria-label="Forward">
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M5.75 3.5L10.25 8l-4.5 4.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </button>
              <button type="button" class="chromium-nav-btn" id="chromiumReloadBtn" title="Reload" aria-label="Reload">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M13 8a5 5 0 1 1-1.35-3.42M13 3.25v2.6h-2.6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </button>
              <button type="button" class="chromium-nav-btn" id="chromiumHomeBtn" title="Home" aria-label="Home">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2.75 7.25L8 3l5.25 4.25V13a.75.75 0 0 1-.75.75H9.75V9.75h-3.5v4H3.5a.75.75 0 0 1-.75-.75V7.25z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>
              </button>
            </div>
            <form class="chromium-omnibox-form" id="chromiumOmniboxForm">
              <span class="chromium-omnibox-lock" aria-hidden="true">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><rect x="3.25" y="7.25" width="9.5" height="6.5" rx="1.5" stroke="currentColor" stroke-width="1.4"/><path d="M5.25 7.25V5.5a2.75 2.75 0 1 1 5.5 0v1.75" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
              </span>
              <input
                type="text"
                class="chromium-omnibox-input"
                id="chromiumOmniboxInput"
                placeholder="Search or enter website name"
                autocomplete="off"
                spellcheck="false"
              />
              <button type="button" class="chromium-bookmark-star" id="chromiumBookmarkBtn" title="Bookmark this tab" aria-label="Bookmark this tab">☆</button>
              <button type="submit" class="chromium-omnibox-go">Go</button>
              <div class="chromium-omnibox-suggestions hidden" id="chromiumOmniboxSuggestions" role="listbox" aria-label="Search history and bookmarks"></div>
            </form>
            <div class="chromium-toolbar-right">
              <span class="chromium-offline-tag hidden" id="chromiumOfflineTag" title="Offline Mode — Using cached bookmarks and local history">Offline</span>
              <div class="chromium-portal-channel-group" role="group" aria-label="Portal Channel">
                <button type="button" class="chromium-channel-btn active-a" id="chromiumPortalABtn" title="Portal A">A</button>
                <button type="button" class="chromium-channel-btn" id="chromiumPortalBBtn" title="Portal B">B</button>
              </div>
              <button type="button" class="chromium-mission-mode-btn" id="chromiumMissionToggleBtn" title="Open Portal Trial">Trial</button>
              <button type="button" class="chromium-orbit-mode-btn" id="chromiumOrbitToggleBtn" title="Toggle 3D Tab Overview">Tabs</button>
              <button type="button" class="chromium-proxy-btn is-on" id="chromiumProxyBtn" title="Toggle Web Proxy">Proxy</button>
              <button type="button" class="chromium-warp-btn" id="chromiumWarpBtn" title="Warp to next Portal">Warp</button>
              <button type="button" class="chromium-settings-btn" id="chromiumSettingsBtn" title="Settings &amp; History (chrome://settings)" aria-label="Browser Settings">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="2.2" stroke="currentColor" stroke-width="1.4"/><path d="M8 2.2v1.3M8 12.5v1.3M2.2 8h1.3M12.5 8h1.3M3.9 3.9l.95.95M11.15 11.15l.95.95M12.1 3.9l-.95.95M4.85 11.15l-.95.95" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
              </button>
            </div>
          </div>

          <!-- BOOKMARKS BAR -->
          <div class="chromium-bookmarks-bar" id="chromiumBookmarksBar"></div>

          <!-- BROWSER VIEWPORT -->
          <div class="chromium-viewport-wrap">
            <div class="chromium-loading-bar hidden" id="chromiumLoadingBar" aria-hidden="true"></div>

            <!-- PER-PORTAL MISSION / QUIZ / 5-FLOOR TRIAL / 29-CARD SOUL DUEL CHAMBER -->
            <div class="chromium-mission-panel hidden" id="chromiumMissionPanel" role="region" aria-label="Portal Mission Trial Chamber"></div>

            <!-- INTEGRATED IN-BROWSER SETTINGS, PRIVACY, BOOKMARKS & HISTORY PANEL (chrome://settings) -->
            <div class="chromium-settings-panel hidden" id="chromiumSettingsPanel" role="region" aria-label="Portal Chromium Browser Settings"></div>

            <!-- OTHERWORLD 3D MIRROR-HOUSE TAB ROTUNDA ("LIKE A MIRROR HOUSE ALL AROUND INSIDE THE PORTAL") -->
            <div class="chromium-otherworld-cosmos" id="chromiumOtherworldCosmos">
              <div class="otherworld-nebula-bg" aria-hidden="true">
                <div class="mirror-house-prism-wall">
                  <span class="mirror-prism-col"></span>
                  <span class="mirror-prism-col"></span>
                  <span class="mirror-prism-col"></span>
                  <span class="mirror-prism-col"></span>
                  <span class="mirror-prism-col"></span>
                  <span class="mirror-prism-col"></span>
                  <span class="mirror-prism-col"></span>
                  <span class="mirror-prism-col"></span>
                </div>
                <div class="otherworld-astrolabe-ring ring-outer"></div>
                <div class="otherworld-astrolabe-ring ring-mid"></div>
                <div class="otherworld-astrolabe-ring ring-inner"></div>
                <div class="otherworld-horizon-grid"></div>
              </div>

              <div class="otherworld-header-hud">
                <div class="otherworld-profile-strip" id="otherworldProfileStrip" role="group" aria-label="Quick Browser Profile Switcher"></div>
                <span class="otherworld-kicker">🪞 360° HALL OF MIRRORS POCKET WORLD · CHROMIUM 131 MULTI-PROFILE ROTUNDA</span>
                <h3 class="otherworld-title">Mirror-House of Rolling Tab Worlds All Around You — Click Any Mirror to Enter</h3>
                <p class="otherworld-subtitle">Each Browser Profile keeps its own 3-tier kaleidoscopic Hall of Mirrors (12+ live tabs surrounding you). Spin or click any mirror tab to dive in — or switch to ⚔️ Portal Mission.</p>
              </div>

              <!-- 3D PERSPECTIVE MIRROR-HOUSE STAGE WHERE EVERY TAB SURROUNDS THE PLAYER -->
              <div class="otherworld-orbit-stage" id="chromiumOrbitStage" role="region" aria-label="3D Mirror-House Rolling Tabs Rotunda"></div>

              <!-- ORBIT CONTROLS FOOTER -->
              <div class="otherworld-orbit-controls">
                <button type="button" class="otherworld-ctrl-btn" id="orbitSpinLeftBtn">⟲ Spin Mirrors Left</button>
                <button type="button" class="otherworld-ctrl-btn primary" id="orbitEnterFrontBtn">⚡ Enter Center Mirror World</button>
                <button type="button" class="otherworld-ctrl-btn" id="orbitSpawnTabBtn">+ New Mirror Tab</button>
                <button type="button" class="otherworld-ctrl-btn accent" id="orbitPopulateMirrorsBtn">🪞 +4 Mirror-House Tabs</button>
                <button type="button" class="otherworld-ctrl-btn" id="orbitSpinRightBtn">⟳ Spin Mirrors Right</button>
              </div>
            </div>

            <iframe
              id="chromiumViewportFrame"
              class="chromium-viewport-frame"
              title="Portal Browser Active Tab"
              sandbox="allow-scripts allow-forms allow-popups"
              referrerpolicy="no-referrer"
            ></iframe>
          </div>

          <!-- BROWSER FOOTER STATUS BAR -->
          <div class="chromium-statusbar">
            <span class="chromium-status-left" id="chromiumStatusText">Ready</span>
            <div class="chromium-status-meta">
              <span class="chromium-soul-clock-badge" id="chromiumSoulClockBadge" title="Collected Soul Fragments &amp; Countdown">Souls 0/14 · 40:00:00</span>
              <span class="chromium-status-right" id="chromiumPortalCountText">Press Esc to return</span>
            </div>
          </div>
        </div>
      </div>

      <!-- FULL-VIEWPORT DIMENSIONAL PORTAL SHIFT SCREEN RIPPLE TRANSITION OVERLAY -->
      <div class="portal-shift-ripple-overlay" id="portalShiftRippleOverlay" aria-hidden="true">
        <svg class="portal-shift-svg-defs" width="0" height="0" focusable="false">
          <defs>
            <filter id="portalShiftDisplaceFilter" x="-8%" y="-8%" width="116%" height="116%">
              <feTurbulence type="fractalNoise" baseFrequency="0.014 0.022" numOctaves="2" seed="7" result="noise" />
              <feDisplacementMap id="portalShiftDisplaceMap" in="SourceGraphic" in2="noise" scale="0" xChannelSelector="R" yChannelSelector="G" />
            </filter>
          </defs>
        </svg>
        <div class="portal-ripple-prism"></div>
        <div class="portal-ripple-ring ring-primary"></div>
        <div class="portal-ripple-ring ring-secondary"></div>
        <div class="portal-ripple-ring ring-echo"></div>
        <div class="portal-ripple-banner" id="portalShiftRippleBanner">
          <div class="portal-ripple-kicker">Dimensional Rift Relocated</div>
          <div class="portal-ripple-coords" id="portalShiftRippleCoords">(0, 0) → (0, 0)</div>
          <div class="portal-ripple-sub" id="portalShiftRippleSub">5 portals shifted to fresh mountain coordinates</div>
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
          <button type="button" class="mobile-util-pill mode is-joystick" id="mobileCursorModeBtn" title="Toggle Relative Joystick or Absolute Cursor Mode">🕹️ Joystick</button>
        </div>
        <div class="mobile-cursor-pad" id="mobileCursorPad" data-control-mode="joystick" aria-label="Virtual Relative Joystick and Steering Stick">
          <span class="mobile-pad-label" id="mobilePadLabel">JOYSTICK</span>
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

      <!-- PORTAL MEMORY PROXIMITY PROMPT (APPEARS ONLY NEAR 3D PORTAL GATEWAYS) -->
      <div class="pm-proximity-prompt hidden" id="portalProximityPrompt" role="region" aria-live="polite" aria-label="Nearby Portal Gateway"></div>

      <!-- PORTAL MEMORY REGION TRANSITION BANNER -->
      <div class="pm-region-banner hidden" id="portalRegionBanner" role="status" aria-live="polite"></div>

      <!-- PORTAL MEMORY ATLAS & WORLD DIRECTORY MODAL ([P] OR CENTRAL SANCTUARY ATLAS GATEWAY) -->
      <div class="modal-backdrop hidden" id="portalAtlasModal" role="dialog" aria-modal="true" aria-label="Portal Memory Atlas">
        <div class="modal-card pm-atlas-card">
          <div class="pm-atlas-header">
            <div>
              <div class="pm-atlas-eyebrow">SPATIAL BROWSER MEMORY · 6 WORLD REGIONS</div>
              <h2 class="modal-title pm-atlas-title">Portal Memory Atlas</h2>
            </div>
            <div class="pm-atlas-header-right">
              <span class="pm-atlas-meta" id="portalAtlasMeta">Loading portal memory...</span>
              <button type="button" class="ghost-btn compact" id="closePortalAtlasBtn" aria-label="Close Portal Memory Atlas">Close</button>
            </div>
          </div>
          <div class="pm-atlas-body" id="portalAtlasBody"></div>
          <div class="pm-atlas-footer">
            <span class="pm-atlas-hotkey-note">Walk into any 3D archway or press [U] nearby · [P] Portal Atlas · Deleting a portal erases it from IndexedDB, History &amp; Cache</span>
            <button type="button" class="primary-cta compact" id="closePortalAtlasFooterBtn">Return to World</button>
          </div>
        </div>
      </div>

      <!-- FORGOTTEN SOUL FOUNDRY & SOUL CLAN CONSOLE MODAL -->
      <div class="modal-backdrop hidden" id="foundryConsoleModal" role="dialog" aria-modal="true" aria-label="Forgotten Soul Foundry & Soul Clan Console">
        <div class="modal-card foundry-console-card">
          <div class="foundry-head">
            <div>
              <span class="foundry-kicker">MECHANICAL-FANTASY VERTICAL SLICE · [O]</span>
              <h2 class="modal-title">The Forgotten Soul Foundry</h2>
            </div>
            <div class="foundry-head-actions">
              <button type="button" class="secondary-cta" id="foundryWarpBtn">Warp to Foundry</button>
              <button type="button" class="ghost-btn" id="foundryDebugToggleBtn">Debug [F3]</button>
              <button type="button" class="ghost-btn" id="closeFoundryConsoleBtn">Close</button>
            </div>
          </div>
          <div id="foundryConsoleBody" class="foundry-body"></div>
        </div>
      </div>

      <!-- DEVELOPER DEBUG TELEMETRY OVERLAY (TOGGLE F3) -->
      <aside class="foundry-debug-overlay hidden" id="foundryDebugOverlay" aria-label="Simulation Debug Telemetry"></aside>

      <!-- NON-INTRUSIVE OFFLINE CONNECTIVITY INDICATOR (HIDDEN WHEN ONLINE) -->
      <div class="offline-status-banner hidden" id="offlineStatusBanner" role="status" aria-live="polite">
        <span class="offline-status-dot" aria-hidden="true"></span>
        <span class="offline-status-copy">Offline Mode — Cached bookmarks &amp; local history ready</span>
        <button type="button" class="offline-status-btn" id="offlineOpenHistoryBtn">Open History</button>
      </div>

      <!-- IOS SAFARI GUIDED INSTALL MODAL -->
      <div class="modal-backdrop hidden" id="iosInstallModal" role="dialog" aria-modal="true" aria-label="Install on iPhone or iPad">
        <div class="modal-card compact-modal">
          <h3 class="modal-title">Install Serpent Peaks on iOS</h3>
          <p class="modal-sub">Install Serpent Peaks as an offline-capable Browser &amp; 3D Game on your Home Screen:</p>
          <ol class="ios-install-steps">
            <li>Tap the <strong>Share</strong> icon in Safari’s toolbar.</li>
            <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
            <li>Tap <strong>Add</strong> to launch in fullscreen standalone mode.</li>
          </ol>
          <div class="modal-actions">
            <button type="button" class="primary-cta" id="closeIosInstallBtn">Got It</button>
          </div>
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
    this.combatLogPanelEl = uiLayer.querySelector('#combatLogPanel')!;
    this.combatLogListEl = uiLayer.querySelector('#combatLogList')!;
    this.combatLogSummaryEl = uiLayer.querySelector('#combatLogSummary')!;
    this.combatLogStatusEl = uiLayer.querySelector('#combatLogStatus')!;
    this.complimentBannerEl = uiLayer.querySelector('#complimentWhisper')!;
    this.complimentLabelEl = uiLayer.querySelector('#complimentLabel')!;
    this.complimentTextEl = uiLayer.querySelector('#complimentText')!;
    this.tauntBubbleEl = uiLayer.querySelector('#serpentTauntBubble')!;
    this.tauntBadgeEl = uiLayer.querySelector('#tauntBubbleBadge')!;
    this.tauntTextEl = uiLayer.querySelector('#tauntBubbleText')!;
    this.settingsModal = uiLayer.querySelector('#settingsModal')!;
    this.tutorialOverlay = uiLayer.querySelector('#tutorialOverlay')!;

    this.lootReliquaryModal = uiLayer.querySelector('#lootReliquaryModal')!;
    this.lootReliquaryBodyEl = uiLayer.querySelector('#lootReliquaryBody')!;
    this.lootReliquaryMetaEl = uiLayer.querySelector('#lootReliquaryMeta')!;

    this.portalBrowserModal = uiLayer.querySelector('#portalBrowserModal')!;
    this.chromiumTabListEl = uiLayer.querySelector('#chromiumTabList')!;
    this.chromiumOmniboxForm = uiLayer.querySelector('#chromiumOmniboxForm')!;
    this.chromiumOmniboxInput = uiLayer.querySelector('#chromiumOmniboxInput')!;
    this.chromiumBackBtn = uiLayer.querySelector('#chromiumBackBtn')!;
    this.chromiumFwdBtn = uiLayer.querySelector('#chromiumFwdBtn')!;
    this.chromiumProxyBtn = uiLayer.querySelector('#chromiumProxyBtn')!;
    this.chromiumBookmarkBtn = uiLayer.querySelector('#chromiumBookmarkBtn')!;
    this.chromiumSettingsBtn = uiLayer.querySelector('#chromiumSettingsBtn')!;
    this.chromiumStandaloneBtn = uiLayer.querySelector('#chromiumStandaloneBtn')!;
    this.chromiumWarpBtn = uiLayer.querySelector('#chromiumWarpBtn')!;
    this.chromiumPipBtn = uiLayer.querySelector('#chromiumPipBtn')!;
    this.chromiumOrbitToggleBtn = uiLayer.querySelector('#chromiumOrbitToggleBtn')!;
    this.chromiumMissionToggleBtn = uiLayer.querySelector('#chromiumMissionToggleBtn')!;
    this.chromiumSoulClockBadgeEl = uiLayer.querySelector('#chromiumSoulClockBadge')!;
    this.chromiumPortalABtn = uiLayer.querySelector('#chromiumPortalABtn')!;
    this.chromiumPortalBBtn = uiLayer.querySelector('#chromiumPortalBBtn')!;
    this.chromiumProfileBtn = uiLayer.querySelector('#chromiumProfileBtn')!;
    this.chromiumProfilePopoverEl = uiLayer.querySelector('#chromiumProfilePopover')!;
    this.chromiumBookmarkPopoverEl = uiLayer.querySelector('#chromiumBookmarkPopover')!;
    this.chromiumOmniboxSuggestionsEl = uiLayer.querySelector('#chromiumOmniboxSuggestions')!;
    this.chromiumOtherworldProfileStripEl = uiLayer.querySelector('#otherworldProfileStrip')!;
    this.chromiumBookmarksBarEl = uiLayer.querySelector('#chromiumBookmarksBar')!;
    this.chromiumOtherworldEl = uiLayer.querySelector('#chromiumOtherworldCosmos')!;
    this.chromiumOrbitStageEl = uiLayer.querySelector('#chromiumOrbitStage')!;
    this.chromiumMissionPanelEl = uiLayer.querySelector('#chromiumMissionPanel')!;
    this.chromiumSettingsPanelEl = uiLayer.querySelector('#chromiumSettingsPanel')!;
    this.chromiumLoadingBarEl = uiLayer.querySelector('#chromiumLoadingBar')!;
    this.chromiumViewportFrame = uiLayer.querySelector('#chromiumViewportFrame')!;
    this.chromiumStatusTextEl = uiLayer.querySelector('#chromiumStatusText')!;
    this.chromiumOfflineTagEl = uiLayer.querySelector('#chromiumOfflineTag')!;
    this.offlineStatusBannerEl = uiLayer.querySelector('#offlineStatusBanner')!;
    this.iosInstallModalEl = uiLayer.querySelector('#iosInstallModal')!;
    this.fpvReticleEl = uiLayer.querySelector('#fpvReticle')!;
    this.portalProximityPromptEl = uiLayer.querySelector('#portalProximityPrompt')!;
    this.portalRegionBannerEl = uiLayer.querySelector('#portalRegionBanner')!;
    this.portalAtlasModal = uiLayer.querySelector('#portalAtlasModal')!;
    this.portalAtlasBodyEl = uiLayer.querySelector('#portalAtlasBody')!;
    this.portalAtlasMetaEl = uiLayer.querySelector('#portalAtlasMeta')!;
    this.foundryConsoleModal = uiLayer.querySelector('#foundryConsoleModal')!;
    this.foundryConsoleBodyEl = uiLayer.querySelector('#foundryConsoleBody')!;
    this.foundryDebugOverlayEl = uiLayer.querySelector('#foundryDebugOverlay')!;

    this.mobileLeftClusterEl = uiLayer.querySelector('#mobileLeftCluster')!;
    this.mobileActionRowEl = uiLayer.querySelector('#mobileActionRow')!;
    this.mobileVirtualCursorEl = uiLayer.querySelector('#mobileVirtualCursor')!;
    this.mobileCursorPadEl = uiLayer.querySelector('#mobileCursorPad')!;
    this.mobileCursorPuckEl = uiLayer.querySelector('#mobileCursorPuck')!;
    this.mobileCursorModeBtn = uiLayer.querySelector('#mobileCursorModeBtn')!;
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
    this.portalDistEl = uiLayer.querySelector('#hudPortalDist')!;
    this.portalDistPeakEl = uiLayer.querySelector('#hudPortalDistPeak')!;
    this.portalDistMetersEl = uiLayer.querySelector('#hudPortalDistMeters')!;
    this.portalDistStatusEl = uiLayer.querySelector('#hudPortalDistStatus')!;
    this.portalDistFillEl = uiLayer.querySelector('#hudPortalDistFill')!;
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
    this.minimapCaptionEl = uiLayer.querySelector('#minimapCaption')!;

    this.globalRankingModal = uiLayer.querySelector('#globalRankingModal')!;
    this.rankingPortalBannerEl = uiLayer.querySelector('#rankingPortalBanner')!;
    this.rankingAuthBarEl = uiLayer.querySelector('#rankingAuthBar')!;
    this.rankingCallsignInput = uiLayer.querySelector('#rankingCallsignInput')!;
    this.rankingSubmitBtn = uiLayer.querySelector('#rankingSubmitBtn')!;
    this.rankingDeleteOwnBtn = uiLayer.querySelector('#rankingDeleteOwnBtn')!;
    this.rankingDossierStatsEl = uiLayer.querySelector('#rankingDossierStats')!;
    this.rankingStatusEl = uiLayer.querySelector('#rankingStatusMsg')!;
    this.rankingStandingEl = uiLayer.querySelector('#rankingStandingStrip')!;
    this.rankingPodiumEl = uiLayer.querySelector('#rankingPodium')!;
    this.rankingCompareEl = uiLayer.querySelector('#rankingCompareCard')!;
    this.rankingRowsEl = uiLayer.querySelector('#rankingRowsBody')!;
    this.portalShiftRippleOverlayEl = uiLayer.querySelector('#portalShiftRippleOverlay')!;
    this.portalShiftRippleBannerEl = uiLayer.querySelector('#portalShiftRippleBanner')!;
    this.portalShiftRippleCoordsEl = uiLayer.querySelector('#portalShiftRippleCoords')!;
    this.portalShiftRippleSubEl = uiLayer.querySelector('#portalShiftRippleSub')!;
    this.portalShiftDisplaceEl = uiLayer.querySelector('#portalShiftDisplaceMap');

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

    this.sentryStealthBannerEl = uiLayer.querySelector('#sentryStealthBanner')!;
    this.sentryBannerTitleEl = uiLayer.querySelector('#sentryBannerTitle')!;
    this.sentryBannerStateEl = uiLayer.querySelector('#sentryBannerState')!;
    this.sentrySuspicionFillEl = uiLayer.querySelector('#sentrySuspicionFill')!;
    this.sentryBannerHintEl = uiLayer.querySelector('#sentryBannerHint')!;
    this.soulArchivesModal = uiLayer.querySelector('#soulArchivesModal')!;
    this.soulArchivesCountEl = uiLayer.querySelector('#soulArchivesCount')!;
    this.soulArchivesListEl = uiLayer.querySelector('#soulArchivesList')!;
    this.soulArchivesReaderEl = uiLayer.querySelector('#soulArchivesReader')!;
    this.pauseSoulArchivesBtn = uiLayer.querySelector('#pauseSoulArchivesBtn')!;

    this.loreUnlockToastEl = uiLayer.querySelector('#loreUnlockToast')!;
    this.loreToastOpenBtn = uiLayer.querySelector('#loreToastOpenBtn')!;
    this.loreToastDismissBtn = uiLayer.querySelector('#loreToastDismissBtn')!;
    this.loreToastEmblemEl = uiLayer.querySelector('#loreToastEmblem')!;
    this.loreToastKickerEl = uiLayer.querySelector('#loreToastKicker')!;
    this.loreToastTitleEl = uiLayer.querySelector('#loreToastTitle')!;
    this.loreToastSourceEl = uiLayer.querySelector('#loreToastSource')!;
    this.loreToastProgressEl = uiLayer.querySelector('#loreToastProgress')!;

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
    this.game.setCombatLogListener((event) => {
      if (event === null) {
        this.clearCombatLog();
      } else {
        this.pushCombatLogEntry(event);
      }
    });
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
    this.root.querySelector('#hudPortalBtn')?.addEventListener('click', () => {
      this.game.openPortalBrowserOverlay();
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
    this.root.querySelector('#pauseGlobalRankingBtn')!.addEventListener('click', () => {
      this.pauseModal.classList.add('hidden');
      this.openGlobalRankingModal(false);
    });
    this.root.querySelector('#launchBrowserTitleBtn')?.addEventListener('click', () => {
      this.launchStandaloneBrowser();
    });
    this.root.querySelector('#pausePortalAtlasBtn')?.addEventListener('click', () => {
      this.pauseModal.classList.add('hidden');
      this.openPortalAtlasModal();
    });
    this.root.querySelector('#pauseFoundryConsoleBtn')?.addEventListener('click', () => {
      this.pauseModal.classList.add('hidden');
      this.openFoundryConsoleModal();
    });
    this.root.querySelector('#closeFoundryConsoleBtn')?.addEventListener('click', () => {
      this.closeFoundryConsoleModal();
    });
    this.root.querySelector('#foundryWarpBtn')?.addEventListener('click', () => {
      this.closeFoundryConsoleModal();
      this.game.warpToForgottenFoundry();
    });
    this.root.querySelector('#foundryDebugToggleBtn')?.addEventListener('click', () => {
      this.toggleFoundryDebugOverlay();
    });
    this.foundryConsoleModal.addEventListener('click', (e) => {
      if (e.target === this.foundryConsoleModal) {
        this.closeFoundryConsoleModal();
      }
    });
    this.foundryConsoleBodyEl.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const btn = target.closest<HTMLButtonElement>('button[data-foundry-act]');
      if (!btn) return;
      const act = btn.dataset.foundryAct;
      const val = btn.dataset.foundryVal || '';
      if (act === 'gear_r1') this.game.foundry.updateGearPuzzle({ gear1Radius: Number(val) });
      else if (act === 'gear_r2') this.game.foundry.updateGearPuzzle({ gear2Radius: Number(val) });
      else if (act === 'gear_r3') this.game.foundry.updateGearPuzzle({ gear3Radius: Number(val) });
      else if (act === 'gear_reverse') {
        const cur = this.game.foundry.getState().gearPuzzle.reverseIdlerEngaged;
        this.game.foundry.updateGearPuzzle({ reverseIdlerEngaged: !cur });
      } else if (act === 'toggle_switch' && (val === 'switchA' || val === 'switchB' || val === 'switchC')) {
        this.game.foundry.toggleSwitch(val);
      } else if (act === 'set_primary' && val in SOUL_DISCIPLINES) {
        const sec = this.game.foundry.getState().resources.secondaryDiscipline;
        this.game.foundry.selectDisciplines(val as SoulDisciplineId, sec);
      } else if (act === 'set_secondary') {
        const pri = this.game.foundry.getState().resources.primaryDiscipline;
        this.game.foundry.selectDisciplines(pri, val ? (val as SoulDisciplineId) : null);
      } else if (act === 'cast_discipline') {
        const res = this.game.foundry.castDiscipline();
        this.showToast(res.message);
      } else if (act === 'reset_encounter') {
        this.game.foundry.resetFoundryEncounter();
        this.showToast('Foundry encounter reset.');
      }
      this.renderFoundryConsoleModal();
    });
    this.foundryConsoleBodyEl.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      if (target.id === 'foundryValveRange') {
        this.game.foundry.adjustValve(Number(target.value) / 100);
        this.renderFoundryConsoleModal();
      }
    });
    this.game.foundry.subscribe(() => {
      if (!this.foundryConsoleModal.classList.contains('hidden')) {
        this.renderFoundryConsoleModal();
      }
      if (this.foundryDebugVisible) {
        this.renderFoundryDebugOverlay();
      }
    });
    this.root.querySelector('#pausePortalBrowserBtn')!.addEventListener('click', () => {
      this.pauseModal.classList.add('hidden');
      this.openPortalBrowserModal();
    });
    this.root.querySelector('#pauseLootReliquaryBtn')?.addEventListener('click', () => {
      this.pauseModal.classList.add('hidden');
      this.openLootReliquaryModal();
    });
    this.pauseSoulArchivesBtn.addEventListener('click', () => {
      this.pauseModal.classList.add('hidden');
      this.openSoulArchivesModal();
    });

    // Portal Memory World callbacks & UI bindings
    this.game.setPortalMemoryCallbacks({
      onPromptChange: (prompt) => {
        this.renderPortalProximityPrompt(prompt);
      },
      onRegionChange: (region) => {
        this.showPortalRegionBanner(region);
      },
      onActivatePortal: (node) => {
        this.handlePortalMemoryActivation(node);
      },
    });
    this.game.portalWorld.memory.subscribe(() => {
      if (!this.portalAtlasModal.classList.contains('hidden')) {
        this.renderPortalAtlasModal();
      }
    });

    this.portalProximityPromptEl.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-pm-enter]')) {
        this.game.portalWorld.activateNearestPortal();
        return;
      }
      const pinBtn = target.closest<HTMLButtonElement>('[data-pm-pin]');
      if (pinBtn?.dataset.pmPin) {
        void this.game.portalWorld.memory.togglePinRecord(pinBtn.dataset.pmPin).then((pinned) => {
          this.showToast(pinned ? 'Portal pinned with Golden Frame in Portal Halls.' : 'Portal unpinned.');
        });
        return;
      }
      const delBtn = target.closest<HTMLButtonElement>('[data-pm-delete]');
      if (delBtn?.dataset.pmDelete) {
        void this.game.portalWorld.memory.deleteRecordPermanently(delBtn.dataset.pmDelete).then(() => {
          this.showToast('Portal permanently deleted from memory, history & offline cache.');
          this.renderPortalProximityPrompt(null);
        });
      }
    });

    this.root.querySelector('#closePortalAtlasBtn')?.addEventListener('click', () => {
      this.closePortalAtlasModal();
    });
    this.root.querySelector('#closePortalAtlasFooterBtn')?.addEventListener('click', () => {
      this.closePortalAtlasModal();
    });
    this.portalAtlasModal.addEventListener('click', (e) => {
      if (e.target === this.portalAtlasModal) {
        this.closePortalAtlasModal();
      }
    });
    this.portalAtlasBodyEl.addEventListener('input', (e) => {
      const target = e.target as HTMLElement;
      if (target.id === 'pmAtlasSearchInput') {
        this.portalAtlasSearchQuery = (target as HTMLInputElement).value;
        this.updatePortalAtlasListInPlace();
      }
    });
    this.portalAtlasBodyEl.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const regFilter = target.closest<HTMLButtonElement>('[data-pm-region-filter]');
      if (regFilter?.dataset.pmRegionFilter) {
        this.portalAtlasRegionFilter = regFilter.dataset.pmRegionFilter as PortalRegionId | 'all';
        this.game.sound.playClick();
        this.renderPortalAtlasModal();
        return;
      }
      const warpReg = target.closest<HTMLButtonElement>('[data-pm-warp-region]');
      if (warpReg?.dataset.pmWarpRegion) {
        const regId = warpReg.dataset.pmWarpRegion as PortalRegionId;
        this.closePortalAtlasModal();
        this.game.warpToPortalMemoryRegion(regId);
        return;
      }
      const openRec = target.closest<HTMLButtonElement>('[data-pm-open-record]');
      if (openRec?.dataset.pmOpenRecord) {
        const node = this.game.portalWorld.manager.findNodeById(openRec.dataset.pmOpenRecord);
        this.closePortalAtlasModal();
        if (node) {
          this.handlePortalMemoryActivation(node);
        }
        return;
      }
      const warpRec = target.closest<HTMLButtonElement>('[data-pm-warp-record]');
      if (warpRec?.dataset.pmWarpRecord) {
        const node = this.game.portalWorld.manager.findNodeById(warpRec.dataset.pmWarpRecord);
        if (node) {
          this.closePortalAtlasModal();
          this.game.warpToPortalMemoryCoords(node.x, node.z, node.title);
        }
        return;
      }
      const pinRec = target.closest<HTMLButtonElement>('[data-pm-pin-record]');
      if (pinRec?.dataset.pmPinRecord) {
        void this.game.portalWorld.memory.togglePinRecord(pinRec.dataset.pmPinRecord).then((pinned) => {
          this.game.sound.playClick();
          this.showToast(pinned ? 'Pinned to Portal Halls (Golden Frame).' : 'Unpinned portal.');
          this.renderPortalAtlasModal();
        });
        return;
      }
      const delRec = target.closest<HTMLButtonElement>('[data-pm-delete-record]');
      if (delRec?.dataset.pmDeleteRecord) {
        void this.game.portalWorld.memory.deleteRecordPermanently(delRec.dataset.pmDeleteRecord).then(() => {
          this.game.sound.playClick();
          this.showToast('Portal permanently deleted from memory, history & offline cache.');
          this.renderPortalAtlasModal();
        });
        return;
      }
      if (target.closest('#pmCreateCollectionBtn')) {
        const nameInp = this.portalAtlasBodyEl.querySelector<HTMLInputElement>('#pmNewCollectionName');
        const urlInp = this.portalAtlasBodyEl.querySelector<HTMLInputElement>('#pmNewCollectionUrl');
        const name = nameInp?.value.trim() ?? '';
        if (!name) {
          this.showToast('Enter a collection name to create a Gateway Hub.');
          return;
        }
        const col = this.game.portalWorld.memory.createCollection(name, 'User-created Gateway Hub');
        const urlVal = urlInp?.value.trim() ?? '';
        if (urlVal) {
          this.game.portalWorld.memory.addUrlToCollection(col.id, urlVal);
        }
        this.game.sound.playClick();
        this.showToast(`Created Gateway Hub "${col.name}" in Portal Halls!`);
        this.renderPortalAtlasModal();
        return;
      }
      const shareCol = target.closest<HTMLButtonElement>('[data-pm-share-col]');
      if (shareCol?.dataset.pmShareCol) {
        const code = this.game.portalWorld.memory.encodeCollectionShareCode(shareCol.dataset.pmShareCol);
        if (code && navigator.clipboard?.writeText) {
          void navigator.clipboard.writeText(code);
          this.showToast('Copied Gateway Hub collection share code to clipboard!');
        } else if (code) {
          this.showToast(`Share code: ${code.slice(0, 32)}...`);
        }
        return;
      }
      const delCol = target.closest<HTMLButtonElement>('[data-pm-del-col]');
      if (delCol?.dataset.pmDelCol) {
        void this.game.portalWorld.memory.deleteCollection(delCol.dataset.pmDelCol).then(() => {
          this.game.sound.playClick();
          this.showToast('Deleted Gateway Hub collection.');
          this.renderPortalAtlasModal();
        });
        return;
      }
      if (target.closest('#pmClearRecoveryBtn')) {
        void this.game.portalWorld.memory.clearRecoveryRecords().then((n) => {
          this.game.sound.playClick();
          this.showToast(`Cleared ${n} lost session portal${n === 1 ? '' : 's'} from Forgotten Ruins.`);
          this.renderPortalAtlasModal();
        });
        return;
      }
    });

    // Loot Reliquary Modal events
    this.root.querySelector('#closeLootReliquaryBtn')?.addEventListener('click', () => {
      this.closeLootReliquaryModal();
    });
    this.root.querySelector('#closeLootReliquaryFooterBtn')?.addEventListener('click', () => {
      this.closeLootReliquaryModal();
    });
    this.lootReliquaryModal.addEventListener('click', (e) => {
      if (e.target === this.lootReliquaryModal) {
        this.closeLootReliquaryModal();
      }
    });
    this.lootReliquaryBodyEl.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-refine-recipe]');
      if (!btn || !btn.dataset.refineRecipe) return;
      if (this.game.refinePortalLootRecipe(btn.dataset.refineRecipe)) {
        this.renderLootReliquaryModal();
      }
    });

    // Soul Clan Archives Lore Gallery Modal events
    this.root.querySelector('#closeSoulArchivesBtn')!.addEventListener('click', () => {
      this.closeSoulArchivesModal();
    });
    this.root.querySelector('#closeSoulArchivesFooterBtn')!.addEventListener('click', () => {
      this.closeSoulArchivesModal();
    });
    this.soulArchivesModal.addEventListener('click', (e) => {
      if (e.target === this.soulArchivesModal) {
        this.closeSoulArchivesModal();
      }
    });
    this.root.querySelectorAll<HTMLButtonElement>('.archives-filter-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const next = btn.dataset.afilter as 'all' | 'sentry' | 'chronicle' | 'unlocked';
        if (!next) return;
        this.soulArchivesFilter = next;
        this.game.sound.playClick();
        this.renderSoulArchivesModal();
      });
    });
    this.soulArchivesListEl.addEventListener('click', (e) => {
      const row = (e.target as HTMLElement).closest<HTMLButtonElement>('.archives-row');
      if (!row || !row.dataset.entryId) return;
      this.selectedSoulArchiveId = row.dataset.entryId;
      this.game.sound.playClick();
      this.renderSoulArchivesModal();
    });

    // Subtle "New Lore Unlocked" toast direct link to Soul Clan Archives
    this.loreToastOpenBtn.addEventListener('click', () => {
      const targetEntryId = this.activeLoreToast?.entryId;
      this.dismissLoreUnlockToast(false);
      this.openSoulArchivesModal(targetEntryId);
    });
    this.loreToastDismissBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.dismissLoreUnlockToast(true);
    });
    this.loreUnlockToastEl.addEventListener('pointerenter', () => {
      this.loreToastHovered = true;
      window.clearTimeout(this.loreToastTimer);
      this.loreUnlockToastEl.classList.add('is-paused');
    });
    this.loreUnlockToastEl.addEventListener('pointerleave', () => {
      this.loreToastHovered = false;
      this.loreUnlockToastEl.classList.remove('is-paused');
      if (this.activeLoreToast) {
        this.scheduleLoreToastAutoHide(2400);
      }
    });
    this.loreUnlockToastEl.addEventListener('focusin', () => {
      this.loreToastHovered = true;
      window.clearTimeout(this.loreToastTimer);
      this.loreUnlockToastEl.classList.add('is-paused');
    });
    this.loreUnlockToastEl.addEventListener('focusout', () => {
      this.loreToastHovered = false;
      this.loreUnlockToastEl.classList.remove('is-paused');
      if (this.activeLoreToast) {
        this.scheduleLoreToastAutoHide(2400);
      }
    });
    this.root.querySelector('#pauseBestiaryBtn')!.addEventListener('click', () => this.openBestiaryModal());
    this.root.querySelector('#pauseSummaryBtn')!.addEventListener('click', () => this.openCurrentSummaryForReview());
    this.root.querySelector('#pauseJourneyBtn')!.addEventListener('click', () => this.openJourneyModal());
    this.root.querySelector('#pauseRestartBtn')!.addEventListener('click', () => this.game.startGame());
    this.root.querySelector('#pauseBuilderBtn')!.addEventListener('click', () => this.game.enterBuilder());
    this.root.querySelector('#pauseTitleBtn')!.addEventListener('click', () => this.game.returnToTitle());

    this.bindGlobalRankingEvents();

    // Game Over modal
    this.root.querySelector('#retryBtn')!.addEventListener('click', () => this.game.startGame());
    this.root.querySelector('#goSummaryBtn')!.addEventListener('click', () => this.openCurrentSummaryForReview());
    this.root.querySelector('#goTitleBtn')!.addEventListener('click', () => this.game.returnToTitle());

    // Share modal
    this.root.querySelector('#closeShareBtn')!.addEventListener('click', () => {
      this.shareModal.classList.add('hidden');
    });

    // --- Unified Game & Browser Settings Modal ---
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredInstallPrompt = e as Event & {
        prompt: () => Promise<void>;
        userChoice: Promise<{ outcome: string }>;
      };
      this.syncInstallButtonsVisibility();
    });
    window.addEventListener('appinstalled', () => {
      this.deferredInstallPrompt = null;
      this.syncInstallButtonsVisibility();
    });

    this.root.querySelector('#offlineOpenHistoryBtn')?.addEventListener('click', () => {
      this.game.sound.playClick();
      this.launchStandaloneBrowser('history');
    });
    this.root.querySelector('#closeIosInstallBtn')?.addEventListener('click', () => {
      this.iosInstallModalEl.classList.add('hidden');
      this.syncModalFreeze();
    });
    this.game.offlineCache.subscribe(() => {
      this.syncOfflineUiState();
    });
    this.syncOfflineUiState();
    this.syncInstallButtonsVisibility();

    const openSettingsModal = (initialTab: 'game' | 'browser' = 'game') => {
      this.settingsActiveTab = initialTab;
      this.syncUnifiedSettingsUi();
      this.settingsModal.classList.remove('hidden');
      this.game.setModalFreeze(true);
    };
    this.root.querySelector('#openSettingsTitleBtn')?.addEventListener('click', () => openSettingsModal('game'));
    this.root.querySelector('#pauseSettingsBtn')?.addEventListener('click', () => openSettingsModal('game'));
    this.root.querySelector('#closeSettingsBtn')!.addEventListener('click', () => {
      this.settingsModal.classList.add('hidden');
      this.syncModalFreeze();
    });

    this.root.querySelectorAll<HTMLButtonElement>('.settings-tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const next = btn.dataset.stab === 'browser' ? 'browser' : 'game';
        this.settingsActiveTab = next;
        this.game.sound.playClick();
        this.syncUnifiedSettingsUi();
      });
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

    // Browser & Release Settings bindings inside #settingsModal
    this.root.querySelectorAll<HTMLButtonElement>('[data-bsetting-startup]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.bsettingStartup as StartupMode;
        this.game.portalBrowser.updateSettings({ startupMode: mode });
        this.game.sound.playClick();
        this.syncUnifiedSettingsUi();
        this.showToast(
          mode === 'browser'
            ? 'Startup mode set to Web Browser (launches directly into Portal Chromium).'
            : 'Startup mode set to 3D Game (Serpent Peaks).',
        );
      });
    });

    const searchEngSel = this.root.querySelector<HTMLSelectElement>('#settingsSearchEngineSel');
    searchEngSel?.addEventListener('change', () => {
      this.game.portalBrowser.updateSettings({
        searchEngine: searchEngSel.value as SearchEngineId,
      });
      this.syncUnifiedSettingsUi();
      this.renderPortalChromiumBrowser(false);
    });

    const saveHomepage = () => {
      const inp = this.root.querySelector<HTMLInputElement>('#settingsHomepageInput');
      if (!inp) return;
      const val = inp.value.trim() || 'chrome://newtab';
      this.game.portalBrowser.updateSettings({ homepageUrl: val });
      this.syncUnifiedSettingsUi();
      this.showToast(`Browser homepage saved: ${val}`);
    };
    this.root.querySelector('#settingsSaveHomepageBtn')?.addEventListener('click', saveHomepage);

    const uaSel = this.root.querySelector<HTMLSelectElement>('#settingsUaSel');
    uaSel?.addEventListener('change', () => {
      this.game.portalBrowser.updateSettings({
        userAgentPreset: uaSel.value as UserAgentPreset,
      });
      this.lastLoadedIframeKey = '';
      this.syncUnifiedSettingsUi();
      this.renderPortalChromiumBrowser(true);
    });

    const zoomSlider = this.root.querySelector<HTMLInputElement>('#settingsZoomSlider');
    zoomSlider?.addEventListener('input', () => {
      const z = Number(zoomSlider.value);
      this.game.portalBrowser.updateSettings({ zoomPercent: z });
      const valEl = this.root.querySelector('#settingsZoomVal');
      if (valEl) valEl.textContent = `${z}%`;
      this.applyBrowserViewportZoom();
    });

    this.root.querySelector<HTMLInputElement>('#settingsTrackerShieldChk')?.addEventListener('change', (e) => {
      const checked = (e.target as HTMLInputElement).checked;
      this.game.portalBrowser.updateSettings({ trackerShield: checked });
      this.lastLoadedIframeKey = '';
      this.renderPortalChromiumBrowser(true);
    });
    this.root.querySelector<HTMLInputElement>('#settingsDefaultProxyChk')?.addEventListener('change', (e) => {
      const checked = (e.target as HTMLInputElement).checked;
      this.game.portalBrowser.updateSettings({ defaultProxyMode: checked });
    });
    this.root.querySelector<HTMLInputElement>('#settingsBookmarksBarChk')?.addEventListener('change', (e) => {
      const checked = (e.target as HTMLInputElement).checked;
      this.game.portalBrowser.updateSettings({ showBookmarksBar: checked });
      this.renderPortalChromiumBrowser(false);
    });
    this.root.querySelector('#settingsLaunchBrowserNowBtn')?.addEventListener('click', () => {
      this.settingsModal.classList.add('hidden');
      this.launchStandaloneBrowser();
    });
    this.root.querySelector('#settingsOpenHistoryBtn')?.addEventListener('click', () => {
      this.settingsModal.classList.add('hidden');
      this.launchStandaloneBrowser('history');
    });
    this.root.querySelector('#settingsInstallPwaBtn')?.addEventListener('click', () => {
      void this.triggerPwaInstallPrompt();
    });
    this.root.querySelector('#settingsClearOfflineCacheBtn')?.addEventListener('click', () => {
      void this.handleClearAllOfflineCache();
    });
    this.root.querySelector('#settingsClearHistoryBtn')?.addEventListener('click', () => {
      this.game.portalBrowser.clearHistory();
      this.showToast('Browsing history cleared.');
      if (this.portalBrowserSettingsMode) this.renderBrowserSettingsPanel();
    });
    this.root.querySelector('#settingsResetBrowserBtn')?.addEventListener('click', () => {
      this.game.portalBrowser.resetSettings();
      this.syncUnifiedSettingsUi();
      this.renderPortalChromiumBrowser(false);
      this.showToast('Browser settings restored to defaults.');
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
    this.portalBrowserModal.classList.add('hidden');
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
    this.portalBrowserModal.classList.add('hidden');
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
    this.soulArchivesModal.classList.add('hidden');
    this.portalBrowserModal.classList.add('hidden');
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

  public openSoulArchivesModal(focusEntryId?: string): void {
    this.journeyModal.classList.add('hidden');
    this.evolutionSummaryModal.classList.add('hidden');
    this.shareModal.classList.add('hidden');
    this.bestiaryModal.classList.add('hidden');
    this.globalRankingModal.classList.add('hidden');
    this.portalBrowserModal.classList.add('hidden');
    this.pauseModal.classList.add('hidden');
    this.soulArchivesModal.classList.remove('hidden');

    if (focusEntryId) {
      this.soulArchivesFilter = 'all';
      this.selectedSoulArchiveId = focusEntryId;
    } else {
      const snap = this.game.getSoulArchiveSnapshot();
      const cur = snap.entries.find((e) => e.def.id === this.selectedSoulArchiveId);
      if (!cur || !cur.record.unlocked) {
        const firstUnlocked = snap.entries.find((e) => e.record.unlocked);
        if (firstUnlocked) {
          this.selectedSoulArchiveId = firstUnlocked.def.id;
        }
      }
    }

    this.renderSoulArchivesModal();
    if (focusEntryId) {
      const selectedRow = this.soulArchivesListEl.querySelector<HTMLElement>('.archives-row.selected');
      selectedRow?.scrollIntoView({ block: 'nearest' });
    }
    this.syncModalFreeze();
    this.game.sound.playClick();
  }

  public showLoreUnlockedToast(notice: LoreUnlockNotice): void {
    if (
      this.activeLoreToast?.entryId === notice.entryId ||
      this.loreToastQueue.some((q) => q.entryId === notice.entryId)
    ) {
      return;
    }
    this.loreToastQueue.push(notice);
    if (!this.activeLoreToast) {
      this.presentNextLoreToast();
    }
  }

  private presentNextLoreToast(): void {
    const next = this.loreToastQueue.shift();
    if (!next) {
      this.activeLoreToast = null;
      return;
    }
    this.activeLoreToast = next;
    window.clearTimeout(this.loreToastTimer);
    window.clearTimeout(this.loreToastLeaveTimer);

    const sourceLabel =
      next.source === 'portal'
        ? 'New Portal Discovered'
        : next.source === 'sentry'
          ? 'New Sentry Encountered'
          : 'Soul Clan Chronicle';

    this.loreUnlockToastEl.style.setProperty('--lore-accent', next.accentHex);
    this.loreToastEmblemEl.innerHTML = renderSoulArchiveEmblemSvg(
      next.entryId,
      next.accentHex,
      true,
    );
    this.loreToastKickerEl.textContent = `New Lore Unlocked · ${next.unlockedCount} / ${next.totalCount}`;
    this.loreToastTitleEl.textContent = next.title;
    this.loreToastSourceEl.textContent = sourceLabel;

    this.loreUnlockToastEl.classList.remove('hidden', 'is-leaving', 'is-visible', 'is-paused');
    // Restart hairline timer bar animation cleanly
    this.loreToastProgressEl.classList.remove('is-running');
    void this.loreUnlockToastEl.offsetWidth;
    this.loreUnlockToastEl.classList.add('is-visible');
    this.loreToastProgressEl.classList.add('is-running');

    if (!this.loreToastHovered) {
      this.scheduleLoreToastAutoHide(6500);
    }
  }

  private scheduleLoreToastAutoHide(delayMs: number): void {
    window.clearTimeout(this.loreToastTimer);
    this.loreToastTimer = window.setTimeout(() => {
      if (!this.loreToastHovered) {
        this.dismissLoreUnlockToast(true);
      }
    }, delayMs);
  }

  private dismissLoreUnlockToast(showNext: boolean): void {
    window.clearTimeout(this.loreToastTimer);
    window.clearTimeout(this.loreToastLeaveTimer);
    if (!showNext) {
      this.loreToastQueue = [];
    }
    this.activeLoreToast = null;
    this.loreUnlockToastEl.classList.remove('is-visible', 'is-paused');
    this.loreUnlockToastEl.classList.add('is-leaving');
    this.loreToastProgressEl.classList.remove('is-running');

    this.loreToastLeaveTimer = window.setTimeout(() => {
      this.loreUnlockToastEl.classList.add('hidden');
      this.loreUnlockToastEl.classList.remove('is-leaving');
      if (showNext && this.loreToastQueue.length > 0) {
        this.presentNextLoreToast();
      }
    }, 220);
  }

  public closeSoulArchivesModal(): void {
    if (this.soulArchivesModal.classList.contains('hidden')) return;
    this.soulArchivesModal.classList.add('hidden');
    this.syncModalFreeze();
    this.game.sound.playClick();
  }

  public toggleSoulArchivesModal(): void {
    if (this.soulArchivesModal.classList.contains('hidden')) {
      this.openSoulArchivesModal();
    } else {
      this.closeSoulArchivesModal();
    }
  }

  public openLootReliquaryModal(): void {
    this.journeyModal.classList.add('hidden');
    this.evolutionSummaryModal.classList.add('hidden');
    this.shareModal.classList.add('hidden');
    this.bestiaryModal.classList.add('hidden');
    this.soulArchivesModal.classList.add('hidden');
    this.globalRankingModal.classList.add('hidden');
    this.portalBrowserModal.classList.add('hidden');
    this.pauseModal.classList.add('hidden');
    this.lootReliquaryModal.classList.remove('hidden');
    this.renderLootReliquaryModal();
    this.syncModalFreeze();
    this.game.sound.playClick();
  }

  public closeLootReliquaryModal(): void {
    if (this.lootReliquaryModal.classList.contains('hidden')) return;
    this.lootReliquaryModal.classList.add('hidden');
    this.syncModalFreeze();
    this.game.sound.playClick();
  }

  public toggleLootReliquaryModal(): void {
    if (this.lootReliquaryModal.classList.contains('hidden')) {
      this.openLootReliquaryModal();
    } else {
      this.closeLootReliquaryModal();
    }
  }

  private renderLootReliquaryModal(): void {
    const mgr = this.game.portalLoot;
    const state = mgr.getState();
    const buff = mgr.getActiveBuff();
    const effectiveMult = mgr.getEffectiveCultivationMultiplier();
    const permRes = mgr.getPermanentResonancePct();
    const totalMats = mgr.getTotalMaterialCount();

    this.lootReliquaryMetaEl.textContent = `${effectiveMult.toFixed(2)}× Cultivation · +${permRes}% Permanent Resonance · ${totalMats} Materials`;

    const buffCardHtml = buff
      ? `
        <div class="reliquary-buff-banner" style="--loot-accent:${buff.accentHex}">
          <div class="reliquary-buff-icon">${renderLootIconSvg('elixir', buff.accentHex, buff.rarity)}</div>
          <div class="reliquary-buff-copy">
            <div class="reliquary-kicker">Active Cultivation Multiplier · ${LOOT_RARITY_META[buff.rarity].label}</div>
            <div class="reliquary-buff-name">${buff.name} · <strong>${buff.multiplier.toFixed(2)}×</strong></div>
            <div class="reliquary-buff-sub">Total effective XP &amp; Qi rate: ${effectiveMult.toFixed(2)}× · Time remaining: ${formatLootDuration(buff.remainingSec)}</div>
          </div>
        </div>
      `
      : `
        <div class="reliquary-buff-banner is-idle" style="--loot-accent:#3de095">
          <div class="reliquary-buff-icon">${renderLootIconSvg('elixir', '#3de095', 'uncommon')}</div>
          <div class="reliquary-buff-copy">
            <div class="reliquary-kicker">No Active Timed Elixir</div>
            <div class="reliquary-buff-name">Base Cultivation Speed · <strong>${effectiveMult.toFixed(2)}×</strong></div>
            <div class="reliquary-buff-sub">Complete any Portal Mission or refine rare materials below to activate a timed 1.35×–2.65× multiplier.</div>
          </div>
        </div>
      `;

    const recipesHtml = REFINEMENT_RECIPES.map((r) => {
      const have = mgr.getMaterialCountByRarity(r.requiredRarity);
      const ready = have >= r.requiredCount;
      return `
        <div class="reliquary-recipe-row" style="--loot-accent:${r.reward.accentHex}">
          <div class="reliquary-recipe-copy">
            <div class="reliquary-recipe-title">${r.title}</div>
            <div class="reliquary-recipe-meta">${r.summary} · Stockpile: ${have}/${r.requiredCount} ${LOOT_RARITY_META[r.requiredRarity].label}</div>
          </div>
          <button type="button" class="${ready ? 'primary-cta' : 'ghost-btn'} compact" data-refine-recipe="${r.id}" ${ready ? '' : 'disabled'}>
            Refine
          </button>
        </div>
      `;
    }).join('');

    const materialsHtml = RARE_MATERIALS_CATALOG.map((def) => {
      const qty = state.materials[def.id] ?? 0;
      const discovered = state.discoveredMaterialIds.includes(def.id);
      return `
        <div class="reliquary-mat-card ${discovered ? 'is-discovered' : 'is-locked'}" style="--loot-accent:${def.accentHex}">
          <div class="reliquary-mat-top">
            <span class="reliquary-mat-icon">${renderLootIconSvg('material', def.accentHex, def.rarity)}</span>
            <span class="reliquary-mat-qty">×${qty}</span>
          </div>
          <div class="reliquary-mat-name">${def.name}</div>
          <div class="reliquary-mat-meta">${LOOT_RARITY_META[def.rarity].label} · ${def.origin}</div>
          <p class="reliquary-mat-desc">${def.description}</p>
        </div>
      `;
    }).join('');

    const recentHtml =
      state.recentDrops.length > 0
        ? state.recentDrops
            .slice(0, 6)
            .map((drop) => {
              const mats = drop.materials.map((m) => `${m.quantity}× ${m.name}`).join(', ');
              return `
                <div class="reliquary-drop-row">
                  <div class="reliquary-drop-title">${this.escapeHtmlText(drop.missionTitle)}</div>
                  <div class="reliquary-drop-meta">${drop.difficulty.label} · ${drop.multiplierReward.multiplier.toFixed(2)}× ${drop.multiplierReward.name} · ${this.escapeHtmlText(mats)}</div>
                </div>
              `;
            })
            .join('')
        : `<p class="reliquary-empty">No portal spoils claimed yet. Enter any 3D mountain portal and clear its trial to earn unique rewards scaled to its difficulty.</p>`;

    this.lootReliquaryBodyEl.innerHTML = `
      ${buffCardHtml}
      <div class="reliquary-section">
        <div class="reliquary-section-head">
          <h3>Material Refinement</h3>
          <span class="reliquary-section-note">Permanent Resonance: +${permRes}% XP (${state.discoveredMaterialIds.length}/${RARE_MATERIALS_CATALOG.length} discovered)</span>
        </div>
        <div class="reliquary-recipes-list">${recipesHtml}</div>
      </div>
      <div class="reliquary-section">
        <div class="reliquary-section-head">
          <h3>Rare Materials Stockpile</h3>
          <span class="reliquary-section-note">Higher Floors &amp; Storm Climates unlock Mythic drops</span>
        </div>
        <div class="reliquary-materials-grid">${materialsHtml}</div>
      </div>
      <div class="reliquary-section">
        <div class="reliquary-section-head">
          <h3>Recent Portal Spoils</h3>
          <span class="reliquary-section-note">${state.totalDropsClaimed} total claimed</span>
        </div>
        <div class="reliquary-drops-list">${recentHtml}</div>
      </div>
    `;
  }

  private syncUnifiedSettingsUi(): void {
    const s = this.game.portalBrowser.getSettings();
    const isBrowserTab = this.settingsActiveTab === 'browser';
    this.root.querySelectorAll<HTMLButtonElement>('.settings-tab-btn').forEach((btn) => {
      const act = btn.dataset.stab === this.settingsActiveTab;
      btn.classList.toggle('active', act);
      btn.setAttribute('aria-selected', act ? 'true' : 'false');
    });
    this.root.querySelector('#settingsPaneGame')?.classList.toggle('hidden', isBrowserTab);
    this.root.querySelector('#settingsPaneBrowser')?.classList.toggle('hidden', !isBrowserTab);

    this.root.querySelectorAll<HTMLButtonElement>('[data-bsetting-startup]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.bsettingStartup === s.startupMode);
    });
    const searchSel = this.root.querySelector<HTMLSelectElement>('#settingsSearchEngineSel');
    if (searchSel) searchSel.value = s.searchEngine;
    const homeInp = this.root.querySelector<HTMLInputElement>('#settingsHomepageInput');
    if (homeInp && document.activeElement !== homeInp) homeInp.value = s.homepageUrl;
    const uaSel = this.root.querySelector<HTMLSelectElement>('#settingsUaSel');
    if (uaSel) uaSel.value = s.userAgentPreset;
    const zoomSlider = this.root.querySelector<HTMLInputElement>('#settingsZoomSlider');
    if (zoomSlider) zoomSlider.value = String(s.zoomPercent);
    const zoomVal = this.root.querySelector('#settingsZoomVal');
    if (zoomVal) zoomVal.textContent = `${s.zoomPercent}%`;
    const shieldChk = this.root.querySelector<HTMLInputElement>('#settingsTrackerShieldChk');
    if (shieldChk) shieldChk.checked = s.trackerShield;
    const proxyChk = this.root.querySelector<HTMLInputElement>('#settingsDefaultProxyChk');
    if (proxyChk) proxyChk.checked = s.defaultProxyMode;
    const bmChk = this.root.querySelector<HTMLInputElement>('#settingsBookmarksBarChk');
    if (bmChk) bmChk.checked = s.showBookmarksBar;
    this.syncHapticsToggleUi();
  }

  private syncHapticsToggleUi(): void {
    const btn = this.root.querySelector<HTMLButtonElement>('#toggleHapticsBtn');
    if (!btn) return;
    const enabled = this.game.haptics.isEnabled();
    const supported = this.game.haptics.isSupported();
    btn.textContent = !supported
      ? 'Haptics: N/A'
      : enabled
        ? 'Haptics: On'
        : 'Haptics: Off';
    btn.setAttribute('aria-pressed', enabled && supported ? 'true' : 'false');
    btn.title = supported
      ? 'Toggle subtle Vibration API haptics for cultivation moves and combat impacts'
      : 'Vibration API is not supported by this browser/device';
  }

  private syncInstallButtonsVisibility(): void {
    const installed = isStandalonePwa();
    const settingsInstallBtn = this.root.querySelector<HTMLButtonElement>('#settingsInstallPwaBtn');
    if (settingsInstallBtn) {
      settingsInstallBtn.classList.toggle('hidden', installed);
    }
    const inbInstallBtn = this.chromiumSettingsPanelEl?.querySelector<HTMLButtonElement>('#inbInstallPwaBtn');
    if (inbInstallBtn) {
      inbInstallBtn.classList.toggle('hidden', installed);
    }
  }

  private applySyncIndicatorToDom(
    sync: OfflineSyncIndicator,
    els: {
      card?: Element | null;
      dot?: Element | null;
      badge?: Element | null;
      headline?: Element | null;
      detail?: Element | null;
    },
  ): void {
    if (els.card) {
      els.card.className = `sw-sync-card tone-${sync.tone} phase-${sync.phase}`;
    }
    if (els.dot) {
      els.dot.className = `sw-sync-dot tone-${sync.tone} phase-${sync.phase}`;
    }
    if (els.badge) {
      els.badge.textContent = sync.shortBadge;
    }
    if (els.headline) {
      els.headline.textContent = sync.headline;
    }
    if (els.detail) {
      els.detail.textContent = sync.detail;
    }
  }

  private async handleClearAllOfflineCache(): Promise<void> {
    this.game.sound.playClick();
    const res = await this.game.offlineCache.clearAllOfflineCaches();
    this.showToast(
      res.ok
        ? 'Offline Service Worker cache cleared (bookmarks, history & core assets). Click Force Refresh or Sync Now to rebuild.'
        : 'Unable to clear offline cache in this browser context.',
    );
    if (this.portalBrowserSettingsMode) {
      this.renderBrowserSettingsPanel();
    }
  }

  private syncOfflineUiState(): void {
    const isOnline = this.game.offlineCache.isOnline();
    const sync = this.game.offlineCache.getSyncIndicator();
    this.offlineStatusBannerEl.classList.toggle('hidden', isOnline);
    this.chromiumOfflineTagEl.classList.toggle('hidden', isOnline);

    // Update unified Settings modal real-time SW indicator & storage total
    this.applySyncIndicatorToDom(sync, {
      card: this.root.querySelector('#settingsSwSyncCard'),
      dot: this.root.querySelector('#settingsSwSyncDot'),
      badge: this.root.querySelector('#settingsSwSyncBadge'),
      headline: this.root.querySelector('#settingsSwSyncHeadline'),
      detail: this.root.querySelector('#settingsSwSyncDetail'),
    });
    const storageUsage = this.game.offlineCache.getStorageUsage();
    const settingsStorageTotalEl = this.root.querySelector('#settingsStorageTotalVal');
    if (settingsStorageTotalEl) {
      const quotaNote =
        storageUsage.browserQuotaBytes && storageUsage.browserQuotaBytes > 0
          ? ` (Browser Quota ${formatStorageBytes(storageUsage.browserQuotaBytes)})`
          : '';
      settingsStorageTotalEl.textContent = `${formatStorageBytes(storageUsage.totalCacheBytes)} across 4 caches${quotaNote}`;
    }

    if (this.portalBrowserSettingsMode) {
      // Update header live badge across all Browser Settings tabs
      const headerDot = this.chromiumSettingsPanelEl.querySelector('#inbHeaderSwDot');
      if (headerDot) {
        headerDot.className = `sw-sync-dot tone-${sync.tone} phase-${sync.phase}`;
      }
      const headerLabel = this.chromiumSettingsPanelEl.querySelector('#inbHeaderSwLabel');
      if (headerLabel) {
        headerLabel.textContent = `SW: ${sync.shortBadge}`;
      }

      // Update full Privacy & Offline sync indicator card in place
      this.applySyncIndicatorToDom(sync, {
        card: this.chromiumSettingsPanelEl.querySelector('#inbSwSyncCard'),
        dot: this.chromiumSettingsPanelEl.querySelector('#inbSwSyncDot'),
        badge: this.chromiumSettingsPanelEl.querySelector('#inbSwSyncBadge'),
        headline: this.chromiumSettingsPanelEl.querySelector('#inbSwSyncHeadline'),
        detail: this.chromiumSettingsPanelEl.querySelector('#inbSwSyncDetail'),
      });

      if (this.portalBrowserSettingsTab === 'privacy') {
        const storageHost = this.chromiumSettingsPanelEl.querySelector('#inbStorageUsageHost');
        if (storageHost) {
          storageHost.innerHTML = this.renderStorageUsageBreakdownMarkup();
        }
      } else if (this.portalBrowserSettingsTab === 'history') {
        this.updateBrowserHistoryListInPlace();
      } else if (this.portalBrowserSettingsTab === 'bookmarks') {
        this.renderBrowserSettingsPanel();
      }
    }

    if (!this.portalBrowserModal.classList.contains('hidden')) {
      const activeTab = this.game.portalBrowser.getActiveTab();
      if (activeTab.url === 'chrome://newtab') {
        this.renderPortalChromiumBrowser(false);
      }
    }
  }

  private async triggerPwaInstallPrompt(): Promise<void> {
    if (isStandalonePwa()) {
      this.showToast('Serpent Peaks is already installed in standalone mode.');
      return;
    }
    if (this.deferredInstallPrompt) {
      await this.deferredInstallPrompt.prompt();
      const choice = await this.deferredInstallPrompt.userChoice;
      this.deferredInstallPrompt = null;
      this.syncInstallButtonsVisibility();
      this.showToast(
        choice.outcome === 'accepted'
          ? 'Serpent Peaks Browser & Game installed!'
          : 'Installation cancelled — you can install anytime from Settings.',
      );
    } else if (isIosSafariDevice()) {
      this.iosInstallModalEl.classList.remove('hidden');
      this.game.setModalFreeze(true);
    } else {
      this.showToast(
        'Use your browser address bar "Install" icon or Share -> Add to Home Screen to install Serpent Peaks as both a Browser and Game.',
      );
    }
  }

  public launchStandaloneBrowser(
    initialSettingsTab?: 'general' | 'privacy' | 'bookmarks' | 'history',
  ): void {
    this.game.portalBrowser.setActivePortalContext('Standalone Browser');
    this.portalBrowserStandalone = true;
    this.portalBrowserPip = false;
    this.portalMissionViewMode = false;
    const settings = this.game.portalBrowser.getSettings();
    if (initialSettingsTab) {
      this.portalBrowserSettingsTab = initialSettingsTab;
      this.portalBrowserSettingsMode = true;
      this.portalWorldOrbitMode = false;
    } else {
      this.portalBrowserSettingsMode = false;
      this.portalWorldOrbitMode = settings.newTabBehavior === 'mirror_house';
      if (settings.newTabBehavior === 'newtab') {
        const existingNewTab = this.game.portalBrowser
          .getTabs()
          .find((t) => t.url === 'chrome://newtab');
        if (existingNewTab) {
          this.game.portalBrowser.activateTab(existingNewTab.id);
        } else {
          this.game.portalBrowser.createTab('chrome://newtab');
        }
      }
    }
    this.portalBrowserModal.classList.remove('hidden', 'is-pip');
    this.portalBrowserModal.classList.add('is-standalone');
    this.syncSoulClockBadge();
    this.renderPortalChromiumBrowser(true);
    this.startPortalOrbitAnimation();
    this.syncModalFreeze();
  }

  private syncModalFreeze(): void {
    const portalBlocking =
      !this.portalBrowserModal.classList.contains('hidden') && !this.portalBrowserPip;
    const anyBlockingModal =
      portalBlocking ||
      !this.globalRankingModal.classList.contains('hidden') ||
      !this.bestiaryModal.classList.contains('hidden') ||
      !this.soulArchivesModal.classList.contains('hidden') ||
      !this.lootReliquaryModal.classList.contains('hidden') ||
      !this.portalAtlasModal.classList.contains('hidden') ||
      !this.foundryConsoleModal.classList.contains('hidden') ||
      !this.settingsModal.classList.contains('hidden') ||
      !this.journeyModal.classList.contains('hidden') ||
      !this.evolutionSummaryModal.classList.contains('hidden');
    this.game.setModalFreeze(anyBlockingModal);
  }

  public isModalOpen(): boolean {
    return (
      (!this.portalBrowserModal.classList.contains('hidden') && !this.portalBrowserPip) ||
      !this.globalRankingModal.classList.contains('hidden') ||
      !this.shareModal.classList.contains('hidden') ||
      !this.journeyModal.classList.contains('hidden') ||
      !this.evolutionSummaryModal.classList.contains('hidden') ||
      !this.bestiaryModal.classList.contains('hidden') ||
      !this.soulArchivesModal.classList.contains('hidden') ||
      !this.lootReliquaryModal.classList.contains('hidden') ||
      !this.portalAtlasModal.classList.contains('hidden') ||
      !this.foundryConsoleModal.classList.contains('hidden') ||
      !this.settingsModal.classList.contains('hidden')
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
    this.closeGlobalRankingModal();
    this.portalBrowserModal.classList.add('hidden');
    this.portalBrowserModal.classList.remove('is-standalone');
    this.portalBrowserStandalone = false;
    this.shareModal.classList.add('hidden');
    this.journeyModal.classList.add('hidden');
    this.bestiaryModal.classList.add('hidden');
    this.soulArchivesModal.classList.add('hidden');
    this.lootReliquaryModal.classList.add('hidden');
    this.portalAtlasModal.classList.add('hidden');
    this.foundryConsoleModal.classList.add('hidden');
    this.settingsModal.classList.add('hidden');
    this.syncModalFreeze();
  }

  public togglePortalAtlasModal(): void {
    if (!this.portalAtlasModal.classList.contains('hidden')) {
      this.closePortalAtlasModal();
    } else {
      this.openPortalAtlasModal();
    }
  }

  public openPortalAtlasModal(): void {
    this.portalAtlasModal.classList.remove('hidden');
    this.renderPortalAtlasModal();
    this.syncModalFreeze();
  }

  public closePortalAtlasModal(): void {
    this.portalAtlasModal.classList.add('hidden');
    this.syncModalFreeze();
  }

  private renderPortalProximityPrompt(prompt: PortalProximityPrompt | null): void {
    this.activeProximityPrompt = prompt;
    if (!prompt || this.game.getMode() !== 'playing') {
      this.portalProximityPromptEl.classList.add('hidden');
      this.portalProximityPromptEl.innerHTML = '';
      return;
    }

    const { node } = prompt;
    const stateClass = `pm-state-${node.visualState}`;
    const tabsBadge =
      node.tabCount > 1 ? `<span class="pm-prompt-tabs">${node.tabCount} tabs</span>` : '';

    this.portalProximityPromptEl.className = `pm-proximity-prompt ${stateClass}`;
    this.portalProximityPromptEl.innerHTML = `
      <div class="pm-prompt-glyph" style="border-color:${prompt.accentHex};color:${prompt.accentHex}">${this.escapeHtmlText(node.faviconGlyph)}</div>
      <div class="pm-prompt-copy">
        <div class="pm-prompt-top">
          <span class="pm-prompt-state" style="color:${prompt.accentHex}">${this.escapeHtmlText(prompt.stateLabel)}</span>
          <span class="pm-prompt-region">${this.escapeHtmlText(prompt.regionName)} · ${prompt.distanceM}m</span>
          ${tabsBadge}
        </div>
        <div class="pm-prompt-title">${this.escapeHtmlText(node.title)}</div>
        <div class="pm-prompt-sub">${this.escapeHtmlText(node.domain)} · ${this.escapeHtmlText(prompt.lastVisitedLabel)}</div>
      </div>
      <div class="pm-prompt-actions">
        <button type="button" class="primary-cta compact" data-pm-enter="1">${this.escapeHtmlText(prompt.actionLabel)} [U]</button>
        ${
          prompt.canPin && node.recordId
            ? `<button type="button" class="ghost-btn compact" data-pm-pin="${this.escapeHtmlText(node.recordId)}">${node.pinned ? 'Unpin' : 'Pin'}</button>`
            : ''
        }
        ${
          prompt.canDelete && node.recordId
            ? `<button type="button" class="ghost-btn compact" data-pm-delete="${this.escapeHtmlText(node.recordId)}">Delete</button>`
            : ''
        }
      </div>
    `;
  }

  private showPortalRegionBanner(region: PortalRegionMeta): void {
    if (this.game.getMode() !== 'playing') return;
    if (this.portalRegionBannerTimer) {
      window.clearTimeout(this.portalRegionBannerTimer);
    }
    this.portalRegionBannerEl.innerHTML = `
      <span class="pm-region-accent" style="background:${region.accentHex}"></span>
      <span class="pm-region-name">${this.escapeHtmlText(region.name)}</span>
      <span class="pm-region-sub">${this.escapeHtmlText(region.subtitle)}</span>
    `;
    this.portalRegionBannerEl.classList.remove('hidden');
    this.portalRegionBannerTimer = window.setTimeout(() => {
      this.portalRegionBannerEl.classList.add('hidden');
      this.portalRegionBannerTimer = 0;
    }, 3200);
  }

  private handlePortalMemoryActivation(node: SpatialPortalNode): void {
    this.game.sound.playPortal();
    if (node.sanctuaryAction) {
      if (node.sanctuaryAction === 'atlas') {
        this.openPortalAtlasModal();
        return;
      }
      if (node.sanctuaryAction === 'history') {
        this.openPortalBrowserModal();
        this.portalBrowserSettingsMode = true;
        this.portalBrowserSettingsTab = 'history';
        this.portalWorldOrbitMode = false;
        this.portalMissionViewMode = false;
        this.renderPortalChromiumBrowser(false);
        return;
      }
      if (node.sanctuaryAction === 'bookmarks') {
        this.openPortalBrowserModal();
        this.portalBrowserSettingsMode = true;
        this.portalBrowserSettingsTab = 'bookmarks';
        this.portalWorldOrbitMode = false;
        this.portalMissionViewMode = false;
        this.renderPortalChromiumBrowser(false);
        return;
      }
      if (node.sanctuaryAction === 'settings') {
        this.openPortalBrowserModal();
        this.portalBrowserSettingsMode = true;
        this.portalBrowserSettingsTab = 'privacy';
        this.portalWorldOrbitMode = false;
        this.portalMissionViewMode = false;
        void this.game.offlineCache.refreshStorageUsage();
        this.renderPortalChromiumBrowser(false);
        return;
      }
      // Sanctuary New Tab Gateway
      this.game.portalBrowser.openOrFocusUrl('chrome://newtab', 'New Tab');
      this.openPortalBrowserModal();
      this.portalWorldOrbitMode = false;
      this.portalBrowserSettingsMode = false;
      this.portalMissionViewMode = false;
      this.renderPortalChromiumBrowser(true);
      return;
    }

    if (node.collectionId) {
      this.portalAtlasRegionFilter = 'portal_halls';
      this.openPortalAtlasModal();
      return;
    }

    // Lost Portal Recovery -> mark recovered, open destination tab lazily ONLY now
    if (node.visualState === 'lost' && node.recordId) {
      void this.game.portalWorld.memory.markRecovered(node.recordId);
      this.showToast(`Recovered lost session: ${node.title}`);
    }

    this.game.portalBrowser.openOrFocusUrl(node.url, node.title);
    this.openPortalBrowserModal();
    this.portalWorldOrbitMode = false;
    this.portalBrowserSettingsMode = false;
    this.portalMissionViewMode = false;
    this.renderPortalChromiumBrowser(true);
  }

  private renderPortalAtlasRowsMarkup(): string {
    const matches = this.game.portalWorld.memory.search({
      query: this.portalAtlasSearchQuery,
      regionId: this.portalAtlasRegionFilter,
    });
    if (matches.length === 0) {
      return `<p class="pm-empty">No portals match your current filter. Browse websites, close tabs to populate Forgotten Ruins, or create a Gateway Hub collection below.</p>`;
    }
    return matches
      .slice(0, 80)
      .map((rec) => {
        const reg = PORTAL_REGIONS[rec.regionId];
        const stateText =
          rec.visualState === 'active'
            ? 'Active Tab'
            : rec.visualState === 'lost'
              ? rec.crashed
                ? 'Crashed · Recoverable'
                : 'Closed · Recoverable'
              : rec.visualState === 'pinned'
                ? 'Pinned'
                : 'Saved Memory';
        const openLabel =
          rec.visualState === 'lost' ? 'Recover' : rec.type === 'collection' ? 'Open Hub' : 'Open';
        return `
          <div class="pm-record-row pm-state-${rec.visualState}">
            <div class="pm-rec-glyph">${this.escapeHtmlText(rec.faviconGlyph)}</div>
            <div class="pm-rec-main">
              <div class="pm-rec-title-line">
                <span class="pm-rec-title">${this.escapeHtmlText(rec.title)}</span>
                <span class="pm-rec-badge pm-state-${rec.visualState}">${stateText}</span>
                ${rec.tabCount > 1 ? `<span class="pm-rec-count">${rec.tabCount}×</span>` : ''}
              </div>
              <div class="pm-rec-meta">
                <span>${this.escapeHtmlText(rec.domain)}</span>
                <span>·</span>
                <span>${this.escapeHtmlText(reg.name)}</span>
                <span>·</span>
                <span>${this.escapeHtmlText(formatRelativeVisitTime(rec.lastVisitedAt))}</span>
              </div>
            </div>
            <div class="pm-rec-actions">
              <button type="button" class="primary-cta compact" data-pm-open-record="${this.escapeHtmlText(rec.id)}">${openLabel}</button>
              <button type="button" class="secondary-cta compact" data-pm-warp-record="${this.escapeHtmlText(rec.id)}">Warp</button>
              ${
                rec.type !== 'collection'
                  ? `<button type="button" class="ghost-btn compact" data-pm-pin-record="${this.escapeHtmlText(rec.id)}">${rec.pinned ? 'Unpin' : 'Pin'}</button>`
                  : ''
              }
              <button type="button" class="ghost-btn compact" data-pm-delete-record="${this.escapeHtmlText(rec.id)}">Delete</button>
            </div>
          </div>
        `;
      })
      .join('');
  }

  private updatePortalAtlasListInPlace(): void {
    const host = this.portalAtlasBodyEl.querySelector('#pmAtlasListHost');
    if (host) {
      host.innerHTML = this.renderPortalAtlasRowsMarkup();
    }
  }

  private renderPortalAtlasModal(): void {
    const memory = this.game.portalWorld.memory;
    const stats = memory.getStats();
    const regionCounts = new Map(memory.getRegionSummary().map((r) => [r.regionId, r.count]));
    const collections = memory.getCollections();
    const currentReg = this.game.portalWorld.getCurrentRegion();

    this.portalAtlasMetaEl.textContent = `${stats.activeCount} Active · ${stats.memoryCount} Memory · ${stats.recoveryCount} Lost · ${stats.collectionCount} Collections · Now in ${currentReg.name}`;

    const regionOrder: PortalRegionId[] = [
      'central_sanctuary',
      'active_gateway',
      'memory_forest',
      'forgotten_ruins',
      'archive_mountains',
      'portal_halls',
    ];

    const regionCardsHtml = regionOrder
      .map((regId) => {
        const meta = PORTAL_REGIONS[regId];
        const count = regionCounts.get(regId) ?? 0;
        const active = this.portalAtlasRegionFilter === regId;
        return `
          <div class="pm-region-card ${active ? 'is-selected' : ''}">
            <div class="pm-region-card-top">
              <span class="pm-region-swatch" style="background:${meta.accentHex}"></span>
              <span class="pm-region-card-name">${this.escapeHtmlText(meta.name)}</span>
              <span class="pm-region-card-count">${count}</span>
            </div>
            <div class="pm-region-card-sub">${this.escapeHtmlText(meta.subtitle)}</div>
            <div class="pm-region-card-actions">
              <button type="button" class="ghost-btn compact" data-pm-region-filter="${regId}">${active ? 'Filtering' : 'Filter'}</button>
              <button type="button" class="secondary-cta compact" data-pm-warp-region="${regId}">Warp Here</button>
            </div>
          </div>
        `;
      })
      .join('');

    const collectionsHtml =
      collections.length > 0
        ? collections
            .map(
              (col) => `
                <div class="pm-col-card">
                  <div class="pm-col-head">
                    <span class="pm-region-swatch" style="background:${col.colorHex}"></span>
                    <strong>${this.escapeHtmlText(col.name)}</strong>
                    <span class="pm-col-count">${col.portalUrls.length} portal${col.portalUrls.length === 1 ? '' : 's'}</span>
                  </div>
                  <div class="pm-col-desc">${this.escapeHtmlText(col.description)}</div>
                  <div class="pm-col-actions">
                    <button type="button" class="ghost-btn compact" data-pm-share-col="${this.escapeHtmlText(col.id)}">Share Code</button>
                    <button type="button" class="ghost-btn compact" data-pm-del-col="${this.escapeHtmlText(col.id)}">Delete</button>
                  </div>
                </div>
              `,
            )
            .join('')
        : `<p class="pm-empty">No Gateway Hub collections yet. Group your research tabs or favorite websites into a personal portal room in Portal Halls.</p>`;

    this.portalAtlasBodyEl.innerHTML = `
      <div class="pm-regions-grid">${regionCardsHtml}</div>

      <div class="pm-atlas-toolbar">
        <input
          type="search"
          id="pmAtlasSearchInput"
          class="dark-select pm-atlas-search"
          value="${this.escapeHtmlText(this.portalAtlasSearchQuery)}"
          placeholder="Search portals by title, domain, date (YYYY-MM-DD), or state (active, saved, lost, pinned)..."
          spellcheck="false"
        />
        <button type="button" class="ghost-btn compact ${this.portalAtlasRegionFilter === 'all' ? 'active' : ''}" data-pm-region-filter="all">All Regions</button>
        ${
          stats.recoveryCount > 0
            ? `<button type="button" class="ghost-btn compact" id="pmClearRecoveryBtn">Clear Lost (${stats.recoveryCount})</button>`
            : ''
        }
      </div>

      <div class="pm-records-list" id="pmAtlasListHost">
        ${this.renderPortalAtlasRowsMarkup()}
      </div>

      <div class="pm-collections-section">
        <div class="pm-collections-head">
          <h3>Gateway Hubs — Personal Portal Collections</h3>
          <span class="pm-collections-sub">Stand inside Portal Halls with Golden Frames</span>
        </div>
        <div class="pm-create-col-row">
          <input type="text" id="pmNewCollectionName" class="dark-select" placeholder="Collection name (e.g. TypeScript Research)..." maxlength="44" />
          <input type="text" id="pmNewCollectionUrl" class="dark-select" placeholder="Optional initial URL (https://...)..." maxlength="240" />
          <button type="button" class="primary-cta compact" id="pmCreateCollectionBtn">+ Create Hub</button>
        </div>
        <div class="pm-collections-grid">${collectionsHtml}</div>
      </div>
    `;
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

  public pushCombatLogEntry(input: CombatLogInput): void {
    if (!this.combatLogPanelEl || !this.combatLogListEl) return;
    const nowMs = Date.now();
    this.combatLogTracker.record(input, nowMs);
    this.renderCombatLogPanel();
    this.syncCombatLogVisibility(this.combatLogPlaying || this.game.getMode() === 'playing', this.combatLogHasHostile, nowMs);

    window.clearTimeout(this.combatLogHideTimer);
    this.combatLogHideTimer = window.setTimeout(() => {
      this.syncCombatLogVisibility(this.combatLogPlaying, this.combatLogHasHostile, Date.now());
    }, this.combatLogTracker.getIdleTimeoutMs() + 120);
  }

  private renderCombatLogPanel(): void {
    const entries = this.combatLogTracker.getEntries();
    const summary = this.combatLogTracker.getSummary();
    const sessionState = this.combatLogTracker.getSessionState();

    if (this.combatLogSummaryEl) {
      this.combatLogSummaryEl.textContent = `Dealt ${summary.totalDealt} · Taken ${summary.totalReceived}`;
    }
    if (this.combatLogStatusEl) {
      this.combatLogStatusEl.className = `combat-log-status state-${sessionState}`;
      this.combatLogStatusEl.textContent =
        sessionState === 'active'
          ? 'Combat Start'
          : sessionState === 'ended'
            ? 'Combat End'
            : 'Standby';
    }
    if (this.combatLogPanelEl) {
      this.combatLogPanelEl.classList.toggle('session-active', sessionState === 'active');
      this.combatLogPanelEl.classList.toggle('session-ended', sessionState === 'ended');
    }

    const frag = document.createDocumentFragment();
    for (let i = 0; i < entries.length; i++) {
      const formatted = formatCombatLogEntry(entries[i]);
      const li = document.createElement('li');
      const highClass = formatted.isHighDamage ? ' is-high-damage' : '';
      const markerClass = formatted.isSessionMarker ? ' is-session-marker' : '';
      li.className = `combat-log-row kind-${formatted.kind}${highClass}${markerClass}${i === 0 ? ' is-latest' : ''}`;

      const tag = document.createElement('span');
      tag.className = 'combat-log-dir';
      tag.textContent = formatted.directionLabel;

      const desc = document.createElement('span');
      desc.className = 'combat-log-desc';
      desc.textContent = formatted.description;

      const deltaWrap = document.createElement('span');
      deltaWrap.className = 'combat-log-delta-wrap';

      if (formatted.isHighDamage) {
        const badge = document.createElement('span');
        badge.className = 'combat-log-high-badge';
        badge.textContent = formatted.kind === 'received' ? 'HEAVY' : 'HIGH';
        deltaWrap.appendChild(badge);
      }

      const delta = document.createElement('span');
      delta.className = 'combat-log-delta';
      delta.textContent = formatted.deltaText;
      deltaWrap.appendChild(delta);

      li.append(tag, desc, deltaWrap);
      frag.appendChild(li);
    }

    this.combatLogListEl.replaceChildren(frag);
  }

  private syncCombatLogVisibility(
    isPlaying: boolean,
    hasEngagedHostile: boolean,
    nowMs = Date.now(),
  ): void {
    this.combatLogPlaying = isPlaying;
    this.combatLogHasHostile = hasEngagedHostile;
    if (!this.combatLogPanelEl) return;

    const sync = this.combatLogTracker.syncSession(nowMs, isPlaying, hasEngagedHostile);
    if (sync.stateChanged) {
      this.renderCombatLogPanel();
      if (sync.state === 'ended') {
        window.clearTimeout(this.combatLogHideTimer);
        this.combatLogHideTimer = window.setTimeout(() => {
          this.syncCombatLogVisibility(this.combatLogPlaying, this.combatLogHasHostile, Date.now());
        }, this.combatLogTracker.getEndHoldMs() + 100);
      }
    }

    const visible = this.combatLogTracker.isVisible(nowMs, isPlaying, hasEngagedHostile);
    this.combatLogPanelEl.classList.toggle('is-visible', visible);
    this.combatLogPanelEl.classList.toggle('is-idle', !visible);
  }

  public clearCombatLog(): void {
    window.clearTimeout(this.combatLogHideTimer);
    this.combatLogTracker.clear();
    if (this.combatLogListEl) {
      this.combatLogListEl.replaceChildren();
    }
    if (this.combatLogSummaryEl) {
      this.combatLogSummaryEl.textContent = 'Dealt 0 · Taken 0';
    }
    if (this.combatLogStatusEl) {
      this.combatLogStatusEl.className = 'combat-log-status state-idle';
      this.combatLogStatusEl.textContent = 'Standby';
    }
    if (this.combatLogPanelEl) {
      this.combatLogPanelEl.classList.remove('is-visible', 'session-active', 'session-ended');
      this.combatLogPanelEl.classList.add('is-idle');
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
      if (this.activeProximityPrompt) {
        this.renderPortalProximityPrompt(null);
      }
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
    const cultSuffix =
      snap.cultivationBuffRemainingSec > 0
        ? ` · ${snap.cultivationMult.toFixed(2)}× (${formatLootDuration(snap.cultivationBuffRemainingSec)})`
        : snap.cultivationMult > 1.01
          ? ` · ${snap.cultivationMult.toFixed(2)}×`
          : '';
    if (snap.isHuman) {
      this.xpMetaEl.textContent = `${snap.xp.toLocaleString()} XP · Dou Di Ascended${cultSuffix}`;
    } else if (snap.xp >= snap.nextLevelXp && snap.visitedCount < snap.shrinesRequiredForNext) {
      this.xpMetaEl.textContent = `XP Ready · Need Peak ${snap.shrinesRequiredForNext}${cultSuffix}`;
    } else {
      this.xpMetaEl.textContent = `${snap.xp.toLocaleString()} / ${snap.nextLevelXp.toLocaleString()} XP${cultSuffix}`;
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

    // Dynamic Top-HUD 'Portal Distance' indicator for the 12 Trial Peak portals
    const portal = snap.mode === 'builder' ? null : snap.nearestPeakPortal;
    this.portalDistEl.classList.toggle('hidden', !portal);
    if (portal) {
      const accentHex = `#${portal.accentHex.toString(16).padStart(6, '0')}`;
      this.portalDistEl.style.setProperty('--portal-accent', accentHex);
      this.portalDistEl.classList.toggle('is-open', portal.phase === 'open');
      this.portalDistEl.classList.toggle(
        'is-awakening',
        portal.phase === 'awakening' || portal.phase === 'igniting',
      );
      this.portalDistEl.classList.toggle('is-unlocked', portal.unlocked && portal.phase === 'sealed');
      this.portalDistEl.classList.toggle('is-sealed', !portal.unlocked);
      this.portalDistEl.classList.toggle('is-near', portal.distanceMeters <= 28);

      this.portalDistPeakEl.textContent = portal.peakName;
      this.portalDistMetersEl.textContent =
        portal.distanceMeters <= 4 ? 'AT RIFT' : `${portal.distanceMeters}m`;
      this.portalDistStatusEl.textContent =
        portal.phase === 'open'
          ? 'OPEN'
          : portal.phase === 'awakening' || portal.phase === 'igniting'
            ? 'OPENING'
            : portal.unlocked
              ? `P${portal.peakTier}`
              : `RANK ${portal.requiredRank}`;
      this.portalDistFillEl.style.width = `${Math.round(portal.proximityFrac * 100)}%`;
    }

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

    // Keep upper-center climate log, side combat log, & compliment whisper clean outside gameplay
    const allowClimateLog = snap.mode === 'playing' || snap.mode === 'paused';
    if (!allowClimateLog) {
      if (this.climateLogStackEl.childElementCount > 0) {
        this.clearClimateNotices();
      }
      if (!this.complimentBannerEl.classList.contains('hidden')) {
        this.clearCompliment();
      }
      if (this.combatLogTracker.getEntries().length > 0) {
        this.clearCombatLog();
      } else {
        this.syncCombatLogVisibility(false, false);
      }
    } else {
      const isBossOverlay = showHostile && (snap.nearbyHostileIsHighTier || snap.nearbyHostileBoss);
      this.climateLogStackEl.classList.toggle('has-ambush', showAmbush && !showHostile);
      this.climateLogStackEl.classList.toggle('has-hostile', showHostile && !isBossOverlay);
      this.climateLogStackEl.classList.toggle('has-boss', isBossOverlay);
      this.syncCombatLogVisibility(snap.mode === 'playing', showHostile);
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
    const isLowHp = hpPct <= 30;
    const isCriticalHp = hpPct < 20;
    this.hpTextEl.textContent = `${Math.max(0, Math.ceil(snap.hp))} / ${snap.maxHp} HP`;
    this.hpTextEl.classList.toggle('low', isLowHp);
    this.hpTextEl.classList.toggle('critical', isCriticalHp);
    this.hpFillEl.style.width = `${hpPct.toFixed(1)}%`;
    this.hpFillEl.classList.toggle('low', isLowHp);
    this.hpFillEl.classList.toggle('critical', isCriticalHp);
    this.hpFillEl.parentElement?.classList.toggle('low', isLowHp);
    this.hpFillEl.parentElement?.classList.toggle('critical', isCriticalHp);
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
    const isLowQi = qiPct <= 30;
    const isCriticalQi = qiPct < 20;
    this.qiTextEl.textContent = `${Math.floor(snap.qi)} / ${snap.maxQi} QI`;
    this.qiTextEl.classList.toggle('low', isLowQi);
    this.qiTextEl.classList.toggle('critical', isCriticalQi);
    this.qiFillEl.style.width = `${qiPct.toFixed(1)}%`;
    this.qiFillEl.classList.toggle('low', isLowQi);
    this.qiFillEl.classList.toggle('critical', isCriticalQi);
    this.qiFillEl.parentElement?.classList.toggle('low', isLowQi);
    this.qiFillEl.parentElement?.classList.toggle('critical', isCriticalQi);

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
      fpv: 'FPV Eye',
      chase: 'GTA Chase',
      aerial: 'Eagle Map',
    };
    this.root.querySelector('#hudCamLabel')!.textContent = camNames[snap.cameraMode];
    this.fpvReticleEl.classList.toggle(
      'hidden',
      !(snap.cameraMode === 'fpv' && snap.mode === 'playing'),
    );
    if (!this.portalBrowserModal.classList.contains('hidden')) {
      this.syncSoulClockBadge();
    }
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

    this.pauseSoulArchivesBtn.textContent =
      `📜 Soul Clan Archives (${snap.soulArchivesUnlockedCount}/${snap.soulArchivesTotalCount}) (N)`;

    const showSentryBanner =
      snap.mode === 'playing' && (snap.stealthActive || snap.nearestSentryAlert !== null);
    this.sentryStealthBannerEl.classList.toggle('hidden', !showSentryBanner);
    if (showSentryBanner) {
      const alert = snap.nearestSentryAlert;
      this.sentryStealthBannerEl.classList.remove(
        'mode-stealth',
        'mode-circular',
        'mode-search',
        'mode-alert',
      );
      if (alert) {
        const isLocked = alert.portalLockTimer > 0 || alert.patrolMode === 'alert';
        const modeClass = isLocked
          ? 'mode-alert'
          : alert.patrolMode === 'search'
            ? 'mode-search'
            : snap.stealthActive
              ? 'mode-stealth'
              : 'mode-circular';
        this.sentryStealthBannerEl.classList.add(modeClass);
        const stateText = isLocked
          ? `Portal Sealed · ${Math.ceil(Math.max(1, alert.portalLockTimer))}s`
          : alert.patrolMode === 'search'
            ? 'Searching Activity'
            : snap.stealthActive
              ? 'Veil Active · Circular Patrol'
              : 'Circular Patrol';
        this.sentryBannerTitleEl.textContent = `${alert.name} · ${alert.dist}m`;
        this.sentryBannerStateEl.textContent = stateText;
        const pct = Math.max(0, Math.min(100, Math.round(alert.suspicion * 100)));
        this.sentrySuspicionFillEl.style.width = `${isLocked ? 100 : pct}%`;
        this.sentryBannerHintEl.textContent = isLocked
          ? 'Detected! Banish with [Q] Shockwave or [R] Lotus to unseal portal'
          : snap.stealthActive
            ? 'Veil of Shadow active — stay outside spectral cone to infiltrate portal'
            : 'Hold [Shift] / press [X] for Stealth Veil · [Q] Shockwave banishes sentry';
      } else {
        this.sentryStealthBannerEl.classList.add('mode-stealth');
        this.sentryBannerTitleEl.textContent = 'Veil of Shadow Active';
        this.sentryBannerStateEl.textContent = 'Concealed';
        this.sentrySuspicionFillEl.style.width = '0%';
        this.sentryBannerHintEl.textContent =
          'Sentry vision halved · Release [Shift] or press [X] to lift veil';
      }
    }

    if (!this.journeyModal.classList.contains('hidden')) {
      this.renderJourneyList();
    }
    if (!this.bestiaryModal.classList.contains('hidden')) {
      this.renderBestiary();
    }
    if (!this.soulArchivesModal.classList.contains('hidden')) {
      this.renderSoulArchivesModal();
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

    // Portal Memory World gateways & clusters (color-coded by state)
    if (snap.portalMemoryBlips && snap.portalMemoryBlips.length > 0) {
      for (const pm of snap.portalMemoryBlips) {
        const px = (pm.x - snap.headX) * mapZoom;
        const pz = (pm.z - snap.headZ) * mapZoom;
        if (px * px + pz * pz > radius * radius) continue;
        const blipColor =
          pm.visualState === 'active'
            ? '#2de3ff'
            : pm.visualState === 'lost'
              ? '#a855f7'
              : pm.visualState === 'pinned'
                ? '#f2c14e'
                : '#3de095';
        ctx.fillStyle = blipColor;
        ctx.beginPath();
        const r = pm.isSanctuary ? 3.4 : pm.count > 1 ? 3.1 : 2.3;
        ctx.arc(px, pz, r, 0, Math.PI * 2);
        ctx.fill();
      }
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

    // Patrolling Soul Clan Sentries & Live Spectral Vision Cones on Continent Radar
    for (const st of snap.sentries) {
      const sx = (st.x - snap.headX) * mapZoom;
      const sz = (st.z - snap.headZ) * mapZoom;
      if (sx * sx + sz * sz > (radius + 14) * (radius + 14)) continue;

      const coneLen = Math.max(6, st.visionRange * mapZoom * 0.92);
      // In canvas coordinates (+X right, +Y down = +Z world), heading 0 points along +Z (+Y), PI/2 along +X
      const canvasHeading = Math.atan2(Math.cos(st.heading), Math.sin(st.heading));
      const coneFill =
        st.patrolMode === 'alert' || st.portalLocked
          ? 'rgba(244, 63, 94, 0.34)'
          : st.patrolMode === 'search'
            ? 'rgba(245, 158, 11, 0.30)'
            : 'rgba(192, 132, 252, 0.24)';
      const glyphColor =
        st.patrolMode === 'alert' || st.portalLocked
          ? '#fb7185'
          : st.patrolMode === 'search'
            ? '#fbbf24'
            : '#d8b4fe';

      ctx.save();
      ctx.translate(sx, sz);
      ctx.fillStyle = coneFill;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, coneLen, canvasHeading - st.visionHalfAngle, canvasHeading + st.visionHalfAngle);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = glyphColor;
      ctx.strokeStyle = '#090c14';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(0, -3.8);
      ctx.lineTo(3.2, 0);
      ctx.lineTo(0, 3.8);
      ctx.lineTo(-3.2, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
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

    // Periodic Sovereign "Global Ranking" Portal Golden Star & Off-Radar Rim Arrow
    if (snap.globalRankingPortal) {
      const rawGx = (snap.globalRankingPortal.x - snap.headX) * mapZoom;
      const rawGz = (snap.globalRankingPortal.z - snap.headZ) * mapZoom;
      const distR = Math.hypot(rawGx, rawGz);
      const maxRim = radius - 6.5;
      const isClamped = distR > maxRim;
      const gx = isClamped ? (rawGx / distR) * maxRim : rawGx;
      const gz = isClamped ? (rawGz / distR) * maxRim : rawGz;

      ctx.save();
      ctx.translate(gx, gz);
      if (isClamped) {
        // Directional golden arrow pointing along rim toward the Global Ranking Portal
        ctx.rotate(Math.atan2(rawGz, rawGx));
        ctx.fillStyle = '#ffe066';
        ctx.strokeStyle = '#09111a';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(6.8, 0);
        ctx.lineTo(-4.8, -5.2);
        ctx.lineTo(-2.4, 0);
        ctx.lineTo(-4.8, 5.2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        // Radiant 8-point Imperial Gold Star + Celestial Jade Core
        ctx.fillStyle = '#ffe066';
        ctx.strokeStyle = '#09111a';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        for (let k = 0; k < 16; k++) {
          const rStar = k % 2 === 0 ? 7.2 : 3.2;
          const a = (k * Math.PI) / 8;
          const sx = Math.cos(a) * rStar;
          const sy = Math.sin(a) * rStar;
          if (k === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#3de095';
        ctx.beginPath();
        ctx.arc(0, 0, 2.1, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      const secLeft = Math.max(0, Math.ceil(snap.globalRankingPortal.timeRemainingSec));
      this.minimapCaptionEl.textContent = `★ RANKING PORTAL · ${secLeft}s`;
      this.minimapCaptionEl.classList.add('is-ranking-active');
    } else {
      this.minimapCaptionEl.textContent = 'CONTINENT RADAR';
      this.minimapCaptionEl.classList.remove('is-ranking-active');
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
      if (this.mobileController) {
        this.mobileController.syncToViewport();
      } else {
        this.virtualCursorX = Math.max(40, Math.min(window.innerWidth - 40, this.virtualCursorX));
        this.virtualCursorY = Math.max(40, Math.min(window.innerHeight - 40, this.virtualCursorY));
        this.updateVirtualCursorPosition();
      }
    } else {
      this.mobileController?.reset();
    }
  }

  public getMobileControlMode(): MobileControlMode {
    return this.mobileController?.getMode() ?? loadSavedMobileControlMode('joystick');
  }

  public setMobileControlMode(mode: MobileControlMode): void {
    this.mobileController?.setMode(mode, true);
    this.syncMobileCursorModePill(mode);
  }

  private syncMobileCursorModePill(mode: MobileControlMode): void {
    const isJoystick = mode === 'joystick';
    this.mobileCursorModeBtn.textContent = isJoystick ? '🕹️ Joystick' : '📍 Absolute';
    this.mobileCursorModeBtn.classList.toggle('is-joystick', isJoystick);
    this.mobileCursorModeBtn.classList.toggle('is-absolute', !isJoystick);
    this.mobileCursorModeBtn.setAttribute('aria-pressed', isJoystick ? 'true' : 'false');
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

    const hapticsBtn = this.root.querySelector<HTMLButtonElement>('#toggleHapticsBtn');
    hapticsBtn?.addEventListener('click', () => {
      const next = !this.game.haptics.isEnabled();
      this.game.haptics.setEnabled(next);
      this.syncHapticsToggleUi();
      if (next) {
        this.game.haptics.trigger('cultivation_dash');
      }
      this.showToast(
        !this.game.haptics.isSupported()
          ? 'Vibration API haptics are not supported on this device.'
          : next
            ? 'Mobile haptic feedback enabled.'
            : 'Mobile haptic feedback muted.',
      );
    });
    this.syncHapticsToggleUi();

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

    // Virtual Cursor & Steer Controller ('joystick' relative stick default, toggleable to 'absolute')
    const initialMode = loadSavedMobileControlMode('joystick');
    const padLabelEl = this.root.querySelector<HTMLElement>('#mobilePadLabel');
    this.mobileController?.destroy();
    this.mobileController = new MobileVirtualCursorController(
      {
        padEl: this.mobileCursorPadEl,
        puckEl: this.mobileCursorPuckEl,
        cursorEl: this.mobileVirtualCursorEl,
        labelEl: padLabelEl,
      },
      {
        onSteerAxis: (axis) => {
          this.game.setTouchSteerAxis(axis);
        },
        onCursorMove: ({ x, y }) => {
          this.virtualCursorX = x;
          this.virtualCursorY = y;
          this.updateVirtualCursorPosition();
        },
        onTapAction: () => {
          this.triggerVirtualCursorAction();
        },
        onModeChange: (mode) => {
          this.syncMobileCursorModePill(mode);
        },
      },
      { mode: initialMode },
      { x: this.virtualCursorX, y: this.virtualCursorY },
    );
    this.syncMobileCursorModePill(initialMode);

    this.mobileCursorModeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const next = this.mobileController?.toggleMode(true) ?? 'joystick';
      this.syncMobileCursorModePill(next);
      this.showToast(
        next === 'joystick'
          ? 'Mobile Stick: Relative Joystick Mode (smooth analog glide)'
          : 'Mobile Stick: Absolute Positioning Mode',
      );
    });
  }

  // ==================== PORTAL CHROMIUM MULTI-TAB BROWSER & 3D ROLLING TAB OTHERWORLD ====================

  private triggerMirrorShimmerForTab(
    tabIndex: number,
    action: MirrorTabShimmerAction,
    overrideVariant?: PortalVariant,
  ): void {
    const tabs = this.game.portalBrowser.getTabs();
    const safeCount = Math.max(1, tabs.length);
    const idx = ((tabIndex % safeCount) + safeCount) % safeCount;
    const layout = computeRollingTabOrbitLayout(safeCount, this.portalOrbitAngle);
    const node = layout[idx] || layout[0];
    const tab = tabs[idx];
    this.game.sound.playMirrorTabShimmer({
      xNorm: node ? node.xNorm : 0,
      yNorm: node ? node.yNorm : 0,
      zDepth: node ? node.zDepth : 1,
      tier: node ? node.tier : 0,
      portalVariant: overrideVariant ?? tab?.portalVariant ?? this.game.portalBrowser.getActivePortalVariant(),
      tabIndex: idx,
      action,
    });
  }

  private syncSoulClockBadge(): void {
    const souls = this.game.portalMissions.getCollectedSouls();
    const clock = this.game.portalMissions.getFormattedClock();
    this.chromiumSoulClockBadgeEl.textContent = `Souls ${souls}/${SOUL_TARGET_COUNT} · ${clock}`;
    const portalCountEl = this.root.querySelector('#chromiumPortalCountText');
    if (portalCountEl) {
      portalCountEl.textContent = `${this.game.getActivePortalCount()} portals synced · Esc to close`;
    }
  }

  private resetMissionSession(mission: PortalMissionDef): void {
    this.missionQuizHintOpen = false;
    this.missionFeedbackMsg = '';
    this.missionFeedbackTone = 'neutral';
    this.latestMissionLootDrop = null;
    this.missionNetworkToggles = [false, false, false, false];
    this.missionAlchemySelected = [];
    this.missionCardRound = 1;
    this.missionCardLog =
      mission.cardDuel?.loreQuote ||
      'Draw from the 29-Card Soul Deck. Lowest card each round is eliminated until 2 finalists remain.';
    this.missionShadowPhase = false;
    this.missionShadowPlayerHp = 3;
    this.missionShadowBossHp = 3;
    this.missionShadowIntent = 'strike';
    this.missionCardParticipants = [
      { id: 'player', name: 'You (Serpent Ascendant)', isPlayer: true, alive: true, lastCard: null },
      ...(mission.cardDuel?.rivalNames ?? ['Vesper', 'Kael', 'Mire']).map((name, i) => ({
        id: `rival-${i}`,
        name,
        isPlayer: false,
        alive: true,
        lastCard: null,
      })),
    ];
  }

  private completeActivePortalMission(mission: PortalMissionDef, successText: string): void {
    const res = this.game.portalMissions.completePortalMission(this.activePortalKey, mission);
    const { shiftResult, lootDrop, awardedXp } = this.game.grantPortalMissionReward(
      mission,
      res.soulAwarded,
      this.activePortalKey,
    );
    this.latestMissionLootDrop = lootDrop;
    const shiftCount = shiftResult.shifted.length;
    const shiftNote =
      shiftCount > 0
        ? ` Dimensional Shift: ${shiftCount} portals respawned at new mountain peaks with fresh trials.`
        : '';

    this.missionFeedbackTone = 'success';
    this.missionFeedbackMsg = res.soulAwarded
      ? `${successText} Claimed "${mission.soulTitle}" (${res.collectedSouls}/${SOUL_TARGET_COUNT} Souls) · +${awardedXp} XP.${shiftNote}`
      : `${successText} Portal Trial cleared · +${awardedXp} XP & Vitality/Qi restored.${shiftNote}`;
    if (res.triggeredHospitalRevelation) {
      this.missionRevelationBanner = 'hospital';
    } else if (res.triggeredFifteenthMystery) {
      this.missionRevelationBanner = 'fifteenth';
    }
    this.triggerMirrorShimmerForTab(0, 'enter', this.game.portalBrowser.getActivePortalVariant());
    if (shiftCount > 0) {
      this.triggerPortalShiftScreenRipple(shiftResult, res.soulAwarded);
      const primaryShift = shiftResult.shifted[0];
      if (primaryShift) {
        this.pendingReemergenceShift = {
          newX: primaryShift.newX,
          newZ: primaryShift.newZ,
          soulAwarded: res.soulAwarded,
        };
      }
    }
    this.syncSoulClockBadge();
    this.renderPortalMissionPanel();
  }

  /**
   * Fires a full-viewport concentric ripple transition + liquid-glass displacement pulse
   * across the screen and displays the departing -> new portal coordinates briefly.
   */
  private triggerPortalShiftScreenRipple(shiftResult: PortalShiftResult, soulAwarded: boolean): void {
    const overlay = this.portalShiftRippleOverlayEl;
    if (!overlay || shiftResult.shifted.length === 0) return;

    const primary = shiftResult.shifted[0];
    const fmt = (n: number) => Math.round(n);
    this.portalShiftRippleCoordsEl.textContent = `(${fmt(primary.oldX)}, ${fmt(primary.oldZ)})  →  (${fmt(primary.newX)}, ${fmt(primary.newZ)})`;
    this.portalShiftRippleSubEl.textContent =
      shiftResult.shifted.length === 1
        ? `Portal shifted to a fresh peak coordinate`
        : `${shiftResult.shifted.length} portals shifted across the peaks · Radar updated`;

    overlay.classList.remove('is-rippling', 'is-soul');
    // Force reflow so rapid consecutive mission completions cleanly restart CSS ripple waves
    void overlay.offsetWidth;
    if (soulAwarded) {
      overlay.classList.add('is-soul');
    }
    overlay.classList.add('is-rippling');

    // Brief organic SVG liquid-glass displacement ripple on the active portal chamber window
    const reducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const chromiumWin = this.portalBrowserModal.querySelector('.chromium-window') as HTMLElement | null;

    window.cancelAnimationFrame(this.portalShiftDisplaceRaf);
    if (!reducedMotion && chromiumWin && this.portalShiftDisplaceEl) {
      const displaceMap = this.portalShiftDisplaceEl;
      chromiumWin.classList.add('is-portal-rippling');
      const startPerf = performance.now();
      const durMs = 920;
      const animateDisplace = (now: number) => {
        const p = Math.min(1, (now - startPerf) / durMs);
        const attack = Math.min(1, p / 0.14);
        const decay = Math.pow(1 - p, 1.8);
        const osc = 0.65 + 0.35 * Math.sin(p * Math.PI * 4.5);
        const scale = Number((22 * attack * decay * osc).toFixed(2));
        displaceMap.setAttribute('scale', String(scale));
        if (p < 1) {
          this.portalShiftDisplaceRaf = window.requestAnimationFrame(animateDisplace);
        } else {
          displaceMap.setAttribute('scale', '0');
          chromiumWin.classList.remove('is-portal-rippling');
          this.portalShiftDisplaceRaf = 0;
        }
      };
      this.portalShiftDisplaceRaf = window.requestAnimationFrame(animateDisplace);
    }

    window.clearTimeout(this.portalShiftRippleTimer);
    this.portalShiftRippleTimer = window.setTimeout(() => {
      overlay.classList.remove('is-rippling', 'is-soul');
      this.portalShiftRippleTimer = 0;
    }, 1850);
  }

  private renderChromiumBookmarksBar(): void {
    const bookmarks = this.game.portalBrowser.getAllBookmarks();
    this.chromiumBookmarksBarEl.innerHTML = bookmarks
      .map(
        (b) => `
          <button type="button" class="chromium-bookmark-chip" data-burl="${this.escapeHtmlText(b.url)}">
            <span class="cbm-badge" style="color:${b.accentHex}">${this.escapeHtmlText(b.badge)}</span>
            <span>${this.escapeHtmlText(b.title)}</span>
          </button>
        `,
      )
      .join('');
    this.chromiumBookmarksBarEl.classList.toggle(
      'hidden',
      !this.game.portalBrowser.getSettings().showBookmarksBar,
    );
  }

  private applyBrowserViewportZoom(): void {
    const zoom = this.game.portalBrowser.getSettings().zoomPercent;
    const scale = zoom / 100;
    if (Math.abs(scale - 1) < 0.005) {
      this.chromiumViewportFrame.style.transform = '';
      this.chromiumViewportFrame.style.width = '100%';
      this.chromiumViewportFrame.style.height = '100%';
    } else {
      this.chromiumViewportFrame.style.transformOrigin = 'top left';
      this.chromiumViewportFrame.style.transform = `scale(${scale})`;
      this.chromiumViewportFrame.style.width = `${(100 / scale).toFixed(2)}%`;
      this.chromiumViewportFrame.style.height = `${(100 / scale).toFixed(2)}%`;
    }
  }

  private bindPortalChromiumEvents(): void {
    this.renderChromiumBookmarksBar();

    this.chromiumViewportFrame.addEventListener('load', () => {
      this.chromiumLoadingBarEl.classList.add('hidden');
    });

    this.chromiumBookmarksBarEl.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.chromium-bookmark-chip');
      if (!btn || !btn.dataset.burl) return;
      const activeIdx = Math.max(
        0,
        this.game.portalBrowser.getTabs().findIndex((t) => t.id === this.game.portalBrowser.getActiveTab().id),
      );
      this.triggerMirrorShimmerForTab(activeIdx, 'select');
      this.navigatePortalBrowserUrl(btn.dataset.burl);
    });

    this.chromiumMissionToggleBtn.addEventListener('click', () => {
      this.triggerMirrorShimmerForTab(0, 'select');
      this.portalBrowserSettingsMode = false;
      this.portalMissionViewMode = !this.portalMissionViewMode;
      if (this.portalMissionViewMode) {
        this.portalWorldOrbitMode = false;
      }
      this.renderPortalChromiumBrowser(false);
    });

    this.chromiumOrbitToggleBtn.addEventListener('click', () => {
      this.triggerMirrorShimmerForTab(0, 'orbit');
      this.portalBrowserSettingsMode = false;
      this.portalMissionViewMode = false;
      this.portalWorldOrbitMode = !this.portalWorldOrbitMode;
      this.renderPortalChromiumBrowser(false);
    });

    this.chromiumBookmarkBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.game.sound.playClick();
      this.portalProfilePopoverOpen = false;
      this.chromiumProfilePopoverEl.classList.add('hidden');
      this.closeOmniboxSuggestions();
      this.portalBookmarkPopoverOpen = !this.portalBookmarkPopoverOpen;
      if (this.portalBookmarkPopoverOpen) {
        this.openBookmarkPopover();
      } else {
        this.chromiumBookmarkPopoverEl.classList.add('hidden');
      }
    });

    this.chromiumBookmarkPopoverEl.addEventListener('click', (e) => {
      e.stopPropagation();
      const target = e.target as HTMLElement;
      if (target.closest('#cbmCloseBtn')) {
        this.closeBookmarkPopover();
        return;
      }
      if (target.closest('#cbmRemoveBtn')) {
        const urlInput = this.chromiumBookmarkPopoverEl.querySelector<HTMLInputElement>('#cbmUrlInput');
        const targetUrl = urlInput?.value.trim() || this.game.portalBrowser.getActiveTab().displayUrl;
        const removed = this.game.portalBrowser.removeCustomBookmark(targetUrl);
        this.game.sound.playClick();
        this.closeBookmarkPopover();
        this.renderChromiumBookmarksBar();
        this.renderPortalChromiumBrowser(false);
        this.showToast(removed ? 'Removed portal bookmark.' : 'Default bookmark cannot be removed.');
        return;
      }
      if (target.closest('#cbmViewHistoryBtn')) {
        this.closeBookmarkPopover();
        this.navigatePortalBrowserUrl('chrome://history');
      }
    });

    this.chromiumBookmarkPopoverEl.addEventListener('submit', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const titleInp = this.chromiumBookmarkPopoverEl.querySelector<HTMLInputElement>('#cbmTitleInput');
      const urlInp = this.chromiumBookmarkPopoverEl.querySelector<HTMLInputElement>('#cbmUrlInput');
      const channelSel = this.chromiumBookmarkPopoverEl.querySelector<HTMLSelectElement>('#cbmChannelSel');
      const rawUrl = urlInp?.value.trim() || '';
      const rawTitle = titleInp?.value.trim() || '';
      const variant: PortalVariant = channelSel?.value === 'B' ? 'B' : 'A';
      const saved = this.game.portalBrowser.addOrUpdateBookmark({
        url: rawUrl,
        title: rawTitle,
        portalVariant: variant,
      });
      if (!saved) {
        this.showToast('Enter a valid web or chrome:// portal URL to bookmark.');
        return;
      }
      this.game.sound.playClick();
      this.closeBookmarkPopover();
      this.renderChromiumBookmarksBar();
      this.renderPortalChromiumBrowser(false);
      this.showToast(`Saved bookmark "${saved.title}"`);
    });

    this.chromiumSettingsBtn.addEventListener('click', () => {
      this.game.sound.playClick();
      this.portalBrowserSettingsMode = !this.portalBrowserSettingsMode;
      if (this.portalBrowserSettingsMode) {
        this.portalMissionViewMode = false;
        this.portalWorldOrbitMode = false;
      }
      this.renderPortalChromiumBrowser(false);
    });

    this.chromiumStandaloneBtn.addEventListener('click', () => {
      this.game.sound.playClick();
      this.portalBrowserStandalone = !this.portalBrowserStandalone;
      this.portalBrowserPip = false;
      this.portalBrowserModal.classList.remove('is-pip');
      this.portalBrowserModal.classList.toggle('is-standalone', this.portalBrowserStandalone);
      this.game.portalBrowser.updateSettings({ standaloneFullscreen: this.portalBrowserStandalone });
      this.renderPortalChromiumBrowser(false);
    });

    // Delegated interactions for the in-browser Settings & History Panel (chrome://settings)
    this.chromiumSettingsPanelEl.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const tabBtn = target.closest<HTMLButtonElement>('[data-bset-tab]');
      if (tabBtn && tabBtn.dataset.bsetTab) {
        this.portalBrowserSettingsTab = tabBtn.dataset.bsetTab as
          | 'general'
          | 'privacy'
          | 'bookmarks'
          | 'history'
          | 'audio';
        this.game.sound.playClick();
        if (
          this.portalBrowserSettingsTab === 'privacy' ||
          this.portalBrowserSettingsTab === 'bookmarks'
        ) {
          void this.game.offlineCache.refreshStorageUsage();
        }
        this.renderPortalChromiumBrowser(false);
        return;
      }
      const histFilterBtn = target.closest<HTMLButtonElement>('[data-hist-filter]');
      if (histFilterBtn && histFilterBtn.dataset.histFilter) {
        this.portalHistoryFilter = histFilterBtn.dataset.histFilter as 'all' | 'session' | 'A' | 'B';
        this.game.sound.playClick();
        this.chromiumSettingsPanelEl
          .querySelectorAll<HTMLButtonElement>('[data-hist-filter]')
          .forEach((btn) =>
            btn.classList.toggle('active', btn.dataset.histFilter === this.portalHistoryFilter),
          );
        this.updateBrowserHistoryListInPlace();
        return;
      }
      const startupBtn = target.closest<HTMLButtonElement>('[data-inb-startup]');
      if (startupBtn && startupBtn.dataset.inbStartup) {
        const mode = startupBtn.dataset.inbStartup as StartupMode;
        this.game.portalBrowser.updateSettings({ startupMode: mode });
        this.game.sound.playClick();
        this.syncUnifiedSettingsUi();
        this.renderBrowserSettingsPanel();
        return;
      }
      const newTabBtn = target.closest<HTMLButtonElement>('[data-inb-newtab]');
      if (newTabBtn && newTabBtn.dataset.inbNewtab) {
        this.game.portalBrowser.updateSettings({
          newTabBehavior: newTabBtn.dataset.inbNewtab as NewTabBehavior,
        });
        this.game.sound.playClick();
        this.renderBrowserSettingsPanel();
        return;
      }
      if (target.closest('#inbSaveHomepageBtn')) {
        const inp = this.chromiumSettingsPanelEl.querySelector<HTMLInputElement>('#inbHomepageInput');
        const val = inp?.value.trim() || 'chrome://newtab';
        this.game.portalBrowser.updateSettings({ homepageUrl: val });
        this.syncUnifiedSettingsUi();
        this.showToast(`Homepage updated to ${val}`);
        return;
      }
      if (target.closest('#inbInstallPwaBtn')) {
        void this.triggerPwaInstallPrompt();
        return;
      }
      if (target.closest('#inbClearSessionHistoryBtn')) {
        const removed = this.game.portalBrowser.clearCurrentSessionHistory();
        this.game.sound.playClick();
        this.showToast(
          removed > 0
            ? `Cleared ${removed} visit${removed === 1 ? '' : 's'} from this session.`
            : 'No visits recorded in the current session.',
        );
        this.renderBrowserSettingsPanel();
        return;
      }
      if (target.closest('#inbClearHistoryBtn')) {
        this.game.portalBrowser.clearHistory();
        this.game.sound.playClick();
        this.showToast('All browsing history cleared.');
        this.renderBrowserSettingsPanel();
        return;
      }
      if (target.closest('#inbClearSearchHistoryBtn')) {
        this.game.portalBrowser.clearSearchHistory();
        this.game.sound.playClick();
        this.showToast('Search history cleared.');
        this.renderPortalChromiumBrowser(false);
        return;
      }
      if (target.closest('#inbOpenBookmarkDialogBtn')) {
        this.game.sound.playClick();
        this.openBookmarkPopover();
        return;
      }
      if (target.closest('#inbResetHistoryFiltersBtn')) {
        this.portalHistorySearchQuery = '';
        this.portalHistoryFilter = 'all';
        this.game.sound.playClick();
        this.renderBrowserSettingsPanel();
        return;
      }
      if (target.closest('#inbHistoryOpenNewTabBtn')) {
        this.game.sound.playClick();
        this.navigatePortalBrowserUrl('chrome://newtab');
        return;
      }
      if (target.closest('#inbResetTabsBtn')) {
        this.game.portalBrowser.resetSessionTabs();
        this.showToast('Browser tabs restored to profile defaults.');
        this.renderPortalChromiumBrowser(true);
        return;
      }
      if (target.closest('#inbCacheBookmarksOfflineBtn')) {
        this.game.sound.playClick();
        const urls = extractBookmarkCacheableUrls(
          this.game.portalBrowser.getCustomBookmarks(),
          this.game.portalBrowser.getHistory(),
          20,
        );
        this.showToast(
          this.game.offlineCache.isOnline()
            ? `Syncing portal history & caching ${urls.length} saved URL${urls.length === 1 ? '' : 's'}...`
            : 'Syncing local bookmarks & portal history into Service Worker cache...',
        );
        void this.game.offlineCache
          .syncAllNow(
            this.game.portalBrowser.exportOfflineStateSnapshot(),
            urls,
            this.game.portalBrowser.getSettings(),
          )
          .then((res) => {
            this.showToast(
              res.attempted > 0
                ? `Service Worker synced (${res.cached}/${res.attempted} pages cached offline).`
                : 'Service Worker portal history & bookmarks synced.',
            );
          });
        return;
      }
      if (target.closest('#inbClearOfflineCacheBtn')) {
        void this.handleClearAllOfflineCache();
        return;
      }
      if (target.closest('#inbRefreshStorageUsageBtn')) {
        this.game.sound.playClick();
        void this.game.offlineCache.refreshStorageUsage().then(() => {
          this.showToast('Storage usage breakdown refreshed.');
        });
        return;
      }
      const delCachedBtn = target.closest<HTMLButtonElement>('[data-delete-cached-url]');
      if (delCachedBtn?.dataset.deleteCachedUrl) {
        const targetUrl = delCachedBtn.dataset.deleteCachedUrl;
        this.game.sound.playClick();
        void this.game.offlineCache.deleteCachedPortalUrl(targetUrl).then((res) => {
          this.showToast(
            res.deleted
              ? `Deleted cached offline copy (${formatStorageBytes(res.freedBytes)} freed).`
              : 'Removed item from offline page cache.',
          );
          if (this.portalBrowserSettingsMode) {
            this.renderBrowserSettingsPanel();
          }
        });
        return;
      }
      if (target.closest('#inbForceRefreshAppBtn')) {
        this.game.sound.playClick();
        window.location.reload();
        return;
      }
      if (target.closest('#inbResetSettingsBtn')) {
        this.game.portalBrowser.resetSettings();
        this.syncUnifiedSettingsUi();
        this.applyBrowserViewportZoom();
        this.renderChromiumBookmarksBar();
        this.renderBrowserSettingsPanel();
        this.showToast('All browser settings reset to defaults.');
        return;
      }
      if (target.closest('#inbCloseSettingsBtn')) {
        this.portalBrowserSettingsMode = false;
        this.renderPortalChromiumBrowser(false);
        return;
      }
      const histOpen = target.closest<HTMLButtonElement>('[data-history-url]');
      if (histOpen && histOpen.dataset.historyUrl) {
        this.game.sound.playClick();
        this.navigatePortalBrowserUrl(histOpen.dataset.historyUrl);
        return;
      }
      const histNewTab = target.closest<HTMLButtonElement>('[data-history-newtab]');
      if (histNewTab && histNewTab.dataset.historyNewtab) {
        this.game.sound.playClick();
        this.game.portalBrowser.createTab(histNewTab.dataset.historyNewtab);
        this.portalBrowserSettingsMode = false;
        this.portalWorldOrbitMode = false;
        this.portalMissionViewMode = false;
        this.renderPortalChromiumBrowser(true);
        return;
      }
      const toggleBmBtn = target.closest<HTMLButtonElement>('[data-toggle-bm-url]');
      if (toggleBmBtn && toggleBmBtn.dataset.toggleBmUrl) {
        const bUrl = toggleBmBtn.dataset.toggleBmUrl;
        const bTitle = toggleBmBtn.dataset.toggleBmTitle || bUrl;
        const bVar: PortalVariant = toggleBmBtn.dataset.toggleBmVariant === 'B' ? 'B' : 'A';
        const added = this.game.portalBrowser.toggleBookmark(bTitle, bUrl, bVar);
        this.game.sound.playClick();
        this.renderChromiumBookmarksBar();
        this.updateBrowserHistoryListInPlace();
        this.showToast(added ? `Saved bookmark "${bTitle}"` : `Removed bookmark "${bTitle}"`);
        return;
      }
      const searchRerun = target.closest<HTMLButtonElement>('[data-search-rerun]');
      if (searchRerun && searchRerun.dataset.searchRerun) {
        this.game.sound.playClick();
        this.navigatePortalBrowserUrl(searchRerun.dataset.searchRerun);
        return;
      }
      const rmSearch = target.closest<HTMLButtonElement>('[data-remove-search]');
      if (rmSearch && rmSearch.dataset.removeSearch) {
        const removed = this.game.portalBrowser.removeSearchHistoryEntry(rmSearch.dataset.removeSearch);
        if (removed) {
          this.game.sound.playClick();
          this.updateBrowserHistoryListInPlace();
        }
        return;
      }
      const rmHist = target.closest<HTMLButtonElement>('[data-remove-history]');
      if (rmHist && rmHist.dataset.removeHistory) {
        const removed = this.game.portalBrowser.removeHistoryEntry(rmHist.dataset.removeHistory);
        if (removed) {
          this.game.sound.playClick();
          this.updateBrowserHistoryListInPlace();
        }
        return;
      }
      const rmBm = target.closest<HTMLButtonElement>('[data-remove-bm]');
      if (rmBm && rmBm.dataset.removeBm) {
        this.game.portalBrowser.removeCustomBookmark(rmBm.dataset.removeBm);
        this.game.sound.playClick();
        this.renderChromiumBookmarksBar();
        if (this.portalBrowserSettingsTab === 'history') {
          this.updateBrowserHistoryListInPlace();
        } else {
          this.renderBrowserSettingsPanel();
        }
        return;
      }
      if (target.closest('#inbAudioToggleMuteBtn')) {
        this.game.sound.toggleMute();
        this.game.sound.playClick();
        this.renderBrowserSettingsPanel();
        return;
      }
    });

    this.chromiumSettingsPanelEl.addEventListener('change', (e) => {
      const target = e.target as HTMLElement;
      if (target.id === 'inbSearchEngineSel') {
        this.game.portalBrowser.updateSettings({
          searchEngine: (target as HTMLSelectElement).value as SearchEngineId,
        });
        this.syncUnifiedSettingsUi();
        this.renderBrowserSettingsPanel();
      } else if (target.id === 'inbUaSel') {
        this.game.portalBrowser.updateSettings({
          userAgentPreset: (target as HTMLSelectElement).value as UserAgentPreset,
        });
        this.lastLoadedIframeKey = '';
        this.syncUnifiedSettingsUi();
        this.renderBrowserSettingsPanel();
      } else if (target.id === 'inbTrackerShieldChk') {
        this.game.portalBrowser.updateSettings({
          trackerShield: (target as HTMLInputElement).checked,
        });
        this.lastLoadedIframeKey = '';
        this.syncUnifiedSettingsUi();
      } else if (target.id === 'inbDefaultProxyChk') {
        this.game.portalBrowser.updateSettings({
          defaultProxyMode: (target as HTMLInputElement).checked,
        });
        this.syncUnifiedSettingsUi();
      } else if (target.id === 'inbBookmarksBarChk') {
        this.game.portalBrowser.updateSettings({
          showBookmarksBar: (target as HTMLInputElement).checked,
        });
        this.renderChromiumBookmarksBar();
        this.syncUnifiedSettingsUi();
      }
    });

    this.chromiumSettingsPanelEl.addEventListener('input', (e) => {
      const target = e.target as HTMLElement;
      if (target.id === 'inbZoomSlider') {
        const z = Number((target as HTMLInputElement).value);
        this.game.portalBrowser.updateSettings({ zoomPercent: z });
        const lbl = this.chromiumSettingsPanelEl.querySelector('#inbZoomVal');
        if (lbl) lbl.textContent = `${z}%`;
        this.applyBrowserViewportZoom();
        this.syncUnifiedSettingsUi();
      } else if (target.id === 'inbMasterVolSlider') {
        const v = Number((target as HTMLInputElement).value) / 100;
        this.game.sound.setMasterVolume(v);
        const lbl = this.chromiumSettingsPanelEl.querySelector('#inbMasterVolVal');
        if (lbl) lbl.textContent = `${Math.round(v * 100)}%`;
      } else if (target.id === 'inbMusicVolSlider') {
        const v = Number((target as HTMLInputElement).value) / 100;
        this.game.sound.setMusicVolume(v);
        const lbl = this.chromiumSettingsPanelEl.querySelector('#inbMusicVolVal');
        if (lbl) lbl.textContent = `${Math.round(v * 100)}%`;
      } else if (target.id === 'inbAmbientVolSlider') {
        const v = Number((target as HTMLInputElement).value) / 100;
        this.game.sound.setAmbientVolume(v);
        const lbl = this.chromiumSettingsPanelEl.querySelector('#inbAmbientVolVal');
        if (lbl) lbl.textContent = `${Math.round(v * 100)}%`;
      } else if (target.id === 'inbSfxVolSlider') {
        const v = Number((target as HTMLInputElement).value) / 100;
        this.game.sound.setSfxVolume(v);
        const lbl = this.chromiumSettingsPanelEl.querySelector('#inbSfxVolVal');
        if (lbl) lbl.textContent = `${Math.round(v * 100)}%`;
      } else if (target.id === 'inbHistorySearchInput') {
        this.portalHistorySearchQuery = (target as HTMLInputElement).value;
        this.updateBrowserHistoryListInPlace();
      }
    });

    // Browser Profile Switcher button & popover interactions
    this.chromiumProfileBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.game.sound.playClick();
      this.portalProfilePopoverOpen = !this.portalProfilePopoverOpen;
      this.chromiumProfilePopoverEl.classList.toggle('hidden', !this.portalProfilePopoverOpen);
      if (this.portalProfilePopoverOpen) {
        this.renderProfilePopover();
      }
    });

    this.chromiumProfilePopoverEl.addEventListener('click', (e) => {
      e.stopPropagation();
      const profBtn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-switch-profile]');
      if (profBtn && profBtn.dataset.switchProfile) {
        this.triggerMirrorShimmerForTab(0, 'profile');
        const switched = this.game.portalBrowser.switchProfile(profBtn.dataset.switchProfile);
        this.portalProfilePopoverOpen = false;
        this.chromiumProfilePopoverEl.classList.add('hidden');
        this.portalMissionViewMode = false;
        this.portalWorldOrbitMode = true;
        this.showToast(
          `${switched.avatarEmoji} Switched to ${switched.name} (${this.game.portalBrowser.getTabs().length} Mirror-House Tabs)`,
        );
        this.renderPortalChromiumBrowser(true);
        return;
      }

      const populateBtn = (e.target as HTMLElement).closest<HTMLButtonElement>('#popoverPopulateMirrorsBtn');
      if (populateBtn) {
        this.game.portalBrowser.populateMirrorHouseTabs();
        this.triggerMirrorShimmerForTab(this.game.portalBrowser.getTabs().length - 1, 'spawn');
        this.portalProfilePopoverOpen = false;
        this.chromiumProfilePopoverEl.classList.add('hidden');
        this.portalMissionViewMode = false;
        this.portalWorldOrbitMode = true;
        this.showToast('🪞 Added 4 new Mirror-House tab worlds to your active profile!');
        this.renderPortalChromiumBrowser(false);
      }
    });

    this.chromiumProfilePopoverEl.addEventListener('submit', (e) => {
      const form = (e.target as HTMLElement).closest<HTMLFormElement>('#createProfileForm');
      if (!form) return;
      e.preventDefault();
      const nameInput = form.querySelector<HTMLInputElement>('#newProfileNameInput');
      const emojiSelect = form.querySelector<HTMLSelectElement>('#newProfileEmojiSelect');
      const name = nameInput?.value.trim() || 'Ascended Voyager';
      const emoji = emojiSelect?.value || '🪐';
      const created = this.game.portalBrowser.createProfile(name, emoji);
      this.triggerMirrorShimmerForTab(0, 'profile');
      this.portalProfilePopoverOpen = false;
      this.chromiumProfilePopoverEl.classList.add('hidden');
      this.portalMissionViewMode = false;
      this.portalWorldOrbitMode = true;
      this.showToast(`${created.avatarEmoji} Created Browser Profile "${created.name}" with 12 Mirror-House Tabs!`);
      this.renderPortalChromiumBrowser(true);
    });

    this.chromiumOtherworldProfileStripEl.addEventListener('click', (e) => {
      const chip = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-switch-profile]');
      if (!chip || !chip.dataset.switchProfile) return;
      const switched = this.game.portalBrowser.switchProfile(chip.dataset.switchProfile);
      this.triggerMirrorShimmerForTab(0, 'profile');
      this.portalMissionViewMode = false;
      this.portalWorldOrbitMode = true;
      this.showToast(
        `${switched.avatarEmoji} Active Profile: ${switched.name} (${this.game.portalBrowser.getTabs().length} Mirror Tabs)`,
      );
      this.renderPortalChromiumBrowser(true);
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
        const tabs = this.game.portalBrowser.getTabs();
        const tabIdx = Math.max(0, tabs.findIndex((t) => t.id === tabBtn.dataset.tabid));
        const prevId = this.game.portalBrowser.getActiveTab().id;
        this.game.portalBrowser.activateTab(tabBtn.dataset.tabid);
        this.triggerMirrorShimmerForTab(tabIdx, 'select');
        this.portalWorldOrbitMode = false;
        this.portalMissionViewMode = false;
        this.renderPortalChromiumBrowser(prevId !== tabBtn.dataset.tabid);
      }
    });

    // Clicking any 3D rolling tab card in the Mirror-House Rotunda plays spatial shimmering resonance and enters that tab!
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
        const orbitIdx = Number(card.dataset.orbitidx ?? 0);
        this.triggerMirrorShimmerForTab(orbitIdx, 'enter');
        this.game.portalBrowser.activateTab(card.dataset.tabid);
        this.portalWorldOrbitMode = false;
        this.portalMissionViewMode = false;
        this.renderPortalChromiumBrowser(true);
      }
    });

    this.chromiumOrbitStageEl.addEventListener('pointerenter', () => {
      this.portalOrbitHoverPaused = true;
    });
    this.chromiumOrbitStageEl.addEventListener('pointerleave', () => {
      this.portalOrbitHoverPaused = false;
      this.portalOrbitPitchDeg = 0;
    });
    this.chromiumOrbitStageEl.addEventListener('pointermove', (e) => {
      const rect = this.chromiumOrbitStageEl.getBoundingClientRect();
      if (rect.height > 20) {
        const ny = (e.clientY - rect.top) / rect.height - 0.5;
        this.portalOrbitPitchDeg = Math.max(-14, Math.min(14, -ny * 18));
      }
    });
    this.chromiumOrbitStageEl.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        this.portalOrbitAngle += (e.deltaY || e.deltaX) * 0.0032;
        this.updateRollingTabOrbitPositions(true);
      },
      { passive: false },
    );

    this.root.querySelector('#orbitSpinLeftBtn')?.addEventListener('click', () => {
      const tabs = this.game.portalBrowser.getTabs();
      const count = Math.max(1, tabs.length);
      this.portalOrbitAngle -= (Math.PI * 2) / Math.min(8, count);
      this.updateRollingTabOrbitPositions(false);
      const layout = computeRollingTabOrbitLayout(count, this.portalOrbitAngle);
      const front = layout.find((n) => n.isFront) || layout[0];
      this.triggerMirrorShimmerForTab(front ? front.index : 0, 'spin');
    });

    this.root.querySelector('#orbitSpinRightBtn')?.addEventListener('click', () => {
      const tabs = this.game.portalBrowser.getTabs();
      const count = Math.max(1, tabs.length);
      this.portalOrbitAngle += (Math.PI * 2) / Math.min(8, count);
      this.updateRollingTabOrbitPositions(false);
      const layout = computeRollingTabOrbitLayout(count, this.portalOrbitAngle);
      const front = layout.find((n) => n.isFront) || layout[0];
      this.triggerMirrorShimmerForTab(front ? front.index : 0, 'spin');
    });

    this.root.querySelector('#orbitEnterFrontBtn')?.addEventListener('click', () => {
      const tabs = this.game.portalBrowser.getTabs();
      const layout = computeRollingTabOrbitLayout(tabs.length, this.portalOrbitAngle);
      const frontNode = layout.find((n) => n.isFront) || layout[0];
      if (frontNode && tabs[frontNode.index]) {
        this.triggerMirrorShimmerForTab(frontNode.index, 'enter');
        this.game.portalBrowser.activateTab(tabs[frontNode.index].id);
      }
      this.portalWorldOrbitMode = false;
      this.portalMissionViewMode = false;
      this.renderPortalChromiumBrowser(true);
    });

    this.root.querySelector('#orbitSpawnTabBtn')?.addEventListener('click', () => {
      this.game.portalBrowser.createTab('chrome://newtab');
      this.triggerMirrorShimmerForTab(this.game.portalBrowser.getTabs().length - 1, 'spawn');
      this.renderPortalChromiumBrowser(false);
    });

    this.root.querySelector('#orbitPopulateMirrorsBtn')?.addEventListener('click', () => {
      this.game.portalBrowser.populateMirrorHouseTabs();
      this.triggerMirrorShimmerForTab(this.game.portalBrowser.getTabs().length - 1, 'spawn');
      this.showToast('🪞 Spawned 4 more Mirror-House tabs around your 3D Rotunda!');
      this.renderPortalChromiumBrowser(false);
    });

    this.root.querySelector('#chromiumNewTabBtn')!.addEventListener('click', () => {
      const settings = this.game.portalBrowser.getSettings();
      this.game.portalBrowser.createTab();
      this.triggerMirrorShimmerForTab(this.game.portalBrowser.getTabs().length - 1, 'spawn');
      this.portalBrowserSettingsMode = false;
      this.portalMissionViewMode = false;
      this.portalWorldOrbitMode = settings.newTabBehavior === 'mirror_house';
      this.renderPortalChromiumBrowser(true);
      this.chromiumOmniboxInput.focus();
      this.chromiumOmniboxInput.select();
    });

    this.chromiumPortalABtn.addEventListener('click', () => {
      this.game.portalBrowser.setActivePortalVariant('A');
      this.triggerMirrorShimmerForTab(0, 'profile', 'A');
      this.renderPortalChromiumBrowser(true);
    });

    this.chromiumPortalBBtn.addEventListener('click', () => {
      this.game.portalBrowser.setActivePortalVariant('B');
      this.triggerMirrorShimmerForTab(0, 'profile', 'B');
      this.renderPortalChromiumBrowser(true);
    });

    this.chromiumBackBtn.addEventListener('click', () => {
      if (!this.game.portalBrowser.canGoBack()) return;
      this.game.sound.playClick();
      this.game.portalBrowser.goBack();
      this.portalWorldOrbitMode = false;
      this.portalMissionViewMode = false;
      this.portalBrowserSettingsMode = false;
      this.renderPortalChromiumBrowser(true);
    });

    this.chromiumFwdBtn.addEventListener('click', () => {
      if (!this.game.portalBrowser.canGoForward()) return;
      this.game.sound.playClick();
      this.game.portalBrowser.goForward();
      this.portalWorldOrbitMode = false;
      this.portalMissionViewMode = false;
      this.portalBrowserSettingsMode = false;
      this.renderPortalChromiumBrowser(true);
    });

    this.root.querySelector('#chromiumReloadBtn')!.addEventListener('click', () => {
      this.game.sound.playClick();
      this.lastLoadedIframeKey = '';
      this.portalWorldOrbitMode = false;
      this.portalMissionViewMode = false;
      this.portalBrowserSettingsMode = false;
      this.renderPortalChromiumBrowser(true);
    });

    this.root.querySelector('#chromiumHomeBtn')!.addEventListener('click', () => {
      const home = this.game.portalBrowser.getSettings().homepageUrl;
      this.game.sound.playClick();
      if (home === 'chrome://mirror-house') {
        this.portalBrowserSettingsMode = false;
        this.portalMissionViewMode = false;
        this.portalWorldOrbitMode = true;
        this.renderPortalChromiumBrowser(false);
      } else {
        this.navigatePortalBrowserUrl(home);
      }
    });

    this.chromiumOmniboxForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = this.chromiumOmniboxInput.value.trim();
      if (!val) return;
      this.game.sound.playClick();
      this.closeOmniboxSuggestions();
      this.navigatePortalBrowserUrl(val);
      this.chromiumOmniboxInput.blur();
    });

    this.chromiumOmniboxInput.addEventListener('focus', () => {
      this.closeBookmarkPopover();
      this.renderOmniboxSuggestions(this.chromiumOmniboxInput.value);
    });

    this.chromiumOmniboxInput.addEventListener('input', () => {
      this.renderOmniboxSuggestions(this.chromiumOmniboxInput.value);
    });

    this.chromiumOmniboxInput.addEventListener('blur', () => {
      window.setTimeout(() => this.closeOmniboxSuggestions(), 140);
    });

    this.chromiumOmniboxSuggestionsEl.addEventListener('mousedown', (e) => {
      e.preventDefault();
      const target = e.target as HTMLElement;
      const rmSearch = target.closest<HTMLButtonElement>('[data-omni-remove-search]');
      if (rmSearch && rmSearch.dataset.omniRemoveSearch) {
        this.game.portalBrowser.removeSearchHistoryEntry(rmSearch.dataset.omniRemoveSearch);
        this.renderOmniboxSuggestions(this.chromiumOmniboxInput.value);
        if (this.portalBrowserSettingsMode && this.portalBrowserSettingsTab === 'history') {
          this.updateBrowserHistoryListInPlace();
        }
        return;
      }
      const pick = target.closest<HTMLButtonElement>('[data-omni-go]');
      if (pick && pick.dataset.omniGo) {
        this.game.sound.playClick();
        this.closeOmniboxSuggestions();
        this.navigatePortalBrowserUrl(pick.dataset.omniGo);
        this.chromiumOmniboxInput.blur();
      }
    });

    this.portalBrowserModal.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (
        this.portalBookmarkPopoverOpen &&
        !target.closest('#chromiumBookmarkPopover') &&
        !target.closest('#chromiumBookmarkBtn')
      ) {
        this.closeBookmarkPopover();
      }
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
      this.portalMissionViewMode = false;
      this.portalWorldOrbitMode = false;
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
        this.portalMissionViewMode = false;
      }
      this.portalBrowserModal.classList.toggle('is-pip', this.portalBrowserPip);
      this.chromiumPipBtn.textContent = this.portalBrowserPip ? 'Expand' : 'PiP';
      this.renderPortalChromiumBrowser(false);
      this.syncModalFreeze();
    });

    this.root.querySelector('#chromiumCloseBtn')!.addEventListener('click', () => {
      this.closePortalBrowserModal();
    });

    // Delegated interactive handlers for all 5 Portal Mission Trial Floors
    this.chromiumMissionPanelEl.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const mission = this.game.portalMissions.getMissionForPortal(this.activePortalKey);

      if (target.closest('#missionOpenReliquaryBtn')) {
        this.openLootReliquaryModal();
        return;
      }
      if (target.closest('#missionGoMirrorsBtn')) {
        this.triggerMirrorShimmerForTab(0, 'orbit');
        this.portalMissionViewMode = false;
        this.portalBrowserSettingsMode = false;
        this.portalWorldOrbitMode = true;
        this.renderPortalChromiumBrowser(false);
        return;
      }
      if (target.closest('#missionGoWebBtn')) {
        this.triggerMirrorShimmerForTab(0, 'select');
        this.portalMissionViewMode = false;
        this.portalBrowserSettingsMode = false;
        this.portalWorldOrbitMode = false;
        this.renderPortalChromiumBrowser(true);
        return;
      }
      if (target.closest('#missionWarpNextBtn')) {
        this.closePortalBrowserModal();
        this.game.executePendingPortalWarp();
        return;
      }
      if (target.closest('#missionDismissRevBtn')) {
        this.missionRevelationBanner = null;
        this.renderPortalMissionPanel();
        return;
      }

      // Floor 1: Quiz & Archive Riddle
      if (target.closest('#missionQuizHintBtn')) {
        this.game.sound.playClick();
        this.missionQuizHintOpen = true;
        this.renderPortalMissionPanel();
        return;
      }
      const quizBtn = target.closest<HTMLButtonElement>('[data-quiz-idx]');
      if (quizBtn && mission.quiz) {
        const chosen = Number(quizBtn.dataset.quizIdx);
        if (chosen === mission.quiz.correctIndex) {
          this.completeActivePortalMission(mission, `Correct! ${mission.quiz.explanation}`);
        } else {
          this.game.sound.playClick();
          this.game.portalMissions.applyTimePenalty(30);
          this.missionFeedbackTone = 'error';
          this.missionFeedbackMsg =
            'Incorrect answer (-00:00:30 on Coma Clock). Use the Hint or try another option!';
          this.syncSoulClockBadge();
          this.renderPortalMissionPanel();
        }
        return;
      }

      // Floor 2: Tactical Rescue / Strategy Allocation
      const stratBtn = target.closest<HTMLButtonElement>('[data-strat-idx]');
      if (stratBtn && mission.strategy) {
        const idx = Number(stratBtn.dataset.stratIdx);
        const choice = mission.strategy.choices[idx];
        if (!choice) return;
        if (choice.success) {
          this.completeActivePortalMission(mission, choice.outcomeText);
        } else {
          this.game.sound.playClick();
          this.game.portalMissions.applyTimePenalty(choice.timePenaltySec);
          this.missionFeedbackTone = 'error';
          this.missionFeedbackMsg = `${choice.outcomeText} (-${choice.timePenaltySec}s on Coma Clock)`;
          this.syncSoulClockBadge();
          this.renderPortalMissionPanel();
        }
        return;
      }

      // Floor 3: Network Repair Circuit Puzzle
      const netNodeBtn = target.closest<HTMLButtonElement>('[data-net-toggle]');
      if (netNodeBtn && mission.network) {
        const idx = Number(netNodeBtn.dataset.netToggle);
        if (idx >= 0 && idx < 4) {
          this.missionNetworkToggles[idx] = !this.missionNetworkToggles[idx];
          this.triggerMirrorShimmerForTab(idx, 'select');
          this.renderPortalMissionPanel();
        }
        return;
      }
      if (target.closest('#missionNetVerifyBtn') && mission.network) {
        const evalRes = evaluateNetworkCircuit(this.missionNetworkToggles, mission.network);
        if (evalRes.solved) {
          this.completeActivePortalMission(
            mission,
            `Relay Locked at ${evalRes.currentSignal} Hz! The Portal Wormhole link is fully synchronized.`,
          );
        } else {
          this.game.sound.playClick();
          this.game.portalMissions.applyTimePenalty(20);
          this.missionFeedbackTone = 'error';
          this.missionFeedbackMsg = `Signal reads ${evalRes.currentSignal} Hz (target ${mission.network.targetSignal} Hz, off by ${evalRes.delta > 0 ? `+${evalRes.delta}` : evalRes.delta} Hz). Adjust the active routers!`;
          this.syncSoulClockBadge();
          this.renderPortalMissionPanel();
        }
        return;
      }

      // Floor 4: Chemical Alchemy Stabilization
      const alchBtn = target.closest<HTMLButtonElement>('[data-alch-id]');
      if (alchBtn && alchBtn.dataset.alchId && mission.alchemy) {
        const rid = alchBtn.dataset.alchId;
        const existingIdx = this.missionAlchemySelected.indexOf(rid);
        if (existingIdx >= 0) {
          this.missionAlchemySelected.splice(existingIdx, 1);
        } else {
          if (this.missionAlchemySelected.length >= 2) {
            this.missionAlchemySelected.shift();
          }
          this.missionAlchemySelected.push(rid);
        }
        this.triggerMirrorShimmerForTab(this.missionAlchemySelected.length, 'select');
        this.renderPortalMissionPanel();
        return;
      }
      if (target.closest('#missionAlchClearBtn')) {
        this.missionAlchemySelected = [];
        this.renderPortalMissionPanel();
        return;
      }
      if (target.closest('#missionAlchMixBtn') && mission.alchemy) {
        const mixRes = evaluateAlchemyMix(this.missionAlchemySelected, mission.alchemy);
        if (!mixRes.validCount) {
          this.missionFeedbackTone = 'neutral';
          this.missionFeedbackMsg = 'Select exactly 2 reagents from the crucible tray before synthesizing.';
          this.renderPortalMissionPanel();
          return;
        }
        if (mixRes.solved) {
          this.completeActivePortalMission(
            mission,
            `${mission.alchemy.formulaName} synthesized cleanly! The fractured portal lens glows bright.`,
          );
        } else {
          this.game.sound.playClick();
          this.game.portalMissions.applyTimePenalty(25);
          this.missionFeedbackTone = 'error';
          this.missionFeedbackMsg =
            'Unstable reaction! Re-read the alchemist’s journal clue and pick the two harmonizing reagents (-25s).';
          this.missionAlchemySelected = [];
          this.syncSoulClockBadge();
          this.renderPortalMissionPanel();
        }
        return;
      }

      // Floor 5: 29-Card Soul Elimination & 1v1 Shadow Duel
      if (target.closest('#missionCardResetBtn')) {
        this.game.sound.playClick();
        this.resetMissionSession(mission);
        this.renderPortalMissionPanel();
        return;
      }
      const cardActBtn = target.closest<HTMLButtonElement>('[data-card-action]');
      if (cardActBtn && mission.cardDuel && !this.missionShadowPhase) {
        const action = cardActBtn.dataset.cardAction === 'gambit' ? 'gambit' : 'steady';
        const roundRes = resolve29CardEliminationRound(
          this.missionCardParticipants,
          this.missionCardRound,
          action,
        );
        this.missionCardRound += 1;
        this.missionCardLog = roundRes.logMessage;
        this.triggerMirrorShimmerForTab(this.missionCardRound, 'spin');

        if (!roundRes.playerSurvived) {
          this.game.portalMissions.applyTimePenalty(35);
          this.missionFeedbackTone = 'error';
          this.missionFeedbackMsg = `${roundRes.logMessage} (-35s on Coma Clock)`;
          this.syncSoulClockBadge();
        } else if (roundRes.remainingAliveCount <= 2) {
          this.missionShadowPhase = true;
          this.missionShadowPlayerHp = 3;
          this.missionShadowBossHp = 3;
          this.missionShadowIntent = 'strike';
          this.missionFeedbackTone = 'neutral';
          this.missionFeedbackMsg = `Final 2 reached! Defeat ${mission.cardDuel.shadowBossName} in the 1v1 Shadow Duel (Ward beats Strike · Feint beats Ward · Strike beats Feint).`;
        } else {
          this.missionFeedbackTone = 'neutral';
          this.missionFeedbackMsg = roundRes.logMessage;
        }
        this.renderPortalMissionPanel();
        return;
      }

      const duelMoveBtn = target.closest<HTMLButtonElement>('[data-duel-move]');
      if (duelMoveBtn && mission.cardDuel && this.missionShadowPhase) {
        const move = duelMoveBtn.dataset.duelMove as 'strike' | 'ward' | 'feint';
        const bossMove = this.missionShadowIntent;
        const playerWinsClash =
          (move === 'ward' && bossMove === 'strike') ||
          (move === 'feint' && bossMove === 'ward') ||
          (move === 'strike' && bossMove === 'feint');
        const tie = move === bossMove;

        if (playerWinsClash) {
          this.missionShadowBossHp = Math.max(0, this.missionShadowBossHp - 1);
          this.triggerMirrorShimmerForTab(2, 'enter');
          this.missionFeedbackTone = 'success';
          this.missionFeedbackMsg = `Your ${move.toUpperCase()} countered the Shadow’s ${bossMove.toUpperCase()}! Boss HP: ${this.missionShadowBossHp}/3.`;
        } else if (tie) {
          this.game.sound.playClick();
          this.missionFeedbackTone = 'neutral';
          this.missionFeedbackMsg = `Steel & Qi clash! Both chose ${move.toUpperCase()} — zero damage.`;
        } else {
          this.missionShadowPlayerHp = Math.max(0, this.missionShadowPlayerHp - 1);
          this.game.sound.playClick();
          this.missionFeedbackTone = 'error';
          this.missionFeedbackMsg = `The Shadow’s ${bossMove.toUpperCase()} broke your ${move.toUpperCase()}! Your Guard: ${this.missionShadowPlayerHp}/3.`;
        }

        const intents: Array<'strike' | 'ward' | 'feint'> = ['strike', 'ward', 'feint'];
        this.missionShadowIntent = intents[Math.floor(Math.random() * intents.length)];

        if (this.missionShadowBossHp <= 0) {
          this.completeActivePortalMission(
            mission,
            `Shadow Duel Victory! ${mission.cardDuel.shadowBossName} shattered into radiant mirror shards.`,
          );
          return;
        }
        if (this.missionShadowPlayerHp <= 0) {
          this.game.portalMissions.applyTimePenalty(40);
          this.missionFeedbackTone = 'error';
          this.missionFeedbackMsg =
            'Your Shadow Guard broke (-40s). Reset the 29-Card Table to challenge again!';
          this.syncSoulClockBadge();
        }
        this.renderPortalMissionPanel();
      }
    });

    // Listen for navigation, actions, and title postMessages from proxied pages and chrome://newtab
    window.addEventListener('message', (e) => {
      // Strictly verify message originates from our active browser iframe
      if (e.source !== this.chromiumViewportFrame.contentWindow) return;
      if (e.origin !== 'null' && e.origin !== window.location.origin) return;

      const data = e.data as {
        type?: string;
        bridgeToken?: string;
        url?: string;
        title?: string;
        action?: string;
        target?: string;
        mode?: string;
        portalId?: string;
        variant?: PortalVariant;
        x?: number;
        z?: number;
      } | null;
      if (!data || typeof data !== 'object') return;
      if (data.bridgeToken !== this.game.portalBrowser.getBridgeToken()) return;

      if (data.type === 'SERPENT_PORTAL_NAVIGATE' && typeof data.url === 'string') {
        this.navigatePortalBrowserUrl(data.url);
      } else if (data.type === 'SERPENT_PORTAL_TAB_LOADED') {
        this.chromiumLoadingBarEl.classList.add('hidden');
        this.game.portalBrowser.updateActiveTabMetadata(data.url, data.title);
        this.renderPortalChromiumBrowser(false);
      } else if (data.type === 'SERPENT_PORTAL_ACTION') {
        // Privileged app actions are ONLY permitted from internal chrome:// pages, never third-party web pages
        const activeTabUrl = this.game.portalBrowser.getActiveTab().url;
        if (!activeTabUrl.startsWith('chrome://')) return;
        this.handleNewTabAction(data);
      }
    });
  }

  private handleNewTabAction(data: {
    action?: string;
    target?: string;
    mode?: string;
    portalId?: string;
    variant?: PortalVariant;
    x?: number;
    z?: number;
  }): void {
    this.game.sound.playClick();
    if (data.action === 'open_mirror_house') {
      this.portalBrowserSettingsMode = false;
      this.portalMissionViewMode = false;
      this.portalWorldOrbitMode = true;
      this.renderPortalChromiumBrowser(false);
      return;
    }
    if (data.action === 'open_settings') {
      this.navigatePortalBrowserUrl('chrome://settings');
      return;
    }
    if (data.action === 'remove_bookmark' && data.target) {
      this.game.portalBrowser.removeCustomBookmark(data.target);
      this.renderChromiumBookmarksBar();
      this.renderPortalChromiumBrowser(false);
      this.showToast('Removed bookmark.');
      return;
    }
    if (data.action === 'remove_search_history' && data.target) {
      this.game.portalBrowser.removeSearchHistoryEntry(data.target);
      this.renderPortalChromiumBrowser(false);
      return;
    }
    if (data.action === 'clear_search_history') {
      this.game.portalBrowser.clearSearchHistory();
      this.renderPortalChromiumBrowser(false);
      this.showToast('Search history cleared.');
      return;
    }
    if (data.action === 'play_game') {
      this.closePortalBrowserModal();
      if (this.game.getMode() === 'title') {
        this.game.startGame();
      }
      return;
    }
    if (data.action === 'open_portal') {
      const variant: PortalVariant = data.variant === 'B' ? 'B' : 'A';
      const portalId = data.portalId || this.activePortalKey || 'spawn-guard-portal-a';
      if (data.mode === 'warp') {
        this.closePortalBrowserModal();
        this.game.warpToPortalByIdOrCoords(portalId, data.x, data.z, variant);
        return;
      }
      this.activePortalKey = portalId;
      this.game.portalBrowser.setActivePortalVariant(variant);
      const mission = this.game.portalMissions.getMissionForPortal(portalId);
      this.resetMissionSession(mission);
      this.portalBrowserSettingsMode = false;
      this.portalWorldOrbitMode = false;
      this.portalMissionViewMode = true;
      this.renderPortalChromiumBrowser(false);
      return;
    }
    if (data.action === 'open_milestone') {
      switch (data.target) {
        case 'mission': {
          this.portalBrowserSettingsMode = false;
          this.portalWorldOrbitMode = false;
          this.portalMissionViewMode = true;
          this.renderPortalChromiumBrowser(false);
          break;
        }
        case 'journey': {
          this.closePortalBrowserModal();
          this.openJourneyModal();
          break;
        }
        case 'summary': {
          this.closePortalBrowserModal();
          this.openCurrentSummaryForReview();
          break;
        }
        case 'reliquary': {
          this.closePortalBrowserModal();
          this.openLootReliquaryModal();
          break;
        }
        case 'archives': {
          this.closePortalBrowserModal();
          this.openSoulArchivesModal();
          break;
        }
        case 'bestiary': {
          this.closePortalBrowserModal();
          this.openBestiaryModal();
          break;
        }
        case 'ranking': {
          this.closePortalBrowserModal();
          this.openGlobalRankingModal(false);
          break;
        }
        default:
          break;
      }
    }
  }

  private renderPortalMissionPanel(): void {
    const mgr = this.game.portalMissions;
    const mission = mgr.getMissionForPortal(this.activePortalKey);
    const completed = mgr.isPortalCompleted(this.activePortalKey);
    const souls = mgr.getCollectedSouls();
    const soulPct = Math.round((souls / SOUL_TARGET_COUNT) * 100);
    const clock = mgr.getFormattedClock();

    let revelationHtml = '';
    if (this.missionRevelationBanner === 'hospital') {
      revelationHtml = `
        <div class="mission-revelation-banner">
          <div class="mission-revelation-kicker">🏥 7TH SOUL FRAGMENT · HOSPITAL CORRIDOR REVELATION</div>
          <p class="mission-revelation-quote">${HOSPITAL_REVELATION_TEXT}</p>
          <div class="mission-action-bar" style="margin-top:10px">
            <button type="button" class="mission-btn primary" id="missionDismissRevBtn">Continue Gathering Souls (${souls}/${SOUL_TARGET_COUNT})</button>
          </div>
        </div>
      `;
    } else if (this.missionRevelationBanner === 'fifteenth') {
      revelationHtml = `
        <div class="mission-revelation-banner">
          <div class="mission-revelation-kicker">✨ ALL 14 SOUL FRAGMENTS UNITED · FINAL TRUTH</div>
          <p class="mission-revelation-quote">${FIFTEENTH_SOUL_EPILOGUE_TEXT}</p>
          <div class="mission-action-bar" style="margin-top:10px">
            <button type="button" class="mission-btn primary" id="missionDismissRevBtn">Awaken on Serpent Peaks</button>
          </div>
        </div>
      `;
    }

    let bodyHtml = '';
    if (mission.type === 'quiz' && mission.quiz) {
      const q = mission.quiz;
      bodyHtml = `
        <div class="mission-stage-card">
          <p class="mission-prompt-text">❓ ${q.prompt}</p>
          ${this.missionQuizHintOpen ? `<div class="mission-clue-box">💡 Hint: ${q.hint}</div>` : ''}
          <div class="mission-options-grid">
            ${q.options
              .map(
                (opt, i) => `
              <button type="button" class="mission-option-btn" data-quiz-idx="${i}">
                <strong>${String.fromCharCode(65 + i)}.</strong> ${opt}
              </button>
            `,
              )
              .join('')}
          </div>
          <div class="mission-action-bar">
            <button type="button" class="mission-btn" id="missionQuizHintBtn">💡 Reveal Archive Hint</button>
          </div>
        </div>
      `;
    } else if (mission.type === 'strategy' && mission.strategy) {
      bodyHtml = `
        <div class="mission-stage-card">
          <div class="mission-clue-box">📋 Situation: ${mission.strategy.situation}</div>
          <div class="mission-options-grid">
            ${mission.strategy.choices
              .map(
                (c, i) => `
              <button type="button" class="mission-option-btn" data-strat-idx="${i}">
                <strong>Command ${i + 1}:</strong> ${c.label}
                <span class="mission-option-sub">${c.summary}</span>
              </button>
            `,
              )
              .join('')}
          </div>
        </div>
      `;
    } else if (mission.type === 'network' && mission.network) {
      const net = mission.network;
      const evalRes = evaluateNetworkCircuit(this.missionNetworkToggles, net);
      bodyHtml = `
        <div class="mission-stage-card">
          <div class="mission-clue-box">🔌 Relay Schematic: ${net.clue}</div>
          <div class="mission-signal-readout">
            <span>ACTIVE SIGNAL: <strong style="color:${evalRes.solved ? '#4ade80' : '#f472b6'}">${evalRes.currentSignal} Hz</strong></span>
            <span>TARGET FREQUENCY: <strong style="color:#38bdf8">${net.targetSignal} Hz</strong></span>
          </div>
          <div class="mission-nodes-grid">
            ${net.nodeLabels
              .map(
                (label, idx) => `
              <button type="button" class="mission-node-btn ${this.missionNetworkToggles[idx] ? 'is-on' : ''}" data-net-toggle="${idx}">
                <span>${label}</span>
                <span>${this.missionNetworkToggles[idx] ? '● ONLINE' : '○ OFF'}</span>
              </button>
            `,
              )
              .join('')}
          </div>
          <div class="mission-action-bar">
            <button type="button" class="mission-btn primary" id="missionNetVerifyBtn">⚡ Lock Portal Frequency</button>
          </div>
        </div>
      `;
    } else if (mission.type === 'alchemy' && mission.alchemy) {
      const alch = mission.alchemy;
      bodyHtml = `
        <div class="mission-stage-card">
          <div class="mission-clue-box">🧪 ${alch.clue}</div>
          <div class="mission-nodes-grid">
            ${alch.reagents
              .map((r) => {
                const sel = this.missionAlchemySelected.includes(r.id);
                return `
                <button type="button" class="mission-reagent-btn ${sel ? 'is-selected' : ''}" data-alch-id="${r.id}">
                  <strong style="color:${r.colorHex}">${sel ? '✓ ' : ''}${r.name}</strong>
                  <span style="font-size:11.5px;color:#99bfb2">${r.trait}</span>
                </button>
              `;
              })
              .join('')}
          </div>
          <div class="mission-action-bar">
            <button type="button" class="mission-btn primary" id="missionAlchMixBtn">⚗️ Synthesize ${alch.formulaName} (${this.missionAlchemySelected.length}/2)</button>
            <button type="button" class="mission-btn" id="missionAlchClearBtn">Clear Crucible</button>
          </div>
        </div>
      `;
    } else if (mission.type === 'card_duel' && mission.cardDuel) {
      const playerAlive = this.missionCardParticipants.some((p) => p.isPlayer && p.alive);
      bodyHtml = `
        <div class="mission-stage-card">
          <div class="mission-clue-box">🃏 ${this.missionCardLog}</div>
          <div class="mission-card-table">
            ${this.missionCardParticipants
              .map((p) => {
                const cardTxt =
                  p.lastCard === null
                    ? 'Ready'
                    : p.lastCard === 0
                      ? '💀 #0 VOID REAPER'
                      : `Card #${p.lastCard}`;
                return `
                <div class="mission-seat-card ${p.isPlayer ? 'is-player' : ''} ${p.alive ? '' : 'is-eliminated'}">
                  <span class="mission-seat-name">${p.name}</span>
                  <span class="mission-seat-val">${cardTxt}</span>
                  <span style="font-size:10.5px;color:${p.alive ? '#4ade80' : '#f87171'}">${p.alive ? 'SEATED' : 'ELIMINATED'}</span>
                </div>
              `;
              })
              .join('')}
          </div>
          ${
            !this.missionShadowPhase
              ? `
            <div class="mission-action-bar">
              ${
                playerAlive
                  ? `
                <button type="button" class="mission-btn primary" data-card-action="steady">🃏 Draw Round ${this.missionCardRound} (Steady)</button>
                <button type="button" class="mission-btn teal" data-card-action="gambit">✨ Qi Sense Draw (Pick Higher of 2)</button>
              `
                  : ''
              }
              <button type="button" class="mission-btn" id="missionCardResetBtn">↺ Reset 29-Card Table</button>
            </div>
          `
              : `
            <div class="mission-signal-readout">
              <span>YOUR GUARD: <strong style="color:#4ade80">${this.missionShadowPlayerHp}/3</strong></span>
              <span>${mission.cardDuel.shadowBossName.toUpperCase()} HP: <strong style="color:#f43f5e">${this.missionShadowBossHp}/3</strong></span>
              <span>SHADOW INTENT: <strong style="color:#fde047">${this.missionShadowIntent.toUpperCase()}</strong></span>
            </div>
            <div class="mission-action-bar">
              ${
                this.missionShadowPlayerHp > 0 && this.missionShadowBossHp > 0
                  ? `
                <button type="button" class="mission-btn primary" data-duel-move="ward">🛡 Ward (Counters Strike)</button>
                <button type="button" class="mission-btn teal" data-duel-move="feint">⚡ Feint (Counters Ward)</button>
                <button type="button" class="mission-btn" data-duel-move="strike">⚔️ Strike (Counters Feint)</button>
              `
                  : `<button type="button" class="mission-btn primary" id="missionCardResetBtn">↺ Rematch 29-Card Tournament</button>`
              }
            </div>
          `
          }
        </div>
      `;
    }

    const diffProfile = computeMissionDifficultyTier({
      floorNumber: mission.floorNumber,
      speedPreset: this.game.getSpeedPreset(),
      weather: this.game.getWeather(),
      level: this.game.getEvolutionLevel(),
    });

    let lootDropHtml = '';
    if (this.latestMissionLootDrop) {
      const drop = this.latestMissionLootDrop;
      const matsHtml = drop.materials
        .map(
          (m) => `
            <div class="mission-loot-item" style="--loot-accent:${m.accentHex}">
              <span class="mission-loot-icon">${renderLootIconSvg('material', m.accentHex, m.rarity)}</span>
              <div class="mission-loot-copy">
                <div class="mission-loot-name">${m.quantity}× ${this.escapeHtmlText(m.name)}${m.firstDiscovery ? ' · New' : ''}</div>
                <div class="mission-loot-meta">${LOOT_RARITY_META[m.rarity].label} Material</div>
              </div>
            </div>
          `,
        )
        .join('');
      lootDropHtml = `
        <div class="mission-loot-card" style="--loot-accent:${drop.difficulty.accentHex}">
          <div class="mission-loot-head">
            <div>
              <div class="mission-loot-kicker">Mission Spoils Claimed · ${drop.difficulty.label}</div>
              <div class="mission-loot-sub">Unique rewards scaled to Floor ${drop.floorNumber} &amp; current mountain climate</div>
            </div>
            <button type="button" class="mission-btn" id="missionOpenReliquaryBtn">Open Reliquary (I)</button>
          </div>
          <div class="mission-loot-grid">
            <div class="mission-loot-item" style="--loot-accent:${drop.multiplierReward.accentHex}">
              <span class="mission-loot-icon">${renderLootIconSvg('elixir', drop.multiplierReward.accentHex, drop.multiplierReward.rarity)}</span>
              <div class="mission-loot-copy">
                <div class="mission-loot-name">${drop.multiplierReward.multiplier.toFixed(2)}× ${this.escapeHtmlText(drop.multiplierReward.name)}</div>
                <div class="mission-loot-meta">Active ${formatLootDuration(drop.multiplierReward.durationSec)} · XP &amp; Qi Cultivation Speed</div>
              </div>
            </div>
            ${matsHtml}
          </div>
        </div>
      `;
    }

    this.chromiumMissionPanelEl.innerHTML = `
      <div class="mission-chamber-inner">
        <div class="mission-header-card">
          <div style="flex:1;min-width:260px">
            <div class="mission-meta-line" style="color:${mission.accentHex}">
              ${mission.floorLabel} · ${diffProfile.label} · ${LOOT_RARITY_META[diffProfile.guaranteedMinRarity].label}+ Loot · ${completed ? 'Cleared' : 'Active Trial'}
            </div>
            <h3 class="mission-title">${mission.title}</h3>
            <p class="mission-sub">${mission.briefing}</p>
          </div>
          <div class="mission-soul-meter">
            <div class="mission-soul-meter-top">
              <span>SOUL FRAGMENTS</span>
              <span>${souls} / ${SOUL_TARGET_COUNT}</span>
            </div>
            <div class="mission-soul-track">
              <div class="mission-soul-fill" style="width:${soulPct}%"></div>
            </div>
            <div class="mission-clock-sub">TIME REMAINING: ${clock}</div>
          </div>
        </div>

        ${revelationHtml}
        ${lootDropHtml}
        ${bodyHtml}
        ${
          this.missionFeedbackMsg
            ? `<div class="mission-feedback ${this.missionFeedbackTone}">${this.missionFeedbackMsg}</div>`
            : ''
        }

        <div class="mission-action-bar">
          <button type="button" class="mission-btn teal" id="missionGoMirrorsBtn">Enter 360° Mirror-House</button>
          <button type="button" class="mission-btn" id="missionGoWebBtn">Open Web Browser</button>
          <button type="button" class="mission-btn" id="missionWarpNextBtn">Warp to Next Portal</button>
        </div>
      </div>
    `;
  }

  private navigatePortalBrowserUrl(rawInput: string): void {
    const lower = rawInput.trim().toLowerCase();
    if (lower === 'chrome://settings' || lower === 'serpent://settings') {
      this.portalBrowserSettingsTab = 'general';
      this.portalBrowserSettingsMode = true;
      this.portalMissionViewMode = false;
      this.portalWorldOrbitMode = false;
      this.renderPortalChromiumBrowser(false);
      return;
    }
    if (lower === 'chrome://bookmarks' || lower === 'serpent://bookmarks') {
      this.portalBrowserSettingsTab = 'bookmarks';
      this.portalBrowserSettingsMode = true;
      this.portalMissionViewMode = false;
      this.portalWorldOrbitMode = false;
      this.renderPortalChromiumBrowser(false);
      return;
    }
    if (lower === 'chrome://history' || lower === 'serpent://history') {
      this.portalBrowserSettingsTab = 'history';
      this.portalBrowserSettingsMode = true;
      this.portalMissionViewMode = false;
      this.portalWorldOrbitMode = false;
      this.renderPortalChromiumBrowser(false);
      return;
    }
    this.game.portalBrowser.navigateActiveTab(rawInput);
    this.portalBrowserSettingsMode = false;
    this.portalWorldOrbitMode = false;
    this.portalMissionViewMode = false;
    this.renderPortalChromiumBrowser(true);
  }

  private getActiveHistoryFilterOptions(): BrowserHistoryFilterOptions {
    const opts: BrowserHistoryFilterOptions = {
      query: this.portalHistorySearchQuery,
    };
    if (this.portalHistoryFilter === 'session') {
      opts.sessionId = this.game.portalBrowser.getCurrentSessionId();
    } else if (this.portalHistoryFilter === 'A' || this.portalHistoryFilter === 'B') {
      opts.portalVariant = this.portalHistoryFilter;
    }
    return opts;
  }

  private formatHistoryTimestamp(ts: number, bucket: string): string {
    const d = new Date(ts);
    const timePart = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (bucket === 'Today' || bucket === 'Yesterday') return timePart;
    const datePart = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    return `${datePart}, ${timePart}`;
  }

  private openBookmarkPopover(prefill?: { url?: string; title?: string; variant?: PortalVariant }): void {
    const mgr = this.game.portalBrowser;
    const activeTab = mgr.getActiveTab();
    const rawUrl = prefill?.url ?? (activeTab.displayUrl === 'chrome://newtab' ? '' : activeTab.displayUrl);
    const rawTitle = prefill?.title ?? (activeTab.displayUrl === 'chrome://newtab' ? '' : activeTab.title);
    const variant: PortalVariant = prefill?.variant ?? activeTab.portalVariant;
    const alreadySaved = rawUrl ? mgr.isCustomBookmarked(rawUrl) : false;

    this.portalBookmarkPopoverOpen = true;
    this.chromiumBookmarkPopoverEl.innerHTML = `
      <div class="cbm-pop-head">
        <span class="cbm-pop-title">${alreadySaved ? 'Edit Portal Bookmark' : 'Bookmark Portal URL'}</span>
        <button type="button" class="bset-history-del" id="cbmCloseBtn" aria-label="Close bookmark popover">×</button>
      </div>
      <form class="cbm-pop-form" id="cbmBookmarkForm">
        <label class="cbm-pop-field">
          <span>Title</span>
          <input
            type="text"
            class="dark-select cbm-pop-input"
            id="cbmTitleInput"
            value="${this.escapeHtmlText(rawTitle)}"
            placeholder="e.g. Dragon Lore Wiki or Peaks Atlas"
            maxlength="48"
            spellcheck="false"
          />
        </label>
        <label class="cbm-pop-field">
          <span>Portal URL</span>
          <input
            type="text"
            class="dark-select cbm-pop-input"
            id="cbmUrlInput"
            value="${this.escapeHtmlText(rawUrl)}"
            placeholder="https://... or chrome://peaks-atlas"
            maxlength="320"
            spellcheck="false"
            required
          />
        </label>
        <label class="cbm-pop-field">
          <span>Portal Channel</span>
          <select class="dark-select cbm-pop-input" id="cbmChannelSel">
            <option value="A" ${variant === 'A' ? 'selected' : ''}>Portal A · Azure Channel</option>
            <option value="B" ${variant === 'B' ? 'selected' : ''}>Portal B · Crimson Channel</option>
          </select>
        </label>
        <p class="cbm-pop-note">Saved bookmarks appear in the Bookmarks Bar, New Tab, and Browser History panels.</p>
        <div class="cbm-pop-actions">
          <button type="submit" class="primary-cta compact">${alreadySaved ? 'Update' : 'Save Bookmark'}</button>
          ${alreadySaved ? '<button type="button" class="ghost-btn compact" id="cbmRemoveBtn">Remove</button>' : ''}
          <button type="button" class="ghost-btn compact" id="cbmViewHistoryBtn">View History</button>
        </div>
      </form>
    `;
    this.chromiumBookmarkPopoverEl.classList.remove('hidden');
    const focusEl = rawUrl
      ? this.chromiumBookmarkPopoverEl.querySelector<HTMLInputElement>('#cbmTitleInput')
      : this.chromiumBookmarkPopoverEl.querySelector<HTMLInputElement>('#cbmUrlInput');
    focusEl?.focus();
    focusEl?.select();
  }

  private closeBookmarkPopover(): void {
    this.portalBookmarkPopoverOpen = false;
    this.chromiumBookmarkPopoverEl.classList.add('hidden');
  }

  private closeOmniboxSuggestions(): void {
    this.portalOmniboxSuggestionsOpen = false;
    this.chromiumOmniboxSuggestionsEl.classList.add('hidden');
  }

  private renderOmniboxSuggestions(rawQuery: string): void {
    const mgr = this.game.portalBrowser;
    const q = rawQuery.trim();
    const isCurrentRoute = q.startsWith('chrome://') || q.startsWith('http://') || q.startsWith('https://');
    const filterQ = isCurrentRoute ? '' : q;
    const searches = mgr.getSearchHistory({ query: filterQ }).slice(0, 5);
    const bookmarks = mgr
      .getCustomBookmarks()
      .filter((b) => !filterQ || `${b.title} ${b.url}`.toLowerCase().includes(filterQ.toLowerCase()))
      .slice(0, 4);

    if (searches.length === 0 && bookmarks.length === 0) {
      this.closeOmniboxSuggestions();
      return;
    }

    const searchRows = searches
      .map((s) => {
        const engineName = SEARCH_ENGINE_CATALOG[s.searchEngine]?.name ?? 'Search';
        return `
          <div class="omni-sug-row">
            <button type="button" class="omni-sug-btn" data-omni-go="${this.escapeHtmlText(s.query)}">
              <span class="omni-sug-kind">Search</span>
              <span class="omni-sug-main">${this.escapeHtmlText(s.query)}</span>
              <span class="omni-sug-sub">${this.escapeHtmlText(engineName)}</span>
            </button>
            <button type="button" class="bset-history-del" data-omni-remove-search="${this.escapeHtmlText(s.id)}" aria-label="Remove search">×</button>
          </div>
        `;
      })
      .join('');

    const bmRows = bookmarks
      .map(
        (b) => `
          <div class="omni-sug-row">
            <button type="button" class="omni-sug-btn" data-omni-go="${this.escapeHtmlText(b.url)}">
              <span class="omni-sug-kind is-bm">★</span>
              <span class="omni-sug-main">${this.escapeHtmlText(b.title)}</span>
              <span class="omni-sug-sub">${this.escapeHtmlText(extractHistoryHost(b.url))}</span>
            </button>
          </div>
        `,
      )
      .join('');

    this.chromiumOmniboxSuggestionsEl.innerHTML = `${searchRows}${bmRows}`;
    this.portalOmniboxSuggestionsOpen = true;
    this.chromiumOmniboxSuggestionsEl.classList.remove('hidden');
  }

  private renderBrowserHistorySummaryText(): string {
    const stats = this.game.portalBrowser.getHistoryStats();
    const filteredCount = this.game.portalBrowser.getHistory(this.getActiveHistoryFilterOptions()).length;
    const hasFilter =
      this.portalHistoryFilter !== 'all' || this.portalHistorySearchQuery.trim().length > 0;
    if (hasFilter) {
      return `Showing ${filteredCount} of ${stats.totalEntries} visits · ${stats.totalSearches} searches · ${stats.customBookmarks} saved bookmarks · ${stats.uniqueHosts} sites`;
    }
    return `${stats.totalEntries} visit${stats.totalEntries === 1 ? '' : 's'} (${stats.sessionEntries} this session) · ${stats.totalSearches} search${stats.totalSearches === 1 ? '' : 'es'} · ${stats.customBookmarks} saved bookmark${stats.customBookmarks === 1 ? '' : 's'} · ${stats.uniqueHosts} site${stats.uniqueHosts === 1 ? '' : 's'}`;
  }

  private renderBrowserHistoryListMarkup(): string {
    const mgr = this.game.portalBrowser;
    const filterOpts = this.getActiveHistoryFilterOptions();
    const queryLower = (filterOpts.query ?? '').trim().toLowerCase();

    // 1. Saved Bookmarks Quick-Access Section inside Browser History
    const customBms = mgr.getCustomBookmarks().filter((b) => {
      if (filterOpts.portalVariant && filterOpts.portalVariant !== 'all' && b.portalVariant !== filterOpts.portalVariant) {
        return false;
      }
      if (!queryLower) return true;
      return `${b.title} ${b.url} ${b.portalLabel ?? ''}`.toLowerCase().includes(queryLower);
    });

    const bookmarksBlock = `
      <section class="bset-history-bucket">
        <div class="bset-history-bucket-head">
          <span class="bset-history-bucket-title">Saved Portal Bookmarks</span>
          <div class="bset-inline-row">
            <span class="bset-history-bucket-count">${customBms.length}</span>
            <button type="button" class="ghost-btn compact" id="inbOpenBookmarkDialogBtn">+ Save URL</button>
          </div>
        </div>
        ${
          customBms.length > 0
            ? `<div class="bset-history-rows">
                ${customBms
                  .map((b) => {
                    const pVar = b.portalVariant === 'B' ? 'B' : 'A';
                    const portalCls = pVar === 'B' ? 'is-b' : 'is-a';
                    const savedLabel = b.portalLabel || 'Portal Bookmark';
                    const isOfflineReady = this.game.offlineCache.isUrlCachedOffline(b.url);
                    return `
                      <div class="bset-history-row">
                        <button type="button" class="bset-link-btn" data-history-url="${this.escapeHtmlText(b.url)}" title="Open ${this.escapeHtmlText(b.url)}">
                          <span class="bset-row-title">★ ${this.escapeHtmlText(b.title)}</span>
                          <span class="bset-row-url">${this.escapeHtmlText(b.url)}</span>
                          <span class="bset-history-meta">
                            <span class="bset-history-channel ${portalCls}">Portal ${pVar}</span>
                            <span>${this.escapeHtmlText(savedLabel)}</span>
                            <span>· ${this.escapeHtmlText(extractHistoryHost(b.url))}</span>
                            ${isOfflineReady ? '<span class="bset-offline-ready">· Offline Ready</span>' : ''}
                          </span>
                        </button>
                        <div class="bset-history-actions">
                          <button type="button" class="ghost-btn compact" data-history-url="${this.escapeHtmlText(b.url)}">Open</button>
                          <button type="button" class="ghost-btn compact" data-history-newtab="${this.escapeHtmlText(b.url)}">New Tab</button>
                          <button type="button" class="bset-history-del" data-remove-bm="${this.escapeHtmlText(b.url)}" title="Remove bookmark" aria-label="Remove ${this.escapeHtmlText(b.title)}">×</button>
                        </div>
                      </div>
                    `;
                  })
                  .join('')}
              </div>`
            : `<p class="bset-hint">No saved portal bookmarks yet. Click the ★ button in the address bar or "+ Save URL" to bookmark any portal address for quick access here and on New Tab.</p>`
        }
      </section>
    `;

    // 2. Search History Section inside Browser History
    const filteredSearches = mgr.getSearchHistory({
      query: filterOpts.query,
      portalVariant: filterOpts.portalVariant,
      sessionId: filterOpts.sessionId,
    });
    const totalSearches = mgr.getSearchHistory().length;
    const searchHistoryBlock = `
      <section class="bset-history-bucket">
        <div class="bset-history-bucket-head">
          <span class="bset-history-bucket-title">Search History</span>
          <div class="bset-inline-row">
            <span class="bset-history-bucket-count">${filteredSearches.length}</span>
            ${
              totalSearches > 0
                ? '<button type="button" class="ghost-btn compact" id="inbClearSearchHistoryBtn">Clear Searches</button>'
                : ''
            }
          </div>
        </div>
        ${
          filteredSearches.length > 0
            ? `<div class="bset-history-rows">
                ${filteredSearches
                  .slice(0, 20)
                  .map((sr) => {
                    const engineName = SEARCH_ENGINE_CATALOG[sr.searchEngine]?.name ?? sr.searchEngine;
                    const portalCls = sr.portalVariant === 'B' ? 'is-b' : 'is-a';
                    const timeStr = this.formatHistoryTimestamp(sr.searchedAt, 'Today');
                    const repeatNote = sr.searchCount > 1 ? ` · ${sr.searchCount}×` : '';
                    return `
                      <div class="bset-history-row">
                        <button type="button" class="bset-link-btn" data-search-rerun="${this.escapeHtmlText(sr.query)}" title="Search again: ${this.escapeHtmlText(sr.query)}">
                          <span class="bset-row-title">${this.escapeHtmlText(sr.query)}</span>
                          <span class="bset-history-meta">
                            <span class="bset-history-channel ${portalCls}">Portal ${sr.portalVariant}</span>
                            <span>${this.escapeHtmlText(engineName)}</span>
                            <span>· ${this.escapeHtmlText(sr.portalLabel)}${repeatNote}</span>
                          </span>
                        </button>
                        <div class="bset-history-actions">
                          <span class="bset-row-time">${timeStr}</span>
                          <button type="button" class="ghost-btn compact" data-search-rerun="${this.escapeHtmlText(sr.query)}">Search</button>
                          <button type="button" class="bset-history-del" data-remove-search="${this.escapeHtmlText(sr.id)}" title="Remove search" aria-label="Remove ${this.escapeHtmlText(sr.query)}">×</button>
                        </div>
                      </div>
                    `;
                  })
                  .join('')}
              </div>`
            : `<p class="bset-hint">${
                totalSearches === 0
                  ? 'No web searches recorded yet. Queries entered in the address bar or New Tab search box are saved here.'
                  : 'No search queries match your current filter.'
              }</p>`
        }
      </section>
    `;

    // 3. Visited URLs grouped chronologically
    const allHistory = mgr.getHistory();
    let visitsBlock = '';
    if (allHistory.length === 0) {
      visitsBlock = `
        <div class="bset-history-empty">
          <p class="bset-history-empty-title">No visited URLs recorded yet</p>
          <p class="bset-hint">URLs visited across your 3D portal gates and standalone browser sessions are automatically saved here with their portal channel and timestamp.</p>
          <button type="button" class="secondary-cta compact" id="inbHistoryOpenNewTabBtn">Open New Tab</button>
        </div>
      `;
    } else {
      const filtered = mgr.getHistory(filterOpts);
      if (filtered.length === 0) {
        visitsBlock = `
          <div class="bset-history-empty">
            <p class="bset-history-empty-title">No visited URLs match your current filter</p>
            <p class="bset-hint">Try a different keyword or switch back to All Sessions to see all ${allHistory.length} saved visits.</p>
            <button type="button" class="ghost-btn compact" id="inbResetHistoryFiltersBtn">Reset Filters</button>
          </div>
        `;
      } else {
        const currentSessionId = mgr.getCurrentSessionId();
        const groups = groupHistoryByTimeBucket(filtered);
        visitsBlock = groups
          .map(
            (group) => `
              <section class="bset-history-bucket">
                <div class="bset-history-bucket-head">
                  <span class="bset-history-bucket-title">${group.bucket}</span>
                  <span class="bset-history-bucket-count">${group.entries.length}</span>
                </div>
                <div class="bset-history-rows">
                  ${group.entries
                    .map((h) => {
                      const timeStr = this.formatHistoryTimestamp(h.visitedAt, group.bucket);
                      const host = extractHistoryHost(h.url);
                      const sessionTag = h.sessionId === currentSessionId ? ' · Current Session' : '';
                      const visitsNote = h.visitCount > 1 ? ` · ${h.visitCount} visits` : '';
                      const portalCls = h.portalVariant === 'B' ? 'is-b' : 'is-a';
                      const isSaved = mgr.isCustomBookmarked(h.url);
                      const isCached = this.game.offlineCache.isUrlCachedOffline(h.url);
                      return `
                        <div class="bset-history-row">
                          <button
                            type="button"
                            class="bset-link-btn"
                            data-history-url="${this.escapeHtmlText(h.url)}"
                            title="Open ${this.escapeHtmlText(h.url)}"
                          >
                            <span class="bset-row-title">${this.escapeHtmlText(h.title)}</span>
                            <span class="bset-row-url">${this.escapeHtmlText(h.url)}</span>
                            <span class="bset-history-meta">
                              <span class="bset-history-channel ${portalCls}">Portal ${h.portalVariant}</span>
                              <span>${this.escapeHtmlText(h.portalLabel)}</span>
                              <span>· ${this.escapeHtmlText(host)}${visitsNote}${sessionTag}</span>
                              ${isCached ? '<span class="bset-offline-ready">· Cached</span>' : ''}
                            </span>
                          </button>
                          <div class="bset-history-actions">
                            <span class="bset-row-time">${timeStr}</span>
                            <button
                              type="button"
                              class="bset-history-star ${isSaved ? 'is-saved' : ''}"
                              data-toggle-bm-url="${this.escapeHtmlText(h.url)}"
                              data-toggle-bm-title="${this.escapeHtmlText(h.title)}"
                              data-toggle-bm-variant="${h.portalVariant}"
                              title="${isSaved ? 'Remove bookmark' : 'Bookmark this portal URL'}"
                              aria-label="${isSaved ? 'Remove bookmark' : 'Bookmark'} ${this.escapeHtmlText(h.title)}"
                            >${isSaved ? '★' : '☆'}</button>
                            <button type="button" class="ghost-btn compact" data-history-url="${this.escapeHtmlText(h.url)}">Open</button>
                            <button type="button" class="ghost-btn compact" data-history-newtab="${this.escapeHtmlText(h.url)}">New Tab</button>
                            <button
                              type="button"
                              class="bset-history-del"
                              data-remove-history="${this.escapeHtmlText(h.id)}"
                              title="Remove from history"
                              aria-label="Remove ${this.escapeHtmlText(h.title)} from history"
                            >×</button>
                          </div>
                        </div>
                      `;
                    })
                    .join('')}
                </div>
              </section>
            `,
          )
          .join('');
      }
    }

    return `${bookmarksBlock}${searchHistoryBlock}${visitsBlock}`;
  }

  private updateBrowserHistoryListInPlace(): void {
    const summaryEl = this.chromiumSettingsPanelEl.querySelector('#inbHistorySummary');
    if (summaryEl) {
      summaryEl.textContent = this.renderBrowserHistorySummaryText();
    }
    const listHost = this.chromiumSettingsPanelEl.querySelector('#inbHistoryListHost');
    if (listHost) {
      listHost.innerHTML = this.renderBrowserHistoryListMarkup();
    }
    const histTabBtn = this.chromiumSettingsPanelEl.querySelector<HTMLButtonElement>(
      '[data-bset-tab="history"]',
    );
    if (histTabBtn) {
      const total = this.game.portalBrowser.getHistoryStats().totalEntries;
      histTabBtn.textContent = total > 0 ? `Browser History (${total})` : 'Browser History';
    }
  }

  private renderBrowserSettingsPanel(): void {
    const mgr = this.game.portalBrowser;
    const s = mgr.getSettings();
    const stats = mgr.getHistoryStats();
    const customBms = mgr.getCustomBookmarks();
    const tab = this.portalBrowserSettingsTab;

    let bodyHtml = '';
    if (tab === 'general') {
      const engineOptions = Object.values(SEARCH_ENGINE_CATALOG)
        .map(
          (eng) =>
            `<option value="${eng.id}" ${s.searchEngine === eng.id ? 'selected' : ''}>${eng.name} — ${eng.note}</option>`,
        )
        .join('');
      bodyHtml = `
        <div class="bset-grid">
          <div class="bset-group">
            <label class="bset-label">App Launch Mode (Dual Browser + Game Release)</label>
            <p class="bset-hint">Choose whether opening Serpent Peaks launches directly into the 3D mountain world or opens straight into the standalone Web Browser.</p>
            <div class="bset-seg">
              <button type="button" class="bset-seg-btn ${s.startupMode === 'game' ? 'active' : ''}" data-inb-startup="game">Start in 3D Game</button>
              <button type="button" class="bset-seg-btn ${s.startupMode === 'browser' ? 'active' : ''}" data-inb-startup="browser">Start as Web Browser</button>
            </div>
          </div>

          <div class="bset-group">
            <label class="bset-label" for="inbSearchEngineSel">Default Search Engine</label>
            <p class="bset-hint">Used by the Omnibox address bar and the New Tab search box.</p>
            <select class="dark-select bset-select" id="inbSearchEngineSel">${engineOptions}</select>
          </div>

          <div class="bset-group">
            <label class="bset-label" for="inbHomepageInput">Homepage Address</label>
            <p class="bset-hint">Opened when clicking the Home button (supports https://, chrome://newtab, chrome://mirror-house).</p>
            <div class="bset-inline-row">
              <input type="text" class="dark-select bset-input" id="inbHomepageInput" value="${this.escapeHtmlText(s.homepageUrl)}" spellcheck="false" />
              <button type="button" class="primary-cta compact" id="inbSaveHomepageBtn">Save</button>
            </div>
          </div>

          <div class="bset-group">
            <label class="bset-label">New Tab Opens</label>
            <div class="bset-seg">
              <button type="button" class="bset-seg-btn ${s.newTabBehavior === 'newtab' ? 'active' : ''}" data-inb-newtab="newtab">Search Hub</button>
              <button type="button" class="bset-seg-btn ${s.newTabBehavior === 'mirror_house' ? 'active' : ''}" data-inb-newtab="mirror_house">3D Mirror-House</button>
              <button type="button" class="bset-seg-btn ${s.newTabBehavior === 'homepage' ? 'active' : ''}" data-inb-newtab="homepage">Homepage</button>
            </div>
          </div>

          <div class="bset-group">
            <label class="bset-label" for="inbZoomSlider">Page Zoom · <strong id="inbZoomVal">${s.zoomPercent}%</strong></label>
            <input type="range" class="settings-slider" id="inbZoomSlider" min="80" max="130" step="5" value="${s.zoomPercent}" />
          </div>

          <div class="bset-group">
            <label class="bset-check">
              <input type="checkbox" id="inbBookmarksBarChk" ${s.showBookmarksBar ? 'checked' : ''} />
              <span>Show Bookmarks Bar below the address bar</span>
            </label>
          </div>

          <div class="bset-group bset-release-box">
            <label class="bset-label">Install as Standalone Browser &amp; Game App</label>
            <p class="bset-hint">Install Serpent Peaks to your desktop or phone with dedicated app shortcuts for both "Play Serpent Peaks" and "Launch Portal Browser".</p>
            <div class="bset-inline-row">
              <button type="button" class="primary-cta compact ${isStandalonePwa() ? 'hidden' : ''}" id="inbInstallPwaBtn">Install App (PWA)</button>
              <button type="button" class="ghost-btn compact" id="inbResetSettingsBtn">Reset Defaults</button>
            </div>
          </div>
        </div>
      `;
    } else if (tab === 'privacy') {
      const sync = this.game.offlineCache.getSyncIndicator();
      bodyHtml = `
        <div class="bset-grid">
          <div class="bset-group">
            <label class="bset-label">Service Worker Sync &amp; Offline Cache</label>
            <div class="sw-sync-card tone-${sync.tone} phase-${sync.phase}" id="inbSwSyncCard" role="status" aria-live="polite">
              <div class="sw-sync-top">
                <span class="sw-sync-dot tone-${sync.tone} phase-${sync.phase}" id="inbSwSyncDot" aria-hidden="true"></span>
                <span class="sw-sync-badge" id="inbSwSyncBadge">${this.escapeHtmlText(sync.shortBadge)}</span>
                <span class="sw-sync-headline" id="inbSwSyncHeadline">${this.escapeHtmlText(sync.headline)}</span>
              </div>
              <div class="sw-sync-detail" id="inbSwSyncDetail">${this.escapeHtmlText(sync.detail)}</div>
            </div>
            <p class="bset-hint">Displays real-time Service Worker cache synchronization for portal history, saved bookmarks, and core assets. Clear the offline cache to wipe corrupted assets and force a clean refresh.</p>
            <div class="bset-inline-row">
              <button type="button" class="primary-cta compact" id="inbCacheBookmarksOfflineBtn">Sync &amp; Cache Now</button>
              <button type="button" class="secondary-cta compact" id="inbClearOfflineCacheBtn">Clear Offline Cache</button>
              <button type="button" class="ghost-btn compact" id="inbForceRefreshAppBtn">Force Refresh</button>
            </div>
          </div>

          <div class="bset-group" id="inbStorageUsageHost">
            ${this.renderStorageUsageBreakdownMarkup()}
          </div>

          <div class="bset-group">
            <label class="bset-label" for="inbUaSel">User-Agent Identity</label>
            <p class="bset-hint">Controls how websites format pages fetched through the Portal Chromium proxy.</p>
            <select class="dark-select bset-select" id="inbUaSel">
              <option value="serpent_portal" ${s.userAgentPreset === 'serpent_portal' ? 'selected' : ''}>Portal Chromium 131 (Default)</option>
              <option value="desktop_chrome" ${s.userAgentPreset === 'desktop_chrome' ? 'selected' : ''}>Desktop Chrome (Windows)</option>
              <option value="mobile_chrome" ${s.userAgentPreset === 'mobile_chrome' ? 'selected' : ''}>Mobile Chrome (Android)</option>
            </select>
          </div>
          <div class="bset-group">
            <label class="bset-check">
              <input type="checkbox" id="inbTrackerShieldChk" ${s.trackerShield ? 'checked' : ''} />
              <span>Privacy Tracker Shield — strip analytics/ad trackers and send DNT / Sec-GPC headers</span>
            </label>
          </div>
          <div class="bset-group">
            <label class="bset-check">
              <input type="checkbox" id="inbDefaultProxyChk" ${s.defaultProxyMode ? 'checked' : ''} />
              <span>Default Server Proxy ON — bypass X-Frame-Options restrictions for new tabs</span>
            </label>
          </div>
          <div class="bset-group">
            <label class="bset-label">Session &amp; Storage Cleanup</label>
            <div class="bset-inline-row">
              <button type="button" class="secondary-cta compact" id="inbClearHistoryBtn">Clear Browsing History</button>
              <button type="button" class="ghost-btn compact" id="inbResetTabsBtn">Restore Default Tabs</button>
            </div>
          </div>
        </div>
      `;
    } else if (tab === 'audio') {
      const sound = this.game.sound;
      const masterVol = Math.round(sound.getMasterVolume() * 100);
      const musicVol = Math.round(sound.getMusicVolume() * 100);
      const ambientVol = Math.round(sound.getAmbientVolume() * 100);
      const sfxVol = Math.round(sound.getSfxVolume() * 100);
      const isMuted = sound.isMuted();

      bodyHtml = `
        <div class="bset-grid">
          <div class="bset-group">
            <label class="bset-label">Web Audio Soundscape &amp; Volume Control</label>
            <p class="bset-hint">Customize procedural ambient wind, evolving musical tier beds, and combat sound effects powered by Web Audio API.</p>
            <div class="bset-inline-row mb-4">
              <button type="button" class="primary-cta compact" id="inbAudioToggleMuteBtn">
                ${isMuted ? '🔇 Unmute All Audio' : '🔊 Mute All Audio'}
              </button>
            </div>
          </div>

          <div class="bset-group">
            <label class="bset-label" for="inbMasterVolSlider">Master Volume · <strong id="inbMasterVolVal">${masterVol}%</strong></label>
            <input type="range" class="settings-slider" id="inbMasterVolSlider" min="0" max="100" step="1" value="${masterVol}" />
          </div>

          <div class="bset-group">
            <label class="bset-label" for="inbMusicVolSlider">Music &amp; Harmonic Bed Volume · <strong id="inbMusicVolVal">${musicVol}%</strong></label>
            <p class="bset-hint">12-tier shifting harmonic drone and crystal soundscape.</p>
            <input type="range" class="settings-slider" id="inbMusicVolSlider" min="0" max="100" step="1" value="${musicVol}" />
          </div>

          <div class="bset-group">
            <label class="bset-label" for="inbAmbientVolSlider">Ambient Wind &amp; Environment Volume · <strong id="inbAmbientVolVal">${ambientVol}%</strong></label>
            <p class="bset-hint">Mountain gales, rustling leaves, rain storms, and wildlife acoustics.</p>
            <input type="range" class="settings-slider" id="inbAmbientVolSlider" min="0" max="100" step="1" value="${ambientVol}" />
          </div>

          <div class="bset-group">
            <label class="bset-label" for="inbSfxVolSlider">Sound Effects (SFX) Volume · <strong id="inbSfxVolVal">${sfxVol}%</strong></label>
            <p class="bset-hint">Clicks, combat parries, spell casts, and portal interactions.</p>
            <input type="range" class="settings-slider" id="inbSfxVolSlider" min="0" max="100" step="1" value="${sfxVol}" />
          </div>
        </div>
      `;
    } else if (tab === 'bookmarks') {
      const bmRows =
        customBms.length > 0
          ? customBms
              .map(
                (b) => {
                  const isOfflineReady = this.game.offlineCache.isUrlCachedOffline(b.url);
                  const cachedBytes = isOfflineReady ? this.game.offlineCache.getCachedUrlByteSize(b.url) : 0;
                  const offlineLabel = isOfflineReady
                    ? cachedBytes > 0
                      ? ` · Cached (${formatStorageBytes(cachedBytes)})`
                      : ' · Offline Ready'
                    : '';
                  return `
                  <div class="bset-list-row">
                    <button type="button" class="bset-link-btn" data-history-url="${this.escapeHtmlText(b.url)}">
                      <span class="bset-row-title">★ ${this.escapeHtmlText(b.title)}</span>
                      <span class="bset-row-url">${this.escapeHtmlText(b.url)}${offlineLabel}</span>
                    </button>
                    <div class="bset-history-actions">
                      ${
                        isOfflineReady && !b.url.toLowerCase().startsWith('chrome://')
                          ? `<button type="button" class="ghost-btn compact" data-delete-cached-url="${this.escapeHtmlText(b.url)}" title="Delete only this bookmark's offline cached copy">Delete Cache</button>`
                          : ''
                      }
                      <button type="button" class="ghost-btn compact" data-history-newtab="${this.escapeHtmlText(b.url)}">New Tab</button>
                      <button type="button" class="ghost-btn compact" data-remove-bm="${this.escapeHtmlText(b.url)}">Remove</button>
                    </div>
                  </div>
                `;
                },
              )
              .join('')
          : `<p class="bset-hint">No custom bookmarks yet. Click the star icon in the address bar on any webpage to save it.</p>`;

      bodyHtml = `
        <div class="bset-grid">
          <div class="bset-group">
            <div class="bset-list-head">
              <label class="bset-label">Saved Custom Bookmarks (${customBms.length})</label>
              <button type="button" class="secondary-cta compact" id="inbOpenBookmarkDialogBtn">+ Save Portal URL</button>
            </div>
            <div class="bset-list">${bmRows}</div>
          </div>
        </div>
      `;
    } else {
      bodyHtml = `
        <div class="bset-grid">
          <div class="bset-group bset-history-shell">
            <div class="bset-history-top">
              <div class="bset-history-summary" id="inbHistorySummary">${this.escapeHtmlText(this.renderBrowserHistorySummaryText())}</div>
              <div class="bset-inline-row">
                <button type="button" class="ghost-btn compact" id="inbClearSessionHistoryBtn">Clear Session</button>
                <button type="button" class="ghost-btn compact" id="inbClearHistoryBtn">Clear All</button>
              </div>
            </div>

            <div class="bset-history-toolbar">
              <input
                type="search"
                class="dark-select bset-history-search"
                id="inbHistorySearchInput"
                value="${this.escapeHtmlText(this.portalHistorySearchQuery)}"
                placeholder="Search visited URLs, page titles, or portal gates..."
                spellcheck="false"
                aria-label="Search browser history"
              />
              <div class="bset-seg bset-history-filters" role="group" aria-label="Filter browser history">
                <button type="button" class="bset-seg-btn ${this.portalHistoryFilter === 'all' ? 'active' : ''}" data-hist-filter="all">All Sessions</button>
                <button type="button" class="bset-seg-btn ${this.portalHistoryFilter === 'session' ? 'active' : ''}" data-hist-filter="session">This Session</button>
                <button type="button" class="bset-seg-btn ${this.portalHistoryFilter === 'A' ? 'active' : ''}" data-hist-filter="A">Portal A</button>
                <button type="button" class="bset-seg-btn ${this.portalHistoryFilter === 'B' ? 'active' : ''}" data-hist-filter="B">Portal B</button>
              </div>
            </div>

            <div class="bset-history-list-host" id="inbHistoryListHost">
              ${this.renderBrowserHistoryListMarkup()}
            </div>
          </div>
        </div>
      `;
    }

    const routeLabel =
      tab === 'history'
        ? 'chrome://history · Portal Session Log'
        : tab === 'bookmarks'
          ? 'chrome://bookmarks · Saved Destinations'
          : 'chrome://settings · Portal Chromium 131';
    const headingText =
      tab === 'history'
        ? 'Portal Browser History'
        : tab === 'bookmarks'
          ? 'Saved Bookmarks'
          : 'Browser Settings & Release Controls';
    const historyTabLabel =
      stats.totalEntries > 0 ? `Browser History (${stats.totalEntries})` : 'Browser History';

    const headerSync = this.game.offlineCache.getSyncIndicator();
    this.chromiumSettingsPanelEl.innerHTML = `
      <div class="bset-inner">
        <div class="bset-header">
          <div>
            <div class="bset-eyebrow-row">
              <span class="bset-eyebrow">${routeLabel}</span>
              <span class="bset-header-sw" id="inbHeaderSwSync" title="${this.escapeHtmlText(headerSync.headline)}">
                <span class="sw-sync-dot tone-${headerSync.tone} phase-${headerSync.phase}" id="inbHeaderSwDot" aria-hidden="true"></span>
                <span id="inbHeaderSwLabel">SW: ${this.escapeHtmlText(headerSync.shortBadge)}</span>
              </span>
            </div>
            <h3 class="bset-title">${headingText}</h3>
          </div>
          <div class="bset-header-right">
            <div class="bset-tabs" role="tablist">
              <button type="button" class="bset-tab ${tab === 'general' ? 'active' : ''}" data-bset-tab="general" role="tab" aria-selected="${tab === 'general'}">General &amp; Search</button>
              <button type="button" class="bset-tab ${tab === 'privacy' ? 'active' : ''}" data-bset-tab="privacy" role="tab" aria-selected="${tab === 'privacy'}">Privacy &amp; Offline</button>
              <button type="button" class="bset-tab ${tab === 'bookmarks' ? 'active' : ''}" data-bset-tab="bookmarks" role="tab" aria-selected="${tab === 'bookmarks'}">Bookmarks</button>
              <button type="button" class="bset-tab ${tab === 'audio' ? 'active' : ''}" data-bset-tab="audio" role="tab" aria-selected="${tab === 'audio'}">🔊 Audio Settings</button>
              <button type="button" class="bset-tab ${tab === 'history' ? 'active' : ''}" data-bset-tab="history" role="tab" aria-selected="${tab === 'history'}">${historyTabLabel}</button>
            </div>
            <button type="button" class="ghost-btn compact" id="inbCloseSettingsBtn">Back to Web</button>
          </div>
        </div>
        ${bodyHtml}
      </div>
    `;
  }

  private renderStorageUsageBreakdownMarkup(): string {
    const usage = this.game.offlineCache.getStorageUsage();
    const shares = computeStorageBucketShares(usage);
    const bookmarksByUrl = new Map(
      this.game.portalBrowser.getAllBookmarks().map((bm) => [bm.url, bm.title]),
    );
    const bucketColors: Record<string, string> = {
      core: '#2de3ff',
      portalPages: '#3de095',
      portalState: '#f2c14e',
      fonts: '#a855f7',
    };

    const barSegments = shares
      .filter((b) => b.sharePct > 0)
      .map(
        (b) =>
          `<span class="sw-usage-seg" style="width:${Math.max(2, b.sharePct)}%;background:${bucketColors[b.key] || '#58e1ff'}" title="${this.escapeHtmlText(b.label)}: ${formatStorageBytes(b.bytes)} (${b.sharePct}%)"></span>`,
      )
      .join('');

    const bucketRows = shares
      .map(
        (b) => `
          <div class="sw-usage-bucket-row">
            <span class="sw-usage-dot" style="background:${bucketColors[b.key] || '#58e1ff'}"></span>
            <span class="sw-usage-name">${this.escapeHtmlText(b.label)}</span>
            <span class="sw-usage-entries">${b.entries} item${b.entries === 1 ? '' : 's'}</span>
            <span class="sw-usage-bytes">${formatStorageBytes(b.bytes)}</span>
            <span class="sw-usage-pct">${b.sharePct}%</span>
          </div>
        `,
      )
      .join('');

    const cachedItemsHtml =
      usage.cachedItems.length > 0
        ? usage.cachedItems
            .map((item) => {
              const title = bookmarksByUrl.get(item.url) || extractHistoryHost(item.url) || item.url;
              return `
                <div class="sw-cached-item-row">
                  <div class="sw-cached-item-info">
                    <span class="sw-cached-item-title">${this.escapeHtmlText(title)}</span>
                    <span class="sw-cached-item-url">${this.escapeHtmlText(item.url)}</span>
                  </div>
                  <span class="sw-cached-item-size">${formatStorageBytes(item.bytes)}</span>
                  <button type="button" class="ghost-btn compact" data-delete-cached-url="${this.escapeHtmlText(item.url)}">Delete Cache</button>
                </div>
              `;
            })
            .join('')
        : `<p class="bset-hint">No individual cached bookmark pages stored yet. Save a bookmark or click "Sync &amp; Cache Now" to cache pages for offline reading.</p>`;

    const quotaReadout =
      usage.browserQuotaBytes && usage.browserQuotaBytes > 0
        ? `${formatStorageBytes(usage.totalCacheBytes)} SW Cache · ${formatStorageBytes(usage.browserEstimatedUsageBytes ?? usage.totalCacheBytes)} / ${formatStorageBytes(usage.browserQuotaBytes)} Origin Quota`
        : `${formatStorageBytes(usage.totalCacheBytes)} Service Worker Cache`;

    return `
      <div class="sw-usage-head">
        <div>
          <label class="bset-label">Storage Usage Breakdown</label>
          <div class="sw-usage-quota">${this.escapeHtmlText(quotaReadout)}</div>
        </div>
        <button type="button" class="ghost-btn compact" id="inbRefreshStorageUsageBtn">Recalculate</button>
      </div>
      <div class="sw-usage-bar" aria-label="Service Worker cache distribution">
        ${barSegments || '<span class="sw-usage-empty-bar"></span>'}
      </div>
      <div class="sw-usage-buckets">${bucketRows}</div>
      <div class="sw-cached-items-head">
        <span>Cached Offline Bookmarks &amp; Pages (${usage.cachedItems.length})</span>
        <span>Per-Item Cache Control</span>
      </div>
      <div class="sw-cached-items-list">${cachedItemsHtml}</div>
    `;
  }

  private renderProfilePopover(): void {
    const mgr = this.game.portalBrowser;
    const profiles = mgr.getProfiles();
    const activeProf = mgr.getActiveProfile();

    this.chromiumProfilePopoverEl.innerHTML = `
      <div class="cprof-popover-head">
        <span class="cprof-popover-kicker">CHROMIUM 131 MULTI-PROFILE ENGINE</span>
        <h4 class="cprof-popover-title">Switch Browser Profile &amp; Mirror-House Workspace</h4>
        <p class="cprof-popover-sub">Each profile stores its own independent Hall of Mirrors (12+ live tabs), history, and portal channel.</p>
      </div>
      <div class="cprof-list">
        ${profiles
          .map((p) => {
            const isAct = p.id === activeProf.id;
            const tabCount = isAct ? mgr.getTabs().length : 12;
            return `
              <button type="button" class="cprof-option-card ${isAct ? 'is-active' : ''}" data-switch-profile="${p.id}">
                <span class="cprof-opt-avatar" style="border-color:${p.accentHex}">${p.avatarEmoji}</span>
                <div class="cprof-opt-copy">
                  <div class="cprof-opt-top">
                    <span class="cprof-opt-name">${p.name}</span>
                    <span class="cprof-opt-badge" style="color:${p.accentHex}">${p.realmBadge}</span>
                  </div>
                  <span class="cprof-opt-meta">${p.handle} · 🪞 ${tabCount} Mirror-House Tabs · ${isAct ? 'ACTIVE PROFILE' : 'Click to Switch'}</span>
                </div>
              </button>
            `;
          })
          .join('')}
      </div>
      <div class="cprof-actions-row">
        <button type="button" class="cprof-populate-btn" id="popoverPopulateMirrorsBtn">
          🪞 +4 Extra Mirror-House Tabs in ${activeProf.name}
        </button>
      </div>
      <form class="cprof-create-form" id="createProfileForm">
        <select id="newProfileEmojiSelect" class="cprof-emoji-select" aria-label="Profile Avatar">
          <option value="🪐">🪐</option>
          <option value="🦊">🦊</option>
          <option value="⚡">⚡</option>
          <option value="👑">👑</option>
          <option value="🧿">🧿</option>
        </select>
        <input
          type="text"
          id="newProfileNameInput"
          class="cprof-name-input"
          placeholder="New profile name (e.g. Cloud Sect)..."
          maxlength="28"
          required
        />
        <button type="submit" class="cprof-create-btn">+ Create Profile</button>
      </form>
    `;
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
      if (this.portalWorldOrbitMode && !this.portalMissionViewMode && !this.portalOrbitHoverPaused) {
        this.portalOrbitAngle += this.portalOrbitVel * dt;
        this.updateRollingTabOrbitPositions(false);
      }
      this.portalOrbitRafId = window.requestAnimationFrame(step);
    };
    this.portalOrbitRafId = window.requestAnimationFrame(step);
  }

  private updateRollingTabOrbitPositions(emitAudioOnFrontChange = false): void {
    const cards = Array.from(
      this.chromiumOrbitStageEl.querySelectorAll<HTMLElement>('.orbit-tab-card'),
    );
    if (cards.length === 0) return;
    const layout = computeRollingTabOrbitLayout(cards.length, this.portalOrbitAngle);
    const stageW = this.chromiumOrbitStageEl.clientWidth || 860;
    const stageH = this.chromiumOrbitStageEl.clientHeight || 420;
    const radiusX = Math.min(410, Math.max(210, stageW * 0.38));
    const radiusY = Math.min(138, Math.max(66, stageH * 0.31));

    let currentFrontIdx = this.lastOrbitFrontIdx;
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      const node = layout[i];
      if (!node) continue;
      const tx = (node.xNorm * radiusX).toFixed(1);
      const ty = (node.yNorm * radiusY).toFixed(1);
      const tz = (node.zDepth * 165).toFixed(1);
      const rx = (node.rotateXDeg + this.portalOrbitPitchDeg * 0.45).toFixed(1);
      card.style.transform = `translate3d(-50%, -50%, 0) translate3d(${tx}px, ${ty}px, ${tz}px) rotateY(${node.rotateYDeg}deg) rotateX(${rx}deg) scale(${node.scale})`;
      card.style.opacity = String(node.opacity);
      card.style.zIndex = String(node.zIndex);
      card.style.setProperty('--mirror-reflect-alpha', String(node.reflectionAlpha));
      card.classList.toggle('is-front', node.isFront);
      card.dataset.tier = String(node.tier);
      if (node.isFront) {
        currentFrontIdx = i;
      }
    }

    if (emitAudioOnFrontChange && currentFrontIdx !== this.lastOrbitFrontIdx && currentFrontIdx >= 0) {
      this.triggerMirrorShimmerForTab(currentFrontIdx, 'orbit');
    }
    this.lastOrbitFrontIdx = currentFrontIdx;
  }

  public openPortalBrowserModal(variant?: PortalVariant, portalKey?: string): void {
    if (variant) {
      this.game.portalBrowser.setActivePortalVariant(variant);
    }
    const nextPortalKey = portalKey || this.activePortalKey || 'spawn-guard-portal-a';
    const isFreshPortalEntry = Boolean(portalKey);
    this.activePortalKey = nextPortalKey;

    const mission = this.game.portalMissions.getMissionForPortal(this.activePortalKey);
    const matchingVisit = this.game.portalBrowser
      .getFrequentPortals(36)
      .find((rec) => rec.portalId === nextPortalKey);
    const contextLabel =
      matchingVisit?.label ||
      (nextPortalKey.startsWith('portal-hotkey-')
        ? `Portal ${this.game.portalBrowser.getActivePortalVariant()} Overlay`
        : `${mission.floorLabel} · ${mission.title}`);
    this.game.portalBrowser.setActivePortalContext(contextLabel, variant);
    this.resetMissionSession(mission);

    // Stepping physically into an uncompleted 3D portal opens its Mission Trial first.
    // Launching the browser via button, [G], or a cleared portal opens cleanly into the normal web view.
    const shouldOpenMission =
      isFreshPortalEntry &&
      !nextPortalKey.startsWith('portal-hotkey-') &&
      !this.game.portalMissions.isPortalCompleted(nextPortalKey);

    this.portalMissionViewMode = shouldOpenMission;
    this.portalBrowserSettingsMode = false;
    this.portalWorldOrbitMode = false;
    this.portalProfilePopoverOpen = false;
    this.chromiumProfilePopoverEl.classList.add('hidden');
    this.portalBrowserStandalone = this.game.portalBrowser.getSettings().standaloneFullscreen;
    this.portalBrowserModal.classList.toggle('is-standalone', this.portalBrowserStandalone);
    this.portalBrowserModal.classList.remove('hidden');
    this.syncSoulClockBadge();
    this.renderPortalChromiumBrowser(false);
    this.startPortalOrbitAnimation();
    this.syncModalFreeze();
  }

  public closePortalBrowserModal(): void {
    if (this.portalBrowserModal.classList.contains('hidden')) return;
    this.portalBrowserModal.classList.add('hidden');
    this.portalBrowserModal.classList.remove('is-standalone');
    this.portalBrowserStandalone = false;
    this.portalBrowserSettingsMode = false;
    this.portalProfilePopoverOpen = false;
    this.chromiumProfilePopoverEl.classList.add('hidden');
    this.closeBookmarkPopover();
    this.closeOmniboxSuggestions();
    if (this.portalOrbitRafId) {
      window.cancelAnimationFrame(this.portalOrbitRafId);
      this.portalOrbitRafId = 0;
    }
    this.portalBrowserPip = false;
    this.portalBrowserModal.classList.remove('is-pip');
    this.chromiumPipBtn.textContent = 'PiP';
    this.syncModalFreeze();
    if (this.pendingReemergenceShift) {
      const reemerge = this.pendingReemergenceShift;
      this.pendingReemergenceShift = null;
      this.game.triggerPortalReemergenceRipple(reemerge.newX, reemerge.newZ, reemerge.soulAwarded);
    }
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
    const settings = mgr.getSettings();
    const allTabs = mgr.getTabs();
    const activeTab = mgr.getActiveTab();
    const activeVariant = mgr.getActivePortalVariant();
    const activeProfile = mgr.getActiveProfile();
    const allProfiles = mgr.getProfiles();
    const mission = this.game.portalMissions.getMissionForPortal(this.activePortalKey);

    this.syncSoulClockBadge();
    this.renderChromiumBookmarksBar();
    this.applyBrowserViewportZoom();

    // Update top-right Browser Profile button
    const avatarEl = this.chromiumProfileBtn.querySelector('#chromiumProfileAvatar');
    const nameEl = this.chromiumProfileBtn.querySelector('#chromiumProfileName');
    if (avatarEl) avatarEl.textContent = activeProfile.name.slice(0, 1).toUpperCase();
    if (nameEl) nameEl.textContent = activeProfile.name;
    this.chromiumProfileBtn.style.borderColor = '';

    if (this.portalProfilePopoverOpen) {
      this.renderProfilePopover();
    }

    // Update quick profile switcher strip inside the Tab Overview
    this.chromiumOtherworldProfileStripEl.innerHTML = allProfiles
      .map((p) => {
        const isAct = p.id === activeProfile.id;
        return `
          <button
            type="button"
            class="otherworld-profile-chip ${isAct ? 'is-active' : ''}"
            data-switch-profile="${p.id}"
            style="--prof-accent:${p.accentHex}"
            title="Switch to ${p.name}"
          >
            <span>${p.name}</span>
            ${isAct ? `<span class="ow-prof-count">${allTabs.length} tabs</span>` : ''}
          </button>
        `;
      })
      .join('');

    this.chromiumPortalABtn.classList.toggle('active-a', activeVariant === 'A');
    this.chromiumPortalBBtn.classList.toggle('active-b', activeVariant === 'B');
    this.chromiumMissionToggleBtn.classList.toggle('is-active', this.portalMissionViewMode);
    this.chromiumMissionToggleBtn.textContent = this.game.portalMissions.isPortalCompleted(this.activePortalKey)
      ? `Trial ${mission.floorNumber} Done`
      : `Trial ${mission.floorNumber}`;

    this.chromiumOrbitToggleBtn.classList.toggle(
      'is-active',
      this.portalWorldOrbitMode && !this.portalMissionViewMode && !this.portalBrowserSettingsMode,
    );
    this.chromiumOrbitToggleBtn.textContent = `Tabs (${allTabs.length})`;

    this.chromiumSettingsBtn.classList.toggle('is-active', this.portalBrowserSettingsMode);
    this.chromiumStandaloneBtn.textContent = this.portalBrowserStandalone ? 'Windowed' : 'Fullscreen';

    this.chromiumMissionPanelEl.classList.toggle('hidden', !this.portalMissionViewMode);
    this.chromiumSettingsPanelEl.classList.toggle('hidden', !this.portalBrowserSettingsMode);
    this.chromiumOtherworldEl.classList.toggle(
      'hidden',
      this.portalMissionViewMode || this.portalBrowserSettingsMode || !this.portalWorldOrbitMode,
    );

    if (this.portalMissionViewMode) {
      this.renderPortalMissionPanel();
    }
    if (this.portalBrowserSettingsMode) {
      this.renderBrowserSettingsPanel();
    }

    this.chromiumTabListEl.innerHTML = allTabs
      .map((t) => {
        const isAct =
          t.id === activeTab.id &&
          !this.portalWorldOrbitMode &&
          !this.portalMissionViewMode &&
          !this.portalBrowserSettingsMode;
        const vClass = t.portalVariant === 'A' ? 'variant-a' : 'variant-b';
        const safeTitle = t.title.replace(/[<>&"]/g, '');
        return `
          <div class="chromium-tab ${isAct ? 'active' : ''} ${vClass}" data-tabid="${t.id}" role="tab" aria-selected="${isAct}">
            <span class="ctab-portal-dot" aria-hidden="true"></span>
            <span class="ctab-title">${safeTitle}</span>
            <button type="button" class="chromium-tab-close" data-closeid="${t.id}" aria-label="Close tab">×</button>
          </div>
        `;
      })
      .join('');

    // Render 360-degree 3-Tier Hall-of-Mirrors Tab Cards inside the Otherworld Orbit Stage
    const tierNames: Record<number, string> = {
      1: 'UPPER GALLERY',
      0: 'GRAND ROTUNDA',
      '-1': 'REFLECTION GALLERY',
    };
    const previewLayout = computeRollingTabOrbitLayout(allTabs.length, this.portalOrbitAngle);

    this.chromiumOrbitStageEl.innerHTML = `
      <div class="otherworld-wormhole-core" aria-hidden="true">
        <div class="wormhole-core-ring"></div>
        <span class="wormhole-core-label">${activeProfile.avatarEmoji} ${activeProfile.name.toUpperCase()} · PORTAL ${activeVariant}</span>
      </div>
      ${allTabs
        .map((t, idx) => {
          const isAct = t.id === activeTab.id;
          const vClass = t.portalVariant === 'A' ? 'variant-a' : 'variant-b';
          const safeTitle = t.title.replace(/[<>&"]/g, '');
          const cleanHost = t.displayUrl.replace(/^https?:\/\//, '').slice(0, 32);
          const nodeTier = previewLayout[idx]?.tier ?? 0;
          const tierLabel = tierNames[nodeTier] || 'MIRROR HALL';
          return `
            <div class="orbit-tab-card mirror-house-panel ${vClass} ${isAct ? 'is-active-tab' : ''}" data-tabid="${t.id}" data-orbitidx="${idx}" data-tier="${nodeTier}">
              <div class="mirror-glass-sheen" aria-hidden="true"></div>
              <div class="orbit-card-top">
                <span class="orbit-portal-pill">🪞 #${idx + 1} · ${tierLabel} · P-${t.portalVariant}</span>
                <button type="button" class="orbit-tab-close" data-closeid="${t.id}" title="Shatter Mirror Tab" aria-label="Close Tab">×</button>
              </div>
              <div class="orbit-card-body">
                <div class="orbit-card-emblem">${t.url.startsWith('chrome://') ? '⛰' : '🌐'}</div>
                <div class="orbit-card-title">${safeTitle}</div>
                <div class="orbit-card-url">${cleanHost}</div>
              </div>
              <div class="orbit-card-footer">
                <span class="orbit-enter-cta">⚡ STEP THROUGH MIRROR ➔</span>
              </div>
              <div class="mirror-floor-reflection" aria-hidden="true">
                <span>${safeTitle}</span>
              </div>
            </div>
          `;
        })
        .join('')}
    `;
    this.updateRollingTabOrbitPositions(false);

    if (document.activeElement !== this.chromiumOmniboxInput) {
      this.chromiumOmniboxInput.value = this.portalBrowserSettingsMode
        ? this.portalBrowserSettingsTab === 'history'
          ? 'chrome://history'
          : this.portalBrowserSettingsTab === 'bookmarks'
            ? 'chrome://bookmarks'
            : 'chrome://settings'
        : activeTab.displayUrl;
    }

    const bookmarked = mgr.isBookmarked(activeTab.displayUrl);
    this.chromiumBookmarkBtn.textContent = bookmarked ? '★' : '☆';
    this.chromiumBookmarkBtn.classList.toggle('is-saved', bookmarked);

    this.chromiumBackBtn.disabled = !mgr.canGoBack();
    this.chromiumFwdBtn.disabled = !mgr.canGoForward();

    this.chromiumProxyBtn.textContent = activeTab.proxyMode ? 'Proxy' : 'Direct';
    this.chromiumProxyBtn.classList.toggle('is-on', activeTab.proxyMode);

    const engineName = SEARCH_ENGINE_CATALOG[settings.searchEngine]?.name ?? 'DuckDuckGo Lite';
    const shieldTag = settings.trackerShield ? 'Privacy Shield On' : 'Privacy Shield Off';
    const historyStats = mgr.getHistoryStats();
    this.chromiumStatusTextEl.textContent = this.portalBrowserSettingsMode
      ? this.portalBrowserSettingsTab === 'history'
        ? `History · ${historyStats.totalEntries} visits · ${historyStats.uniqueHosts} sites`
        : `Settings · ${engineName} · ${shieldTag} · ${settings.zoomPercent}%`
      : this.portalMissionViewMode
        ? `${mission.floorLabel}: ${mission.title}`
        : this.portalWorldOrbitMode
          ? `Tab Overview · ${allTabs.length} open tabs`
          : `${activeTab.title} · ${engineName} · ${settings.zoomPercent}%`;

    const newTabCtx =
      activeTab.url === 'chrome://newtab' ? this.game.getNewTabCultivationSnapshot() : undefined;
    const frameTarget = mgr.getIframeSrcForTab(activeTab, newTabCtx);
    const customBmSig = mgr
      .getCustomBookmarks()
      .map((b) => `${b.url}:${b.title}`)
      .join(',');
    const searchHistSig = mgr
      .getSearchHistory()
      .slice(0, 6)
      .map((s) => s.id)
      .join(',');
    const newTabSig = newTabCtx
      ? `|ntp:${newTabCtx.level}:${newTabCtx.xp}:${newTabCtx.shrinesConquered}:${newTabCtx.soulsCollected}:${newTabCtx.archivesUnlocked}:${newTabCtx.bestiaryDiscovered}:${newTabCtx.cultivationMult.toFixed(2)}:${newTabCtx.rareMaterialsCount}:${mgr.getTotalPortalVisitCount()}:${mgr.getAllBookmarks().length}:${settings.searchEngine}:${newTabCtx.isOffline ? 'off' : 'on'}:${(newTabCtx.cachedUrls ?? []).length}|bm:${customBmSig}|sh:${searchHistSig}`
      : '';
    const frameKey = `${activeProfile.id}|${activeTab.id}|${activeTab.url}|${activeTab.proxyMode ? 'proxy' : 'direct'}|${settings.trackerShield ? '1' : '0'}|${settings.userAgentPreset}${newTabSig}`;
    if (forceReloadIframe || this.lastLoadedIframeKey !== frameKey) {
      this.lastLoadedIframeKey = frameKey;
      if (frameTarget.srcdoc !== undefined) {
        this.chromiumLoadingBarEl.classList.add('hidden');
        this.chromiumViewportFrame.removeAttribute('src');
        this.chromiumViewportFrame.srcdoc = frameTarget.srcdoc;
      } else if (frameTarget.src) {
        this.chromiumLoadingBarEl.classList.remove('hidden');
        this.chromiumViewportFrame.removeAttribute('srcdoc');
        this.chromiumViewportFrame.src = frameTarget.src;
      }
    }
  }

  // ==================== CELESTIAL GLOBAL RANKING SANCTUARY ====================

  private escapeHtmlText(raw: string): string {
    return raw
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private bindGlobalRankingEvents(): void {
    subscribeAuthState((user) => {
      this.rankingAuthUser = user;
      if (user && !this.rankingCallsignDirty) {
        this.rankingCallsignInput.value = sanitizeCallsign(user.displayName || 'Jade Cultivator');
      }
      if (!this.globalRankingModal.classList.contains('hidden')) {
        this.renderGlobalRankingModal();
      }
    });

    this.root.querySelector('#closeGlobalRankingBtn')!.addEventListener('click', () => {
      this.closeGlobalRankingModal();
    });

    this.globalRankingModal.addEventListener('click', (e) => {
      if (e.target === this.globalRankingModal) {
        this.closeGlobalRankingModal();
      }
    });

    this.root.querySelector('#rankingRefreshBtn')!.addEventListener('click', () => {
      void this.refreshGlobalRankingsOnce();
    });

    this.rankingCallsignInput.addEventListener('input', () => {
      this.rankingCallsignDirty = true;
    });

    this.rankingAuthBarEl.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const signInBtn = target.closest<HTMLButtonElement>('[data-rank-auth="signin"]');
      if (signInBtn) {
        void this.handleGlobalRankingSignIn();
        return;
      }
      const signOutBtn = target.closest<HTMLButtonElement>('[data-rank-auth="signout"]');
      if (signOutBtn) {
        void this.handleGlobalRankingSignOut();
      }
    });

    this.rankingSubmitBtn.addEventListener('click', () => {
      void this.handleGlobalRankingSubmit();
    });

    this.rankingDeleteOwnBtn.addEventListener('click', () => {
      void this.handleGlobalRankingDeleteOwn();
    });

    this.root.querySelectorAll<HTMLButtonElement>('.ranking-sort-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const nextMode = (btn.dataset.rsort as RankingSortMode) || 'score';
        this.rankingSortMode = nextMode;
        this.root.querySelectorAll<HTMLButtonElement>('.ranking-sort-btn').forEach((b) => {
          const active = b.dataset.rsort === nextMode;
          b.classList.toggle('active', active);
          b.setAttribute('aria-selected', active ? 'true' : 'false');
        });
        this.renderGlobalRankingModal();
      });
    });

    this.rankingRowsEl.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-compare-uid]');
      if (!btn?.dataset.compareUid) return;
      const uid = btn.dataset.compareUid;
      this.rankingSelectedRivalUid = this.rankingSelectedRivalUid === uid ? null : uid;
      this.renderGlobalRankingModal();
    });

    this.rankingCompareEl.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('[data-close-compare="1"]')) {
        this.rankingSelectedRivalUid = null;
        this.renderGlobalRankingModal();
      }
    });
  }

  public openGlobalRankingModal(enteredViaPortal = false): void {
    this.rankingEnteredViaPortal = enteredViaPortal;
    this.rankingStatusMsg = '';
    this.rankingStatusTone = 'neutral';
    this.rankingErrorMsg = '';
    if (!this.rankingCallsignDirty) {
      const defaultName = this.rankingAuthUser?.displayName || 'Jade Cultivator';
      this.rankingCallsignInput.value = sanitizeCallsign(defaultName);
    }

    this.globalRankingModal.classList.remove('hidden');
    this.syncModalFreeze();
    this.attachGlobalRankingsListener();
    this.renderGlobalRankingModal();
  }

  public closeGlobalRankingModal(): void {
    if (this.globalRankingModal.classList.contains('hidden')) return;
    this.globalRankingModal.classList.add('hidden');
    if (this.rankingUnsubscribe) {
      this.rankingUnsubscribe();
      this.rankingUnsubscribe = null;
    }
    this.syncModalFreeze();
  }

  public toggleGlobalRankingModal(): void {
    if (this.globalRankingModal.classList.contains('hidden')) {
      this.openGlobalRankingModal(false);
    } else {
      this.closeGlobalRankingModal();
    }
  }

  private attachGlobalRankingsListener(): void {
    if (this.rankingUnsubscribe) {
      this.rankingUnsubscribe();
      this.rankingUnsubscribe = null;
    }
    if (!isFirebaseReady()) {
      this.rankingErrorMsg = 'Global Ranking service is unavailable right now.';
      this.rankingLoading = false;
      this.renderGlobalRankingModal();
      return;
    }
    this.rankingLoading = true;
    this.rankingUnsubscribe = subscribeGlobalRankings(
      (entries) => {
        this.rankingEntries = entries;
        this.rankingLoading = false;
        this.rankingErrorMsg = '';
        if (!this.globalRankingModal.classList.contains('hidden')) {
          this.renderGlobalRankingModal();
        }
      },
      (errMsg) => {
        this.rankingLoading = false;
        this.rankingErrorMsg = classifyLeaderboardError(errMsg).message;
        if (!this.globalRankingModal.classList.contains('hidden')) {
          this.renderGlobalRankingModal();
        }
      },
      50,
    );
  }

  private async refreshGlobalRankingsOnce(): Promise<void> {
    if (!isFirebaseReady()) return;
    this.rankingLoading = true;
    this.rankingErrorMsg = '';
    this.renderGlobalRankingModal();
    try {
      this.rankingEntries = await fetchGlobalRankings(50);
    } catch (err) {
      this.rankingErrorMsg = classifyLeaderboardError(err).message;
    } finally {
      this.rankingLoading = false;
      this.renderGlobalRankingModal();
    }
  }

  private async handleGlobalRankingSignIn(): Promise<void> {
    try {
      this.rankingStatusMsg = 'Opening Google Sign-In...';
      this.rankingStatusTone = 'neutral';
      this.renderGlobalRankingModal();
      const user = await signInWithGooglePopup();
      this.rankingAuthUser = user;
      if (!this.rankingCallsignDirty || !this.rankingCallsignInput.value.trim()) {
        this.rankingCallsignInput.value = sanitizeCallsign(user.displayName || 'Jade Cultivator');
      }
      this.rankingStatusMsg = `Signed in as ${sanitizeCallsign(user.displayName || 'Jade Cultivator')}. Ready to inscribe your cultivation progress!`;
      this.rankingStatusTone = 'success';
      this.renderGlobalRankingModal();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('popup-closed-by-user') || msg.includes('cancelled-popup-request')) {
        this.rankingStatusMsg = 'Sign-in cancelled. Sign in with Google whenever you are ready to submit.';
        this.rankingStatusTone = 'neutral';
      } else {
        this.rankingStatusMsg = 'Sign-in could not complete. Please allow popups and try again.';
        this.rankingStatusTone = 'error';
      }
      this.renderGlobalRankingModal();
    }
  }

  private async handleGlobalRankingSignOut(): Promise<void> {
    await signOutCultivator();
    this.rankingAuthUser = null;
    this.rankingStatusMsg = 'Signed out. You can still browse Global Rankings anytime.';
    this.rankingStatusTone = 'neutral';
    this.renderGlobalRankingModal();
  }

  private async handleGlobalRankingSubmit(): Promise<void> {
    if (this.rankingSubmitting) return;
    if (!this.rankingAuthUser) {
      await this.handleGlobalRankingSignIn();
      if (!this.rankingAuthUser) return;
    }

    this.rankingSubmitting = true;
    this.rankingStatusMsg = 'Inscribing your cultivation record onto the Celestial Stele...';
    this.rankingStatusTone = 'neutral';
    this.renderGlobalRankingModal();

    try {
      const sanitizedName = sanitizeCallsign(
        this.rankingCallsignInput.value || this.rankingAuthUser.displayName || 'Jade Cultivator',
      );
      this.rankingCallsignInput.value = sanitizedName;
      const snapshot = this.game.getCultivationSubmissionSnapshot(sanitizedName);
      const saved = await submitCultivationRanking(snapshot);
      const reward = this.game.handleGlobalRankingSubmitted(this.rankingEnteredViaPortal);
      const bonusNote =
        reward.bonusXpAwarded > 0
          ? ` (+${reward.bonusXpAwarded} Essence XP & +200 Score Portal Bonus!)`
          : '';
      this.rankingStatusMsg = `Record inscribed for ${saved.displayName} — Score ${saved.score.toLocaleString()} · Lv.${saved.level} ${saved.stageTitle}${bonusNote}`;
      this.rankingStatusTone = 'success';
      // Ensure immediate local visibility while real-time snapshot settles
      const existingIdx = this.rankingEntries.findIndex((e) => e.userId === saved.userId);
      if (existingIdx >= 0) {
        this.rankingEntries[existingIdx] = saved;
      } else {
        this.rankingEntries = [...this.rankingEntries, saved];
      }
    } catch (err) {
      this.rankingStatusMsg = classifyLeaderboardError(err).message;
      this.rankingStatusTone = 'error';
    } finally {
      this.rankingSubmitting = false;
      this.renderGlobalRankingModal();
    }
  }

  private async handleGlobalRankingDeleteOwn(): Promise<void> {
    if (!this.rankingAuthUser || this.rankingSubmitting) return;
    this.rankingSubmitting = true;
    try {
      await deleteOwnRankingRecord();
      this.rankingEntries = this.rankingEntries.filter((e) => e.userId !== this.rankingAuthUser?.uid);
      this.rankingStatusMsg = 'Your public record has been removed from the Global Ranking Stele.';
      this.rankingStatusTone = 'neutral';
    } catch {
      this.rankingStatusMsg = 'Could not remove your record right now.';
      this.rankingStatusTone = 'error';
    } finally {
      this.rankingSubmitting = false;
      this.renderGlobalRankingModal();
    }
  }

  private renderGlobalRankingModal(): void {
    const portalState = this.game.getGlobalRankingPortalState();
    const myStats = this.game.getCultivationSubmissionSnapshot(
      this.rankingCallsignInput.value || this.rankingAuthUser?.displayName || 'Jade Cultivator',
    );
    const uid = this.rankingAuthUser?.uid ?? null;
    const sorted = sortRankingEntries(this.rankingEntries, this.rankingSortMode);
    const standing = computePlayerStanding(sorted, myStats.score, uid);
    const ownEntry = uid ? this.rankingEntries.find((e) => e.userId === uid) ?? null : null;

    // 1. Portal Banner
    if (this.rankingEnteredViaPortal && portalState.active) {
      this.rankingPortalBannerEl.className = 'ranking-portal-banner is-active';
      this.rankingPortalBannerEl.innerHTML = `
        <span>👑 <strong>Entered Sovereign Global Ranking Portal</strong> · Wave #${portalState.wave}</span>
        <span>${Math.ceil(portalState.timeRemainingSec)}s remaining · ${portalState.submittedThisWave ? 'Wave Bonus Claimed' : '+150 XP & +200 Score Inscription Bonus Ready'}</span>
      `;
    } else if (portalState.active) {
      this.rankingPortalBannerEl.className = 'ranking-portal-banner is-active';
      this.rankingPortalBannerEl.innerHTML = `
        <span>★ <strong>Global Ranking Portal Active on Map</strong> · Wave #${portalState.wave} (${Math.round(portalState.distToPlayer)}m away)</span>
        <span>Follow the golden star on radar · ${Math.ceil(portalState.timeRemainingSec)}s left</span>
      `;
    } else {
      this.rankingPortalBannerEl.className = 'ranking-portal-banner';
      this.rankingPortalBannerEl.innerHTML = `
        <span>✦ Periodic Global Ranking Portal Manifestation</span>
        <span>Next Golden Portal appears on the continent in ~${Math.max(1, Math.ceil(portalState.nextSpawnInSec))}s</span>
      `;
    }

    // 2. Auth Bar
    if (this.rankingAuthUser) {
      const safeUser = this.escapeHtmlText(
        sanitizeCallsign(this.rankingAuthUser.displayName || 'Jade Cultivator'),
      );
      this.rankingAuthBarEl.innerHTML = `
        <span class="ranking-auth-chip">✓ ${safeUser}</span>
        <button type="button" class="ghost-btn compact" data-rank-auth="signout">Sign Out</button>
      `;
      this.rankingSubmitBtn.textContent = this.rankingSubmitting
        ? 'Inscribing...'
        : ownEntry
          ? 'Update Global Record'
          : 'Inscribe Cultivation Progress';
    } else {
      this.rankingAuthBarEl.innerHTML = `
        <button type="button" class="secondary-cta compact" data-rank-auth="signin">Sign in with Google</button>
      `;
      this.rankingSubmitBtn.textContent = this.rankingSubmitting
        ? 'Signing in...'
        : 'Sign in & Inscribe Progress';
    }
    this.rankingSubmitBtn.disabled = this.rankingSubmitting;
    this.rankingDeleteOwnBtn.classList.toggle('hidden', !ownEntry);
    this.rankingDeleteOwnBtn.disabled = this.rankingSubmitting;

    // 3. Cultivation Dossier Stats
    this.rankingDossierStatsEl.innerHTML = `
      <span class="ranking-stat-chip gold">Score <strong>${myStats.score.toLocaleString()}</strong></span>
      <span class="ranking-stat-chip jade">Lv.${myStats.level} <strong>${this.escapeHtmlText(myStats.stageTitle)}</strong></span>
      <span class="ranking-stat-chip cyan">Realm <strong>${this.escapeHtmlText(myStats.realmName)}</strong></span>
      <span class="ranking-stat-chip">XP <strong>${myStats.xp.toLocaleString()}</strong></span>
      <span class="ranking-stat-chip">Shrines <strong>${myStats.shrinesConquered}/12</strong></span>
      <span class="ranking-stat-chip violet">Souls <strong>${myStats.soulsCollected}/14</strong></span>
    `;

    // 4. Status / Error Message
    const statusText = this.rankingErrorMsg || this.rankingStatusMsg;
    if (statusText) {
      this.rankingStatusEl.classList.remove('hidden', 'is-success', 'is-error');
      if (this.rankingErrorMsg || this.rankingStatusTone === 'error') {
        this.rankingStatusEl.classList.add('is-error');
      } else if (this.rankingStatusTone === 'success') {
        this.rankingStatusEl.classList.add('is-success');
      }
      this.rankingStatusEl.textContent = statusText;
    } else {
      this.rankingStatusEl.classList.add('hidden');
    }

    // 5. Global Standing Strip
    const rankLabel = standing.totalEntries === 0
      ? 'Be #1 to Inscribe'
      : standing.isSubmitted
        ? `#${standing.rank} of ${standing.totalEntries}`
        : `Projected #${standing.rank} of ${standing.totalEntries + 1}`;
    const gapText = standing.nextRival
      ? `${standing.scoreGapToNext.toLocaleString()} score to pass ${this.escapeHtmlText(standing.nextRival.displayName)}`
      : standing.totalEntries > 0
        ? 'Holding Sovereign #1 Position'
        : 'First inscription claims the Sovereign Throne';
    this.rankingStandingEl.innerHTML = `
      <div class="ranking-standing-item">
        <span class="ranking-standing-k">GLOBAL STANDING</span>
        <strong class="ranking-standing-v gold">${rankLabel}</strong>
      </div>
      <div class="ranking-standing-item">
        <span class="ranking-standing-k">TOP PERCENTILE</span>
        <strong class="ranking-standing-v jade">Top ${standing.percentileTop}%</strong>
      </div>
      <div class="ranking-standing-item">
        <span class="ranking-standing-k">NEXT MILESTONE</span>
        <strong class="ranking-standing-v">${gapText}</strong>
      </div>
    `;

    // 6. Top-3 Podium
    const topThree = sorted.slice(0, 3);
    if (topThree.length === 0) {
      this.rankingPodiumEl.innerHTML = `
        <div class="ranking-empty-podium">
          ${this.rankingLoading ? 'Summoning Celestial Stele records...' : 'No cultivators have inscribed yet. Be the first Sovereign on the Global Ranking Stele!'}
        </div>
      `;
    } else {
      const medals = ['🥇 #1 SOVEREIGN', '🥈 #2 ASCENDANT', '🥉 #3 VANGUARD'];
      const tierClasses = ['podium-gold', 'podium-silver', 'podium-bronze'];
      this.rankingPodiumEl.innerHTML = topThree
        .map((entry, idx) => {
          const isMe = uid === entry.userId;
          return `
            <div class="ranking-podium-card ${tierClasses[idx]}${isMe ? ' is-me' : ''}">
              <div class="ranking-podium-medal">${medals[idx]}</div>
              <div class="ranking-podium-name">${this.escapeHtmlText(entry.displayName)}${isMe ? ' (You)' : ''}</div>
              <div class="ranking-podium-stage">Lv.${entry.level} ${this.escapeHtmlText(entry.stageTitle)} · ${this.escapeHtmlText(entry.realmName)}</div>
              <div class="ranking-podium-metrics">
                <span><strong>${entry.score.toLocaleString()}</strong> Score</span>
                <span><strong>${entry.xp.toLocaleString()}</strong> XP</span>
                <span><strong>${entry.soulsCollected}/14</strong> Souls</span>
              </div>
            </div>
          `;
        })
        .join('');
    }

    // 7. Side-by-Side Rival Comparison Card
    const rival = this.rankingSelectedRivalUid
      ? sorted.find((e) => e.userId === this.rankingSelectedRivalUid) ?? null
      : null;
    if (rival) {
      const fmtDelta = (mine: number, theirs: number, suffix = ''): string => {
        const diff = mine - theirs;
        const cls = diff > 0 ? 'delta-pos' : diff < 0 ? 'delta-neg' : 'delta-even';
        const sign = diff > 0 ? '+' : '';
        return `<span class="${cls}">${sign}${diff.toLocaleString()}${suffix}</span>`;
      };
      this.rankingCompareEl.classList.remove('hidden');
      this.rankingCompareEl.innerHTML = `
        <div class="ranking-compare-head">
          <span>⚔️ <strong>Cultivation Comparison:</strong> You vs. ${this.escapeHtmlText(rival.displayName)} (Lv.${rival.level} ${this.escapeHtmlText(rival.realmName)})</span>
          <button type="button" class="ghost-btn compact" data-close-compare="1">✕</button>
        </div>
        <div class="ranking-compare-grid">
          <div class="ranking-compare-cell"><span>Score</span><strong>${myStats.score.toLocaleString()} vs ${rival.score.toLocaleString()}</strong>${fmtDelta(myStats.score, rival.score)}</div>
          <div class="ranking-compare-cell"><span>Level</span><strong>Lv.${myStats.level} vs Lv.${rival.level}</strong>${fmtDelta(myStats.level, rival.level, ' Lv')}</div>
          <div class="ranking-compare-cell"><span>Essence XP</span><strong>${myStats.xp.toLocaleString()} vs ${rival.xp.toLocaleString()}</strong>${fmtDelta(myStats.xp, rival.xp)}</div>
          <div class="ranking-compare-cell"><span>Trial Shrines</span><strong>${myStats.shrinesConquered}/12 vs ${rival.shrinesConquered}/12</strong>${fmtDelta(myStats.shrinesConquered, rival.shrinesConquered)}</div>
          <div class="ranking-compare-cell"><span>Soul Fragments</span><strong>${myStats.soulsCollected}/14 vs ${rival.soulsCollected}/14</strong>${fmtDelta(myStats.soulsCollected, rival.soulsCollected)}</div>
        </div>
      `;
    } else {
      this.rankingCompareEl.classList.add('hidden');
      this.rankingCompareEl.innerHTML = '';
    }

    // 8. Full Leaderboard Table
    if (sorted.length === 0) {
      this.rankingRowsEl.innerHTML = `
        <tr>
          <td colspan="8" class="ranking-empty-row">
            ${this.rankingLoading ? 'Loading global cultivators...' : 'Inscribe your cultivation progress above to appear on the Global Leaderboard.'}
          </td>
        </tr>
      `;
    } else {
      this.rankingRowsEl.innerHTML = sorted
        .map((entry, idx) => {
          const isMe = uid === entry.userId;
          const isSelected = this.rankingSelectedRivalUid === entry.userId;
          const rankBadge = idx === 0 ? '👑 1' : idx === 1 ? '🥈 2' : idx === 2 ? '🥉 3' : `#${idx + 1}`;
          return `
            <tr class="${isMe ? 'is-me' : ''} ${isSelected ? 'is-selected' : ''}">
              <td class="rank-col">${rankBadge}</td>
              <td class="name-col">
                <strong>${this.escapeHtmlText(entry.displayName)}</strong>
                ${isMe ? '<span class="ranking-you-tag">YOU</span>' : ''}
                ${entry.isHuman ? '<span class="ranking-human-tag">HUMAN</span>' : ''}
              </td>
              <td class="stage-col">Lv.${entry.level} ${this.escapeHtmlText(entry.stageTitle)} <span class="muted">· ${this.escapeHtmlText(entry.realmName)}</span></td>
              <td class="num-col gold">${entry.score.toLocaleString()}</td>
              <td class="num-col">${entry.xp.toLocaleString()}</td>
              <td class="num-col">${entry.shrinesConquered}/12</td>
              <td class="num-col violet">${entry.soulsCollected}/14</td>
              <td class="act-col">
                <button type="button" class="ranking-cmp-btn${isSelected ? ' active' : ''}" data-compare-uid="${this.escapeHtmlText(entry.userId)}">
                  ${isSelected ? 'Comparing' : 'Compare'}
                </button>
              </td>
            </tr>
          `;
        })
        .join('');
    }
  }

  private renderSoulArchivesModal(): void {
    const snap: SoulArchiveSnapshot = this.game.getSoulArchiveSnapshot();
    this.soulArchivesCountEl.textContent = `${snap.unlockedCount} / ${snap.totalCount} Deciphered`;

    this.root.querySelectorAll<HTMLButtonElement>('.archives-filter-btn').forEach((btn) => {
      const active = btn.dataset.afilter === this.soulArchivesFilter;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
    });

    const filtered = snap.entries.filter((entry) => {
      if (this.soulArchivesFilter === 'sentry') return entry.def.category === 'sentry';
      if (this.soulArchivesFilter === 'chronicle') return entry.def.category === 'chronicle';
      if (this.soulArchivesFilter === 'unlocked') return entry.record.unlocked;
      return true;
    });

    if (filtered.length > 0 && !filtered.some((e) => e.def.id === this.selectedSoulArchiveId)) {
      this.selectedSoulArchiveId = filtered[0].def.id;
    }

    if (filtered.length === 0) {
      this.soulArchivesListEl.innerHTML = `
        <div class="archives-empty-list">
          No entries match this filter yet. Approach patrolling Soul Clan Sentries near portals to decipher their lore.
        </div>
      `;
      this.soulArchivesReaderEl.innerHTML = `
        <div class="archives-reader-locked">
          <div class="archives-locked-eyebrow">ARCHIVE SEALED</div>
          <h3>No Deciphered Entries in Filter</h3>
          <p>Explore portals guarded by spectral Soul Clan Sentries across the peaks to unlock historical dossiers.</p>
        </div>
      `;
      return;
    }

    this.soulArchivesListEl.innerHTML = filtered
      .map(({ def, record }) => {
        const selected = def.id === this.selectedSoulArchiveId;
        const unlocked = record.unlocked;
        const catLabel = def.category === 'sentry' ? 'Sentry Dossier' : 'Chronicle';
        return `
          <button
            type="button"
            class="archives-row${selected ? ' selected' : ''}${unlocked ? ' unlocked' : ' locked'}"
            data-entry-id="${this.escapeHtmlText(def.id)}"
            style="--archive-accent: ${def.accentHex}"
          >
            <div class="archives-row-emblem">
              ${renderSoulArchiveEmblemSvg(def.id, def.accentHex, unlocked)}
            </div>
            <div class="archives-row-meta">
              <div class="archives-row-kicker">${catLabel} · ${unlocked ? this.escapeHtmlText(def.eraLabel) : 'Sealed'}</div>
              <div class="archives-row-title">${unlocked ? this.escapeHtmlText(def.title) : 'Uncharted Soul Record'}</div>
              <div class="archives-row-sub">${unlocked ? this.escapeHtmlText(def.subtitle) : this.escapeHtmlText(def.unlockHint)}</div>
            </div>
          </button>
        `;
      })
      .join('');

    const current = filtered.find((e) => e.def.id === this.selectedSoulArchiveId) ?? filtered[0];
    const { def, record } = current;
    if (!record.unlocked) {
      this.soulArchivesReaderEl.innerHTML = `
        <div class="archives-reader-locked" style="--archive-accent: ${def.accentHex}">
          <div class="archives-reader-emblem-lg locked">
            ${renderSoulArchiveEmblemSvg(def.id, def.accentHex, false)}
          </div>
          <div class="archives-locked-eyebrow">SEALED SOUL RECORD · ${def.category === 'sentry' ? 'SENTRY DOSSIER' : 'HISTORICAL CHRONICLE'}</div>
          <h3 class="archives-reader-title">Encrypted Nether Tablet</h3>
          <p class="archives-locked-hint">${this.escapeHtmlText(def.unlockHint)}</p>
          <div class="archives-locked-tip">
            Approach portals across the Alpine Continent or Jungle Highlands to sight patrolling Soul Clan Sentries and automatically transcribe their records.
          </div>
        </div>
      `;
      return;
    }

    const archetypeProfile = def.archetypeId ? SENTRY_ARCHETYPES[def.archetypeId] : null;
    const paragraphsHtml = def.bodyParagraphs
      .map((p: string) => `<p class="archives-lore-para">${this.escapeHtmlText(p)}</p>`)
      .join('');

    const telemetryHtml =
      def.category === 'sentry'
        ? `
          <div class="archives-telemetry-grid">
            <div class="archives-stat-cell">
              <span class="archives-stat-label">Sightings</span>
              <strong class="archives-stat-val">${record.encounters}</strong>
            </div>
            <div class="archives-stat-cell">
              <span class="archives-stat-label">Searches Triggered</span>
              <strong class="archives-stat-val">${record.searchesTriggered}</strong>
            </div>
            <div class="archives-stat-cell">
              <span class="archives-stat-label">Evaded Unseen</span>
              <strong class="archives-stat-val">${record.evadedCount}</strong>
            </div>
            <div class="archives-stat-cell">
              <span class="archives-stat-label">Banished</span>
              <strong class="archives-stat-val">${record.banishedCount}</strong>
            </div>
          </div>
        `
        : '';

    const profileSpecsHtml = archetypeProfile
      ? `
        <div class="archives-doctrine-box">
          <div class="archives-section-kicker">PATROL DOCTRINE &amp; SPECS</div>
          <p class="archives-doctrine-text">${this.escapeHtmlText(archetypeProfile.patrolDoctrine)}</p>
          <div class="archives-spec-line">
            <span>Rank: <strong>${this.escapeHtmlText(archetypeProfile.rankLabel)}</strong></span>
            <span>Sight Cone: <strong>${archetypeProfile.visionRange.toFixed(1)}m</strong></span>
            <span>Activity Sense: <strong>${archetypeProfile.activitySenseRadius}m</strong></span>
            <span>Ward Health: <strong>${archetypeProfile.maxHp} Hits</strong></span>
          </div>
        </div>
      `
      : '';

    this.soulArchivesReaderEl.innerHTML = `
      <div class="archives-reader-inner" style="--archive-accent: ${def.accentHex}">
        <div class="archives-reader-head">
          <div class="archives-reader-emblem-lg">
            ${renderSoulArchiveEmblemSvg(def.id, def.accentHex, true)}
          </div>
          <div>
            <div class="archives-reader-era">${this.escapeHtmlText(def.eraLabel)}</div>
            <h3 class="archives-reader-title">${this.escapeHtmlText(def.title)}</h3>
            <div class="archives-reader-sub">${this.escapeHtmlText(def.subtitle)}</div>
          </div>
        </div>

        ${telemetryHtml}

        <div class="archives-lore-body">
          <div class="archives-section-kicker">HISTORICAL CHRONICLE</div>
          ${paragraphsHtml}
        </div>

        ${profileSpecsHtml}

        <div class="archives-fieldnotes-box">
          <div class="archives-section-kicker">CULTIVATOR COUNTERPLAY NOTES</div>
          <p class="archives-fieldnotes-text">${this.escapeHtmlText(def.fieldNotes)}</p>
        </div>
      </div>
    `;
  }

  // ==================== FORGOTTEN SOUL FOUNDRY & DEBUG TELEMETRY ====================

  public toggleFoundryConsoleModal(): void {
    if (!this.foundryConsoleModal.classList.contains('hidden')) {
      this.closeFoundryConsoleModal();
    } else {
      this.openFoundryConsoleModal();
    }
  }

  public openFoundryConsoleModal(): void {
    this.foundryConsoleModal.classList.remove('hidden');
    this.renderFoundryConsoleModal();
    this.syncModalFreeze();
  }

  public closeFoundryConsoleModal(): void {
    this.foundryConsoleModal.classList.add('hidden');
    this.syncModalFreeze();
  }

  public toggleFoundryDebugOverlay(): void {
    this.foundryDebugVisible = !this.foundryDebugVisible;
    this.foundryDebugOverlayEl.classList.toggle('hidden', !this.foundryDebugVisible);
    if (this.foundryDebugVisible) {
      this.renderFoundryDebugOverlay();
    }
  }

  private renderFoundryDebugOverlay(): void {
    const s = this.game.foundry.getState();
    const r = s.resources;
    const bladesStr = s.blades
      .map((b) => `${b.id.slice(6)}: ω=${b.currentAngularVel.toFixed(2)} shaft=${b.driveShaftHp}/${b.driveShaftMaxHp}`)
      .join(' | ');
    const platesStr = s.plates
      .map((p) => `${p.id.slice(6)}=${p.active ? 'ON' : 'OFF'}(${Math.round(p.currentForce)}N)`)
      .join(' · ');
    const enemiesStr = s.enemies
      .map((e) => `${e.role.replace('soul_', '')}:${e.state}(${Math.round(e.hp)}HP)`)
      .join(' · ');
    const activeHitbox =
      r.attackPhase === 'ACTIVE' && r.attackKind !== 'none'
        ? `${r.attackKind.toUpperCase()} r=${ATTACK_SPECS[r.attackKind].range}m (${r.hitRegisteredIds.length} hit)`
        : 'NONE';

    this.foundryDebugOverlayEl.innerHTML = `
      <div class="fdbg-title">FOUNDRY SIM DEBUG [F3] · t=${s.simTime.toFixed(1)}s</div>
      <div>POS: (${s.playerLocalX.toFixed(1)}, y=${s.playerLocalY.toFixed(2)}, ${s.playerLocalZ.toFixed(1)}) · VEL: ${s.playerSpeed.toFixed(1)} m/s (vy=${s.playerVelY.toFixed(1)}) · ACC: ${s.playerAccel.toFixed(1)} m/s²</div>
      <div>FSM: ${r.movementState} · CMB: ${r.attackKind}/${r.attackPhase} · BLK: ${r.blocking ? 'ON' : 'OFF'} · DODGE: ${r.dodgeTimer.toFixed(2)}s · PARRY: ${r.parryWindowTimer.toFixed(2)}s</div>
      <div>HITBOX: ${activeHitbox} · COL_BOUND: player r=${s.playerCollisionRadius.toFixed(1)}m · wall r=43..68m</div>
      <div>RES: HP ${Math.round(r.hp)} · SP ${Math.round(r.sp)}/${r.maxSp} · SE ${Math.round(r.se)}/${r.maxSe} · RANK: ${r.rank}</div>
      <div>TRAPS: ${bladesStr} · PLATES: ${platesStr} · CONDUIT: ${s.conduitActiveTimer > 0 ? `${s.conduitActiveTimer.toFixed(1)}s` : 'IDLE'}</div>
      <div>PUZZLES: GEAR=${s.gearPuzzle.solved ? 'SOLVED' : `${s.gearPuzzle.computedOutputRpm}/${s.gearPuzzle.targetOutputRpm}RPM`} · CIR=${s.energyPuzzle.overloaded ? 'OVERLOAD' : `${s.energyPuzzle.currentAmps}A(${s.energyPuzzle.receiversPowered}/2)`} · GATE=${s.energyPuzzle.gateUnlocked ? 'OPEN' : 'LOCKED'} · BRIDGE=${s.hydraulics.bridgeRaised ? 'UP' : 'DOWN'}</div>
      <div>AI: ${enemiesStr}</div>
      <div>BOSS: P${s.boss.phase} ${s.boss.state} · HP ${Math.round(s.boss.hp)}/${s.boss.maxHp} · SHIELD=${s.boss.shieldActive ? 'ON' : 'OFF'}</div>
    `;
  }

  private renderFoundryConsoleModal(): void {
    const s = this.game.foundry.getState();
    const r = s.resources;
    const g = s.gearPuzzle;
    const en = s.energyPuzzle;
    const hyd = s.hydraulics;
    const boss = s.boss;
    const syn = resolveActiveSynergy(r.primaryDiscipline, r.secondaryDiscipline);

    const discCards = (Object.keys(SOUL_DISCIPLINES) as SoulDisciplineId[])
      .map((id) => {
        const d = SOUL_DISCIPLINES[id];
        const isPri = r.primaryDiscipline === id;
        const isSec = r.secondaryDiscipline === id;
        return `
          <div class="foundry-disc-card ${isPri ? 'is-primary' : ''} ${isSec ? 'is-secondary' : ''}" style="--disc-accent:${d.accent}">
            <div class="foundry-disc-top">
              <strong>${d.name}</strong>
              <span>${d.seCost} SE</span>
            </div>
            <div class="foundry-disc-role">${d.role}</div>
            <p class="foundry-disc-desc">${d.summary}</p>
            <div class="foundry-disc-btns">
              <button type="button" class="foundry-mini-btn ${isPri ? 'active' : ''}" data-foundry-act="set_primary" data-foundry-val="${id}">Primary</button>
              <button type="button" class="foundry-mini-btn ${isSec ? 'active' : ''}" data-foundry-act="set_secondary" data-foundry-val="${isSec ? '' : id}">${isSec ? 'Clear 2nd' : 'Combine 2nd'}</button>
            </div>
          </div>
        `;
      })
      .join('');

    this.foundryConsoleBodyEl.innerHTML = `
      <div class="foundry-stats-strip">
        <div class="foundry-res-pill"><span>HP</span><strong>${Math.round(r.hp)} / ${r.maxHp}</strong></div>
        <div class="foundry-res-pill"><span>SP (Stamina)</span><strong>${Math.round(r.sp)} / ${r.maxSp}</strong></div>
        <div class="foundry-res-pill"><span>SE (Soul Energy)</span><strong>${Math.round(r.se)} / ${r.maxSe}</strong></div>
        <div class="foundry-res-pill"><span>Soul Rank</span><strong>${r.rank} (${r.masteryPoints} pts)</strong></div>
      </div>

      <div class="foundry-controls-hint">
        Controls inside Foundry: <strong>[F/LMB]</strong> Light · <strong>[Q/RMB]</strong> Heavy · <strong>[H]</strong> Hold Block · <strong>[Z]</strong> Dodge i-frames · <strong>[T]</strong> Perfect Parry (+28 SE) · <strong>[5/Enter]</strong> Jump / Wall-Run · <strong>[Y]</strong> Cast ${SOUL_DISCIPLINES[r.primaryDiscipline].name} · <strong>[F3]</strong> Debug Telemetry
      </div>

      <div class="foundry-grid">
        <section class="foundry-panel">
          <h3>1. Gear Synchronization (ω₁r₁ = ω₂r₂)</h3>
          <p class="foundry-sub">Target Output: <strong>${g.targetOutputRpm} RPM</strong> · Max Torque: ${g.torqueLimit} N·m · Status: <strong class="${g.solved ? 'ok' : g.overTorqued ? 'err' : ''}">${g.solved ? 'SYNCHRONIZED' : g.overTorqued ? 'OVER-TORQUED' : `${g.computedOutputRpm} RPM (${g.computedTorqueLoad} N·m)`}</strong></p>
          <div class="foundry-btn-row">
            <span>Drive r₁:</span>
            ${[1, 2, 3].map((v) => `<button type="button" class="foundry-mini-btn ${g.gear1Radius === v ? 'active' : ''}" data-foundry-act="gear_r1" data-foundry-val="${v}">r₁=${v}</button>`).join('')}
          </div>
          <div class="foundry-btn-row">
            <span>Mesh r₂:</span>
            ${[1, 2, 3].map((v) => `<button type="button" class="foundry-mini-btn ${g.gear2Radius === v ? 'active' : ''}" data-foundry-act="gear_r2" data-foundry-val="${v}">r₂=${v}</button>`).join('')}
          </div>
          <div class="foundry-btn-row">
            <span>Forge r₃:</span>
            ${[2, 3, 4].map((v) => `<button type="button" class="foundry-mini-btn ${g.gear3Radius === v ? 'active' : ''}" data-foundry-act="gear_r3" data-foundry-val="${v}">r₃=${v}</button>`).join('')}
          </div>
          <div class="foundry-btn-row">
            <button type="button" class="foundry-mini-btn ${g.reverseIdlerEngaged ? 'active' : ''}" data-foundry-act="gear_reverse">Reverse Idler: ${g.reverseIdlerEngaged ? 'ENGAGED (−)' : 'OFF (+)'}</button>
          </div>
        </section>

        <section class="foundry-panel">
          <h3>2. Energy Routing (V = IR) &amp; Logic Gate</h3>
          <p class="foundry-sub">Current: <strong>${en.currentAmps} A</strong> (24V) · Receivers: <strong>${en.receiversPowered}/2</strong> · Status: <strong class="${en.overloaded ? 'err' : en.solved ? 'ok' : ''}">${en.overloaded ? 'OVERLOAD (>16A)' : en.solved ? 'CLEAN POWER (OVERHEATS BOSS SHIELD)' : 'UNPOWERED'}</strong></p>
          <div class="foundry-btn-row">
            <button type="button" class="foundry-mini-btn ${en.switchA ? 'active' : ''}" data-foundry-act="toggle_switch" data-foundry-val="switchA">Switch A (Core→N1): ${en.switchA ? 'ON' : 'OFF'}</button>
            <button type="button" class="foundry-mini-btn ${en.switchB ? 'active' : ''}" data-foundry-act="toggle_switch" data-foundry-val="switchB">Switch B (N1→N2): ${en.switchB ? 'ON' : 'OFF'}</button>
            <button type="button" class="foundry-mini-btn ${en.switchC ? 'warn' : ''}" data-foundry-act="toggle_switch" data-foundry-val="switchC">Switch C (Bypass): ${en.switchC ? 'SHORT!' : 'SAFE'}</button>
          </div>
          <div class="foundry-logic-line">
            Gate Logic: Proximity(${en.proximitySensor ? 'TRUE' : 'FALSE'}) AND Pressure(${en.pressureSensor ? 'TRUE' : 'FALSE'}) AND Energy(${en.deliveredEnergy}≥${en.energyThreshold}) → <strong>${en.gateUnlocked ? 'OPEN' : 'LOCKED'}</strong>
          </div>
          <div class="foundry-hyd-box">
            <label for="foundryValveRange">Hydraulic Valve (F = P·A = <strong>${hyd.pistonForceF} kN</strong> · Q=${hyd.flowRateQ} m³/s · Tanks ${hyd.tankALevel.toFixed(1)}/${hyd.tankBLevel.toFixed(1)}% · Bridge: <strong>${hyd.bridgeRaised ? 'RAISED' : 'LOWERED'}</strong>)</label>
            <input type="range" id="foundryValveRange" min="0" max="100" value="${Math.round(hyd.valveOpenRatio * 100)}" />
          </div>
        </section>
      </div>

      <section class="foundry-panel">
        <div class="foundry-disc-head">
          <h3>3. Soul Clan Fighting Disciplines &amp; Synergy</h3>
          <div class="foundry-btn-row">
            <button type="button" class="foundry-mini-btn active" data-foundry-act="cast_discipline">Cast ${SOUL_DISCIPLINES[r.primaryDiscipline].name} [Y]</button>
            <button type="button" class="foundry-mini-btn" data-foundry-act="reset_encounter">Reset Foundry Arena</button>
          </div>
        </div>
        ${syn ? `<div class="foundry-synergy-banner"><strong>Active Synergy — ${syn.name}:</strong> ${syn.effect}</div>` : `<div class="foundry-synergy-banner muted">Combine any two disciplines below to activate a Dual-Discipline Synergy.</div>`}
        <div class="foundry-disc-grid">${discCards}</div>
      </section>

      <section class="foundry-panel foundry-boss-bar">
        <div>
          <strong>Boss: ${boss.name}</strong> · Phase ${boss.phase}/3 (${boss.state}) · HP: ${Math.round(boss.hp)}/${boss.maxHp} ${boss.shieldActive ? '· SHIELD ACTIVE (Route Switches A+B to Overheat!)' : ''}
        </div>
        <div class="foundry-log-line">${this.escapeHtmlText(s.eventLog[0] || '')}</div>
      </section>
    `;
  }
}
