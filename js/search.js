/**
 * Client-side search with debouncing
 */

import { debounce } from './utils.js';

let onSearchCallback = null;
let currentQuery = '';

export function getCurrentQuery() {
  return currentQuery;
}

export function onSearch(cb) {
  onSearchCallback = cb;
}

export function initSearch() {
  const input = document.getElementById('searchInput');
  if (!input) return;

  const handleSearch = debounce((value) => {
    currentQuery = value.trim();
    if (onSearchCallback) {
      onSearchCallback(currentQuery);
    }
  }, 300);

  input.addEventListener('input', (e) => {
    handleSearch(e.target.value);
  });

  // Clear search on Escape
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      input.value = '';
      currentQuery = '';
      if (onSearchCallback) {
        onSearchCallback('');
      }
    }
  });
}
