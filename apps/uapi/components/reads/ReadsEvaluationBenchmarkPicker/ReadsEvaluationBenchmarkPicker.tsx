/**
 * Declared benchmark checkboxes for the read Evaluations panel (V49 B-2).
 * Lists `.bitcode/benchmarks.json` at the selected commit via
 * GET /api/read/benchmarks; checked ids ride on the synthesize request.
 * Renders nothing when the repository declares no benchmarks.
 */
"use client";

import React, { useEffect, useState } from "react";
import type { RepositoryContextState } from "@/components/bitcode/pipeline/models/repository-context";
import {
  readBenchmarkSelection,
  readBenchmarkSelectionScope,
  writeBenchmarkSelection,
} from "@/components/reads/models/read-benchmark-selection";

type BenchmarkDescriptor = {
  id: string;
  title: string;
  unit: string | null;
  direction: "higher-is-better" | "lower-is-better";
};

export function ReadsEvaluationBenchmarkPicker(props: {
  repositoryContext: RepositoryContextState | null;
  isConfigLocked?: boolean;
}) {
  const repositoryFullName = props.repositoryContext?.selectedRepository?.fullName ?? null;
  const reference =
    props.repositoryContext?.selectedCommit || props.repositoryContext?.selectedBranch || null;
  const scope = readBenchmarkSelectionScope(repositoryFullName, reference);
  const [benchmarks, setBenchmarks] = useState<BenchmarkDescriptor[]>([]);
  const [manifestError, setManifestError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>(() => readBenchmarkSelection(scope));

  useEffect(() => {
    setSelected(readBenchmarkSelection(scope));
    setBenchmarks([]);
    setManifestError(null);
    if (!repositoryFullName) return;
    let cancelled = false;
    const params = new URLSearchParams({ repositoryFullName, reference: reference || "HEAD" });
    fetch(`/api/read/benchmarks?${params.toString()}`)
      .then((res) => res.json().catch(() => null))
      .then((payload) => {
        if (cancelled || !payload?.ok) return;
        setBenchmarks(Array.isArray(payload.benchmarks) ? payload.benchmarks : []);
        setManifestError(payload.manifestStatus === "invalid" ? String(payload.manifestError || "invalid") : null);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [scope, repositoryFullName, reference]);

  if (benchmarks.length === 0 && !manifestError) return null;

  const toggle = (id: string) => {
    const next = selected.includes(id) ? selected.filter((value) => value !== id) : [...selected, id];
    setSelected(next);
    writeBenchmarkSelection(scope, next);
  };

  return (
    <fieldset
      data-testid="reads-evaluation-benchmarks"
      className="mt-4 border border-white/10 bg-black/20 px-3 py-3"
      disabled={props.isConfigLocked}
    >
      <legend className="px-1 text-[0.62rem] uppercase tracking-[0.16em] text-neutral-500">
        Measure improvement on…
      </legend>
      {manifestError ? (
        <p className="text-xs text-rose-200/80" data-testid="reads-evaluation-benchmarks-invalid">
          .bitcode/benchmarks.json was rejected: {manifestError}
        </p>
      ) : null}
      <ul className="mt-1 grid gap-1.5">
        {benchmarks.map((benchmark) => (
          <li key={benchmark.id}>
            <label className="flex items-center gap-2 text-sm text-neutral-200">
              <input
                type="checkbox"
                data-testid={`reads-evaluation-benchmark-${benchmark.id}`}
                checked={selected.includes(benchmark.id)}
                onChange={() => toggle(benchmark.id)}
              />
              <span>{benchmark.title}</span>
              <span className="text-xs text-neutral-500">
                {benchmark.unit ? `${benchmark.unit} · ` : ""}
                {benchmark.direction === "lower-is-better" ? "lower is better" : "higher is better"}
              </span>
            </label>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs leading-5 text-neutral-500">
        Each option&apos;s patch is applied in a sandbox and the declared command re-run; the change
        becomes a Relative measurement. Failed runs carry no weight.
      </p>
    </fieldset>
  );
}
