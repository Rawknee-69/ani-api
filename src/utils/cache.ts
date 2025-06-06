import Redis from 'ioredis';
import { config } from "dotenv";

config();

/**
 * Cache utility for Redis
 */
const cache = {
  /**
   * Fetches data from Redis cache or executes the fetcher function and caches the result
   * @param redis Redis client
   * @param key Cache key
   * @param fetcher Function to fetch data if not in cache
   * @param ttl Time to live in seconds (default: 1 hour)
   * @returns The cached or freshly fetched data
   */
  async fetch<T>(redis: Redis, key: string, fetcher: () => Promise<T>, ttl: number = 3600): Promise<T> {
    try {
      const cached = await redis.get(key);
      if (cached) return JSON.parse(cached);
      
      const fresh = await fetcher();
      await redis.setex(key, ttl, JSON.stringify(fresh));
      return fresh;
    } catch (err) {
      console.error('Redis cache error:', err);
      return await fetcher();
    }
  }
};

export class AniwatchAPICache {
    private _client: Redis | null;
    public isOptional: boolean = true;

    static DEFAULT_CACHE_EXPIRY_SECONDS = 60 as const;
    static CACHE_EXPIRY_HEADER_NAME = "X-ANIWATCH-CACHE-EXPIRY" as const;

    constructor() {
        const redisConnURL = process.env?.ANIWATCH_API_REDIS_CONN_URL;
        this.isOptional = !Boolean(redisConnURL);
        this._client = this.isOptional ? null : new Redis(String(redisConnURL));
    }

    set(key: string | Buffer, value: string | Buffer | number) {
        if (this.isOptional) return;
        return this._client?.set(key, value);
    }

    get(key: string | Buffer) {
        if (this.isOptional) return;
        return this._client?.get(key);
    }

    /**
     * @param expirySeconds set to 60 by default
     */
    async getOrSet<T>(
        setCB: () => Promise<T>,
        key: string | Buffer,
        expirySeconds: number = AniwatchAPICache.DEFAULT_CACHE_EXPIRY_SECONDS
    ) {
        const cachedData = this.isOptional
            ? null
            : (await this._client?.get(key)) || null;
        let data = JSON.parse(String(cachedData)) as T;

        if (!data) {
            data = await setCB();
            await this._client?.set(
                key,
                JSON.stringify(data),
                "EX",
                expirySeconds
            );
        }
        return data;
    }
}

// Export both the original cache and the new AniwatchAPICache instance
export const HianimeCache = new AniwatchAPICache();
export default cache; 