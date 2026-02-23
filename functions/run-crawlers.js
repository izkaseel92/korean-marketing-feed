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

async function main() {
  console.log(`[Runner] Starting RSS fetch at ${new Date().toISOString()}`);

  try {
    const results = await fetchAllFeeds(db, { generateSummary });
    console.log('[RSS] Fetch complete:', JSON.stringify(results));
  } catch (error) {
    console.error('[RSS] Fetch failed:', error.message);
    process.exit(1);
  }

  console.log('[Runner] Complete.');
  process.exit(0);
}

main().catch(err => {
  console.error('[Runner] Fatal error:', err);
  process.exit(1);
});
