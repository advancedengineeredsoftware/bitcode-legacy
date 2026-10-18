/**
 * Deposit relative computation (read-demand preview).
 *
 * relative = clamp01(demand × (0.5 + 0.5·(1 − saturation))).
 * Source-safe: scalars + topic-level rationale only — never raw source.
 */

import type { AssetPackRelative } from './asset-packs-synthesis-types';

/** Clamp a number into [0, 1] with two-decimal fixed precision. */
export function clampVolume(value: number): number {
  return Number(Math.max(0, Math.min(1, value)).toFixed(2));
}

/**
 * Compute relative (v0): demand gates, scarcity boosts. A demanded, underserved
 * pack scores highest; a saturated or undemanded pack scores low.
 */
export function computeRelative(demand: number, saturation: number): number {
  const d = clampVolume(Number.isFinite(demand) ? demand : 0);
  const s = clampVolume(Number.isFinite(saturation) ? saturation : 0);
  return clampVolume(d * (0.5 + 0.5 * (1 - s)));
}

/** Build the relative preview from a raw per-pack signal (deposit lens). */
export function buildRelativeFromSignal(signal: {
  demand?: unknown;
  saturation?: unknown;
  rationale?: unknown;
} | null | undefined): AssetPackRelative | undefined {
  if (!signal || typeof signal !== 'object') return undefined;
  const demand = clampVolume(
    Number.isFinite(Number((signal as { demand?: unknown }).demand))
      ? Number((signal as { demand?: unknown }).demand)
      : 0,
  );
  const saturation = clampVolume(
    Number.isFinite(Number((signal as { saturation?: unknown }).saturation))
      ? Number((signal as { saturation?: unknown }).saturation)
      : 0,
  );
  return {
    volume: computeRelative(demand, saturation),
    demand,
    saturation,
    rationale: String((signal as { rationale?: unknown }).rationale ?? '').trim(),
  };
}
