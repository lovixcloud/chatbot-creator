/**
 * Core Chatbot Runtime Engine
 * Coordinates knowledge matching, workflow progression, business rules,
 * human handoff, session management, and response dispatch.
 */

import { KnowledgeEngine } from './knowledge-engine.js';
import { WorkflowEngine } from './workflow-engine.js';
import { ConversationState } from './conversation.js';

export class ChatbotRuntime {
  /**
   * @param {object} config - Chatbot configuration object conforming to schema
   * @param {object} [options]
   */
  constructor(config, options = {}) {
    this.config = config;
    this.options = options;
    this.state = new ConversationState(options.sessionId, config);
    this.onStateChange = options.onStateChange || (() => {});
    this.onHandoff = options.onHandoff || (() => {});
  }

  /**
   * Initialize runtime session with greeting or welcome message.
   * @returns {object} Initial greeting payload
   */
  initializeSession() {
    const hours = this.state.checkBusinessHours();
    if (!hours.isWithinHours && hours.message) {
      const msg = this.state.addMessage('bot', hours.message);
      return {
        type: 'business_hours_notice',
        message: msg,
        isWithinHours: false
      };
    }

    const greeting = (this.config.welcomeExperience && this.config.welcomeExperience.greeting) ||
      (this.config.identity && this.config.identity.welcomeMessage) ||
      'Hello! How can I help you today?';

    const starters = (this.config.welcomeExperience && this.config.welcomeExperience.conversationStarters) || [];
    const msg = this.state.addMessage('bot', greeting, { options: starters });

    return {
      type: 'greeting',
      message: msg,
      starters,
      showWelcomeScreen: this.config.welcomeExperience ? this.config.welcomeExperience.showWelcomeScreen : false
    };
  }

  /**
   * Process incoming user message and compute bot reply.
   * @param {string} userText
   * @returns {Promise<object>}
   */
  async processMessage(userText) {
    if (!userText || typeof userText !== 'string' || !userText.trim()) {
      return {
        type: 'error',
        text: 'Please enter a valid message.'
      };
    }

    const cleanInput = userText.trim();
    this.state.addMessage('user', cleanInput);

    // 1. Check for explicit Human Handoff keywords
    if (this.config.humanHandoff && this.config.humanHandoff.enabled) {
      const handoffKeywords = this.config.humanHandoff.autoEscalateKeywords || ['human', 'agent', 'support'];
      const isHandoffRequest = handoffKeywords.some(kw =>
        cleanInput.toLowerCase().includes(kw.toLowerCase())
      );

      if (isHandoffRequest) {
        return this.triggerHandoff('keyword_matched');
      }
    }

    // 2. If an active workflow is currently running, advance workflow
    if (this.state.activeFlow && this.state.currentStepId) {
      return this.advanceWorkflow(cleanInput);
    }

    // 3. Check if user input matches a workflow trigger
    if (Array.isArray(this.config.conversationFlows)) {
      const matchedFlow = WorkflowEngine.findFlow(cleanInput, this.config.conversationFlows);
      if (matchedFlow) {
        return this.startWorkflow(matchedFlow);
      }
    }

    // 4. Match against Knowledge Base FAQs
    const threshold = (this.config.businessRules && this.config.businessRules.confidenceThreshold) || 0.35;
    const matchResult = KnowledgeEngine.findBestMatch(cleanInput, this.config.knowledgeBase || [], threshold);

    if (matchResult.match) {
      this.state.consecutiveFallbacks = 0;
      const botMsg = this.state.addMessage('bot', matchResult.match.answer, {
        faqId: matchResult.match.id,
        score: matchResult.score
      });

      this.notifyState();
      return {
        type: 'faq_answer',
        message: botMsg,
        score: matchResult.score,
        matchedQuestion: matchResult.match.question
      };
    }

    // 5. Fallback Response & Handoff Escalation
    this.state.consecutiveFallbacks++;
    const maxFallbacks = (this.config.humanHandoff && this.config.humanHandoff.consecutiveFallbacksBeforeHandoff) || 2;

    if (
      this.config.humanHandoff &&
      this.config.humanHandoff.enabled &&
      this.state.consecutiveFallbacks >= maxFallbacks
    ) {
      return this.triggerHandoff('max_fallbacks_exceeded');
    }

    const fallbackText = (this.config.identity && this.config.identity.fallbackMessage) ||
      "I'm sorry, I don't have information on that topic. Could you rephrase or select a topic below?";
    const starters = (this.config.welcomeExperience && this.config.welcomeExperience.conversationStarters) || [];
    const botMsg = this.state.addMessage('bot', fallbackText, { options: starters });

    this.notifyState();
    return {
      type: 'fallback',
      message: botMsg,
      options: starters
    };
  }

  /**
   * Start a workflow.
   * @param {object} flow
   */
  startWorkflow(flow) {
    this.state.activeFlow = flow;
    const initialStep = WorkflowEngine.getInitialStep(flow);
    if (!initialStep) {
      this.state.clearWorkflow();
      return this.processMessage("menu");
    }

    this.state.currentStepId = initialStep.id;
    return this.renderStep(initialStep);
  }

  /**
   * Advance an active workflow with user response.
   * @param {string} input
   */
  advanceWorkflow(input) {
    const flow = this.state.activeFlow;
    const currentStep = WorkflowEngine.getStep(flow, this.state.currentStepId);

    if (!currentStep) {
      this.state.clearWorkflow();
      return this.processMessage(input);
    }

    // If step was expecting input capture, validate and save variable
    if (currentStep.type === 'input_capture' || currentStep.inputType) {
      const validation = WorkflowEngine.validateInput(input, currentStep.inputType || 'text');
      if (!validation.valid) {
        const errorMsg = this.state.addMessage('bot', validation.error || 'Invalid input. Please try again.');
        return {
          type: 'validation_error',
          message: errorMsg,
          step: currentStep
        };
      }

      if (currentStep.variableName) {
        this.state.variables[currentStep.variableName] = input;
      }
    }

    // Determine next step
    let nextStepId = currentStep.nextStepId;

    // Check options if quick reply/choice was given
    if (Array.isArray(currentStep.options) && currentStep.options.length > 0) {
      const selected = currentStep.options.find(
        o => o.label.toLowerCase() === input.toLowerCase() || (o.value && o.value.toLowerCase() === input.toLowerCase())
      );
      if (selected && selected.nextStepId) {
        nextStepId = selected.nextStepId;
      }
    }

    if (!nextStepId || nextStepId === 'end') {
      this.state.clearWorkflow();
      const endMsg = (this.config.identity && this.config.identity.endingMessage) || 'Workflow completed. Can I help with anything else?';
      const botMsg = this.state.addMessage('bot', endMsg);
      this.notifyState();
      return {
        type: 'flow_end',
        message: botMsg,
        variables: { ...this.state.variables }
      };
    }

    const nextStep = WorkflowEngine.getStep(flow, nextStepId);
    if (!nextStep) {
      this.state.clearWorkflow();
      const botMsg = this.state.addMessage('bot', 'Process finished.');
      return { type: 'flow_end', message: botMsg };
    }

    this.state.currentStepId = nextStep.id;
    return this.renderStep(nextStep);
  }

  /**
   * Render a specific step of a workflow.
   * @param {object} step
   */
  renderStep(step) {
    if (step.type === 'handoff') {
      return this.triggerHandoff('workflow_step');
    }

    const options = Array.isArray(step.options) ? step.options.map(o => o.label) : [];
    const botMsg = this.state.addMessage('bot', step.text || '', {
      options,
      inputType: step.inputType
    });

    this.notifyState();
    return {
      type: 'flow_step',
      step,
      message: botMsg,
      options
    };
  }

  /**
   * Trigger support escalation.
   * @param {string} reason
   */
  triggerHandoff(reason) {
    const handoffConfig = this.config.humanHandoff || {};
    const text = (this.config.identity && this.config.identity.handoffMessage) ||
      'Connecting you with our support specialist. Please wait...';

    const botMsg = this.state.addMessage('bot', text, {
      isHandoff: true,
      mode: handoffConfig.mode || 'email',
      destinationEmail: handoffConfig.destinationEmail || '',
      supportUrl: handoffConfig.supportUrl || ''
    });

    this.onHandoff({
      reason,
      state: this.state.serialize(),
      destination: handoffConfig.destinationEmail || handoffConfig.supportUrl
    });

    this.notifyState();
    return {
      type: 'handoff',
      message: botMsg,
      reason,
      handoffConfig
    };
  }

  /**
   * Notify state change listener.
   */
  notifyState() {
    this.onStateChange(this.state.serialize());
  }

  /**
   * Reset conversation state completely.
   */
  resetSession() {
    this.state = new ConversationState(null, this.config);
    return this.initializeSession();
  }
}
