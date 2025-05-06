// Vercel API route handler

/**
 * Main API handler 
 */
module.exports = async (req, res) => {
  try {
    // Try to load the handler from the compiled main.js file
    const mainModule = require('../public/main.js');
    
    // If there's a default export (handler function), use that
    if (typeof mainModule.default === 'function') {
      console.log('Using default export handler');
      return mainModule.default(req, res);
    }
    
    // No handler found, provide a fallback response
    console.log('No handler found in main.js, using fallback response');
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({
      message: 'Welcome to Ani-API!',
      status: 'online',
      info: 'API is running but using fallback handler',
      timestamp: new Date().toISOString()
    }));
  } catch (error) {
    // Log the error for debugging
    console.error('Error in API handler:', error);
    
    // Return a friendly error response
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({
      message: 'Welcome to Ani-API!',
      status: 'error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'An internal error occurred',
      timestamp: new Date().toISOString()
    }));
  }
}; 