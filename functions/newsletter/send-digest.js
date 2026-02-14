/**
 * Daily newsletter digest sender
 * Runs daily at 9AM KST - sends summary of new products and articles
 */

const admin = require('firebase-admin');
const fetch = require('node-fetch');

/**
 * Build and send the daily digest email
 */
async function sendDailyDigest(db, sendgridApiKey) {
  if (!sendgridApiKey) {
    console.log('[Newsletter] SendGrid API key not configured, skipping.');
    return { status: 'skipped', reason: 'No SendGrid API key' };
  }

  // Get subscribers
  const subscribersSnap = await db.collection('subscribers')
    .where('active', '==', true)
    .get();

  if (subscribersSnap.empty) {
    console.log('[Newsletter] No active subscribers.');
    return { status: 'skipped', reason: 'No subscribers' };
  }

  // Get new products from last 24h
  const yesterday = new Date(Date.now() - 86400000);
  const productsSnap = await db.collection('products')
    .where('crawledAt', '>=', admin.firestore.Timestamp.fromDate(yesterday))
    .orderBy('crawledAt', 'desc')
    .limit(20)
    .get();

  // Get new articles from last 24h
  const articlesSnap = await db.collection('articles')
    .where('fetchedAt', '>=', admin.firestore.Timestamp.fromDate(yesterday))
    .orderBy('fetchedAt', 'desc')
    .limit(10)
    .get();

  const products = [];
  productsSnap.forEach(doc => products.push(doc.data()));

  const articles = [];
  articlesSnap.forEach(doc => articles.push(doc.data()));

  if (products.length === 0 && articles.length === 0) {
    console.log('[Newsletter] No new content to send.');
    return { status: 'skipped', reason: 'No new content' };
  }

  // Build HTML email
  const html = buildEmailHtml(products, articles);
  const subject = `[KR Marketing] 오늘의 마케팅 피드 - ${formatDate(new Date())}`;

  // Send to each subscriber
  const subscribers = [];
  subscribersSnap.forEach(doc => subscribers.push(doc.data()));

  let sentCount = 0;
  let errorCount = 0;

  for (const subscriber of subscribers) {
    try {
      await sendEmail(sendgridApiKey, {
        to: subscriber.email,
        subject,
        html,
      });
      sentCount++;
    } catch (error) {
      console.error(`[Newsletter] Failed to send to ${subscriber.email}:`, error.message);
      errorCount++;
    }
  }

  // Log result
  await db.collection('crawl-logs').add({
    source: 'Newsletter',
    status: 'success',
    sentCount,
    errorCount,
    subscriberCount: subscribers.length,
    productCount: products.length,
    articleCount: articles.length,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { status: 'success', sentCount, errorCount };
}

/**
 * Send email via SendGrid API
 */
async function sendEmail(apiKey, { to, subject, html }) {
  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: 'digest@krmarketingfeed.com', name: 'KR Marketing Feed' },
      subject,
      content: [{ type: 'text/html', value: html }],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`SendGrid error ${response.status}: ${text}`);
  }
}

function formatDate(date) {
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
}

function formatPrice(price) {
  if (!price) return '';
  return Number(price).toLocaleString('ko-KR') + '원';
}

/**
 * Build HTML email template
 */
function buildEmailHtml(products, articles) {
  const productRows = products.map(p => `
    <tr>
      <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0;">
        <div style="font-size: 14px; font-weight: 600; color: #0f172a; margin-bottom: 4px;">
          ${escapeHtml(p.title)}
          ${p.isNew ? '<span style="background:#ef4444;color:#fff;font-size:11px;padding:1px 6px;border-radius:10px;margin-left:6px;">NEW</span>' : ''}
        </div>
        <div style="font-size: 13px; color: #64748b;">${escapeHtml(p.source)} ${p.price ? '· ' + formatPrice(p.price) : ''}</div>
      </td>
    </tr>
  `).join('');

  const articleRows = articles.map(a => `
    <tr>
      <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0;">
        <a href="${escapeHtml(a.sourceUrl || '#')}" style="font-size: 14px; font-weight: 600; color: #1a56db; text-decoration: none;">
          ${escapeHtml(a.title)}
        </a>
        <div style="font-size: 13px; color: #64748b; margin-top: 4px;">${escapeHtml(a.source)}</div>
      </td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0; padding:0; background:#f8fafc; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px; margin:0 auto; padding:24px;">
    <div style="background:#1a56db; color:#fff; padding:24px; border-radius:12px 12px 0 0; text-align:center;">
      <h1 style="margin:0; font-size:20px;">KR Marketing Feed</h1>
      <p style="margin:8px 0 0; opacity:0.9; font-size:14px;">오늘의 마케팅 피드 · ${formatDate(new Date())}</p>
    </div>
    <div style="background:#fff; padding:0; border-radius:0 0 12px 12px; border:1px solid #e2e8f0; border-top:none;">
      ${products.length > 0 ? `
        <div style="padding:16px 16px 8px; font-size:16px; font-weight:700; color:#0f172a;">
          신규/변경 상품 (${products.length}건)
        </div>
        <table style="width:100%; border-collapse:collapse;">${productRows}</table>
      ` : ''}
      ${articles.length > 0 ? `
        <div style="padding:16px 16px 8px; font-size:16px; font-weight:700; color:#0f172a;">
          트렌드 & 인사이트 (${articles.length}건)
        </div>
        <table style="width:100%; border-collapse:collapse;">${articleRows}</table>
      ` : ''}
      <div style="padding:16px; text-align:center;">
        <a href="https://korean-marketing-feed.web.app" style="display:inline-block; padding:10px 24px; background:#1a56db; color:#fff; text-decoration:none; border-radius:20px; font-weight:600; font-size:14px;">
          전체 피드 보기
        </a>
      </div>
    </div>
    <div style="text-align:center; padding:16px; font-size:12px; color:#94a3b8;">
      KR Marketing Feed &copy; 2026
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

module.exports = { sendDailyDigest };
