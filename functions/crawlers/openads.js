/**
 * OpenAds Crawler
 * 오픈애즈 마케팅 콘텐츠 크롤러
 * API: /home/findContentsByCategoryAndType
 */

const fetch = require('node-fetch');
const admin = require('firebase-admin');

const BASE_URL = 'https://openads.co.kr';
const API_ENDPOINT = `${BASE_URL}/home/findContentsByCategoryAndType`;

// 수집할 카테고리 코드
const CATEGORIES = [
  { code: 'CC102', name: '마케팅 사례' },
  { code: 'CC50', name: '업종별 트렌드' },
  { code: 'CC108', name: '데이터 분석' },
  { code: 'CC54', name: '미디어 트렌드' },
  { code: 'CC124', name: 'AI 실무 활용' },
  { code: 'CC123', name: 'AI 광고' },
];

/**
 * 오픈애즈 크롤링 메인 함수
 */
async function crawlOpenAds(db, { generateSummary } = {}) {
  console.log('[OpenAds] Starting crawl...');

  const allArticles = [];

  // 모든 카테고리에서 콘텐츠 수집
  for (const category of CATEGORIES) {
    try {
      const articles = await fetchCategoryArticles(category);
      allArticles.push(...articles);
      console.log(`[OpenAds] Fetched ${articles.length} articles from ${category.name}`);
    } catch (error) {
      console.error(`[OpenAds] Error fetching ${category.name}:`, error.message);
    }
  }

  // 중복 제거 (contsId 기준)
  const uniqueArticles = Array.from(
    new Map(allArticles.map(a => [a.contsId, a])).values()
  );

  console.log(`[OpenAds] Total unique articles: ${uniqueArticles.length}`);

  // Firestore에 저장
  let newCount = 0;
  let skippedCount = 0;
  const batch = db.batch();
  const articlesRef = db.collection('articles');

  for (const article of uniqueArticles.slice(0, 30)) { // 최대 30개
    const docId = `openads-${article.contsId}`;
    const docRef = articlesRef.doc(docId);
    const existing = await docRef.get();

    if (existing.exists) {
      skippedCount++;
      continue;
    }

    // 썸네일 URL 생성
    const thumbnailUrl = article.thumbFileName
      ? `${article.thumbFilePath}${encodeURIComponent(article.thumbFileName)}`
      : '';

    // AI 요약 생성 (옵션)
    const aiSummary = generateSummary
      ? await generateSummary(article.title, '')
      : '';

    batch.set(docRef, {
      title: article.title,
      description: '', // API가 본문 제공 안 함
      aiSummary,
      source: '오픈애즈',
      sourceUrl: `${BASE_URL}/content/contentDetail?contsId=${article.contsId}`,
      category: 'news',
      subcategory: article.subCategoryName || '',
      thumbnailUrl,
      author: article.authorName || article.magneName || '',
      publishedAt: parsePublishDate(article.pubDtime),
      fetchedAt: admin.firestore.FieldValue.serverTimestamp(),
      isNew: true,
    });

    newCount++;
  }

  if (newCount > 0) {
    await batch.commit();
    console.log(`[OpenAds] Saved ${newCount} new articles`);
  }

  return { newCount, skippedCount, totalFetched: uniqueArticles.length };
}

/**
 * 특정 카테고리의 콘텐츠 조회
 */
async function fetchCategoryArticles(category) {
  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'KRMarketingBot/1.0',
    },
    body: `subCategoryCode=${category.code}&contsType=`,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();

  if (!data.success || !Array.isArray(data.message)) {
    return [];
  }

  return data.message.map(item => ({
    ...item,
    categoryName: category.name,
  }));
}

/**
 * 발행일 파싱 (예: "2026.02.23 11:38" → Timestamp)
 */
function parsePublishDate(dateStr) {
  if (!dateStr) {
    return admin.firestore.FieldValue.serverTimestamp();
  }

  try {
    // "2026.02.23 11:38" 형식
    const [datePart, timePart] = dateStr.split(' ');
    const [year, month, day] = datePart.split('.');
    const [hour, minute] = (timePart || '00:00').split(':');

    const date = new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hour),
      parseInt(minute)
    );

    return admin.firestore.Timestamp.fromDate(date);
  } catch (error) {
    console.warn(`[OpenAds] Failed to parse date: ${dateStr}`);
    return admin.firestore.FieldValue.serverTimestamp();
  }
}

module.exports = { crawlOpenAds };
