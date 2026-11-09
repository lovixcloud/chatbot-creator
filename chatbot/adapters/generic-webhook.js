/**
 * Generic Webhook Channel Adapter
 * Forwards chatbot events and messages to third-party endpoints (CRM, Zapier, Slack, etc.)
 */

import { AdapterInterface } from './adapter-interface.js';

export class GenericWebhookAdapter extends AdapterInterface {
  constructor(config) {
    super('generic-webhook', config);
  }

  validateConfiguration() {
    const errors = [];
    const wh = (this.config && this.config.integrations && this.config.integrations.webhook) || {};

    if (!wh.enabled) {
      errors.push('Webhook integration is disabled in configuration.');
    }
    if (!wh.endpointUrl || !/^https?:\/\//i.test(wh.endpointUrl)) {
      errors.push('A valid HTTPS endpoint URL is required.');
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

  normalizeIncomingMessage(rawPayload) {
    return {
      senderId: rawPayload.senderId || rawPayload.userId || 'external_user',
      text: rawPayload.text || rawPayload.message || '',
      metadata: rawPayload.metadata || {}
    };
  }

  async sendMessage(recipientId, text, options = {}) {
    const wh = this.config.integrations.webhook;
    if (!wh || !wh.endpointUrl) {
      throw new Error('Webhook endpoint URL not configured.');
    }

    const payload = {
      event: options.event || 'message_dispatch',
      chatbotId: this.config.id,
      recipientId,
      text,
      timestamp: new Date().toISOString(),
      metadata: options.metadata || {}
    };

    const headers = {
      'Content-Type': 'application/json',
      ...(wh.customHeaders || {})
    };

    const resp = await fetch(wh.endpointUrl, {
      method: wh.method || 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    return {
      status: resp.status,
      ok: resp.ok
    };
  }
}
