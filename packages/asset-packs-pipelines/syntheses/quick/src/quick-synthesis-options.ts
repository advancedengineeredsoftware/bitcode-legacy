/**
 * Quick synthesis Measure + projection (no model call).
 *
 * Projects the single call's validated output into the exact shapes the rich
 * pipelines emit, so every downstream stage runs unmodified:
 * - deposit → `DepositSynthesisRawOption[]` for the dispatcher's real
 *   `validateDepositSynthesisOptions` → real option projection;
 * - read → Implementation `options` for the real read Finish agent.
 *
 * Absolutes: profile-absolutes law (body-countable kinds `measured`, the rest
 * `estimated` from the model's quality profile). Read relatives: static fit
 * by deterministic material overlap, Evaluation-inferred `-fit` rows from the
 * call, both `estimated`; weights follow the Relative weight law.
 */

import { createHash } from 'node:crypto';

import { buildUnifiedDiffFromPatchFiles } from '@bitcode/generic-artifacts-patch-kind';
import { computeEvaluationFitVolume } from '@bitcode/generic-measurements-relatives';
import {
  measureProfileDataPackAbsolutes,
  type DataPackQualityProfile,
} from '@bitcode/asset-packs-pipelines-syntheses-domain/profile-absolutes';
import {
  isPathImpermissible,
  isPathPermissible,
} from '@bitcode/asset-packs-pipelines-syntheses-domain/asset-packs-synthesis-inventory';
import type { DepositSynthesisRawOption } from '@bitcode/asset-packs-pipelines-syntheses-domain/asset-packs-synthesis-types';
import {
  measureReadRelativesDeterministic,
  slugifyRelativeKind,
} from '@bitcode/asset-packs-pipelines-execution-pipeline-sdivf-synthesize-reads-asset-packs/read-relative-measurements';

import type { QuickDepositOption, QuickReadOption } from './quick-synthesis-schema';
import { QuickSynthesisError } from './quick-synthesis-schema';

export const QUICK_PROFILE_SOURCE = 'quick synthesis model-reported quality profile';

export interface QuickDepositorySupplyRow {
  depositoryAssetPackId: string;
  title: string;
  summary: string;
  kind?: string | null;
}

function stableId(prefix: string, parts: string[]): string {
  return `${prefix}:${createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 16)}`;
}

function patchFiles(option: QuickDepositOption) {
  return option.patch.fileChanges.map((change) => ({ path: change.path, op: change.op, body: change.content }));
}

function measureAbsolutes(option: QuickDepositOption) {
  return measureProfileDataPackAbsolutes({
    id: stableId('quick-pack', [option.title, ...option.coveredSourcePaths]),
    kind: option.kind,
    files: option.patch.fileChanges.map((change) => ({ path: change.path, body: change.content })),
    quality: option.qualityProfile as DataPackQualityProfile,
    profileSource: QUICK_PROFILE_SOURCE,
  });
}

/** Deposit lens: raw options accepted by `validateDepositSynthesisOptions`. */
export function projectQuickDepositOptions(
  options: readonly QuickDepositOption[],
  runId: string,
): DepositSynthesisRawOption[] {
  return options.map((option, index) => {
    const files = patchFiles(option);
    return {
      kind: option.kind,
      title: option.title,
      summary: option.summary,
      coveredSourcePaths: option.coveredSourcePaths,
      absolutes: measureAbsolutes(option),
      measurementRationale: option.measurementRationale || option.summary,
      confidence: option.confidence,
      patch: {
        fileChanges: option.patch.fileChanges.map((change) => ({
          path: change.path,
          op: change.op,
          content: change.content,
        })),
        patchSummary: option.patch.patchSummary,
      },
      patchArtifact: {
        artifactId: `quick-patch:${runId}:${index}`,
        format: 'unified-diff',
        fileCount: files.length,
        patchSummary: option.patch.patchSummary,
        bodiesComplete: true,
        unifiedDiff: buildUnifiedDiffFromPatchFiles(files, { patchSummary: option.patch.patchSummary }),
        files,
      },
      commercialTitle: option.commercialTitle,
      commercialDescription: option.commercialDescription,
    };
  });
}

/** Keep only attributions over the run's admitted supply; merge duplicates. */
export function resolveQuickSourceAttributions(
  option: Pick<QuickReadOption, 'sourceAttributions'>,
  supply: readonly QuickDepositorySupplyRow[],
) {
  const admitted = new Set(supply.map((row) => row.depositoryAssetPackId));
  const merged = new Map<string, { depositoryAssetPackId: string; weight: number; rationale: string }>();
  for (const attribution of option.sourceAttributions) {
    if (!admitted.has(attribution.depositoryAssetPackId) || !(attribution.weight > 0)) continue;
    const existing = merged.get(attribution.depositoryAssetPackId);
    if (existing) existing.weight += attribution.weight;
    else
      merged.set(attribution.depositoryAssetPackId, {
        depositoryAssetPackId: attribution.depositoryAssetPackId,
        weight: attribution.weight,
        rationale: attribution.rationale ?? '',
      });
  }
  return [...merged.values()];
}

export function measureQuickReadRelatives(option: QuickReadOption, evaluation: string) {
  const inferred = new Map(
    option.relativeRows.map((row) => [slugifyRelativeKind(row.measurementKind), row] as const),
  );
  const rows = measureReadRelativesDeterministic({
    title: option.title,
    summary: option.summary,
    confidence: option.confidence,
    evaluationSummary: evaluation,
    dynamicRelatives: [...inferred.entries()].map(([measurementKind, row]) => ({
      measurementKind,
      label: row.label,
      guidance: row.guidance,
      weight: 1,
    })),
    patchSummary: option.patch.patchSummary,
    coveredSourcePaths: option.coveredSourcePaths,
    commercialDescription: option.commercialDescription,
  });
  return rows.map((row) => {
    const fromCall = row.propertyClass === 'dynamic-inferred' ? inferred.get(row.measurementKind) : undefined;
    const volume = fromCall ? Math.max(0, Math.min(1, fromCall.volume)) : row.volume;
    return {
      ...row,
      volume,
      magnitude: volume,
      status: 'estimated' as const,
      rationale: fromCall?.rationale || row.rationale,
    };
  });
}

/**
 * Read lens: Implementation `options` for the read Finish agent. Fail-closed
 * path law: covered paths must be in-scope checkout paths; options failing it
 * are dropped, and zero survivors fails the run.
 */
export function projectQuickReadOptions(input: {
  options: readonly QuickReadOption[];
  evaluation: string;
  inventoryPaths: readonly string[];
  permissibleSources: readonly string[];
  impermissibleSources: readonly string[];
  depositorySupply: readonly QuickDepositorySupplyRow[];
}) {
  const inventory = new Set(input.inventoryPaths);
  const projected = input.options
    .filter((option) =>
      option.coveredSourcePaths.every(
        (path) =>
          inventory.has(path) &&
          isPathPermissible(path, [...input.permissibleSources]) &&
          !isPathImpermissible(path, [...input.impermissibleSources]),
      ),
    )
    .filter((option) =>
      option.patch.fileChanges.every(
        (change) =>
          !isPathImpermissible(change.path, [...input.impermissibleSources]) &&
          (change.op === 'create' || inventory.has(change.path)),
      ),
    )
    .map((option) => {
      const relatives = measureQuickReadRelatives(option, input.evaluation);
      return {
        kind: option.kind,
        title: option.title,
        summary: option.summary,
        coveredSourcePaths: option.coveredSourcePaths,
        confidence: option.confidence,
        patch: {
          fileChanges: option.patch.fileChanges.map((change) => ({
            path: change.path,
            op: change.op,
            content: change.content,
          })),
          patchSummary: option.patch.patchSummary,
        },
        measurements: { absolutes: measureAbsolutes(option), relatives },
        evaluationFit: Math.round(computeEvaluationFitVolume(relatives) * 1000) / 1000,
        measurementRationale: option.measurementRationale || option.summary,
        commercialTitle: option.commercialTitle,
        commercialDescription: option.commercialDescription,
        sourceAttributions: resolveQuickSourceAttributions(option, input.depositorySupply),
        supplyProvenance: null,
      };
    })
    .sort((a, b) => b.evaluationFit - a.evaluationFit);
  if (projected.length === 0) {
    throw new QuickSynthesisError(
      'Quick synthesis produced no read option whose covered paths and patch paths satisfy the checkout and steering law.',
    );
  }
  return projected;
}
