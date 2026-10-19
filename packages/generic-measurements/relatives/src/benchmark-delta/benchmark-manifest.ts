/**
 * Benchmark manifest (V49 benchmark-delta Relative law B-1).
 *
 * A reader repository DECLARES benchmarks in `.bitcode/benchmarks.json` at the
 * request revision. Nothing is discovered or inferred. The parser fails closed
 * on unknown fields or invalid values.
 */

export const BENCHMARK_MANIFEST_PATH = '.bitcode/benchmarks.json';
export const BENCHMARK_MANIFEST_SCHEMA = 'bitcode.benchmarks';
export const BENCHMARK_MANIFEST_VERSION = 1;
export const BENCHMARK_ID_PATTERN = /^[a-z0-9][a-z0-9._-]*$/;
export const BENCHMARK_RUNTIMES = ['node24', 'python3.13'] as const;
export const BENCHMARK_DIRECTIONS = ['higher-is-better', 'lower-is-better'] as const;
export const BENCHMARK_DEFAULT_RUNS = 3;
export const BENCHMARK_MAX_RUNS = 5;
export const BENCHMARK_DEFAULT_TIMEOUT_MS = 120_000;
export const BENCHMARK_MAX_TIMEOUT_MS = 300_000;
export const BENCHMARK_MAX_DECLARED = 12;

export type BenchmarkRuntime = (typeof BENCHMARK_RUNTIMES)[number];
export type BenchmarkDirection = (typeof BENCHMARK_DIRECTIONS)[number];

export type BenchmarkMetric =
  | { source: 'stdout-regex'; pattern: string }
  | { source: 'json-file'; path: string; jsonPath: string };

export interface BenchmarkDeclaration {
  id: string;
  title: string;
  runtime: BenchmarkRuntime;
  setup?: string;
  command: string;
  metric: BenchmarkMetric;
  direction: BenchmarkDirection;
  unit?: string;
  runs: number;
  timeoutMs: number;
}

export interface BenchmarkManifest {
  schema: typeof BENCHMARK_MANIFEST_SCHEMA;
  version: typeof BENCHMARK_MANIFEST_VERSION;
  benchmarks: BenchmarkDeclaration[];
}

/** Source-safe descriptor for selection UIs (no commands). */
export interface BenchmarkDescriptor {
  id: string;
  title: string;
  unit: string | null;
  direction: BenchmarkDirection;
}

export type BenchmarkManifestParseResult =
  | { ok: true; manifest: BenchmarkManifest }
  | { ok: false; error: string };

const MANIFEST_KEYS = new Set(['schema', 'version', 'benchmarks']);
const BENCHMARK_KEYS = new Set(['id', 'title', 'runtime', 'setup', 'command', 'metric', 'direction', 'unit', 'runs', 'timeoutMs']);
const METRIC_KEYS: Record<BenchmarkMetric['source'], Set<string>> = {
  'stdout-regex': new Set(['source', 'pattern']),
  'json-file': new Set(['source', 'path', 'jsonPath']),
};
const JSON_PATH_PATTERN = /^\$(?:\.[A-Za-z_][A-Za-z0-9_-]*|\[\d+\])*$/;

class ManifestError extends Error {}

function fail(message: string): never {
  throw new ManifestError(message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertKnownKeys(value: Record<string, unknown>, allowed: Set<string>, where: string) {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) fail(`${where}: unknown field "${key}"`);
  }
}

function boundedString(value: unknown, where: string, max: number): string {
  if (typeof value !== 'string' || !value.trim()) fail(`${where} must be a non-empty string`);
  if (value.length > max) fail(`${where} exceeds ${max} characters`);
  return value;
}

function boundedInteger(value: unknown, where: string, min: number, max: number, fallback: number): number {
  if (value === undefined) return fallback;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    fail(`${where} must be an integer in [${min}, ${max}]`);
  }
  return value;
}

function isSafeRelativePath(value: string): boolean {
  return !value.startsWith('/') && !value.includes('\\') && value.split('/').every((part) => part && part !== '..');
}

function parseMetric(value: unknown, where: string): BenchmarkMetric {
  if (!isRecord(value)) fail(`${where} must be an object`);
  const source = value.source;
  if (source !== 'stdout-regex' && source !== 'json-file') fail(`${where}.source must be stdout-regex or json-file`);
  assertKnownKeys(value, METRIC_KEYS[source], where);
  if (source === 'stdout-regex') {
    const pattern = boundedString(value.pattern, `${where}.pattern`, 400);
    let compiled: RegExp;
    try {
      compiled = new RegExp(pattern);
    } catch {
      fail(`${where}.pattern is not a valid regular expression`);
    }
    if (new RegExp(`${compiled.source}|`).exec('')!.length < 2) fail(`${where}.pattern needs a capture group`);
    return { source, pattern };
  }
  const path = boundedString(value.path, `${where}.path`, 300);
  if (!isSafeRelativePath(path)) fail(`${where}.path must be a repository-relative path`);
  const jsonPath = boundedString(value.jsonPath, `${where}.jsonPath`, 200);
  if (!JSON_PATH_PATTERN.test(jsonPath)) fail(`${where}.jsonPath must look like $.a.b[0]`);
  return { source, path, jsonPath };
}

function parseBenchmark(value: unknown, index: number): BenchmarkDeclaration {
  const where = `benchmarks[${index}]`;
  if (!isRecord(value)) fail(`${where} must be an object`);
  assertKnownKeys(value, BENCHMARK_KEYS, where);
  const id = boundedString(value.id, `${where}.id`, 64);
  if (!BENCHMARK_ID_PATTERN.test(id)) fail(`${where}.id must match ${BENCHMARK_ID_PATTERN}`);
  const runtime = value.runtime;
  if (!(BENCHMARK_RUNTIMES as readonly unknown[]).includes(runtime)) {
    fail(`${where}.runtime must be one of ${BENCHMARK_RUNTIMES.join(', ')}`);
  }
  const direction = value.direction;
  if (!(BENCHMARK_DIRECTIONS as readonly unknown[]).includes(direction)) {
    fail(`${where}.direction must be one of ${BENCHMARK_DIRECTIONS.join(', ')}`);
  }
  const declaration: BenchmarkDeclaration = {
    id,
    title: boundedString(value.title, `${where}.title`, 120),
    runtime: runtime as BenchmarkRuntime,
    command: boundedString(value.command, `${where}.command`, 2000),
    metric: parseMetric(value.metric, `${where}.metric`),
    direction: direction as BenchmarkDirection,
    runs: boundedInteger(value.runs, `${where}.runs`, 1, BENCHMARK_MAX_RUNS, BENCHMARK_DEFAULT_RUNS),
    timeoutMs: boundedInteger(value.timeoutMs, `${where}.timeoutMs`, 1000, BENCHMARK_MAX_TIMEOUT_MS, BENCHMARK_DEFAULT_TIMEOUT_MS),
  };
  if (value.setup !== undefined) declaration.setup = boundedString(value.setup, `${where}.setup`, 2000);
  if (value.unit !== undefined) declaration.unit = boundedString(value.unit, `${where}.unit`, 24);
  return declaration;
}

/** Parse `.bitcode/benchmarks.json` (text or parsed JSON). Fail-closed. */
export function parseBenchmarkManifest(raw: unknown): BenchmarkManifestParseResult {
  try {
    let value = raw;
    if (typeof raw === 'string') {
      try {
        value = JSON.parse(raw);
      } catch {
        fail('manifest is not valid JSON');
      }
    }
    if (!isRecord(value)) fail('manifest must be an object');
    assertKnownKeys(value, MANIFEST_KEYS, 'manifest');
    if (value.schema !== BENCHMARK_MANIFEST_SCHEMA) fail(`manifest.schema must be ${BENCHMARK_MANIFEST_SCHEMA}`);
    if (value.version !== BENCHMARK_MANIFEST_VERSION) fail(`manifest.version must be ${BENCHMARK_MANIFEST_VERSION}`);
    if (!Array.isArray(value.benchmarks)) fail('manifest.benchmarks must be an array');
    if (value.benchmarks.length > BENCHMARK_MAX_DECLARED) fail(`manifest declares more than ${BENCHMARK_MAX_DECLARED} benchmarks`);
    const benchmarks = value.benchmarks.map(parseBenchmark);
    const ids = new Set<string>();
    for (const benchmark of benchmarks) {
      if (ids.has(benchmark.id)) fail(`duplicate benchmark id "${benchmark.id}"`);
      ids.add(benchmark.id);
    }
    return { ok: true, manifest: { schema: BENCHMARK_MANIFEST_SCHEMA, version: BENCHMARK_MANIFEST_VERSION, benchmarks } };
  } catch (error) {
    if (error instanceof ManifestError) return { ok: false, error: error.message };
    throw error;
  }
}

export function toBenchmarkDescriptors(manifest: BenchmarkManifest | null | undefined): BenchmarkDescriptor[] {
  return (manifest?.benchmarks ?? []).map((benchmark) => ({
    id: benchmark.id,
    title: benchmark.title,
    unit: benchmark.unit ?? null,
    direction: benchmark.direction,
  }));
}
