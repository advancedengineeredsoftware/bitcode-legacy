import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  V49_CLIENT_PAYOUT_IDENTITY_FIELDS,
  V49_SETTLEMENT_COMPLETION_ARTIFACT_PATH,
  V49_SETTLEMENT_COMPLETION_SCHEMA_ID,
  buildV49SettlementCompletion,
} from '../src/canonical/v49-settlement-completion.js';

test('V49 settlement completion binds fee, slices, finalize, viewers, and redelivery', () => {
  const report = buildV49SettlementCompletion();

  assert.equal(V49_SETTLEMENT_COMPLETION_ARTIFACT_PATH, '.proofs/v49/settlement-completion.json');
  assert.equal(report.schemaId, V49_SETTLEMENT_COMPLETION_SCHEMA_ID);
  assert.equal(report.version, 'V49');
  assert.equal(report.currentTarget, 'V48');
  assert.equal(report.defaultProtocolCoinFeeBps, 500);
  assert.deepEqual(report.clientPayoutIdentityFields, [...V49_CLIENT_PAYOUT_IDENTITY_FIELDS]);
  if (!report.passed) {
    assert.fail(`predicates failed: ${report.coverage.failedPredicateIds.join(', ')}`);
  }
  assert.equal(report.coverage.onChainSellerTransfers, false);
});

test('V49 settlement completion artifact stays source-safe', () => {
  const report = buildV49SettlementCompletion();
  assert.equal(report.coverage.sourceSafeMetadataOnly, true);
  assert.equal(report.coverage.walletPrivateMaterialVisible, false);
  assert.equal(report.coverage.settlementPrivatePayloadVisible, false);
  for (const sourceRoot of Object.values(report.sourceRoots)) {
    assert.match(sourceRoot, /:[0-9a-f]{24}$/u);
  }
});
