import {
  readOptionSourceAttributions,
  resolveReadOptionSourceContributions,
} from '../source-contributions';

const SELLERS = new Map([
  ['dp-a', { depositoryAssetPackId: 'dp-a', admissionRunId: 'adm-a', sellerUserId: 'seller-a' }],
  ['dp-b', { depositoryAssetPackId: 'dp-b', admissionRunId: 'adm-b', sellerUserId: 'seller-b' }],
]);

describe('read option source contributions (V49 S-1)', () => {
  it('keeps only seller-linked supply, merges duplicates, normalizes to 10000', () => {
    const result = resolveReadOptionSourceContributions(
      [
        { depositoryAssetPackId: 'dp-a', weight: 1 },
        { depositoryAssetPackId: 'dp-a', weight: 1 },
        { depositoryAssetPackId: 'dp-b', weight: 1 },
        { depositoryAssetPackId: 'invented', weight: 50 },
      ],
      SELLERS,
    );
    expect(result.mode).toBe('contributors');
    expect(result.sources.map((row) => [row.depositoryAssetPackId, row.weightBps])).toEqual([
      ['dp-a', 6_667],
      ['dp-b', 3_333],
    ]);
    expect(result.sources.reduce((sum, row) => sum + row.weightBps, 0)).toBe(10_000);
    expect(result.sources[0]).toMatchObject({ admissionRunId: 'adm-a', sellerUserId: 'seller-a' });
  });

  it('is treasury-only when nothing resolves', () => {
    expect(resolveReadOptionSourceContributions([{ depositoryAssetPackId: 'x', weight: 1 }], SELLERS)).toMatchObject({
      mode: 'treasury-only',
      sources: [],
    });
  });

  it('reads attributions fail-soft from an option carrier', () => {
    expect(
      readOptionSourceAttributions({
        sourceAttributions: [{ depositoryAssetPackId: ' dp-a ', weight: '2' }, { weight: 1 }, null, { depositoryAssetPackId: 'dp-b', weight: -1 }],
      }),
    ).toEqual([{ depositoryAssetPackId: 'dp-a', weight: 2, rationale: '' }]);
    expect(readOptionSourceAttributions(null)).toEqual([]);
  });
});
