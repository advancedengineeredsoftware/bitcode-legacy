import { computeSettlementBtdFromRelatives } from '../src/erc1155/settlement-btd-from-relatives';

const staticRows = [
  { measurementKind: 'language-fit', volume: 0.8, weight: 0.35 },
  { measurementKind: 'domain-fit', volume: 0.6, weight: 0.35 },
  { measurementKind: 'interface-fit', volume: 0.4, weight: 0.3 },
];
const staticMean = 0.35 * 0.8 + 0.35 * 0.6 + 0.3 * 0.4;

describe('settlement BTD under the V49 subfamily mass law', () => {
  it('keeps static-only settlement unchanged', () => {
    expect(computeSettlementBtdFromRelatives(staticRows).evaluationFitVolume).toBeCloseTo(staticMean);
  });

  it('lets a measured benchmark-delta row carry its 0.4 static+benchmark mass', () => {
    const result = computeSettlementBtdFromRelatives([
      ...staticRows,
      { measurementKind: 'benchmark-delta:parse-throughput', volume: 1, weight: 1, status: 'measured' },
    ]);
    expect(result.relativesCount).toBe(4);
    expect(result.evaluationFitVolume).toBeCloseTo(0.6 * staticMean + 0.4);
  });

  it('ignores insufficient_evidence and not_run benchmark rows', () => {
    const result = computeSettlementBtdFromRelatives([
      ...staticRows,
      { measurementKind: 'benchmark-delta:parse-throughput', volume: 0.5, weight: 0, status: 'insufficient_evidence' },
      { measurementKind: 'benchmark-delta:lookup-steps', volume: 0.5, weight: 0, status: 'not_run' },
    ]);
    expect(result.relativesCount).toBe(3);
    expect(result.evaluationFitVolume).toBeCloseTo(staticMean);
  });

  it('applies the three-subfamily masses', () => {
    const result = computeSettlementBtdFromRelatives([
      ...staticRows,
      { measurementKind: 'session-refresh-fit', volume: 0.9, weight: 1, propertyClass: 'dynamic-inferred' },
      { measurementKind: 'benchmark-delta:parse-throughput', volume: 0.75, weight: 1, status: 'measured' },
    ]);
    expect(result.evaluationFitVolume).toBeCloseTo(0.4 * staticMean + 0.3 * 0.9 + 0.3 * 0.75);
  });
});
