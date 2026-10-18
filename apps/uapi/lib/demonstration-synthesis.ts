/**
 * Demonstration-mode synthesis runners (BITCODE_DEMONSTRATION_MODE=1).
 *
 * Stand in for the SDIVF host/pipeline step ONLY. Each runner:
 * 1. reads the real request checkout (GitHub App tree + language) so option
 *    provenance, coverage, and relatives reflect the selected repository;
 * 2. replays a paced ExecutionPipelineSDIVF telemetry script through the same
 *    host-telemetry bridge live sandbox runs use (identical UI log rows);
 * 3. returns catalog options in the exact Implementation shape.
 *
 * Deposit callers then run the real fail-closed validation + option
 * projection; read runs the real Finish agent (unpaid envelope + fullOptions).
 * Cooperative cancel is honored between telemetry steps.
 */

import { supabaseAdmin } from '@bitcode/supabase';
import { Execution, ExecutionStreamAdapter } from '@bitcode/execution-generics';
import { ExecutionCancelledError, isExecutionCancelled } from '@bitcode/api/pipelines/cancel';
import { storeCrossPhaseArtifact } from '@bitcode/asset-packs-pipelines-syntheses-domain/synthesize-asset-packs';
import {
  isPathImpermissible,
  isPathPermissible,
  type AssetPacksSynthesisSourceInventory,
  type DepositSynthesisRawOption,
} from '@bitcode/asset-packs-pipelines-syntheses-domain/asset-packs-synthesis';
import {
  DEMONSTRATION_DATA_PACK_CATALOG,
  buildDemonstrationDepositRawOptions,
  buildDemonstrationExecutionPipelineSDIVFTelemetryScript,
  buildDemonstrationReadImplementationOptions,
  findDemonstrationDataPackByTitle,
  readDemonstrationPaceFactor,
  scopeExecutionsQueryToActiveDataset,
  type DemonstrationSupplyProvenance,
  type DemonstrationSynthesisLens,
} from '@bitcode/asset-packs-pipelines-syntheses-domain/demonstration';
import runReadFinishSynthesizeRunAgent from '@bitcode/asset-packs-pipelines-execution-pipeline-sdivf-synthesize-reads-asset-packs/agents/finish/read-finish-synthesize-run-agent';

import { bridgeHostTelemetryArtifactToExecutionStream } from '@/lib/deposit-host-telemetry-bridge';
import {
  listGitHubRepositoryTreePaths,
  readGitHubRepositoryLanguage,
  resolveGitHubAccessTokenForUser,
} from '@/lib/github-repository-rest';

/** Poll cancel every N telemetry steps (keeps Supabase reads modest). */
const CANCEL_POLL_EVERY_STEPS = 6;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

interface DemonstrationRunBase {
  runId: string;
  executionId: string;
  repositoryFullName: string;
  /** Request SHA or branch used for the checkout catalog. */
  reference: string;
  emitStatus: (message: string) => unknown;
}

interface DemonstrationCheckout {
  paths: string[];
  language: string | null;
}

async function loadDemonstrationCheckout(input: {
  token: string | null;
  repositoryFullName: string;
  reference: string;
}): Promise<DemonstrationCheckout> {
  if (!input.token) return { paths: [], language: null };
  const [paths, language] = await Promise.all([
    listGitHubRepositoryTreePaths({
      token: input.token,
      repositoryFullName: input.repositoryFullName,
      ref: input.reference,
    }),
    readGitHubRepositoryLanguage({
      token: input.token,
      repositoryFullName: input.repositoryFullName,
    }),
  ]);
  return { paths, language };
}

function scopeCheckoutPaths(
  paths: readonly string[],
  permissibleSources: readonly string[],
  impermissibleSources: readonly string[],
) {
  const inScope = paths.filter(
    (path) =>
      isPathPermissible(path, [...permissibleSources]) &&
      !isPathImpermissible(path, [...impermissibleSources]),
  );
  return { inScope, excludedPathCount: paths.length - inScope.length };
}

/** Replay the paced SDIVF telemetry script into the run's execution stream. */
async function replayDemonstrationTelemetry(
  base: DemonstrationRunBase,
  lens: DemonstrationSynthesisLens,
  context: { catalogPathCount: number; optionTitles: string[]; depositorySupplyCount: number },
) {
  const script = buildDemonstrationExecutionPipelineSDIVFTelemetryScript({
    lens,
    repositoryFullName: base.repositoryFullName,
    ...context,
  });
  const pace = readDemonstrationPaceFactor();
  let elapsedMs = 0;
  for (let index = 0; index < script.length; index += 1) {
    const step = script[index];
    const targetMs = step.atMs * pace;
    if (targetMs > elapsedMs) {
      await sleep(targetMs - elapsedMs);
      elapsedMs = targetMs;
    }
    if (index % CANCEL_POLL_EVERY_STEPS === 0 && (await isExecutionCancelled(supabaseAdmin, base.runId))) {
      throw new ExecutionCancelledError(base.runId);
    }
    if (step.artifact.streamEventType === 'store') {
      // Cross-phase store writes (mode, iteration, readyToFinish verdict) are
      // read by the run-activity model by namespace/key — the bridge drops them.
      void ExecutionStreamAdapter.emitEvent(base.executionId, 'status' as never, {
        namespace: step.artifact.namespace,
        key: step.artifact.key,
        data: step.artifact.data,
        executionState: step.artifact.executionState,
        message: step.artifact.message,
      });
    } else {
      bridgeHostTelemetryArtifactToExecutionStream(base.executionId, step.artifact);
    }
  }
}

/**
 * Deposit lens: returns raw options + source catalog for the dispatcher's real
 * `validateDepositSynthesisOptions` → `buildRealDepositAssetPackOptionSynthesis`.
 */
export async function runDemonstrationDepositSynthesis(
  input: DemonstrationRunBase & {
    accessToken: string | null;
    permissibleSources: string[];
    impermissibleSources: string[];
    depositorySupplyCount: number;
  },
): Promise<{ options: DepositSynthesisRawOption[]; sourceCatalog: AssetPacksSynthesisSourceInventory }> {
  await input.emitStatus(
    'Demonstration mode: replaying a curated SDIVF deposit run (no live inference); checkout, validation, and projection are live.',
  );
  const checkout = await loadDemonstrationCheckout({
    token: input.accessToken,
    repositoryFullName: input.repositoryFullName,
    reference: input.reference,
  });
  const { inScope, excludedPathCount } = scopeCheckoutPaths(
    checkout.paths,
    input.permissibleSources,
    input.impermissibleSources,
  );
  const steering = {
    permissibleSources: input.permissibleSources,
    impermissibleSources: input.impermissibleSources,
  };
  const options = buildDemonstrationDepositRawOptions({
    catalogPaths: inScope,
    repositoryLanguage: checkout.language,
    steering,
  });
  await replayDemonstrationTelemetry(input, 'deposit', {
    catalogPathCount: inScope.length,
    optionTitles: options.map((option) => option.title),
    depositorySupplyCount: input.depositorySupplyCount,
  });
  // Empty checkout (no token / API failure) falls back to pack paths; keep the
  // validation inventory a superset of every covered path.
  const paths = [...new Set([...inScope, ...options.flatMap((option) => option.coveredSourcePaths)])];
  return {
    options,
    sourceCatalog: {
      paths,
      samples: [],
      sources: [],
      totalPathCount: paths.length,
      excludedPathCount,
    },
  };
}

/**
 * Seller linkage: most recent admitted Depository row per catalog pack.
 * Read options synthesized from that supply carry it to settle payout.
 */
async function loadDemonstrationSupplyProvenance(): Promise<
  Record<string, DemonstrationSupplyProvenance>
> {
  const byPackId: Record<string, DemonstrationSupplyProvenance> = {};
  try {
    // Demonstration admissions only — never the account's real Depository rows.
    const { data } = await scopeExecutionsQueryToActiveDataset(
      supabaseAdmin
        .from('executions')
        .select('id, user_id, output, context, created_at')
        .eq('context->>source', 'deposit-option-review-admission')
        .eq('context->>admissionState', 'admitted-to-depository'),
    )
      .order('created_at', { ascending: false })
      .limit(100);
    for (const row of data || []) {
      const output = (row.output || {}) as Record<string, unknown>;
      const context = (row.context || {}) as Record<string, unknown>;
      const titles = [output.assetPackTitle, context.assetPackTitle, output.title, output.commercialTitle];
      const pack = titles
        .map((title) => findDemonstrationDataPackByTitle(typeof title === 'string' ? title : null))
        .find(Boolean);
      if (!pack || byPackId[pack.id] || typeof row.user_id !== 'string') continue;
      byPackId[pack.id] = {
        admissionRunId: String(row.id),
        sellerUserId: row.user_id,
        depositoryAssetPackId:
          typeof context.depositoryAssetPackId === 'string' ? context.depositoryAssetPackId : null,
        repositoryFullName:
          typeof context.repositoryFullName === 'string' ? context.repositoryFullName : null,
      };
    }
  } catch {
    // No linkage: settle falls back to the unlinked projected seller.
  }
  return byPackId;
}

/**
 * Read lens: replays the run, then executes the real read Finish agent over
 * catalog Implementation options. Returns the Finish result shape the read
 * dispatcher persists (selectionEnvelope, unpaid options, server fullOptions).
 */
export async function runDemonstrationReadSynthesis(
  input: DemonstrationRunBase & {
    userId: string;
    execution: Execution;
    sourceBranch: string;
    evaluation: string;
    relevantPaths: string[];
    irrelevantPaths: string[];
  },
) {
  await input.emitStatus(
    'Demonstration mode: replaying a curated SDIVF read run (no live inference); checkout, relatives, and Finish projection are live.',
  );
  const accessToken = await resolveGitHubAccessTokenForUser(input.userId);
  const [checkout, supplyByPackId] = await Promise.all([
    loadDemonstrationCheckout({
      token: accessToken,
      repositoryFullName: input.repositoryFullName,
      reference: input.reference,
    }),
    loadDemonstrationSupplyProvenance(),
  ]);
  const { inScope } = scopeCheckoutPaths(checkout.paths, input.relevantPaths, input.irrelevantPaths);
  const options = buildDemonstrationReadImplementationOptions({
    evaluation: input.evaluation,
    catalogPaths: inScope,
    repositoryLanguage: checkout.language,
    steering: { permissibleSources: input.relevantPaths, impermissibleSources: input.irrelevantPaths },
    supplyByPackId,
  });
  await replayDemonstrationTelemetry(input, 'read', {
    catalogPathCount: inScope.length,
    optionTitles: options.map((option) => option.title),
    depositorySupplyCount: Object.keys(supplyByPackId).length || DEMONSTRATION_DATA_PACK_CATALOG.length,
  });

  const [owner, name] = input.repositoryFullName.split('/');
  const execution = input.execution;
  storeCrossPhaseArtifact(execution, 'implementation', 'options', options);
  storeCrossPhaseArtifact(execution, 'read', 'evaluation', input.evaluation);
  storeCrossPhaseArtifact(execution, 'read', 'repository', {
    owner,
    name,
    fullName: input.repositoryFullName,
    branch: input.sourceBranch,
    commit: input.reference,
  });
  storeCrossPhaseArtifact(execution, 'read', 'sourceCheckoutCatalog', {
    paths: inScope,
    samples: [],
    totalPathCount: inScope.length,
    excludedPathCount: checkout.paths.length - inScope.length,
  });
  storeCrossPhaseArtifact(execution, 'validation', 'readyToFinish', {
    recommendation: 'finish',
    readyToFinish: true,
    summary: `${options.length} measured DataPack option(s) ranked by evaluation-fit for this Evaluation.`,
    issues: [],
  });
  return runReadFinishSynthesizeRunAgent({}, execution);
}
