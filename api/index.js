// Vercel serverless function entry point

// Import the handler from the built main.js file
const { default: handler } = require('../public/main');

module.exports = handler; 