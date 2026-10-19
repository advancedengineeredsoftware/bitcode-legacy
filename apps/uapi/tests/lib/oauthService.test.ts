/**
 * @jest-environment node
 *
 * V49 Gate 6 (C-3): OAuth 2.1 authorization server rules — registration,
 * PKCE S256, single-use codes, refresh rotation with reuse detection,
 * revocation, scopes, grants, and the Claude External connection row.
 */

import crypto from 'node:crypto';

import { hashOAuthSecret, pkceChallengeS256, verifyPkceS256 } from '@/lib/oauth/oauth-crypto';
import { createOAuthService, isAllowedRedirectUri, OAuthError, parseScopes } from '@/lib/oauth/oauth-service';
import { createMemoryOAuthRepository } from '../support/oauth-memory-repository';

const REDIRECT = 'https://claude.ai/api/mcp/auth_callback';

function setup(start = Date.parse('2026-10-19T00:00:00Z')) {
  let clock = start;
  const memory = createMemoryOAuthRepository();
  const service = createOAuthService(memory.repository, { now: () => clock });
  return { memory, service, advance: (ms: number) => (clock += ms) };
}

async function authorize(service: ReturnType<typeof setup>['service'], clientId: string, scope = 'deposits reads packs') {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: REDIRECT,
    code_challenge: pkceChallengeS256(verifier),
    code_challenge_method: 'S256',
    scope,
    state: 'xyz',
  });
  const request = await service.validateAuthorizeRequest(params);
  const location = new URL(await service.approve('user-1', request));
  return { verifier, code: location.searchParams.get('code')!, location };
}

async function expectOAuthError(promise: Promise<unknown>, error: string) {
  await expect(promise).rejects.toBeInstanceOf(OAuthError);
  await expect(promise).rejects.toMatchObject({ error });
}

describe('OAuth primitives', () => {
  it('verifies PKCE S256 and rejects malformed verifiers', () => {
    const verifier = 'a'.repeat(43);
    expect(verifyPkceS256(verifier, pkceChallengeS256(verifier))).toBe(true);
    expect(verifyPkceS256('b'.repeat(43), pkceChallengeS256(verifier))).toBe(false);
    expect(verifyPkceS256('short', pkceChallengeS256('short'))).toBe(false);
  });

  it('allows https and loopback redirects only', () => {
    expect(isAllowedRedirectUri(REDIRECT)).toBe(true);
    expect(isAllowedRedirectUri('http://localhost:53682/callback')).toBe(true);
    expect(isAllowedRedirectUri('http://evil.example/callback')).toBe(false);
    expect(isAllowedRedirectUri('javascript:alert(1)')).toBe(false);
  });

  it('parses scopes, defaulting to all and rejecting unknown', () => {
    expect(parseScopes(null)).toEqual(['deposits', 'reads', 'packs']);
    expect(parseScopes('packs reads')).toEqual(['reads', 'packs']);
    expect(() => parseScopes('admin')).toThrow(OAuthError);
  });
});

describe('OAuth service (V49 C-3)', () => {
  it('registers public clients and rejects unsafe redirect URIs', async () => {
    const { service, memory } = setup();
    const client = await service.registerClient({ client_name: 'Claude', redirect_uris: [REDIRECT] });
    expect(client).toEqual(
      expect.objectContaining({ client_name: 'Claude', token_endpoint_auth_method: 'none', redirect_uris: [REDIRECT] }),
    );
    expect(memory.clients.has(client.client_id)).toBe(true);
    await expectOAuthError(service.registerClient({ redirect_uris: ['http://evil.example/cb'] }), 'invalid_redirect_uri');
    await expectOAuthError(service.registerClient({ redirect_uris: [] }), 'invalid_redirect_uri');
  });

  it('requires PKCE S256 and a registered redirect URI at authorize', async () => {
    const { service } = setup();
    const { client_id } = await service.registerClient({ client_name: 'Claude', redirect_uris: [REDIRECT] });
    const base = { response_type: 'code', client_id, redirect_uri: REDIRECT };
    await expectOAuthError(service.validateAuthorizeRequest(new URLSearchParams(base)), 'invalid_request');
    await expectOAuthError(
      service.validateAuthorizeRequest(
        new URLSearchParams({ ...base, code_challenge: 'x'.repeat(43), code_challenge_method: 'plain' }),
      ),
      'invalid_request',
    );
    await expectOAuthError(
      service.validateAuthorizeRequest(
        new URLSearchParams({
          ...base,
          redirect_uri: 'https://other.example/cb',
          code_challenge: 'x'.repeat(43),
          code_challenge_method: 'S256',
        }),
      ),
      'invalid_request',
    );
  });

  it('issues tokens for a verified code exactly once, and replay revokes them', async () => {
    const { service, memory } = setup();
    const { client_id } = await service.registerClient({ client_name: 'Claude', redirect_uris: [REDIRECT] });
    const { verifier, code, location } = await authorize(service, client_id);
    expect(location.searchParams.get('state')).toBe('xyz');
    expect([...memory.codes.keys()]).toEqual([hashOAuthSecret(code)]);

    await expectOAuthError(
      service.token({ grant_type: 'authorization_code', client_id, code, code_verifier: 'z'.repeat(43) }),
      'invalid_grant',
    );
    // The failed PKCE attempt consumed the code: single-use regardless of outcome.
    await expectOAuthError(
      service.token({ grant_type: 'authorization_code', client_id, code, code_verifier: verifier }),
      'invalid_grant',
    );

    const second = await authorize(service, client_id);
    const issued = await service.token({
      grant_type: 'authorization_code',
      client_id,
      code: second.code,
      code_verifier: second.verifier,
      redirect_uri: REDIRECT,
    });
    expect(issued).toEqual(expect.objectContaining({ token_type: 'Bearer', expires_in: 3600, scope: 'deposits reads packs' }));
    // Tokens are stored only as hashes.
    expect(memory.tokens.every((token) => token.tokenHash.length === 64)).toBe(true);
    expect(JSON.stringify(memory.tokens)).not.toContain(issued.access_token);
    expect(memory.connections.get('user-1')).toEqual(expect.objectContaining({ active: true }));
    await expect(service.verifyAccessToken(issued.access_token)).resolves.toEqual(
      expect.objectContaining({ userId: 'user-1', clientId: client_id, scopes: ['deposits', 'reads', 'packs'] }),
    );

    await expectOAuthError(
      service.token({ grant_type: 'authorization_code', client_id, code: second.code, code_verifier: second.verifier }),
      'invalid_grant',
    );
    await expect(service.verifyAccessToken(issued.access_token)).resolves.toBeNull();
  });

  it('expires codes after 10 minutes and access tokens after 1 hour', async () => {
    const { service, advance } = setup();
    const { client_id } = await service.registerClient({ client_name: 'Claude', redirect_uris: [REDIRECT] });
    const stale = await authorize(service, client_id);
    advance(10 * 60 * 1000 + 1);
    await expectOAuthError(
      service.token({ grant_type: 'authorization_code', client_id, code: stale.code, code_verifier: stale.verifier }),
      'invalid_grant',
    );
    const fresh = await authorize(service, client_id);
    const issued = await service.token({ grant_type: 'authorization_code', client_id, code: fresh.code, code_verifier: fresh.verifier });
    advance(60 * 60 * 1000 + 1);
    await expect(service.verifyAccessToken(issued.access_token)).resolves.toBeNull();
  });

  it('rotates refresh tokens and revokes the family on reuse', async () => {
    const { service } = setup();
    const { client_id } = await service.registerClient({ client_name: 'Claude', redirect_uris: [REDIRECT] });
    const { verifier, code } = await authorize(service, client_id);
    const first = await service.token({ grant_type: 'authorization_code', client_id, code, code_verifier: verifier });

    const second = await service.token({ grant_type: 'refresh_token', client_id, refresh_token: first.refresh_token });
    expect(second.refresh_token).not.toBe(first.refresh_token);
    await expect(service.verifyAccessToken(second.access_token)).resolves.not.toBeNull();

    // Narrowing is allowed; widening is not.
    const narrowed = await service.token({ grant_type: 'refresh_token', client_id, refresh_token: second.refresh_token, scope: 'packs' });
    expect(narrowed.scope).toBe('packs');
    await expectOAuthError(
      service.token({ grant_type: 'refresh_token', client_id, refresh_token: narrowed.refresh_token, scope: 'deposits' }),
      'invalid_scope',
    );

    // Reusing an already-rotated refresh token revokes everything in the family.
    await expectOAuthError(
      service.token({ grant_type: 'refresh_token', client_id, refresh_token: first.refresh_token }),
      'invalid_grant',
    );
    await expect(service.verifyAccessToken(second.access_token)).resolves.toBeNull();
    await expectOAuthError(
      service.token({ grant_type: 'refresh_token', client_id, refresh_token: narrowed.refresh_token }),
      'invalid_grant',
    );
  });

  it('rejects refresh from another client and unsupported grants', async () => {
    const { service } = setup();
    const a = await service.registerClient({ client_name: 'A', redirect_uris: [REDIRECT] });
    const b = await service.registerClient({ client_name: 'B', redirect_uris: [REDIRECT] });
    const { verifier, code } = await authorize(service, a.client_id);
    const issued = await service.token({ grant_type: 'authorization_code', client_id: a.client_id, code, code_verifier: verifier });
    await expectOAuthError(
      service.token({ grant_type: 'refresh_token', client_id: b.client_id, refresh_token: issued.refresh_token }),
      'invalid_grant',
    );
    await expectOAuthError(service.token({ grant_type: 'password', client_id: a.client_id }), 'unsupported_grant_type');
    await expectOAuthError(service.token({ grant_type: 'authorization_code', client_id: 'nope' }), 'invalid_client');
  });

  it('revocation, grants listing, and the Claude connection row', async () => {
    const { service, memory } = setup();
    const { client_id } = await service.registerClient({ client_name: 'Claude', redirect_uris: [REDIRECT] });
    const one = await authorize(service, client_id, 'packs');
    const issued = await service.token({ grant_type: 'authorization_code', client_id, code: one.code, code_verifier: one.verifier });
    await service.verifyAccessToken(issued.access_token);

    const grants = await service.listGrants('user-1');
    expect(grants).toEqual([expect.objectContaining({ clientId: client_id, clientName: 'Claude', scopes: ['packs'] })]);
    expect(grants[0]!.lastUsedAt).not.toBeNull();

    await service.revoke(issued.refresh_token);
    await expect(service.verifyAccessToken(issued.access_token)).resolves.toBeNull();
    await expect(service.listGrants('user-1')).resolves.toEqual([]);
    expect(memory.connections.get('user-1')).toEqual(expect.objectContaining({ active: false }));
    await expect(service.revoke('unknown-token')).resolves.toBeUndefined();

    const two = await authorize(service, client_id);
    const again = await service.token({ grant_type: 'authorization_code', client_id, code: two.code, code_verifier: two.verifier });
    await service.revokeClientForUser('user-1', client_id);
    await expect(service.verifyAccessToken(again.access_token)).resolves.toBeNull();
    expect(memory.connections.get('user-1')).toEqual(expect.objectContaining({ active: false }));
  });
});
