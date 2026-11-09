# Multi-Channel Integration Guide

Deploy your custom chatbots across third-party messaging platforms while strictly protecting credentials.

---

## 1. Architecture Overview
Because client-side JavaScript in a browser is inherently public, secret API keys (such as Meta WhatsApp Cloud tokens or Telegram Bot tokens) must **never** be embedded into client code.

An optional lightweight serverless bridge layer is provided in `integrations/serverless/`:
- `telegram-webhook.js`
- `whatsapp-webhook.js`
- `api/bridge-server.js`

---

## 2. WhatsApp Business Cloud API Integration

### Prerequisites
1. Meta for Developers Account.
2. Verified Meta Business Manager account.
3. WhatsApp Business Phone Number ID.

### Setup Instructions
1. Deploy `integrations/serverless/whatsapp-webhook.js` to your serverless host (AWS Lambda, Vercel, Cloudflare Workers).
2. Set environment variables:
   - `WHATSAPP_ACCESS_TOKEN`: Meta System User access token.
   - `WHATSAPP_VERIFY_TOKEN`: A private secret string chosen by you.
3. In Meta Developer App under **WhatsApp > Configuration**:
   - Set **Callback URL** to: `https://your-bridge-domain.com/webhook/whatsapp`.
   - Enter your **Verify Token**.
   - Subscribe to the `messages` webhook field.

---

## 3. Telegram Bot API Integration

### Prerequisites
1. Telegram account.
2. Bot token generated from `@BotFather`.

### Setup Instructions
1. Deploy `integrations/serverless/telegram-webhook.js`.
2. Set environment variables:
   - `TELEGRAM_BOT_TOKEN`: Token provided by BotFather.
   - `TELEGRAM_SECRET_TOKEN`: A private 1-256 character secret token.
3. Register the webhook with Telegram:
   ```bash
   curl -F "url=https://your-bridge-domain.com/webhook/telegram" \
        -F "secret_token=YOUR_SECRET_TOKEN" \
        https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook
   ```

---

## 4. Generic Webhooks

To forward chat events to your CRM or custom automation tool (e.g. Zapier or Make):
1. Open the Chatbot Builder and navigate to **Integrations**.
2. Enable **Generic Webhook**.
3. Supply your target HTTPS endpoint URL and select triggers (`on_message`, `on_handoff`).
