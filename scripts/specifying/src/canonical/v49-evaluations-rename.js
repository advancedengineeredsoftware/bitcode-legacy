// @ts-check

/**
 * V49 Gate 2 — Evaluations rename proof builder.
 *
 * Gate 2 renames the buyer instruction Need → Evaluation and the
 * reader-relative family needinesses → relatives across living source,
 * prompts, wire fields, product copy, tests, and stored rows (one idempotent
 * migration, no dual-read). The builder scans git-tracked living files for
 * residual V48 vocabulary and binds the migration, package move, living CI
 * step, and SPEC law. Frozen history (promoted specs, proofs, pre-V49 gate
 * scripts, frozen migrations) is outside the scan per specifying law §4.3.
 */

import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');

export const V49_EVALUATIONS_RENAME_ARTIFACT_PATH = '.proofs/v49/evaluations-rename.json';
export const V49_EVALUATIONS_RENAME_SCHEMA_ID = 'bitcode.v49.evaluationsRename.v1';
export const V49_EVALUATIONS_RENAME_VERSION = 'V49';
export const V49_EVALUATIONS_RENAME_CURRENT_TARGET = 'V48';
export const V49_EVALUATIONS_RENAME_SOURCE_SAFETY_VERDICT = 'source-safe-evaluations-rename';
export const V49_EVALUATIONS_RENAME_MIGRATION_PATH =
  'supabase/migrations/20261018120000_v49_evaluations_rename.sql';

/** Living-scope exclusions: frozen history and generated/vendored trees. */
const EXCLUDED_PREFIXES = Object.freeze([
  '.specifications/',
  '.proofs/',
  '.qa/',
  '.github/',
  '.codemods/',
  'supabase/migrations/',
  'apps/uapi/coverage/',
  'apps/uapi/tmp/',
  '.docs/BITCODE_FILESYSTEM_TLDR.md',
]);
const LIVING_SCRIPT_PREFIXES = Object.freeze(['scripts/run-bitcode-local-ci.mjs']);
const EXCLUDED_SUFFIXES = Object.freeze(['.tsbuildinfo', 'pnpm-lock.yaml', 'package-lock.json']);

/** V48 vocabulary that must not survive in living source. */
export const V49_RETIRED_VOCABULARY_PATTERN =
  /neediness|Neediness|NEEDINESS|needFit|NeedFit|need-fit|readNeed|ReadNeed|READ_NEED|read-need|read_need|read\/need|comprehend-needs|needText|needId|NeedAnchor|needAnchor|acceptedNeed|AcceptedNeed/u;

/** Tokens naming frozen historical artifacts — permitted references. */
const HISTORICAL_TOKEN_PATTERN = /[vV]\d{2}[-_A-Za-z]*(?:need|Need|NEED)|check-v\d+-gate|readneed|READNEED/u;

export const V49_EVALUATIONS_RENAME_FORBIDDEN_PAYLOAD_IDS = Object.freeze([
  'protected_source_payload',
  'raw_source_text',
  'raw_protected_prompt',
  'raw_provider_response',
  'stored_row_contents',
]);

const SOURCE_ROOTS = Object.freeze({
  spec: '.specifications/BITCODE_SPEC_V49.md',
  migration: V49_EVALUATIONS_RENAME_MIGRATION_PATH,
  relativesPackage: 'packages/generic-measurements/relatives/package.json',
  relativesCatalog: 'packages/generic-measurements/relatives/src/relatives-catalog.ts',
  measurementTypes: 'packages/measurement-generics/src/types.ts',
  settlementBtd: 'packages/btd/src/erc1155/settlement-btd-from-relatives.ts',
  readEvaluation: 'packages/asset-packs-pipelines/syntheses/read/src/read-evaluation.ts',
  // Request validation lives in the session-free dispatch core (V49 Gate 6 split).
  readRoute: 'apps/uapi/app/api/read/synthesize-options/start-read-synthesis.ts',
  composePanel:
    'apps/uapi/components/reads/ReadsEvaluationComposePanel/ReadsEvaluationComposePanel.tsx',
  optionCard: 'apps/uapi/components/reads/ReadsOptionCard/ReadsOptionCard.tsx',
  localCi: 'scripts/run-bitcode-local-ci.mjs',
  packageJson: 'package.json',
  protocolIndex: 'scripts/specifying/src/index.js',
  protocolTypes: 'scripts/specifying/src/index.d.ts',
  generator: 'scripts/generate-v49-evaluations-rename.mjs',
  checker: 'scripts/check-v49-gate2-evaluations-rename.mjs',
  protocolTest: 'scripts/specifying/test/v49-evaluations-rename.test.js',
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
 * @param {string} file
 */
export function isLivingRenameScopePath(file) {
  if (EXCLUDED_PREFIXES.some((prefix) => file.startsWith(prefix))) return false;
  if (file.startsWith('scripts/') && !LIVING_SCRIPT_PREFIXES.some((prefix) => file === prefix)) return false;
  if (EXCLUDED_SUFFIXES.some((suffix) => file.endsWith(suffix))) return false;
  return !file.includes('/dist/') && !file.includes('node_modules/');
}

/**
 * Residual V48 vocabulary in one file's text (historical-artifact tokens exempt).
 *
 * @param {string} text
 * @returns {string[]} offending tokens
 */
export function residualNeedVocabulary(text) {
  /** @type {string[]} */
  const hits = [];
  for (const match of text.matchAll(/[A-Za-z0-9_$/.-]*(?:need|Need|NEED)[A-Za-z0-9_$/.-]*/gu)) {
    const token = match[0];
    if (HISTORICAL_TOKEN_PATTERN.test(token)) continue;
    if (V49_RETIRED_VOCABULARY_PATTERN.test(token)) hits.push(token);
  }
  return hits;
}

/**
 * @param {string} repoRoot
 */
function scanLivingSource(repoRoot) {
  const files = execFileSync('git', ['ls-files'], { cwd: repoRoot, encoding: 'utf8' })
    .split('\n')
    .filter(Boolean)
    .filter(isLivingRenameScopePath);
  /** @type {Array<{ path: string, hitCount: number }>} */
  const offendingFiles = [];
  let scannedFileCount = 0;
  for (const file of files) {
    const text = readSource(repoRoot, file);
    if (!text) continue;
    scannedFileCount += 1;
    const hits = residualNeedVocabulary(text);
    if (hits.length > 0) offendingFiles.push({ path: file, hitCount: hits.length });
  }
  return { scannedFileCount, offendingFiles };
}

/**
 * @param {string} repoRoot
 * @param {{ offendingFiles: Array<{ path: string, hitCount: number }> }} scan
 */
function buildPredicateResults(repoRoot, scan) {
  /** @type {Record<string, string>} */
  const sources = Object.fromEntries(
    Object.entries(SOURCE_ROOTS).map(([key, sourcePath]) => [key, readSource(repoRoot, sourcePath)]),
  );
  return [
    predicateResult('living-source-has-no-need-vocabulary', 'git ls-files (living scope)', scan.offendingFiles.length === 0),
    predicateResult(
      'old-paths-removed',
      'packages/generic-measurements/needinesses',
      !existsSync(path.join(repoRoot, 'packages/generic-measurements/needinesses')) &&
        !existsSync(path.join(repoRoot, 'apps/uapi/components/reads/ReadsNeedComposePanel')) &&
        !existsSync(path.join(repoRoot, 'packages/btd/src/erc1155/settlement-btd-from-needinesses.ts')),
    ),
    predicateResult(
      'relatives-package-renamed',
      SOURCE_ROOTS.relativesPackage,
      sources.relativesPackage.includes('"@bitcode/generic-measurements-relatives"') &&
        sources.relativesCatalog.includes('ASSET_PACK_RELATIVES_CATALOG'),
    ),
    predicateResult(
      'measurement-category-relative',
      SOURCE_ROOTS.measurementTypes,
      sources.measurementTypes.includes("'relative'") && !sources.measurementTypes.includes("'neediness'"),
    ),
    predicateResult(
      'settlement-btd-from-relatives',
      SOURCE_ROOTS.settlementBtd,
      sources.settlementBtd.includes('computeSettlementBtdFromRelatives'),
    ),
    predicateResult(
      'read-route-accepts-evaluation-only',
      SOURCE_ROOTS.readRoute,
      sources.readRoute.includes('body.evaluation') && !/body\.needs?\b/u.test(sources.readRoute),
    ),
    predicateResult(
      'compose-panel-evaluations-copy',
      SOURCE_ROOTS.composePanel,
      sources.composePanel.includes('Evaluations</h2>') &&
        sources.composePanel.includes('data-testid="reads-evaluation-input"'),
    ),
    predicateResult(
      'option-card-absolute-relative-sections',
      SOURCE_ROOTS.optionCard,
      sources.optionCard.includes('Absolute (full catalogue)') &&
        sources.optionCard.includes('Evaluation fit (buy signal)'),
    ),
    predicateResult(
      'migration-renames-column-and-rows',
      SOURCE_ROOTS.migration,
      sources.migration.includes('RENAME COLUMN "neediness_kinds" TO "relative_kinds"') &&
        sources.migration.includes("('need', 'evaluation')") &&
        sources.migration.includes("('needinesses', 'relatives')") &&
        sources.migration.includes('"execution_events"') &&
        sources.migration.includes('IF EXISTS'),
    ),
    predicateResult(
      'local-ci-step-renamed',
      SOURCE_ROOTS.localCi,
      sources.localCi.includes("'gate-test-read-evaluation'") && !sources.localCi.includes("'gate-test-read-need'"),
    ),
    predicateResult(
      'spec-carries-rename-law',
      SOURCE_ROOTS.spec,
      ['### E-1 Vocabulary map (binding)', '### E-4 Stored-row migration (binding)', '### E-6 Completion'].every((heading) =>
        sources.spec.includes(heading),
      ) && sources.spec.includes(V49_EVALUATIONS_RENAME_MIGRATION_PATH),
    ),
    predicateResult(
      'package-json-exposes-gate2',
      SOURCE_ROOTS.packageJson,
      sources.packageJson.includes('"generate:v49-evaluations-rename"') &&
        sources.packageJson.includes('"check:v49-gate2"'),
    ),
    predicateResult(
      'package-exports-gate2',
      SOURCE_ROOTS.protocolIndex,
      sources.protocolIndex.includes('buildV49EvaluationsRename') &&
        sources.protocolTypes.includes('buildV49EvaluationsRename'),
    ),
    predicateResult(
      'generator-checker-test-exist',
      SOURCE_ROOTS.generator,
      sources.generator.includes('buildV49EvaluationsRename') &&
        sources.checker.includes('V49 Gate 2 evaluations rename check') &&
        sources.protocolTest.includes('buildV49EvaluationsRename'),
    ),
  ];
}

export function buildV49EvaluationsRename({ repoRoot = DEFAULT_REPO_ROOT } = {}) {
  const scan = scanLivingSource(repoRoot);
  const predicateResults = buildPredicateResults(repoRoot, scan);
  const failedPredicateIds = predicateResults
    .filter((predicate) => !predicate.passed)
    .map((predicate) => predicate.id);
  const sourceRoots = Object.fromEntries(
    Object.entries(SOURCE_ROOTS).map(([key, sourcePath]) => [
      key,
      `${sourcePath}:${digest(readSource(repoRoot, sourcePath))}`,
    ]),
  );
  const artifactRoot = `v49-evaluations-rename:${digest(
    JSON.stringify({ sourceRoots, offendingFiles: scan.offendingFiles }),
  )}`;

  return {
    artifactId: 'v49-evaluations-rename',
    schemaId: V49_EVALUATIONS_RENAME_SCHEMA_ID,
    version: V49_EVALUATIONS_RENAME_VERSION,
    currentTarget: V49_EVALUATIONS_RENAME_CURRENT_TARGET,
    artifactPath: V49_EVALUATIONS_RENAME_ARTIFACT_PATH,
    sourceSafetyVerdict: V49_EVALUATIONS_RENAME_SOURCE_SAFETY_VERDICT,
    migrationPath: V49_EVALUATIONS_RENAME_MIGRATION_PATH,
    forbiddenPayloadIds: [...V49_EVALUATIONS_RENAME_FORBIDDEN_PAYLOAD_IDS],
    vocabularyScan: {
      offendingFileCount: scan.offendingFiles.length,
      offendingFiles: scan.offendingFiles,
    },
    predicateResults,
    sourceRoots,
    artifactRoot,
    coverage: {
      requiredPredicateCount: predicateResults.length,
      passedPredicateCount: predicateResults.length - failedPredicateIds.length,
      failedPredicateIds,
      livingVocabularyRenamed: scan.offendingFiles.length === 0,
      storedRowsMigrated: !failedPredicateIds.includes('migration-renames-column-and-rows'),
      dualReadPresent: false,
      sourceSafeMetadataOnly: true,
      protectedSourceVisible: false,
      rawPromptVisible: false,
      valueBearingMainnetEnabled: false,
    },
    passed: failedPredicateIds.length === 0,
  };
}

export const V49_EVALUATIONS_RENAME_SOURCE_ROOTS = Object.freeze({ ...SOURCE_ROOTS });
