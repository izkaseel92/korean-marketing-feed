/**
 * 실행사닷컴 크롤러 - practicecorp.kr
 * 광고 상품, 업종별 추천 추출
 */

const { fetchHtml, cleanText, extractPrice, saveProducts, logCrawl } = require('./base-crawler');

const SOURCE = '실행사닷컴';
const BASE_URL = 'https://practicecorp.kr';

const CATEGORY_MAP = {
  '바이럴': 'viral', '카페': 'viral', '커뮤니티': 'viral',
  '리뷰': 'review', '체험단': 'review', '후기': 'review',
  '트래픽': 'traffic', '상위노출': 'traffic', '순위': 'traffic',
  '인스타': 'sns', '유튜브': 'sns', '틱톡': 'sns',
  '네이버': 'naver', '블로그': 'naver', '카카오': 'naver',
  '쿠팡': 'ecommerce', '마켓': 'ecommerce',
};

function categorize(text) {
  const lower = text.toLowerCase();
  for (const [keyword, category] of Object.entries(CATEGORY_MAP)) {
    if (lower.includes(keyword.toLowerCase())) return category;
  }
  return 'viral';
}

async function crawl(db) {
  const results = [];

  try {
    const $ = await fetchHtml(BASE_URL);

    // Try to find service/product sections
    const selectors = [
      '.service-item', '.product-card', '.ad-product',
      '.item-card', '.service-card', '[class*="service"]',
      '.list-item', '.card', 'article',
    ];

    let elements = [];
    for (const sel of selectors) {
      const found = $(sel);
      if (found.length > 0) {
        elements = found;
        break;
      }
    }

    if (elements.length === 0) {
      // Generic approach - find content blocks
      $('section, .section, [class*="product"], [class*="service"]').each((_, section) => {
        const $section = $(section);
        $section.find('h2, h3, h4').each((_, heading) => {
          const title = cleanText($(heading).text());
          const desc = cleanText($(heading).next('p, .desc, .description').text());
          const priceText = cleanText($section.find('[class*="price"]').text());
          const link = $(heading).find('a').attr('href') || $(heading).closest('a').attr('href') || '';

          if (title && title.length > 3 && title.length < 100) {
            results.push({
              title,
              description: desc.slice(0, 300),
              price: extractPrice(priceText),
              category: categorize(title + ' ' + desc),
              sourceUrl: link.startsWith('http') ? link : `${BASE_URL}${link}`,
            });
          }
        });
      });
    } else {
      elements.each((_, el) => {
        const $el = $(el);
        const title = cleanText($el.find('h2, h3, h4, .title, .name, [class*="title"]').first().text());
        const description = cleanText($el.find('p, .desc, .description, [class*="desc"]').first().text());
        const priceText = cleanText($el.find('[class*="price"]').first().text());
        const link = $el.find('a').attr('href') || $el.closest('a').attr('href') || '';

        if (title && title.length > 3) {
          results.push({
            title: title.slice(0, 100),
            description: description.slice(0, 300),
            price: extractPrice(priceText),
            category: categorize(title + ' ' + description),
            sourceUrl: link.startsWith('http') ? link : `${BASE_URL}${link}`,
          });
        }
      });
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
