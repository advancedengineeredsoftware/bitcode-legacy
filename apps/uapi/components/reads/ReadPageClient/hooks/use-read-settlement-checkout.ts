/**
 * Read settlement checkout lifecycle: server quote → wallet payment → settle.
 *
 * 1. Quote: POST /api/read/settle/quote with synthesisRunId + selectedIndexes
 *    (server rehydrates + prices each option; returns rail totals + pay-to).
 * 2. Pay: when the chosen rail has a settlement recipient, the buyer's wallet
 *    broadcasts the rail total (Sepolia ETH via EIP-1193, BTC testnet4 via the
 *    connected Bitcoin wallet). Without a recipient, projected settle remains
 *    available unless the server requires payment.
 * 3. Settle: POST /api/read/settle with the txid; the server verifies it
 *    on-chain and runs one settle pipeline per option (PR delivery included).
 */
"use client";

import { useCallback, useEffect, useState } from "react";

import type { RepositoryContextState } from "@/components/bitcode/pipeline/models/repository-context";
import { assessSelectedOptionsForSettle } from "@/components/reads/models/read-buyer-measurement-projection";
import type {
  ReadPayAsset,
  ReadSettleQuote,
} from "@/components/reads/ReadsAssetPackOptions/ReadsAssetPackOptions";
import type { ReadSettlementReceipt } from "@/components/reads/ReadsSettlementReceipts/ReadsSettlementReceipts";
import type { ReadSynthesizedOption } from "./use-read-option-synthesis";
import {
  sendBitcoinWalletPayment,
  type BitcoinWalletProviderId,
} from "@bitcode/auth/bitcoin-wallet-client";
import { sendEthereumWalletPayment } from "@bitcode/auth/ethereum-wallet-client";
import { mutateUserData } from "@/hooks/useUserData";

export type ReadCheckoutPhase =
  | "idle"
  | "awaiting-wallet"
  | "verifying-payment"
  | "settled"
  | "failed";

function payAssetToNetwork(payAsset: ReadPayAsset): string {
  if (payAsset === "BTC") return "btc-testnet4";
  if (payAsset === "SOL") return "solana-devnet";
  return "ethereum-sepolia";
}

const BITCOIN_PROVIDER_IDS = new Set<BitcoinWalletProviderId>([
  "leather",
  "xverse",
  "unisat",
  "okx-bitcoin",
]);

export function useReadSettlementCheckout(input: {
  synthesisRunId: string | null;
  selectedIndexes: number[];
  selectedOptions: ReadSynthesizedOption[];
  need: string;
  relevantPaths: string[];
  irrelevantPaths: string[];
  repositoryContext: RepositoryContextState | null;
  buyerEthereumAddress: string | null;
  /** Wallet provider the buyer connected with (preferred for BTC payment). */
  connectedWalletProvider?: string | null;
  refreshLiveRuns?: () => unknown;
}) {
  const {
    synthesisRunId,
    selectedIndexes,
    selectedOptions,
    need,
    relevantPaths,
    irrelevantPaths,
    repositoryContext,
    buyerEthereumAddress,
    connectedWalletProvider = null,
    refreshLiveRuns,
  } = input;
  const [payAsset, setPayAsset] = useState<ReadPayAsset>("ETH");
  const [quote, setQuote] = useState<ReadSettleQuote | null>(null);
  const [quoteBusy, setQuoteBusy] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [phase, setPhase] = useState<ReadCheckoutPhase>("idle");
  const [settleError, setSettleError] = useState<string | null>(null);
  const [paymentTxId, setPaymentTxId] = useState<string | null>(null);
  const [receipts, setReceipts] = useState<ReadSettlementReceipt[]>([]);

  const fetchQuote = useCallback(async () => {
    if (!synthesisRunId || selectedIndexes.length === 0) {
      setQuote(null);
      setQuoteError(null);
      return;
    }
    const gate = assessSelectedOptionsForSettle(selectedOptions);
    if (!gate.allowed) {
      setQuote(null);
      setQuoteError(
        gate.blockers[0] || "Measurement-only buy gate blocked quote (need-fit / safety).",
      );
      return;
    }
    setQuoteBusy(true);
    setQuoteError(null);
    try {
      const response = await fetch("/api/read/settle/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ synthesisRunId, selectedIndexes }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        throw new Error(typeof payload?.error === "string" ? payload.error : "Quote failed.");
      }
      setQuote({
        provider: String(payload.provider || "mock"),
        needFitVolume: Number(payload.needFitVolume) || 0,
        rawVolumeBaseUnits: String(payload.btdVolume || "0"),
        btdVolume: String(payload.btdVolume || "0"),
        btdVolumeDisplay: String(payload.btdVolumeDisplay || "0"),
        decay: Number(payload.decay) || 0,
        decayMicro: 0,
        expiresAt: String(payload.expiresAt || ""),
        options: Array.isArray(payload.options) ? payload.options : [],
        payTo: Array.isArray(payload.payTo) ? payload.payTo : [],
        paymentRequired: payload.paymentRequired === true,
      });
    } catch (err) {
      setQuote(null);
      setQuoteError(err instanceof Error ? err.message : "Quote failed.");
    } finally {
      setQuoteBusy(false);
    }
  }, [selectedIndexes, selectedOptions, synthesisRunId]);

  useEffect(() => {
    void fetchQuote();
  }, [fetchQuote]);

  const railQuote = quote?.options.find((rail) => rail.payAsset === payAsset) ?? null;
  const payTo = quote?.payTo?.find((rail) => rail.payAsset === payAsset) ?? null;
  const livePayment = Boolean(payTo?.address && payTo.liveVerification);
  // Paying the settlement recipient from that same wallet moves no value.
  const payingSelf = Boolean(
    payAsset === "ETH" &&
      payTo?.address &&
      buyerEthereumAddress &&
      payTo.address.toLowerCase() === buyerEthereumAddress.toLowerCase(),
  );

  /** Broadcast the rail total from the buyer's wallet; returns the txid. */
  const payFromWallet = useCallback(async (): Promise<string> => {
    if (!railQuote || !payTo?.address) {
      throw new Error(`No ${payAsset} settlement recipient is configured.`);
    }
    const amount = BigInt(railQuote.payAmount);
    if (payAsset === "ETH") {
      return (await sendEthereumWalletPayment({ to: payTo.address, valueWei: amount })).txHash;
    }
    if (payAsset === "BTC") {
      const preferred =
        connectedWalletProvider && BITCOIN_PROVIDER_IDS.has(connectedWalletProvider as BitcoinWalletProviderId)
          ? (connectedWalletProvider as BitcoinWalletProviderId)
          : null;
      return (
        await sendBitcoinWalletPayment({
          recipientAddress: payTo.address,
          amountSats: amount,
          preferredProviderId: preferred,
        })
      ).txid;
    }
    throw new Error(`${payAsset} wallet payments are not supported on testnet yet.`);
  }, [connectedWalletProvider, payAsset, payTo?.address, railQuote]);

  const payAndSettle = useCallback(async () => {
    if (!synthesisRunId || selectedIndexes.length === 0) return;
    const gate = assessSelectedOptionsForSettle(selectedOptions);
    if (!gate.allowed) {
      setSettleError(gate.blockers[0] || "Measurement-only buy gate blocked settle.");
      return;
    }
    if (!livePayment && quote?.paymentRequired) {
      setSettleError(`Live ${payAsset} payment is required but no settlement recipient is configured.`);
      return;
    }
    if (payingSelf) {
      setSettleError(
        "The settlement recipient is your own wallet — set BITCODE_SETTLEMENT_ETH_RECIPIENT to a different (treasury) address.",
      );
      return;
    }
    setSettleError(null);
    setReceipts([]);
    let txId = paymentTxId;
    try {
      if (livePayment && !txId) {
        setPhase("awaiting-wallet");
        txId = await payFromWallet();
        // Keep the txid so a failed verification/settle can retry without re-paying.
        setPaymentTxId(txId);
      }
      setPhase("verifying-payment");
      const response = await fetch("/api/read/settle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          synthesisRunId,
          selectedIndexes,
          need: need.trim() || null,
          relevantPaths,
          irrelevantPaths,
          repositoryFullName: repositoryContext?.selectedRepository?.fullName || null,
          repository: {
            fullName: repositoryContext?.selectedRepository?.fullName || null,
            owner: repositoryContext?.selectedRepository?.owner || null,
            name: repositoryContext?.selectedRepository?.name || null,
            branch: repositoryContext?.selectedBranch || null,
            commit: repositoryContext?.selectedCommit || null,
          },
          payAsset,
          buyerEthereumAddress: buyerEthereumAddress || null,
          txId: txId || null,
          paymentObservation: {
            schema: "bitcode.settle-asset-pack.payment-observation",
            network: payAssetToNetwork(payAsset),
            status: txId ? "observed" : "observed-projection",
            txId: txId || null,
          },
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        throw new Error(typeof payload?.error === "string" ? payload.error : "Settlement failed.");
      }
      setReceipts(Array.isArray(payload.results) ? payload.results : []);
      setPaymentTxId(null);
      setPhase("settled");
      void Promise.resolve(refreshLiveRuns?.() as unknown);
      // Co-owned AssetPacks land in projected holdings (header chip).
      void mutateUserData().catch(() => undefined);
    } catch (err) {
      setPhase("failed");
      setSettleError(err instanceof Error ? err.message : "Settlement failed.");
    }
  }, [
    buyerEthereumAddress,
    irrelevantPaths,
    livePayment,
    need,
    payAsset,
    payFromWallet,
    paymentTxId,
    payingSelf,
    quote?.paymentRequired,
    refreshLiveRuns,
    relevantPaths,
    repositoryContext?.selectedBranch,
    repositoryContext?.selectedCommit,
    repositoryContext?.selectedRepository?.fullName,
    repositoryContext?.selectedRepository?.name,
    repositoryContext?.selectedRepository?.owner,
    selectedIndexes,
    selectedOptions,
    synthesisRunId,
  ]);

  const reset = useCallback(() => {
    setQuote(null);
    setQuoteError(null);
    setSettleError(null);
    setPhase("idle");
    setPaymentTxId(null);
    setReceipts([]);
    setPayAsset("ETH");
  }, []);

  return {
    payAsset,
    setPayAsset: (asset: ReadPayAsset) => {
      setPayAsset(asset);
      // A pending txid belongs to the rail it was paid on.
      setPaymentTxId(null);
    },
    quote,
    quoteBusy,
    quoteError,
    refreshQuote: fetchQuote,
    phase,
    busy: phase === "awaiting-wallet" || phase === "verifying-payment",
    settleError,
    pendingPaymentTxId: paymentTxId,
    livePayment,
    payTo,
    receipts,
    payAndSettle,
    reset,
  };
}
