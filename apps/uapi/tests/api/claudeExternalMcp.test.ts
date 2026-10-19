/**
 * @jest-environment node
 *
 * V49 Gate 6 (C-2/C-3): Claude External end to end over the real routes —
 * metadata, dynamic registration, consent, PKCE code exchange, bearer-gated
 * remote MCP (initialize, scope-filtered tools/list, tools/call), and
 * revocation → 401.
 */

import crypto from 'node:crypto';

import { createMemoryOAuthRepository } from '../support/oauth-memory-repository';

const memory = createMemoryOAuthRepository();

// The shared test setup mocks next/server with json() only; these routes also
// redirect and construct responses, and read headers through Headers.get().
jest.mock('next/server', () => {
  class TestNextResponse {
    status: number;
    headers: { get(name: string): string | null };
    private readonly body: string | null;
    constructor(body: string | null, init: { status?: number; headers?: Record<string, string> } = {}) {
      this.body = body;
      this.status = init.status ?? 200;
      const headers = Object.fromEntries(Object.entries(init.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v]));
      this.headers = { get: (name: string) => headers[name.toLowerCase()] ?? null };
    }
    async json() {
      return this.body ? JSON.parse(this.body) : null;
    }
    async text() {
      return this.body ?? '';
    }
    static json(data: unknown, init: { status?: number; headers?: Record<string, string> } = {}) {
      return new TestNextResponse(JSON.stringify(data), { ...init, headers: { 'content-type': 'application/json', ...init.headers } });
    }
    static redirect(url: string, status = 307) {
      return new TestNextResponse(null, { status, headers: { location: url } });
    }
  }
  return { NextResponse: TestNextResponse };
});

/** Minimal fetch Request (the shared setup's polyfill lacks formData()). */
function makeRequest(url: string, init: { method?: string; headers?: Record<string, string>; body?: string | FormData } = {}) {
  const headers = Object.fromEntries(Object.entries(init.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v]));
  return {
    url,
    method: init.method ?? 'GET',
    headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
    text: async () => (typeof init.body === 'string' ? init.body : ''),
    json: async () => JSON.parse(typeof init.body === 'string' ? init.body : '{}'),
    formData: async () => init.body as FormData,
  } as unknown as Request;
}

jest.mock('@/lib/oauth/oauth-repository', () => ({
  createSupabaseOAuthRepository: () => memory.repository,
}));
jest.mock('@bitcode/supabase/ssr/server', () => ({ createClient: jest.fn() }));
jest.mock('@/app/api/read/synthesize-options/start-read-synthesis', () => ({
  startReadSynthesisForUser: jest.fn(async () => ({ status: 200, body: { ok: true, runId: '11111111-1111-4111-8111-111111111111' } })),
}));
jest.mock('@/app/api/deposit/synthesize-options/start-deposit-synthesis', () => ({
  startDepositSynthesisForUser: jest.fn(async () => ({ status: 200, body: { ok: true, runId: 'dep' } })),
}));

const settleRows = [
  {
    id: 'settle-1',
    created_at: '2026-10-19T00:00:00Z',
    context: { assetPackTitle: 'Retry pack', repositoryFullName: 'acme/app', contributorUserIds: ['seller-2'] },
    output: {
      deliveryState: 'opened',
      prUrl: 'https://github.com/acme/app/pull/7',
      compensationStatement: {
        schema: 'bitcode.settle.compensation-statement',
        mode: 'contributors',
        payAsset: 'ETH',
        grossPay: '10000',
        protocolCoinFeeBps: 500,
        protocolFee: '500',
        contributors: [
          { sellerUserId: 'seller-2', sellerAccount: '0xSecretSeller', weightBps: 10000, sliceBtd: '9', slicePay: '9500', status: 'awaiting-split' },
        ],
      },
    },
  },
];

jest.mock('@bitcode/supabase', () => {
  const chain = () => {
    const query: any = {};
    for (const method of ['select', 'eq', 'or', 'order', 'limit', 'is', 'update', 'upsert']) {
      query[method] = jest.fn(() => query);
    }
    query.maybeSingle = jest.fn(async () => ({ data: null, error: null }));
    query.then = (resolve: (value: unknown) => unknown) => resolve({ data: settleRows, error: null });
    return query;
  };
  return { supabaseAdmin: { from: jest.fn(() => chain()), auth: { admin: { getUserById: jest.fn() } } } };
});

import { createClient } from '@bitcode/supabase/ssr/server';
import { startReadSynthesisForUser } from '@/app/api/read/synthesize-options/start-read-synthesis';
import { GET as protectedResource } from '@/app/.well-known/oauth-protected-resource/[[...path]]/route';
import { GET as authorizationServer } from '@/app/.well-known/oauth-authorization-server/[[...path]]/route';
import { POST as register } from '@/app/api/oauth/register/route';
import { POST as consent } from '@/app/api/oauth/authorize/route';
import { POST as tokenRoute } from '@/app/api/oauth/token/route';
import { POST as revokeRoute } from '@/app/api/oauth/revoke/route';
import { POST as mcp, GET as mcpGet } from '@/app/api/mcp/route';

const ORIGIN = 'http://localhost';
const REDIRECT = 'https://claude.ai/api/mcp/auth_callback';

function session(userId: string | null) {
  (createClient as jest.Mock).mockResolvedValue({
    auth: { getUser: async () => ({ data: { user: userId ? { id: userId, email: 'b@bitcode.test' } : null } }) },
  });
}

async function connect(scope = 'deposits reads packs', userId = 'buyer-1') {
  const registered = await (
    await register(
      makeRequest(`${ORIGIN}/api/oauth/register`, {
        method: 'POST',
        body: JSON.stringify({ client_name: 'Claude', redirect_uris: [REDIRECT] }),
      }),
    )
  ).json();
  const verifier = crypto.randomBytes(32).toString('base64url');
  const query = new URLSearchParams({
    response_type: 'code',
    client_id: registered.client_id,
    redirect_uri: REDIRECT,
    code_challenge: crypto.createHash('sha256').update(verifier).digest('base64url'),
    code_challenge_method: 'S256',
    scope,
    state: 's1',
  });
  session(userId);
  const form = new FormData();
  form.set('query', query.toString());
  form.set('decision', 'allow');
  const approved = await consent(makeRequest(`${ORIGIN}/api/oauth/authorize`, { method: 'POST', body: form, headers: { origin: ORIGIN } }));
  expect(approved.status).toBe(303);
  const location = new URL(approved.headers.get('location')!);
  expect(location.origin + location.pathname).toBe(REDIRECT);
  expect(location.searchParams.get('state')).toBe('s1');
  const tokens = await (
    await tokenRoute(
      makeRequest(`${ORIGIN}/api/oauth/token`, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: registered.client_id,
          code: location.searchParams.get('code')!,
          code_verifier: verifier,
          redirect_uri: REDIRECT,
        }).toString(),
      }),
    )
  ).json();
  return { clientId: registered.client_id as string, tokens };
}

function rpc(accessToken: string | null, body: unknown) {
  return mcp(
    makeRequest(`${ORIGIN}/api/mcp`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
        ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify(body),
    }),
  );
}

async function callTool(accessToken: string, name: string, args: Record<string, unknown>) {
  const response = await rpc(accessToken, { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name, arguments: args } });
  const body = await response.json();
  return { ...body.result, payload: JSON.parse(body.result.content[0].text) };
}

describe('Claude External (V49 Gate 6)', () => {
  it('publishes RFC 9728 and RFC 8414 metadata', async () => {
    const resource = await (await protectedResource(makeRequest(`${ORIGIN}/.well-known/oauth-protected-resource`))).json();
    expect(resource).toEqual(
      expect.objectContaining({ resource: `${ORIGIN}/api/mcp`, authorization_servers: [ORIGIN], scopes_supported: ['deposits', 'reads', 'packs'] }),
    );
    const server = await (await authorizationServer(makeRequest(`${ORIGIN}/.well-known/oauth-authorization-server`))).json();
    expect(server).toEqual(
      expect.objectContaining({
        authorization_endpoint: `${ORIGIN}/oauth/authorize`,
        token_endpoint: `${ORIGIN}/api/oauth/token`,
        registration_endpoint: `${ORIGIN}/api/oauth/register`,
        revocation_endpoint: `${ORIGIN}/api/oauth/revoke`,
        code_challenge_methods_supported: ['S256'],
        grant_types_supported: ['authorization_code', 'refresh_token'],
      }),
    );
  });

  it('rejects MCP requests without a valid bearer token with WWW-Authenticate', async () => {
    const missing = await rpc(null, { jsonrpc: '2.0', id: 1, method: 'tools/list' });
    expect(missing.status).toBe(401);
    expect(missing.headers.get('www-authenticate')).toBe(
      `Bearer resource_metadata="${ORIGIN}/.well-known/oauth-protected-resource"`,
    );
    const bogus = await rpc('bca_nope', { jsonrpc: '2.0', id: 1, method: 'tools/list' });
    expect(bogus.status).toBe(401);
    expect(bogus.headers.get('www-authenticate')).toContain('error="invalid_token"');
    expect((await mcpGet(makeRequest(`${ORIGIN}/api/mcp`))).status).toBe(401);
  });

  it('requires the session and same origin for consent, and redirects denials', async () => {
    const registered = await (
      await register(makeRequest(`${ORIGIN}/api/oauth/register`, { method: 'POST', body: JSON.stringify({ redirect_uris: [REDIRECT] }) }))
    ).json();
    const query = new URLSearchParams({
      response_type: 'code',
      client_id: registered.client_id,
      redirect_uri: REDIRECT,
      code_challenge: 'x'.repeat(43),
      code_challenge_method: 'S256',
    });
    const form = () => {
      const data = new FormData();
      data.set('query', query.toString());
      data.set('decision', 'deny');
      return data;
    };
    session(null);
    expect((await consent(makeRequest(`${ORIGIN}/api/oauth/authorize`, { method: 'POST', body: form() }))).status).toBe(401);
    session('buyer-1');
    expect(
      (await consent(makeRequest(`${ORIGIN}/api/oauth/authorize`, { method: 'POST', body: form(), headers: { origin: 'https://evil.example' } })))
        .status,
    ).toBe(403);
    const denied = await consent(makeRequest(`${ORIGIN}/api/oauth/authorize`, { method: 'POST', body: form(), headers: { origin: ORIGIN } }));
    expect(new URL(denied.headers.get('location')!).searchParams.get('error')).toBe('access_denied');
  });

  it('serves initialize, scope-filtered tools, and dispatches read as the token user', async () => {
    const { tokens } = await connect('reads packs');
    const init = await (
      await rpc(tokens.access_token, {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'claude-ai', version: '1' } },
      })
    ).json();
    expect(init.result.serverInfo.name).toBe('bitcode');
    expect(init.result.capabilities.tools).toBeDefined();

    const notified = await rpc(tokens.access_token, { jsonrpc: '2.0', method: 'notifications/initialized' });
    expect(notified.status).toBe(202);

    const list = await (await rpc(tokens.access_token, { jsonrpc: '2.0', id: 2, method: 'tools/list' })).json();
    expect(list.result.tools.map((tool: { name: string }) => tool.name)).toEqual(['read', 'packs', 'measure', 'auxiliary']);
    expect(list.result.tools[0].inputSchema).toEqual(expect.objectContaining({ type: 'object' }));

    const read = await callTool(tokens.access_token, 'read', {
      repositoryFullName: 'acme/app',
      evaluation: 'Add retries with jitter to payment webhooks',
      benchmarkIds: ['webhook-latency'],
    });
    expect(read.isError).toBeUndefined();
    expect(read.payload).toEqual(expect.objectContaining({ runId: '11111111-1111-4111-8111-111111111111', status: 'dispatched' }));
    expect(startReadSynthesisForUser).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'buyer-1', body: expect.objectContaining({ benchmarkIds: ['webhook-latency'] }) }),
    );

    const denied = await callTool(tokens.access_token, 'deposit', { repositoryFullName: 'acme/app' });
    expect(denied.isError).toBe(true);
    expect(denied.payload.error).toContain('"deposits" scope');

    const invalid = await callTool(tokens.access_token, 'read', { repositoryFullName: 'acme/app', evaluation: 'short' });
    expect(invalid.isError).toBe(true);
  });

  it('projects owned and sold packs without other sellers\' identities', async () => {
    const buyer = await connect('packs', 'buyer-1');
    const owned = await callTool(buyer.tokens.access_token, 'packs', { view: 'owned' });
    expect(owned.payload.packs[0]).toEqual(
      expect.objectContaining({
        settleRunId: 'settle-1',
        prUrl: 'https://github.com/acme/app/pull/7',
        compensation: expect.objectContaining({ protocolCoinFeeBps: 500, contributors: [{ weightBps: 10000, status: 'awaiting-split' }] }),
      }),
    );
    expect(JSON.stringify(owned.payload)).not.toMatch(/seller-2|0xSecretSeller/);

    const seller = await connect('packs', 'seller-2');
    const sold = await callTool(seller.tokens.access_token, 'packs', { view: 'sold' });
    expect(sold.payload.packs[0].slice).toEqual(expect.objectContaining({ weightBps: 10000, slicePay: '9500', status: 'awaiting-split' }));
    expect(JSON.stringify(sold.payload)).not.toContain('0xSecretSeller');
  });

  it('revocation turns the next MCP call into 401', async () => {
    const { tokens } = await connect('packs');
    expect((await rpc(tokens.access_token, { jsonrpc: '2.0', id: 9, method: 'tools/list' })).status).toBe(200);
    const revoked = await revokeRoute(
      makeRequest(`${ORIGIN}/api/oauth/revoke`, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ token: tokens.refresh_token }).toString(),
      }),
    );
    expect(revoked.status).toBe(200);
    expect((await rpc(tokens.access_token, { jsonrpc: '2.0', id: 10, method: 'tools/list' })).status).toBe(401);
  });
});
