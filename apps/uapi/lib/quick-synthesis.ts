/**
 * Quick synthesis runners (V49 quick synthesis law; synthesis pipeline mode
 * `quick`). Stand in for the SDIVF host/pipeline step ONLY, like the
 * demonstration runners:
 * - Gather reads the real request checkout over the GitHub App installation
 *   token (tree + file bodies), no clone, no sandbox;
 * - the QUICK pipeline makes exactly one model call;
 * - deposit callers then run the real fail-closed validation + projection;
 *   read runs the real Finish agent inside the QUICK pipeline.
 */

import type { Execution } from '@bitcode/execution-generics';
import type { DepositoryAsset } from '@bitcode/asset-packs-pipelines-syntheses-domain/depository-search-types';
// Type-only at module scope: the QUICK pipelines load lazily so rich and
// demonstration runs never pay for (or depend on) the quick package.
import type {
  QuickDepositorySupplyRow,
  QuickSynthesisSourceLoader,
} from '@bitcode/asset-packs-pipelines-syntheses-quick';

import { listGitHubRepositoryTreePaths, readGitHubRepositoryFileTexts } from '@/lib/github-repository-rest';

export function createGitHubQuickSynthesisSourceLoader(input: {
  token: string | null;
  repositoryFullName: string;
  reference: string;
}): QuickSynthesisSourceLoader {
  return {
    async listPaths() {
      if (!input.token) return [];
      return listGitHubRepositoryTreePaths({
        token: input.token,
        repositoryFullName: input.repositoryFullName,
        ref: input.reference,
      });
    },
    async readFiles(paths) {
      if (!input.token || paths.length === 0) return [];
      return readGitHubRepositoryFileTexts({
        token: input.token,
        repositoryFullName: input.repositoryFullName,
        ref: input.reference,
        paths,
      });
    },
  };
}

/** Source-safe supply rows the single call may attribute read options to. */
export function toQuickDepositorySupplyRows(assets: readonly DepositoryAsset[]): QuickDepositorySupplyRow[] {
  return assets
    .filter((asset) => typeof asset.assetId === 'string' && asset.assetId)
    .map((asset) => ({
      depositoryAssetPackId: asset.assetId,
      title: asset.title,
      summary: String(asset.summary || '').slice(0, 400),
      kind: asset.artifactKind || null,
    }));
}

interface QuickRunBase {
  runId: string;
  repositoryFullName: string;
  reference: string;
  accessToken: string | null;
  emitStatus: (message: string) => unknown;
}

export async function runQuickDepositSynthesis(
  input: QuickRunBase & {
    execution: Execution;
    obfuscations: string | null;
    permissibleSources: string[];
    impermissibleSources: string[];
  },
) {
  await input.emitStatus('Quick synthesis mode: one model call over the live checkout (validation and projection are live).');
  const { runExecutionPipelineQuickSynthesizeDepositAssetPacks } = await import(
    '@bitcode/asset-packs-pipelines-syntheses-quick'
  );
  return runExecutionPipelineQuickSynthesizeDepositAssetPacks(
    {
      runId: input.runId,
      repositoryFullName: input.repositoryFullName,
      reference: input.reference,
      permissibleSources: input.permissibleSources,
      impermissibleSources: input.impermissibleSources,
      obfuscations: input.obfuscations || '',
      source: createGitHubQuickSynthesisSourceLoader({
        token: input.accessToken,
        repositoryFullName: input.repositoryFullName,
        reference: input.reference,
      }),
      emitStatus: input.emitStatus,
    },
    input.execution,
  );
}

export async function runQuickReadSynthesis(
  input: QuickRunBase & {
    execution: Execution;
    sourceBranch: string;
    evaluation: string;
    relevantPaths: string[];
    irrelevantPaths: string[];
    depositorySupply: QuickDepositorySupplyRow[];
    declaredBenchmarkIds?: string[];
  },
) {
  await input.emitStatus('Quick synthesis mode: one model call over the live checkout (Finish projection is live).');
  const { runExecutionPipelineQuickSynthesizeReadAssetPacks } = await import(
    '@bitcode/asset-packs-pipelines-syntheses-quick'
  );
  return runExecutionPipelineQuickSynthesizeReadAssetPacks(
    {
      runId: input.runId,
      repositoryFullName: input.repositoryFullName,
      reference: input.reference,
      sourceBranch: input.sourceBranch,
      evaluation: input.evaluation,
      permissibleSources: input.relevantPaths,
      impermissibleSources: input.irrelevantPaths,
      depositorySupply: input.depositorySupply,
      declaredBenchmarkIds: input.declaredBenchmarkIds,
      source: createGitHubQuickSynthesisSourceLoader({
        token: input.accessToken,
        repositoryFullName: input.repositoryFullName,
        reference: input.reference,
      }),
      emitStatus: input.emitStatus,
    },
    input.execution,
  );
}
