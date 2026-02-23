/**
 * App bootstrap - ES Module entry point
 * Korean Marketing & E-commerce News Dashboard
 */

import { fetchArticles, resetPagination } from './js/feed-service.js';
import { renderCards, renderSkeletons, clearCards } from './js/card-renderer.js';
import { initSearch, onSearch, getCurrentQuery } from './js/search.js';
import { initNewsletter } from './js/newsletter.js';
import { initDailySummary } from './js/daily-summary.js';

const feedList = document.getElementById('feedList');
const loadingIndicator = document.getElementById('loadingIndicator');
const emptyState = document.getElementById('emptyState');
const statsCount = document.getElementById('statsCount');
const scrollTopBtn = document.getElementById('scrollTop');

let isLoading = false;
let allItems = [];

async function loadFeed(append = false) {
  if (isLoading) return;
  isLoading = true;

  if (!append) {
    clearCards(feedList);
    renderSkeletons(feedList, 6);
    resetPagination();
    allItems = [];
  } else {
    loadingIndicator.style.display = 'flex';
  }

  try {
    const { items, hasMore } = await fetchArticles({ searchQuery: getCurrentQuery() });

    if (!append) {
      clearCards(feedList);
    } else {
      loadingIndicator.style.display = 'none';
    }

    allItems = append ? [...allItems, ...items] : items;

    if (allItems.length === 0) {
      emptyState.style.display = 'block';
    } else {
      emptyState.style.display = 'none';
      renderCards(feedList, items);
    }

    updateStats(allItems.length);

    if (hasMore) {
      observeLastItem();
    }
  } catch (err) {
    console.error('Failed to load feed:', err);
    if (!append) clearCards(feedList);
    emptyState.style.display = 'block';
  } finally {
    isLoading = false;
    loadingIndicator.style.display = 'none';
  }
}

function updateStats(count) {
  if (!statsCount) return;
  statsCount.textContent = `${count}개 뉴스`;
}

// Tabs removed - single feed only

// Infinite scroll observer
let observer = null;
function observeLastItem() {
  if (observer) observer.disconnect();

  observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && !isLoading) {
      loadFeed(true);
    }
  }, { rootMargin: '200px' });

  const items = feedList.querySelectorAll('.feed-item');
  if (items.length > 0) {
    observer.observe(items[items.length - 1]);
  }
}

function initScrollTop() {
  if (!scrollTopBtn) return;
  window.addEventListener('scroll', () => {
    scrollTopBtn.classList.toggle('visible', window.scrollY > 400);
  }, { passive: true });
  scrollTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

async function init() {
  initSearch();
  initNewsletter();
  initScrollTop();
  await initDailySummary();

  onSearch(() => loadFeed(false));

  await loadFeed(false);
}

init().catch(console.error);
