/**
 * Main Application Orchestrator
 * Bootstraps studio UI, routing, event binding, templates, and live preview.
 */

import { storage } from './storage.js';
import { state } from './state.js';
import { Router } from './router.js';
import { ConfigManager } from './config-manager.js';
import { ConfigValidator } from './validation.js';
import { TEMPLATES } from '../../data/templates/templates-data.js';
import { ChatbotRuntime } from '../../chatbot/runtime.js';
import { ChatbotRenderer } from '../../chatbot/renderer.js';

class StudioApp {
  constructor() {
    this.router = null;
    this.previewAdapter = null;
    this.previewRuntime = null;
    this.previewRenderer = null;
  }

  async init() {
    await storage.init();
    await this.handlePayPalReturn();
    const existing = await storage.getAllChatbots();

    // Seed with a default chatbot if empty
    if (!existing || existing.length === 0) {
      const defaultBot = ConfigManager.createDefault('customer_support', 'Nova Support Pro');
      defaultBot.status = 'published';
      await storage.saveChatbot(defaultBot);
      state.setChatbots([defaultBot]);
    } else {
      state.setChatbots(existing);
    }

    this.setupRouter();
    this.setupGlobalEvents();
  }

  async handlePayPalReturn() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') !== 'success') return;

    const orderId = params.get('token');
    if (!orderId || !storage.authToken) return;

    try {
      const response = await fetch(`${storage.apiBase}/api/subscription/capture`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${storage.authToken}`
        },
        body: JSON.stringify({ order_id: orderId })
      });
      const data = await response.json();
      if (!response.ok) {
        this.showToast(data.error || 'PayPal payment could not be completed.', 'error');
        return;
      }

      window.history.replaceState({}, document.title, window.location.pathname);
      this.showToast(data.message || 'Payment confirmed via PayPal!', 'success');
    } catch (error) {
      this.showToast(`Payment confirmation error: ${error.message}`, 'error');
    }
  }

  setupRouter() {
    this.router = new Router({
      '/': () => this.renderDashboard(),
      '/chatbots': () => this.renderMyChatbots(),
      '/create': () => this.renderCreateWizard(),
      '/builder': (params) => this.renderBuilder(params.get('id')),
      '/integrations': () => this.renderIntegrations(),
      '/analytics': () => this.renderAnalytics(),
      '/docs': () => this.renderDocs()
    });
    this.router.init();
  }

  setActiveNav(route) {
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.getAttribute('href') === `#${route}`);
    });
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 3500);
  }

  /* ------------------- DASHBOARD VIEW ------------------- */
  renderDashboard() {
    this.setActiveNav('/');
    const title = document.getElementById('pageTitle');
    if (title) title.textContent = 'Platform Overview';

    const bots = state.chatbots;
    const published = bots.filter(b => b.status === 'published').length;
    const drafts = bots.filter(b => b.status === 'draft').length;

    const content = document.getElementById('appContent');
    content.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-label">Total Chatbots</span>
          <span class="stat-value">${bots.length}</span>
          <span class="stat-sub">Across all workspaces</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Published Live</span>
          <span class="stat-value">${published}</span>
          <span class="stat-sub">Active & embeddable</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Draft Assistants</span>
          <span class="stat-value">${drafts}</span>
          <span class="stat-sub">In configuration</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Production Templates</span>
          <span class="stat-value">${TEMPLATES.length}</span>
          <span class="stat-sub">Ready to deploy</span>
        </div>
      </div>

      <div class="dashboard-section">
        <div class="section-header">
          <h2 class="section-title">Quick Actions</h2>
        </div>
        <div style="display: flex; gap: 12px; flex-wrap: wrap;">
          <a href="#/create" class="btn btn-primary">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
            Create New Assistant
          </a>
          <button class="btn btn-secondary" id="btnImportJson">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z"/></svg>
            Import Configuration JSON
          </button>
          <input type="file" id="fileImportInput" accept=".json" style="display: none;" />
        </div>
      </div>

      <div class="dashboard-section">
        <div class="section-header">
          <h2 class="section-title">Recent Chatbots</h2>
          <a href="#/chatbots" class="btn btn-secondary" style="font-size: 12px; padding: 4px 10px;">View All</a>
        </div>
        <div class="bots-grid">
          ${bots.slice(0, 3).map(b => this.renderBotCardHtml(b)).join('')}
        </div>
      </div>
    `;

    this.bindImportJson();
    this.bindBotCardActions();
  }

  /* ------------------- MY CHATBOTS VIEW ------------------- */
  renderMyChatbots() {
    this.setActiveNav('/chatbots');
    const title = document.getElementById('pageTitle');
    if (title) title.textContent = 'My Chatbots';

    const bots = state.chatbots;
    const content = document.getElementById('appContent');

    content.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
        <input type="text" id="searchBots" class="form-input" placeholder="Search chatbots by name or business..." style="max-width: 320px;" />
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-secondary" id="btnImportJson">Import JSON</button>
          <a href="#/create" class="btn btn-primary">+ New Chatbot</a>
        </div>
      </div>
      <input type="file" id="fileImportInput" accept=".json" style="display: none;" />

      ${bots.length === 0 ? `
        <div class="empty-state">
          <svg class="empty-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
          <h3 class="empty-title">No chatbots created yet</h3>
          <p class="empty-desc">Create your first custom support chatbot or begin with one of our specialized industry templates.</p>
          <a href="#/create" class="btn btn-primary">Create Your First Chatbot</a>
        </div>
      ` : `
        <div class="bots-grid" id="botsGridContainer">
          ${bots.map(b => this.renderBotCardHtml(b)).join('')}
        </div>
      `}
    `;

    this.bindImportJson();
    this.bindBotCardActions();

    const searchInput = document.getElementById('searchBots');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const filtered = state.chatbots.filter(b =>
          b.name.toLowerCase().includes(query) ||
          (b.identity && b.identity.businessName && b.identity.businessName.toLowerCase().includes(query))
        );
        const container = document.getElementById('botsGridContainer');
        if (container) {
          container.innerHTML = filtered.map(b => this.renderBotCardHtml(b)).join('');
          this.bindBotCardActions();
        }
      });
    }
  }

  renderBotCardHtml(bot) {
    const isPub = bot.status === 'published';
    const initial = (bot.name || 'B').charAt(0).toUpperCase();

    return `
      <div class="bot-card" data-id="${bot.id}">
        <div class="bot-header">
          <div class="bot-title-group">
            <div class="bot-avatar-badge">${initial}</div>
            <div>
              <h3 class="bot-name">${ConfigValidator.escapeHtml(bot.name)}</h3>
              <p class="bot-business">${ConfigValidator.escapeHtml((bot.identity && bot.identity.businessName) || 'Independent')}</p>
            </div>
          </div>
          <span class="badge ${isPub ? 'badge-published' : 'badge-draft'}">${bot.status}</span>
        </div>

        <div class="bot-meta">
          <span>v${bot.version || 1}</span>
          <span>•</span>
          <span>${(bot.knowledgeBase && bot.knowledgeBase.length) || 0} FAQs</span>
          <span>•</span>
          <span>${(bot.conversationFlows && bot.conversationFlows.length) || 0} Flows</span>
        </div>

        <div class="bot-actions">
          <a href="#/builder?id=${bot.id}" class="btn btn-secondary" style="font-size: 12px; padding: 4px 10px;">Edit & Test</a>
          <button class="btn btn-secondary btn-duplicate" data-id="${bot.id}" style="font-size: 12px; padding: 4px 10px;" title="Duplicate">Clone</button>
          <button class="btn btn-secondary btn-export" data-id="${bot.id}" style="font-size: 12px; padding: 4px 10px;" title="Export JSON">Export</button>
          <button class="btn btn-danger btn-delete" data-id="${bot.id}" style="font-size: 12px; padding: 4px 8px; margin-left: auto;" title="Delete">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
          </button>
        </div>
      </div>
    `;
  }

  bindBotCardActions() {
    document.querySelectorAll('.btn-duplicate').forEach(btn => {
      btn.onclick = async (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const target = await storage.getChatbot(id);
        if (target) {
          const cloned = ConfigManager.clone(target);
          await storage.saveChatbot(cloned);
          const all = await storage.getAllChatbots();
          state.setChatbots(all);
          this.showToast(`Duplicated into "${cloned.name}"`, 'success');
          this.router.handleRoute();
        }
      };
    });

    document.querySelectorAll('.btn-export').forEach(btn => {
      btn.onclick = async (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const target = await storage.getChatbot(id);
        if (target) {
          const blob = new Blob([JSON.stringify(target, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${target.id}-config.json`;
          a.click();
          URL.revokeObjectURL(url);
          this.showToast('Configuration exported.', 'info');
        }
      };
    });

    document.querySelectorAll('.btn-delete').forEach(btn => {
      btn.onclick = async (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        if (confirm('Are you sure you want to delete this chatbot? This action cannot be undone.')) {
          await storage.deleteChatbot(id);
          const all = await storage.getAllChatbots();
          state.setChatbots(all);
          this.showToast('Chatbot deleted.', 'info');
          this.router.handleRoute();
        }
      };
    });
  }

  bindImportJson() {
    const btn = document.getElementById('btnImportJson');
    const input = document.getElementById('fileImportInput');
    if (!btn || !input) return;

    btn.onclick = () => input.click();
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        const validation = ConfigValidator.validate(parsed);

        if (!validation.valid) {
          alert(`Invalid configuration file:\n\n${validation.errors.join('\n')}`);
          return;
        }

        // Generate unique ID to prevent accidental collision
        parsed.id = `bot_${Date.now().toString(36)}`;
        parsed.name = `${parsed.name} (Imported)`;
        await storage.saveChatbot(parsed);

        const all = await storage.getAllChatbots();
        state.setChatbots(all);
        this.showToast(`Successfully imported "${parsed.name}"`, 'success');
        this.router.navigate(`/builder?id=${parsed.id}`);
      } catch (err) {
        alert(`Failed to parse JSON file: ${err.message}`);
      }
    };
  }

  /* ------------------- CREATE WIZARD ------------------- */
  renderCreateWizard() {
    this.setActiveNav('/create');
    const title = document.getElementById('pageTitle');
    if (title) title.textContent = 'Create New Chatbot';

    const content = document.getElementById('appContent');
    content.innerHTML = `
      <div style="max-width: 960px; margin: 0 auto;">
        <div style="margin-bottom: 24px;">
          <h2 style="font-size: 20px; font-weight: 700; color: var(--slate-900);">Choose a Starting Point</h2>
          <p style="font-size: 14px; color: var(--slate-500);">Start with a specialized industry template or build completely from scratch.</p>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px;">
          <div class="card" style="cursor: pointer; border: 2px dashed var(--slate-300); display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 32px;" id="startBlank">
            <div style="width: 48px; height: 48px; border-radius: 50%; background: var(--slate-100); display: flex; align-items: center; justify-content: center; margin-bottom: 12px;">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
            </div>
            <h3 style="font-size: 16px; font-weight: 600;">Start Blank</h3>
            <p style="font-size: 12.5px; color: var(--slate-500); margin-top: 4px;">Clean configuration canvas with standard defaults.</p>
          </div>

          ${TEMPLATES.map(t => `
            <div class="card template-card" data-template-id="${t.id}" style="cursor: pointer; display: flex; flex-direction: column; gap: 10px; transition: transform 0.15s, border-color 0.15s;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span class="badge" style="background: var(--primary-light); color: var(--primary);">${t.badge}</span>
                <span style="font-size: 11px; color: var(--slate-400);">${t.category}</span>
              </div>
              <h3 style="font-size: 15px; font-weight: 600; color: var(--slate-900);">${t.name}</h3>
              <p style="font-size: 12.5px; color: var(--slate-600); line-height: 1.4;">${t.description}</p>
              <button class="btn btn-secondary" style="margin-top: auto; font-size: 12px; width: 100%; justify-content: center;">Use Template</button>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    document.getElementById('startBlank').onclick = async () => {
      const bot = ConfigManager.createDefault('blank', 'Custom Assistant');
      await storage.saveChatbot(bot);
      const all = await storage.getAllChatbots();
      state.setChatbots(all);
      this.showToast('Created blank chatbot.', 'success');
      this.router.navigate(`/builder?id=${bot.id}`);
    };

    document.querySelectorAll('.template-card').forEach(card => {
      card.onclick = async (e) => {
        const tmplId = e.currentTarget.getAttribute('data-template-id');
        const tmpl = TEMPLATES.find(t => t.id === tmplId);
        if (!tmpl) return;

        const bot = ConfigManager.createDefault(tmplId, tmpl.name);
        Object.assign(bot.identity, tmpl.config.identity || {});
        Object.assign(bot.appearance, tmpl.config.appearance || {});
        Object.assign(bot.welcomeExperience, tmpl.config.welcomeExperience || {});
        if (tmpl.config.knowledgeBase) bot.knowledgeBase = tmpl.config.knowledgeBase;

        await storage.saveChatbot(bot);
        const all = await storage.getAllChatbots();
        state.setChatbots(all);
        this.showToast(`Created assistant from template: ${tmpl.name}`, 'success');
        this.router.navigate(`/builder?id=${bot.id}`);
      };
    });
  }

  /* ------------------- BUILDER STUDIO ------------------- */
  async renderBuilder(botId) {
    this.setActiveNav('/chatbots');
    let bot = state.chatbots.find(b => b.id === botId);
    if (!bot && botId) {
      bot = await storage.getChatbot(botId);
    }
    if (!bot) {
      this.showToast('Chatbot not found, redirecting...', 'error');
      this.router.navigate('/chatbots');
      return;
    }

    state.setCurrentChatbot(bot);

    const title = document.getElementById('pageTitle');
    if (title) title.textContent = `Studio: ${bot.name}`;

    const content = document.getElementById('appContent');
    content.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
        <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
          <a href="#/chatbots" class="btn btn-secondary" style="font-size: 12px; padding: 4px 10px;">← Back</a>
          <span style="font-size: 12px; color: var(--slate-500); word-break: break-all;">ID: <code>${bot.id}</code></span>
        </div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button class="btn btn-secondary" id="btnSaveDraft">Save Draft</button>
          <button class="btn btn-primary" id="btnPublish">Publish Chatbot</button>
        </div>
      </div>

      <div class="builder-layout">
        <!-- Main Configuration Workspace -->
        <div class="builder-main">
          <div class="builder-tabs">
            <button class="tab-btn active" data-tab="tab-identity">Identity & Tone</button>
            <button class="tab-btn" data-tab="tab-appearance">Appearance</button>
            <button class="tab-btn" data-tab="tab-welcome">Welcome & Greeting</button>
            <button class="tab-btn" data-tab="tab-kb">Knowledge Base</button>
            <button class="tab-btn" data-tab="tab-flows">Workflows</button>
            <button class="tab-btn" data-tab="tab-rules">Business Rules</button>
            <button class="tab-btn" data-tab="tab-handoff">Human Handoff</button>
            <button class="tab-btn" data-tab="tab-publish">Publish & Embed</button>
          </div>

          <!-- TAB 1: Identity -->
          <div class="builder-panel active" id="tab-identity">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Assistant Name</label>
                <input type="text" id="cfg_assistantName" class="form-input" value="${ConfigValidator.escapeHtml(bot.identity.assistantName || '')}" />
              </div>
              <div class="form-group">
                <label class="form-label">Business Name</label>
                <input type="text" id="cfg_businessName" class="form-input" value="${ConfigValidator.escapeHtml(bot.identity.businessName || '')}" />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Role Description</label>
                <input type="text" id="cfg_role" class="form-input" value="${ConfigValidator.escapeHtml(bot.identity.role || '')}" />
              </div>
              <div class="form-group">
                <label class="form-label">Personality</label>
                <select id="cfg_personality" class="form-select">
                  <option value="friendly" ${bot.identity.personality === 'friendly' ? 'selected' : ''}>Friendly</option>
                  <option value="professional" ${bot.identity.personality === 'professional' ? 'selected' : ''}>Professional</option>
                  <option value="conversational" ${bot.identity.personality === 'conversational' ? 'selected' : ''}>Conversational</option>
                  <option value="technical" ${bot.identity.personality === 'technical' ? 'selected' : ''}>Technical</option>
                  <option value="casual" ${bot.identity.personality === 'casual' ? 'selected' : ''}>Casual</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Fallback Message (when no FAQ matches)</label>
              <textarea id="cfg_fallbackMessage" class="form-textarea" rows="2">${ConfigValidator.escapeHtml(bot.identity.fallbackMessage || '')}</textarea>
            </div>

            <div class="form-group">
              <label class="form-label">Human Support Handoff Message</label>
              <textarea id="cfg_handoffMessage" class="form-textarea" rows="2">${ConfigValidator.escapeHtml(bot.identity.handoffMessage || '')}</textarea>
            </div>
          </div>

          <!-- TAB 2: Appearance -->
          <div class="builder-panel" id="tab-appearance">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Primary Brand Color</label>
                <div style="display: flex; gap: 8px;">
                  <input type="color" id="cfg_primaryColor_picker" value="${bot.appearance.primaryColor || '#2563eb'}" style="width: 44px; height: 38px; border: none; cursor: pointer;" />
                  <input type="text" id="cfg_primaryColor" class="form-input" value="${bot.appearance.primaryColor || '#2563eb'}" />
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Widget Position</label>
                <select id="cfg_position" class="form-select">
                  <option value="bottom-right" ${bot.appearance.position === 'bottom-right' ? 'selected' : ''}>Bottom Right</option>
                  <option value="bottom-left" ${bot.appearance.position === 'bottom-left' ? 'selected' : ''}>Bottom Left</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Theme Mode</label>
                <select id="cfg_theme" class="form-select">
                  <option value="light" ${bot.appearance.theme === 'light' ? 'selected' : ''}>Light</option>
                  <option value="dark" ${bot.appearance.theme === 'dark' ? 'selected' : ''}>Dark</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Launcher Button Label</label>
                <input type="text" id="cfg_launcherText" class="form-input" value="${ConfigValidator.escapeHtml(bot.appearance.launcherText || 'Chat')}" />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Custom CSS Overrides (Scoped)</label>
              <textarea id="cfg_customCss" class="form-textarea" rows="3" placeholder=".msg-bubble { font-size: 14px; }">${ConfigValidator.escapeHtml(bot.appearance.customCss || '')}</textarea>
            </div>
          </div>

          <!-- TAB 3: Welcome Experience -->
          <div class="builder-panel" id="tab-welcome">
            <div class="form-group">
              <label class="form-label">Welcome Greeting Message</label>
              <textarea id="cfg_greeting" class="form-textarea" rows="2">${ConfigValidator.escapeHtml(bot.welcomeExperience.greeting || '')}</textarea>
            </div>

            <div class="form-group">
              <label class="form-label">Conversation Starters (One per line)</label>
              <textarea id="cfg_conversationStarters" class="form-textarea" rows="4">${(bot.welcomeExperience.conversationStarters || []).join('\n')}</textarea>
              <p class="form-help">Interactive quick-reply chips shown upon initial connection.</p>
            </div>
          </div>

          <!-- TAB 4: Knowledge Base -->
          <div class="builder-panel" id="tab-kb">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
              <h3 style="font-size: 15px; font-weight: 600;">Configured FAQs (${(bot.knowledgeBase || []).length})</h3>
              <div style="display: flex; gap: 8px;">
                <button class="btn btn-secondary" id="btnExportCsv" style="font-size: 12px;">Export CSV</button>
                <button class="btn btn-primary" id="btnAddFaq" style="font-size: 12px;">+ Add Question</button>
              </div>
            </div>

            <div id="kbListContainer">
              ${(bot.knowledgeBase || []).map((faq, i) => `
                <div class="kb-item-card" data-idx="${i}">
                  <div class="kb-item-header">
                    <span class="kb-question">${ConfigValidator.escapeHtml(faq.question)}</span>
                    <button class="btn btn-danger btn-remove-faq" data-idx="${i}" style="font-size: 11px; padding: 2px 6px;">Delete</button>
                  </div>
                  <div class="kb-answer">${ConfigValidator.escapeHtml(faq.answer)}</div>
                  <div class="kb-keywords">
                    <span class="kb-tag">${ConfigValidator.escapeHtml(faq.category || 'General')}</span>
                    ${(faq.keywords || []).map(k => `<span class="kb-tag">${ConfigValidator.escapeHtml(k)}</span>`).join('')}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- TAB 5: Flows -->
          <div class="builder-panel" id="tab-flows">
            <div style="margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <h3 style="font-size: 15px; font-weight: 600;">Conversational Workflows</h3>
                <p style="font-size: 12.5px; color: var(--slate-500);">Interactive multi-step branches for ticket collection, scheduling, or surveys.</p>
              </div>
            </div>

            <div id="flowsContainer">
              ${(bot.conversationFlows || []).map((flow, idx) => `
                <div class="card" style="margin-bottom: 16px; background: var(--slate-50);">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <h4 style="font-size: 14px; font-weight: 600;">Flow: ${ConfigValidator.escapeHtml(flow.title)}</h4>
                    <span class="badge" style="background: var(--slate-200); color: var(--slate-700);">Trigger: ${flow.trigger ? flow.trigger.value : 'none'}</span>
                  </div>
                  <div style="font-size: 12.5px; color: var(--slate-600);">
                    Steps (${flow.steps ? flow.steps.length : 0}):
                    <ul style="padding-left: 20px; margin-top: 6px;">
                      ${(flow.steps || []).map(s => `<li><code>${s.id}</code> [${s.type}]: ${ConfigValidator.escapeHtml(s.text || '')}</li>`).join('')}
                    </ul>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- TAB 6: Business Rules -->
          <div class="builder-panel" id="tab-rules">
            <div class="form-group">
              <label class="form-label">Deterministic Confidence Threshold (${bot.businessRules.confidenceThreshold || 0.35})</label>
              <input type="range" id="cfg_confidenceThreshold" min="0.1" max="0.9" step="0.05" value="${bot.businessRules.confidenceThreshold || 0.35}" style="width: 100%;" />
              <p class="form-help">Questions matching with confidence below this threshold trigger fallback or human handoff.</p>
            </div>

            <div class="form-group">
              <label style="display: flex; align-items: center; gap: 8px; font-size: 13.5px; font-weight: 600; cursor: pointer;">
                <input type="checkbox" id="cfg_hoursEnabled" ${bot.businessRules.operatingHours && bot.businessRules.operatingHours.enabled ? 'checked' : ''} />
                Enforce Operating Hours
              </label>
            </div>

            <div class="form-group">
              <label class="form-label">After-Hours Response Message</label>
              <textarea id="cfg_afterHoursMessage" class="form-textarea" rows="2">${ConfigValidator.escapeHtml((bot.businessRules.operatingHours && bot.businessRules.operatingHours.afterHoursMessage) || '')}</textarea>
            </div>
          </div>

          <!-- TAB 7: Human Handoff -->
          <div class="builder-panel" id="tab-handoff">
            <div class="form-group">
              <label style="display: flex; align-items: center; gap: 8px; font-size: 13.5px; font-weight: 600; cursor: pointer;">
                <input type="checkbox" id="cfg_handoffEnabled" ${bot.humanHandoff && bot.humanHandoff.enabled ? 'checked' : ''} />
                Enable Human Support Escalation
              </label>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Escalation Mode</label>
                <select id="cfg_handoffMode" class="form-select">
                  <option value="email" ${bot.humanHandoff && bot.humanHandoff.mode === 'email' ? 'selected' : ''}>Email Notification</option>
                  <option value="external_url" ${bot.humanHandoff && bot.humanHandoff.mode === 'external_url' ? 'selected' : ''}>External Support URL</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Destination Email / URL</label>
                <input type="text" id="cfg_destinationEmail" class="form-input" value="${ConfigValidator.escapeHtml(bot.humanHandoff ? (bot.humanHandoff.destinationEmail || bot.humanHandoff.supportUrl || '') : '')}" />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Auto-Escalation Keywords (comma-separated)</label>
              <input type="text" id="cfg_autoEscalateKeywords" class="form-input" value="${(bot.humanHandoff && bot.humanHandoff.autoEscalateKeywords ? bot.humanHandoff.autoEscalateKeywords.join(', ') : 'agent, human, representative')}" />
            </div>
          </div>

          <!-- TAB 8: Publish & Embed -->
          <div class="builder-panel" id="tab-publish">
            <h3 style="font-size: 15px; font-weight: 600; margin-bottom: 6px;">Website Installation Snippets</h3>
            <p style="font-size: 13px; color: var(--slate-600); margin-bottom: 16px;">Choose between the self-contained embed (guaranteed to work instantly on any external site without a database) or hosted URL embed.</p>

            <!-- Option A: Self-Contained Instant Embed -->
            <div style="background: var(--surface); border: 1px solid var(--border-color); border-radius: 8px; padding: 14px; margin-bottom: 16px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <h4 style="font-size: 13.5px; font-weight: 600; color: var(--primary);">Option 1: Universal Zero-Dependency Embed (Recommended)</h4>
                <span class="badge badge-published" style="font-size: 11px;">Instant Display</span>
              </div>
              <p style="font-size: 12.5px; color: var(--slate-600); margin-bottom: 10px;">Includes your assistant's customized responses directly in the script tag. Guaranteed to display on WordPress, Shopify, Webflow, GitHub Pages, or any HTML page with zero setup.</p>
              <div class="code-box" id="codebox-opt1">
                <button type="button" class="btn-copy-code" data-target="code-opt1" aria-label="Copy Universal Embed Code">
                  <svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
                  <span>Copy Code</span>
                </button>
                <pre id="code-opt1">&lt;!-- Universal Zero-Framework Custom Chatbot Embed --&gt;
&lt;script
  src="${window.location.origin}/chatbot/loader.js"
  data-chatbot-id="${bot.id}"
  data-chatbot-data="${encodeURIComponent(JSON.stringify(bot))}"
  async
&gt;&lt;/script&gt;</pre>
              </div>
            </div>

            <!-- Option B: Hosted / Dynamic URL Embed -->
            <div style="background: var(--surface); border: 1px solid var(--border-color); border-radius: 8px; padding: 14px; margin-bottom: 16px;">
              <h4 style="font-size: 13.5px; font-weight: 600; margin-bottom: 8px;">Option 2: Cloud / Dynamic Config Loader</h4>
              <p style="font-size: 12.5px; color: var(--slate-600); margin-bottom: 10px;">Loads configuration dynamically from your origin server or template repository.</p>
              <div class="code-box" id="codebox-opt2">
                <button type="button" class="btn-copy-code" data-target="code-opt2" aria-label="Copy Cloud Loader Code">
                  <svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
                  <span>Copy Code</span>
                </button>
                <pre id="code-opt2">&lt;!-- Dynamic Chatbot Loader --&gt;
&lt;script
  src="${window.location.origin}/chatbot/loader.js"
  data-chatbot-id="${bot.id}"
  async
&gt;&lt;/script&gt;</pre>
              </div>
            </div>

            <div style="margin-top: 16px;">
              <h4 style="font-size: 13.5px; font-weight: 600; margin-bottom: 6px;">Domain Security Controls</h4>
              <div class="form-group">
                <label class="form-label">Allowed Hostname Domains (comma-separated, * for all)</label>
                <input type="text" id="cfg_allowedDomains" class="form-input" value="${(bot.integrations && bot.integrations.website && bot.integrations.website.allowedDomains ? bot.integrations.website.allowedDomains.join(', ') : '*')}" />
              </div>
            </div>

            <div style="margin-top: 20px; display: flex; gap: 10px; align-items: center;">
              <a href="demo/index.html" target="_blank" class="btn btn-secondary" style="text-decoration: none;">Launch External Website Demo</a>
            </div>
          </div>
        </div>

        <!-- Live Interactive Side Preview -->
        <div class="builder-preview">
          <div class="preview-header">
            <div class="preview-title">
              <span class="preview-status-dot"></span>
              Live Assistant Preview
            </div>
            <button class="btn btn-secondary" id="btnRestartPreview" style="font-size: 11px; padding: 2px 8px;">Restart</button>
          </div>
          <div class="preview-container" id="previewContainer"></div>
        </div>
      </div>
    `;

    this.bindBuilderEvents(bot);
    this.initLivePreview(bot);
  }

  bindBuilderEvents(bot) {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.builder-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        const tabId = btn.getAttribute('data-tab');
        const panel = document.getElementById(tabId);
        if (panel) panel.classList.add('active');
      };
    });

    // Copy Code snippet buttons
    document.querySelectorAll('.btn-copy-code').forEach(btn => {
      btn.onclick = async () => {
        const targetId = btn.getAttribute('data-target');
        const targetEl = document.getElementById(targetId);
        if (!targetEl) return;

        const codeToCopy = targetEl.innerText || targetEl.textContent;
        let copied = false;
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(codeToCopy);
            copied = true;
          }
        } catch (e) {
          // fallback
        }

        if (!copied) {
          try {
            const ta = document.createElement('textarea');
            ta.value = codeToCopy;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.focus();
            ta.select();
            copied = document.execCommand('copy');
            document.body.removeChild(ta);
          } catch (e) {
            console.warn('Fallback copy failed:', e);
          }
        }

        const originalText = btn.innerHTML;
        btn.classList.add('copied');
        btn.innerHTML = `
          <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
          <span>✓ Copied!</span>
        `;
        setTimeout(() => {
          btn.classList.remove('copied');
          btn.innerHTML = originalText;
        }, 2000);
      };
    });

    // Color sync
    const picker = document.getElementById('cfg_primaryColor_picker');
    const input = document.getElementById('cfg_primaryColor');
    if (picker && input) {
      picker.oninput = (e) => {
        input.value = e.target.value;
        this.syncConfigFromInputs(bot);
      };
      input.oninput = (e) => {
        picker.value = e.target.value;
        this.syncConfigFromInputs(bot);
      };
    }

    // Input listeners for real-time live preview update
    const formFields = [
      'cfg_assistantName', 'cfg_businessName', 'cfg_role', 'cfg_personality',
      'cfg_fallbackMessage', 'cfg_handoffMessage', 'cfg_position', 'cfg_theme',
      'cfg_launcherText', 'cfg_customCss', 'cfg_greeting', 'cfg_conversationStarters'
    ];
    formFields.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', () => this.syncConfigFromInputs(bot));
      }
    });

    // Knowledge Base Remove buttons
    document.querySelectorAll('.btn-remove-faq').forEach(btn => {
      btn.onclick = (e) => {
        const idx = parseInt(e.currentTarget.getAttribute('data-idx'), 10);
        bot.knowledgeBase.splice(idx, 1);
        this.renderBuilder(bot.id);
      };
    });

    // Add FAQ button
    const btnAddFaq = document.getElementById('btnAddFaq');
    if (btnAddFaq) {
      btnAddFaq.onclick = () => {
        const q = prompt('Enter the FAQ Question:');
        if (!q) return;
        const a = prompt('Enter the FAQ Answer:');
        if (!a) return;
        const kw = prompt('Enter keywords (comma-separated):', '') || '';

        bot.knowledgeBase.push({
          id: `faq_${Date.now().toString(36)}`,
          question: q,
          answer: a,
          category: 'General',
          keywords: kw.split(',').map(s => s.trim()).filter(Boolean),
          priority: 5
        });

        this.renderBuilder(bot.id);
        this.showToast('Question added to Knowledge Base.', 'success');
      };
    }

    // Export CSV
    const btnCsv = document.getElementById('btnExportCsv');
    if (btnCsv) {
      btnCsv.onclick = () => {
        const csv = ConfigManager.exportKbToCsv(bot.knowledgeBase || []);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${bot.id}-knowledge-base.csv`;
        a.click();
        URL.revokeObjectURL(url);
      };
    }

    // Save Draft
    const btnSave = document.getElementById('btnSaveDraft');
    if (btnSave) {
      btnSave.onclick = async () => {
        this.syncConfigFromInputs(bot);
        bot.status = 'draft';
        await storage.saveChatbot(bot);
        this.showToast('Chatbot draft saved successfully.', 'success');
      };
    }

    // Publish
    const btnPublish = document.getElementById('btnPublish');
    if (btnPublish) {
      btnPublish.onclick = async () => {
        this.syncConfigFromInputs(bot);
        const validation = ConfigValidator.validate(bot);
        if (!validation.valid) {
          alert(`Cannot publish: configuration contains errors:\n\n${validation.errors.join('\n')}`);
          return;
        }

        bot.status = 'published';
        bot.version = (bot.version || 1) + 1;
        await storage.saveChatbot(bot);
        this.showToast(`Published v${bot.version} successfully!`, 'success');
        this.renderBuilder(bot.id);
      };
    }
  }

  syncConfigFromInputs(bot) {
    const getValue = id => {
      const el = document.getElementById(id);
      return el ? el.value : '';
    };

    bot.identity.assistantName = getValue('cfg_assistantName') || bot.identity.assistantName;
    bot.identity.businessName = getValue('cfg_businessName') || bot.identity.businessName;
    bot.identity.role = getValue('cfg_role') || bot.identity.role;
    bot.identity.personality = getValue('cfg_personality') || bot.identity.personality;
    bot.identity.fallbackMessage = getValue('cfg_fallbackMessage') || bot.identity.fallbackMessage;
    bot.identity.handoffMessage = getValue('cfg_handoffMessage') || bot.identity.handoffMessage;

    bot.appearance.primaryColor = getValue('cfg_primaryColor') || bot.appearance.primaryColor;
    bot.appearance.position = getValue('cfg_position') || bot.appearance.position;
    bot.appearance.theme = getValue('cfg_theme') || bot.appearance.theme;
    bot.appearance.launcherText = getValue('cfg_launcherText') || bot.appearance.launcherText;
    bot.appearance.customCss = getValue('cfg_customCss') || '';

    bot.welcomeExperience.greeting = getValue('cfg_greeting') || bot.welcomeExperience.greeting;
    const startersText = getValue('cfg_conversationStarters');
    if (startersText) {
      bot.welcomeExperience.conversationStarters = startersText.split('\n').map(s => s.trim()).filter(Boolean);
    }

    if (this.previewRenderer) {
      this.previewRenderer.updateConfig(bot);
    }
  }

  initLivePreview(bot) {
    const container = document.getElementById('previewContainer');
    if (!container) return;

    container.innerHTML = '';
    const widgetHost = document.createElement('div');
    widgetHost.id = 'preview-widget-host';
    container.appendChild(widgetHost);

    this.previewRuntime = new ChatbotRuntime(bot, {
      onHandoff: (h) => {
        this.showToast(`Human handoff triggered: ${h.reason}`, 'info');
      }
    });

    this.previewRenderer = new ChatbotRenderer(widgetHost, bot, {
      onOpen: () => {
        if (this.previewRuntime.state.messages.length === 0) {
          const init = this.previewRuntime.initializeSession();
          if (init && init.message) {
            this.previewRenderer.appendMessage('bot', init.message.text, init.starters || []);
          }
        }
      },
      onSendMessage: async (text) => {
        this.previewRenderer.appendMessage('user', text);
        const res = await this.previewRuntime.processMessage(text);
        if (res && res.message) {
          this.previewRenderer.appendMessage('bot', res.message.text, res.options || []);
        }
      },
      onReset: () => {
        this.previewRenderer.clearMessages();
        const init = this.previewRuntime.resetSession();
        if (init && init.message) {
          this.previewRenderer.appendMessage('bot', init.message.text, init.starters || []);
        }
      }
    });

    // Auto-open preview
    this.previewRenderer.isOpen = true;
    this.previewRenderer.render();
    const init = this.previewRuntime.initializeSession();
    if (init && init.message) {
      this.previewRenderer.appendMessage('bot', init.message.text, init.starters || []);
    }

    const btnRestart = document.getElementById('btnRestartPreview');
    if (btnRestart) {
      btnRestart.onclick = () => {
        this.initLivePreview(bot);
      };
    }
  }

  /* ------------------- INTEGRATIONS VIEW ------------------- */
  renderIntegrations() {
    this.setActiveNav('/integrations');
    const title = document.getElementById('pageTitle');
    if (title) title.textContent = 'Channel Integration Center';

    const content = document.getElementById('appContent');
    content.innerHTML = `
      <div style="max-width: 900px;">
        <p style="font-size: 14px; color: var(--slate-600); margin-bottom: 24px;">
          Deploy your chatbots across communication channels. Note: Website chat is natively supported in-browser. WhatsApp and Telegram require an isolated serverless integration bridge to protect API credentials.
        </p>

        <div style="display: flex; flex-direction: column; gap: 20px;">
          <!-- 1. Website Chat -->
          <div class="card" style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
                <h3 style="font-size: 16px; font-weight: 600;">Website Embedded Widget</h3>
                <span class="badge badge-published">Operational</span>
              </div>
              <p style="font-size: 13px; color: var(--slate-600); max-width: 580px;">
                Embeddable zero-framework async script tag with isolated Shadow DOM styling. Works seamlessly on HTML, WordPress, Shopify, and static websites.
              </p>
            </div>
            <a href="#/chatbots" class="btn btn-secondary" style="font-size: 12px;">Manage Embeds</a>
          </div>

          <!-- 2. WhatsApp Cloud API -->
          <div class="card" style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
                <h3 style="font-size: 16px; font-weight: 600;">WhatsApp Business Cloud API</h3>
                <span class="badge badge-draft">Serverless Bridge Required</span>
              </div>
              <p style="font-size: 13px; color: var(--slate-600); max-width: 580px;">
                Connect to Meta Cloud API. Webhooks are received and verified by <code>integrations/serverless/whatsapp-webhook.js</code> without exposing access tokens in client-side code.
              </p>
            </div>
            <a href="#/docs" class="btn btn-secondary" style="font-size: 12px;">Setup Guide</a>
          </div>

          <!-- 3. Telegram Bot API -->
          <div class="card" style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
                <h3 style="font-size: 16px; font-weight: 600;">Telegram Bot API</h3>
                <span class="badge badge-draft">Serverless Bridge Required</span>
              </div>
              <p style="font-size: 13px; color: var(--slate-600); max-width: 580px;">
                Deploy via Telegram bot tokens. Supports inline keyboard buttons and secure webhook secret-token validation via <code>integrations/serverless/telegram-webhook.js</code>.
              </p>
            </div>
            <a href="#/docs" class="btn btn-secondary" style="font-size: 12px;">Setup Guide</a>
          </div>

          <!-- 4. Generic Webhook -->
          <div class="card" style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
                <h3 style="font-size: 16px; font-weight: 600;">Generic Webhook Dispatcher</h3>
                <span class="badge badge-published">Operational</span>
              </div>
              <p style="font-size: 13px; color: var(--slate-600); max-width: 580px;">
                Forward message events, conversation transcripts, and lead capture payloads directly to external CRM or automation endpoints.
              </p>
            </div>
            <a href="#/docs" class="btn btn-secondary" style="font-size: 12px;">Documentation</a>
          </div>
        </div>
      </div>
    `;
  }

  /* ------------------- ANALYTICS / INBOX ------------------- */
  renderAnalytics() {
    this.setActiveNav('/analytics');
    const title = document.getElementById('pageTitle');
    if (title) title.textContent = 'Analytics & Conversation Log';

    const content = document.getElementById('appContent');
    content.innerHTML = `
      <div style="max-width: 900px;">
        <div class="stats-grid" style="margin-bottom: 24px;">
          <div class="stat-card">
            <span class="stat-label">Active Workspaces</span>
            <span class="stat-value">1</span>
            <span class="stat-sub">Local standalone mode</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Session Storage</span>
            <span class="stat-value">IndexedDB</span>
            <span class="stat-sub">Zero external DB dependency</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Privacy Mode</span>
            <span class="stat-value">Strict</span>
            <span class="stat-sub">Zero telemetry tracking</span>
          </div>
        </div>

        <div class="card">
          <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 8px;">Privacy & Analytics Policy</h3>
          <p style="font-size: 13.5px; color: var(--slate-600); line-height: 1.6;">
            In keeping with our zero-framework, privacy-first architecture, no customer messages or personal data are transmitted to external cloud analytics servers. All conversation logs and interactions are stored locally in the browser or within your self-hosted serverless bridge.
          </p>
        </div>
      </div>
    `;
  }

  /* ------------------- DOCUMENTATION VIEW ------------------- */
  renderDocs() {
    this.setActiveNav('/docs');
    const title = document.getElementById('pageTitle');
    if (title) title.textContent = 'Documentation Center';

    const content = document.getElementById('appContent');
    content.innerHTML = `
      <div style="max-width: 900px;">
        <div style="margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; background: var(--surface); padding: 16px 20px; border-radius: 8px; border: 1px solid var(--border-color);">
          <div>
            <h3 style="font-size: 15px; font-weight: 600; margin-bottom: 4px;">Universal Documentation Hub</h3>
            <p style="font-size: 13px; color: var(--slate-600);">Browse interactive HTML web guides designed for optimal readability, or view raw Markdown (.md) sources on GitHub.</p>
          </div>
          <a href="./docs/index.html" target="_blank" class="btn btn-primary" style="font-size: 12.5px;">Launch Docs Portal ↗</a>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 32px;">
          <div class="card">
            <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 8px;">Developer Technical Guide</h3>
            <p style="font-size: 13px; color: var(--slate-600); margin-bottom: 16px;">
              Complete technical specification covering system architecture, zero-framework philosophy, knowledge-base matching algorithms, and adapter interfaces.
            </p>
            <div style="display: flex; gap: 8px; align-items: center;">
              <a href="./docs/developer-guide.html" target="_blank" class="btn btn-primary" style="font-size: 12px;">Web Guide (HTML)</a>
              <a href="./docs/DEVELOPER-GUIDE.md" target="_blank" class="btn btn-secondary" style="font-size: 12px;">Raw Markdown</a>
            </div>
          </div>

          <div class="card">
            <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 8px;">Chatbot Owner Guide</h3>
            <p style="font-size: 13px; color: var(--slate-600); margin-bottom: 16px;">
              Step-by-step administrator handbook for creating, customizing, testing, publishing, and embedding support chatbots on your website.
            </p>
            <div style="display: flex; gap: 8px; align-items: center;">
              <a href="./docs/chatbot-owner-guide.html" target="_blank" class="btn btn-primary" style="font-size: 12px;">Web Guide (HTML)</a>
              <a href="./docs/CHATBOT-OWNER-GUIDE.md" target="_blank" class="btn btn-secondary" style="font-size: 12px;">Raw Markdown</a>
            </div>
          </div>
        </div>

        <div class="card">
          <h3 style="font-size: 15px; font-weight: 600; margin-bottom: 12px;">Technical References</h3>
          <ul style="padding-left: 20px; font-size: 13.5px; color: var(--slate-700); line-height: 2.2;">
            <li>
              <strong><a href="./docs/installation-guide.html" target="_blank">Website Installation & CMS Guide</a></strong> (HTML, WordPress, Shopify, GitHub Pages)
              <a href="./docs/INSTALLATION-GUIDE.md" target="_blank" style="margin-left: 8px; font-size: 12px; color: var(--slate-500);">[.md]</a>
            </li>
            <li>
              <strong><a href="./docs/integration-guide.html" target="_blank">Multi-Channel Integration Guide</a></strong> (WhatsApp Cloud API, Telegram Bot API, Webhooks)
              <a href="./docs/INTEGRATION-GUIDE.md" target="_blank" style="margin-left: 8px; font-size: 12px; color: var(--slate-500);">[.md]</a>
            </li>
            <li>
              <strong><a href="./docs/configuration-reference.html" target="_blank">Chatbot Configuration JSON Schema Reference</a></strong>
              <a href="./docs/CONFIGURATION-REFERENCE.md" target="_blank" style="margin-left: 8px; font-size: 12px; color: var(--slate-500);">[.md]</a>
            </li>
            <li>
              <strong><a href="./docs/api-reference.html" target="_blank">JavaScript API & Adapter Contract Reference</a></strong>
              <a href="./docs/API-REFERENCE.md" target="_blank" style="margin-left: 8px; font-size: 12px; color: var(--slate-500);">[.md]</a>
            </li>
            <li>
              <strong><a href="./docs/security-and-privacy.html" target="_blank">Security, Content Security Policy (CSP), & Privacy Policies</a></strong>
              <a href="./docs/SECURITY-AND-PRIVACY.md" target="_blank" style="margin-left: 8px; font-size: 12px; color: var(--slate-500);">[.md]</a>
            </li>
            <li>
              <strong><a href="./docs/troubleshooting.html" target="_blank">Troubleshooting & Diagnostics Guide</a></strong>
              <a href="./docs/TROUBLESHOOTING.md" target="_blank" style="margin-left: 8px; font-size: 12px; color: var(--slate-500);">[.md]</a>
            </li>
          </ul>
        </div>
      </div>
    `;
  }

  setupGlobalEvents() {
    this.setupBackendSwitcher();
  }

  setupBackendSwitcher() {
    const toggleBtn = document.getElementById('backendToggleBtn');
    const label = document.getElementById('backendModeLabel');
    const userSection = document.getElementById('userAccountSection');
    const authModal = document.getElementById('authModal');
    const closeAuthBtn = document.getElementById('closeAuthModalBtn');
    const authForm = document.getElementById('authForm');
    const authTabLogin = document.getElementById('authTabLogin');
    const authTabRegister = document.getElementById('authTabRegister');
    const authNameGroup = document.getElementById('authNameGroup');
    const authSubmitBtn = document.getElementById('authSubmitBtn');
    const authErrorMsg = document.getElementById('authErrorMsg');
    const membershipBtn = document.getElementById('membershipBtn');
    const membershipModal = document.getElementById('membershipModal');
    const closeMembershipBtn = document.getElementById('closeMembershipModalBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const billingToggleBtn = document.getElementById('billingCycleToggleBtn');
    const billingCycleText = document.getElementById('billingCycleText');

    let isRegisterMode = false;
    let billingCycle = 'monthly'; // 'monthly' or 'yearly'

    const updateUIState = async () => {
      if (storage.isCloudMode()) {
        label.textContent = '☁️ PHP Cloud SaaS';
        toggleBtn.classList.remove('btn-outline');
        toggleBtn.classList.add('btn-primary');
        userSection.style.display = 'flex';

        // Fetch user & membership profile
        try {
          const res = await fetch(`${storage.apiBase}/api/auth/me`, {
            headers: { 'Authorization': `Bearer ${storage.authToken}` }
          });
          if (res.ok) {
            const data = await res.json();
            const planBadge = document.getElementById('userPlanBadge');
            if (planBadge && data.membership) {
              const limitStr = data.bot_limit > 10000 ? 'Unlimited' : `${data.bot_count}/${data.bot_limit} Bots`;
              planBadge.textContent = `${data.membership.plan_name} (${limitStr})`;
            }
          } else {
            // Token expired or invalid
            storage.setCloudSession(null);
            updateUIState();
          }
        } catch (e) {
          console.warn('Backend offline or unreachable', e);
        }
      } else {
        label.textContent = '🖥️ Local Offline';
        toggleBtn.classList.remove('btn-primary');
        toggleBtn.classList.add('btn-outline');
        userSection.style.display = 'none';
      }
    };

    updateUIState();

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        if (storage.isCloudMode()) {
          // Switch back to local mode
          storage.setCloudSession(null);
          this.showToast('Switched to Local Offline mode.', 'info');
          updateUIState();
          this.refreshCurrentView();
        } else {
          // Open Auth modal for Cloud SaaS
          authModal.style.display = 'flex';
          authErrorMsg.style.display = 'none';
        }
      });
    }

    if (closeAuthBtn) {
      closeAuthBtn.addEventListener('click', () => {
        authModal.style.display = 'none';
      });
    }

    if (authTabLogin) {
      authTabLogin.addEventListener('click', (e) => {
        e.preventDefault();
        isRegisterMode = false;
        authTabLogin.classList.add('active');
        authTabRegister.classList.remove('active');
        authNameGroup.style.display = 'none';
        authSubmitBtn.textContent = 'Sign In to Cloud Studio';
        authErrorMsg.style.display = 'none';
      });
    }

    if (authTabRegister) {
      authTabRegister.addEventListener('click', (e) => {
        e.preventDefault();
        isRegisterMode = true;
        authTabRegister.classList.add('active');
        authTabLogin.classList.remove('active');
        authNameGroup.style.display = 'block';
        authSubmitBtn.textContent = 'Create Cloud Account';
        authErrorMsg.style.display = 'none';
      });
    }

    if (authForm) {
      authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        authErrorMsg.style.display = 'none';
        const email = document.getElementById('authEmail').value;
        const password = document.getElementById('authPassword').value;
        const name = document.getElementById('authName').value || 'User';

        const endpoint = isRegisterMode ? '/api/auth/register' : '/api/auth/login';
        const payload = isRegisterMode ? { name, email, password } : { email, password };

        try {
          const res = await fetch(`${storage.apiBase}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const data = await res.json();

          if (!res.ok) {
            authErrorMsg.textContent = data.error || 'Authentication failed.';
            authErrorMsg.style.display = 'block';
            return;
          }

          storage.setCloudSession(data.token);
          authModal.style.display = 'none';
          this.showToast(`Connected to Cloud SaaS as ${data.user.name}!`, 'success');
          await updateUIState();
          await this.reloadChatbots();
          this.refreshCurrentView();
        } catch (err) {
          authErrorMsg.textContent = `Could not reach the PHP backend at ${storage.apiBase}. Check that Apache/PHP is running and the API route is configured.`;
          authErrorMsg.style.display = 'block';
        }
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        storage.setCloudSession(null);
        this.showToast('Signed out of cloud backend.', 'info');
        updateUIState();
        this.reloadChatbots().then(() => this.refreshCurrentView());
      });
    }

    if (membershipBtn) {
      membershipBtn.addEventListener('click', () => {
        this.openMembershipModal(billingCycle);
      });
    }

    if (closeMembershipBtn) {
      closeMembershipBtn.addEventListener('click', () => {
        membershipModal.style.display = 'none';
      });
    }

    if (billingToggleBtn) {
      billingToggleBtn.addEventListener('click', () => {
        billingCycle = billingCycle === 'monthly' ? 'yearly' : 'monthly';
        billingCycleText.textContent = billingCycle === 'monthly' ? 'Switch to Yearly' : 'Switch to Monthly';
        this.openMembershipModal(billingCycle);
      });
    }
  }

  async openMembershipModal(billingCycle = 'monthly') {
    const modal = document.getElementById('membershipModal');
    const grid = document.getElementById('plansGrid');
    if (!modal || !grid) return;

    modal.style.display = 'flex';
    grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 20px;">Loading membership plans...</div>';

    try {
      const res = await fetch(`${storage.apiBase}/api/plans`);
      const data = await res.json();
      const plans = data.plans || [];

      grid.innerHTML = plans.map(p => {
        const price = billingCycle === 'yearly' ? p.price_yearly : p.price_monthly;
        const priceSuffix = billingCycle === 'yearly' ? '/yr' : '/mo';
        const isPop = p.is_popular;
        const features = p.features || [];

        return `
          <div class="card" style="position: relative; border: ${isPop ? '2px solid var(--color-primary)' : '1px solid var(--border-color)'}; display: flex; flex-direction: column; justify-content: space-between; border-radius: var(--radius-lg); padding: 20px;">
            ${isPop ? '<span class="badge" style="position: absolute; top: -10px; right: 16px; background: var(--color-primary); color: #fff; font-size: 0.75rem; font-weight: 700; padding: 2px 8px; border-radius: var(--radius-full);">⭐ Favorite Choice</span>' : ''}
            <div>
              <h4 style="font-size: 1.125rem; font-weight: 700; margin-bottom: 4px;">${p.name}</h4>
              <div style="font-size: 1.75rem; font-weight: 800; margin: 12px 0;">
                $${price}<span style="font-size: 0.875rem; font-weight: 500; color: var(--text-muted);">${priceSuffix}</span>
              </div>
              <p style="font-size: 0.8125rem; font-weight: 600; color: var(--color-primary); margin-bottom: 14px;">
                ${p.bot_limit > 10000 ? 'Unlimited Chatbots' : `Up to ${p.bot_limit} Chatbots`}
              </p>
              <ul style="font-size: 0.8125rem; color: var(--text-muted); padding-left: 18px; margin-bottom: 20px; line-height: 1.6;">
                ${features.map(f => `<li>${f}</li>`).join('')}
              </ul>
            </div>
            <div>
              <button class="btn ${isPop ? 'btn-primary' : 'btn-outline'} plan-select-btn" data-plan-id="${p.id}" style="width: 100%; font-weight: 600; font-size: 0.8125rem;">
                ${price == 0 ? 'Current Free Plan' : `Pay with PayPal (${p.name})`}
              </button>
            </div>
          </div>
        `;
      }).join('');

      // Add click handlers to PayPal plan checkout buttons
      grid.querySelectorAll('.plan-select-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const planId = e.currentTarget.getAttribute('data-plan-id');
          await this.handlePlanCheckout(planId, billingCycle);
        });
      });
    } catch (e) {
      grid.innerHTML = '<div style="grid-column: 1/-1; color: var(--color-danger); text-align: center;">Failed to load plans from server.</div>';
    }
  }

  async handlePlanCheckout(planId, billingCycle) {
    if (!storage.isCloudMode()) {
      this.showToast('Please sign in to Cloud SaaS first.', 'error');
      return;
    }

    try {
      this.showToast('Initializing secure PayPal payment...', 'info');
      const res = await fetch(`${storage.apiBase}/api/subscription/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${storage.authToken}`
        },
        body: JSON.stringify({ plan_id: planId, billing_cycle: billingCycle })
      });
      const data = await res.json();

      if (!res.ok) {
        this.showToast(data.error || 'Subscription checkout failed.', 'error');
        return;
      }

      if (data.amount <= 0 || data.message) {
        this.showToast(data.message || 'Free Starter plan activated!', 'success');
        document.getElementById('membershipModal').style.display = 'none';
        this.setupBackendSwitcher();
        return;
      }

      const orderId = data.order?.id;
      const approvalLink = data.order?.links?.find(link => link.rel === 'approve')?.href;
      if (!orderId || !approvalLink) {
        this.showToast('PayPal did not return a checkout approval link.', 'error');
        return;
      }
      window.location.href = approvalLink;
    } catch (e) {
      this.showToast('Payment processing error: ' + e.message, 'error');
    }
  }

  async reloadChatbots() {
    const bots = await storage.getAllChatbots();
    state.setChatbots(bots);
  }

  refreshCurrentView() {
    const hash = window.location.hash.slice(1) || '/';
    if (this.router) {
      this.router.navigate(hash);
    }
  }
}

// Instantiate on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new StudioApp();
  app.init();
  window.__STUDIO_APP__ = app;
});
