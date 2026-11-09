/**
 * Website Chatbot Channel Adapter
 * Renders embedded web widget in Shadow DOM and links to ChatbotRuntime.
 */

import { AdapterInterface } from './adapter-interface.js';
import { ChatbotRuntime } from '../runtime.js';
import { ChatbotRenderer } from '../renderer.js';

export class WebsiteAdapter extends AdapterInterface {
  constructor(config, container) {
    super('website', config);
    this.container = container || null;
    this.runtime = null;
    this.renderer = null;
  }

  validateConfiguration() {
    const errors = [];
    if (!this.config || !this.config.id) {
      errors.push('Chatbot configuration requires an id.');
    }
    return { valid: errors.length === 0, errors };
  }

  async connect() {
    const validation = this.validateConfiguration();
    if (!validation.valid) {
      throw new Error(`WebsiteAdapter validation failed: ${validation.errors.join(', ')}`);
    }

    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = `cb-root-${this.config.id}`;
      // In standalone website mode, fix host to viewport
      this.container.style.position = 'fixed';
      this.container.style.bottom = '16px';
      this.container.style.right = this.config.appearance && this.config.appearance.position === 'bottom-left' ? 'auto' : '16px';
      this.container.style.left = this.config.appearance && this.config.appearance.position === 'bottom-left' ? '16px' : 'auto';
      this.container.style.zIndex = '2147483647';
      this.container.style.maxWidth = 'calc(100vw - 32px)';
      document.body.appendChild(this.container);
    }

    this.runtime = new ChatbotRuntime(this.config);

    this.renderer = new ChatbotRenderer(this.container, this.config, {
      onOpen: () => {
        // Send initial greeting if empty
        if (this.runtime.state.messages.length === 0) {
          const init = this.runtime.initializeSession();
          if (init && init.message) {
            this.renderer.appendMessage('bot', init.message.text, init.starters || []);
          }
        }
      },
      onSendMessage: async (text) => {
        this.renderer.appendMessage('user', text);
        const reply = await this.runtime.processMessage(text);
        if (reply && reply.message) {
          this.renderer.appendMessage('bot', reply.message.text, reply.options || []);
        }
      },
      onReset: () => {
        this.renderer.clearMessages();
        const init = this.runtime.resetSession();
        if (init && init.message) {
          this.renderer.appendMessage('bot', init.message.text, init.starters || []);
        }
      }
    });

    this.isConnected = true;
    return true;
  }

  async disconnect() {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.isConnected = false;
    return true;
  }

  normalizeIncomingMessage(rawEvent) {
    return {
      senderId: rawEvent.senderId || 'user',
      text: rawEvent.text || '',
      metadata: rawEvent.metadata || {}
    };
  }

  async sendMessage(recipientId, text, options = {}) {
    if (this.renderer) {
      this.renderer.appendMessage('bot', text, options.quickReplies || []);
    }
    return { success: true };
  }
}
