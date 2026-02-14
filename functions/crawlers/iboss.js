/**
 * 아이보스 서비스홍보 크롤러 - i-boss.co.kr/ab-2987
 * 시행사 홍보 게시판 최신 글 크롤링
 */

const { fetchHtml, cleanText, saveProducts, logCrawl } = require('./base-crawler');

const SOURCE = '아이보스';
const BASE_URL = 'https://www.i-boss.co.kr';
const LIST_URL = `${BASE_URL}/ab-2987`;
const REQUEST_TIMEOUT = 30000;

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

async function crawl(db, options = {}) {
  const results = [];

  try {
    const $ = await fetchHtml(LIST_URL, { timeout: 30000 });

    // iBoss uses a board-style layout
    const selectors = [
      '.board-list tbody tr', '.list-table tbody tr',
      '.bbs-list li', '.article-list li',
      'table tbody tr', '.board_list tr',
    ];

    let rows = [];
    for (const sel of selectors) {
      const found = $(sel);
      if (found.length > 0) {
        rows = found;
        break;
      }
    }

    rows.each((_, el) => {
      const $el = $(el);
      const titleEl = $el.find('a[href*="ab-"], .title a, .subject a, td a').first();
      const title = cleanText(titleEl.text());
      const link = titleEl.attr('href') || '';
      const date = cleanText($el.find('.date, .time, td:last-child').text());

      // Skip header rows or notice rows
      if (!title || title.length < 5 || title.includes('공지')) return;

      results.push({
        title: title.slice(0, 100),
        description: `아이보스 서비스홍보 게시글 - ${date}`,
        price: null,
        category: categorize(title),
        sourceUrl: link.startsWith('http') ? link : `${BASE_URL}${link}`,
      });
    });

    const saveResult = await saveProducts(db, results, SOURCE, options);
    await logCrawl(db, SOURCE, { status: 'success', ...saveResult });
    return saveResult;
  } catch (error) {
    console.error(`[${SOURCE}] Crawl error:`, error.message);
    await logCrawl(db, SOURCE, { status: 'error', error: error.message });
    return { error: error.message };
  }
}

module.exports = { crawl, SOURCE };
