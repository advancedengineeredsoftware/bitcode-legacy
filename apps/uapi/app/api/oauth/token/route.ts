/**
 * POST /api/oauth/token — authorization_code (PKCE S256, single-use) and
 * refresh_token (rotation; reuse revokes the family) grants (V49 C-3).
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
    return oauthJson(await getOAuthService().token(await readOAuthParams(request)));
  } catch (error) {
    return oauthErrorResponse(error);
  }
}

export async function OPTIONS() {
  return oauthPreflight();
}
