/**
 * SynthesizeDepositAssetPacksQuick — QUICK ExecutionPipeline (one stage, one
 * model call). Returns raw options + source catalog for the deposit
 * dispatcher's real fail-closed validation and option projection (same
 * contract as the rich and demonstration deposit paths).
 */

import { factoryExecutionPipelineQuick } from '@bitcode/pipelines-generics';
import { initializeAssetPackPipeline } from '@bitcode/asset-packs-pipelines-syntheses-domain/preprocess';
import { storeCrossPhaseArtifact } from '@bitcode/asset-packs-pipelines-syntheses-domain/synthesize-asset-packs';

import {
  quickSynthesizeDepositAssetPacksAgent,
  type QuickSynthesisAgentInput,
  type QuickSynthesisAgentResult,
} from './quick-synthesize-asset-packs-agent';

export const QUICK_DEPOSIT_PIPELINE_NAME = 'SynthesizeDepositAssetPacksQuick';

export type QuickDepositSynthesisInput = Omit<QuickSynthesisAgentInput, 'lens' | 'evaluation'>;

export const runExecutionPipelineQuickSynthesizeDepositAssetPacks = factoryExecutionPipelineQuick<
  QuickDepositSynthesisInput,
  QuickSynthesisAgentResult
>(QUICK_DEPOSIT_PIPELINE_NAME, {
  initialize: (execution) => initializeAssetPackPipeline(execution),
  stage: async (input, execution) => {
    const result = await quickSynthesizeDepositAssetPacksAgent({ ...input, lens: 'deposit' }, execution);
    storeCrossPhaseArtifact(execution as never, 'implementation', 'options', result.options);
    storeCrossPhaseArtifact(execution as never, 'deposit', 'sourceCheckoutCatalog', result.sourceCatalog);
    return result;
  },
});
