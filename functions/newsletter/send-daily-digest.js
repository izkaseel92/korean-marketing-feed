/**
 * Daily Newsletter Digest Sender
 * Sends email with daily summary and top articles to all subscribers
 * Uses SendGrid for email delivery
 */

/**
 * Send daily digest newsletter to all active subscribers
 * @param {FirebaseFirestore.Firestore} db - Firestore instance
 * @param {Object} summaryData - Daily summary data from generateDailySummary
 * @returns {Promise<{sent: number, failed: number}>}
 */
async function sendDailyDigest(db, summaryData) {
  if (!db) {
    throw new Error('Firestore instance is required');
  }

  console.log('[Newsletter] Starting daily digest send...');

  // Get all active subscribers
  const subscribersSnapshot = await db.collection('subscribers')
    .where('active', '==', true)
    .get();

  const subscribers = subscribersSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  console.log(`[Newsletter] Found ${subscribers.length} active subscribers`);

  if (subscribers.length === 0) {
    console.log('[Newsletter] No active subscribers, skipping email send');
    return { sent: 0, failed: 0 };
  }

  // Get today's summary from Firestore if not provided
  let summary = summaryData;
  if (!summary) {
    const today = new Date();
    const kstDate = new Date(today.getTime() + (9 * 60 * 60 * 1000));
    const dateString = kstDate.toISOString().split('T')[0];

    const summaryDoc = await db.collection('daily-summaries').doc(dateString).get();
    if (!summaryDoc.exists) {
      console.log('[Newsletter] No daily summary found for today, aborting');
      return { sent: 0, failed: 0 };
    }
    summary = summaryDoc.data();
  }

  // Get top 5 articles from today
  const yesterday = new Date(Date.now() - (24 * 60 * 60 * 1000));
  const articlesSnapshot = await db.collection('articles')
    .where('fetchedAt', '>=', yesterday)
    .orderBy('fetchedAt', 'desc')
    .limit(5)
    .get();

  const topArticles = articlesSnapshot.docs.map(doc => doc.data());

  // Check if SendGrid is configured
  let sgMail;
  try {
    sgMail = require('@sendgrid/mail');
  } catch {
    console.log('[Newsletter] SendGrid not installed, skipping email send');
    console.log('[Newsletter] Summary would have been sent:', summary);
    return { sent: 0, failed: 0 };
  }

  const sendgridKey = process.env.SENDGRID_API_KEY;
  if (!sendgridKey) {
    console.log('[Newsletter] SENDGRID_API_KEY not configured, skipping email send');
    return { sent: 0, failed: 0 };
  }

  sgMail.setApiKey(sendgridKey);

  // Generate email HTML
  const emailHtml = generateEmailHtml(summary, topArticles);

  // Send emails (batch send for efficiency)
  let sent = 0;
  let failed = 0;

  const fromEmail = process.env.FROM_EMAIL || 'noreply@koreanmarketing.news';
  const fromName = '한국 마케팅 뉴스';

  for (const subscriber of subscribers) {
    try {
      const msg = {
        to: subscriber.email,
        from: {
          email: fromEmail,
          name: fromName
        },
        subject: `📊 ${summary.date} 한국 마케팅 동향 - ${summary.totalArticles}건`,
        html: emailHtml,
      };

      await sgMail.send(msg);
      sent++;
      console.log(`[Newsletter] Sent to ${subscriber.email}`);

    } catch (error) {
      failed++;
      console.error(`[Newsletter] Failed to send to ${subscriber.email}:`, error.message);
    }
  }

  console.log(`[Newsletter] Complete: ${sent} sent, ${failed} failed`);
  return { sent, failed };
}

/**
 * Generate HTML email template
 * @param {Object} summary - Daily summary data
 * @param {Array} articles - Top articles
 * @returns {string} HTML email
 */
function generateEmailHtml(summary, articles) {
  const insightsHtml = summary.keyInsights.map(insight =>
    `<li style="margin-bottom: 12px; line-height: 1.6;">${insight}</li>`
  ).join('');

  const articlesHtml = articles.map(article => `
    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 16px;">
      <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #1a202c;">
        <a href="${article.sourceUrl}" style="color: #1a56db; text-decoration: none;">
          ${article.title}
        </a>
      </h3>
      <p style="margin: 0 0 8px 0; color: #4a5568; font-size: 14px; line-height: 1.6;">
        ${article.aiSummary || article.description}
      </p>
      <p style="margin: 0; color: #718096; font-size: 12px;">
        📰 ${article.source}
      </p>
    </div>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>한국 마케팅 뉴스 - 일일 요약</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; background: white;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 32px 24px; text-align: center;">
      <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 700;">
        📊 오늘의 한국 마케팅 동향
      </h1>
      <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">
        ${summary.date}
      </p>
    </div>

    <!-- Summary Section -->
    <div style="padding: 32px 24px; border-bottom: 1px solid #e5e7eb;">
      <p style="margin: 0; font-size: 16px; line-height: 1.8; color: #1a202c;">
        ${summary.summary}
      </p>
    </div>

    <!-- Key Insights -->
    ${summary.keyInsights.length > 0 ? `
    <div style="padding: 32px 24px; background: #fafbfc; border-bottom: 1px solid #e5e7eb;">
      <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #1a202c;">
        🔍 핵심 인사이트
      </h2>
      <ul style="margin: 0; padding-left: 20px; color: #4a5568; font-size: 14px;">
        ${insightsHtml}
      </ul>
    </div>
    ` : ''}

    <!-- Top Articles -->
    ${articles.length > 0 ? `
    <div style="padding: 32px 24px;">
      <h2 style="margin: 0 0 20px 0; font-size: 18px; color: #1a202c;">
        📰 오늘의 주요 뉴스 (${articles.length}건)
      </h2>
      ${articlesHtml}
      <div style="text-align: center; margin-top: 24px;">
        <a href="https://koreanmarketing.news" style="display: inline-block; background: #1a56db; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">
          모든 뉴스 보기
        </a>
      </div>
    </div>
    ` : ''}

    <!-- Footer -->
    <div style="padding: 24px; background: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
      <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 12px;">
        한국 이커머스 & 디지털 마케팅 최신 동향을 매일 받아보세요
      </p>
      <p style="margin: 0; font-size: 11px; color: #9ca3af;">
        <a href="https://koreanmarketing.news" style="color: #6b7280; text-decoration: none;">웹사이트 방문</a>
        ·
        <a href="#" style="color: #6b7280; text-decoration: none;">구독 취소</a>
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

module.exports = { sendDailyDigest };
