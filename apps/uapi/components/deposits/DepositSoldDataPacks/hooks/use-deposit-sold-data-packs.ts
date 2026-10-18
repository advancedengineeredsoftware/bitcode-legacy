/**
 * Seller's sold DataPacks: settled read deliveries this account contributed
 * to (GET /api/packs/activity seller lens, `my-deposited-settled`). V49 S-5:
 * multi-contributor settles show THIS seller's source-to-shares slice (weight,
 * slice BTD / coin after the protocol fee) and its own split status.
 */
"use client";

import { useCallback, useEffect, useState } from "react";

export type DepositSoldDataPack = {
  settleRunId: string;
  title: string;
  repository: string | null;
  payoutState: string;
  btdVolume: string | null;
  payAsset: string | null;
  settledAt: string | null;
  /** This seller's contribution share (bps) when the settle has a statement. */
  weightBps: number | null;
  /** This seller's slice of the net coin payment (base units). */
  slicePay: string | null;
  /** Protocol coin fee (bps) taken before contributor slices. */
  protocolCoinFeeBps: number | null;
};

type ActivityRecord = {
  id: string;
  type?: string;
  title?: string;
  assetPackTitle?: string | null;
  repository?: string | null;
  timestamp?: string | null;
  compensationState?: string | null;
  metadata?: Record<string, unknown>;
};

export function toSoldDataPack(record: ActivityRecord): DepositSoldDataPack | null {
  const metadata = record.metadata || {};
  if (record.type !== "settled-assetpack" || metadata.viewerIsSeller !== true) return null;
  const slice =
    metadata.viewerContributorSlice && typeof metadata.viewerContributorSlice === "object"
      ? (metadata.viewerContributorSlice as Record<string, unknown>)
      : null;
  const statement =
    metadata.compensationStatement && typeof metadata.compensationStatement === "object"
      ? (metadata.compensationStatement as Record<string, unknown>)
      : null;
  if (slice) {
    return {
      settleRunId: record.id,
      title: record.assetPackTitle || record.title || "DataPack",
      repository: record.repository ?? null,
      payoutState: slice.status === "finalized" ? "finalized" : "pending-seller-review",
      btdVolume: typeof slice.sliceBtd === "string" ? slice.sliceBtd : null,
      payAsset: typeof statement?.payAsset === "string" ? statement.payAsset : null,
      settledAt: record.timestamp ?? null,
      weightBps: typeof slice.weightBps === "number" ? slice.weightBps : null,
      slicePay: typeof slice.slicePay === "string" ? slice.slicePay : null,
      protocolCoinFeeBps: typeof statement?.protocolCoinFeeBps === "number" ? statement.protocolCoinFeeBps : null,
    };
  }
  const pending =
    metadata.pendingPayout && typeof metadata.pendingPayout === "object"
      ? (metadata.pendingPayout as Record<string, unknown>)
      : {};
  return {
    settleRunId: record.id,
    title: record.assetPackTitle || record.title || "DataPack",
    repository: record.repository ?? null,
    payoutState: String(pending.status || metadata.payoutState || record.compensationState || "pending-seller-review"),
    btdVolume: typeof pending.btdVolume === "string" ? pending.btdVolume : null,
    payAsset: typeof pending.payAsset === "string" ? pending.payAsset : null,
    settledAt: record.timestamp ?? null,
    weightBps: null,
    slicePay: null,
    protocolCoinFeeBps: null,
  };
}

export function useDepositSoldDataPacks() {
  const [packs, setPacks] = useState<DepositSoldDataPack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/packs/activity?type=my-deposited-settled&limit=25");
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        throw new Error(typeof payload?.error === "string" ? payload.error : "Unable to load sold DataPacks.");
      }
      const records: ActivityRecord[] = Array.isArray(payload.records) ? payload.records : [];
      setPacks(records.map(toSoldDataPack).filter((pack): pack is DepositSoldDataPack => pack !== null));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load sold DataPacks.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { packs, isLoading, error, refresh };
}
