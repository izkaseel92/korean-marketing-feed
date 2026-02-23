/**
 * Daily Executive Summary Generator
 * Analyzes all articles collected in the last 24 hours and generates
 * a comprehensive summary with key insights for marketing professionals
 */

let Anthropic;
try {
  Anthropic = require('@anthropic-ai/sdk');
} catch {
  Anthropic = null;
}

/**
 * Generate daily executive summary from recent articles
 * @param {FirebaseFirestore.Firestore} db - Firestore instance
 * @returns {Promise<{date: string, summary: string, keyInsights: string[], totalArticles: number}>}
 */
async function generateDailySummary(db) {
  if (!db) {
    throw new Error('Firestore instance is required');
  }

  // Get date string for today (KST timezone)
  const today = new Date();
  const kstDate = new Date(today.getTime() + (9 * 60 * 60 * 1000)); // UTC+9
  const dateString = kstDate.toISOString().split('T')[0]; // YYYY-MM-DD

  console.log(`[Daily Summary] Generating for ${dateString}...`);

  // Get articles from the last 24 hours
  const yesterday = new Date(today.getTime() - (24 * 60 * 60 * 1000));

  const articlesSnapshot = await db.collection('articles')
    .where('fetchedAt', '>=', yesterday)
    .orderBy('fetchedAt', 'desc')
    .limit(50) // Cap at 50 most recent articles
    .get();

  const articles = articlesSnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      title: data.title || '',
      aiSummary: data.aiSummary || data.description || '',
      source: data.source || ''
    };
  });

  console.log(`[Daily Summary] Found ${articles.length} articles from last 24 hours`);

  if (articles.length === 0) {
    console.log('[Daily Summary] No articles found, skipping summary generation');
    return {
      date: dateString,
      summary: '오늘 수집된 뉴스가 없습니다.',
      keyInsights: [],
      totalArticles: 0
    };
  }

  // Generate AI summary if API is available
  let summary = '';
  let keyInsights = [];

  if (Anthropic && process.env.ANTHROPIC_API_KEY) {
    try {
      const client = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY });

      // Prepare articles text for AI analysis
      const articlesText = articles.map((article, idx) =>
        `${idx + 1}. [${article.source}] ${article.title}\n   ${article.aiSummary}`
      ).join('\n\n');

      const message = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        messages: [
          {
            role: 'user',
            content: `당신은 한국 이커머스 및 디지털 마케팅 전문가입니다. 오늘 수집된 다음 뉴스 기사들을 분석하고, 광고대행사 대표가 빠르게 파악할 수 있도록 요약해주세요.

**오늘의 뉴스 (${articles.length}건):**

${articlesText}

**작성 요구사항:**
1. 첫 번째 줄: "오늘의 한국 마케팅 동향:" 으로 시작하는 2-3문장의 전체 요약
2. 다음 3줄: 각각 "- " 으로 시작하는 핵심 인사이트 3개 (각 인사이트는 1-2문장)

**응답 형식 (이 형식을 정확히 따라주세요):**
오늘의 한국 마케팅 동향: [전체 요약 2-3문장]
- [인사이트 1]
- [인사이트 2]
- [인사이트 3]`,
          },
        ],
      });

      const responseText = message.content[0]?.text?.trim() || '';

      // Parse response into summary and insights
      const lines = responseText.split('\n').filter(line => line.trim());

      // First line is the summary
      summary = lines[0] || '';

      // Remaining lines starting with "- " are insights
      keyInsights = lines.slice(1)
        .filter(line => line.trim().startsWith('-'))
        .map(line => line.trim().substring(1).trim())
        .slice(0, 3); // Ensure max 3 insights

      console.log('[Daily Summary] AI summary generated successfully');

    } catch (err) {
      console.error('[Daily Summary] AI generation failed:', err.message);
      summary = `오늘 ${articles.length}건의 한국 이커머스 및 디지털 마케팅 뉴스가 수집되었습니다.`;
      keyInsights = [];
    }
  } else {
    console.log('[Daily Summary] Anthropic API not available, using fallback');
    summary = `오늘 ${articles.length}건의 한국 이커머스 및 디지털 마케팅 뉴스가 수집되었습니다.`;
    keyInsights = [];
  }

  // Save to Firestore
  const summaryData = {
    date: dateString,
    summary: summary,
    keyInsights: keyInsights,
    totalArticles: articles.length,
    createdAt: new Date(),
  };

  await db.collection('daily-summaries').doc(dateString).set(summaryData);
  console.log(`[Daily Summary] Saved to Firestore: ${dateString}`);

  return summaryData;
}

module.exports = { generateDailySummary };
