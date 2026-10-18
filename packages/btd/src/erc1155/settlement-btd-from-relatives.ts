/**
 * Raw BTD volume from **relatives only** (product law).
 *
 * Absolutes never drive BTD volume. Relatives fits score → rawV base units.
 * Apply `applyBtdSupplyDecay` for scarcity, then mint on settle to depositor
 * BTD payout slices only. Buyers pay ETH|BTC|SOL at spot — never BTD.
 *
 * Formula:
 *   weightedRelativesSum = Σ (w_i * clamp01(v_i))
 *   weightSum              = Σ w_i
 *   evaluationFitVolume          = weightSum > 0 ? weightedRelativesSum / weightSum : 0
 *   amountBaseUnits (rawV) = floor(evaluationFitVolume * 10^BTD_DECIMALS)
 *
 * All inputs are strongly typed. Boundary adapters that accept wire JSON live
 * in the settle API layer — this module never takes `unknown`.
 */

import { createHash } from 'crypto';
import { BTD_DECIMALS_SCALE } from './types';

/**
 * Static relatives catalogue weights (mirror of
 * ASSET_PACK_RELATIVES_CATALOG). Kept local so settlement math does not
 * pull agent-factory graphs into `@bitcode/btd` consumers/tests.
 */
const RELATIVES_CATALOGUE_WEIGHTS: Readonly<Record<string, number>> = {
  'language-fit': 0.35,
  'domain-fit': 0.35,
  'interface-fit': 0.3,
};

/**
 * Canonical relatives reading for settlement BTD mint.
 * `measurementKind` must end with `-fit` (product law); validated at compute time.
 */
export interface RelativeReadingForSettlement {
  measurementKind: string;
  /** Normalized volume in [0, 1]. */
  volume: number;
  /** Optional row weight; catalogue weight used when omitted. */
  weight?: number;
  magnitude?: number;
  unit?: string | null;
  category?: 'relative';
}

/**
 * Wire-compat alias used by some option cards that emit `kind` instead of
 * `measurementKind`. Both forms are fully typed — not `unknown`.
 */
export interface RelativeReadingKindAlias {
  kind: string;
  volume: number;
  weight?: number;
  magnitude?: number;
  unit?: string | null;
  category?: 'relative';
}

export type RelativeRowInput = RelativeReadingForSettlement | RelativeReadingKindAlias;

export interface AbsoluteReadingForSettlement {
  measurementKind?: string;
  kind?: string;
  volume: number;
  magnitude?: number;
  weight?: number;
  unit?: string | null;
  category?: 'absolute';
}

/** Nested measurements bag on a settle-bound AssetPack option. */
export interface AssetPackMeasurementsForSettlement {
  absolutes?: readonly AbsoluteReadingForSettlement[];
  relatives: readonly RelativeRowInput[];
}

/** Option-shaped carrier that only exposes measurements. */
export interface MeasurementsCarrierForSettlement {
  measurements: AssetPackMeasurementsForSettlement;
}

/** Relatives-only bag (no absolutes). */
export interface RelativesBagForSettlement {
  relatives: readonly RelativeRowInput[];
}

/**
 * Every accepted shape for relatives-derived BTD mint input.
 * Exhaustive union — no `unknown`.
 */
export type SettlementBtdRelativesSource =
  | readonly RelativeRowInput[]
  | RelativesBagForSettlement
  | AssetPackMeasurementsForSettlement
  | MeasurementsCarrierForSettlement;

export interface SettlementBtdContributionRow {
  measurementKind: string;
  volume: number;
  weight: number;
  contribution: number;
}

export interface SettlementBtdFromRelativesResult {
  schema: 'bitcode.settle.btd-from-relatives';
  relativesCount: number;
  weightedRelativesSum: number;
  weightSum: number;
  /** Normalized evaluation-fit scalar in [0, 1]. */
  evaluationFitVolume: number;
  /** Fungible BTD base units to mint (18 decimals). */
  amountBaseUnits: bigint;
  /** Human-readable whole-token equivalent (evaluationFitVolume for unit-scale mint). */
  amountBtd: number;
  proofRoot: string;
  rows: SettlementBtdContributionRow[];
}

export interface SettlementBtdComputeOptions {
  assetPackKey?: string;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function isRelativeReadingKindAlias(row: RelativeRowInput): row is RelativeReadingKindAlias {
  return 'kind' in row && typeof (row as RelativeReadingKindAlias).kind === 'string';
}

function isRelativeReadingForSettlement(
  row: RelativeRowInput,
): row is RelativeReadingForSettlement {
  return (
    'measurementKind' in row &&
    typeof (row as RelativeReadingForSettlement).measurementKind === 'string'
  );
}

function rowKind(row: RelativeRowInput): string | null {
  if (isRelativeReadingForSettlement(row) && row.measurementKind.trim()) {
    return row.measurementKind.trim();
  }
  if (isRelativeReadingKindAlias(row) && row.kind.trim()) {
    return row.kind.trim();
  }
  return null;
}

function catalogueWeight(kind: string): number | null {
  const weight = RELATIVES_CATALOGUE_WEIGHTS[kind];
  return typeof weight === 'number' ? weight : null;
}

function isMeasurementsCarrier(
  source: SettlementBtdRelativesSource,
): source is MeasurementsCarrierForSettlement {
  return (
    !Array.isArray(source) &&
    'measurements' in source &&
    typeof (source as MeasurementsCarrierForSettlement).measurements === 'object' &&
    (source as MeasurementsCarrierForSettlement).measurements !== null
  );
}

function isRelativesCarrier(
  source: SettlementBtdRelativesSource,
): source is RelativesBagForSettlement | AssetPackMeasurementsForSettlement {
  return (
    !Array.isArray(source) &&
    'relatives' in source &&
    Array.isArray(
      (source as RelativesBagForSettlement | AssetPackMeasurementsForSettlement).relatives,
    )
  );
}

/**
 * Extract relatives rows from a strongly typed settlement source.
 */
export function extractRelativesForSettlement(
  source: SettlementBtdRelativesSource,
): RelativeRowInput[] {
  // Array.isArray does not always eliminate `readonly T[]` from the union for
  // exhaustiveness (`never`) checks — handle each admitted shape and fail closed.
  if (Array.isArray(source)) {
    return [...source];
  }
  if (isMeasurementsCarrier(source)) {
    return [...(source.measurements.relatives ?? [])];
  }
  if (isRelativesCarrier(source)) {
    return [...source.relatives];
  }
  return [];
}

/**
 * Convert evaluationFit ∈ [0,1] to 18-decimal base units without float precision loss
 * beyond 1e9 micro-resolution of the unit interval.
 */
export function evaluationFitVolumeToBaseUnits(evaluationFitVolume: number): bigint {
  const v = clamp01(evaluationFitVolume);
  if (v <= 0) return 0n;
  const micro = BigInt(Math.round(v * 1e9));
  return (micro * BTD_DECIMALS_SCALE) / 1_000_000_000n;
}

/**
 * Compute fungible BTD mint amount from relatives measurements only.
 * Fail-closed: empty / all-invalid relatives → amount 0 (caller must block mint).
 */
export function computeSettlementBtdFromRelatives(
  relativesInput: SettlementBtdRelativesSource,
  options?: SettlementBtdComputeOptions,
): SettlementBtdFromRelativesResult {
  const relatives = extractRelativesForSettlement(relativesInput);
  const rows: SettlementBtdContributionRow[] = [];
  let weightedRelativesSum = 0;
  let weightSum = 0;

  for (const row of relatives) {
    const kind = rowKind(row);
    if (!kind) continue;
    // Exclude composite evaluation-fit if present as a stored row (derived only).
    if (kind === 'evaluation-fit') continue;
    // All relatives kinds must end with -fit (product law).
    if (!kind.endsWith('-fit')) continue;
    const volume = clamp01(row.volume);
    if (!Number.isFinite(volume)) continue;
    const weight =
      typeof row.weight === 'number' && Number.isFinite(row.weight) && row.weight > 0
        ? row.weight
        : catalogueWeight(kind) ?? 1;
    const contribution = weight * volume;
    weightedRelativesSum += contribution;
    weightSum += weight;
    rows.push({ measurementKind: kind, volume, weight, contribution });
  }

  const evaluationFitVolume = weightSum > 0 ? clamp01(weightedRelativesSum / weightSum) : 0;
  const amountBaseUnits = evaluationFitVolumeToBaseUnits(evaluationFitVolume);

  const proofRoot = createHash('sha256')
    .update(
      JSON.stringify({
        schema: 'bitcode.settle.btd-from-relatives',
        assetPackKey: options?.assetPackKey ?? null,
        evaluationFitVolume,
        weightedRelativesSum,
        weightSum,
        amountBaseUnits: amountBaseUnits.toString(),
        rows: rows.map((r) => r.measurementKind),
      }),
    )
    .digest('hex');

  return {
    schema: 'bitcode.settle.btd-from-relatives',
    relativesCount: rows.length,
    weightedRelativesSum,
    weightSum,
    evaluationFitVolume,
    amountBaseUnits,
    amountBtd: evaluationFitVolume,
    proofRoot: `btd-relatives:${proofRoot}`,
    rows,
  };
}

export function assertPositiveSettlementBtd(
  result: SettlementBtdFromRelativesResult,
): SettlementBtdFromRelativesResult {
  if (result.relativesCount === 0) {
    throw new Error(
      'Settlement BTD mint requires at least one valid relatives *-fit measurement (absolutes never mint BTD).',
    );
  }
  if (result.amountBaseUnits <= 0n) {
    throw new Error('Settlement BTD mint amount must be positive after relatives weighting.');
  }
  return result;
}
