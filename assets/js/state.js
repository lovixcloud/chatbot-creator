/**
 * Application Reactive State & Event Bus
 */

class AppState {
  constructor() {
    this.chatbots = [];
    this.currentChatbot = null;
    this.activeRoute = 'dashboard';
    this.listeners = new Map();
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(cb => cb(data));
    }
  }

  setChatbots(list) {
    this.chatbots = list || [];
    this.emit('chatbots:changed', this.chatbots);
  }

  setCurrentChatbot(bot) {
    this.currentChatbot = bot;
    this.emit('currentChatbot:changed', this.currentChatbot);
  }
}

export const state = new AppState();
