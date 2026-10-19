/**
 * Raw BTD volume from **relatives only** (product law).
 *
 * Absolutes never drive BTD volume. Relatives fits score → rawV base units.
 * Apply `applyBtdSupplyDecay` for scarcity, then mint on settle to depositor
 * BTD payout slices only. Buyers pay ETH|BTC|SOL at spot — never BTD.
 *
 * Formula (V49 subfamily mass law: static fit / Evaluation-inferred fit /
 * benchmark delta; insufficient_evidence and not_run rows weigh zero):
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
 * Relative subfamily masses (mirror of RELATIVE_SUBFAMILY_MASS_TABLE in
 * `@bitcode/generic-measurements-relatives/relative-subfamily-masses`; the V49
 * Gate 5 proof binds the two tables).
 */
type RelativeSubfamily = 'static' | 'inferred' | 'benchmark';
const RELATIVE_SUBFAMILY_MASSES: Readonly<Record<string, Readonly<Partial<Record<RelativeSubfamily, number>>>>> = {
  static: { static: 1 },
  'static+inferred': { static: 0.6, inferred: 0.4 },
  'static+benchmark': { static: 0.6, benchmark: 0.4 },
  'static+inferred+benchmark': { static: 0.4, inferred: 0.3, benchmark: 0.3 },
};
const SUBFAMILY_ORDER: readonly RelativeSubfamily[] = ['static', 'inferred', 'benchmark'];
const FIT_KIND_PATTERN = /^[a-z0-9-]+-fit$/;
const BENCHMARK_DELTA_KIND_PATTERN = /^benchmark-delta:[a-z0-9][a-z0-9._-]*$/;

function subfamilyOf(kind: string, propertyClass: string | undefined): RelativeSubfamily {
  if (BENCHMARK_DELTA_KIND_PATTERN.test(kind) || propertyClass === 'benchmark-delta') return 'benchmark';
  if (propertyClass === 'static-catalog' || kind in RELATIVES_CATALOGUE_WEIGHTS) return 'static';
  return 'inferred';
}

function subfamilyMasses(present: ReadonlySet<RelativeSubfamily>): Partial<Record<RelativeSubfamily, number>> {
  const families = SUBFAMILY_ORDER.filter((family) => present.has(family));
  const exact = RELATIVE_SUBFAMILY_MASSES[families.join('+')];
  if (exact) return exact;
  const base = RELATIVE_SUBFAMILY_MASSES['static+inferred+benchmark'];
  const total = families.reduce((sum, family) => sum + (base[family] ?? 0), 0) || 1;
  return Object.fromEntries(families.map((family) => [family, (base[family] ?? 0) / total]));
}

/**
 * Canonical relatives reading for settlement BTD mint.
 * `measurementKind` must be `<slug>-fit` or `benchmark-delta:<id>` (V49 kind law);
 * validated at compute time.
 */
export interface SettlementBenchmarkEvidence {
  benchmarkId: string;
  baseline: number | null;
  candidate: number | null;
  unit: string | null;
  direction: string;
  improvementRatio: number | null;
}

export interface RelativeReadingForSettlement {
  measurementKind: string;
  /** Normalized volume in [0, 1]. */
  volume: number;
  /** Optional row weight; catalogue weight used when omitted. */
  weight?: number;
  magnitude?: number;
  unit?: string | null;
  category?: 'relative';
  /** Honesty status; `insufficient_evidence` / `not_run` rows weigh zero. */
  status?: string;
  propertyClass?: string;
  label?: string;
  /** Benchmark-delta evidence (parsed values only; PR receipts). */
  benchmark?: SettlementBenchmarkEvidence;
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
  /** Honesty status; `insufficient_evidence` / `not_run` rows weigh zero. */
  status?: string;
  propertyClass?: string;
  label?: string;
  /** Benchmark-delta evidence (parsed values only; PR receipts). */
  benchmark?: SettlementBenchmarkEvidence;
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

  const bearing: Array<{ kind: string; volume: number; rawWeight: number; family: RelativeSubfamily }> = [];
  for (const row of relatives) {
    const kind = rowKind(row);
    if (!kind) continue;
    // Exclude composite evaluation-fit if present as a stored row (derived only).
    if (kind === 'evaluation-fit') continue;
    // V49 kind law: `<slug>-fit` or `benchmark-delta:<id>`; anything else is skipped.
    if (!FIT_KIND_PATTERN.test(kind) && !BENCHMARK_DELTA_KIND_PATTERN.test(kind)) continue;
    // A failed / unrun benchmark never penalizes or rewards a DataPack (a
    // benchmark row stored with weight 0 is non-bearing even without status).
    if (row.status === 'insufficient_evidence' || row.status === 'not_run') continue;
    if (BENCHMARK_DELTA_KIND_PATTERN.test(kind) && row.weight === 0) continue;
    if (typeof row.volume !== 'number' || !Number.isFinite(row.volume)) continue;
    const rawWeight =
      typeof row.weight === 'number' && Number.isFinite(row.weight) && row.weight > 0
        ? row.weight
        : catalogueWeight(kind) ?? 1;
    bearing.push({ kind, volume: clamp01(row.volume), rawWeight, family: subfamilyOf(kind, row.propertyClass) });
  }

  const familySums = new Map<RelativeSubfamily, number>();
  for (const row of bearing) familySums.set(row.family, (familySums.get(row.family) ?? 0) + row.rawWeight);
  const masses = subfamilyMasses(new Set(familySums.keys()));
  for (const row of bearing) {
    const weight = (row.rawWeight / (familySums.get(row.family) || 1)) * (masses[row.family] ?? 0);
    const contribution = weight * row.volume;
    weightedRelativesSum += contribution;
    weightSum += weight;
    rows.push({ measurementKind: row.kind, volume: row.volume, weight, contribution });
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
      'Settlement BTD mint requires at least one valid relatives measurement (absolutes never mint BTD).',
    );
  }
  if (result.amountBaseUnits <= 0n) {
    throw new Error('Settlement BTD mint amount must be positive after relatives weighting.');
  }
  return result;
}
