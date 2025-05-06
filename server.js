// server.js - Vercel compatible entry point

// Import the server module
const { default: handler } = require('./public/main.js');

// Export the handler for Vercel
module.exports = handler; 