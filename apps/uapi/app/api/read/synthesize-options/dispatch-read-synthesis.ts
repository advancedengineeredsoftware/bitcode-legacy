/**
 * Background read option synthesis (deposit dispatch twin).
 *
 * Same host/stream/cancel shape as deposit: early emitStatus, preload depository
 * supply for Discovery search, then the resolved synthesis pipeline (rich SDIVF,
 * quick one-call, or demonstration replay). No clone during initialization:
 * rich read Setup clones on the Host (deposit law).
 * Product deltas only: Evaluation (not Obfuscations), evaluation-fits search, relatives.
 *
 * Cooperative cancel: polls executions.status between stages (same law as deposit).
 */

import { supabaseAdmin } from '@bitcode/supabase';
import { Execution, ExecutionStreamAdapter } from '@bitcode/execution-generics';
import { emitPhaseTransition } from '@bitcode/pipelines-generics';
import { runExecutionPipelineSDIVFSynthesizeReadAssetPacks } from '@bitcode/asset-packs-pipelines-execution-pipeline-sdivf-synthesize-reads-asset-packs';
import { storeCrossPhaseArtifact } from '@bitcode/asset-packs-pipelines-syntheses-domain';
import {
  assertExecutionNotCancelled,
  isExecutionCancelled,
  isExecutionCancelledError,
} from '@bitcode/api/pipelines/cancel';
import { loadDepositorySearchAssets } from '@/lib/depository-settled-demand';
import { withDemonstrationDataset } from '@bitcode/asset-packs-pipelines-syntheses-domain/demonstration';
import {
  resolveSynthesisPipelineMode,
  type RequestableSynthesisPipeline,
} from '@bitcode/asset-packs-pipelines-syntheses-domain/synthesis-pipeline-mode';
import { runDemonstrationReadSynthesis } from '@/lib/demonstration-synthesis';
import { resolveGitHubAccessTokenForUser } from '@/lib/github-repository-rest';
import { runQuickReadSynthesis, toQuickDepositorySupplyRows } from '@/lib/quick-synthesis';

export type ReadSynthesisDispatchInput = {
  runId: string;
  userId: string;
  repositoryFullName: string;
  sourceBranch: string;
  sourceCommit: string | null;
  evaluation: string;
  /** Deposit permissibleSources twin. */
  relevantPaths?: string[];
  /** Deposit impermissibleSources twin. */
  irrelevantPaths?: string[];
  /**
   * Streaming execution handle from createStreamingExecution (deposit twin).
   * When omitted, a new Execution is created bound to runId.
   */
  execution?: { id: string; get?: Function; findUp?: Function; store?: Function };
  /** Per-run override of BITCODE_SYNTHESIS_PIPELINE (V49 quick synthesis law Q-1). */
  synthesisPipeline?: RequestableSynthesisPipeline | null;
};

export async function runReadOptionSynthesis(input: ReadSynthesisDispatchInput): Promise<void> {
  const admin = supabaseAdmin;
  const { runId, userId } = input;
  const execution =
    (input.execution as Execution | undefined) ||
    new Execution(`pipeline:read:${runId}`);
  // Ensure stream events key off the durable run id (deposit twin).
  const streamRunId = (execution as { id?: string }).id || runId;

  storeCrossPhaseArtifact(execution, 'host', 'runId', runId);
  storeCrossPhaseArtifact(execution, 'pipeline', 'runId', runId);
  storeCrossPhaseArtifact(execution, 'pipeline', 'productPipeline', 'synthesize-reads-asset-packs-pipeline');
  storeCrossPhaseArtifact(execution, 'pipeline', 'supabase', admin);
  storeCrossPhaseArtifact(execution, 'deposit', 'supabase', admin);
  storeCrossPhaseArtifact(execution, 'read', 'relevantPaths', input.relevantPaths || []);
  storeCrossPhaseArtifact(execution, 'read', 'irrelevantPaths', input.irrelevantPaths || []);
  storeCrossPhaseArtifact(execution, 'read', 'evaluation', input.evaluation);
  // Deposit steering keys so shared discovery filters can reuse exclusion law.
  storeCrossPhaseArtifact(execution, 'deposit', 'permissibleSources', input.relevantPaths || []);
  storeCrossPhaseArtifact(execution, 'deposit', 'impermissibleSources', input.irrelevantPaths || []);

  const assertNotCancelled = () => assertExecutionNotCancelled(admin, runId);

  const emitStatus = (message: string, extra: Record<string, unknown> = {}) => {
    try {
      ExecutionStreamAdapter.emitEvent(streamRunId, 'status' as never, { message, ...extra });
    } catch {
      /* streaming optional */
    }
  };

  /**
   * Persist terminal rows only while still `running` so a concurrent cancel
   * is not overwritten to completed/failed.
   */
  const finalizeIfStillRunning = async (row: Record<string, unknown>) => {
    if (await isExecutionCancelled(admin, runId)) return false;
    const { error } = await admin
      .from('executions')
      .update({
        ...row,
        // Demonstration runs stay in the demonstration dataset on every write.
        ...(row.context && typeof row.context === 'object'
          ? { context: withDemonstrationDataset(row.context as Record<string, unknown>) }
          : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', runId)
      .eq('user_id', userId)
      .eq('status', 'running');
    return !error;
  };

  const [owner, name] = input.repositoryFullName.split('/');
  const pipelineInput: Record<string, unknown> = {
    mode: 'read',
    synthesizeMode: 'read',
    evaluation: input.evaluation,
    repositoryFullName: input.repositoryFullName,
    sourceBranch: input.sourceBranch,
    sourceCommit: input.sourceCommit,
    relevantPaths: input.relevantPaths || [],
    irrelevantPaths: input.irrelevantPaths || [],
    permissibleSources: input.relevantPaths || [],
    impermissibleSources: input.irrelevantPaths || [],
    repository: {
      owner,
      name,
      fullName: input.repositoryFullName,
      branch: input.sourceBranch,
      commit: input.sourceCommit,
    },
  };

  try {
    // First stream event BEFORE any stall-prone await (deposit parity).
    await assertNotCancelled();
    try {
      await emitPhaseTransition(execution as never, 'read-option-synthesis', 'start', {
        repositoryFullName: input.repositoryFullName,
        sourceBranch: input.sourceBranch,
        sourceCommit: input.sourceCommit,
      });
    } catch {
      /* phase transition optional when adapter not registered */
    }
    emitStatus(
      `AssetPacksSynthesis (read lens) started for ${input.repositoryFullName}.`,
    );

    // Preload depository supply so Discovery evaluation-fits search has assets.
    await assertNotCancelled();
    let searchAssets: Awaited<ReturnType<typeof loadDepositorySearchAssets>> = [];
    try {
      searchAssets = await loadDepositorySearchAssets(120);
      storeCrossPhaseArtifact(execution, 'depository', 'settledAssets', searchAssets);
      storeCrossPhaseArtifact(execution, 'deposit', 'settledDepositoryAssets', searchAssets);
      storeCrossPhaseArtifact(execution, 'pipeline', 'depositoryAssets', searchAssets);
      emitStatus(
        `depository: ${searchAssets.length} supply AssetPack(s) loaded for Evaluation-fit search.`,
      );
    } catch {
      storeCrossPhaseArtifact(execution, 'depository', 'settledAssets', []);
      storeCrossPhaseArtifact(execution, 'deposit', 'settledDepositoryAssets', []);
      emitStatus('depository: supply load failed (search will run empty / vector-only).');
    }

    const synthesisPipeline = resolveSynthesisPipelineMode({ requested: input.synthesisPipeline });
    // Operator demonstration mode: curated paced replay replaces SDIVF.
    const demonstrationReplay = synthesisPipeline === 'demonstration';

    await assertNotCancelled();
    emitStatus(
      synthesisPipeline === 'quick'
        ? 'Running SynthesizeReadAssetPacksQuick: gather → one model call → measure → Finish…'
        : 'Running SynthesizeAssetPacks (read mode): Setup (Evaluation) → Discovery (Evaluation-fits search) → Implementation → Validation → Finish…',
    );

    const reference = input.sourceCommit || input.sourceBranch || 'HEAD';
    const result = synthesisPipeline === 'quick'
      ? await runQuickReadSynthesis({
          runId,
          execution,
          repositoryFullName: input.repositoryFullName,
          reference,
          accessToken: await resolveGitHubAccessTokenForUser(userId),
          sourceBranch: input.sourceBranch,
          evaluation: input.evaluation,
          relevantPaths: input.relevantPaths || [],
          irrelevantPaths: input.irrelevantPaths || [],
          depositorySupply: toQuickDepositorySupplyRows(searchAssets),
          emitStatus,
        })
      : demonstrationReplay
      ? await runDemonstrationReadSynthesis({
          runId,
          userId,
          executionId: streamRunId,
          execution,
          repositoryFullName: input.repositoryFullName,
          reference,
          sourceBranch: input.sourceBranch,
          evaluation: input.evaluation,
          relevantPaths: input.relevantPaths || [],
          irrelevantPaths: input.irrelevantPaths || [],
          emitStatus,
        })
      : await runExecutionPipelineSDIVFSynthesizeReadAssetPacks(
          pipelineInput,
          execution as never,
        );

    await assertNotCancelled();

    // V48-Gate5-F01: finish returns unpaid options for browser; fullOptions
    // for settle rehydrate only (history API redacts fullOptions forever).
    const selectionEnvelope =
      (execution as any).get?.('finish', 'selectionEnvelope') ||
      (result as any)?.selectionEnvelope ||
      null;
    const unpaidOptions =
      (result as any)?.options ||
      selectionEnvelope?.options ||
      [];
    const fullOptions =
      (execution as any).get?.('finish', 'fullOptions') ||
      (result as any)?.fullOptions ||
      [];
    const catalogSourcePathCount =
      (execution as any).get?.('finish', 'catalogSourcePathCount') ||
      (result as any)?.catalogSourcePathCount ||
      null;
    const optionCount = Array.isArray(unpaidOptions) ? unpaidOptions.length : 0;

    await finalizeIfStillRunning({
      status: 'completed',
      completed_at: new Date().toISOString(),
      output: {
        productPipeline: 'synthesize-reads-asset-packs-pipeline',
        selectionEnvelope,
        optionCount,
        // Browser hydrate path — unpaid only.
        options: unpaidOptions,
        // Server rehydrate for settle — never returned by history redaction.
        fullOptions: Array.isArray(fullOptions) ? fullOptions : [],
        catalogSourcePathCount,
        success: true,
        disclosure: {
          class: 'unpaid-title-summary-measurements-only',
        },
      },
      context: {
        source: 'read-synthesize-options',
        route: '/reads',
        pipelineCore: 'synthesize-reads-asset-packs-pipeline',
        synthesisMode: 'read',
        repositoryFullName: input.repositoryFullName,
        sourceBranch: input.sourceBranch,
        sourceCommit: input.sourceCommit,
        optionCount,
        synthesisPipeline,
        ...(demonstrationReplay ? { synthesisReplay: 'demonstration' } : {}),
      },
    });
    try {
      await emitPhaseTransition(execution as never, 'read-option-synthesis', 'complete', {
        optionCount,
      });
    } catch {
      /* optional */
    }
    emitStatus(
      `Synthesized ${optionCount} measured read AssetPack option(s).`,
    );
  } catch (err) {
    if (isExecutionCancelledError(err) || (await isExecutionCancelled(admin, runId))) {
      emitStatus('Run cancelled — read synthesis stopped cooperatively.');
      return;
    }

    const message = err instanceof Error ? err.message : String(err);
    emitStatus(`Read option synthesis failed: ${message.slice(0, 280)}`);
    await finalizeIfStillRunning({
      status: 'failed',
      completed_at: new Date().toISOString(),
      error: { message },
      output: {
        summary: message,
      },
      context: {
        source: 'read-synthesize-options',
        route: '/reads',
        pipelineCore: 'synthesize-reads-asset-packs-pipeline',
        synthesisMode: 'read',
        repositoryFullName: input.repositoryFullName,
        failureMessage: message,
      },
    });
  } finally {
    try {
      ExecutionStreamAdapter.unregisterStreamer?.(streamRunId);
    } catch {
      /* optional */
    }
  }
}
