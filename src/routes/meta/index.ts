import { FastifyRequest, FastifyReply, FastifyInstance, RegisterOptions } from 'fastify';
import anilist from './anilist';
import mal from './mal';

const routes = async (fastify: FastifyInstance, options: RegisterOptions) => {
  // Register individual meta provider routes
  await fastify.register(anilist, { prefix: '/anilist' });
  await fastify.register(mal, { prefix: '/mal' });

  // Meta root endpoint
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
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

export default routes;
