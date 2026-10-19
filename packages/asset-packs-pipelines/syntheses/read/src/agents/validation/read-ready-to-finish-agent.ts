/**
 * Read Validation ready-to-finish — product shell (STAB-4).
 *
 * Uses Evaluation-first domain validation prompts (not deposit identity).
 * A) Prior phases
 * B) Pack quality: patch + measurements.absolutes + measurements.relatives (*-fit)
 * C) Evaluation guidance honored (topics present; no empty relatives)
 *
 * Never imports the deposit product package.
 */

import { factoryPTRRAgent } from '@bitcode/agent-generics';
import { storeCrossPhaseArtifact } from '@bitcode/asset-packs-pipelines-syntheses-domain/synthesize-asset-packs';
import {
  DepositValidationOutputSchema,
  type DepositValidationResult,
} from '@bitcode/asset-packs-pipelines-syntheses-domain/agents/validation/asset-packs-validation-schema';
import { createReadValidationPrompt } from '@bitcode/asset-packs-pipelines-syntheses-domain/agents/validation/asset-packs-validation-prompts-read';
import {
  asPathList,
  mergeDepositValidationVerdict,
  smokeCheckAssetPacks,
} from '@bitcode/asset-packs-pipelines-syntheses-domain/agents/validation/asset-packs-validation-checks';
import { hasRequiredAbsolutes, resolvePackAbsolutes, resolvePackRelatives } from '@bitcode/asset-packs-pipelines-syntheses-domain/asset-pack-measurements';
import { assertRelativeKindPattern } from '../../read-relative-measurements';
import { resolveSourceCheckoutCatalog } from '@bitcode/asset-packs-pipelines-syntheses-domain/resolve-source-checkout-catalog';
import { projectInventoryForPrompt } from '@bitcode/asset-packs-pipelines-syntheses-domain/asset-packs-synthesis';
import { ensureDepositCheckoutSourceFiles } from '@bitcode/asset-packs-pipelines-syntheses-domain/ensure-checkout-source-files';

const prompt = createReadValidationPrompt();

const ReadReadyToFinishCore = factoryPTRRAgent<any, DepositValidationResult>({
  name: 'ReadReadyToFinishAssetPacksSynthesisReadPipeline',
  description:
    'Read Validation gate: prior-phase sanity, pack quality (patch+absolutes+*-fit relatives), Evaluation compliance.',
  outputSchema: DepositValidationOutputSchema,
  tools: [],
  prompt,
  stepPrompts: {
    plan: () => prompt,
    try: () => prompt,
    refine: () => prompt,
    retry: () => prompt,
  },
  plan: { chunkThreshold: 2000 },
  try: { chunkThreshold: 4000 },
  refine: { maxAttempts: 2 },
  retry: { maxAttempts: 1 },
});

function findValue(execution: any, namespace: string, key: string): any {
  const local = execution?.get?.(namespace, key);
  if (local !== undefined) return local;
  return execution?.findUp?.(namespace, key);
}

function phaseSanityIssues(execution: any): string[] {
  const issues: string[] = [];
  if (!findValue(execution, 'repository', 'workspacePath')) {
    issues.push('Setup: missing repository.workspacePath (Host checkout).');
  }
  const admission = findValue(execution, 'setup', 'admission');
  if (admission && admission.safe === false) {
    issues.push(`Setup: danger wall not admitted (${admission.reason || 'unknown'}).`);
  }
  if (!findValue(execution, 'discovery', 'codebaseComprehension')) {
    issues.push('Discovery: missing codebaseComprehension.');
  }
  if (!findValue(execution, 'discovery', 'depositorySearch')) {
    issues.push('Discovery: missing depositorySearch guidance.');
  }
  const options =
    findValue(execution, 'implementation', 'options') ||
    findValue(execution, 'implementation', 'assetPacks');
  if (!Array.isArray(options) || options.length === 0) {
    issues.push('Implementation: no AssetPack options synthesized.');
  }
  return issues;
}

function relativeIssues(packs: any[]): string[] {
  const issues: string[] = [];
  for (const pack of packs) {
    if (!hasRequiredAbsolutes(pack)) {
      issues.push(
        `Pack "${pack?.title || '?'}" missing required measurements.absolutes (magnitude+volume).`,
      );
    }
    const relatives = resolvePackRelatives(pack);
    if (relatives.length === 0) {
      issues.push(
        `Pack "${pack?.title || '?'}" missing measurements.relatives (Relative readings required on read).`,
      );
    } else {
      for (const row of relatives) {
        if (!assertRelativeKindPattern(String(row.measurementKind || ''))) {
          issues.push(
            `Pack "${pack?.title || '?'}" relative "${row.measurementKind}" must be <slug>-fit or benchmark-delta:<id>.`,
          );
        }
      }
    }
    if (!pack?.patch?.fileChanges?.length) {
      issues.push(`Pack "${pack?.title || '?'}" missing patch.fileChanges.`);
    }
  }
  return issues;
}

export default async function runReadReadyToFinishAgent(input: any, execution: any) {
  const packs = Array.isArray(
    input?.assetPacks ??
      findValue(execution, 'implementation', 'options') ??
      findValue(execution, 'implementation', 'assetPacks'),
  )
    ? (input?.assetPacks ??
        findValue(execution, 'implementation', 'options') ??
        findValue(execution, 'implementation', 'assetPacks'))
    : [];

  const priorIssues = phaseSanityIssues(execution);
  const catalog = await ensureDepositCheckoutSourceFiles(
    execution,
    resolveSourceCheckoutCatalog(execution, input?.sourceCheckoutCatalog),
  );
  const catalogForPrompt = projectInventoryForPrompt(catalog);

  const evaluationComprehension =
    findValue(execution, 'setup', 'evaluationComprehension') ??
    findValue(execution, 'setup', 'inputComprehension') ??
    findValue(execution, 'read', 'evaluationComprehension');
  const evaluationText =
    findValue(execution, 'read', 'evaluation') ??
    findValue(execution, 'implementation', 'evaluation') ??
    input?.evaluation ??
    (typeof evaluationComprehension?.summary === 'string' ? evaluationComprehension.summary : null);
  const depositoryHits =
    findValue(execution, 'implementation', 'depositoryHits') ??
    findValue(execution, 'discovery', 'depositoryHits') ??
    null;
  const relevantPaths =
    findValue(execution, 'read', 'relevantPaths') ??
    findValue(execution, 'deposit', 'permissibleSources') ??
    input?.relevantPaths ??
    [];
  const irrelevantPaths =
    findValue(execution, 'read', 'irrelevantPaths') ??
    findValue(execution, 'deposit', 'impermissibleSources') ??
    input?.irrelevantPaths ??
    [];

  const raw = await ReadReadyToFinishCore(
    {
      ...input,
      productLens: 'read',
      assetPacks: packs,
      sourceCheckoutCatalog: catalogForPrompt,
      priorPhaseIssues: priorIssues,
      evaluation: evaluationText,
      evaluationComprehension: evaluationComprehension
        ? {
            summary: evaluationComprehension.summary,
            evaluationTopics: evaluationComprehension.evaluationTopics,
            acceptanceCriteria: evaluationComprehension.acceptanceCriteria,
            dynamicRelatives: evaluationComprehension.dynamicRelatives,
          }
        : null,
      discovery: {
        depositoryHits: Array.isArray(depositoryHits) ? depositoryHits : [],
      },
      relevantPaths: asPathList(relevantPaths),
      irrelevantPaths: asPathList(irrelevantPaths),
      permissibleSources: asPathList(relevantPaths),
      impermissibleSources: asPathList(irrelevantPaths),
    },
    execution,
  );
  const agentOutput = (raw as any)?.finalOutput ?? (raw as any)?.output ?? raw;
  const smokeIssues = smokeCheckAssetPacks(packs, [], []);
  const nIssues = relativeIssues(packs);

  const merged = mergeDepositValidationVerdict(agentOutput, [
    ...smokeIssues,
    ...priorIssues,
    ...nIssues,
  ]);

  const recommendation =
    merged.issues.length > 0 || priorIssues.length > 0 || nIssues.length > 0
      ? merged.recommendation === 'complete'
        ? 'iterate'
        : merged.recommendation
      : merged.recommendation;

  const readyToFinish =
    recommendation === 'complete' && merged.issues.length === 0;
  const result = {
    ...merged,
    recommendation,
    readyToFinish,
    finalApproval: readyToFinish,
    ready: readyToFinish,
    passed: readyToFinish,
  };

  const readinessSummary = readyToFinish
    ? 'Read synthesis ready to finish (options for settle selection).'
    : `Read synthesis not ready: ${result.issues.slice(0, 5).join('; ')}`;

  storeCrossPhaseArtifact(execution, 'validation/implementation', 'issues', result.issues);
  storeCrossPhaseArtifact(execution, 'validation', 'readQuality', result);
  storeCrossPhaseArtifact(execution, 'validation', 'readyToFinish', {
    schema: 'bitcode.read.validation.ready-to-finish',
    recommendation: readyToFinish ? 'finish' : 'revise',
    finalApproval: readyToFinish,
    ready: readyToFinish,
    passed: readyToFinish,
    readyToFinish,
    summary: readinessSummary,
    message: readinessSummary,
    issues: result.issues,
    phase: 'validation',
    agent: 'ready-to-finish-asset-packs-synthesis-read-pipeline',
    step: 'decide',
    failsafe: 'deterministic-gate',
    generation: 'structure',
    formalPhaseDecision: true,
  });
  storeCrossPhaseArtifact(execution, 'validation', 'phaseDecision', {
    schema: 'bitcode.pipeline.phase-decision',
    formalPhaseDecision: true,
    phase: 'validation',
    agent: 'ready-to-finish-asset-packs-synthesis-read-pipeline',
    step: 'decide',
    failsafe: 'deterministic-gate',
    generation: 'structure',
    summary: readinessSummary,
    message: readinessSummary,
    finalApproval: readyToFinish,
    recommendation: readyToFinish ? 'finish' : 'revise',
  });
  storeCrossPhaseArtifact(execution, 'implementation', 'options', packs);
  storeCrossPhaseArtifact(execution, 'implementation', 'assetPacks', packs);

  return { ...(input || {}), ...result, options: packs, absolutesSample: resolvePackAbsolutes(packs[0]) };
}
