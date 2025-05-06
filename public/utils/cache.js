"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HianimeCache = exports.AniwatchAPICache = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
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
    async fetch(redis, key, fetcher, ttl = 3600) {
        try {
            const cached = await redis.get(key);
            if (cached)
                return JSON.parse(cached);
            const fresh = await fetcher();
            await redis.setex(key, ttl, JSON.stringify(fresh));
            return fresh;
        }
        catch (err) {
            console.error('Redis cache error:', err);
            return await fetcher();
        }
    }
};
class AniwatchAPICache {
    constructor() {
        var _a;
        this.isOptional = true;
        const redisConnURL = (_a = process.env) === null || _a === void 0 ? void 0 : _a.ANIWATCH_API_REDIS_CONN_URL;
        this.isOptional = !Boolean(redisConnURL);
        this._client = this.isOptional ? null : new ioredis_1.default(String(redisConnURL));
    }
    set(key, value) {
        var _a;
        if (this.isOptional)
            return;
        return (_a = this._client) === null || _a === void 0 ? void 0 : _a.set(key, value);
    }
    get(key) {
        var _a;
        if (this.isOptional)
            return;
        return (_a = this._client) === null || _a === void 0 ? void 0 : _a.get(key);
    }
    /**
     * @param expirySeconds set to 60 by default
     */
    async getOrSet(setCB, key, expirySeconds = AniwatchAPICache.DEFAULT_CACHE_EXPIRY_SECONDS) {
        var _a, _b;
        const cachedData = this.isOptional
            ? null
            : (await ((_a = this._client) === null || _a === void 0 ? void 0 : _a.get(key))) || null;
        let data = JSON.parse(String(cachedData));
        if (!data) {
            data = await setCB();
            await ((_b = this._client) === null || _b === void 0 ? void 0 : _b.set(key, JSON.stringify(data), "EX", expirySeconds));
        }
        return data;
    }
}
exports.AniwatchAPICache = AniwatchAPICache;
AniwatchAPICache.DEFAULT_CACHE_EXPIRY_SECONDS = 60;
AniwatchAPICache.CACHE_EXPIRY_HEADER_NAME = "X-ANIWATCH-CACHE-EXPIRY";
// Export both the original cache and the new AniwatchAPICache instance
exports.HianimeCache = new AniwatchAPICache();
exports.default = cache;
//# sourceMappingURL=cache.js.map