/**
 * Card DOM creation + skeleton loaders
 */

import { timeAgo, formatPrice, escapeHtml, getCategoryGradient, getCategoryIcon } from './utils.js';
import { t } from './i18n.js';

export function renderSkeletons(container, count = 8) {
  const frag = document.createDocumentFragment();
  for (let i = 0; i < count; i++) {
    const card = document.createElement('div');
    card.className = 'skeleton-card';
    card.innerHTML = `
      <div class="skeleton-thumb skeleton"></div>
      <div class="skeleton-body">
        <div class="skeleton-line skeleton"></div>
        <div class="skeleton-line skeleton"></div>
        <div class="skeleton-line skeleton"></div>
        <div class="skeleton-line skeleton"></div>
      </div>
    `;
    frag.appendChild(card);
  }
  container.appendChild(frag);
}

export function clearCards(container) {
  container.innerHTML = '';
}

export function renderCards(container, items) {
  const frag = document.createDocumentFragment();

  items.forEach(item => {
    const card = item.type === 'article'
      ? createArticleCard(item)
      : createProductCard(item);
    frag.appendChild(card);
  });

  container.appendChild(frag);
}

function createProductCard(item) {
  const card = document.createElement('div');
  card.className = 'feed-card';
  card.dataset.category = item.category || '';
  card.dataset.type = 'product';

  const date = item.crawledAt instanceof Date
    ? item.crawledAt
    : item.crawledAt?.toDate?.() || new Date(item.crawledAt);

  const gradient = getCategoryGradient(item.category);
  const icon = getCategoryIcon(item.category);

  card.innerHTML = `
    <div class="card-thumbnail">
      <div class="card-thumbnail-gradient" style="background: ${gradient}">
        ${icon}
      </div>
      <div class="card-badges">
        ${item.isNew ? `<span class="badge-new">${t('card.new')}</span>` : '<span></span>'}
        <span class="badge-category" data-cat="${escapeHtml(item.category)}">${t('category.' + item.category) || item.category}</span>
      </div>
    </div>
    <div class="card-body">
      <div class="card-source">${escapeHtml(item.source)}</div>
      <h3 class="card-title">${escapeHtml(item.title)}</h3>
      <p class="card-description">${escapeHtml(item.description)}</p>
      ${item.price ? `<div class="card-price">${formatPrice(item.price)}</div>` : ''}
    </div>
    <div class="card-footer">
      <span class="card-date">${timeAgo(date, t)}</span>
      <a class="card-link" href="${escapeHtml(item.sourceUrl || '#')}" target="_blank" rel="noopener">${t('card.viewDetail')}</a>
    </div>
  `;

  return card;
}

function createArticleCard(item) {
  const card = document.createElement('div');
  card.className = 'feed-card';
  card.dataset.category = 'trend';
  card.dataset.type = 'article';

  const date = item.publishedAt instanceof Date
    ? item.publishedAt
    : item.publishedAt?.toDate?.() || new Date(item.publishedAt);

  const gradient = getCategoryGradient('trend');
  const icon = getCategoryIcon('trend');

  card.innerHTML = `
    <div class="card-thumbnail">
      ${item.thumbnailUrl
        ? `<img src="${escapeHtml(item.thumbnailUrl)}" alt="" loading="lazy">`
        : `<div class="card-thumbnail-gradient" style="background: ${gradient}">${icon}</div>`
      }
      <div class="card-badges">
        ${item.isNew ? `<span class="badge-new">${t('card.new')}</span>` : '<span></span>'}
        <span class="badge-category" data-cat="trend">${t('category.trend')}</span>
      </div>
    </div>
    <div class="card-body">
      <div class="card-source">${escapeHtml(item.source)}</div>
      <h3 class="card-title">${escapeHtml(item.title)}</h3>
      <p class="card-description">${escapeHtml(item.description)}</p>
    </div>
    <div class="card-footer">
      <span class="card-date">${timeAgo(date, t)}</span>
      <a class="card-link" href="${escapeHtml(item.sourceUrl || item.link || '#')}" target="_blank" rel="noopener">${t('card.viewDetail')}</a>
    </div>
  `;

  return card;
}
