/**
 * POST /api/read/settle — spawn one ExecutionPipelineSimpleSettleAssetPack per bought option.
 *
 * 1:1 AssetPack : settle pipeline. SynthesizeRead may return multiple options;
 * each selected option gets its own settle run (pay ETH|BTC|SOL → BTD volume
 * escrow mint → AP co-own → PR → packs). Seller finalizes BTD/pay split on /exchange.
 *
 * V48-Gate5-F01: preferred client payload is synthesisRunId + selectedIndexes.
 * Server rehydrates full commercial material from the synthesis run (fullOptions).
 * Client-posted selectedOptions are unpaid-safe only and cannot supply patch.
 *
 * Payment: when the buyer supplies a txId it is verified on-chain against the
 * server-priced selection total and the rail's settlement recipient (fail
 * closed), and may back only one checkout. Demonstration mode (or
 * BITCODE_SETTLEMENT_REQUIRE_PAYMENT=1) requires a verified payment; otherwise
 * settle may still record a projected payment observation.
 */

import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';

import { supabaseAdmin } from '@bitcode/supabase';
import { createClient } from '@bitcode/supabase/ssr/server';
import { Execution } from '@bitcode/execution-generics';
import {
  runExecutionPipelineSimpleSettleAssetPack,
  type SettleAssetPackOption,
  type SettleAssetPackInput,
  type SettleBtcPaymentObservationInput,
  type SettleRepositoryRef,
} from '@bitcode/asset-packs-pipelines-execution-pipeline-simple-settle-asset-pack';
import type { PayAsset, UsdSpotBoard } from '@bitcode/btd/erc1155';
import { storeCrossPhaseArtifact } from '@bitcode/asset-packs-pipelines-syntheses-domain';
import { withDemonstrationDataset } from '@bitcode/asset-packs-pipelines-syntheses-domain/demonstration';
import { assessSelectedOptionsForSettle } from '@/components/reads/models/read-buyer-measurement-projection';
import {
  isSettlementPaymentAlreadyUsed,
  isSettlementPaymentRequired,
  quoteReadSettlementSelection,
  rehydrateReadSynthesisSelection,
  resolveSellerEthereumAddress,
  resolveSettlementPayTo,
  resolveSettlementSpotBoard,
  verifyReadSettlementPayment,
  type ReadOptionSupplyProvenance,
  type ReadSettlementQuote,
} from '@/lib/read-settlement-checkout';
import {
  resolveGitHubAccessTokenForUser,
  resolveGitHubCommitSha,
} from '@/lib/github-repository-rest';

export const runtime = 'nodejs';
export const maxDuration = 120;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseRepository(raw: unknown, fullNameFallback: string | null): SettleRepositoryRef {
  if (!isObject(raw)) {
    return { fullName: fullNameFallback };
  }
  return {
    url: typeof raw.url === 'string' ? raw.url : null,
    owner: typeof raw.owner === 'string' ? raw.owner : null,
    name: typeof raw.name === 'string' ? raw.name : null,
    branch: typeof raw.branch === 'string' ? raw.branch : null,
    commit: typeof raw.commit === 'string' ? raw.commit : null,
    fullName:
      typeof raw.fullName === 'string'
        ? raw.fullName
        : fullNameFallback,
  };
}

function parsePaymentObservation(
  raw: unknown,
  amountSats: unknown,
  txId: unknown,
): SettleBtcPaymentObservationInput {
  const base: SettleBtcPaymentObservationInput = {
    schema: 'bitcode.settle-asset-pack.payment-observation',
    network: 'ethereum-sepolia',
    status: 'observed-projection',
    amountSats: typeof amountSats === 'number' ? amountSats : null,
    txId: typeof txId === 'string' ? txId : null,
  };
  if (!isObject(raw)) return base;
  return {
    schema:
      typeof raw.schema === 'string'
        ? raw.schema
        : base.schema,
    network: typeof raw.network === 'string' ? raw.network : base.network,
    status: typeof raw.status === 'string' ? raw.status : base.status,
    txId:
      typeof raw.txId === 'string'
        ? raw.txId
        : typeof txId === 'string'
          ? txId
          : null,
    amountSats:
      typeof raw.amountSats === 'number'
        ? raw.amountSats
        : typeof amountSats === 'number'
          ? amountSats
          : null,
    confirmedAt: typeof raw.confirmedAt === 'string' ? raw.confirmedAt : null,
    finality: typeof raw.finality === 'string' ? raw.finality : null,
  };
}

interface RunOneSettleInput {
  admin: typeof supabaseAdmin;
  userId: string;
  option: SettleAssetPackOption;
  repository: SettleRepositoryRef;
  repositoryFullName: string | null;
  synthesisRunId: string | null;
  need: string | null;
  paymentObservation: SettleBtcPaymentObservationInput;
  githubAccessToken: string | null;
  readerWalletId: string | null;
  depositorWalletId: string | null;
  buyerEthereumAddress: string | null;
  depositorEthereumAddress: string | null;
  masterEthereumAddress: string | null;
  /** Admitted Depository supply this option came from (seller linkage). */
  supplyProvenance: ReadOptionSupplyProvenance | null;
  /** Spot board the buyer was quoted and paid with. */
  spotBoard: UsdSpotBoard;
}

async function runOneSettle(input: RunOneSettleInput) {
  const settleRunId = randomUUID();
  const startedAt = new Date().toISOString();
  const optionTitle = input.option.title ?? null;
  const paymentTxId = input.paymentObservation.txId?.trim().toLowerCase() || null;
  // Seller identity + payment proof travel on every settle row: /exchange
  // seller lenses and payout authorization key off sellerUserId, and the
  // replay guard keys off paymentTxId.
  const linkageContext = {
    paymentTxId,
    paymentExplorerUrl: input.paymentObservation.explorerUrl ?? null,
    payAsset: input.paymentObservation.payAsset ?? null,
    sellerUserId: input.supplyProvenance?.sellerUserId ?? null,
    supplyAdmissionRunId: input.supplyProvenance?.admissionRunId ?? null,
    depositoryAssetPackId: input.supplyProvenance?.depositoryAssetPackId ?? null,
  };

  await input.admin.from('executions').insert({
    id: settleRunId,
    user_id: input.userId,
    type: 'agentic-execution:asset-pack',
    status: 'running',
    input: {
      productPipeline: 'settle-asset-pack-pipeline',
      synthesisRunId: input.synthesisRunId,
      optionCount: 1,
      optionTitle,
      repositoryFullName: input.repositoryFullName,
      needLength: input.need?.length ?? 0,
    },
    context: withDemonstrationDataset({
      source: 'read-settle-asset-pack',
      route: '/reads',
      pipelineCore: 'settle-asset-pack-pipeline',
      synthesisMode: 'read',
      repositoryFullName: input.repositoryFullName,
      optionCount: 1,
      optionTitle,
      packActivityType: 'settled-assetpack',
      ...linkageContext,
    }),
    started_at: startedAt,
  });

  const exec = new Execution(`pipeline:settle:${settleRunId}`);
  storeCrossPhaseArtifact(exec, 'host', 'runId', settleRunId);
  storeCrossPhaseArtifact(exec, 'pipeline', 'productPipeline', 'settle-asset-pack-pipeline');

  const pipelineInput: SettleAssetPackInput = {
    repository: {
      fullName: input.repositoryFullName,
      owner: input.repository.owner,
      name: input.repository.name,
      branch: input.repository.branch,
      commit: input.repository.commit,
      url: input.repository.url,
    },
    assetPackOption: input.option,
    selectedOptions: [input.option],
    paymentObservation: input.paymentObservation,
    githubAccessToken: input.githubAccessToken,
    userId: input.userId,
    readerWalletId: input.readerWalletId,
    depositorWalletId: input.depositorWalletId,
    buyerEthereumAddress: input.buyerEthereumAddress,
    depositorEthereumAddress: input.depositorEthereumAddress,
    masterEthereumAddress: input.masterEthereumAddress,
    need: input.need,
    synthesisRunId: input.synthesisRunId,
    spotBoard: input.spotBoard,
  };

  try {
    const result = await runExecutionPipelineSimpleSettleAssetPack(pipelineInput, exec);

    const packActivity = result.packActivity;
    const shippable = result.shippable;
    const mintBtd = result.mintBtd;
    const settleBtd = result.settleBtd;
    const settleAssetPack = result.settleAssetPack;
    const pendingPayout = result.pendingPayout
      ? { ...result.pendingPayout, sellerUserId: linkageContext.sellerUserId }
      : null;
    const summary = result.summary;
    const deliveryState = packActivity.deliveryState || shippable.status || 'projected';
    const rightsState = 'btd-rights-transferred' as const;
    const prUrl = packActivity.prUrl || shippable.prUrl || null;
    const measurementRows = packActivity.measurements;
    // R4: fully rich entitled artifact from rehydrated option (fileChanges etc.).
    const optionPatch =
      input.option.patch && typeof input.option.patch === 'object'
        ? input.option.patch
        : null;
    const optionExtra = input.option as SettleAssetPackOption & {
      coveredSourcePaths?: string[];
    };
    const entitledPatch =
      optionPatch != null
        ? {
            schema: 'bitcode.packs.entitled-asset-pack-delivery',
            title: optionTitle,
            summary: input.option.summary ?? null,
            patch: optionPatch,
            coveredSourcePaths: Array.isArray(optionExtra.coveredSourcePaths)
              ? optionExtra.coveredSourcePaths
              : undefined,
          }
        : null;

    await input.admin
      .from('executions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        output: {
          productPipeline: 'settle-asset-pack-pipeline',
          success: true,
          packActivity,
          shippable: packActivity.shippable || {
            schema: shippable.schema,
            deliveryMechanism: shippable.deliveryMechanism,
            repository: shippable.repository,
            patchCount: shippable.patchCount,
            prUrl,
            status: deliveryState,
            note: shippable.note,
          },
          mintBtd,
          settleBtd,
          settleAssetPack,
          pendingPayout,
          entitledPatch,
          paymentVerification: input.paymentObservation.verification ?? null,
          paymentExplorerUrl: linkageContext.paymentExplorerUrl,
          selectedCount: 1,
          optionCount: 1,
          assetPackTitle: optionTitle || packActivity.assetPackTitle || null,
          measurements: measurementRows,
          settlementState: 'settled',
          payoutState: pendingPayout?.status || 'pending-seller-review',
          rightsState,
          deliveryState,
          deliveryReference: prUrl,
          prUrl,
          amountSats: packActivity.paymentObservation?.amountSats ?? null,
          buyerAccount: pendingPayout?.buyerAccount || settleBtd?.buyerAccount || null,
          sellerAccount: pendingPayout?.sellerAccount || null,
          summary,
        },
        context: withDemonstrationDataset({
          source: 'read-settle-asset-pack',
          route: '/reads',
          pipelineCore: 'settle-asset-pack-pipeline',
          synthesisMode: 'read',
          repositoryFullName:
            input.repositoryFullName || packActivity.repositoryFullName || null,
          optionCount: 1,
          packActivityType: 'settled-assetpack',
          activityType: 'settled-assetpack',
          admissionState: 'settled',
          settlementState: 'settled',
          payoutState: pendingPayout?.status || 'pending-seller-review',
          rightsState,
          deliveryState,
          deliveryReference: prUrl,
          prUrl,
          assetPackTitle: optionTitle || packActivity.assetPackTitle || null,
          buyerAccount: pendingPayout?.buyerAccount || null,
          sellerAccount: pendingPayout?.sellerAccount || null,
          assetPackKey: pendingPayout?.assetPackKey || packActivity.assetPackKey || null,
          ...linkageContext,
        }),
      })
      .eq('id', settleRunId)
      .eq('user_id', input.userId);

    return {
      ok: true as const,
      settleRunId,
      packActivity,
      pendingPayout,
      optionTitle,
      shippable: {
        prUrl,
        status: deliveryState,
        repository: shippable.repository,
        note: shippable.note,
      },
      payment: {
        txId: paymentTxId,
        explorerUrl: linkageContext.paymentExplorerUrl,
        payAsset: linkageContext.payAsset,
        confirmed: input.paymentObservation.verification?.confirmed ?? false,
      },
      mintBtd,
      settleBtd,
      settleAssetPack,
      status: 'completed' as const,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await input.admin
      .from('executions')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error: { message },
      })
      .eq('id', settleRunId)
      .eq('user_id', input.userId);
    return {
      ok: false as const,
      settleRunId,
      error: message,
      code: 'settle_failed' as const,
    };
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (!user || userError) {
    return NextResponse.json(
      {
        error: 'A Bitcode session is required to settle read options.',
        code: 'read_session_required',
      },
      { status: 401 },
    );
  }

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (!isObject(parsed)) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    body = parsed;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const synthesisRunId =
    typeof body.synthesisRunId === 'string' ? body.synthesisRunId : null;
  const need = typeof body.need === 'string' ? body.need : null;
  const admin = supabaseAdmin;

  // R3: fail-closed — require server rehydrate (no client selectedOptions).
  const selection = await rehydrateReadSynthesisSelection({
    userId: user.id,
    synthesisRunId,
    selectedIndexes: body.selectedIndexes,
    admin,
  });
  if (!selection.ok) {
    return NextResponse.json(
      { error: selection.error, code: selection.code },
      { status: selection.status },
    );
  }
  const selectedOptions = selection.options.map((entry) => entry.option);

  // Repository defaults from the synthesis run (a reopened run may not have
  // client repository context); explicit client values win.
  const synthesisContext = selection.synthesisContext;
  const contextString = (key: string) =>
    typeof synthesisContext[key] === 'string' ? (synthesisContext[key] as string) : null;
  const repositoryFullName =
    (typeof body.repositoryFullName === 'string' && body.repositoryFullName) ||
    contextString('repositoryFullName');
  const repository = parseRepository(body.repository, repositoryFullName);
  repository.fullName = repository.fullName || repositoryFullName;
  repository.branch = repository.branch || contextString('sourceBranch');
  repository.commit = repository.commit || contextString('sourceCommit');

  // Measurement-only buy gate (needinesses + absolute safety) — fail closed server-side.
  const measurementGate = assessSelectedOptionsForSettle(
    selectedOptions.map((opt, i) => {
      const rec = opt as SettleAssetPackOption & {
        title?: string;
        needFit?: number;
        measurements?: {
          needinesses?: unknown[];
          absolutes?: unknown[];
        };
      };
      return {
        index: i,
        title: typeof rec.title === 'string' ? rec.title : `Option ${i + 1}`,
        needFit: typeof rec.needFit === 'number' ? rec.needFit : null,
        measurements: {
          needinesses: Array.isArray(rec.measurements?.needinesses)
            ? (rec.measurements?.needinesses as never[])
            : [],
          absolutes: Array.isArray(rec.measurements?.absolutes)
            ? (rec.measurements?.absolutes as never[])
            : [],
        },
      };
    }),
  );
  if (!measurementGate.allowed) {
    return NextResponse.json(
      {
        error:
          measurementGate.blockers[0] ||
          'Measurement-only buy gate blocked settle (need-fit / safety).',
        code: 'measurement_buy_gate_blocked',
        blockers: measurementGate.blockers,
        worstRecommendation: measurementGate.worstRecommendation,
      },
      { status: 400 },
    );
  }

  // Prefer explicit payAsset (ETH|BTC|SOL); map to observation network so the
  // settle pipeline selects the correct multi-rail spot (never pay BTD).
  const requestedPayAsset =
    typeof body.payAsset === 'string' ? body.payAsset.toUpperCase() : null;
  const payAsset: PayAsset =
    requestedPayAsset === 'BTC' || requestedPayAsset === 'SOL' ? requestedPayAsset : 'ETH';
  const payAssetNetwork =
    payAsset === 'BTC' ? 'btc-testnet4' : payAsset === 'SOL' ? 'solana-devnet' : 'ethereum-sepolia';
  const rawObservation = isObject(body.paymentObservation)
    ? { ...body.paymentObservation }
    : {};
  rawObservation.network = payAssetNetwork;
  const paymentObservation = parsePaymentObservation(rawObservation, body.amountSats, body.txId);
  paymentObservation.payAsset = payAsset;

  // Server-authoritative pricing: each option priced alone (1:1 settle).
  const spotBoard = resolveSettlementSpotBoard();
  let quote: ReadSettlementQuote;
  try {
    quote = quoteReadSettlementSelection(selection.options, spotBoard);
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Selected options cannot be priced.',
        code: 'settle_quote_failed',
      },
      { status: 400 },
    );
  }

  const txId = paymentObservation.txId?.trim() || null;
  if (!txId && isSettlementPaymentRequired()) {
    return NextResponse.json(
      {
        error: 'A verified testnet payment is required to settle. Pay the quoted total from your wallet, then settle.',
        code: 'payment_required',
      },
      { status: 402 },
    );
  }
  if (txId) {
    if (await isSettlementPaymentAlreadyUsed(txId, admin)) {
      return NextResponse.json(
        { error: 'This payment transaction already settled a checkout.', code: 'payment_already_used' },
        { status: 409 },
      );
    }
    const payTo = resolveSettlementPayTo().find((rail) => rail.payAsset === payAsset)!;
    const total = quote.totals.find((rail) => rail.payAsset === payAsset)!;
    const verification = await verifyReadSettlementPayment({
      payAsset,
      txId,
      requiredAmount: BigInt(total.payAmount),
      payTo,
    });
    if ('code' in verification) {
      // Rail misconfiguration / unsupported rail (not a chain verdict).
      return NextResponse.json(
        { error: verification.error, code: verification.code },
        { status: verification.status },
      );
    }
    if (!verification.ok) {
      return NextResponse.json(
        {
          error: `Payment verification failed (${verification.reason}).`,
          code: 'payment_unverified',
          verification,
        },
        { status: 402 },
      );
    }
    paymentObservation.status = verification.confirmed ? 'final' : 'observed';
    paymentObservation.explorerUrl = verification.explorerUrl;
    paymentObservation.verification = verification;
    paymentObservation.confirmedAt = verification.blockTime
      ? new Date(verification.blockTime * 1000).toISOString()
      : null;
  }

  const githubAccessToken = await resolveGitHubAccessTokenForUser(user.id, admin);
  // Live ship branches from the request SHA; resolve the branch head when the
  // client did not pin one (projected ship otherwise).
  if (!repository.commit && githubAccessToken && repository.fullName) {
    repository.commit = await resolveGitHubCommitSha({
      token: githubAccessToken,
      repositoryFullName: repository.fullName,
      ref: repository.branch || 'main',
    });
  }

  const results = [];
  for (const [position, entry] of selection.options.entries()) {
    const optionQuote = quote.perOption[position];
    const allocated = optionQuote.rails.find((rail) => rail.payAsset === payAsset)?.payAmount ?? null;
    const sellerUserId = entry.supplyProvenance?.sellerUserId ?? null;
    // Sequential 1:1 runs so each ERC1155 projected state is independent.
    // eslint-disable-next-line no-await-in-loop
    const depositorEthereumAddress =
      (typeof body.depositorEthereumAddress === 'string' && body.depositorEthereumAddress) ||
      (sellerUserId ? await resolveSellerEthereumAddress(sellerUserId, admin) : null);
    // eslint-disable-next-line no-await-in-loop
    const one = await runOneSettle({
      admin,
      userId: user.id,
      option: entry.option,
      repository,
      repositoryFullName: repository.fullName || null,
      synthesisRunId,
      need,
      paymentObservation: {
        ...paymentObservation,
        allocatedPayAmount: allocated,
        amountSats: payAsset === 'BTC' && allocated ? Number(allocated) : paymentObservation.amountSats ?? null,
      },
      githubAccessToken,
      readerWalletId: typeof body.readerWalletId === 'string' ? body.readerWalletId : null,
      depositorWalletId:
        typeof body.depositorWalletId === 'string' ? body.depositorWalletId : null,
      buyerEthereumAddress:
        typeof body.buyerEthereumAddress === 'string' ? body.buyerEthereumAddress : null,
      depositorEthereumAddress,
      masterEthereumAddress:
        typeof body.masterEthereumAddress === 'string' ? body.masterEthereumAddress : null,
      supplyProvenance: entry.supplyProvenance,
      spotBoard,
    });
    results.push(one);
  }

  const allOk = results.every((r) => r.ok);
  const settleRunIds = results.map((r) => r.settleRunId);

  return NextResponse.json(
    {
      ok: allOk,
      settleRunIds,
      settleRunId: settleRunIds[0] || null,
      results,
      optionCount: selectedOptions.length,
      payment: txId
        ? {
            txId,
            payAsset,
            explorerUrl: paymentObservation.explorerUrl ?? null,
            confirmed: paymentObservation.verification?.confirmed ?? false,
          }
        : null,
      status: allOk ? 'completed' : 'partial_or_failed',
    },
    { status: allOk ? 200 : 500 },
  );
}
