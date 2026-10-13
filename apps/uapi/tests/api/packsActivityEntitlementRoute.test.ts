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
