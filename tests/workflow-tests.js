/**
 * Workflow Engine & Branching Dialog Tests
 */

import assert from 'node:assert';
import { WorkflowEngine } from '../chatbot/workflow-engine.js';
import { ChatbotRuntime } from '../chatbot/runtime.js';
import { ConfigManager } from '../assets/js/config-manager.js';

console.log('--- Running Workflow Engine Tests ---');

const config = ConfigManager.createDefault('customer_support', 'Workflow Bot');
const runtime = new ChatbotRuntime(config);

// Test 1: Trigger workflow
const startStep = await runtime.processMessage('submit_ticket');
assert.strictEqual(startStep.type, 'flow_step');
assert.strictEqual(startStep.step.id, 'step_1');
console.log('✓ Workflow triggers on button/keyword event');

// Test 2: Input step progression & validation failure
const invalidEmail = await runtime.processMessage('My screen is broken');
assert.strictEqual(invalidEmail.type, 'flow_step'); // advanced to step_2 (email input)

const badEmailAttempt = await runtime.processMessage('not-an-email');
assert.strictEqual(badEmailAttempt.type, 'validation_error');
console.log('✓ Email input validation rejects invalid formats');

// Test 3: Input success advances to step_3 (confirmation message)
const goodEmail = await runtime.processMessage('alice@example.com');
assert.strictEqual(goodEmail.type, 'flow_step');
assert.strictEqual(goodEmail.step.id, 'step_3');
assert.strictEqual(runtime.state.variables['user_email'], 'alice@example.com');
console.log('✓ Workflow records captured variables and advances');

// Test 4: Continuing past step_3 finishes the flow
const completion = await runtime.processMessage('thank you');
assert.strictEqual(completion.type, 'flow_end');
console.log('✓ Workflow reaches flow_end termination');

console.log('All Workflow Engine Tests Passed!\n');
