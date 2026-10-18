import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { toSoldDataPack } from '@/components/deposits/DepositSoldDataPacks/hooks/use-deposit-sold-data-packs';
import { toOwnedDataPack } from '@/components/reads/ReadsOwnedDataPacks/hooks/use-reads-owned-data-packs';
import { ReadsOwnedDataPacks } from '@/components/reads/ReadsOwnedDataPacks/ReadsOwnedDataPacks';

const statement = {
  schema: 'bitcode.settle.compensation-statement',
  mode: 'contributors',
  payAsset: 'ETH',
  protocolCoinFeeBps: 500,
  contributors: [
    { depositoryAssetPackId: 'dp-a', weightBps: 6_000, status: 'finalized' },
    { depositoryAssetPackId: 'dp-b', weightBps: 4_000, status: 'awaiting-split', viewerIsContributor: true },
  ],
};

describe('settlement viewers (V49 S-5)', () => {
  it('sold viewer shows the seller slice of a multi-contributor settle', () => {
    const pack = toSoldDataPack({
      id: 'settle-1',
      type: 'settled-assetpack',
      assetPackTitle: 'Retry pack',
      metadata: {
        viewerIsSeller: true,
        compensationStatement: statement,
        viewerContributorSlice: { weightBps: 4_000, sliceBtd: '4000', slicePay: '3800', status: 'awaiting-split' },
      },
    });
    expect(pack).toEqual(
      expect.objectContaining({ weightBps: 4_000, btdVolume: '4000', slicePay: '3800', protocolCoinFeeBps: 500, payoutState: 'pending-seller-review' }),
    );
    expect(toSoldDataPack({ id: 'x', type: 'settled-assetpack', metadata: { viewerIsSeller: false } })).toBeNull();
  });

  it('owned viewer reads delivery, payment, and compensation summary', () => {
    const pack = toOwnedDataPack({
      id: 'settle-1',
      type: 'settled-assetpack',
      assetPackTitle: 'Retry pack',
      metadata: {
        viewerIsBuyer: true,
        compensationStatement: statement,
        output: { deliveryState: 'opened', prUrl: 'https://github.com/a/b/pull/3', paymentExplorerUrl: 'https://sepolia.etherscan.io/tx/0x1' },
        context: { repositoryFullName: 'a/b' },
      },
    });
    expect(pack).toEqual(
      expect.objectContaining({ deliveryState: 'opened', prUrl: 'https://github.com/a/b/pull/3', contributorCount: 2, protocolCoinFeeBps: 500, repository: 'a/b' }),
    );
  });

  it('offers Redeliver for a projected delivery and calls the redeliver route', async () => {
    const fetchMock = jest.fn(async (url: string) => {
      if (url.startsWith('/api/packs/activity')) {
        return {
          ok: true,
          json: async () => ({
            ok: true,
            records: [
              {
                id: 'settle-9',
                type: 'settled-assetpack',
                assetPackTitle: 'Webhook pack',
                metadata: { viewerIsBuyer: true, output: { deliveryState: 'projected' }, context: {} },
              },
            ],
          }),
        };
      }
      return { ok: true, json: async () => ({ ok: true, deliveryState: 'opened' }) };
    });
    (global as unknown as { fetch: unknown }).fetch = fetchMock;
    render(<ReadsOwnedDataPacks />);
    const button = await screen.findByTestId('reads-owned-data-pack-redeliver');
    fireEvent.click(button);
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/read/settle/redeliver',
        expect.objectContaining({ method: 'POST', body: JSON.stringify({ settleRunId: 'settle-9' }) }),
      ),
    );
  });
});
