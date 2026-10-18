/**
 * Projected BitcodeERC1155 account holdings (V48 G4-5): APs move on settle
 * (buyer co-own) and admission (depositor), BTD moves only on the seller's
 * finalized payout; buyers never receive fungible BTD.
 */

import { projectAccountHoldingsFromSettlements } from '../src/erc1155/projected-holdings';

const BTD = (whole: number) => (BigInt(Math.round(whole * 1e6)) * 10n ** 12n).toString();

const admission = {
  id: 'admit-1',
  user_id: 'seller',
  created_at: '2026-10-13T10:00:00Z',
  status: 'completed',
  context: {
    source: 'deposit-option-review-admission',
    admissionState: 'admitted-to-depository',
    depositoryAssetPackId: 'dp-webhooks',
    assetPackTitle: 'Idempotent webhook ingestion',
  },
};

function settle(overrides: { payoutStatus?: string; sellerBtd?: string; id?: string } = {}) {
  return {
    id: overrides.id ?? 'settle-1',
    user_id: 'buyer',
    created_at: '2026-10-13T11:00:00Z',
    status: 'completed',
    context: {
      source: 'read-settle-asset-pack',
      assetPackKey: 'ap-webhooks-1',
      assetPackTitle: 'Idempotent webhook ingestion',
      sellerUserId: 'seller',
    },
    pendingPayout: {
      status: overrides.payoutStatus ?? 'pending-seller-review',
      sellerBtd: overrides.sellerBtd ?? null,
    },
  };
}

describe('projectAccountHoldingsFromSettlements', () => {
  it('gives the buyer a co-owned AssetPack and no BTD', () => {
    const buyer = projectAccountHoldingsFromSettlements([settle({ payoutStatus: 'finalized', sellerBtd: BTD(0.4) })], 'buyer');
    expect(buyer.btd).toBe(0);
    expect(buyer.assetPacks).toEqual([
      expect.objectContaining({ assetPackId: 'ap-webhooks-1', readRightState: 'licensed_read' }),
    ]);
  });

  it('counts the depositor admission as an owned AssetPack', () => {
    const seller = projectAccountHoldingsFromSettlements([admission], 'seller');
    expect(seller.assetPacks).toEqual([
      expect.objectContaining({ assetPackId: 'dp-webhooks', readRightState: 'owner_read' }),
    ]);
  });

  it('credits seller BTD only once the payout split is finalized', () => {
    expect(projectAccountHoldingsFromSettlements([admission, settle()], 'seller').btd).toBe(0);
    const finalized = projectAccountHoldingsFromSettlements(
      [admission, settle({ payoutStatus: 'finalized', sellerBtd: BTD(0.25) }), settle({ id: 'settle-2', payoutStatus: 'finalized', sellerBtd: BTD(0.5) })],
      'seller',
    );
    expect(finalized.btd).toBeCloseTo(0.75, 6);
    expect(finalized.btdBaseUnits).toBe(BigInt(BTD(0.75)));
  });

  it('ignores incomplete settles and de-duplicates rows', () => {
    const running = { ...settle(), status: 'running' };
    const holdings = projectAccountHoldingsFromSettlements([running, admission, admission], 'buyer');
    expect(holdings.assetPacks).toEqual([]);
    expect(projectAccountHoldingsFromSettlements([admission, admission], 'seller').assetPacks).toHaveLength(1);
  });
});

describe('projected holdings — V49 contributor slices', () => {
  const { buildContributorCompensation, finalizeContributorSlice } = jest.requireActual(
    '../src/erc1155/contributor-compensation',
  );
  const statement = buildContributorCompensation({
    readId: 'read-1',
    assetPackId: 'ap-1',
    payAsset: 'ETH',
    grossPay: 1_000n,
    btdVolume: 10n ** 18n,
    protocolCoinFeeBps: 0,
    contributions: [
      { depositoryAssetPackId: 'dp-a', admissionRunId: 'adm-a', sellerUserId: 'seller-a', sellerAccount: '0xa', weightBps: 6_000 },
      { depositoryAssetPackId: 'dp-b', admissionRunId: 'adm-b', sellerUserId: 'seller-b', sellerAccount: '0xb', weightBps: 4_000 },
    ],
  });
  const finalizedA = finalizeContributorSlice(statement, { sellerUserId: 'seller-a', sellerBtdBps: 10_000 }).statement;
  const row = {
    id: 'settle-multi',
    user_id: 'buyer',
    status: 'completed',
    context: { source: 'read-settle-asset-pack', sellerUserId: 'seller-a', contributorUserIds: ['seller-a', 'seller-b'] },
    compensationStatement: finalizedA,
  };

  it('credits each contributor only with their own finalized slice', () => {
    expect(projectAccountHoldingsFromSettlements([row], 'seller-a').btdBaseUnits).toBe(6n * 10n ** 17n);
    expect(projectAccountHoldingsFromSettlements([row], 'seller-b').btdBaseUnits).toBe(0n);
    expect(projectAccountHoldingsFromSettlements([row], 'buyer').btdBaseUnits).toBe(0n);
  });
});
