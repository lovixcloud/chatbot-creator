/**
 * Shadow DOM Renderer for Chatbot Widget
 * Completely isolates chatbot CSS and HTML from host website styles.
 */

import { ConfigValidator } from '../assets/js/validation.js';

export class ChatbotRenderer {
  /**
   * @param {HTMLElement} hostElement
   * @param {object} config
   * @param {object} callbacks - { onSendMessage, onOptionClick, onReset }
   */
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
    if (this.shadowRoot) {
      this.render();
    }
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

      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }

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

      .widget-launcher svg {
        width: 22px;
        height: 22px;
        fill: currentColor;
      }

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
        .chat-window {
          width: calc(100vw - 24px);
          height: calc(100vh - 80px);
        }
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

      .header-info {
        display: flex;
        align-items: center;
        gap: 10px;
      }

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

      .header-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .header-titles h3 {
        font-size: 15px;
        font-weight: 600;
        line-height: 1.2;
      }

      .header-titles p {
        font-size: 11px;
        opacity: 0.9;
      }

      .header-actions {
        display: flex;
        align-items: center;
        gap: 6px;
      }

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

      .btn-icon:hover {
        background: rgba(255,255,255,0.2);
      }

      .messages-container {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .msg-row {
        display: flex;
        flex-direction: column;
        max-width: 82%;
      }

      .msg-row.user {
        align-self: flex-end;
      }

      .msg-row.bot {
        align-self: flex-start;
      }

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

      .msg-time {
        font-size: 10px;
        color: #94a3b8;
        margin-top: 4px;
        align-self: flex-start;
      }

      .msg-row.user .msg-time {
        align-self: flex-end;
      }

      .options-list {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 8px;
      }

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

      .chat-footer {
        padding: 12px;
        border-top: 1px solid ${border};
        background: ${bg};
      }

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

      .btn-send:hover {
        background: ${secondary};
      }

      .btn-send svg {
        width: 16px;
        height: 16px;
        fill: currentColor;
      }

      .branding {
        text-align: center;
        font-size: 10px;
        color: #94a3b8;
        margin-top: 6px;
      }

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

    // Attach chip click events
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
