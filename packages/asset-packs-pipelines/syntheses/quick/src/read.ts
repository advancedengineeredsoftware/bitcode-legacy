/**
 * SynthesizeReadAssetPacksQuick — QUICK ExecutionPipeline (one stage, one
 * model call). Writes the same Implementation / read / validation stores the
 * rich read pipeline writes, then runs the real read Finish agent (unpaid
 * selection envelope + server-only fullOptions; no model call).
 */

import { factoryExecutionPipelineQuick } from '@bitcode/pipelines-generics';
import { initializeAssetPackPipeline } from '@bitcode/asset-packs-pipelines-syntheses-domain/preprocess';
import { storeCrossPhaseArtifact } from '@bitcode/asset-packs-pipelines-syntheses-domain/synthesize-asset-packs';
import runReadFinishSynthesizeRunAgent from '@bitcode/asset-packs-pipelines-execution-pipeline-sdivf-synthesize-reads-asset-packs/agents/finish/read-finish-synthesize-run-agent';

import {
  quickSynthesizeReadAssetPacksAgent,
  type QuickSynthesisAgentInput,
  type QuickSynthesisAgentResult,
} from './quick-synthesize-asset-packs-agent';

export const QUICK_READ_PIPELINE_NAME = 'SynthesizeReadAssetPacksQuick';

export type QuickReadSynthesisInput = Omit<QuickSynthesisAgentInput, 'lens' | 'obfuscations'> & {
  evaluation: string;
  sourceBranch?: string | null;
};

export type QuickReadSynthesisResult = Awaited<ReturnType<typeof runReadFinishSynthesizeRunAgent>> & {
  quick: Pick<QuickSynthesisAgentResult, 'llmCallCount' | 'usage' | 'benchmarkIds'>;
};

export const runExecutionPipelineQuickSynthesizeReadAssetPacks = factoryExecutionPipelineQuick<
  QuickReadSynthesisInput,
  QuickReadSynthesisResult
>(QUICK_READ_PIPELINE_NAME, {
  initialize: (execution) => initializeAssetPackPipeline(execution),
  stage: async (input, execution) => {
    const result = await quickSynthesizeReadAssetPacksAgent({ ...input, lens: 'read' }, execution);
    const [owner, name] = input.repositoryFullName.split('/');
    const exec = execution as never;
    storeCrossPhaseArtifact(exec, 'implementation', 'options', result.options);
    storeCrossPhaseArtifact(exec, 'read', 'evaluation', input.evaluation);
    storeCrossPhaseArtifact(exec, 'read', 'benchmarkIds', result.benchmarkIds);
    storeCrossPhaseArtifact(exec, 'read', 'repository', {
      owner,
      name,
      fullName: input.repositoryFullName,
      branch: input.sourceBranch ?? null,
      commit: input.reference,
    });
    storeCrossPhaseArtifact(exec, 'read', 'sourceCheckoutCatalog', {
      paths: result.sourceCatalog.paths,
      samples: [],
      totalPathCount: result.sourceCatalog.totalPathCount,
      excludedPathCount: result.sourceCatalog.excludedPathCount,
    });
    storeCrossPhaseArtifact(exec, 'validation', 'readyToFinish', {
      recommendation: 'finish',
      readyToFinish: true,
      summary: `${result.options.length} quick-synthesized DataPack option(s) ranked by evaluation-fit.`,
      issues: [],
    });
    const pipeline = execution as { store?: (namespace: string, key: string, value: unknown) => void };
    pipeline.store?.('phase', 'start', { phase: 'finish', currentPhase: 'finish', pipeline: 'quick', startedAt: new Date().toISOString() });
    const finish = await runReadFinishSynthesizeRunAgent({}, execution);
    pipeline.store?.('phase', 'complete', {
      phase: 'finish',
      currentPhase: 'finish',
      pipeline: 'quick',
      status: 'completed',
      completedAt: new Date().toISOString(),
    });
    return {
      ...finish,
      quick: { llmCallCount: result.llmCallCount, usage: result.usage, benchmarkIds: result.benchmarkIds },
    };
  },
});
