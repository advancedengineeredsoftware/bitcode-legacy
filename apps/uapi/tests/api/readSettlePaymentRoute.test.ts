/**
 * @jest-environment node
 *
 * POST /api/read/settle — live testnet payment law + seller linkage.
 * Server prices the selection, verifies the buyer's txid on-chain against the
 * rail recipient + total, guards replay, and carries supply provenance
 * (sellerUserId → seller payout account) onto every 1:1 settle run.
 */

jest.mock('@bitcode/supabase/ssr/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('@bitcode/supabase', () => ({
  supabaseAdmin: { from: jest.fn() },
}));

jest.mock('@bitcode/asset-packs-pipelines-syntheses-domain', () => ({
  storeCrossPhaseArtifact: jest.fn(),
}));

jest.mock('@bitcode/btd/erc1155', () => {
  const actual = jest.requireActual('@bitcode/btd/erc1155');
  return { ...actual, verifyEthereumSepoliaPayment: jest.fn() };
});

jest.mock('@bitcode/asset-packs-pipelines-execution-pipeline-simple-settle-asset-pack', () => {
  const actual = jest.requireActual(
    '@bitcode/asset-packs-pipelines-execution-pipeline-simple-settle-asset-pack',
  );
  return {
    ...actual,
    runExecutionPipelineSimpleSettleAssetPack: jest.fn(async () => ({
      ok: true,
      summary: 'Mock settle.',
      packActivity: { deliveryState: 'opened', prUrl: 'https://github.com/r/p/pull/7', measurements: [] },
      shippable: { schema: 's', deliveryMechanism: 'pull_request', repository: {}, patchCount: 1, prUrl: 'https://github.com/r/p/pull/7', status: 'opened', note: 'ok' },
      mintBtd: null,
      settleBtd: null,
      settleAssetPack: null,
      pendingPayout: { schema: 'bitcode.settle.pending-payout', status: 'pending-seller-review' },
    })),
  };
});

import { createClient } from '@bitcode/supabase/ssr/server';
import { supabaseAdmin } from '@bitcode/supabase';
import { verifyEthereumSepoliaPayment } from '@bitcode/btd/erc1155';
import { runExecutionPipelineSimpleSettleAssetPack } from '@bitcode/asset-packs-pipelines-execution-pipeline-simple-settle-asset-pack';
import { POST } from '@/app/api/read/settle/route';
import { quoteReadSettlementSelection } from '@/lib/read-settlement-checkout';

const mockFrom = supabaseAdmin.from as jest.Mock;
const mockVerify = verifyEthereumSepoliaPayment as jest.Mock;
const mockPipeline = runExecutionPipelineSimpleSettleAssetPack as jest.Mock;
const TREASURY = '0x1111111111111111111111111111111111111111';
const SELLER_WALLET = '0x2222222222222222222222222222222222222222';
const TX = `0x${'c'.repeat(64)}`;

function fullOption() {
  return {
    title: 'Idempotent webhook ingestion with HMAC verification',
    summary: 'Exactly-once webhook ingest.',
    kind: 'implementation-pattern',
    confidence: 0.82,
    needFit: 0.8,
    patch: { patchSummary: 'Adds webhooks module.', fileChanges: [{ path: 'src/webhooks/a.ts', op: 'create', content: 'export {}\n' }] },
    measurements: {
      needinesses: [
        { measurementKind: 'language-fit', volume: 0.94, weight: 0.35 },
        { measurementKind: 'domain-fit', volume: 0.84, weight: 0.35 },
        { measurementKind: 'interface-fit', volume: 0.84, weight: 0.3 },
      ],
      absolutes: [{ measurementKind: 'secret-safety', volume: 0.95, status: 'estimated', weight: 0.0162 }],
    },
    supplyProvenance: { admissionRunId: 'admit-1', sellerUserId: 'seller-1', depositoryAssetPackId: 'dp-1' },
  };
}

function installTables(options: { paymentUsed?: boolean } = {}) {
  const insert = jest.fn(async () => ({ error: null }));
  mockFrom.mockImplementation((table: string) => {
    if (table === 'executions') {
      const chain: any = {
        eq: () => chain,
        in: () => chain,
        limit: async () => ({ data: options.paymentUsed ? [{ id: 'prior' }] : [], error: null }),
        maybeSingle: async () => ({
          data: {
            id: 'synth-1',
            user_id: 'buyer-1',
            output: { fullOptions: [fullOption()] },
            // Demonstration-mode synthesis runs belong to the demonstration dataset.
            context: {
              repositoryFullName: 'acme/payments',
              sourceBranch: 'main',
              sourceCommit: 'a'.repeat(40),
              dataset: 'demonstration',
            },
          },
          error: null,
        }),
      };
      return {
        select: () => chain,
        insert,
        update: () => ({ eq: () => ({ eq: async () => ({ error: null }) }) }),
      };
    }
    if (table === 'user_profiles') {
      // Canonical wallet binding lives in settings.bitcodeProfile.walletBinding.
      const sellerProfile = {
        id: 'seller-1',
        settings: {
          bitcodeProfile: {
            walletBinding: { address: SELLER_WALLET, provider: 'metamask', status: 'verified' },
          },
        },
      };
      return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: sellerProfile }) }) }) };
    }
    // user_connections → no GitHub token (projected ship is fine here).
    const chain: any = { eq: () => chain, maybeSingle: async () => ({ data: null, error: null }) };
    return { select: () => chain };
  });
  return { insert };
}

function settleRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/read/settle', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ synthesisRunId: 'synth-1', selectedIndexes: [0], payAsset: 'ETH', ...body }),
  });
}

describe('POST /api/read/settle — testnet payment + seller linkage', () => {
  const env = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...env, BITCODE_SETTLEMENT_ETH_RECIPIENT: TREASURY, BITCODE_DEMONSTRATION_MODE: '1' };
    (createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: 'buyer-1' } }, error: null }) },
    });
  });

  afterAll(() => {
    process.env = env;
  });

  it('requires a payment in demonstration mode', async () => {
    installTables();
    const response = await POST(settleRequest({}));
    expect(response.status).toBe(402);
    await expect(response.json()).resolves.toEqual(expect.objectContaining({ code: 'payment_required' }));
    expect(mockPipeline).not.toHaveBeenCalled();
  });

  it('verifies the payment for the server-priced total and links the seller', async () => {
    const { insert } = installTables();
    const expected = quoteReadSettlementSelection([{ index: 0, option: fullOption() as never }]);
    const ethTotal = expected.totals.find((rail) => rail.payAsset === 'ETH')!.payAmount;
    mockVerify.mockResolvedValue({
      schema: 'bitcode.settle.pay-rail-verification',
      ok: true,
      confirmed: false,
      blockTime: null,
      paidAmount: ethTotal,
      requiredAmount: ethTotal,
      explorerUrl: `https://sepolia.etherscan.io/tx/${TX}`,
      reason: null,
    });

    const response = await POST(settleRequest({ txId: TX }));
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.payment).toEqual(expect.objectContaining({ txId: TX, payAsset: 'ETH' }));
    expect(payload.results[0].shippable.prUrl).toBe('https://github.com/r/p/pull/7');

    expect(mockVerify).toHaveBeenCalledWith(
      expect.objectContaining({ txHash: TX, recipientAddress: TREASURY, requiredWei: BigInt(ethTotal) }),
    );
    const inserted = (insert.mock.calls[0] as unknown[])[0] as { context: Record<string, unknown> };
    expect(inserted.context).toEqual(
      expect.objectContaining({
        paymentTxId: TX,
        sellerUserId: 'seller-1',
        supplyAdmissionRunId: 'admit-1',
        dataset: 'demonstration',
      }),
    );
    const pipelineInput = mockPipeline.mock.calls[0][0];
    expect(pipelineInput.depositorEthereumAddress).toBe(SELLER_WALLET);
    expect(pipelineInput.repository).toEqual(
      expect.objectContaining({ fullName: 'acme/payments', branch: 'main', commit: 'a'.repeat(40) }),
    );
    expect(pipelineInput.paymentObservation).toEqual(
      expect.objectContaining({
        txId: TX,
        payAsset: 'ETH',
        allocatedPayAmount: ethTotal,
        verification: expect.objectContaining({ ok: true }),
      }),
    );
  });

  it('fails closed when the chain does not show a covering payment', async () => {
    installTables();
    mockVerify.mockResolvedValue({ ok: false, reason: 'insufficient-amount', confirmed: false });
    const response = await POST(settleRequest({ txId: TX }));
    expect(response.status).toBe(402);
    await expect(response.json()).resolves.toEqual(expect.objectContaining({ code: 'payment_unverified' }));
    expect(mockPipeline).not.toHaveBeenCalled();
  });

  it('rejects a payment that already backed a checkout', async () => {
    installTables({ paymentUsed: true });
    const response = await POST(settleRequest({ txId: TX }));
    expect(response.status).toBe(409);
    expect(mockVerify).not.toHaveBeenCalled();
  });

  it('refuses a rail with no configured settlement recipient', async () => {
    installTables();
    const response = await POST(settleRequest({ txId: 'd'.repeat(64), payAsset: 'BTC' }));
    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual(expect.objectContaining({ code: 'pay_rail_unconfigured' }));
  });
});
