"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const providers_1 = require("../../providers");
const main_1 = require("../../main");
const cache_1 = __importDefault(require("../../utils/cache"));
const routes = async (fastify, options) => {
    // Initialize the MyAnimeList provider
    const mal = new providers_1.META.Myanimelist();
    const redisCacheTime = 60 * 60; // 1 hour
    const redisPrefix = 'mal:';
    // MAL root endpoint that shows available routes
    fastify.get('/', (_, reply) => {
        reply.status(200).send({
            intro: 'Welcome to the MyAnimeList provider',
            routes: ['/{query}', '/info/{id}', '/manga/{query}', '/manga/info/{id}'],
            documentation: 'https://docs.ani-api.com/#tag/myanimelist',
        });
    });
    // MAL anime search endpoint
    fastify.get('/:query', async (request, reply) => {
        const query = request.params.query;
        const page = Number(request.query.page) || 1;
        const type = request.query.type || 'anime';
        try {
            const res = main_1.redis
                ? await cache_1.default.fetch(main_1.redis, `${redisPrefix}search:${query}:${page}:${type}`, async () => {
                    if (type === 'manga') {
                        return await mal.search(query, page);
                    }
                    return await mal.search(query, page);
                }, redisCacheTime)
                : await mal.search(query, page);
            reply.status(200).send(res);
        }
        catch (err) {
            reply.status(500).send({
                message: 'Something went wrong. Please try again later.',
                error: err instanceof Error ? err.message : String(err),
            });
        }
    });
    // MAL anime info endpoint
    fastify.get('/info/:id', async (request, reply) => {
        const id = request.params.id;
        const type = request.query.type || 'anime';
        try {
            const res = main_1.redis
                ? await cache_1.default.fetch(main_1.redis, `${redisPrefix}info:${id}:${type}`, async () => await mal.fetchAnimeInfo(id), redisCacheTime)
                : await mal.fetchAnimeInfo(id);
            reply.status(200).send(res);
        }
        catch (err) {
            reply.status(err instanceof Error && err.message.includes('not found') ? 404 : 500).send({
                message: err instanceof Error ? err.message : 'Something went wrong. Please try again later.',
                error: err instanceof Error ? err.message : String(err),
            });
        }
    });
    // MAL manga search endpoint
    fastify.get('/manga/:query', async (request, reply) => {
        const query = request.params.query;
        const page = Number(request.query.page) || 1;
        try {
            const res = main_1.redis
                ? await cache_1.default.fetch(main_1.redis, `${redisPrefix}manga:search:${query}:${page}`, async () => await mal.search(query, page), redisCacheTime)
                : await mal.search(query, page);
            reply.status(200).send(res);
        }
        catch (err) {
            reply.status(500).send({
                message: 'Something went wrong. Please try again later.',
                error: err instanceof Error ? err.message : String(err),
            });
        }
    });
    // MAL manga info endpoint
    fastify.get('/manga/info/:id', async (request, reply) => {
        const id = request.params.id;
        try {
            const res = main_1.redis
                ? await cache_1.default.fetch(main_1.redis, `${redisPrefix}manga:info:${id}`, async () => await mal.fetchAnimeInfo(id), redisCacheTime)
                : await mal.fetchAnimeInfo(id);
            reply.status(200).send(res);
        }
        catch (err) {
            reply.status(err instanceof Error && err.message.includes('not found') ? 404 : 500).send({
                message: err instanceof Error ? err.message : 'Something went wrong. Please try again later.',
                error: err instanceof Error ? err.message : String(err),
            });
        }
    });
};
exports.default = routes;
//# sourceMappingURL=mal.js.map