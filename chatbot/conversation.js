/**
 * Conversation State & Session Manager
 * Maintains context, active workflow pointers, variables, and interaction history.
 */

export class ConversationState {
  constructor(sessionId, config) {
    this.sessionId = sessionId || `sess_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    this.config = config;
    this.messages = [];
    this.variables = {};
    this.activeFlow = null;
    this.currentStepId = null;
    this.consecutiveFallbacks = 0;
    this.createdAt = new Date().toISOString();
  }

  /**
   * Add a message to session history.
   * @param {'bot'|'user'|'system'} sender
   * @param {string} text
   * @param {object} [metadata]
   */
  addMessage(sender, text, metadata = {}) {
    const msg = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      sender,
      text,
      timestamp: new Date().toISOString(),
      metadata
    };
    this.messages.push(msg);

    const maxItems = (this.config && this.config.businessRules && this.config.businessRules.maxHistoryItems) || 30;
    if (this.messages.length > maxItems) {
      this.messages.shift();
    }
    return msg;
  }

  /**
   * Check if current time falls within configured business hours.
   * @returns {{ isWithinHours: boolean, message?: string }}
   */
  checkBusinessHours() {
    if (!this.config || !this.config.businessRules || !this.config.businessRules.operatingHours) {
      return { isWithinHours: true };
    }

    const { enabled, schedule, afterHoursMessage } = this.config.businessRules.operatingHours;
    if (!enabled || !schedule) {
      return { isWithinHours: true };
    }

    const now = new Date();
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = days[now.getUTCDay()];
    const dayConfig = schedule[currentDay];

    if (!dayConfig || dayConfig.closed) {
      return {
        isWithinHours: false,
        message: afterHoursMessage || 'We are currently closed outside regular hours.'
      };
    }

    const pad = n => n.toString().padStart(2, '0');
    const currentTimeStr = `${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}`;

    if (dayConfig.open && dayConfig.close) {
      if (currentTimeStr < dayConfig.open || currentTimeStr > dayConfig.close) {
        return {
          isWithinHours: false,
          message: afterHoursMessage || 'We are currently outside operating hours.'
        };
      }
    }

    return { isWithinHours: true };
  }

  /**
   * Reset active conversational workflow.
   */
  clearWorkflow() {
    this.activeFlow = null;
    this.currentStepId = null;
  }

  /**
   * Export serializable state.
   */
  serialize() {
    return {
      sessionId: this.sessionId,
      messages: this.messages,
      variables: this.variables,
      activeFlow: this.activeFlow ? this.activeFlow.id : null,
      currentStepId: this.currentStepId,
      consecutiveFallbacks: this.consecutiveFallbacks,
      createdAt: this.createdAt
    };
  }

  /**
   * Restore state from JSON.
   */
  static deserialize(data, config) {
    const state = new ConversationState(data.sessionId, config);
    state.messages = data.messages || [];
    state.variables = data.variables || {};
    state.currentStepId = data.currentStepId || null;
    state.consecutiveFallbacks = data.consecutiveFallbacks || 0;
    state.createdAt = data.createdAt || new Date().toISOString();
    return state;
  }
}
