/**
 * OAuth storage seam (V49 C-3). The service holds every grant rule; this
 * interface is plain persistence with two atomic compare-and-set operations
 * (code consumption, refresh rotation) that make single-use and reuse
 * detection race-safe. The Supabase implementation is service-role only.
 */

import { supabaseAdmin } from '@bitcode/supabase';

export interface OAuthClientRecord {
  clientId: string;
  clientName: string;
  redirectUris: string[];
  createdAt: string;
}

export interface OAuthCodeRecord {
  codeHash: string;
  clientId: string;
  userId: string;
  redirectUri: string;
  scopes: string[];
  codeChallenge: string;
  resource: string | null;
  familyId: string;
  expiresAt: string;
  usedAt: string | null;
}

export type OAuthTokenKind = 'access' | 'refresh';

export interface OAuthTokenRecord {
  id: string;
  tokenHash: string;
  kind: OAuthTokenKind;
  familyId: string;
  clientId: string;
  userId: string;
  scopes: string[];
  expiresAt: string;
  revokedAt: string | null;
  rotatedAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
}

export interface OAuthRepository {
  insertClient(client: OAuthClientRecord): Promise<void>;
  getClient(clientId: string): Promise<OAuthClientRecord | null>;
  insertCode(code: OAuthCodeRecord): Promise<void>;
  /** Atomically mark used; `firstUse` false when it was already consumed. */
  consumeCode(codeHash: string, nowIso: string): Promise<{ record: OAuthCodeRecord; firstUse: boolean } | null>;
  insertTokens(tokens: Array<Omit<OAuthTokenRecord, 'id' | 'createdAt'>>): Promise<void>;
  getTokenByHash(tokenHash: string): Promise<OAuthTokenRecord | null>;
  /** Atomically mark a refresh token rotated; false when it already was. */
  markRotated(tokenId: string, nowIso: string): Promise<boolean>;
  revokeFamily(familyId: string, nowIso: string): Promise<void>;
  revokeToken(tokenId: string, nowIso: string): Promise<void>;
  touchToken(tokenId: string, nowIso: string): Promise<void>;
  listUserTokens(userId: string): Promise<OAuthTokenRecord[]>;
  /** Upsert / deactivate the `anthropic-claude` user_connections row (no secrets). */
  setClaudeConnection(userId: string, active: boolean, data: Record<string, unknown>): Promise<void>;
}

type Row = Record<string, any>;

function toClient(row: Row): OAuthClientRecord {
  return {
    clientId: row.client_id,
    clientName: row.client_name,
    redirectUris: row.redirect_uris || [],
    createdAt: row.created_at,
  };
}

function toCode(row: Row): OAuthCodeRecord {
  return {
    codeHash: row.code_hash,
    clientId: row.client_id,
    userId: row.user_id,
    redirectUri: row.redirect_uri,
    scopes: row.scopes || [],
    codeChallenge: row.code_challenge,
    resource: row.resource ?? null,
    familyId: row.family_id,
    expiresAt: row.expires_at,
    usedAt: row.used_at ?? null,
  };
}

function toToken(row: Row): OAuthTokenRecord {
  return {
    id: row.id,
    tokenHash: row.token_hash,
    kind: row.token_kind,
    familyId: row.family_id,
    clientId: row.client_id,
    userId: row.user_id,
    scopes: row.scopes || [],
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at ?? null,
    rotatedAt: row.rotated_at ?? null,
    lastUsedAt: row.last_used_at ?? null,
    createdAt: row.created_at,
  };
}

function fail(error: { message?: string } | null | undefined): void {
  if (error) throw new Error(`oauth storage: ${error.message || 'unknown error'}`);
}

export function createSupabaseOAuthRepository(db: any = supabaseAdmin): OAuthRepository {
  return {
    async insertClient(client) {
      const { error } = await db.from('oauth_clients').insert({
        client_id: client.clientId,
        client_name: client.clientName,
        redirect_uris: client.redirectUris,
        created_at: client.createdAt,
      });
      fail(error);
    },
    async getClient(clientId) {
      const { data, error } = await db.from('oauth_clients').select('*').eq('client_id', clientId).maybeSingle();
      fail(error);
      return data ? toClient(data) : null;
    },
    async insertCode(code) {
      const { error } = await db.from('oauth_authorization_codes').insert({
        code_hash: code.codeHash,
        client_id: code.clientId,
        user_id: code.userId,
        redirect_uri: code.redirectUri,
        scopes: code.scopes,
        code_challenge: code.codeChallenge,
        code_challenge_method: 'S256',
        resource: code.resource,
        family_id: code.familyId,
        expires_at: code.expiresAt,
      });
      fail(error);
    },
    async consumeCode(codeHash, nowIso) {
      const { data, error } = await db
        .from('oauth_authorization_codes')
        .update({ used_at: nowIso })
        .eq('code_hash', codeHash)
        .is('used_at', null)
        .select('*')
        .maybeSingle();
      fail(error);
      if (data) return { record: toCode(data), firstUse: true };
      const { data: existing, error: readError } = await db
        .from('oauth_authorization_codes')
        .select('*')
        .eq('code_hash', codeHash)
        .maybeSingle();
      fail(readError);
      return existing ? { record: toCode(existing), firstUse: false } : null;
    },
    async insertTokens(tokens) {
      const { error } = await db.from('oauth_tokens').insert(
        tokens.map((token) => ({
          token_hash: token.tokenHash,
          token_kind: token.kind,
          family_id: token.familyId,
          client_id: token.clientId,
          user_id: token.userId,
          scopes: token.scopes,
          expires_at: token.expiresAt,
        })),
      );
      fail(error);
    },
    async getTokenByHash(tokenHash) {
      const { data, error } = await db.from('oauth_tokens').select('*').eq('token_hash', tokenHash).maybeSingle();
      fail(error);
      return data ? toToken(data) : null;
    },
    async markRotated(tokenId, nowIso) {
      const { data, error } = await db
        .from('oauth_tokens')
        .update({ rotated_at: nowIso })
        .eq('id', tokenId)
        .is('rotated_at', null)
        .select('id')
        .maybeSingle();
      fail(error);
      return Boolean(data);
    },
    async revokeFamily(familyId, nowIso) {
      const { error } = await db
        .from('oauth_tokens')
        .update({ revoked_at: nowIso })
        .eq('family_id', familyId)
        .is('revoked_at', null);
      fail(error);
    },
    async revokeToken(tokenId, nowIso) {
      const { error } = await db.from('oauth_tokens').update({ revoked_at: nowIso }).eq('id', tokenId).is('revoked_at', null);
      fail(error);
    },
    async touchToken(tokenId, nowIso) {
      await db.from('oauth_tokens').update({ last_used_at: nowIso }).eq('id', tokenId);
    },
    async listUserTokens(userId) {
      const { data, error } = await db.from('oauth_tokens').select('*').eq('user_id', userId);
      fail(error);
      return (data || []).map(toToken);
    },
    async setClaudeConnection(userId, active, data) {
      const { error } = await db.from('user_connections').upsert(
        {
          user_id: userId,
          provider: 'anthropic-claude',
          is_active: active,
          connection_data: data,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,provider' },
      );
      fail(error);
    },
  };
}
