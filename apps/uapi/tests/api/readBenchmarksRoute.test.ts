/**
 * @jest-environment node
 *
 * V49 Gate 5 B-2: GET /api/read/benchmarks returns source-safe descriptors
 * of `.bitcode/benchmarks.json` (never commands), [] when absent, and the
 * rejection reason when the manifest is invalid.
 */

jest.mock('@bitcode/supabase/ssr/server', () => ({ createClient: jest.fn() }));
jest.mock('@/lib/github-repository-rest', () => ({
  resolveGitHubAccessTokenForUser: jest.fn(async () => 'token'),
  readGitHubRepositoryFileTexts: jest.fn(),
}));

import { createClient } from '@bitcode/supabase/ssr/server';
import { readGitHubRepositoryFileTexts } from '@/lib/github-repository-rest';
import { GET } from '@/app/api/read/benchmarks/route';

const mockCreateClient = createClient as jest.Mock;
const mockReadFiles = readGitHubRepositoryFileTexts as jest.Mock;

const manifest = {
  schema: 'bitcode.benchmarks',
  version: 1,
  benchmarks: [
    {
      id: 'parse-throughput',
      title: 'Parser throughput',
      runtime: 'node24',
      setup: 'pnpm install --frozen-lockfile',
      command: 'pnpm bench:parse',
      metric: { source: 'stdout-regex', pattern: 'ops/sec: ([0-9.]+)' },
      direction: 'higher-is-better',
      unit: 'ops/s',
    },
  ],
};

function installSession(user: { id: string } | null) {
  mockCreateClient.mockResolvedValue({ auth: { getUser: async () => ({ data: { user }, error: null }) } });
}

const get = (query: string) => GET(new Request(`http://localhost/api/read/benchmarks?${query}`));

describe('GET /api/read/benchmarks (V49 B-2)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('requires a session and a repository', async () => {
    installSession(null);
    expect((await get('repositoryFullName=acme/demo')).status).toBe(401);
    installSession({ id: 'u1' });
    expect((await get('repositoryFullName=nope')).status).toBe(400);
  });

  it('returns descriptors without commands for a declared manifest', async () => {
    installSession({ id: 'u1' });
    mockReadFiles.mockResolvedValue([{ path: '.bitcode/benchmarks.json', content: JSON.stringify(manifest) }]);
    const response = await get('repositoryFullName=acme/demo&reference=abc123');
    const body = await response.json();
    expect(body).toEqual({
      ok: true,
      manifestStatus: 'declared',
      benchmarks: [{ id: 'parse-throughput', title: 'Parser throughput', unit: 'ops/s', direction: 'higher-is-better' }],
    });
    expect(JSON.stringify(body)).not.toContain('pnpm');
    expect(mockReadFiles).toHaveBeenCalledWith(
      expect.objectContaining({ repositoryFullName: 'acme/demo', ref: 'abc123', paths: ['.bitcode/benchmarks.json'] }),
    );
  });

  it('returns [] when absent and the reason when invalid', async () => {
    installSession({ id: 'u1' });
    mockReadFiles.mockResolvedValueOnce([]);
    await expect((await get('repositoryFullName=acme/demo')).json()).resolves.toEqual({
      ok: true,
      manifestStatus: 'absent',
      benchmarks: [],
    });
    mockReadFiles.mockResolvedValueOnce([
      { path: '.bitcode/benchmarks.json', content: JSON.stringify({ ...manifest, extra: 1 }) },
    ]);
    await expect((await get('repositoryFullName=acme/demo')).json()).resolves.toEqual(
      expect.objectContaining({ manifestStatus: 'invalid', benchmarks: [], manifestError: expect.stringContaining('extra') }),
    );
  });
});
