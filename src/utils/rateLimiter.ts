/**
 * Rate Limiter Utility
 * 
 * Provides request throttling, exponential backoff retry, and caching
 * to prevent HTTP 429 (Too Many Requests) errors.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

interface RequestCache {
  data: any;
  timestamp: number;
  ttl?: number; // Optional TTL override
}

// Cache TTL presets for different data types
export enum CacheTTL {
  SHORT = 30000,      // 30 seconds - frequently changing data (notifications, real-time updates)
  MEDIUM = 300000,    // 5 minutes - moderately changing data (user profiles, company members)
  LONG = 1800000,     // 30 minutes - rarely changing data (companies, certifications)
  VERY_LONG = 3600000 // 1 hour - static reference data (services, skills, roles)
}

class RateLimiter {
  private requestCache: Map<string, RequestCache> = new Map();
  private requestQueue: Map<string, Promise<any>> = new Map();
  private lastRequestTime: Map<string, number> = new Map();
  private readonly DEFAULT_CACHE_TTL = CacheTTL.MEDIUM; // Default to 5 minutes
  private readonly MIN_REQUEST_INTERVAL = 200; // 200ms between requests
  private readonly MAX_RETRIES = 3;
  private readonly INITIAL_RETRY_DELAY = 1000; // 1 second
  private readonly PERSISTENT_CACHE_PREFIX = 'cache_';
  private readonly MAX_CACHE_SIZE = 100; // Maximum number of cached items

  /**
   * Get cached response from memory cache if available and not expired
   */
  private getCached(key: string, ttl?: number): any | null {
    const cached = this.requestCache.get(key);
    if (cached) {
      const cacheTTL = ttl || cached.ttl || this.DEFAULT_CACHE_TTL;
      if (Date.now() - cached.timestamp < cacheTTL) {
        console.log(`📦 Using cached response for: ${key}`);
        return cached.data;
      } else {
        // Expired, remove from cache
        this.requestCache.delete(key);
      }
    }
    return null;
  }

  /**
   * Get cached response from persistent storage
   */
  private async getPersistentCache(key: string, ttl?: number): Promise<any | null> {
    try {
      const cacheKey = `${this.PERSISTENT_CACHE_PREFIX}${key}`;
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        const parsed: RequestCache = JSON.parse(cached);
        const cacheTTL = ttl || parsed.ttl || this.DEFAULT_CACHE_TTL;
        if (Date.now() - parsed.timestamp < cacheTTL) {
          console.log(`💾 Using persistent cached response for: ${key}`);
          // Also update memory cache
          this.setCache(key, parsed.data, cacheTTL);
          return parsed.data;
        } else {
          // Expired, remove it
          await AsyncStorage.removeItem(cacheKey);
        }
      }
    } catch (error) {
      console.warn('Failed to read persistent cache:', error);
    }
    return null;
  }

  /**
   * Cache a response in memory
   */
  private setCache(key: string, data: any, ttl?: number): void {
    // Enforce max cache size by removing oldest entries
    if (this.requestCache.size >= this.MAX_CACHE_SIZE) {
      const firstKey = this.requestCache.keys().next().value;
      if (firstKey) {
        this.requestCache.delete(firstKey);
      }
    }

    this.requestCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Cache a response in persistent storage
   */
  private async setPersistentCache(key: string, data: any, ttl?: number): Promise<void> {
    try {
      const cacheKey = `${this.PERSISTENT_CACHE_PREFIX}${key}`;
      await AsyncStorage.setItem(cacheKey, JSON.stringify({
        data,
        timestamp: Date.now(),
        ttl,
      }));
    } catch (error) {
      console.warn('Failed to write persistent cache:', error);
    }
  }

  /**
   * Throttle requests to prevent rate limiting
   */
  private async throttle(key: string): Promise<void> {
    const lastTime = this.lastRequestTime.get(key) || 0;
    const timeSinceLastRequest = Date.now() - lastTime;

    if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
      const waitTime = this.MIN_REQUEST_INTERVAL - timeSinceLastRequest;
      console.log(`⏳ Throttling request for ${key}: waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime.set(key, Date.now());
  }

  /**
   * Execute request with exponential backoff retry
   */
  private async executeWithRetry<T>(
    key: string,
    requestFn: () => Promise<T>,
    retryCount = 0
  ): Promise<T> {
    try {
      return await requestFn();
    } catch (error: any) {
      const isRateLimited = 
        error.status === 429 || 
        error.message?.includes('429') ||
        error.message?.includes('rate limit') ||
        error.message?.includes('Rate limit');

      if (isRateLimited && retryCount < this.MAX_RETRIES) {
        const delay = this.INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
        console.warn(`⚠️ Rate limited (429). Retrying in ${delay}ms (attempt ${retryCount + 1}/${this.MAX_RETRIES})...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        
        return this.executeWithRetry(key, requestFn, retryCount + 1);
      }

      // If rate limited and max retries reached, return empty result
      if (isRateLimited) {
        console.error(`❌ Rate limited after ${this.MAX_RETRIES} retries. Returning empty result.`);
        return [] as any;
      }

      // Re-throw non-rate-limit errors
      throw error;
    }
  }

  /**
   * Execute a request with rate limiting protection
   * @param key - Unique cache key for this request
   * @param requestFn - Function that makes the API call
   * @param options - Cache options (useCache, ttl, persistent)
   */
  async execute<T>(
    key: string,
    requestFn: () => Promise<T>,
    options?: {
      useCache?: boolean;
      ttl?: number;
      persistent?: boolean;
    }
  ): Promise<T> {
    const useCache = options?.useCache !== false;
    const ttl = options?.ttl;
    const persistent = options?.persistent || false;

    // Check memory cache first
    if (useCache) {
      const cached = this.getCached(key, ttl);
      if (cached !== null) {
        return cached;
      }

      // Check persistent cache if enabled
      if (persistent) {
        const persistentCached = await this.getPersistentCache(key, ttl);
        if (persistentCached !== null) {
          return persistentCached;
        }
      }
    }

    // Check if there's already a pending request for this key
    const pendingRequest = this.requestQueue.get(key);
    if (pendingRequest) {
      console.log(`⏳ Waiting for pending request: ${key}`);
      return pendingRequest;
    }

    // Create new request
    const requestPromise = (async () => {
      try {
        // Throttle the request
        await this.throttle(key);

        // Execute with retry logic
        const result = await this.executeWithRetry(key, requestFn);

        // Cache the result
        if (useCache) {
          this.setCache(key, result, ttl);
          if (persistent) {
            await this.setPersistentCache(key, result, ttl);
          }
        }

        return result;
      } finally {
        // Remove from queue when done
        this.requestQueue.delete(key);
      }
    })();

    // Add to queue
    this.requestQueue.set(key, requestPromise);

    return requestPromise;
  }

  /**
   * Clear cache for a specific key (both memory and persistent)
   */
  async clearCache(key: string): Promise<void> {
    this.requestCache.delete(key);
    try {
      await AsyncStorage.removeItem(`${this.PERSISTENT_CACHE_PREFIX}${key}`);
    } catch (error) {
      console.warn('Failed to clear persistent cache:', error);
    }
  }

  /**
   * Clear all caches (both memory and persistent)
   */
  async clearAllCaches(): Promise<void> {
    this.requestCache.clear();
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.PERSISTENT_CACHE_PREFIX));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.warn('Failed to clear persistent caches:', error);
    }
  }

  /**
   * Clear cache by pattern (e.g., all company-related caches)
   */
  async clearCacheByPattern(pattern: string): Promise<void> {
    // Clear from memory cache
    const keysToDelete: string[] = [];
    this.requestCache.forEach((_, key) => {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.requestCache.delete(key));

    // Clear from persistent cache
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(
        key => key.startsWith(this.PERSISTENT_CACHE_PREFIX) && key.includes(pattern)
      );
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.warn('Failed to clear persistent cache by pattern:', error);
    }
  }

  /**
   * Get cache size
   */
  getCacheSize(): number {
    return this.requestCache.size;
  }
}

// Export singleton instance
export const rateLimiter = new RateLimiter();

