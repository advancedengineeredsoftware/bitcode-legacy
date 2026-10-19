/**
 * POST /api/read/synthesize-options — thin dispatch surface (deposit twin).
 *
 * Auth + JSON body, then the session-free dispatch core
 * (start-read-synthesis.ts): validate Evaluation + repository → create
 * execution → waitUntil ExecutionPipelineSDIVFSynthesizeReadAssetPacks.
 * Settlement is a separate pipeline.
 */

import { NextResponse } from 'next/server';

import { createClient } from '@bitcode/supabase/ssr/server';
import { startReadSynthesisForUser } from './start-read-synthesis';

export const runtime = 'nodejs';
// Align with deposit: long SDIVF + Host work; waitUntil is capped by maxDuration.
export const maxDuration = 900;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (!user || userError) {
    return NextResponse.json(
      { error: 'A Bitcode session is required for read option synthesis.', code: 'read_session_required' },
      { status: 401 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const result = await startReadSynthesisForUser({ userId: user.id, body });
  return NextResponse.json(result.body, { status: result.status });
}
