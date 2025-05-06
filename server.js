// server.js - Vercel compatible entry point
const path = require('path');

// Ensure we have the correct path to the main.js file
const mainPath = path.join(__dirname, 'public', 'main.js');

// Import the main application
const app = require(mainPath);

// For serverless functions (used by Vercel)
module.exports = async (req, res) => {
  // If there's a handler function available, use it
  if (typeof app.default === 'function') {
    return app.default(req, res);
  }
  
  // Otherwise, return a simple JSON response with API info
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({
    message: 'Welcome to Ani-API!',
    status: 'online',
    documentation: 'API documentation will be available soon.'
  }));
}; 