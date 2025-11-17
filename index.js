// index.js
const express = require('express');
const bodyParser = require('body-parser');
const { extractMediaFromPage } = require('./scraper');
const pLimit = require('p-limit');

const PORT = process.env.PORT || 3000;
const app = express();
app.use(bodyParser.json({ limit: '1mb' }));

// limit concurrency to 2 puppeteer instances by default
const MAX_CONCURRENCY = parseInt(process.env.MAX_CONCURRENCY || '2', 10);
const limit = pLimit(MAX_CONCURRENCY);

app.get('/', (req, res) => {
  res.send('OK Media Extractor - POST /api/extract with JSON { url: "..." }');
});

app.post('/api/extract', async (req, res) => {
  const { url } = req.body || {};
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid "url" in JSON body' });
  }

  try {
    const task = () => extractMediaFromPage(url, { timeout: 45000 });
    const result = await limit(task); // enforces concurrency cap
    // normalize links (remove duplicates, short)
    const unique = Array.from(new Set(result.links || [])).filter(Boolean);
    res.json({
      status: 'ok',
      url,
      found_count: unique.length,
      links: unique,
      debug: (process.env.NODE_ENV === 'development') ? result.debugHtmlSnippet : undefined
    });
  } catch (err) {
    console.error('extract error', err && err.toString());
    res.status(500).json({ status: 'error', message: err.toString() });
  }
});

app.listen(PORT, () => {
  console.log(`OK Media Extractor running on port ${PORT}`);
});
