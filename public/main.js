"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redis = void 0;
exports.default = handler;
require("dotenv/config");
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const ioredis_1 = __importDefault(require("ioredis"));
const meta_1 = __importDefault(require("./routes/meta"));
// Initialize Redis client if environment variables are provided
exports.redis = process.env.REDIS_HOST &&
    new ioredis_1.default({
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT),
        password: process.env.REDIS_PASSWORD,
    });
// Initialize Fastify
const fastify = (0, fastify_1.default)({
    maxParamLength: 1000,
    logger: true,
});
// Self-executing async function
(async () => {
    const PORT = Number(process.env.PORT) || 3001;
    // Register CORS middleware
    await fastify.register(cors_1.default, {
        origin: '*',
        methods: 'GET',
    });
    // Register route handlers
    await fastify.register(meta_1.default, { prefix: '/api/v1/meta' });
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
            if (err)
                throw err;
            console.log(`Server listening on ${address}`);
        });
    }
    catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
})();
// For serverless environments (like Vercel)
async function handler(req, res) {
    await fastify.ready();
    fastify.server.emit('request', req, res);
}
//# sourceMappingURL=main.js.map