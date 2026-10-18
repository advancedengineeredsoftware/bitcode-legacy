/**
 * Quick synthesis Gather tool (no model call): repository tree + real file
 * bodies through an injected source loader (GitHub REST in the website, a
 * fixture in tests), scoped by permissible/impermissible sources, ranked, and
 * budget-capped into the synthesis-provider catalog projection.
 */

import { factoryTool } from '@bitcode/tools-generics';
import {
  isPathImpermissible,
  isPathPermissible,
  projectInventoryForSynthesisProvider,
  type SynthesisProviderInventoryProjection,
} from '@bitcode/asset-packs-pipelines-syntheses-domain/asset-packs-synthesis-inventory';
import type { AssetPacksSynthesisSourceInventory } from '@bitcode/asset-packs-pipelines-syntheses-domain/asset-packs-synthesis-types';

export interface QuickSynthesisSourceLoader {
  /** Blob paths of the repository at the request reference. */
  listPaths(): Promise<string[]>;
  /** Full bodies for the requested paths (missing/binary files may be omitted). */
  readFiles(paths: string[]): Promise<Array<{ path: string; content: string }>>;
}

export interface QuickSynthesisBudget {
  maxFiles: number;
  maxChars: number;
}

export const DEFAULT_QUICK_SYNTHESIS_BUDGET: QuickSynthesisBudget = { maxFiles: 80, maxChars: 300_000 };

export function readQuickSynthesisBudget(
  env: Record<string, string | undefined> = process.env,
): QuickSynthesisBudget {
  const int = (value: string | undefined, fallback: number) => {
    const parsed = Number.parseInt(String(value ?? ''), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  };
  return {
    maxFiles: int(env.BITCODE_QUICK_SYNTHESIS_MAX_FILES, DEFAULT_QUICK_SYNTHESIS_BUDGET.maxFiles),
    maxChars: int(env.BITCODE_QUICK_SYNTHESIS_MAX_CHARS, DEFAULT_QUICK_SYNTHESIS_BUDGET.maxChars),
  };
}

const NON_SOURCE_PATH =
  /(^|\/)(node_modules|dist|build|coverage|\.next|vendor|\.git|__snapshots__)\/|(^|\/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|Cargo\.lock|poetry\.lock)$|\.(png|jpe?g|gif|svg|ico|woff2?|ttf|pdf|zip|gz|mp4|lock|min\.js)$/i;
const SOURCE_EXTENSION = /\.(ts|tsx|js|jsx|mjs|cjs|py|go|rs|rb|java|kt|cs|php|swift|sql|md)$/i;
const MANIFEST = /(^|\/)(package\.json|pyproject\.toml|requirements\.txt|go\.mod|Cargo\.toml|README\.md|tsconfig\.json)$/i;

function tokensOf(text: string): string[] {
  return [...new Set(String(text || '').toLowerCase().split(/[^a-z0-9]+/u).filter((token) => token.length >= 4))];
}

/**
 * Rank in-scope paths: manifests first, then steering-keyword hits, then
 * shallow source files. Deterministic for a given input.
 */
export function rankQuickSynthesisPaths(paths: readonly string[], steeringText: string): string[] {
  const keywords = tokensOf(steeringText);
  const score = (path: string) => {
    const lower = path.toLowerCase();
    let s = 0;
    if (MANIFEST.test(path) && path.split('/').length <= 2) s += 50;
    s += keywords.filter((keyword) => lower.includes(keyword)).length * 12;
    if (SOURCE_EXTENSION.test(path)) s += 6;
    if (/(^|\/)(src|lib|app|packages)\//i.test(path)) s += 3;
    if (/test|spec/i.test(path)) s += 1;
    s -= Math.min(6, path.split('/').length);
    return s;
  };
  return [...paths].sort((a, b) => score(b) - score(a) || a.length - b.length || a.localeCompare(b));
}

export interface QuickSynthesisGatherInput {
  loader: QuickSynthesisSourceLoader;
  permissibleSources: string[];
  impermissibleSources: string[];
  /** Evaluation or obfuscation text used for keyword ranking. */
  steeringText: string;
  budget?: QuickSynthesisBudget;
}

export interface QuickSynthesisGatherResult {
  /** Source catalog (validation inventory = every in-scope path). */
  sourceCatalog: AssetPacksSynthesisSourceInventory;
  /** Budget-capped provider projection with real bodies. */
  providerCatalog: SynthesisProviderInventoryProjection;
}

export async function gatherQuickSynthesisSource(
  input: QuickSynthesisGatherInput,
): Promise<QuickSynthesisGatherResult> {
  const budget = input.budget ?? DEFAULT_QUICK_SYNTHESIS_BUDGET;
  const allPaths = await input.loader.listPaths();
  const inScope = allPaths.filter(
    (path) =>
      !NON_SOURCE_PATH.test(path) &&
      isPathPermissible(path, input.permissibleSources) &&
      !isPathImpermissible(path, input.impermissibleSources),
  );
  const selected = rankQuickSynthesisPaths(inScope, input.steeringText).slice(0, budget.maxFiles);
  const sources = (await input.loader.readFiles(selected)).filter(
    (file) => typeof file.content === 'string' && file.content.length > 0 && !file.content.includes('\u0000'),
  );
  const sourceCatalog: AssetPacksSynthesisSourceInventory = {
    paths: inScope,
    samples: [],
    sources,
    totalPathCount: inScope.length,
    excludedPathCount: allPaths.length - inScope.length,
  };
  const providerCatalog = projectInventoryForSynthesisProvider(sourceCatalog, {
    maxSourceFiles: budget.maxFiles,
    maxTotalChars: budget.maxChars,
    maxCharsPerFile: Math.max(1_000, Math.floor(budget.maxChars / 4)),
    preferPaths: selected,
  });
  if (!providerCatalog) {
    throw new Error('Quick synthesis could not project the source catalog.');
  }
  return { sourceCatalog, providerCatalog };
}

/** Gather as a Tool (Tool primitive parity with rich synthesis). */
export const quickSynthesisGatherSourceTool = factoryTool(
  'QuickSynthesisGatherSourceTool',
  gatherQuickSynthesisSource,
  {
    description:
      'Gather the repository source catalog for quick synthesis: scoped paths and budget-capped real file bodies (no model call).',
  },
);
