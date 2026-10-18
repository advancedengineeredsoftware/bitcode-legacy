/**
 * Buyer's owned DataPacks (V49 S-5): settled read deliveries this account
 * bought (GET /api/packs/activity buyer lens, `my-read-bought`) with delivery
 * state, PR and payment links, and the compensation statement summary.
 * `redeliver` retries a projected / failed PR delivery (S-6).
 */
"use client";

import { useCallback, useEffect, useState } from "react";

export type ReadsOwnedDataPack = {
  settleRunId: string;
  title: string;
  repository: string | null;
  deliveryState: string;
  prUrl: string | null;
  paymentExplorerUrl: string | null;
  payAsset: string | null;
  protocolCoinFeeBps: number | null;
  contributorCount: number;
  compensationMode: string | null;
  settledAt: string | null;
};

type ActivityRecord = {
  id: string;
  type?: string;
  title?: string;
  assetPackTitle?: string | null;
  repository?: string | null;
  timestamp?: string | null;
  metadata?: Record<string, unknown>;
};

function str(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
}

export function toOwnedDataPack(record: ActivityRecord): ReadsOwnedDataPack | null {
  const metadata = record.metadata || {};
  if (record.type !== "settled-assetpack" || metadata.viewerIsBuyer !== true) return null;
  const context = (metadata.context && typeof metadata.context === "object" ? metadata.context : {}) as Record<string, unknown>;
  const output = (metadata.output && typeof metadata.output === "object" ? metadata.output : {}) as Record<string, unknown>;
  const statement = (metadata.compensationStatement && typeof metadata.compensationStatement === "object"
    ? metadata.compensationStatement
    : null) as Record<string, unknown> | null;
  return {
    settleRunId: record.id,
    title: record.assetPackTitle || record.title || "DataPack",
    repository: record.repository ?? str(context.repositoryFullName),
    deliveryState: str(output.deliveryState) || str(context.deliveryState) || "projected",
    prUrl: str(output.prUrl) || str(context.prUrl),
    paymentExplorerUrl: str(output.paymentExplorerUrl) || str(context.paymentExplorerUrl),
    payAsset: str(statement?.payAsset) || str(context.payAsset),
    protocolCoinFeeBps: typeof statement?.protocolCoinFeeBps === "number" ? statement.protocolCoinFeeBps : null,
    contributorCount: Array.isArray(statement?.contributors) ? (statement!.contributors as unknown[]).length : 0,
    compensationMode: str(statement?.mode) || str(context.compensationMode),
    settledAt: record.timestamp ?? null,
  };
}

export function useReadsOwnedDataPacks() {
  const [packs, setPacks] = useState<ReadsOwnedDataPack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [redelivering, setRedelivering] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/packs/activity?type=my-read-bought&limit=25");
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        throw new Error(typeof payload?.error === "string" ? payload.error : "Unable to load owned DataPacks.");
      }
      const records: ActivityRecord[] = Array.isArray(payload.records) ? payload.records : [];
      setPacks(records.map(toOwnedDataPack).filter((pack): pack is ReadsOwnedDataPack => pack !== null));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load owned DataPacks.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const redeliver = useCallback(
    async (settleRunId: string) => {
      setRedelivering(settleRunId);
      try {
        const response = await fetch("/api/read/settle/redeliver", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ settleRunId }),
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.ok) {
          setError(typeof payload?.error === "string" ? payload.error : "Redelivery did not open a pull request.");
        }
        await refresh();
      } finally {
        setRedelivering(null);
      }
    },
    [refresh],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { packs, isLoading, error, refresh, redeliver, redelivering };
}
