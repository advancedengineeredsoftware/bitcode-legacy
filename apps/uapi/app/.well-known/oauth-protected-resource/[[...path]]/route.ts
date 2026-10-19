/**
 * GET /.well-known/oauth-protected-resource[/api/mcp] — RFC 9728 metadata for
 * the Bitcode remote MCP resource (V49 C-3). The optional path suffix serves
 * clients that append the resource path.
 */

import {
  bitcodeOrigin,
  buildProtectedResourceMetadata,
  oauthJson,
  oauthPreflight,
} from '@/lib/oauth/oauth-http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return oauthJson(buildProtectedResourceMetadata(bitcodeOrigin(request)), 200, {
    'Cache-Control': 'public, max-age=300',
  });
}

export async function OPTIONS() {
  return oauthPreflight();
}
