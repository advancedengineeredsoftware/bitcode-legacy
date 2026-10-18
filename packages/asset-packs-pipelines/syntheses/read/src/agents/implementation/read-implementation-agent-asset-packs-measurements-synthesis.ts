/**
 * Read Implementation agent 3/4 — measurements (product re-implementation).
 *
 * Registry: implementation:read-implementation-agent-asset-packs-measurements-synthesis
 * Sequence: patch-plan → patchfile → THIS → commercial-nl
 *
 * Domain base runs absolute measurements (productLens=read). Read then attaches
 * relatives (*-fit) + evaluationFit. Never imports the deposit product package.
 */

import { storeCrossPhaseArtifact } from '@bitcode/asset-packs-pipelines-syntheses-domain/synthesize-asset-packs';
import { attachNestedAbsolutes } from '@bitcode/asset-packs-pipelines-syntheses-domain/asset-pack-measurements';

function findValue(execution: any, namespace: string, key: string): any {
  const local = execution?.get?.(namespace, key);
  if (local !== undefined) return local;
  return execution?.findUp?.(namespace, key);
}

export default async function runReadImplementationAgentAssetPacksMeasurementsSynthesis(
  input: any,
  execution: any,
) {
  try {
    execution?.store?.('implementation', 'productLens', 'read');
  } catch {
    /* optional */
  }

  const { default: runBaseMeasurements } = await import(
    '@bitcode/asset-packs-pipelines-syntheses-domain/agents/implementation/implementation-agent-asset-packs-measurements-synthesis'
  );
  const measured = await runBaseMeasurements(input, execution);

  const options = Array.isArray((measured as any)?.options)
    ? (measured as any).options
    : Array.isArray(findValue(execution, 'implementation', 'options'))
      ? findValue(execution, 'implementation', 'options')
      : [];

  const evaluationText =
    findValue(execution, 'read', 'evaluation') ??
    findValue(execution, 'implementation', 'evaluation') ??
    input?.evaluation ??
    '';
  const evaluationComprehension =
    findValue(execution, 'setup', 'evaluationComprehension') ??
    findValue(execution, 'setup', 'inputComprehension');
  const dynamicKinds = Array.isArray(evaluationComprehension?.dynamicRelativeKinds)
    ? evaluationComprehension.dynamicRelativeKinds
    : [];
  const dynamicRelatives = Array.isArray(evaluationComprehension?.dynamicRelatives)
    ? evaluationComprehension.dynamicRelatives
    : null;
  const evaluationSummary = evaluationComprehension?.summary || String(evaluationText || '');
  const evaluationTopics = Array.isArray(evaluationComprehension?.evaluationTopics)
    ? evaluationComprehension.evaluationTopics
    : [];
  const acceptanceCriteria = Array.isArray(evaluationComprehension?.acceptanceCriteria)
    ? evaluationComprehension.acceptanceCriteria
    : [];

  const { measureReadRelatives, computeEvaluationFitVolume, planDynamicRelativesFromContext } =
    await import('../../read-relative-measurements');

  for (const option of options) {
    if (!option || typeof option !== 'object') continue;
    delete (option as any).relativeSignal;

    const existingAbsolutes = Array.isArray((option as any).measurements?.absolutes)
      ? (option as any).measurements.absolutes
      : Array.isArray((option as any).absolutes)
        ? (option as any).absolutes
        : [];
    const materialIdentity =
      (option as any).measurements?.materialIdentity ??
      (option as any).materialIdentity ??
      null;
    const measureReport =
      (option as any).measurements?.measureReport ??
      (option as any).measureReport ??
      null;

    const coveredSourcePaths = Array.isArray((option as any).coveredSourcePaths)
      ? ((option as any).coveredSourcePaths as string[])
      : [];
    const patchSummary =
      (option as any).patchArtifact?.patchSummary ||
      (option as any).patch?.patchSummary ||
      null;
    const commercialDescription =
      typeof (option as any).commercialDescription === 'string'
        ? (option as any).commercialDescription
        : null;

    // STAB-B2: when Evaluation exists but Setup plan empty, ground dynamic plan here.
    let planForOption = dynamicRelatives;
    if (
      evaluationSummary &&
      (!Array.isArray(planForOption) || planForOption.length === 0) &&
      (!Array.isArray(dynamicKinds) || dynamicKinds.length === 0)
    ) {
      planForOption = planDynamicRelativesFromContext({
        evaluationText: evaluationSummary,
        evaluationTopics,
        acceptanceCriteria,
        pathHints: coveredSourcePaths,
      });
    }

    const relatives = await measureReadRelatives({
      title: String((option as any)?.title ?? ''),
      summary: String((option as any)?.summary ?? ''),
      confidence: (option as any)?.confidence,
      evaluationSummary,
      dynamicKinds,
      dynamicRelatives: planForOption,
      evaluationTopics,
      acceptanceCriteria,
      patchSummary,
      coveredSourcePaths,
      commercialDescription,
      execution,
    });
    const evaluationFit = computeEvaluationFitVolume(relatives);

    attachNestedAbsolutes(option as any, existingAbsolutes, {
      withRelatives: relatives,
      materialIdentity,
      measureReport,
    });
    (option as any).evaluationFit = evaluationFit;
  }

  const summary = `Measured ${options.length} read DataPack(s) (absolutes + *-fit relatives + evaluationFit).`;
  storeCrossPhaseArtifact(execution, 'implementation', 'options', options);
  storeCrossPhaseArtifact(execution, 'implementation', 'assetPacks', options);
  storeCrossPhaseArtifact(execution, 'implementation', 'summary', summary);

  return {
    ...(typeof measured === 'object' && measured ? measured : {}),
    success: true,
    semanticKind: 'asset-pack-written-asset' as const,
    options,
    summary,
  };
}
