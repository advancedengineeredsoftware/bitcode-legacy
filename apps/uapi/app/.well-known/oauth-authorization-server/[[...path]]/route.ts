/**
 * GET /.well-known/oauth-authorization-server — RFC 8414 metadata for the
 * Bitcode OAuth 2.1 server (V49 C-3).
 */

import {
  bitcodeOrigin,
  buildAuthorizationServerMetadata,
  oauthJson,
  oauthPreflight,
} from '@/lib/oauth/oauth-http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return oauthJson(buildAuthorizationServerMetadata(bitcodeOrigin(request)), 200, {
    'Cache-Control': 'public, max-age=300',
  });
}

export async function OPTIONS() {
  return oauthPreflight();
}
