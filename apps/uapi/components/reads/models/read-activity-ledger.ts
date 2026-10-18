/**
 * Pure read activity-ledger projections from workspace runs.
 *
 * Activity-ledger rows (Evaluation anchors / repository anchors) are stored as
 * execution-history rows but are NOT pipeline executions. They feed Load-anchor
 * UI and must be filtered out of the pipelines master table.
 */

import type { WorkspaceRun } from "@/components/bitcode/pipeline/models/pipeline-run-data";

/** Context sources that are activity-ledger anchors, not pipeline runs. */
export const READ_ACTIVITY_LEDGER_SOURCES = new Set([
  "read-evaluation-anchor",
  "terminal-repository-context-panel",
  // Legacy alias written by older repository-anchor drafts.
  "repository-context-panel",
]);

export type ReadEvaluationAnchor = {
  id: string;
  name: string | null;
  text: string;
  relevantPaths: string[];
  irrelevantPaths: string[];
  repositoryFullName: string | null;
  createdAt: string;
};

/** True when a workspace run is an activity-ledger bookmark (not a pipeline). */
export function isReadActivityLedgerRun(
  run: WorkspaceRun | null | undefined,
): boolean {
  if (!run) return false;
  if (run.contextSource && READ_ACTIVITY_LEDGER_SOURCES.has(run.contextSource)) {
    return true;
  }
  if (run.evaluationAnchorText) return true;
  if (run.summary && /recorded repository anchor/i.test(run.summary)) return true;
  if (run.summary && /anchored .+need/i.test(run.summary)) return true;
  if (
    run.proofStatus === "Repository anchor" ||
    run.proofStatus === "Evaluation anchor"
  ) {
    return true;
  }
  return false;
}

/** Pipeline-table runs only — exclude activity-ledger anchor rows. */
export function filterReadPipelineTableRuns(
  liveRuns: WorkspaceRun[],
): WorkspaceRun[] {
  return liveRuns.filter((run) => !isReadActivityLedgerRun(run));
}

export function isReadActivityLedgerContextSource(
  contextSource: string | null | undefined,
): boolean {
  return Boolean(
    contextSource && READ_ACTIVITY_LEDGER_SOURCES.has(contextSource),
  );
}

/**
 * Previously anchored Evaluation configurations, newest first. Dedupe by
 * name+text+path sets so differently named saves of the same body both remain
 * selectable.
 */
export function deriveEvaluationAnchors(liveRuns: WorkspaceRun[]): ReadEvaluationAnchor[] {
  const seen = new Set<string>();
  const anchors: ReadEvaluationAnchor[] = [];
  for (const run of [...liveRuns].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )) {
    if (run.contextSource !== "read-evaluation-anchor" || !run.evaluationAnchorText) {
      continue;
    }
    const name =
      typeof run.evaluationAnchorName === "string" && run.evaluationAnchorName.trim()
        ? run.evaluationAnchorName.trim()
        : null;
    const relevantPaths = Array.isArray(run.evaluationAnchorRelevantPaths)
      ? run.evaluationAnchorRelevantPaths.filter(
          (path): path is string =>
            typeof path === "string" && path.trim().length > 0,
        )
      : [];
    const irrelevantPaths = Array.isArray(run.evaluationAnchorIrrelevantPaths)
      ? run.evaluationAnchorIrrelevantPaths.filter(
          (path): path is string =>
            typeof path === "string" && path.trim().length > 0,
        )
      : [];
    const dedupeKey = `${name || ""}\u0000${run.evaluationAnchorText}\u0000${relevantPaths.join(",")}\u0000${irrelevantPaths.join(",")}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    anchors.push({
      id: run.id,
      name,
      text: run.evaluationAnchorText,
      relevantPaths,
      irrelevantPaths,
      repositoryFullName: run.repository || null,
      createdAt: run.created_at,
    });
  }
  return anchors;
}
