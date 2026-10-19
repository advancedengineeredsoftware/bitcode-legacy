/**
 * Benchmark runner (V49 benchmark-delta Relative law B-3).
 *
 * Runs repository-DECLARED benchmarks on a Host workspace (VercelSandboxHost in
 * deployments, LocalHost in development):
 *
 *   1. One workspace per runtime, cloned at the request revision.
 *   2. Per benchmark: `setup` once, baseline `runs` times → median.
 *   3. Per option: restore the clean tree, write the option's patch file bodies
 *      directly (create|modify; full bodies, not `git apply`), re-run `setup`
 *      only when a dependency manifest changed, run `runs` times → median.
 *   4. Budget: total wall clock ≤ BITCODE_BENCHMARK_BUDGET_MS (default 600000);
 *      remaining runs read `not_run`.
 *   5. Commands run under `env -i` (PATH/HOME only), so no operator secret
 *      reaches a benchmark. Benchmark stdout/stderr is never returned: only
 *      parsed samples and source-safe failure classes.
 */

import type { BitcodeHostWorkspace, HostCommandResult } from '@bitcode/host-generics';
import {
  extractBenchmarkMetric,
  readBenchmarkDelta,
  resolveBenchmarkDeltaCap,
  type BenchmarkDeclaration,
  type BenchmarkDeltaRelativeReading,
  type BenchmarkFailureClass,
  type BenchmarkRuntime,
} from '@bitcode/generic-measurements-relatives/benchmark-delta';

export const BENCHMARK_DEFAULT_BUDGET_MS = 600_000;
export const BENCHMARK_SETUP_TIMEOUT_MS = 300_000;
export const BENCHMARK_RUN_RECEIPT_SCHEMA = 'bitcode.read.benchmark-run-receipt';

/** Files whose change re-runs `setup` for an option (dependency manifests). */
const DEPENDENCY_MANIFEST_BASENAMES = new Set([
  'package.json',
  'pnpm-lock.yaml',
  'package-lock.json',
  'yarn.lock',
  'requirements.txt',
  'pyproject.toml',
  'poetry.lock',
  'uv.lock',
  'Pipfile.lock',
]);

/** Linux MAX_ARG_STRLEN is 128 KiB; 30k chars stays under it for any UTF-8. */
const WRITE_CHUNK_CHARS = 30_000;

export interface BenchmarkOptionPatch {
  /** Stable key for the option (e.g. its index). */
  optionKey: string;
  fileChanges: ReadonlyArray<{ path?: unknown; op?: unknown; content?: unknown }>;
}

export type BenchmarkRunEvent =
  | { type: 'workspace'; runtime: BenchmarkRuntime; ok: boolean }
  | { type: 'setup'; benchmarkId: string; ok: boolean }
  | { type: 'baseline'; benchmarkId: string; ok: boolean; median: number | null }
  | { type: 'option'; benchmarkId: string; optionKey: string; status: BenchmarkDeltaRelativeReading['status'] };

export interface RunBenchmarkDeltasInput {
  /** Selected declared benchmarks (selection law is the caller's). */
  benchmarks: readonly BenchmarkDeclaration[];
  options: readonly BenchmarkOptionPatch[];
  /** Clone the reader repository at the request revision for a runtime. */
  provisionWorkspace: (runtime: BenchmarkRuntime) => Promise<BitcodeHostWorkspace>;
  budgetMs?: number;
  cap?: number;
  now?: () => number;
  onEvent?: (event: BenchmarkRunEvent) => void;
}

export interface BenchmarkRunReceipt {
  schema: typeof BENCHMARK_RUN_RECEIPT_SCHEMA;
  budgetMs: number;
  elapsedMs: number;
  benchmarks: Array<{
    benchmarkId: string;
    runtime: BenchmarkRuntime;
    baselineSamples: number[];
    failureClass: BenchmarkFailureClass | null;
  }>;
  /** `benchmark-delta:<id>` Relative rows per option key. */
  rowsByOption: Record<string, BenchmarkDeltaRelativeReading[]>;
}

export function resolveBenchmarkBudgetMs(env: Record<string, string | undefined> = process.env): number {
  const raw = Number(env.BITCODE_BENCHMARK_BUDGET_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : BENCHMARK_DEFAULT_BUDGET_MS;
}

type RunOutcome = { value: number } | { failure: BenchmarkFailureClass };

function isSafePatchPath(path: string): boolean {
  if (!path || path.startsWith('/') || path.includes('\\') || path.includes('\0')) return false;
  const parts = path.split('/');
  return parts.every((part) => part && part !== '..') && parts[0] !== '.git';
}

function basename(path: string): string {
  return path.split('/').pop() || path;
}

/**
 * `sh -c` wrapper: sanitized environment (PATH/HOME only) and coreutils
 * `timeout` when the host has it. `$0` is the command, `$1` the seconds.
 */
const SANITIZED_RUN_SCRIPT =
  'if command -v timeout >/dev/null 2>&1; then ' +
  'exec env -i PATH="$PATH" HOME="$HOME" LANG=C.UTF-8 timeout -k 5 "$1" sh -c "$0"; ' +
  'else exec env -i PATH="$PATH" HOME="$HOME" LANG=C.UTF-8 sh -c "$0"; fi';

async function runSanitized(
  workspace: BitcodeHostWorkspace,
  command: string,
  timeoutMs: number,
): Promise<HostCommandResult & { timedOut: boolean }> {
  const seconds = String(Math.max(1, Math.ceil(timeoutMs / 1000)));
  let timer: ReturnType<typeof setTimeout> | undefined;
  // Backstop for hosts without coreutils `timeout`.
  const backstop = new Promise<'timeout'>((resolve) => {
    timer = setTimeout(() => resolve('timeout'), timeoutMs + 10_000);
  });
  try {
    const result = await Promise.race([
      workspace.runCommand('sh', ['-c', SANITIZED_RUN_SCRIPT, command, seconds]),
      backstop,
    ]);
    if (result === 'timeout') return { exitCode: null, stdout: '', stderr: '', timedOut: true };
    return { ...result, timedOut: result.exitCode === 124 || result.exitCode === 137 };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Restore the checkout. Inherited `GIT_*` variables (e.g. GIT_DIR /
 * GIT_INDEX_FILE when the host process itself runs inside a git hook) are
 * unset first, so the reset can only ever touch this workspace's repository.
 */
const RESTORE_CLEAN_TREE_SCRIPT =
  'for name in $(env | sed -n "s/^\\(GIT_[A-Z_]*\\)=.*/\\1/p"); do unset "$name"; done; ' +
  'git reset --hard -q && git clean -fdq';

async function restoreCleanTree(workspace: BitcodeHostWorkspace): Promise<boolean> {
  // `git clean -fd` keeps ignored artifacts (node_modules, venvs) from setup.
  const result = await workspace.runCommand('sh', ['-c', RESTORE_CLEAN_TREE_SCRIPT]);
  return result.exitCode === 0;
}

async function writeBody(workspace: BitcodeHostWorkspace, path: string, content: string): Promise<boolean> {
  const chunks = content.length === 0 ? [''] : [];
  for (let offset = 0; offset < content.length; offset += WRITE_CHUNK_CHARS) {
    chunks.push(content.slice(offset, offset + WRITE_CHUNK_CHARS));
  }
  for (let index = 0; index < chunks.length; index += 1) {
    const redirect = index === 0 ? '>' : '>>';
    const result = await workspace.runCommand('sh', [
      '-c',
      `mkdir -p "$(dirname "$0")" && printf '%s' "$1" ${redirect} "$0"`,
      path,
      chunks[index]!,
    ]);
    if (result.exitCode !== 0) return false;
  }
  return true;
}

async function runOnce(workspace: BitcodeHostWorkspace, benchmark: BenchmarkDeclaration): Promise<RunOutcome> {
  if (benchmark.metric.source === 'json-file') {
    await workspace.runCommand('sh', ['-c', 'rm -f "$0"', benchmark.metric.path]);
  }
  const result = await runSanitized(workspace, benchmark.command, benchmark.timeoutMs);
  if (result.timedOut) return { failure: 'timeout' };
  if (result.exitCode !== 0) return { failure: 'command_failed' };
  const value = extractBenchmarkMetric({
    metric: benchmark.metric,
    stdout: result.stdout,
    jsonFileText:
      benchmark.metric.source === 'json-file' ? await workspace.readFile(benchmark.metric.path) : undefined,
  });
  return value === null ? { failure: 'metric_unparsable' } : { value };
}

async function runSamples(
  workspace: BitcodeHostWorkspace,
  benchmark: BenchmarkDeclaration,
  hasBudget: () => boolean,
): Promise<{ samples: number[]; failure: BenchmarkFailureClass | null }> {
  const samples: number[] = [];
  for (let run = 0; run < benchmark.runs; run += 1) {
    if (!hasBudget()) return { samples, failure: samples.length ? null : 'budget_exhausted' };
    const outcome = await runOnce(workspace, benchmark);
    if ('failure' in outcome) return { samples: [], failure: outcome.failure };
    samples.push(outcome.value);
  }
  return { samples, failure: null };
}

async function runSetup(workspace: BitcodeHostWorkspace, benchmark: BenchmarkDeclaration): Promise<boolean> {
  if (!benchmark.setup) return true;
  const result = await runSanitized(workspace, benchmark.setup, BENCHMARK_SETUP_TIMEOUT_MS);
  return !result.timedOut && result.exitCode === 0;
}

/** Run selected declared benchmarks on baseline and on each option's patch. */
export async function runBenchmarkDeltas(input: RunBenchmarkDeltasInput): Promise<BenchmarkRunReceipt> {
  const now = input.now ?? Date.now;
  const startedAt = now();
  const budgetMs = input.budgetMs && input.budgetMs > 0 ? input.budgetMs : resolveBenchmarkBudgetMs();
  const cap = input.cap ?? resolveBenchmarkDeltaCap();
  const hasBudget = () => now() - startedAt < budgetMs;
  const emit = (event: BenchmarkRunEvent) => {
    try {
      input.onEvent?.(event);
    } catch {
      /* events are advisory */
    }
  };

  const receipt: BenchmarkRunReceipt = {
    schema: BENCHMARK_RUN_RECEIPT_SCHEMA,
    budgetMs,
    elapsedMs: 0,
    benchmarks: [],
    rowsByOption: Object.fromEntries(input.options.map((option) => [option.optionKey, []])),
  };
  const push = (optionKey: string, row: BenchmarkDeltaRelativeReading) => {
    receipt.rowsByOption[optionKey]!.push(row);
  };
  const failAll = (benchmark: BenchmarkDeclaration, failureClass: BenchmarkFailureClass, baselineSamples: number[] = []) => {
    receipt.benchmarks.push({ benchmarkId: benchmark.id, runtime: benchmark.runtime, baselineSamples, failureClass });
    for (const option of input.options) {
      const row = readBenchmarkDelta({ benchmark, baselineSamples, candidateSamples: [], failureClass, cap });
      push(option.optionKey, row);
      emit({ type: 'option', benchmarkId: benchmark.id, optionKey: option.optionKey, status: row.status });
    }
  };

  const runtimes = [...new Set(input.benchmarks.map((benchmark) => benchmark.runtime))];
  for (const runtime of runtimes) {
    const group = input.benchmarks.filter((benchmark) => benchmark.runtime === runtime);
    if (!hasBudget()) {
      group.forEach((benchmark) => failAll(benchmark, 'budget_exhausted'));
      continue;
    }
    let workspace: BitcodeHostWorkspace;
    try {
      workspace = await input.provisionWorkspace(runtime);
      emit({ type: 'workspace', runtime, ok: true });
    } catch {
      emit({ type: 'workspace', runtime, ok: false });
      group.forEach((benchmark) => failAll(benchmark, 'workspace_failed'));
      continue;
    }
    try {
      for (const benchmark of group) {
        if (!hasBudget()) {
          failAll(benchmark, 'budget_exhausted');
          continue;
        }
        if (!(await restoreCleanTree(workspace))) {
          failAll(benchmark, 'workspace_failed');
          continue;
        }
        const setupOk = await runSetup(workspace, benchmark);
        emit({ type: 'setup', benchmarkId: benchmark.id, ok: setupOk });
        if (!setupOk) {
          failAll(benchmark, 'setup_failed');
          continue;
        }
        const baseline = await runSamples(workspace, benchmark, hasBudget);
        const baselineFailure: BenchmarkFailureClass | null =
          baseline.failure === 'command_failed' ? 'baseline_failed' : baseline.failure;
        emit({
          type: 'baseline',
          benchmarkId: benchmark.id,
          ok: !baselineFailure,
          median: baseline.samples.length ? [...baseline.samples].sort((a, b) => a - b)[Math.floor(baseline.samples.length / 2)]! : null,
        });
        if (baselineFailure) {
          failAll(benchmark, baselineFailure, baseline.samples);
          continue;
        }
        receipt.benchmarks.push({
          benchmarkId: benchmark.id,
          runtime,
          baselineSamples: baseline.samples,
          failureClass: null,
        });

        for (const option of input.options) {
          const row = await measureOption(workspace, benchmark, option, baseline.samples, hasBudget, cap);
          push(option.optionKey, row);
          emit({ type: 'option', benchmarkId: benchmark.id, optionKey: option.optionKey, status: row.status });
        }
      }
    } finally {
      await workspace.dispose().catch(() => undefined);
    }
  }

  receipt.elapsedMs = now() - startedAt;
  return receipt;
}

async function measureOption(
  workspace: BitcodeHostWorkspace,
  benchmark: BenchmarkDeclaration,
  option: BenchmarkOptionPatch,
  baselineSamples: number[],
  hasBudget: () => boolean,
  cap: number,
): Promise<BenchmarkDeltaRelativeReading> {
  const read = (candidateSamples: number[], failureClass: BenchmarkFailureClass | null = null) =>
    readBenchmarkDelta({ benchmark, baselineSamples, candidateSamples, failureClass, cap });
  if (!hasBudget()) return read([], 'budget_exhausted');

  const bodies = option.fileChanges.filter(
    (change): change is { path: string; op?: unknown; content: string } =>
      typeof change?.path === 'string' &&
      typeof change.content === 'string' &&
      String(change.op ?? 'modify').toLowerCase() !== 'delete',
  );
  if (bodies.length === 0) return read([], 'no_patch_bodies');
  if (bodies.some((change) => !isSafePatchPath(change.path))) return read([], 'patch_write_failed');
  if (!(await restoreCleanTree(workspace))) return read([], 'workspace_failed');
  for (const change of bodies) {
    if (!(await writeBody(workspace, change.path, change.content))) return read([], 'patch_write_failed');
  }
  if (benchmark.setup && bodies.some((change) => DEPENDENCY_MANIFEST_BASENAMES.has(basename(change.path)))) {
    if (!(await runSetup(workspace, benchmark))) return read([], 'setup_failed');
  }
  const candidate = await runSamples(workspace, benchmark, hasBudget);
  return read(candidate.samples, candidate.failure);
}
