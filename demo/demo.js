/**
 * Isolated Educational Demo App Controller
 * Connects any configured chatbot, captures internal runtime events,
 * and visualizes live matching scores, active flows, and user interactions.
 */

import { storage } from '../assets/js/storage.js';
import { TEMPLATES } from '../data/templates/templates-data.js';
import { ConfigManager } from '../assets/js/config-manager.js';
import { ConfigValidator } from '../assets/js/validation.js';
import { WebsiteAdapter } from '../chatbot/adapters/website.js';

class DemoPortalController {
  constructor() {
    this.currentAdapter = null;
    this.activeConfig = null;
    this.botContainer = document.getElementById('demo-bot-container');
    this.logContainer = document.getElementById('eventLogContainer');
  }

  async init() {
    await storage.init();
    await this.populateSelector();
    this.bindEvents();

    // Auto-load default
    const selector = document.getElementById('botSelector');
    if (selector && selector.value) {
      await this.loadChatbot(selector.value);
    }
  }

  async populateSelector() {
    const selector = document.getElementById('botSelector');
    if (!selector) return;

    selector.innerHTML = '';

    // 1. Group saved bots
    const saved = await storage.getAllChatbots();
    if (saved.length > 0) {
      const optGroupSaved = document.createElement('optgroup');
      optGroupSaved.label = 'Saved Studio Chatbots';
      saved.forEach(bot => {
        const opt = document.createElement('option');
        opt.value = `saved_${bot.id}`;
        opt.textContent = `${bot.name} (${bot.status})`;
        optGroupSaved.appendChild(opt);
      });
      selector.appendChild(optGroupSaved);
    }

    // 2. Group templates
    const optGroupTmpl = document.createElement('optgroup');
    optGroupTmpl.label = 'Built-in Industry Templates';
    TEMPLATES.forEach(t => {
      const opt = document.createElement('option');
      opt.value = `tmpl_${t.id}`;
      opt.textContent = t.name;
      optGroupTmpl.appendChild(opt);
    });
    selector.appendChild(optGroupTmpl);
  }

  bindEvents() {
    const selector = document.getElementById('botSelector');
    if (selector) {
      selector.addEventListener('change', (e) => this.loadChatbot(e.target.value));
    }

    const btnClear = document.getElementById('btnClearLogs');
    if (btnClear) {
      btnClear.addEventListener('click', () => {
        if (this.logContainer) this.logContainer.innerHTML = '';
      });
    }

    const btnUpload = document.getElementById('btnUploadConfig');
    const fileInput = document.getElementById('customJsonInput');
    if (btnUpload && fileInput) {
      btnUpload.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
          const raw = await file.text();
          const parsed = JSON.parse(raw);
          const validation = ConfigValidator.validate(parsed);
          if (!validation.valid) {
            alert(`Invalid configuration:\n\n${validation.errors.join('\n')}`);
            return;
          }
          this.log('Config Imported', `Loaded custom JSON: ${parsed.name}`);
          this.mountChatbot(parsed);
        } catch (err) {
          alert(`Failed to load file: ${err.message}`);
        }
      });
    }
  }

  log(eventType, detail) {
    if (!this.logContainer) return;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerHTML = `
      <span class="log-time">${time}</span>
      <span class="log-event">${ConfigValidator.escapeHtml(eventType)}</span>
      <span class="log-detail">${ConfigValidator.escapeHtml(detail)}</span>
    `;

    this.logContainer.appendChild(entry);
    this.logContainer.scrollTop = this.logContainer.scrollHeight;
  }

  async loadChatbot(key) {
    if (key.startsWith('saved_')) {
      const id = key.replace('saved_', '');
      const bot = await storage.getChatbot(id);
      if (bot) {
        this.mountChatbot(bot);
        return;
      }
    }

    if (key.startsWith('tmpl_')) {
      const tmplId = key.replace('tmpl_', '');
      const tmpl = TEMPLATES.find(t => t.id === tmplId);
      if (tmpl) {
        const bot = ConfigManager.createDefault(tmpl.id, tmpl.name);
        Object.assign(bot.identity, tmpl.config.identity || {});
        Object.assign(bot.appearance, tmpl.config.appearance || {});
        Object.assign(bot.welcomeExperience, tmpl.config.welcomeExperience || {});
        if (tmpl.config.knowledgeBase) bot.knowledgeBase = tmpl.config.knowledgeBase;
        this.mountChatbot(bot);
        return;
      }
    }
  }

  async mountChatbot(config) {
    this.activeConfig = config;

    // Disconnect old adapter
    if (this.currentAdapter) {
      await this.currentAdapter.disconnect();
      this.currentAdapter = null;
    }

    if (this.botContainer) {
      this.botContainer.innerHTML = '';
    }

    const host = document.createElement('div');
    this.botContainer.appendChild(host);

    this.log('Assistant Loaded', `Name: "${config.name}", Personality: ${config.identity.personality}`);

    this.currentAdapter = new WebsiteAdapter(config, host);
    await this.currentAdapter.connect();

    // Hook runtime telemetry
    const originalProcess = this.currentAdapter.runtime.processMessage.bind(this.currentAdapter.runtime);
    this.currentAdapter.runtime.processMessage = async (text) => {
      this.log('User Input', `"${text}"`);
      const reply = await originalProcess(text);

      if (reply.type === 'faq_answer') {
        this.log('Knowledge Base Match', `Matched: "${reply.matchedQuestion}" (Score: ${(reply.score * 100).toFixed(1)}%)`);
      } else if (reply.type === 'flow_step') {
        this.log('Workflow Progress', `Step: ${reply.step.id} (${reply.step.type})`);
      } else if (reply.type === 'flow_end') {
        this.log('Workflow Complete', `Captured variables: ${JSON.stringify(reply.variables)}`);
      } else if (reply.type === 'handoff') {
        this.log('Human Escalation Triggered', `Reason: ${reply.reason}`);
      } else if (reply.type === 'fallback') {
        this.log('Fallback Triggered', `No FAQ confidence reached threshold (${config.businessRules.confidenceThreshold})`);
      }

      return reply;
    };
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const portal = new DemoPortalController();
  portal.init();
});
