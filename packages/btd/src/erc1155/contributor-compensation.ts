/**
 * Contributor compensation (V49 settlement completion law S-2 / S-4).
 *
 * At settle: the coin leg takes the protocol coin fee
 * (`BITCODE_PROTOCOL_COIN_FEE_BPS`, default 500), then the net coin and the
 * full BTD volume V are split by source-to-shares over the option's source
 * contribution set. Each contributor later finalizes THEIR slice with their
 * own `sellerBtdBps` (inverse treasury remainder, `computePayoutSplit`).
 *
 *   protocolFee + Σ slicePay = grossPay      Σ sliceBtd = V
 *
 * `treasury-only` (no valid contributors) keeps net coin + V with treasury.
 * Amounts serialize as decimal strings (JSON-safe persisted statements).
 */

import { buildSourceToSharesProof } from '../source-to-shares';
import { computePayoutSplit, clampSellerBtdBps } from './payout-split';
import type { PayAsset } from './types';

export const DEFAULT_PROTOCOL_COIN_FEE_BPS = 500;
export const MAX_PROTOCOL_COIN_FEE_BPS = 5_000;

export function readProtocolCoinFeeBps(env: Record<string, string | undefined> = process.env): number {
  const raw = Number.parseInt(String(env.BITCODE_PROTOCOL_COIN_FEE_BPS ?? ''), 10);
  if (!Number.isFinite(raw)) return DEFAULT_PROTOCOL_COIN_FEE_BPS;
  return Math.max(0, Math.min(MAX_PROTOCOL_COIN_FEE_BPS, raw));
}

export interface SettleContributionInput {
  depositoryAssetPackId: string;
  admissionRunId: string;
  sellerUserId: string;
  /** Seller payout account (bound wallet) or a stable `user:<id>` placeholder. */
  sellerAccount: string;
  weightBps: number;
  rationale?: string;
}

export type ContributorSliceStatus = 'awaiting-split' | 'finalized';

export interface ContributorFinalizedSplit {
  sellerBtdBps: number;
  sellerBtd: string;
  treasuryBtd: string;
  sellerPay: string;
  treasuryPay: string;
  finalizedAt: string;
}

export interface ContributorSlice {
  sellerUserId: string;
  sellerAccount: string;
  depositoryAssetPackId: string;
  admissionRunId: string;
  weightBps: number;
  sliceBtd: string;
  slicePay: string;
  status: ContributorSliceStatus;
  finalizedSplit: ContributorFinalizedSplit | null;
}

export interface CompensationStatement {
  schema: 'bitcode.settle.compensation-statement';
  version: 1;
  mode: 'contributors' | 'treasury-only';
  payAsset: PayAsset;
  grossPay: string;
  protocolCoinFeeBps: number;
  protocolFee: string;
  netPay: string;
  btdVolume: string;
  /** Treasury holdings before contributor splits (fee; all of net + V when treasury-only). */
  treasuryPay: string;
  treasuryBtd: string;
  contributors: ContributorSlice[];
  sourceToSharesProofRoot: string | null;
  conservation: { feePlusSlicesEqualsGross: boolean; slicesBtdEqualsVolume: boolean };
  issuedAt: string;
}

/** Largest-remainder split of `amount` by basis points (Σ bps = 10000). */
export function splitByBasisPoints(amount: bigint, weights: readonly number[]): bigint[] {
  const provisional = weights.map((bps, index) => {
    const numerator = amount * BigInt(bps);
    return { index, value: numerator / 10_000n, remainder: numerator % 10_000n };
  });
  let remaining = amount - provisional.reduce((sum, entry) => sum + entry.value, 0n);
  const order = [...provisional].sort((a, b) =>
    a.remainder === b.remainder ? a.index - b.index : a.remainder > b.remainder ? -1 : 1,
  );
  for (const entry of order) {
    if (remaining <= 0n) break;
    entry.value += 1n;
    remaining -= 1n;
  }
  return provisional.sort((a, b) => a.index - b.index).map((entry) => entry.value);
}

function assertContributions(contributions: readonly SettleContributionInput[]) {
  if (contributions.length === 0) return;
  const seen = new Set<string>();
  let sum = 0;
  for (const row of contributions) {
    if (!Number.isInteger(row.weightBps) || row.weightBps <= 0) {
      throw new Error('Contribution weightBps must be a positive integer.');
    }
    if (seen.has(row.depositoryAssetPackId)) {
      throw new Error(`Duplicate contribution for ${row.depositoryAssetPackId}.`);
    }
    seen.add(row.depositoryAssetPackId);
    sum += row.weightBps;
  }
  if (sum !== 10_000) throw new Error(`Contribution weights must sum to 10000 (got ${sum}).`);
}

export function buildContributorCompensation(input: {
  readId: string;
  assetPackId: string;
  payAsset: PayAsset;
  grossPay: bigint;
  btdVolume: bigint;
  contributions: readonly SettleContributionInput[];
  protocolCoinFeeBps?: number;
  paymentReceiptRoot?: string;
  issuedAt?: string;
}): CompensationStatement {
  const issuedAt = input.issuedAt ?? new Date().toISOString();
  const feeBps = Math.max(0, Math.min(MAX_PROTOCOL_COIN_FEE_BPS, input.protocolCoinFeeBps ?? DEFAULT_PROTOCOL_COIN_FEE_BPS));
  if (input.grossPay < 0n || input.btdVolume < 0n) throw new Error('Compensation amounts must be non-negative.');
  assertContributions(input.contributions);

  const protocolFee = (input.grossPay * BigInt(feeBps)) / 10_000n;
  const netPay = input.grossPay - protocolFee;
  const mode = input.contributions.length > 0 ? 'contributors' : 'treasury-only';

  let contributors: ContributorSlice[] = [];
  let sourceToSharesProofRoot: string | null = null;
  if (mode === 'contributors') {
    // Source-to-shares proof over the contribution set: units = weightBps with
    // full fit/provenance quality reproduces the validated weights exactly.
    const proof = buildSourceToSharesProof({
      readId: input.readId,
      assetPackId: input.assetPackId,
      acceptedEvaluationRoot: `evaluation:${input.readId}`,
      findingFitsResultRoot: `fits:${input.readId}`,
      fitDeposits: input.contributions.map((row) => ({
        depositId: row.depositoryAssetPackId,
        assetPackId: input.assetPackId,
        depositorWalletId: row.sellerAccount,
        sourceManifestRoot: `admission:${row.admissionRunId}`,
        findingFitsResultRoot: `fits:${input.readId}`,
        measurementRoot: `contribution:${row.depositoryAssetPackId}:${row.weightBps}`,
        normalizedMeasurementUnits: row.weightBps,
        fitQualityBps: 10_000,
        provenanceBps: 10_000,
        accepted: true as const,
      })),
      // Fungible BTD (ERC1155 id 0) mints no per-cell range; slices are amounts.
      btdRange: { assetPackId: input.assetPackId, tokenCount: 0, zeroCellReason: 'refit_only_policy' },
      feeQuote: { quoteId: `settle:${input.readId}`, quoteRoot: `quote:${input.readId}`, grossSats: netPay },
      paymentObservation: {
        paymentReceiptRoot: input.paymentReceiptRoot || `payment:${input.readId}`,
        observedDebitSats: netPay,
        observedCreditSats: netPay,
        finalityState: 'confirmed',
      },
      issuedAt,
    });
    sourceToSharesProofRoot = proof.proofRoot;
    const byDeposit = new Map(proof.settlementAllocations.map((row) => [row.depositId, row]));
    const shareOf = (row: SettleContributionInput) => byDeposit.get(row.depositoryAssetPackId)?.shareBps ?? 0;
    const btdSlices = splitByBasisPoints(input.btdVolume, input.contributions.map(shareOf));
    contributors = input.contributions.map((row, index) => ({
      sellerUserId: row.sellerUserId,
      sellerAccount: row.sellerAccount,
      depositoryAssetPackId: row.depositoryAssetPackId,
      admissionRunId: row.admissionRunId,
      weightBps: shareOf(row),
      sliceBtd: btdSlices[index].toString(),
      slicePay: (byDeposit.get(row.depositoryAssetPackId)?.allocatedSats ?? 0n).toString(),
      status: 'awaiting-split' as const,
      finalizedSplit: null,
    }));
  }

  const slicePaySum = contributors.reduce((sum, row) => sum + BigInt(row.slicePay), 0n);
  const sliceBtdSum = contributors.reduce((sum, row) => sum + BigInt(row.sliceBtd), 0n);
  const treasuryOnly = mode === 'treasury-only';
  const statement: CompensationStatement = {
    schema: 'bitcode.settle.compensation-statement',
    version: 1,
    mode,
    payAsset: input.payAsset,
    grossPay: input.grossPay.toString(),
    protocolCoinFeeBps: feeBps,
    protocolFee: protocolFee.toString(),
    netPay: netPay.toString(),
    btdVolume: input.btdVolume.toString(),
    treasuryPay: (treasuryOnly ? input.grossPay : protocolFee).toString(),
    treasuryBtd: (treasuryOnly ? input.btdVolume : 0n).toString(),
    contributors,
    sourceToSharesProofRoot,
    conservation: {
      feePlusSlicesEqualsGross: treasuryOnly || protocolFee + slicePaySum === input.grossPay,
      slicesBtdEqualsVolume: treasuryOnly || sliceBtdSum === input.btdVolume,
    },
    issuedAt,
  };
  if (!statement.conservation.feePlusSlicesEqualsGross || !statement.conservation.slicesBtdEqualsVolume) {
    throw new Error('Compensation conservation drift: fee + slices must equal gross and slices must equal V.');
  }
  return statement;
}

export class ContributorFinalizeError extends Error {
  constructor(
    readonly code: 'not_a_contributor' | 'slice_already_finalized',
    message: string,
  ) {
    super(message);
    this.name = 'ContributorFinalizeError';
  }
}

/** Finalize ONE contributor's slice (S-4). Returns a new statement. */
export function finalizeContributorSlice(
  statement: CompensationStatement,
  input: { sellerUserId: string; sellerBtdBps: number; finalizedAt?: string },
): { statement: CompensationStatement; slice: ContributorSlice } {
  const index = statement.contributors.findIndex((row) => row.sellerUserId === input.sellerUserId);
  if (index < 0) {
    throw new ContributorFinalizeError('not_a_contributor', 'Only a contributing seller may finalize their slice.');
  }
  const current = statement.contributors[index];
  if (current.status === 'finalized') {
    throw new ContributorFinalizeError('slice_already_finalized', 'This contributor slice is already finalized.');
  }
  const split = computePayoutSplit({
    btdVolume: BigInt(current.sliceBtd),
    payAmount: BigInt(current.slicePay),
    payAsset: statement.payAsset,
    sellerBtdBps: clampSellerBtdBps(input.sellerBtdBps),
  });
  const slice: ContributorSlice = {
    ...current,
    status: 'finalized',
    finalizedSplit: {
      sellerBtdBps: split.sellerBtdBps,
      sellerBtd: split.sellerBtd.toString(),
      treasuryBtd: split.treasuryBtd.toString(),
      sellerPay: split.sellerPay.toString(),
      treasuryPay: split.treasuryPay.toString(),
      finalizedAt: input.finalizedAt ?? new Date().toISOString(),
    },
  };
  const contributors = [...statement.contributors];
  contributors[index] = slice;
  return { statement: { ...statement, contributors }, slice };
}

/** Finalized BTD credited to `sellerUserId` across one statement. */
export function finalizedContributorBtd(statement: CompensationStatement | null | undefined, sellerUserId: string): bigint {
  if (!statement || !Array.isArray(statement.contributors)) return 0n;
  return statement.contributors
    .filter((row) => row.sellerUserId === sellerUserId && row.status === 'finalized' && row.finalizedSplit)
    .reduce((sum, row) => sum + BigInt(row.finalizedSplit!.sellerBtd), 0n);
}
