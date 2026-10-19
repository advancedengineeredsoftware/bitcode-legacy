/**
 * In-memory OAuthRepository with the same atomic compare-and-set semantics as
 * the Supabase implementation (V49 Gate 6 tests).
 */

import crypto from 'node:crypto';

import type {
  OAuthClientRecord,
  OAuthCodeRecord,
  OAuthRepository,
  OAuthTokenRecord,
} from '@/lib/oauth/oauth-repository';

export function createMemoryOAuthRepository() {
  const clients = new Map<string, OAuthClientRecord>();
  const codes = new Map<string, OAuthCodeRecord>();
  const tokens: OAuthTokenRecord[] = [];
  const connections = new Map<string, { active: boolean; data: Record<string, unknown> }>();

  const repository: OAuthRepository = {
    async insertClient(client) {
      clients.set(client.clientId, { ...client });
    },
    async getClient(clientId) {
      return clients.get(clientId) ?? null;
    },
    async insertCode(code) {
      codes.set(code.codeHash, { ...code });
    },
    async consumeCode(codeHash, nowIso) {
      const record = codes.get(codeHash);
      if (!record) return null;
      if (record.usedAt) return { record: { ...record }, firstUse: false };
      record.usedAt = nowIso;
      return { record: { ...record }, firstUse: true };
    },
    async insertTokens(rows) {
      for (const row of rows) tokens.push({ ...row, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
    },
    async getTokenByHash(tokenHash) {
      const token = tokens.find((row) => row.tokenHash === tokenHash);
      return token ? { ...token } : null;
    },
    async markRotated(tokenId, nowIso) {
      const token = tokens.find((row) => row.id === tokenId);
      if (!token || token.rotatedAt) return false;
      token.rotatedAt = nowIso;
      return true;
    },
    async revokeFamily(familyId, nowIso) {
      for (const token of tokens) if (token.familyId === familyId && !token.revokedAt) token.revokedAt = nowIso;
    },
    async revokeToken(tokenId, nowIso) {
      const token = tokens.find((row) => row.id === tokenId);
      if (token && !token.revokedAt) token.revokedAt = nowIso;
    },
    async touchToken(tokenId, nowIso) {
      const token = tokens.find((row) => row.id === tokenId);
      if (token) token.lastUsedAt = nowIso;
    },
    async listUserTokens(userId) {
      return tokens.filter((token) => token.userId === userId).map((token) => ({ ...token }));
    },
    async setClaudeConnection(userId, active, data) {
      connections.set(userId, { active, data });
    },
  };

  return { repository, clients, codes, tokens, connections };
}
