/**
 * Feed list item renderer — news-site list format
 */

import { timeAgo, formatPrice, escapeHtml } from './utils.js';
import { t } from './i18n.js';

export function renderSkeletons(container, count = 6) {
  const frag = document.createDocumentFragment();
  for (let i = 0; i < count; i++) {
    const row = document.createElement('div');
    row.className = 'feed-item skeleton-item';
    row.innerHTML = `
      <div class="feed-item-meta">
        <span class="skeleton skeleton-badge"></span>
        <span class="skeleton skeleton-badge"></span>
        <span class="skeleton skeleton-date"></span>
      </div>
      <div class="skeleton skeleton-title"></div>
      <div class="skeleton skeleton-summary"></div>
      <div class="skeleton skeleton-desc"></div>
    `;
    frag.appendChild(row);
  }
  container.appendChild(frag);
}

export function clearCards(container) {
  container.innerHTML = '';
}

export function renderCards(container, items, tabType = 'services') {
  const frag = document.createDocumentFragment();
  items.forEach(item => {
    frag.appendChild(createListItem(item, tabType));
  });
  container.appendChild(frag);
}

function createListItem(item, tabType) {
  const row = document.createElement('div');
  row.className = 'feed-item';
  row.dataset.type = item.type || 'product';

  const date = item.type === 'article'
    ? (item.publishedAt instanceof Date ? item.publishedAt : item.publishedAt?.toDate?.() || new Date(item.publishedAt))
    : (item.crawledAt instanceof Date ? item.crawledAt : item.crawledAt?.toDate?.() || new Date(item.crawledAt));

  const category = item.category || '';
  const categoryLabel = t('category.' + category) || category;
  const showPrice = tabType === 'services' && item.price;
  const link = escapeHtml(item.sourceUrl || item.link || '#');

  row.innerHTML = `
    <div class="feed-item-meta">
      <span class="feed-source-badge">${escapeHtml(item.source || '')}</span>
      ${category ? `<span class="feed-cat-badge" data-cat="${escapeHtml(category)}">${escapeHtml(categoryLabel)}</span>` : ''}
      <span class="feed-date">${timeAgo(date, t)}</span>
      ${item.isNew ? `<span class="feed-badge-new">${t('card.new')}</span>` : ''}
    </div>
    <h3 class="feed-item-title">
      <a href="${link}" target="_blank" rel="noopener">${escapeHtml(item.title || '')}</a>
    </h3>
    ${item.aiSummary ? `<p class="feed-item-summary">${escapeHtml(item.aiSummary)}</p>` : ''}
    ${item.description ? `<p class="feed-item-desc">${escapeHtml(item.description)}</p>` : ''}
    <div class="feed-item-footer">
      ${showPrice ? `<span class="feed-item-price">${formatPrice(item.price)}</span>` : '<span></span>'}
      <a class="feed-item-link" href="${link}" target="_blank" rel="noopener">${t('item.viewDetail') || '상세보기 →'}</a>
    </div>
  `;

  return row;
}
