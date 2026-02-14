/**
 * 지프라마케팅 크롤러 - shop.gprized.com
 * 실사용자 마케팅 상품 크롤링
 */

const { fetchHtml, cleanText, extractPrice, saveProducts, logCrawl } = require('./base-crawler');

const SOURCE = '지프라마케팅';
const BASE_URL = 'https://shop.gprized.com';

const CATEGORY_MAP = {
  '바이럴': 'viral', '카페': 'viral', '커뮤니티': 'viral',
  '리뷰': 'review', '체험단': 'review', '후기': 'review', '영수증': 'review',
  '트래픽': 'traffic', '상위노출': 'traffic', '순위': 'traffic', '키워드': 'traffic',
  '인스타': 'sns', '유튜브': 'sns', '틱톡': 'sns', '인플루언서': 'sns',
  '네이버': 'naver', '블로그': 'naver', '카카오': 'naver', '플레이스': 'naver',
  '쿠팡': 'ecommerce', '11번가': 'ecommerce', 'G마켓': 'ecommerce',
};

function categorize(text) {
  const lower = text.toLowerCase();
  for (const [keyword, category] of Object.entries(CATEGORY_MAP)) {
    if (lower.includes(keyword.toLowerCase())) return category;
  }
  return 'viral';
}

async function crawl(db, options = {}) {
  const results = [];

  try {
    const $ = await fetchHtml(BASE_URL);

    // Cafe24 / common Korean e-commerce selectors
    const selectors = [
      '.prdList li', '.product-list li', '.item-list li',
      '.prd-item', '.product-item', '.goods-list li',
      '[class*="product"] li', '.thumbnail', '.item-cont',
    ];

    let elements = [];
    for (const sel of selectors) {
      const found = $(sel);
      if (found.length > 0) {
        elements = found;
        break;
      }
    }

    const processElement = ($el) => {
      const title = cleanText(
        $el.find('.name, .prd-name, .item-name, .product-name, h3, h4, [class*="name"]').first().text()
      );
      const priceText = cleanText(
        $el.find('.price, .prd-price, [class*="price"] span, [class*="price"]').first().text()
      );
      const description = cleanText(
        $el.find('.desc, .description, .summary, [class*="desc"]').first().text()
      );
      const link = $el.find('a').first().attr('href') || '';

      if (title && title.length > 3) {
        results.push({
          title: title.slice(0, 100),
          description: description.slice(0, 300),
          price: extractPrice(priceText),
          category: categorize(title + ' ' + description),
          sourceUrl: link.startsWith('http') ? link : `${BASE_URL}${link}`,
        });
      }
    };

    if (elements.length > 0) {
      elements.each((_, el) => processElement($(el)));
    }

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
