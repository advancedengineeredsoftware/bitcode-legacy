/**
 * Demonstration synthesis — catalog DataPacks must flow through the REAL
 * deposit validation/projection and read option law, with honest measurement
 * status, path-law-respecting provenance, and a well-formed SDIVF replay.
 */

jest.mock('../asset-packs-synthesis-pipeline', () => ({
  synthesizeAssetPackCandidatesFormal: jest.fn(),
}));

import { DATA_PACK_ABSOLUTES_CATALOG } from '@bitcode/generic-measurements-domain-data-pack-absolutes-catalog';

import { validateDepositSynthesisOptions } from '../asset-packs-synthesis';
import { buildRealDepositAssetPackOptionSynthesis } from '../../../deposit/src/deposit-option-real-synthesis';
import { assertDepositAssetPackOptionSynthesisSourceSafe } from '../../../deposit/src/deposit-asset-pack-options';
import {
  DEMONSTRATION_DATA_PACK_CATALOG,
  DEMONSTRATION_DATASET,
  DEMONSTRATION_DEPOSIT_OPTION_COUNT,
  scopeExecutionRowsToActiveDataset,
  scopeExecutionsQueryToActiveDataset,
  withDemonstrationDataset,
  DEMONSTRATION_READ_OPTION_COUNT,
  bindDemonstrationCoveredSourcePaths,
  buildDemonstrationDepositRawOptions,
  buildDemonstrationExecutionPipelineSDIVFTelemetryScript,
  buildDemonstrationReadImplementationOptions,
  findDemonstrationDataPackByTitle,
  isBitcodeDemonstrationModeEnabled,
  measureDemonstrationDataPackAbsolutes,
  measureDemonstrationDataPackStructure,
  demonstrationOpeningBtdForWallet,
  rankDemonstrationPacksForCheckout,
  readDemonstrationAccountAddress,
  readDemonstrationPaceFactor,
} from '../demonstration';

const CHECKOUT_PATHS = [
  'README.md',
  'package.json',
  'src/api/http-client.ts',
  'src/api/routes/webhooks.ts',
  'src/server/audit-events.ts',
  'src/lib/retry.ts',
  'secret/keys.ts',
  'node_modules/left-pad/index.js',
];

describe('demonstration mode flag', () => {
  it('is opt-in and accepts common truthy spellings', () => {
    expect(isBitcodeDemonstrationModeEnabled({})).toBe(false);
    expect(isBitcodeDemonstrationModeEnabled({ BITCODE_DEMONSTRATION_MODE: '0' })).toBe(false);
    expect(isBitcodeDemonstrationModeEnabled({ BITCODE_DEMONSTRATION_MODE: '1' })).toBe(true);
    expect(isBitcodeDemonstrationModeEnabled({ BITCODE_DEMONSTRATION_MODE: 'true' })).toBe(true);
  });

  it('gives only the configured demonstration account an opening BTD balance', () => {
    const account = '0xCC9d9412FA5D24CE9D9af0a1BF8E6401177092DE';
    const env = { BITCODE_DEMONSTRATION_MODE: '1', BITCODE_DEMONSTRATION_ACCOUNT_ADDRESS: account };
    expect(demonstrationOpeningBtdForWallet(account.toLowerCase(), env)).toBe(1000);
    expect(demonstrationOpeningBtdForWallet(account, { ...env, BITCODE_DEMONSTRATION_OPENING_BTD: '250' })).toBe(250);
    expect(demonstrationOpeningBtdForWallet('0x1111111111111111111111111111111111111111', env)).toBe(0);
    expect(demonstrationOpeningBtdForWallet(account, { ...env, BITCODE_DEMONSTRATION_MODE: '0' })).toBe(0);
    expect(demonstrationOpeningBtdForWallet(null, env)).toBe(0);
    expect(readDemonstrationAccountAddress({ BITCODE_DEMONSTRATION_ACCOUNT_ADDRESS: 'not-an-address' })).toBeNull();
  });

  it('isolates the demonstration dataset from live data in both directions', () => {
    const demo = { BITCODE_DEMONSTRATION_MODE: '1' };
    const live = {};
    const demoRow = { id: 'd', context: withDemonstrationDataset({ source: 'x' }, demo) };
    const liveRow = { id: 'l', context: withDemonstrationDataset({ source: 'x' }, live) };
    expect(demoRow.context).toEqual({ source: 'x', dataset: DEMONSTRATION_DATASET });
    expect(liveRow.context).toEqual({ source: 'x' });
    expect(scopeExecutionRowsToActiveDataset([demoRow, liveRow], demo).map((r) => r.id)).toEqual(['d']);
    expect(scopeExecutionRowsToActiveDataset([demoRow, liveRow], live).map((r) => r.id)).toEqual(['l']);
    const eq = jest.fn(function (this: unknown) {
      return this;
    });
    const query = { eq } as unknown as { eq: (c: string, v: string) => typeof query };
    scopeExecutionsQueryToActiveDataset(query, demo);
    expect(eq).toHaveBeenCalledWith('context->>dataset', DEMONSTRATION_DATASET);
    eq.mockClear();
    scopeExecutionsQueryToActiveDataset(query, live);
    expect(eq).not.toHaveBeenCalled();
  });

  it('reads a bounded pace factor', () => {
    expect(readDemonstrationPaceFactor({})).toBe(1);
    expect(readDemonstrationPaceFactor({ BITCODE_DEMONSTRATION_PACE: '0' })).toBe(0);
    expect(readDemonstrationPaceFactor({ BITCODE_DEMONSTRATION_PACE: '99' })).toBe(5);
    expect(readDemonstrationPaceFactor({ BITCODE_DEMONSTRATION_PACE: 'nope' })).toBe(1);
  });
});

describe('demonstration absolutes', () => {
  it.each(DEMONSTRATION_DATA_PACK_CATALOG.map((pack) => [pack.id, pack] as const))(
    '%s carries the full catalogue with honest status',
    (_id, pack) => {
      const absolutes = measureDemonstrationDataPackAbsolutes(pack);
      expect(absolutes.map((a) => a.measurementKind)).toEqual(
        DATA_PACK_ABSOLUTES_CATALOG.map((spec) => spec.measurementKind),
      );
      const weightSum = absolutes.reduce((sum, a) => sum + a.weight, 0);
      expect(weightSum).toBeCloseTo(1, 6);
      for (const reading of absolutes) {
        expect(reading.volume).toBeGreaterThanOrEqual(0);
        expect(reading.volume).toBeLessThanOrEqual(1);
        expect(['measured', 'estimated']).toContain(reading.status);
      }
      const structure = measureDemonstrationDataPackStructure(pack);
      const functions = absolutes.find((a) => a.measurementKind === 'function-count');
      expect(functions).toMatchObject({ status: 'measured', magnitude: structure.functionCount });
      expect(structure.testCount).toBeGreaterThan(0);
      // Buyer hard gates stay clean (secret-safety high, PII exposure low).
      expect(absolutes.find((a) => a.measurementKind === 'secret-safety')!.volume).toBeGreaterThan(0.6);
      expect(absolutes.find((a) => a.measurementKind === 'pii-exposure')!.volume).toBeLessThan(0.2);
    },
  );

  it('is deterministic across runs', () => {
    const pack = DEMONSTRATION_DATA_PACK_CATALOG[0];
    expect(measureDemonstrationDataPackAbsolutes(pack)).toEqual(measureDemonstrationDataPackAbsolutes(pack));
  });
});

describe('demonstration provenance binding', () => {
  it('ranks hint-matching checkout paths and honors path law', () => {
    const [http, webhooks, audit] = DEMONSTRATION_DATA_PACK_CATALOG;
    expect(bindDemonstrationCoveredSourcePaths(http, CHECKOUT_PATHS)[0]).toBe('src/api/http-client.ts');
    expect(bindDemonstrationCoveredSourcePaths(webhooks, CHECKOUT_PATHS)[0]).toBe('src/api/routes/webhooks.ts');
    expect(bindDemonstrationCoveredSourcePaths(audit, CHECKOUT_PATHS)[0]).toBe('src/server/audit-events.ts');

    const bound = bindDemonstrationCoveredSourcePaths(http, CHECKOUT_PATHS, {
      impermissibleSources: ['secret/', 'src/api/'],
    });
    expect(bound).not.toContain('src/api/http-client.ts');
    expect(bound.some((p) => p.startsWith('secret/') || p.startsWith('node_modules/'))).toBe(false);

    expect(
      bindDemonstrationCoveredSourcePaths(http, CHECKOUT_PATHS, { permissibleSources: ['src/lib/'] }),
    ).toEqual(['src/lib/retry.ts']);
  });

  it('falls back to the pack paths for an empty checkout', () => {
    const pack = DEMONSTRATION_DATA_PACK_CATALOG[2];
    expect(bindDemonstrationCoveredSourcePaths(pack, [])).toEqual(
      pack.files.map((f) => f.path).slice(0, 4),
    );
  });
});

describe('demonstration deposit options', () => {
  it('pass real fail-closed validation and project source-safe options', () => {
    const raw = buildDemonstrationDepositRawOptions({
      catalogPaths: CHECKOUT_PATHS,
      steering: { impermissibleSources: ['secret/'] },
    });
    const validated = validateDepositSynthesisOptions(raw, {
      lens: 'deposit',
      inventoryPaths: CHECKOUT_PATHS,
      impermissibleSources: ['secret/'],
      candidateKinds: ['capability-slice', 'implementation-pattern', 'proof-operations-slice'],
    });
    expect(validated.droppedCandidateCount).toBe(0);
    expect(validated.candidates).toHaveLength(DEMONSTRATION_DEPOSIT_OPTION_COUNT);

    const { synthesis } = buildRealDepositAssetPackOptionSynthesis(
      {
        repositoryFullName: 'acme/payments-api',
        sourceBranch: 'main',
        sourceCommit: 'abc1234',
        impermissibleSources: ['secret/'],
        createdAt: '2026-10-12T00:00:00.000Z',
      },
      {
        lens: 'deposit',
        candidates: validated.candidates,
        droppedCandidateCount: 0,
        exclusionViolations: [],
        inference: { provider: null, model: null, totalTokens: null, durationMs: 1 },
      },
      { paths: CHECKOUT_PATHS, samples: [], totalPathCount: CHECKOUT_PATHS.length, excludedPathCount: 0 },
    );
    expect(synthesis.optionCount).toBe(DEMONSTRATION_DEPOSIT_OPTION_COUNT);
    expect(synthesis.options[0].contents?.fileChanges?.length).toBeGreaterThan(0);
    expect(assertDepositAssetPackOptionSynthesisSourceSafe(synthesis).admitted).toBe(true);
  });
});

describe('demonstration read options', () => {
  it('measure static *-fit needinesses against the Need and rank by need-fit', () => {
    const options = buildDemonstrationReadImplementationOptions({
      need: 'Our webhook handler double-processes Stripe events; verify the HMAC signature and dedupe retries.',
      catalogPaths: CHECKOUT_PATHS,
      repositoryLanguage: 'TypeScript',
    });
    expect(options[0].title).toBe(findDemonstrationDataPackByTitle(options[0].title)!.title);
    expect(options[0].title).toMatch(/webhook/i);
    for (const option of options) {
      expect(option.measurements.needinesses.every((n) => n.measurementKind.endsWith('-fit'))).toBe(true);
      expect(option.patch.fileChanges.every((c) => c.op === 'create' && c.content.length > 0)).toBe(true);
    }
    const needFits = options.map((o) => o.needFit);
    expect([...needFits].sort((a, b) => b - a)).toEqual(needFits);
    expect(needFits[0]).toBeGreaterThan(0.75);
  });

  it('attaches Depository supply provenance by catalog id', () => {
    const [first] = DEMONSTRATION_DATA_PACK_CATALOG;
    const options = buildDemonstrationReadImplementationOptions({
      need: 'retry flaky http calls',
      catalogPaths: CHECKOUT_PATHS,
      supplyByPackId: {
        [first.id]: {
          admissionRunId: 'run-1',
          sellerUserId: 'seller-1',
          depositoryAssetPackId: 'dp-1',
          repositoryFullName: 'seller/repo',
        },
      },
    });
    const linked = options.find((o) => o.title === first.title)!;
    expect(linked.supplyProvenance).toMatchObject({ sellerUserId: 'seller-1' });
    expect(options.filter((o) => o.supplyProvenance === null)).toHaveLength(DEMONSTRATION_READ_OPTION_COUNT - 1);
  });

  it('shows a strong match, a partial match, and a clear non-match for one Need', () => {
    const options = buildDemonstrationReadImplementationOptions({
      need: 'PostgreSQL query generation evaluations improvements.',
      catalogPaths: CHECKOUT_PATHS,
      repositoryLanguage: 'TypeScript',
    });
    expect(options).toHaveLength(DEMONSTRATION_READ_OPTION_COUNT);
    const fit = (pattern: RegExp) => options.find((o) => pattern.test(o.title))?.needFit ?? null;
    // Strong: the SQL evaluation harness (core signals: generation, eval).
    expect(options[0].title).toMatch(/SQL generation evaluation/i);
    expect(fit(/SQL generation evaluation/i)!).toBeGreaterThan(0.7);
    // Partial: shares Postgres context but not the Need's purpose.
    expect(fit(/migration safety/i)!).toBeGreaterThan(0.45);
    expect(fit(/migration safety/i)!).toBeLessThan(0.6);
    // Contrast non-match (wrong domain + wrong language) is always presented.
    expect(options[options.length - 1].needFit).toBeLessThan(0.35);
  });

  it('draws read candidates from admitted supply first', () => {
    const supplyByPackId = Object.fromEntries(
      DEMONSTRATION_DATA_PACK_CATALOG.slice(0, DEMONSTRATION_READ_OPTION_COUNT).map((pack) => [
        pack.id,
        { admissionRunId: `admit-${pack.id}`, sellerUserId: 'seller-1', depositoryAssetPackId: null, repositoryFullName: null },
      ]),
    );
    const options = buildDemonstrationReadImplementationOptions({
      need: 'PostgreSQL query generation evaluations improvements.',
      catalogPaths: CHECKOUT_PATHS,
      supplyByPackId,
    });
    expect(options.every((o) => o.supplyProvenance?.sellerUserId === 'seller-1')).toBe(true);
  });
});

describe('demonstration deposit pack selection', () => {
  it('prefers packs whose language and paths fit the depositor checkout', () => {
    const pythonRepo = rankDemonstrationPacksForCheckout(
      ['evals/text_to_sql/runner.py', 'app/api/limits.py', 'app/main.py', 'README.md'],
      'Python',
    );
    expect(pythonRepo.slice(0, 2).map((pack) => pack.language)).toEqual(['python', 'python']);
    const tsRepo = rankDemonstrationPacksForCheckout(
      ['supabase/migrations/001_init.sql', 'apps/api/http-client.ts', 'apps/api/webhooks.ts'],
      'TypeScript',
    );
    expect(tsRepo.slice(0, DEMONSTRATION_DEPOSIT_OPTION_COUNT).every((pack) => pack.language === 'typescript')).toBe(true);
  });
});

describe('demonstration SDIVF telemetry script', () => {
  it.each(['deposit', 'read'] as const)('%s replays the full roster in order', (lens) => {
    const steps = buildDemonstrationExecutionPipelineSDIVFTelemetryScript({
      lens,
      repositoryFullName: 'acme/payments-api',
      catalogPathCount: 42,
      optionTitles: DEMONSTRATION_DATA_PACK_CATALOG.map((p) => p.title),
      depositorySupplyCount: 3,
    });
    const offsets = steps.map((s) => s.atMs);
    expect([...offsets].sort((a, b) => a - b)).toEqual(offsets);
    const phases = steps
      .filter((s) => s.artifact.namespace === 'phase')
      .map((s) => s.artifact.data);
    expect(phases).toEqual(['setup', 'discovery', 'implementation', 'validation', 'finish']);
    const generations = steps.filter((s) => s.artifact.streamEventType === 'generation');
    for (const g of generations) {
      expect(g.artifact.executionState).toEqual(
        expect.objectContaining({
          phase: expect.any(String),
          agent: expect.any(String),
          step: expect.any(String),
          failsafe: expect.any(String),
          generation: expect.any(String),
        }),
      );
    }
    const nodeIds = steps.map((s) => s.artifact.executionPath.join('/'));
    expect(new Set(nodeIds).size).toBe(nodeIds.length);
    const agents = new Set(steps.map((s) => s.artifact.executionState.agent).filter(Boolean));
    expect(agents.has(lens === 'deposit' ? 'comprehend-obfuscations' : 'comprehend-needs')).toBe(true);
  });
});
