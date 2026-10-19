/**
 * /api/mcp — Bitcode remote MCP server (V49 Claude External law C-2).
 *
 * Streamable HTTP transport in stateless JSON-response mode: POST carries
 * JSON-RPC message(s) and receives `application/json` (202 for notifications
 * only); GET (server-initiated stream) is not offered. Every request needs
 * `Authorization: Bearer <OAuth access token>`; failures return 401 with a
 * `WWW-Authenticate` header naming the protected resource metadata.
 */

import { NextResponse } from 'next/server';
import { isJSONRPCRequest, type JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';

import { createBitcodeMcpServer } from '@/lib/mcp/bitcode-mcp-server';
import { JsonResponseTransport } from '@/lib/mcp/json-response-transport';
import {
  OAUTH_CORS_HEADERS,
  bitcodeOrigin,
  getOAuthService,
  mcpWwwAuthenticate,
  oauthPreflight,
} from '@/lib/oauth/oauth-http';

export const runtime = 'nodejs';
// read/deposit tools only dispatch (waitUntil keeps synthesis alive).
export const maxDuration = 900;

function jsonRpcError(status: number, message: string, headers: Record<string, string> = {}) {
  return NextResponse.json(
    { jsonrpc: '2.0', error: { code: -32000, message }, id: null },
    { status, headers: { ...OAUTH_CORS_HEADERS, ...headers } },
  );
}

async function authenticate(request: Request) {
  const origin = bitcodeOrigin(request);
  const header = request.headers.get('authorization') || '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  const verified = match ? await getOAuthService().verifyAccessToken(match[1]!.trim()) : null;
  if (!verified) {
    return {
      origin,
      denied: jsonRpcError(401, 'A valid Bitcode OAuth access token is required.', {
        'WWW-Authenticate': mcpWwwAuthenticate(origin, match ? 'invalid_token' : undefined),
      }),
    };
  }
  return { origin, verified };
}

export async function POST(request: Request) {
  const auth = await authenticate(request);
  if ('denied' in auth) return auth.denied;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { jsonrpc: '2.0', error: { code: -32700, message: 'Parse error' }, id: null },
      { status: 400, headers: OAUTH_CORS_HEADERS },
    );
  }
  const messages = (Array.isArray(payload) ? payload : [payload]) as JSONRPCMessage[];

  const server = createBitcodeMcpServer({
    userId: auth.verified.userId,
    origin: auth.origin,
    scopes: auth.verified.scopes,
  });
  const transport = new JsonResponseTransport();
  await server.connect(transport);
  try {
    const responses = await transport.handle(messages);
    if (!messages.some(isJSONRPCRequest)) {
      return new NextResponse(null, { status: 202, headers: OAUTH_CORS_HEADERS });
    }
    return NextResponse.json(Array.isArray(payload) ? responses : responses[0], { headers: OAUTH_CORS_HEADERS });
  } finally {
    await server.close();
  }
}

export async function GET(request: Request) {
  const auth = await authenticate(request);
  if ('denied' in auth) return auth.denied;
  return jsonRpcError(405, 'Server-initiated streams are not offered; POST JSON-RPC requests.', { Allow: 'POST' });
}

export async function DELETE(request: Request) {
  const auth = await authenticate(request);
  if ('denied' in auth) return auth.denied;
  // Stateless server: there is no session to terminate.
  return jsonRpcError(405, 'Stateless server: no session to delete.', { Allow: 'POST' });
}

export async function OPTIONS() {
  return oauthPreflight();
}
