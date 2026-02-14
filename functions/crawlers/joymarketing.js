/**
 * 조이마케팅 크롤러 - joymarketing.co.kr
 * 바이럴 마케팅 실행사, B2B 서비스 목록
 */

const { fetchHtml, cleanText, extractPrice, saveProducts, logCrawl, sleep } = require('./base-crawler');

const SOURCE = '조이마케팅';
const BASE_URL = 'https://joymarketing.co.kr';

const CATEGORY_MAP = {
  '바이럴': 'viral', '카페': 'viral', '커뮤니티': 'viral', '블로그': 'naver',
  '리뷰': 'review', '체험단': 'review', '후기': 'review',
  '트래픽': 'traffic', '상위노출': 'traffic', '순위': 'traffic',
  '인스타': 'sns', '유튜브': 'sns', '틱톡': 'sns', '인플루언서': 'sns',
  '네이버': 'naver', '카카오': 'naver', '플레이스': 'naver',
  '쿠팡': 'ecommerce', '스마트스토어': 'ecommerce', '마켓': 'ecommerce',
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

    // Try common product/service list selectors
    const selectors = [
      '.product-list .item', '.service-list li', '.menu-list li',
      '.product-item', '.service-item', '.item-list .item',
      'ul.products li', '.goods-list .goods-item',
    ];

    let items = [];
    for (const sel of selectors) {
      const found = $(sel);
      if (found.length > 2) { items = found; break; }
    }

    // Fallback: grab all significant links on the page
    if (items.length === 0) {
      $('a[href]').each((_, el) => {
        const $el = $(el);
        const text = cleanText($el.text());
        const href = $el.attr('href') || '';
        if (text.length > 8 && text.length < 100 && !href.includes('javascript')) {
          const url = href.startsWith('http') ? href : `${BASE_URL}${href}`;
          results.push({
            title: text.slice(0, 100),
            description: `조이마케팅 서비스`,
            price: null,
            category: categorize(text),
            sourceUrl: url,
          });
        }
      });
    } else {
      items.each((_, el) => {
        const $el = $(el);
        const titleEl = $el.find('a, .title, h3, h4').first();
        const title = cleanText(titleEl.text() || $el.text());
        const link = $el.find('a').first().attr('href') || '';
        const priceText = cleanText($el.find('.price, .cost, [class*="price"]').text());
        const price = extractPrice(priceText);

        if (!title || title.length < 5) return;

        results.push({
          title: title.slice(0, 100),
          description: cleanText($el.find('.desc, .description, p').first().text()) || `조이마케팅 서비스`,
          price,
          category: categorize(title),
          sourceUrl: link.startsWith('http') ? link : `${BASE_URL}${link || ''}`,
        });
      });
    }

    // Deduplicate by title
    const seen = new Set();
    const unique = results.filter(r => {
      if (seen.has(r.title)) return false;
      seen.add(r.title);
      return true;
    }).slice(0, 30);

    const saveResult = await saveProducts(db, unique, SOURCE, options);
    await logCrawl(db, SOURCE, { status: 'success', ...saveResult });
    return saveResult;
  } catch (error) {
    console.error(`[${SOURCE}] Crawl error:`, error.message);
    await logCrawl(db, SOURCE, { status: 'error', error: error.message });
    return { error: error.message };
  }
}

module.exports = { crawl, SOURCE };
