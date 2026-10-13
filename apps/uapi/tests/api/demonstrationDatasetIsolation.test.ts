/**
 * @jest-environment node
 *
 * Demonstration dataset isolation: in demonstration mode only wallet + GitHub
 * connections are real — pipeline history, recorded admissions/Need anchors,
 * and Exchange activity are demonstration data. Live mode never shows
 * demonstration rows.
 */

jest.mock('@bitcode/supabase/ssr/server', () => ({ createClient: jest.fn() }));
jest.mock('@bitcode/supabase', () => ({ supabaseAdmin: { from: jest.fn() } }));
jest.mock('@/app/api/activity/route', () => ({
  GET: jest.fn(async () => ({ ok: true, status: 200, json: async () => ({ ok: true, records: [] }) })),
}));

import { createClient } from '@bitcode/supabase/ssr/server';
import { supabaseAdmin } from '@bitcode/supabase';
import { GET as getHistory, POST as postHistory } from '@/app/api/executions/history/route';
import { GET as getPackActivity } from '@/app/api/packs/activity/route';

const mockFrom = supabaseAdmin.from as jest.Mock;

const liveRow = {
  id: 'live-run',
  user_id: 'user-1',
  created_at: '2026-10-01T00:00:00Z',
  status: 'completed',
  type: 'agentic-execution:asset-pack',
  context: { source: 'deposit-option-synthesis', repositoryFullName: 'real/repo' },
  output: {},
};
const demoRow = {
  ...liveRow,
  id: 'demo-run',
  context: { ...liveRow.context, dataset: 'demonstration' },
};

/** Executions chain that records filters and returns rows honoring the dataset eq. */
function installExecutions(rows: Array<Record<string, unknown>>) {
  const filters: Array<[string, unknown]> = [];
  const insert = jest.fn((row: Record<string, unknown>) => ({
    select: () => ({ single: async () => ({ data: { id: 'new-row', ...row }, error: null }) }),
  }));
  mockFrom.mockImplementation(() => {
    const chain: any = {
      select: () => chain,
      eq: (column: string, value: unknown) => {
        filters.push([column, value]);
        return chain;
      },
      in: () => chain,
      or: () => chain,
      order: () => chain,
      insert,
      limit: async () => ({ data: resolve(), error: null }),
      then: (onFulfilled: (value: unknown) => unknown) =>
        Promise.resolve({ data: resolve(), error: null }).then(onFulfilled),
    };
    return chain;
  });
  function resolve() {
    const datasetFilter = filters.find(([column]) => column === 'context->>dataset');
    return datasetFilter
      ? rows.filter((row) => (row.context as Record<string, unknown>)?.dataset === datasetFilter[1])
      : rows;
  }
  return { filters, insert };
}

function signedIn() {
  (createClient as jest.Mock).mockResolvedValue({
    auth: { getUser: async () => ({ data: { user: { id: 'user-1' } }, error: null }) },
  });
}

describe('demonstration dataset isolation', () => {
  const env = process.env;
  afterEach(() => {
    process.env = env;
    jest.clearAllMocks();
  });

  it('demonstration mode lists only demonstration pipeline runs', async () => {
    process.env = { ...env, BITCODE_DEMONSTRATION_MODE: '1' };
    signedIn();
    installExecutions([liveRow, demoRow]);
    const response = await getHistory(new Request('http://localhost/api/executions/history'));
    const rows = await response.json();
    expect(rows.map((row: { id: string }) => row.id)).toEqual(['demo-run']);
  });

  it('live mode never lists demonstration pipeline runs', async () => {
    process.env = { ...env, BITCODE_DEMONSTRATION_MODE: '0' };
    signedIn();
    installExecutions([liveRow, demoRow]);
    const response = await getHistory(new Request('http://localhost/api/executions/history'));
    const rows = await response.json();
    expect(rows.map((row: { id: string }) => row.id)).toEqual(['live-run']);
  });

  it('recorded admissions / Need anchors join the demonstration dataset', async () => {
    process.env = { ...env, BITCODE_DEMONSTRATION_MODE: '1' };
    signedIn();
    const { insert } = installExecutions([]);
    await postHistory(
      new Request('http://localhost/api/executions/history', {
        method: 'POST',
        body: JSON.stringify({ type: 'pipeline:deposit-option-admission', context: { source: 'deposit-option-review-admission' } }),
      }),
    );
    expect(insert.mock.calls[0][0].context).toEqual(
      expect.objectContaining({ source: 'deposit-option-review-admission', dataset: 'demonstration' }),
    );
  });

  it('Exchange shows demonstration network supply, never real admitted rows', async () => {
    process.env = { ...env, BITCODE_DEMONSTRATION_MODE: '1' };
    signedIn();
    const realAdmission = {
      ...liveRow,
      id: 'real-admission',
      context: { source: 'deposit-option-review-admission', admissionState: 'admitted-to-depository', assetPackTitle: 'Real pack' },
    };
    installExecutions([realAdmission]);
    const response = await getPackActivity(new Request('http://localhost/api/packs/activity?limit=50'));
    const payload = await response.json();
    const ids = payload.records.map((record: { id: string }) => record.id);
    expect(ids).not.toContain('real-admission');
    expect(ids.filter((id: string) => id.startsWith('demonstration-network-supply-')).length).toBeGreaterThanOrEqual(6);
  });
});
