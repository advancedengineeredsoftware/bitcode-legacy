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
