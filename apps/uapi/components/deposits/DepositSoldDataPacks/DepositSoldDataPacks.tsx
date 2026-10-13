'use client';

/**
 * Realized earnings on /deposits — DataPacks this depositor sold (settled by
 * readers), each with its payout state and a deep link to the Exchange detail
 * where the seller chooses the BTD vs pay-asset compensation split.
 */

import React from "react";

import { buildExchangeHref } from "@/components/bitcode/routes/ProductRoutes/product-routes";
import { useDepositSoldDataPacks } from "./hooks/use-deposit-sold-data-packs";

/** Whole-BTD display for an 18-decimal base-unit volume. */
function formatBtd(volume: string | null): string | null {
  if (!volume) return null;
  try {
    const base = BigInt(volume);
    const scale = 10n ** 18n;
    const whole = base / scale;
    const frac = (base % scale).toString().padStart(18, "0").slice(0, 4).replace(/0+$/, "");
    return `${whole}${frac ? `.${frac}` : ""} BTD`;
  } catch {
    return null;
  }
}

export function DepositSoldDataPacks() {
  const { packs, isLoading, error } = useDepositSoldDataPacks();
  const awaitingSplit = packs.filter((pack) => pack.payoutState !== "finalized").length;

  return (
    <section className="mt-3 border-t border-emerald-300/15 pt-3" data-testid="deposit-sold-data-packs">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[0.58rem] uppercase tracking-[0.14em] text-neutral-500">
          Sold DataPacks
        </p>
        {awaitingSplit > 0 ? (
          <span className="text-[0.62rem] uppercase tracking-[0.12em] text-amber-200">
            {awaitingSplit} awaiting your split
          </span>
        ) : null}
      </div>
      {isLoading ? (
        <p className="mt-1 text-xs text-neutral-500">Loading settled sales…</p>
      ) : error ? (
        <p className="mt-1 text-xs text-rose-200">{error}</p>
      ) : packs.length === 0 ? (
        <p className="mt-1 text-xs leading-5 text-neutral-400">
          No settled sales yet. When a reader buys a DataPack you admitted, it appears here
          for you to choose your BTD / pay-asset compensation split.
        </p>
      ) : (
        <ul className="mt-2 grid gap-1.5">
          {packs.map((pack) => {
            const finalized = pack.payoutState === "finalized";
            return (
              <li key={pack.settleRunId}>
                <a
                  href={buildExchangeHref(
                    new URLSearchParams({ type: "my-deposited-settled", detailId: pack.settleRunId }),
                  )}
                  className="grid gap-0.5 border border-white/10 bg-black/20 px-2.5 py-2 transition hover:border-emerald-300/40"
                  data-testid="deposit-sold-data-pack"
                >
                  <span className="text-xs font-medium text-white">{pack.title}</span>
                  <span className="text-[0.66rem] text-neutral-400">
                    {[formatBtd(pack.btdVolume), pack.payAsset ? `paid in ${pack.payAsset}` : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                  <span
                    className={`text-[0.62rem] uppercase tracking-[0.12em] ${
                      finalized ? "text-emerald-200" : "text-amber-200"
                    }`}
                  >
                    {finalized ? "Split finalized" : "Choose compensation split →"}
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
