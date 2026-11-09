/**
 * Chatbot Adapter Contract
 * Base abstract adapter defining required lifecycle methods.
 */

export class AdapterInterface {
  constructor(name, config) {
    this.name = name;
    this.config = config;
    this.isConnected = false;
  }

  /**
   * Connect and initialize adapter.
   * @returns {Promise<boolean>}
   */
  async connect() {
    throw new Error('Method connect() must be implemented.');
  }

  /**
   * Disconnect and cleanup resources.
   * @returns {Promise<boolean>}
   */
  async disconnect() {
    throw new Error('Method disconnect() must be implemented.');
  }

  /**
   * Validate configuration prerequisites.
   * @returns {{ valid: boolean, errors: string[] }}
   */
  validateConfiguration() {
    throw new Error('Method validateConfiguration() must be implemented.');
  }

  /**
   * Transform incoming external message into standardized format.
   * @param {any} rawEvent
   * @returns {{ senderId: string, text: string, metadata: object }}
   */
  normalizeIncomingMessage(rawEvent) {
    throw new Error('Method normalizeIncomingMessage() must be implemented.');
  }

  /**
   * Send response message back to target channel.
   * @param {string} recipientId
   * @param {string} text
   * @param {object} [options]
   * @returns {Promise<any>}
   */
  async sendMessage(recipientId, text, options = {}) {
    throw new Error('Method sendMessage() must be implemented.');
  }

  /**
   * Verify signature or secret token for webhooks.
   * @param {object} headers
   * @param {string} rawBody
   * @returns {boolean}
   */
  verifyWebhook(headers, rawBody) {
    return true;
  }

  /**
   * Return current health and connection status.
   * @returns {{ status: string, details: string }}
   */
  getConnectionStatus() {
    return {
      status: this.isConnected ? 'connected' : 'disconnected',
      details: `Adapter ${this.name} status.`
    };
  }
}
