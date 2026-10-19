import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  V49_CLAUDE_EXTERNAL_ARTIFACT_PATH,
  V49_CLAUDE_EXTERNAL_SCHEMA_ID,
  V49_CLAUDE_EXTERNAL_TOOLS,
  buildV49ClaudeExternal,
} from '../src/canonical/v49-claude-external.js';

test('V49 Claude External binds remote MCP, OAuth 2.1, card, plugin, and API keys', () => {
  const report = buildV49ClaudeExternal();

  assert.equal(V49_CLAUDE_EXTERNAL_ARTIFACT_PATH, '.proofs/v49/claude-external.json');
  assert.equal(report.schemaId, V49_CLAUDE_EXTERNAL_SCHEMA_ID);
  assert.equal(report.version, 'V49');
  assert.equal(report.currentTarget, 'V48');
  assert.deepEqual(report.tools, [...V49_CLAUDE_EXTERNAL_TOOLS]);
  assert.deepEqual(report.scopes, ['deposits', 'reads', 'packs']);
  assert.deepEqual(report.oauthLaw.codeChallengeMethods, ['S256']);
  if (!report.passed) {
    assert.fail(`predicates failed: ${report.coverage.failedPredicateIds.join(', ')}`);
  }
});

test('V49 Claude External artifact stays source-safe', () => {
  const report = buildV49ClaudeExternal();
  assert.equal(report.coverage.anthropicCredentialsStored, false);
  assert.equal(report.coverage.plaintextTokensStored, false);
  assert.equal(report.coverage.sourceSafeMetadataOnly, true);
  for (const sourceRoot of Object.values(report.sourceRoots)) {
    assert.match(sourceRoot, /:[0-9a-f]{24}$/u);
  }
});
