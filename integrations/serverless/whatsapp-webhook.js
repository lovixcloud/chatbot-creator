/**
 * Serverless WhatsApp Cloud API Webhook Handler
 * Supports Meta webhook verification challenge (GET) and incoming message processing (POST).
 */

import { ChatbotRuntime } from '../../chatbot/runtime.js';
import { WhatsAppAdapter } from '../../chatbot/adapters/whatsapp.js';

/**
 * Handle WhatsApp Cloud API webhook requests.
 *
 * @param {object} req - { method, query, headers, body }
 * @param {object} config - Chatbot configuration
 * @param {string} systemAccessToken - Meta WhatsApp System User Access Token
 * @param {string} verifyToken - Hub verify token configured in Meta App dashboard
 */
export async function handleWhatsAppWebhook(req, config, systemAccessToken, verifyToken) {
  // 1. Meta Webhook Verification Challenge (GET)
  if (req.method === 'GET') {
    const query = req.query || {};
    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];

    if (mode === 'subscribe' && token === verifyToken) {
      return {
        statusCode: 200,
        body: challenge,
        headers: { 'Content-Type': 'text/plain' }
      };
    }
    return {
      statusCode: 403,
      body: 'Forbidden: Invalid verification token'
    };
  }

  // 2. Incoming Messages (POST)
  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const adapter = new WhatsAppAdapter(config);
    const normalized = adapter.normalizeIncomingMessage(body);

    if (!normalized || !normalized.text) {
      return { statusCode: 200, body: JSON.stringify({ ok: true, notice: 'No user message to process' }) };
    }

    // Execute central chatbot conversational runtime
    const runtime = new ChatbotRuntime(config, {
      sessionId: `wa_${normalized.senderId}`
    });

    const reply = await runtime.processMessage(normalized.text);
    const replyText = (reply.message && reply.message.text) || config.identity.fallbackMessage;

    // Send WhatsApp Cloud API reply
    const phoneNumberId = config.integrations && config.integrations.whatsapp && config.integrations.whatsapp.phoneNumberId;
    if (systemAccessToken && phoneNumberId) {
      const payload = adapter.formatWhatsAppPayload(normalized.senderId, replyText, {
        options: reply.options
      });

      const waUrl = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;
      try {
        const resp = await fetch(waUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${systemAccessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
        const waRes = await resp.json();
        return {
          statusCode: 200,
          body: JSON.stringify({ ok: true, whatsappResponse: waRes })
        };
      } catch (err) {
        return {
          statusCode: 502,
          body: JSON.stringify({ error: 'Failed to contact WhatsApp Cloud API', details: err.message })
        };
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, replyText })
    };
  }

  return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
}
