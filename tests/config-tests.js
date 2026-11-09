/**
 * Configuration & Schema Validation Tests
 */

import assert from 'node:assert';
import fs from 'node:fs';
import { ConfigValidator } from '../assets/js/validation.js';
import { ConfigManager } from '../assets/js/config-manager.js';

console.log('--- Running Config & Schema Tests ---');

// Test 1: Validate default config
const defaultConfig = ConfigManager.createDefault('customer_support', 'Test Bot');
const res = ConfigValidator.validate(defaultConfig);
assert.strictEqual(res.valid, true, `Default config should be valid. Errors: ${res.errors.join(', ')}`);
console.log('✓ Default configuration is fully schema-compliant');

// Test 2: Detect missing required fields
const invalidConfig = { ...defaultConfig };
delete invalidConfig.identity;
const invRes = ConfigValidator.validate(invalidConfig);
assert.strictEqual(invRes.valid, false, 'Config missing identity should fail');
assert.ok(invRes.errors.some(e => e.includes('identity')), 'Should report missing identity');
console.log('✓ Missing required fields properly flagged');

// Test 3: Detect invalid hex colors
const badColorConfig = JSON.parse(JSON.stringify(defaultConfig));
badColorConfig.appearance.primaryColor = 'invalid-color';
const colorRes = ConfigValidator.validate(badColorConfig);
assert.strictEqual(colorRes.valid, false, 'Invalid color format must fail validation');
console.log('✓ Invalid appearance colors properly flagged');

// Test 4: Clone configuration
const cloned = ConfigManager.clone(defaultConfig, 'Cloned Assistant');
assert.notStrictEqual(cloned.id, defaultConfig.id, 'Cloned bot must have new unique ID');
assert.strictEqual(cloned.name, 'Cloned Assistant');
assert.strictEqual(cloned.status, 'draft');
console.log('✓ Configuration cloning creates isolated copy with fresh ID');

// Test 5: CSV Knowledge Base Import/Export
const csv = ConfigManager.exportKbToCsv(defaultConfig.knowledgeBase);
assert.ok(csv.includes('What are your business hours?'), 'CSV must contain question text');
const imported = ConfigManager.importKbFromCsv(csv);
assert.strictEqual(imported.length, defaultConfig.knowledgeBase.length, 'CSV roundtrip item count matches');
assert.strictEqual(imported[0].question, defaultConfig.knowledgeBase[0].question);
console.log('✓ Knowledge Base CSV export and import roundtrip is accurate');

console.log('All Config & Schema Tests Passed!\n');
