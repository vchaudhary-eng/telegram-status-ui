// scraper.js
const puppeteer = require('puppeteer');

const DEFAULT_TIMEOUT = 35000; // ms

async function extractMediaFromPage(pageUrl, opts = {}) {
  const timeout = opts.timeout || DEFAULT_TIMEOUT;
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu'
    ],
    // ignoreHTTPSErrors: true // optional
  });

  const page = await browser.newPage();
  await page.setUserAgent(opts.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115 Safari/537.36');
  const found = new Set();
  let debugHtmlSnippet = '';

  try {
    // capture network responses
    page.on('response', async (response) => {
      try {
        const url = response.url();
        if (!url) return;
        // match typical media URLs
        if (/\.(m3u8|mp4|mkv|ts)(\?|$)/i.test(url) || /storage\.yandex\.net|application\/vnd\.apple\.mpegurl|cdn/i.test(url)) {
          found.add(url);
        }
      } catch (e) { /* ignore */ }
    });

    // navigate
    await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout });

    // wait a little extra for lazy-loading players
    await page.waitForTimeout(2500);

    // get DOM-level srcs: iframe, source, video
    const domUrls = await page.evaluate(() => {
      const urls = [];
      const els = Array.from(document.querySelectorAll('iframe, source, video, a'));
      els.forEach(el => {
        try {
          const tag = el.tagName && el.tagName.toLowerCase();
          if (tag === 'iframe' && el.src) urls.push(el.src);
          if (tag === 'source' && el.src) urls.push(el.src);
          if (tag === 'video') {
            if (el.currentSrc) urls.push(el.currentSrc);
            // <video><source src=...>
            el.querySelectorAll && el.querySelectorAll('source') && el.querySelectorAll('source').forEach(s => s.src && urls.push(s.src));
          }
          if (tag === 'a' && el.href && /\.(m3u8|mp4|mkv|ts)/i.test(el.href)) urls.push(el.href);
        } catch (e) {}
      });
      // also scan text for escaped urls
      const bodyText = document.body ? document.body.innerText || '' : '';
      const matches = bodyText.match(/https?:\/\/[^\s'"]+/g) || [];
      matches.forEach(m => urls.push(m));
      return urls;
    });

    domUrls.forEach(u => {
      if (u && typeof u === 'string') {
        if (/\.(m3u8|mp4|mkv|ts)(\?|$)/i.test(u) || /storage\.yandex\.net/i.test(u)) found.add(u);
        else {
          // still add other potential direct URLs
          found.add(u);
        }
      }
    });

    // also try to read page HTML for escaped https:\/\/ links (some players embed)
    const html = await page.content();
    debugHtmlSnippet = html.slice(0, 4000); // for debugging
    const escaped = html.match(/https?:\\\/\\\/[^\s"']+/ig) || [];
    escaped.forEach(e => found.add(e.replace(/\\\//g, '/')));

    // try to find JSON player configs via regex
    const jsonMatches = html.match(/["'](https?:\/\/[^"']+\.(?:m3u8|mp4)[^"']*)["']/ig) || [];
    jsonMatches.forEach(m => {
      const url = m.replace(/^["']|["']$/g,'');
      found.add(url);
    });

  } catch (err) {
    await browser.close();
    throw err;
  }

  await browser.close();

  // return unique list
  return {
    links: Array.from(found),
    debugHtmlSnippet
  };
}

module.exports = { extractMediaFromPage };
