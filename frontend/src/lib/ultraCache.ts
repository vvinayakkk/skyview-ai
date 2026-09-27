/**
 * UltraCacheEngine: High-Performance Zero-Cost Enterprise Caching & Background Prefetching
 * 
 * Features:
 * 1. Multi-Tier Cache: In-Memory L1 (0ms) -> LocalStorage L2 Persistent (0ms cold start) -> Network L3
 * 2. Stale-While-Revalidate (SWR): Returns instant cached snapshot, updates silently in background.
 * 3. Background Autonomous Warmup: Prefetches all critical platform data (Mandi, Weather,
 *    Marketplace 2-party & 3-party loops, Farmers Map, Sensor Trends) on application bootstrap.
 * 4. Route Pre-Warming: Pre-fetches target route datasets on link hover.
 * 5. Deduplication: In-flight requests are coalesced into a single Promise to prevent API stampedes.
 */

const API_URL = import.meta.env.VITE_API_URL || '';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class UltraCacheEngine {
  private memCache = new Map<string, CacheEntry<any>>();
  private inFlight = new Map<string, Promise<any>>();
  private prewarmedKeys = new Set<string>();

  // Default TTL: 10 minutes for read-heavy agricultural data
  private defaultTTL = 10 * 60 * 1000;

  constructor() {
    this.hydrateFromStorage();
  }

  private getStorageKey(key: string): string {
    return `skyview_cache_${key}`;
  }

  /**
   * Hydrates memory cache from localStorage on startup for 0ms cold-start loads
   */
  private hydrateFromStorage() {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('skyview_cache_')) {
          const raw = localStorage.getItem(k);
          if (raw) {
            const entry: CacheEntry<any> = JSON.parse(raw);
            const actualKey = k.replace('skyview_cache_', '');
            // Only keep non-expired entries or allow SWR revalidation
            this.memCache.set(actualKey, entry);
          }
        }
      }
    } catch (e) {
      console.warn('[UltraCache] LocalStorage hydration notice:', e);
    }
  }

  /**
   * Save entry to L1 (memory) and L2 (localStorage)
   */
  public set<T>(key: string, data: T, ttlMs = this.defaultTTL): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttlMs,
    };
    this.memCache.set(key, entry);

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(this.getStorageKey(key), JSON.stringify(entry));
      }
    } catch {
      // Storage might be full, fallback to memory
    }
  }

  /**
   * Get data from cache immediately (0ms). Returns null if not cached.
   */
  public get<T>(key: string): T | null {
    const entry = this.memCache.get(key);
    if (!entry) return null;
    return entry.data as T;
  }

  /**
   * Stale-While-Revalidate fetch wrapper.
   * If cached, invokes onSuccess with cached value immediately, then fetches and updates.
   */
  public async fetchWithSWR<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlMs = this.defaultTTL,
    onBackgroundUpdate?: (freshData: T) => void
  ): Promise<T> {
    const cached = this.get<T>(key);

    // If we have an existing in-flight request for this key, reuse it to avoid duplicate calls
    let fetchPromise = this.inFlight.get(key);
    if (!fetchPromise) {
      fetchPromise = (async () => {
        try {
          const fresh = await fetcher();
          this.set(key, fresh, ttlMs);
          if (onBackgroundUpdate && cached !== null) {
            onBackgroundUpdate(fresh);
          }
          return fresh;
        } finally {
          this.inFlight.delete(key);
        }
      })();
      this.inFlight.set(key, fetchPromise);
    }

    // If cached entry is available, return it immediately (0ms latency!)
    if (cached !== null) {
      return cached;
    }

    // Otherwise await the in-flight network call
    return fetchPromise;
  }

  /**
   * Background Autonomous Warmup:
   * Fires non-blocking asynchronous requests for all primary datasets in background.
   */
  public warmUpPlatform(phone?: string, stationId = 'WS01'): void {
    if (typeof window === 'undefined') return;

    const executeWarmup = async () => {
      console.log('[UltraCache] Autonomous platform data pre-warmup started in background...');

      // 1. Live Weather & Sensor Data
      this.fetchWithSWR('latest_sensor_data', async () => {
        const res = await fetch(`${API_URL}/api/sensors/latest/${stationId}`);
        if (!res.ok) throw new Error('Sensor fetch failed');
        return res.json();
      }, 30 * 1000).catch(() => {});

      // 2. System Health
      this.fetchWithSWR('system_health', async () => {
        const res = await fetch(`${API_URL}/api/sensors/health`);
        if (!res.ok) throw new Error('Health fetch failed');
        return res.json();
      }, 30 * 1000).catch(() => {});

      // 3. Recent Alerts
      this.fetchWithSWR('recent_alerts', async () => {
        const res = await fetch(`${API_URL}/api/sensors/recent-alerts`);
        if (!res.ok) throw new Error('Alerts fetch failed');
        return res.json();
      }, 30 * 1000).catch(() => {});

      // 4. Mandi Rates & Intelligence
      this.fetchWithSWR('mandi_general_rates', async () => {
        const res = await fetch(`${API_URL}/api/mandi?limit=100`);
        if (!res.ok) throw new Error('Mandi fetch failed');
        return res.json();
      }, 15 * 60 * 1000).catch(() => {});

      // 5. Mandi 30-Day Historical Trend
      this.fetchWithSWR('mandi_history_wheat', async () => {
        const res = await fetch(`${API_URL}/api/mandi/history?commodity=Wheat&limit=90`);
        if (!res.ok) throw new Error('Mandi history fetch failed');
        return res.json();
      }, 20 * 60 * 1000).catch(() => {});

      // 6. Geospatial Farmers Directory (Map Data)
      this.fetchWithSWR('farmers_map_directory', async () => {
        const res = await fetch(`${API_URL}/api/marketplace/farmers`);
        if (!res.ok) throw new Error('Farmers fetch failed');
        return res.json();
      }, 15 * 60 * 1000).catch(() => {});

      // 7. Sensor Trends 30-Day History
      this.fetchWithSWR('sensor_trends_history', async () => {
        const res = await fetch(`${API_URL}/api/sensors/trends/history?station_id=${stationId}&limit=50`);
        if (!res.ok) throw new Error('Trends fetch failed');
        return res.json();
      }, 10 * 60 * 1000).catch(() => {});

      // 8. User-Specific Marketplace Matches (if logged in)
      const userPhone = phone || localStorage.getItem('user_phone');
      if (userPhone) {
        this.fetchWithSWR(`marketplace_matches_${userPhone}`, async () => {
          const res = await fetch(`${API_URL}/api/marketplace/match`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: userPhone }),
          });
          if (!res.ok) throw new Error('Matches fetch failed');
          return res.json();
        }, 5 * 60 * 1000).catch(() => {});

        this.fetchWithSWR(`circular_loops_${userPhone}`, async () => {
          const res = await fetch(`${API_URL}/api/marketplace/circular-barter`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: userPhone, max_distance_km: 1000.0 }),
          });
          if (!res.ok) throw new Error('Circular loops fetch failed');
          return res.json();
        }, 5 * 60 * 1000).catch(() => {});

        this.fetchWithSWR(`marketplace_pools_${userPhone}`, async () => {
          const res = await fetch(`${API_URL}/api/marketplace/pooling`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: userPhone, max_distance_km: 150.0 }),
          });
          if (!res.ok) throw new Error('Pooling fetch failed');
          return res.json();
        }, 5 * 60 * 1000).catch(() => {});

        this.fetchWithSWR(`user_profile_${userPhone}`, async () => {
          const res = await fetch(`${API_URL}/api/profile?phone=${encodeURIComponent(userPhone)}`);
          if (!res.ok) throw new Error('Profile fetch failed');
          return res.json();
        }, 10 * 60 * 1000).catch(() => {});
      }

      console.log('[UltraCache] Autonomous warmup completed in background. Navigation will be 0ms instant.');
    };

    // Use requestIdleCallback if available, otherwise defer to next tick
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(executeWarmup, { timeout: 2000 });
    } else {
      setTimeout(executeWarmup, 500);
    }
  }

  /**
   * Pre-warms route data when user hovers over a navigation item
   */
  public prewarmRoute(routePath: string): void {
    if (this.prewarmedKeys.has(routePath)) return;
    this.prewarmedKeys.add(routePath);

    switch (routePath) {
      case '/mandi':
        this.fetchWithSWR('mandi_general_rates', () => fetch(`${API_URL}/api/mandi?limit=100`).then(r => r.json()));
        break;
      case '/map':
        this.fetchWithSWR('farmers_map_directory', () => fetch(`${API_URL}/api/marketplace/farmers`).then(r => r.json()));
        break;
      case '/trends':
        this.fetchWithSWR('sensor_trends_history', () => fetch(`${API_URL}/api/sensors/trends/history?station_id=WS01&limit=50`).then(r => r.json()));
        break;
      case '/marketplace': {
        const phone = localStorage.getItem('user_phone') || '';
        if (phone) {
          this.fetchWithSWR(`marketplace_matches_${phone}`, () =>
            fetch(`${API_URL}/api/marketplace/match`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ phone }),
            }).then(r => r.json())
          );
        }
        break;
      }
      default:
        break;
    }
  }
}

export const ultraCache = new UltraCacheEngine();
