/**
 * OAuth primitives (V49 Claude External law C-3): opaque random secrets,
 * SHA-256 storage hashes, and PKCE S256 verification. Secrets never persist;
 * only `hashOAuthSecret` output is stored.
 */

import crypto from 'node:crypto';

export const OAUTH_ACCESS_TOKEN_TTL_MS = 60 * 60 * 1000;
export const OAUTH_REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const OAUTH_AUTHORIZATION_CODE_TTL_MS = 10 * 60 * 1000;

export type OAuthSecretKind = 'access' | 'refresh' | 'code' | 'client';

const PREFIX: Record<OAuthSecretKind, string> = {
  access: 'bca_',
  refresh: 'bcr_',
  code: 'bcc_',
  client: 'bcl_',
};

export function generateOAuthSecret(kind: OAuthSecretKind): string {
  return `${PREFIX[kind]}${crypto.randomBytes(32).toString('base64url')}`;
}

export function hashOAuthSecret(secret: string): string {
  return crypto.createHash('sha256').update(secret).digest('hex');
}

/** RFC 7636 S256: BASE64URL(SHA256(code_verifier)) === code_challenge. */
export function verifyPkceS256(codeVerifier: string, codeChallenge: string): boolean {
  if (!/^[A-Za-z0-9._~-]{43,128}$/.test(codeVerifier)) return false;
  const expected = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  const a = Buffer.from(expected);
  const b = Buffer.from(codeChallenge);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function pkceChallengeS256(codeVerifier: string): string {
  return crypto.createHash('sha256').update(codeVerifier).digest('base64url');
}
