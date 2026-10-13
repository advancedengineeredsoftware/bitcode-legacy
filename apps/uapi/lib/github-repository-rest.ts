/**
 * Minimal GitHub REST reads for the GitHub App installation token:
 * - installation token resolution (refreshing expired tokens) for a user,
 * - branch HEAD SHA (settle PR ships from the request SHA),
 * - recursive tree paths + primary language (request checkout catalog for
 *   demonstration synthesis provenance and needinesses).
 *
 * Fail-soft: every read returns null / [] on error so callers keep their own
 * fail-closed posture (e.g. settle records a projected ship without a SHA).
 */

import { GitHubService, type GitHubConnectionData } from '@bitcode/api/src/vcs/github-service';
import { supabaseAdmin } from '@bitcode/supabase';

const GITHUB_API = 'https://api.github.com';
const REQUEST_TIMEOUT_MS = 10_000;

/** Fresh installation access token for the user's active GitHub connection. */
export async function resolveGitHubAccessTokenForUser(
  userId: string,
  admin: typeof supabaseAdmin = supabaseAdmin,
): Promise<string | null> {
  try {
    const { data } = await admin
      .from('user_connections')
      .select('connection_data')
      .eq('user_id', userId)
      .eq('provider', 'github')
      .eq('is_active', true)
      .maybeSingle();
    if (!data?.connection_data) return null;
    const auth = await GitHubService.getValidAuth(
      data.connection_data as GitHubConnectionData,
      userId,
      admin,
    );
    return auth.accessToken || null;
  } catch {
    return null;
  }
}

function splitFullName(repositoryFullName: string): [string, string] | null {
  const [owner, name] = repositoryFullName.split('/');
  return owner && name ? [owner, name] : null;
}

async function githubGet(token: string, path: string, accept = 'application/vnd.github+json') {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(`${GITHUB_API}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: accept,
        'X-GitHub-Api-Version': '2022-11-28',
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

/** Resolve a branch (or any ref) to its commit SHA. */
export async function resolveGitHubCommitSha(input: {
  token: string;
  repositoryFullName: string;
  ref: string;
}): Promise<string | null> {
  const parts = splitFullName(input.repositoryFullName);
  if (!parts) return null;
  try {
    const res = await githubGet(
      input.token,
      `/repos/${parts[0]}/${parts[1]}/commits/${encodeURIComponent(input.ref)}`,
      'application/vnd.github.sha',
    );
    if (!res.ok) return null;
    const sha = (await res.text()).trim();
    return /^[0-9a-f]{40}$/i.test(sha) ? sha : null;
  } catch {
    return null;
  }
}

/** Blob paths of the repository tree at `ref` (truncated trees return what GitHub sent). */
export async function listGitHubRepositoryTreePaths(input: {
  token: string;
  repositoryFullName: string;
  ref: string;
  limit?: number;
}): Promise<string[]> {
  const parts = splitFullName(input.repositoryFullName);
  if (!parts) return [];
  try {
    const res = await githubGet(
      input.token,
      `/repos/${parts[0]}/${parts[1]}/git/trees/${encodeURIComponent(input.ref)}?recursive=1`,
    );
    if (!res.ok) return [];
    const body = (await res.json()) as { tree?: Array<{ path?: string; type?: string }> };
    return (body.tree || [])
      .filter((entry) => entry.type === 'blob' && typeof entry.path === 'string')
      .map((entry) => entry.path as string)
      .slice(0, input.limit ?? 5_000);
  } catch {
    return [];
  }
}

/** Primary language GitHub reports for the repository. */
export async function readGitHubRepositoryLanguage(input: {
  token: string;
  repositoryFullName: string;
}): Promise<string | null> {
  const parts = splitFullName(input.repositoryFullName);
  if (!parts) return null;
  try {
    const res = await githubGet(input.token, `/repos/${parts[0]}/${parts[1]}`);
    if (!res.ok) return null;
    const body = (await res.json()) as { language?: unknown };
    return typeof body.language === 'string' ? body.language : null;
  } catch {
    return null;
  }
}
