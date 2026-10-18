/**
 * RelativesMeasureAgent — reader/Evaluation-relative Measurement base.
 *
 * Hierarchy: Relatives + MeasureAgent (+ Measurement primitives).
 * Product: read synthesis attaches measurements.relatives (*-fit kinds).
 *
 * Relatives depend on a stated Evaluation / buyer context — never absolute sizes.
 * Every product relative kind MUST end with the suffix `-fit`.
 * evaluation-fit composite is NOT measured here (weighted mean of relatives rows).
 */

import {
  factoryMeasureAgent,
  type MeasureAgent,
  type MeasurementSpec,
} from '@bitcode/generic-agents-agent-measure';
import type { MeasurementKindCategory } from '@bitcode/measurement-generics';

const RELATIVES_MEASUREMENT_CATEGORY: MeasurementKindCategory = 'relative';

const RELATIVES_FRAMING =
  'You measure RELATIVES — READER-RELATIVE properties of digital material: how ' +
  'well the artifact fits a stated Evaluation, demand, or buyer context. Relatives are ' +
  'NOT absolute/intrinsic sizes; they depend on the reader and the Evaluation. Do not ' +
  'confuse relative with absolute quantity or quality of the artifact alone. ' +
  'Every measurementKind ends with -fit. evaluation-fit is a composite (weighted mean), ' +
  'not a raw measurement target.';

export interface RelativesMeasureAgentConfig {
  name: string;
  description?: string;
  /** What is being measured, e.g. "a synthesized AssetPack under a reader Evaluation". */
  subject: string;
  /** Static + dynamic *-fit specs to measure. */
  measurements: MeasurementSpec[];
  plan?: { chunkThreshold?: number };
  try?: { chunkThreshold?: number };
  refine?: { maxAttempts?: number };
  retry?: { maxAttempts?: number };
}

export type RelativesMeasureAgent = MeasureAgent;

/**
 * factoryRelativesMeasureAgent — bases factoryMeasureAgent with relatives framing.
 */
export function factoryRelativesMeasureAgent(
  config: RelativesMeasureAgentConfig,
): RelativesMeasureAgent {
  for (const spec of config.measurements || []) {
    if (!String(spec.measurementKind || '').endsWith('-fit')) {
      throw new Error(
        `RelativesMeasureAgent requires measurementKind to end with "-fit" (got ${spec.measurementKind}).`,
      );
    }
  }
  return factoryMeasureAgent({
    name: config.name,
    description: config.description,
    subject: config.subject,
    category: RELATIVES_MEASUREMENT_CATEGORY,
    categoryFraming: RELATIVES_FRAMING,
    measurements: config.measurements,
    plan: config.plan,
    try: config.try,
    refine: config.refine,
    retry: config.retry,
  });
}
