/**
 * POST /api/packs/payout/finalize
 *
 * V49 S-4: each contributing seller finalizes THEIR source-to-shares slice of a
 * settled read DataPack (inverse treasury remainder on the slice:
 * sellerBtdBps of slice BTD + (10000 - sellerBtdBps) of slice coin), keyed by
 * (settleRunId, session user). Only a contributor may finalize, once.
 * Legacy V48 rows without a compensation statement keep the single-seller
 * path (linked `sellerUserId`, else the settle-run owner).
 */

import { NextResponse } from 'next/server';
import { createClient } from '@bitcode/supabase/ssr/server';
import { supabaseAdmin } from '@bitcode/supabase';
import { isExecutionInActiveDataset } from '@bitcode/asset-packs-pipelines-syntheses-domain/demonstration';
import {
  BITCODE_BTD_TOKEN_ID,
  ContributorFinalizeError,
  computePayoutSplit,
  finalizeContributorSlice,
  type CompensationStatement,
  createBitcodeErc1155State,
  finalizeSellerPayout,
  payoutSplitToPreview,
  serializeBitcodeErc1155State,
} from '@bitcode/btd/erc1155';

export const runtime = 'nodejs';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (!user || userError) {
    return NextResponse.json(
      { ok: false, error: 'Session required to finalize payout.', code: 'session_required' },
      { status: 401 },
    );
  }

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (!isObject(parsed)) throw new Error('invalid body');
    body = parsed;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body.' }, { status: 400 });
  }

  const settleRunId = typeof body.settleRunId === 'string' ? body.settleRunId.trim() : '';
  const sellerBtdBps =
    typeof body.sellerBtdBps === 'number'
      ? body.sellerBtdBps
      : typeof body.sellerBtdBps === 'string'
        ? Number(body.sellerBtdBps)
        : NaN;

  if (!settleRunId) {
    return NextResponse.json({ ok: false, error: 'settleRunId required.' }, { status: 400 });
  }
  if (!Number.isFinite(sellerBtdBps) || sellerBtdBps < 0 || sellerBtdBps > 10_000) {
    return NextResponse.json(
      { ok: false, error: 'sellerBtdBps must be 0..10000.' },
      { status: 400 },
    );
  }

  const { data: row, error } = await supabaseAdmin
    .from('executions')
    .select('id, user_id, output, context, status')
    .eq('id', settleRunId)
    .maybeSingle();

  if (error || !row || !isExecutionInActiveDataset(row)) {
    return NextResponse.json({ ok: false, error: 'Settle run not found.' }, { status: 404 });
  }
  const output = (row.output as Record<string, unknown> | null) || {};
  const context = (row.context as Record<string, unknown> | null) || {};

  const statement = output.compensationStatement as CompensationStatement | null | undefined;
  if (statement && statement.schema === 'bitcode.settle.compensation-statement') {
    if (row.status !== 'completed') {
      return NextResponse.json({ ok: false, error: 'Settle run is not completed.' }, { status: 409 });
    }
    try {
      const { statement: nextStatement, slice } = finalizeContributorSlice(statement, {
        sellerUserId: String(user.id),
        sellerBtdBps,
      });
      const allFinalized = nextStatement.contributors.every((entry) => entry.status === 'finalized');
      const payoutState = allFinalized ? 'finalized' : 'partially-finalized';
      const { error: updateError } = await supabaseAdmin
        .from('executions')
        .update({
          output: { ...output, compensationStatement: nextStatement, payoutState },
          context: { ...context, payoutState },
        })
        .eq('id', settleRunId);
      if (updateError) {
        return NextResponse.json(
          { ok: false, error: updateError.message || 'Failed to persist payout.' },
          { status: 500 },
        );
      }
      return NextResponse.json({ ok: true, settleRunId, payoutState, slice, compensationStatement: nextStatement });
    } catch (error) {
      if (error instanceof ContributorFinalizeError) {
        return NextResponse.json(
          { ok: false, error: error.message, code: error.code },
          { status: error.code === 'not_a_contributor' ? 403 : 409 },
        );
      }
      throw error;
    }
  }

  const pending =
    (output.pendingPayout as Record<string, unknown> | null) ||
    (context.pendingPayout as Record<string, unknown> | null);

  // Fail-closed: the seller (depositor of the settled DataPack) finalizes the
  // split (V48 G4-5). Rows settled before seller linkage existed fall back to
  // the settle-run owner. Non-authorized viewers see not-found.
  const sellerUserId =
    (typeof context.sellerUserId === 'string' && context.sellerUserId) ||
    (pending && typeof pending.sellerUserId === 'string' ? pending.sellerUserId : null);
  const authorizedUserId = sellerUserId || String(row.user_id || '');
  if (authorizedUserId !== String(user.id)) {
    return NextResponse.json(
      { ok: false, error: 'Settle run not found.', code: 'settle_run_forbidden' },
      { status: 404 },
    );
  }
  if (row.status !== 'completed') {
    return NextResponse.json({ ok: false, error: 'Settle run is not completed.' }, { status: 409 });
  }

  if (!pending || pending.schema !== 'bitcode.settle.pending-payout') {
    return NextResponse.json(
      { ok: false, error: 'No pending payout on this settle run.' },
      { status: 409 },
    );
  }
  if (pending.status === 'finalized') {
    return NextResponse.json({ ok: false, error: 'Payout already finalized.' }, { status: 409 });
  }

  const sellerAccount = String(pending.sellerAccount || '');
  const masterAccount = String(pending.masterAccount || '0xmaster');
  const btdVolume = BigInt(String(pending.btdVolume || '0'));
  const payAmount = BigInt(String(pending.payAmount || '0'));
  const payAsset =
    pending.payAsset === 'BTC' || pending.payAsset === 'SOL' ? pending.payAsset : 'ETH';
  const assetPackKey = String(pending.assetPackKey || settleRunId);

  // Projected finalize (testnet): seed escrow as post-settle, then distribute.
  const state = createBitcodeErc1155State({
    masterAccount,
    operator: '0xbitcode-settlement-operator',
  });
  state.btdTotalMinted = btdVolume;
  const masterKey = masterAccount.toLowerCase();
  const byToken = new Map<bigint, bigint>();
  byToken.set(BITCODE_BTD_TOKEN_ID, btdVolume);
  state.balances.set(masterKey, byToken);

  const paid = finalizeSellerPayout(state, {
    sellerAccount,
    sellerBtdBps,
    btdVolume,
    payAmount,
    payAsset,
    assetPackKey,
  });

  const split = computePayoutSplit({
    btdVolume,
    payAmount,
    payAsset,
    sellerBtdBps,
  });
  const preview = payoutSplitToPreview(split);

  const finalizedPayout = {
    ...pending,
    status: 'finalized',
    sellerBtdBpsFinalized: split.sellerBtdBps,
    finalizedAt: new Date().toISOString(),
    sellerBtd: split.sellerBtd.toString(),
    treasuryBtd: split.treasuryBtd.toString(),
    sellerPay: split.sellerPay.toString(),
    treasuryPay: split.treasuryPay.toString(),
    receipt: paid.receipt,
    erc1155State: serializeBitcodeErc1155State(paid.state),
  };

  const nextOutput = {
    ...output,
    pendingPayout: finalizedPayout,
    payoutState: 'finalized',
    payoutPreview: preview,
  };
  const nextContext = {
    ...context,
    payoutState: 'finalized',
    sellerBtdBpsFinalized: split.sellerBtdBps,
  };

  const { error: updateError } = await supabaseAdmin
    .from('executions')
    .update({
      output: nextOutput,
      context: nextContext,
    })
    .eq('id', settleRunId);

  if (updateError) {
    return NextResponse.json(
      { ok: false, error: updateError.message || 'Failed to persist payout.' },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    settleRunId,
    payout: finalizedPayout,
    preview,
    split: {
      sellerBtdBps: split.sellerBtdBps,
      sellerEthBps: split.sellerEthBps,
      treasuryBtdBps: split.treasuryBtdBps,
      treasuryEthBps: split.treasuryEthBps,
      sellerBtd: split.sellerBtd.toString(),
      treasuryBtd: split.treasuryBtd.toString(),
      sellerPay: split.sellerPay.toString(),
      treasuryPay: split.treasuryPay.toString(),
      payAsset: split.payAsset,
    },
  });
}

/** Preview totals without writing (seller slider). Session required (S-4). */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: 'Session required to preview payout.', code: 'session_required' },
      { status: 401 },
    );
  }
  const url = new URL(request.url);
  const btdVolume = BigInt(url.searchParams.get('btdVolume') || '0');
  const payAmount = BigInt(url.searchParams.get('payAmount') || '0');
  const sellerBtdBps = Number(url.searchParams.get('sellerBtdBps') || '5000');
  const payAssetParam = url.searchParams.get('payAsset') || 'ETH';
  const payAsset =
    payAssetParam === 'BTC' || payAssetParam === 'SOL' ? payAssetParam : 'ETH';

  const split = computePayoutSplit({
    btdVolume,
    payAmount,
    payAsset,
    sellerBtdBps,
  });

  return NextResponse.json({
    ok: true,
    preview: payoutSplitToPreview(split),
    split: {
      sellerBtdBps: split.sellerBtdBps,
      sellerEthBps: split.sellerEthBps,
      treasuryBtdBps: split.treasuryBtdBps,
      treasuryEthBps: split.treasuryEthBps,
      sellerBtd: split.sellerBtd.toString(),
      treasuryBtd: split.treasuryBtd.toString(),
      sellerPay: split.sellerPay.toString(),
      treasuryPay: split.treasuryPay.toString(),
      payAsset: split.payAsset,
    },
  });
}
