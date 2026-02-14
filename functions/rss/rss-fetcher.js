/**
 * RSS Feed Fetcher - collects trend & insight content
 * Uses rss-parser to fetch and parse RSS feeds
 */

const RssParser = require('rss-parser');
const admin = require('firebase-admin');

const parser = new RssParser({
  timeout: 10000,
  headers: {
    'User-Agent': 'KRMarketingBot/1.0',
  },
});

// RSS source list
const RSS_SOURCES = [
  {
    name: '모비인사이드',
    url: 'https://www.mobiinside.co.kr/feed/',
    category: 'trend',
  },
  {
    name: 'Platum',
    url: 'https://platum.kr/feed',
    category: 'trend',
  },
  {
    name: 'GeekNews',
    url: 'https://news.hada.io/rss/news',
    category: 'trend',
  },
  {
    name: '요즘IT',
    url: 'https://yozm.wishket.com/magazine/feed/',
    category: 'trend',
  },
];

/**
 * Fetch all RSS sources and save articles to Firestore
 */
async function fetchAllFeeds(db, { generateSummary } = {}) {
  const results = [];

  for (const source of RSS_SOURCES) {
    try {
      const result = await fetchSingleFeed(db, source, generateSummary);
      results.push({ source: source.name, ...result });
    } catch (error) {
      console.error(`[RSS] Error fetching ${source.name}:`, error.message);
      results.push({ source: source.name, status: 'error', error: error.message });
    }
  }

  // Log the overall result
  await db.collection('crawl-logs').add({
    source: 'RSS-Fetcher',
    results,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  return results;
}

/**
 * Fetch a single RSS feed
 */
async function fetchSingleFeed(db, source, generateSummary) {
  const feed = await parser.parseURL(source.url);
  const articlesRef = db.collection('articles');

  let newCount = 0;
  let skippedCount = 0;
  const batch = db.batch();

  const items = (feed.items || []).slice(0, 20); // Max 20 items per source

  for (const item of items) {
    // Create deterministic ID from source + title
    const docId = generateArticleId(source.name, item.title || '');
    const docRef = articlesRef.doc(docId);
    const existing = await docRef.get();

    if (existing.exists) {
      skippedCount++;
      continue;
    }

    // Extract thumbnail from content
    const thumbnailUrl = extractThumbnail(item);
    const title = (item.title || '').slice(0, 200);
    const description = cleanDescription(item.contentSnippet || item.content || '');
    const aiSummary = generateSummary ? await generateSummary(title, description) : '';

    batch.set(docRef, {
      title,
      description,
      aiSummary,
      source: source.name,
      sourceUrl: item.link || source.url,
      category: source.category,
      thumbnailUrl: thumbnailUrl || '',
      publishedAt: item.pubDate
        ? admin.firestore.Timestamp.fromDate(new Date(item.pubDate))
        : admin.firestore.FieldValue.serverTimestamp(),
      fetchedAt: admin.firestore.FieldValue.serverTimestamp(),
      isNew: true,
    });
    newCount++;
  }

  if (newCount > 0) {
    await batch.commit();
  }

  // Mark articles older than 24h as not new (best-effort, skip if index missing)
  try {
    const yesterday = new Date(Date.now() - 86400000);
    const oldArticles = await articlesRef
      .where('source', '==', source.name)
      .where('isNew', '==', true)
      .where('fetchedAt', '<', admin.firestore.Timestamp.fromDate(yesterday))
      .get();

    if (!oldArticles.empty) {
      const updateBatch = db.batch();
      oldArticles.forEach(doc => {
        updateBatch.update(doc.ref, { isNew: false });
      });
      await updateBatch.commit();
    }
  } catch (err) {
    console.warn(`[RSS] Skipping isNew cleanup for ${source.name}: ${err.message}`);
  }

  return { status: 'success', newCount, skippedCount, totalItems: items.length };
}

function generateArticleId(source, title) {
  const str = `${source}:${title}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'rss-' + Math.abs(hash).toString(36);
}

function cleanDescription(text) {
  if (!text) return '';
  // Remove HTML tags, trim, limit length
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 300);
}

function extractThumbnail(item) {
  // Try media content
  if (item['media:content']?.['$']?.url) {
    return item['media:content']['$'].url;
  }
  // Try enclosure
  if (item.enclosure?.url && item.enclosure.type?.startsWith('image')) {
    return item.enclosure.url;
  }
  // Try to find img in content
  const imgMatch = (item.content || item['content:encoded'] || '').match(/<img[^>]+src=["']([^"']+)["']/);
  if (imgMatch) return imgMatch[1];
  return null;
}

module.exports = { fetchAllFeeds, RSS_SOURCES };
