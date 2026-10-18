/**
 * Read relatives: all kinds end with -fit; evaluation-fit is weighted mean.
 */

import {
  slugifyRelativeKind,
  assertRelativeKindSuffix,
  humanizeRelativeLabel,
  planDynamicRelativesFromContext,
  measureReadRelatives,
  measureReadRelativesDeterministic,
  packEvaluationMaterialOverlap,
  computeEvaluationFitVolume,
  ASSET_PACK_RELATIVES_CATALOG,
} from '../read-relative-measurements';

describe('read-relative-measurements', () => {
  it('slugify forces -fit suffix', () => {
    expect(slugifyRelativeKind('needs session refresh')).toBe('needs-session-refresh-fit');
    expect(slugifyRelativeKind('language-fit')).toBe('language-fit');
    expect(assertRelativeKindSuffix('domain-fit')).toBe(true);
    expect(assertRelativeKindSuffix('domain')).toBe(false);
  });

  it('humanizeRelativeLabel title-cases stems', () => {
    expect(humanizeRelativeLabel('needs-session-refresh-fit')).toBe('Needs Session Refresh');
  });

  it('static catalogue kinds all end with -fit', () => {
    for (const spec of ASSET_PACK_RELATIVES_CATALOG) {
      expect(spec.measurementKind.endsWith('-fit')).toBe(true);
    }
  });

  it('planDynamicRelativesFromContext produces labeled *-fit rows from Evaluation + paths', () => {
    const plan = planDynamicRelativesFromContext({
      evaluationText: 'Add retries to payment webhooks',
      evaluationTopics: ['payment webhooks', 'retries'],
      pathHints: ['src/payments/stripe.ts'],
    });
    expect(plan.length).toBeGreaterThanOrEqual(2);
    for (const row of plan) {
      expect(row.measurementKind.endsWith('-fit')).toBe(true);
      expect(row.label.length).toBeGreaterThan(2);
      expect(row.guidance.length).toBeGreaterThan(10);
      expect(row.weight).toBeGreaterThan(0);
    }
  });

  it('measureReadRelativesDeterministic returns static + dynamic *-fit rows with magnitude+volume', () => {
    const rows = measureReadRelativesDeterministic({
      title: 'Auth pack',
      summary: 'Session refresh knowledge for the Evaluation.',
      confidence: 0.8,
      evaluationSummary: 'I need session refresh',
      dynamicRelatives: [
        {
          measurementKind: 'session-refresh-fit',
          label: 'Session refresh fit',
          guidance: 'How well session refresh is covered.',
          weight: 1,
        },
        {
          measurementKind: 'auth-timeout-fit',
          label: 'Auth timeout fit',
          guidance: 'Timeout handling for auth sessions.',
          weight: 1,
        },
      ],
    });
    expect(rows.length).toBeGreaterThanOrEqual(ASSET_PACK_RELATIVES_CATALOG.length + 1);
    const weightSum = rows.reduce((s, r) => s + r.weight, 0);
    expect(weightSum).toBeGreaterThan(0.99);
    expect(weightSum).toBeLessThan(1.01);
    const dyn = rows.find((r) => r.measurementKind === 'session-refresh-fit');
    expect(dyn?.label).toBe('Session refresh fit');
    expect(dyn?.propertyClass).toBe('dynamic-inferred');
    for (const row of rows) {
      expect(row.measurementKind.endsWith('-fit')).toBe(true);
      expect(row.category).toBe('relative');
      expect(row.volume).toBeGreaterThanOrEqual(0);
      expect(row.volume).toBeLessThanOrEqual(1);
      expect(typeof row.magnitude).toBe('number');
    }
    const evaluationFit = computeEvaluationFitVolume(rows);
    expect(evaluationFit).toBeGreaterThanOrEqual(0);
    expect(evaluationFit).toBeLessThanOrEqual(1);
  });

  it('async measureReadRelatives falls back when real inference is off', async () => {
    const saved = process.env.BITCODE_ASSET_PACK_REAL_INFERENCE;
    process.env.BITCODE_ASSET_PACK_REAL_INFERENCE = '0';
    try {
      const rows = await measureReadRelatives({
        title: 'Auth pack',
        summary: 'Session refresh knowledge for the Evaluation.',
        confidence: 0.7,
        dynamicKinds: ['auth-fit'],
      });
      expect(rows.every((r) => r.measurementKind.endsWith('-fit'))).toBe(true);
      expect(rows.some((r) => r.measurementKind.includes('auth'))).toBe(true);
    } finally {
      if (saved !== undefined) process.env.BITCODE_ASSET_PACK_REAL_INFERENCE = saved;
      else delete process.env.BITCODE_ASSET_PACK_REAL_INFERENCE;
    }
  });

  it('STAB-B2: Evaluation present with empty plan still yields dynamic *-fit rows', () => {
    const rows = measureReadRelativesDeterministic({
      title: 'Webhook pack',
      summary: 'Retry helpers for payment webhooks',
      confidence: 0.75,
      evaluationSummary: 'Add retries to payment webhooks',
      dynamicRelatives: [],
      dynamicKinds: [],
      coveredSourcePaths: ['src/payments/stripe-webhook.ts'],
      patchSummary: 'Adds exponential backoff on webhook delivery failures.',
    });
    const dynamic = rows.filter((r) => r.propertyClass === 'dynamic-inferred');
    expect(dynamic.length).toBeGreaterThanOrEqual(1);
    expect(rows.some((r) => r.rationale?.includes('pack material overlap'))).toBe(true);
  });

  it('STAB-B2: pack material overlap is higher when Evaluation tokens match pack paths', () => {
    const high = packEvaluationMaterialOverlap({
      evaluationSummary: 'session refresh tokens',
      title: 'Session refresh pack',
      summary: 'Refresh token rotation',
      coveredSourcePaths: ['src/auth/session-refresh.ts'],
      patchSummary: 'Implements session refresh token rotation.',
    });
    const low = packEvaluationMaterialOverlap({
      evaluationSummary: 'session refresh tokens',
      title: 'Unrelated UI chrome',
      summary: 'Buttons and layout only',
      coveredSourcePaths: ['src/ui/layout.tsx'],
      patchSummary: 'Tweaks margin utilities.',
    });
    expect(high).toBeGreaterThan(low);
  });
});

