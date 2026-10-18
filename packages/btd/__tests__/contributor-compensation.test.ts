import {
  ContributorFinalizeError,
  buildContributorCompensation,
  finalizeContributorSlice,
  finalizedContributorBtd,
  readProtocolCoinFeeBps,
  splitByBasisPoints,
} from '../src/erc1155/contributor-compensation';

const TWO = [
  { depositoryAssetPackId: 'dp-a', admissionRunId: 'adm-a', sellerUserId: 'seller-a', sellerAccount: '0xaaa', weightBps: 7_000 },
  { depositoryAssetPackId: 'dp-b', admissionRunId: 'adm-b', sellerUserId: 'seller-b', sellerAccount: '0xbbb', weightBps: 3_000 },
];

describe('contributor compensation (V49 S-2 / S-4)', () => {
  it('reads the protocol coin fee with default 500 and clamps', () => {
    expect(readProtocolCoinFeeBps({})).toBe(500);
    expect(readProtocolCoinFeeBps({ BITCODE_PROTOCOL_COIN_FEE_BPS: '0' })).toBe(0);
    expect(readProtocolCoinFeeBps({ BITCODE_PROTOCOL_COIN_FEE_BPS: '9000' })).toBe(5_000);
  });

  it('splits by basis points with exact largest-remainder conservation', () => {
    const parts = splitByBasisPoints(1_001n, [3_333, 3_333, 3_334]);
    expect(parts.reduce((sum, part) => sum + part, 0n)).toBe(1_001n);
  });

  it('takes the fee off the coin leg and conserves two contributor slices', () => {
    const statement = buildContributorCompensation({
      readId: 'read-1',
      assetPackId: 'ap-1',
      payAsset: 'ETH',
      grossPay: 1_000_003n,
      btdVolume: 900_000_000_000_000_001n,
      contributions: TWO,
      protocolCoinFeeBps: 500,
    });
    expect(statement.mode).toBe('contributors');
    expect(statement.protocolFee).toBe('50000');
    expect(statement.netPay).toBe('950003');
    const [a, b] = statement.contributors;
    expect(a.weightBps).toBe(7_000);
    expect(b.weightBps).toBe(3_000);
    expect(BigInt(a.slicePay) + BigInt(b.slicePay) + BigInt(statement.protocolFee)).toBe(1_000_003n);
    expect(BigInt(a.sliceBtd) + BigInt(b.sliceBtd)).toBe(900_000_000_000_000_001n);
    expect(statement.contributors.every((row) => row.status === 'awaiting-split')).toBe(true);
    expect(statement.sourceToSharesProofRoot).toBeTruthy();
    expect(statement.conservation).toEqual({ feePlusSlicesEqualsGross: true, slicesBtdEqualsVolume: true });
  });

  it('keeps net coin and V with treasury when no contributor is valid', () => {
    const statement = buildContributorCompensation({
      readId: 'read-2',
      assetPackId: 'ap-2',
      payAsset: 'ETH',
      grossPay: 1_000n,
      btdVolume: 10n,
      contributions: [],
    });
    expect(statement.mode).toBe('treasury-only');
    expect(statement.contributors).toEqual([]);
    expect(statement.treasuryPay).toBe('1000');
    expect(statement.treasuryBtd).toBe('10');
  });

  it('rejects weights that do not sum to 10000', () => {
    expect(() =>
      buildContributorCompensation({
        readId: 'r',
        assetPackId: 'a',
        payAsset: 'ETH',
        grossPay: 1n,
        btdVolume: 1n,
        contributions: [{ ...TWO[0], weightBps: 9_000 }],
      }),
    ).toThrow(/sum to 10000/);
  });

  it('finalizes only the caller slice, once', () => {
    const statement = buildContributorCompensation({
      readId: 'read-3',
      assetPackId: 'ap-3',
      payAsset: 'ETH',
      grossPay: 10_000n,
      btdVolume: 10_000n,
      contributions: TWO,
      protocolCoinFeeBps: 0,
    });
    const { statement: next, slice } = finalizeContributorSlice(statement, { sellerUserId: 'seller-a', sellerBtdBps: 1_000 });
    expect(slice.status).toBe('finalized');
    expect(slice.finalizedSplit).toMatchObject({ sellerBtdBps: 1_000, sellerBtd: '700', sellerPay: '6300' });
    expect(next.contributors[1].status).toBe('awaiting-split');
    expect(finalizedContributorBtd(next, 'seller-a')).toBe(700n);
    expect(finalizedContributorBtd(next, 'seller-b')).toBe(0n);
    expect(() => finalizeContributorSlice(next, { sellerUserId: 'seller-a', sellerBtdBps: 0 })).toThrow(ContributorFinalizeError);
    expect(() => finalizeContributorSlice(next, { sellerUserId: 'stranger', sellerBtdBps: 0 })).toThrow(/Only a contributing seller/);
  });
});
