// Standalone Vercel API route

const Fastify = require('fastify');

// Create a new Fastify instance for this request
const createApp = () => {
  const app = Fastify({
    logger: false,
    disableRequestLogging: true
  });

  // Root route
  app.get('/', async (req, reply) => {
    return {
      message: 'Welcome to Ani-API! This is the standalone version.',
      status: 'online',
      documentation: 'API documentation will be available soon.'
    };
  });

  // Test route
  app.get('/test', async (req, reply) => {
    return { status: 'ok', message: 'API is working!' };
  });

  return app;
};

// Export the serverless function
module.exports = async (req, res) => {
  try {
    const app = createApp();
    await app.ready();
    
    app.server.emit('request', req, res);
  } catch (error) {
    console.error('Error in standalone API:', error);
    res.statusCode = 500;
    res.end(JSON.stringify({
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred on the server'
    }));
  }
}; 