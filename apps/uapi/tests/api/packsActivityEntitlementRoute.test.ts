/**
 * @jest-environment node
 *
 * GET /api/packs/activity — settled DataPack viewer entitlement (V48 G4-6).
 * Entitled patch material only for the buyer (settle-row owner) and the
 * linked seller; payout finalize only for the seller; the seller's "My" lens
 * includes DataPacks they sold.
 */

jest.mock('@/app/api/activity/route', () => ({
  GET: jest.fn(async () => ({ ok: true, status: 200, json: async () => ({ ok: true, records: [] }) })),
}));

jest.mock('@bitcode/supabase/ssr/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('@bitcode/supabase', () => ({
  supabaseAdmin: { from: jest.fn() },
}));

import { createClient } from '@bitcode/supabase/ssr/server';
import { supabaseAdmin } from '@bitcode/supabase';
import { GET } from '@/app/api/packs/activity/route';

const mockFrom = supabaseAdmin.from as jest.Mock;

const settledRow = {
  id: 'settle-1',
  user_id: 'buyer-1',
  created_at: '2026-10-12T12:00:00.000Z',
  status: 'completed',
  type: 'agentic-execution:asset-pack',
  output: {
    assetPackTitle: 'Hash-chained audit log',
    pendingPayout: {
      schema: 'bitcode.settle.pending-payout',
      status: 'pending-seller-review',
      sellerUserId: 'seller-1',
      btdVolume: '800000000000000000',
      payAsset: 'ETH',
    },
    entitledPatch: { schema: 'bitcode.packs.entitled-asset-pack-delivery', title: 'Hash-chained audit log' },
  },
  context: {
    source: 'read-settle-asset-pack',
    settlementState: 'settled',
    sellerUserId: 'seller-1',
    assetPackTitle: 'Hash-chained audit log',
  },
};

/** Executions chain: settled-delivery queries return the row; others empty. */
function installExecutions() {
  mockFrom.mockImplementation(() => {
    const filters: Array<[string, unknown]> = [];
    const chain: any = {
      select: () => chain,
      eq: (column: string, value: unknown) => {
        filters.push([column, value]);
        return chain;
      },
      // V49 S-5 seller lens: `sellerUserId.eq.X,contributorUserIds.cs.[X]`.
      or: (expression: string) => {
        const seller = /context->>sellerUserId\.eq\.([^,]+)/u.exec(expression)?.[1];
        if (seller) filters.push(['context->>sellerUserId', seller]);
        return chain;
      },
      order: () => chain,
      limit: async () => {
        const settled = filters.some(([c, v]) => c === 'context->>source' && v === 'read-settle-asset-pack');
        const sellerFilter = filters.find(([c]) => c === 'context->>sellerUserId');
        const matches = settled && (!sellerFilter || sellerFilter[1] === settledRow.context.sellerUserId);
        return { data: matches ? [settledRow] : [], error: null };
      },
    };
    return chain;
  });
}

function viewer(id: string | null) {
  (createClient as jest.Mock).mockResolvedValue({
    auth: { getUser: async () => ({ data: { user: id ? { id } : null } }) },
  });
}

async function settledRecord(url: string) {
  const response = await GET(new Request(url));
  expect(response.status).toBe(200);
  const payload = await response.json();
  return (payload.records as Array<{ id: string; metadata: Record<string, unknown> }>).find(
    (record) => record.id === 'settle-1',
  );
}

describe('GET /api/packs/activity — settled viewer entitlement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    installExecutions();
  });

  it('strips entitled material for viewers who are neither buyer nor seller', async () => {
    viewer('stranger-1');
    const record = await settledRecord('http://localhost/api/packs/activity');
    expect(record).toBeTruthy();
    expect(record!.metadata.entitledPatch).toBeUndefined();
    expect(record!.metadata).toEqual(
      expect.objectContaining({ viewerIsBuyer: false, viewerIsSeller: false, viewerCanFinalizePayout: false }),
    );
  });

  it('keeps entitled material for the buyer but reserves finalize for the seller', async () => {
    viewer('buyer-1');
    const record = await settledRecord('http://localhost/api/packs/activity');
    expect(record!.metadata.entitledPatch).toBeTruthy();
    expect(record!.metadata).toEqual(
      expect.objectContaining({ viewerIsBuyer: true, viewerIsSeller: false, viewerCanFinalizePayout: false }),
    );
  });

  it("includes sold DataPacks in the seller's deposited-settled lens with finalize rights", async () => {
    viewer('seller-1');
    const record = await settledRecord('http://localhost/api/packs/activity?type=my-deposited-settled');
    expect(record).toBeTruthy();
    expect(record!.metadata).toEqual(
      expect.objectContaining({ viewerIsSeller: true, viewerCanFinalizePayout: true }),
    );
    expect(record!.metadata.entitledPatch).toBeTruthy();
  });

  it('keeps sold rows out of the seller-only buyer lens', async () => {
    viewer('seller-1');
    const record = await settledRecord('http://localhost/api/packs/activity?type=my-read-bought');
    expect(record).toBeUndefined();
  });
});

describe('GET /api/packs/activity — V49 multi-contributor projection (S-5)', () => {
  const { buildContributorCompensation } = jest.requireActual('@bitcode/btd/erc1155');
  const original = { output: { ...settledRow.output }, context: { ...settledRow.context } };

  beforeEach(() => {
    jest.clearAllMocks();
    installExecutions();
    (settledRow.output as Record<string, unknown>).compensationStatement = buildContributorCompensation({
      readId: 'read-1',
      assetPackId: 'ap-1',
      payAsset: 'ETH',
      grossPay: 10_000n,
      btdVolume: 10_000n,
      protocolCoinFeeBps: 500,
      contributions: [
        { depositoryAssetPackId: 'dp-a', admissionRunId: 'adm-a', sellerUserId: 'seller-1', sellerAccount: '0xa', weightBps: 6_000 },
        { depositoryAssetPackId: 'dp-b', admissionRunId: 'adm-b', sellerUserId: 'seller-2', sellerAccount: '0xb', weightBps: 4_000 },
      ],
    });
    (settledRow.context as Record<string, unknown>).contributorUserIds = ['seller-1', 'seller-2'];
  });

  afterAll(() => {
    settledRow.output = original.output as typeof settledRow.output;
    settledRow.context = original.context as typeof settledRow.context;
  });

  it('lets each contributor see and finalize only their own slice', async () => {
    viewer('seller-2');
    const record = await settledRecord('http://localhost/api/packs/activity');
    expect(record!.metadata).toEqual(expect.objectContaining({ viewerIsSeller: true, viewerCanFinalizePayout: true }));
    expect(record!.metadata.viewerContributorSlice).toEqual(
      expect.objectContaining({ weightBps: 4_000, status: 'awaiting-split' }),
    );
    const contributors = (record!.metadata.compensationStatement as { contributors: Array<Record<string, unknown>> }).contributors;
    expect(contributors).toEqual([
      expect.objectContaining({ depositoryAssetPackId: 'dp-a', viewerIsContributor: false }),
      expect.objectContaining({ depositoryAssetPackId: 'dp-b', viewerIsContributor: true, sliceBtd: expect.any(String) }),
    ]);
    expect(contributors[0]).not.toHaveProperty('sliceBtd');
    // Other contributors' payout accounts and admission runs never reach this viewer.
    const serialized = JSON.stringify(record!.metadata);
    expect(serialized).not.toContain('"0xa"');
    expect(serialized).not.toContain('adm-a');
    expect(serialized).not.toContain('contributorUserIds');
  });

  it('shows strangers totals and weights only', async () => {
    viewer('stranger-1');
    const record = await settledRecord('http://localhost/api/packs/activity');
    expect(record!.metadata).toEqual(expect.objectContaining({ viewerIsSeller: false, viewerCanFinalizePayout: false }));
    const statement = record!.metadata.compensationStatement as { protocolFee: string; contributors: Array<Record<string, unknown>> };
    expect(statement.protocolFee).toBe('500');
    expect(statement.contributors.every((row) => !('sliceBtd' in row) && !('sellerUserId' in row))).toBe(true);
  });
});
