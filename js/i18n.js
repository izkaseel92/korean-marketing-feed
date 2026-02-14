/**
 * Internationalization engine (KO/EN/ZH)
 * Loads JSON translation files and applies them to [data-i18n] elements
 */

const SUPPORTED_LANGS = ['ko', 'en', 'zh'];
const DEFAULT_LANG = 'ko';
const STORAGE_KEY = 'kr-marketing-lang';

let translations = {};
let currentLang = DEFAULT_LANG;
let onLangChangeCallbacks = [];

export function getCurrentLang() {
  return currentLang;
}

export function t(key, params = {}) {
  const value = translations[key] || key;
  return value.replace(/\{(\w+)\}/g, (_, k) => params[k] ?? `{${k}}`);
}

export function onLangChange(cb) {
  onLangChangeCallbacks.push(cb);
}

async function loadTranslations(lang) {
  try {
    const res = await fetch(`/i18n/${lang}.json`);
    if (!res.ok) throw new Error(`Failed to load ${lang}.json`);
    return await res.json();
  } catch (err) {
    console.error(`i18n: failed to load ${lang}`, err);
    return {};
  }
}

function applyTranslations() {
  // Translate text content
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const translated = t(key);
    if (translated !== key) {
      el.textContent = translated;
    }
  });

  // Translate placeholders
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    const translated = t(key);
    if (translated !== key) {
      el.placeholder = translated;
    }
  });

  // Update html lang attribute
  document.documentElement.lang = currentLang === 'zh' ? 'zh-CN' : currentLang;
}

function updateSwitcherUI() {
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === currentLang);
  });
}

export async function setLang(lang) {
  if (!SUPPORTED_LANGS.includes(lang)) lang = DEFAULT_LANG;
  currentLang = lang;
  translations = await loadTranslations(lang);
  localStorage.setItem(STORAGE_KEY, lang);
  applyTranslations();
  updateSwitcherUI();
  onLangChangeCallbacks.forEach(cb => cb(lang));
}

export async function initI18n() {
  const saved = localStorage.getItem(STORAGE_KEY);
  const browserLang = navigator.language?.slice(0, 2);
  const initialLang = saved || (SUPPORTED_LANGS.includes(browserLang) ? browserLang : DEFAULT_LANG);

  // Bind language switcher buttons
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => setLang(btn.dataset.lang));
  });

  await setLang(initialLang);
}
