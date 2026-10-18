/**
 * @jest-environment node
 *
 * V49 S-6: POST /api/read/settle/redeliver — buyer-only, idempotent PR
 * redelivery for projected / failed settle deliveries.
 */

jest.mock('@bitcode/supabase/ssr/server', () => ({ createClient: jest.fn() }));
jest.mock('@bitcode/supabase', () => ({ supabaseAdmin: { from: jest.fn() } }));
jest.mock('@bitcode/asset-packs-pipelines-execution-pipeline-simple-settle-asset-pack', () => ({
  redeliverSettledAssetPackPatchPr: jest.fn(),
}));
jest.mock('@/lib/github-repository-rest', () => ({
  resolveGitHubAccessTokenForUser: jest.fn(async () => 'gh-token'),
  resolveGitHubCommitSha: jest.fn(async () => 'b'.repeat(40)),
}));

import { createClient } from '@bitcode/supabase/ssr/server';
import { supabaseAdmin } from '@bitcode/supabase';
import { redeliverSettledAssetPackPatchPr } from '@bitcode/asset-packs-pipelines-execution-pipeline-simple-settle-asset-pack';
import { POST } from '@/app/api/read/settle/redeliver/route';

const mockFrom = supabaseAdmin.from as jest.Mock;
const mockRedeliver = redeliverSettledAssetPackPatchPr as jest.Mock;

function viewer(id: string) {
  (createClient as jest.Mock).mockResolvedValue({ auth: { getUser: async () => ({ data: { user: { id } } }) } });
}

function settleRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'settle-1',
    user_id: 'buyer-1',
    status: 'completed',
    output: {
      deliveryState: 'projected',
      shippable: { status: 'projected', repository: { fullName: 'acme/app', branch: 'main', commit: null } },
      entitledPatch: { title: 'Retry pack', patch: { patchSummary: 'retry', fileChanges: [{ path: 'src/r.ts', op: 'create' }] } },
    },
    context: { source: 'read-settle-asset-pack', repositoryFullName: 'acme/app', paymentTxId: '0xabc' },
    ...overrides,
  };
}

function installRow(row: Record<string, unknown>, update = jest.fn(() => ({ eq: async () => ({ error: null }) }))) {
  mockFrom.mockImplementation(() => {
    const chain: any = { select: () => chain, eq: () => chain, maybeSingle: async () => ({ data: row, error: null }), update };
    return chain;
  });
  return update;
}

function post(body: unknown) {
  return POST(new Request('http://localhost/api/read/settle/redeliver', { method: 'POST', body: JSON.stringify(body) }));
}

describe('POST /api/read/settle/redeliver (V49 S-6)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('is buyer-only', async () => {
    viewer('stranger');
    installRow(settleRow());
    const response = await post({ settleRunId: 'settle-1' });
    expect(response.status).toBe(404);
    expect(mockRedeliver).not.toHaveBeenCalled();
  });

  it('returns an already-opened delivery unchanged (idempotent)', async () => {
    viewer('buyer-1');
    installRow(settleRow({ output: { ...settleRow().output, deliveryState: 'opened', prUrl: 'https://github.com/acme/app/pull/1' } }));
    const response = await post({ settleRunId: 'settle-1' });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(expect.objectContaining({ alreadyDelivered: true, prUrl: 'https://github.com/acme/app/pull/1' }));
    expect(mockRedeliver).not.toHaveBeenCalled();
  });

  it('re-ships a projected delivery from the request SHA and records the attempt', async () => {
    viewer('buyer-1');
    const update = installRow(settleRow());
    mockRedeliver.mockResolvedValue({ status: 'opened', prUrl: 'https://github.com/acme/app/pull/2', prError: null });
    const response = await post({ settleRunId: 'settle-1' });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(expect.objectContaining({ ok: true, deliveryState: 'opened', prUrl: 'https://github.com/acme/app/pull/2' }));
    expect(mockRedeliver).toHaveBeenCalledWith(
      expect.objectContaining({
        repository: expect.objectContaining({ fullName: 'acme/app', commit: 'b'.repeat(40) }),
        githubAccessToken: 'gh-token',
      }),
      expect.anything(),
    );
    const persisted = (update.mock.calls[0] as unknown[])[0] as { output: { redeliveries: unknown[] }; context: Record<string, unknown> };
    expect(persisted.output.redeliveries).toHaveLength(1);
    expect(persisted.context.buyerState).toBe('repository-delivery-redelivered');
  });
});
