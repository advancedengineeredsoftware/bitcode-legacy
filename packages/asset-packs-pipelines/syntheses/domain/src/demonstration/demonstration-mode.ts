/**
 * Demonstration mode SSOT (operator configuration, not product law).
 *
 * `BITCODE_DEMONSTRATION_MODE=1` replaces only the two SDIVF synthesis runs
 * (deposit + read) with paced replays of the curated demonstration catalog.
 * Everything else stays live: wallet sessions, GitHub App installs and
 * repository reads, fail-closed option validation + projection, testnet
 * payment verification, settle, PR delivery, and seller payout.
 *
 * Browser surfaces read the public twin `NEXT_PUBLIC_BITCODE_DEMONSTRATION_MODE`
 * only to label the experience; the server flag is authoritative.
 */

const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);

export function isBitcodeDemonstrationModeEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return TRUE_VALUES.has(String(env.BITCODE_DEMONSTRATION_MODE || '').trim().toLowerCase());
}

/**
 * Demonstration testnet spot for BTD in USD. Keeps a single read DataPack
 * (evaluation-fit ≤ 0.97 BTD) under 0.000009 ETH at the mock $3,500/ETH board.
 * (BTC testnet4 amounts at this spot fall below the dust limit — demo on ETH.)
 */
export const DEFAULT_DEMONSTRATION_BTD_USD = 0.03;

/** BTD/USD spot used for demonstration settlement quotes (`BITCODE_DEMONSTRATION_BTD_USD`). */
export function readDemonstrationBtdUsd(env: Record<string, string | undefined> = process.env): number {
  const value = Number(env.BITCODE_DEMONSTRATION_BTD_USD);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_DEMONSTRATION_BTD_USD;
}

const ETH_ADDRESS = /^0x[0-9a-f]{40}$/;
/** Opening BTD for the demonstration account when none is configured. */
export const DEFAULT_DEMONSTRATION_OPENING_BTD = 1000;

/**
 * The presenter's account, identified by its bound Ethereum wallet
 * (`BITCODE_DEMONSTRATION_ACCOUNT_ADDRESS`). The account itself is real
 * (wallet-signed session, GitHub App install); demonstration mode only gives
 * it an opening balance.
 */
export function readDemonstrationAccountAddress(
  env: Record<string, string | undefined> = process.env,
): string | null {
  const address = String(env.BITCODE_DEMONSTRATION_ACCOUNT_ADDRESS || '').trim().toLowerCase();
  return ETH_ADDRESS.test(address) ? address : null;
}

/** Opening BTD (`BITCODE_DEMONSTRATION_OPENING_BTD`, default 1000, ≥ 0). */
export function readDemonstrationOpeningBtd(
  env: Record<string, string | undefined> = process.env,
): number {
  const raw = env.BITCODE_DEMONSTRATION_OPENING_BTD;
  const value = raw === undefined || raw.trim() === '' ? DEFAULT_DEMONSTRATION_OPENING_BTD : Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : DEFAULT_DEMONSTRATION_OPENING_BTD;
}

/**
 * Opening BTD for an account's bound wallet: the configured amount when
 * demonstration mode is on and the wallet is the demonstration account, else 0.
 */
export function demonstrationOpeningBtdForWallet(
  walletAddress: string | null | undefined,
  env: Record<string, string | undefined> = process.env,
): number {
  if (!isBitcodeDemonstrationModeEnabled(env)) return 0;
  const account = readDemonstrationAccountAddress(env);
  const wallet = String(walletAddress || '').trim().toLowerCase();
  return account && wallet === account ? readDemonstrationOpeningBtd(env) : 0;
}
