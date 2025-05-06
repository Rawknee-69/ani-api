// Standalone Vercel API route
const Fastify = require('fastify');
const axios = require('axios');

// Create a simple wrapper for external AniList API
const fetchFromAniList = async (id) => {
  try {
    // Use the AniList GraphQL API to fetch anime information
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
          bannerImage
          genres
          episodes
          status
          averageScore
          season
          seasonYear
          format
          studios {
            nodes {
              name
            }
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

    const media = response.data.data.Media;
    return {
      id: media.id,
      title: media.title,
      description: media.description,
      coverImage: media.coverImage.large,
      bannerImage: media.bannerImage,
      genres: media.genres,
      episodes: media.episodes,
      status: media.status,
      rating: media.averageScore / 10,
      season: media.season,
      year: media.seasonYear,
      format: media.format,
      studios: media.studios.nodes.map(node => node.name)
    };
  } catch (error) {
    console.error('Error fetching from AniList:', error);
    throw error;
  }
};

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

  // AniList info route (for paths like /api/v1/meta/anilist/info/21)
  app.get('/api/v1/meta/anilist/info/:id', async (req, reply) => {
    try {
      const id = req.params.id;
      const animeInfo = await fetchFromAniList(id);
      
      return {
        id: animeInfo.id,
        title: animeInfo.title,
        description: animeInfo.description,
        coverImage: animeInfo.coverImage,
        bannerImage: animeInfo.bannerImage,
        genres: animeInfo.genres,
        episodes: animeInfo.episodes,
        status: animeInfo.status,
        rating: animeInfo.rating,
        season: animeInfo.season,
        year: animeInfo.year,
        format: animeInfo.format,
        studios: animeInfo.studios,
        message: 'Success from standalone API handler',
        source: 'direct-anilist-graphql'
      };
    } catch (error) {
      reply.status(500);
      return {
        message: 'Error fetching anime info from AniList',
        error: error.message,
        status: 'error'
      };
    }
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