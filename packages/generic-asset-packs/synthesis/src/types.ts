/**
 * SynthesizeAssetPacks measurement product types.
 *
 * Measurement KINDS: absolutes | relatives (nested carrier on DataPacks).
 * Hierarchy: product measurement types over Measurement / MeasureAgent bases.
 */

import type { MeasurementSpec } from '@bitcode/measurement-generics';

/** Deposit | read synthesis mode (separate product pipelines; no lens). */
export type SynthesizeAssetPacksMode = 'deposit' | 'read';

/**
 * Synthesis **policy** row (steering language only).
 * Not an absolute or relative measurement reading — do not put volumes in
 * `measurements.absolutes` / `measurements.relatives` from these keys alone.
 */
export interface AssetPackMeasurementSpec {
  measurementKind: string;
  label: string;
  weight: number;
  guidance: string;
}

/** @deprecated Alias — policy rows, not formal measurements. */
export type AssetPackSynthesisPolicySpec = AssetPackMeasurementSpec;

export type AbsolutePropertyClass = 'quantity' | 'quality';

export interface AssetPackAbsoluteSpec extends MeasurementSpec {
  weight: number;
  propertyClass: AbsolutePropertyClass;
  /** Always true under V48 absolute reading law (magnitude always required). */
  hasMagnitude: true;
}

/**
 * One absolute reading. **Always** carries magnitude + volume + unit + weight.
 * Quantity: magnitude = raw count. Quality: magnitude mirrors volume (0..1).
 */
export interface AssetPackCandidateMeasurement {
  measurementKind: string;
  label: string;
  weight: number;
  volume: number;
  magnitude: number;
  unit: string;
  category: 'absolute';
  rationale?: string;
  /**
   * Source-safe, instance-facing prose for **this** DataPack reading
   * (generated when/after measurement). Never raw source.
   */
  descriptor?: string;
}

/** One relative reading (read path only). Same numeric law as absolutes for fields. */
export interface AssetPackRelativeMeasurement {
  measurementKind: string;
  label: string;
  weight: number;
  volume: number;
  magnitude: number;
  unit: string;
  category: 'relative';
  rationale?: string;
  /** Source-safe instance prose for this reading (when attached). */
  descriptor?: string;
}

/**
 * Canonical nested measurement kinds object on a DataPack / deposit option.
 * Deposit: relatives is always [].
 * Read: relatives populated; evaluation-fit composite derived separately.
 */
export interface AssetPackMeasurementsByKind {
  absolutes: AssetPackCandidateMeasurement[];
  relatives: AssetPackRelativeMeasurement[];
}

export function emptyAssetPackMeasurements(): AssetPackMeasurementsByKind {
  return { absolutes: [], relatives: [] };
}
