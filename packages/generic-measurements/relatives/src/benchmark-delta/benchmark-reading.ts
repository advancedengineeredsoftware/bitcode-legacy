/**
 * Benchmark-delta reading law (V49 benchmark-delta Relative law B-4).
 *
 *   improvementRatio = higher-is-better ? (candidate − baseline) / |baseline|
 *                                        : (baseline − candidate) / |baseline|
 *   volume    = clamp01(0.5 + improvementRatio / (2 × cap))   // cap default 0.5
 *   magnitude = improvementRatio × 100                         // signed percent
 *
 * `measured` only when both medians parse and the baseline is non-zero; any
 * other outcome is `insufficient_evidence` (or `not_run` when the budget ran
 * out) with neutral volume 0.5 and zero weight. Benchmark stdout/stderr is never
 * stored: only parsed samples and a source-safe failure class.
 */

import type { BenchmarkDeclaration, BenchmarkDirection, BenchmarkMetric } from './benchmark-manifest';
import { BENCHMARK_DELTA_KIND_PREFIX } from '../relative-subfamily-masses';

export const BENCHMARK_DELTA_DEFAULT_CAP = 0.5;

export const BENCHMARK_FAILURE_CLASSES = [
  'setup_failed',
  'baseline_failed',
  'command_failed',
  'timeout',
  'metric_unparsable',
  'baseline_zero',
  'no_patch_bodies',
  'patch_write_failed',
  'workspace_failed',
  'budget_exhausted',
] as const;

export type BenchmarkFailureClass = (typeof BENCHMARK_FAILURE_CLASSES)[number];

export type BenchmarkDeltaStatus = 'measured' | 'insufficient_evidence' | 'not_run';

export interface BenchmarkDeltaEvidence {
  benchmarkId: string;
  baseline: number | null;
  candidate: number | null;
  unit: string | null;
  direction: BenchmarkDirection;
  samples: { baseline: number[]; candidate: number[] };
  improvementRatio: number | null;
}

export interface BenchmarkDeltaRelativeReading {
  measurementKind: string;
  label: string;
  weight: number;
  volume: number;
  magnitude: number;
  unit: string;
  category: 'relative';
  propertyClass: 'benchmark-delta';
  status: BenchmarkDeltaStatus;
  rationale: string;
  failureClass?: BenchmarkFailureClass;
  benchmark: BenchmarkDeltaEvidence;
}

export function benchmarkDeltaKind(benchmarkId: string): string {
  return `${BENCHMARK_DELTA_KIND_PREFIX}${benchmarkId}`;
}

export function resolveBenchmarkDeltaCap(env: Record<string, string | undefined> = process.env): number {
  const raw = Number(env.BITCODE_BENCHMARK_DELTA_CAP);
  return Number.isFinite(raw) && raw > 0 && raw <= 10 ? raw : BENCHMARK_DELTA_DEFAULT_CAP;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function median(values: readonly number[]): number | null {
  const finite = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (finite.length === 0) return null;
  const mid = Math.floor(finite.length / 2);
  return finite.length % 2 ? finite[mid]! : (finite[mid - 1]! + finite[mid]!) / 2;
}

/** Evaluate a `$.a.b[0]` path (the only JSONPath subset the manifest admits). */
export function evaluateBenchmarkJsonPath(document: unknown, jsonPath: string): unknown {
  const tokens = jsonPath.slice(1).match(/\.[A-Za-z_][A-Za-z0-9_-]*|\[\d+\]/g) ?? [];
  let cursor: unknown = document;
  for (const token of tokens) {
    if (cursor === null || typeof cursor !== 'object') return undefined;
    cursor = token.startsWith('[')
      ? (cursor as unknown[])[Number(token.slice(1, -1))]
      : (cursor as Record<string, unknown>)[token.slice(1)];
  }
  return cursor;
}

function toFiniteNumber(value: unknown): number | null {
  const number = typeof value === 'number' ? value : typeof value === 'string' ? Number(value.trim()) : NaN;
  return Number.isFinite(number) ? number : null;
}

/** Parse one run's metric value; null when unparsable. */
export function extractBenchmarkMetric(input: {
  metric: BenchmarkMetric;
  stdout: string;
  jsonFileText?: string | null;
}): number | null {
  if (input.metric.source === 'stdout-regex') {
    const match = new RegExp(input.metric.pattern, 'm').exec(input.stdout || '');
    return match ? toFiniteNumber(match[1]) : null;
  }
  if (typeof input.jsonFileText !== 'string') return null;
  try {
    return toFiniteNumber(evaluateBenchmarkJsonPath(JSON.parse(input.jsonFileText), input.metric.jsonPath));
  } catch {
    return null;
  }
}

const FAILURE_RATIONALE: Record<BenchmarkFailureClass, string> = {
  setup_failed: 'benchmark setup command failed',
  baseline_failed: 'baseline run failed, so no comparison is possible',
  command_failed: 'benchmark command failed with this DataPack applied',
  timeout: 'benchmark run exceeded its timeout',
  metric_unparsable: 'benchmark metric could not be parsed',
  baseline_zero: 'baseline metric is zero, so relative improvement is undefined',
  no_patch_bodies: 'DataPack carries no file bodies to apply',
  patch_write_failed: 'DataPack file bodies could not be written to the checkout',
  workspace_failed: 'benchmark workspace could not be provisioned',
  budget_exhausted: 'benchmark budget was exhausted before this run',
};

function formatValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toPrecision(6).replace(/\.?0+$/, '');
}

/** Turn baseline + candidate samples into one `benchmark-delta:<id>` Relative row. */
export function readBenchmarkDelta(input: {
  benchmark: Pick<BenchmarkDeclaration, 'id' | 'title' | 'direction' | 'unit'>;
  baselineSamples: readonly number[];
  candidateSamples: readonly number[];
  failureClass?: BenchmarkFailureClass | null;
  cap?: number;
}): BenchmarkDeltaRelativeReading {
  const { benchmark } = input;
  const cap = input.cap && input.cap > 0 ? input.cap : BENCHMARK_DELTA_DEFAULT_CAP;
  const baseline = median(input.baselineSamples);
  const candidate = median(input.candidateSamples);
  const unit = benchmark.unit ?? null;
  const evidence = (improvementRatio: number | null): BenchmarkDeltaEvidence => ({
    benchmarkId: benchmark.id,
    baseline,
    candidate,
    unit,
    direction: benchmark.direction,
    samples: { baseline: [...input.baselineSamples], candidate: [...input.candidateSamples] },
    improvementRatio,
  });
  const base = {
    measurementKind: benchmarkDeltaKind(benchmark.id),
    label: benchmark.title,
    unit: unit ?? 'percent',
    category: 'relative' as const,
    propertyClass: 'benchmark-delta' as const,
  };

  let failureClass: BenchmarkFailureClass | null = input.failureClass ?? null;
  if (!failureClass && (baseline === null || candidate === null)) failureClass = 'metric_unparsable';
  if (!failureClass && baseline === 0) failureClass = 'baseline_zero';
  if (failureClass) {
    return {
      ...base,
      weight: 0,
      volume: 0.5,
      magnitude: 0,
      status: failureClass === 'budget_exhausted' ? 'not_run' : 'insufficient_evidence',
      failureClass,
      rationale: `${benchmark.title}: ${FAILURE_RATIONALE[failureClass]} (no weight; neither penalized nor rewarded).`,
      benchmark: evidence(null),
    };
  }

  const b = baseline as number;
  const c = candidate as number;
  const improvementRatio = benchmark.direction === 'higher-is-better' ? (c - b) / Math.abs(b) : (b - c) / Math.abs(b);
  const percent = improvementRatio * 100;
  const unitSuffix = unit ? ` ${unit}` : '';
  return {
    ...base,
    weight: 1,
    volume: clamp01(0.5 + improvementRatio / (2 * cap)),
    magnitude: percent,
    status: 'measured',
    rationale: `${benchmark.title}: ${formatValue(b)}${unitSuffix} → ${formatValue(c)}${unitSuffix} (${
      percent >= 0 ? '+' : ''
    }${percent.toFixed(1)}% ${percent >= 0 ? 'improvement' : 'regression'}; ${benchmark.direction}; median of ${
      input.candidateSamples.length
    } run(s)).`,
    benchmark: evidence(improvementRatio),
  };
}
