/**
 * Cloud Functions entry point
 * Registers scheduled crawlers, RSS fetcher, and newsletter sender
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

// Import crawlers
const gpaKorea = require('./crawlers/gpa-korea');
const practicecorp = require('./crawlers/practicecorp');
const gprized = require('./crawlers/gprized');
const iboss = require('./crawlers/iboss');
const kmong = require('./crawlers/kmong');

// Import RSS fetcher
const { fetchAllFeeds } = require('./rss/rss-fetcher');

// Import newsletter
const { sendDailyDigest } = require('./newsletter/send-digest');

/**
 * Scheduled Crawler - runs every 6 hours
 * Crawls all marketing agency sites
 */
exports.scheduledCrawl = functions
  .runWith({ timeoutSeconds: 300, memory: '512MB' })
  .pubsub.schedule('every 6 hours')
  .timeZone('Asia/Seoul')
  .onRun(async () => {
    console.log('[Crawler] Starting scheduled crawl...');

    const crawlers = [gpaKorea, practicecorp, gprized, iboss, kmong];
    const results = [];

    for (const crawler of crawlers) {
      try {
        console.log(`[Crawler] Crawling ${crawler.SOURCE}...`);
        const result = await crawler.crawl(db);
        results.push({ source: crawler.SOURCE, ...result });
        console.log(`[Crawler] ${crawler.SOURCE} done:`, result);
      } catch (error) {
        console.error(`[Crawler] ${crawler.SOURCE} failed:`, error.message);
        results.push({ source: crawler.SOURCE, error: error.message });
      }
    }

    console.log('[Crawler] All crawls complete:', JSON.stringify(results));
    return null;
  });

/**
 * Scheduled RSS Fetch - runs every 2 hours
 * Fetches RSS feeds for trend & insight content
 */
exports.scheduledRssFetch = functions
  .runWith({ timeoutSeconds: 120, memory: '256MB' })
  .pubsub.schedule('every 2 hours')
  .timeZone('Asia/Seoul')
  .onRun(async () => {
    console.log('[RSS] Starting scheduled RSS fetch...');
    const results = await fetchAllFeeds(db);
    console.log('[RSS] Fetch complete:', JSON.stringify(results));
    return null;
  });

/**
 * Scheduled Newsletter - runs daily at 9AM KST
 * Sends digest email to all subscribers
 */
exports.scheduledNewsletter = functions
  .runWith({ timeoutSeconds: 120, memory: '256MB' })
  .pubsub.schedule('0 9 * * *')
  .timeZone('Asia/Seoul')
  .onRun(async () => {
    console.log('[Newsletter] Starting daily digest...');
    const sendgridKey = functions.config().sendgrid?.key || '';
    const result = await sendDailyDigest(db, sendgridKey);
    console.log('[Newsletter] Digest sent:', JSON.stringify(result));
    return null;
  });

/**
 * HTTP trigger - manual crawl (for testing)
 * Call: GET /api/crawl?source=all
 */
exports.manualCrawl = functions
  .runWith({ timeoutSeconds: 300, memory: '512MB' })
  .https.onRequest(async (req, res) => {
    // Simple auth check - use a secret token in production
    const token = req.query.token || req.headers['x-api-token'];
    const expectedToken = functions.config().api?.token || 'dev-token';

    if (token !== expectedToken) {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }

    const source = req.query.source || 'all';
    const results = [];

    const crawlerMap = {
      'gpa-korea': gpaKorea,
      'practicecorp': practicecorp,
      'gprized': gprized,
      'iboss': iboss,
      'kmong': kmong,
    };

    if (source === 'all') {
      for (const crawler of Object.values(crawlerMap)) {
        try {
          const result = await crawler.crawl(db);
          results.push({ source: crawler.SOURCE, ...result });
        } catch (error) {
          results.push({ source: crawler.SOURCE, error: error.message });
        }
      }
    } else if (source === 'rss') {
      const result = await fetchAllFeeds(db);
      results.push(...result);
    } else if (crawlerMap[source]) {
      const result = await crawlerMap[source].crawl(db);
      results.push({ source: crawlerMap[source].SOURCE, ...result });
    } else {
      res.status(400).json({ error: `Unknown source: ${source}` });
      return;
    }

    res.json({ status: 'ok', results });
  });
