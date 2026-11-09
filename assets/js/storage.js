/**
 * Storage Manager for Chatbot Configurations & Sessions
 * Seamlessly manages LocalStorage and IndexedDB with fallback and export/import.
 */

const DB_NAME = 'ChatbotCreatorDB';
const DB_VERSION = 1;
const STORE_CHATBOTS = 'chatbots';
const STORE_ANALYTICS = 'analytics';
const STORE_SESSIONS = 'sessions';

export class StorageManager {
  constructor() {
    this.db = null;
    this.isIndexedDBReady = false;
    this.backendMode = localStorage.getItem('chatbot_studio_backend_mode') || 'local'; // 'local' or 'cloud'
    const configuredApiBase = localStorage.getItem('chatbot_studio_api_url');
    const isLocalDevelopment = ['3000', '8080'].includes(window.location.port);
    const localApiBase = `${window.location.protocol}//${window.location.hostname || 'localhost'}:8000`;
    const sameOriginApiBase = new URL('./', window.location.href).href.replace(/\/+$/, '');
    const configuredUrl = configuredApiBase ? new URL(configuredApiBase, window.location.href) : null;
    const staleLocalApiUrl = configuredUrl &&
      configuredUrl.hostname === window.location.hostname &&
      configuredUrl.port === '8000' &&
      !isLocalDevelopment;
    this.apiBase = (staleLocalApiUrl ? sameOriginApiBase : configuredApiBase) ||
      (isLocalDevelopment ? localApiBase : sameOriginApiBase);
    this.apiBase = this.apiBase.replace(/\/+$/, '');
    this.authToken = localStorage.getItem('chatbot_studio_auth_token') || null;
  }

  isCloudMode() {
    return this.backendMode === 'cloud' && !!this.authToken;
  }

  setCloudSession(token) {
    this.authToken = token;
    if (token) {
      localStorage.setItem('chatbot_studio_auth_token', token);
      this.backendMode = 'cloud';
      localStorage.setItem('chatbot_studio_backend_mode', 'cloud');
    } else {
      localStorage.removeItem('chatbot_studio_auth_token');
      this.backendMode = 'local';
      localStorage.setItem('chatbot_studio_backend_mode', 'local');
    }
  }

  /**
   * Initialize IndexedDB with graceful fallback.
   */
  async init() {
    if (typeof window === 'undefined' || !window.indexedDB) {
      this.isIndexedDBReady = false;
      return false;
    }

    return new Promise((resolve) => {
      try {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains(STORE_CHATBOTS)) {
            db.createObjectStore(STORE_CHATBOTS, { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains(STORE_ANALYTICS)) {
            const aStore = db.createObjectStore(STORE_ANALYTICS, { keyPath: 'id', autoIncrement: true });
            aStore.createIndex('chatbotId', 'chatbotId', { unique: false });
          }
          if (!db.objectStoreNames.contains(STORE_SESSIONS)) {
            const sStore = db.createObjectStore(STORE_SESSIONS, { keyPath: 'sessionId' });
            sStore.createIndex('chatbotId', 'chatbotId', { unique: false });
          }
        };

        request.onsuccess = (event) => {
          this.db = event.target.result;
          this.isIndexedDBReady = true;
          resolve(true);
        };

        request.onerror = () => {
          this.isIndexedDBReady = false;
          resolve(false);
        };
      } catch (e) {
        this.isIndexedDBReady = false;
        resolve(false);
      }
    });
  }

  /**
   * Get all stored chatbots.
   * @returns {Promise<Array<object>>}
   */
  async getAllChatbots() {
    if (this.isCloudMode()) {
      const res = await fetch(`${this.apiBase}/api/chatbots`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load chatbots from Cloud Backend');
      }
      return data.chatbots || [];
    }

    if (this.isIndexedDBReady && this.db) {
      try {
        return await new Promise((resolve, reject) => {
          const tx = this.db.transaction([STORE_CHATBOTS], 'readonly');
          const store = tx.objectStore(STORE_CHATBOTS);
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => reject(req.error);
        });
      } catch (e) {
        // Fall back to localStorage
      }
    }

    try {
      const raw = localStorage.getItem('chatbot_creator_bots');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  /**
   * Get single chatbot by ID.
   * @param {string} id
   * @returns {Promise<object|null>}
   */
  async getChatbot(id) {
    if (this.isCloudMode()) {
      const res = await fetch(`${this.apiBase}/api/chatbots/${encodeURIComponent(id)}`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load chatbot from Cloud Backend');
      }
      return data;
    }

    if (this.isIndexedDBReady && this.db) {
      try {
        return await new Promise((resolve) => {
          const tx = this.db.transaction([STORE_CHATBOTS], 'readonly');
          const store = tx.objectStore(STORE_CHATBOTS);
          const req = store.get(id);
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => resolve(null);
        });
      } catch (e) {
        // Fallback
      }
    }

    const all = await this.getAllChatbots();
    return all.find(b => b.id === id) || null;
  }

  /**
   * Save or update a chatbot.
   * @param {object} chatbot
   */
  async saveChatbot(chatbot) {
    if (!chatbot || !chatbot.id) {
      throw new Error('Chatbot object must possess a valid "id".');
    }

    chatbot.updatedAt = new Date().toISOString();
    if (!chatbot.createdAt) {
      chatbot.createdAt = chatbot.updatedAt;
    }

    if (this.isCloudMode()) {
      const res = await fetch(`${this.apiBase}/api/chatbots`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        },
        body: JSON.stringify(chatbot)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save chatbot to Cloud Backend');
      }
      return chatbot;
    }

    // Save to IndexedDB
    if (this.isIndexedDBReady && this.db) {
      try {
        await new Promise((resolve, reject) => {
          const tx = this.db.transaction([STORE_CHATBOTS], 'readwrite');
          const store = tx.objectStore(STORE_CHATBOTS);
          const req = store.put(chatbot);
          req.onsuccess = () => resolve(true);
          req.onerror = () => reject(req.error);
        });
      } catch (e) {
        // Fallback
      }
    }

    // Always mirror to localStorage for redundancy
    try {
      const all = await this.getAllChatbots();
      const idx = all.findIndex(b => b.id === chatbot.id);
      if (idx >= 0) {
        all[idx] = chatbot;
      } else {
        all.push(chatbot);
      }
      localStorage.setItem('chatbot_creator_bots', JSON.stringify(all));
    } catch (e) {
      // Storage quota or disabled
    }

    return chatbot;
  }

  /**
   * Delete chatbot by ID.
   * @param {string} id
   */
  async deleteChatbot(id) {
    if (this.isCloudMode()) {
      try {
        const res = await fetch(`${this.apiBase}/api/chatbots/${encodeURIComponent(id)}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${this.authToken}`
          }
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to delete chatbot from Cloud Backend');
        }
      } catch (e) {
        throw e;
      }
    }

    if (this.isIndexedDBReady && this.db) {
      try {
        await new Promise((resolve, reject) => {
          const tx = this.db.transaction([STORE_CHATBOTS], 'readwrite');
          const store = tx.objectStore(STORE_CHATBOTS);
          const req = store.delete(id);
          req.onsuccess = () => resolve(true);
          req.onerror = () => reject(req.error);
        });
      } catch (e) {
        // Fallback
      }
    }

    try {
      const all = (await this.getAllChatbots()).filter(b => b.id !== id);
      localStorage.setItem('chatbot_creator_bots', JSON.stringify(all));
    } catch (e) {
      //
    }
    return true;
  }

  /**
   * Save a conversation message to analytics store.
   * @param {string} chatbotId
   * @param {object} logEntry
   */
  async logInteraction(chatbotId, logEntry) {
    const entry = {
      chatbotId,
      timestamp: new Date().toISOString(),
      ...logEntry
    };

    if (this.isIndexedDBReady && this.db) {
      try {
        const tx = this.db.transaction([STORE_ANALYTICS], 'readwrite');
        tx.objectStore(STORE_ANALYTICS).add(entry);
        return;
      } catch (e) {
        //
      }
    }

    try {
      const key = `chatbot_analytics_${chatbotId}`;
      const raw = localStorage.getItem(key);
      const list = raw ? JSON.parse(raw) : [];
      list.push(entry);
      if (list.length > 200) list.shift();
      localStorage.setItem(key, JSON.stringify(list));
    } catch (e) {
      //
    }
  }

  /**
   * Get analytics logs for a chatbot.
   * @param {string} chatbotId
   * @returns {Promise<Array<object>>}
   */
  async getAnalytics(chatbotId) {
    if (this.isIndexedDBReady && this.db) {
      try {
        return await new Promise((resolve) => {
          const tx = this.db.transaction([STORE_ANALYTICS], 'readonly');
          const store = tx.objectStore(STORE_ANALYTICS);
          const idx = store.index('chatbotId');
          const req = idx.getAll(chatbotId);
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => resolve([]);
        });
      } catch (e) {
        //
      }
    }

    try {
      const raw = localStorage.getItem(`chatbot_analytics_${chatbotId}`);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }
}

export const storage = new StorageManager();
