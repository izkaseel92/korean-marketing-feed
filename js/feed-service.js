/**
 * Feed Service - reads products and articles from Firestore
 * Tab-aware: services, news, competitor intel
 */

import { db, collection, query, where, orderBy, limit, startAfter, getDocs } from './firebase-init.js';

const PAGE_SIZE = 20;

// Pagination state per tab
const state = {
  services:   { lastDoc: null, hasMore: true },
  news:       { lastDoc: null, hasMore: true },
  competitor: { lastDoc: null, hasMore: true },
};

// Demo data
const DEMO_PRODUCTS = [
  {
    id: 'demo-1', type: 'product',
    title: '네이버 블로그 체험단 리뷰 20건',
    description: '실제 블로거를 통한 체험단 리뷰 작성. 사진 포함 상세 리뷰 보장. 네이버 검색 최적화.',
    aiSummary: '네이버 블로그 체험단을 통해 실제 사용자 리뷰를 확보하는 서비스입니다. SEO 효과와 함께 브랜드 신뢰도를 높이는 데 적합합니다.',
    price: 450000, source: 'GPA코리아', sourceUrl: 'https://store.gpakorea.com',
    category: 'review', isNew: true, crawledAt: new Date(Date.now() - 3600000),
  },
  {
    id: 'demo-2', type: 'product',
    title: '인스타그램 릴스 인플루언서 마케팅',
    description: '팔로워 1만+ 인플루언서 릴스 제작 및 게시. 브랜드 맞춤 콘텐츠 기획.',
    aiSummary: '인스타그램 릴스 포맷으로 1만 팔로워 이상 인플루언서와 협업하는 SNS 마케팅 서비스입니다. 숏폼 콘텐츠 수요가 높은 브랜드에 적합합니다.',
    price: 800000, source: '실행사닷컴', sourceUrl: 'https://practicecorp.kr',
    category: 'sns', isNew: true, crawledAt: new Date(Date.now() - 7200000),
  },
  {
    id: 'demo-3', type: 'product',
    title: '쿠팡 검색 상위노출 패키지',
    description: '쿠팡 키워드 검색 1페이지 노출 보장. 트래픽 부스팅 + 리뷰 관리 포함.',
    aiSummary: '쿠팡 플랫폼 내 키워드 검색 최상위 노출을 보장하는 패키지입니다. 트래픽과 리뷰를 동시에 관리해 전환율 향상에 효과적입니다.',
    price: 1200000, source: '지프라마케팅', sourceUrl: 'https://shop.gprized.com',
    category: 'traffic', isNew: false, crawledAt: new Date(Date.now() - 14400000),
  },
  {
    id: 'demo-4', type: 'product',
    title: '맘카페 바이럴 마케팅 50건',
    description: '주요 맘카페 자연스러운 후기글 작성. 육아/생활용품/식품 브랜드 전문.',
    price: 350000, source: 'GPA코리아', sourceUrl: 'https://store.gpakorea.com',
    category: 'viral', isNew: false, crawledAt: new Date(Date.now() - 28800000),
  },
  {
    id: 'demo-5', type: 'product',
    title: '네이버 플레이스 리뷰 관리 서비스',
    description: '네이버 플레이스(지도) 리뷰 작성 및 평점 관리. 영수증 리뷰 포함.',
    price: 280000, source: '아이보스', sourceUrl: 'https://www.i-boss.co.kr',
    category: 'naver', isNew: true, crawledAt: new Date(Date.now() - 36000000),
  },
  {
    id: 'demo-6', type: 'product',
    title: '11번가 마켓플레이스 광고 대행',
    description: '11번가 입점 상품 광고 최적화. 키워드 광고 + 딜 프로모션 운영.',
    price: 500000, source: '크몽', sourceUrl: 'https://kmong.com',
    category: 'ecommerce', isNew: false, crawledAt: new Date(Date.now() - 43200000),
  },
  {
    id: 'demo-7', type: 'product',
    title: '틱톡 챌린지 마케팅 패키지',
    description: '틱톡 해시태그 챌린지 기획 및 크리에이터 섭외. 바이럴 확산 보장.',
    price: 2000000, source: '실행사닷컴', sourceUrl: 'https://practicecorp.kr',
    category: 'sns', isNew: true, crawledAt: new Date(Date.now() - 50000000),
  },
  {
    id: 'demo-8', type: 'product',
    title: '카카오 비즈보드 광고 운영 대행',
    description: '카카오톡 비즈보드 광고 셋업 및 최적화. 타겟팅, A/B 테스트 포함.',
    price: 600000, source: '지프라마케팅', sourceUrl: 'https://shop.gprized.com',
    category: 'naver', isNew: false, crawledAt: new Date(Date.now() - 60000000),
  },
];

const DEMO_ARTICLES = [
  {
    id: 'demo-a1', type: 'article',
    title: '2026년 한국 이커머스 마케팅 트렌드 TOP 10',
    description: '올해 주목해야 할 한국 이커머스 마케팅 트렌드를 정리했습니다. AI 개인화, 숏폼 콘텐츠, 라이브 커머스가 핵심입니다.',
    aiSummary: '2026년 한국 이커머스는 AI 개인화와 숏폼 콘텐츠가 핵심 경쟁력입니다. 라이브 커머스 확대로 실시간 구매 전환율이 높아지고 있어 광고대행사의 역할이 더욱 중요해집니다.',
    source: '모비인사이드', sourceUrl: 'https://www.mobiinside.co.kr',
    category: 'trend', publishedAt: new Date(Date.now() - 3600000), isNew: true,
  },
  {
    id: 'demo-a2', type: 'article',
    title: '네이버 쇼핑 알고리즘 변경 - 셀러가 알아야 할 것들',
    description: '네이버 쇼핑 검색 알고리즘이 업데이트되었습니다. 상품 리뷰와 구매 전환율이 더 중요해졌습니다.',
    aiSummary: '네이버 쇼핑 알고리즘 업데이트로 리뷰 수와 구매 전환율이 노출 순위에 더 큰 영향을 미치게 됩니다. 클라이언트에게 리뷰 관리 서비스 제안 시 이 변화를 근거로 활용할 수 있습니다.',
    source: '오픈애즈', sourceUrl: 'https://www.openads.co.kr',
    category: 'trend', publishedAt: new Date(Date.now() - 18000000), isNew: true,
  },
  {
    id: 'demo-a3', type: 'article',
    title: '쿠팡 로켓그로스 입점 가이드 - 해외 셀러 필독',
    description: '해외 셀러를 위한 쿠팡 로켓그로스 입점 절차와 마케팅 전략을 상세히 안내합니다.',
    source: 'Platum', sourceUrl: 'https://platum.kr',
    category: 'trend', publishedAt: new Date(Date.now() - 86400000), isNew: false,
  },
  {
    id: 'demo-a4', type: 'article',
    title: '숏폼 마케팅의 ROI 측정 방법론',
    description: '틱톡, 릴스, 쇼츠 등 숏폼 콘텐츠 마케팅의 효과를 정량적으로 측정하는 프레임워크를 소개합니다.',
    source: '브런치', sourceUrl: 'https://brunch.co.kr',
    category: 'trend', publishedAt: new Date(Date.now() - 172800000), isNew: false,
  },
];

// Demo competitor intel (아이보스 items)
const DEMO_COMPETITOR = DEMO_PRODUCTS.filter(p => p.source === '아이보스');

function isFirebaseConfigured() {
  try {
    return db && db.type === 'firestore';
  } catch {
    return false;
  }
}

export function resetPagination(tab = null) {
  if (tab) {
    state[tab] = { lastDoc: null, hasMore: true };
  } else {
    state.services   = { lastDoc: null, hasMore: true };
    state.news       = { lastDoc: null, hasMore: true };
    state.competitor = { lastDoc: null, hasMore: true };
  }
}

export async function fetchServices({ category = 'all', searchQuery = '' } = {}) {
  try {
    if (!isFirebaseConfigured()) throw new Error('Firebase not configured');
    if (!state.services.hasMore) return { items: [], hasMore: false };

    let q = query(collection(db, 'products'), orderBy('crawledAt', 'desc'), limit(PAGE_SIZE));
    if (category !== 'all') {
      q = query(collection(db, 'products'), where('category', '==', category), orderBy('crawledAt', 'desc'), limit(PAGE_SIZE));
    }
    if (state.services.lastDoc) q = query(q, startAfter(state.services.lastDoc));

    const snapshot = await getDocs(q);
    const items = [];
    snapshot.forEach(doc => items.push({ id: doc.id, type: 'product', ...doc.data() }));
    if (snapshot.docs.length > 0) state.services.lastDoc = snapshot.docs[snapshot.docs.length - 1];
    state.services.hasMore = snapshot.docs.length === PAGE_SIZE;

    return { items: applySearch(items, searchQuery), hasMore: state.services.hasMore };
  } catch {
    let items = [...DEMO_PRODUCTS];
    if (category !== 'all') items = items.filter(p => p.category === category);
    return { items: applySearch(items, searchQuery), hasMore: false };
  }
}

export async function fetchNews({ searchQuery = '' } = {}) {
  try {
    if (!isFirebaseConfigured()) throw new Error('Firebase not configured');
    if (!state.news.hasMore) return { items: [], hasMore: false };

    let q = query(collection(db, 'articles'), orderBy('publishedAt', 'desc'), limit(PAGE_SIZE));
    if (state.news.lastDoc) q = query(q, startAfter(state.news.lastDoc));

    const snapshot = await getDocs(q);
    const items = [];
    snapshot.forEach(doc => items.push({ id: doc.id, type: 'article', ...doc.data() }));
    if (snapshot.docs.length > 0) state.news.lastDoc = snapshot.docs[snapshot.docs.length - 1];
    state.news.hasMore = snapshot.docs.length === PAGE_SIZE;

    return { items: applySearch(items, searchQuery), hasMore: state.news.hasMore };
  } catch {
    return { items: applySearch([...DEMO_ARTICLES], searchQuery), hasMore: false };
  }
}

export async function fetchCompetitorIntel({ searchQuery = '' } = {}) {
  try {
    if (!isFirebaseConfigured()) throw new Error('Firebase not configured');
    if (!state.competitor.hasMore) return { items: [], hasMore: false };

    let q = query(
      collection(db, 'products'),
      where('source', '==', '아이보스'),
      orderBy('crawledAt', 'desc'),
      limit(PAGE_SIZE)
    );
    if (state.competitor.lastDoc) q = query(q, startAfter(state.competitor.lastDoc));

    const snapshot = await getDocs(q);
    const items = [];
    snapshot.forEach(doc => items.push({ id: doc.id, type: 'product', ...doc.data() }));
    if (snapshot.docs.length > 0) state.competitor.lastDoc = snapshot.docs[snapshot.docs.length - 1];
    state.competitor.hasMore = snapshot.docs.length === PAGE_SIZE;

    return { items: applySearch(items, searchQuery), hasMore: state.competitor.hasMore };
  } catch {
    return { items: applySearch([...DEMO_COMPETITOR], searchQuery), hasMore: false };
  }
}

function applySearch(items, searchQuery) {
  if (!searchQuery) return items;
  const q = searchQuery.toLowerCase();
  return items.filter(item =>
    (item.title || '').toLowerCase().includes(q) ||
    (item.description || '').toLowerCase().includes(q) ||
    (item.source || '').toLowerCase().includes(q)
  );
}

// Legacy export (unused but keeps imports from breaking)
export function hasMoreItems() { return false; }
export async function fetchFeedItems() { return { items: [], hasMore: false }; }
