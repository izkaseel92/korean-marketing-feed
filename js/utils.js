/**
 * Date and text utility helpers
 */

export function timeAgo(date, t) {
  const now = new Date();
  const past = date instanceof Date ? date : new Date(date);
  const diffMs = now - past;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return t('time.justNow');
  if (diffMin < 60) return t('time.minutesAgo', { n: diffMin });
  if (diffHr < 24) return t('time.hoursAgo', { n: diffHr });
  return t('time.daysAgo', { n: diffDay });
}

export function formatPrice(price) {
  if (!price && price !== 0) return '';
  const num = typeof price === 'string' ? parseInt(price.replace(/[^\d]/g, ''), 10) : price;
  if (isNaN(num)) return price;
  return num.toLocaleString('ko-KR') + '원';
}

export function truncate(str, maxLen = 80) {
  if (!str) return '';
  return str.length > maxLen ? str.slice(0, maxLen) + '...' : str;
}

export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export function showToast(message, duration = 3000) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

const CATEGORY_GRADIENTS = {
  viral: 'linear-gradient(135deg, #03c75a, #00a648)',
  review: 'linear-gradient(135deg, #f59e0b, #d97706)',
  traffic: 'linear-gradient(135deg, #e4002b, #b91c1c)',
  sns: 'linear-gradient(135deg, #e1306c, #c2185b)',
  naver: 'linear-gradient(135deg, #03c75a, #2db400)',
  ecommerce: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
  trend: 'linear-gradient(135deg, #06b6d4, #0891b2)',
};

const CATEGORY_ICONS = {
  viral: '🔥',
  review: '⭐',
  traffic: '📈',
  sns: '📱',
  naver: '🟢',
  ecommerce: '🛒',
  trend: '💡',
};

export function getCategoryGradient(category) {
  return CATEGORY_GRADIENTS[category] || CATEGORY_GRADIENTS.trend;
}

export function getCategoryIcon(category) {
  return CATEGORY_ICONS[category] || '📊';
}
