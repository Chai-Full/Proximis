import { useState, useEffect, useRef } from 'react';

type CacheEntry<T> = {
  data: T;
  timestamp: number;
  userId: number | string | null;
};

// Global cache storage (in-memory)
const cache = new Map<string, CacheEntry<any>>();

// Cache TTL: 5 minutes
const CACHE_TTL_MS = 5 * 60 * 1000;

interface UseCachedDataOptions<T> {
  cacheKey: string;
  fetchFn: () => Promise<T>;
  enabled?: boolean;
  userId?: number | string | null; // To invalidate cache when user changes
  dependencies?: any[]; // Additional dependencies to invalidate cache
}

/**
 * Hook to fetch data with caching
 * - Displays cached data immediately if available
 * - Fetches fresh data in the background
 * - Updates UI when fresh data arrives
 */
export function useCachedData<T>({
  cacheKey,
  fetchFn,
  enabled = true,
  userId = null,
  dependencies = [],
}: UseCachedDataOptions<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isStale, setIsStale] = useState<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!enabled) {
      setData(null);
      setLoading(false);
      setIsStale(false);
      return;
    }

    // When enabled becomes true, set loading to true immediately if no data yet
    if (data === null) {
      setLoading(true);
    }

    // Create dependency key for cache invalidation
    const depKey = JSON.stringify(dependencies);
    const fullCacheKey = `${cacheKey}_${userId}_${depKey}`;

    // Check cache first
    const cached = cache.get(fullCacheKey);
    const now = Date.now();
    const isCacheValid = 
      cached && 
      cached.userId === userId &&
      (now - cached.timestamp) < CACHE_TTL_MS;

    if (isCacheValid && cached) {
      // Display cached data immediately
      setData(cached.data);
      setLoading(false);
      setIsStale(false);
    } else if (data === null) {
      // No valid cache and no data yet, show loading
      setLoading(true);
    }

    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new AbortController for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Fetch fresh data
    const fetchData = async () => {
      try {
        const freshData = await fetchFn();
        
        if (abortController.signal.aborted) return;

        // Update cache
        cache.set(fullCacheKey, {
          data: freshData,
          timestamp: now,
          userId,
        });

        // Update state
        setData(freshData);
        setLoading(false);
        setIsStale(false);
      } catch (error: any) {
        if (error.name === 'AbortError') {
          return;
        }
        
        if (!abortController.signal.aborted) {
          console.error(`Error fetching data for ${cacheKey}:`, error);
          // If we have cached data, keep showing it even if fetch fails
          if (!isCacheValid && cached) {
            setData(cached.data);
            setIsStale(true);
          } else {
            setData(null);
          }
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      abortController.abort();
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
    };
  }, [enabled, userId, cacheKey, ...dependencies]);

  return { data, loading, isStale };
}

/**
 * Clear cache for a specific key or all cache
 */
export function clearCache(cacheKey?: string) {
  if (cacheKey) {
    // Clear all entries that start with this key
    const keysToDelete: string[] = [];
    cache.forEach((_, key) => {
      if (key.startsWith(cacheKey)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => cache.delete(key));
  } else {
    // Clear all cache
    cache.clear();
  }
}

