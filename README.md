# OK Media Extractor

Puppeteer-based extractor API that returns `.m3u8`, `.mp4` and other media links seen in browser network or DOM.

## Quick deploy (GitHub → Render)
1. Create a new GitHub repo and push this project.
2. Sign in to Render (https://dashboard.render.com).
3. Create → New Web Service → Connect to your GitHub repo.
   - Branch: main
   - Build Command: `npm ci`
   - Start Command: `npm start`
   - Plan: free (beware of resource limits)
4. Set Environment Variables (optional):
   - `MAX_CONCURRENCY` (default 2)
   - `NODE_ENV=production`
5. Deploy. After build, Render will show a public URL like `https://ok-media-extractor.onrender.com`.

## Usage
POST JSON to `/api/extract`:
