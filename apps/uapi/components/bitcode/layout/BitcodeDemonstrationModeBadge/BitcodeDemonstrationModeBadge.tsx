"use client";

/**
 * Demonstration-mode disclosure on product routes. Renders only when the
 * public twin `NEXT_PUBLIC_BITCODE_DEMONSTRATION_MODE` is set, and states
 * exactly what is replayed (SDIVF synthesis) versus live (wallets, testnet
 * payments, GitHub delivery, payouts) so no demo is mistaken for inference.
 */

import React from "react";

const DEMONSTRATION_MODE_ENABLED = ["1", "true", "yes", "on"].includes(
  String(process.env.NEXT_PUBLIC_BITCODE_DEMONSTRATION_MODE || "").trim().toLowerCase(),
);

export const BITCODE_DEMONSTRATION_MODE_DISCLOSURE =
  "Demonstration mode: deposit and read synthesis pipelines replay a curated DataPack catalog (no live inference). Repositories, wallets, testnet payments, GitHub pull requests, and seller payouts are live.";

export function isBitcodeDemonstrationModePublic(): boolean {
  return DEMONSTRATION_MODE_ENABLED;
}

export function BitcodeDemonstrationModeBadge() {
  if (!DEMONSTRATION_MODE_ENABLED) return null;
  return (
    <span
      className="ml-auto inline-flex items-center gap-1 border border-amber-300/40 bg-amber-400/10 px-2 py-0.5 text-[0.58rem] tracking-[0.18em] text-amber-100"
      title={BITCODE_DEMONSTRATION_MODE_DISCLOSURE}
      aria-label={BITCODE_DEMONSTRATION_MODE_DISCLOSURE}
      data-testid="bitcode-demonstration-mode-badge"
    >
      Demonstration
    </span>
  );
}
