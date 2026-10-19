/**
 * Deposit option synthesis dispatch core (session-free): ownership, steering, run-id guard,
 * dispatch-context upsert, streaming execution, waitUntil background synthesis.
 * Shared by POST /api/deposit/synthesize-options and the hosted MCP `deposit` tool (V49 C-2).
 */

import { randomUUID } from 'crypto';

import { waitUntil } from '@vercel/functions';

import { supabaseAdmin } from '@bitcode/supabase';
import { createStreamingExecution } from '@bitcode/pipelines-generics';
import { normalizeSourcePathList } from '@bitcode/asset-packs-pipelines-syntheses-domain/asset-packs-synthesis';
import { isAssetPackRealInferenceEnabled } from '@bitcode/asset-packs-pipelines-syntheses-domain/runtime-inference-policy';
import {
  isBitcodeDemonstrationModeEnabled,
  withDemonstrationDataset,
} from '@bitcode/asset-packs-pipelines-syntheses-domain/demonstration';
import {
  bitcodeServerTelemetry,
  compactBitcodeServerId,
} from '@/lib/bitcode-server-telemetry';
import { sweepOrphanedExecutions } from '@bitcode/api/pipelines/orphan-sweep';
import {
  parseSynthesizeOptionsSteering,
  type SynthesizeOptionsBody,
} from './parse-synthesize-options-body';
import {
  parseRequestedSynthesisPipeline,
  type RequestableSynthesisPipeline,
} from '@bitcode/asset-packs-pipelines-syntheses-domain/synthesis-pipeline-mode';
import { runDepositOptionSynthesis } from './dispatch-deposit-synthesis';


const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type SynthesisDispatchResult = { status: number; body: Record<string, unknown> };

export async function startDepositSynthesisForUser(input: { userId: string; body: SynthesizeOptionsBody }): Promise<SynthesisDispatchResult> {
  const { userId } = input;
  const body = input.body;

  // Real inference is the product default (host/Pipeliner). Explicit opt-out
  // BITCODE_ASSET_PACK_REAL_INFERENCE=0 remains for deterministic unit tests.
  // Demonstration mode replays synthesis, so the inference opt-out does not gate it.
  if (!isAssetPackRealInferenceEnabled() && !isBitcodeDemonstrationModeEnabled()) {
    return { status: 422, body: {
        error:
          'Deposit option synthesis requires real inference (unset BITCODE_ASSET_PACK_REAL_INFERENCE or set it to 1).',
        code: 'real_inference_required',
      } };
  }


  let synthesisPipeline: RequestableSynthesisPipeline | null;
  try {
    synthesisPipeline = parseRequestedSynthesisPipeline(
      (body as { synthesisPipeline?: unknown }).synthesisPipeline,
    );
  } catch (error) {
    return { status: 400, body: {
        error: error instanceof Error ? error.message : 'Invalid synthesisPipeline.',
        code: 'invalid_synthesis_pipeline',
      } };
  }

  const steering = parseSynthesizeOptionsSteering(body);
  if ('error' in steering) {
    return { status: steering.status, body: { error: steering.error } };
  }
  const {
    repositoryFullName,
    requestedRunId,
    sourceBranch,
    sourceCommit,
    obfuscations,
    demandContext,
    depositoryDemandSignals,
    readingDemandSignals,
    existingDepositorySignals,
  } = steering;
  const runId = requestedRunId && UUID_PATTERN.test(requestedRunId) ? requestedRunId : randomUUID();

  // Fire-and-forget orphan sweep (V48-Gate3-F31: waitUntil keeps instance alive).
  waitUntil(sweepOrphanedExecutions(supabaseAdmin).catch(() => {}));
  const permissibleSources = normalizeSourcePathList(steering.permissibleSourcesRaw);
  const impermissibleSources = normalizeSourcePathList(steering.impermissibleSourcesRaw);

  const { data: ownedRepository, error: repositoryError } = await supabaseAdmin
    .from('vcs_repositories')
    .select('repo_full_name')
    .eq('user_id', userId)
    .eq('repo_full_name', repositoryFullName)
    .maybeSingle();
  if (repositoryError) {
    return { status: 500, body: { error: repositoryError.message } };
  }
  if (!ownedRepository) {
    return { status: 403, body: { error: 'Repository is not in the connected GitHub inventory for this account.', code: 'repository_not_connected' } };
  }

  const { data: githubConnection, error: connectionError } = await supabaseAdmin
    .from('user_connections')
    .select('connection_data')
    .eq('user_id', userId)
    .eq('provider', 'github')
    .eq('is_active', true)
    .maybeSingle();
  if (connectionError || !githubConnection?.connection_data) {
    return { status: 422, body: { error: 'An active GitHub connection is required for deposit option synthesis.', code: 'github_connection_required' } };
  }

  const startedAt = Date.now();
  const startedAtIso = new Date(startedAt).toISOString();

  // Guard runId before any write (client may supply id for log tailing).
  const { data: existingRun } = await supabaseAdmin
    .from('executions')
    .select('id, user_id, status')
    .eq('id', runId)
    .maybeSingle();
  if (existingRun) {
    return { status: 409, body: {
        error:
          existingRun.user_id === userId
            ? 'This run id has already been dispatched.'
            : 'This run id is not available.',
        code: 'run_id_conflict',
      } };
  }

  // Master-detail lens identity AT DISPATCH so running rows are attachable as Deposit.
  const { error: dispatchContextError } = await supabaseAdmin.from('executions').upsert(
    {
      id: runId,
      user_id: userId,
      type: 'agentic-execution:asset-pack',
      status: 'running',
      created_at: startedAtIso,
      started_at: startedAtIso,
      updated_at: new Date().toISOString(),
      context: withDemonstrationDataset({
        source: 'deposit-option-synthesis',
        workbench: 'deposit-option-synthesis',
        route: '/deposits',
        pipelineCore: 'AssetPacksSynthesis',
        synthesisMode: 'deposit',
        repositoryFullName,
        sourceBranch,
        sourceCommit,
        // Full steering for locked run-detail UI rehydrate (not counts only).
        obfuscations: obfuscations || '',
        permissibleSources,
        impermissibleSources,
        permissibleSourceCount: permissibleSources.length,
        impermissibleSourceCount: impermissibleSources.length,
        hasObfuscations: Boolean(obfuscations),
      }),
    },
    { onConflict: 'id' },
  );
  if (dispatchContextError) {
    bitcodeServerTelemetry('warn', 'deposit-synthesize-options', 'dispatch-context-write-failed', {
      userId: compactBitcodeServerId(userId),
      message: dispatchContextError.message,
    });
  }

  const execution = createStreamingExecution({
    runId,
    userId: userId,
    supabase: supabaseAdmin,
    streamToDatabase: true,
    structuredToDatabase: false,
  });

  // V48-Gate3-F26-B / F31: background synthesis; waitUntil keeps the Function alive.
  waitUntil(
    runDepositOptionSynthesis({
      runId,
      userId: userId,
      repositoryFullName,
      sourceBranch,
      sourceCommit,
      obfuscations,
      permissibleSources,
      impermissibleSources,
      demandContext,
      depositoryDemandSignals,
      readingDemandSignals,
      existingDepositorySignals,
      githubConnectionData: githubConnection.connection_data,
      supabaseAdmin,
      execution,
      startedAt,
      startedAtIso,
      synthesisPipeline,
    }),
  );

  return { status: 200, body: { ok: true, executionId: runId, runId, status: 'dispatched' } };
}
