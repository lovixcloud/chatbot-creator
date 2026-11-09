# Troubleshooting & Diagnostic Guide

This guide helps resolve common setup, rendering, matching, and integration issues.

---

## 1. Widget Does Not Display on Website
- **Symptom**: Script tag is present on an external website, but no chat launcher appears.
- **Diagnosis & Fixes**:
  1. **Cross-Origin / External Domain Storage Boundary**: When pasting an embed snippet on an external website (e.g. `https://my-store.com`), the host site cannot read your Studio's local browser storage. **Fix**: Use the **Universal Zero-Dependency Embed** option from the Publish tab (which encodes `data-chatbot-data="..."` directly in the tag) or specify `data-config-url`.
  2. **Domain Authorization**: If you see `[Chatbot] Domain ... is not authorized` in the console, check the **Allowed Hostname Domains** setting under Publish & Embed. Add `*` or your website's domain name.
  3. **Script Path Resolution**: Verify that the URL to `loader.js` returns HTTP 200. The loader automatically discovers and imports `chatbot.bundle.js` from the same origin directory.
  4. **Ad-Blockers or Content Blockers**: Ensure aggressive browser extensions are not blocking script tags with "chatbot" in the URL name.

---

## 2. Questions Return Fallback Messages Unexpectedly
- **Symptom**: Chatbot replies with "I don't have an exact answer" for simple questions.
- **Diagnosis**:
  1. Verify the question exists in the Knowledge Base tab.
  2. Check the **Deterministic Confidence Threshold** under Business Rules. If set too high (e.g., > 0.6), lower it to `0.30` - `0.35`.
  3. Add common synonyms as keywords for the question.

---

## 3. Telegram Webhook Returns HTTP 403 Forbidden
- **Symptom**: Telegram Bot messages are not delivered to your chatbot.
- **Diagnosis**:
  1. Confirm that the `TELEGRAM_SECRET_TOKEN` set in your serverless bridge environment matches the secret token provided during `setWebhook`.
  2. Verify that your serverless endpoint supports HTTPS.

---

## 4. WhatsApp Cloud API Handshake Fails
- **Symptom**: Meta Developer Dashboard shows "The URL couldn't be validated."
- **Diagnosis**:
  1. Test your endpoint GET request directly:
     `curl "https://your-bridge.com/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=1158201444"`
  2. Verify the server returns the challenge string directly in plain text with status 200.
