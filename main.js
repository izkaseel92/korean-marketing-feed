/**
 * App bootstrap - ES Module entry point
 */

import { initI18n, onLangChange } from './js/i18n.js';
import { fetchFeedItems, resetPagination } from './js/feed-service.js';
import { renderCards, renderSkeletons, clearCards } from './js/card-renderer.js';
import { initCategoryFilter, onFilterChange, getCurrentCategory } from './js/category-filter.js';
import { initSearch, onSearch, getCurrentQuery } from './js/search.js';
import { initNewsletter } from './js/newsletter.js';

const cardGrid = document.getElementById('cardGrid');
const loadingIndicator = document.getElementById('loadingIndicator');
const emptyState = document.getElementById('emptyState');
const statsCount = document.getElementById('statsCount');
const scrollTopBtn = document.getElementById('scrollTop');

let isLoading = false;
let allItems = [];

// Load and render feed
async function loadFeed(append = false) {
  if (isLoading) return;
  isLoading = true;

  const category = getCurrentCategory();
  const searchQuery = getCurrentQuery();

  if (!append) {
    clearCards(cardGrid);
    renderSkeletons(cardGrid, 8);
    resetPagination();
    allItems = [];
  } else {
    loadingIndicator.style.display = 'flex';
  }

  try {
    const { items, hasMore } = await fetchFeedItems({ category, searchQuery });

    if (!append) {
      clearCards(cardGrid);
    } else {
      loadingIndicator.style.display = 'none';
    }

    allItems = append ? [...allItems, ...items] : items;

    if (allItems.length === 0) {
      emptyState.style.display = 'block';
    } else {
      emptyState.style.display = 'none';
      renderCards(cardGrid, items);
    }

    updateStats(allItems.length);

    // Set up infinite scroll if more items
    if (hasMore) {
      observeLastCard();
    }
  } catch (err) {
    console.error('Failed to load feed:', err);
    if (!append) clearCards(cardGrid);
    emptyState.style.display = 'block';
  } finally {
    isLoading = false;
    loadingIndicator.style.display = 'none';
  }
}

function updateStats(count) {
  if (!statsCount) return;
  const template = statsCount.getAttribute('data-i18n');
  if (template) {
    // Will be handled by i18n with {count} param
    statsCount.textContent = statsCount.textContent.replace(/\d+/, count) || `${count}`;
  }
  statsCount.textContent = `${count}${document.documentElement.lang === 'ko' ? '개 피드' : document.documentElement.lang === 'zh' ? '个动态' : ' feeds'}`;
}

// Infinite scroll observer
let observer = null;
function observeLastCard() {
  if (observer) observer.disconnect();

  observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && !isLoading) {
      loadFeed(true);
    }
  }, { rootMargin: '200px' });

  const cards = cardGrid.querySelectorAll('.feed-card');
  if (cards.length > 0) {
    observer.observe(cards[cards.length - 1]);
  }
}

// Scroll to top button
function initScrollTop() {
  if (!scrollTopBtn) return;

  window.addEventListener('scroll', () => {
    scrollTopBtn.classList.toggle('visible', window.scrollY > 400);
  }, { passive: true });

  scrollTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// Initialize app
async function init() {
  // Init i18n first (loads translations)
  await initI18n();

  // Init UI components
  initCategoryFilter();
  initSearch();
  initNewsletter();
  initScrollTop();

  // Set up filter/search callbacks
  onFilterChange(() => loadFeed(false));
  onSearch(() => loadFeed(false));
  onLangChange(() => loadFeed(false));

  // Initial load
  await loadFeed(false);
}

init().catch(console.error);
