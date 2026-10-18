import {
  computeRelative,
  buildRelativeFromSignal,
  validateDepositSynthesisOptions,
  DEPOSIT_RELATIVE_MEASUREMENT,
} from '../asset-packs-synthesis';

/**
 * QA F24 v0 — relative, the deposit-lens preview of read Evaluation-fit.
 *   relative = clamp01(demand × (0.5 + 0.5·(1 − saturation)))
 * Demand gates; scarcity (1 − saturation) boosts.
 */
describe('relative (deposit preview of read Evaluation-fit, v0)', () => {
  it('computes demand-gated, scarcity-boosted relative', () => {
    // No demand → no relative regardless of scarcity.
    expect(computeRelative(0, 0)).toBe(0);
    expect(computeRelative(0, 1)).toBe(0);
    // Full demand, fully underserved (saturation 0) → max.
    expect(computeRelative(1, 0)).toBe(1);
    // Full demand, fully saturated → floored at half (demand × 0.5).
    expect(computeRelative(1, 1)).toBe(0.5);
    // Demanded + underserved beats demanded + saturated.
    expect(computeRelative(0.8, 0.1)).toBeGreaterThan(computeRelative(0.8, 0.9));
  });

  it('is NaN-safe and clamps out-of-range inputs', () => {
    expect(computeRelative(Number.NaN, 0.5)).toBe(0);
    expect(computeRelative(2, -1)).toBe(1); // demand→1, saturation→0
    const n = buildRelativeFromSignal({ demand: undefined, saturation: 'x' as any, rationale: 42 as any });
    expect(n?.volume).toBe(0);
    expect(n?.rationale).toBe('42');
  });

  it('returns undefined for missing signal', () => {
    expect(buildRelativeFromSignal(null)).toBeUndefined();
    expect(buildRelativeFromSignal(undefined)).toBeUndefined();
  });

  it('attaches relative to deposit candidates and omits it for read', () => {
    // Gate 3 Implementation attaches formal absolutes; the projector fails closed without them.
    const formalAbsolutes = [
      {
        measurementKind: 'function-count',
        label: 'Functions',
        weight: 0.12,
        volume: 0.7,
        category: 'absolute' as const,
        magnitude: 4,
        unit: 'functions',
      },
      {
        measurementKind: 'correctness-estimate',
        label: 'Correctness',
        weight: 0.18,
        volume: 0.8,
        category: 'absolute' as const,
      },
    ];
    const raw = [
      {
        kind: 'capability-slice',
        title: 'Auth capability slice',
        summary: 'A reusable authentication capability extracted from the source.',
        coveredSourcePaths: ['src/auth.ts'],
        measurements: { 'source-coverage': 0.7, 'demand-alignment': 0.6, 'reuse-likelihood': 0.5 },
        measurementRationale: 'Covers the auth module thoroughly.',
        confidence: 0.8,
        absolutes: formalAbsolutes,
        relativeSignal: { demand: 0.9, saturation: 0.2, rationale: 'High demand, few existing suppliers.' },
      },
    ];
    const context = {
      inventoryPaths: ['src/auth.ts'],
      impermissibleSources: [],
      candidateKinds: ['capability-slice', 'implementation-pattern', 'proof-operations-slice'],
    };

    const deposit = validateDepositSynthesisOptions(raw, { ...context, lens: 'deposit' });
    expect(deposit.candidates).toHaveLength(1);
    expect(deposit.candidates[0].relative).toMatchObject({ demand: 0.9, saturation: 0.2 });
    expect(deposit.candidates[0].relative?.volume).toBe(computeRelative(0.9, 0.2));
    // relative is NOT a member of the absolute composite (the measurements array).
    expect(deposit.candidates[0].measurements.map((m) => m.measurementKind)).not.toContain(
      DEPOSIT_RELATIVE_MEASUREMENT.measurementKind,
    );
    // Formal absolutes project onto the candidate measurements array.
    expect(deposit.candidates[0].measurements.map((m) => m.measurementKind)).toEqual(
      expect.arrayContaining(['function-count', 'correctness-estimate']),
    );

    const read = validateDepositSynthesisOptions(raw, { ...context, lens: 'read' });
    expect(read.candidates[0].relative).toBeUndefined();
  });
});
