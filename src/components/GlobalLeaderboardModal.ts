import type { Unsubscribe as AuthUnsubscribe, User } from 'firebase/auth';
import type { Unsubscribe as FirestoreUnsubscribe } from 'firebase/firestore';
import {
  isFirebaseReady,
  signInWithGooglePopup,
  signOutCultivator,
  subscribeAuthState,
} from '../firebase';
import {
  deleteOwnRankingRecord,
  fetchGlobalRankings,
  submitCultivationRanking,
  subscribeGlobalRankings,
  type GlobalRankingEntry,
  type RankingSortMode,
} from '../ranking';
import {
  classifyLeaderboardError,
  computeLeaderboardStanding,
  escapeLeaderboardHtml,
  filterLeaderboardEntries,
  formatCultivationProgressPercent,
  formatRelativeTime,
  readLocalCultivationSnapshot,
  sanitizeLeaderboardCallsign,
  sortLeaderboardEntries,
  type ClassifiedLeaderboardError,
} from './globalLeaderboardHelpers';

export interface GlobalLeaderboardModalOptions {
  /** Mount host element; defaults to document.body. */
  mountTarget?: HTMLElement;
  /** Maximum leaderboard entries fetched from Firestore (1..100). Defaults to 50. */
  maxResults?: number;
  /** Optional callback to jump straight into the 3D Cultivation World. */
  onPlayNow?: () => void;
  /** Optional callback fired whenever the modal closes. */
  onClose?: () => void;
}

const RANK_CREST_SVGS: readonly string[] = [
  // #1 Sovereign Crown
  `<svg class="glb-crest-svg glb-crest-gold" viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
    <path d="M3.5 17.5L5.2 8.2L9.6 11.8L12 5.5L14.4 11.8L18.8 8.2L20.5 17.5H3.5Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="M4.5 20.5H19.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
  </svg>`,
  // #2 Ascendant Laurel Crest
  `<svg class="glb-crest-svg glb-crest-silver" viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
    <path d="M12 3.5L19 7.2V12.8C19 17.1 16 20.2 12 21.5C8 20.2 5 17.1 5 12.8V7.2L12 3.5Z" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round"/>
    <path d="M12 8.2L13.3 11L16.3 11.4L14.1 13.4L14.7 16.4L12 14.9L9.3 16.4L9.9 13.4L7.7 11.4L10.7 11L12 8.2Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
  </svg>`,
  // #3 Vanguard Diamond Crest
  `<svg class="glb-crest-svg glb-crest-bronze" viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
    <path d="M12 3.5L20 12L12 20.5L4 12L12 3.5Z" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round"/>
    <path d="M12 8L15.8 12L12 16L8.2 12L12 8Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
  </svg>`,
];

const SORT_TABS: readonly { id: RankingSortMode; label: string }[] = [
  { id: 'score', label: 'Highest Score' },
  { id: 'cultivation', label: 'Cultivation Realm' },
  { id: 'shrines', label: 'Trial Shrines' },
  { id: 'souls', label: 'Soul Fragments' },
];

/**
 * Standalone, theme-aligned Global Cultivation Leaderboard modal backed by Firebase Firestore.
 * Subscribes to live top rankings while open, supports sorting, search filtering, podium display,
 * Google Sign-In, and direct local-progress inscription with clean lifecycle teardown.
 */
export class GlobalLeaderboardModal {
  private readonly mountTarget: HTMLElement;
  private readonly maxResults: number;
  private readonly onPlayNow?: () => void;
  private readonly onClose?: () => void;

  private readonly backdrop: HTMLDivElement;
  private readonly authSlot: HTMLElement;
  private readonly refreshBtn: HTMLButtonElement;
  private readonly closeBtn: HTMLButtonElement;
  private readonly searchInput: HTMLInputElement;
  private readonly searchClearBtn: HTMLButtonElement;
  private readonly sortButtons: HTMLButtonElement[];
  private readonly standingSlot: HTMLElement;
  private readonly statusBanner: HTMLElement;
  private readonly podiumSlot: HTMLElement;
  private readonly tableBody: HTMLElement;
  private readonly dossierSlot: HTMLElement;
  private readonly callsignInput: HTMLInputElement;
  private readonly submitBtn: HTMLButtonElement;
  private readonly removeBtn: HTMLButtonElement;
  private readonly footerCountEl: HTMLElement;

  private entries: GlobalRankingEntry[] = [];
  private sortMode: RankingSortMode = 'score';
  private searchQuery = '';
  private loading = false;
  private submitting = false;
  private openState = false;
  private destroyed = false;
  private callsignDirty = false;
  private errorInfo: ClassifiedLeaderboardError | null = null;
  private feedbackMsg = '';
  private feedbackTone: 'neutral' | 'success' | 'error' = 'neutral';
  private authUser: User | null = null;
  private previousActiveEl: HTMLElement | null = null;

  private firestoreUnsub: FirestoreUnsubscribe | null = null;
  private authUnsub: AuthUnsubscribe | null = null;

  private readonly handleKeyDown = (e: KeyboardEvent): void => {
    if (!this.openState) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      this.close();
    }
  };

  constructor(options: GlobalLeaderboardModalOptions = {}) {
    this.mountTarget = options.mountTarget ?? document.body;
    this.maxResults = Math.max(1, Math.min(100, options.maxResults ?? 50));
    this.onPlayNow = options.onPlayNow;
    this.onClose = options.onClose;

    this.backdrop = document.createElement('div');
    this.backdrop.className = 'glb-backdrop hidden';
    this.backdrop.setAttribute('role', 'dialog');
    this.backdrop.setAttribute('aria-modal', 'true');
    this.backdrop.setAttribute('aria-labelledby', 'glbModalTitle');

    this.backdrop.innerHTML = `
      <div class="glb-dialog">
        <header class="glb-header">
          <div class="glb-header-copy">
            <p class="glb-kicker">Celestial Ascension Stele · Live Firebase Rankings</p>
            <h2 class="glb-title" id="glbModalTitle">Global Cultivation Leaderboard</h2>
          </div>
          <div class="glb-header-actions">
            <div class="glb-auth-slot" id="glbAuthSlot"></div>
            <button type="button" class="glb-icon-btn" id="glbRefreshBtn" aria-label="Refresh leaderboard" title="Refresh rankings">
              <svg class="glb-refresh-icon" viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden="true">
                <path d="M16.25 10A6.25 6.25 0 1 1 14.4 5.58M16.25 3.75V7.25H12.75" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span>Refresh</span>
            </button>
            <button type="button" class="glb-close-btn" id="glbCloseBtn" aria-label="Close Global Leaderboard">
              <svg viewBox="0 0 20 20" width="17" height="17" fill="none" aria-hidden="true">
                <path d="M5.5 5.5L14.5 14.5M14.5 5.5L5.5 14.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
        </header>

        <div class="glb-toolbar">
          <div class="glb-sort-tabs" role="tablist" aria-label="Sort leaderboard rankings">
            ${SORT_TABS.map(
              (tab, index) => `
              <button
                type="button"
                class="glb-sort-tab${index === 0 ? ' is-active' : ''}"
                data-glb-sort="${tab.id}"
                role="tab"
                aria-selected="${index === 0 ? 'true' : 'false'}"
              >${tab.label}</button>
            `,
            ).join('')}
          </div>
          <div class="glb-search-wrap">
            <svg class="glb-search-icon" viewBox="0 0 20 20" width="15" height="15" fill="none" aria-hidden="true">
              <circle cx="9" cy="9" r="5.5" stroke="currentColor" stroke-width="1.7"/>
              <path d="M13.2 13.2L16.8 16.8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
            </svg>
            <input
              type="search"
              id="glbSearchInput"
              class="glb-search-input"
              placeholder="Filter cultivator, stage, or realm..."
              autocomplete="off"
              aria-label="Filter cultivators by callsign, stage, or realm"
            />
            <button type="button" class="glb-search-clear hidden" id="glbSearchClearBtn" aria-label="Clear search">Clear</button>
          </div>
        </div>

        <div class="glb-status-banner hidden" id="glbStatusBanner" role="status" aria-live="polite"></div>

        <div class="glb-scroll-body">
          <section class="glb-standing-strip" id="glbStandingSlot" aria-label="Your global standing"></section>

          <section class="glb-podium-grid" id="glbPodiumSlot" aria-label="Top three cultivators"></section>

          <section class="glb-table-section" aria-label="Ranked cultivator standings">
            <div class="glb-table-wrap">
              <table class="glb-table">
                <thead>
                  <tr>
                    <th class="glb-th-rank">Rank</th>
                    <th>Cultivator</th>
                    <th>Cultivation Stage</th>
                    <th class="glb-th-num">Score</th>
                    <th class="glb-th-num">Essence XP</th>
                    <th class="glb-th-num">Shrines</th>
                    <th class="glb-th-num">Souls</th>
                    <th class="glb-th-num glb-col-updated">Updated</th>
                  </tr>
                </thead>
                <tbody id="glbTableBody"></tbody>
              </table>
            </div>
          </section>
        </div>

        <footer class="glb-footer">
          <div class="glb-dossier-area">
            <div class="glb-dossier-summary" id="glbDossierSlot"></div>
            <div class="glb-inscribe-controls">
              <input
                type="text"
                id="glbCallsignInput"
                class="glb-callsign-input"
                maxlength="32"
                placeholder="Jade Cultivator"
                autocomplete="off"
                aria-label="Cultivator callsign"
              />
              <button type="button" class="glb-btn-primary" id="glbSubmitBtn">Sign In &amp; Inscribe</button>
              <button type="button" class="glb-btn-danger hidden" id="glbRemoveBtn" title="Remove your public entry">Remove</button>
            </div>
          </div>
          <div class="glb-footer-meta">
            <span id="glbFooterCount">Synced with Firebase Firestore</span>
          </div>
        </footer>
      </div>
    `;

    this.authSlot = this.backdrop.querySelector<HTMLElement>('#glbAuthSlot')!;
    this.refreshBtn = this.backdrop.querySelector<HTMLButtonElement>('#glbRefreshBtn')!;
    this.closeBtn = this.backdrop.querySelector<HTMLButtonElement>('#glbCloseBtn')!;
    this.searchInput = this.backdrop.querySelector<HTMLInputElement>('#glbSearchInput')!;
    this.searchClearBtn = this.backdrop.querySelector<HTMLButtonElement>('#glbSearchClearBtn')!;
    this.sortButtons = Array.from(
      this.backdrop.querySelectorAll<HTMLButtonElement>('[data-glb-sort]'),
    );
    this.standingSlot = this.backdrop.querySelector<HTMLElement>('#glbStandingSlot')!;
    this.statusBanner = this.backdrop.querySelector<HTMLElement>('#glbStatusBanner')!;
    this.podiumSlot = this.backdrop.querySelector<HTMLElement>('#glbPodiumSlot')!;
    this.tableBody = this.backdrop.querySelector<HTMLElement>('#glbTableBody')!;
    this.dossierSlot = this.backdrop.querySelector<HTMLElement>('#glbDossierSlot')!;
    this.callsignInput = this.backdrop.querySelector<HTMLInputElement>('#glbCallsignInput')!;
    this.submitBtn = this.backdrop.querySelector<HTMLButtonElement>('#glbSubmitBtn')!;
    this.removeBtn = this.backdrop.querySelector<HTMLButtonElement>('#glbRemoveBtn')!;
    this.footerCountEl = this.backdrop.querySelector<HTMLElement>('#glbFooterCount')!;

    this.mountTarget.appendChild(this.backdrop);
    this.bindEvents();
  }

  private bindEvents(): void {
    this.authUnsub = subscribeAuthState((user) => {
      this.authUser = user;
      if (user && !this.callsignDirty) {
        this.callsignInput.value = sanitizeLeaderboardCallsign(
          user.displayName || 'Jade Cultivator',
        );
      }
      if (this.openState) {
        this.render();
      }
    });

    this.closeBtn.addEventListener('click', () => this.close());

    this.backdrop.addEventListener('click', (e) => {
      if (e.target === this.backdrop) {
        this.close();
      }
    });

    this.refreshBtn.addEventListener('click', () => {
      void this.refreshOnce();
    });

    this.sortButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const nextSort = (btn.dataset.glbSort as RankingSortMode) || 'score';
        if (nextSort === this.sortMode) return;
        this.sortMode = nextSort;
        this.sortButtons.forEach((item) => {
          const active = item.dataset.glbSort === nextSort;
          item.classList.toggle('is-active', active);
          item.setAttribute('aria-selected', active ? 'true' : 'false');
        });
        this.render();
      });
    });

    this.searchInput.addEventListener('input', () => {
      this.searchQuery = this.searchInput.value;
      this.searchClearBtn.classList.toggle('hidden', this.searchQuery.trim().length === 0);
      this.render();
    });

    this.searchClearBtn.addEventListener('click', () => {
      this.searchQuery = '';
      this.searchInput.value = '';
      this.searchClearBtn.classList.add('hidden');
      this.searchInput.focus();
      this.render();
    });

    this.callsignInput.addEventListener('input', () => {
      this.callsignDirty = true;
    });

    this.authSlot.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-glb-auth="signin"]')) {
        void this.handleSignIn();
      } else if (target.closest('[data-glb-auth="signout"]')) {
        void this.handleSignOut();
      }
    });

    this.statusBanner.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-glb-action="retry"]')) {
        this.attachRealtimeListener();
      }
    });

    this.tableBody.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-glb-action="play"]')) {
        this.close();
        this.onPlayNow?.();
      } else if (target.closest('[data-glb-action="clear-search"]')) {
        this.searchQuery = '';
        this.searchInput.value = '';
        this.searchClearBtn.classList.add('hidden');
        this.render();
      } else if (target.closest('[data-glb-action="retry"]')) {
        this.attachRealtimeListener();
      }
    });

    this.submitBtn.addEventListener('click', () => {
      void this.handleInscribe();
    });

    this.removeBtn.addEventListener('click', () => {
      void this.handleRemoveOwn();
    });
  }

  public isOpen(): boolean {
    return this.openState;
  }

  public open(): void {
    if (this.destroyed || this.openState) return;
    this.openState = true;
    this.feedbackMsg = '';
    this.feedbackTone = 'neutral';
    this.errorInfo = null;
    this.previousActiveEl =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    if (!this.callsignDirty) {
      this.callsignInput.value = sanitizeLeaderboardCallsign(
        this.authUser?.displayName || 'Jade Cultivator',
      );
    }

    this.backdrop.classList.remove('hidden');
    window.addEventListener('keydown', this.handleKeyDown);
    this.attachRealtimeListener();
    this.render();
    this.closeBtn.focus();
  }

  public close(): void {
    if (!this.openState) return;
    this.openState = false;
    this.backdrop.classList.add('hidden');
    window.removeEventListener('keydown', this.handleKeyDown);
    this.detachRealtimeListener();
    if (this.previousActiveEl && document.contains(this.previousActiveEl)) {
      this.previousActiveEl.focus();
    }
    this.previousActiveEl = null;
    this.onClose?.();
  }

  public toggle(): void {
    if (this.openState) {
      this.close();
    } else {
      this.open();
    }
  }

  public destroy(): void {
    if (this.destroyed) return;
    this.close();
    this.destroyed = true;
    if (this.authUnsub) {
      this.authUnsub();
      this.authUnsub = null;
    }
    this.backdrop.remove();
  }

  private detachRealtimeListener(): void {
    if (this.firestoreUnsub) {
      this.firestoreUnsub();
      this.firestoreUnsub = null;
    }
  }

  private attachRealtimeListener(): void {
    this.detachRealtimeListener();
    if (!isFirebaseReady()) {
      this.loading = false;
      this.errorInfo = classifyLeaderboardError('Firebase is not initialized.');
      this.render();
      return;
    }

    this.loading = true;
    this.errorInfo = null;
    this.render();

    this.firestoreUnsub = subscribeGlobalRankings(
      (rows) => {
        this.entries = rows;
        this.loading = false;
        this.errorInfo = null;
        if (this.openState) {
          this.render();
        }
      },
      (errMessage) => {
        this.loading = false;
        this.errorInfo = classifyLeaderboardError(errMessage);
        if (this.openState) {
          this.render();
        }
      },
      this.maxResults,
    );
  }

  private async refreshOnce(): Promise<void> {
    if (!isFirebaseReady() || this.loading) return;
    this.loading = true;
    this.errorInfo = null;
    this.render();
    try {
      this.entries = await fetchGlobalRankings(this.maxResults);
    } catch (err) {
      this.errorInfo = classifyLeaderboardError(err);
    } finally {
      this.loading = false;
      if (this.openState) {
        this.render();
      }
    }
  }

  private async handleSignIn(): Promise<void> {
    try {
      this.feedbackMsg = 'Opening Google Sign-In...';
      this.feedbackTone = 'neutral';
      this.render();
      const user = await signInWithGooglePopup();
      this.authUser = user;
      if (!this.callsignDirty || !this.callsignInput.value.trim()) {
        this.callsignInput.value = sanitizeLeaderboardCallsign(
          user.displayName || 'Jade Cultivator',
        );
      }
      this.feedbackMsg = `Signed in as ${sanitizeLeaderboardCallsign(user.displayName || 'Jade Cultivator')}.`;
      this.feedbackTone = 'success';
      this.render();
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      if (raw.includes('popup-closed-by-user') || raw.includes('cancelled-popup-request')) {
        this.feedbackMsg = 'Sign-in cancelled. You can continue browsing rankings anytime.';
        this.feedbackTone = 'neutral';
      } else {
        this.feedbackMsg = 'Google Sign-In could not complete. Allow popups and try again.';
        this.feedbackTone = 'error';
      }
      this.render();
    }
  }

  private async handleSignOut(): Promise<void> {
    await signOutCultivator();
    this.authUser = null;
    this.feedbackMsg = 'Signed out. Global rankings remain open to browse.';
    this.feedbackTone = 'neutral';
    this.render();
  }

  private async handleInscribe(): Promise<void> {
    if (this.submitting) return;
    if (!this.authUser) {
      await this.handleSignIn();
      if (!this.authUser) return;
    }

    const sanitizedName = sanitizeLeaderboardCallsign(
      this.callsignInput.value || this.authUser.displayName || 'Jade Cultivator',
    );
    this.callsignInput.value = sanitizedName;
    const localSummary = readLocalCultivationSnapshot(sanitizedName);

    this.submitting = true;
    this.feedbackMsg = 'Inscribing your cultivation record to Firebase...';
    this.feedbackTone = 'neutral';
    this.render();

    try {
      const saved = await submitCultivationRanking(localSummary.submission);
      const existingIdx = this.entries.findIndex((e) => e.userId === saved.userId);
      if (existingIdx >= 0) {
        this.entries[existingIdx] = saved;
      } else {
        this.entries = [...this.entries, saved];
      }
      this.feedbackMsg = `Inscribed ${saved.displayName} — Score ${saved.score.toLocaleString()} · Lv.${saved.level} ${saved.stageTitle}.`;
      this.feedbackTone = 'success';
    } catch (err) {
      const classified = classifyLeaderboardError(err);
      this.feedbackMsg = classified.message;
      this.feedbackTone = 'error';
    } finally {
      this.submitting = false;
      if (this.openState) {
        this.render();
      }
    }
  }

  private async handleRemoveOwn(): Promise<void> {
    if (!this.authUser || this.submitting) return;
    this.submitting = true;
    this.render();
    try {
      await deleteOwnRankingRecord();
      this.entries = this.entries.filter((e) => e.userId !== this.authUser?.uid);
      this.feedbackMsg = 'Your public ranking record has been removed from the leaderboard.';
      this.feedbackTone = 'neutral';
    } catch (err) {
      const classified = classifyLeaderboardError(err);
      this.feedbackMsg = classified.message;
      this.feedbackTone = 'error';
    } finally {
      this.submitting = false;
      if (this.openState) {
        this.render();
      }
    }
  }

  private render(): void {
    const uid = this.authUser?.uid ?? null;
    const callsign = this.callsignInput.value || this.authUser?.displayName || 'Jade Cultivator';
    const localSummary = readLocalCultivationSnapshot(callsign);
    const sortedAll = sortLeaderboardEntries(this.entries, this.sortMode);
    const filtered = filterLeaderboardEntries(sortedAll, this.searchQuery);
    const standing = computeLeaderboardStanding(sortedAll, localSummary.submission.score, uid);
    const ownEntry = uid ? this.entries.find((e) => e.userId === uid) ?? null : null;

    // Header refresh button state
    this.refreshBtn.disabled = this.loading;
    this.refreshBtn.classList.toggle('is-spinning', this.loading);

    // Auth slot
    if (this.authUser) {
      const safeUser = escapeLeaderboardHtml(
        sanitizeLeaderboardCallsign(this.authUser.displayName || 'Jade Cultivator'),
      );
      this.authSlot.innerHTML = `
        <span class="glb-auth-user">${safeUser}</span>
        <button type="button" class="glb-text-btn" data-glb-auth="signout">Sign Out</button>
      `;
      this.submitBtn.textContent = this.submitting
        ? 'Inscribing...'
        : ownEntry
          ? 'Update My Record'
          : 'Inscribe My Progress';
    } else {
      this.authSlot.innerHTML = `
        <button type="button" class="glb-btn-secondary" data-glb-auth="signin">Sign in with Google</button>
      `;
      this.submitBtn.textContent = this.submitting ? 'Signing in...' : 'Sign In & Inscribe';
    }
    this.submitBtn.disabled = this.submitting || !isFirebaseReady();
    this.removeBtn.classList.toggle('hidden', !ownEntry);
    this.removeBtn.disabled = this.submitting;

    // Status or error banner
    if (this.errorInfo) {
      this.statusBanner.className = 'glb-status-banner is-error';
      this.statusBanner.innerHTML = `
        <div class="glb-status-copy">
          <strong>${escapeLeaderboardHtml(this.errorInfo.title)}:</strong>
          <span>${escapeLeaderboardHtml(this.errorInfo.message)}</span>
        </div>
        <button type="button" class="glb-retry-btn" data-glb-action="retry">Retry</button>
      `;
    } else if (this.feedbackMsg) {
      const toneClass =
        this.feedbackTone === 'success'
          ? ' is-success'
          : this.feedbackTone === 'error'
            ? ' is-error'
            : '';
      this.statusBanner.className = `glb-status-banner${toneClass}`;
      this.statusBanner.textContent = this.feedbackMsg;
    } else {
      this.statusBanner.className = 'glb-status-banner hidden';
      this.statusBanner.textContent = '';
    }

    // Global standing summary strip
    const rankLabel =
      standing.totalEntries === 0
        ? 'Unclaimed #1'
        : standing.isSubmitted
          ? `#${standing.rank} of ${standing.totalEntries}`
          : `Projected #${standing.rank}`;
    const nextGoalText = standing.nextRival
      ? `${standing.scoreGapToNext.toLocaleString()} pts to pass ${escapeLeaderboardHtml(standing.nextRival.displayName)}`
      : standing.totalEntries > 0
        ? 'Leading the Celestial Stele'
        : 'Be the first cultivator inscribed';

    this.standingSlot.innerHTML = `
      <div class="glb-metric-cell">
        <span class="glb-metric-label">Global Standing</span>
        <strong class="glb-metric-value is-gold">${rankLabel}</strong>
      </div>
      <div class="glb-metric-cell">
        <span class="glb-metric-label">Percentile</span>
        <strong class="glb-metric-value is-jade">Top ${standing.percentileTop}%</strong>
      </div>
      <div class="glb-metric-cell">
        <span class="glb-metric-label">Next Milestone</span>
        <strong class="glb-metric-value">${nextGoalText}</strong>
      </div>
    `;

    // Podium (top 3 from current sorted view, only when not loading empty)
    const topThree = sortedAll.slice(0, 3);
    if (this.loading && this.entries.length === 0) {
      this.podiumSlot.innerHTML = `
        <div class="glb-podium-skeleton"></div>
        <div class="glb-podium-skeleton"></div>
        <div class="glb-podium-skeleton"></div>
      `;
    } else if (topThree.length === 0) {
      this.podiumSlot.innerHTML = '';
    } else {
      const tierMeta = [
        { rankLabel: 'Rank #1 · Sovereign', cls: 'is-gold' },
        { rankLabel: 'Rank #2 · Ascendant', cls: 'is-silver' },
        { rankLabel: 'Rank #3 · Vanguard', cls: 'is-bronze' },
      ];
      this.podiumSlot.innerHTML = topThree
        .map((entry, idx) => {
          const isMe = uid === entry.userId;
          const meta = tierMeta[idx];
          return `
            <article class="glb-podium-card ${meta.cls}${isMe ? ' is-self' : ''}">
              <div class="glb-podium-top">
                <span class="glb-podium-tier">
                  ${RANK_CREST_SVGS[idx] ?? ''}
                  <span>${meta.rankLabel}</span>
                </span>
                ${entry.isHuman ? '<span class="glb-ascended-mark">Ascended</span>' : ''}
              </div>
              <h3 class="glb-podium-name">
                ${escapeLeaderboardHtml(entry.displayName)}${isMe ? ' <span class="glb-self-tag">You</span>' : ''}
              </h3>
              <p class="glb-podium-realm">
                Lv.${entry.level} ${escapeLeaderboardHtml(entry.stageTitle)} · ${escapeLeaderboardHtml(entry.realmName)}
              </p>
              <div class="glb-podium-stats">
                <span><strong>${entry.score.toLocaleString()}</strong> Score</span>
                <span><strong>${entry.shrinesConquered}/12</strong> Shrines</span>
                <span><strong>${entry.soulsCollected}/14</strong> Souls</span>
              </div>
            </article>
          `;
        })
        .join('');
    }

    // Table body
    if (this.loading && this.entries.length === 0) {
      this.tableBody.innerHTML = Array.from({ length: 5 })
        .map(
          () => `
          <tr class="glb-skeleton-row">
            <td colspan="8"><div class="glb-skeleton-bar"></div></td>
          </tr>
        `,
        )
        .join('');
    } else if (filtered.length === 0) {
      const hasSearch = this.searchQuery.trim().length > 0;
      const playCta =
        !hasSearch && this.onPlayNow
          ? '<button type="button" class="glb-inline-cta" data-glb-action="play">Enter 3D World</button>'
          : '';
      const clearCta = hasSearch
        ? '<button type="button" class="glb-inline-cta" data-glb-action="clear-search">Clear Filter</button>'
        : '';
      const emptyMsg = this.errorInfo
        ? escapeLeaderboardHtml(this.errorInfo.message)
        : hasSearch
          ? `No cultivators match "${escapeLeaderboardHtml(this.searchQuery.trim())}".`
          : 'No cultivation records have been inscribed yet. Ascend the peaks or sign in below to claim Rank #1.';
      this.tableBody.innerHTML = `
        <tr>
          <td colspan="8" class="glb-empty-cell">
            <p class="glb-empty-text">${emptyMsg}</p>
            <div class="glb-empty-actions">
              ${clearCta}
              ${playCta}
              ${this.errorInfo ? '<button type="button" class="glb-inline-cta" data-glb-action="retry">Retry Connection</button>' : ''}
            </div>
          </td>
        </tr>
      `;
    } else {
      const rankIndexMap = new Map<string, number>();
      sortedAll.forEach((entry, idx) => rankIndexMap.set(entry.userId, idx + 1));

      this.tableBody.innerHTML = filtered
        .map((entry) => {
          const rank = rankIndexMap.get(entry.userId) ?? 0;
          const isMe = uid === entry.userId;
          const pct = formatCultivationProgressPercent(entry.level);
          const rankClass =
            rank === 1
              ? 'is-rank-1'
              : rank === 2
                ? 'is-rank-2'
                : rank === 3
                  ? 'is-rank-3'
                  : '';
          return `
            <tr class="glb-row${isMe ? ' is-self' : ''}">
              <td class="glb-td-rank ${rankClass}">#${rank}</td>
              <td class="glb-td-name">
                <div class="glb-name-line">
                  <strong class="glb-player-name">${escapeLeaderboardHtml(entry.displayName)}</strong>
                  ${isMe ? '<span class="glb-self-tag">You</span>' : ''}
                  ${entry.isHuman ? '<span class="glb-ascended-mark">Human</span>' : ''}
                </div>
              </td>
              <td class="glb-td-stage">
                <div class="glb-stage-label">
                  <span>Lv.${entry.level} ${escapeLeaderboardHtml(entry.stageTitle)}</span>
                  <span class="glb-realm-muted">· ${escapeLeaderboardHtml(entry.realmName)}</span>
                </div>
                <div class="glb-stage-track" aria-hidden="true">
                  <div class="glb-stage-fill" style="width:${pct}%"></div>
                </div>
              </td>
              <td class="glb-td-num is-score">${entry.score.toLocaleString()}</td>
              <td class="glb-td-num">${entry.xp.toLocaleString()}</td>
              <td class="glb-td-num">${entry.shrinesConquered}/12</td>
              <td class="glb-td-num is-souls">${entry.soulsCollected}/14</td>
              <td class="glb-td-num glb-col-updated is-muted">${formatRelativeTime(entry.updatedAtMs)}</td>
            </tr>
          `;
        })
        .join('');
    }

    // Local saved cultivation dossier summary
    const sub = localSummary.submission;
    this.dossierSlot.innerHTML = `
      <span class="glb-dossier-label">Your Saved Progress</span>
      <span class="glb-dossier-line">
        Score <strong>${sub.score.toLocaleString()}</strong>
        <span aria-hidden="true">·</span>
        Lv.${sub.level} <strong>${escapeLeaderboardHtml(sub.stageTitle)}</strong> (${escapeLeaderboardHtml(sub.realmName)})
        <span aria-hidden="true">·</span>
        ${sub.shrinesConquered}/12 Shrines
        <span aria-hidden="true">·</span>
        ${sub.soulsCollected}/14 Souls
      </span>
    `;

    const shownText =
      filtered.length === sortedAll.length
        ? `Showing ${sortedAll.length} ${sortedAll.length === 1 ? 'cultivator' : 'cultivators'} · Live Firebase sync`
        : `Showing ${filtered.length} of ${sortedAll.length} cultivators · Live Firebase sync`;
    this.footerCountEl.textContent = this.loading
      ? 'Synchronizing with Firebase Firestore...'
      : shownText;
  }
}
