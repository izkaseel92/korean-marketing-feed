/**
 * 크몽 마케팅 카테고리 크롤러 - kmong.com
 * 마케팅 서비스 목록, 가격 크롤링
 */

const { fetchHtml, cleanText, extractPrice, saveProducts, logCrawl, sleep } = require('./base-crawler');

const SOURCE = '크몽';
const BASE_URL = 'https://kmong.com';
// Marketing category pages
const CRAWL_URLS = [
  `${BASE_URL}/category/500`,  // 마케팅 전체
];

const CATEGORY_MAP = {
  '바이럴': 'viral', '카페': 'viral', '커뮤니티': 'viral',
  '리뷰': 'review', '체험단': 'review', '후기': 'review',
  '트래픽': 'traffic', '상위노출': 'traffic', '순위': 'traffic', 'SEO': 'traffic',
  '인스타': 'sns', '유튜브': 'sns', '틱톡': 'sns', '인플루언서': 'sns', 'SNS': 'sns',
  '네이버': 'naver', '블로그': 'naver', '카카오': 'naver', '플레이스': 'naver',
  '쿠팡': 'ecommerce', '스토어': 'ecommerce', '마켓플레이스': 'ecommerce',
};

function categorize(text) {
  for (const [keyword, category] of Object.entries(CATEGORY_MAP)) {
    if (text.includes(keyword)) return category;
  }
  return 'sns'; // Kmong marketing default
}

async function crawl(db) {
  const results = [];

  try {
    for (const url of CRAWL_URLS) {
      const $ = await fetchHtml(url);

      // Kmong uses card-based layout
      const selectors = [
        '.gig-card', '.service-card', '.portfolio-card',
        '[class*="GigCard"]', '[class*="ServiceCard"]',
        '.list-item', '.card-item', 'article',
      ];

      let cards = [];
      for (const sel of selectors) {
        const found = $(sel);
        if (found.length > 0) {
          cards = found;
          break;
        }
      }

      cards.each((_, el) => {
        const $el = $(el);
        const title = cleanText(
          $el.find('.title, h3, h4, [class*="title"], [class*="name"]').first().text()
        );
        const priceText = cleanText(
          $el.find('.price, [class*="price"], [class*="Price"]').first().text()
        );
        const seller = cleanText(
          $el.find('.seller, .username, [class*="seller"], [class*="user"]').first().text()
        );
        const link = $el.find('a').first().attr('href') || '';

        if (title && title.length > 3) {
          results.push({
            title: title.slice(0, 100),
            description: seller ? `판매자: ${seller}` : '',
            price: extractPrice(priceText),
            category: categorize(title),
            sourceUrl: link.startsWith('http') ? link : `${BASE_URL}${link}`,
          });
        }
      });

      await sleep(1000); // Rate limiting between pages
    }

    const saveResult = await saveProducts(db, results, SOURCE);
    await logCrawl(db, SOURCE, { status: 'success', ...saveResult });
    return saveResult;
  } catch (error) {
    console.error(`[${SOURCE}] Crawl error:`, error.message);
    await logCrawl(db, SOURCE, { status: 'error', error: error.message });
    return { error: error.message };
  }
}

module.exports = { crawl, SOURCE };
