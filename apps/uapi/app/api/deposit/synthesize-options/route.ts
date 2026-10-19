/**
 * POST /api/deposit/synthesize-options — thin dispatch surface.
 *
 * Auth + JSON body, then the session-free dispatch core
 * (start-deposit-synthesis.ts): ownership, steering parse, run-id conflict
 * guard, dispatch-context upsert, streaming execution, waitUntil background
 * synthesis. Orchestration lives in dispatch-deposit-synthesis.ts.
 */

import { NextResponse } from 'next/server';

import { createClient } from '@bitcode/supabase/ssr/server';
import type { SynthesizeOptionsBody } from './parse-synthesize-options-body';
import { startDepositSynthesisForUser } from './start-deposit-synthesis';

export const runtime = 'nodejs';
// Full-repo deposit synthesis regularly exceeds 5 minutes of LLM work.
// Vercel waitUntil is capped by maxDuration — keep high for deposit monorepos.
// Host in-box budget is pinned below this (see pipeline-host-command-env) so
// artifact read + sandbox teardown still fit after PipelineHostTimeoutError.
export const maxDuration = 900;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (!user || userError) {
    return NextResponse.json(
      { error: 'A Bitcode session is required for deposit option synthesis.', code: 'deposit_session_required' },
      { status: 401 },
    );
  }

  let body: SynthesizeOptionsBody;
  try {
    body = (await request.json()) as SynthesizeOptionsBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const result = await startDepositSynthesisForUser({ userId: user.id, body });
  return NextResponse.json(result.body, { status: result.status });
}
