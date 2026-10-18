/**
 * POST /api/read/settle/quote
 * Build multi-rail spot options (ETH/BTC/SOL) for a relatives BTD volume.
 * Testnet default: mock spots.
 *
 * Preferred body: { synthesisRunId, selectedIndexes } — the server rehydrates
 * the buyer's selection, prices each option alone (1:1 settle law), and
 * returns rail totals plus the settlement pay-to recipients. These totals are
 * exactly what POST /api/read/settle verifies on-chain.
 * Legacy body: { measurements } — one advisory quote for a relatives bag.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@bitcode/supabase/ssr/server';
import {
  isSettlementPaymentRequired,
  quoteReadSettlementSelection,
  rehydrateReadSynthesisSelection,
  resolveSettlementPayTo,
  resolveSettlementSpotBoard,
} from '@/lib/read-settlement-checkout';
import {
  applyBtdSupplyDecay,
  assertPositiveSettlementBtd,
  buildMultiRailSpotQuote,
  computeSettlementBtdFromRelatives,
  evaluationFitVolumeToBaseUnits,
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
      { ok: false, error: 'Session required.', code: 'session_required' },
      { status: 401 },
    );
  }

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (!isObject(parsed)) throw new Error('bad body');
    body = parsed;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON.' }, { status: 400 });
  }

  if (typeof body.synthesisRunId === 'string') {
    const selection = await rehydrateReadSynthesisSelection({
      userId: user.id,
      synthesisRunId: body.synthesisRunId,
      selectedIndexes: body.selectedIndexes,
    });
    if (!selection.ok) {
      return NextResponse.json(
        { ok: false, error: selection.error, code: selection.code },
        { status: selection.status },
      );
    }
    try {
      const quote = quoteReadSettlementSelection(selection.options);
      return NextResponse.json({
        ok: true,
        provider: quote.provider,
        evaluationFitVolume: quote.evaluationFitVolume,
        btdVolume: quote.btdVolume,
        btdVolumeDisplay: quote.btdVolumeDisplay,
        decay: quote.decay,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        options: quote.totals,
        perOption: quote.perOption,
        payTo: resolveSettlementPayTo(),
        paymentRequired: isSettlementPaymentRequired(),
      });
    } catch (err) {
      return NextResponse.json(
        { ok: false, error: err instanceof Error ? err.message : 'Selected options cannot be priced.' },
        { status: 400 },
      );
    }
  }

  const measurements = body.measurements;
  const btdTotalMinted =
    typeof body.btdTotalMinted === 'string'
      ? BigInt(body.btdTotalMinted)
      : typeof body.btdTotalMinted === 'number'
        ? BigInt(Math.floor(body.btdTotalMinted))
        : 0n;

  let raw;
  try {
    raw = assertPositiveSettlementBtd(
      computeSettlementBtdFromRelatives(
        measurements as Parameters<typeof computeSettlementBtdFromRelatives>[0],
      ),
    );
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : 'Invalid relatives for BTD volume.',
      },
      { status: 400 },
    );
  }

  const decayed = applyBtdSupplyDecay({
    rawVolumeBaseUnits: raw.amountBaseUnits,
    btdTotalMinted,
  });
  if (decayed.btdVolume <= 0n) {
    return NextResponse.json(
      { ok: false, error: 'Decayed BTD volume is zero.' },
      { status: 400 },
    );
  }

  const multi = buildMultiRailSpotQuote(decayed.btdVolume, resolveSettlementSpotBoard());
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  return NextResponse.json({
    ok: true,
    provider: multi.board.provider,
    evaluationFitVolume: raw.evaluationFitVolume,
    rawVolumeBaseUnits: raw.amountBaseUnits.toString(),
    btdVolume: decayed.btdVolume.toString(),
    btdVolumeDisplay: (Number(decayed.btdVolume) / Number(evaluationFitVolumeToBaseUnits(1) || 1n)).toFixed(
      6,
    ),
    decay: decayed.decay,
    decayMicro: decayed.decayMicro,
    expiresAt,
    options: multi.options.map((o) => ({
      payAsset: o.payAsset,
      payAmount: o.payAmount.toString(),
      payAmountDisplay: o.payAmountDisplay,
      rateMicro: o.rateMicro,
      payAmountUsd: o.payAmountUsd,
      rateUpdatedAt: o.rateUpdatedAt,
      available: o.available,
      unavailableReason: o.unavailableReason ?? null,
      decimals: o.decimals,
    })),
  });
}
