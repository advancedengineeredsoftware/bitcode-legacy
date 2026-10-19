/**
 * /api/auxillaries/api-keys — stdio MCP API keys (V49 Claude External law C-5).
 * Keys are shown once at issuance and stored only as SHA-256 `key_hash` with
 * `expires_at`, matching the stdio server's verification (apps/mcp auth).
 */

import crypto from 'node:crypto';

import { NextResponse } from 'next/server';

import { authenticateRequest } from '@bitcode/auth';
import { supabaseAdmin } from '@bitcode/supabase';

export const runtime = 'nodejs';

/** SHA-256 hex — the stdio MCP server looks keys up by this hash. */
function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

function isAuthFailure(result: Awaited<ReturnType<typeof authenticateRequest>>): result is Response {
  return result instanceof Response;
}

export async function GET(request: Request) {
  const authResult = await authenticateRequest(request);
  if (isAuthFailure(authResult)) {
    return authResult;
  }

  const { data, error } = await supabaseAdmin
    .from('user_api_keys')
    .select('id, name, expires_at, last_used_at, created_at')
    .eq('user_id', authResult.userId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      expireAt: row.expires_at,
      lastUsedAt: row.last_used_at ?? null,
      createdAt: row.created_at,
    })),
  );
}

export async function POST(request: Request) {
  const authResult = await authenticateRequest(request);
  if (isAuthFailure(authResult)) {
    return authResult;
  }

  let body: { name?: string; expireAt?: string | null } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.name || !body.name.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  if (body.expireAt && Number.isNaN(Date.parse(body.expireAt))) {
    return NextResponse.json({ error: 'expireAt must be an ISO date' }, { status: 400 });
  }

  // Shown once; only the hash is stored.
  const apiKey = crypto.randomBytes(24).toString('hex');
  const { data, error } = await supabaseAdmin
    .from('user_api_keys')
    .insert({
      user_id: authResult.userId,
      name: body.name.trim(),
      key_hash: hashApiKey(apiKey),
      expires_at: body.expireAt || null,
    })
    .select('id')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id, apiKey }, { status: 201 });
}

export async function DELETE(request: Request) {
  const authResult = await authenticateRequest(request);
  if (isAuthFailure(authResult)) {
    return authResult;
  }

  const id = new URL(request.url).searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from('user_api_keys').delete().eq('id', id).eq('user_id', authResult.userId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return new Response(null, { status: 204 });
}
