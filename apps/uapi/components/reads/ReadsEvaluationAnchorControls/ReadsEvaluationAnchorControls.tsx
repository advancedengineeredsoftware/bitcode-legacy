"use client";

/**
 * Evaluation panel header controls — load/clear/anchor name popover.
 * Presentational; parent owns anchor state and persistence handlers.
 * Deposit twin: DepositObfuscationsAnchorControls (orange tone for Reads).
 */

import React from "react";
import { Anchor, FolderMinus, FolderPlus, RefreshCw } from "lucide-react";
import { SearchableSelect } from "@/components/bitcode/forms/SearchableSelect/SearchableSelect";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/shadcn/Popover/Popover";
import {
  formatEvaluationAnchorDescription,
  normalizeEvaluationAnchorPaths,
} from "@/components/bitcode/pipeline/models/pipeline-activity-history";
import type { ReadEvaluationAnchor } from "@/components/reads/models/read-activity-ledger";

function clipEvaluationAnchorText(text: string, textClipLength = 40): string {
  const clipAt = Math.max(8, textClipLength);
  const raw =
    typeof text === "string" ? text.trim().replace(/\s+/g, " ") : "";
  if (!raw) return "(empty)";
  return raw.length > clipAt ? `${raw.slice(0, clipAt).trimEnd()}…` : raw;
}

function EvaluationAnchorDescription({
  text,
  relevantPaths,
  irrelevantPaths,
  textClipLength,
}: {
  text: string;
  relevantPaths?: string[] | null;
  irrelevantPaths?: string[] | null;
  textClipLength?: number;
}) {
  const clipped = clipEvaluationAnchorText(text, textClipLength);
  const relevantCount = normalizeEvaluationAnchorPaths(relevantPaths).length;
  const irrelevantCount = normalizeEvaluationAnchorPaths(irrelevantPaths).length;
  const relevantAria = `${relevantCount} relevant path${
    relevantCount === 1 ? "" : "s"
  }`;
  const irrelevantAria = `${irrelevantCount} irrelevant path${
    irrelevantCount === 1 ? "" : "s"
  }`;

  return (
    <span className="flex min-w-0 max-w-full items-center gap-1.5 overflow-hidden whitespace-nowrap">
      <span className="min-w-0 truncate text-neutral-400" title={clipped}>
        {clipped}
      </span>
      <span className="shrink-0 text-neutral-600" aria-hidden="true">
        |
      </span>
      <span
        className="inline-flex shrink-0 items-center gap-0.5 text-neutral-300"
        aria-label={relevantAria}
        title={relevantAria}
      >
        <FolderPlus
          className="h-3 w-3 text-orange-300/80"
          aria-hidden="true"
        />
        <span className="tabular-nums">{relevantCount}</span>
      </span>
      <span className="shrink-0 text-neutral-600" aria-hidden="true">
        |
      </span>
      <span
        className="inline-flex shrink-0 items-center gap-0.5 text-neutral-300"
        aria-label={irrelevantAria}
        title={irrelevantAria}
      >
        <FolderMinus className="h-3 w-3 text-rose-300/80" aria-hidden="true" />
        <span className="tabular-nums">{irrelevantCount}</span>
      </span>
    </span>
  );
}

export type ReadsEvaluationAnchorControlsProps = {
  isConfigLocked: boolean;
  evaluation: string;
  evaluationAnchors: readonly ReadEvaluationAnchor[];
  evaluationAnchorName: string;
  onEvaluationAnchorNameChange: (value: string) => void;
  isEvaluationAnchorPopoverOpen: boolean;
  onEvaluationAnchorPopoverOpenChange: (open: boolean) => void;
  isAnchoringEvaluation: boolean;
  onAnchorEvaluation: () => void | Promise<void>;
  onDeleteEvaluationAnchor: (id: string) => void | Promise<void>;
  onLoadAnchor: (anchor: ReadEvaluationAnchor) => void;
  onClear: () => void;
  relevantPathsLength: number;
  irrelevantPathsLength: number;
};

export function ReadsEvaluationAnchorControls(props: ReadsEvaluationAnchorControlsProps) {
  const {
    isConfigLocked,
    evaluation,
    evaluationAnchors,
    evaluationAnchorName,
    onEvaluationAnchorNameChange,
    isEvaluationAnchorPopoverOpen,
    onEvaluationAnchorPopoverOpenChange,
    isAnchoringEvaluation,
    onAnchorEvaluation,
    onDeleteEvaluationAnchor,
    onLoadAnchor,
    onClear,
    relevantPathsLength,
    irrelevantPathsLength,
  } = props;

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {evaluationAnchors.length > 0 ? (
        <div className="w-56">
          <SearchableSelect
            aria-label="Load a previously anchored Evaluation configuration"
            items={evaluationAnchors.map((anchor) => ({
              key: anchor.id,
              label:
                anchor.name || anchor.repositoryFullName || "Evaluation anchor",
              description: (
                <EvaluationAnchorDescription
                  text={anchor.text}
                  relevantPaths={anchor.relevantPaths}
                  irrelevantPaths={anchor.irrelevantPaths}
                />
              ),
              searchText: [
                anchor.name,
                anchor.repositoryFullName,
                formatEvaluationAnchorDescription({
                  text: anchor.text,
                  relevantPaths: anchor.relevantPaths,
                  irrelevantPaths: anchor.irrelevantPaths,
                }),
              ]
                .filter(Boolean)
                .join(" "),
              deletable: true,
            }))}
            value={null}
            disabled={isConfigLocked}
            onSelect={(key) => {
              if (isConfigLocked) return;
              const anchor = evaluationAnchors.find((entry) => entry.id === key);
              if (!anchor) return;
              onLoadAnchor(anchor);
            }}
            onDeleteItem={
              isConfigLocked
                ? undefined
                : (key) => {
                    void onDeleteEvaluationAnchor(key);
                  }
            }
            showSelectionIndicator={false}
            placeholder="Load anchor..."
            searchPlaceholder="Search anchors..."
            emptyMessage="No anchors yet."
            className="h-9"
          />
        </div>
      ) : null}
      <button
        type="button"
        aria-label="Clear need"
        title="Clear need"
        disabled={
          isConfigLocked ||
          (!evaluation &&
            !evaluationAnchorName &&
            relevantPathsLength === 0 &&
            irrelevantPathsLength === 0)
        }
        onClick={onClear}
        className="border border-white/10 px-2.5 py-1.5 text-[0.66rem] uppercase tracking-[0.14em] text-neutral-300 transition hover:border-rose-300/35 hover:text-rose-100 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Clear
      </button>
      <Popover
        open={isEvaluationAnchorPopoverOpen}
        onOpenChange={(open) => {
          if (isConfigLocked) return;
          if (open && !evaluation.trim()) return;
          if (isAnchoringEvaluation) return;
          onEvaluationAnchorPopoverOpenChange(open);
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Anchor need to the activity ledger"
            title="Anchor need to the activity ledger"
            data-testid="reads-evaluation-anchor-button"
            disabled={isConfigLocked || !evaluation.trim() || isAnchoringEvaluation}
            className="flex h-9 w-9 items-center justify-center border border-white/10 bg-white/5 text-neutral-200 transition hover:border-orange-300/35 hover:bg-orange-300/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isAnchoringEvaluation ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Anchor className="h-4 w-4" />
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          sideOffset={6}
          className="w-64 border-white/10 bg-neutral-950 p-3 text-neutral-100 shadow-xl"
        >
          <p className="text-[0.62rem] uppercase tracking-[0.14em] text-neutral-500">
            Name this anchor
          </p>
          <input
            id="reads-evaluation-anchor-name"
            type="text"
            value={evaluationAnchorName}
            onChange={(event) =>
              onEvaluationAnchorNameChange(event.target.value.slice(0, 80))
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void onAnchorEvaluation();
              }
              if (event.key === "Escape") {
                event.preventDefault();
                onEvaluationAnchorPopoverOpenChange(false);
              }
            }}
            placeholder="Optional name"
            maxLength={80}
            autoFocus
            aria-label="Evaluation anchor name"
            className="mt-2 h-9 w-full border border-white/10 bg-black/40 px-2.5 text-xs text-neutral-100 outline-none transition placeholder:text-neutral-500 focus:border-orange-300/35"
          />
          <p className="mt-1.5 text-[0.68rem] leading-4 text-neutral-500">
            Shown as the label when reloading. Leave blank to use the repository
            name.
          </p>
          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => onEvaluationAnchorPopoverOpenChange(false)}
              disabled={isAnchoringEvaluation}
              className="border border-white/10 px-2.5 py-1.5 text-[0.62rem] uppercase tracking-[0.14em] text-neutral-300 transition hover:border-white/25 disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="button"
              data-testid="reads-evaluation-anchor-save"
              onClick={() => {
                void onAnchorEvaluation();
              }}
              disabled={!evaluation.trim() || isAnchoringEvaluation}
              className="inline-flex items-center gap-1.5 border border-orange-300/30 bg-orange-300/12 px-2.5 py-1.5 text-[0.62rem] uppercase tracking-[0.14em] text-orange-100 transition hover:border-orange-200/45 hover:bg-orange-300/18 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isAnchoringEvaluation ? (
                <RefreshCw className="h-3 w-3 animate-spin" aria-hidden="true" />
              ) : (
                <Anchor className="h-3 w-3" aria-hidden="true" />
              )}
              Save anchor
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
