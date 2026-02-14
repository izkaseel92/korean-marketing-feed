/**
 * AI Summary generator using Claude API
 * Generates 2-3 sentence Korean summaries for marketing items
 */

let Anthropic;
try {
  Anthropic = require('@anthropic-ai/sdk');
} catch {
  Anthropic = null;
}

/**
 * Generate a 2-3 sentence Korean summary for a marketing item
 * @param {string} title - Item title
 * @param {string} description - Item description
 * @returns {Promise<string>} Korean summary or empty string if unavailable
 */
async function generateSummary(title, description) {
  if (!Anthropic || !process.env.ANTHROPIC_API_KEY) {
    return '';
  }

  try {
    const client = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: `다음 한국 마케팅 서비스/기사에 대해 광고대행사 대표가 읽을 2-3문장의 핵심 요약을 한국어로 작성해 주세요. 실용적인 인사이트와 활용 방안에 집중해 주세요.

제목: ${title}
설명: ${description}

요약:`,
        },
      ],
    });

    const summary = message.content[0]?.text?.trim() || '';
    return summary.slice(0, 400); // Cap at 400 chars
  } catch (err) {
    console.warn('[AI Summary] Failed:', err.message);
    return '';
  }
}

module.exports = { generateSummary };
