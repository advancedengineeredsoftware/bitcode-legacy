/**
 * Server-side seller resolution for read option source contributions
 * (V49 settlement completion law S-1 / S-3).
 *
 * A Depository DataPack id (depository_search_documents.asset_id) is the
 * admission activity execution id written at deposit admission; its row's
 * `user_id` is the seller. Rows are looked up by id (UUID) or by
 * `context.depositoryAssetPackId`, admission rows only, active dataset only.
 * Payout identities are never taken from the client.
 */

import { supabaseAdmin } from '@bitcode/supabase';
import {
  readOptionSourceAttributions,
  resolveReadOptionSourceContributions,
  type ReadOptionSourceContributions,
  type ResolvedSupplySeller,
} from '@bitcode/asset-packs-pipelines-syntheses-domain/source-contributions';
import { scopeExecutionsQueryToActiveDataset } from '@bitcode/asset-packs-pipelines-syntheses-domain/demonstration';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isAdmissionRow(row: { context?: unknown }): boolean {
  const context = (row.context || {}) as Record<string, unknown>;
  return (
    context.source === 'deposit-option-review-admission' ||
    context.admissionState === 'admitted-to-depository'
  );
}

/** Map attributed Depository ids → admission run + seller. */
export async function resolveSupplySellers(
  depositoryAssetPackIds: readonly string[],
  admin: typeof supabaseAdmin = supabaseAdmin,
): Promise<Map<string, ResolvedSupplySeller>> {
  const ids = [...new Set(depositoryAssetPackIds.map((id) => id.trim()).filter(Boolean))];
  const sellers = new Map<string, ResolvedSupplySeller>();
  if (ids.length === 0) return sellers;
  const record = (id: string, row: { id?: unknown; user_id?: unknown; context?: unknown }) => {
    if (sellers.has(id) || typeof row.user_id !== 'string' || !isAdmissionRow(row)) return;
    sellers.set(id, { depositoryAssetPackId: id, admissionRunId: String(row.id), sellerUserId: row.user_id });
  };
  try {
    const uuidIds = ids.filter((id) => UUID_PATTERN.test(id));
    if (uuidIds.length) {
      const { data } = await scopeExecutionsQueryToActiveDataset(
        admin.from('executions').select('id, user_id, context').in('id', uuidIds),
      );
      for (const row of data || []) record(String(row.id), row);
    }
    const remaining = ids.filter((id) => !sellers.has(id));
    if (remaining.length) {
      const { data } = await scopeExecutionsQueryToActiveDataset(
        admin.from('executions').select('id, user_id, context').in('context->>depositoryAssetPackId', remaining),
      );
      for (const row of data || []) {
        const context = (row.context || {}) as Record<string, unknown>;
        if (typeof context.depositoryAssetPackId === 'string') record(context.depositoryAssetPackId, row);
      }
    }
  } catch {
    // Unresolvable supply ⇒ treasury-only (never an invented seller).
  }
  return sellers;
}

export interface SupplyProvenanceLike {
  admissionRunId: string | null;
  sellerUserId: string | null;
  depositoryAssetPackId: string | null;
}

/**
 * Contribution set for one rehydrated read option: model attributions resolved
 * to admitted sellers; else demonstration single-seller provenance; else
 * treasury-only.
 */
export async function resolveReadOptionContributions(
  rawOption: unknown,
  supplyProvenance: SupplyProvenanceLike | null,
  admin: typeof supabaseAdmin = supabaseAdmin,
): Promise<ReadOptionSourceContributions> {
  const attributions = readOptionSourceAttributions(rawOption);
  if (attributions.length > 0) {
    const sellers = await resolveSupplySellers(
      attributions.map((row) => row.depositoryAssetPackId),
      admin,
    );
    return resolveReadOptionSourceContributions(attributions, sellers);
  }
  if (supplyProvenance?.sellerUserId && supplyProvenance.admissionRunId) {
    const id = supplyProvenance.depositoryAssetPackId || supplyProvenance.admissionRunId;
    return resolveReadOptionSourceContributions(
      [{ depositoryAssetPackId: id, weight: 1, rationale: 'Synthesized from this admitted Depository DataPack.' }],
      new Map([[id, { depositoryAssetPackId: id, admissionRunId: supplyProvenance.admissionRunId, sellerUserId: supplyProvenance.sellerUserId }]]),
    );
  }
  return resolveReadOptionSourceContributions([], new Map());
}
