/**
 * @jest-environment node
 *
 * Demonstration synthesis runners — replay telemetry through the host bridge,
 * bind provenance to the real checkout, honor cooperative cancel, and (read)
 * run the REAL read Finish agent: unpaid browser options carry no patch or
 * seller provenance, server fullOptions keep both for settle rehydrate.
 */

jest.mock('@bitcode/supabase', () => ({
  supabaseAdmin: { from: jest.fn() },
}));

jest.mock('@/lib/github-repository-rest', () => ({
  resolveGitHubAccessTokenForUser: jest.fn(async () => 'installation-token'),
  listGitHubRepositoryTreePaths: jest.fn(async () => [
    'README.md',
    'package.json',
    'src/server/webhooks/stripe.ts',
    'src/lib/http.ts',
    'src/audit/events.ts',
    'secret/keys.ts',
  ]),
  readGitHubRepositoryLanguage: jest.fn(async () => 'TypeScript'),
}));

jest.mock('@/lib/deposit-host-telemetry-bridge', () => ({
  bridgeHostTelemetryArtifactToExecutionStream: jest.fn(() => true),
}));

import { supabaseAdmin } from '@bitcode/supabase';
import { Execution } from '@bitcode/execution-generics';
import { unpaidOptionContainsForbiddenFields } from '@bitcode/asset-packs-pipelines-syntheses-domain/unpaid-option-disclosure';
import { bridgeHostTelemetryArtifactToExecutionStream } from '@/lib/deposit-host-telemetry-bridge';
import {
  runDemonstrationDepositSynthesis,
  runDemonstrationReadSynthesis,
} from '@/lib/demonstration-synthesis';

const mockFrom = supabaseAdmin.from as jest.Mock;
const mockBridge = bridgeHostTelemetryArtifactToExecutionStream as jest.Mock;

function installExecutions(options: { status?: string } = {}) {
  mockFrom.mockImplementation(() => {
    const chain: any = {
      select: () => chain,
      eq: () => chain,
      order: () => chain,
      // Admitted Depository rows (seller supply).
      limit: async () => ({
        data: [
          {
            id: 'admit-webhooks',
            user_id: 'seller-1',
            output: { assetPackTitle: 'Idempotent webhook ingestion with HMAC verification' },
            context: { depositoryAssetPackId: 'dp-webhooks', repositoryFullName: 'seller/api' },
          },
        ],
        error: null,
      }),
      // Cooperative cancel poll.
      maybeSingle: async () => ({ data: { status: options.status ?? 'running' }, error: null }),
    };
    return chain;
  });
}

const base = {
  runId: 'run-1',
  executionId: 'run-1',
  repositoryFullName: 'acme/payments',
  reference: 'a'.repeat(40),
  emitStatus: jest.fn(),
};

describe('demonstration synthesis runners', () => {
  const env = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...env, BITCODE_DEMONSTRATION_PACE: '0' };
    installExecutions();
  });

  afterAll(() => {
    process.env = env;
  });

  it('deposit: replays telemetry and returns options bound to the in-scope checkout', async () => {
    const result = await runDemonstrationDepositSynthesis({
      ...base,
      accessToken: 'installation-token',
      permissibleSources: [],
      impermissibleSources: ['secret/'],
      depositorySupplyCount: 4,
    });
    expect(result.options).toHaveLength(4);
    expect(result.sourceCatalog.paths).not.toContain('secret/keys.ts');
    expect(result.sourceCatalog.excludedPathCount).toBe(1);
    for (const option of result.options) {
      expect(option.coveredSourcePaths.every((p) => result.sourceCatalog.paths.includes(p))).toBe(true);
    }
    expect(mockBridge.mock.calls.length).toBeGreaterThan(40);
    expect(mockBridge.mock.calls.every(([executionId]) => executionId === 'run-1')).toBe(true);
    expect(base.emitStatus).toHaveBeenCalledWith(expect.stringMatching(/^Demonstration mode/));
  });

  it('read: runs the real Finish projection with seller linkage server-side only', async () => {
    const execution = new Execution('pipeline:read:run-1');
    const result = await runDemonstrationReadSynthesis({
      ...base,
      userId: 'buyer-1',
      execution,
      sourceBranch: 'main',
      need: 'Stripe webhook retries double-charge customers; verify the HMAC signature and dedupe deliveries.',
      relevantPaths: [],
      irrelevantPaths: [],
    });

    expect(result.options).toHaveLength(4);
    expect(result.options[0].title).toMatch(/webhook/i);
    expect(unpaidOptionContainsForbiddenFields(result.options)).toBe(false);
    expect(JSON.stringify(result.options)).not.toContain('seller-1');

    const webhooks = result.fullOptions.find((o: any) => /webhook/i.test(o.title));
    expect(webhooks.patch.fileChanges.length).toBeGreaterThan(0);
    expect(webhooks.supplyProvenance).toEqual(
      expect.objectContaining({ sellerUserId: 'seller-1', depositoryAssetPackId: 'dp-webhooks' }),
    );
    expect(result.fullOptions.filter((o: any) => o.supplyProvenance === null)).toHaveLength(3);
    expect(result.selectionEnvelope).toEqual(expect.objectContaining({ repositoryFullName: 'acme/payments' }));
  });

  it('stops cooperatively when the run is cancelled', async () => {
    installExecutions({ status: 'cancelled' });
    await expect(
      runDemonstrationDepositSynthesis({
        ...base,
        accessToken: 'installation-token',
        permissibleSources: [],
        impermissibleSources: [],
        depositorySupplyCount: 0,
      }),
    ).rejects.toMatchObject({ name: 'ExecutionCancelledError' });
  });
});
