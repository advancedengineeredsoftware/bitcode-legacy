/**
 * GET /api/read/benchmarks?repositoryFullName&reference (V49 benchmark-delta law B-2).
 *
 * Reads `.bitcode/benchmarks.json` at the reference over the reader's GitHub
 * token, validates it fail-closed, and returns source-safe descriptors
 * (`id`, `title`, `unit`, `direction`) — never commands — or `[]`.
 */

import { NextResponse } from 'next/server';

import { createClient } from '@bitcode/supabase/ssr/server';

import { resolveGitHubAccessTokenForUser } from '@/lib/github-repository-rest';
import { describeReadBenchmarks, loadReadBenchmarkManifest } from '@/lib/read-benchmarks';

export const runtime = 'nodejs';

const REPOSITORY_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (!user || userError) {
    return NextResponse.json(
      { ok: false, error: 'A Bitcode session is required.', code: 'read_session_required' },
      { status: 401 },
    );
  }

  const url = new URL(request.url);
  const repositoryFullName = (url.searchParams.get('repositoryFullName') || '').trim();
  const reference = (url.searchParams.get('reference') || '').trim() || 'HEAD';
  if (!REPOSITORY_PATTERN.test(repositoryFullName)) {
    return NextResponse.json(
      { ok: false, error: 'repositoryFullName (owner/name) is required.', code: 'repository_required' },
      { status: 400 },
    );
  }

  const load = await loadReadBenchmarkManifest({
    token: await resolveGitHubAccessTokenForUser(user.id),
    repositoryFullName,
    reference,
  });
  return NextResponse.json({
    ok: true,
    manifestStatus: load.status,
    ...(load.status === 'invalid' ? { manifestError: load.error } : {}),
    benchmarks: describeReadBenchmarks(load),
  });
}
