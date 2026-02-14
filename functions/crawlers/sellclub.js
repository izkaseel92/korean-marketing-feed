/**
 * 셀클럽 크롤러 - sell-club.com
 * 실행사 B2B 서비스 자기홍보 게시판
 */

const { fetchHtml, cleanText, extractPrice, saveProducts, logCrawl } = require('./base-crawler');

const SOURCE = '셀클럽';
const BASE_URL = 'https://www.sell-club.com';

const CATEGORY_MAP = {
  '바이럴': 'viral', '카페': 'viral', '커뮤니티': 'viral',
  '리뷰': 'review', '체험단': 'review', '후기': 'review',
  '트래픽': 'traffic', '상위노출': 'traffic', '클릭': 'traffic',
  '인스타': 'sns', '유튜브': 'sns', '틱톡': 'sns', '인플루언서': 'sns',
  '네이버': 'naver', '블로그': 'naver', '카카오': 'naver', '플레이스': 'naver',
  '쿠팡': 'ecommerce', '스토어': 'ecommerce', '오픈마켓': 'ecommerce',
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
    const $ = await fetchHtml(BASE_URL, { timeout: 20000 });

    const selectors = [
      '.board-list tbody tr', 'table tbody tr', '.post-list li',
      '.bbs_list tr', '.list_table tr', '.article-list li',
    ];

    let rows = [];
    for (const sel of selectors) {
      const found = $(sel);
      if (found.length > 2) { rows = found; break; }
    }

    if (rows.length === 0) {
      // Try fetching the board/community section directly
      const boardUrl = `${BASE_URL}/bbs/board.php?bo_table=service`;
      try {
        const $b = await fetchHtml(boardUrl, { timeout: 20000 });
        $b('.list_table tbody tr, table tbody tr').each((_, el) => {
          rows = $b('tr');
        });
      } catch {}
    }

    rows.each((_, el) => {
      const $el = $(el);
      const titleEl = $el.find('.td_subject a, .title a, td a').first();
      const title = cleanText(titleEl.text());
      const link = titleEl.attr('href') || '';
      const priceText = cleanText($el.find('.price, [class*="price"]').text());
      const price = extractPrice(priceText);
      const date = cleanText($el.find('.td_datetime, .date, td:last-child').text());

      if (!title || title.length < 5 || title.includes('공지')) return;

      results.push({
        title: title.slice(0, 100),
        description: `셀클럽 서비스 게시글 - ${date}`,
        price,
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
