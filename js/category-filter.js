/**
 * Category filter pills logic
 */

let currentCategory = 'all';
let onFilterChangeCallback = null;

export function getCurrentCategory() {
  return currentCategory;
}

export function onFilterChange(cb) {
  onFilterChangeCallback = cb;
}

export function initCategoryFilter() {
  const container = document.getElementById('filterPills');
  if (!container) return;

  container.addEventListener('click', (e) => {
    const pill = e.target.closest('.filter-pill');
    if (!pill) return;

    const category = pill.dataset.category;
    if (category === currentCategory) return;

    // Update active state
    container.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');

    currentCategory = category;

    if (onFilterChangeCallback) {
      onFilterChangeCallback(category);
    }
  });
}
