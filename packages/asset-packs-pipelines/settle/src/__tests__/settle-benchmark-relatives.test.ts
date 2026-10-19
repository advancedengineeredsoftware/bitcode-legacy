/**
 * V49 Gate 5: benchmark-delta Relatives survive the settle boundary — honesty
 * status keeps a failed benchmark weightless at mint, and the PR receipt shows
 * baseline → candidate.
 */

import { computeSettlementBtdFromRelatives } from '@bitcode/btd/erc1155';
import { formatSettleReceiptRelative, parseSettleAssetPackOption } from '../index';

const staticRows = [
  { measurementKind: 'language-fit', volume: 0.6, weight: 0.35 },
  { measurementKind: 'domain-fit', volume: 0.6, weight: 0.35 },
  { measurementKind: 'interface-fit', volume: 0.6, weight: 0.3 },
];

const measured = {
  measurementKind: 'benchmark-delta:lookup-steps',
  label: 'Lookup steps',
  volume: 1,
  weight: 0.4,
  status: 'measured',
  propertyClass: 'benchmark-delta',
  rationale: 'never carried',
  benchmark: {
    benchmarkId: 'lookup-steps',
    baseline: 330186,
    candidate: 2129,
    unit: 'steps',
    direction: 'lower-is-better',
    samples: { baseline: [330186], candidate: [2129] },
    improvementRatio: 0.9935,
  },
};

const failed = {
  measurementKind: 'benchmark-delta:render-throughput',
  label: 'Render throughput',
  volume: 0.5,
  weight: 0,
  status: 'insufficient_evidence',
  propertyClass: 'benchmark-delta',
};

describe('settle benchmark-delta relatives (V49 Gate 5)', () => {
  it('keeps status, label, and parsed benchmark evidence through the boundary parser', () => {
    const option = parseSettleAssetPackOption({
      title: 'Binary search lookup',
      measurements: { absolutes: [], relatives: [...staticRows, measured, failed] },
    });
    const rows = option!.measurements!.relatives as Array<Record<string, unknown>>;
    expect(rows.find((row) => row.measurementKind === measured.measurementKind)).toEqual(
      expect.objectContaining({
        status: 'measured',
        propertyClass: 'benchmark-delta',
        label: 'Lookup steps',
        benchmark: expect.objectContaining({ baseline: 330186, candidate: 2129, unit: 'steps' }),
      }),
    );
    const benchmark = rows.find((row) => row.measurementKind === measured.measurementKind)!.benchmark as Record<string, unknown>;
    expect(benchmark).not.toHaveProperty('samples');
    expect(rows.find((row) => row.measurementKind === failed.measurementKind)).toEqual(
      expect.objectContaining({ status: 'insufficient_evidence' }),
    );
  });

  it('mints from the measured benchmark and never from the failed one', () => {
    const option = parseSettleAssetPackOption({
      title: 'Binary search lookup',
      measurements: { absolutes: [], relatives: [...staticRows, measured, failed] },
    });
    const btd = computeSettlementBtdFromRelatives(option!.measurements!);
    expect(btd.relativesCount).toBe(4);
    expect(btd.evaluationFitVolume).toBeCloseTo(0.6 * 0.6 + 0.4 * 1);

    const statusStripped = computeSettlementBtdFromRelatives({
      relatives: [...staticRows, { measurementKind: failed.measurementKind, volume: 0.5, weight: 0 }],
    });
    expect(statusStripped.evaluationFitVolume).toBeCloseTo(0.6);
  });

  it('prints baseline → candidate in the PR receipt', () => {
    expect(formatSettleReceiptRelative(measured)).toBe('330186 steps → 2129 steps (+99.4%); volume 1.000');
    expect(formatSettleReceiptRelative(failed)).toBe('insufficient evidence (no weight)');
    expect(formatSettleReceiptRelative({ measurementKind: 'language-fit', volume: 0.6 })).toBe('0.600');
  });
});
