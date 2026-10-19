/**
 * Read benchmark-delta Relatives (V49 benchmark-delta Relative law).
 *
 * - Manifest: `.bitcode/benchmarks.json` at the request revision, read over the
 *   reader's GitHub token and parsed fail-closed. Nothing is inferred.
 * - Selection: reader-checked ids ∪ ids synthesis found in the Evaluation
 *   (quick: `read.benchmarkIds`; any mode: declared ids/titles named in the
 *   Evaluation text), restricted to declared ids.
 * - Measurement: a post-synthesis Host stage for every real synthesis mode —
 *   `runBenchmarkDeltas` on VercelSandboxHost (serverless) or LocalHost
 *   (laptop). Rows join `fullOptions[*].measurements.relatives`, the subfamily
 *   masses are re-applied, evaluation-fit is recomputed, and the unpaid
 *   projection is regenerated from the updated full options.
 */

import {
  BENCHMARK_MANIFEST_PATH,
  benchmarkIdsReferencedInText,
  parseBenchmarkManifest,
  resolveSelectedBenchmarkIds,
  toBenchmarkDescriptors,
  type BenchmarkDeclaration,
  type BenchmarkDescriptor,
  type BenchmarkManifest,
} from '@bitcode/generic-measurements-relatives/benchmark-delta';
import {
  applyRelativeSubfamilyMasses,
  isBenchmarkDeltaKind,
} from '@bitcode/generic-measurements-relatives/relative-subfamily-masses';
import { computeEvaluationFitVolume } from '@bitcode/generic-measurements-relatives/relatives-catalog';
import {
  LocalHost,
  VercelSandboxHost,
  assertVercelSandboxAuthAvailable,
  loadVercelSandboxFactory,
  runBenchmarkDeltas,
  type BenchmarkRunReceipt,
  type BitcodePipelineHost,
} from '@bitcode/pipeline-hosts';
import { toUnpaidReadOptionsPresentation } from '@bitcode/asset-packs-pipelines-syntheses-domain/unpaid-option-disclosure';

import { readGitHubRepositoryFileTexts } from '@/lib/github-repository-rest';
import { selectDepositHostKind } from '@/lib/deposit-source-provisioning';

export type ReadBenchmarkManifestLoad =
  | { status: 'declared'; manifest: BenchmarkManifest }
  | { status: 'absent' }
  | { status: 'invalid'; error: string };

/** Benchmark measurement is on unless `BITCODE_BENCHMARKS=0`. */
export function isReadBenchmarkMeasurementEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return String(env.BITCODE_BENCHMARKS ?? '').trim() !== '0';
}

export async function loadReadBenchmarkManifest(input: {
  token: string | null;
  repositoryFullName: string;
  reference: string;
}): Promise<ReadBenchmarkManifestLoad> {
  if (!input.token) return { status: 'absent' };
  const files = await readGitHubRepositoryFileTexts({
    token: input.token,
    repositoryFullName: input.repositoryFullName,
    ref: input.reference,
    paths: [BENCHMARK_MANIFEST_PATH],
  });
  const text = files.find((file) => file.path === BENCHMARK_MANIFEST_PATH)?.content;
  if (typeof text !== 'string') return { status: 'absent' };
  const parsed = parseBenchmarkManifest(text);
  return parsed.ok ? { status: 'declared', manifest: parsed.manifest } : { status: 'invalid', error: parsed.error };
}

export function describeReadBenchmarks(load: ReadBenchmarkManifestLoad): BenchmarkDescriptor[] {
  return load.status === 'declared' ? toBenchmarkDescriptors(load.manifest) : [];
}

export function selectReadBenchmarks(input: {
  manifest: BenchmarkManifest | null;
  requestedIds?: readonly unknown[] | null;
  synthesizedIds?: readonly unknown[] | null;
  evaluation?: string | null;
}): BenchmarkDeclaration[] {
  const declared = input.manifest?.benchmarks ?? [];
  const ids = resolveSelectedBenchmarkIds({
    declaredIds: declared.map((benchmark) => benchmark.id),
    requestedIds: input.requestedIds,
    synthesizedIds: [...(input.synthesizedIds ?? []), ...benchmarkIdsReferencedInText(declared, input.evaluation)],
  });
  return declared.filter((benchmark) => ids.includes(benchmark.id));
}

type OptionRecord = Record<string, unknown>;

function optionKey(option: OptionRecord, position: number): string {
  return String(typeof option.index === 'number' ? option.index : position);
}

/** Join benchmark rows into full options, re-mass relatives, recompute evaluation-fit. */
export function applyBenchmarkRowsToReadOptions(
  fullOptions: readonly unknown[],
  rowsByOption: BenchmarkRunReceipt['rowsByOption'],
): OptionRecord[] {
  return fullOptions.map((raw, position) => {
    const option = (raw && typeof raw === 'object' ? { ...(raw as OptionRecord) } : {}) as OptionRecord;
    const rows = rowsByOption[optionKey(option, position)] ?? [];
    if (rows.length === 0) return option;
    const measurements = (option.measurements && typeof option.measurements === 'object'
      ? { ...(option.measurements as OptionRecord) }
      : {}) as OptionRecord;
    const existing = (Array.isArray(measurements.relatives) ? measurements.relatives : []) as Array<{
      measurementKind: string;
      volume: number;
      weight?: number;
    }>;
    const relatives = applyRelativeSubfamilyMasses([
      ...existing.filter((row) => !isBenchmarkDeltaKind(String(row?.measurementKind ?? ''))),
      ...rows,
    ]);
    measurements.relatives = relatives;
    option.measurements = measurements;
    option.evaluationFit = computeEvaluationFitVolume(relatives);
    return option;
  });
}

function hostForRuntime(kind: 'local' | 'sandbox') {
  return async (runtime: BenchmarkDeclaration['runtime']): Promise<BitcodePipelineHost> => {
    if (kind === 'local') return new LocalHost();
    assertVercelSandboxAuthAvailable();
    return new VercelSandboxHost({ sandboxFactory: await loadVercelSandboxFactory(), runtime });
  };
}

export interface ReadBenchmarkStageResult {
  fullOptions: OptionRecord[];
  unpaidOptions: OptionRecord[];
  /** Source-safe receipt summary (ids, baselines, failure classes, timing). */
  receipt: Omit<BenchmarkRunReceipt, 'rowsByOption'> & { benchmarkIds: string[] };
}

/** Post-synthesis Host stage: measure selected benchmarks for every option. */
export async function measureReadOptionBenchmarks(input: {
  benchmarks: readonly BenchmarkDeclaration[];
  fullOptions: readonly unknown[];
  catalogSourcePathCount?: number | null;
  repositoryFullName: string;
  reference: string;
  token: string | null;
  emitStatus?: (message: string) => unknown;
  /** Test seam; defaults to the deposit HostKind selection law. */
  hostFactory?: (runtime: BenchmarkDeclaration['runtime']) => Promise<BitcodePipelineHost>;
}): Promise<ReadBenchmarkStageResult> {
  const hostFactory = input.hostFactory ?? hostForRuntime(selectDepositHostKind());
  const options = input.fullOptions.map((raw, position) => {
    const option = (raw && typeof raw === 'object' ? raw : {}) as OptionRecord;
    const patch = (option.patch && typeof option.patch === 'object' ? option.patch : {}) as OptionRecord;
    return {
      optionKey: optionKey(option, position),
      fileChanges: Array.isArray(patch.fileChanges) ? (patch.fileChanges as OptionRecord[]) : [],
    };
  });
  const receipt = await runBenchmarkDeltas({
    benchmarks: input.benchmarks,
    options,
    provisionWorkspace: async (runtime) => {
      const host = await hostFactory(runtime);
      return host.provisionRepository({
        repositoryFullName: input.repositoryFullName,
        url: `https://github.com/${input.repositoryFullName}.git`,
        revision: input.reference,
        username: input.token ? 'x-access-token' : undefined,
        password: input.token ?? undefined,
      });
    },
    onEvent: (event) => {
      if (event.type === 'baseline') {
        void input.emitStatus?.(
          `benchmark ${event.benchmarkId}: baseline ${event.ok ? `measured (median ${event.median})` : 'failed'}.`,
        );
      } else if (event.type === 'option') {
        void input.emitStatus?.(`benchmark ${event.benchmarkId}: option ${event.optionKey} ${event.status}.`);
      }
    },
  });
  const fullOptions = applyBenchmarkRowsToReadOptions(input.fullOptions, receipt.rowsByOption);
  const { rowsByOption: _rows, ...summary } = receipt;
  return {
    fullOptions,
    unpaidOptions: toUnpaidReadOptionsPresentation(fullOptions, input.catalogSourcePathCount),
    receipt: { ...summary, benchmarkIds: input.benchmarks.map((benchmark) => benchmark.id) },
  };
}
