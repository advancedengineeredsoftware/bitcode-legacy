/**
 * Relative subfamily mass law (V49 measurement law, Read law).
 *
 * The Relative family has three subfamilies: static fit (catalogue rows),
 * Evaluation-inferred fit (planned `-fit` rows), and benchmark delta
 * (`benchmark-delta:<id>` rows). Each subfamily is re-normalized internally,
 * then scaled by its mass. A subfamily is present when it carries at least one
 * weight-bearing row (honesty status `measured` or `estimated`; rows without a
 * status are estimates). Benchmark rows that are `insufficient_evidence` /
 * `not_run` carry zero weight, so a failed benchmark never penalizes or
 * rewards a DataPack.
 *
 * Dependency-free on purpose: `@bitcode/btd` mirrors this table for settlement
 * BTD, and the V49 Gate 5 proof binds the two.
 */

export const STATIC_FIT_KINDS: readonly string[] = ['language-fit', 'domain-fit', 'interface-fit'];

export const BENCHMARK_DELTA_KIND_PREFIX = 'benchmark-delta:';

const FIT_KIND_PATTERN = /^[a-z0-9-]+-fit$/;
const BENCHMARK_DELTA_KIND_PATTERN = /^benchmark-delta:[a-z0-9][a-z0-9._-]*$/;

export type RelativeSubfamily = 'static' | 'inferred' | 'benchmark';

export type RelativeHonestyStatus = 'measured' | 'estimated' | 'insufficient_evidence' | 'not_run';

/** Kind-name law: `<slug>-fit` or `benchmark-delta:<benchmarkId>`; anything else fails closed. */
export function assertRelativeKindPattern(kind: string): boolean {
  if (typeof kind !== 'string') return false;
  return (
    (FIT_KIND_PATTERN.test(kind) && kind.length > '-fit'.length) || BENCHMARK_DELTA_KIND_PATTERN.test(kind)
  );
}

export function isBenchmarkDeltaKind(kind: string): boolean {
  return typeof kind === 'string' && BENCHMARK_DELTA_KIND_PATTERN.test(kind);
}

/**
 * Subfamily masses by present subfamilies. The four rows the SPEC tables
 * (static only; static + inferred; static + benchmark; all three) are exact.
 * Without a static row, the full-table masses are restricted to the present
 * subfamilies and re-normalized.
 */
export const RELATIVE_SUBFAMILY_MASS_TABLE: Readonly<Record<string, Readonly<Partial<Record<RelativeSubfamily, number>>>>> = {
  static: { static: 1 },
  'static+inferred': { static: 0.6, inferred: 0.4 },
  'static+benchmark': { static: 0.6, benchmark: 0.4 },
  'static+inferred+benchmark': { static: 0.4, inferred: 0.3, benchmark: 0.3 },
};

const ORDER: readonly RelativeSubfamily[] = ['static', 'inferred', 'benchmark'];

export function resolveRelativeSubfamilyMasses(
  present: ReadonlySet<RelativeSubfamily>,
): Partial<Record<RelativeSubfamily, number>> {
  const key = ORDER.filter((family) => present.has(family)).join('+');
  if (!key) return {};
  const exact = RELATIVE_SUBFAMILY_MASS_TABLE[key];
  if (exact) return { ...exact };
  const base = RELATIVE_SUBFAMILY_MASS_TABLE['static+inferred+benchmark'];
  const families = ORDER.filter((family) => present.has(family));
  const total = families.reduce((sum, family) => sum + (base[family] ?? 0), 0) || 1;
  return Object.fromEntries(families.map((family) => [family, (base[family] ?? 0) / total]));
}

export type MassableRelativeRow = {
  measurementKind: string;
  volume: number;
  weight?: number;
  status?: string;
  propertyClass?: string;
};

export function relativeSubfamilyOf(
  row: MassableRelativeRow,
  staticKinds: readonly string[] = STATIC_FIT_KINDS,
): RelativeSubfamily {
  if (isBenchmarkDeltaKind(row.measurementKind) || row.propertyClass === 'benchmark-delta') return 'benchmark';
  if (row.propertyClass === 'static-catalog' || staticKinds.includes(row.measurementKind)) return 'static';
  return 'inferred';
}

/**
 * Rows with `insufficient_evidence` / `not_run` never carry weight. A benchmark
 * row stored with explicit weight 0 is non-bearing too, so a carrier that drops
 * `status` cannot revive a failed benchmark.
 */
export function isWeightBearingRelative(row: MassableRelativeRow): boolean {
  if (!row || typeof row.volume !== 'number' || !Number.isFinite(row.volume)) return false;
  if (row.status === 'insufficient_evidence' || row.status === 'not_run') return false;
  return !(isBenchmarkDeltaKind(row.measurementKind) && row.weight === 0);
}

/**
 * Re-weight relatives under the subfamily mass law. Idempotent: in-subfamily
 * ratios are preserved, so already-massed rows map to themselves. Non-bearing
 * rows get weight 0. `fallbackWeight` supplies a raw weight for rows without
 * one (catalogue weight for static rows).
 */
export function applyRelativeSubfamilyMasses<T extends MassableRelativeRow>(
  rows: readonly T[],
  options: { staticKinds?: readonly string[]; fallbackWeight?: (row: T) => number | undefined } = {},
): T[] {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  const staticKinds = options.staticKinds ?? STATIC_FIT_KINDS;
  const rawWeight = (row: T): number => {
    if (typeof row.weight === 'number' && Number.isFinite(row.weight) && row.weight > 0) return row.weight;
    const fallback = options.fallbackWeight?.(row);
    return typeof fallback === 'number' && Number.isFinite(fallback) && fallback > 0 ? fallback : 1;
  };
  const sums = new Map<RelativeSubfamily, number>();
  for (const row of rows) {
    if (!isWeightBearingRelative(row)) continue;
    const family = relativeSubfamilyOf(row, staticKinds);
    sums.set(family, (sums.get(family) ?? 0) + rawWeight(row));
  }
  const masses = resolveRelativeSubfamilyMasses(new Set(sums.keys()));
  return rows.map((row) => {
    if (!isWeightBearingRelative(row)) return { ...row, weight: 0 };
    const family = relativeSubfamilyOf(row, staticKinds);
    const sum = sums.get(family) ?? 0;
    const mass = masses[family] ?? 0;
    return { ...row, weight: sum > 0 ? (rawWeight(row) / sum) * mass : 0 };
  });
}
