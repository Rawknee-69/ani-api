import { FastifyRequest, FastifyReply, FastifyInstance, RegisterOptions } from 'fastify';
import { META, ANIME, MANGA } from '../../providers/index';
import { StreamingServers, SubOrSub, Genres } from '../../models/index';
import Anilist from '../../providers/meta/anilist';
import { redis } from '../../main';
import type { Redis } from 'ioredis';
import cache , { HianimeCache } from '../../utils/cache';
import { PROVIDERS_LIST } from '../../utils/providers-list';
import { HiAnime } from 'aniwatch';

const routes = async (fastify: FastifyInstance, options: RegisterOptions) => {
  // Initialize the AniList provider
  const anilist = new META.Anilist();
  const redisCacheTime = 60 * 60; // 1 hour
  const redisPrefix = 'anilist:';

  // AniList root endpoint that shows available routes
  fastify.get('/', (_, reply) => {
    reply.status(200).send({
      intro: 'Welcome to the AniList provider',
      routes: [
        '/{query}',
        '/info/{id}',
        '/episodes/{id}',
        '/trending',
        '/popular',
        '/manga/info/{id}',
        '/manga/{query}',
        '/manga/read',
        '/advanced-search',
        '/airing-schedule',
        '/genre',
        '/recent-episodes',
        '/random-anime',
        '/servers/{id}',
        '/data/{id}',
        '/character/{id}',
        '/watch/{episodeId}',
        '/staff/{id}',
        '/next-epi-sch/{id}'
      ],
      documentation: 'https://docs.ani-api.com/#tag/anilist',
    });
  });

  fastify.get(
    '/watch/:episodeId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const episodeId = (request.params as { episodeId: string }).episodeId;
      const provider = (request.query as { provider?: string }).provider;
      const server = (request.query as { server?: StreamingServers }).server;
      let isDub = (request.query as { dub?: string | boolean }).dub;

      if (server && !Object.values(StreamingServers).includes(server))
        return reply.status(400).send('Invalid server');

      if (isDub === 'true' || isDub === '1') isDub = true;
      else isDub = false;

      let anilistProvider = generateAnilistMeta(provider);

      try {
        redis
          ? reply
            .status(200)
            .send(
              await cache.fetch(
                redis,
                `anilist:watch;${episodeId};${anilistProvider.provider.name.toLowerCase()};${server};${isDub ? 'dub' : 'sub'}`,
                async () =>
                  provider === 'zoro' || provider === 'animekai'
                    ? await anilistProvider.fetchEpisodeSources(
                      episodeId,
                      server,
                      isDub ? SubOrSub.DUB : SubOrSub.SUB,
                    )
                    : await anilistProvider.fetchEpisodeSources(episodeId, server),
                600,
              ),
            )
          : reply
            .status(200)
            .send(
              provider === 'zoro' || provider === 'animekai'
                ? await anilistProvider.fetchEpisodeSources(
                  episodeId,
                  server,
                  isDub ? SubOrSub.DUB : SubOrSub.SUB,
                )
                : await anilistProvider.fetchEpisodeSources(episodeId, server),
            );

        anilistProvider = new META.Anilist(undefined, {
          url: process.env.PROXY as string | string[],
        });
      } catch (err) {
        reply
          .status(500)
          .send({ message: 'Something went wrong. Contact developer for help.' });
      }
    },
  );

  // Staff info from character id
  fastify.get('/staff/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const id = (request.params as { id: string }).id;

    const anilistProvider = generateAnilistMeta();
    try {
      redis
        ? reply
          .status(200)
          .send(
            await cache.fetch(
              redis,
              `anilist:staff;${id}`,
              async () => await anilistProvider.fetchStaffById(Number(id)),
              60 * 60,
            ),
          )
        : reply.status(200).send(await anilistProvider.fetchStaffById(Number(id)));
    } catch (err: any) {
      reply.status(404).send({ message: err.message });
    }
  });

  // Character info
    fastify.get('/character/:id', async (request: FastifyRequest, reply: FastifyReply) => {
      const id = (request.params as { id: string }).id;
  
    const anilistProvider = generateAnilistMeta();
    const res = await anilistProvider.fetchCharacterInfoById(id);
  
      reply.status(200).send(res);
    });
  
  // Random anime endpoint
  fastify.get('/random-anime', async (request: FastifyRequest, reply: FastifyReply) => {
    const anilistProvider = generateAnilistMeta();

    const res = await anilistProvider.fetchRandomAnime().catch((err) => {
      return reply.status(404).send({ message: 'Anime not found' });
    });
    reply.status(200).send(res);
  });

  // Anilist info without episodes
  fastify.get('/data/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const id = (request.params as { id: string }).id;

    const anilistProvider = generateAnilistMeta();
    const res = await anilistProvider.fetchAnilistInfoById(id);

    reply.status(200).send(res);
  });

  // Anilist info with episodes
  fastify.get('/info/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const id = (request.params as { id: string }).id;
    const today = new Date();
    const dayOfWeek = today.getDay();
    const provider = (request.query as { provider?: string }).provider;
    let fetchFiller = (request.query as { fetchFiller?: string | boolean }).fetchFiller;
    let isDub = (request.query as { dub?: string | boolean }).dub;
    const locale = (request.query as { locale?: string }).locale;

    let anilistProvider = generateAnilistMeta(provider);

    if (isDub === 'true' || isDub === '1') isDub = true;
    else isDub = false;

    if (fetchFiller === 'true' || fetchFiller === '1') fetchFiller = true;
    else fetchFiller = false;

    try {
      redis
        ? reply
          .status(200)
          .send(
            await cache.fetch(
              redis,
              `anilist:info;${id};${isDub};${fetchFiller};${anilistProvider.provider.name.toLowerCase()}`,
              async () =>
                anilistProvider.fetchAnimeInfo(id, isDub as boolean, fetchFiller as boolean),
              dayOfWeek === 0 || dayOfWeek === 6 ? 60 * 120 : (60 * 60) / 2,
            ),
          )
        : reply
          .status(200)
          .send(
            await anilistProvider.fetchAnimeInfo(id, isDub as boolean, fetchFiller as boolean),
          );
    } catch (err: any) {
      reply.status(500).send({ message: err.message });
    }
  });

  // Anilist servers id
  fastify.get('/servers/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const id = (request.params as { id: string }).id;
    const provider = (request.query as { provider?: string }).provider;

    let anilistProvider = generateAnilistMeta(provider);

    const res = await anilistProvider.fetchEpisodeServers(id);

    anilistProvider = new META.Anilist();
    reply.status(200).send(res);
  });

  // Anilist recent episodes
  fastify.get(
    '/recent-episodes',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const provider = (request.query as { provider: string }).provider || 'gogoanime';
      const page = (request.query as { page: number }).page || 1;
      const perPage = (request.query as { perPage: number }).perPage || 20;

      // Convert provider string to the expected type
      const providerType = (provider === 'zoro' || provider === 'gogoanime') 
        ? provider as 'gogoanime' | 'zoro'
        : 'gogoanime';

      let anilistProvider = generateAnilistMeta(provider);
      
      try {
        // First attempt with requested provider
        const res = await anilistProvider.fetchRecentEpisodes(providerType, page, perPage);
        return reply.status(200).send(res);
      } catch (err) {
        console.error(`Error fetching recent episodes with provider ${provider}:`, err);
        
        // If the requested provider fails, try with the default provider (gogoanime)
        if (provider !== 'gogoanime') {
          try {
            console.log("Attempting with fallback provider: gogoanime");
            anilistProvider = generateAnilistMeta('gogoanime');
            const res = await anilistProvider.fetchRecentEpisodes('gogoanime', page, perPage);
            return reply.status(200).send(res);
          } catch (fallbackErr) {
            console.error("Fallback provider also failed:", fallbackErr);
          }
        }
        
        // If we still have no results, try with other available providers in sequence
        const providers = ['animekai', 'anify', 'animefox', 'animedrive'];
        
        for (const altProvider of providers) {
          if (altProvider === provider) continue; // Skip if we already tried this provider
          
          try {
            console.log(`Attempting with alternative provider: ${altProvider}`);
            anilistProvider = generateAnilistMeta(altProvider);
            // Always use gogoanime for fetchRecentEpisodes since it only supports gogoanime or zoro
            const res = await anilistProvider.fetchRecentEpisodes('gogoanime', page, perPage);
            return reply.status(200).send(res);
          } catch (altErr) {
            console.error(`Alternative provider ${altProvider} also failed:`, altErr);
            // Continue to next provider
          }
        }
        
        // If all providers failed, return an error
        return reply.status(500).send({
          message: "Failed to fetch recent episodes. All providers are currently unavailable.",
          error: err instanceof Error ? err.message : String(err)
        });
      }
    },
  );

  // Anilist genres endpoint
  fastify.get('/genre', async (request: FastifyRequest, reply: FastifyReply) => {
    const genres = (request.query as { genres: string }).genres;
    const page = (request.query as { page: number }).page;
    const perPage = (request.query as { perPage: number }).perPage;

    const anilistProvider = generateAnilistMeta();

    if (typeof genres === 'undefined')
      return reply.status(400).send({ message: 'genres is required' });

    JSON.parse(genres).forEach((genre: string) => {
      if (!Object.values(Genres).includes(genre as Genres)) {
        return reply.status(400).send({ message: `${genre} is not a valid genre` });
      }
    });

    const res = await anilistProvider.fetchAnimeGenres(JSON.parse(genres), page, perPage);

    reply.status(200).send(res);
  });

  // Anilist schedule endpoint
  fastify.get(
    '/airing-schedule',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const page = (request.query as { page: number }).page;
      const perPage = (request.query as { perPage: number }).perPage;
      const weekStart = (request.query as { weekStart: number | string }).weekStart;
      const weekEnd = (request.query as { weekEnd: number | string }).weekEnd;
      const notYetAired = (request.query as { notYetAired: boolean }).notYetAired;

      const anilistProvider = generateAnilistMeta();
      const _weekStart = Math.ceil(Date.now() / 1000);

      const res = await anilistProvider.fetchAiringSchedule(
        page ?? 1,
        perPage ?? 20,
        weekStart ?? _weekStart,
        weekEnd ?? _weekStart + 604800,
        notYetAired ?? true,
      );

      reply.status(200).send(res);
    },
  );

  // AniList search endpoint
  fastify.get('/:query', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = (request.params as { query: string }).query;
    const page = Number((request.query as { page?: string }).page) || 1;
    const perPage = Number((request.query as { perPage?: string }).perPage) || 20;
    const type = (request.query as { type?: string }).type;

    try {
      const res = redis
        ? await cache.fetch(
            redis as Redis,
            `${redisPrefix}search:${query}:${page}:${perPage}:${type || 'all'}`,
            async () => await anilist.search(query, page, perPage),
            redisCacheTime
          )
        : await anilist.search(query, page, perPage);

      reply.status(200).send(res);
    } catch (err) {
      reply.status(500).send({
        message: 'Something went wrong. Please try again later.',
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });

  // Anilist advanced search endpoint
  fastify.get(
    '/advanced-search',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = (request.query as { query: string }).query;
      const page = (request.query as { page: number }).page;
      const perPage = (request.query as { perPage: number }).perPage;
      const type = (request.query as { type: string }).type;
      let genres = (request.query as { genres: string | string[] }).genres;
      const id = (request.query as { id: string }).id;
      const format = (request.query as { format: string }).format;
      let sort = (request.query as { sort: string | string[] }).sort;
      const status = (request.query as { status: string }).status;
      const year = (request.query as { year: number }).year;
      const season = (request.query as { season: string }).season;

      const anilistProvider = generateAnilistMeta();

      if (genres) {
        JSON.parse(genres as string).forEach((genre: string) => {
          if (!Object.values(Genres).includes(genre as Genres)) {
            return reply.status(400).send({ message: `${genre} is not a valid genre` });
          }
        });

        genres = JSON.parse(genres as string);
      }

      if (sort) sort = JSON.parse(sort as string);

      if (season)
        if (!['WINTER', 'SPRING', 'SUMMER', 'FALL'].includes(season))
          return reply.status(400).send({ message: `${season} is not a valid season` });

      const res = await anilistProvider.advancedSearch(
        query,
        type,
        page,
        perPage,
        format,
        sort as string[],
        genres as string[],
        id,
        year,
        status,
        season,
      );

      reply.status(200).send(res);
    },
  );

  fastify.get('/trending', async (request: FastifyRequest, reply: FastifyReply) => {
    const page = (request.query as { page: number }).page;
    const perPage = (request.query as { perPage: number }).perPage;

    const anilistProvider = generateAnilistMeta();

    redis
      ? reply
        .status(200)
        .send(
          await cache.fetch(
            redis as Redis,
            `anilist:trending;${page};${perPage}`,
            async () => await anilistProvider.fetchTrendingAnime(page, perPage),
            60 * 60,
          ),
        )
      : reply.status(200).send(await anilistProvider.fetchTrendingAnime(page, perPage));
  });

  //http://127.0.0.1:3001/api/v1/meta/anilist/episodes/steinsgate-3

  // AniList episodes endpoint
  fastify.get('/episodes/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const id = decodeURIComponent((request.params as { id: string }).id.trim());
    const fetchFiller =
      ((request.query as { fetchFiller?: string }).fetchFiller || '').toLowerCase() === 'true';
    const dub = ((request.query as { dub?: string }).dub || '').toLowerCase() === 'true';
  
    try {
      const cacheKey = `${redisPrefix}episodes:${id}:${fetchFiller}:${dub}`;
      const hianime = new HiAnime.Scraper();
  
      const data = await HianimeCache.getOrSet<HiAnime.ScrapedAnimeEpisodes>(
        async () => hianime.getEpisodes(id),
        cacheKey,
        redisCacheTime
      );
  
      reply.status(200).send({ success: true, data });
    } catch (err) {
      reply.status(err instanceof Error && err.message.includes('not found') ? 404 : 500).send({
        message: err instanceof Error ? err.message : 'Something went wrong. Please try again later.',
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });
  

  // AniList popular endpoint
  fastify.get('/popular', async (request: FastifyRequest, reply: FastifyReply) => {
    const page = Number((request.query as { page?: string }).page) || 1;
    const perPage = Number((request.query as { perPage?: string }).perPage) || 20;
    const type = (request.query as { type?: string }).type;

    try {
      const res = redis
        ? await cache.fetch(
            redis as Redis,
            `${redisPrefix}popular:${page}:${perPage}:${type || 'all'}`,
            async () => await anilist.fetchPopularAnime(page, perPage),
            redisCacheTime
          )
        : await anilist.fetchPopularAnime(page, perPage);

      reply.status(200).send(res);
    } catch (err) {
      reply.status(500).send({
        message: 'Something went wrong. Please try again later.',
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });

  // AniList manga search endpoint
  fastify.get('/manga/:query', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = (request.params as { query: string }).query;
    const page = Number((request.query as { page?: string }).page) || 1;
    const perPage = Number((request.query as { perPage?: string }).perPage) || 20;
    const provider = (request.query as { provider?: string }).provider;
    
    // Try specific provider if requested
    if (typeof provider !== 'undefined') {
      const possibleProvider = PROVIDERS_LIST.MANGA.find(
        (p) => p.name.toLowerCase() === provider.toLowerCase()
      );
      
      if (possibleProvider) {
        console.log(`Trying requested provider: ${possibleProvider.name}`);
        try {
          const anilistManga = new META.Anilist.Manga(possibleProvider);
          const result = await anilistManga.search(query, page, perPage);
          
          if (result.results) {
            result.results = result.results.filter((item: any) => 
              item.type && item.type.toLowerCase() === 'manga'
            );
          }
          
          return reply.status(200).send(result);
        } catch (err) {
          console.log(`Requested provider ${possibleProvider.name} failed: ${(err as Error).message}`);
          // Fall through to try other providers
        }
      }
    }
    
    // First check cache for any previously successful result
    if (redis) {
      try {
        const cached = await redis.get(`${redisPrefix}manga:search:${query}:${page}:${perPage}:any`);
        if (cached) {
          console.log("Using cached manga search result");
          return reply.status(200).send(JSON.parse(cached));
        }
      } catch (cacheErr) {
        console.error("Cache error:", cacheErr);
      }
    }
    
    // Try MangaDex first
    try {
      console.log("Trying default provider: MangaDex");
      const mangadex = PROVIDERS_LIST.MANGA.find(p => p.name.toLowerCase() === 'mangadex');
      if (mangadex) {
        const anilistManga = new META.Anilist.Manga(mangadex);
        const result = await anilistManga.search(query, page, perPage);
        
        if (result.results) {
          result.results = result.results.filter((item: any) => 
            item.type && item.type.toLowerCase() === 'manga'
          );
        }
        
        // Cache the successful result
        if (redis) {
          try {
            await redis.setex(
              `${redisPrefix}manga:search:${query}:${page}:${perPage}:any`,
              redisCacheTime,
              JSON.stringify(result)
            );
          } catch (cacheErr) {
            console.error("Error caching result:", cacheErr);
          }
        }
        
        console.log("Success with default provider: MangaDex");
        return reply.status(200).send(result);
      }
    } catch (err) {
      console.log(`Default provider MangaDex failed: ${(err as Error).message}`);
    }
    
    // Try remaining providers
    console.log("Trying other available manga providers for search...");
    
    // Try each provider in sequence
    for (const currentProvider of PROVIDERS_LIST.MANGA) {
      // Skip MangaDex as we already tried it
      if (currentProvider.name.toLowerCase() === 'mangadex') continue;
      
      try {
        console.log(`Trying provider: ${currentProvider.name}`);
        const anilistManga = new META.Anilist.Manga(currentProvider);
        const result = await anilistManga.search(query, page, perPage);
        
        if (result.results) {
          result.results = result.results.filter((item: any) => 
            item.type && item.type.toLowerCase() === 'manga'
          );
        }
        
        // Cache the successful result
        if (redis) {
          try {
            await redis.setex(
              `${redisPrefix}manga:search:${query}:${page}:${perPage}:any`,
              redisCacheTime,
              JSON.stringify(result)
            );
          } catch (cacheErr) {
            console.error("Error caching result:", cacheErr);
          }
        }
        
        console.log(`Success with provider: ${currentProvider.name}`);
        return reply.status(200).send(result);
      } catch (err) {
        // Just log and continue to next provider
        console.log(`Provider ${currentProvider.name} failed: ${(err as Error).message}`);
      }
    }
    
    // If we get here, all providers failed
    reply.status(404).send({
      message: "No providers could perform the manga search",
      error: "All providers failed"
    });
  });

  // AniList manga info endpoint
  fastify.get('/manga/info/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const id = (request.params as { id: string }).id;
    const provider = (request.query as { provider?: string }).provider;
    
    // Try specific provider if requested
    if (typeof provider !== 'undefined') {
      const possibleProvider = PROVIDERS_LIST.MANGA.find(
        (p) => p.name.toLowerCase() === provider.toLowerCase()
      );
      
      if (possibleProvider) {
        console.log(`Trying requested provider: ${possibleProvider.name}`);
        try {
          const anilistManga = new META.Anilist.Manga(possibleProvider);
          const result = await anilistManga.fetchMangaInfo(id);
          return reply.status(200).send(result);
        } catch (err) {
          console.log(`Requested provider ${possibleProvider.name} failed: ${(err as Error).message}`);
          // Fall through to try other providers
        }
      }
    }
    
    // First check cache for any previously successful result
    if (redis) {
      try {
        const cached = await redis.get(`${redisPrefix}manga:info:${id}:any`);
        if (cached) {
          console.log("Using cached manga info result");
          return reply.status(200).send(JSON.parse(cached));
        }
      } catch (cacheErr) {
        console.error("Cache error:", cacheErr);
      }
    }
    
    // Try MangaDex first
    try {
      console.log("Trying default provider: MangaDex");
      const mangadex = PROVIDERS_LIST.MANGA.find(p => p.name.toLowerCase() === 'mangadex');
      if (mangadex) {
        const anilistManga = new META.Anilist.Manga(mangadex);
        const result = await anilistManga.fetchMangaInfo(id);
        
        // Cache the successful result
        if (redis) {
          try {
            await redis.setex(
              `${redisPrefix}manga:info:${id}:any`,
              redisCacheTime,
              JSON.stringify(result)
            );
          } catch (cacheErr) {
            console.error("Error caching result:", cacheErr);
          }
        }
        
        console.log("Success with default provider: MangaDex");
        return reply.status(200).send(result);
      }
    } catch (err) {
      console.log(`Default provider MangaDex failed: ${(err as Error).message}`);
    }
    
    // Try remaining providers
    console.log("Trying other available manga providers...");
    
    // Try each provider in sequence
    for (const currentProvider of PROVIDERS_LIST.MANGA) {
      // Skip MangaDex as we already tried it
      if (currentProvider.name.toLowerCase() === 'mangadex') continue;
      
      try {
        console.log(`Trying provider: ${currentProvider.name}`);
        const anilistManga = new META.Anilist.Manga(currentProvider);
        const result = await anilistManga.fetchMangaInfo(id);
        
        // Cache the successful result
        if (redis) {
          try {
            await redis.setex(
              `${redisPrefix}manga:info:${id}:any`,
              redisCacheTime,
              JSON.stringify(result)
            );
          } catch (cacheErr) {
            console.error("Error caching result:", cacheErr);
          }
        }
        
        console.log(`Success with provider: ${currentProvider.name}`);
        return reply.status(200).send(result);
      } catch (err) {
        // Just log and continue to next provider
        console.log(`Provider ${currentProvider.name} failed: ${(err as Error).message}`);
      }
    }
    
    // If we get here, all providers failed
    reply.status(404).send({
      message: "No providers could fetch the manga info",
      error: "All providers failed"
    });
  });

  // AniList manga read endpoint
  fastify.get('/manga/read', async (request: FastifyRequest, reply: FastifyReply) => {
    const chapterId = (request.query as { chapterId: string }).chapterId;
    const provider = (request.query as { provider?: string }).provider;

    if (typeof chapterId === 'undefined')
      return reply.status(400).send({ message: 'chapterId is required' });
    
    // Try specific provider if requested
    if (typeof provider !== 'undefined') {
      const possibleProvider = PROVIDERS_LIST.MANGA.find(
        (p) => p.name.toLowerCase() === provider.toLowerCase()
      );
      
      if (possibleProvider) {
        console.log(`Trying requested provider: ${possibleProvider.name}`);
        try {
          const anilistManga = new META.Anilist.Manga(possibleProvider);
          const result = await anilistManga.fetchChapterPages(chapterId);
          return reply.status(200).send(result);
        } catch (err) {
          console.log(`Requested provider ${possibleProvider.name} failed: ${(err as Error).message}`);
          // Fall through to try other providers
        }
      }
    }
    
    // First check cache for any previously successful result
    if (redis) {
      try {
        const cached = await redis.get(`${redisPrefix}manga:read:${chapterId}:any`);
        if (cached) {
          console.log("Using cached manga chapter pages result");
          return reply.status(200).send(JSON.parse(cached));
        }
      } catch (cacheErr) {
        console.error("Cache error:", cacheErr);
      }
    }
    
    // Try MangaDex first
    try {
      console.log("Trying default provider: MangaDex");
      const mangadex = PROVIDERS_LIST.MANGA.find(p => p.name.toLowerCase() === 'mangadex');
      if (mangadex) {
        const anilistManga = new META.Anilist.Manga(mangadex);
        const result = await anilistManga.fetchChapterPages(chapterId);
        
        // Cache the successful result
        if (redis) {
          try {
            await redis.setex(
              `${redisPrefix}manga:read:${chapterId}:any`,
              redisCacheTime,
              JSON.stringify(result)
            );
          } catch (cacheErr) {
            console.error("Error caching result:", cacheErr);
          }
        }
        
        console.log("Success with default provider: MangaDex");
        return reply.status(200).send(result);
      }
    } catch (err) {
      console.log(`Default provider MangaDex failed: ${(err as Error).message}`);
    }
    
    // Try remaining providers
    console.log("Trying other available manga providers for chapter pages...");
    
    // Try each provider in sequence
    for (const currentProvider of PROVIDERS_LIST.MANGA) {
      // Skip MangaDex as we already tried it
      if (currentProvider.name.toLowerCase() === 'mangadex') continue;
      
      try {
        console.log(`Trying provider: ${currentProvider.name}`);
        const anilistManga = new META.Anilist.Manga(currentProvider);
        const result = await anilistManga.fetchChapterPages(chapterId);
        
        // Cache the successful result
        if (redis) {
          try {
            await redis.setex(
              `${redisPrefix}manga:read:${chapterId}:any`,
              redisCacheTime,
              JSON.stringify(result)
            );
          } catch (cacheErr) {
            console.error("Error caching result:", cacheErr);
          }
        }
        
        console.log(`Success with provider: ${currentProvider.name}`);
        return reply.status(200).send(result);
      } catch (err) {
        // Just log and continue to next provider
        console.log(`Provider ${currentProvider.name} failed: ${(err as Error).message}`);
      }
    }
    
    // If we get here, all providers failed
    reply.status(404).send({
      message: "No providers could fetch the manga chapter pages",
      error: "All providers failed"
    });
  });
};

// Helper function to generate Anilist instance with provider
const generateAnilistMeta = (provider: string | undefined = undefined): Anilist => {
  if (typeof provider !== 'undefined') {
    // Find the right provider based on name
    switch (provider.toLowerCase()) {
      case 'zoro':
        return new META.Anilist(new ANIME.Zoro(), {
          url: process.env.PROXY as string | string[],
        });
      case '9anime':
        return new META.Anilist(
          new ANIME.NineAnime(
            process.env?.NINE_ANIME_HELPER_URL,
            {
              url: process.env?.NINE_ANIME_PROXY as string,
            },
            process.env?.NINE_ANIME_HELPER_KEY as string,
          ),
          {
            url: process.env.PROXY as string | string[],
          }
        );
      case 'gogoanime':
        return new META.Anilist(new ANIME.Gogoanime(), {
          url: process.env.PROXY as string | string[],
        });
      case 'animepahe':
        return new META.Anilist(new ANIME.AnimePahe(), {
          url: process.env.PROXY as string | string[],
        });
      case 'animefox':
        return new META.Anilist(new ANIME.AnimeFox(), {
          url: process.env.PROXY as string | string[],
        });
      case 'animedrive':
        return new META.Anilist(new ANIME.AnimeDrive(), {
          url: process.env.PROXY as string | string[],
        });
      case 'anify':
        return new META.Anilist(new ANIME.Anify(), {
          url: process.env.PROXY as string | string[],
        });
      case 'crunchyroll':
        return new META.Anilist(new ANIME.Crunchyroll(), {
          url: process.env.PROXY as string | string[],
        });
      case 'bilibili':
        return new META.Anilist(new ANIME.Bilibili(), {
          url: process.env.PROXY as string | string[],
        });
      case 'marin':
        return new META.Anilist(new ANIME.Marin(), {
          url: process.env.PROXY as string | string[],
        });
      case 'animesaturn':
        return new META.Anilist(new ANIME.AnimeSaturn(), {
          url: process.env.PROXY as string | string[],
        });
      case 'animeunity':
        return new META.Anilist(new ANIME.AnimeUnity(), {
          url: process.env.PROXY as string | string[],
        });
      case 'monoschinos':
        return new META.Anilist(new ANIME.MonosChinos(), {
          url: process.env.PROXY as string | string[],
        });
      case 'anix':
        return new META.Anilist(new ANIME.Anix(), {
          url: process.env.PROXY as string | string[],
        });
      case 'animekai':
        return new META.Anilist(new ANIME.AnimeKai(), {
          url: process.env.PROXY as string | string[],
        });
      default:
        // Default to Zoro if provider not supported
        return new META.Anilist(new ANIME.Zoro(), {
          url: process.env.PROXY as string | string[],
        });
    }
  } else {
    // Default provider is Zoro
    return new META.Anilist(new ANIME.Zoro(), {
      url: process.env.PROXY as string | string[],
    });
  }
};

export default routes;
