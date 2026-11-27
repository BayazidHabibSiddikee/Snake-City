export type AppStartupMode = 'menu' | 'game' | 'browser';

const BROWSER_SETTINGS_KEY = 'SERPENT_PEAKS_BROWSER_SETTINGS_V1';

/**
 * Determines the initial application subsystem ('menu', 'game', or 'browser')
 * without importing Three.js, GameUI, or the browser shell.
 */
export function resolveInitialStartupMode(
  search: string = typeof window !== 'undefined' ? window.location.search : '',
  storage: Pick<Storage, 'getItem'> | null = typeof window !== 'undefined' ? window.localStorage : null,
): AppStartupMode {
  try {
    const params = new URLSearchParams(search);
    const explicit = params.get('mode')?.trim().toLowerCase();
    if (explicit === 'browser') return 'browser';
    if (explicit === 'game') return 'game';
    if (explicit === 'menu') return 'menu';
  } catch {
    // ignore malformed query string
  }

  try {
    const raw = storage?.getItem(BROWSER_SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { settings?: { startupMode?: string } };
      if (parsed?.settings?.startupMode === 'browser') {
        return 'browser';
      }
    }
  } catch {
    // ignore invalid localStorage data
  }

  return 'menu';
}

/**
 * Updates the browser URL query parameter cleanly without reloading the page.
 */
export function syncModeQueryParam(mode: AppStartupMode): void {
  if (typeof window === 'undefined' || !window.history?.replaceState) return;
  try {
    const url = new URL(window.location.href);
    if (mode === 'browser' || mode === 'game') {
      url.searchParams.set('mode', mode);
    } else {
      url.searchParams.delete('mode');
    }
    window.history.replaceState({}, '', url.toString());
  } catch {
    // ignore restricted history environments
  }
}
