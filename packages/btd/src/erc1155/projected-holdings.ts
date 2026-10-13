/**
 * Projected account holdings (V48 G4-5) from settle / admission execution
 * rows — the account view of BitcodeERC1155 state while settlement is
 * projected (no on-chain contract configured):
 *
 * - AssetPacks (ids ≥ 1): DataPacks the account admitted to the Depository
 *   (owner read) plus DataPacks it bought (co-owner, licensed read).
 * - BTD (id 0): the seller slice of FINALIZED payouts on DataPacks the account
 *   deposited. Unfinalized settles keep 100% of V in master escrow, so they do
 *   not count; buyers never receive fungible BTD.
 *
 * Pure: callers query rows (source-safe columns only) and pass them in.
 */

const BTD_SCALE = 10n ** 18n;

export interface ProjectedHoldingsExecutionRow {
  id: string;
  user_id?: string | null;
  created_at?: string | null;
  status?: string | null;
  context?: Record<string, unknown> | null;
  /** `output->pendingPayout` (settle rows); never the full output. */
  pendingPayout?: Record<string, unknown> | null;
}

export type ProjectedAssetPackReadRight = 'owner_read' | 'licensed_read';

export interface ProjectedAssetPackHolding {
  assetPackId: string;
  label?: string;
  acquiredAt?: string;
  readRightState: ProjectedAssetPackReadRight;
}

export interface ProjectedAccountHoldings {
  /** Fungible BTD (18-decimal base units) held after finalized payouts. */
  btdBaseUnits: bigint;
  /** Whole-BTD display value (6-decimal precision). */
  btd: number;
  /** Distinct AssetPacks, most recent first. */
  assetPacks: ProjectedAssetPackHolding[];
}

const SETTLE_SOURCE = 'read-settle-asset-pack';
const ADMISSION_SOURCE = 'deposit-option-review-admission';

function str(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function toBigInt(value: unknown): bigint {
  try {
    if (typeof value === 'bigint') return value;
    if (typeof value === 'string' && /^\d+$/.test(value.trim())) return BigInt(value.trim());
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return BigInt(Math.floor(value));
  } catch {
    /* fall through */
  }
  return 0n;
}

export function btdBaseUnitsToWhole(baseUnits: bigint): number {
  const whole = baseUnits / BTD_SCALE;
  const micro = ((baseUnits % BTD_SCALE) * 1_000_000n) / BTD_SCALE;
  return Number(whole) + Number(micro) / 1_000_000;
}

export function projectAccountHoldingsFromSettlements(
  rows: readonly ProjectedHoldingsExecutionRow[],
  userId: string,
): ProjectedAccountHoldings {
  const holdings = new Map<string, ProjectedAssetPackHolding>();
  let btdBaseUnits = 0n;
  const seen = new Set<string>();

  for (const row of rows) {
    if (!row || seen.has(row.id)) continue;
    seen.add(row.id);
    const context = row.context ?? {};
    const source = str(context.source);
    const title = str(context.assetPackTitle) ?? undefined;
    const acquiredAt = str(row.created_at) ?? undefined;

    if (source === ADMISSION_SOURCE && row.user_id === userId && context.admissionState === 'admitted-to-depository') {
      const assetPackId = str(context.depositoryAssetPackId) ?? row.id;
      if (!holdings.has(assetPackId)) {
        holdings.set(assetPackId, { assetPackId, label: title, acquiredAt, readRightState: 'owner_read' });
      }
      continue;
    }

    if (source !== SETTLE_SOURCE || row.status !== 'completed') continue;

    if (row.user_id === userId) {
      const assetPackId = str(context.assetPackKey) ?? row.id;
      holdings.set(assetPackId, { assetPackId, label: title, acquiredAt, readRightState: 'licensed_read' });
    }

    const pending = row.pendingPayout ?? null;
    const sellerUserId = str(context.sellerUserId) ?? str(pending?.sellerUserId);
    if (sellerUserId === userId && pending && pending.status === 'finalized') {
      btdBaseUnits += toBigInt(pending.sellerBtd);
    }
  }

  const assetPacks = [...holdings.values()].sort((a, b) =>
    String(b.acquiredAt ?? '').localeCompare(String(a.acquiredAt ?? '')),
  );
  return { btdBaseUnits, btd: btdBaseUnitsToWhole(btdBaseUnits), assetPacks };
}
