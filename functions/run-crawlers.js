/**
 * Standalone crawler runner for GitHub Actions
 * Initializes Firebase Admin with service account and runs all crawlers + RSS
 */

const admin = require('firebase-admin');

// Initialize with service account from environment variable
// Fix: GitHub Actions may mangle newlines in the private_key field
let saRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
// Replace literal escaped newlines that got double-escaped
saRaw = saRaw.replace(/\\n/g, '\n');
const serviceAccount = JSON.parse(saRaw);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id,
});

const db = admin.firestore();

const gpaKorea = require('./crawlers/gpa-korea');
const practicecorp = require('./crawlers/practicecorp');
const gprized = require('./crawlers/gprized');
const iboss = require('./crawlers/iboss');
const kmong = require('./crawlers/kmong');
const { fetchAllFeeds } = require('./rss/rss-fetcher');

const MODE = process.argv[2] || 'all'; // 'crawl', 'rss', or 'all'

async function main() {
  console.log(`[Runner] Mode: ${MODE}, Time: ${new Date().toISOString()}`);

  if (MODE === 'crawl' || MODE === 'all') {
    console.log('[Runner] Starting crawlers...');
    const crawlers = [gpaKorea, practicecorp, gprized, iboss, kmong];

    for (const crawler of crawlers) {
      try {
        console.log(`[Crawler] ${crawler.SOURCE}...`);
        const result = await crawler.crawl(db);
        console.log(`[Crawler] ${crawler.SOURCE} done:`, JSON.stringify(result));
      } catch (error) {
        console.error(`[Crawler] ${crawler.SOURCE} failed:`, error.message);
      }
    }
  }

  if (MODE === 'rss' || MODE === 'all') {
    console.log('[Runner] Starting RSS fetch...');
    try {
      const results = await fetchAllFeeds(db);
      console.log('[RSS] Done:', JSON.stringify(results));
    } catch (error) {
      console.error('[RSS] Failed:', error.message);
    }
  }

  console.log('[Runner] Complete.');
  process.exit(0);
}

main().catch(err => {
  console.error('[Runner] Fatal error:', err);
  process.exit(1);
});
