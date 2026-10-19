/**
 * /api/auxillaries/claude — Claude External card (V49 Claude External law C-4).
 * GET: connector URL, connection state, and active grants (client, scopes,
 * last used). DELETE ?clientId=: revoke every grant given to that client.
 */

import { NextResponse } from 'next/server';

import { createClient } from '@bitcode/supabase/ssr/server';

import { bitcodeOrigin, getOAuthService, mcpResourceUrl } from '@/lib/oauth/oauth-http';

export const runtime = 'nodejs';

async function sessionUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function GET(request: Request) {
  const userId = await sessionUserId();
  if (!userId) return NextResponse.json({ ok: false, error: 'A Bitcode session is required.' }, { status: 401 });
  const grants = await getOAuthService().listGrants(userId);
  const connectorUrl = mcpResourceUrl(bitcodeOrigin(request));
  return NextResponse.json({
    ok: true,
    connectorUrl,
    claudeCodeCommand: `claude mcp add --transport http bitcode ${connectorUrl}`,
    connected: grants.length > 0,
    grants,
  });
}

export async function DELETE(request: Request) {
  const userId = await sessionUserId();
  if (!userId) return NextResponse.json({ ok: false, error: 'A Bitcode session is required.' }, { status: 401 });
  const clientId = new URL(request.url).searchParams.get('clientId');
  if (!clientId) return NextResponse.json({ ok: false, error: 'clientId is required.' }, { status: 400 });
  await getOAuthService().revokeClientForUser(userId, clientId);
  return NextResponse.json({ ok: true });
}
