import 'dotenv/config';
import Fastify from 'fastify';
import FastifyCors from '@fastify/cors';
import Redis from 'ioredis';
import meta from './routes/meta';

// Initialize Redis client if environment variables are provided
export const redis =
  process.env.REDIS_HOST &&
  new Redis({
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
    password: process.env.REDIS_PASSWORD,
  });

// Initialize Fastify
const fastify = Fastify({
  maxParamLength: 1000,
  logger: true,
});

// Self-executing async function
(async () => {
  const PORT = Number(process.env.PORT) || 3001;

  // Register CORS middleware
  await fastify.register(FastifyCors, {
    origin: '*',
    methods: 'GET',
  });

  // Register route handlers
  await fastify.register(meta, { prefix: '/api/v1/meta' });

  // Root route
  fastify.get('/', (_, reply) => {
    reply.status(200).send('Welcome to Ani-API! 🎉');
  });

  // 404 handler
  fastify.get('*', (_, reply) => {
    reply.status(404).send({
      message: 'Route not found',
      error: 'Not Found',
    });
  });

  // Start the server
  try {
    fastify.listen({ port: PORT, host: '0.0.0.0' }, (err, address) => {
      if (err) throw err;
      console.log(`Server listening on ${address}`);
    });
  } catch (err: any) {
    fastify.log.error(err);
    process.exit(1);
  }
})();

// For serverless environments (like Vercel)
export default async function handler(req: any, res: any) {
  await fastify.ready();
  fastify.server.emit('request', req, res);
}
