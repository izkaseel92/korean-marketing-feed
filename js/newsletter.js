/**
 * Newsletter subscription form logic
 */

import { db, collection, addDoc, serverTimestamp } from './firebase-init.js';
import { t } from './i18n.js';
import { showToast } from './utils.js';

export function initNewsletter() {
  const form = document.getElementById('newsletterForm');
  const emailInput = document.getElementById('newsletterEmail');
  const msgEl = document.getElementById('newsletterMsg');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = emailInput.value.trim();
    if (!email) return;

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="btn-spinner"></span>';

    try {
      await addDoc(collection(db, 'subscribers'), {
        email,
        lang: document.documentElement.lang || 'ko',
        createdAt: serverTimestamp(),
        active: true,
      });

      showMessage(msgEl, t('newsletter.success'), 'success');
      showToast(t('newsletter.success'));
      emailInput.value = '';
    } catch (err) {
      console.error('Newsletter subscription error:', err);
      showMessage(msgEl, t('newsletter.error'), 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });
}

function showMessage(el, msg, type) {
  if (!el) return;
  el.textContent = msg;
  el.style.color = type === 'error' ? '#fca5a5' : type === 'warning' ? '#fde68a' : '#bbf7d0';
  setTimeout(() => { el.textContent = ''; }, 5000);
}
