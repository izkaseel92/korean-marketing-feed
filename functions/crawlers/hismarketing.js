/**
 * 히즈마케팅 크롤러 - hismarketing.kr
 * 네이버/쿠팡 상위노출 프로그램 카탈로그
 */

const { fetchHtml, cleanText, extractPrice, saveProducts, logCrawl } = require('./base-crawler');

const SOURCE = '히즈마케팅';
const BASE_URL = 'https://hismarketing.kr';

const CATEGORY_MAP = {
  '블로그': 'naver', '네이버': 'naver', '플레이스': 'naver', '카카오': 'naver',
  '상위노출': 'traffic', '트래픽': 'traffic', '순위': 'traffic', '클릭': 'traffic',
  '리뷰': 'review', '체험단': 'review', '후기': 'review',
  '바이럴': 'viral', '카페': 'viral',
  '인스타': 'sns', '유튜브': 'sns', '틱톡': 'sns',
  '쿠팡': 'ecommerce', '스마트스토어': 'ecommerce', '오픈마켓': 'ecommerce',
};

function categorize(text) {
  for (const [keyword, category] of Object.entries(CATEGORY_MAP)) {
    if (text.includes(keyword)) return category;
  }
  return 'traffic';
}

async function crawl(db, options = {}) {
  const results = [];

  try {
    const $ = await fetchHtml(BASE_URL, { timeout: 20000 });

    const selectors = [
      '.product-list .item', '.goods-list .goods-item',
      '.item-wrap', '.product-item', '.prd-list li',
      '.shop-item', 'ul.product li',
    ];

    let items = [];
    for (const sel of selectors) {
      const found = $(sel);
      if (found.length > 2) { items = found; break; }
    }

    if (items.length === 0) {
      // Fallback: scan for heading+price patterns
      $('h2, h3, h4').each((_, el) => {
        const $el = $(el);
        const title = cleanText($el.text());
        if (title.length < 6 || title.length > 100) return;

        const $section = $el.closest('section, div, li, article');
        const priceText = cleanText($section.find('[class*="price"], .cost, strong').first().text());
        const price = extractPrice(priceText);
        const link = $section.find('a').first().attr('href') || BASE_URL;

        results.push({
          title: title.slice(0, 100),
          description: cleanText($section.find('p').first().text()) || '히즈마케팅 서비스',
          price,
          category: categorize(title),
          sourceUrl: link.startsWith('http') ? link : `${BASE_URL}${link}`,
        });
      });
    } else {
      items.each((_, el) => {
        const $el = $(el);
        const title = cleanText($el.find('.title, h3, h4, .name, a').first().text());
        const link = $el.find('a').first().attr('href') || '';
        const priceText = cleanText($el.find('[class*="price"], .cost').text());
        const price = extractPrice(priceText);
        const desc = cleanText($el.find('.desc, p').first().text());

        if (!title || title.length < 5) return;

        results.push({
          title: title.slice(0, 100),
          description: desc || '히즈마케팅 서비스',
          price,
          category: categorize(title),
          sourceUrl: link.startsWith('http') ? link : `${BASE_URL}${link || ''}`,
        });
      });
    }

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
