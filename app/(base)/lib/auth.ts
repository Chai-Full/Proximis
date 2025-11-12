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

export default getLocalUserId;
