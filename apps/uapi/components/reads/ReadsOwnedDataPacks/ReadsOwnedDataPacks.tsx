'use client';

/**
 * Owned DataPacks on /reads (V49 S-5) — settled packs this reader bought, with
 * repository delivery (PR) state, payment link, and compensation summary.
 * Projected / failed deliveries offer Redeliver (S-6).
 */

import React from "react";

import { useReadsOwnedDataPacks } from "./hooks/use-reads-owned-data-packs";

export function ReadsOwnedDataPacks() {
  const { packs, isLoading, error, redeliver, redelivering } = useReadsOwnedDataPacks();

  return (
    <section className="mt-3 border-t border-orange-300/15 pt-3" data-testid="reads-owned-data-packs">
      <p className="text-[0.58rem] uppercase tracking-[0.14em] text-neutral-500">Owned DataPacks</p>
      {isLoading ? (
        <p className="mt-1 text-xs text-neutral-500">Loading owned DataPacks…</p>
      ) : packs.length === 0 ? (
        <p className="mt-1 text-xs leading-5 text-neutral-400">
          No purchases yet. Settled DataPacks appear here with their pull request and payment receipt.
        </p>
      ) : (
        <ul className="mt-2 grid gap-1.5">
          {packs.map((pack) => {
            const delivered = pack.deliveryState === "opened" && pack.prUrl;
            const canRedeliver = pack.deliveryState === "projected" || pack.deliveryState === "failed";
            return (
              <li
                key={pack.settleRunId}
                className="grid gap-0.5 border border-white/10 bg-black/20 px-2.5 py-2"
                data-testid="reads-owned-data-pack"
              >
                <span className="text-xs font-medium text-white">{pack.title}</span>
                <span className="text-[0.66rem] text-neutral-400">
                  {[
                    pack.repository,
                    pack.payAsset ? `paid in ${pack.payAsset}` : null,
                    pack.compensationMode === "treasury-only"
                      ? "no Depository contributor"
                      : pack.contributorCount
                        ? `${pack.contributorCount} contributor${pack.contributorCount === 1 ? "" : "s"}`
                        : null,
                    pack.protocolCoinFeeBps != null ? `${pack.protocolCoinFeeBps / 100}% protocol fee` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
                <span className="flex flex-wrap gap-3 text-[0.62rem] uppercase tracking-[0.12em]">
                  {delivered ? (
                    <a href={pack.prUrl!} target="_blank" rel="noreferrer" className="text-emerald-200 hover:underline">
                      Pull request →
                    </a>
                  ) : (
                    <span className="text-amber-200">Delivery {pack.deliveryState}</span>
                  )}
                  {pack.paymentExplorerUrl ? (
                    <a href={pack.paymentExplorerUrl} target="_blank" rel="noreferrer" className="text-neutral-300 hover:underline">
                      Payment →
                    </a>
                  ) : null}
                  {canRedeliver ? (
                    <button
                      type="button"
                      className="text-orange-200 hover:underline disabled:opacity-60"
                      disabled={redelivering === pack.settleRunId}
                      onClick={() => void redeliver(pack.settleRunId)}
                      data-testid="reads-owned-data-pack-redeliver"
                    >
                      {redelivering === pack.settleRunId ? "Redelivering…" : "Redeliver"}
                    </button>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {error ? <p className="mt-1 text-xs text-rose-200">{error}</p> : null}
    </section>
  );
}

export default ReadsOwnedDataPacks;
