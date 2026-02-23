/**
 * Feed Service - reads articles from Firestore
 * Fetches Korean marketing & e-commerce news from RSS sources
 */

import { db, collection, query, orderBy, limit, startAfter, getDocs } from './firebase-init.js';

const PAGE_SIZE = 20;

// Pagination state
const state = {
  lastDoc: null,
  hasMore: true,
};

// Demo data (fallback when Firebase is not configured)
const DEMO_ARTICLES = [
  {
    id: 'demo-a1', type: 'article',
    title: '2026년 한국 이커머스 마케팅 트렌드 TOP 10',
    description: '올해 주목해야 할 한국 이커머스 마케팅 트렌드를 정리했습니다. AI 개인화, 숏폼 콘텐츠, 라이브 커머스가 핵심입니다.',
    aiSummary: '2026년 한국 이커머스는 AI 개인화와 숏폼 콘텐츠가 핵심 경쟁력입니다. 라이브 커머스 확대로 실시간 구매 전환율이 높아지고 있어 광고대행사의 역할이 더욱 중요해집니다.',
    source: '모비인사이드', sourceUrl: 'https://www.mobiinside.co.kr',
    category: 'trend', fetchedAt: new Date(Date.now() - 3600000), isNew: true,
  },
  {
    id: 'demo-a2', type: 'article',
    title: '네이버 쇼핑 알고리즘 변경 - 셀러가 알아야 할 것들',
    description: '네이버 쇼핑 검색 알고리즘이 업데이트되었습니다. 상품 리뷰와 구매 전환율이 더 중요해졌습니다.',
    aiSummary: '네이버 쇼핑 알고리즘 업데이트로 리뷰 수와 구매 전환율이 노출 순위에 더 큰 영향을 미치게 됩니다. 클라이언트에게 리뷰 관리 서비스 제안 시 이 변화를 근거로 활용할 수 있습니다.',
    source: '오픈애즈', sourceUrl: 'https://www.openads.co.kr',
    category: 'trend', fetchedAt: new Date(Date.now() - 18000000), isNew: true,
  },
  {
    id: 'demo-a3', type: 'article',
    title: '쿠팡 로켓그로스 입점 가이드 - 해외 셀러 필독',
    description: '해외 셀러를 위한 쿠팡 로켓그로스 입점 절차와 마케팅 전략을 상세히 안내합니다.',
    aiSummary: '쿠팡 로켓그로스를 통한 해외 셀러 입점 전략과 절차를 체계적으로 설명합니다.',
    source: '마케팅데일리', sourceUrl: 'https://www.marketingdaily.co.kr',
    category: 'trend', fetchedAt: new Date(Date.now() - 86400000), isNew: false,
  },
  {
    id: 'demo-a4', type: 'article',
    title: '숏폼 마케팅의 ROI 측정 방법론',
    description: '틱톡, 릴스, 쇼츠 등 숏폼 콘텐츠 마케팅의 효과를 정량적으로 측정하는 프레임워크를 소개합니다.',
    aiSummary: '숏폼 콘텐츠 마케팅의 성과를 정량적으로 측정하는 체계적인 방법론을 제시합니다.',
    source: '디지털인사이트', sourceUrl: 'https://www.ditoday.com',
    category: 'trend', fetchedAt: new Date(Date.now() - 172800000), isNew: false,
  },
];

function isFirebaseConfigured() {
  try {
    return db && db.type === 'firestore';
  } catch {
    return false;
  }
}

export function resetPagination() {
  state.lastDoc = null;
  state.hasMore = true;
}

/**
 * Fetch articles (news) from Firestore
 * @param {Object} options - Fetch options
 * @param {string} options.searchQuery - Optional search query
 * @returns {Promise<{items: Array, hasMore: boolean}>}
 */
export async function fetchArticles({ searchQuery = '' } = {}) {
  try {
    if (!isFirebaseConfigured()) throw new Error('Firebase not configured');
    if (!state.hasMore) return { items: [], hasMore: false };

    let q = query(
      collection(db, 'articles'),
      orderBy('fetchedAt', 'desc'),
      limit(PAGE_SIZE)
    );

    if (state.lastDoc) {
      q = query(q, startAfter(state.lastDoc));
    }

    const snapshot = await getDocs(q);
    const items = [];

    snapshot.forEach(doc => {
      items.push({ id: doc.id, type: 'article', ...doc.data() });
    });

    if (snapshot.docs.length > 0) {
      state.lastDoc = snapshot.docs[snapshot.docs.length - 1];
    }

    state.hasMore = snapshot.docs.length === PAGE_SIZE;

    return {
      items: applySearch(items, searchQuery),
      hasMore: state.hasMore
    };

  } catch (err) {
    console.warn('Failed to fetch from Firestore, using demo data:', err.message);
    return {
      items: applySearch([...DEMO_ARTICLES], searchQuery),
      hasMore: false
    };
  }
}

/**
 * Apply search filter to items
 * @param {Array} items - Items to filter
 * @param {string} searchQuery - Search query
 * @returns {Array} Filtered items
 */
function applySearch(items, searchQuery) {
  if (!searchQuery) return items;
  const q = searchQuery.toLowerCase();
  return items.filter(item =>
    (item.title || '').toLowerCase().includes(q) ||
    (item.description || '').toLowerCase().includes(q) ||
    (item.aiSummary || '').toLowerCase().includes(q) ||
    (item.source || '').toLowerCase().includes(q)
  );
}
