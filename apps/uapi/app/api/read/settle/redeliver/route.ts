/**
 * POST /api/read/settle/redeliver — retry repository PR delivery for a settled
 * read DataPack whose delivery is `projected` or `failed` (V49 S-6).
 *
 * Buyer only (settle-row owner). Idempotent: an already-opened delivery is
 * returned unchanged; no payment, mint, rights, or compensation effects —
 * only the ship stage re-runs from the persisted entitled patch. Each attempt
 * appends a redelivery receipt.
 */

import { NextResponse } from 'next/server';

import { supabaseAdmin } from '@bitcode/supabase';
import { createClient } from '@bitcode/supabase/ssr/server';
import { Execution } from '@bitcode/execution-generics';
import {
  redeliverSettledAssetPackPatchPr,
  type SettleAssetPackOption,
} from '@bitcode/asset-packs-pipelines-execution-pipeline-simple-settle-asset-pack';
import { isExecutionInActiveDataset } from '@bitcode/asset-packs-pipelines-syntheses-domain/demonstration';
import { resolveGitHubAccessTokenForUser, resolveGitHubCommitSha } from '@/lib/github-repository-rest';

export const runtime = 'nodejs';
export const maxDuration = 120;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Session required to redeliver.', code: 'session_required' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (!isObject(parsed)) throw new Error('invalid');
    body = parsed;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body.' }, { status: 400 });
  }
  const settleRunId = typeof body.settleRunId === 'string' ? body.settleRunId.trim() : '';
  if (!settleRunId) {
    return NextResponse.json({ ok: false, error: 'settleRunId required.' }, { status: 400 });
  }

  const admin = supabaseAdmin;
  const { data: row, error } = await admin
    .from('executions')
    .select('id, user_id, status, output, context')
    .eq('id', settleRunId)
    .maybeSingle();
  const context = isObject(row?.context) ? row!.context : {};
  if (
    error ||
    !row ||
    row.user_id !== user.id ||
    !isExecutionInActiveDataset(row) ||
    context.source !== 'read-settle-asset-pack'
  ) {
    return NextResponse.json({ ok: false, error: 'Settle run not found.', code: 'settle_run_not_found' }, { status: 404 });
  }
  if (row.status !== 'completed') {
    return NextResponse.json({ ok: false, error: 'Settle run is not completed.' }, { status: 409 });
  }

  const output = isObject(row.output) ? row.output : {};
  const shippable = isObject(output.shippable) ? output.shippable : {};
  const priorState = String(output.deliveryState || shippable.status || context.deliveryState || 'projected');
  const priorPrUrl = (typeof output.prUrl === 'string' && output.prUrl) || null;
  if (priorState === 'opened' && priorPrUrl) {
    return NextResponse.json({ ok: true, settleRunId, alreadyDelivered: true, deliveryState: 'opened', prUrl: priorPrUrl });
  }
  if (priorState !== 'projected' && priorState !== 'failed') {
    return NextResponse.json(
      { ok: false, error: `Delivery state ${priorState} is not redeliverable.`, code: 'delivery_not_redeliverable' },
      { status: 409 },
    );
  }

  const entitled = isObject(output.entitledPatch) ? output.entitledPatch : null;
  if (!entitled || !isObject(entitled.patch)) {
    return NextResponse.json(
      { ok: false, error: 'No entitled patch is recorded for this settle.', code: 'entitled_patch_missing' },
      { status: 409 },
    );
  }
  const option: SettleAssetPackOption = {
    title: typeof entitled.title === 'string' ? entitled.title : (output.assetPackTitle as string) || 'DataPack',
    summary: typeof entitled.summary === 'string' ? entitled.summary : undefined,
    patch: entitled.patch as SettleAssetPackOption['patch'],
    measurements: { absolutes: [], relatives: [] },
  } as SettleAssetPackOption;

  const repo = isObject(shippable.repository) ? shippable.repository : {};
  const fullName =
    (typeof repo.fullName === 'string' && repo.fullName) ||
    (typeof context.repositoryFullName === 'string' && context.repositoryFullName) ||
    null;
  const githubAccessToken = await resolveGitHubAccessTokenForUser(user.id, admin);
  let commit = typeof repo.commit === 'string' && repo.commit ? repo.commit : null;
  const branch = typeof repo.branch === 'string' && repo.branch ? repo.branch : 'main';
  if (!commit && githubAccessToken && fullName) {
    commit = await resolveGitHubCommitSha({ token: githubAccessToken, repositoryFullName: fullName, ref: branch });
  }

  const delivered = await redeliverSettledAssetPackPatchPr(
    {
      repository: { fullName, branch, commit },
      assetPackOption: option,
      githubAccessToken,
      paymentObservation: {
        schema: 'bitcode.settle-asset-pack.payment-observation',
        network: 'ethereum-sepolia',
        status: 'final',
        txId: typeof context.paymentTxId === 'string' ? context.paymentTxId : null,
        explorerUrl: typeof context.paymentExplorerUrl === 'string' ? context.paymentExplorerUrl : null,
        amountSats: null,
      } as never,
      compensationStatement: (isObject(output.compensationStatement) ? output.compensationStatement : null) as never,
    },
    new Execution(`pipeline:settle-redeliver:${settleRunId}`),
  );

  const attempt = {
    attemptedAt: new Date().toISOString(),
    status: delivered.status,
    prUrl: delivered.prUrl ?? null,
    prError: delivered.prError ?? null,
  };
  const redeliveries = [...(Array.isArray(output.redeliveries) ? output.redeliveries : []), attempt];
  const deliveryState = delivered.status === 'opened' ? 'opened' : priorState;
  const prUrl = delivered.prUrl ?? priorPrUrl;
  await admin
    .from('executions')
    .update({
      output: { ...output, shippable: delivered, deliveryState, prUrl, deliveryReference: prUrl, redeliveries },
      context: {
        ...context,
        deliveryState,
        prUrl,
        deliveryReference: prUrl,
        ...(delivered.status === 'opened' ? { buyerState: 'repository-delivery-redelivered' } : {}),
      },
    })
    .eq('id', settleRunId);

  return NextResponse.json({
    ok: delivered.status === 'opened',
    settleRunId,
    deliveryState,
    prUrl,
    attempt,
  }, { status: delivered.status === 'opened' ? 200 : 502 });
}
