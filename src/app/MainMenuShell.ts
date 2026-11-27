import heroArtUrl from '../assets/images/hero_serpent_peaks_1795775367743.jpg';
import gameWorldArtUrl from '../assets/images/card_game_world_1795775370616.jpg';
import browserWorldArtUrl from '../assets/images/card_browser_world_1795775371271.jpg';
import type { GlobalLeaderboardModal } from '../components/GlobalLeaderboardModal';

interface SavedJourneyPreview {
  hasProgress: boolean;
  level: number;
  peaksCount: number;
  bestScore: number;
  stageLabel: string;
}

const STAGE_TITLES: readonly string[] = [
  'Valley Hatchling',
  'Foothill Viper',
  'Ridge Python',
  'Horned Adder',
  'Highland Wyrm',
  'Cliffside Drake',
  'Cloud Serpent',
  'Naga Initiate',
  'Mountain Naga',
  'Half-Human Mystic',
  'Almost Human',
  'Ascended Human',
];

function readSavedJourneyPreview(): SavedJourneyPreview {
  const fallback: SavedJourneyPreview = {
    hasProgress: false,
    level: 1,
    peaksCount: 0,
    bestScore: 0,
    stageLabel: STAGE_TITLES[0],
  };
  if (typeof window === 'undefined' || !window.localStorage) return fallback;
  try {
    const rawJourney = window.localStorage.getItem('SERPENT_PEAKS_JOURNEY_V1');
    const rawBest = window.localStorage.getItem('SERPENT_PEAKS_BEST_SCORE');
    const bestScore = rawBest ? Math.max(0, parseInt(rawBest, 10) || 0) : 0;
    if (!rawJourney) {
      return { ...fallback, bestScore, hasProgress: bestScore > 0 };
    }
    const parsed = JSON.parse(rawJourney) as {
      level?: number;
      xp?: number;
      visitedLandmarkIds?: unknown[];
    };
    const level = Math.max(1, Math.min(12, Number(parsed.level) || 1));
    const peaksCount = Array.isArray(parsed.visitedLandmarkIds)
      ? Math.min(12, parsed.visitedLandmarkIds.length)
      : 0;
    const xp = Math.max(0, Number(parsed.xp) || 0);
    return {
      hasProgress: level > 1 || peaksCount > 0 || xp > 0 || bestScore > 0,
      level,
      peaksCount,
      bestScore,
      stageLabel: STAGE_TITLES[level - 1] ?? STAGE_TITLES[0],
    };
  } catch {
    return fallback;
  }
}

/**
 * Editorial, high-craft front page shell for Serpent Peaks (Snake City).
 * Renders immediately with zero Three.js / WebGL or browser iframe overhead until
 * the user launches the 3D Game World or Standalone Portal Browser.
 */
export class MainMenuShell {
  private readonly root: HTMLElement;
  private readonly container: HTMLDivElement;
  private readonly onEnterSnakeCity: () => void;
  private leaderboardModal: GlobalLeaderboardModal | null = null;
  private leaderboardLoading = false;
  private destroyed = false;

  constructor(
    root: HTMLElement,
    callbacks: {
      onEnterSnakeCity: () => void;
      onOpenQuickBrowser: () => void;
    },
  ) {
    this.root = root;
    this.onEnterSnakeCity = callbacks.onEnterSnakeCity;
    const progress = readSavedJourneyPreview();

    this.container = document.createElement('div');
    this.container.className = 'snake-city-menu-shell';

    const progressLine = progress.hasProgress
      ? `Stage ${progress.level} of 12 · ${progress.stageLabel} · ${progress.peaksCount}/12 Trial Peaks · Best ${progress.bestScore.toLocaleString()}`
      : 'Stage 1 of 12 · Valley Hatchling · 12 Alpine Trial Peaks Await';

    const primaryCtaLabel = progress.hasProgress ? 'Continue Ascent' : 'Enter Snake City';

    this.container.innerHTML = `
      <div class="scm-backdrop" aria-hidden="true">
        <img
          src="${heroArtUrl}"
          alt=""
          class="scm-backdrop-img"
          referrerpolicy="no-referrer"
          onerror="this.style.display='none'"
        />
        <div class="scm-backdrop-scrim"></div>
      </div>

      <div class="scm-page">
        <header class="scm-topbar">
          <a href="#scmHero" class="scm-brand" id="scmBrandLink">Serpent Peaks</a>
          <nav class="scm-nav" aria-label="Primary navigation">
            <a href="#scmWorlds" class="scm-nav-link">Worlds</a>
            <button type="button" class="scm-nav-link scm-nav-action" id="scmNavLeaderboardBtn">Leaderboard</button>
            <a href="#scmControls" class="scm-nav-link">Controls</a>
            <button type="button" class="scm-nav-link scm-nav-action" id="scmNavBrowserBtn">Portal Browser</button>
          </nav>
          <div class="scm-topbar-cta">
            <button type="button" class="scm-btn-top" id="scmTopPlayBtn">Play Now</button>
          </div>
        </header>

        <main class="scm-main">
          <section class="scm-hero" id="scmHero">
            <p class="scm-kicker">3D Alpine Cultivation · Spatial Portal Ecosystem · Offline Ready</p>
            <h1 class="scm-title">Ascend the Serpent Peaks</h1>
            <p class="scm-subtitle">
              Glide across mist-veiled alpine ridges, duel ancient guardians and Soul Clan spirits,
              and step through living 3D gateways where your web browser becomes part of the mountain.
            </p>

            <div class="scm-hero-actions">
              <button type="button" class="scm-btn-primary" id="scmEnterWorldBtn">
                <span>${primaryCtaLabel}</span>
                <svg class="scm-btn-icon" viewBox="0 0 20 20" width="18" height="18" fill="none" aria-hidden="true">
                  <path d="M4.5 10H15.5M15.5 10L10.75 5.25M15.5 10L10.75 14.75" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
              <button type="button" class="scm-btn-secondary" id="scmQuickBrowserBtn">
                Open Portal Browser
              </button>
            </div>

            <div class="scm-progress-row">
              <p class="scm-progress-meta">${progressLine}</p>
              <button type="button" class="scm-inline-link" id="scmHeroLeaderboardBtn">
                Global Leaderboard
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </section>

          <section class="scm-worlds" id="scmWorlds" aria-label="Choose your destination">
            <article class="scm-world-card">
              <div class="scm-card-media scm-media-game">
                <img
                  src="${gameWorldArtUrl}"
                  alt="Ancient jade trial shrine perched on misty alpine cliffs at twilight"
                  class="scm-card-img"
                  referrerpolicy="no-referrer"
                  onerror="this.style.display='none'"
                />
                <div class="scm-card-media-scrim" aria-hidden="true"></div>
              </div>
              <div class="scm-card-body">
                <p class="scm-card-meta">3D WebGL World · 12 Evolution Stages · Dynamic Climates</p>
                <h2 class="scm-card-title">01. The Cultivation World</h2>
                <p class="scm-card-copy">
                  Begin in the Central Sanctuary as a Valley Hatchling. Conquer all twelve Trial Peak
                  shrines, master Soul Clan disciplines inside the Forgotten Soul Foundry, and
                  evolve into an Ascended Human.
                </p>
                <div class="scm-card-footer">
                  <button type="button" class="scm-card-cta" id="scmCardEnterWorldBtn">
                    Enter 3D World
                    <span aria-hidden="true">→</span>
                  </button>
                </div>
              </div>
            </article>

            <article class="scm-world-card">
              <div class="scm-card-media scm-media-browser">
                <img
                  src="${browserWorldArtUrl}"
                  alt="Carved obsidian and gold celestial portal archway overlooking twilight peaks"
                  class="scm-card-img"
                  referrerpolicy="no-referrer"
                  onerror="this.style.display='none'"
                />
                <div class="scm-card-media-scrim" aria-hidden="true"></div>
              </div>
              <div class="scm-card-body">
                <p class="scm-card-meta">Portal Chromium · Safe Proxy Shield · Zero 3D Overhead</p>
                <h2 class="scm-card-title">02. The Portal Browser</h2>
                <p class="scm-card-copy">
                  Your tabs, bookmarks, and recovered sessions take physical form as mountain
                  portals. Launch directly into the lightweight multi-tab browser with isolated
                  proxy shielding and offline caching.
                </p>
                <div class="scm-card-footer">
                  <button type="button" class="scm-card-cta scm-card-cta-alt" id="scmCardBrowserBtn">
                    Launch Browser
                    <span aria-hidden="true">→</span>
                  </button>
                </div>
              </div>
            </article>
          </section>

          <section class="scm-pillars" id="scmProgression" aria-label="Journey highlights">
            <div class="scm-pillar">
              <span class="scm-pillar-num">12</span>
              <h3 class="scm-pillar-label">Evolution Realms</h3>
              <p class="scm-pillar-desc">Progress from Valley Hatchling through Half-Human Mystic to full Human Ascension with four Dou Qi combat skills.</p>
            </div>
            <div class="scm-pillar">
              <span class="scm-pillar-num">7</span>
              <h3 class="scm-pillar-label">Living Mountain Climates</h3>
              <p class="scm-pillar-desc">Clear skies, highland mist, storms, blizzards, and volcanic ashstorms shift dynamically with procedural soundscapes.</p>
            </div>
            <div class="scm-pillar">
              <span class="scm-pillar-num">3</span>
              <h3 class="scm-pillar-label">Foundry Trials &amp; Bosses</h3>
              <p class="scm-pillar-desc">Solve gear synchronization, conduit routing, and hydraulic mechanisms to challenge the Soulbound Colossus.</p>
            </div>
            <div class="scm-pillar">
              <span class="scm-pillar-num">2</span>
              <h3 class="scm-pillar-label">Unified Modes</h3>
              <p class="scm-pillar-desc">Switch seamlessly between the full 3D WebGL mountain world and the fast, isolated Portal Chromium browser.</p>
            </div>
          </section>

          <section class="scm-controls" id="scmControls" aria-label="Controls overview">
            <div class="scm-controls-head">
              <h2 class="scm-controls-title">Quick Controls</h2>
              <p class="scm-controls-sub">Desktop keyboard and mobile relative joystick supported out of the box.</p>
            </div>
            <div class="scm-controls-grid">
              <div class="scm-control-item">
                <span class="scm-control-keys">A / D · Joystick</span>
                <span class="scm-control-desc">Steer smoothly along mountain trails</span>
              </div>
              <div class="scm-control-item">
                <span class="scm-control-keys">W / Space · S</span>
                <span class="scm-control-desc">Uphill boost &amp; precision downhill brake</span>
              </div>
              <div class="scm-control-item">
                <span class="scm-control-keys">1 · 2 · 3 · 4</span>
                <span class="scm-control-desc">Fang Bolt, Shockwave, Coil Dash &amp; Flame Lotus</span>
              </div>
              <div class="scm-control-item">
                <span class="scm-control-keys">G · L · Esc</span>
                <span class="scm-control-desc">Portal Browser, Global Leaderboard &amp; pause</span>
              </div>
            </div>
          </section>
        </main>

        <footer class="scm-footer">
          <span>Serpent Peaks</span>
          <span aria-hidden="true">·</span>
          <span>12-Stage Cultivation Adventure</span>
          <span aria-hidden="true">·</span>
          <span>Secure Proxy Shield</span>
          <span aria-hidden="true">·</span>
          <span>Offline Service Worker Cache</span>
        </footer>
      </div>
    `;

    this.root.innerHTML = '';
    this.root.appendChild(this.container);

    const enterWorld = () => {
      if (this.destroyed) return;
      callbacks.onEnterSnakeCity();
    };

    const openBrowser = () => {
      if (this.destroyed) return;
      callbacks.onOpenQuickBrowser();
    };

    const openLeaderboard = () => {
      if (this.destroyed) return;
      void this.openGlobalLeaderboard();
    };

    this.container.querySelector('#scmEnterWorldBtn')?.addEventListener('click', enterWorld);
    this.container.querySelector('#scmTopPlayBtn')?.addEventListener('click', enterWorld);
    this.container.querySelector('#scmCardEnterWorldBtn')?.addEventListener('click', enterWorld);

    this.container.querySelector('#scmQuickBrowserBtn')?.addEventListener('click', openBrowser);
    this.container.querySelector('#scmNavBrowserBtn')?.addEventListener('click', openBrowser);
    this.container.querySelector('#scmCardBrowserBtn')?.addEventListener('click', openBrowser);

    this.container.querySelector('#scmNavLeaderboardBtn')?.addEventListener('click', openLeaderboard);
    this.container.querySelector('#scmHeroLeaderboardBtn')?.addEventListener('click', openLeaderboard);

    // Smooth-scroll internal section anchors within the scrollable menu shell
    this.container.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((link) => {
      link.addEventListener('click', (e) => {
        const targetId = link.getAttribute('href')?.slice(1);
        if (!targetId) return;
        const target = this.container.querySelector<HTMLElement>(`#${targetId}`);
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  private async openGlobalLeaderboard(): Promise<void> {
    if (this.destroyed) return;
    if (this.leaderboardModal) {
      this.leaderboardModal.open();
      return;
    }
    if (this.leaderboardLoading) return;
    this.leaderboardLoading = true;
    try {
      const { GlobalLeaderboardModal } = await import('../components/GlobalLeaderboardModal');
      if (this.destroyed) return;
      this.leaderboardModal = new GlobalLeaderboardModal({
        mountTarget: this.container,
        maxResults: 50,
        onPlayNow: () => {
          if (!this.destroyed) {
            this.onEnterSnakeCity();
          }
        },
      });
      this.leaderboardModal.open();
    } catch (err) {
      console.error('Failed to load Global Leaderboard modal:', err);
    } finally {
      this.leaderboardLoading = false;
    }
  }

  public destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    if (this.leaderboardModal) {
      this.leaderboardModal.destroy();
      this.leaderboardModal = null;
    }
    this.container.remove();
  }
}
