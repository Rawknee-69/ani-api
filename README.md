# Ani-API

Ani-API is a Node.js API service providing information on various entertainment media such as anime, books, manga, and more.

## Deployment

### Deploying to Vercel

1. Fork or clone this repository
2. Connect your repository to Vercel
3. In the Vercel project settings:
   - Set the Build Command to `npm run build`
   - Set the Output Directory to `public`
   - Set the Install Command to `npm install`
4. Deploy the project
5. The API will be available at your Vercel domain

#### Environment Variables (Optional)

If you need to use Redis for caching, set the following variables in your Vercel project settings:

- `PORT` - Port number (defaults to 3001, set automatically by Vercel)
- `REDIS_HOST` - Redis server host (optional)
- `REDIS_PORT` - Redis server port (optional)
- `REDIS_PASSWORD` - Redis server password (optional)

## Local Development

```bash
# Install dependencies
npm install

# Development mode
npm run dev

# Build project
npm run build

# Start production server
npm start
``` 