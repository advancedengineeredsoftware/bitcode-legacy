// @ts-check

/**
 * V49 Gate 3 — Quick synthesis proof builder.
 *
 * Gate 3 adds flagged QUICK deposit/read synthesis with exactly one model call
 * per run on `factoryExecutionPipelineQuick` + `factoryQuickAgent`, mode
 * resolution (env + per-run request + demonstration precedence), the Quick /
 * Rich toggle, dispatcher branches, and removal of the read dispatcher's
 * pre-pipeline clone. Predicates bind source, tests, living CI, and SPEC law;
 * the artifact is source-safe metadata only.
 */

import crypto from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');

export const V49_QUICK_SYNTHESIS_ARTIFACT_PATH = '.proofs/v49/quick-synthesis.json';
export const V49_QUICK_SYNTHESIS_SCHEMA_ID = 'bitcode.v49.quickSynthesis.v1';
export const V49_QUICK_SYNTHESIS_VERSION = 'V49';
export const V49_QUICK_SYNTHESIS_CURRENT_TARGET = 'V48';
export const V49_QUICK_SYNTHESIS_SOURCE_SAFETY_VERDICT = 'source-safe-quick-synthesis';
export const V49_QUICK_SYNTHESIS_PIPELINE_NAMES = Object.freeze([
  'SynthesizeDepositAssetPacksQuick',
  'SynthesizeReadAssetPacksQuick',
]);
export const V49_QUICK_SYNTHESIS_MODES = Object.freeze(['rich', 'quick', 'demonstration']);

const QUICK = 'packages/asset-packs-pipelines/syntheses/quick';
const SOURCE_ROOTS = Object.freeze({
  spec: '.specifications/BITCODE_SPEC_V49.md',
  quickPackage: `${QUICK}/package.json`,
  quickSchema: `${QUICK}/src/quick-synthesis-schema.ts`,
  quickPrompts: `${QUICK}/src/quick-synthesis-prompts.ts`,
  quickGatherTool: `${QUICK}/src/quick-synthesis-source-tool.ts`,
  quickCallCounter: `${QUICK}/src/quick-synthesis-llm-calls.ts`,
  quickOptions: `${QUICK}/src/quick-synthesis-options.ts`,
  quickAgent: `${QUICK}/src/quick-synthesize-asset-packs-agent.ts`,
  quickDeposit: `${QUICK}/src/deposit.ts`,
  quickRead: `${QUICK}/src/read.ts`,
  quickTest: `${QUICK}/src/__tests__/quick-synthesis.test.ts`,
  modeResolution: 'packages/asset-packs-pipelines/syntheses/domain/src/synthesis-pipeline-mode.ts',
  modeTest: 'packages/asset-packs-pipelines/syntheses/domain/src/__tests__/synthesis-pipeline-mode.test.ts',
  profileAbsolutes: 'packages/asset-packs-pipelines/syntheses/domain/src/profile-absolutes.ts',
  uapiRunners: 'apps/uapi/lib/quick-synthesis.ts',
  depositRoute: 'apps/uapi/app/api/deposit/synthesize-options/route.ts',
  readRoute: 'apps/uapi/app/api/read/synthesize-options/route.ts',
  depositDispatch: 'apps/uapi/app/api/deposit/synthesize-options/dispatch-deposit-synthesis.ts',
  readDispatch: 'apps/uapi/app/api/read/synthesize-options/dispatch-read-synthesis.ts',
  toggle: 'apps/uapi/components/bitcode/routes/BitcodeSynthesisPipelineToggle/BitcodeSynthesisPipelineToggle.tsx',
  preference: 'apps/uapi/components/bitcode/pipeline/models/synthesis-pipeline-preference.ts',
  preferenceTest: 'apps/uapi/tests/synthesisPipelinePreference.test.tsx',
  synthesizeButton:
    'apps/uapi/components/bitcode/routes/ProductSynthesizeDataPackOptionsButton/ProductSynthesizeDataPackOptionsButton.tsx',
  localCi: 'scripts/run-bitcode-local-ci.mjs',
  packageJson: 'package.json',
  protocolIndex: 'scripts/specifying/src/index.js',
  protocolTypes: 'scripts/specifying/src/index.d.ts',
  generator: 'scripts/generate-v49-quick-synthesis.mjs',
  checker: 'scripts/check-v49-gate3-quick-synthesis.mjs',
  protocolTest: 'scripts/specifying/test/v49-quick-synthesis.test.js',
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
      'quick-pipelines-use-quick-primitives',
      SOURCE_ROOTS.quickDeposit,
      s.quickDeposit.includes('factoryExecutionPipelineQuick') &&
        s.quickRead.includes('factoryExecutionPipelineQuick') &&
        s.quickAgent.includes('factoryQuickAgent') &&
        V49_QUICK_SYNTHESIS_PIPELINE_NAMES.every((name) => `${s.quickDeposit}${s.quickRead}`.includes(name)),
    ),
    predicateResult(
      'single-model-call-invariant-enforced',
      SOURCE_ROOTS.quickAgent,
      s.quickAgent.includes('countLlmCallsFromExecutionTree(pipeline)') &&
        s.quickAgent.includes('expected exactly 1') &&
        (s.quickAgent.match(/await llm\(/gu) || []).length === 1,
    ),
    predicateResult(
      'one-call-proven-by-tests',
      SOURCE_ROOTS.quickTest,
      (s.quickTest.match(/expect\(calls\.count\)\.toBe\(1\)/gu) || []).length >= 3 &&
        s.quickTest.includes('validateDepositSynthesisOptions') &&
        s.quickTest.includes('result.fullOptions'),
    ),
    predicateResult(
      'gather-is-a-tool-without-model-calls',
      SOURCE_ROOTS.quickGatherTool,
      s.quickGatherTool.includes('factoryTool(') &&
        s.quickGatherTool.includes('projectInventoryForSynthesisProvider') &&
        !s.quickGatherTool.includes('getDefaultLLM'),
    ),
    predicateResult(
      'prompt-composed-from-prompt-parts',
      SOURCE_ROOTS.quickPrompts,
      s.quickPrompts.includes('new Prompt()') && s.quickPrompts.includes("requirePattern('quick:*')"),
    ),
    predicateResult(
      'absolutes-honesty-profile-law',
      SOURCE_ROOTS.profileAbsolutes,
      s.profileAbsolutes.includes("status: 'measured' as const") &&
        s.profileAbsolutes.includes("status: 'estimated' as const") &&
        s.quickOptions.includes('measureProfileDataPackAbsolutes'),
    ),
    predicateResult(
      'read-attributions-and-benchmarks-restricted',
      SOURCE_ROOTS.quickOptions,
      s.quickOptions.includes('resolveQuickSourceAttributions') &&
        s.quickAgent.includes('declared.has(id)'),
    ),
    predicateResult(
      'mode-resolution-law',
      SOURCE_ROOTS.modeResolution,
      V49_QUICK_SYNTHESIS_MODES.every((mode) => s.modeResolution.includes(`'${mode}'`)) &&
        s.modeResolution.includes('BITCODE_SYNTHESIS_PIPELINE') &&
        s.modeResolution.includes('BITCODE_DEMONSTRATION_SYNTHESIS') &&
        s.modeTest.includes('demonstration wins unless demonstration synthesis is quick'),
    ),
    predicateResult(
      'routes-accept-synthesis-pipeline',
      SOURCE_ROOTS.depositRoute,
      ['depositRoute', 'readRoute'].every(
        (key) => s[key].includes('parseRequestedSynthesisPipeline') && s[key].includes("'invalid_synthesis_pipeline'"),
      ),
    ),
    predicateResult(
      'dispatchers-branch-on-mode',
      SOURCE_ROOTS.depositDispatch,
      ['depositDispatch', 'readDispatch'].every(
        (key) =>
          s[key].includes('resolveSynthesisPipelineMode') &&
          s[key].includes("synthesisPipeline === 'quick'") &&
          s[key].includes('        synthesisPipeline,'),
      ),
    ),
    predicateResult(
      'read-dispatch-has-no-pre-pipeline-clone',
      SOURCE_ROOTS.readDispatch,
      !s.readDispatch.includes('provisionDepositCheckout'),
    ),
    predicateResult(
      'website-runners-read-live-checkout',
      SOURCE_ROOTS.uapiRunners,
      s.uapiRunners.includes('readGitHubRepositoryFileTexts') && s.uapiRunners.includes('listGitHubRepositoryTreePaths'),
    ),
    predicateResult(
      'toggle-flagged-and-tested',
      SOURCE_ROOTS.toggle,
      s.preference.includes('NEXT_PUBLIC_BITCODE_SYNTHESIS_PIPELINE_TOGGLE') &&
        s.synthesizeButton.includes('BitcodeSynthesisPipelineToggle') &&
        s.preferenceTest.includes('renders the toggle only when enabled'),
    ),
    predicateResult(
      'living-ci-runs-quick-tests',
      SOURCE_ROOTS.localCi,
      s.localCi.includes("'gate-test-quick-synthesis'") && s.localCi.includes('@bitcode/asset-packs-pipelines-syntheses-quick'),
    ),
    predicateResult(
      'spec-carries-quick-law',
      SOURCE_ROOTS.spec,
      ['### Q-1 Mode resolution', '### Q-4a Realization map (binding paths)', '### Q-5 Invariants', '### Q-6 Completion'].every(
        (heading) => s.spec.includes(heading),
      ),
    ),
    predicateResult(
      'package-json-exposes-gate3',
      SOURCE_ROOTS.packageJson,
      s.packageJson.includes('"generate:v49-quick-synthesis"') && s.packageJson.includes('"check:v49-gate3"'),
    ),
    predicateResult(
      'package-exports-gate3',
      SOURCE_ROOTS.protocolIndex,
      s.protocolIndex.includes('buildV49QuickSynthesis') && s.protocolTypes.includes('buildV49QuickSynthesis'),
    ),
    predicateResult(
      'generator-checker-test-exist',
      SOURCE_ROOTS.generator,
      s.generator.includes('buildV49QuickSynthesis') &&
        s.checker.includes('V49 Gate 3 quick synthesis check') &&
        s.protocolTest.includes('buildV49QuickSynthesis'),
    ),
  ];
}

export function buildV49QuickSynthesis({ repoRoot = DEFAULT_REPO_ROOT } = {}) {
  const predicateResults = buildPredicateResults(repoRoot);
  const failedPredicateIds = predicateResults.filter((p) => !p.passed).map((p) => p.id);
  const sourceRoots = Object.fromEntries(
    Object.entries(SOURCE_ROOTS).map(([key, sourcePath]) => [key, `${sourcePath}:${digest(readSource(repoRoot, sourcePath))}`]),
  );
  const artifactRoot = `v49-quick-synthesis:${digest(JSON.stringify({ sourceRoots }))}`;
  return {
    artifactId: 'v49-quick-synthesis',
    schemaId: V49_QUICK_SYNTHESIS_SCHEMA_ID,
    version: V49_QUICK_SYNTHESIS_VERSION,
    currentTarget: V49_QUICK_SYNTHESIS_CURRENT_TARGET,
    artifactPath: V49_QUICK_SYNTHESIS_ARTIFACT_PATH,
    sourceSafetyVerdict: V49_QUICK_SYNTHESIS_SOURCE_SAFETY_VERDICT,
    pipelineNames: [...V49_QUICK_SYNTHESIS_PIPELINE_NAMES],
    modes: [...V49_QUICK_SYNTHESIS_MODES],
    modelCallsPerRun: 1,
    predicateResults,
    sourceRoots,
    artifactRoot,
    coverage: {
      requiredPredicateCount: predicateResults.length,
      passedPredicateCount: predicateResults.length - failedPredicateIds.length,
      failedPredicateIds,
      singleModelCallEnforced: !failedPredicateIds.includes('single-model-call-invariant-enforced'),
      sourceSafeMetadataOnly: true,
      protectedSourceVisible: false,
      rawPromptVisible: false,
      rawProviderResponseVisible: false,
      valueBearingMainnetEnabled: false,
    },
    passed: failedPredicateIds.length === 0,
  };
}

export const V49_QUICK_SYNTHESIS_SOURCE_ROOTS = Object.freeze({ ...SOURCE_ROOTS });
