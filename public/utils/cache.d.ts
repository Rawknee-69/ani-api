import Redis from 'ioredis';
/**
 * Cache utility for Redis
 */
declare const cache: {
    /**
     * Fetches data from Redis cache or executes the fetcher function and caches the result
     * @param redis Redis client
     * @param key Cache key
     * @param fetcher Function to fetch data if not in cache
     * @param ttl Time to live in seconds (default: 1 hour)
     * @returns The cached or freshly fetched data
     */
    fetch<T>(redis: Redis, key: string, fetcher: () => Promise<T>, ttl?: number): Promise<T>;
};
export declare class AniwatchAPICache {
    private _client;
    isOptional: boolean;
    static DEFAULT_CACHE_EXPIRY_SECONDS: 60;
    static CACHE_EXPIRY_HEADER_NAME: "X-ANIWATCH-CACHE-EXPIRY";
    constructor();
    set(key: string | Buffer, value: string | Buffer | number): Promise<"OK"> | undefined;
    get(key: string | Buffer): Promise<string | null> | undefined;
    /**
     * @param expirySeconds set to 60 by default
     */
    getOrSet<T>(setCB: () => Promise<T>, key: string | Buffer, expirySeconds?: number): Promise<T>;
}
export declare const HianimeCache: AniwatchAPICache;
export default cache;
