// @ts-check

/**
 * V49 Gate 5 — Benchmark-delta Relatives proof builder.
 *
 * Gate 5 binds the repository-declared benchmark manifest, the selection route
 * and UI, the Host benchmark runner, the reading law, and the Relative
 * subfamily mass law (with its settlement BTD mirror) into rich and quick
 * reads. Predicates bind source, tests, the fixture repository, living CI, and
 * SPEC law; the artifact is source-safe metadata only.
 */

import crypto from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');

export const V49_BENCHMARK_DELTA_RELATIVES_ARTIFACT_PATH = '.proofs/v49/benchmark-delta-relatives.json';
export const V49_BENCHMARK_DELTA_RELATIVES_SCHEMA_ID = 'bitcode.v49.benchmarkDeltaRelatives.v1';
export const V49_BENCHMARK_DELTA_RELATIVES_VERSION = 'V49';
export const V49_BENCHMARK_DELTA_RELATIVES_CURRENT_TARGET = 'V48';
export const V49_BENCHMARK_DELTA_RELATIVES_SOURCE_SAFETY_VERDICT = 'source-safe-benchmark-delta-relatives';
export const V49_BENCHMARK_MANIFEST_PATH = '.bitcode/benchmarks.json';
export const V49_RELATIVE_SUBFAMILY_MASS_TABLE = Object.freeze({
  static: Object.freeze({ static: 1 }),
  'static+inferred': Object.freeze({ static: 0.6, inferred: 0.4 }),
  'static+benchmark': Object.freeze({ static: 0.6, benchmark: 0.4 }),
  'static+inferred+benchmark': Object.freeze({ static: 0.4, inferred: 0.3, benchmark: 0.3 }),
});

const MASS_TABLE_LINES = [
  "static: { static: 1 },",
  "'static+inferred': { static: 0.6, inferred: 0.4 },",
  "'static+benchmark': { static: 0.6, benchmark: 0.4 },",
  "'static+inferred+benchmark': { static: 0.4, inferred: 0.3, benchmark: 0.3 },",
];

const SOURCE_ROOTS = Object.freeze({
  spec: '.specifications/BITCODE_SPEC_V49.md',
  manifest: 'packages/generic-measurements/relatives/src/benchmark-delta/benchmark-manifest.ts',
  reading: 'packages/generic-measurements/relatives/src/benchmark-delta/benchmark-reading.ts',
  selection: 'packages/generic-measurements/relatives/src/benchmark-delta/benchmark-selection.ts',
  masses: 'packages/generic-measurements/relatives/src/relative-subfamily-masses.ts',
  catalog: 'packages/generic-measurements/relatives/src/relatives-catalog.ts',
  relativesPackage: 'packages/generic-measurements/relatives/package.json',
  benchmarkTest: 'packages/generic-measurements/relatives/src/__tests__/benchmark-delta.test.ts',
  massesTest: 'packages/generic-measurements/relatives/src/__tests__/relative-subfamily-masses.test.ts',
  btdMirror: 'packages/btd/src/erc1155/settlement-btd-from-relatives.ts',
  btdTest: 'packages/btd/__tests__/settlement-btd-benchmark-relatives.test.ts',
  runner: 'packages/pipeline-hosts/src/benchmark-runner.ts',
  runnerTest: 'packages/pipeline-hosts/src/__tests__/benchmark-runner.test.ts',
  fixtureManifest: '.fixtures/benchmark-repo/.bitcode/benchmarks.json',
  fixtureLookup: '.fixtures/benchmark-repo/src/lookup.js',
  readValidation: 'packages/asset-packs-pipelines/syntheses/read/src/agents/validation/read-ready-to-finish-agent.ts',
  settleParser: 'packages/asset-packs-pipelines/settle/src/parse-settle-option.ts',
  settlePipeline: 'packages/asset-packs-pipelines/settle/src/index.ts',
  settleTest: 'packages/asset-packs-pipelines/settle/src/__tests__/settle-benchmark-relatives.test.ts',
  uapiLib: 'apps/uapi/lib/read-benchmarks.ts',
  benchmarksRoute: 'apps/uapi/app/api/read/benchmarks/route.ts',
  benchmarksRouteTest: 'apps/uapi/tests/api/readBenchmarksRoute.test.ts',
  synthesizeRoute: 'apps/uapi/app/api/read/synthesize-options/route.ts',
  synthesizeRouteTest: 'apps/uapi/tests/api/readSynthesizeOptionsRoute.test.ts',
  dispatcher: 'apps/uapi/app/api/read/synthesize-options/dispatch-read-synthesis.ts',
  picker: 'apps/uapi/components/reads/ReadsEvaluationBenchmarkPicker/ReadsEvaluationBenchmarkPicker.tsx',
  composePanel: 'apps/uapi/components/reads/ReadsEvaluationComposePanel/ReadsEvaluationComposePanel.tsx',
  synthesisHook: 'apps/uapi/components/reads/ReadPageClient/hooks/use-read-option-synthesis.ts',
  optionCard: 'apps/uapi/components/reads/ReadsOptionCard/ReadsOptionCard.tsx',
  uapiTest: 'apps/uapi/tests/readBenchmarkDeltas.test.tsx',
  localCi: 'scripts/run-bitcode-local-ci.mjs',
  packageJson: 'package.json',
  protocolIndex: 'scripts/specifying/src/index.js',
  protocolTypes: 'scripts/specifying/src/index.d.ts',
  generator: 'scripts/generate-v49-benchmark-delta-relatives.mjs',
  checker: 'scripts/check-v49-gate5-benchmark-delta-relatives.mjs',
  protocolTest: 'scripts/specifying/test/v49-benchmark-delta-relatives.test.js',
});

function digest(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, 24);
}

function readSource(repoRoot, sourcePath) {
  const absolutePath = path.join(repoRoot, sourcePath);
  return existsSync(absolutePath) ? readFileSync(absolutePath, 'utf8') : '';
}

function predicateResult(id, sourcePath, passed) {
  return { id, sourcePath, passed: Boolean(passed) };
}

/**
 * @param {string} repoRoot
 */
function buildPredicateResults(repoRoot) {
  /** @type {Record<string, string>} */
  const s = Object.fromEntries(
    Object.entries(SOURCE_ROOTS).map(([key, sourcePath]) => [key, readSource(repoRoot, sourcePath)]),
  );
  return [
    predicateResult(
      'manifest-declared-fail-closed',
      SOURCE_ROOTS.manifest,
      s.manifest.includes(`BENCHMARK_MANIFEST_PATH = '${V49_BENCHMARK_MANIFEST_PATH}'`) &&
        s.manifest.includes('unknown field') &&
        s.manifest.includes('needs a capture group') &&
        s.benchmarkTest.includes('fails closed on %s'),
    ),
    predicateResult(
      'reading-law-clamp-and-statuses',
      SOURCE_ROOTS.reading,
      s.reading.includes('clamp01(0.5 + improvementRatio / (2 * cap))') &&
        s.reading.includes('BENCHMARK_DELTA_DEFAULT_CAP = 0.5') &&
        s.reading.includes("'budget_exhausted' ? 'not_run' : 'insufficient_evidence'") &&
        s.benchmarkTest.includes('measures signed improvement with the clamp formula'),
    ),
    predicateResult(
      'kind-pattern-law',
      SOURCE_ROOTS.masses,
      s.masses.includes('export function assertRelativeKindPattern') &&
        s.readValidation.includes('assertRelativeKindPattern') &&
        !s.readValidation.includes('assertRelativeKindSuffix(') &&
        s.massesTest.includes('admits -fit and benchmark-delta kinds only'),
    ),
    predicateResult(
      'subfamily-masses-bound-in-both-tables',
      SOURCE_ROOTS.btdMirror,
      MASS_TABLE_LINES.every((line) => s.masses.includes(line) && s.btdMirror.includes(line)) &&
        s.catalog.includes('applyRelativeSubfamilyMasses') &&
        s.massesTest.includes('matches the SPEC mass table') &&
        s.btdTest.includes('applies the three-subfamily masses'),
    ),
    predicateResult(
      'failed-benchmarks-weigh-zero',
      SOURCE_ROOTS.btdMirror,
      s.masses.includes("isBenchmarkDeltaKind(row.measurementKind) && row.weight === 0") &&
        s.btdMirror.includes('BENCHMARK_DELTA_KIND_PATTERN.test(kind) && row.weight === 0') &&
        s.settleParser.includes('RELATIVE_STATUSES') &&
        s.settleTest.includes('mints from the measured benchmark and never from the failed one'),
    ),
    predicateResult(
      'runner-host-workspace-and-budget',
      SOURCE_ROOTS.runner,
      s.runner.includes('export async function runBenchmarkDeltas') &&
        s.runner.includes('BENCHMARK_DEFAULT_BUDGET_MS = 600_000') &&
        s.runner.includes('git reset --hard -q && git clean -fdq') &&
        s.runner.includes('exec env -i PATH="$PATH" HOME="$HOME"') &&
        s.runner.includes('DEPENDENCY_MANIFEST_BASENAMES'),
    ),
    predicateResult(
      'fixture-proves-positive-and-insufficient',
      SOURCE_ROOTS.runnerTest,
      s.fixtureManifest.includes('"render-throughput"') &&
        s.fixtureLookup.includes('Linear scan') &&
        s.runnerTest.includes('measures a positive delta') &&
        s.runnerTest.includes("failureClass: 'baseline_failed'") &&
        s.runnerTest.includes('marks runs not_run once the budget is exhausted'),
    ),
    predicateResult(
      'selection-route-source-safe',
      SOURCE_ROOTS.benchmarksRoute,
      s.benchmarksRoute.includes('describeReadBenchmarks') &&
        s.uapiLib.includes('toBenchmarkDescriptors') &&
        s.benchmarksRouteTest.includes("not.toContain('pnpm')"),
    ),
    predicateResult(
      'selection-union-restricted-to-declared',
      SOURCE_ROOTS.selection,
      s.selection.includes('export function resolveSelectedBenchmarkIds') &&
        s.selection.includes('export function benchmarkIdsReferencedInText') &&
        s.uapiLib.includes('benchmarkIdsReferencedInText(declared, input.evaluation)') &&
        s.uapiTest.includes('unions checked, synthesized, and Evaluation-named ids'),
    ),
    predicateResult(
      'request-carries-benchmark-ids',
      SOURCE_ROOTS.synthesizeRoute,
      s.synthesizeRoute.includes('parseRequestedBenchmarkIds(body.benchmarkIds)') &&
        s.synthesizeRoute.includes("'invalid_benchmark_ids'") &&
        s.synthesisHook.includes('benchmarkSelectionRequestField') &&
        s.synthesizeRouteTest.includes('records and dispatches reader-checked benchmarkIds'),
    ),
    predicateResult(
      'picker-in-evaluations-panel',
      SOURCE_ROOTS.picker,
      s.picker.includes('Measure improvement on…') &&
        s.composePanel.includes('ReadsEvaluationBenchmarkPicker') &&
        s.uapiTest.includes('lists declared benchmarks and carries checked ids'),
    ),
    predicateResult(
      'rich-and-quick-measured-post-synthesis',
      SOURCE_ROOTS.dispatcher,
      s.dispatcher.includes('runReadBenchmarkStage') &&
        s.dispatcher.includes("(execution as any).get?.('read', 'benchmarkIds')") &&
        s.dispatcher.includes('declaredBenchmarkIds:') &&
        s.dispatcher.includes('benchmarkReceipt') &&
        s.uapiLib.includes('toUnpaidReadOptionsPresentation(fullOptions'),
    ),
    predicateResult(
      'unpaid-projection-stays-source-safe',
      SOURCE_ROOTS.uapiTest,
      s.uapiTest.includes('unpaidOptionContainsForbiddenFields(unpaid)).toBe(false)') &&
        s.uapiTest.includes("not.toHaveProperty('rowsByOption')"),
    ),
    predicateResult(
      'option-card-and-pr-show-deltas',
      SOURCE_ROOTS.optionCard,
      s.optionCard.includes('reads-option-benchmark-delta-row') &&
        s.settlePipeline.includes('export function formatSettleReceiptRelative') &&
        s.settleTest.includes('prints baseline → candidate in the PR receipt'),
    ),
    predicateResult(
      'living-ci-runs-benchmark-tests',
      SOURCE_ROOTS.localCi,
      s.localCi.includes("'gate-test-benchmark-delta-relatives'"),
    ),
    predicateResult(
      'spec-carries-benchmark-law',
      SOURCE_ROOTS.spec,
      ['### B-1 Benchmark manifest', '### B-4 Reading', '### B-5a Realization map (binding paths)', '### B-6 Completion'].every(
        (heading) => s.spec.includes(heading),
      ),
    ),
    predicateResult(
      'package-exports-benchmark-law',
      SOURCE_ROOTS.relativesPackage,
      s.relativesPackage.includes('"./benchmark-delta"') && s.relativesPackage.includes('"./relative-subfamily-masses"'),
    ),
    predicateResult(
      'package-json-exposes-gate5',
      SOURCE_ROOTS.packageJson,
      s.packageJson.includes('"generate:v49-benchmark-delta-relatives"') && s.packageJson.includes('"check:v49-gate5"'),
    ),
    predicateResult(
      'protocol-exports-gate5',
      SOURCE_ROOTS.protocolIndex,
      s.protocolIndex.includes('buildV49BenchmarkDeltaRelatives') && s.protocolTypes.includes('buildV49BenchmarkDeltaRelatives'),
    ),
    predicateResult(
      'generator-checker-test-exist',
      SOURCE_ROOTS.generator,
      s.generator.includes('buildV49BenchmarkDeltaRelatives') &&
        s.checker.includes('V49 Gate 5 benchmark-delta Relatives check') &&
        s.protocolTest.includes('buildV49BenchmarkDeltaRelatives'),
    ),
  ];
}

export function buildV49BenchmarkDeltaRelatives({ repoRoot = DEFAULT_REPO_ROOT } = {}) {
  const predicateResults = buildPredicateResults(repoRoot);
  const failedPredicateIds = predicateResults.filter((p) => !p.passed).map((p) => p.id);
  const sourceRoots = Object.fromEntries(
    Object.entries(SOURCE_ROOTS).map(([key, sourcePath]) => [key, `${sourcePath}:${digest(readSource(repoRoot, sourcePath))}`]),
  );
  const artifactRoot = `v49-benchmark-delta-relatives:${digest(JSON.stringify({ sourceRoots }))}`;
  return {
    artifactId: 'v49-benchmark-delta-relatives',
    schemaId: V49_BENCHMARK_DELTA_RELATIVES_SCHEMA_ID,
    version: V49_BENCHMARK_DELTA_RELATIVES_VERSION,
    currentTarget: V49_BENCHMARK_DELTA_RELATIVES_CURRENT_TARGET,
    artifactPath: V49_BENCHMARK_DELTA_RELATIVES_ARTIFACT_PATH,
    sourceSafetyVerdict: V49_BENCHMARK_DELTA_RELATIVES_SOURCE_SAFETY_VERDICT,
    manifestPath: V49_BENCHMARK_MANIFEST_PATH,
    relativeKindPatterns: ['^[a-z0-9-]+-fit$', '^benchmark-delta:[a-z0-9][a-z0-9._-]*$'],
    readingLaw: 'volume = clamp01(0.5 + improvementRatio / (2 * cap)); cap default 0.5; magnitude = improvementRatio * 100',
    subfamilyMassTable: V49_RELATIVE_SUBFAMILY_MASS_TABLE,
    predicateResults,
    sourceRoots,
    artifactRoot,
    coverage: {
      requiredPredicateCount: predicateResults.length,
      passedPredicateCount: predicateResults.length - failedPredicateIds.length,
      failedPredicateIds,
      declaredBenchmarksOnly: true,
      failedBenchmarksWeighZero: true,
      sourceSafeMetadataOnly: true,
      benchmarkOutputVisible: false,
      operatorSecretsInBenchmarkEnv: false,
      protectedSourceVisible: false,
    },
    passed: failedPredicateIds.length === 0,
  };
}

export const V49_BENCHMARK_DELTA_RELATIVES_SOURCE_ROOTS = Object.freeze({ ...SOURCE_ROOTS });
