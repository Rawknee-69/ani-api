// Vercel API route handler

/**
 * Main API handler 
 */
module.exports = async (req, res) => {
  try {
    console.log(`Handling request for: ${req.url}`);
    
    // Ensure path params are properly preserved
    // URL rewriting is happening in vercel.json, so the API handler
    // needs to preserve the original path when forwarding the request
    
    // Try to load the handler from the compiled main.js file
    const mainModule = require('../public/main.js');
    
    // If there's a default export (handler function), use that
    if (typeof mainModule.default === 'function') {
      console.log('Using default export handler');
      
      // Forward to the main handler
      return mainModule.default(req, res);
    }
    
    // No handler found, provide a fallback response based on the path
    console.log('No handler found in main.js, using fallback response');
    
    // Check if requesting a meta route (e.g., /api/v1/meta/anilist/info/21)
    if (req.url.includes('/api/v1/meta/')) {
      const parts = req.url.split('/');
      const metaType = parts[4] || 'unknown'; // anilist, mal, etc.
      const action = parts[5] || 'unknown';   // info, search, etc.
      const id = parts[6] || 'unknown';       // anime ID
      
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({
        message: `Meta request for ${metaType}/${action}/${id}`,
        status: 'error',
        error: 'API handler not properly initialized. Please try again later.',
        timestamp: new Date().toISOString(),
        path: req.url,
        solution: 'Please contact the administrator. The server might need to be restarted.'
      }));
    }
    
    // Default fallback response
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({
      message: 'Welcome to Ani-API!',
      status: 'online',
      info: 'API is running but using fallback handler',
      timestamp: new Date().toISOString(),
      path: req.url
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
      path: req.url,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      timestamp: new Date().toISOString()
    }));
  }
}; 