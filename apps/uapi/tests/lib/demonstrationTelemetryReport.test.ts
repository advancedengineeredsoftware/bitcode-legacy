/**
 * @jest-environment node
 *
 * A demonstration deposit replay must read as a COMPLETE run in the
 * /deposits "Telemetry · Gate 4 Deposit" report: every SDIVF phase, all four
 * Implementation agents, an approved readyToFinish verdict with quality, and
 * presentable options with commercial briefs + bound bodies. Drives the real
 * telemetry bridge → run-activity model → Gate 4 report.
 */

const captured: Array<Record<string, unknown>> = [];

jest.mock('@bitcode/execution-generics', () => {
  const actual = jest.requireActual('@bitcode/execution-generics');
  return {
    ...actual,
    ExecutionStreamAdapter: {
      ...actual.ExecutionStreamAdapter,
      emitEvent: jest.fn(async (executionId: string, type: string, data: Record<string, unknown>) => {
        captured.push({ type, executionId, timestamp: new Date().toISOString(), ...data });
      }),
    },
  };
});

jest.mock('@bitcode/supabase', () => ({
  supabaseAdmin: {
    from: jest.fn(() => {
      const chain: any = {
        select: () => chain,
        eq: () => chain,
        order: () => chain,
        limit: async () => ({ data: [], error: null }),
        maybeSingle: async () => ({ data: { status: 'running' }, error: null }),
      };
      return chain;
    }),
  },
}));

jest.mock('@/lib/github-repository-rest', () => ({
  resolveGitHubAccessTokenForUser: jest.fn(async () => 'installation-token'),
  listGitHubRepositoryTreePaths: jest.fn(async () => ['README.md', 'apps/uapi/lib/http.ts', 'packages/btd/src/journal.ts']),
  readGitHubRepositoryLanguage: jest.fn(async () => 'TypeScript'),
}));

import { validateDepositSynthesisOptions } from '@bitcode/asset-packs-pipelines-syntheses-domain/asset-packs-synthesis';
import { buildRealDepositAssetPackOptionSynthesis } from '@bitcode/asset-packs-pipelines-execution-pipeline-sdivf-synthesize-deposits-asset-packs/deposit-option-real-synthesis';
import { runDemonstrationDepositSynthesis } from '@/lib/demonstration-synthesis';
import { buildPipelineRunActivityFromEvents } from '@/components/bitcode/pipeline/models/pipeline-run-activity';
import { buildDepositQaTelemetryReport } from '@/components/deposits/models/deposit-qa-telemetry';

describe('demonstration deposit replay → Gate 4 telemetry report', () => {
  const env = process.env;
  beforeAll(() => {
    process.env = { ...env, BITCODE_DEMONSTRATION_PACE: '0' };
  });
  afterAll(() => {
    process.env = env;
  });

  it('reads as a complete, approved, presentable run', async () => {
    const demo = await runDemonstrationDepositSynthesis({
      runId: 'run-1',
      executionId: 'run-1',
      repositoryFullName: 'advancedengineeredsoftware/Bitcode',
      reference: '21d42c6',
      accessToken: 'installation-token',
      permissibleSources: [],
      impermissibleSources: [],
      depositorySupplyCount: 26,
      emitStatus: jest.fn(),
    });
    // Let fire-and-forget bridge emits settle.
    await new Promise((resolve) => setImmediate(resolve));

    const events = captured.map((event, index) => ({
      id: String(index),
      created_at: new Date(1_760_000_000_000 + index * 500).toISOString(),
      event,
    }));
    const activity = buildPipelineRunActivityFromEvents(events, null, [], null);

    const validated = validateDepositSynthesisOptions(demo.options, {
      lens: 'deposit',
      inventoryPaths: demo.sourceCatalog.paths,
      impermissibleSources: [],
      candidateKinds: ['capability-slice', 'implementation-pattern', 'proof-operations-slice'],
    });
    const { synthesis } = buildRealDepositAssetPackOptionSynthesis(
      { repositoryFullName: 'advancedengineeredsoftware/Bitcode', sourceBranch: 'main', sourceCommit: '21d42c6', createdAt: '2026-10-13T00:00:00.000Z' },
      {
        lens: 'deposit',
        candidates: validated.candidates,
        droppedCandidateCount: 0,
        exclusionViolations: [],
        inference: { provider: null, model: null, totalTokens: null, durationMs: 1 },
      },
      demo.sourceCatalog,
    );

    const report = buildDepositQaTelemetryReport({
      runId: 'run-1',
      status: 'completed',
      activity,
      events,
      options: synthesis.options,
    });

    expect(report.continuum.phasesMissing).toEqual([]);
    expect(report.continuum.implementationAgentsMissing).toEqual([]);
    expect(report.readiness).toEqual(
      expect.objectContaining({ verdictCount: 1, latestApproved: true, latestQualityScore: 0.86 }),
    );
    expect(report.options).toEqual(
      expect.objectContaining({ optionCount: 4, presentableCount: 4, commercialBriefCount: 4, bodyCompleteCount: 4 }),
    );
    expect(activity.generationCount).toBeGreaterThan(30);
  });
});
