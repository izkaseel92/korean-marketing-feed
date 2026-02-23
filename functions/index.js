/**
 * Cloud Functions entry point
 * Registers RSS fetcher, daily summary generator, and newsletter sender
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

// Import RSS fetcher
const { fetchAllFeeds } = require('./rss/rss-fetcher');

// Import daily summary generator
const { generateDailySummary } = require('./utils/daily-summary');

// Import newsletter
const { sendDailyDigest } = require('./newsletter/send-daily-digest');

/**
 * Scheduled Daily Summary - runs every day at 12:00 AM UTC (9:00 AM KST)
 * Generates executive summary of last 24 hours of news
 */
exports.scheduledDailySummary = functions
  .runWith({ timeoutSeconds: 120, memory: '256MB' })
  .pubsub.schedule('0 0 * * *')
  .timeZone('Asia/Seoul')
  .onRun(async () => {
    console.log('[Daily Summary] Starting daily summary generation...');

    try {
      const summaryResult = await generateDailySummary(db);
      console.log('[Daily Summary] Generated:', JSON.stringify(summaryResult));

      // Send newsletter with the generated summary
      const emailResult = await sendDailyDigest(db, summaryResult);
      console.log('[Newsletter] Sent:', JSON.stringify(emailResult));

      return null;
    } catch (error) {
      console.error('[Daily Summary] Failed:', error.message);
      throw error;
    }
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

// Newsletter sending is now integrated with Daily Summary generation
// See scheduledDailySummary function above

/**
 * HTTP trigger - manual RSS fetch and daily summary (for testing)
 * Call: GET /api/fetch?action=rss or GET /api/fetch?action=summary
 */
exports.manualFetch = functions
  .runWith({ timeoutSeconds: 300, memory: '512MB' })
  .https.onRequest(async (req, res) => {
    // Simple auth check - use a secret token in production
    const token = req.query.token || req.headers['x-api-token'];
    const expectedToken = functions.config().api?.token || 'dev-token';

    if (token !== expectedToken) {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }

    const action = req.query.action || 'rss';

    try {
      if (action === 'rss') {
        const result = await fetchAllFeeds(db);
        res.json({ status: 'ok', action: 'rss', results: result });
      } else if (action === 'summary') {
        const result = await generateDailySummary(db);
        res.json({ status: 'ok', action: 'summary', result });
      } else {
        res.status(400).json({ error: `Unknown action: ${action}. Use 'rss' or 'summary'` });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
