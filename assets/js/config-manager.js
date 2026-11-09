/**
 * Chatbot Configuration Manager
 * Handles default templates, configuration cloning, schema migrations, and JSON/CSV conversion.
 */

import { ConfigValidator } from './validation.js';

export class ConfigManager {
  /**
   * Produce a clean, valid default chatbot configuration.
   * @param {string} templateId
   * @param {string} customName
   * @returns {object}
   */
  static createDefault(templateId = 'customer_support', customName = 'New Assistant') {
    const randomSuffix = Math.random().toString(36).substring(2, 7);
    const id = `bot_${Date.now().toString(36)}_${randomSuffix}`;

    const baseConfig = {
      schemaVersion: '1.0.0',
      id,
      name: customName,
      description: 'Zero-framework customer support chatbot instance.',
      status: 'draft',
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      identity: {
        assistantName: customName,
        businessName: 'Acme Enterprise',
        businessCategory: 'Customer Service',
        role: 'Support Representative',
        personality: 'professional',
        tone: 'empathetic',
        avatarUrl: '',
        businessLogoUrl: '',
        fallbackMessage: "I'm sorry, I don't have an exact answer for that right now. Would you like me to connect you with our human support team?",
        errorMessage: "I encountered a minor system issue. Please try your question again.",
        handoffMessage: "Connecting you with our support specialist. Please hold on.",
        endingMessage: "Thank you for chatting with us today. Have a wonderful day!"
      },
      appearance: {
        theme: 'light',
        position: 'bottom-right',
        primaryColor: '#2563eb',
        secondaryColor: '#1e40af',
        backgroundColor: '#ffffff',
        textColor: '#1e293b',
        userBubbleColor: '#2563eb',
        botBubbleColor: '#f1f5f9',
        borderRadius: 16,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        headerTitle: customName,
        headerSubtitle: 'Online • Typically replies instantly',
        launcherIcon: 'chat',
        launcherText: 'Chat with us',
        customCss: '',
        width: 380,
        height: 580
      },
      welcomeExperience: {
        greeting: "Hello! 👋 Welcome to our support center. How can we assist you today?",
        showWelcomeScreen: true,
        welcomeTitle: "Welcome to Acme Support",
        welcomeSubtitle: "Ask a question or select an option below to get started.",
        conversationStarters: [
          "What are your business hours?",
          "How can I track my order?",
          "Talk to a human representative"
        ],
        askUserName: false,
        askUserEmail: false,
        consentMessage: "By chatting, you consent to our privacy policy."
      },
      knowledgeBase: [
        {
          id: 'faq_hours',
          question: 'What are your business hours?',
          answer: 'We are open Monday through Friday, 9:00 AM to 6:00 PM EST. Our automated assistant is available 24/7!',
          category: 'General',
          keywords: ['hours', 'open', 'timing', 'schedule', 'weekend', 'work'],
          alternativePhrasings: ['When are you open?', 'What time do you close?', 'Working hours'],
          priority: 5
        },
        {
          id: 'faq_contact',
          question: 'How do I contact customer support?',
          answer: 'You can email our support team at support@example.com or phone us at +1 (800) 555-0199.',
          category: 'Support',
          keywords: ['contact', 'email', 'phone', 'call', 'reach', 'human'],
          alternativePhrasings: ['Can I speak to someone?', 'Support phone number', 'Email address'],
          priority: 5
        },
        {
          id: 'faq_refund',
          question: 'What is your refund policy?',
          answer: 'We offer a 30-day money-back guarantee on all our standard products. Simply submit your receipt to refunds@example.com.',
          category: 'Billing',
          keywords: ['refund', 'return', 'money back', 'cancel', 'guarantee'],
          alternativePhrasings: ['Can I get a refund?', 'How do returns work?'],
          priority: 4
        }
      ],
      conversationFlows: [
        {
          id: 'flow_support_ticket',
          title: 'Submit Support Ticket',
          trigger: { type: 'button', value: 'submit_ticket' },
          steps: [
            {
              id: 'step_1',
              type: 'question',
              text: 'I would be happy to help you create a ticket. What issue are you experiencing today?',
              nextStepId: 'step_2'
            },
            {
              id: 'step_2',
              type: 'input_capture',
              inputType: 'email',
              variableName: 'user_email',
              text: 'Thanks! What is your email address so our team can follow up with you?',
              nextStepId: 'step_3'
            },
            {
              id: 'step_3',
              type: 'message',
              text: 'Got it! Your inquiry has been forwarded to our support queue. An agent will respond within 24 hours.',
              nextStepId: 'end'
            }
          ]
        }
      ],
      businessRules: {
        timezone: 'UTC',
        operatingHours: {
          enabled: false,
          schedule: {
            monday: { open: '09:00', close: '18:00', closed: false },
            tuesday: { open: '09:00', close: '18:00', closed: false },
            wednesday: { open: '09:00', close: '18:00', closed: false },
            thursday: { open: '09:00', close: '18:00', closed: false },
            friday: { open: '09:00', close: '18:00', closed: false },
            saturday: { open: '10:00', close: '16:00', closed: true },
            sunday: { open: '10:00', close: '16:00', closed: true }
          },
          afterHoursMessage: 'We are currently outside our standard business hours. Leave your email and question, and we will reply as soon as we open!'
        },
        confidenceThreshold: 0.35,
        maxHistoryItems: 30,
        rateLimitPerMinute: 20
      },
      humanHandoff: {
        enabled: true,
        mode: 'email',
        destinationEmail: 'support@example.com',
        supportUrl: 'https://example.com/support',
        autoEscalateKeywords: ['agent', 'human', 'representative', 'operator', 'supervisor'],
        consecutiveFallbacksBeforeHandoff: 2
      },
      localization: {
        defaultLanguage: 'en',
        supportedLanguages: ['en', 'es', 'fr', 'de'],
        translations: {
          en: {
            placeholder: 'Type your message...',
            send: 'Send',
            restart: 'Restart conversation',
            poweredBy: 'Zero-Framework Chatbot'
          },
          es: {
            placeholder: 'Escribe tu mensaje...',
            send: 'Enviar',
            restart: 'Reiniciar conversación',
            poweredBy: 'Chatbot Creador'
          }
        }
      },
      integrations: {
        website: {
          enabled: true,
          allowedDomains: ['*'],
          requireDomainValidation: false
        },
        telegram: {
          enabled: false,
          botUsername: '',
          bridgeEndpoint: '',
          status: 'unconfigured'
        },
        whatsapp: {
          enabled: false,
          phoneNumberId: '',
          businessAccountId: '',
          bridgeEndpoint: '',
          status: 'unconfigured'
        },
        webhook: {
          enabled: false,
          endpointUrl: '',
          method: 'POST',
          events: ['on_message', 'on_handoff'],
          customHeaders: {}
        }
      },
      privacy: {
        sessionPersistence: 'session',
        retentionDays: 30,
        collectAnalytics: true,
        maskPii: false,
        privacyPolicyUrl: 'https://example.com/privacy'
      }
    };

    return baseConfig;
  }

  /**
   * Clone an existing chatbot configuration with a new identifier.
   * @param {object} sourceConfig
   * @param {string} [newName]
   * @returns {object}
   */
  static clone(sourceConfig, newName) {
    const copy = JSON.parse(JSON.stringify(sourceConfig));
    const randomSuffix = Math.random().toString(36).substring(2, 7);
    copy.id = `bot_${Date.now().toString(36)}_${randomSuffix}`;
    copy.name = newName || `${copy.name} (Copy)`;
    copy.status = 'draft';
    copy.version = 1;
    copy.createdAt = new Date().toISOString();
    copy.updatedAt = copy.createdAt;
    return copy;
  }

  /**
   * Convert Knowledge Base array to CSV string.
   * @param {Array<object>} kb
   * @returns {string}
   */
  static exportKbToCsv(kb) {
    const headers = ['id', 'question', 'answer', 'category', 'keywords', 'priority'];
    const rows = kb.map(item => [
      `"${(item.id || '').replace(/"/g, '""')}"`,
      `"${(item.question || '').replace(/"/g, '""')}"`,
      `"${(item.answer || '').replace(/"/g, '""')}"`,
      `"${(item.category || '').replace(/"/g, '""')}"`,
      `"${(Array.isArray(item.keywords) ? item.keywords.join(', ') : '').replace(/"/g, '""')}"`,
      item.priority || 5
    ]);
    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  /**
   * Parse CSV string into Knowledge Base array.
   * @param {string} csvText
   * @returns {Array<object>}
   */
  static importKbFromCsv(csvText) {
    const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) return [];

    const result = [];
    for (let i = 1; i < lines.length; i++) {
      // Basic CSV regex parser handling quotes
      const regex = /(?:,|\n|^)("(?:(?:"")*[^"]*)*"|[^",\n]*|(?:\n|$))/g;
      const values = [];
      let match;
      while ((match = regex.exec(lines[i])) !== null) {
        let val = match[1];
        if (val === undefined) break;
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.substring(1, val.length - 1).replace(/""/g, '"');
        }
        values.push(val.trim());
        if (regex.lastIndex >= lines[i].length) break;
      }

      if (values.length >= 3 && values[1] && values[2]) {
        result.push({
          id: values[0] || `faq_${Date.now().toString(36)}_${i}`,
          question: values[1],
          answer: values[2],
          category: values[3] || 'General',
          keywords: values[4] ? values[4].split(',').map(s => s.trim()).filter(Boolean) : [],
          alternativePhrasings: [],
          priority: parseInt(values[5], 10) || 5
        });
      }
    }
    return result;
  }
}
