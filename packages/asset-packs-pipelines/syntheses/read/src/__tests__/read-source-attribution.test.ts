import { attributeReadOptionSources, validateReadSourceAttributions } from '../read-source-attribution';
import runReadFinishSynthesizeRunAgent from '../agents/finish/read-finish-synthesize-run-agent';

const SUPPLY = [
  { depositoryAssetPackId: 'dp-a', title: 'Retry pack', summary: 'Retries' },
  { depositoryAssetPackId: 'dp-b', title: 'Webhook pack', summary: 'Webhooks' },
];

describe('rich read source attribution (V49 S-1)', () => {
  it('keeps only admitted supply ids with positive weights per option', () => {
    const raw = {
      attributions: [
        { optionIndex: 0, sources: [{ depositoryAssetPackId: 'dp-a', weight: 2, rationale: 'adapted' }, { depositoryAssetPackId: 'invented', weight: 9 }] },
        { optionIndex: 1, sources: [{ depositoryAssetPackId: 'dp-b', weight: 0 }] },
        { optionIndex: 7, sources: [{ depositoryAssetPackId: 'dp-a', weight: 1 }] },
      ],
    };
    expect(validateReadSourceAttributions(raw, 2, SUPPLY)).toEqual([
      [{ depositoryAssetPackId: 'dp-a', weight: 2, rationale: 'adapted' }],
      [],
    ]);
    expect(validateReadSourceAttributions(null, 1, SUPPLY)).toEqual([[]]);
  });

  it('is fail-soft without supply or a registered model', async () => {
    await expect(
      attributeReadOptionSources({ options: [{ title: 'x' }], supply: [], evaluation: '', execution: {} }),
    ).resolves.toEqual([[]]);
    await expect(
      attributeReadOptionSources({ options: [{ title: 'x' }], supply: SUPPLY, evaluation: '', execution: {} }),
    ).resolves.toEqual([[]]);
  });

  it('uses exactly one registered model call when available', async () => {
    let calls = 0;
    const execution = {
      llms: {
        getDefaultLLM: () => async () => {
          calls += 1;
          return { content: JSON.stringify({ attributions: [{ optionIndex: 0, sources: [{ depositoryAssetPackId: 'dp-b', weight: 1 }] }] }) };
        },
      },
    };
    const previous = process.env.BITCODE_ASSET_PACK_REAL_INFERENCE;
    process.env.BITCODE_ASSET_PACK_REAL_INFERENCE = '1';
    try {
      const result = await attributeReadOptionSources({ options: [{ title: 'x' }], supply: SUPPLY, evaluation: 'e', execution });
      expect(calls).toBe(1);
      expect(result).toEqual([[{ depositoryAssetPackId: 'dp-b', weight: 1, rationale: '' }]]);
    } finally {
      process.env.BITCODE_ASSET_PACK_REAL_INFERENCE = previous;
    }
  });

  it('Finish carries attributions on server fullOptions only', async () => {
    const stores = new Map<string, unknown>();
    const execution = {
      get: (ns: string, key: string) => stores.get(`${ns}:${key}`),
      findUp: () => undefined,
      store: (ns: string, key: string, value: unknown) => stores.set(`${ns}:${key}`, value),
    };
    stores.set('implementation:options', [
      {
        title: 'Retry with backoff',
        summary: 'Bounded retries with jitter for the client.',
        measurements: { absolutes: [], relatives: [] },
        sourceAttributions: [{ depositoryAssetPackId: 'dp-a', weight: 1 }],
      },
    ]);
    const result = await runReadFinishSynthesizeRunAgent({}, execution);
    expect((result.fullOptions as any[])[0].sourceAttributions).toEqual([{ depositoryAssetPackId: 'dp-a', weight: 1 }]);
    expect(JSON.stringify(result.options)).not.toContain('sourceAttributions');
  });
});
