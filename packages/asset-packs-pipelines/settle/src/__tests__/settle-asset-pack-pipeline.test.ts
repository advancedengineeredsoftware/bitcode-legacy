/**
 * ExecutionPipelineSimpleSettleAssetPack — 1:1 option, relatives BTD mint to depositor, ERC1155 co-own.
 */

import { Execution } from '@bitcode/execution-generics';
import {
  factoryExecutionPipelineSimpleSettleAssetPack,
  type SettleAssetPackOption,
  type SettleAssetPackInput,
} from '../index';
import {
  balanceOf,
  BITCODE_BTD_TOKEN_ID,
  computeSettlementBtdFromRelatives,
} from '@bitcode/btd/erc1155';

describe('ExecutionPipelineSimpleSettleAssetPack', () => {
  const option: SettleAssetPackOption = {
    title: 'Session refresh fit pack',
    kind: 'capability-slice',
    patch: { patchSummary: 'Add refresh token rotation helper.' },
    measurements: {
      absolutes: [
        {
          kind: 'functions',
          volume: 0.4,
          magnitude: 8,
          weight: 0.18,
          unit: 'functions',
        },
      ],
      relatives: [
        { kind: 'language-fit', volume: 0.9, weight: 0.35 },
        { kind: 'domain-fit', volume: 0.8, weight: 0.35 },
        { kind: 'interface-fit', volume: 0.7, weight: 0.3 },
      ],
    },
  };

  it('rejects multi-option settle (1:1 law)', async () => {
    const pipeline = factoryExecutionPipelineSimpleSettleAssetPack();
    const exec = new Execution('test:settle:multi');
    const input: SettleAssetPackInput = {
      selectedOptions: [option, { ...option, title: 'Other' }],
    };
    await expect(pipeline(input, exec)).rejects.toThrow(/1:1/);
  });

  it('runs payment → BTD volume quote → finalize (mint to depositor + co-own) → ship → journal', async () => {
    const pipeline = factoryExecutionPipelineSimpleSettleAssetPack();
    const exec = new Execution('test:settle:happy');
    const input: SettleAssetPackInput = {
      assetPackOption: option,
      repository: { fullName: 'acme/app', owner: 'acme', name: 'app', branch: 'main' },
      buyerEthereumAddress: '0xBuyerWallet',
      masterEthereumAddress: '0xMasterTreasury',
      userId: 'user-1',
      synthesisRunId: 'read-run-1',
      sourceContributions: [
        {
          depositoryAssetPackId: 'dp-a',
          admissionRunId: 'adm-a',
          sellerUserId: 'seller-a',
          sellerAccount: '0xDepositorWallet',
          weightBps: 10_000,
        },
      ],
      protocolCoinFeeBps: 500,
      paymentObservation: {
        network: 'ethereum-sepolia',
        amountSats: 12_000,
      },
    };
    const result = await pipeline(input, exec);

    expect(result.success).toBe(true);
    expect(result.summary).toMatch(/finalize-settle/);
    expect(result.readSynthesizedSettledAssetPack?.identity.schema).toMatch(
      /read-synthesized-settled/,
    );
    expect(result.readSynthesizedSettledAssetPack?.btdRights.status).toBe('transferred');
    expect(result.readSynthesizedSettledAssetPack?.assetPackRights.removedPriorOwner).toBe(false);
    expect(result.readSynthesizedSettledAssetPack?.settleable).toBe(false);

    const mint = result.mintBtd;
    expect(mint.agent).toBe('mint-btd');
    expect(mint.settlementBtd.relativesCount).toBe(3);
    expect(mint.settlementBtd.evaluationFitVolume).toBeGreaterThan(0.7);
    expect(mint.settlementBtd.evaluationFitVolume).toBeLessThan(1);

    const settleBtd = result.settleBtd;
    expect(settleBtd.agent).toBe('settle-btd');
    expect(settleBtd.buyerAccount.toLowerCase()).toBe('0xbuyerwallet');

    const settleAp = result.settleAssetPack;
    expect(settleAp.agent).toBe('settle-asset-pack');
    expect(settleAp.removedPriorOwner).toBe(false);
    expect(settleAp.coOwners.map((a) => a.toLowerCase())).toEqual(
      expect.arrayContaining(['0xdepositorwallet', '0xbuyerwallet']),
    );

    const activity = result.packActivity;
    expect(activity.packActivityType).toBe('settled-assetpack');
    expect(activity.mintBtd?.evaluationFitVolume).toBe(mint.settlementBtd.evaluationFitVolume);
    expect(activity.settleAssetPack?.removedPriorOwner).toBe(false);
    expect(activity.measurements.some((m) => m.category === 'relative')).toBe(true);

    const state = result.erc1155State;
    // Full BTD escrowed on master; buyer co-owns AP without fungible mint.
    expect(balanceOf(state, '0xMasterTreasury', BITCODE_BTD_TOKEN_ID)).toBeGreaterThan(0n);
    expect(balanceOf(state, '0xBuyerWallet', BITCODE_BTD_TOKEN_ID)).toBe(0n);
    expect(balanceOf(state, '0xDepositorWallet', BITCODE_BTD_TOKEN_ID)).toBe(0n);
    expect((result as { pendingPayout?: { status?: string } }).pendingPayout?.status).toBe(
      'pending-seller-review',
    );

    // V49 S-2: protocol coin fee + one contributor slice, conserved.
    const statement = result.compensationStatement!;
    expect(statement.mode).toBe('contributors');
    expect(statement.protocolCoinFeeBps).toBe(500);
    expect(BigInt(statement.protocolFee) + BigInt(statement.contributors[0].slicePay)).toBe(
      BigInt(statement.grossPay),
    );
    expect(statement.contributors[0]).toMatchObject({ sellerUserId: 'seller-a', weightBps: 10_000, status: 'awaiting-split' });
    expect(statement.contributors[0].sliceBtd).toBe(statement.btdVolume);
  });

  it('splits two contributors and keeps treasury-only when none are valid', async () => {
    const pipeline = factoryExecutionPipelineSimpleSettleAssetPack();
    const base: SettleAssetPackInput = {
      assetPackOption: option,
      repository: { fullName: 'acme/app', owner: 'acme', name: 'app', branch: 'main' },
      buyerEthereumAddress: '0xBuyerWallet',
      masterEthereumAddress: '0xMasterTreasury',
      userId: 'user-1',
      paymentObservation: { network: 'ethereum-sepolia', amountSats: 12_000 },
    };
    const two = await pipeline(
      {
        ...base,
        sourceContributions: [
          { depositoryAssetPackId: 'dp-a', admissionRunId: 'adm-a', sellerUserId: 'seller-a', sellerAccount: '0xA', weightBps: 6_000 },
          { depositoryAssetPackId: 'dp-b', admissionRunId: 'adm-b', sellerUserId: 'seller-b', sellerAccount: '0xB', weightBps: 4_000 },
        ],
      },
      new Execution('test:settle:two'),
    );
    const statement = two.compensationStatement!;
    expect(statement.contributors.map((row) => row.weightBps)).toEqual([6_000, 4_000]);
    const slicePay = statement.contributors.reduce((sum, row) => sum + BigInt(row.slicePay), 0n);
    const sliceBtd = statement.contributors.reduce((sum, row) => sum + BigInt(row.sliceBtd), 0n);
    expect(BigInt(statement.protocolFee) + slicePay).toBe(BigInt(statement.grossPay));
    expect(sliceBtd).toBe(BigInt(statement.btdVolume));

    const none = await pipeline(base, new Execution('test:settle:treasury'));
    expect(none.compensationStatement!.mode).toBe('treasury-only');
    expect(none.compensationStatement!.treasuryPay).toBe(none.compensationStatement!.grossPay);
  });

  it('mint volume ignores absolutes entirely', () => {
    const withAbs = computeSettlementBtdFromRelatives({
      absolutes: [{ kind: 'functions', volume: 1, magnitude: 999, weight: 1 }],
      relatives: [{ kind: 'language-fit', volume: 0.5, weight: 1 }],
    });
    const withoutAbs = computeSettlementBtdFromRelatives({
      relatives: [{ kind: 'language-fit', volume: 0.5, weight: 1 }],
    });
    expect(withAbs.amountBaseUnits).toBe(withoutAbs.amountBaseUnits);
    expect(withAbs.evaluationFitVolume).toBe(0.5);
  });
});
