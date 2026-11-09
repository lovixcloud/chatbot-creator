/**
 * Zero-Framework Chatbot Widget Embed Loader
 * Loads asynchronously, fetches remote, local, or inlined chatbot configuration,
 * creates an isolated container, and launches WebsiteAdapter using the self-contained bundle.
 */

(function () {
  'use strict';

  if (window.__CHATBOT_LOADER_INITIALIZED__) return;
  window.__CHATBOT_LOADER_INITIALIZED__ = true;

  const currentScript = document.currentScript || (function () {
    const scripts = document.getElementsByTagName('script');
    for (let i = scripts.length - 1; i >= 0; i--) {
      if (scripts[i].src && scripts[i].src.includes('loader.js')) return scripts[i];
    }
    return scripts[scripts.length - 1];
  })();

  const chatbotId = currentScript ? currentScript.getAttribute('data-chatbot-id') : null;
  const configUrl = currentScript ? currentScript.getAttribute('data-config-url') : null;
  const rawInlineConfig = currentScript ? (currentScript.getAttribute('data-chatbot-data') || currentScript.getAttribute('data-config')) : null;

  if (!chatbotId && !configUrl && !rawInlineConfig) {
    console.warn('[ChatbotLoader] Missing data-chatbot-id, data-config-url, or data-chatbot-data on script element.');
    return;
  }

  // Derive origin and base path where loader.js is hosted
  function getBaseUrl() {
    if (currentScript && currentScript.src) {
      return currentScript.src.substring(0, currentScript.src.lastIndexOf('/'));
    }
    return window.location.origin + '/chatbot';
  }

  async function loadConfiguration() {
    // 1. Inlined configuration via attribute (100% self-contained across any third-party domain)
    if (rawInlineConfig) {
      try {
        let decoded = rawInlineConfig;
        if (decoded.startsWith('base64:')) {
          decoded = atob(decoded.substring(7));
        } else if (decoded.startsWith('%7B') || decoded.startsWith('%7b')) {
          decoded = decodeURIComponent(decoded);
        }
        return JSON.parse(decoded);
      } catch (err) {
        console.warn('[ChatbotLoader] Failed to parse inline config attribute:', err.message);
      }
    }

    // 2. Explicit config URL
    if (configUrl) {
      const resp = await fetch(configUrl);
      if (!resp.ok) throw new Error(`HTTP ${resp.status} fetching config from ${configUrl}`);
      return await resp.json();
    }

    // 3. LocalStorage check (when testing on same domain)
    if (chatbotId && typeof localStorage !== 'undefined') {
      const local = localStorage.getItem(`chatbot_pub_${chatbotId}`) || localStorage.getItem('chatbot_creator_bots');
      if (local) {
        try {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed)) {
            const match = parsed.find(b => b.id === chatbotId);
            if (match) return match;
          } else if (parsed.id === chatbotId) {
            return parsed;
          }
        } catch (e) {
          // ignore
        }
      }
    }

    // 4. Try remote serverless API if available
    const baseUrl = getBaseUrl();
    const serverHost = baseUrl.substring(0, baseUrl.lastIndexOf('/'));
    if (chatbotId) {
      try {
        const apiResp = await fetch(`${serverHost}/api/chatbots/${chatbotId}`);
        if (apiResp.ok) return await apiResp.json();
      } catch (e) {
        // continue
      }

      // 5. Try static template/export file at hosting origin
      try {
        const staticResp = await fetch(`${serverHost}/data/templates/${chatbotId}.json`);
        if (staticResp.ok) return await staticResp.json();
      } catch (e) {
        // continue
      }

      // 6. Fallback default configuration if id exists so widget always renders
      return {
        id: chatbotId,
        name: 'Website Assistant',
        identity: {
          businessName: 'Customer Support',
          assistantName: 'Support Bot',
          welcomeMessage: 'Hello! How can we help you today?'
        },
        appearance: {
          primaryColor: '#2563eb',
          theme: 'light',
          position: 'bottom-right'
        },
        welcomeExperience: {
          greeting: 'Hello! Welcome to our website. How can we assist you?',
          conversationStarters: ['What services do you offer?', 'How can I contact support?']
        },
        knowledgeBase: [
          {
            id: 'faq_contact',
            question: 'How can I contact support?',
            answer: 'You can reach out to our team at support@example.com.',
            keywords: ['contact', 'support', 'help', 'email']
          },
          {
            id: 'faq_services',
            question: 'What services do you offer?',
            answer: 'We offer automated customer assistance, workflow routing, and intelligent triage.',
            keywords: ['services', 'features', 'products']
          }
        ],
        conversationFlows: []
      };
    }

    throw new Error('No valid chatbot configuration found.');
  }

  function loadBundleScript() {
    return new Promise((resolve, reject) => {
      if (window.ZeroFrameworkChatbot) {
        resolve();
        return;
      }

      const baseUrl = getBaseUrl();
      const bundleUrl = `${baseUrl}/chatbot.bundle.js`;

      const script = document.createElement('script');
      script.src = bundleUrl;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load chatbot bundle from ${bundleUrl}`));
      document.head.appendChild(script);
    });
  }

  async function initWidget() {
    try {
      await loadBundleScript();
      const config = await loadConfiguration();

      // Check domain restriction if configured
      if (
        config.integrations &&
        config.integrations.website &&
        config.integrations.website.requireDomainValidation &&
        Array.isArray(config.integrations.website.allowedDomains)
      ) {
        const allowed = config.integrations.website.allowedDomains;
        const currentHost = window.location.hostname;
        const isAllowed = allowed.includes('*') || allowed.some(d => d === currentHost || currentHost.endsWith('.' + d));
        if (!isAllowed) {
          console.error(`[Chatbot] Domain ${currentHost} is not authorized to embed this chatbot.`);
          return;
        }
      }

      const adapter = await window.ZeroFrameworkChatbot.init(config);
      window[`ChatbotInstance_${config.id}`] = adapter;
    } catch (err) {
      console.warn('[ChatbotLoader] Initialization failed:', err.message);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
  } else {
    initWidget();
  }
})();
