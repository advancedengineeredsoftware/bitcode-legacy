/**
 * Pay-rail payment verification (testnet rails) for settle.
 *
 * Observes a buyer-broadcast transaction and checks it actually pays the
 * Bitcode settlement recipient at least the quoted amount:
 * - BTC testnet4: Esplora `/tx/:txid` — sum of outputs to the recipient address.
 * - ETH Sepolia: JSON-RPC `eth_getTransactionByHash` — `to`, `value`, chain id,
 *   plus receipt status once mined (reverted ⇒ rejected).
 *
 * Mempool (unconfirmed) payments that are otherwise valid verify with
 * `confirmed: false` — testnet settle law accepts observed payment finality.
 * Pure aside from the injected fetch; callers own replay protection.
 */

import type { PayAsset } from './types';

export const SEPOLIA_CHAIN_ID = 11_155_111;
export const DEFAULT_BTC_TESTNET4_ESPLORA_URL = 'https://mempool.space/testnet4/api';

export type PayRailNetwork = 'btc-testnet4' | 'ethereum-sepolia';

export type PayRailRejection =
  | 'malformed-transaction-id'
  | 'transaction-not-found'
  | 'wrong-recipient'
  | 'insufficient-amount'
  | 'wrong-chain'
  | 'transaction-reverted'
  | 'self-payment'
  | 'observer-unavailable';

export interface PayRailPaymentVerification {
  schema: 'bitcode.settle.pay-rail-verification';
  payAsset: Extract<PayAsset, 'BTC' | 'ETH'>;
  network: PayRailNetwork;
  txId: string;
  recipient: string;
  /** Base units (sats | wei) as decimal strings. */
  requiredAmount: string;
  paidAmount: string;
  ok: boolean;
  confirmed: boolean;
  blockTime: number | null;
  reason: PayRailRejection | null;
  explorerUrl: string;
  observedAt: string;
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

interface ObserveOptions {
  fetchImpl?: FetchLike;
  /** Total time to wait for a just-broadcast transaction to propagate. */
  waitForPropagationMs?: number;
  pollIntervalMs?: number;
  now?: () => Date;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Poll `observe` until it returns non-null or the propagation window closes. */
async function pollUntilObserved<T>(
  observe: () => Promise<T | null>,
  options: ObserveOptions,
): Promise<T | null> {
  const deadline = Date.now() + (options.waitForPropagationMs ?? 0);
  const interval = options.pollIntervalMs ?? 2_000;
  for (;;) {
    const observed = await observe();
    if (observed !== null) return observed;
    if (Date.now() + interval > deadline) return null;
    await sleep(interval);
  }
}

export function btcTestnet4ExplorerUrl(txId: string): string {
  return `https://mempool.space/testnet4/tx/${txId}`;
}

export function sepoliaExplorerUrl(txHash: string): string {
  return `https://sepolia.etherscan.io/tx/${txHash}`;
}

interface EsploraTx {
  vout?: Array<{ scriptpubkey_address?: string; value?: number }>;
  status?: { confirmed?: boolean; block_time?: number };
}

/** Verify a BTC testnet4 payment to `recipientAddress` of at least `requiredSats`. */
export async function verifyBitcoinTestnetPayment(
  input: {
    txId: string;
    recipientAddress: string;
    requiredSats: bigint;
    esploraBaseUrl?: string;
  } & ObserveOptions,
): Promise<PayRailPaymentVerification> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const txId = input.txId.trim().toLowerCase();
  const base = (input.esploraBaseUrl || DEFAULT_BTC_TESTNET4_ESPLORA_URL).replace(/\/$/, '');
  const result = (
    patch: Partial<PayRailPaymentVerification>,
  ): PayRailPaymentVerification => ({
    schema: 'bitcode.settle.pay-rail-verification',
    payAsset: 'BTC',
    network: 'btc-testnet4',
    txId,
    recipient: input.recipientAddress,
    requiredAmount: input.requiredSats.toString(),
    paidAmount: '0',
    ok: false,
    confirmed: false,
    blockTime: null,
    reason: null,
    explorerUrl: btcTestnet4ExplorerUrl(txId),
    observedAt: (input.now?.() ?? new Date()).toISOString(),
    ...patch,
  });

  if (!/^[0-9a-f]{64}$/.test(txId)) return result({ reason: 'malformed-transaction-id' });

  let observerFailed = false;
  const tx = await pollUntilObserved<EsploraTx>(async () => {
    try {
      const res = await fetchImpl(`${base}/tx/${txId}`);
      if (res.status === 404 || res.status === 400) return null;
      if (!res.ok) {
        observerFailed = true;
        return null;
      }
      observerFailed = false;
      return (await res.json()) as EsploraTx;
    } catch {
      observerFailed = true;
      return null;
    }
  }, input);
  if (!tx) return result({ reason: observerFailed ? 'observer-unavailable' : 'transaction-not-found' });

  const paid = (tx.vout || [])
    .filter((out) => out.scriptpubkey_address === input.recipientAddress)
    .reduce((sum, out) => sum + BigInt(Math.max(0, Math.floor(out.value || 0))), 0n);
  const confirmed = Boolean(tx.status?.confirmed);
  const blockTime = typeof tx.status?.block_time === 'number' ? tx.status.block_time : null;
  if (paid === 0n) return result({ confirmed, blockTime, reason: 'wrong-recipient' });
  if (paid < input.requiredSats) {
    return result({ confirmed, blockTime, paidAmount: paid.toString(), reason: 'insufficient-amount' });
  }
  return result({ ok: true, confirmed, blockTime, paidAmount: paid.toString() });
}

interface RpcTransaction {
  from?: string | null;
  to?: string | null;
  value?: string;
  chainId?: string;
  blockNumber?: string | null;
}

async function rpc<T>(fetchImpl: FetchLike, rpcUrl: string, method: string, params: unknown[]): Promise<T | null> {
  const res = await fetchImpl(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  if (!res.ok) throw new Error(`RPC HTTP ${res.status}`);
  const body = (await res.json()) as { result?: T | null; error?: { message?: string } };
  if (body.error) throw new Error(body.error.message || 'RPC error');
  return body.result ?? null;
}

/** Verify a Sepolia ETH payment to `recipientAddress` of at least `requiredWei`. */
export async function verifyEthereumSepoliaPayment(
  input: {
    txHash: string;
    recipientAddress: string;
    requiredWei: bigint;
    rpcUrl: string;
  } & ObserveOptions,
): Promise<PayRailPaymentVerification> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const txHash = input.txHash.trim().toLowerCase();
  const recipient = input.recipientAddress.trim().toLowerCase();
  const result = (
    patch: Partial<PayRailPaymentVerification>,
  ): PayRailPaymentVerification => ({
    schema: 'bitcode.settle.pay-rail-verification',
    payAsset: 'ETH',
    network: 'ethereum-sepolia',
    txId: txHash,
    recipient,
    requiredAmount: input.requiredWei.toString(),
    paidAmount: '0',
    ok: false,
    confirmed: false,
    blockTime: null,
    reason: null,
    explorerUrl: sepoliaExplorerUrl(txHash),
    observedAt: (input.now?.() ?? new Date()).toISOString(),
    ...patch,
  });

  if (!/^0x[0-9a-f]{64}$/.test(txHash)) return result({ reason: 'malformed-transaction-id' });

  let observerFailed = false;
  const tx = await pollUntilObserved<RpcTransaction>(async () => {
    try {
      const found = await rpc<RpcTransaction>(fetchImpl, input.rpcUrl, 'eth_getTransactionByHash', [txHash]);
      observerFailed = false;
      return found;
    } catch {
      observerFailed = true;
      return null;
    }
  }, input);
  if (!tx) return result({ reason: observerFailed ? 'observer-unavailable' : 'transaction-not-found' });

  if (tx.chainId && BigInt(tx.chainId) !== BigInt(SEPOLIA_CHAIN_ID)) return result({ reason: 'wrong-chain' });
  if (String(tx.to || '').toLowerCase() !== recipient) return result({ reason: 'wrong-recipient' });
  // Paying the settlement recipient from itself moves no value — never a purchase.
  if (String(tx.from || '').toLowerCase() === recipient) return result({ reason: 'self-payment' });
  const paid = BigInt(tx.value || '0x0');
  if (paid < input.requiredWei) {
    return result({ paidAmount: paid.toString(), reason: 'insufficient-amount' });
  }

  let confirmed = false;
  if (tx.blockNumber) {
    try {
      const receipt = await rpc<{ status?: string }>(fetchImpl, input.rpcUrl, 'eth_getTransactionReceipt', [txHash]);
      if (receipt?.status === '0x0') {
        return result({ paidAmount: paid.toString(), reason: 'transaction-reverted' });
      }
      confirmed = receipt?.status === '0x1';
    } catch {
      // Receipt lookup is best-effort; the transaction itself is observed.
    }
  }
  return result({ ok: true, confirmed, paidAmount: paid.toString() });
}
