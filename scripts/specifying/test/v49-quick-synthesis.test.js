import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  V49_QUICK_SYNTHESIS_ARTIFACT_PATH,
  V49_QUICK_SYNTHESIS_PIPELINE_NAMES,
  V49_QUICK_SYNTHESIS_SCHEMA_ID,
  buildV49QuickSynthesis,
} from '../src/canonical/v49-quick-synthesis.js';

test('V49 quick synthesis binds one-call QUICK pipelines and mode law', () => {
  const report = buildV49QuickSynthesis();

  assert.equal(V49_QUICK_SYNTHESIS_ARTIFACT_PATH, '.proofs/v49/quick-synthesis.json');
  assert.equal(report.schemaId, V49_QUICK_SYNTHESIS_SCHEMA_ID);
  assert.equal(report.version, 'V49');
  assert.equal(report.currentTarget, 'V48');
  assert.deepEqual(report.pipelineNames, [...V49_QUICK_SYNTHESIS_PIPELINE_NAMES]);
  assert.deepEqual(report.modes, ['rich', 'quick', 'demonstration']);
  assert.equal(report.modelCallsPerRun, 1);
  if (!report.passed) {
    assert.fail(`predicates failed: ${report.coverage.failedPredicateIds.join(', ')}`);
  }
  assert.equal(report.coverage.singleModelCallEnforced, true);
});

test('V49 quick synthesis artifact stays source-safe', () => {
  const report = buildV49QuickSynthesis();
  assert.equal(report.coverage.sourceSafeMetadataOnly, true);
  assert.equal(report.coverage.rawPromptVisible, false);
  assert.equal(report.coverage.rawProviderResponseVisible, false);
  for (const sourceRoot of Object.values(report.sourceRoots)) {
    assert.match(sourceRoot, /:[0-9a-f]{24}$/u);
  }
});
