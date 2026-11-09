# JavaScript API & Adapter Reference

This document details the public API contract for the runtime engine, adapters, configuration tools, and the self-contained widget bundle.

---

## 0. Standalone Widget Bundle & Embed Loader
Located in `chatbot/chatbot.bundle.js` and `chatbot/loader.js`.

### Global Namespace (`window.ZeroFrameworkChatbot`)
The standalone bundle attaches a clean global namespace for programmatic initialization:
- `ZeroFrameworkChatbot.init(config, container?)`: Asynchronously initializes runtime and mounts Shadow DOM widget into specified container or default fixed viewport root. Returns `WebsiteAdapter` instance.
- `ZeroFrameworkChatbot.ChatbotRuntime`: The core runtime engine class.
- `ZeroFrameworkChatbot.KnowledgeEngine`: The deterministic question-matching engine class.
- `ZeroFrameworkChatbot.WorkflowEngine`: The structured conversation-flow engine class.
- `ZeroFrameworkChatbot.ConversationState`: Session and variable context manager.
- `ZeroFrameworkChatbot.ChatbotRenderer`: Shadow DOM interface renderer.

### Loader Script Tag Attributes
- `data-chatbot-id`: Unique identifier of the chatbot configuration.
- `data-chatbot-data`: Full URI-encoded or base64 serialized JSON configuration for instant zero-database embedding.
- `data-config-url`: (Optional) Remote URL to fetch JSON configuration dynamically.

---

## 1. ChatbotRuntime
Located in `chatbot/runtime.js`.

### Constructor
```javascript
new ChatbotRuntime(config, options)
```
- `config`: Chatbot JSON configuration object.
- `options`: Optional `{ sessionId, onStateChange, onHandoff }`.

### Methods
- `initializeSession()`: Computes opening message, evaluates business hours, and returns greeting payload.
- `processMessage(userText)`: Processes user query asynchronously, evaluates flows, matching FAQs, or triggering fallback/handoff.
- `resetSession()`: Clears active history and restarts conversation.

---

## 2. KnowledgeEngine
Located in `chatbot/knowledge-engine.js`.

### Methods
- `findBestMatch(query, knowledgeBase, confidenceThreshold)`:
  Returns `{ match: object|null, score: number, candidateCount: number }`.
- `stringSimilarity(str1, str2)`: Returns similarity score between 0.0 and 1.0.

---

## 3. AdapterInterface
Located in `chatbot/adapters/adapter-interface.js`.

All channel adapters must implement:
- `async connect()`: Sets up channel connections.
- `async disconnect()`: Destroys connection resources.
- `validateConfiguration()`: Checks that required channel settings exist.
- `normalizeIncomingMessage(rawPayload)`: Standardizes incoming messages into `{ senderId, text, metadata }`.
- `async sendMessage(recipientId, text, options)`: Sends outbound message.
- `verifyWebhook(headers, secretToken)`: Validates webhook authenticity.
