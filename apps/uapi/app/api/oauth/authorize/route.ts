/**
 * POST /api/oauth/authorize — consent decision from /oauth/authorize (V49 C-3).
 * Same-origin form only; requires the Bitcode session; re-validates the
 * authorization request; Allow → single-use code redirect, Deny →
 * `error=access_denied` redirect.
 */

import { NextResponse } from 'next/server';

import { createClient } from '@bitcode/supabase/ssr/server';

import { bitcodeOrigin, getOAuthService, oauthErrorResponse, oauthJson } from '@/lib/oauth/oauth-http';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const origin = bitcodeOrigin(request);
  const requestOrigin = request.headers.get('origin');
  if (requestOrigin && requestOrigin !== origin && requestOrigin !== new URL(request.url).origin) {
    return oauthJson({ error: 'invalid_request', error_description: 'Cross-origin consent is not allowed.' }, 403);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return oauthJson({ error: 'access_denied', error_description: 'A Bitcode session is required.' }, 401);
  }

  const form = await request.formData();
  const query = new URLSearchParams(String(form.get('query') || ''));
  try {
    const service = getOAuthService();
    const authorizeRequest = await service.validateAuthorizeRequest(query);
    const location =
      form.get('decision') === 'allow'
        ? await service.approve(user.id, authorizeRequest)
        : service.denyRedirect(authorizeRequest);
    return NextResponse.redirect(location, 303);
  } catch (error) {
    return oauthErrorResponse(error);
  }
}
