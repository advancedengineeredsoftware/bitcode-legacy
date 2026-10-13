/**
 * Demonstration synthesis options — project catalog DataPacks into the exact
 * Implementation-phase option shapes the real SDIVF pipelines emit, so every
 * downstream stage (deposit fail-closed validation + real option projection,
 * read Finish unpaid envelope, settle rehydrate, PR ship) runs unmodified.
 *
 * - Deposit: the packs that best fit the depositor checkout (path hints +
 *   repository language) as `DepositSynthesisRawOption[]` (absolutes + patch +
 *   patchArtifact + commercial NL), `needinesses: []` per deposit law.
 * - Read: Implementation `options` consumed by the read Finish agent, drawn
 *   from admitted Depository supply first (seller linkage for settle payout),
 *   with static `*-fit` needinesses measured against the Need and repository —
 *   ranked so strong matches and clear non-matches are both visible.
 *
 * Covered source paths bind to the *real* request checkout catalog so option
 * provenance and coverage reflect the selected repository.
 */

import { buildUnifiedDiffFromPatchFiles } from '@bitcode/generic-artifacts-patch-kind';
import {
  ASSET_PACK_NEEDINESSES_CATALOG,
  computeNeedFitVolume,
} from '@bitcode/generic-measurements-needinesses';

import { isPathImpermissible, isPathPermissible } from '../asset-packs-synthesis-inventory';
import type { DepositSynthesisRawOption } from '../asset-packs-synthesis-types';
import { measureDemonstrationDataPackAbsolutes } from './demonstration-absolutes';
import {
  DEMONSTRATION_DATA_PACK_CATALOG,
  type DemonstrationDataPack,
  type DemonstrationDataPackLanguage,
} from './demonstration-data-pack-catalog';

/** Paths never offered as provenance (vendored, generated, lockfiles). */
const NON_SOURCE_PATH = /(^|\/)(node_modules|dist|build|coverage|\.next|vendor|\.git)\/|(^|\/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock)$/i;
const SOURCE_EXTENSION = /\.(ts|tsx|js|jsx|mjs|cjs|py|go|rs|rb|java|kt|cs|php|swift|sql|md)$/i;
const MAX_COVERED_PATHS = 4;
/** Deposit offers this many best-fitting packs (live runs yield 2–4). */
export const DEMONSTRATION_DEPOSIT_OPTION_COUNT = 4;
/** Read presents up to this many options: best matches + a contrast non-match. */
export const DEMONSTRATION_READ_OPTION_COUNT = 4;

const LANGUAGE_FAMILIES: Record<DemonstrationDataPackLanguage, ReadonlySet<string>> = {
  typescript: new Set(['typescript', 'javascript', 'tsx', 'jsx']),
  python: new Set(['python', 'jupyter notebook']),
};

export interface DemonstrationCheckoutSteering {
  permissibleSources?: string[];
  impermissibleSources?: string[];
}

/** true / false when the repository language is known; null when unknown. */
function languageMatches(
  pack: DemonstrationDataPack,
  repositoryLanguage?: string | null,
): boolean | null {
  const language = String(repositoryLanguage || '').trim().toLowerCase();
  if (!language) return null;
  return LANGUAGE_FAMILIES[pack.language].has(language);
}

/**
 * Rank the request checkout's paths by a pack's provenance hints and return
 * the top few in-scope source paths. Falls back to any in-scope source files,
 * then to the pack's own shipped paths when the catalog is empty.
 */
export function bindDemonstrationCoveredSourcePaths(
  pack: DemonstrationDataPack,
  catalogPaths: readonly string[],
  steering: DemonstrationCheckoutSteering = {},
): string[] {
  const permissible = steering.permissibleSources ?? [];
  const impermissible = steering.impermissibleSources ?? [];
  const inScope = catalogPaths.filter(
    (path) =>
      SOURCE_EXTENSION.test(path) &&
      !NON_SOURCE_PATH.test(path) &&
      isPathPermissible(path, permissible) &&
      !isPathImpermissible(path, impermissible),
  );
  if (inScope.length === 0) {
    return pack.files.map((file) => file.path).slice(0, MAX_COVERED_PATHS);
  }
  const scored = inScope
    .map((path) => ({
      path,
      score: pack.provenanceHints.reduce(
        (sum, hint, index) => sum + (hint.test(path) ? pack.provenanceHints.length - index : 0),
        0,
      ),
    }))
    .sort((a, b) => b.score - a.score || a.path.length - b.path.length || a.path.localeCompare(b.path));
  return scored.slice(0, MAX_COVERED_PATHS).map((entry) => entry.path);
}

/**
 * Rank catalog packs for a depositor checkout: share of checkout paths that
 * match the pack's provenance hints, plus a repository-language bonus.
 */
export function rankDemonstrationPacksForCheckout(
  catalogPaths: readonly string[],
  repositoryLanguage?: string | null,
  packs: readonly DemonstrationDataPack[] = DEMONSTRATION_DATA_PACK_CATALOG,
): DemonstrationDataPack[] {
  const scored = packs.map((pack, order) => {
    const hits = catalogPaths.filter((path) => pack.provenanceHints.some((hint) => hint.test(path))).length;
    const pathScore = catalogPaths.length
      ? Math.min(1, hits / Math.max(5, catalogPaths.length * 0.02))
      : 0;
    const languageScore = languageMatches(pack, repositoryLanguage) === false ? 0 : 1;
    return { pack, order, score: pathScore + languageScore };
  });
  return scored
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .map((entry) => entry.pack);
}

function patchFileChanges(pack: DemonstrationDataPack) {
  return pack.files.map((file) => ({ path: file.path, op: 'create', content: file.body }));
}

/** Deposit lens: raw options accepted by `validateDepositSynthesisOptions`. */
export function buildDemonstrationDepositRawOptions(input: {
  catalogPaths: readonly string[];
  repositoryLanguage?: string | null;
  steering?: DemonstrationCheckoutSteering;
  /** Explicit packs (tests); default = best-fitting packs for the checkout. */
  packs?: readonly DemonstrationDataPack[];
}): DepositSynthesisRawOption[] {
  const packs =
    input.packs ??
    rankDemonstrationPacksForCheckout(input.catalogPaths, input.repositoryLanguage).slice(
      0,
      DEMONSTRATION_DEPOSIT_OPTION_COUNT,
    );
  return packs.map((pack) => {
    const files = pack.files.map((file) => ({ path: file.path, op: 'create', body: file.body }));
    return {
      kind: pack.kind,
      title: pack.title,
      summary: pack.summary,
      coveredSourcePaths: bindDemonstrationCoveredSourcePaths(pack, input.catalogPaths, input.steering),
      absolutes: measureDemonstrationDataPackAbsolutes(pack),
      measurementRationale: pack.measurementRationale,
      confidence: pack.confidence,
      patch: { fileChanges: patchFileChanges(pack), patchSummary: pack.patchSummary },
      patchArtifact: {
        artifactId: `demonstration-patch:${pack.id}`,
        format: 'unified-diff',
        fileCount: files.length,
        patchSummary: pack.patchSummary,
        bodiesComplete: true,
        unifiedDiff: buildUnifiedDiffFromPatchFiles(files, { patchSummary: pack.patchSummary }),
        files,
      },
      commercialTitle: pack.commercialTitle,
      commercialDescription: pack.commercialDescription,
    };
  });
}

export interface DemonstrationNeedinessReading {
  measurementKind: string;
  label: string;
  weight: number;
  volume: number;
  unit: string;
  category: 'neediness';
  status: 'measured' | 'estimated';
  descriptor: string;
}

/**
 * Static `*-fit` needinesses for a pack against the reader Need + repository.
 * - language-fit: measured — pack language vs. repository primary language.
 * - domain-fit: measured — Need vocabulary overlap with the pack's domain
 *   (no shared vocabulary ⇒ low fit, so non-matches read as non-matches).
 * - interface-fit: estimated — integration shape, scaled by domain relevance.
 */
export function measureDemonstrationNeedinesses(
  pack: DemonstrationDataPack,
  input: { need: string; repositoryLanguage?: string | null },
): DemonstrationNeedinessReading[] {
  const need = input.need.toLowerCase();
  const core = pack.needSignals.core.filter((signal) => need.includes(signal));
  const context = pack.needSignals.context.filter((signal) => need.includes(signal));
  const matched = [...core, ...context];
  // Core signals carry fit; shared context alone is only a partial match.
  const domainFit =
    core.length > 0
      ? Math.min(0.97, 0.55 + 0.14 * core.length + 0.03 * context.length)
      : Math.min(0.4, 0.05 + 0.08 * context.length);
  const matchStrength = Math.min(1, core.length / 2);
  const languageMatch = languageMatches(pack, input.repositoryLanguage);
  const languageFit = languageMatch === null ? 0.72 : languageMatch ? 0.94 : 0.48;
  const interfaceFit = pack.interfaceFit * (0.25 + 0.75 * matchStrength);
  const weightOf = (kind: string) =>
    ASSET_PACK_NEEDINESSES_CATALOG.find((spec) => spec.measurementKind === kind)?.weight ?? 1;
  const round = (value: number) => Math.round(value * 1000) / 1000;
  const packLanguage = pack.language === 'python' ? 'Python' : 'TypeScript';
  return [
    {
      measurementKind: 'language-fit',
      label: 'Language fit',
      weight: weightOf('language-fit'),
      volume: round(languageFit),
      unit: 'estimate',
      category: 'neediness',
      status: languageMatch === null ? 'estimated' : 'measured',
      descriptor:
        languageMatch === null
          ? `Pack ships ${packLanguage}; repository language unknown.`
          : `Pack ships ${packLanguage}; repository primary language is ${input.repositoryLanguage}.`,
    },
    {
      measurementKind: 'domain-fit',
      label: 'Domain fit',
      weight: weightOf('domain-fit'),
      volume: round(domainFit),
      unit: 'estimate',
      category: 'neediness',
      status: 'measured',
      descriptor: matched.length
        ? `Need mentions ${matched.length} domain signal(s): ${matched.slice(0, 4).join(', ')}.`
        : 'Need shares no domain vocabulary with this pack.',
    },
    {
      measurementKind: 'interface-fit',
      label: 'Interface fit',
      weight: weightOf('interface-fit'),
      volume: round(interfaceFit),
      unit: 'estimate',
      category: 'neediness',
      status: 'estimated',
      descriptor: core.length
        ? 'Dependency-free module surface that addresses the Need directly.'
        : 'Dependency-free module surface, but it does not address this Need.',
    },
  ];
}

/** Admitted Depository supply that a read option was synthesized from. */
export interface DemonstrationSupplyProvenance {
  admissionRunId: string;
  sellerUserId: string;
  depositoryAssetPackId: string | null;
  repositoryFullName: string | null;
}

/**
 * Present the best matches plus the weakest option as an explicit non-match
 * contrast (ranked order preserved).
 */
function selectReadPresentation<T>(ranked: T[], count: number): T[] {
  if (ranked.length <= count) return ranked;
  return [...ranked.slice(0, count - 1), ranked[ranked.length - 1]];
}

/**
 * Read lens: Implementation `options` consumed by the read Finish agent.
 * Candidates come from admitted Depository supply first (seller-linked); when
 * supply is thinner than the presentation, unlinked catalog packs top it up.
 */
export function buildDemonstrationReadImplementationOptions(input: {
  need: string;
  catalogPaths: readonly string[];
  repositoryLanguage?: string | null;
  steering?: DemonstrationCheckoutSteering;
  /** Seller linkage by catalog pack id (from admitted Depository rows). */
  supplyByPackId?: Readonly<Record<string, DemonstrationSupplyProvenance>>;
  packs?: readonly DemonstrationDataPack[];
  optionCount?: number;
}) {
  const catalog = input.packs ?? DEMONSTRATION_DATA_PACK_CATALOG;
  const optionCount = input.optionCount ?? DEMONSTRATION_READ_OPTION_COUNT;
  const supplied = catalog.filter((pack) => input.supplyByPackId?.[pack.id]);
  const pool =
    supplied.length >= optionCount
      ? supplied
      : [...supplied, ...catalog.filter((pack) => !input.supplyByPackId?.[pack.id])];
  const ranked = pool
    .map((pack) => {
      const needinesses = measureDemonstrationNeedinesses(pack, {
        need: input.need,
        repositoryLanguage: input.repositoryLanguage,
      });
      return {
        kind: pack.kind,
        title: pack.title,
        summary: pack.summary,
        coveredSourcePaths: bindDemonstrationCoveredSourcePaths(pack, input.catalogPaths, input.steering),
        confidence: pack.confidence,
        patch: { fileChanges: patchFileChanges(pack), patchSummary: pack.patchSummary },
        measurements: {
          absolutes: measureDemonstrationDataPackAbsolutes(pack),
          needinesses,
        },
        needFit: Math.round(computeNeedFitVolume(needinesses) * 1000) / 1000,
        measurementRationale: pack.measurementRationale,
        supplyProvenance: input.supplyByPackId?.[pack.id] ?? null,
      };
    })
    .sort((a, b) => b.needFit - a.needFit);
  return selectReadPresentation(ranked, optionCount);
}
