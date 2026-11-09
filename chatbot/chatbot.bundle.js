/**
 * Zero-Framework Standalone Chatbot Widget Bundle
 * 100% self-contained IIFE bundle: no external module imports, no bundler needed.
 * Works seamlessly on any external website, CMS, Shopify, WordPress, or static HTML.
 */

(function (global) {
  'use strict';

  // --- CONFIG VALIDATOR UTILITY ---
  const ConfigValidator = {
    escapeHtml(str) {
      if (str === null || str === undefined) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }
  };

  // --- KNOWLEDGE ENGINE ---
  class KnowledgeEngine {
    static normalize(text) {
      if (!text || typeof text !== 'string') return '';
      return text
        .toLowerCase()
        .replace(/[^\w\s]/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    static tokenize(text) {
      const clean = KnowledgeEngine.normalize(text);
      if (!clean) return [];
      const stopWords = new Set(['a', 'an', 'the', 'is', 'in', 'at', 'of', 'on', 'for', 'to', 'and', 'or', 'do', 'can', 'you', 'i', 'my', 'how', 'what', 'where', 'when', 'who', 'why']);
      return clean.split(' ').filter(w => w.length > 1 && !stopWords.has(w));
    }

    static calculateSimilarity(query, target) {
      const normQuery = KnowledgeEngine.normalize(query);
      const normTarget = KnowledgeEngine.normalize(target);

      if (normQuery === normTarget) return 1.0;
      if (normTarget.includes(normQuery) || normQuery.includes(normTarget)) {
        const minLen = Math.min(normQuery.length, normTarget.length);
        const maxLen = Math.max(normQuery.length, normTarget.length);
        return Math.max(0.65, minLen / maxLen);
      }

      const qTokens = KnowledgeEngine.tokenize(normQuery);
      const tTokens = KnowledgeEngine.tokenize(normTarget);
      if (qTokens.length === 0 || tTokens.length === 0) return 0.0;

      const tSet = new Set(tTokens);
      let matches = 0;
      for (const token of qTokens) {
        if (tSet.has(token)) {
          matches++;
        } else {
          for (const targetToken of tTokens) {
            if (token.length > 3 && targetToken.length > 3) {
              if (token.startsWith(targetToken.slice(0, 4)) || targetToken.startsWith(token.slice(0, 4))) {
                matches += 0.8;
                break;
              }
            }
          }
        }
      }

      return matches / Math.max(qTokens.length, tTokens.length);
    }

    static findBestMatch(userQuery, knowledgeBase = [], threshold = 0.35) {
      if (!userQuery || !Array.isArray(knowledgeBase) || knowledgeBase.length === 0) {
        return { match: null, score: 0 };
      }

      let bestMatch = null;
      let highestScore = 0;

      for (const entry of knowledgeBase) {
        let bestEntryScore = KnowledgeEngine.calculateSimilarity(userQuery, entry.question || '');

        if (Array.isArray(entry.alternativePhrasings)) {
          for (const alt of entry.alternativePhrasings) {
            const altScore = KnowledgeEngine.calculateSimilarity(userQuery, alt);
            if (altScore > bestEntryScore) bestEntryScore = altScore;
          }
        }

        if (Array.isArray(entry.keywords)) {
          const qNorm = KnowledgeEngine.normalize(userQuery);
          for (const kw of entry.keywords) {
            if (qNorm.includes(KnowledgeEngine.normalize(kw))) {
              bestEntryScore = Math.max(bestEntryScore, 0.75);
            }
          }
        }

        if (bestEntryScore > highestScore) {
          highestScore = bestEntryScore;
          bestMatch = entry;
        }
      }

      return {
        match: highestScore >= threshold ? bestMatch : null,
        score: Math.round(highestScore * 100) / 100,
        candidate: bestMatch
      };
    }
  }

  // --- WORKFLOW ENGINE ---
  class WorkflowEngine {
    static findFlow(userTrigger, flows = []) {
      if (!userTrigger || !Array.isArray(flows)) return null;
      const clean = KnowledgeEngine.normalize(userTrigger);
      return flows.find(flow => {
        if (flow.trigger && KnowledgeEngine.normalize(flow.trigger) === clean) return true;
        if (flow.triggerKeyword && clean.includes(KnowledgeEngine.normalize(flow.triggerKeyword))) return true;
        return false;
      }) || null;
    }

    static getInitialStep(flow) {
      if (!flow || !Array.isArray(flow.steps) || flow.steps.length === 0) return null;
      if (flow.initialStepId) {
        const found = flow.steps.find(s => s.id === flow.initialStepId);
        if (found) return found;
      }
      return flow.steps[0];
    }

    static getStep(flow, stepId) {
      if (!flow || !Array.isArray(flow.steps)) return null;
      return flow.steps.find(s => s.id === stepId) || null;
    }

    static validateInput(input, type) {
      if (!input || typeof input !== 'string') return { valid: false, error: 'Input required.' };
      const trimmed = input.trim();
      switch (type) {
        case 'email':
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          return emailRegex.test(trimmed) ? { valid: true } : { valid: false, error: 'Please enter a valid email address.' };
        case 'phone':
          const phoneRegex = /^[\d\+\-\s\(\)]{7,20}$/;
          return phoneRegex.test(trimmed) ? { valid: true } : { valid: false, error: 'Please enter a valid phone number.' };
        default:
          return trimmed.length > 0 ? { valid: true } : { valid: false, error: 'Input cannot be blank.' };
      }
    }
  }

  // --- CONVERSATION STATE ---
  class ConversationState {
    constructor(sessionId, config) {
      this.sessionId = sessionId || ('sess_' + Math.random().toString(36).substring(2, 9));
      this.config = config || {};
      this.messages = [];
      this.variables = {};
      this.activeFlow = null;
      this.currentStepId = null;
      this.consecutiveFallbacks = 0;
      this.createdAt = new Date().toISOString();
    }

    addMessage(sender, text, metadata = {}) {
      const msg = {
        id: 'msg_' + Math.random().toString(36).substring(2, 9),
        sender,
        text,
        timestamp: new Date().toISOString(),
        ...metadata
      };
      this.messages.push(msg);
      return msg;
    }

    clearWorkflow() {
      this.activeFlow = null;
      this.currentStepId = null;
    }

    checkBusinessHours() {
      const rules = this.config.businessRules || {};
      if (!rules.enabled || !rules.openingHours) {
        return { isWithinHours: true };
      }

      const now = new Date();
      const currentDay = now.toLocaleDateString('en-US', { weekday: 'lowercase' });
      const currentHour = now.getHours() + (now.getMinutes() / 60);

      const days = rules.workingDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
      if (!days.includes(currentDay)) {
        return { isWithinHours: false, message: rules.afterHoursMessage || 'We are currently closed.' };
      }

      const [startH, startM] = (rules.openingHours.start || '09:00').split(':').map(Number);
      const [endH, endM] = (rules.openingHours.end || '17:00').split(':').map(Number);
      const start = startH + (startM / 60);
      const end = endH + (endM / 60);

      if (currentHour >= start && currentHour < end) {
        return { isWithinHours: true };
      }

      return { isWithinHours: false, message: rules.afterHoursMessage || 'We are currently closed for the day.' };
    }

    serialize() {
      return {
        sessionId: this.sessionId,
        messages: this.messages,
        variables: this.variables,
        activeFlowId: this.activeFlow ? this.activeFlow.id : null,
        currentStepId: this.currentStepId,
        consecutiveFallbacks: this.consecutiveFallbacks,
        createdAt: this.createdAt
      };
    }
  }

  // --- CORE RUNTIME ---
  class ChatbotRuntime {
    constructor(config, options = {}) {
      this.config = config;
      this.options = options;
      this.state = new ConversationState(options.sessionId, config);
      this.onStateChange = options.onStateChange || (() => {});
      this.onHandoff = options.onHandoff || (() => {});
    }

    initializeSession() {
      const hours = this.state.checkBusinessHours();
      if (!hours.isWithinHours && hours.message) {
        const msg = this.state.addMessage('bot', hours.message);
        return { type: 'business_hours_notice', message: msg, isWithinHours: false };
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

    async processMessage(userText) {
      if (!userText || typeof userText !== 'string' || !userText.trim()) {
        return { type: 'error', text: 'Please enter a valid message.' };
      }

      const cleanInput = userText.trim();
      this.state.addMessage('user', cleanInput);

      if (this.config.humanHandoff && this.config.humanHandoff.enabled) {
        const handoffKeywords = this.config.humanHandoff.autoEscalateKeywords || ['human', 'agent', 'support'];
        const isHandoffRequest = handoffKeywords.some(kw => cleanInput.toLowerCase().includes(kw.toLowerCase()));
        if (isHandoffRequest) return this.triggerHandoff('keyword_matched');
      }

      if (this.state.activeFlow && this.state.currentStepId) {
        return this.advanceWorkflow(cleanInput);
      }

      if (Array.isArray(this.config.conversationFlows)) {
        const matchedFlow = WorkflowEngine.findFlow(cleanInput, this.config.conversationFlows);
        if (matchedFlow) return this.startWorkflow(matchedFlow);
      }

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

      this.state.consecutiveFallbacks++;
      const maxFallbacks = (this.config.humanHandoff && this.config.humanHandoff.consecutiveFallbacksBeforeHandoff) || 2;
      if (this.config.humanHandoff && this.config.humanHandoff.enabled && this.state.consecutiveFallbacks >= maxFallbacks) {
        return this.triggerHandoff('max_fallbacks_exceeded');
      }

      const fallbackText = (this.config.identity && this.config.identity.fallbackMessage) ||
        "I'm sorry, I don't have information on that topic. Could you rephrase or select a topic below?";
      const starters = (this.config.welcomeExperience && this.config.welcomeExperience.conversationStarters) || [];
      const botMsg = this.state.addMessage('bot', fallbackText, { options: starters });

      this.notifyState();
      return { type: 'fallback', message: botMsg, options: starters };
    }

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

    advanceWorkflow(input) {
      const flow = this.state.activeFlow;
      const currentStep = WorkflowEngine.getStep(flow, this.state.currentStepId);
      if (!currentStep) {
        this.state.clearWorkflow();
        return this.processMessage(input);
      }

      if (currentStep.type === 'input_capture' || currentStep.inputType) {
        const validation = WorkflowEngine.validateInput(input, currentStep.inputType || 'text');
        if (!validation.valid) {
          const errorMsg = this.state.addMessage('bot', validation.error || 'Invalid input.');
          return { type: 'validation_error', message: errorMsg, step: currentStep };
        }
        if (currentStep.variableName) {
          this.state.variables[currentStep.variableName] = input;
        }
      }

      let nextStepId = currentStep.nextStepId;
      if (Array.isArray(currentStep.options) && currentStep.options.length > 0) {
        const selected = currentStep.options.find(
          o => o.label.toLowerCase() === input.toLowerCase() || (o.value && o.value.toLowerCase() === input.toLowerCase())
        );
        if (selected && selected.nextStepId) nextStepId = selected.nextStepId;
      }

      if (!nextStepId || nextStepId === 'end') {
        this.state.clearWorkflow();
        const endMsg = (this.config.identity && this.config.identity.endingMessage) || 'Workflow completed. Can I help with anything else?';
        const botMsg = this.state.addMessage('bot', endMsg);
        this.notifyState();
        return { type: 'flow_end', message: botMsg, variables: { ...this.state.variables } };
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

    renderStep(step) {
      if (step.type === 'handoff') return this.triggerHandoff('workflow_step');
      const options = Array.isArray(step.options) ? step.options.map(o => o.label) : [];
      const botMsg = this.state.addMessage('bot', step.text || '', { options, inputType: step.inputType });
      this.notifyState();
      return { type: 'flow_step', step, message: botMsg, options };
    }

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
      return { type: 'handoff', message: botMsg, reason, handoffConfig };
    }

    notifyState() {
      this.onStateChange(this.state.serialize());
    }

    resetSession() {
      this.state = new ConversationState(null, this.config);
      return this.initializeSession();
    }
  }

  // --- SHADOW DOM RENDERER ---
  class ChatbotRenderer {
    constructor(hostElement, config, callbacks = {}) {
      this.hostElement = hostElement;
      this.config = config;
      this.callbacks = callbacks;
      this.isOpen = false;
      this.shadowRoot = null;
      this.init();
    }

    init() {
      this.shadowRoot = this.hostElement.attachShadow({ mode: 'open' });
      this.render();
    }

    updateConfig(newConfig) {
      this.config = newConfig;
      if (this.shadowRoot) this.render();
    }

    getStyles() {
      const appearance = this.config.appearance || {};
      const primary = appearance.primaryColor || '#2563eb';
      const secondary = appearance.secondaryColor || '#1d4ed8';
      const textColor = appearance.textColor || '#1e293b';
      const radius = appearance.borderRadius !== undefined ? `${appearance.borderRadius}px` : '16px';
      const fontFamily = appearance.fontFamily || 'system-ui, -apple-system, sans-serif';
      const isDark = appearance.theme === 'dark';

      const bg = isDark ? '#0f172a' : (appearance.backgroundColor || '#ffffff');
      const surface = isDark ? '#1e293b' : '#f8fafc';
      const text = isDark ? '#f8fafc' : textColor;
      const border = isDark ? '#334155' : '#e2e8f0';
      const botBubble = isDark ? '#334155' : (appearance.botBubbleColor || '#f1f5f9');
      const userBubble = appearance.userBubbleColor || primary;
      const userBubbleText = '#ffffff';

      return `
        :host {
          all: initial;
          font-family: ${fontFamily};
          position: absolute;
          bottom: 12px;
          ${appearance.position === 'bottom-left' ? 'left: 12px;' : 'right: 12px;'};
          z-index: 2147483647;
          box-sizing: border-box;
          max-width: calc(100% - 24px);
          max-height: calc(100% - 24px);
          display: flex;
          flex-direction: column;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .widget-launcher {
          display: flex;
          align-items: center;
          gap: 8px;
          background: ${primary};
          color: #ffffff;
          border: none;
          padding: 12px 18px;
          border-radius: 9999px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          box-shadow: 0 4px 14px rgba(0,0,0,0.2);
          transition: transform 0.2s, background-color 0.2s;
          font-family: inherit;
        }
        .widget-launcher:hover {
          transform: scale(1.05);
          background: ${secondary};
        }
        .widget-launcher svg { width: 22px; height: 22px; fill: currentColor; }
        .chat-window {
          display: flex;
          flex-direction: column;
          width: min(calc(100vw - 32px), ${appearance.width || 380}px);
          max-width: 100%;
          height: min(calc(100vh - 100px), ${appearance.height || 580}px);
          max-height: 100%;
          background: ${bg};
          color: ${text};
          border-radius: ${radius};
          box-shadow: 0 10px 30px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.06);
          border: 1px solid ${border};
          overflow: hidden;
          animation: slideUp 0.25s ease-out;
        }
        @media (max-width: 480px) {
          .chat-window { width: calc(100vw - 24px); height: calc(100vh - 80px); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .chat-header {
          background: ${primary};
          color: #ffffff;
          padding: 14px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .header-info { display: flex; align-items: center; gap: 10px; }
        .header-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: rgba(255,255,255,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .header-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .header-titles h3 { font-size: 15px; font-weight: 600; line-height: 1.2; }
        .header-titles p { font-size: 11px; opacity: 0.9; }
        .header-actions { display: flex; align-items: center; gap: 6px; }
        .btn-icon {
          background: none;
          border: none;
          color: #ffffff;
          cursor: pointer;
          padding: 6px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s;
        }
        .btn-icon:hover { background: rgba(255,255,255,0.2); }
        .messages-container {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .msg-row { display: flex; flex-direction: column; max-width: 82%; }
        .msg-row.user { align-self: flex-end; }
        .msg-row.bot { align-self: flex-start; }
        .msg-bubble {
          padding: 10px 14px;
          border-radius: 14px;
          font-size: 13.5px;
          line-height: 1.45;
          word-break: break-word;
        }
        .msg-row.user .msg-bubble {
          background: ${userBubble};
          color: ${userBubbleText};
          border-bottom-right-radius: 4px;
        }
        .msg-row.bot .msg-bubble {
          background: ${botBubble};
          color: ${text};
          border-bottom-left-radius: 4px;
        }
        .msg-time { font-size: 10px; color: #94a3b8; margin-top: 4px; align-self: flex-start; }
        .msg-row.user .msg-time { align-self: flex-end; }
        .options-list { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
        .option-chip {
          background: ${surface};
          color: ${primary};
          border: 1px solid ${border};
          padding: 6px 12px;
          border-radius: 9999px;
          font-size: 12.5px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
          font-family: inherit;
        }
        .option-chip:hover {
          background: ${primary};
          color: #ffffff;
          border-color: ${primary};
        }
        .chat-footer { padding: 12px; border-top: 1px solid ${border}; background: ${bg}; }
        .input-wrapper {
          display: flex;
          align-items: center;
          background: ${surface};
          border: 1px solid ${border};
          border-radius: 9999px;
          padding: 4px 6px 4px 14px;
        }
        .input-wrapper input {
          flex: 1;
          border: none;
          background: transparent;
          font-size: 13.5px;
          color: ${text};
          outline: none;
          font-family: inherit;
        }
        .btn-send {
          background: ${primary};
          color: #ffffff;
          border: none;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.15s;
        }
        .btn-send:hover { background: ${secondary}; }
        .btn-send svg { width: 16px; height: 16px; fill: currentColor; }
        .branding { text-align: center; font-size: 10px; color: #94a3b8; margin-top: 6px; }
        ${appearance.customCss || ''}
      `;
    }

    render() {
      const identity = this.config.identity || {};
      const appearance = this.config.appearance || {};

      const name = ConfigValidator.escapeHtml(identity.assistantName || 'Support Assistant');
      const subtitle = ConfigValidator.escapeHtml(appearance.headerSubtitle || 'Typically replies instantly');
      const launcherText = ConfigValidator.escapeHtml(appearance.launcherText || 'Chat');

      this.shadowRoot.innerHTML = `
        <style>${this.getStyles()}</style>

        ${!this.isOpen ? `
          <button class="widget-launcher" aria-label="Open Chat">
            <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
            <span>${launcherText}</span>
          </button>
        ` : `
          <div class="chat-window" role="dialog" aria-modal="true" aria-label="Chatbot Assistant">
            <header class="chat-header">
              <div class="header-info">
                <div class="header-avatar">
                  ${identity.avatarUrl ? `<img src="${ConfigValidator.escapeHtml(identity.avatarUrl)}" alt="${name}" />` : `<svg viewBox="0 0 24 24" width="20" height="20" fill="#fff"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>`}
                </div>
                <div class="header-titles">
                  <h3>${name}</h3>
                  <p>${subtitle}</p>
                </div>
              </div>
              <div class="header-actions">
                <button class="btn-icon btn-reset" title="Restart Chat" aria-label="Restart Conversation">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
                </button>
                <button class="btn-icon btn-close" title="Close" aria-label="Close Chat">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                </button>
              </div>
            </header>

            <main class="messages-container" id="msgList"></main>

            <footer class="chat-footer">
              <form class="input-wrapper" id="chatForm">
                <input type="text" id="userInput" placeholder="Type your question..." autocomplete="off" aria-label="Type message" />
                <button type="submit" class="btn-send" aria-label="Send">
                  <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                </button>
              </form>
              <div class="branding">Zero-Framework Micro-SaaS Chatbot</div>
            </footer>
          </div>
        `}
      `;

      this.attachEventListeners();
    }

    attachEventListeners() {
      const launcher = this.shadowRoot.querySelector('.widget-launcher');
      if (launcher) {
        launcher.addEventListener('click', () => {
          this.isOpen = true;
          this.render();
          if (this.callbacks.onOpen) this.callbacks.onOpen();
        });
      }

      const btnClose = this.shadowRoot.querySelector('.btn-close');
      if (btnClose) {
        btnClose.addEventListener('click', () => {
          this.isOpen = false;
          this.render();
        });
      }

      const btnReset = this.shadowRoot.querySelector('.btn-reset');
      if (btnReset) {
        btnReset.addEventListener('click', () => {
          if (this.callbacks.onReset) this.callbacks.onReset();
        });
      }

      const form = this.shadowRoot.querySelector('#chatForm');
      const input = this.shadowRoot.querySelector('#userInput');
      if (form && input) {
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          const text = input.value.trim();
          if (text && this.callbacks.onSendMessage) {
            input.value = '';
            this.callbacks.onSendMessage(text);
          }
        });
      }
    }

    appendMessage(sender, text, options = []) {
      const msgList = this.shadowRoot.querySelector('#msgList');
      if (!msgList) return;

      const row = document.createElement('div');
      row.className = `msg-row ${sender}`;
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      let optionsHtml = '';
      if (Array.isArray(options) && options.length > 0) {
        optionsHtml = `<div class="options-list">` +
          options.map(opt => `<button type="button" class="option-chip" data-val="${ConfigValidator.escapeHtml(opt)}">${ConfigValidator.escapeHtml(opt)}</button>`).join('') +
          `</div>`;
      }

      row.innerHTML = `
        <div class="msg-bubble">${ConfigValidator.escapeHtml(text)}</div>
        ${optionsHtml}
        <span class="msg-time">${time}</span>
      `;

      row.querySelectorAll('.option-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          const val = chip.getAttribute('data-val');
          if (this.callbacks.onSendMessage) {
            this.callbacks.onSendMessage(val);
          }
        });
      });

      msgList.appendChild(row);
      msgList.scrollTop = msgList.scrollHeight;
    }

    clearMessages() {
      const msgList = this.shadowRoot.querySelector('#msgList');
      if (msgList) msgList.innerHTML = '';
    }
  }

  // --- WEBSITE ADAPTER ---
  class WebsiteAdapter {
    constructor(config, container) {
      this.config = config;
      this.container = container || null;
      this.runtime = null;
      this.renderer = null;
      this.isConnected = false;
    }

    async connect() {
      if (!this.container) {
        this.container = document.createElement('div');
        this.container.id = `cb-root-${this.config.id || 'widget'}`;
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
  }

  // Export to global scope
  global.ZeroFrameworkChatbot = {
    KnowledgeEngine,
    WorkflowEngine,
    ConversationState,
    ChatbotRuntime,
    ChatbotRenderer,
    WebsiteAdapter,
    init: async function (config, container) {
      const adapter = new WebsiteAdapter(config, container);
      await adapter.connect();
      return adapter;
    }
  };

})(typeof window !== 'undefined' ? window : globalThis);
