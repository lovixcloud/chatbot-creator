/**
 * Chatbot Engine & Knowledge Matching Tests
 */

import assert from 'node:assert';
import { KnowledgeEngine } from '../chatbot/knowledge-engine.js';
import { ChatbotRuntime } from '../chatbot/runtime.js';
import { ConfigManager } from '../assets/js/config-manager.js';

console.log('--- Running Chatbot Engine & Knowledge Tests ---');

const config = ConfigManager.createDefault('customer_support', 'Support Bot');
const kb = config.knowledgeBase;

// Test 1: Exact matching
const exactMatch = KnowledgeEngine.findBestMatch('What are your business hours?', kb, 0.35);
assert.ok(exactMatch.match, 'Exact question should find a match');
assert.strictEqual(exactMatch.match.id, 'faq_hours');
assert.strictEqual(exactMatch.score, 1.0);
console.log('✓ Exact question matching returns 1.0 confidence');

// Test 2: Token overlap and keyword matching
const fuzzyMatch = KnowledgeEngine.findBestMatch('tell me your schedule and timing', kb, 0.35);
assert.ok(fuzzyMatch.match, 'Keyword query should match hours FAQ');
assert.strictEqual(fuzzyMatch.match.id, 'faq_hours');
console.log('✓ Keyword/synonym matching returns correct FAQ');

// Test 3: Unanswered query falls below threshold
const noMatch = KnowledgeEngine.findBestMatch('What is quantum physics entanglement?', kb, 0.35);
assert.strictEqual(noMatch.match, null, 'Unrelated question should yield null match');
console.log('✓ Irrelevant questions fall below confidence threshold');

// Test 4: Runtime initial greeting
const runtime = new ChatbotRuntime(config);
const greeting = runtime.initializeSession();
assert.strictEqual(greeting.type, 'greeting');
assert.ok(greeting.starters.length > 0);
console.log('✓ Runtime initializes conversation session with starters');

// Test 5: Runtime processes FAQ query
const answerReply = await runtime.processMessage('What are your business hours?');
assert.strictEqual(answerReply.type, 'faq_answer');
assert.ok(answerReply.message.text.includes('Monday through Friday'));
console.log('✓ Runtime answers FAQ inquiries accurately');

// Test 6: Runtime fallback
const fallbackReply = await runtime.processMessage('Completely random nonsense phrase 12345');
assert.strictEqual(fallbackReply.type, 'fallback');
assert.strictEqual(runtime.state.consecutiveFallbacks, 1);
console.log('✓ Runtime returns fallback on unknown questions and increments counter');

// Test 7: Auto-escalation to Human Support on keyword
const escalateReply = await runtime.processMessage('I need to speak to an agent right now');
assert.strictEqual(escalateReply.type, 'handoff');
assert.strictEqual(escalateReply.reason, 'keyword_matched');
console.log('✓ Human support handoff triggers on agent keywords');

console.log('All Chatbot Engine & Knowledge Tests Passed!\n');
