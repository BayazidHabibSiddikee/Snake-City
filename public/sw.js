// Serpent Peaks — Portal Chromium & Game Offline Service Worker v2
const SW_VERSION = '2.0.0';
const CORE_CACHE = 'serpent-peaks-core-v2';
const PORTAL_PAGES_CACHE = 'serpent-peaks-portal-pages-v2';
const PORTAL_STATE_CACHE = 'serpent-peaks-portal-state-v2';
const FONT_CACHE = 'serpent-peaks-fonts-v2';

const ACTIVE_CACHES = new Set([
  CORE_CACHE,
  PORTAL_PAGES_CACHE,
  PORTAL_STATE_CACHE,
  FONT_CACHE,
]);

const PORTAL_STATE_URL = '/__portal_cache__/state.json';
const MAX_CACHED_PORTAL_PAGES = 60;

// Core shell & PWA assets pre-cached on install
const CORE_PRECACHE_URLS = [
  '/',
  '/?mode=browser',
  '/manifest.json',
  '/favicon.ico',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
];

function escapeHtml(raw) {
  return String(raw ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeTargetUrl(rawUrl) {
  try {
    const trimmed = String(rawUrl ?? '').trim();
    if (!trimmed) return null;
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return null;
  }
}

function canonicalPortalPageCacheKey(targetUrl) {
  const normalized = normalizeTargetUrl(targetUrl);
  if (!normalized) return null;
  return `${self.location.origin}/__portal_cache__/page?url=${encodeURIComponent(normalized)}`;
}

function extractTargetUrlFromCacheKey(requestUrl) {
  try {
    const u = new URL(requestUrl);
    if (u.pathname === '/__portal_cache__/page') {
      return u.searchParams.get('url');
    }
  } catch {
    // ignore
  }
  return null;
}

async function readPortalStateSnapshot() {
  try {
    const cache = await caches.open(PORTAL_STATE_CACHE);
    const res = await cache.match(PORTAL_STATE_URL);
    if (!res) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function writePortalStateSnapshot(payload) {
  if (!payload || typeof payload !== 'object') return false;
  try {
    const cache = await caches.open(PORTAL_STATE_CACHE);
    const safePayload = {
      savedAt: typeof payload.savedAt === 'number' ? payload.savedAt : Date.now(),
      settings: payload.settings && typeof payload.settings === 'object' ? payload.settings : {},
      customBookmarks: Array.isArray(payload.customBookmarks) ? payload.customBookmarks.slice(0, 64) : [],
      browsingHistory: Array.isArray(payload.browsingHistory) ? payload.browsingHistory.slice(0, 200) : [],
      searchHistory: Array.isArray(payload.searchHistory) ? payload.searchHistory.slice(0, 100) : [],
      portalVisits: payload.portalVisits && typeof payload.portalVisits === 'object' ? payload.portalVisits : {},
    };
    const response = new Response(JSON.stringify(safePayload), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Serpent-SW-Version': SW_VERSION,
      },
    });
    await cache.put(PORTAL_STATE_URL, response);
    return true;
  } catch {
    return false;
  }
}

async function listCachedPortalPageUrls() {
  try {
    const cache = await caches.open(PORTAL_PAGES_CACHE);
    const keys = await cache.keys();
    const urls = [];
    for (const req of keys) {
      const target = extractTargetUrlFromCacheKey(req.url);
      if (target) urls.push(target);
    }
    return urls;
  } catch {
    return [];
  }
}

async function prunePortalPageCache() {
  try {
    const cache = await caches.open(PORTAL_PAGES_CACHE);
    const keys = await cache.keys();
    if (keys.length <= MAX_CACHED_PORTAL_PAGES) return;
    const excess = keys.length - MAX_CACHED_PORTAL_PAGES;
    for (let i = 0; i < excess; i++) {
      await cache.delete(keys[i]);
    }
  } catch {
    // ignore
  }
}

async function storePortalPageSnapshot(targetUrl, upstreamResponse) {
  const cacheKey = canonicalPortalPageCacheKey(targetUrl);
  if (!cacheKey || !upstreamResponse || !upstreamResponse.ok) return false;
  const contentType = upstreamResponse.headers.get('content-type') || '';
  if (!contentType.includes('text/html') && !contentType.includes('text/plain') && !contentType.includes('application/json')) {
    return false;
  }
  try {
    const bodyText = await upstreamResponse.clone().text();
    const headers = new Headers();
    headers.set('Content-Type', contentType || 'text/html; charset=utf-8');
    headers.set('X-Serpent-Offline-Cache', 'HIT');
    headers.set('X-Serpent-Cached-At', String(Date.now()));
    headers.set('X-Serpent-Target-Url', targetUrl);
    const cache = await caches.open(PORTAL_PAGES_CACHE);
    await cache.put(cacheKey, new Response(bodyText, { status: 200, headers }));
    await prunePortalPageCache();
    return true;
  } catch {
    return false;
  }
}

async function warmCoreAssets(urls) {
  if (!Array.isArray(urls) || urls.length === 0) return 0;
  const cache = await caches.open(CORE_CACHE);
  let cachedCount = 0;
  for (const raw of urls.slice(0, 80)) {
    try {
      const u = new URL(raw, self.location.origin);
      if (u.origin !== self.location.origin) continue;
      if (u.pathname.startsWith('/api/')) continue;
      const existing = await cache.match(u.href);
      if (existing) {
        cachedCount++;
        continue;
      }
      const res = await fetch(u.href, { credentials: 'same-origin' });
      if (res && res.ok) {
        await cache.put(u.href, res.clone());
        cachedCount++;
      }
    } catch {
      // skip individual asset errors
    }
  }
  return cachedCount;
}

async function precachePortalUrls(urls, shield = '1', ua = 'serpent_portal') {
  if (!Array.isArray(urls) || urls.length === 0) {
    return { attempted: 0, cached: 0 };
  }
  let attempted = 0;
  let cached = 0;
  for (const raw of urls.slice(0, 20)) {
    const normalized = normalizeTargetUrl(raw);
    if (!normalized) continue;
    attempted++;
    try {
      const proxyUrl = `${self.location.origin}/api/browser/proxy?url=${encodeURIComponent(normalized)}&shield=${encodeURIComponent(shield)}&ua=${encodeURIComponent(ua)}`;
      const res = await fetch(proxyUrl, { credentials: 'same-origin' });
      if (res && res.ok) {
        const stored = await storePortalPageSnapshot(normalized, res);
        if (stored) cached++;
      }
    } catch {
      // offline or unreachable upstream
    }
  }
  return { attempted, cached };
}

async function buildOfflinePortalFallbackHtml(requestedUrl) {
  const [state, cachedUrls] = await Promise.all([
    readPortalStateSnapshot(),
    listCachedPortalPageUrls(),
  ]);
  const cachedSet = new Set(cachedUrls);
  const bookmarks = Array.isArray(state?.customBookmarks) ? state.customBookmarks : [];
  const history = Array.isArray(state?.browsingHistory) ? state.browsingHistory : [];
  const searches = Array.isArray(state?.searchHistory) ? state.searchHistory : [];

  const renderBookmarkRows = () => {
    if (bookmarks.length === 0) {
      return '<p class="muted">No saved bookmarks yet. Save any URL with the ★ button while online to make it available offline.</p>';
    }
    return bookmarks
      .slice(0, 14)
      .map((bm) => {
        const norm = normalizeTargetUrl(bm.url);
        const hasOfflineCopy = norm ? cachedSet.has(norm) : String(bm.url || '').startsWith('chrome://');
        return `
          <div class="row">
            <div class="row-main">
              <div class="row-title">★ ${escapeHtml(bm.title || bm.url)}</div>
              <div class="row-sub">${escapeHtml(bm.url)}</div>
            </div>
            <div class="row-right">
              <span class="state ${hasOfflineCopy ? 'ready' : 'meta'}">${hasOfflineCopy ? 'Offline Ready' : 'Saved URL'}</span>
              <button type="button" class="btn" data-nav="${escapeHtml(bm.url)}">Open</button>
            </div>
          </div>`;
      })
      .join('');
  };

  const renderHistoryRows = () => {
    if (history.length === 0) {
      return '<p class="muted">No local portal history cached yet.</p>';
    }
    return history
      .slice(0, 14)
      .map((item) => {
        const norm = normalizeTargetUrl(item.url);
        const hasOfflineCopy = norm ? cachedSet.has(norm) : String(item.url || '').startsWith('chrome://');
        return `
          <div class="row">
            <div class="row-main">
              <div class="row-title">${escapeHtml(item.title || item.url)}</div>
              <div class="row-sub">Portal ${escapeHtml(item.portalVariant || 'A')} · ${escapeHtml(item.portalLabel || 'Portal Session')} · ${escapeHtml(item.url)}</div>
            </div>
            <div class="row-right">
              <span class="state ${hasOfflineCopy ? 'ready' : 'meta'}">${hasOfflineCopy ? 'Cached' : 'Metadata'}</span>
              <button type="button" class="btn" data-nav="${escapeHtml(item.url)}">Open</button>
            </div>
          </div>`;
      })
      .join('');
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Offline — Portal Chromium Cache</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; padding: 24px 20px 36px; background: #091318; color: #e4f3ee; font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif; }
  .wrap { max-width: 780px; margin: 0 auto; display: flex; flex-direction: column; gap: 18px; }
  .hero { padding: 18px 20px; border-radius: 12px; background: rgba(16, 30, 38, 0.92); border: 1px solid rgba(251, 191, 36, 0.34); }
  .kicker { font-size: 11px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: #fbbf24; margin-bottom: 6px; }
  h1 { margin: 0 0 6px; font-size: 19px; color: #f4fbf8; }
  .url { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; color: #93c5b5; word-break: break-all; margin: 0 0 12px; }
  .actions { display: flex; flex-wrap: wrap; gap: 8px; }
  .btn { appearance: none; border: 1px solid rgba(182, 224, 206, 0.24); background: rgba(255, 255, 255, 0.05); color: #eef9f4; border-radius: 7px; padding: 6px 11px; font-size: 12px; font-weight: 700; cursor: pointer; }
  .btn:hover { background: rgba(45, 227, 255, 0.16); border-color: rgba(45, 227, 255, 0.5); }
  .btn.primary { background: #2de3ff; color: #051319; border-color: #2de3ff; }
  .panel { padding: 16px 18px; border-radius: 12px; background: rgba(12, 23, 30, 0.9); border: 1px solid rgba(182, 224, 206, 0.16); }
  .panel-head { display: flex; justify-content: space-between; align-items: baseline; padding-bottom: 10px; margin-bottom: 8px; border-bottom: 1px solid rgba(182, 224, 206, 0.12); }
  .panel-title { font-size: 12px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #79b8a3; }
  .count { font-size: 12px; font-weight: 700; color: #8cb2a4; font-variant-numeric: tabular-nums; }
  .row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 4px; border-bottom: 1px solid rgba(182, 224, 206, 0.08); }
  .row:last-child { border-bottom: none; }
  .row-main { min-width: 0; flex: 1; }
  .row-title { font-size: 13px; font-weight: 700; color: #edf8f3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .row-sub { font-size: 11px; color: #83a89b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px; }
  .row-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
  .state { font-size: 11px; font-weight: 700; }
  .state.ready { color: #34d399; }
  .state.meta { color: #83a89b; }
  .muted { margin: 4px 0 0; font-size: 12.5px; color: #89aba0; line-height: 1.5; }
</style>
</head>
<body>
  <div class="wrap">
    <section class="hero">
      <div class="kicker">Offline Portal Cache · Service Worker Active</div>
      <h1>This page isn’t cached for offline viewing yet</h1>
      <p class="url">${escapeHtml(requestedUrl)}</p>
      <div class="actions">
        <button type="button" class="btn primary" data-action="open_newtab">Open New Tab</button>
        <button type="button" class="btn" data-action="open_history">Browser History (${history.length})</button>
        <button type="button" class="btn" data-action="open_bookmarks">Saved Bookmarks (${bookmarks.length})</button>
        <button type="button" class="btn" id="retryBtn">Retry Connection</button>
      </div>
    </section>

    <section class="panel">
      <div class="panel-head">
        <span class="panel-title">Saved Portal Bookmarks</span>
        <span class="count">${bookmarks.length} saved · ${cachedUrls.length} cached pages</span>
      </div>
      ${renderBookmarkRows()}
    </section>

    <section class="panel">
      <div class="panel-head">
        <span class="panel-title">Local Browser History</span>
        <span class="count">${history.length} visits · ${searches.length} searches</span>
      </div>
      ${renderHistoryRows()}
    </section>
  </div>
  <script>
    document.querySelectorAll('[data-nav]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var url = btn.getAttribute('data-nav');
        if (url && window.parent) {
          window.parent.postMessage({ type: 'SERPENT_PORTAL_NAV', url: url }, '*');
        }
      });
    });
    document.querySelectorAll('[data-action]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var act = btn.getAttribute('data-action');
        if (act === 'open_newtab') window.parent.postMessage({ type: 'SERPENT_PORTAL_NAV', url: 'chrome://newtab' }, '*');
        if (act === 'open_history') window.parent.postMessage({ type: 'SERPENT_PORTAL_NAV', url: 'chrome://history' }, '*');
        if (act === 'open_bookmarks') window.parent.postMessage({ type: 'SERPENT_PORTAL_NAV', url: 'chrome://bookmarks' }, '*');
      });
    });
    var retry = document.getElementById('retryBtn');
    if (retry) retry.addEventListener('click', function() { window.location.reload(); });
  </script>
</body>
</html>`;
}

async function getOfflineCacheStatus() {
  const [coreCache, pageCache, stateSnapshot] = await Promise.all([
    caches.open(CORE_CACHE),
    caches.open(PORTAL_PAGES_CACHE),
    readPortalStateSnapshot(),
  ]);
  const [coreKeys, pageKeys] = await Promise.all([
    coreCache.keys(),
    pageCache.keys(),
  ]);
  const cachedUrls = pageKeys
    .map((req) => extractTargetUrlFromCacheKey(req.url))
    .filter(Boolean);

  return {
    swVersion: SW_VERSION,
    coreAssetCount: coreKeys.length,
    cachedPageCount: cachedUrls.length,
    cachedUrls,
    stateSyncedAt: typeof stateSnapshot?.savedAt === 'number' ? stateSnapshot.savedAt : 0,
    bookmarksCount: Array.isArray(stateSnapshot?.customBookmarks) ? stateSnapshot.customBookmarks.length : 0,
    historyCount: Array.isArray(stateSnapshot?.browsingHistory) ? stateSnapshot.browsingHistory.length : 0,
    searchHistoryCount: Array.isArray(stateSnapshot?.searchHistory) ? stateSnapshot.searchHistory.length : 0,
  };
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CORE_CACHE).then(async (cache) => {
      await Promise.allSettled(
        CORE_PRECACHE_URLS.map(async (url) => {
          try {
            const res = await fetch(url, { credentials: 'same-origin' });
            if (res && res.ok) await cache.put(url, res);
          } catch {
            // tolerate individual install precache misses
          }
        }),
      );
    }),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => !ACTIVE_CACHES.has(key))
          .map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener('message', (event) => {
  const data = event.data || {};
  const replyPort = event.ports && event.ports[0];
  const respond = (payload) => {
    if (replyPort) replyPort.postMessage(payload);
  };

  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    respond({ ok: true });
    return;
  }

  if (data.type === 'SYNC_PORTAL_STATE') {
    event.waitUntil(
      writePortalStateSnapshot(data.payload).then((ok) => respond({ ok })),
    );
    return;
  }

  if (data.type === 'WARM_CORE_ASSETS') {
    event.waitUntil(
      warmCoreAssets(data.urls).then((cachedCount) => respond({ ok: true, cachedCount })),
    );
    return;
  }

  if (data.type === 'PRECACHE_PORTAL_URLS') {
    event.waitUntil(
      precachePortalUrls(data.urls, data.shield || '1', data.ua || 'serpent_portal').then((res) =>
        respond({ ok: true, ...res }),
      ),
    );
    return;
  }

  if (data.type === 'GET_OFFLINE_STATUS') {
    event.waitUntil(
      getOfflineCacheStatus().then((status) => respond({ ok: true, status })),
    );
    return;
  }

  if (data.type === 'CLEAR_PORTAL_PAGE_CACHE') {
    event.waitUntil(
      caches.delete(PORTAL_PAGES_CACHE).then(() => respond({ ok: true })),
    );
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // 1. Virtual offline state endpoint (served straight from SW Cache Storage)
  if (url.origin === self.location.origin && url.pathname === PORTAL_STATE_URL) {
    event.respondWith(
      caches.open(PORTAL_STATE_CACHE).then(async (cache) => {
        const hit = await cache.match(PORTAL_STATE_URL);
        if (hit) return hit;
        return new Response(JSON.stringify({ savedAt: 0, customBookmarks: [], browsingHistory: [], searchHistory: [], portalVisits: {} }), {
          status: 200,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        });
      }),
    );
    return;
  }

  // 2. Google Fonts — Cache-First so UI typography remains crisp offline
  if (url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com') {
    event.respondWith(
      caches.open(FONT_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const response = await fetch(request);
          if (response && (response.status === 200 || response.status === 0)) {
            cache.put(request, response.clone());
          }
          return response;
        } catch {
          return new Response('', { status: 504 });
        }
      }),
    );
    return;
  }

  // Ignore other cross-origin requests
  if (url.origin !== self.location.origin) return;

  // 3. Portal Chromium Proxy (/api/browser/proxy?url=...) — Network-First + Offline Page Cache + Offline Bookmarks/History Reader
  if (url.pathname === '/api/browser/proxy') {
    const rawTarget = url.searchParams.get('url') || '';
    const normalizedTarget = normalizeTargetUrl(rawTarget);
    const canonicalKey = normalizedTarget ? canonicalPortalPageCacheKey(normalizedTarget) : null;

    event.respondWith(
      (async () => {
        try {
          const networkRes = await fetch(request);
          if (networkRes && networkRes.ok && normalizedTarget) {
            await storePortalPageSnapshot(normalizedTarget, networkRes);
            return networkRes;
          }
          // Upstream returned an error (e.g. 502 while offline/unreachable): try cached snapshot first
          if (canonicalKey) {
            const pageCache = await caches.open(PORTAL_PAGES_CACHE);
            const cachedPage = await pageCache.match(canonicalKey);
            if (cachedPage) return cachedPage;
          }
          return networkRes;
        } catch {
          // Offline network failure -> serve cached portal page snapshot if present
          if (canonicalKey) {
            const pageCache = await caches.open(PORTAL_PAGES_CACHE);
            const cachedPage = await pageCache.match(canonicalKey);
            if (cachedPage) return cachedPage;
          }
          // Otherwise generate an interactive Offline Reader backed by cached Bookmarks & Local History
          const fallbackHtml = await buildOfflinePortalFallbackHtml(rawTarget || 'Unknown Portal URL');
          return new Response(fallbackHtml, {
            status: 200,
            headers: {
              'Content-Type': 'text/html; charset=utf-8',
              'X-Serpent-Offline-Cache': 'FALLBACK',
            },
          });
        }
      })(),
    );
    return;
  }

  // Do not cache other live API routes (e.g. Gemini endpoints)
  if (url.pathname.startsWith('/api/')) return;

  // 4. App Navigation requests — Network-First, caching the shell and falling back offline
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const coreCache = await caches.open(CORE_CACHE);
        try {
          const networkRes = await fetch(request);
          if (networkRes && networkRes.ok) {
            coreCache.put(request, networkRes.clone());
            if (url.pathname === '/') {
              coreCache.put('/', networkRes.clone());
            }
          }
          return networkRes;
        } catch {
          return (
            (await coreCache.match(request)) ||
            (await coreCache.match('/?mode=browser')) ||
            (await coreCache.match('/')) ||
            new Response('Serpent Peaks is offline. Reload when connected once to warm the cache.', {
              status: 503,
              headers: { 'Content-Type': 'text/plain; charset=utf-8' },
            })
          );
        }
      })(),
    );
    return;
  }

  // 5. Core Static Assets (JS, CSS, WebGL bundles, Bestiary images, Icons, Manifest) — Stale-While-Revalidate / Cache-First
  event.respondWith(
    caches.open(CORE_CACHE).then(async (cache) => {
      const cached = await cache.match(request);
      const networkFetch = fetch(request)
        .then((response) => {
          if (response && response.ok && response.type === 'basic') {
            cache.put(request, response.clone());
          }
          return response;
        })
        .catch(() => null);

      if (cached) {
        // Revalidate in background while returning cached asset instantaneously
        event.waitUntil(networkFetch);
        return cached;
      }

      const fresh = await networkFetch;
      if (fresh) return fresh;
      return new Response('', { status: 504 });
    }),
  );
});
