// @ts-check

/**
 * V49 Gate 7 — promotion readiness report builder.
 *
 * Binds every V49 gate artifact (Gates 1–6) as present, fresh (regenerated
 * builder output equals the committed artifact), passing, and source-safe;
 * the V49 promotion machinery (promote plan, spec-family and runtime prepare
 * support, local-CI `V49` sole posture, generated `BITCODE_SPEC_V49_PROVEN.md`);
 * package wiring; and the operator staging-testnet rehearsal attestation.
 *
 * `passed` means the readiness machinery is complete. `promotionAdmitted`
 * additionally requires the signed rehearsal: promotion stays blocked while any
 * evidence is missing, stale, source-unsafe, or unattested.
 */

import crypto from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildV49OpeningCharter } from './v49-opening-charter.js';
import { buildV49EvaluationsRename } from './v49-evaluations-rename.js';
import { buildV49QuickSynthesis } from './v49-quick-synthesis.js';
import { buildV49SettlementCompletion } from './v49-settlement-completion.js';
import { buildV49BenchmarkDeltaRelatives } from './v49-benchmark-delta-relatives.js';
import { buildV49ClaudeExternal } from './v49-claude-external.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');

export const V49_PROMOTION_READINESS_ARTIFACT_PATH = '.proofs/v49/promotion-readiness-report.json';
export const V49_PROMOTION_READINESS_SCHEMA_ID = 'bitcode.v49.promotionReadinessReport.v1';
export const V49_PROMOTION_READINESS_SOURCE_SAFETY_VERDICT = 'source-safe-promotion-readiness';
export const V49_REHEARSAL_LEDGER_PATH = '.qa/BITCODE_V49_STAGING_REHEARSAL.md';
export const V49_PROVEN_PATH = '.specifications/BITCODE_SPEC_V49_PROVEN.md';
export const V49_REHEARSAL_LANES = Object.freeze([
  'quick-synthesis',
  'rich-synthesis',
  'two-contributor-settlement',
  'benchmark-delta-read',
  'claude-connector-session',
]);

const GATE_ARTIFACTS = Object.freeze([
  { gate: 1, path: '.proofs/v49/opening-charter.json', build: buildV49OpeningCharter },
  { gate: 2, path: '.proofs/v49/evaluations-rename.json', build: buildV49EvaluationsRename },
  { gate: 3, path: '.proofs/v49/quick-synthesis.json', build: buildV49QuickSynthesis },
  { gate: 4, path: '.proofs/v49/settlement-completion.json', build: buildV49SettlementCompletion },
  { gate: 5, path: '.proofs/v49/benchmark-delta-relatives.json', build: buildV49BenchmarkDeltaRelatives },
  { gate: 6, path: '.proofs/v49/claude-external.json', build: buildV49ClaudeExternal },
]);

const SOURCE_ROOTS = Object.freeze({
  spec: '.specifications/BITCODE_SPEC_V49.md',
  pointer: '.specifications/BITCODE_SPEC.txt',
  proven: V49_PROVEN_PATH,
  rehearsalLedger: V49_REHEARSAL_LEDGER_PATH,
  promoteCanon: 'scripts/promote-bitcode-canon.mjs',
  prepareSpecFamily: 'scripts/prepare-bitcode-spec-family-promotion.mjs',
  prepareRuntime: 'scripts/prepare-bitcode-runtime-canon-promotion.mjs',
  localCi: 'scripts/run-bitcode-local-ci.mjs',
  packageJson: 'package.json',
  protocolIndex: 'scripts/specifying/src/index.js',
  protocolTypes: 'scripts/specifying/src/index.d.ts',
  specifyingReadme: 'scripts/specifying/README.md',
  generator: 'scripts/generate-v49-promotion-readiness-report.mjs',
  checker: 'scripts/check-v49-gate7-promotion-readiness.mjs',
  protocolTest: 'scripts/specifying/test/v49-promotion-readiness-report.test.js',
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

/** Parse the operator ledger: lane statuses and the signed attestation. */
export function readV49RehearsalAttestation(content) {
  const lanes = V49_REHEARSAL_LANES.map((id) => {
    const row = content.split('\n').find((line) => line.startsWith(`| ${id} |`));
    const status = row ? (row.split('|')[3] || '').trim().toLowerCase() : 'missing';
    return { id, status: status || 'missing' };
  });
  const field = (label) => {
    const match = content.match(new RegExp(`^- ${label}: (.+)$`, 'm'));
    const value = match ? match[1].trim() : '';
    return value && !value.startsWith('_(') ? value : null;
  };
  const attestedBy = field('Attested by');
  const attestedAt = field('Attested at');
  return {
    ledgerPresent: content.length > 0,
    lanes,
    attestedBy: attestedBy ? 'present' : null,
    attestedAt,
    attested: Boolean(content) && lanes.every((lane) => lane.status === 'passed') && Boolean(attestedBy) && Boolean(attestedAt),
  };
}

/**
 * Pre-promotion (pointer V48) every gate artifact must equal its regenerated
 * builder output. Post-promotion (pointer V49) Gates 1–6 assert draft-era
 * facts, so their committed artifacts are frozen promoted-era evidence: they
 * must be present and passing at the proof-source commit, not re-derived.
 */
function gateArtifactStatus(repoRoot, pointer) {
  return GATE_ARTIFACTS.map(({ gate, path: artifactPath, build }) => {
    const committed = readSource(repoRoot, artifactPath);
    let parsed = null;
    try {
      parsed = committed ? JSON.parse(committed) : null;
    } catch {
      parsed = null;
    }
    const frozen = pointer === 'V49';
    const fresh = frozen ? Boolean(parsed) : committed === `${JSON.stringify(build({ repoRoot }), null, 2)}\n`;
    return {
      gate,
      artifactPath,
      evidence: frozen ? 'frozen-at-promotion' : 'regenerated',
      present: Boolean(parsed),
      fresh,
      passed: parsed?.passed === true,
      sourceSafe: parsed?.coverage?.sourceSafeMetadataOnly !== false && parsed?.coverage?.protectedSourceVisible !== true,
      artifactRoot: parsed?.artifactRoot ?? null,
    };
  });
}

/**
 * @param {string} repoRoot
 */
function buildPredicateResults(repoRoot, gates) {
  /** @type {Record<string, string>} */
  const s = Object.fromEntries(
    Object.entries(SOURCE_ROOTS).map(([key, sourcePath]) => [key, readSource(repoRoot, sourcePath)]),
  );
  const pointer = s.pointer.trim();
  return [
    predicateResult('gates-1-6-present', SOURCE_ROOTS.spec, gates.every((gate) => gate.present)),
    predicateResult('gates-1-6-fresh', SOURCE_ROOTS.spec, gates.every((gate) => gate.fresh)),
    predicateResult('gates-1-6-passed', SOURCE_ROOTS.spec, gates.every((gate) => gate.passed)),
    predicateResult('gates-1-6-source-safe', SOURCE_ROOTS.spec, gates.every((gate) => gate.sourceSafe)),
    predicateResult(
      'pointer-v48-or-v49',
      SOURCE_ROOTS.pointer,
      pointer === 'V48' || pointer === 'V49',
    ),
    predicateResult(
      'promote-plan-supports-v49',
      SOURCE_ROOTS.promoteCanon,
      s.promoteCanon.includes("if (version === 'V49') {") &&
        s.promoteCanon.includes("'scripts/check-v49-gate7-promotion-readiness.mjs', '--promotion-mode', '--require-rehearsal'") &&
        s.promoteCanon.includes("'--version', 'V49', '--next-draft', 'V49'") &&
        s.promoteCanon.includes('v49PostPromotionReadinessCommands') &&
        s.promoteCanon.includes("'V48', 'V49'].includes(version)"),
    ),
    predicateResult(
      'spec-family-prepare-supports-v49',
      SOURCE_ROOTS.prepareSpecFamily,
      s.prepareSpecFamily.includes("if (version === 'V49') {") &&
        s.prepareSpecFamily.includes('function rewriteV49PromotedSourceOfTruthHierarchy') &&
        s.prepareSpecFamily.includes('function rewriteV49PromotedParityMatrix'),
    ),
    predicateResult(
      'runtime-prepare-is-version-generic',
      SOURCE_ROOTS.prepareRuntime,
      s.prepareRuntime.includes("export const DRAFT_TARGET_VERSION = '${nextDraft}';"),
    ),
    predicateResult(
      'local-ci-supports-v49-sole',
      SOURCE_ROOTS.localCi,
      s.localCi.includes("if (pointer === 'V49') {") &&
        s.localCi.includes("pointer !== 'V49'") &&
        s.localCi.includes("'Canon: V49 promoted family'") &&
        s.localCi.includes("'canon-v49-gate7-promotion-readiness'"),
    ),
    predicateResult(
      'proven-appendix-generated',
      SOURCE_ROOTS.proven,
      s.proven.startsWith('# Bitcode Spec V49 Proven') &&
        s.proven.includes('- canonicalVersion: `V49`') &&
        s.proven.includes('- fullyProven: `true`'),
    ),
    predicateResult(
      'rehearsal-ledger-lists-required-lanes',
      SOURCE_ROOTS.rehearsalLedger,
      V49_REHEARSAL_LANES.every((lane) => s.rehearsalLedger.includes(`| ${lane} |`)),
    ),
    predicateResult(
      'spec-carries-promotion-canon',
      SOURCE_ROOTS.spec,
      s.spec.includes('## V49 promotion canon') && s.spec.includes('`.proofs/v49/promotion-readiness-report.json`'),
    ),
    predicateResult(
      'package-wiring',
      SOURCE_ROOTS.packageJson,
      s.packageJson.includes('"generate:v49-promotion-readiness-report"') &&
        s.packageJson.includes('"check:v49-gate7"') &&
        s.protocolIndex.includes('buildV49PromotionReadinessReport') &&
        s.protocolTypes.includes('buildV49PromotionReadinessReport') &&
        s.specifyingReadme.includes('check:v49-gate7') &&
        s.generator.includes('buildV49PromotionReadinessReport') &&
        s.checker.includes('V49 Gate 7 promotion readiness check') &&
        s.protocolTest.includes('buildV49PromotionReadinessReport'),
    ),
  ];
}

export function buildV49PromotionReadinessReport({ repoRoot = DEFAULT_REPO_ROOT } = {}) {
  const pointer = readSource(repoRoot, SOURCE_ROOTS.pointer).trim();
  const gates = gateArtifactStatus(repoRoot, pointer);
  const predicateResults = buildPredicateResults(repoRoot, gates);
  const failedPredicateIds = predicateResults.filter((p) => !p.passed).map((p) => p.id);
  const rehearsal = readV49RehearsalAttestation(readSource(repoRoot, V49_REHEARSAL_LEDGER_PATH));
  const sourceRoots = Object.fromEntries(
    Object.entries(SOURCE_ROOTS)
      // The PROVEN appendix carries generation timestamps; bind its presence by predicate, not digest.
      .filter(([key]) => key !== 'proven')
      .map(([key, sourcePath]) => [key, `${sourcePath}:${digest(readSource(repoRoot, sourcePath))}`]),
  );
  const blockers = [
    ...failedPredicateIds.map((id) => `predicate:${id}`),
    ...(rehearsal.attested
      ? []
      : [
          `staging-rehearsal:${
            rehearsal.lanes
              .filter((lane) => lane.status !== 'passed')
              .map((lane) => lane.id)
              .join(',') || 'attestation-unsigned'
          }`,
        ]),
  ];
  const passed = failedPredicateIds.length === 0;
  return {
    artifactId: 'v49-promotion-readiness-report',
    schemaId: V49_PROMOTION_READINESS_SCHEMA_ID,
    version: 'V49',
    currentTarget: pointer === 'V49' ? 'V49' : 'V48',
    artifactPath: V49_PROMOTION_READINESS_ARTIFACT_PATH,
    sourceSafetyVerdict: V49_PROMOTION_READINESS_SOURCE_SAFETY_VERDICT,
    pointer,
    gates,
    rehearsal,
    predicateResults,
    sourceRoots,
    artifactRoot: `v49-promotion-readiness-report:${digest(JSON.stringify({ sourceRoots, gates }))}`,
    promotion: {
      admitted: passed && rehearsal.attested,
      blockers,
      postPromotionPosture: { pointer: 'V49', activeCanon: 'V49', draftTarget: 'V49' },
      valueBearingMainnetAdmitted: false,
    },
    coverage: {
      requiredPredicateCount: predicateResults.length,
      passedPredicateCount: predicateResults.length - failedPredicateIds.length,
      failedPredicateIds,
      sourceSafeMetadataOnly: true,
      protectedSourceVisible: false,
    },
    passed,
  };
}

export const V49_PROMOTION_READINESS_SOURCE_ROOTS = Object.freeze({ ...SOURCE_ROOTS });
