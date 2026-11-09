/**
 * WhatsApp Business Cloud API Channel Adapter
 * Handles message normalization, quick-reply buttons, and secure serverless dispatch.
 */

import { AdapterInterface } from './adapter-interface.js';

export class WhatsAppAdapter extends AdapterInterface {
  constructor(config) {
    super('whatsapp', config);
  }

  validateConfiguration() {
    const errors = [];
    const wa = (this.config && this.config.integrations && this.config.integrations.whatsapp) || {};

    if (!wa.enabled) {
      errors.push('WhatsApp integration is disabled in configuration.');
    }
    if (!wa.phoneNumberId) {
      errors.push('WhatsApp Phone Number ID is required.');
    }
    if (!wa.bridgeEndpoint) {
      errors.push('Serverless bridge endpoint URL is required to securely process Cloud API webhooks.');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  async connect() {
    const v = this.validateConfiguration();
    if (!v.valid) {
      this.isConnected = false;
      return false;
    }
    this.isConnected = true;
    return true;
  }

  async disconnect() {
    this.isConnected = false;
    return true;
  }

  /**
   * Normalize incoming WhatsApp Cloud API webhook entry.
   * @param {object} body
   */
  normalizeIncomingMessage(body) {
    try {
      const entry = body && body.entry && body.entry[0];
      const change = entry && entry.changes && entry.changes[0];
      const value = change && change.value;
      const message = value && value.messages && value.messages[0];

      if (!message) return null;

      let text = '';
      if (message.type === 'text') {
        text = message.text ? message.text.body : '';
      } else if (message.type === 'interactive' && message.interactive) {
        if (message.interactive.button_reply) {
          text = message.interactive.button_reply.title;
        } else if (message.interactive.list_reply) {
          text = message.interactive.list_reply.title;
        }
      }

      return {
        senderId: message.from,
        text,
        metadata: {
          messageId: message.id,
          timestamp: message.timestamp,
          type: message.type
        }
      };
    } catch (e) {
      return null;
    }
  }

  /**
   * Format outbound message payload for WhatsApp Cloud API.
   * @param {string} to - Recipient phone number (E.164)
   * @param {string} text - Message text
   * @param {object} [options]
   */
  formatWhatsAppPayload(to, text, options = {}) {
    // If quick-reply options exist (up to 3 supported in WhatsApp interactive buttons)
    if (Array.isArray(options.options) && options.options.length > 0 && options.options.length <= 3) {
      return {
        messaging_product: 'whatsapp',
        to,
        type: 'interactive',
        interactive: {
          type: 'button',
          body: { text },
          action: {
            buttons: options.options.map((opt, i) => ({
              type: 'reply',
              reply: {
                id: `btn_${i}`,
                title: opt.substring(0, 20)
              }
            }))
          }
        }
      };
    }

    return {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text }
    };
  }

  /**
   * Send WhatsApp message via secure serverless bridge.
   */
  async sendMessage(to, text, options = {}) {
    const wa = this.config.integrations.whatsapp;
    if (!wa || !wa.bridgeEndpoint) {
      throw new Error('Cannot send WhatsApp message: Missing secure bridgeEndpoint URL.');
    }

    const payload = this.formatWhatsAppPayload(to, text, options);
    const resp = await fetch(wa.bridgeEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'send_whatsapp',
        chatbotId: this.config.id,
        phoneNumberId: wa.phoneNumberId,
        payload
      })
    });

    return await resp.json();
  }
}
