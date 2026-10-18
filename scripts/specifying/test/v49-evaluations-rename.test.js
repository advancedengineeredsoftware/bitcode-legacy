import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  V49_EVALUATIONS_RENAME_ARTIFACT_PATH,
  V49_EVALUATIONS_RENAME_MIGRATION_PATH,
  V49_EVALUATIONS_RENAME_SCHEMA_ID,
  buildV49EvaluationsRename,
  isLivingRenameScopePath,
  residualNeedVocabulary,
} from '../src/canonical/v49-evaluations-rename.js';

test('V49 Evaluations rename leaves no V48 vocabulary in living source', () => {
  const report = buildV49EvaluationsRename();

  assert.equal(V49_EVALUATIONS_RENAME_ARTIFACT_PATH, '.proofs/v49/evaluations-rename.json');
  assert.equal(report.schemaId, V49_EVALUATIONS_RENAME_SCHEMA_ID);
  assert.equal(report.version, 'V49');
  assert.equal(report.currentTarget, 'V48');
  assert.equal(report.migrationPath, V49_EVALUATIONS_RENAME_MIGRATION_PATH);
  assert.deepEqual(report.vocabularyScan.offendingFiles, []);
  if (!report.passed) {
    assert.fail(`predicates failed: ${report.coverage.failedPredicateIds.join(', ')}`);
  }
  assert.equal(report.coverage.dualReadPresent, false);
});

test('residual scan flags V48 product vocabulary but not English or history', () => {
  assert.deepEqual(residualNeedVocabulary('const needFit = 1; // readNeed'), ['needFit', 'readNeed']);
  assert.deepEqual(residualNeedVocabulary('Callers need a session; needs review.'), []);
  assert.deepEqual(residualNeedVocabulary("import '../check-v39-gate4-read-need-review-resynthesis.mjs'"), []);
  assert.deepEqual(residualNeedVocabulary('V38_READ_NEED_COMPREHENSION_HARDENING_ROWS'), []);
  assert.deepEqual(residualNeedVocabulary("store('read/need', 'current')"), ['read/need']);
});

test('living rename scope excludes frozen history', () => {
  assert.equal(isLivingRenameScopePath('packages/btd/src/index.ts'), true);
  assert.equal(isLivingRenameScopePath('scripts/run-bitcode-local-ci.mjs'), true);
  assert.equal(isLivingRenameScopePath('scripts/check-v28-gate10-read-need-comprehension.mjs'), false);
  assert.equal(isLivingRenameScopePath('.specifications/BITCODE_SPEC_V48.md'), false);
  assert.equal(isLivingRenameScopePath('supabase/migrations/20260720120000_depository_search_index.sql'), false);
});
