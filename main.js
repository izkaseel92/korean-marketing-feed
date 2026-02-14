/**
 * App bootstrap - ES Module entry point
 * 3-tab intelligence dashboard
 */

import { initI18n, onLangChange } from './js/i18n.js';
import { fetchServices, fetchNews, fetchCompetitorIntel, resetPagination } from './js/feed-service.js';
import { renderCards, renderSkeletons, clearCards } from './js/card-renderer.js';
import { initCategoryFilter, onFilterChange, getCurrentCategory } from './js/category-filter.js';
import { initSearch, onSearch, getCurrentQuery } from './js/search.js';
import { initNewsletter } from './js/newsletter.js';

const feedList = document.getElementById('feedList');
const loadingIndicator = document.getElementById('loadingIndicator');
const emptyState = document.getElementById('emptyState');
const statsCount = document.getElementById('statsCount');
const scrollTopBtn = document.getElementById('scrollTop');
const subFilterBar = document.getElementById('subFilterBar');

let isLoading = false;
let currentTab = 'services';
let allItems = [];

// Map tab to fetch function
const FETCH_FN = {
  services:   () => fetchServices({ category: getCurrentCategory(), searchQuery: getCurrentQuery() }),
  news:       () => fetchNews({ searchQuery: getCurrentQuery() }),
  competitor: () => fetchCompetitorIntel({ searchQuery: getCurrentQuery() }),
};

async function loadFeed(append = false) {
  if (isLoading) return;
  isLoading = true;

  if (!append) {
    clearCards(feedList);
    renderSkeletons(feedList, 6);
    resetPagination(currentTab);
    allItems = [];
  } else {
    loadingIndicator.style.display = 'flex';
  }

  try {
    const { items, hasMore } = await FETCH_FN[currentTab]();

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
      renderCards(feedList, items, currentTab);
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
  const lang = document.documentElement.lang;
  if (lang === 'ko') statsCount.textContent = `${count}개 피드`;
  else if (lang === 'zh') statsCount.textContent = `${count}个动态`;
  else statsCount.textContent = `${count} feeds`;
}

// Tab switching
function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.tab === currentTab) return;

      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTab = btn.dataset.tab;

      // Show sub-filters only on services tab
      if (subFilterBar) {
        subFilterBar.style.display = currentTab === 'services' ? '' : 'none';
      }

      loadFeed(false);
    });
  });
}

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
  await initI18n();

  initTabs();
  initCategoryFilter();
  initSearch();
  initNewsletter();
  initScrollTop();

  onFilterChange(() => loadFeed(false));
  onSearch(() => loadFeed(false));
  onLangChange(() => loadFeed(false));

  await loadFeed(false);
}

init().catch(console.error);
