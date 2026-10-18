// @ts-check

/**
 * V49 Gate 1 — Opening Charter proof builder.
 *
 * Gate 1 opens the V49 draft family over active V48 for the fast, real,
 * end-to-end commercial MVP: Evaluations (Absolute / Relative measurement with
 * benchmark deltas), one-call quick synthesis, multi-source settlement
 * completion, and the Claude External. Predicates bind the hand-authored
 * family, canon posture, roadmap, living local CI and workflow wiring, and
 * package scripts. Does not mutate V48 checkers.
 */

import crypto from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ACTIVE_CANON_VERSION, DRAFT_TARGET_VERSION } from '../canon-posture.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');

export const V49_OPENING_CHARTER_ARTIFACT_PATH = '.proofs/v49/opening-charter.json';
export const V49_OPENING_CHARTER_SCHEMA_ID = 'bitcode.v49.openingCharter.v1';
export const V49_OPENING_CHARTER_VERSION = 'V49';
/** Active pointer during V49 draft work remains V48 until promotion. */
export const V49_OPENING_CHARTER_CURRENT_TARGET = 'V48';
export const V49_OPENING_CHARTER_SOURCE_SAFETY_VERDICT = 'source-safe-opening-charter';

export const V49_GATE_IDS = Object.freeze([
  'opening-charter',
  'evaluations-rename',
  'quick-synthesis',
  'settlement-completion',
  'benchmark-delta-relatives',
  'claude-external',
  'promotion-readiness',
]);

/** SPEC chapter headings that carry the four V49 reforms. */
export const V49_REFORM_CHAPTER_HEADINGS = Object.freeze([
  '## V49 Evaluations rename law (Gate 2)',
  '## V49 quick synthesis law (Gate 3)',
  '## V49 settlement completion law (Gate 4)',
  '## V49 benchmark-delta Relative law (Gate 5)',
  '## V49 Claude External law (Gate 6)',
]);

/** Accepted decision tokens that must appear in the DELTA. */
export const V49_ACCEPTED_DECISION_TOKENS = Object.freeze([
  'BITCODE_SYNTHESIS_PIPELINE',
  'factoryExecutionPipelineQuick',
  'factoryQuickAgent',
  'BITCODE_PROTOCOL_COIN_FEE_BPS',
  'buildSourceToSharesProof',
  'OAuth 2.1',
  '.bitcode/benchmarks.json',
  'Need → Evaluation',
  'no dual-read',
]);

export const V49_OPENING_CHARTER_FORBIDDEN_PAYLOAD_IDS = Object.freeze([
  'protected_source_payload',
  'raw_source_text',
  'unpaid_datapack_source',
  'raw_protected_prompt',
  'raw_provider_response',
  'oauth_token_material',
  'wallet_private_material',
  'settlement_private_payload',
]);

const SOURCE_ROOTS = Object.freeze({
  activePointer: '.specifications/BITCODE_SPEC.txt',
  spec: '.specifications/BITCODE_SPEC_V49.md',
  delta: '.specifications/BITCODE_SPEC_V49_DELTA.md',
  notes: '.specifications/BITCODE_SPEC_V49_NOTES.md',
  parity: '.specifications/BITCODE_SPEC_V49_PARITY_MATRIX.md',
  measurementParity: '.specifications/BITCODE_SPEC_V49_MEASUREMENT_PARITY_MATRIX.md',
  roadmap: '.specifications/SPECIFICATIONS_ROADMAP.md',
  canonPosture: 'scripts/specifying/src/canon-posture.js',
  specifyingReadme: 'scripts/specifying/README.md',
  localCi: 'scripts/run-bitcode-local-ci.mjs',
  canonWorkflow: '.github/workflows/bitcode-canon-quality.yml',
  gateWorkflow: '.github/workflows/bitcode-gate-quality.yml',
  packageJson: 'package.json',
  protocolIndex: 'scripts/specifying/src/index.js',
  protocolTypes: 'scripts/specifying/src/index.d.ts',
  generator: 'scripts/generate-v49-opening-charter.mjs',
  checker: 'scripts/check-v49-gate1-opening-charter.mjs',
  protocolTest: 'scripts/specifying/test/v49-opening-charter.test.js',
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

const NEED_VOCABULARY_PATTERN = /neediness|needFit|need-fit|read-need|comprehend-needs|\bNeeds?\b/u;

/**
 * Lines of the V49 SPEC that still use V48 Need vocabulary as living law.
 * The Evaluations rename chapter and lines that explicitly name a V48 term
 * being replaced (V48 mention, `→` mapping, rename/replace prose) are exempt.
 *
 * @param {string} spec
 * @returns {string[]}
 */
export function livingNeedVocabularyLines(spec) {
  const chapterStart = spec.indexOf('## V49 Evaluations rename law');
  const chapterEnd = spec.indexOf('## V49 quick synthesis law');
  const living =
    chapterStart >= 0 && chapterEnd > chapterStart
      ? spec.slice(0, chapterStart) + spec.slice(chapterEnd)
      : spec;
  return living
    .split('\n')
    .filter((line) => !/V48|→|renam|Replace/u.test(line))
    .filter((line) => NEED_VOCABULARY_PATTERN.test(line));
}

/**
 * @param {string} repoRoot
 */
function buildPredicateResults(repoRoot) {
  /** @type {Record<string, string>} */
  const sources = Object.fromEntries(
    Object.entries(SOURCE_ROOTS).map(([key, sourcePath]) => [key, readSource(repoRoot, sourcePath)]),
  );
  const familyStatusLabels = ['## Status', 'Current canonical/latest target: `V48`', 'Prior canonical anchor'];

  return [
    predicateResult(
      'pointer-remains-v48',
      SOURCE_ROOTS.activePointer,
      sources.activePointer.trim() === V49_OPENING_CHARTER_CURRENT_TARGET,
    ),
    predicateResult(
      'canon-posture-v48-active-v49-draft',
      SOURCE_ROOTS.canonPosture,
      ACTIVE_CANON_VERSION === 'V48' && DRAFT_TARGET_VERSION === 'V49',
    ),
    predicateResult(
      'family-files-present-with-draft-status',
      SOURCE_ROOTS.spec,
      ['spec', 'delta', 'notes', 'parity'].every((key) =>
        familyStatusLabels.every((label) => sources[key].includes(label)),
      ) && sources.measurementParity.includes('Current canonical/latest target: `V48`'),
    ),
    predicateResult(
      'spec-declares-draft-posture',
      SOURCE_ROOTS.spec,
      sources.spec.includes('Posture: **draft**') &&
        !sources.spec.includes('V49 state: canonical promotion complete'),
    ),
    predicateResult(
      'spec-carries-reform-chapters',
      SOURCE_ROOTS.spec,
      V49_REFORM_CHAPTER_HEADINGS.every((heading) => sources.spec.includes(heading)),
    ),
    predicateResult(
      'spec-carries-gate-plan',
      SOURCE_ROOTS.spec,
      ['Opening charter', 'Evaluations rename', 'Quick synthesis', 'Settlement completion',
        'Benchmark-delta Relative', 'Claude External', 'Promotion readiness'].every((name) =>
        sources.spec.includes(name),
      ) && V49_GATE_IDS.every((_, index) => sources.spec.includes(`check:v49-gate${index + 1}`)),
    ),
    predicateResult(
      'spec-evaluations-vocabulary',
      SOURCE_ROOTS.spec,
      sources.spec.includes("MeasurementKindCategory = 'absolute' | 'relative' | 'material-identity'") &&
        sources.spec.includes('evaluationFitVolume') &&
        livingNeedVocabularyLines(sources.spec).length === 0,
    ),
    predicateResult(
      'delta-records-accepted-decisions',
      SOURCE_ROOTS.delta,
      V49_ACCEPTED_DECISION_TOKENS.every((token) => sources.delta.includes(token)),
    ),
    predicateResult(
      'notes-carry-simplified-reading',
      SOURCE_ROOTS.notes,
      sources.notes.includes('## Concise current-system reading') &&
        sources.notes.includes('## Simplified-spec reading rule'),
    ),
    predicateResult(
      'parity-rows-bind-gates',
      SOURCE_ROOTS.parity,
      ['Gate 2', 'Gate 3', 'Gate 4', 'Gate 5', 'Gate 6', 'Gate 7'].every((gate) =>
        sources.parity.includes(gate),
      ) && sources.parity.includes('## V49 implementation matrix'),
    ),
    predicateResult(
      'measurement-parity-covers-relative-family',
      SOURCE_ROOTS.measurementParity,
      sources.measurementParity.includes('# Part A — Absolute family') &&
        sources.measurementParity.includes('# Part B — Relative family (V49)') &&
        sources.measurementParity.includes('benchmark-delta:<id>'),
    ),
    predicateResult(
      'roadmap-names-v49-draft-target',
      SOURCE_ROOTS.roadmap,
      sources.roadmap.includes('Current draft target: **V49**') &&
        sources.roadmap.includes('| V49 | `BITCODE_SPEC_V49.md` | draft target |') &&
        sources.roadmap.includes('| V48 | `BITCODE_SPEC_V48.md` | active canon |'),
    ),
    predicateResult(
      'specifying-readme-posture',
      SOURCE_ROOTS.specifyingReadme,
      sources.specifyingReadme.includes('`V48` active, `V49` draft'),
    ),
    predicateResult(
      'local-ci-runs-v49-draft',
      SOURCE_ROOTS.localCi,
      sources.localCi.includes("'canon-v49-draft-family'") &&
        sources.localCi.includes('listDraftGateCheckScripts(repoRoot, 49)'),
    ),
    predicateResult(
      'workflows-run-v49-draft',
      SOURCE_ROOTS.canonWorkflow,
      ['canonWorkflow', 'gateWorkflow'].every(
        (key) =>
          sources[key].includes('--version V49 --mode draft --current-target V48') &&
          sources[key].includes('scripts/check-v49-gate*.mjs'),
      ),
    ),
    predicateResult(
      'package-json-exposes-gate1',
      SOURCE_ROOTS.packageJson,
      sources.packageJson.includes('"generate:v49-opening-charter"') &&
        sources.packageJson.includes('"check:v49-opening-charter"') &&
        sources.packageJson.includes('"check:v49-gate1"'),
    ),
    predicateResult(
      'package-exports-gate1',
      SOURCE_ROOTS.protocolIndex,
      sources.protocolIndex.includes('buildV49OpeningCharter') &&
        sources.protocolTypes.includes('buildV49OpeningCharter'),
    ),
    predicateResult(
      'generator-checker-test-exist',
      SOURCE_ROOTS.generator,
      sources.generator.includes('buildV49OpeningCharter') &&
        sources.checker.includes('V49 Gate 1 opening charter check') &&
        sources.protocolTest.includes('buildV49OpeningCharter'),
    ),
  ];
}

export function buildV49OpeningCharter({ repoRoot = DEFAULT_REPO_ROOT } = {}) {
  const predicateResults = buildPredicateResults(repoRoot);
  const failedPredicateIds = predicateResults
    .filter((predicate) => !predicate.passed)
    .map((predicate) => predicate.id);
  const sourceRoots = Object.fromEntries(
    Object.entries(SOURCE_ROOTS).map(([key, sourcePath]) => [
      key,
      `${sourcePath}:${digest(readSource(repoRoot, sourcePath))}`,
    ]),
  );
  const artifactRoot = `v49-opening-charter:${digest(
    JSON.stringify({
      gateIds: V49_GATE_IDS,
      reformChapterHeadings: V49_REFORM_CHAPTER_HEADINGS,
      acceptedDecisionTokens: V49_ACCEPTED_DECISION_TOKENS,
      sourceRoots,
    }),
  )}`;

  return {
    artifactId: 'v49-opening-charter',
    schemaId: V49_OPENING_CHARTER_SCHEMA_ID,
    version: V49_OPENING_CHARTER_VERSION,
    currentTarget: V49_OPENING_CHARTER_CURRENT_TARGET,
    artifactPath: V49_OPENING_CHARTER_ARTIFACT_PATH,
    sourceSafetyVerdict: V49_OPENING_CHARTER_SOURCE_SAFETY_VERDICT,
    gateIds: [...V49_GATE_IDS],
    reformChapterHeadings: [...V49_REFORM_CHAPTER_HEADINGS],
    acceptedDecisionTokens: [...V49_ACCEPTED_DECISION_TOKENS],
    forbiddenPayloadIds: [...V49_OPENING_CHARTER_FORBIDDEN_PAYLOAD_IDS],
    predicateResults,
    sourceRoots,
    artifactRoot,
    coverage: {
      requiredPredicateCount: predicateResults.length,
      passedPredicateCount: predicateResults.length - failedPredicateIds.length,
      failedPredicateIds,
      familyOpened: !failedPredicateIds.includes('family-files-present-with-draft-status'),
      postureOpened: !failedPredicateIds.includes('canon-posture-v48-active-v49-draft'),
      livingCiWired:
        !failedPredicateIds.includes('local-ci-runs-v49-draft') &&
        !failedPredicateIds.includes('workflows-run-v49-draft'),
      sourceSafeMetadataOnly: true,
      protectedSourceVisible: false,
      rawPromptVisible: false,
      rawProviderResponseVisible: false,
      oauthTokenMaterialVisible: false,
      walletPrivateMaterialVisible: false,
      valueBearingMainnetEnabled: false,
    },
    passed: failedPredicateIds.length === 0,
  };
}

export const V49_OPENING_CHARTER_SOURCE_ROOTS = Object.freeze({ ...SOURCE_ROOTS });
