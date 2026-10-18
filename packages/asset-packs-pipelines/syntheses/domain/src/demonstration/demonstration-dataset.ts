/**
 * Demonstration dataset isolation.
 *
 * In demonstration mode only the account's wallet and GitHub connections are
 * real; all pack data (pipeline runs, Evaluation anchors, admissions, settles,
 * Exchange activity, Depository supply/demand, holdings) is demonstration
 * data. Every execution row written in demonstration mode carries
 * `context.dataset = 'demonstration'`:
 * - demonstration mode reads ONLY demonstration rows;
 * - live mode reads never include demonstration rows.
 */

import { isBitcodeDemonstrationModeEnabled } from './demonstration-mode';

export const DEMONSTRATION_DATASET = 'demonstration' as const;

type Env = Record<string, string | undefined>;
type ContextLike = Record<string, unknown> | null | undefined;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** True when an execution context belongs to the demonstration dataset. */
export function isDemonstrationDatasetContext(context: unknown): boolean {
  return asRecord(context)?.dataset === DEMONSTRATION_DATASET;
}

/** Tag an execution context with the demonstration dataset (demo mode only). */
export function withDemonstrationDataset<T extends ContextLike>(
  context: T,
  env: Env = process.env,
): T {
  if (!isBitcodeDemonstrationModeEnabled(env)) return context;
  return { ...(context ?? {}), dataset: DEMONSTRATION_DATASET } as unknown as T;
}

/** True when a row's context belongs to the dataset active in this process. */
export function isExecutionInActiveDataset(
  row: { context?: unknown } | null | undefined,
  env: Env = process.env,
): boolean {
  return isDemonstrationDatasetContext(row?.context) === isBitcodeDemonstrationModeEnabled(env);
}

/** Keep only rows of the active dataset (in-memory scope for list reads). */
export function scopeExecutionRowsToActiveDataset<T extends { context?: unknown }>(
  rows: readonly T[] | null | undefined,
  env: Env = process.env,
): T[] {
  return (rows ?? []).filter((row) => isExecutionInActiveDataset(row, env));
}

/**
 * Narrow an `executions` query to the demonstration dataset in demonstration
 * mode (server-side, so limits apply to demo rows). Live mode leaves the query
 * unchanged — callers then apply `scopeExecutionRowsToActiveDataset`.
 */
export function scopeExecutionsQueryToActiveDataset<Q extends { eq: (column: string, value: string) => Q }>(
  query: Q,
  env: Env = process.env,
): Q {
  return isBitcodeDemonstrationModeEnabled(env)
    ? query.eq('context->>dataset', DEMONSTRATION_DATASET)
    : query;
}
