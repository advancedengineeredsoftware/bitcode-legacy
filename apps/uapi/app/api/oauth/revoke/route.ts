/**
 * POST /api/oauth/revoke — RFC 7009 token revocation (V49 C-3). Always 200
 * for well-formed requests, including unknown tokens.
 */

import {
  getOAuthService,
  oauthErrorResponse,
  oauthJson,
  oauthPreflight,
  readOAuthParams,
} from '@/lib/oauth/oauth-http';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const params = await readOAuthParams(request);
    await getOAuthService().revoke(params.token);
    return oauthJson({});
  } catch (error) {
    return oauthErrorResponse(error);
  }
}

export async function OPTIONS() {
  return oauthPreflight();
}
