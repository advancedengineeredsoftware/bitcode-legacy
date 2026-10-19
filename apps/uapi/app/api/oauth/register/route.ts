/**
 * POST /api/oauth/register — RFC 7591 dynamic client registration (V49 C-3).
 * Public clients only; redirect URIs must be https or http loopback.
 */

import { getOAuthService, oauthErrorResponse, oauthJson, oauthPreflight } from '@/lib/oauth/oauth-http';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  let metadata: Record<string, unknown>;
  try {
    metadata = (await request.json()) as Record<string, unknown>;
  } catch {
    return oauthJson({ error: 'invalid_client_metadata', error_description: 'Body must be JSON.' }, 400);
  }
  try {
    return oauthJson(await getOAuthService().registerClient(metadata ?? {}), 201);
  } catch (error) {
    return oauthErrorResponse(error);
  }
}

export async function OPTIONS() {
  return oauthPreflight();
}
