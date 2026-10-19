/**
 * Static **reading** relatives catalogue (hybrid law).
 *
 * Relatives are a measurement KIND (alongside absolutes). They are
 * reader/Evaluation-relative and used only during **reading** (not deposit).
 *
 * Hybrid model:
 * - **Static catalogue** rows (e.g. language-fit) are fixed dimensions with weights.
 * - **Dynamic** rows may be inferred per Read Request (additional dimensions).
 * - **evaluation-fit** is NOT measured as a raw catalogue row: it is the **weighted mean**
 *   of all relatives readings for that pack under the active Evaluation.
 *
 * Full RelativesMeasureAgent product wiring is Gate 4 / synthesize-reads.
 */

import { applyRelativeSubfamilyMasses } from './relative-subfamily-masses';

export type RelativePropertyClass = 'static-catalog' | 'dynamic-inferred' | 'benchmark-delta' | 'composite';

export interface AssetPackRelativeSpec {
  measurementKind: string;
  label: string;
  weight: number;
  unit: 'estimate' | 'normalized';
  propertyClass: RelativePropertyClass;
  guidance: string;
}

/**
 * Static reading relatives catalogue (weights sum to 1 among static rows).
 * Dynamic inferred rows (when present) re-normalize weights with static rows
 * when computing evaluation-fit.
 */
/**
 * Static reading relatives — every kind MUST end with `-fit` (product law).
 */
export const ASSET_PACK_RELATIVES_CATALOG: AssetPackRelativeSpec[] = [
  {
    measurementKind: 'language-fit',
    label: 'Language fit',
    weight: 0.35,
    unit: 'estimate',
    propertyClass: 'static-catalog',
    guidance:
      'How well the AssetPack’s languages/stack match the Evaluation’s target languages and runtime.',
  },
  {
    measurementKind: 'domain-fit',
    label: 'Domain fit',
    weight: 0.35,
    unit: 'estimate',
    propertyClass: 'static-catalog',
    guidance:
      'How well the pack’s knowledge domain matches the Evaluation’s problem domain (not absolute size).',
  },
  {
    measurementKind: 'interface-fit',
    label: 'Interface fit',
    weight: 0.3,
    unit: 'estimate',
    propertyClass: 'static-catalog',
    guidance:
      'How well pack surfaces/APIs/integration shape match what the Evaluation requires to consume.',
  },
];

/** Composite kind id — derived only; never a raw measure-agent target. */
export const EVALUATION_FIT_COMPOSITE_KIND = 'evaluation-fit' as const;

export type RelativeReadingLike = {
  measurementKind: string;
  volume: number;
  weight?: number;
  status?: string;
  propertyClass?: string;
};

/**
 * evaluation-fit = weighted mean of relatives volumes under the subfamily mass
 * law (static / Evaluation-inferred / benchmark delta). Raw weight is
 * reading.weight when present; else catalogue weight; else equal weight.
 * `insufficient_evidence` / `not_run` rows carry zero weight. Empty set → 0.
 */
export function computeEvaluationFitVolume(
  relatives: RelativeReadingLike[],
  catalog: AssetPackRelativeSpec[] = ASSET_PACK_RELATIVES_CATALOG,
): number {
  if (!Array.isArray(relatives) || relatives.length === 0) return 0;
  const weightByKind = new Map(catalog.map((s) => [s.measurementKind, s.weight]));
  const massed = applyRelativeSubfamilyMasses(
    relatives.filter((row) => row && typeof row.volume === 'number' && Number.isFinite(row.volume)),
    {
      staticKinds: catalog.map((s) => s.measurementKind),
      fallbackWeight: (row) => weightByKind.get(row.measurementKind),
    },
  );
  let sumW = 0;
  let sum = 0;
  for (const row of massed) {
    const w = row.weight ?? 0;
    if (!(w > 0)) continue;
    const v = Math.max(0, Math.min(1, row.volume));
    sumW += w;
    sum += w * v;
  }
  if (sumW <= 0) return 0;
  return Math.max(0, Math.min(1, sum / sumW));
}
