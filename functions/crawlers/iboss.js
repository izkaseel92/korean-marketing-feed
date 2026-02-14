/**
 * 아이보스 크롤러 - i-boss.co.kr
 * ab-2987: 서비스홍보 게시판 (competitor intel — what agencies are selling)
 * ab-2876: 마케팅뉴스 게시판 (industry news)
 */

const { fetchHtml, cleanText, saveProducts, logCrawl } = require('./base-crawler');

const SOURCE = '아이보스';
const BASE_URL = 'https://www.i-boss.co.kr';
const BOARDS = [
  { url: `${BASE_URL}/ab-2987`, type: 'service' },  // 서비스홍보
  { url: `${BASE_URL}/ab-2876`, type: 'news' },     // 마케팅뉴스
];

const CATEGORY_MAP = {
  '바이럴': 'viral', '카페': 'viral', '커뮤니티': 'viral', '홍보': 'viral',
  '리뷰': 'review', '체험단': 'review', '후기': 'review',
  '트래픽': 'traffic', '상위노출': 'traffic', '순위': 'traffic', 'SEO': 'traffic',
  '인스타': 'sns', '유튜브': 'sns', '틱톡': 'sns', '인플루언서': 'sns',
  '네이버': 'naver', '블로그': 'naver', '카카오': 'naver', '플레이스': 'naver',
  '쿠팡': 'ecommerce', '스토어': 'ecommerce', '마켓': 'ecommerce',
};

function categorize(text) {
  for (const [keyword, category] of Object.entries(CATEGORY_MAP)) {
    if (text.includes(keyword)) return category;
  }
  return 'viral';
}

const BOARD_SELECTORS = [
  '.board-list tbody tr', '.list-table tbody tr',
  '.bbs-list li', '.article-list li',
  'table tbody tr', '.board_list tr',
];

async function scrapeBoard(url) {
  const $ = await fetchHtml(url, { timeout: 30000 });
  const results = [];

  let rows = [];
  for (const sel of BOARD_SELECTORS) {
    const found = $(sel);
    if (found.length > 0) { rows = found; break; }
  }

  rows.each((_, el) => {
    const $el = $(el);
    const titleEl = $el.find('a[href*="ab-"], .title a, .subject a, td a').first();
    const title = cleanText(titleEl.text());
    const link = titleEl.attr('href') || '';
    const date = cleanText($el.find('.date, .time, td:last-child').text());

    if (!title || title.length < 5 || title.includes('공지')) return;

    results.push({
      title: title.slice(0, 100),
      description: `아이보스 게시글 - ${date}`,
      price: null,
      category: categorize(title),
      sourceUrl: link.startsWith('http') ? link : `${BASE_URL}${link}`,
    });
  });

  return results;
}

async function crawl(db, options = {}) {
  const allResults = [];

  for (const board of BOARDS) {
    try {
      const items = await scrapeBoard(board.url);
      console.log(`[${SOURCE}] ${board.type} board: ${items.length} items`);
      allResults.push(...items);
    } catch (err) {
      console.error(`[${SOURCE}] ${board.type} board error:`, err.message);
    }
  }

  try {
    const saveResult = await saveProducts(db, allResults, SOURCE, options);
    await logCrawl(db, SOURCE, { status: 'success', ...saveResult });
    return saveResult;
  } catch (error) {
    console.error(`[${SOURCE}] Save error:`, error.message);
    await logCrawl(db, SOURCE, { status: 'error', error: error.message });
    return { error: error.message };
  }
}

module.exports = { crawl, SOURCE };
