/**
 * Serverless Telegram Webhook Handler
 * Verifies X-Telegram-Bot-Api-Secret-Token, extracts message, executes ChatbotRuntime,
 * and replies using official Telegram Bot API sendMessage.
 */

import { ChatbotRuntime } from '../../chatbot/runtime.js';
import { TelegramAdapter } from '../../chatbot/adapters/telegram.js';

/**
 * Handle incoming Telegram webhook request.
 * Compatible with AWS Lambda, Cloudflare Workers, Vercel, or Node HTTP.
 *
 * @param {object} req - { headers, body, method }
 * @param {object} config - Chatbot configuration
 * @param {string} botToken - Telegram Bot API Token (stored securely server-side)
 * @param {string} secretToken - Expected X-Telegram-Bot-Api-Secret-Token
 */
export async function handleTelegramWebhook(req, config, botToken, secretToken) {
  if (req.method !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  // 1. Verify Secret Token Header
  const headers = req.headers || {};
  const adapter = new TelegramAdapter(config);

  if (secretToken && !adapter.verifyWebhook(headers, secretToken)) {
    return {
      statusCode: 403,
      body: JSON.stringify({ error: 'Unauthorized: Invalid secret token' })
    };
  }

  const update = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const normalized = adapter.normalizeIncomingMessage(update);

  if (!normalized || !normalized.text) {
    return { statusCode: 200, body: JSON.stringify({ ok: true, notice: 'No text message to process' }) };
  }

  // 2. Execute central chatbot runtime
  const runtime = new ChatbotRuntime(config, {
    sessionId: `tg_${normalized.senderId}`
  });

  const reply = await runtime.processMessage(normalized.text);
  const replyText = (reply.message && reply.message.text) || config.identity.fallbackMessage;

  // 3. Send message back to Telegram via Telegram Bot API
  if (botToken && normalized.metadata && normalized.metadata.chatId) {
    const payload = adapter.formatTelegramPayload(normalized.metadata.chatId, replyText, {
      options: reply.options
    });

    const tgUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    try {
      const resp = await fetch(tgUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const tgRes = await resp.json();
      return {
        statusCode: 200,
        body: JSON.stringify({ ok: true, telegramResponse: tgRes })
      };
    } catch (err) {
      return {
        statusCode: 502,
        body: JSON.stringify({ error: 'Failed to contact Telegram API', details: err.message })
      };
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ ok: true, replyText })
  };
}
