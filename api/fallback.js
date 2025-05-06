// Fallback API handler for common routes
const axios = require('axios');

// Simple response generator for meta endpoints
const generateMetaResponse = (type, endpoint, id) => {
  return {
    message: `Fallback API response for ${type}/${endpoint}/${id}`,
    status: 'fallback',
    timestamp: new Date().toISOString(),
    note: 'This is a fallback response. The main API handler is temporarily unavailable.',
    suggestion: 'Please try again later or check the documentation for more information.'
  };
};

// Create a minimal AniList GraphQL client
const fetchFromAniList = async (id) => {
  try {
    // Simple query to get basic anime info
    const query = `
      query ($id: Int) {
        Media(id: $id, type: ANIME) {
          id
          title {
            romaji
            english
            native
          }
          description
          coverImage {
            large
          }
        }
      }
    `;

    const variables = { id: parseInt(id) };
    
    const response = await axios.post('https://graphql.anilist.co', {
      query,
      variables
    });

    if (response.data.errors) {
      throw new Error(response.data.errors[0].message);
    }

    return response.data.data.Media;
  } catch (error) {
    console.error('Error in AniList fallback handler:', error);
    return null;
  }
};

// Main handler function
module.exports = async (req, res) => {
  const url = req.url || '';
  console.log(`Fallback handler processing: ${url}`);

  try {
    // Check for AniList info request
    if (url.includes('/api/v1/meta/anilist/info/')) {
      const parts = url.split('/');
      const id = parts[parts.length - 1];
      
      // Try to fetch real data from AniList
      const animeData = await fetchFromAniList(id);
      
      if (animeData) {
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({
          id: animeData.id,
          title: animeData.title,
          description: animeData.description,
          coverImage: animeData.coverImage?.large,
          message: 'Provided by fallback handler with real AniList data',
          source: 'fallback-handler'
        }));
      }
      
      // Fallback if AniList fetch fails
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify(generateMetaResponse('anilist', 'info', id)));
    }
    
    // Default response for unknown endpoints
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({
      message: 'Fallback API response',
      status: 'fallback',
      path: url,
      timestamp: new Date().toISOString()
    }));
  } catch (error) {
    console.error('Error in fallback handler:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      message: 'Fallback handler error',
      error: 'Internal Server Error',
      status: 'error',
      timestamp: new Date().toISOString()
    }));
  }
}; 