/**
 * Read Evaluation compose + option synthesis/review (deposit Obfuscations twin).
 * Free-text Evaluation + Relevant / Irrelevant path pickers + synthesize CTA.
 * Anchor controls mirror DepositObfuscationsAnchorControls (save/load/clear).
 * Options list and settle live in the parent detail grid (deposit parity).
 * Cancel lives only on ReadsPipelineTelemetry (header right) — not here.
 *
 * Run detail (non-new): hide synthesize and lock Evaluation/paths — same law as
 * DepositObfuscationsPanel + isRunReviewLocked.
 */
"use client";

import React from "react";
import type {
  ReadSynthesisStatus,
} from "@/components/reads/ReadPageClient/hooks/use-read-option-synthesis";
import type { RepositoryContextState } from "@/components/bitcode/pipeline/models/repository-context";
import { ProductSynthesizeDataPackOptionsButton } from "@/components/bitcode/routes/ProductSynthesizeDataPackOptionsButton/ProductSynthesizeDataPackOptionsButton";
import { ReadsEvaluationPathPickers } from "@/components/reads/ReadsEvaluationPathPickers/ReadsEvaluationPathPickers";
import { ReadsEvaluationAnchorControls } from "@/components/reads/ReadsEvaluationAnchorControls/ReadsEvaluationAnchorControls";
import type { ReadEvaluationAnchor } from "@/components/reads/models/read-activity-ledger";

export function ReadsEvaluationComposePanel(props: {
  evaluation: string;
  onEvaluationChange: (value: string) => void;
  relevantPaths: string[];
  onRelevantPathsChange: (paths: string[]) => void;
  irrelevantPaths: string[];
  onIrrelevantPathsChange: (paths: string[]) => void;
  repositoryContext: RepositoryContextState | null;
  status: ReadSynthesisStatus;
  error: string | null;
  runId: string | null;
  onSynthesize: () => void;
  canSynthesize: boolean;
  isConfigLocked?: boolean;
  /** Pipeline run detail (not fresh compose) — hide synthesize CTA. */
  isRunReviewLocked?: boolean;
  evaluationAnchors?: readonly ReadEvaluationAnchor[];
  evaluationAnchorName?: string;
  onEvaluationAnchorNameChange?: (value: string) => void;
  isEvaluationAnchorPopoverOpen?: boolean;
  onEvaluationAnchorPopoverOpenChange?: (open: boolean) => void;
  isAnchoringEvaluation?: boolean;
  evaluationAnchorMessage?: string | null;
  onAnchorEvaluation?: () => void | Promise<void>;
  onDeleteEvaluationAnchor?: (id: string) => void | Promise<void>;
}) {
  const {
    evaluation,
    onEvaluationChange,
    relevantPaths,
    onRelevantPathsChange,
    irrelevantPaths,
    onIrrelevantPathsChange,
    repositoryContext,
    status,
    error,
    runId,
    onSynthesize,
    canSynthesize,
    isConfigLocked = false,
    isRunReviewLocked = false,
    evaluationAnchors = [],
    evaluationAnchorName = "",
    onEvaluationAnchorNameChange,
    isEvaluationAnchorPopoverOpen = false,
    onEvaluationAnchorPopoverOpenChange,
    isAnchoringEvaluation = false,
    evaluationAnchorMessage = null,
    onAnchorEvaluation,
    onDeleteEvaluationAnchor,
  } = props;

  const anchorsEnabled = Boolean(onAnchorEvaluation && onEvaluationAnchorNameChange);
  const synthesisRunning = status === "running";

  return (
    <section
      data-testid="reads-evaluation-compose"
      className={`border border-white/10 bg-white/[0.035] px-4 py-4 ${
        isConfigLocked ? "opacity-80" : ""
      }`}
      aria-label="Read Evaluations and path steering"
      aria-disabled={isConfigLocked ? true : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.68rem] uppercase tracking-[0.22em] text-orange-200/80">
            Option synthesis
          </p>
          <h2 className="mt-2 text-lg font-semibold text-white">Evaluations</h2>
        </div>
        {anchorsEnabled ? (
          <ReadsEvaluationAnchorControls
            isConfigLocked={isConfigLocked}
            evaluation={evaluation}
            evaluationAnchors={evaluationAnchors}
            evaluationAnchorName={evaluationAnchorName}
            onEvaluationAnchorNameChange={onEvaluationAnchorNameChange!}
            isEvaluationAnchorPopoverOpen={isEvaluationAnchorPopoverOpen}
            onEvaluationAnchorPopoverOpenChange={(open) =>
              onEvaluationAnchorPopoverOpenChange?.(open)
            }
            isAnchoringEvaluation={isAnchoringEvaluation}
            onAnchorEvaluation={onAnchorEvaluation!}
            onDeleteEvaluationAnchor={(id) => {
              void onDeleteEvaluationAnchor?.(id);
            }}
            onLoadAnchor={(anchor) => {
              onEvaluationChange(anchor.text);
              onEvaluationAnchorNameChange?.(anchor.name || "");
              onRelevantPathsChange(anchor.relevantPaths);
              onIrrelevantPathsChange(anchor.irrelevantPaths);
            }}
            onClear={() => {
              onEvaluationChange("");
              onEvaluationAnchorNameChange?.("");
              onRelevantPathsChange([]);
              onIrrelevantPathsChange([]);
              onEvaluationAnchorPopoverOpenChange?.(false);
            }}
            relevantPathsLength={relevantPaths.length}
            irrelevantPathsLength={irrelevantPaths.length}
          />
        ) : null}
      </div>
      <p className="mt-2 text-sm leading-6 text-neutral-400">
        {isRunReviewLocked
          ? "Evaluations and path steering for this pipeline run — locked while reviewing run detail."
          : "Select a repository and commit, describe how DataPacks should be evaluated, optionally steer with Relevant and Irrelevant paths, then synthesize options measured as Absolute and Relative measurements."}
      </p>

      <label htmlFor="reads-evaluation-input" className="mt-4 block text-xs text-neutral-300">
        Evaluations
      </label>
      <textarea
        id="reads-evaluation-input"
        data-testid="reads-evaluation-input"
        value={evaluation}
        onChange={(e) => onEvaluationChange(e.target.value)}
        rows={5}
        readOnly={isConfigLocked}
        disabled={isConfigLocked}
        placeholder="Describe how candidate DataPacks should be evaluated against this repository…"
        className={`mt-2 w-full border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-neutral-600 disabled:cursor-not-allowed disabled:opacity-70 ${
          isConfigLocked ? 'resize-none overflow-hidden' : 'resize-y'
        }`}
      />
      {evaluationAnchorMessage ? (
        <p
          data-testid="reads-evaluation-anchor-message"
          className="mt-2 text-xs leading-5 text-neutral-400"
        >
          {evaluationAnchorMessage}
        </p>
      ) : null}

      <ReadsEvaluationPathPickers
        isConfigLocked={isConfigLocked}
        relevantPaths={relevantPaths}
        onRelevantPathsChange={onRelevantPathsChange}
        irrelevantPaths={irrelevantPaths}
        onIrrelevantPathsChange={onIrrelevantPathsChange}
        repositoryContext={repositoryContext}
      />

      {isRunReviewLocked ? (
        // Pipeline run detail (non-new): never offer synthesize. Fresh runs only
        // via compose (New / Back → configure → Synthesize).
        <p
          data-testid="reads-evaluation-run-loaded-note"
          className="mt-4 text-xs leading-5 text-neutral-500"
        >
          Run configuration is locked for this pipeline detail. Synthesis is only
          available on a new compose — select Back, then open a fresh reading
          workbench.
        </p>
      ) : (
        <ProductSynthesizeDataPackOptionsButton
          data-testid="reads-synthesize-options"
          onClick={onSynthesize}
          disabled={!canSynthesize || !evaluation.trim() || isConfigLocked}
          running={synthesisRunning}
        />
      )}
      {runId || status !== "idle" ? (
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-neutral-500">
          {runId ? (
            <span className="font-mono text-[0.65rem]">{runId}</span>
          ) : null}
          <span className="uppercase tracking-wide">status: {status}</span>
          {status === "cancelled" ? (
            <span
              data-testid="reads-synthesis-cancelled-badge"
              className="border border-rose-300/25 bg-rose-300/10 px-2 py-0.5 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-rose-100"
            >
              Cancelled
            </span>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p
          data-testid="reads-synthesize-error"
          className="mt-3 border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100"
        >
          {error}
        </p>
      ) : null}
    </section>
  );
}
