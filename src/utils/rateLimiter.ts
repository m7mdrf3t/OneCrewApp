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

interface CacheStatistics {
  memoryCacheSize: number;
  memoryCacheMaxSize: number;
  pendingRequests: number;
  cacheHits: number;
  cacheMisses: number;
  cacheEvictions: number;
  hitRate: number;
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
  
  // Cache statistics
  private cacheHits = 0;
  private cacheMisses = 0;
  private cacheEvictions = 0;

  /**
   * Get cached response from memory cache if available and not expired
   */
  private getCached(key: string, ttl?: number): any | null {
    const cached = this.requestCache.get(key);
    if (cached) {
      const cacheTTL = ttl || cached.ttl || this.DEFAULT_CACHE_TTL;
      if (Date.now() - cached.timestamp < cacheTTL) {
        this.cacheHits++;
        console.log(`📦 Using cached response for: ${key}`);
        return cached.data;
      } else {
        // Expired, remove from cache
        this.requestCache.delete(key);
        this.cacheMisses++;
      }
    } else {
      this.cacheMisses++;
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
        this.cacheEvictions++;
        console.log(`🗑️ Cache eviction: removed ${firstKey} (cache at max size: ${this.MAX_CACHE_SIZE})`);
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
   * Check if error is a rate limit error
   */
  private isRateLimitError(error: any): boolean {
    return (
      error?.status === 429 ||
      error?.statusCode === 429 ||
      error?.response?.status === 429 ||
      error?.message?.includes('429') ||
      error?.message?.toLowerCase().includes('rate limit') ||
      error?.message?.toLowerCase().includes('too many requests')
    );
  }

  /**
   * Extract rate limit information from error or headers
   */
  private getRateLimitInfo(error: any): { retryAfter?: number; message: string } {
    let retryAfter: number | undefined;
    let message = 'Too many requests. Please wait a moment before trying again.';

    // Try to extract Retry-After header
    if (error?.response?.headers) {
      const retryAfterHeader = error.response.headers['retry-after'] || error.response.headers['Retry-After'];
      if (retryAfterHeader) {
        retryAfter = parseInt(retryAfterHeader, 10) * 1000; // Convert to milliseconds
        message = `Too many requests. Please wait ${Math.ceil(retryAfter / 1000)} seconds before trying again.`;
      }
    }

    // Check for rate limit message in error
    if (error?.message) {
      const retryMatch = error.message.match(/retry[_\s-]?after[:\s]+(\d+)/i);
      if (retryMatch) {
        retryAfter = parseInt(retryMatch[1], 10) * 1000;
        message = `Too many requests. Please wait ${Math.ceil(retryAfter / 1000)} seconds before trying again.`;
      }
    }

    return { retryAfter, message };
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
      const isRateLimited = this.isRateLimitError(error);

      if (isRateLimited && retryCount < this.MAX_RETRIES) {
        const rateLimitInfo = this.getRateLimitInfo(error);
        // Use Retry-After header if available, otherwise use exponential backoff
        const delay = rateLimitInfo.retryAfter || (this.INITIAL_RETRY_DELAY * Math.pow(2, retryCount));
        
        console.warn(`⚠️ Rate limited (429). ${rateLimitInfo.message} Retrying in ${Math.ceil(delay / 1000)}s (attempt ${retryCount + 1}/${this.MAX_RETRIES})...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        
        return this.executeWithRetry(key, requestFn, retryCount + 1);
      }

      // If rate limited and max retries reached, enhance error with user-friendly message
      if (isRateLimited) {
        const rateLimitInfo = this.getRateLimitInfo(error);
        const enhancedError = new Error(rateLimitInfo.message);
        (enhancedError as any).statusCode = 429;
        (enhancedError as any).status = 429;
        (enhancedError as any).isRateLimit = true;
        (enhancedError as any).retryAfter = rateLimitInfo.retryAfter;
        console.error(`❌ Rate limited after ${this.MAX_RETRIES} retries. ${rateLimitInfo.message}`);
        throw enhancedError;
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

  /**
   * Get cache statistics
   */
  getCacheStatistics(): CacheStatistics {
    const totalRequests = this.cacheHits + this.cacheMisses;
    const hitRate = totalRequests > 0 ? (this.cacheHits / totalRequests) * 100 : 0;

    return {
      memoryCacheSize: this.requestCache.size,
      memoryCacheMaxSize: this.MAX_CACHE_SIZE,
      pendingRequests: this.requestQueue.size,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      cacheEvictions: this.cacheEvictions,
      hitRate: Math.round(hitRate * 100) / 100, // Round to 2 decimal places
    };
  }

  /**
   * Reset cache statistics
   */
  resetCacheStatistics(): void {
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.cacheEvictions = 0;
  }

  /**
   * Get list of all cached keys
   */
  getCachedKeys(): string[] {
    return Array.from(this.requestCache.keys());
  }

  /**
   * Get cache entry age in milliseconds
   */
  getCacheEntryAge(key: string): number | null {
    const cached = this.requestCache.get(key);
    if (cached) {
      return Date.now() - cached.timestamp;
    }
    return null;
  }
}

// Export singleton instance
export const rateLimiter = new RateLimiter();

