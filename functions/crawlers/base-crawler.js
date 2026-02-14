/**
 * Base crawler utility - common crawling functions
 * Uses Cheerio + node-fetch for HTML parsing
 */

const fetch = require('node-fetch');
const cheerio = require('cheerio');
const admin = require('firebase-admin');

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const REQUEST_TIMEOUT = 15000;

/**
 * Fetch HTML from URL with error handling
 */
async function fetchHtml(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      ...options.headers,
    },
    timeout: REQUEST_TIMEOUT,
    ...options,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText} for ${url}`);
  }

  const html = await response.text();
  return cheerio.load(html);
}

/**
 * Clean and normalize text
 */
function cleanText(text) {
  if (!text) return '';
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Extract price from Korean price string
 * e.g. "450,000원" → 450000
 */
function extractPrice(priceStr) {
  if (!priceStr) return null;
  const cleaned = priceStr.replace(/[^\d]/g, '');
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? null : num;
}

/**
 * Save crawled items to Firestore with change detection
 * Only saves new or changed items
 */
async function saveProducts(db, items, source) {
  const batch = db.batch();
  const productsRef = db.collection('products');
  let newCount = 0;
  let updatedCount = 0;

  for (const item of items) {
    // Create a deterministic ID from source + title
    const docId = generateDocId(source, item.title);
    const docRef = productsRef.doc(docId);
    const existing = await docRef.get();

    if (!existing.exists) {
      // New product
      batch.set(docRef, {
        ...item,
        source,
        isNew: true,
        crawledAt: admin.firestore.FieldValue.serverTimestamp(),
        firstSeenAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      newCount++;
    } else {
      const oldData = existing.data();
      // Check if price or description changed
      if (oldData.price !== item.price || oldData.description !== item.description) {
        batch.update(docRef, {
          ...item,
          source,
          isNew: false,
          priceChanged: oldData.price !== item.price,
          previousPrice: oldData.price,
          crawledAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        updatedCount++;
      } else {
        // No change, just update crawledAt
        batch.update(docRef, {
          crawledAt: admin.firestore.FieldValue.serverTimestamp(),
          isNew: false,
        });
      }
    }
  }

  await batch.commit();
  return { newCount, updatedCount, totalCount: items.length };
}

/**
 * Log crawl execution
 */
async function logCrawl(db, source, result) {
  await db.collection('crawl-logs').add({
    source,
    ...result,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });
}

/**
 * Generate deterministic document ID
 */
function generateDocId(source, title) {
  const str = `${source}:${title}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Sleep utility for rate limiting
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  fetchHtml,
  cleanText,
  extractPrice,
  saveProducts,
  logCrawl,
  generateDocId,
  sleep,
};
