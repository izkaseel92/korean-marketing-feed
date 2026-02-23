/**
 * Daily Summary Component
 * Fetches and displays daily executive summary from Firestore
 */

import { db, doc, getDoc } from './firebase-init.js';

const summaryCard = document.getElementById('dailySummaryCard');
const summaryDate = document.getElementById('summaryDate');
const summaryText = document.getElementById('summaryText');
const keyInsights = document.getElementById('keyInsights');
const summaryStats = document.getElementById('summaryStats');

/**
 * Format date string to Korean format
 * @param {string} dateString - Date string (YYYY-MM-DD)
 * @returns {string} Formatted date (YYYY년 M월 D일)
 */
function formatDate(dateString) {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${year}년 ${month}월 ${day}일`;
}

/**
 * Get today's date in KST as YYYY-MM-DD
 * @returns {string} Date string
 */
function getTodayKST() {
  const now = new Date();
  const kstOffset = 9 * 60; // KST is UTC+9
  const kstTime = new Date(now.getTime() + (kstOffset * 60 * 1000));
  return kstTime.toISOString().split('T')[0];
}

/**
 * Load and display daily summary
 */
export async function initDailySummary() {
  if (!summaryCard) return;

  try {
    // Check if Firebase is configured
    if (!db || !db.type) {
      console.log('[Daily Summary] Firebase not configured, hiding card');
      summaryCard.style.display = 'none';
      return;
    }

    const today = getTodayKST();
    const summaryRef = doc(db, 'daily-summaries', today);
    const summaryDoc = await getDoc(summaryRef);

    if (!summaryDoc.exists()) {
      console.log('[Daily Summary] No summary found for today');
      summaryCard.style.display = 'none';
      return;
    }

    const data = summaryDoc.data();

    // Update date
    if (summaryDate) {
      summaryDate.textContent = formatDate(data.date || today);
    }

    // Update summary text
    if (summaryText) {
      summaryText.textContent = data.summary || '오늘의 요약이 없습니다.';
    }

    // Update key insights
    if (keyInsights && data.keyInsights && data.keyInsights.length > 0) {
      keyInsights.innerHTML = data.keyInsights.map(insight =>
        `<li>${insight}</li>`
      ).join('');
    } else if (keyInsights) {
      keyInsights.innerHTML = '';
    }

    // Update stats
    if (summaryStats) {
      const count = data.totalArticles || 0;
      summaryStats.innerHTML = `📰 오늘 수집된 뉴스: <strong>${count}건</strong>`;
    }

    // Show the card
    summaryCard.style.display = 'block';

  } catch (err) {
    console.error('[Daily Summary] Failed to load:', err);
    summaryCard.style.display = 'none';
  }
}
