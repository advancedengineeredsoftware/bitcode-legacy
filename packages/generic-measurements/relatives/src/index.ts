/**
 * @bitcode/generic-measurements-relatives
 *
 * Relatives measurement KIND base (hierarchy: Relatives + MeasureAgent).
 * Used only on **reading** paths. Deposit AssetPacks carry relatives: [].
 *
 * Hybrid: static catalogue + dynamic inferred dimensions; evaluation-fit = weighted mean.
 */

import type { MeasurementKindCategory } from '@bitcode/measurement-generics';

export const RELATIVES_MEASUREMENT_CATEGORY: MeasurementKindCategory = 'relative';

export const RELATIVES_FRAMING =
  'You measure RELATIVES — READER-RELATIVE properties of digital material: how ' +
  'well the artifact fits a stated Evaluation, demand, or buyer context. Relatives are ' +
  'NOT absolute/intrinsic sizes; they depend on the reader and the Evaluation. Do not ' +
  'confuse relative with absolute quantity or quality of the artifact alone. ' +
  'evaluation-fit is a composite (weighted mean of relatives), not a raw measurement target.';

export {
  factoryRelativesMeasureAgent,
  type RelativesMeasureAgent,
  type RelativesMeasureAgentConfig,
} from './relatives-measure-agent';

export {
  ASSET_PACK_RELATIVES_CATALOG,
  EVALUATION_FIT_COMPOSITE_KIND,
  computeEvaluationFitVolume,
  type AssetPackRelativeSpec,
  type RelativePropertyClass,
  type RelativeReadingLike,
} from './relatives-catalog';

export {
  BENCHMARK_DELTA_KIND_PREFIX,
  RELATIVE_SUBFAMILY_MASS_TABLE,
  STATIC_FIT_KINDS,
  applyRelativeSubfamilyMasses,
  assertRelativeKindPattern,
  isBenchmarkDeltaKind,
  isWeightBearingRelative,
  relativeSubfamilyOf,
  resolveRelativeSubfamilyMasses,
  type MassableRelativeRow,
  type RelativeHonestyStatus,
  type RelativeSubfamily,
} from './relative-subfamily-masses';
