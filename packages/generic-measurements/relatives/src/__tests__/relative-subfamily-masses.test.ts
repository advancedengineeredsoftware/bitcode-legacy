import { computeEvaluationFitVolume } from '../relatives-catalog';
import {
  applyRelativeSubfamilyMasses,
  assertRelativeKindPattern,
  resolveRelativeSubfamilyMasses,
} from '../relative-subfamily-masses';

const staticRows = [
  { measurementKind: 'language-fit', volume: 0.8, weight: 0.35 },
  { measurementKind: 'domain-fit', volume: 0.6, weight: 0.35 },
  { measurementKind: 'interface-fit', volume: 0.4, weight: 0.3 },
];
const inferred = { measurementKind: 'session-refresh-fit', volume: 0.9, weight: 1, propertyClass: 'dynamic-inferred' };
const bench = (volume: number, status = 'measured') => ({
  measurementKind: 'benchmark-delta:parse-throughput',
  volume,
  weight: 1,
  status,
  propertyClass: 'benchmark-delta',
});

function sum(rows: Array<{ weight?: number }>): number {
  return rows.reduce((total, row) => total + (row.weight ?? 0), 0);
}

describe('relative kind-name law (V49)', () => {
  it('admits -fit and benchmark-delta kinds only', () => {
    expect(assertRelativeKindPattern('language-fit')).toBe(true);
    expect(assertRelativeKindPattern('benchmark-delta:parse-throughput')).toBe(true);
    expect(assertRelativeKindPattern('benchmark-delta:Bad Id')).toBe(false);
    expect(assertRelativeKindPattern('-fit')).toBe(false);
    expect(assertRelativeKindPattern('latency')).toBe(false);
  });
});

describe('relative subfamily masses (V49)', () => {
  it('matches the SPEC mass table', () => {
    expect(resolveRelativeSubfamilyMasses(new Set(['static']))).toEqual({ static: 1 });
    expect(resolveRelativeSubfamilyMasses(new Set(['static', 'inferred']))).toEqual({ static: 0.6, inferred: 0.4 });
    expect(resolveRelativeSubfamilyMasses(new Set(['static', 'benchmark']))).toEqual({ static: 0.6, benchmark: 0.4 });
    expect(resolveRelativeSubfamilyMasses(new Set(['static', 'inferred', 'benchmark']))).toEqual({
      static: 0.4,
      inferred: 0.3,
      benchmark: 0.3,
    });
  });

  it('re-weights all three subfamilies and stays idempotent', () => {
    const massed = applyRelativeSubfamilyMasses([...staticRows, inferred, bench(0.75)]);
    expect(sum(massed)).toBeCloseTo(1);
    expect(massed.find((r) => r.measurementKind === 'session-refresh-fit')!.weight).toBeCloseTo(0.3);
    expect(massed.find((r) => r.measurementKind.startsWith('benchmark-delta:'))!.weight).toBeCloseTo(0.3);
    expect(applyRelativeSubfamilyMasses(massed).map((r) => r.weight)).toEqual(massed.map((r) => r.weight));
  });

  it('gives failed benchmarks zero weight and redistributes their mass', () => {
    const withFailed = [...staticRows, inferred, bench(0.5, 'insufficient_evidence')];
    const massed = applyRelativeSubfamilyMasses(withFailed);
    expect(massed.find((r) => r.measurementKind.startsWith('benchmark-delta:'))!.weight).toBe(0);
    expect(computeEvaluationFitVolume(withFailed)).toBeCloseTo(computeEvaluationFitVolume([...staticRows, inferred]));
  });

  it('keeps static-only and static+inferred evaluation-fit unchanged', () => {
    // Static only: plain catalogue-weighted mean.
    expect(computeEvaluationFitVolume(staticRows)).toBeCloseTo(0.35 * 0.8 + 0.35 * 0.6 + 0.3 * 0.4);
    // Static + inferred: 0.6 / 0.4 split.
    const staticMean = 0.35 * 0.8 + 0.35 * 0.6 + 0.3 * 0.4;
    expect(computeEvaluationFitVolume([...staticRows, inferred])).toBeCloseTo(0.6 * staticMean + 0.4 * 0.9);
  });

  it('lets a measured benchmark move evaluation-fit', () => {
    const staticMean = 0.35 * 0.8 + 0.35 * 0.6 + 0.3 * 0.4;
    expect(computeEvaluationFitVolume([...staticRows, bench(1)])).toBeCloseTo(0.6 * staticMean + 0.4);
    expect(computeEvaluationFitVolume([...staticRows, bench(1)])).toBeGreaterThan(computeEvaluationFitVolume(staticRows));
  });
});
