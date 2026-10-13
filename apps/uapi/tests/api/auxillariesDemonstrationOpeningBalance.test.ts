/**
 * @jest-environment node
 *
 * GET /api/auxillaries/data — in demonstration mode the configured presenter
 * account (by bound wallet) starts with the opening BTD balance; other
 * accounts do not. Projected settle holdings still add on top.
 */

jest.mock('@bitcode/supabase/ssr/server', () => ({ createClient: jest.fn() }));
jest.mock('@bitcode/supabase', () => ({ supabaseAdmin: { from: jest.fn() } }));
jest.mock('@/app/api/wallet/_shared', () => ({
  readBitcodeWalletConnectionStatus: jest.fn(async () => null),
}));
jest.mock('@/app/api/vcs/_shared', () => ({
  buildDisconnectedConnectionStatus: jest.fn(() => ({ connected: false })),
  buildStoredConnectionStatus: jest.fn(() => ({ connected: true })),
  getStoredConnection: jest.fn(async () => ({ manager: null, connection: null })),
  listBitcodeRepositoriesForConnection: jest.fn(async () => ({ repositories: [], inventorySource: null })),
  validateStoredConnection: jest.fn(async () => false),
}));

import { createClient } from '@bitcode/supabase/ssr/server';
import { supabaseAdmin } from '@bitcode/supabase';
import { GET } from '@/app/api/auxillaries/data/route';

const DEMO_ADDRESS = '0xCC9d9412FA5D24CE9D9af0a1BF8E6401177092DE';

/** Chainable query builder resolving every terminal to `result`. */
function builder(result: { data: unknown; error: null }) {
  const chain: any = {};
  for (const method of ['select', 'eq', 'in', 'order', 'limit']) {
    chain[method] = jest.fn(() => chain);
  }
  chain.maybeSingle = jest.fn(async () => result);
  chain.single = jest.fn(async () => result);
  chain.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return chain;
}

function signedInWithWallet(address: string) {
  const profile = {
    id: 'user-1',
    onboarded_steps: '["profile","wallet","externals","interfaces"]',
    settings: { bitcodeProfile: { walletBinding: { address, provider: 'metamask', status: 'verified' } } },
  };
  (createClient as jest.Mock).mockResolvedValue({
    auth: { getUser: async () => ({ data: { user: { id: 'user-1' } }, error: null }) },
    from: jest.fn((table: string) =>
      builder(
        table === 'user_profiles'
          ? { data: profile, error: null }
          : table === 'notifications'
            ? { data: [], error: null }
            : { data: null, error: null },
      ),
    ),
  });
  // Projected holdings + ownership events: no settle activity yet.
  (supabaseAdmin.from as jest.Mock).mockImplementation(() => builder({ data: [], error: null }));
}

async function btdBalance() {
  const response = await GET(new Request('http://localhost/api/auxillaries/data'));
  expect(response.status).toBe(200);
  return (await response.json()).btdBalance;
}

describe('GET /api/auxillaries/data — demonstration opening balance', () => {
  const env = process.env;
  beforeEach(() => {
    process.env = {
      ...env,
      BITCODE_DEMONSTRATION_MODE: '1',
      BITCODE_DEMONSTRATION_ACCOUNT_ADDRESS: DEMO_ADDRESS,
      BITCODE_DEMONSTRATION_OPENING_BTD: '1000',
    };
  });
  afterAll(() => {
    process.env = env;
  });

  it('credits the presenter account its opening BTD', async () => {
    signedInWithWallet(DEMO_ADDRESS.toLowerCase());
    expect(await btdBalance()).toBe(1000);
  });

  it('gives other accounts no opening balance', async () => {
    signedInWithWallet('0x1111111111111111111111111111111111111111');
    expect(await btdBalance()).toBe(0);
  });

  it('gives no opening balance outside demonstration mode', async () => {
    process.env.BITCODE_DEMONSTRATION_MODE = '0';
    signedInWithWallet(DEMO_ADDRESS);
    expect(await btdBalance()).toBe(0);
  });
});
