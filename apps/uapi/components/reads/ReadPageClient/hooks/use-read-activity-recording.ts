/**
 * Reading activity-ledger recording: POST history, Evaluation anchor save/delete.
 */
"use client";

import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { PipelineExecution } from "@/types/api";
import type { WorkspaceRun } from "@/components/bitcode/pipeline/models/pipeline-run-data";
import type { RepositoryContextState } from "@/components/bitcode/pipeline/models/repository-context";
import {
  buildProductExecutionHistoryRequest,
  buildProductEvaluationAnchorDraft,
  mapExecutionHistoryRunToWorkspaceRun,
  readProductRouteError,
  upsertWorkspaceRun,
  type ProductActivityRecordDraft,
} from "@/components/bitcode/pipeline/models/pipeline-activity-history";

export function useReadActivityRecording(input: {
  repositoryContext: RepositoryContextState | null;
  selectedRun: WorkspaceRun | null;
  liveRuns: WorkspaceRun[];
  setLiveRuns: Dispatch<SetStateAction<WorkspaceRun[]>>;
  refreshLiveRuns: (options?: { soft?: boolean }) => void | Promise<unknown>;
  openReadRouteTransaction: (id: string) => void;
  evaluation: string;
  evaluationAnchorName: string;
  relevantPaths: string[];
  irrelevantPaths: string[];
  setIsAnchoringEvaluation: (v: boolean) => void;
  setEvaluationAnchorMessage: (v: string | null) => void;
  setIsEvaluationAnchorPopoverOpen: (v: boolean) => void;
}) {
  const {
    repositoryContext,
    selectedRun,
    liveRuns,
    setLiveRuns,
    refreshLiveRuns,
    openReadRouteTransaction,
    evaluation,
    evaluationAnchorName,
    relevantPaths,
    irrelevantPaths,
    setIsAnchoringEvaluation,
    setEvaluationAnchorMessage,
    setIsEvaluationAnchorPopoverOpen,
  } = input;

  const handleRecordActivity = useCallback(
    async (draft: ProductActivityRecordDraft) => {
      const response = await fetch("/api/executions/history", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          buildProductExecutionHistoryRequest(draft, {
            repositoryContext,
            fallbackRun: selectedRun,
          }),
        ),
      });

      if (!response.ok) {
        throw new Error(
          await readProductRouteError(
            response,
            "Unable to record Reading activity.",
          ),
        );
      }

      const payload = (await response.json()) as {
        execution?: PipelineExecution;
      };
      if (!payload.execution) {
        throw new Error(
          "Reading activity response did not include an execution row.",
        );
      }

      const nextRun = mapExecutionHistoryRunToWorkspaceRun(payload.execution);
      setLiveRuns((currentRuns) => upsertWorkspaceRun(currentRuns, nextRun));
      if (draft.selectAfterRecord !== false) {
        openReadRouteTransaction(nextRun.id);
      }
      void refreshLiveRuns({ soft: true });
      return nextRun;
    },
    [
      refreshLiveRuns,
      openReadRouteTransaction,
      repositoryContext,
      selectedRun,
      setLiveRuns,
    ],
  );

  const handleAnchorEvaluation = useCallback(async () => {
    if (!evaluation.trim()) return;
    setIsAnchoringEvaluation(true);
    setEvaluationAnchorMessage(null);
    try {
      await handleRecordActivity(
        buildProductEvaluationAnchorDraft({
          evaluation,
          name: evaluationAnchorName,
          repositoryFullName:
            repositoryContext?.selectedRepository?.fullName || null,
          relevantPaths,
          irrelevantPaths,
        }),
      );
      setEvaluationAnchorMessage(
        evaluationAnchorName.trim()
          ? `Evaluation anchor "${evaluationAnchorName.trim()}" saved into the Bitcode activity ledger.`
          : "Evaluation configuration anchored into the Bitcode activity ledger.",
      );
      setIsEvaluationAnchorPopoverOpen(false);
    } catch (error) {
      setEvaluationAnchorMessage(
        error instanceof Error
          ? error.message
          : "Unable to anchor the Evaluation configuration.",
      );
    } finally {
      setIsAnchoringEvaluation(false);
    }
  }, [
    handleRecordActivity,
    irrelevantPaths,
    evaluation,
    evaluationAnchorName,
    relevantPaths,
    repositoryContext,
    setIsAnchoringEvaluation,
    setIsEvaluationAnchorPopoverOpen,
    setEvaluationAnchorMessage,
  ]);

  const handleDeleteEvaluationAnchor = useCallback(
    async (anchorId: string) => {
      if (!anchorId) return;
      const previousRuns = liveRuns;
      setLiveRuns((current) => current.filter((run) => run.id !== anchorId));
      setEvaluationAnchorMessage(null);
      try {
        const response = await fetch(
          `/api/executions/history/${encodeURIComponent(anchorId)}`,
          { method: "DELETE" },
        );
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(
            payload?.error || "Unable to delete the Evaluation anchor.",
          );
        }
        setEvaluationAnchorMessage("Evaluation anchor deleted.");
      } catch (error) {
        setLiveRuns(previousRuns);
        setEvaluationAnchorMessage(
          error instanceof Error
            ? error.message
            : "Unable to delete the Evaluation anchor.",
        );
      }
    },
    [liveRuns, setLiveRuns, setEvaluationAnchorMessage],
  );

  return {
    handleRecordActivity,
    handleAnchorEvaluation,
    handleDeleteEvaluationAnchor,
  };
}
