/**
 * Workflow Execution Engine
 * Handles branching logic, user variable collection, validation, and multi-step dialogs.
 */

export class WorkflowEngine {
  /**
   * Find a flow by trigger keyword or option ID.
   * @param {string} triggerValue
   * @param {Array<object>} flows
   * @returns {object|null}
   */
  static findFlow(triggerValue, flows) {
    if (!triggerValue || !Array.isArray(flows)) return null;
    const clean = triggerValue.trim().toLowerCase();

    for (const flow of flows) {
      if (flow.id.toLowerCase() === clean) return flow;
      if (flow.trigger && flow.trigger.value) {
        if (flow.trigger.value.toLowerCase() === clean) return flow;
        if (flow.trigger.type === 'keyword' && clean.includes(flow.trigger.value.toLowerCase())) {
          return flow;
        }
      }
    }
    return null;
  }

  /**
   * Get the starting step of a flow.
   * @param {object} flow
   * @returns {object|null}
   */
  static getInitialStep(flow) {
    if (!flow || !Array.isArray(flow.steps) || flow.steps.length === 0) return null;
    return flow.steps[0];
  }

  /**
   * Find a step by ID within a flow.
   * @param {object} flow
   * @param {string} stepId
   * @returns {object|null}
   */
  static getStep(flow, stepId) {
    if (!flow || !Array.isArray(flow.steps)) return null;
    return flow.steps.find(s => s.id === stepId) || null;
  }

  /**
   * Validate user input against step requirement.
   * @param {string} input
   * @param {string} inputType
   * @returns {{ valid: boolean, error?: string }}
   */
  static validateInput(input, inputType) {
    if (!input || !input.trim()) {
      return { valid: false, error: 'Input cannot be empty.' };
    }
    const val = input.trim();

    if (inputType === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(val)) {
        return { valid: false, error: 'Please enter a valid email address.' };
      }
    }

    if (inputType === 'phone') {
      const phoneRegex = /^[\d\s+\-()]{7,20}$/;
      if (!phoneRegex.test(val)) {
        return { valid: false, error: 'Please enter a valid phone number.' };
      }
    }

    if (inputType === 'number') {
      if (isNaN(Number(val))) {
        return { valid: false, error: 'Please enter a valid number.' };
      }
    }

    return { valid: true };
  }
}
