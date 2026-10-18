/**
 * Unit tests for read activity-ledger pure projections (Evaluation anchors).
 */

import {
  READ_ACTIVITY_LEDGER_SOURCES,
  deriveEvaluationAnchors,
  filterReadPipelineTableRuns,
  isReadActivityLedgerContextSource,
} from "@/components/reads/models/read-activity-ledger";
import {
  buildProductEvaluationAnchorDraft,
  formatEvaluationAnchorDescription,
  normalizeEvaluationAnchorPaths,
} from "@/components/bitcode/pipeline/models/pipeline-activity-history";
import type { WorkspaceRun } from "@/components/bitcode/pipeline/models/pipeline-run-data";

function run(partial: Partial<WorkspaceRun> & { id: string }): WorkspaceRun {
  return {
    created_at: "2026-07-01T00:00:00.000Z",
    status: "completed",
    ...partial,
  } as WorkspaceRun;
}

describe("read-activity-ledger", () => {
  it("filters activity-ledger sources out of pipeline table runs", () => {
    const runs = [
      run({ id: "pipe-1", contextSource: "deposit-option-synthesis" }),
      run({ id: "anchor-1", contextSource: "read-evaluation-anchor" }),
      run({ id: "anchor-2", contextSource: "terminal-repository-context-panel" }),
      run({ id: "pipe-2" }),
    ];
    const filtered = filterReadPipelineTableRuns(runs);
    expect(filtered.map((r) => r.id)).toEqual(["pipe-1", "pipe-2"]);
    expect(isReadActivityLedgerContextSource("read-evaluation-anchor")).toBe(true);
    expect(READ_ACTIVITY_LEDGER_SOURCES.size).toBe(3);
  });

  it("derives need anchors with dedupe and path sets", () => {
    const runs = [
      run({
        id: "a1",
        contextSource: "read-evaluation-anchor",
        evaluationAnchorText: "add auth middleware",
        evaluationAnchorName: "Auth need",
        evaluationAnchorRelevantPaths: ["src/auth.ts"],
        evaluationAnchorIrrelevantPaths: ["vendor/"],
        repository: "acme/app",
        created_at: "2026-07-02T00:00:00.000Z",
      }),
      run({
        id: "a2",
        contextSource: "read-evaluation-anchor",
        evaluationAnchorText: "add auth middleware",
        evaluationAnchorName: "Auth need",
        evaluationAnchorRelevantPaths: ["src/auth.ts"],
        evaluationAnchorIrrelevantPaths: ["vendor/"],
        created_at: "2026-07-01T00:00:00.000Z",
      }),
    ];
    const anchors = deriveEvaluationAnchors(runs);
    expect(anchors).toHaveLength(1);
    expect(anchors[0]).toMatchObject({
      id: "a1",
      name: "Auth need",
      text: "add auth middleware",
      relevantPaths: ["src/auth.ts"],
      irrelevantPaths: ["vendor/"],
      repositoryFullName: "acme/app",
    });
  });
});

describe("buildProductEvaluationAnchorDraft", () => {
  it("normalizes paths and builds ledger-safe draft", () => {
    expect(normalizeEvaluationAnchorPaths(["  a/b  ", "", "a/b", "c"])).toEqual([
      "a/b",
      "c",
    ]);
    const draft = buildProductEvaluationAnchorDraft({
      evaluation: "  fix payment webhooks  ",
      name: "Payments",
      repositoryFullName: "acme/app",
      relevantPaths: ["src/pay.ts", "src/pay.ts"],
      irrelevantPaths: ["secrets/"],
    });
    expect(draft.selectAfterRecord).toBe(false);
    expect(draft.context).toMatchObject({
      source: "read-evaluation-anchor",
      evaluationAnchorName: "Payments",
      relevantPathCount: 1,
      irrelevantPathCount: 1,
    });
    expect(draft.output).toMatchObject({
      evaluationAnchor: {
        text: "fix payment webhooks",
        name: "Payments",
        relevantPaths: ["src/pay.ts"],
        irrelevantPaths: ["secrets/"],
      },
    });
    expect(
      formatEvaluationAnchorDescription({
        text: "fix payment webhooks",
        relevantPaths: ["src/pay.ts"],
        irrelevantPaths: ["secrets/"],
      }),
    ).toContain("1 relevant path");
  });
});
