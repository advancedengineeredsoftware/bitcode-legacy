import {
  buildDepositSynthesizedAssetPack,
  assertNoObfuscationsOnAssetPack,
  DEPOSIT_SYNTHESIZED_ASSET_PACK_SCHEMA,
} from '../index';

describe('DepositSynthesizedAssetPack', () => {
  it('builds deposit pack with empty relatives and no obfuscations field', () => {
    const pack = buildDepositSynthesizedAssetPack({
      assetPackId: 'dep-1',
      title: 'Auth slice',
      summary: 'Deposit option',
      repositoryFullName: 'org/repo',
      kind: 'capability-slice',
      measurements: {
        absolutes: [
          {
            measurementKind: 'functions',
            label: 'Functions',
            volume: 0.5,
            magnitude: 10,
            weight: 0.18,
            unit: 'functions',
            category: 'absolute',
          },
        ],
        relatives: [],
      },
    });

    expect(pack.identity.schema).toBe(DEPOSIT_SYNTHESIZED_ASSET_PACK_SCHEMA);
    expect(pack.measurements.relatives).toEqual([]);
    expect(pack.measurements.absolutes).toHaveLength(1);
    expect(pack.kind).toBe('capability-slice');
    expect('obfuscations' in pack).toBe(false);
    expect(() => assertNoObfuscationsOnAssetPack(pack)).not.toThrow();
  });

  it('strips relatives if caller accidentally provides them', () => {
    const pack = buildDepositSynthesizedAssetPack({
      assetPackId: 'dep-2',
      title: 'T',
      summary: 'S',
      measurements: {
        absolutes: [],
        relatives: [
          {
            measurementKind: 'language-fit',
            volume: 0.9,
            magnitude: 0.9,
            weight: 0.35,
            unit: 'fit',
            category: 'relative',
          },
        ],
      },
    });
    expect(pack.measurements.relatives).toEqual([]);
  });
});
