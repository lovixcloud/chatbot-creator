# Developer Guide: Zero-Framework Customizable Chatbot Creator Micro-SaaS

## 1. Product Overview
The **Chatbot Creator Micro-SaaS Platform** is an enterprise-grade, lightweight conversational assistant studio and runtime engine engineered entirely without front-end or back-end frameworks. It enables entrepreneurs, agencies, and businesses to build, customize, test, and deploy production-ready customer support chatbots with zero compilation or heavy server infrastructure.

## 2. System Architecture
The platform is organized into distinct decoupled architectural layers:
- **Administrative Studio UI (`index.html`, `assets/`)**: Client-side single page application operating with native ES Modules, hash routing, and reactive state management.
- **Chatbot Runtime Engine (`chatbot/runtime.js`)**: Independent conversational execution engine managing session context, business rules, deterministic FAQ matching, and workflows.
- **Shadow DOM Renderer (`chatbot/renderer.js`)**: Completely isolates chatbot widget CSS, markup, and event handlers from host websites.
- **Multi-Channel Adapter Engine (`chatbot/adapters/`)**: Standardized abstraction contract connecting the core conversation engine to Website, Telegram, WhatsApp Cloud API, and Generic Webhooks.
- **Serverless Integration Bridge (`integrations/serverless/`)**: Isolated minimal Node.js/edge execution layer that securely manages privileged API secrets and handles webhooks.

## 3. Zero-Framework Development Philosophy
- Zero build tools (No Webpack, Vite, Parcel, or Rollup).
- Zero external CSS or JavaScript libraries (No React, Vue, jQuery, Bootstrap, or Tailwind).
- Native browser APIs utilized for DOM management, fetch operations, custom elements, Shadow DOM, and IndexedDB storage.
- Standard JSON schema for all configuration exchange and storage.

## 4. Technology Choices
- **HTML5 & CSS3**: Native CSS custom properties, grid layouts, animations, and container isolation.
- **Vanilla ECMAScript Modules**: Native browser `import`/`export` semantics.
- **IndexedDB & LocalStorage**: Resilient two-tiered offline storage mechanism.
- **Native Node.js (v18+)**: Utilized strictly for running optional serverless integration webhooks and standalone CLI tests.

## 5. Project Structure
```text
chatbot-creator/
├── index.html                     # Studio application entry point
├── README.md                      # Overview and quickstart documentation
├── assets/
│   ├── css/                       # Design token system and stylesheets
│   └── js/                        # Studio administrative modules
├── chatbot/
│   ├── loader.js                  # Asynchronous website embedding loader
│   ├── runtime.js                 # Conversation processing engine
│   ├── renderer.js                # Isolated Shadow DOM widget renderer
│   ├── knowledge-engine.js        # Deterministic FAQ matching engine
│   ├── workflow-engine.js         # Branching logic & variable capture
│   ├── conversation.js            # State, history, and business hours
│   └── adapters/                  # Multi-channel protocol adapters
├── data/
│   ├── schemas/                   # JSON Schema definitions
│   └── templates/                 # 8 industry-specific bot templates
├── integrations/serverless/       # Telegram, WhatsApp & HTTP bridge
├── docs/                          # Developer & User guides
└── tests/                         # Node & browser automated test suites
```

## 6. Application Installation
No `npm install` is required. The application executes immediately on any static HTTP file server.

## 7. Local Development
Start any basic static file server from the root directory:
```bash
python3 -m http.server 3000
# or
npx serve . -l 3000
```
Open `http://localhost:3000` in any modern web browser.

## 8. Running Without Build Tools
Browsers natively fetch and execute ES Modules declared with `<script type="module">`. All imports utilize standard relative URL paths (`./assets/js/app.js`).

## 9. JavaScript Module Architecture
- `storage.js`: Provides an asynchronous CRUD interface wrapping IndexedDB with automatic localStorage failover.
- `validation.js`: Schema rules validator ensuring structural integrity without third-party schema dependencies.
- `config-manager.js`: Handles template instantiation, deep cloning, and CSV conversion.
- `state.js`: Lightweight EventEmitter managing application state.
- `router.js`: Window hash change listener enabling client-side SPA routing.

## 10. Chatbot Configuration Schema
Every chatbot is represented by a strictly typed JSON object adhering to `data/schemas/chatbot-schema.json`. Essential top-level sections include:
- `identity`: Assistant name, company name, tone, personality, greetings, and fallbacks.
- `appearance`: Colors, position, themes, custom CSS, launcher configuration.
- `welcomeExperience`: Greeting text, starter questions, consent warnings.
- `knowledgeBase`: Array of FAQ items with questions, answers, and keywords.
- `conversationFlows`: State machine definitions for multi-step dialogs.
- `businessRules`: Timezones, weekly schedules, after-hours messaging, confidence thresholds.
- `humanHandoff`: Auto-escalation thresholds, notification email, and support URLs.
- `integrations`: Platform-specific options and security parameters.
- `privacy`: Session persistence mode, retention limits, PII controls.

## 11. Configuration Validation
`ConfigValidator.validate(config)` parses configurations recursively and validates:
- Hexadecimal color codes (`^#[0-9a-fA-F]{6}$`).
- Machine identifiers (`^[a-z0-9_-]{3,64}$`).
- Presence of required fields and types.
- Broken step references in conversation flows.

## 12. Configuration Storage
- `StorageManager.getAllChatbots()` queries the IndexedDB `chatbots` store, falling back to `localStorage.getItem('chatbot_creator_bots')`.
- Configurations can be exported and imported as portable `.json` files.

## 13. Runtime Engine Internals
`ChatbotRuntime` acts as the single source of truth for message evaluation:
1. Validates input text.
2. Checks human escalation keywords.
3. Advances running conversation flows if active.
4. Checks triggers for new conversational workflows.
5. Performs deterministic knowledge-base search.
6. Evaluates fallback thresholds and triggers handoff when threshold exceeded.

## 14. Knowledge-Base Matching Algorithm
`KnowledgeEngine.findBestMatch(query, kb, threshold)` performs a 4-stage deterministic evaluation:
1. **Exact Match**: Direct equality check yielding 1.0 confidence.
2. **Alternative Phrasings**: Levenshtein distance check yielding up to 1.0 confidence.
3. **Keyword Overlap**: Weighted keyword scoring checking word presence.
4. **Tokenization & Stop Words**: Strips common stop-words and computes intersection ratios.

## 15. Conversation-State Management
`ConversationState` maintains session identity, FIFO message history capped at `maxHistoryItems`, captured variables, and business hours status.

## 16. Workflow Engine
`WorkflowEngine` evaluates step nodes (`question`, `input_capture`, `quick_replies`, `message`, `handoff`, `end`). Input validation supports email, phone, text, and numeric validation.

## 17. Widget-Rendering Architecture
The widget renders inside a Shadow Root via `this.hostElement.attachShadow({ mode: 'open' })`. Host website CSS styles do not leak into the widget, and widget styles do not affect the host page.

## 18. Website Embedding Architecture
A non-blocking asynchronous loader script (`chatbot/loader.js`) dynamically downloads and launches the self-contained widget bundle (`chatbot/chatbot.bundle.js`). The widget engine is 100% dependency-free, avoiding cross-origin module loading issues when embedded on external customer domains, CMS platforms (WordPress, Shopify, Webflow), or static sites.

### Multi-Tier Configuration Discovery Engine
The embed loader implements a resilient 5-tier configuration discovery hierarchy to guarantee that a chatbot displays cleanly across any external environment:
1. **Inlined JSON Data Attribute (`data-chatbot-data` or `data-config`):** Provides instant, zero-database embedding. The complete bot configuration is encoded directly in the script tag, ensuring instant rendering on any third-party domain without requiring server-side API setups.
2. **Hosted Remote Configuration URL (`data-config-url`):** Directly fetches the published JSON configuration from any CORS-enabled CDN, S3 bucket, or static server.
3. **Same-Origin LocalStorage:** When embedded on the same origin as the Studio, attempts to discover the draft or published bot configuration in `localStorage`.
4. **Serverless API Bridge (`/api/chatbots/:id`):** When connected to the serverless bridge, queries the API backend for dynamic database-backed chatbot instances.
5. **Static Template / Fallback Configuration:** Falls back to relative static template paths (`/data/templates/:id.json`) or a resilient default assistant configuration, preventing empty containers or broken widgets if an ID is missing.

### Educational Showcase & Live Telemetry Mini-App (`demo/index.html`)
The platform includes an isolated educational mini-app located in `demo/index.html` (with `demo/demo.js` and `demo/demo.css`). It simulates a live external customer storefront ("Nova Commerce & Support Portal") and features:
- Interactive User Experience Tour demonstrating starters, FAQs, workflows, and handoffs.
- Live Runtime Event Telemetry console reporting real-time knowledge matching scores, captured variables, and flow transitions.
- Dynamic assistant switcher allowing users to test any studio-saved chatbot, template, or custom uploaded JSON configuration.

## 19. Integration Adapter Architecture
All channel adapters inherit from `AdapterInterface`:
- `connect()`
- `disconnect()`
- `validateConfiguration()`
- `normalizeIncomingMessage(rawEvent)`
- `sendMessage(recipientId, text, options)`
- `verifyWebhook(headers, rawBody)`

## 20. Creating a New Messaging Platform Adapter
To create a new adapter (e.g., Slack or Discord):
1. Subclass `AdapterInterface`.
2. Implement message normalization to transform vendor event schemas into standard `{ senderId, text, metadata }` objects.
3. Implement `sendMessage()` to dispatch outbound payloads.

## 21. WhatsApp Integration Architecture
Connects to Meta WhatsApp Cloud API via serverless handler `integrations/serverless/whatsapp-webhook.js`. Inbound webhook challenges (`hub.challenge`) and incoming messages are normalized, processed through `ChatbotRuntime`, and dispatched via Graph API.

## 22. Telegram Integration Architecture
Uses `integrations/serverless/telegram-webhook.js`. Inbound webhook calls are authenticated using the `X-Telegram-Bot-Api-Secret-Token` header. Outbound messages are formatted with inline keyboard buttons.

## 23. Webhook Implementation
`GenericWebhookAdapter` dispatches standard HTTP POST events to external endpoints whenever conversations start, messages are sent, or human escalation occurs.

## 24. Secret Management
Client-side code never stores Telegram Bot Tokens or WhatsApp System User Tokens. All privileged credentials must be provided as environment variables to the serverless bridge layer:
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_SECRET_TOKEN`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_VERIFY_TOKEN`

## 25. Optional Serverless Functionality
`integrations/serverless/api/bridge-server.js` provides a standalone Node.js HTTP server for local testing and serverless deployment.

## 26. API Contracts
All adapters and runtime operations return predictable response structures:
```javascript
{
  type: 'faq_answer' | 'flow_step' | 'fallback' | 'handoff',
  message: { sender: 'bot', text: '...', timestamp: '...' },
  options: []
}
```

## 27. Error Handling
All operations implement defensive fallbacks. Network disconnections in the widget display non-blocking error notices, and database corruption falls back to localStorage.

## 28. Security Architecture
- HTML output is sanitized via `ConfigValidator.escapeHtml`.
- Dynamic code evaluation (`eval`, `Function`) is strictly forbidden.
- Scoped Shadow DOM prevents style pollution.
- Webhook secret token verification blocks spoofed requests.

## 29. Privacy and Data Management
- No third-party analytics or tracker beacons.
- Chat session retention limits are enforced.
- Workspaces and sessions remain isolated.

## 30. Testing Procedures
Run automated Node.js test suites:
```bash
node tests/run-all.js
```
Or open `tests/index.html` in any browser to execute client-side assertions.

## 31. Deployment
Deploy static assets to GitHub Pages, Cloudflare Pages, Netlify, or AWS S3. Deploy the serverless bridge to AWS Lambda, Vercel Functions, or Cloudflare Workers.

## 32. Version Management
Every published configuration increments the `version` integer, preserving previous schema stability.

## 33. Debugging
Inspect `window.__STUDIO_APP__` in the browser console for live state and configuration objects.

## 34. Performance Optimization
Widget payload is under 35KB uncompressed, loads asynchronously, and generates zero blocking render delays.

## 35. Troubleshooting
See `docs/TROUBLESHOOTING.md` for specific issue diagnosis.

## 36. Contribution Guidelines
- Preserve zero-framework architecture.
- Do not introduce npm runtime dependencies.
- Ensure all tests in `tests/run-all.js` pass before submitting.

## 37. Future Extension Opportunities
- Vector search via browser WebAssembly embeddings.
- Voice input using native Web Speech API.
- Live WebRTC agent audio handoff.
