/**
 * HTTP surface helpers for the Bitcode OAuth 2.1 server and remote MCP
 * resource (V49 Claude External law C-2/C-3): RFC 8414 / RFC 9728 metadata,
 * CORS for browser-based MCP clients, RFC 6749 error bodies, and token
 * request parsing (form-encoded or JSON).
 */

import { NextResponse } from 'next/server';

import { resolveCanonicalAppOrigin } from '@/lib/bitcode-request-host';
import { createSupabaseOAuthRepository } from './oauth-repository';
import { BITCODE_OAUTH_SCOPES, createOAuthService, OAuthError, type OAuthService } from './oauth-service';

let service: OAuthService | null = null;

/** Process-wide OAuth service over Supabase (service role). */
export function getOAuthService(): OAuthService {
  service ??= createOAuthService(createSupabaseOAuthRepository());
  return service;
}

export const OAUTH_CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, Mcp-Protocol-Version, Mcp-Session-Id, Last-Event-ID',
  'Access-Control-Expose-Headers': 'WWW-Authenticate, Mcp-Session-Id',
  'Access-Control-Max-Age': '86400',
};

export function oauthJson(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return NextResponse.json(body, {
    status,
    headers: { ...OAUTH_CORS_HEADERS, 'Cache-Control': 'no-store', Pragma: 'no-cache', ...headers },
  });
}

export function oauthPreflight() {
  return new NextResponse(null, { status: 204, headers: OAUTH_CORS_HEADERS });
}

export function oauthErrorResponse(error: unknown) {
  if (error instanceof OAuthError) return oauthJson(error.toJSON(), error.status);
  return oauthJson({ error: 'server_error', error_description: 'The authorization server failed.' }, 500);
}

export function bitcodeOrigin(request: Request): string {
  return resolveCanonicalAppOrigin(request);
}

export function mcpResourceUrl(origin: string): string {
  return `${origin}/api/mcp`;
}

/** RFC 9728 protected resource metadata for the MCP endpoint. */
export function buildProtectedResourceMetadata(origin: string) {
  return {
    resource: mcpResourceUrl(origin),
    authorization_servers: [origin],
    scopes_supported: [...BITCODE_OAUTH_SCOPES],
    bearer_methods_supported: ['header'],
    resource_name: 'Bitcode',
    resource_documentation: `${origin}/docs`,
  };
}

/** RFC 8414 authorization server metadata. */
export function buildAuthorizationServerMetadata(origin: string) {
  return {
    issuer: origin,
    authorization_endpoint: `${origin}/oauth/authorize`,
    token_endpoint: `${origin}/api/oauth/token`,
    registration_endpoint: `${origin}/api/oauth/register`,
    revocation_endpoint: `${origin}/api/oauth/revoke`,
    scopes_supported: [...BITCODE_OAUTH_SCOPES],
    response_types_supported: ['code'],
    response_modes_supported: ['query'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    token_endpoint_auth_methods_supported: ['none'],
    revocation_endpoint_auth_methods_supported: ['none'],
    code_challenge_methods_supported: ['S256'],
  };
}

/** `WWW-Authenticate` for 401s from the MCP resource (RFC 9728 §5.1). */
export function mcpWwwAuthenticate(origin: string, error?: 'invalid_token' | 'insufficient_scope', scope?: string) {
  const parts = [`Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource"`];
  if (error) parts.push(`error="${error}"`);
  if (scope) parts.push(`scope="${scope}"`);
  return parts.join(', ');
}

/** Token / revoke endpoints accept form-encoded (RFC 6749) or JSON bodies. */
export async function readOAuthParams(request: Request): Promise<Record<string, string>> {
  const contentType = request.headers.get('content-type') || '';
  const text = await request.text();
  if (contentType.includes('application/json')) {
    try {
      const parsed = JSON.parse(text || '{}') as Record<string, unknown>;
      return Object.fromEntries(
        Object.entries(parsed)
          .filter(([, value]) => typeof value === 'string')
          .map(([key, value]) => [key, value as string]),
      );
    } catch {
      return {};
    }
  }
  return Object.fromEntries(new URLSearchParams(text).entries());
}
