/**
 * V49 Gate 5 fixture proof: runBenchmarkDeltas on a real LocalHost checkout of
 * `.fixtures/benchmark-repo` measures a positive delta for a DataPack that
 * replaces a linear scan with binary search, and `insufficient_evidence` for a
 * declared benchmark whose command fails.
 */

import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { LocalHost } from '@bitcode/generic-hosts-local';
import { parseBenchmarkManifest } from '@bitcode/generic-measurements-relatives/benchmark-delta';

import { runBenchmarkDeltas, type BenchmarkRunEvent } from '../benchmark-runner';

const FIXTURE = path.resolve(__dirname, '../../../../.fixtures/benchmark-repo');

const BINARY_SEARCH = `// Binary search: one comparison per halving step.
function findIndex(sorted, value, counter) {
  let low = 0;
  let high = sorted.length - 1;
  while (low <= high) {
    counter.steps += 1;
    const mid = (low + high) >> 1;
    if (sorted[mid] === value) return mid;
    if (sorted[mid] < value) low = mid + 1;
    else high = mid - 1;
  }
  return -1;
}

module.exports = { findIndex };
`;

describe('runBenchmarkDeltas (V49 benchmark-delta law)', () => {
  let origin: string;
  let checkouts: string;
  const savedGitEnv: Record<string, string | undefined> = {};

  beforeAll(() => {
    origin = mkdtempSync(path.join(os.tmpdir(), 'bitcode-benchmark-origin-'));
    checkouts = mkdtempSync(path.join(os.tmpdir(), 'bitcode-benchmark-checkouts-'));
    cpSync(FIXTURE, origin, { recursive: true });
    // Never inherit a parent git context (pre-commit hooks export GIT_DIR /
    // GIT_INDEX_FILE): the fixture repo, LocalHost clone, and runner must only
    // ever touch temporary repositories.
    for (const name of Object.keys(process.env)) {
      if (name.startsWith('GIT_')) {
        savedGitEnv[name] = process.env[name];
        delete process.env[name];
      }
    }
    const git = (...args: string[]) =>
      execFileSync(
        'git',
        ['-c', 'user.email=fixture@bitcode.test', '-c', 'user.name=fixture', '-c', 'core.hooksPath=/dev/null', ...args],
        { cwd: origin, env: process.env },
      );
    git('init', '-q', '-b', 'main');
    git('add', '-A');
    git('commit', '-q', '--no-verify', '-m', 'fixture');
  });

  afterAll(() => {
    Object.assign(process.env, savedGitEnv);
    rmSync(origin, { recursive: true, force: true });
    rmSync(checkouts, { recursive: true, force: true });
  });

  it('measures a positive delta, an unparsed json-file metric path, and a failing benchmark', async () => {
    const parsed = parseBenchmarkManifest(readFileSync(path.join(FIXTURE, '.bitcode/benchmarks.json'), 'utf8'));
    if (!parsed.ok) throw new Error(parsed.error);
    const host = new LocalHost({ rootDir: checkouts });
    const events: BenchmarkRunEvent[] = [];

    const receipt = await runBenchmarkDeltas({
      benchmarks: parsed.manifest.benchmarks,
      options: [
        { optionKey: '0', fileChanges: [{ path: 'src/lookup.js', op: 'modify', content: BINARY_SEARCH }] },
        { optionKey: '1', fileChanges: [{ path: 'docs/notes.md', op: 'create', content: '# unrelated\n' }] },
        { optionKey: '2', fileChanges: [{ path: 'src/lookup.js', op: 'modify' }] },
      ],
      provisionWorkspace: () =>
        host.provisionRepository({
          repositoryFullName: 'fixture/benchmark-repo',
          url: `file://${origin}`,
          revision: 'main',
          branch: 'main',
        }),
      budgetMs: 120_000,
      onEvent: (event) => events.push(event),
    });

    const byKind = (key: string, kind: string) => receipt.rowsByOption[key]!.find((row) => row.measurementKind === kind)!;

    const faster = byKind('0', 'benchmark-delta:lookup-steps');
    expect(faster.status).toBe('measured');
    expect(faster.benchmark.baseline).toBeGreaterThan(faster.benchmark.candidate!);
    expect(faster.benchmark.improvementRatio!).toBeGreaterThan(0.5);
    expect(faster.volume).toBe(1);
    expect(faster.magnitude).toBeGreaterThan(50);

    const report = byKind('0', 'benchmark-delta:lookup-report');
    expect(report.status).toBe('measured');
    expect(report.benchmark.samples.candidate).toHaveLength(2);
    expect(report.benchmark.candidate).toBe(faster.benchmark.candidate);

    const neutral = byKind('1', 'benchmark-delta:lookup-steps');
    expect(neutral).toEqual(expect.objectContaining({ status: 'measured', volume: 0.5, magnitude: 0 }));

    expect(byKind('2', 'benchmark-delta:lookup-steps')).toEqual(
      expect.objectContaining({ status: 'insufficient_evidence', failureClass: 'no_patch_bodies', weight: 0 }),
    );

    for (const key of ['0', '1', '2']) {
      expect(byKind(key, 'benchmark-delta:render-throughput')).toEqual(
        expect.objectContaining({ status: 'insufficient_evidence', failureClass: 'baseline_failed', weight: 0, volume: 0.5 }),
      );
    }

    // Source-safe receipt: parsed samples only, never command output.
    expect(JSON.stringify(receipt)).not.toMatch(/Cannot find module|MODULE_NOT_FOUND|node:internal|requireStack/);
    expect(JSON.stringify(receipt)).not.toContain(origin);
    expect(events.some((event) => event.type === 'workspace' && event.ok)).toBe(true);
  }, 120_000);

  it('marks runs not_run once the budget is exhausted', async () => {
    const parsed = parseBenchmarkManifest(readFileSync(path.join(FIXTURE, '.bitcode/benchmarks.json'), 'utf8'));
    if (!parsed.ok) throw new Error(parsed.error);
    let clock = 0;
    const receipt = await runBenchmarkDeltas({
      benchmarks: parsed.manifest.benchmarks.slice(0, 1),
      options: [{ optionKey: '0', fileChanges: [{ path: 'src/lookup.js', content: BINARY_SEARCH }] }],
      provisionWorkspace: async () => {
        clock = 10_000;
        throw new Error('unreachable');
      },
      budgetMs: 5_000,
      now: () => clock,
    });
    expect(receipt.rowsByOption['0']![0]).toEqual(expect.objectContaining({ failureClass: 'workspace_failed' }));

    const exhausted = await runBenchmarkDeltas({
      benchmarks: parsed.manifest.benchmarks.slice(0, 1),
      options: [{ optionKey: '0', fileChanges: [{ path: 'src/lookup.js', content: BINARY_SEARCH }] }],
      provisionWorkspace: async () => {
        throw new Error('should not provision');
      },
      budgetMs: 1,
      now: (() => {
        let t = 0;
        return () => (t += 10);
      })(),
    });
    expect(exhausted.rowsByOption['0']![0]).toEqual(expect.objectContaining({ status: 'not_run', failureClass: 'budget_exhausted' }));
  });
});
