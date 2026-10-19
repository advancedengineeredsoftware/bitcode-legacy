import {
  BENCHMARK_MANIFEST_PATH,
  benchmarkIdsReferencedInText,
  extractBenchmarkMetric,
  parseBenchmarkManifest,
  readBenchmarkDelta,
  resolveSelectedBenchmarkIds,
  toBenchmarkDescriptors,
} from '../benchmark-delta';

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
    {
      id: 'lookup-steps',
      title: 'Lookup steps',
      runtime: 'node24',
      command: 'node bench.js',
      metric: { source: 'json-file', path: 'out/bench.json', jsonPath: '$.results[0].steps' },
      direction: 'lower-is-better',
      runs: 1,
      timeoutMs: 5000,
    },
  ],
};

describe('benchmark manifest (V49 B-1)', () => {
  it('parses a declared manifest with defaults', () => {
    expect(BENCHMARK_MANIFEST_PATH).toBe('.bitcode/benchmarks.json');
    const parsed = parseBenchmarkManifest(JSON.stringify(manifest));
    if (!parsed.ok) throw new Error(parsed.error);
    expect(parsed.manifest.benchmarks[0]).toEqual(expect.objectContaining({ runs: 3, timeoutMs: 120000 }));
    expect(toBenchmarkDescriptors(parsed.manifest)).toEqual([
      { id: 'parse-throughput', title: 'Parser throughput', unit: 'ops/s', direction: 'higher-is-better' },
      { id: 'lookup-steps', title: 'Lookup steps', unit: null, direction: 'lower-is-better' },
    ]);
  });

  it.each([
    ['unknown field', { ...manifest, extra: true }],
    ['bad id', { ...manifest, benchmarks: [{ ...manifest.benchmarks[0], id: 'Parse Throughput' }] }],
    ['runs out of range', { ...manifest, benchmarks: [{ ...manifest.benchmarks[0], runs: 9 }] }],
    ['timeout over cap', { ...manifest, benchmarks: [{ ...manifest.benchmarks[0], timeoutMs: 400000 }] }],
    ['regex without capture', { ...manifest, benchmarks: [{ ...manifest.benchmarks[0], metric: { source: 'stdout-regex', pattern: 'ops' } }] }],
    ['escaping json path', { ...manifest, benchmarks: [{ ...manifest.benchmarks[1], metric: { source: 'json-file', path: '../x.json', jsonPath: '$.a' } }] }],
    ['duplicate ids', { ...manifest, benchmarks: [manifest.benchmarks[0], manifest.benchmarks[0]] }],
    ['wrong schema', { ...manifest, schema: 'other' }],
  ])('fails closed on %s', (_label, value) => {
    expect(parseBenchmarkManifest(value).ok).toBe(false);
  });
});

describe('benchmark reading (V49 B-4)', () => {
  const higher = { id: 'parse-throughput', title: 'Parser throughput', direction: 'higher-is-better' as const, unit: 'ops/s' };
  const lower = { id: 'lookup-steps', title: 'Lookup steps', direction: 'lower-is-better' as const };

  it('extracts stdout-regex and json-file metrics', () => {
    expect(extractBenchmarkMetric({ metric: { source: 'stdout-regex', pattern: 'ops/sec: ([0-9.]+)' }, stdout: 'x\nops/sec: 1200.5\n' })).toBe(1200.5);
    expect(
      extractBenchmarkMetric({
        metric: { source: 'json-file', path: 'out.json', jsonPath: '$.results[0].steps' },
        stdout: '',
        jsonFileText: '{"results":[{"steps":42}]}',
      }),
    ).toBe(42);
    expect(extractBenchmarkMetric({ metric: { source: 'stdout-regex', pattern: 'ops/sec: ([0-9.]+)' }, stdout: 'nope' })).toBeNull();
  });

  it('measures signed improvement with the clamp formula', () => {
    const row = readBenchmarkDelta({ benchmark: higher, baselineSamples: [100, 90, 110], candidateSamples: [125, 120, 130] });
    expect(row.measurementKind).toBe('benchmark-delta:parse-throughput');
    expect(row.status).toBe('measured');
    expect(row.benchmark.improvementRatio).toBeCloseTo(0.25);
    expect(row.magnitude).toBeCloseTo(25);
    expect(row.volume).toBeCloseTo(0.75);

    const saturated = readBenchmarkDelta({ benchmark: lower, baselineSamples: [1000], candidateSamples: [10] });
    expect(saturated.volume).toBe(1);
    const neutral = readBenchmarkDelta({ benchmark: lower, baselineSamples: [50], candidateSamples: [50] });
    expect(neutral.volume).toBe(0.5);
    const regression = readBenchmarkDelta({ benchmark: higher, baselineSamples: [100], candidateSamples: [50] });
    expect(regression.volume).toBe(0);
    expect(regression.magnitude).toBeCloseTo(-50);
  });

  it('marks failures insufficient_evidence or not_run with zero weight and neutral volume', () => {
    const failed = readBenchmarkDelta({ benchmark: higher, baselineSamples: [100], candidateSamples: [], failureClass: 'command_failed' });
    expect(failed).toEqual(expect.objectContaining({ status: 'insufficient_evidence', weight: 0, volume: 0.5, failureClass: 'command_failed' }));
    expect(readBenchmarkDelta({ benchmark: higher, baselineSamples: [0], candidateSamples: [5] }).failureClass).toBe('baseline_zero');
    expect(readBenchmarkDelta({ benchmark: higher, baselineSamples: [], candidateSamples: [], failureClass: 'budget_exhausted' }).status).toBe(
      'not_run',
    );
  });
});

describe('benchmark selection (V49 B-2)', () => {
  const declared = [
    { id: 'parse-throughput', title: 'Parser throughput' },
    { id: 'lookup-steps', title: 'Lookup steps' },
  ];

  it('unions requested and synthesized ids restricted to declared', () => {
    expect(
      resolveSelectedBenchmarkIds({
        declaredIds: declared.map((b) => b.id),
        requestedIds: ['lookup-steps', 'invented'],
        synthesizedIds: ['parse-throughput', 'lookup-steps', 7],
      }),
    ).toEqual(['lookup-steps', 'parse-throughput']);
  });

  it('finds declared ids or titles named in the Evaluation', () => {
    expect(benchmarkIdsReferencedInText(declared, 'Make parser throughput faster.')).toEqual(['parse-throughput']);
    expect(benchmarkIdsReferencedInText(declared, 'reduce lookup-steps please')).toEqual(['lookup-steps']);
    expect(benchmarkIdsReferencedInText(declared, 'nothing relevant')).toEqual([]);
  });
});
