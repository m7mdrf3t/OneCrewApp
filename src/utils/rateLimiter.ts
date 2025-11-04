/**
 * Rate Limiter Utility
 * 
 * Provides request throttling, exponential backoff retry, and caching
 * to prevent HTTP 429 (Too Many Requests) errors.
 */

interface RequestCache {
  data: any;
  timestamp: number;
}

class RateLimiter {
  private requestCache: Map<string, RequestCache> = new Map();
  private requestQueue: Map<string, Promise<any>> = new Map();
  private lastRequestTime: Map<string, number> = new Map();
  private readonly CACHE_TTL = 30000; // 30 seconds cache
  private readonly MIN_REQUEST_INTERVAL = 200; // 200ms between requests
  private readonly MAX_RETRIES = 3;
  private readonly INITIAL_RETRY_DELAY = 1000; // 1 second

  /**
   * Get cached response if available and not expired
   */
  private getCached(key: string): any | null {
    const cached = this.requestCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      console.log(`📦 Using cached response for: ${key}`);
      return cached.data;
    }
    return null;
  }

  /**
   * Cache a response
   */
  private setCache(key: string, data: any): void {
    this.requestCache.set(key, {
      data,
      timestamp: Date.now(),
    });
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
   */
  async execute<T>(
    key: string,
    requestFn: () => Promise<T>,
    useCache = true
  ): Promise<T> {
    // Check cache first
    if (useCache) {
      const cached = this.getCached(key);
      if (cached !== null) {
        return cached;
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
          this.setCache(key, result);
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
   * Clear cache for a specific key
   */
  clearCache(key: string): void {
    this.requestCache.delete(key);
  }

  /**
   * Clear all caches
   */
  clearAllCaches(): void {
    this.requestCache.clear();
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

