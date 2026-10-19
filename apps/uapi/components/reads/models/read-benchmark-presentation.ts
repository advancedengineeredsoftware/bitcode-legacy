/**
 * Benchmark-delta Relative row presentation (V49 benchmark-delta law B-5):
 * baseline → candidate, signed improvement, unit, honesty badge. Only parsed
 * values reach the browser; benchmark output never does.
 */

export type BenchmarkDeltaEvidenceView = {
  benchmarkId?: string;
  baseline?: number | null;
  candidate?: number | null;
  unit?: string | null;
  direction?: string;
  improvementRatio?: number | null;
};

export type BenchmarkDeltaRowView = {
  measurementKind?: string;
  label?: string;
  status?: string;
  rationale?: string;
  benchmark?: BenchmarkDeltaEvidenceView | null;
};

export function isBenchmarkDeltaRow(row: { measurementKind?: string } | null | undefined): boolean {
  return typeof row?.measurementKind === 'string' && row.measurementKind.startsWith('benchmark-delta:');
}

function formatValue(value: number): string {
  if (Number.isInteger(value)) return value.toLocaleString('en-US');
  return Number(value.toPrecision(4)).toLocaleString('en-US');
}

/** "330,186 steps → 2,129 steps (+99.4%)" or a source-safe failure note. */
export function formatBenchmarkDelta(row: BenchmarkDeltaRowView): string {
  const evidence = row.benchmark ?? null;
  if (row.status !== 'measured' || !evidence) {
    return row.status === 'not_run' ? 'not run (benchmark budget exhausted)' : 'insufficient evidence — no weight';
  }
  const unit = evidence.unit ? ` ${evidence.unit}` : '';
  const baseline = typeof evidence.baseline === 'number' ? `${formatValue(evidence.baseline)}${unit}` : '—';
  const candidate = typeof evidence.candidate === 'number' ? `${formatValue(evidence.candidate)}${unit}` : '—';
  const ratio = typeof evidence.improvementRatio === 'number' ? evidence.improvementRatio * 100 : null;
  const signed = ratio === null ? '' : ` (${ratio >= 0 ? '+' : ''}${ratio.toFixed(1)}%)`;
  return `${baseline} → ${candidate}${signed}`;
}
