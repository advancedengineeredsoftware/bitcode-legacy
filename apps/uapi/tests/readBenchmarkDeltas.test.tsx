/**
 * V49 Gate 5: benchmark-delta Relatives on /reads.
 * - lib: selection union, row join + re-massed evaluation-fit, unpaid projection;
 *   end-to-end on a LocalHost checkout of `.fixtures/benchmark-repo`.
 * - presentation: baseline → candidate formatting and option-card rows.
 * - picker: declared benchmarks render as checkboxes and ride the request.
 */

import React from 'react';
import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fireEvent, render, screen } from '@testing-library/react';

jest.mock('@/lib/github-repository-rest', () => ({
  readGitHubRepositoryFileTexts: jest.fn(),
}));

import { LocalHost } from '@bitcode/pipeline-hosts';
import { parseBenchmarkManifest } from '@bitcode/generic-measurements-relatives/benchmark-delta';
import { unpaidOptionContainsForbiddenFields } from '@bitcode/asset-packs-pipelines-syntheses-domain/unpaid-option-disclosure';
import { readGitHubRepositoryFileTexts } from '@/lib/github-repository-rest';
import {
  applyBenchmarkRowsToReadOptions,
  loadReadBenchmarkManifest,
  measureReadOptionBenchmarks,
  selectReadBenchmarks,
} from '@/lib/read-benchmarks';
import { formatBenchmarkDelta } from '@/components/reads/models/read-benchmark-presentation';
import {
  benchmarkSelectionRequestField,
  readBenchmarkSelectionScope,
} from '@/components/reads/models/read-benchmark-selection';
import { ReadsEvaluationBenchmarkPicker } from '@/components/reads/ReadsEvaluationBenchmarkPicker/ReadsEvaluationBenchmarkPicker';
import { ReadsOptionCard } from '@/components/reads/ReadsOptionCard/ReadsOptionCard';

const FIXTURE = path.resolve(__dirname, '../../../.fixtures/benchmark-repo');
const manifestText = require('node:fs').readFileSync(path.join(FIXTURE, '.bitcode/benchmarks.json'), 'utf8');
const parsed = parseBenchmarkManifest(manifestText);
if (!parsed.ok) throw new Error(parsed.error);
const manifest = parsed.manifest;

const staticRelatives = [
  { measurementKind: 'language-fit', volume: 0.6, weight: 0.35, category: 'relative' },
  { measurementKind: 'domain-fit', volume: 0.6, weight: 0.35, category: 'relative' },
  { measurementKind: 'interface-fit', volume: 0.6, weight: 0.3, category: 'relative' },
];

const BINARY_SEARCH = `function findIndex(sorted, value, counter) {
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

describe('read benchmark selection and manifest load (V49 B-1/B-2)', () => {
  it('loads the declared manifest over GitHub and fails closed on invalid JSON', async () => {
    (readGitHubRepositoryFileTexts as jest.Mock).mockResolvedValueOnce([{ path: '.bitcode/benchmarks.json', content: manifestText }]);
    await expect(loadReadBenchmarkManifest({ token: 't', repositoryFullName: 'a/b', reference: 'sha' })).resolves.toEqual(
      expect.objectContaining({ status: 'declared' }),
    );
    (readGitHubRepositoryFileTexts as jest.Mock).mockResolvedValueOnce([{ path: '.bitcode/benchmarks.json', content: '{"schema":1' }]);
    await expect(loadReadBenchmarkManifest({ token: 't', repositoryFullName: 'a/b', reference: 'sha' })).resolves.toEqual(
      expect.objectContaining({ status: 'invalid' }),
    );
    (readGitHubRepositoryFileTexts as jest.Mock).mockResolvedValueOnce([]);
    await expect(loadReadBenchmarkManifest({ token: 't', repositoryFullName: 'a/b', reference: 'sha' })).resolves.toEqual({
      status: 'absent',
    });
  });

  it('unions checked, synthesized, and Evaluation-named ids, restricted to declared', () => {
    const selected = selectReadBenchmarks({
      manifest,
      requestedIds: ['lookup-report', 'invented'],
      synthesizedIds: ['not-declared'],
      evaluation: 'Please reduce lookup steps in the hot path.',
    });
    expect(selected.map((benchmark) => benchmark.id)).toEqual(['lookup-steps', 'lookup-report']);
    expect(selectReadBenchmarks({ manifest, evaluation: 'unrelated' })).toEqual([]);
  });

  it('joins rows, re-masses relatives, and recomputes evaluation-fit', () => {
    const [option] = applyBenchmarkRowsToReadOptions(
      [{ index: 0, measurements: { absolutes: [], relatives: staticRelatives }, evaluationFit: 0.6 }],
      {
        '0': [
          {
            measurementKind: 'benchmark-delta:lookup-steps',
            label: 'Lookup steps',
            weight: 1,
            volume: 1,
            magnitude: 99,
            unit: 'steps',
            category: 'relative',
            propertyClass: 'benchmark-delta',
            status: 'measured',
            rationale: 'x',
            benchmark: {
              benchmarkId: 'lookup-steps',
              baseline: 100,
              candidate: 1,
              unit: 'steps',
              direction: 'lower-is-better',
              samples: { baseline: [100], candidate: [1] },
              improvementRatio: 0.99,
            },
          },
        ],
      },
    );
    // static + benchmark → 0.6 × 0.6 + 0.4 × 1
    expect(option!.evaluationFit).toBeCloseTo(0.76);
    const weights = (option!.measurements as { relatives: Array<{ weight: number }> }).relatives.map((row) => row.weight);
    expect(weights.reduce((sum, weight) => sum + weight, 0)).toBeCloseTo(1);
  });
});

describe('measureReadOptionBenchmarks on a LocalHost fixture checkout (V49 B-3/B-6)', () => {
  let origin: string;
  let checkouts: string;
  const savedGitEnv: Record<string, string | undefined> = {};

  beforeAll(() => {
    origin = mkdtempSync(path.join(os.tmpdir(), 'bitcode-uapi-benchmark-origin-'));
    checkouts = mkdtempSync(path.join(os.tmpdir(), 'bitcode-uapi-benchmark-checkouts-'));
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

  it('measures a positive delta and an insufficient_evidence failure, then projects unpaid safely', async () => {
    const host = new LocalHost({ rootDir: checkouts });
    const result = await measureReadOptionBenchmarks({
      benchmarks: manifest.benchmarks.filter((benchmark) => benchmark.id !== 'lookup-report'),
      fullOptions: [
        {
          index: 0,
          title: 'Binary search lookup',
          summary: 'Replace the linear scan.',
          patch: { fileChanges: [{ path: 'src/lookup.js', op: 'modify', content: BINARY_SEARCH }], patchSummary: 'swap scan' },
          coveredSourcePaths: ['src/lookup.js'],
          measurements: { absolutes: [], relatives: staticRelatives },
          evaluationFit: 0.6,
        },
      ],
      repositoryFullName: 'fixture/benchmark-repo',
      reference: 'main',
      token: null,
      hostFactory: async () => ({
        capabilities: host.capabilities,
        provisionRepository: (source) =>
          host.provisionRepository({ ...source, url: `file://${origin}`, branch: 'main' }),
      }),
    });

    const relatives = (result.fullOptions[0]!.measurements as { relatives: Array<Record<string, any>> }).relatives;
    const steps = relatives.find((row) => row.measurementKind === 'benchmark-delta:lookup-steps')!;
    const render = relatives.find((row) => row.measurementKind === 'benchmark-delta:render-throughput')!;
    expect(steps).toEqual(expect.objectContaining({ status: 'measured', volume: 1 }));
    expect(render).toEqual(expect.objectContaining({ status: 'insufficient_evidence', weight: 0 }));
    // Failed benchmark carries no mass: static 0.6 + measured benchmark 0.4.
    expect(result.fullOptions[0]!.evaluationFit).toBeCloseTo(0.76);

    const unpaid = result.unpaidOptions[0]!;
    expect(unpaidOptionContainsForbiddenFields(unpaid)).toBe(false);
    expect(unpaid.evaluationFit).toBeCloseTo(0.76);
    expect(JSON.stringify(unpaid)).not.toContain('src/lookup.js');
    expect(result.receipt).toEqual(
      expect.objectContaining({ benchmarkIds: ['lookup-steps', 'render-throughput'], schema: 'bitcode.read.benchmark-run-receipt' }),
    );
    expect(result.receipt).not.toHaveProperty('rowsByOption');
  }, 120_000);
});

describe('benchmark presentation (V49 B-5)', () => {
  it('formats baseline → candidate with signed percent, or a no-weight note', () => {
    expect(
      formatBenchmarkDelta({
        status: 'measured',
        benchmark: { baseline: 330186, candidate: 2129, unit: 'steps', improvementRatio: 0.99355 },
      }),
    ).toBe('330,186 steps → 2,129 steps (+99.4%)');
    expect(formatBenchmarkDelta({ status: 'insufficient_evidence', benchmark: null })).toBe('insufficient evidence — no weight');
    expect(formatBenchmarkDelta({ status: 'not_run' })).toBe('not run (benchmark budget exhausted)');
  });

  it('renders benchmark rows under Relative on the option card', () => {
    render(
      <ReadsOptionCard
        option={{
          index: 0,
          title: 'Binary search lookup',
          summary: 'Replace the linear scan.',
          evaluationFit: 0.76,
          measurements: {
            absolutes: [],
            relatives: [
              ...staticRelatives,
              {
                measurementKind: 'benchmark-delta:lookup-steps',
                label: 'Lookup steps',
                volume: 1,
                status: 'measured',
                benchmark: { baseline: 100, candidate: 10, unit: 'steps', improvementRatio: 0.9 },
              },
            ],
          },
        } as never}
        selected={false}
        onToggleSelect={() => undefined}
      />,
    );
    const rows = screen.getAllByTestId('reads-option-benchmark-delta-row');
    expect(rows).toHaveLength(1);
    expect(rows[0]!.textContent).toContain('Lookup steps');
    expect(rows[0]!.textContent).toContain('100 steps → 10 steps (+90.0%)');
  });
});

describe('benchmark picker (V49 B-2)', () => {
  it('lists declared benchmarks and carries checked ids on the synthesize request', async () => {
    (global as unknown as { fetch: unknown }).fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        ok: true,
        manifestStatus: 'declared',
        benchmarks: [{ id: 'lookup-steps', title: 'Lookup steps', unit: 'steps', direction: 'lower-is-better' }],
      }),
    }));
    const repositoryContext = {
      selectedRepository: { fullName: 'acme/demo' },
      selectedCommit: 'abc123',
    } as never;
    render(<ReadsEvaluationBenchmarkPicker repositoryContext={repositoryContext} />);
    const box = await screen.findByTestId('reads-evaluation-benchmark-lookup-steps');
    fireEvent.click(box);
    expect(benchmarkSelectionRequestField(readBenchmarkSelectionScope('acme/demo', 'abc123'))).toEqual({
      benchmarkIds: ['lookup-steps'],
    });
    expect(benchmarkSelectionRequestField(readBenchmarkSelectionScope('acme/demo', 'other'))).toEqual({});
  });
});
