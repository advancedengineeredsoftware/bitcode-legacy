/**
 * Read settlement checkout (server) — the single authority shared by
 * POST /api/read/settle/quote and POST /api/read/settle:
 *
 * - rehydrate the buyer's selected options from their synthesis run
 *   (V48-Gate5-F01: the browser never supplies commercial material);
 * - price each option independently (1:1 settle law: relatives → BTD
 *   volume → decay → multi-rail spot) and total each pay rail;
 * - name the settlement pay-to recipients per rail;
 * - verify a buyer-broadcast testnet payment covers the total and was not
 *   already used by another settle run (replay guard).
 */

import { supabaseAdmin } from '@bitcode/supabase';
import { hydrateBitcodeProfile } from '@bitcode/orm';
import {
  applyBtdSupplyDecay,
  assertPositiveSettlementBtd,
  buildMultiRailSpotQuote,
  computeSettlementBtdFromRelatives,
  createMockSpotBoard,
  verifyBitcoinTestnetPayment,
  verifyEthereumSepoliaPayment,
  type PayAsset,
  type PayRailPaymentVerification,
  type UsdSpotBoard,
} from '@bitcode/btd/erc1155';
import {
  parseSettleAssetPackOption,
  type SettleAssetPackOption,
} from '@bitcode/asset-packs-pipelines-execution-pipeline-simple-settle-asset-pack';
import {
  isBitcodeDemonstrationModeEnabled,
  isExecutionInActiveDataset,
  readDemonstrationBtdUsd,
} from '@bitcode/asset-packs-pipelines-syntheses-domain/demonstration';

const ETH_ADDRESS = /^0x[a-fA-F0-9]{40}$/;
const BTC_TESTNET_ADDRESS = /^(tb1|[mn2])[a-zA-HJ-NP-Z0-9]{25,87}$/;
const DEFAULT_SEPOLIA_RPC_URL = 'https://ethereum-sepolia-rpc.publicnode.com';
/** How long verification waits for a just-broadcast tx to reach the observer. */
const PAYMENT_PROPAGATION_WAIT_MS = 20_000;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export type CheckoutFailure = { ok: false; status: number; error: string; code: string };

/** Server-only provenance linking a read option to admitted Depository supply. */
export interface ReadOptionSupplyProvenance {
  admissionRunId: string | null;
  sellerUserId: string | null;
  depositoryAssetPackId: string | null;
}

export interface RehydratedReadSelection {
  ok: true;
  synthesisContext: Record<string, unknown>;
  options: Array<{
    index: number;
    option: SettleAssetPackOption;
    supplyProvenance: ReadOptionSupplyProvenance | null;
  }>;
}

function readSupplyProvenance(raw: Record<string, unknown>): ReadOptionSupplyProvenance | null {
  const provenance = isObject(raw.supplyProvenance) ? raw.supplyProvenance : null;
  if (!provenance) return null;
  const str = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : null);
  return {
    admissionRunId: str(provenance.admissionRunId),
    sellerUserId: str(provenance.sellerUserId),
    depositoryAssetPackId: str(provenance.depositoryAssetPackId),
  };
}

/** Rehydrate selected options (patch-bearing) from the buyer's own synthesis run. */
export async function rehydrateReadSynthesisSelection(input: {
  userId: string;
  synthesisRunId: string | null;
  selectedIndexes: unknown;
  admin?: typeof supabaseAdmin;
}): Promise<RehydratedReadSelection | CheckoutFailure> {
  const admin = input.admin ?? supabaseAdmin;
  const indexes = Array.isArray(input.selectedIndexes)
    ? input.selectedIndexes
        .map((v) => (typeof v === 'number' ? v : Number(v)))
        .filter((n) => Number.isInteger(n) && n >= 0)
    : [];
  if (!input.synthesisRunId || indexes.length === 0) {
    return {
      ok: false,
      status: 400,
      code: 'rehydrate_required',
      error:
        'synthesisRunId + selectedIndexes is required — server rehydrates full commercial material; client options are not accepted.',
    };
  }

  const { data: run, error } = await admin
    .from('executions')
    .select('id, user_id, output, context')
    .eq('id', input.synthesisRunId)
    .maybeSingle();
  // Cross-dataset runs (live ↔ demonstration) are invisible to each other.
  if (error || !run || run.user_id !== input.userId || !isExecutionInActiveDataset(run)) {
    return {
      ok: false,
      status: 404,
      code: 'synthesis_run_required',
      error: 'Synthesis run not found or access denied for settle rehydrate.',
    };
  }

  const output = isObject(run.output) ? run.output : {};
  // Prefer fullOptions; legacy commercial options only if still patch-bearing.
  const pool =
    Array.isArray(output.fullOptions) && output.fullOptions.length > 0
      ? output.fullOptions
      : Array.isArray(output.options)
        ? output.options
        : [];

  const options: RehydratedReadSelection['options'] = [];
  for (const index of [...new Set(indexes)]) {
    const raw = pool[index];
    if (!raw) {
      return {
        ok: false,
        status: 400,
        code: 'option_index_missing',
        error: `Selected option index ${index} missing from synthesis fullOptions.`,
      };
    }
    const parsed = parseSettleAssetPackOption(raw);
    if (!parsed) {
      return {
        ok: false,
        status: 400,
        code: 'option_rehydrate_invalid',
        error: `Selected option index ${index} failed commercial parse after rehydrate.`,
      };
    }
    const rawObj = isObject(raw) ? raw : {};
    // R4: reattach raw patch (incl. fileChanges) for entitled delivery + ship.
    if (rawObj.patch != null) {
      parsed.patch = rawObj.patch as SettleAssetPackOption['patch'];
    }
    options.push({ index, option: parsed, supplyProvenance: readSupplyProvenance(rawObj) });
  }
  return {
    ok: true,
    synthesisContext: isObject(run.context) ? run.context : {},
    options,
  };
}

export interface ReadSettlementRailQuote {
  payAsset: PayAsset;
  payAmount: string;
  payAmountDisplay: string;
  payAmountUsd: number;
  decimals: number;
  available: boolean;
  unavailableReason: string | null;
}

export interface ReadSettlementOptionQuote {
  index: number;
  title: string | null;
  evaluationFitVolume: number;
  /** Residual-supply decay applied to this option's raw volume. */
  decay: number;
  btdVolume: string;
  rails: ReadSettlementRailQuote[];
}

export interface ReadSettlementQuote {
  provider: string;
  btdVolume: string;
  btdVolumeDisplay: string;
  evaluationFitVolume: number;
  decay: number;
  perOption: ReadSettlementOptionQuote[];
  /** Σ per-option amounts, per rail — what the buyer pays in one transaction. */
  totals: ReadSettlementRailQuote[];
}

function formatBaseUnits(amount: bigint, decimals: number): string {
  if (amount === 0n) return '0';
  const scale = 10n ** BigInt(decimals);
  const whole = amount / scale;
  const frac = (amount % scale).toString().padStart(decimals, '0').replace(/0+$/, '');
  return frac ? `${whole}.${frac}` : whole.toString();
}

/**
 * Testnet spot board shared by quote, settle verification, and the settle
 * pipeline (so quoted, paid, and payout amounts agree). Demonstration mode
 * prices BTD at the demonstration spot (small testnet amounts per pack).
 */
export function resolveSettlementSpotBoard(env: NodeJS.ProcessEnv = process.env): UsdSpotBoard {
  return isBitcodeDemonstrationModeEnabled(env)
    ? createMockSpotBoard({ btdUsd: readDemonstrationBtdUsd(env) })
    : createMockSpotBoard();
}

/**
 * Price each selected option on its own (1:1 settle) and total the rails.
 * Throws when an option's relatives cannot price a positive BTD volume.
 */
export function quoteReadSettlementSelection(
  options: ReadonlyArray<{ index: number; option: SettleAssetPackOption }>,
  board: UsdSpotBoard = resolveSettlementSpotBoard(),
): ReadSettlementQuote {
  const perOption: ReadSettlementOptionQuote[] = options.map(({ index, option }) => {
    const raw = assertPositiveSettlementBtd(
      computeSettlementBtdFromRelatives(
        option.measurements as Parameters<typeof computeSettlementBtdFromRelatives>[0],
      ),
    );
    const decayed = applyBtdSupplyDecay({ rawVolumeBaseUnits: raw.amountBaseUnits, btdTotalMinted: 0n });
    const multi = buildMultiRailSpotQuote(decayed.btdVolume, board);
    return {
      index,
      title: typeof option.title === 'string' ? option.title : null,
      evaluationFitVolume: raw.evaluationFitVolume,
      decay: decayed.decay,
      btdVolume: decayed.btdVolume.toString(),
      rails: multi.options.map((rail) => ({
        payAsset: rail.payAsset,
        payAmount: rail.payAmount.toString(),
        payAmountDisplay: rail.payAmountDisplay,
        payAmountUsd: rail.payAmountUsd,
        decimals: rail.decimals,
        available: rail.available,
        unavailableReason: rail.unavailableReason ?? null,
      })),
    };
  });

  const btdTotal = perOption.reduce((sum, quote) => sum + BigInt(quote.btdVolume), 0n);
  const railAssets: PayAsset[] = ['ETH', 'BTC', 'SOL'];
  const totals = railAssets.map((payAsset) => {
    const rails = perOption.map((quote) => quote.rails.find((rail) => rail.payAsset === payAsset)!);
    const amount = rails.reduce((sum, rail) => sum + BigInt(rail.payAmount), 0n);
    const decimals = rails[0]?.decimals ?? 0;
    const unavailable = rails.find((rail) => !rail.available);
    return {
      payAsset,
      payAmount: amount.toString(),
      payAmountDisplay: formatBaseUnits(amount, decimals),
      payAmountUsd: rails.reduce((sum, rail) => sum + rail.payAmountUsd, 0),
      decimals,
      available: !unavailable,
      unavailableReason: unavailable?.unavailableReason ?? null,
    };
  });
  const mean = (pick: (quote: ReadSettlementOptionQuote) => number) =>
    perOption.reduce((sum, quote) => sum + pick(quote), 0) / Math.max(1, perOption.length);
  return {
    provider: board.provider,
    btdVolume: btdTotal.toString(),
    btdVolumeDisplay: formatBaseUnits(btdTotal, 18),
    evaluationFitVolume: mean((quote) => quote.evaluationFitVolume),
    decay: mean((quote) => quote.decay),
    perOption,
    totals,
  };
}

export interface SettlementPayTo {
  payAsset: PayAsset;
  network: 'ethereum-sepolia' | 'btc-testnet4' | 'solana-devnet';
  address: string | null;
  /** Live verification supported on this rail. */
  liveVerification: boolean;
}

/** Settlement recipients per rail (operator env). */
export function resolveSettlementPayTo(env: NodeJS.ProcessEnv = process.env): SettlementPayTo[] {
  const eth = [env.BITCODE_SETTLEMENT_ETH_RECIPIENT, env.BITCODE_MASTER_ACCOUNT]
    .map((value) => value?.trim())
    .find((value) => value && ETH_ADDRESS.test(value));
  const btc = env.BITCODE_SETTLEMENT_BTC_RECIPIENT?.trim();
  return [
    { payAsset: 'ETH', network: 'ethereum-sepolia', address: eth || null, liveVerification: Boolean(eth) },
    {
      payAsset: 'BTC',
      network: 'btc-testnet4',
      address: btc && BTC_TESTNET_ADDRESS.test(btc) ? btc : null,
      liveVerification: Boolean(btc && BTC_TESTNET_ADDRESS.test(btc)),
    },
    { payAsset: 'SOL', network: 'solana-devnet', address: null, liveVerification: false },
  ];
}

/**
 * Whether settle must observe a verified on-chain payment. Required in
 * demonstration mode (the demo pays real testnet funds) or when an operator
 * sets BITCODE_SETTLEMENT_REQUIRE_PAYMENT=1; otherwise projected settle stays.
 */
export function isSettlementPaymentRequired(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.BITCODE_SETTLEMENT_REQUIRE_PAYMENT === '1' || isBitcodeDemonstrationModeEnabled(env);
}

/** Verify a buyer payment for the selection total on the chosen rail. */
export async function verifyReadSettlementPayment(input: {
  payAsset: PayAsset;
  txId: string;
  requiredAmount: bigint;
  payTo: SettlementPayTo;
  env?: NodeJS.ProcessEnv;
}): Promise<PayRailPaymentVerification | CheckoutFailure> {
  const env = input.env ?? process.env;
  if (!input.payTo.address || !input.payTo.liveVerification) {
    return {
      ok: false,
      status: 422,
      code: 'pay_rail_unconfigured',
      error: `No settlement recipient is configured for ${input.payAsset}; live payment cannot be verified.`,
    };
  }
  if (input.payAsset === 'BTC') {
    return verifyBitcoinTestnetPayment({
      txId: input.txId,
      recipientAddress: input.payTo.address,
      requiredSats: input.requiredAmount,
      esploraBaseUrl: env.BITCODE_BTC_TESTNET_ESPLORA_URL?.trim() || undefined,
      waitForPropagationMs: PAYMENT_PROPAGATION_WAIT_MS,
    });
  }
  if (input.payAsset === 'ETH') {
    return verifyEthereumSepoliaPayment({
      txHash: input.txId,
      recipientAddress: input.payTo.address,
      requiredWei: input.requiredAmount,
      rpcUrl: env.BITCODE_ETHEREUM_RPC_URL?.trim() || DEFAULT_SEPOLIA_RPC_URL,
      waitForPropagationMs: PAYMENT_PROPAGATION_WAIT_MS,
    });
  }
  return {
    ok: false,
    status: 422,
    code: 'pay_rail_unsupported',
    error: `${input.payAsset} payments are not verifiable on testnet yet; pay with ETH or BTC.`,
  };
}

/**
 * Replay guard: a payment transaction may back exactly one settle checkout.
 * Failed settle rows do not consume the payment, so the buyer can retry.
 */
export async function isSettlementPaymentAlreadyUsed(
  txId: string,
  admin: typeof supabaseAdmin = supabaseAdmin,
): Promise<boolean> {
  const { data } = await admin
    .from('executions')
    .select('id')
    .eq('context->>paymentTxId', txId.trim().toLowerCase())
    .in('status', ['running', 'completed'])
    .limit(1);
  return Array.isArray(data) && data.length > 0;
}

/**
 * Seller's bound Ethereum wallet (pending payout `sellerAccount`), read from
 * the canonical `user_profiles` wallet binding (same source as Auxillaries).
 */
export async function resolveSellerEthereumAddress(
  sellerUserId: string,
  admin: typeof supabaseAdmin = supabaseAdmin,
): Promise<string | null> {
  try {
    const { data } = await admin.from('user_profiles').select('*').eq('id', sellerUserId).maybeSingle();
    if (!data) return null;
    const profile = hydrateBitcodeProfile(data as Record<string, unknown>) as { wallet_address?: unknown };
    const address = typeof profile.wallet_address === 'string' ? profile.wallet_address.trim() : '';
    return ETH_ADDRESS.test(address) ? address.toLowerCase() : null;
  } catch {
    return null;
  }
}
