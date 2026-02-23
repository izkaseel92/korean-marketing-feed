/**
 * RSS news fetcher for GitHub Actions
 * Initializes Firebase Admin with service account and fetches RSS feeds
 */

const admin = require('firebase-admin');

// Initialize with service account
// Supports: GOOGLE_APPLICATION_CREDENTIALS (file path) or FIREBASE_SERVICE_ACCOUNT (JSON string)
try {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  } else {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });
  }
} catch (err) {
  console.error('[Runner] Firebase init failed:', err.message);
  process.exit(1);
}

const db = admin.firestore();

const { fetchAllFeeds } = require('./rss/rss-fetcher');
const { generateSummary } = require('./utils/ai-summary');
const { crawlOpenAds } = require('./crawlers/openads');

async function main() {
  console.log(`[Runner] Starting data collection at ${new Date().toISOString()}`);

  const results = {
    rss: null,
    openads: null,
  };

  // 1. RSS 피드 수집
  try {
    console.log('[Runner] Fetching RSS feeds...');
    results.rss = await fetchAllFeeds(db, { generateSummary });
    console.log('[RSS] Fetch complete:', JSON.stringify(results.rss));
  } catch (error) {
    console.error('[RSS] Fetch failed:', error.message);
    results.rss = { error: error.message };
  }

  // 2. 오픈애즈 크롤링
  try {
    console.log('[Runner] Crawling OpenAds...');
    results.openads = await crawlOpenAds(db, { generateSummary });
    console.log('[OpenAds] Crawl complete:', JSON.stringify(results.openads));
  } catch (error) {
    console.error('[OpenAds] Crawl failed:', error.message);
    results.openads = { error: error.message };
  }

  console.log('[Runner] All tasks complete:', JSON.stringify(results, null, 2));
  process.exit(0);
}

main().catch(err => {
  console.error('[Runner] Fatal error:', err);
  process.exit(1);
});
