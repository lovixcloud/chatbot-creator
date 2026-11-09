/**
 * Multi-Channel Integration & Adapter Tests
 */

import assert from 'node:assert';
import { TelegramAdapter } from '../chatbot/adapters/telegram.js';
import { WhatsAppAdapter } from '../chatbot/adapters/whatsapp.js';
import { GenericWebhookAdapter } from '../chatbot/adapters/generic-webhook.js';
import { handleTelegramWebhook } from '../integrations/serverless/telegram-webhook.js';
import { handleWhatsAppWebhook } from '../integrations/serverless/whatsapp-webhook.js';
import { ConfigManager } from '../assets/js/config-manager.js';

console.log('--- Running Multi-Channel Integration Tests ---');

const config = ConfigManager.createDefault('customer_support', 'MultiChannel Bot');
config.integrations.telegram.enabled = true;
config.integrations.telegram.botUsername = 'MyEnterpriseBot';
config.integrations.telegram.bridgeEndpoint = 'https://bridge.example.com/api';

config.integrations.whatsapp.enabled = true;
config.integrations.whatsapp.phoneNumberId = '1029384756';
config.integrations.whatsapp.bridgeEndpoint = 'https://bridge.example.com/api';

// Test 1: Telegram Adapter validation and formatting
const tgAdapter = new TelegramAdapter(config);
const tgVal = tgAdapter.validateConfiguration();
assert.strictEqual(tgVal.valid, true);

const tgPayload = tgAdapter.formatTelegramPayload('12345678', 'Hello Telegram', {
  options: ['Option A', 'Option B']
});
assert.strictEqual(tgPayload.chat_id, '12345678');
assert.strictEqual(tgPayload.text, 'Hello Telegram');
assert.strictEqual(tgPayload.reply_markup.inline_keyboard.length, 2);
console.log('✓ Telegram adapter formats inline keyboard payloads correctly');

// Test 2: Telegram Update Normalization
const rawTgUpdate = {
  update_id: 10001,
  message: {
    message_id: 42,
    from: { id: 87654, username: 'tester' },
    chat: { id: 87654 },
    text: 'What are your business hours?'
  }
};
const normTg = tgAdapter.normalizeIncomingMessage(rawTgUpdate);
assert.strictEqual(normTg.senderId, '87654');
assert.strictEqual(normTg.text, 'What are your business hours?');
console.log('✓ Telegram update normalizer extracts sender and text');

// Test 3: WhatsApp Cloud API Update Normalization
const waAdapter = new WhatsAppAdapter(config);
const rawWaPayload = {
  entry: [{
    changes: [{
      value: {
        messages: [{
          from: '14155552671',
          id: 'wamid.HBgL',
          type: 'text',
          text: { body: 'What are your business hours?' }
        }]
      }
    }]
  }]
};
const normWa = waAdapter.normalizeIncomingMessage(rawWaPayload);
assert.strictEqual(normWa.senderId, '14155552671');
assert.strictEqual(normWa.text, 'What are your business hours?');
console.log('✓ WhatsApp webhook normalizer handles Cloud API messages');

// Test 4: Serverless WhatsApp Verification Challenge (GET)
const challengeReq = {
  method: 'GET',
  query: {
    'hub.mode': 'subscribe',
    'hub.verify_token': 'my_secure_token_123',
    'hub.challenge': 'challenge_code_abc'
  }
};
const waChallengeRes = await handleWhatsAppWebhook(challengeReq, config, null, 'my_secure_token_123');
assert.strictEqual(waChallengeRes.statusCode, 200);
assert.strictEqual(waChallengeRes.body, 'challenge_code_abc');
console.log('✓ WhatsApp webhook verification handshake succeeds');

// Test 5: Serverless Telegram Webhook Secret Token Protection
const unauthorizedTgReq = {
  method: 'POST',
  headers: { 'x-telegram-bot-api-secret-token': 'wrong_token' },
  body: rawTgUpdate
};
const tgSecRes = await handleTelegramWebhook(unauthorizedTgReq, config, null, 'correct_secret_token');
assert.strictEqual(tgSecRes.statusCode, 403, 'Webhook with invalid secret token must be rejected with 403');
console.log('✓ Telegram secret token protects unauthorized webhook invocations');

// Test 6: Generic Webhook Adapter
config.integrations.webhook.enabled = true;
config.integrations.webhook.endpointUrl = 'https://webhook.example.com/events';
const whAdapter = new GenericWebhookAdapter(config);
assert.strictEqual(whAdapter.validateConfiguration().valid, true);
console.log('✓ Generic webhook adapter validates destination endpoint');

console.log('All Multi-Channel Integration Tests Passed!\n');
