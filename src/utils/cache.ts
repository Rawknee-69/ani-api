import type { Redis } from 'ioredis';

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

export default cache; 