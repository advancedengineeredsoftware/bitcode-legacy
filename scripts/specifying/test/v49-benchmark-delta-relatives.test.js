import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  V49_BENCHMARK_DELTA_RELATIVES_ARTIFACT_PATH,
  V49_BENCHMARK_DELTA_RELATIVES_SCHEMA_ID,
  V49_RELATIVE_SUBFAMILY_MASS_TABLE,
  buildV49BenchmarkDeltaRelatives,
} from '../src/canonical/v49-benchmark-delta-relatives.js';

test('V49 benchmark-delta Relatives bind manifest, reading, masses, runner, and selection', () => {
  const report = buildV49BenchmarkDeltaRelatives();

  assert.equal(V49_BENCHMARK_DELTA_RELATIVES_ARTIFACT_PATH, '.proofs/v49/benchmark-delta-relatives.json');
  assert.equal(report.schemaId, V49_BENCHMARK_DELTA_RELATIVES_SCHEMA_ID);
  assert.equal(report.version, 'V49');
  assert.equal(report.currentTarget, 'V48');
  assert.equal(report.manifestPath, '.bitcode/benchmarks.json');
  assert.deepEqual(report.subfamilyMassTable, V49_RELATIVE_SUBFAMILY_MASS_TABLE);
  if (!report.passed) {
    assert.fail(`predicates failed: ${report.coverage.failedPredicateIds.join(', ')}`);
  }
  assert.equal(report.coverage.declaredBenchmarksOnly, true);
  assert.equal(report.coverage.failedBenchmarksWeighZero, true);
});

test('V49 benchmark-delta Relatives artifact stays source-safe', () => {
  const report = buildV49BenchmarkDeltaRelatives();
  assert.equal(report.coverage.sourceSafeMetadataOnly, true);
  assert.equal(report.coverage.benchmarkOutputVisible, false);
  assert.equal(report.coverage.operatorSecretsInBenchmarkEnv, false);
  for (const sourceRoot of Object.values(report.sourceRoots)) {
    assert.match(sourceRoot, /:[0-9a-f]{24}$/u);
  }
});
