/**
 * GPA코리아 크롤러 - store.gpakorea.com
 * 상품 목록, 가격, 카테고리 추출
 */

const { fetchHtml, cleanText, extractPrice, saveProducts, logCrawl, sleep } = require('./base-crawler');

const SOURCE = 'GPA코리아';
const BASE_URL = 'https://store.gpakorea.com';

// Category mapping based on product keywords
const CATEGORY_MAP = {
  '바이럴': 'viral',
  '카페': 'viral',
  '커뮤니티': 'viral',
  '핫딜': 'viral',
  '리뷰': 'review',
  '체험단': 'review',
  '후기': 'review',
  '플레이스': 'review',
  '트래픽': 'traffic',
  '상위노출': 'traffic',
  '순위': 'traffic',
  '검색': 'traffic',
  '인스타': 'sns',
  '유튜브': 'sns',
  '틱톡': 'sns',
  '인플루언서': 'sns',
  'SNS': 'sns',
  '네이버': 'naver',
  '블로그': 'naver',
  '카카오': 'naver',
  '스마트스토어': 'naver',
  '쿠팡': 'ecommerce',
  '11번가': 'ecommerce',
  'G마켓': 'ecommerce',
  '마켓': 'ecommerce',
};

function categorize(title, description = '') {
  const text = `${title} ${description}`.toLowerCase();
  for (const [keyword, category] of Object.entries(CATEGORY_MAP)) {
    if (text.includes(keyword.toLowerCase())) {
      return category;
    }
  }
  return 'viral'; // default
}

async function crawl(db, options = {}) {
  const results = [];

  try {
    const $ = await fetchHtml(BASE_URL);

    // Try common e-commerce selectors for product listings
    const selectors = [
      '.product-item', '.item-list li', '.prd-list li',
      '.goods-list li', '.product_item', '.shop-item',
      '.item-box', '.product-box', '[class*="product"]',
    ];

    let productElements = [];
    for (const sel of selectors) {
      const found = $(sel);
      if (found.length > 0) {
        productElements = found;
        break;
      }
    }

    // If specific selectors fail, try generic approach
    if (productElements.length === 0) {
      // Look for links with price-like content
      $('a').each((_, el) => {
        const $el = $(el);
        const text = cleanText($el.text());
        const href = $el.attr('href') || '';
        if (text.length > 10 && text.length < 200 && href.includes('/product')) {
          const priceMatch = text.match(/[\d,]+원/);
          results.push({
            title: cleanText(text.replace(/[\d,]+원.*/, '')).slice(0, 100),
            description: '',
            price: priceMatch ? extractPrice(priceMatch[0]) : null,
            category: categorize(text),
            sourceUrl: href.startsWith('http') ? href : `${BASE_URL}${href}`,
          });
        }
      });
    } else {
      productElements.each((_, el) => {
        const $el = $(el);
        const title = cleanText(
          $el.find('.prd-name, .item-name, .product-name, .name, h3, h4, .title, [class*="name"]').first().text()
        );
        const priceText = cleanText(
          $el.find('.prd-price, .item-price, .product-price, .price, [class*="price"]').first().text()
        );
        const description = cleanText(
          $el.find('.prd-desc, .item-desc, .description, .desc, [class*="desc"]').first().text()
        );
        const link = $el.find('a').attr('href') || $el.closest('a').attr('href') || '';

        if (title) {
          results.push({
            title: title.slice(0, 100),
            description: description.slice(0, 300),
            price: extractPrice(priceText),
            category: categorize(title, description),
            sourceUrl: link.startsWith('http') ? link : `${BASE_URL}${link}`,
          });
        }
      });
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
