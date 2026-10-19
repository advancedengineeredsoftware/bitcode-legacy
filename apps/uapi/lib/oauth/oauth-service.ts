/**
 * OAuth 2.1 authorization server rules (V49 Claude External law C-3).
 *
 * Public clients only (RFC 7591 registration, `token_endpoint_auth_method:
 * none`); authorization code + PKCE S256 required; codes are single-use and
 * ≤ 10 minutes, and replaying one revokes every token it issued; refresh
 * tokens rotate on use and reusing a rotated one revokes the whole family;
 * access tokens last 1 h, refresh tokens 30 d. Errors use RFC 6749 codes.
 */

import crypto from 'node:crypto';

import {
  OAUTH_ACCESS_TOKEN_TTL_MS,
  OAUTH_AUTHORIZATION_CODE_TTL_MS,
  OAUTH_REFRESH_TOKEN_TTL_MS,
  generateOAuthSecret,
  hashOAuthSecret,
  verifyPkceS256,
} from './oauth-crypto';
import type { OAuthClientRecord, OAuthRepository, OAuthTokenRecord } from './oauth-repository';

/** Scopes gate MCP tools (C-2): deposits → deposit, reads → read, packs → packs/measure/panes. */
export const BITCODE_OAUTH_SCOPES = ['deposits', 'reads', 'packs'] as const;
export type BitcodeOAuthScope = (typeof BITCODE_OAUTH_SCOPES)[number];

export class OAuthError extends Error {
  constructor(
    readonly error:
      | 'invalid_request'
      | 'invalid_client'
      | 'invalid_grant'
      | 'unauthorized_client'
      | 'unsupported_grant_type'
      | 'invalid_scope'
      | 'invalid_client_metadata'
      | 'invalid_redirect_uri'
      | 'access_denied'
      | 'unsupported_response_type',
    readonly description: string,
    readonly status = 400,
  ) {
    super(description);
  }

  toJSON() {
    return { error: this.error, error_description: this.description };
  }
}

export interface OAuthTokenResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  refresh_token: string;
  scope: string;
}

export interface VerifiedAccessToken {
  userId: string;
  clientId: string;
  scopes: BitcodeOAuthScope[];
  tokenId: string;
}

export interface AuthorizeRequest {
  client: OAuthClientRecord;
  redirectUri: string;
  scopes: BitcodeOAuthScope[];
  state: string | null;
  codeChallenge: string;
  resource: string | null;
}

export interface OAuthGrantSummary {
  clientId: string;
  clientName: string;
  scopes: string[];
  lastUsedAt: string | null;
  createdAt: string;
}

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/** https redirect URIs, or http loopback (native / CLI clients such as Claude Code). */
export function isAllowedRedirectUri(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (url.hash) return false;
    if (url.protocol === 'https:') return true;
    return url.protocol === 'http:' && LOOPBACK_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

/** Loopback redirect URIs match regardless of port (RFC 8252 §7.3). */
function redirectMatches(registered: string, requested: string): boolean {
  if (registered === requested) return true;
  try {
    const a = new URL(registered);
    const b = new URL(requested);
    return (
      a.protocol === 'http:' &&
      LOOPBACK_HOSTS.has(a.hostname) &&
      a.hostname === b.hostname &&
      a.pathname === b.pathname &&
      a.search === b.search
    );
  } catch {
    return false;
  }
}

export function parseScopes(raw: string | null | undefined): BitcodeOAuthScope[] {
  const requested = String(raw || '')
    .split(/[\s,]+/)
    .map((scope) => scope.trim())
    .filter(Boolean);
  if (requested.length === 0) return [...BITCODE_OAUTH_SCOPES];
  const unknown = requested.filter((scope) => !(BITCODE_OAUTH_SCOPES as readonly string[]).includes(scope));
  if (unknown.length) throw new OAuthError('invalid_scope', `Unknown scope(s): ${unknown.join(', ')}.`);
  return BITCODE_OAUTH_SCOPES.filter((scope) => requested.includes(scope));
}

export function createOAuthService(repository: OAuthRepository, options: { now?: () => number } = {}) {
  const now = options.now ?? Date.now;
  const iso = (ms = now()) => new Date(ms).toISOString();

  async function issueTokens(input: {
    userId: string;
    clientId: string;
    scopes: string[];
    familyId: string;
  }): Promise<OAuthTokenResponse> {
    const accessToken = generateOAuthSecret('access');
    const refreshToken = generateOAuthSecret('refresh');
    const base = { familyId: input.familyId, clientId: input.clientId, userId: input.userId, scopes: input.scopes };
    await repository.insertTokens([
      {
        ...base,
        tokenHash: hashOAuthSecret(accessToken),
        kind: 'access',
        expiresAt: iso(now() + OAUTH_ACCESS_TOKEN_TTL_MS),
        revokedAt: null,
        rotatedAt: null,
        lastUsedAt: null,
      },
      {
        ...base,
        tokenHash: hashOAuthSecret(refreshToken),
        kind: 'refresh',
        expiresAt: iso(now() + OAUTH_REFRESH_TOKEN_TTL_MS),
        revokedAt: null,
        rotatedAt: null,
        lastUsedAt: null,
      },
    ]);
    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: Math.round(OAUTH_ACCESS_TOKEN_TTL_MS / 1000),
      refresh_token: refreshToken,
      scope: input.scopes.join(' '),
    };
  }

  async function requireClient(clientId: unknown): Promise<OAuthClientRecord> {
    if (typeof clientId !== 'string' || !clientId) throw new OAuthError('invalid_client', 'client_id is required.', 401);
    const client = await repository.getClient(clientId);
    if (!client) throw new OAuthError('invalid_client', 'Unknown client_id.', 401);
    return client;
  }

  async function activeGrants(userId: string): Promise<OAuthTokenRecord[]> {
    const nowMs = now();
    return (await repository.listUserTokens(userId)).filter(
      (token) => token.kind === 'refresh' && !token.revokedAt && !token.rotatedAt && Date.parse(token.expiresAt) > nowMs,
    );
  }

  return {
    /** RFC 7591 dynamic client registration (public clients). */
    async registerClient(metadata: Record<string, unknown>) {
      const redirectUris = metadata.redirect_uris;
      if (!Array.isArray(redirectUris) || redirectUris.length === 0 || redirectUris.length > 10) {
        throw new OAuthError('invalid_redirect_uri', 'redirect_uris must list 1–10 URIs.');
      }
      if (!redirectUris.every((uri) => typeof uri === 'string' && isAllowedRedirectUri(uri))) {
        throw new OAuthError('invalid_redirect_uri', 'redirect_uris must be https or http loopback URIs.');
      }
      const grantTypes = Array.isArray(metadata.grant_types) ? metadata.grant_types : ['authorization_code', 'refresh_token'];
      if (!grantTypes.every((grant) => grant === 'authorization_code' || grant === 'refresh_token')) {
        throw new OAuthError('invalid_client_metadata', 'Only authorization_code and refresh_token grants are supported.');
      }
      const clientName =
        typeof metadata.client_name === 'string' && metadata.client_name.trim()
          ? metadata.client_name.trim().slice(0, 120)
          : 'MCP client';
      const client: OAuthClientRecord = {
        clientId: generateOAuthSecret('client'),
        clientName,
        redirectUris: redirectUris as string[],
        createdAt: iso(),
      };
      await repository.insertClient(client);
      return {
        client_id: client.clientId,
        client_id_issued_at: Math.floor(now() / 1000),
        client_name: client.clientName,
        redirect_uris: client.redirectUris,
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
        token_endpoint_auth_method: 'none',
      };
    },

    /** Validate `/oauth/authorize` query parameters (before showing consent). */
    async validateAuthorizeRequest(params: URLSearchParams): Promise<AuthorizeRequest> {
      const client = await requireClient(params.get('client_id'));
      const redirectUri = params.get('redirect_uri') || '';
      if (!client.redirectUris.some((registered) => redirectMatches(registered, redirectUri))) {
        throw new OAuthError('invalid_request', 'redirect_uri is not registered for this client.');
      }
      if (params.get('response_type') !== 'code') {
        throw new OAuthError('unsupported_response_type', 'response_type must be code.');
      }
      const codeChallenge = params.get('code_challenge') || '';
      if (params.get('code_challenge_method') !== 'S256' || !/^[A-Za-z0-9_-]{43}$/.test(codeChallenge)) {
        throw new OAuthError('invalid_request', 'PKCE with code_challenge_method=S256 is required.');
      }
      return {
        client,
        redirectUri,
        scopes: parseScopes(params.get('scope')),
        state: params.get('state'),
        codeChallenge,
        resource: params.get('resource'),
      };
    },

    /** Consent approved by the signed-in user → single-use code redirect. */
    async approve(userId: string, request: AuthorizeRequest): Promise<string> {
      const code = generateOAuthSecret('code');
      await repository.insertCode({
        codeHash: hashOAuthSecret(code),
        clientId: request.client.clientId,
        userId,
        redirectUri: request.redirectUri,
        scopes: request.scopes,
        codeChallenge: request.codeChallenge,
        resource: request.resource,
        familyId: crypto.randomUUID(),
        expiresAt: iso(now() + OAUTH_AUTHORIZATION_CODE_TTL_MS),
        usedAt: null,
      });
      const url = new URL(request.redirectUri);
      url.searchParams.set('code', code);
      if (request.state !== null) url.searchParams.set('state', request.state);
      return url.toString();
    },

    denyRedirect(request: AuthorizeRequest): string {
      const url = new URL(request.redirectUri);
      url.searchParams.set('error', 'access_denied');
      if (request.state !== null) url.searchParams.set('state', request.state);
      return url.toString();
    },

    /** POST /api/oauth/token. */
    async token(params: Record<string, string | undefined>): Promise<OAuthTokenResponse> {
      const grantType = params.grant_type;
      const client = await requireClient(params.client_id);

      if (grantType === 'authorization_code') {
        const code = params.code || '';
        const consumed = code ? await repository.consumeCode(hashOAuthSecret(code), iso()) : null;
        if (!consumed) throw new OAuthError('invalid_grant', 'Unknown authorization code.');
        const { record, firstUse } = consumed;
        if (!firstUse) {
          // Replay: revoke everything this code issued (RFC 6749 §4.1.2).
          await repository.revokeFamily(record.familyId, iso());
          throw new OAuthError('invalid_grant', 'Authorization code was already used.');
        }
        if (Date.parse(record.expiresAt) <= now()) throw new OAuthError('invalid_grant', 'Authorization code expired.');
        if (record.clientId !== client.clientId) throw new OAuthError('invalid_grant', 'Code was issued to another client.');
        if (params.redirect_uri && params.redirect_uri !== record.redirectUri) {
          throw new OAuthError('invalid_grant', 'redirect_uri does not match the authorization request.');
        }
        if (!params.code_verifier || !verifyPkceS256(params.code_verifier, record.codeChallenge)) {
          throw new OAuthError('invalid_grant', 'PKCE verification failed.');
        }
        const issued = await issueTokens({
          userId: record.userId,
          clientId: client.clientId,
          scopes: record.scopes,
          familyId: record.familyId,
        });
        await repository.setClaudeConnection(record.userId, true, {
          lastClientName: client.clientName,
          lastGrantAt: iso(),
        });
        return issued;
      }

      if (grantType === 'refresh_token') {
        const token = params.refresh_token ? await repository.getTokenByHash(hashOAuthSecret(params.refresh_token)) : null;
        if (!token || token.kind !== 'refresh' || token.clientId !== client.clientId) {
          throw new OAuthError('invalid_grant', 'Unknown refresh token.');
        }
        if (token.revokedAt || Date.parse(token.expiresAt) <= now()) {
          throw new OAuthError('invalid_grant', 'Refresh token is revoked or expired.');
        }
        if (token.rotatedAt || !(await repository.markRotated(token.id, iso()))) {
          // Reuse of a rotated refresh token: assume theft, revoke the family.
          await repository.revokeFamily(token.familyId, iso());
          throw new OAuthError('invalid_grant', 'Refresh token was already used.');
        }
        const scopes = params.scope ? parseScopes(params.scope) : (token.scopes as BitcodeOAuthScope[]);
        if (scopes.some((scope) => !token.scopes.includes(scope))) {
          throw new OAuthError('invalid_scope', 'Refresh cannot widen scope.');
        }
        return issueTokens({ userId: token.userId, clientId: client.clientId, scopes, familyId: token.familyId });
      }

      throw new OAuthError('unsupported_grant_type', 'grant_type must be authorization_code or refresh_token.');
    },

    /** Bearer verification for /api/mcp; null when missing, unknown, expired, or revoked. */
    async verifyAccessToken(raw: string | null | undefined): Promise<VerifiedAccessToken | null> {
      if (!raw) return null;
      const token = await repository.getTokenByHash(hashOAuthSecret(raw));
      if (!token || token.kind !== 'access' || token.revokedAt || Date.parse(token.expiresAt) <= now()) return null;
      await repository.touchToken(token.id, iso());
      return {
        userId: token.userId,
        clientId: token.clientId,
        scopes: token.scopes.filter((scope): scope is BitcodeOAuthScope =>
          (BITCODE_OAUTH_SCOPES as readonly string[]).includes(scope),
        ),
        tokenId: token.id,
      };
    },

    /** RFC 7009: revoking a refresh token revokes its family; unknown tokens are not an error. */
    async revoke(rawToken: string | undefined): Promise<void> {
      if (!rawToken) return;
      const token = await repository.getTokenByHash(hashOAuthSecret(rawToken));
      if (!token) return;
      if (token.kind === 'refresh') await repository.revokeFamily(token.familyId, iso());
      else await repository.revokeToken(token.id, iso());
      await this.syncClaudeConnection(token.userId);
    },

    /** Active grants for the Externals card (one row per client). */
    async listGrants(userId: string): Promise<OAuthGrantSummary[]> {
      const grants = await activeGrants(userId);
      const allTokens = await repository.listUserTokens(userId);
      const byClient = new Map<string, OAuthGrantSummary>();
      for (const grant of grants) {
        const lastUsedAt =
          allTokens
            .filter((token) => token.familyId === grant.familyId && token.lastUsedAt)
            .map((token) => token.lastUsedAt as string)
            .sort()
            .pop() ?? null;
        const existing = byClient.get(grant.clientId);
        const client = existing ? null : await repository.getClient(grant.clientId);
        const summary: OAuthGrantSummary = existing ?? {
          clientId: grant.clientId,
          clientName: client?.clientName ?? 'MCP client',
          scopes: [],
          lastUsedAt: null,
          createdAt: grant.createdAt,
        };
        summary.scopes = [...new Set([...summary.scopes, ...grant.scopes])];
        if (lastUsedAt && (!summary.lastUsedAt || lastUsedAt > summary.lastUsedAt)) summary.lastUsedAt = lastUsedAt;
        byClient.set(grant.clientId, summary);
      }
      return [...byClient.values()];
    },

    /** Revoke every grant a user gave one client (Externals card Revoke). */
    async revokeClientForUser(userId: string, clientId: string): Promise<void> {
      const families = new Set(
        (await repository.listUserTokens(userId))
          .filter((token) => token.clientId === clientId && !token.revokedAt)
          .map((token) => token.familyId),
      );
      for (const familyId of families) await repository.revokeFamily(familyId, iso());
      await this.syncClaudeConnection(userId);
    },

    /** The Claude External stays connected while any grant is active. */
    async syncClaudeConnection(userId: string): Promise<void> {
      const remaining = await activeGrants(userId);
      if (remaining.length === 0) {
        await repository.setClaudeConnection(userId, false, { disconnectedAt: iso() });
      }
    },
  };
}

export type OAuthService = ReturnType<typeof createOAuthService>;
