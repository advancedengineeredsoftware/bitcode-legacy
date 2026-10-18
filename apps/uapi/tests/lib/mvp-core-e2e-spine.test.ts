/**
 * @jest-environment node
 *
 * MVP-E2E L4 spine + L5 fail-closed matrix (non-UI).
 */

import { runMvpCoreE2eSpine } from '@/lib/mvp-core-e2e-spine';

describe('MVP-E2E L4 core spine', () => {
  it('runs deposit→admit→index projection→search→relatives→quote with source-safe checks', async () => {
    const result = await runMvpCoreE2eSpine({
      repositoryFullName: 'octocat/Spoon-Knife',
      evaluationText: 'I need session refresh and token rotation for OAuth clients.',
      includePathOnlyNoise: true,
      failMode: 'none',
    });

    expect(result.schema).toBe('bitcode.mvp-core-e2e-spine');
    expect(result.failMode).toBe('none');
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);

    expect(result.steps.depositSynthesis.optionCount).toBeGreaterThanOrEqual(1);
    expect(result.steps.admission.admittedCount).toBeGreaterThanOrEqual(1);
    expect(result.steps.admission.depositoryAssetPackId).toMatch(/depository-assetpack/i);
    expect(result.steps.admission.sourceSafe).toBe(true);
    expect(result.steps.admission.packsActivityRoute).toBe('/packs');

    expect(result.steps.indexProjection.embedTextHasCommercialNlSection).toBe(true);
    expect(result.steps.indexProjection.commercialTitle).toMatch(/session refresh/i);

    expect(result.steps.search.hitCount).toBeGreaterThanOrEqual(1);
    expect(result.steps.search.nlRankedAbovePathNoise).toBe(true);

    expect(result.steps.readRelatives.rowCount).toBeGreaterThan(0);
    expect(result.steps.readRelatives.allFitSuffix).toBe(true);
    expect(result.steps.readRelatives.evaluationFitVolume).toBeGreaterThan(0);

    expect(result.steps.quote.ok).toBe(true);
    expect(result.steps.quote.optionCount).toBeGreaterThan(0);
    expect(result.steps.quote.evaluationFitVolume).toBeGreaterThan(0);

    expect(result.steps.sourceSafety.admissionSourceSafe).toBe(true);
    expect(result.steps.sourceSafety.unpaidSearchHitsHaveNoFileBodies).toBe(true);
    expect(result.steps.sourceSafety.admissionActivitySourceSafe).toBe(true);
    expect(result.steps.pathOnlyHonesty.neverMeasured).toBe(true);
    expect(result.steps.pathOnlyHonesty.absoluteCount).toBeGreaterThan(0);
  }, 60000);
});

describe('MVP-E2E L5 fail-closed matrix', () => {
  it('reject-admission: zero admissions and not ok', async () => {
    const result = await runMvpCoreE2eSpine({ failMode: 'reject-admission' });
    expect(result.ok).toBe(false);
    expect(result.failMode).toBe('reject-admission');
    expect(result.steps.admission.admittedCount).toBe(0);
    expect(result.errors).toContain('no_admitted_options');
    expect(result.steps.pathOnlyHonesty.neverMeasured).toBe(true);
  });

  it('empty-relatives-quote: quote fails closed', async () => {
    const result = await runMvpCoreE2eSpine({ failMode: 'empty-relatives-quote' });
    expect(result.ok).toBe(false);
    expect(result.failMode).toBe('empty-relatives-quote');
    expect(result.steps.quote.ok).toBe(false);
    expect(result.errors).toContain('quote_failed_empty_relatives');
  });

  it('empty-search-corpus: thin depository yields zero hits', async () => {
    const result = await runMvpCoreE2eSpine({ failMode: 'empty-search-corpus' });
    expect(result.ok).toBe(false);
    expect(result.failMode).toBe('empty-search-corpus');
    expect(result.steps.search.hitCount).toBe(0);
    expect(result.errors).toContain('empty_search_corpus');
  });
});
