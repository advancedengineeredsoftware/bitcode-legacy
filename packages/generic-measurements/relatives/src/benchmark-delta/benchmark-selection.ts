/**
 * Benchmark selection (V49 benchmark-delta Relative law B-2): the union of the
 * reader's checked benchmarks and the ids synthesis found in the Evaluation,
 * restricted to declared ids. Never invents an id.
 */

import { BENCHMARK_ID_PATTERN, BENCHMARK_MAX_DECLARED, type BenchmarkDeclaration } from './benchmark-manifest';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Declared benchmarks whose id or title the Evaluation text names. */
export function benchmarkIdsReferencedInText(
  declared: ReadonlyArray<Pick<BenchmarkDeclaration, 'id' | 'title'>>,
  text: string | null | undefined,
): string[] {
  const haystack = String(text || '');
  if (!haystack.trim()) return [];
  return declared
    .filter((benchmark) =>
      [benchmark.id, benchmark.title].some(
        (needle) => needle && new RegExp(`(^|[^a-z0-9])${escapeRegExp(needle)}($|[^a-z0-9])`, 'i').test(haystack),
      ),
    )
    .map((benchmark) => benchmark.id);
}

/** Parse a request's `benchmarkIds`: absent → [], malformed → throws. */
export function parseRequestedBenchmarkIds(raw: unknown): string[] {
  if (raw === undefined || raw === null) return [];
  if (
    !Array.isArray(raw) ||
    raw.length > BENCHMARK_MAX_DECLARED ||
    raw.some((id) => typeof id !== 'string' || id.length > 64 || !BENCHMARK_ID_PATTERN.test(id))
  ) {
    throw new Error(`benchmarkIds must be an array of at most ${BENCHMARK_MAX_DECLARED} benchmark ids.`);
  }
  return [...new Set(raw as string[])];
}

export function resolveSelectedBenchmarkIds(input: {
  declaredIds: readonly string[];
  requestedIds?: readonly unknown[] | null;
  synthesizedIds?: readonly unknown[] | null;
}): string[] {
  const declared = new Set(input.declaredIds);
  const selected: string[] = [];
  for (const id of [...(input.requestedIds ?? []), ...(input.synthesizedIds ?? [])]) {
    if (typeof id === 'string' && declared.has(id) && !selected.includes(id)) selected.push(id);
  }
  return selected;
}
