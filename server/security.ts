import dns from 'node:dns/promises';
import net from 'node:net';

export const ALLOWED_PROXY_PORTS = new Set<number>([80, 443, 8080, 8443]);
export const MAX_PROXY_REDIRECTS = 5;
export const MAX_PROXY_HTML_BYTES = 750_000;
export const MAX_PROXY_TEXT_BYTES = 350_000;
export const PROXY_TIMEOUT_MS = 9_000;

export interface ProxyUrlValidationResult {
  ok: boolean;
  url?: URL;
  reason?: string;
  statusCode?: number;
}

export interface HostLookupResult {
  ok: boolean;
  addresses: string[];
  reason?: string;
}

/**
 * Normalize an IPv4-mapped IPv6 address (e.g. `::ffff:127.0.0.1` or `::ffff:7f00:1`)
 * down to dotted-quad IPv4 when possible so IPv4 private-range checks catch it.
 */
export function extractMappedIpv4(rawIp: string): string | null {
  const lower = rawIp.trim().toLowerCase().replace(/^\[|\]$/g, '');
  if (!lower.startsWith('::ffff:')) return null;
  const tail = lower.slice(7);
  if (net.isIPv4(tail)) return tail;
  const hexParts = tail.split(':');
  if (hexParts.length === 2 && /^[0-9a-f]{1,4}$/.test(hexParts[0]) && /^[0-9a-f]{1,4}$/.test(hexParts[1])) {
    const hi = parseInt(hexParts[0], 16);
    const lo = parseInt(hexParts[1], 16);
    return `${(hi >> 8) & 255}.${hi & 255}.${(lo >> 8) & 255}.${lo & 255}`;
  }
  return null;
}

/**
 * Returns true if the supplied IPv4 or IPv6 literal belongs to any loopback,
 * private RFC1918, link-local / cloud metadata, CGNAT, multicast, broadcast,
 * ULA, or unspecified reserved range.
 */
export function isPrivateOrReservedIp(rawIp: string): boolean {
  const cleaned = rawIp.trim().toLowerCase().replace(/^\[|\]$/g, '');
  if (!cleaned) return true;

  // Strip IPv6 zone identifier if present (e.g. fe80::1%eth0)
  const ip = cleaned.split('%')[0];
  const mappedV4 = extractMappedIpv4(ip);
  if (mappedV4) {
    return isPrivateOrReservedIp(mappedV4);
  }

  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map((p) => Number(p));
    if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
      return true;
    }
    const [a, b, c] = parts;
    if (a === 0) return true; // 0.0.0.0/8 "this network"
    if (a === 10) return true; // 10.0.0.0/8 RFC1918
    if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
    if (a === 127) return true; // 127.0.0.0/8 loopback
    if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local & cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 RFC1918
    if (a === 192 && b === 0 && (c === 0 || c === 2)) return true; // 192.0.0.0/24 & TEST-NET-1
    if (a === 192 && b === 168) return true; // 192.168.0.0/16 RFC1918
    if (a === 198 && (b === 18 || b === 19)) return true; // 198.18.0.0/15 benchmark
    if (a === 198 && b === 51 && c === 100) return true; // TEST-NET-2
    if (a === 203 && b === 0 && c === 113) return true; // TEST-NET-3
    if (a >= 224) return true; // 224.0.0.0/4 multicast + 240.0.0.0/4 reserved + 255.255.255.255
    return false;
  }

  if (net.isIPv6(ip)) {
    if (ip === '::' || ip === '::1') return true;
    const firstHextetStr = ip.split(':')[0] || '0';
    const firstHextet = parseInt(firstHextetStr, 16);
    if (Number.isNaN(firstHextet)) return true;
    if ((firstHextet & 0xfe00) === 0xfc00) return true; // fc00::/7 Unique Local Address
    if ((firstHextet & 0xffc0) === 0xfe80) return true; // fe80::/10 Link-Local
    if ((firstHextet & 0xffc0) === 0xfec0) return true; // fec0::/10 Deprecated Site-Local
    if ((firstHextet & 0xff00) === 0xff00) return true; // ff00::/8 Multicast
    if (firstHextet === 0x2001 && ip.startsWith('2001:db8')) return true; // Documentation
    if (firstHextet === 0x0064 && ip.startsWith('64:ff9b:')) return true; // NAT64 well-known prefix
    return false;
  }

  // Unparseable IP literal -> block defensively
  return true;
}

/**
 * Detects alternate numeric IPv4 hostnames (decimal 2130706433, octal 0177.0.0.1, hex 0x7f000001)
 * and reserved internal host suffixes.
 */
export function isBlockedHostnameSyntax(rawHost: string): boolean {
  const host = rawHost.trim().toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
  if (!host) return true;
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host.endsWith('.home.arpa') ||
    host === 'metadata.google.internal' ||
    host === 'metadata'
  ) {
    return true;
  }
  // Reject integer / hex / octal single-label IP representations
  if (/^\d+$/.test(host) || /^0x[0-9a-f]+$/i.test(host)) {
    return true;
  }
  // Reject dotted octal/hex IPv4 obfuscation (e.g. 0177.0.0.1, 0x7f.0.0.1)
  if (/^(?:0[0-7]+|0x[0-9a-f]+|\d+)(?:\.(?:0[0-7]+|0x[0-9a-f]+|\d+)){1,3}$/i.test(host)) {
    if (!net.isIPv4(host)) return true;
  }
  if (net.isIP(host) !== 0) {
    return isPrivateOrReservedIp(host);
  }
  return false;
}

/**
 * Synchronous syntactic validation of an outbound proxy URL before DNS resolution.
 */
export function validateProxyUrl(rawUrl: string): ProxyUrlValidationResult {
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed.length > 2048) {
    return { ok: false, reason: 'Invalid or missing URL.', statusCode: 400 };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, reason: 'Invalid URL format.', statusCode: 400 };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return {
      ok: false,
      reason: 'Only HTTP and HTTPS destinations are permitted.',
      statusCode: 400,
    };
  }

  if (parsed.username || parsed.password) {
    return {
      ok: false,
      reason: 'Embedded credentials in proxy URLs are not permitted.',
      statusCode: 400,
    };
  }

  const effectivePort = parsed.port
    ? Number(parsed.port)
    : parsed.protocol === 'https:'
      ? 443
      : 80;
  if (!Number.isInteger(effectivePort) || !ALLOWED_PROXY_PORTS.has(effectivePort)) {
    return {
      ok: false,
      reason: 'Target port is restricted by proxy security policy.',
      statusCode: 403,
    };
  }

  if (isBlockedHostnameSyntax(parsed.hostname)) {
    return {
      ok: false,
      reason: 'Access to private, loopback, or internal network destinations is restricted.',
      statusCode: 403,
    };
  }

  return { ok: true, url: parsed };
}

export type DnsLookupFn = (
  hostname: string,
  options: { all: true },
) => Promise<Array<{ address: string; family: number }>>;

/**
 * Resolves DNS for a destination host and verifies EVERY returned A / AAAA record
 * is publicly routable (blocks private/loopback/metadata IPs & DNS rebinding).
 */
export async function resolveAndValidateHost(
  hostname: string,
  lookupFn: DnsLookupFn = (h, opts) => dns.lookup(h, opts),
): Promise<HostLookupResult> {
  const cleanHost = hostname.trim().toLowerCase().replace(/^\[|\]$/g, '');
  if (isBlockedHostnameSyntax(cleanHost)) {
    return {
      ok: false,
      addresses: [],
      reason: 'Hostname is restricted by network isolation policy.',
    };
  }

  if (net.isIP(cleanHost) !== 0) {
    if (isPrivateOrReservedIp(cleanHost)) {
      return {
        ok: false,
        addresses: [],
        reason: 'Private or reserved IP addresses are blocked.',
      };
    }
    return { ok: true, addresses: [cleanHost] };
  }

  try {
    const records = await lookupFn(cleanHost, { all: true });
    if (!Array.isArray(records) || records.length === 0) {
      return { ok: false, addresses: [], reason: 'Unable to resolve destination host.' };
    }
    const addresses: string[] = [];
    for (const rec of records) {
      if (!rec?.address || isPrivateOrReservedIp(rec.address)) {
        return {
          ok: false,
          addresses: [],
          reason: 'Destination resolved to a restricted private or local network address.',
        };
      }
      addresses.push(rec.address);
    }
    return { ok: true, addresses };
  } catch {
    return { ok: false, addresses: [], reason: 'DNS resolution failed for destination host.' };
  }
}

/**
 * Streams a Fetch Response body with a strict hard byte limit so oversized upstream
 * payloads abort immediately instead of exhausting server memory.
 */
export async function readResponseBodyWithLimit(
  response: globalThis.Response,
  maxBytes: number,
): Promise<{ text: string; bytesRead: number; truncated: boolean }> {
  const contentLengthHeader = response.headers.get('content-length');
  if (contentLengthHeader) {
    const declared = Number(contentLengthHeader);
    if (Number.isFinite(declared) && declared > maxBytes * 4) {
      try {
        await response.body?.cancel();
      } catch {
        // ignore cancel error
      }
      throw new Error('ERR_UPSTREAM_PAYLOAD_TOO_LARGE');
    }
  }

  if (!response.body) {
    const fallback = await response.text();
    const buf = Buffer.from(fallback, 'utf8');
    const truncated = buf.byteLength > maxBytes;
    const text = truncated ? buf.subarray(0, maxBytes).toString('utf8') : fallback;
    return { text, bytesRead: Math.min(buf.byteLength, maxBytes), truncated };
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  let truncated = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value || value.byteLength === 0) continue;

      const remaining = maxBytes - totalBytes;
      if (value.byteLength >= remaining) {
        if (remaining > 0) {
          chunks.push(value.subarray(0, remaining));
          totalBytes += remaining;
        }
        truncated = true;
        await reader.cancel().catch(() => undefined);
        break;
      }

      chunks.push(value);
      totalBytes += value.byteLength;
    }
  } finally {
    reader.releaseLock();
  }

  const combined = Buffer.concat(chunks, totalBytes);
  return {
    text: combined.toString('utf8'),
    bytesRead: totalBytes,
    truncated,
  };
}

export interface SafeRedirectFetchOptions {
  headers: Record<string, string>;
  signal?: AbortSignal;
  maxRedirects?: number;
  lookupFn?: DnsLookupFn;
  fetchFn?: typeof fetch;
}

/**
 * Fetches an external HTTP/HTTPS URL using manual redirect handling so EVERY
 * hop is re-validated syntactically and via DNS before connecting.
 */
export async function fetchWithSafeRedirects(
  initialUrl: string,
  options: SafeRedirectFetchOptions,
): Promise<{ response: globalThis.Response; finalUrl: string; redirectCount: number }> {
  const maxRedirects = options.maxRedirects ?? MAX_PROXY_REDIRECTS;
  const fetchFn = options.fetchFn ?? fetch;
  let currentUrl = initialUrl;

  for (let hop = 0; hop <= maxRedirects; hop += 1) {
    const validated = validateProxyUrl(currentUrl);
    if (!validated.ok || !validated.url) {
      const err = new Error(validated.reason || 'Blocked destination URL.') as Error & {
        statusCode?: number;
      };
      err.statusCode = validated.statusCode ?? 403;
      throw err;
    }

    const dnsCheck = await resolveAndValidateHost(validated.url.hostname, options.lookupFn);
    if (!dnsCheck.ok) {
      const err = new Error(dnsCheck.reason || 'Blocked destination address.') as Error & {
        statusCode?: number;
      };
      err.statusCode = 403;
      throw err;
    }

    const response = await fetchFn(validated.url.toString(), {
      method: 'GET',
      redirect: 'manual',
      signal: options.signal,
      headers: options.headers,
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      try {
        await response.body?.cancel();
      } catch {
        // ignore cancel error
      }
      if (!location) {
        return { response, finalUrl: validated.url.toString(), redirectCount: hop };
      }
      if (hop >= maxRedirects) {
        const err = new Error('Too many redirects.') as Error & { statusCode?: number };
        err.statusCode = 502;
        throw err;
      }
      try {
        currentUrl = new URL(location, validated.url).toString();
      } catch {
        const err = new Error('Invalid redirect location.') as Error & { statusCode?: number };
        err.statusCode = 502;
        throw err;
      }
      continue;
    }

    return { response, finalUrl: validated.url.toString(), redirectCount: hop };
  }

  const err = new Error('Too many redirects.') as Error & { statusCode?: number };
  err.statusCode = 502;
  throw err;
}

/**
 * Lightweight in-memory sliding-window per-client rate limiter with bounded key map.
 */
export class SlidingWindowRateLimiter {
  private readonly buckets = new Map<string, number[]>();
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private readonly maxKeys: number;

  constructor(maxRequests: number, windowMs: number, maxKeys = 2000) {
    this.maxRequests = Math.max(1, maxRequests);
    this.windowMs = Math.max(1000, windowMs);
    this.maxKeys = Math.max(50, maxKeys);
  }

  public check(key: string, now = Date.now()): {
    allowed: boolean;
    remaining: number;
    retryAfterSec: number;
  } {
    const safeKey = key || 'unknown';
    const cutoff = now - this.windowMs;
    const existing = this.buckets.get(safeKey);
    const active = existing ? existing.filter((ts) => ts > cutoff) : [];

    if (active.length >= this.maxRequests) {
      const oldest = active[0] ?? now;
      const retryAfterMs = Math.max(1000, oldest + this.windowMs - now);
      this.buckets.set(safeKey, active);
      return {
        allowed: false,
        remaining: 0,
        retryAfterSec: Math.ceil(retryAfterMs / 1000),
      };
    }

    active.push(now);
    this.buckets.set(safeKey, active);

    // Opportunistic bound cleanup so unbounded IPs cannot grow memory forever
    if (this.buckets.size > this.maxKeys) {
      for (const [k, list] of this.buckets.entries()) {
        if (list.length === 0 || list[list.length - 1] <= cutoff) {
          this.buckets.delete(k);
        }
        if (this.buckets.size <= this.maxKeys * 0.75) break;
      }
    }

    return {
      allowed: true,
      remaining: Math.max(0, this.maxRequests - active.length),
      retryAfterSec: 0,
    };
  }
}

/**
 * Simple UTC daily quota tracker for server-side AI endpoints to prevent API abuse.
 */
export class DailyBudgetTracker {
  private dayKey = '';
  private used = 0;
  private readonly dailyLimit: number;

  constructor(dailyLimit: number) {
    this.dailyLimit = Math.max(1, dailyLimit);
  }

  private utcDay(now: number): string {
    return new Date(now).toISOString().slice(0, 10);
  }

  public consume(now = Date.now()): { allowed: boolean; remaining: number } {
    const today = this.utcDay(now);
    if (this.dayKey !== today) {
      this.dayKey = today;
      this.used = 0;
    }
    if (this.used >= this.dailyLimit) {
      return { allowed: false, remaining: 0 };
    }
    this.used += 1;
    return { allowed: true, remaining: Math.max(0, this.dailyLimit - this.used) };
  }
}

/**
 * Short-TTL LRU response cache for AI endpoints to deduplicate repeated prompts.
 */
export class ShortTtlCache<T> {
  private readonly store = new Map<string, { value: T; expiresAt: number }>();
  private readonly ttlMs: number;
  private readonly maxEntries: number;

  constructor(ttlMs = 30_000, maxEntries = 120) {
    this.ttlMs = ttlMs;
    this.maxEntries = maxEntries;
  }

  public get(key: string, now = Date.now()): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= now) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  public set(key: string, value: T, now = Date.now()): void {
    this.store.set(key, { value, expiresAt: now + this.ttlMs });
    if (this.store.size > this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey !== undefined) this.store.delete(oldestKey);
    }
  }
}

/**
 * Resolves an explicit trusted parent origin for postMessage targeting instead of wildcard '*'.
 */
export function resolveTrustedParentOrigin(
  originHeader: string | undefined,
  refererHeader: string | undefined,
  hostHeader: string | undefined,
  protocol: string,
): string {
  for (const candidate of [originHeader, refererHeader]) {
    if (!candidate) continue;
    try {
      const parsed = new URL(candidate);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return parsed.origin;
      }
    } catch {
      // ignore invalid header
    }
  }
  if (hostHeader && /^[a-z0-9.-]+(?::\d{1,5})?$/i.test(hostHeader.trim())) {
    const safeProto = protocol === 'https' ? 'https' : 'http';
    return `${safeProto}://${hostHeader.trim()}`;
  }
  return 'http://localhost:3000';
}
