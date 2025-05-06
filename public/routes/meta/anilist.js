"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../../providers/index");
const index_2 = require("../../models/index");
const main_1 = require("../../main");
const cache_1 = __importStar(require("../../utils/cache"));
const providers_list_1 = require("../../utils/providers-list");
const aniwatch_1 = require("aniwatch");
const anilist_to_mal_1 = require("../../providers/meta/anilist-to-mal");
const routes = async (fastify, options) => {
    // Initialize the AniList provider
    const anilist = new index_1.META.Anilist();
    const redisCacheTime = 60 * 60; // 1 hour
    const redisPrefix = 'anilist:';
    // AniList root endpoint that shows available routes
    fastify.get('/', (_, reply) => {
        reply.status(200).send({
            intro: 'Welcome to the AniList provider',
            routes: [
                '/{query}',
                '/info/{id}',
                '/episodes/{id}',
                '/trending',
                '/popular',
                '/manga/info/{id}',
                '/manga/{query}',
                '/manga/read',
                '/advanced-search',
                '/airing-schedule',
                '/genre',
                '/recent-episodes',
                '/random-anime',
                '/servers/{id}',
                '/data/{id}',
                '/character/{id}',
                '/watch/{episodeId}',
                '/staff/{id}',
                '/next-epi-sch/{id}'
            ],
            documentation: 'https://docs.ani-api.com/#tag/anilist',
        });
    });
    fastify.get('/watch/:episodeId', async (request, reply) => {
        const episodeId = request.params.episodeId;
        const provider = request.query.provider;
        const server = request.query.server;
        let isDub = request.query.dub;
        if (server && !Object.values(index_2.StreamingServers).includes(server))
            return reply.status(400).send('Invalid server');
        if (isDub === 'true' || isDub === '1')
            isDub = true;
        else
            isDub = false;
        let anilistProvider = generateAnilistMeta(provider);
        try {
            main_1.redis
                ? reply
                    .status(200)
                    .send(await cache_1.default.fetch(main_1.redis, `anilist:watch;${episodeId};${anilistProvider.provider.name.toLowerCase()};${server};${isDub ? 'dub' : 'sub'}`, async () => provider === 'zoro' || provider === 'animekai'
                    ? await anilistProvider.fetchEpisodeSources(episodeId, server, isDub ? index_2.SubOrSub.DUB : index_2.SubOrSub.SUB)
                    : await anilistProvider.fetchEpisodeSources(episodeId, server), 600))
                : reply
                    .status(200)
                    .send(provider === 'zoro' || provider === 'animekai'
                    ? await anilistProvider.fetchEpisodeSources(episodeId, server, isDub ? index_2.SubOrSub.DUB : index_2.SubOrSub.SUB)
                    : await anilistProvider.fetchEpisodeSources(episodeId, server));
            anilistProvider = new index_1.META.Anilist(undefined, {
                url: process.env.PROXY,
            });
        }
        catch (err) {
            reply
                .status(500)
                .send({ message: 'Something went wrong. Contact developer for help.' });
        }
    });
    // Staff info from character id
    fastify.get('/staff/:id', async (request, reply) => {
        const id = request.params.id;
        const anilistProvider = generateAnilistMeta();
        try {
            main_1.redis
                ? reply
                    .status(200)
                    .send(await cache_1.default.fetch(main_1.redis, `anilist:staff;${id}`, async () => await anilistProvider.fetchStaffById(Number(id)), 60 * 60))
                : reply.status(200).send(await anilistProvider.fetchStaffById(Number(id)));
        }
        catch (err) {
            reply.status(404).send({ message: err.message });
        }
    });
    // Character info
    fastify.get('/character/:id', async (request, reply) => {
        const id = request.params.id;
        const anilistProvider = generateAnilistMeta();
        const res = await anilistProvider.fetchCharacterInfoById(id);
        reply.status(200).send(res);
    });
    // Random anime endpoint
    fastify.get('/random-anime', async (request, reply) => {
        const anilistProvider = generateAnilistMeta();
        const res = await anilistProvider.fetchRandomAnime().catch((err) => {
            return reply.status(404).send({ message: 'Anime not found' });
        });
        reply.status(200).send(res);
    });
    // Anilist info without episodes
    fastify.get('/data/:id', async (request, reply) => {
        const id = request.params.id;
        const anilistProvider = generateAnilistMeta();
        const res = await anilistProvider.fetchAnilistInfoById(id);
        reply.status(200).send(res);
    });
    // Anilist info with episodes
    fastify.get('/info/:id', async (request, reply) => {
        const id = request.params.id;
        const today = new Date();
        const dayOfWeek = today.getDay();
        const provider = request.query.provider;
        let fetchFiller = request.query.fetchFiller;
        let isDub = request.query.dub;
        const locale = request.query.locale;
        let anilistProvider = generateAnilistMeta(provider);
        if (isDub === 'true' || isDub === '1')
            isDub = true;
        else
            isDub = false;
        if (fetchFiller === 'true' || fetchFiller === '1')
            fetchFiller = true;
        else
            fetchFiller = false;
        try {
            main_1.redis
                ? reply
                    .status(200)
                    .send(await cache_1.default.fetch(main_1.redis, `anilist:info;${id};${isDub};${fetchFiller};${anilistProvider.provider.name.toLowerCase()}`, async () => anilistProvider.fetchAnimeInfo(id, isDub, fetchFiller), dayOfWeek === 0 || dayOfWeek === 6 ? 60 * 120 : (60 * 60) / 2))
                : reply
                    .status(200)
                    .send(await anilistProvider.fetchAnimeInfo(id, isDub, fetchFiller));
        }
        catch (err) {
            reply.status(500).send({ message: err.message });
        }
    });
    // Anilist servers id
    fastify.get('/servers/:id', async (request, reply) => {
        const id = request.params.id;
        const provider = request.query.provider;
        let anilistProvider = generateAnilistMeta(provider);
        const res = await anilistProvider.fetchEpisodeServers(id);
        anilistProvider = new index_1.META.Anilist();
        reply.status(200).send(res);
    });
    // Anilist recent episodes
    fastify.get('/recent-episodes', async (request, reply) => {
        const provider = request.query.provider || 'gogoanime';
        const page = request.query.page || 1;
        const perPage = request.query.perPage || 20;
        // Convert provider string to the expected type
        const providerType = (provider === 'zoro' || provider === 'gogoanime')
            ? provider
            : 'gogoanime';
        let anilistProvider = generateAnilistMeta(provider);
        try {
            // First attempt with requested provider
            const res = await anilistProvider.fetchRecentEpisodes(providerType, page, perPage);
            return reply.status(200).send(res);
        }
        catch (err) {
            console.error(`Error fetching recent episodes with provider ${provider}:`, err);
            // If the requested provider fails, try with the default provider (gogoanime)
            if (provider !== 'gogoanime') {
                try {
                    console.log("Attempting with fallback provider: gogoanime");
                    anilistProvider = generateAnilistMeta('gogoanime');
                    const res = await anilistProvider.fetchRecentEpisodes('gogoanime', page, perPage);
                    return reply.status(200).send(res);
                }
                catch (fallbackErr) {
                    console.error("Fallback provider also failed:", fallbackErr);
                }
            }
            // If we still have no results, try with other available providers in sequence
            const providers = ['animekai', 'anify', 'animefox', 'animedrive'];
            for (const altProvider of providers) {
                if (altProvider === provider)
                    continue; // Skip if we already tried this provider
                try {
                    console.log(`Attempting with alternative provider: ${altProvider}`);
                    anilistProvider = generateAnilistMeta(altProvider);
                    // Always use gogoanime for fetchRecentEpisodes since it only supports gogoanime or zoro
                    const res = await anilistProvider.fetchRecentEpisodes('gogoanime', page, perPage);
                    return reply.status(200).send(res);
                }
                catch (altErr) {
                    console.error(`Alternative provider ${altProvider} also failed:`, altErr);
                    // Continue to next provider
                }
            }
            // If all providers failed, return an error
            return reply.status(500).send({
                message: "Failed to fetch recent episodes. All providers are currently unavailable.",
                error: err instanceof Error ? err.message : String(err)
            });
        }
    });
    // Anilist genres endpoint
    fastify.get('/genre', async (request, reply) => {
        const genres = request.query.genres;
        const page = request.query.page;
        const perPage = request.query.perPage;
        const anilistProvider = generateAnilistMeta();
        if (typeof genres === 'undefined')
            return reply.status(400).send({ message: 'genres is required' });
        JSON.parse(genres).forEach((genre) => {
            if (!Object.values(index_2.Genres).includes(genre)) {
                return reply.status(400).send({ message: `${genre} is not a valid genre` });
            }
        });
        const res = await anilistProvider.fetchAnimeGenres(JSON.parse(genres), page, perPage);
        reply.status(200).send(res);
    });
    // Anilist schedule endpoint
    fastify.get('/airing-schedule', async (request, reply) => {
        const page = request.query.page;
        const perPage = request.query.perPage;
        const weekStart = request.query.weekStart;
        const weekEnd = request.query.weekEnd;
        const notYetAired = request.query.notYetAired;
        const anilistProvider = generateAnilistMeta();
        const _weekStart = Math.ceil(Date.now() / 1000);
        const res = await anilistProvider.fetchAiringSchedule(page !== null && page !== void 0 ? page : 1, perPage !== null && perPage !== void 0 ? perPage : 20, weekStart !== null && weekStart !== void 0 ? weekStart : _weekStart, weekEnd !== null && weekEnd !== void 0 ? weekEnd : _weekStart + 604800, notYetAired !== null && notYetAired !== void 0 ? notYetAired : true);
        reply.status(200).send(res);
    });
    // AniList search endpoint
    fastify.get('/:query', async (request, reply) => {
        const query = request.params.query;
        const page = Number(request.query.page) || 1;
        const perPage = Number(request.query.perPage) || 20;
        const type = request.query.type;
        try {
            const res = main_1.redis
                ? await cache_1.default.fetch(main_1.redis, `${redisPrefix}search:${query}:${page}:${perPage}:${type || 'all'}`, async () => await anilist.search(query, page, perPage), redisCacheTime)
                : await anilist.search(query, page, perPage);
            reply.status(200).send(res);
        }
        catch (err) {
            reply.status(500).send({
                message: 'Something went wrong. Please try again later.',
                error: err instanceof Error ? err.message : String(err),
            });
        }
    });
    // Anilist advanced search endpoint
    fastify.get('/advanced-search', async (request, reply) => {
        const query = request.query.query;
        const page = request.query.page;
        const perPage = request.query.perPage;
        const type = request.query.type;
        let genres = request.query.genres;
        const id = request.query.id;
        const format = request.query.format;
        let sort = request.query.sort;
        const status = request.query.status;
        const year = request.query.year;
        const season = request.query.season;
        const anilistProvider = generateAnilistMeta();
        if (genres) {
            JSON.parse(genres).forEach((genre) => {
                if (!Object.values(index_2.Genres).includes(genre)) {
                    return reply.status(400).send({ message: `${genre} is not a valid genre` });
                }
            });
            genres = JSON.parse(genres);
        }
        if (sort)
            sort = JSON.parse(sort);
        if (season)
            if (!['WINTER', 'SPRING', 'SUMMER', 'FALL'].includes(season))
                return reply.status(400).send({ message: `${season} is not a valid season` });
        const res = await anilistProvider.advancedSearch(query, type, page, perPage, format, sort, genres, id, year, status, season);
        reply.status(200).send(res);
    });
    fastify.get('/trending', async (request, reply) => {
        const page = request.query.page;
        const perPage = request.query.perPage;
        const anilistProvider = generateAnilistMeta();
        main_1.redis
            ? reply
                .status(200)
                .send(await cache_1.default.fetch(main_1.redis, `anilist:trending;${page};${perPage}`, async () => await anilistProvider.fetchTrendingAnime(page, perPage), 60 * 60))
            : reply.status(200).send(await anilistProvider.fetchTrendingAnime(page, perPage));
    });
    //http://127.0.0.1:3001/api/v1/meta/anilist/episodes/steinsgate-3
    // AniList episodes endpoint
    fastify.get('/episodes/:id', async (request, reply) => {
        const id = decodeURIComponent(request.params.id.trim());
        const anilistInfo = await (0, anilist_to_mal_1.hianimeToAnilist)(Number(id));
        console.log(anilistInfo);
        const fetchFiller = (request.query.fetchFiller || '').toLowerCase() === 'true';
        const dub = (request.query.dub || '').toLowerCase() === 'true';
        try {
            const cacheKey = `${redisPrefix}episodes:${id}:${fetchFiller}:${dub}`;
            const hianime = new aniwatch_1.HiAnime.Scraper();
            const data = await cache_1.HianimeCache.getOrSet(async () => hianime.getEpisodes(id), cacheKey, redisCacheTime);
            reply.status(200).send({ success: true, data });
        }
        catch (err) {
            reply.status(err instanceof Error && err.message.includes('not found') ? 404 : 500).send({
                message: err instanceof Error ? err.message : 'Something went wrong. Please try again later.',
                error: err instanceof Error ? err.message : String(err),
            });
        }
    });
    // AniList popular endpoint
    fastify.get('/popular', async (request, reply) => {
        const page = Number(request.query.page) || 1;
        const perPage = Number(request.query.perPage) || 20;
        const type = request.query.type;
        try {
            const res = main_1.redis
                ? await cache_1.default.fetch(main_1.redis, `${redisPrefix}popular:${page}:${perPage}:${type || 'all'}`, async () => await anilist.fetchPopularAnime(page, perPage), redisCacheTime)
                : await anilist.fetchPopularAnime(page, perPage);
            reply.status(200).send(res);
        }
        catch (err) {
            reply.status(500).send({
                message: 'Something went wrong. Please try again later.',
                error: err instanceof Error ? err.message : String(err),
            });
        }
    });
    // AniList manga search endpoint
    fastify.get('/manga/:query', async (request, reply) => {
        const query = request.params.query;
        const page = Number(request.query.page) || 1;
        const perPage = Number(request.query.perPage) || 20;
        const provider = request.query.provider;
        // Try specific provider if requested
        if (typeof provider !== 'undefined') {
            const possibleProvider = providers_list_1.PROVIDERS_LIST.MANGA.find((p) => p.name.toLowerCase() === provider.toLowerCase());
            if (possibleProvider) {
                console.log(`Trying requested provider: ${possibleProvider.name}`);
                try {
                    const anilistManga = new index_1.META.Anilist.Manga(possibleProvider);
                    const result = await anilistManga.search(query, page, perPage);
                    if (result.results) {
                        result.results = result.results.filter((item) => item.type && item.type.toLowerCase() === 'manga');
                    }
                    return reply.status(200).send(result);
                }
                catch (err) {
                    console.log(`Requested provider ${possibleProvider.name} failed: ${err.message}`);
                    // Fall through to try other providers
                }
            }
        }
        // First check cache for any previously successful result
        if (main_1.redis) {
            try {
                const cached = await main_1.redis.get(`${redisPrefix}manga:search:${query}:${page}:${perPage}:any`);
                if (cached) {
                    console.log("Using cached manga search result");
                    return reply.status(200).send(JSON.parse(cached));
                }
            }
            catch (cacheErr) {
                console.error("Cache error:", cacheErr);
            }
        }
        // Try MangaDex first
        try {
            console.log("Trying default provider: MangaDex");
            const mangadex = providers_list_1.PROVIDERS_LIST.MANGA.find(p => p.name.toLowerCase() === 'mangadex');
            if (mangadex) {
                const anilistManga = new index_1.META.Anilist.Manga(mangadex);
                const result = await anilistManga.search(query, page, perPage);
                if (result.results) {
                    result.results = result.results.filter((item) => item.type && item.type.toLowerCase() === 'manga');
                }
                // Cache the successful result
                if (main_1.redis) {
                    try {
                        await main_1.redis.setex(`${redisPrefix}manga:search:${query}:${page}:${perPage}:any`, redisCacheTime, JSON.stringify(result));
                    }
                    catch (cacheErr) {
                        console.error("Error caching result:", cacheErr);
                    }
                }
                console.log("Success with default provider: MangaDex");
                return reply.status(200).send(result);
            }
        }
        catch (err) {
            console.log(`Default provider MangaDex failed: ${err.message}`);
        }
        // Try remaining providers
        console.log("Trying other available manga providers for search...");
        // Try each provider in sequence
        for (const currentProvider of providers_list_1.PROVIDERS_LIST.MANGA) {
            // Skip MangaDex as we already tried it
            if (currentProvider.name.toLowerCase() === 'mangadex')
                continue;
            try {
                console.log(`Trying provider: ${currentProvider.name}`);
                const anilistManga = new index_1.META.Anilist.Manga(currentProvider);
                const result = await anilistManga.search(query, page, perPage);
                if (result.results) {
                    result.results = result.results.filter((item) => item.type && item.type.toLowerCase() === 'manga');
                }
                // Cache the successful result
                if (main_1.redis) {
                    try {
                        await main_1.redis.setex(`${redisPrefix}manga:search:${query}:${page}:${perPage}:any`, redisCacheTime, JSON.stringify(result));
                    }
                    catch (cacheErr) {
                        console.error("Error caching result:", cacheErr);
                    }
                }
                console.log(`Success with provider: ${currentProvider.name}`);
                return reply.status(200).send(result);
            }
            catch (err) {
                // Just log and continue to next provider
                console.log(`Provider ${currentProvider.name} failed: ${err.message}`);
            }
        }
        // If we get here, all providers failed
        reply.status(404).send({
            message: "No providers could perform the manga search",
            error: "All providers failed"
        });
    });
    // AniList manga info endpoint
    fastify.get('/manga/info/:id', async (request, reply) => {
        const id = request.params.id;
        const provider = request.query.provider;
        // Try specific provider if requested
        if (typeof provider !== 'undefined') {
            const possibleProvider = providers_list_1.PROVIDERS_LIST.MANGA.find((p) => p.name.toLowerCase() === provider.toLowerCase());
            if (possibleProvider) {
                console.log(`Trying requested provider: ${possibleProvider.name}`);
                try {
                    const anilistManga = new index_1.META.Anilist.Manga(possibleProvider);
                    const result = await anilistManga.fetchMangaInfo(id);
                    return reply.status(200).send(result);
                }
                catch (err) {
                    console.log(`Requested provider ${possibleProvider.name} failed: ${err.message}`);
                    // Fall through to try other providers
                }
            }
        }
        // First check cache for any previously successful result
        if (main_1.redis) {
            try {
                const cached = await main_1.redis.get(`${redisPrefix}manga:info:${id}:any`);
                if (cached) {
                    console.log("Using cached manga info result");
                    return reply.status(200).send(JSON.parse(cached));
                }
            }
            catch (cacheErr) {
                console.error("Cache error:", cacheErr);
            }
        }
        // Try MangaDex first
        try {
            console.log("Trying default provider: MangaDex");
            const mangadex = providers_list_1.PROVIDERS_LIST.MANGA.find(p => p.name.toLowerCase() === 'mangadex');
            if (mangadex) {
                const anilistManga = new index_1.META.Anilist.Manga(mangadex);
                const result = await anilistManga.fetchMangaInfo(id);
                // Cache the successful result
                if (main_1.redis) {
                    try {
                        await main_1.redis.setex(`${redisPrefix}manga:info:${id}:any`, redisCacheTime, JSON.stringify(result));
                    }
                    catch (cacheErr) {
                        console.error("Error caching result:", cacheErr);
                    }
                }
                console.log("Success with default provider: MangaDex");
                return reply.status(200).send(result);
            }
        }
        catch (err) {
            console.log(`Default provider MangaDex failed: ${err.message}`);
        }
        // Try remaining providers
        console.log("Trying other available manga providers...");
        // Try each provider in sequence
        for (const currentProvider of providers_list_1.PROVIDERS_LIST.MANGA) {
            // Skip MangaDex as we already tried it
            if (currentProvider.name.toLowerCase() === 'mangadex')
                continue;
            try {
                console.log(`Trying provider: ${currentProvider.name}`);
                const anilistManga = new index_1.META.Anilist.Manga(currentProvider);
                const result = await anilistManga.fetchMangaInfo(id);
                // Cache the successful result
                if (main_1.redis) {
                    try {
                        await main_1.redis.setex(`${redisPrefix}manga:info:${id}:any`, redisCacheTime, JSON.stringify(result));
                    }
                    catch (cacheErr) {
                        console.error("Error caching result:", cacheErr);
                    }
                }
                console.log(`Success with provider: ${currentProvider.name}`);
                return reply.status(200).send(result);
            }
            catch (err) {
                // Just log and continue to next provider
                console.log(`Provider ${currentProvider.name} failed: ${err.message}`);
            }
        }
        // If we get here, all providers failed
        reply.status(404).send({
            message: "No providers could fetch the manga info",
            error: "All providers failed"
        });
    });
    // AniList manga read endpoint
    fastify.get('/manga/read', async (request, reply) => {
        const chapterId = request.query.chapterId;
        const provider = request.query.provider;
        if (typeof chapterId === 'undefined')
            return reply.status(400).send({ message: 'chapterId is required' });
        // Try specific provider if requested
        if (typeof provider !== 'undefined') {
            const possibleProvider = providers_list_1.PROVIDERS_LIST.MANGA.find((p) => p.name.toLowerCase() === provider.toLowerCase());
            if (possibleProvider) {
                console.log(`Trying requested provider: ${possibleProvider.name}`);
                try {
                    const anilistManga = new index_1.META.Anilist.Manga(possibleProvider);
                    const result = await anilistManga.fetchChapterPages(chapterId);
                    return reply.status(200).send(result);
                }
                catch (err) {
                    console.log(`Requested provider ${possibleProvider.name} failed: ${err.message}`);
                    // Fall through to try other providers
                }
            }
        }
        // First check cache for any previously successful result
        if (main_1.redis) {
            try {
                const cached = await main_1.redis.get(`${redisPrefix}manga:read:${chapterId}:any`);
                if (cached) {
                    console.log("Using cached manga chapter pages result");
                    return reply.status(200).send(JSON.parse(cached));
                }
            }
            catch (cacheErr) {
                console.error("Cache error:", cacheErr);
            }
        }
        // Try MangaDex first
        try {
            console.log("Trying default provider: MangaDex");
            const mangadex = providers_list_1.PROVIDERS_LIST.MANGA.find(p => p.name.toLowerCase() === 'mangadex');
            if (mangadex) {
                const anilistManga = new index_1.META.Anilist.Manga(mangadex);
                const result = await anilistManga.fetchChapterPages(chapterId);
                // Cache the successful result
                if (main_1.redis) {
                    try {
                        await main_1.redis.setex(`${redisPrefix}manga:read:${chapterId}:any`, redisCacheTime, JSON.stringify(result));
                    }
                    catch (cacheErr) {
                        console.error("Error caching result:", cacheErr);
                    }
                }
                console.log("Success with default provider: MangaDex");
                return reply.status(200).send(result);
            }
        }
        catch (err) {
            console.log(`Default provider MangaDex failed: ${err.message}`);
        }
        // Try remaining providers
        console.log("Trying other available manga providers for chapter pages...");
        // Try each provider in sequence
        for (const currentProvider of providers_list_1.PROVIDERS_LIST.MANGA) {
            // Skip MangaDex as we already tried it
            if (currentProvider.name.toLowerCase() === 'mangadex')
                continue;
            try {
                console.log(`Trying provider: ${currentProvider.name}`);
                const anilistManga = new index_1.META.Anilist.Manga(currentProvider);
                const result = await anilistManga.fetchChapterPages(chapterId);
                // Cache the successful result
                if (main_1.redis) {
                    try {
                        await main_1.redis.setex(`${redisPrefix}manga:read:${chapterId}:any`, redisCacheTime, JSON.stringify(result));
                    }
                    catch (cacheErr) {
                        console.error("Error caching result:", cacheErr);
                    }
                }
                console.log(`Success with provider: ${currentProvider.name}`);
                return reply.status(200).send(result);
            }
            catch (err) {
                // Just log and continue to next provider
                console.log(`Provider ${currentProvider.name} failed: ${err.message}`);
            }
        }
        // If we get here, all providers failed
        reply.status(404).send({
            message: "No providers could fetch the manga chapter pages",
            error: "All providers failed"
        });
    });
};
// Helper function to generate Anilist instance with provider
const generateAnilistMeta = (provider = undefined) => {
    var _a, _b, _c;
    if (typeof provider !== 'undefined') {
        // Find the right provider based on name
        switch (provider.toLowerCase()) {
            case 'zoro':
                return new index_1.META.Anilist(new index_1.ANIME.Zoro(), {
                    url: process.env.PROXY,
                });
            case '9anime':
                return new index_1.META.Anilist(new index_1.ANIME.NineAnime((_a = process.env) === null || _a === void 0 ? void 0 : _a.NINE_ANIME_HELPER_URL, {
                    url: (_b = process.env) === null || _b === void 0 ? void 0 : _b.NINE_ANIME_PROXY,
                }, (_c = process.env) === null || _c === void 0 ? void 0 : _c.NINE_ANIME_HELPER_KEY), {
                    url: process.env.PROXY,
                });
            case 'gogoanime':
                return new index_1.META.Anilist(new index_1.ANIME.Gogoanime(), {
                    url: process.env.PROXY,
                });
            case 'animepahe':
                return new index_1.META.Anilist(new index_1.ANIME.AnimePahe(), {
                    url: process.env.PROXY,
                });
            case 'animefox':
                return new index_1.META.Anilist(new index_1.ANIME.AnimeFox(), {
                    url: process.env.PROXY,
                });
            case 'animedrive':
                return new index_1.META.Anilist(new index_1.ANIME.AnimeDrive(), {
                    url: process.env.PROXY,
                });
            case 'anify':
                return new index_1.META.Anilist(new index_1.ANIME.Anify(), {
                    url: process.env.PROXY,
                });
            case 'crunchyroll':
                return new index_1.META.Anilist(new index_1.ANIME.Crunchyroll(), {
                    url: process.env.PROXY,
                });
            case 'bilibili':
                return new index_1.META.Anilist(new index_1.ANIME.Bilibili(), {
                    url: process.env.PROXY,
                });
            case 'marin':
                return new index_1.META.Anilist(new index_1.ANIME.Marin(), {
                    url: process.env.PROXY,
                });
            case 'animesaturn':
                return new index_1.META.Anilist(new index_1.ANIME.AnimeSaturn(), {
                    url: process.env.PROXY,
                });
            case 'animeunity':
                return new index_1.META.Anilist(new index_1.ANIME.AnimeUnity(), {
                    url: process.env.PROXY,
                });
            case 'monoschinos':
                return new index_1.META.Anilist(new index_1.ANIME.MonosChinos(), {
                    url: process.env.PROXY,
                });
            case 'anix':
                return new index_1.META.Anilist(new index_1.ANIME.Anix(), {
                    url: process.env.PROXY,
                });
            case 'animekai':
                return new index_1.META.Anilist(new index_1.ANIME.AnimeKai(), {
                    url: process.env.PROXY,
                });
            default:
                // Default to Zoro if provider not supported
                return new index_1.META.Anilist(new index_1.ANIME.Zoro(), {
                    url: process.env.PROXY,
                });
        }
    }
    else {
        // Default provider is Zoro
        return new index_1.META.Anilist(new index_1.ANIME.Zoro(), {
            url: process.env.PROXY,
        });
    }
};
exports.default = routes;
//# sourceMappingURL=anilist.js.map