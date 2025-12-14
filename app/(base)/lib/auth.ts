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
export async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
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
  
  return fetch(url, {
    ...options,
    headers,
  });
}

export default getLocalUserId;
