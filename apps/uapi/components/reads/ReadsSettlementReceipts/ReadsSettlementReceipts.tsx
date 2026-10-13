/**
 * Post-settle receipts on /reads — one row per bought DataPack (1:1 settle):
 * delivery state + GitHub pull request link, on-chain payment link, and a
 * deep link to the settled pack on /exchange (entitled patch + seller payout).
 */

"use client";

import React from "react";
import { ExternalLink, GitPullRequest, Receipt } from "lucide-react";

import { buildExchangeHref } from "@/components/bitcode/routes/ProductRoutes/product-routes";

export type ReadSettlementReceipt = {
  ok: boolean;
  settleRunId: string;
  optionTitle?: string | null;
  error?: string;
  shippable?: {
    prUrl?: string | null;
    status?: string | null;
    note?: string | null;
    repository?: { fullName?: string | null } | null;
  } | null;
  payment?: {
    txId?: string | null;
    explorerUrl?: string | null;
    payAsset?: string | null;
    confirmed?: boolean;
  } | null;
};

function deliveryLabel(receipt: ReadSettlementReceipt): string {
  if (!receipt.ok) return "Settle failed";
  const status = String(receipt.shippable?.status || "").toLowerCase();
  if (status === "opened") return "Pull request opened";
  if (status === "failed") return "Delivery failed — recorded for repair";
  return "Delivery projected";
}

function shortTx(txId: string): string {
  return txId.length > 18 ? `${txId.slice(0, 10)}…${txId.slice(-6)}` : txId;
}

export function ReadsSettlementReceipts({ receipts }: { receipts: ReadSettlementReceipt[] }) {
  if (receipts.length === 0) return null;
  return (
    <div
      className="space-y-2 border border-emerald-300/30 bg-emerald-400/[0.07] px-3 py-3"
      data-testid="reads-settlement-receipts"
      role="status"
    >
      <p className="text-[0.62rem] uppercase tracking-[0.18em] text-emerald-100/80">
        Settled · {receipts.filter((r) => r.ok).length} of {receipts.length} DataPack(s)
      </p>
      <ul className="space-y-2">
        {receipts.map((receipt) => {
          const prUrl = receipt.shippable?.prUrl || null;
          const payment = receipt.payment;
          return (
            <li
              key={receipt.settleRunId}
              className="grid gap-1.5 border border-white/10 bg-black/25 px-3 py-2.5"
              data-testid="reads-settlement-receipt"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-medium text-white">
                  {receipt.optionTitle || "DataPack"}
                </p>
                <span
                  className={`text-[0.68rem] uppercase tracking-[0.14em] ${
                    receipt.ok && prUrl ? "text-emerald-200" : receipt.ok ? "text-amber-200" : "text-rose-200"
                  }`}
                >
                  {deliveryLabel(receipt)}
                </span>
              </div>
              {receipt.error ? (
                <p className="text-xs text-rose-200">{receipt.error}</p>
              ) : receipt.shippable?.note && !prUrl ? (
                <p className="text-xs text-neutral-400">{receipt.shippable.note}</p>
              ) : null}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                {prUrl ? (
                  <a
                    href={prUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-emerald-100 underline-offset-2 hover:underline"
                    data-testid="reads-settlement-pr-link"
                  >
                    <GitPullRequest className="h-3.5 w-3.5" aria-hidden />
                    Review pull request
                    {receipt.shippable?.repository?.fullName
                      ? ` on ${receipt.shippable.repository.fullName}`
                      : ""}
                  </a>
                ) : null}
                {payment?.txId ? (
                  <a
                    href={payment.explorerUrl || undefined}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-mono text-neutral-300 underline-offset-2 hover:underline"
                    data-testid="reads-settlement-payment-link"
                  >
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                    {payment.payAsset || "Payment"} {shortTx(payment.txId)}
                    {payment.confirmed ? " · confirmed" : " · in mempool"}
                  </a>
                ) : null}
                {receipt.ok ? (
                  <a
                    href={buildExchangeHref(new URLSearchParams({ detailId: receipt.settleRunId }))}
                    className="inline-flex items-center gap-1 text-neutral-300 underline-offset-2 hover:underline"
                  >
                    <Receipt className="h-3.5 w-3.5" aria-hidden />
                    View on Exchange
                  </a>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
