import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  V49_ACCEPTED_DECISION_TOKENS,
  V49_GATE_IDS,
  V49_OPENING_CHARTER_ARTIFACT_PATH,
  V49_OPENING_CHARTER_FORBIDDEN_PAYLOAD_IDS,
  V49_OPENING_CHARTER_SCHEMA_ID,
  V49_OPENING_CHARTER_SOURCE_SAFETY_VERDICT,
  V49_REFORM_CHAPTER_HEADINGS,
  buildV49OpeningCharter,
  livingNeedVocabularyLines,
} from '../src/canonical/v49-opening-charter.js';

test('V49 opening charter binds the draft family and gate plan', () => {
  const report = buildV49OpeningCharter();

  assert.equal(V49_OPENING_CHARTER_ARTIFACT_PATH, '.proofs/v49/opening-charter.json');
  assert.equal(report.artifactId, 'v49-opening-charter');
  assert.equal(report.schemaId, V49_OPENING_CHARTER_SCHEMA_ID);
  assert.equal(report.version, 'V49');
  assert.equal(report.currentTarget, 'V48');
  assert.equal(report.sourceSafetyVerdict, V49_OPENING_CHARTER_SOURCE_SAFETY_VERDICT);
  assert.ok(report.artifactRoot.startsWith('v49-opening-charter:'));
  assert.equal(V49_GATE_IDS.length, 7);
  assert.deepEqual(report.gateIds, [...V49_GATE_IDS]);
  assert.deepEqual(report.reformChapterHeadings, [...V49_REFORM_CHAPTER_HEADINGS]);
  assert.deepEqual(report.acceptedDecisionTokens, [...V49_ACCEPTED_DECISION_TOKENS]);
  assert.deepEqual(report.forbiddenPayloadIds, [...V49_OPENING_CHARTER_FORBIDDEN_PAYLOAD_IDS]);

  if (!report.passed) {
    assert.fail(`predicates failed: ${report.coverage.failedPredicateIds.join(', ')}`);
  }
  assert.equal(report.coverage.familyOpened, true);
  assert.equal(report.coverage.postureOpened, true);
  assert.equal(report.coverage.livingCiWired, true);
});

test('V49 opening charter stays source-safe', () => {
  const report = buildV49OpeningCharter();
  const serialized = JSON.stringify(report);

  assert.equal(report.coverage.sourceSafeMetadataOnly, true);
  assert.equal(report.coverage.protectedSourceVisible, false);
  assert.equal(report.coverage.rawPromptVisible, false);
  assert.equal(report.coverage.oauthTokenMaterialVisible, false);
  assert.equal(report.coverage.valueBearingMainnetEnabled, false);
  for (const sourceRoot of Object.values(report.sourceRoots)) {
    assert.match(sourceRoot, /:[0-9a-f]{24}$/u);
  }
  assert.ok(!serialized.includes('BEGIN PRIVATE KEY'));
});

test('living Need vocabulary scan exempts rename law and explicit V48 mappings', () => {
  const spec = [
    'Readers write Evaluations.',
    'Relative replaces V48 "needinesses".',
    '| needFit | evaluationFit → mapping |',
    '## V49 Evaluations rename law (Gate 2)',
    'needinesses are renamed here.',
    '## V49 quick synthesis law (Gate 3)',
    'Quick reads compute needFit.',
  ].join('\n');

  assert.deepEqual(livingNeedVocabularyLines(spec), ['Quick reads compute needFit.']);
});
