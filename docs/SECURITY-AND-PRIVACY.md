# Security, Content Security Policy & Privacy Architecture

Security and privacy are foundational to the Zero-Framework Chatbot Platform.

---

## 1. Security Architecture Principles

### Zero-Framework Immunity
By avoiding bulky framework dependencies (npm packages, compilers, build systems), the platform has zero exposure to supply-chain attacks, malicious third-party dependencies, or bundle vulnerabilities.

### Strict DOM Injection Controls
All user input, business names, greetings, and knowledge-base answers are rendered via safe DOM operations and sanitized via `ConfigValidator.escapeHtml()`.

### Shadow DOM Isolation
The website widget is mounted within a closed/open Shadow Root (`attachShadow({ mode: 'open' })`), preventing host page JavaScript or external CSS rules from contaminating the chat interface.

### No Client-Side Secrets
Telegram Bot tokens and WhatsApp System User credentials must never be configured in client-side code. They are solely managed as server-side environment variables in the optional serverless bridge.

---

## 2. Recommended Content Security Policy (CSP)
For websites embedding the chatbot widget, add the following CSP directives:
```http
Content-Security-Policy: default-src 'self'; script-src 'self' https://your-chatbot-host.com; style-src 'self' 'unsafe-inline'; connect-src 'self' https://your-chatbot-host.com; img-src 'self' data: https:;
```

---

## 3. Privacy & Data Minimization
- **Session-Only Storage**: By default, customer sessions exist in memory and browser session storage, clearing automatically when the tab is closed.
- **Zero Third-Party Beacons**: No telemetry or user tracking pixels are injected into the chatbot.
- **Data Export & Deletion**: Chatbot owners can export or delete their chatbots and conversation histories with a single click.
