import { FastifyRequest, FastifyReply, FastifyInstance, RegisterOptions } from 'fastify';
import { META } from '../../providers/index';
import { redis } from '../../main';
import type { Redis } from 'ioredis';
import cache from '../../utils/cache';

const routes = async (fastify: FastifyInstance, options: RegisterOptions) => {
  // Initialize the AniList provider
  const anilist = new META.Anilist();
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
      ],
      documentation: 'https://docs.ani-api.com/#tag/anilist',
    });
  });

  // AniList search endpoint
  fastify.get('/:query', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = (request.params as { query: string }).query;
    const page = Number((request.query as { page?: string }).page) || 1;
    const perPage = Number((request.query as { perPage?: string }).perPage) || 20;
    const type = (request.query as { type?: string }).type;

    try {
      const res = redis
        ? await cache.fetch(
            redis as Redis,
            `${redisPrefix}search:${query}:${page}:${perPage}:${type || 'all'}`,
            async () => await anilist.search(query, page, perPage),
            redisCacheTime
          )
        : await anilist.search(query, page, perPage);

      reply.status(200).send(res);
    } catch (err) {
      reply.status(500).send({
        message: 'Something went wrong. Please try again later.',
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });

  // AniList anime info endpoint
  fastify.get('/info/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const id = (request.params as { id: string }).id;

    try {
      const res = redis
        ? await cache.fetch(
            redis as Redis,
            `${redisPrefix}info:${id}`,
            async () => await anilist.fetchAnimeInfo(id),
            redisCacheTime
          )
        : await anilist.fetchAnimeInfo(id);

      reply.status(200).send(res);
    } catch (err) {
      reply.status(err instanceof Error && err.message.includes('not found') ? 404 : 500).send({
        message: err instanceof Error ? err.message : 'Something went wrong. Please try again later.',
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });

  // AniList episodes endpoint
  fastify.get('/episodes/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const id = (request.params as { id: string }).id;
    const fetchFiller =
      ((request.query as { fetchFiller?: string }).fetchFiller || '').toLowerCase() === 'true';
    const dub = ((request.query as { dub?: string }).dub || '').toLowerCase() === 'true';

    try {
      const res = redis
        ? await cache.fetch(
            redis as Redis,
            `${redisPrefix}episodes:${id}:${fetchFiller}:${dub}`,
            async () => {
              const info = await anilist.fetchAnimeInfo(id);
              return {
                id,
                title: info.title,
                episodes: await anilist.fetchEpisodesListById(id, dub, fetchFiller),
              };
            },
            redisCacheTime
          )
        : {
            id,
            title: (await anilist.fetchAnimeInfo(id)).title,
            episodes: await anilist.fetchEpisodesListById(id, dub, fetchFiller),
          };

      reply.status(200).send(res);
    } catch (err) {
      reply.status(err instanceof Error && err.message.includes('not found') ? 404 : 500).send({
        message: err instanceof Error ? err.message : 'Something went wrong. Please try again later.',
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });

  // AniList trending endpoint
  fastify.get('/trending', async (request: FastifyRequest, reply: FastifyReply) => {
    const page = Number((request.query as { page?: string }).page) || 1;
    const perPage = Number((request.query as { perPage?: string }).perPage) || 20;
    const type = (request.query as { type?: string }).type;

    try {
      const res = redis
        ? await cache.fetch(
            redis as Redis,
            `${redisPrefix}trending:${page}:${perPage}:${type || 'all'}`,
            async () => await anilist.fetchTrendingAnime(page, perPage),
            redisCacheTime
          )
        : await anilist.fetchTrendingAnime(page, perPage);

      reply.status(200).send(res);
    } catch (err) {
      reply.status(500).send({
        message: 'Something went wrong. Please try again later.',
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });

  // AniList popular endpoint
  fastify.get('/popular', async (request: FastifyRequest, reply: FastifyReply) => {
    const page = Number((request.query as { page?: string }).page) || 1;
    const perPage = Number((request.query as { perPage?: string }).perPage) || 20;
    const type = (request.query as { type?: string }).type;

    try {
      const res = redis
        ? await cache.fetch(
            redis as Redis,
            `${redisPrefix}popular:${page}:${perPage}:${type || 'all'}`,
            async () => await anilist.fetchPopularAnime(page, perPage),
            redisCacheTime
          )
        : await anilist.fetchPopularAnime(page, perPage);

      reply.status(200).send(res);
    } catch (err) {
      reply.status(500).send({
        message: 'Something went wrong. Please try again later.',
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });

  // AniList manga info endpoint
  fastify.get('/manga/info/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const id = (request.params as { id: string }).id;

    try {
      const res = redis
        ? await cache.fetch(
            redis as Redis,
            `${redisPrefix}manga:info:${id}`,
            async () => {
              const info = await anilist.fetchAnimeInfo(id);
              return info;
            },
            redisCacheTime
          )
        : await anilist.fetchAnimeInfo(id);

      reply.status(200).send(res);
    } catch (err) {
      reply.status(err instanceof Error && err.message.includes('not found') ? 404 : 500).send({
        message: err instanceof Error ? err.message : 'Something went wrong. Please try again later.',
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });

  // AniList manga search endpoint
  fastify.get('/manga/:query', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = (request.params as { query: string }).query;
    const page = Number((request.query as { page?: string }).page) || 1;
    const perPage = Number((request.query as { perPage?: string }).perPage) || 20;

    try {
      const res = redis
        ? await cache.fetch(
            redis as Redis,
            `${redisPrefix}manga:search:${query}:${page}:${perPage}`,
            async () => await anilist.search(query, page, perPage),
            redisCacheTime
          )
        : await anilist.search(query, page, perPage);

      if (res.results) {
        res.results = res.results.filter((item: any) => item.type && item.type.toLowerCase() === 'manga');
      }

      reply.status(200).send(res);
    } catch (err) {
      reply.status(500).send({
        message: 'Something went wrong. Please try again later.',
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });
};

export default routes;
