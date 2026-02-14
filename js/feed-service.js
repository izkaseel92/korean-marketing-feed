/**
 * Feed Service - reads products and articles from Firestore
 * Supports pagination (infinite scroll), category filtering, and search
 */

import { db, collection, query, where, orderBy, limit, startAfter, getDocs } from './firebase-init.js';

const PAGE_SIZE = 20;
let lastProductDoc = null;
let lastArticleDoc = null;
let hasMoreProducts = true;
let hasMoreArticles = true;

// Demo data for when Firebase is not configured
const DEMO_PRODUCTS = [
  {
    id: 'demo-1',
    type: 'product',
    title: '네이버 블로그 체험단 리뷰 20건',
    description: '실제 블로거를 통한 체험단 리뷰 작성. 사진 포함 상세 리뷰 보장. 네이버 검색 최적화.',
    price: 450000,
    source: 'GPA코리아',
    sourceUrl: 'https://store.gpakorea.com',
    category: 'review',
    isNew: true,
    crawledAt: new Date(Date.now() - 3600000),
  },
  {
    id: 'demo-2',
    type: 'product',
    title: '인스타그램 릴스 인플루언서 마케팅',
    description: '팔로워 1만+ 인플루언서 릴스 제작 및 게시. 브랜드 맞춤 콘텐츠 기획.',
    price: 800000,
    source: '실행사닷컴',
    sourceUrl: 'https://practicecorp.kr',
    category: 'sns',
    isNew: true,
    crawledAt: new Date(Date.now() - 7200000),
  },
  {
    id: 'demo-3',
    type: 'product',
    title: '쿠팡 검색 상위노출 패키지',
    description: '쿠팡 키워드 검색 1페이지 노출 보장. 트래픽 부스팅 + 리뷰 관리 포함.',
    price: 1200000,
    source: '지프라마케팅',
    sourceUrl: 'https://shop.gprized.com',
    category: 'traffic',
    isNew: false,
    crawledAt: new Date(Date.now() - 14400000),
  },
  {
    id: 'demo-4',
    type: 'product',
    title: '맘카페 바이럴 마케팅 50건',
    description: '주요 맘카페 자연스러운 후기글 작성. 육아/생활용품/식품 브랜드 전문.',
    price: 350000,
    source: 'GPA코리아',
    sourceUrl: 'https://store.gpakorea.com',
    category: 'viral',
    isNew: false,
    crawledAt: new Date(Date.now() - 28800000),
  },
  {
    id: 'demo-5',
    type: 'product',
    title: '네이버 플레이스 리뷰 관리 서비스',
    description: '네이버 플레이스(지도) 리뷰 작성 및 평점 관리. 영수증 리뷰 포함.',
    price: 280000,
    source: '아이보스',
    sourceUrl: 'https://www.i-boss.co.kr',
    category: 'naver',
    isNew: true,
    crawledAt: new Date(Date.now() - 36000000),
  },
  {
    id: 'demo-6',
    type: 'product',
    title: '11번가 마켓플레이스 광고 대행',
    description: '11번가 입점 상품 광고 최적화. 키워드 광고 + 딜 프로모션 운영.',
    price: 500000,
    source: '크몽',
    sourceUrl: 'https://kmong.com',
    category: 'ecommerce',
    isNew: false,
    crawledAt: new Date(Date.now() - 43200000),
  },
  {
    id: 'demo-7',
    type: 'product',
    title: '틱톡 챌린지 마케팅 패키지',
    description: '틱톡 해시태그 챌린지 기획 및 크리에이터 섭외. 바이럴 확산 보장.',
    price: 2000000,
    source: '실행사닷컴',
    sourceUrl: 'https://practicecorp.kr',
    category: 'sns',
    isNew: true,
    crawledAt: new Date(Date.now() - 50000000),
  },
  {
    id: 'demo-8',
    type: 'product',
    title: '카카오 비즈보드 광고 운영 대행',
    description: '카카오톡 비즈보드 광고 셋업 및 최적화. 타겟팅, A/B 테스트 포함.',
    price: 600000,
    source: '지프라마케팅',
    sourceUrl: 'https://shop.gprized.com',
    category: 'naver',
    isNew: false,
    crawledAt: new Date(Date.now() - 60000000),
  },
];

const DEMO_ARTICLES = [
  {
    id: 'demo-a1',
    type: 'article',
    title: '2026년 한국 이커머스 마케팅 트렌드 TOP 10',
    description: '올해 주목해야 할 한국 이커머스 마케팅 트렌드를 정리했습니다. AI 개인화, 숏폼 콘텐츠, 라이브 커머스가 핵심입니다.',
    source: '모비인사이드',
    sourceUrl: 'https://www.mobiinside.co.kr',
    category: 'trend',
    thumbnailUrl: '',
    publishedAt: new Date(Date.now() - 3600000),
    isNew: true,
  },
  {
    id: 'demo-a2',
    type: 'article',
    title: '네이버 쇼핑 알고리즘 변경 - 셀러가 알아야 할 것들',
    description: '네이버 쇼핑 검색 알고리즘이 업데이트되었습니다. 상품 리뷰와 구매 전환율이 더 중요해졌습니다.',
    source: '오픈애즈',
    sourceUrl: 'https://www.openads.co.kr',
    category: 'trend',
    thumbnailUrl: '',
    publishedAt: new Date(Date.now() - 18000000),
    isNew: true,
  },
  {
    id: 'demo-a3',
    type: 'article',
    title: '쿠팡 로켓그로스 입점 가이드 - 해외 셀러 필독',
    description: '해외 셀러를 위한 쿠팡 로켓그로스 입점 절차와 마케팅 전략을 상세히 안내합니다.',
    source: 'Platum',
    sourceUrl: 'https://platum.kr',
    category: 'trend',
    thumbnailUrl: '',
    publishedAt: new Date(Date.now() - 86400000),
    isNew: false,
  },
  {
    id: 'demo-a4',
    type: 'article',
    title: '숏폼 마케팅의 ROI 측정 방법론',
    description: '틱톡, 릴스, 쇼츠 등 숏폼 콘텐츠 마케팅의 효과를 정량적으로 측정하는 프레임워크를 소개합니다.',
    source: '브런치',
    sourceUrl: 'https://brunch.co.kr',
    category: 'trend',
    thumbnailUrl: '',
    publishedAt: new Date(Date.now() - 172800000),
    isNew: false,
  },
];

function isFirebaseConfigured() {
  try {
    // Check if Firebase config has real values
    return db && db.type === 'firestore';
  } catch {
    return false;
  }
}

export function resetPagination() {
  lastProductDoc = null;
  lastArticleDoc = null;
  hasMoreProducts = true;
  hasMoreArticles = true;
}

export async function fetchFeedItems({ category = 'all', searchQuery = '', page = 1 } = {}) {
  // Try Firestore first, fall back to demo data
  try {
    if (!isFirebaseConfigured()) throw new Error('Firebase not configured');

    const items = [];

    // Fetch products
    if (hasMoreProducts) {
      let q = query(
        collection(db, 'products'),
        orderBy('crawledAt', 'desc'),
        limit(PAGE_SIZE)
      );

      if (category !== 'all' && category !== 'trend') {
        q = query(
          collection(db, 'products'),
          where('category', '==', category),
          orderBy('crawledAt', 'desc'),
          limit(PAGE_SIZE)
        );
      }

      if (lastProductDoc) {
        q = query(q, startAfter(lastProductDoc));
      }

      const snapshot = await getDocs(q);
      snapshot.forEach(doc => {
        items.push({ id: doc.id, type: 'product', ...doc.data() });
      });

      if (snapshot.docs.length > 0) {
        lastProductDoc = snapshot.docs[snapshot.docs.length - 1];
      }
      hasMoreProducts = snapshot.docs.length === PAGE_SIZE;
    }

    // Fetch articles (trend category)
    if (category === 'all' || category === 'trend') {
      if (hasMoreArticles) {
        let q = query(
          collection(db, 'articles'),
          orderBy('publishedAt', 'desc'),
          limit(PAGE_SIZE)
        );

        if (lastArticleDoc) {
          q = query(q, startAfter(lastArticleDoc));
        }

        const snapshot = await getDocs(q);
        snapshot.forEach(doc => {
          items.push({ id: doc.id, type: 'article', ...doc.data() });
        });

        if (snapshot.docs.length > 0) {
          lastArticleDoc = snapshot.docs[snapshot.docs.length - 1];
        }
        hasMoreArticles = snapshot.docs.length === PAGE_SIZE;
      }
    }

    // Sort combined results by date
    items.sort((a, b) => {
      const dateA = a.crawledAt?.toDate?.() || new Date(a.crawledAt || a.publishedAt);
      const dateB = b.crawledAt?.toDate?.() || new Date(b.crawledAt || b.publishedAt);
      return dateB - dateA;
    });

    return { items, hasMore: hasMoreProducts || hasMoreArticles };
  } catch {
    // Return demo data when Firebase is not available
    return getDemoData(category, searchQuery);
  }
}

function getDemoData(category, searchQuery) {
  let items = [...DEMO_PRODUCTS, ...DEMO_ARTICLES];

  if (category !== 'all') {
    items = items.filter(item => item.category === category);
  }

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    items = items.filter(item =>
      (item.title || '').toLowerCase().includes(q) ||
      (item.description || '').toLowerCase().includes(q) ||
      (item.source || '').toLowerCase().includes(q)
    );
  }

  items.sort((a, b) => {
    const dateA = a.crawledAt || a.publishedAt;
    const dateB = b.crawledAt || b.publishedAt;
    return dateB - dateA;
  });

  return { items, hasMore: false };
}

export function hasMoreItems() {
  return hasMoreProducts || hasMoreArticles;
}
