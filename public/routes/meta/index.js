"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const anilist_1 = __importDefault(require("./anilist"));
const mal_1 = __importDefault(require("./mal"));
const routes = async (fastify, options) => {
    // Register individual meta provider routes
    await fastify.register(anilist_1.default, { prefix: '/anilist' });
    await fastify.register(mal_1.default, { prefix: '/mal' });
    // Meta root endpoint
    fastify.get('/', async (request, reply) => {
        reply.status(200).send({
            intro: 'Welcome to the Ani-API Meta Provider',
            routes: [
                '/anilist/{query}',
                '/anilist/info/{id}',
                '/anilist/episodes/{id}',
                '/anilist/trending',
                '/anilist/popular',
                '/anilist/manga/info/{id}',
                '/anilist/manga/{query}',
                '/mal/{query}',
                '/mal/info/{id}',
                '/mal/manga/{query}',
                '/mal/manga/info/{id}'
            ],
            providers: ['AniList', 'MyAnimeList'],
        });
    });
};
exports.default = routes;
//# sourceMappingURL=index.js.map