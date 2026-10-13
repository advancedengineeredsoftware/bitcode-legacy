/**
 * Pay-rail verification — testnet BTC (Esplora) and Sepolia ETH (JSON-RPC)
 * payments must pay the settlement recipient at least the quoted amount.
 */

import {
  verifyBitcoinTestnetPayment,
  verifyEthereumSepoliaPayment,
} from '../src/erc1155/pay-rail-verification';

const BTC_TX = 'a'.repeat(64);
const BTC_RECIPIENT = 'tb1qbitcodetreasury000000000000000000000000';
const ETH_TX = `0x${'b'.repeat(64)}`;
const ETH_RECIPIENT = '0x1111111111111111111111111111111111111111';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('verifyBitcoinTestnetPayment', () => {
  const esploraTx = (outputs: Array<[string, number]>, confirmed = false) => ({
    vout: outputs.map(([scriptpubkey_address, value]) => ({ scriptpubkey_address, value })),
    status: { confirmed, block_time: confirmed ? 1_760_000_000 : undefined },
  });

  it('verifies a mempool payment that covers the quote (summing recipient outputs)', async () => {
    const fetchImpl = jest.fn(async () =>
      jsonResponse(esploraTx([[BTC_RECIPIENT, 700], ['tb1qchange', 9_000], [BTC_RECIPIENT, 600]])),
    );
    const verdict = await verifyBitcoinTestnetPayment({
      txId: BTC_TX,
      recipientAddress: BTC_RECIPIENT,
      requiredSats: 1_200n,
      fetchImpl,
    });
    expect(verdict).toMatchObject({ ok: true, confirmed: false, paidAmount: '1300', reason: null });
    expect(fetchImpl).toHaveBeenCalledWith(`https://mempool.space/testnet4/api/tx/${BTC_TX}`);
    expect(verdict.explorerUrl).toBe(`https://mempool.space/testnet4/tx/${BTC_TX}`);
  });

  it('rejects wrong recipient and short payment', async () => {
    const wrong = await verifyBitcoinTestnetPayment({
      txId: BTC_TX,
      recipientAddress: BTC_RECIPIENT,
      requiredSats: 1_000n,
      fetchImpl: async () => jsonResponse(esploraTx([['tb1qsomeoneelse', 5_000]])),
    });
    expect(wrong).toMatchObject({ ok: false, reason: 'wrong-recipient' });
    const short = await verifyBitcoinTestnetPayment({
      txId: BTC_TX,
      recipientAddress: BTC_RECIPIENT,
      requiredSats: 1_000n,
      fetchImpl: async () => jsonResponse(esploraTx([[BTC_RECIPIENT, 999]], true)),
    });
    expect(short).toMatchObject({ ok: false, reason: 'insufficient-amount', paidAmount: '999', confirmed: true });
  });

  it('waits for propagation, then reports not-found vs observer outage', async () => {
    let calls = 0;
    const eventually = await verifyBitcoinTestnetPayment({
      txId: BTC_TX,
      recipientAddress: BTC_RECIPIENT,
      requiredSats: 1n,
      waitForPropagationMs: 50,
      pollIntervalMs: 10,
      fetchImpl: async () => (++calls < 3 ? new Response('', { status: 404 }) : jsonResponse(esploraTx([[BTC_RECIPIENT, 5]]))),
    });
    expect(eventually.ok).toBe(true);
    expect(calls).toBe(3);

    const missing = await verifyBitcoinTestnetPayment({
      txId: BTC_TX,
      recipientAddress: BTC_RECIPIENT,
      requiredSats: 1n,
      fetchImpl: async () => new Response('', { status: 404 }),
    });
    expect(missing.reason).toBe('transaction-not-found');
    const outage = await verifyBitcoinTestnetPayment({
      txId: BTC_TX,
      recipientAddress: BTC_RECIPIENT,
      requiredSats: 1n,
      fetchImpl: async () => new Response('', { status: 503 }),
    });
    expect(outage.reason).toBe('observer-unavailable');
  });

  it('rejects malformed transaction ids without a network call', async () => {
    const fetchImpl = jest.fn();
    const verdict = await verifyBitcoinTestnetPayment({
      txId: 'not-a-txid',
      recipientAddress: BTC_RECIPIENT,
      requiredSats: 1n,
      fetchImpl,
    });
    expect(verdict.reason).toBe('malformed-transaction-id');
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe('verifyEthereumSepoliaPayment', () => {
  function rpcFetch(tx: Record<string, unknown> | null, receipt: Record<string, unknown> | null = null) {
    return jest.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      if (body.method === 'eth_getTransactionByHash') return jsonResponse({ jsonrpc: '2.0', id: 1, result: tx });
      return jsonResponse({ jsonrpc: '2.0', id: 1, result: receipt });
    });
  }
  const base = { txHash: ETH_TX, recipientAddress: ETH_RECIPIENT, requiredWei: 1_000n, rpcUrl: 'https://rpc.test' };

  it('verifies a pending payment and a mined successful payment', async () => {
    const pending = await verifyEthereumSepoliaPayment({
      ...base,
      fetchImpl: rpcFetch({ to: ETH_RECIPIENT.toUpperCase().replace('0X', '0x'), value: '0x3e8', chainId: '0xaa36a7', blockNumber: null }),
    });
    expect(pending).toMatchObject({ ok: true, confirmed: false, paidAmount: '1000' });
    const mined = await verifyEthereumSepoliaPayment({
      ...base,
      fetchImpl: rpcFetch({ to: ETH_RECIPIENT, value: '0x7d0', chainId: '0xaa36a7', blockNumber: '0x10' }, { status: '0x1' }),
    });
    expect(mined).toMatchObject({ ok: true, confirmed: true, paidAmount: '2000' });
    expect(mined.explorerUrl).toBe(`https://sepolia.etherscan.io/tx/${ETH_TX}`);
  });

  it('rejects wrong chain, wrong recipient, short value, and reverted payments', async () => {
    const check = async (tx: Record<string, unknown>, receipt: Record<string, unknown> | null = null) =>
      (await verifyEthereumSepoliaPayment({ ...base, fetchImpl: rpcFetch(tx, receipt) })).reason;
    expect(await check({ to: ETH_RECIPIENT, value: '0x3e8', chainId: '0x1' })).toBe('wrong-chain');
    expect(await check({ to: '0x2222222222222222222222222222222222222222', value: '0x3e8', chainId: '0xaa36a7' })).toBe('wrong-recipient');
    expect(await check({ to: ETH_RECIPIENT, value: '0x1', chainId: '0xaa36a7' })).toBe('insufficient-amount');
    expect(await check({ to: ETH_RECIPIENT, value: '0x3e8', chainId: '0xaa36a7', blockNumber: '0x1' }, { status: '0x0' })).toBe('transaction-reverted');
    expect(await check({ from: ETH_RECIPIENT, to: ETH_RECIPIENT, value: '0x3e8', chainId: '0xaa36a7' })).toBe('self-payment');
  });

  it('reports not-found when the node has no transaction', async () => {
    expect((await verifyEthereumSepoliaPayment({ ...base, fetchImpl: rpcFetch(null) })).reason).toBe('transaction-not-found');
  });
});
