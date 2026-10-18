/**
 * Read option source contribution set (V49 settlement completion law S-1).
 *
 * Synthesis attributes each read option to admitted Depository DataPacks it
 * derives from (quick: in its single call; rich: one attribution call after
 * measurement). The server keeps only attributions that resolve to an
 * admitted, seller-linked Depository row, merges duplicates, and normalizes
 * to integer basis points (largest remainder, Σ = 10000). Zero survivors is an
 * explicit `treasury-only` set — never an invented seller.
 */

export interface ReadOptionSourceAttribution {
  depositoryAssetPackId: string;
  weight: number;
  rationale?: string;
}

export interface ResolvedSupplySeller {
  depositoryAssetPackId: string;
  admissionRunId: string;
  sellerUserId: string;
}

export interface ReadOptionSourceContribution extends ResolvedSupplySeller {
  weightBps: number;
  rationale: string;
}

export interface ReadOptionSourceContributions {
  schema: 'bitcode.read.source-contributions';
  version: 1;
  mode: 'contributors' | 'treasury-only';
  sources: ReadOptionSourceContribution[];
}

export const TREASURY_ONLY_SOURCE_CONTRIBUTIONS: ReadOptionSourceContributions = Object.freeze({
  schema: 'bitcode.read.source-contributions',
  version: 1,
  mode: 'treasury-only',
  sources: [],
}) as ReadOptionSourceContributions;

/** Read raw attributions off an option (fullOptions carrier), fail-soft. */
export function readOptionSourceAttributions(option: unknown): ReadOptionSourceAttribution[] {
  const raw = (option as { sourceAttributions?: unknown } | null)?.sourceAttributions;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object')
    .map((row) => ({
      depositoryAssetPackId: typeof row.depositoryAssetPackId === 'string' ? row.depositoryAssetPackId.trim() : '',
      weight: typeof row.weight === 'number' ? row.weight : Number(row.weight),
      rationale: typeof row.rationale === 'string' ? row.rationale : '',
    }))
    .filter((row) => row.depositoryAssetPackId && Number.isFinite(row.weight) && row.weight > 0);
}

/**
 * Resolve + normalize. `sellers` maps admitted Depository ids to their
 * admission run and seller (server lookup); unresolved ids are dropped.
 */
export function resolveReadOptionSourceContributions(
  attributions: readonly ReadOptionSourceAttribution[],
  sellers: ReadonlyMap<string, ResolvedSupplySeller>,
): ReadOptionSourceContributions {
  const merged = new Map<string, { seller: ResolvedSupplySeller; weight: number; rationale: string }>();
  for (const attribution of attributions) {
    const seller = sellers.get(attribution.depositoryAssetPackId);
    if (!seller || !(attribution.weight > 0)) continue;
    const existing = merged.get(attribution.depositoryAssetPackId);
    if (existing) existing.weight += attribution.weight;
    else merged.set(attribution.depositoryAssetPackId, { seller, weight: attribution.weight, rationale: attribution.rationale || '' });
  }
  const rows = [...merged.values()].sort((a, b) =>
    a.seller.depositoryAssetPackId.localeCompare(b.seller.depositoryAssetPackId),
  );
  if (rows.length === 0) return { ...TREASURY_ONLY_SOURCE_CONTRIBUTIONS, sources: [] };

  const total = rows.reduce((sum, row) => sum + row.weight, 0);
  const provisional = rows.map((row, index) => {
    const exact = (row.weight / total) * 10_000;
    return { row, index, bps: Math.floor(exact), remainder: exact - Math.floor(exact) };
  });
  let remaining = 10_000 - provisional.reduce((sum, entry) => sum + entry.bps, 0);
  for (const entry of [...provisional].sort((a, b) => b.remainder - a.remainder || a.index - b.index)) {
    if (remaining <= 0) break;
    entry.bps += 1;
    remaining -= 1;
  }
  const sources = provisional
    .filter((entry) => entry.bps > 0)
    .map((entry) => ({ ...entry.row.seller, weightBps: entry.bps, rationale: entry.row.rationale }));
  return { schema: 'bitcode.read.source-contributions', version: 1, mode: 'contributors', sources };
}
