/**
 * Demonstration absolutes — full DATA_PACK_ABSOLUTES_CATALOG readings for a
 * demonstration DataPack without live MeasureAgent inference.
 *
 * Shares the profile-absolutes honesty law: body-countable structural kinds
 * are `measured`; every other kind is `estimated` from the curated quality
 * profile. Readings are stable across runs for the same pack.
 */

import type { AssetPackCandidateMeasurement } from '../asset-packs-synthesis-types';
import {
  measureDataPackBodyStructure,
  measureProfileDataPackAbsolutes,
  type DataPackBodyStructure,
} from '../profile-absolutes';
import type { DemonstrationDataPack } from './demonstration-data-pack-catalog';

/** Body-derived magnitudes for countable structural kinds. */
export type DemonstrationDataPackStructure = DataPackBodyStructure;

/** Count structural magnitudes directly from the pack's file bodies. */
export function measureDemonstrationDataPackStructure(
  pack: Pick<DemonstrationDataPack, 'files'>,
): DemonstrationDataPackStructure {
  return measureDataPackBodyStructure(pack);
}

/**
 * Full-catalogue absolutes for a demonstration DataPack (Σ weights = 1 law
 * inherited from DATA_PACK_ABSOLUTES_CATALOG).
 */
export function measureDemonstrationDataPackAbsolutes(
  pack: DemonstrationDataPack,
): AssetPackCandidateMeasurement[] {
  return measureProfileDataPackAbsolutes({
    id: pack.id,
    kind: pack.kind,
    files: pack.files,
    quality: pack.quality,
    profileSource: 'curated demonstration profile',
  });
}
