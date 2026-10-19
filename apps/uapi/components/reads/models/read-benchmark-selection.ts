/**
 * Reader benchmark selection (V49 benchmark-delta law B-2).
 *
 * The Evaluations panel lists the repository's declared benchmarks; checked ids
 * ride on the synthesize request as `benchmarkIds`. Selection is per compose
 * (repository@reference) and lives in memory only — the server restricts it to
 * the manifest at the request revision.
 */

export const READ_BENCHMARK_SELECTION_EVENT = 'bitcode:read-benchmark-selection-change';

let current: { scope: string; ids: string[] } | null = null;

export function readBenchmarkSelectionScope(repositoryFullName: string | null | undefined, reference: string | null | undefined): string {
  return `${repositoryFullName || ''}@${reference || 'HEAD'}`;
}

export function readBenchmarkSelection(scope: string): string[] {
  return current && current.scope === scope ? [...current.ids] : [];
}

export function writeBenchmarkSelection(scope: string, ids: readonly string[]): void {
  current = { scope, ids: [...new Set(ids)] };
  try {
    window.dispatchEvent(new CustomEvent(READ_BENCHMARK_SELECTION_EVENT, { detail: current }));
  } catch {
    /* non-browser */
  }
}

/** Request body fragment: `{ benchmarkIds }` only when the reader checked any for this scope. */
export function benchmarkSelectionRequestField(scope: string): { benchmarkIds?: string[] } {
  const ids = readBenchmarkSelection(scope);
  return ids.length ? { benchmarkIds: ids } : {};
}
