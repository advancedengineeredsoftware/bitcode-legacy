import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  V49_PROMOTION_READINESS_ARTIFACT_PATH,
  V49_REHEARSAL_LANES,
  buildV49PromotionReadinessReport,
  readV49RehearsalAttestation,
} from '../src/canonical/v49-promotion-readiness-report.js';

test('V49 promotion readiness binds Gates 1-6, promotion machinery, and PROVEN', () => {
  const report = buildV49PromotionReadinessReport();
  assert.equal(V49_PROMOTION_READINESS_ARTIFACT_PATH, '.proofs/v49/promotion-readiness-report.json');
  assert.deepEqual(report.gates.map((gate) => gate.gate), [1, 2, 3, 4, 5, 6]);
  if (!report.passed) {
    assert.fail(`predicates failed: ${report.coverage.failedPredicateIds.join(', ')}`);
  }
  assert.equal(report.promotion.valueBearingMainnetAdmitted, false);
  assert.deepEqual(report.promotion.postPromotionPosture, { pointer: 'V49', activeCanon: 'V49', draftTarget: 'V49' });
});

test('promotion stays blocked until every rehearsal lane passes and the attestation is signed', () => {
  const pending = readV49RehearsalAttestation(
    ['- Attested by: _(operator)_', '- Attested at: _(ISO date)_', ...V49_REHEARSAL_LANES.map((id) => `| ${id} | req | pending | |`)].join('\n'),
  );
  assert.equal(pending.attested, false);
  assert.equal(pending.attestedBy, null);

  const partial = readV49RehearsalAttestation(
    [
      '- Attested by: Operator',
      '- Attested at: 2026-10-20',
      ...V49_REHEARSAL_LANES.map((id, index) => `| ${id} | req | ${index === 0 ? 'pending' : 'passed'} | run |`),
    ].join('\n'),
  );
  assert.equal(partial.attested, false);

  const signed = readV49RehearsalAttestation(
    ['- Attested by: Operator', '- Attested at: 2026-10-20', ...V49_REHEARSAL_LANES.map((id) => `| ${id} | req | passed | run |`)].join('\n'),
  );
  assert.equal(signed.attested, true);
  // The attestation records presence, never the operator's identity.
  assert.equal(signed.attestedBy, 'present');
});
