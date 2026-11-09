# Chatbot Configuration Schema Reference

Every chatbot configuration is stored as a validated JSON document complying with `data/schemas/chatbot-schema.json`.

---

## Complete JSON Schema Example
```json
{
  "schemaVersion": "1.0.0",
  "id": "bot_support_01",
  "name": "Nova Support Pro",
  "description": "Customer service assistant",
  "status": "published",
  "version": 1,
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z",
  "identity": {
    "assistantName": "Nova Assistant",
    "businessName": "Acme Corp",
    "businessCategory": "Customer Support",
    "role": "Support Agent",
    "personality": "professional",
    "tone": "empathetic",
    "avatarUrl": "",
    "businessLogoUrl": "",
    "fallbackMessage": "I don't have that answer right now.",
    "errorMessage": "A temporary error occurred.",
    "handoffMessage": "Connecting to an agent.",
    "endingMessage": "Thank you for chatting!"
  },
  "appearance": {
    "theme": "light",
    "position": "bottom-right",
    "primaryColor": "#2563eb",
    "secondaryColor": "#1d4ed8",
    "backgroundColor": "#ffffff",
    "textColor": "#1e293b",
    "userBubbleColor": "#2563eb",
    "botBubbleColor": "#f1f5f9",
    "borderRadius": 16,
    "fontFamily": "system-ui, sans-serif",
    "headerTitle": "Nova Support Pro",
    "headerSubtitle": "Typically replies instantly",
    "launcherIcon": "chat",
    "launcherText": "Chat with us",
    "customCss": "",
    "width": 380,
    "height": 580
  },
  "welcomeExperience": {
    "greeting": "Hello! How can we assist you today?",
    "showWelcomeScreen": true,
    "welcomeTitle": "Welcome",
    "welcomeSubtitle": "Ask a question",
    "conversationStarters": ["What are your hours?", "Return policy"],
    "askUserName": false,
    "askUserEmail": false,
    "consentMessage": "By chatting, you agree to our privacy policy."
  },
  "knowledgeBase": [
    {
      "id": "faq_hours",
      "question": "What are your hours?",
      "answer": "We are open Monday through Friday, 9am to 6pm.",
      "category": "General",
      "keywords": ["hours", "open", "timing"],
      "alternativePhrasings": ["When are you open?"],
      "priority": 5
    }
  ],
  "conversationFlows": [],
  "businessRules": {
    "timezone": "UTC",
    "operatingHours": {
      "enabled": false,
      "schedule": {},
      "afterHoursMessage": "We are closed."
    },
    "confidenceThreshold": 0.35,
    "maxHistoryItems": 30,
    "rateLimitPerMinute": 20
  },
  "humanHandoff": {
    "enabled": true,
    "mode": "email",
    "destinationEmail": "support@example.com",
    "supportUrl": "https://example.com/support",
    "autoEscalateKeywords": ["agent", "human", "representative"],
    "consecutiveFallbacksBeforeHandoff": 2
  },
  "integrations": {
    "website": {
      "enabled": true,
      "allowedDomains": ["*"],
      "requireDomainValidation": false
    },
    "telegram": {
      "enabled": false,
      "botUsername": "",
      "bridgeEndpoint": "",
      "status": "unconfigured"
    },
    "whatsapp": {
      "enabled": false,
      "phoneNumberId": "",
      "businessAccountId": "",
      "bridgeEndpoint": "",
      "status": "unconfigured"
    },
    "webhook": {
      "enabled": false,
      "endpointUrl": "",
      "method": "POST",
      "events": ["on_message", "on_handoff"],
      "customHeaders": {}
    }
  },
  "privacy": {
    "sessionPersistence": "session",
    "retentionDays": 30,
    "collectAnalytics": true,
    "maskPii": false,
    "privacyPolicyUrl": "https://example.com/privacy"
  }
}
```

---

## 3. Embedding and Deployment Formats

### Inlined Configuration Attribute (`data-chatbot-data`)
For universal third-party website embedding with zero database setup:
- Encodes the full configuration object using `encodeURIComponent(JSON.stringify(config))` or `base64:BASE64_DATA`.
- Passed directly on the `<script>` tag alongside `data-chatbot-id`.

### Dynamic Remote URL (`data-config-url`)
For hosting configurations on static object storage, GitHub Pages, or serverless APIs:
- Points directly to a hosted JSON endpoint (e.g. `https://my-cdn.com/chatbots/my-bot.json`).
