import { FastifyRequest, FastifyReply, FastifyInstance, RegisterOptions } from 'fastify';
import { META } from '../../providers';
import { redis } from '../../main';
import type { Redis } from 'ioredis';
import cache from '../../utils/cache';

const routes = async (fastify: FastifyInstance, options: RegisterOptions) => {
  // Initialize the MyAnimeList provider
  const mal = new META.Myanimelist();
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
  fastify.get('/:query', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = (request.params as { query: string }).query;
    const page = Number((request.query as { page?: string }).page) || 1;
    const type = (request.query as { type?: string }).type || 'anime';

    try {
      const res = redis
        ? await cache.fetch(
            redis as Redis,
            `${redisPrefix}search:${query}:${page}:${type}`,
            async () => {
              if (type === 'manga') {
                return await mal.search(query, page);
              }
              return await mal.search(query, page);
            },
            redisCacheTime
          )
        : await mal.search(query, page);

      reply.status(200).send(res);
    } catch (err) {
      reply.status(500).send({
        message: 'Something went wrong. Please try again later.',
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });

  // MAL anime info endpoint
  fastify.get('/info/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const id = (request.params as { id: string }).id;
    const type = (request.query as { type?: string }).type || 'anime';

    try {
      const res = redis
        ? await cache.fetch(
            redis as Redis,
            `${redisPrefix}info:${id}:${type}`,
            async () => await mal.fetchAnimeInfo(id),
            redisCacheTime
          )
        : await mal.fetchAnimeInfo(id);

      reply.status(200).send(res);
    } catch (err) {
      reply.status(err instanceof Error && err.message.includes('not found') ? 404 : 500).send({
        message: err instanceof Error ? err.message : 'Something went wrong. Please try again later.',
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });

  // MAL manga search endpoint
  fastify.get('/manga/:query', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = (request.params as { query: string }).query;
    const page = Number((request.query as { page?: string }).page) || 1;

    try {
      const res = redis
        ? await cache.fetch(
            redis as Redis,
            `${redisPrefix}manga:search:${query}:${page}`,
            async () => await mal.search(query, page),
            redisCacheTime
          )
        : await mal.search(query, page);

      reply.status(200).send(res);
    } catch (err) {
      reply.status(500).send({
        message: 'Something went wrong. Please try again later.',
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });

  // MAL manga info endpoint
  fastify.get('/manga/info/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const id = (request.params as { id: string }).id;

    try {
      const res = redis
        ? await cache.fetch(
            redis as Redis,
            `${redisPrefix}manga:info:${id}`,
            async () => await mal.fetchAnimeInfo(id),
            redisCacheTime
          )
        : await mal.fetchAnimeInfo(id);

      reply.status(200).send(res);
    } catch (err) {
      reply.status(err instanceof Error && err.message.includes('not found') ? 404 : 500).send({
        message: err instanceof Error ? err.message : 'Something went wrong. Please try again later.',
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });
};

export default routes;
