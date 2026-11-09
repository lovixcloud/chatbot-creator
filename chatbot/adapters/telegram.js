/**
 * Telegram Bot API Channel Adapter
 * Handles message normalization, inline keyboards, and bridge dispatch.
 */

import { AdapterInterface } from './adapter-interface.js';

export class TelegramAdapter extends AdapterInterface {
  constructor(config) {
    super('telegram', config);
  }

  validateConfiguration() {
    const errors = [];
    const tg = (this.config && this.config.integrations && this.config.integrations.telegram) || {};

    if (!tg.enabled) {
      errors.push('Telegram integration is disabled in configuration.');
    }
    if (!tg.botUsername) {
      errors.push('Telegram bot username is required.');
    }
    if (!tg.bridgeEndpoint) {
      errors.push('Serverless bridge endpoint URL is required to securely process webhooks without exposing bot tokens to browser.');
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
   * Normalize Telegram Update payload into standard message format.
   * @param {object} update
   */
  normalizeIncomingMessage(update) {
    if (!update) return null;

    if (update.message) {
      return {
        senderId: String(update.message.from ? update.message.from.id : update.message.chat.id),
        text: update.message.text || '',
        metadata: {
          chatId: update.message.chat.id,
          username: update.message.from ? update.message.from.username : null,
          messageId: update.message.message_id
        }
      };
    }

    if (update.callback_query) {
      return {
        senderId: String(update.callback_query.from.id),
        text: update.callback_query.data || '',
        metadata: {
          chatId: update.callback_query.message ? update.callback_query.message.chat.id : null,
          callbackQueryId: update.callback_query.id
        }
      };
    }

    return null;
  }

  /**
   * Format outbound message payload for Telegram Bot API.
   * @param {string|number} chatId
   * @param {string} text
   * @param {object} [options]
   */
  formatTelegramPayload(chatId, text, options = {}) {
    const payload = {
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML'
    };

    if (Array.isArray(options.options) && options.options.length > 0) {
      payload.reply_markup = {
        inline_keyboard: options.options.map(opt => [
          { text: opt, callback_data: opt.substring(0, 60) }
        ])
      };
    }

    return payload;
  }

  /**
   * Dispatch message via secure serverless integration bridge.
   */
  async sendMessage(chatId, text, options = {}) {
    const tg = this.config.integrations.telegram;
    if (!tg || !tg.bridgeEndpoint) {
      throw new Error('Cannot send Telegram message: Missing secure bridgeEndpoint URL.');
    }

    const payload = this.formatTelegramPayload(chatId, text, options);
    const resp = await fetch(tg.bridgeEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'send_telegram',
        chatbotId: this.config.id,
        payload
      })
    });

    return await resp.json();
  }

  verifyWebhook(headers, secretToken) {
    const incomingHeader = headers['x-telegram-bot-api-secret-token'] || headers['X-Telegram-Bot-Api-Secret-Token'];
    return Boolean(secretToken && incomingHeader === secretToken);
  }
}
