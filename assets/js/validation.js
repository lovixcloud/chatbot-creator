/**
 * Chatbot Configuration Validation Engine
 * Validates chatbot configuration JSON against schema rules without third party dependencies.
 */

export class ConfigValidator {
  /**
   * Validate a chatbot configuration object.
   * @param {any} config
   * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
   */
  static validate(config) {
    const errors = [];
    const warnings = [];

    if (!config || typeof config !== 'object' || Array.isArray(config)) {
      return { valid: false, errors: ['Configuration must be a non-null object.'], warnings: [] };
    }

    // Required top-level fields
    const requiredFields = [
      'schemaVersion',
      'id',
      'name',
      'status',
      'identity',
      'appearance',
      'welcomeExperience',
      'knowledgeBase',
      'conversationFlows',
      'businessRules',
      'integrations',
      'privacy'
    ];

    for (const field of requiredFields) {
      if (config[field] === undefined || config[field] === null) {
        errors.push(`Missing required top-level property: "${field}".`);
      }
    }

    // ID validation
    if (config.id) {
      if (typeof config.id !== 'string') {
        errors.push('Property "id" must be a string.');
      } else if (!/^[a-z0-9_-]{3,64}$/.test(config.id)) {
        errors.push('Property "id" must be 3-64 characters and contain only lowercase letters, numbers, underscores, or dashes.');
      }
    }

    // Name validation
    if (config.name) {
      if (typeof config.name !== 'string' || config.name.trim().length === 0) {
        errors.push('Property "name" must be a non-empty string.');
      } else if (config.name.length > 100) {
        errors.push('Property "name" cannot exceed 100 characters.');
      }
    }

    // Status validation
    if (config.status && !['draft', 'published', 'archived'].includes(config.status)) {
      errors.push('Property "status" must be one of: "draft", "published", "archived".');
    }

    // Identity validation
    if (config.identity) {
      if (typeof config.identity !== 'object') {
        errors.push('Property "identity" must be an object.');
      } else {
        const idProps = ['assistantName', 'businessName', 'role', 'personality'];
        for (const p of idProps) {
          if (!config.identity[p] || typeof config.identity[p] !== 'string') {
            errors.push(`Identity missing required string property "${p}".`);
          }
        }
      }
    }

    // Appearance validation
    if (config.appearance) {
      if (typeof config.appearance !== 'object') {
        errors.push('Property "appearance" must be an object.');
      } else {
        if (!config.appearance.primaryColor || !/^#[0-9a-fA-F]{6}$/.test(config.appearance.primaryColor)) {
          errors.push('Appearance "primaryColor" must be a valid 6-character hex code (e.g. #2563eb).');
        }
        if (!['bottom-right', 'bottom-left', 'bottom-center'].includes(config.appearance.position)) {
          errors.push('Appearance "position" must be "bottom-right", "bottom-left", or "bottom-center".');
        }
      }
    }

    // Welcome experience validation
    if (config.welcomeExperience) {
      if (typeof config.welcomeExperience !== 'object') {
        errors.push('Property "welcomeExperience" must be an object.');
      } else {
        if (!config.welcomeExperience.greeting || typeof config.welcomeExperience.greeting !== 'string') {
          errors.push('WelcomeExperience "greeting" must be a non-empty string.');
        }
        if (!Array.isArray(config.welcomeExperience.conversationStarters)) {
          errors.push('WelcomeExperience "conversationStarters" must be an array of strings.');
        }
      }
    }

    // Knowledge Base validation
    if (config.knowledgeBase) {
      if (!Array.isArray(config.knowledgeBase)) {
        errors.push('Property "knowledgeBase" must be an array.');
      } else {
        const seenFaqIds = new Set();
        config.knowledgeBase.forEach((faq, idx) => {
          if (!faq || typeof faq !== 'object') {
            errors.push(`KnowledgeBase entry at index ${idx} must be an object.`);
            return;
          }
          if (!faq.id) {
            errors.push(`KnowledgeBase entry at index ${idx} is missing an "id".`);
          } else {
            if (seenFaqIds.has(faq.id)) {
              warnings.push(`Duplicate FAQ ID detected: "${faq.id}".`);
            }
            seenFaqIds.add(faq.id);
          }
          if (!faq.question || typeof faq.question !== 'string' || !faq.question.trim()) {
            errors.push(`KnowledgeBase entry at index ${idx} requires a non-empty "question".`);
          }
          if (!faq.answer || typeof faq.answer !== 'string' || !faq.answer.trim()) {
            errors.push(`KnowledgeBase entry at index ${idx} requires a non-empty "answer".`);
          }
          if (!Array.isArray(faq.keywords)) {
            warnings.push(`KnowledgeBase entry "${faq.id || idx}" has no keywords array.`);
          }
        });
      }
    }

    // Conversation Flows validation
    if (config.conversationFlows) {
      if (!Array.isArray(config.conversationFlows)) {
        errors.push('Property "conversationFlows" must be an array.');
      } else {
        config.conversationFlows.forEach((flow, fIdx) => {
          if (!flow.id || !flow.title || !Array.isArray(flow.steps)) {
            errors.push(`Flow at index ${fIdx} is missing required fields (id, title, steps).`);
            return;
          }
          const stepIds = new Set(flow.steps.map(s => s.id));
          flow.steps.forEach((step, sIdx) => {
            if (step.nextStepId && step.nextStepId !== 'end' && !stepIds.has(step.nextStepId)) {
              warnings.push(`Flow "${flow.title}" step "${step.id || sIdx}" references nonexistent nextStepId "${step.nextStepId}".`);
            }
            if (Array.isArray(step.options)) {
              step.options.forEach(opt => {
                if (opt.nextStepId && opt.nextStepId !== 'end' && !stepIds.has(opt.nextStepId)) {
                  warnings.push(`Flow "${flow.title}" step "${step.id}" option "${opt.label}" references missing nextStepId "${opt.nextStepId}".`);
                }
              });
            }
          });
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Sanitize text against HTML injection.
   * @param {string} text
   * @returns {string}
   */
  static escapeHtml(text) {
    if (typeof text !== 'string') return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
