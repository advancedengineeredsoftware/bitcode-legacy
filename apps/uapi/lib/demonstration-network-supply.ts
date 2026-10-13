/**
 * Demonstration network supply — the catalog DataPacks as Depository rows
 * admitted by fixture network depositors, so /exchange shows a populated
 * network at the start of a demo (demonstration mode only).
 *
 * Rows are source-safe admission projections (title, kind, summary, measured
 * absolutes) shaped like `deposit-option-review-admission` executions; they
 * carry no patch bodies and are never persisted.
 */

import {
  DEMONSTRATION_DATA_PACK_CATALOG,
  DEMONSTRATION_DATASET,
  demonstrationDataPackTitleKey,
  measureDemonstrationDataPackAbsolutes,
} from '@bitcode/asset-packs-pipelines-syntheses-domain/demonstration';

const NETWORK_DEPOSITORS = [
  'northwind-labs/platform',
  'helios-data/warehouse',
  'tidewater-io/services',
] as const;

const DAY_MS = 86_400_000;

/**
 * Catalog packs as admitted network supply, skipping any pack whose title the
 * presenter already admitted (their real demonstration row takes precedence).
 */
export function buildDemonstrationNetworkSupplyRows(
  admittedTitles: readonly string[] = [],
  now: number = Date.now(),
): Record<string, unknown>[] {
  const admitted = new Set(admittedTitles.map((title) => demonstrationDataPackTitleKey(title)));
  return DEMONSTRATION_DATA_PACK_CATALOG.filter(
    (pack) =>
      !admitted.has(demonstrationDataPackTitleKey(pack.title)) &&
      !admitted.has(demonstrationDataPackTitleKey(pack.commercialTitle)),
  ).map((pack, index) => {
    const repositoryFullName = NETWORK_DEPOSITORS[index % NETWORK_DEPOSITORS.length];
    const measurements = measureDemonstrationDataPackAbsolutes(pack);
    return {
      id: `demonstration-network-supply-${pack.id}`,
      created_at: new Date(now - (index + 1) * 2 * DAY_MS).toISOString(),
      status: 'completed',
      type: 'pipeline:deposit-option-admission',
      output: {
        summary: `Admitted ${pack.commercialTitle} to the Depository.`,
        assetPackTitle: pack.title,
        assetPackKind: pack.kind,
        commercialTitle: pack.commercialTitle,
        measurements,
      },
      context: {
        source: 'deposit-option-review-admission',
        admissionState: 'admitted-to-depository',
        assetPackTitle: pack.title,
        assetPackKind: pack.kind,
        depositoryAssetPackId: `demonstration-dp-${pack.id}`,
        repositoryFullName,
        dataset: DEMONSTRATION_DATASET,
      },
    };
  });
}
