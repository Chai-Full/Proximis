// Small helper to safely read the logged-in user id from localStorage
export function getLocalUserId(): number | null {
  try {
    const v = typeof window !== 'undefined' ? window.localStorage.getItem('proximis_userId') : null;
    if (!v) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  } catch (e) {
    return null;
  }
}

/**
 * Get JWT token from localStorage
 */
export function getLocalToken(): string | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage.getItem('proximis_token') : null;
  } catch (e) {
    return null;
  }
}

/**
 * Check if user is authenticated (has valid token)
 */
export function isAuthenticated(): boolean {
  const token = getLocalToken();
  return token !== null && token.length > 0;
}

/**
 * Get authorization header for API requests
 */
export function getAuthHeader(): { Authorization: string } | {} {
  const token = getLocalToken();
  if (!token) {
    return {};
  }
  return { Authorization: `Bearer ${token}` };
}

/**
 * Fetch with authentication headers
 * Automatically includes JWT token in Authorization header
 */
// Simple GET response cache to avoid re-fetching the same data on every navigation
const responseCache = new Map<string, { expires: number; buffer: ArrayBuffer; status: number; statusText: string; headers: [string, string][] }>();
// Increase TTL to reduce repeated fetches across quick navigations
const DEFAULT_CACHE_TTL_MS = 120_000;

export async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const method = (options.method || 'GET').toUpperCase();
  const isCacheable = method === 'GET';

  const token = getLocalToken();
  const headers = new Headers(options.headers);
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  // Set Content-Type if not already set and body is JSON
  if (options.body && typeof options.body === 'string' && !headers.has('Content-Type')) {
    try {
      JSON.parse(options.body);
      headers.set('Content-Type', 'application/json');
    } catch {
      // Not JSON, skip
    }
  }

  const cacheKey = `${method}:${url}`;

  // Serve from cache when available and fresh
  if (isCacheable) {
    const cached = responseCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return new Response(cached.buffer.slice(0), {
        status: cached.status,
        statusText: cached.statusText,
        headers: new Headers(cached.headers),
      });
    }
  }
  
  const res = await fetch(url, {
    ...options,
    headers,
  });

  // Cache successful GET responses
  if (isCacheable && res.ok) {
    const clone = res.clone();
    const buffer = await clone.arrayBuffer();
    responseCache.set(cacheKey, {
      expires: Date.now() + DEFAULT_CACHE_TTL_MS,
      buffer,
      status: clone.status,
      statusText: clone.statusText,
      headers: Array.from(clone.headers.entries()),
    });
  }

  return res;
}

export default getLocalUserId;
