import { Execution } from '@bitcode/execution-generics';
import { LLMRegistry } from '@bitcode/llm-generics';
import { validateDepositSynthesisOptions } from '@bitcode/asset-packs-pipelines-syntheses-domain/asset-packs-synthesis-validate';

import {
  countLlmCallsFromExecutionTree,
  parseQuickSynthesisResponse,
  QuickSynthesisError,
  rankQuickSynthesisPaths,
  runExecutionPipelineQuickSynthesizeDepositAssetPacks,
  runExecutionPipelineQuickSynthesizeReadAssetPacks,
  validateQuickSynthesisOutput,
  type QuickSynthesisSourceLoader,
} from '..';

const FILES: Record<string, string> = {
  'package.json': '{"name":"fixture","version":"1.0.0"}',
  'src/client.ts': 'export async function get(url: string) {\n  return fetch(url);\n}\n',
  'src/retry.ts': 'export function retry() {\n  return 1;\n}\n',
  'docs/guide.md': '# Guide\n',
  'secret/keys.ts': 'export const KEY = "nope";\n',
};

function fixtureLoader(): QuickSynthesisSourceLoader & { readCalls: string[][] } {
  const readCalls: string[][] = [];
  return {
    readCalls,
    async listPaths() {
      return Object.keys(FILES);
    },
    async readFiles(paths) {
      readCalls.push(paths);
      return paths.filter((path) => FILES[path]).map((path) => ({ path, content: FILES[path] }));
    },
  };
}

const QUALITY = { verification: 0.7, hygiene: 0.8, provenance: 0.6, semantics: 0.75, value: 0.7 };

function option(overrides: Record<string, unknown> = {}) {
  return {
    kind: 'capability-slice',
    title: 'Resilient HTTP retry with backoff',
    summary: 'Wraps the fixture HTTP client with bounded exponential backoff and jitter so transient failures recover.',
    coveredSourcePaths: ['src/client.ts', 'src/retry.ts'],
    confidence: 0.8,
    patch: {
      fileChanges: [
        {
          path: 'src/retry.ts',
          op: 'modify',
          content:
            '/** Retry with backoff. */\nexport async function retry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {\n  let last: unknown;\n  for (let i = 0; i < attempts; i += 1) {\n    try {\n      return await fn();\n    } catch (error) {\n      last = error;\n    }\n  }\n  throw last;\n}\n',
        },
        {
          path: 'src/retry.test.ts',
          op: 'create',
          content: 'import { retry } from "./retry";\nit("retries", async () => {\n  expect(await retry(async () => 1)).toBe(1);\n});\n',
        },
      ],
      patchSummary: 'Adds bounded retry with backoff and a test.',
    },
    commercialTitle: 'Retry with backoff for flaky HTTP',
    commercialDescription: 'A drop-in retry helper with bounded attempts that makes flaky upstream calls recover.',
    measurementRationale: 'Retries are a common reliability need.',
    qualityProfile: QUALITY,
    ...overrides,
  };
}

function fakeRegistry(content: string, calls: { count: number }) {
  const registry = new LLMRegistry();
  registry.registerProvider({
    name: 'fake',
    createLLM: () => async () => {
      calls.count += 1;
      return { content, usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 } };
    },
  });
  registry.setDefaultProvider('fake');
  registry.configure('*', { model: 'fake-model' });
  return registry;
}

describe('quick synthesis (one model call)', () => {
  it('deposit: one model call yields options that pass real deposit validation', async () => {
    const calls = { count: 0 };
    const execution = new Execution('quick-deposit-test');
    const loader = fixtureLoader();
    const result = await runExecutionPipelineQuickSynthesizeDepositAssetPacks(
      {
        runId: 'run-1',
        repositoryFullName: 'acme/fixture',
        reference: 'main',
        permissibleSources: [],
        impermissibleSources: ['secret/'],
        obfuscations: '',
        source: loader,
        llmRegistry: fakeRegistry(JSON.stringify({ options: [option()] }), calls),
      },
      execution,
    );

    expect(calls.count).toBe(1);
    expect(result.llmCallCount).toBe(1);
    expect(countLlmCallsFromExecutionTree(execution)).toBe(1);
    expect(loader.readCalls.flat()).not.toContain('secret/keys.ts');
    expect(result.sourceCatalog.paths).not.toContain('secret/keys.ts');

    const [first] = result.options as any[];
    expect(first.patchArtifact.bodiesComplete).toBe(true);
    expect(first.patch.fileChanges.map((change: any) => change.op)).toEqual(['modify', 'create']);
    const statuses = new Set(first.absolutes.map((row: any) => row.status));
    expect(statuses).toEqual(new Set(['measured', 'estimated']));
    expect(first.absolutes.find((row: any) => row.measurementKind === 'test-surface')).toMatchObject({
      status: 'measured',
      magnitude: 1,
    });

    const validated = validateDepositSynthesisOptions(result.options as any, {
      lens: 'deposit',
      inventoryPaths: result.sourceCatalog.paths,
      impermissibleSources: ['secret/'],
      candidateKinds: ['capability-slice', 'implementation-pattern', 'proof-operations-slice'],
    });
    expect(validated.candidates).toHaveLength(1);
  });

  it('read: one model call, relatives + evaluation-fit, real Finish envelope', async () => {
    const calls = { count: 0 };
    const execution = new Execution('quick-read-test');
    const response = {
      options: [
        option({
          relativeRows: [
            { measurementKind: 'flaky-upstream-fit', label: 'Flaky upstream recovery', guidance: 'recovers', volume: 0.9, rationale: 'Directly retries.' },
          ],
          sourceAttributions: [
            { depositoryAssetPackId: 'dp-1', weight: 3, rationale: 'Adapted from supply.' },
            { depositoryAssetPackId: 'not-admitted', weight: 5, rationale: 'Invented.' },
          ],
        }),
        option({ title: 'Escapes the steering law entirely', coveredSourcePaths: ['secret/keys.ts'] }),
      ],
      benchmarkIds: ['latency', 'undeclared'],
    };
    const result = await runExecutionPipelineQuickSynthesizeReadAssetPacks(
      {
        runId: 'run-2',
        repositoryFullName: 'acme/fixture',
        reference: 'abc123',
        sourceBranch: 'main',
        evaluation: 'Our HTTP client is flaky upstream; add retry with backoff.',
        permissibleSources: [],
        impermissibleSources: ['secret/'],
        depositorySupply: [{ depositoryAssetPackId: 'dp-1', title: 'Retry pack', summary: 'Retries' }],
        declaredBenchmarkIds: ['latency'],
        source: fixtureLoader(),
        llmRegistry: fakeRegistry(JSON.stringify(response), calls),
      },
      execution,
    );

    expect(calls.count).toBe(1);
    expect(result.quick.llmCallCount).toBe(1);
    expect(result.quick.benchmarkIds).toEqual(['latency']);
    expect(result.options).toHaveLength(1);
    const full = result.fullOptions[0] as any;
    expect(full.patch.fileChanges[0].content).toContain('retry');
    const kinds = full.measurements.relatives.map((row: any) => row.measurementKind);
    expect(kinds).toEqual(expect.arrayContaining(['language-fit', 'domain-fit', 'interface-fit', 'flaky-upstream-fit']));
    const inferred = full.measurements.relatives.find((row: any) => row.measurementKind === 'flaky-upstream-fit');
    expect(inferred).toMatchObject({ volume: 0.9, status: 'estimated', propertyClass: 'dynamic-inferred' });
    expect(full.evaluationFit).toBeGreaterThan(0);
    expect(full.evaluationFit).toBeLessThanOrEqual(1);
  });

  it('fails closed on an invalid single response without a second call', async () => {
    const calls = { count: 0 };
    await expect(
      runExecutionPipelineQuickSynthesizeDepositAssetPacks(
        {
          runId: 'run-3',
          repositoryFullName: 'acme/fixture',
          reference: 'main',
          permissibleSources: [],
          impermissibleSources: [],
          source: fixtureLoader(),
          llmRegistry: fakeRegistry('not json at all', calls),
        },
        new Execution('quick-invalid-test'),
      ),
    ).rejects.toBeInstanceOf(QuickSynthesisError);
    expect(calls.count).toBe(1);
  });
});

describe('quick synthesis helpers', () => {
  it('repairs fenced and bare-array responses locally', () => {
    expect(parseQuickSynthesisResponse('```json\n{"options":[]}\n```')).toEqual({ options: [] });
    expect(parseQuickSynthesisResponse('[{"a":1}]')).toEqual({ options: [{ a: 1 }] });
    expect(() => parseQuickSynthesisResponse('nope')).toThrow(QuickSynthesisError);
  });

  it('rejects delete ops and missing bodies', () => {
    const bad = option({ patch: { fileChanges: [{ path: 'src/retry.ts', op: 'delete', content: 'x' }], patchSummary: 's' } });
    expect(() => validateQuickSynthesisOutput('deposit', { options: [bad] })).toThrow(QuickSynthesisError);
  });

  it('ranks manifests and steering keyword paths first', () => {
    const ranked = rankQuickSynthesisPaths(['docs/a.md', 'src/deep/retry.ts', 'package.json', 'src/x.ts'], 'retry backoff');
    expect(ranked[0]).toBe('package.json');
    expect(ranked[1]).toBe('src/deep/retry.ts');
  });
});
