/**
 * Demonstration absolutes — full DATA_PACK_ABSOLUTES_CATALOG readings for a
 * demonstration DataPack without live MeasureAgent inference.
 *
 * Honesty law is preserved, not faked:
 * - Structural kinds whose magnitude is countable from the shipped bodies
 *   (functions, types, files, exports, imports, tests, branches, …) are
 *   computed here and carry status `measured`.
 * - Every other kind is derived from the pack's curated quality profile plus a
 *   deterministic per-kind offset and carries status `estimated`.
 * Readings are stable across runs for the same pack (seeded by pack + kind).
 */

import {
  DATA_PACK_ABSOLUTES_CATALOG,
  type DataPackAbsoluteKindSpec,
} from '@bitcode/generic-measurements-domain-data-pack-absolutes-catalog';

import type { AssetPackCandidateMeasurement } from '../asset-packs-synthesis-types';
import type {
  DemonstrationDataPack,
  DemonstrationDataPackQualityProfile,
} from './demonstration-data-pack-catalog';

/** Kinds where a high volume signals risk (low is the clean reading). */
const HIGH_IS_RISK_KINDS = new Set([
  'pii-exposure',
  'copyleft-risk-mass',
  'dead-code-ratio',
  'duplication-internal',
  'generated-code-mass',
  'ai-generated-likelihood',
  'substitution-density',
  'contamination',
  'external-service-coupling',
]);

/** Body-derived magnitudes for countable structural kinds. */
export interface DemonstrationDataPackStructure {
  functionCount: number;
  typeCount: number;
  fileCount: number;
  exportCount: number;
  importCount: number;
  testCount: number;
  branchCount: number;
  commentLineRatio: number;
  languageCount: number;
  moduleCount: number;
  lineCount: number;
}

/** Per-language structural patterns (counted per file by extension). */
interface StructurePatterns {
  functions: RegExp;
  types: RegExp;
  /** Public surface: `export` (TS) or public top-level def/class (Python). */
  exports: RegExp;
  imports: RegExp;
  tests: RegExp;
  branches: RegExp;
  commentLine: RegExp;
}

const TYPESCRIPT_PATTERNS: StructurePatterns = {
  functions: /\bfunction\b|=>|^\s*(?:async\s+)?[a-zA-Z_]\w*\s*\([^)]*\)\s*(?::[^{]+)?\{/gm,
  types: /\b(?:interface|class|enum)\s+\w+|\btype\s+\w+\s*=/g,
  exports: /^export\s/gm,
  imports: /^import\s/gm,
  tests: /\b(?:it|test)\(\s*"/g,
  branches: /\bif\b|\bfor\b|\bwhile\b|\bcatch\b|\?\s*[^:]+:|&&|\|\|/g,
  commentLine: /^\s*(?:\/\/|\/\*|\*)/,
};

const PYTHON_PATTERNS: StructurePatterns = {
  functions: /^\s*(?:async\s+)?def\s+\w+/gm,
  types: /^\s*class\s+\w+/gm,
  exports: /^(?:def|class)\s+[A-Za-z]\w*/gm,
  imports: /^(?:from\s+\S+\s+)?import\s/gm,
  tests: /^\s*def\s+test_\w+/gm,
  branches: /\bif\b|\bfor\b|\bwhile\b|\bexcept\b|\band\b|\bor\b/g,
  commentLine: /^\s*(?:#|"""|''')/,
};

function patternsFor(path: string): StructurePatterns {
  return /\.py$/i.test(path) ? PYTHON_PATTERNS : TYPESCRIPT_PATTERNS;
}

function countMatches(text: string, pattern: RegExp): number {
  return (text.match(pattern) || []).length;
}

/** Count structural magnitudes directly from the pack's file bodies. */
export function measureDemonstrationDataPackStructure(
  pack: Pick<DemonstrationDataPack, 'files'>,
): DemonstrationDataPackStructure {
  const totals = {
    functionCount: 0,
    typeCount: 0,
    exportCount: 0,
    importCount: 0,
    testCount: 0,
    branchCount: 0,
    commentLines: 0,
    lineCount: 0,
  };
  for (const file of pack.files) {
    const patterns = patternsFor(file.path);
    const lines = file.body.split('\n').filter((line) => line.trim().length > 0);
    const isTestFile = /(^|\/)(test_[^/]*\.py|[^/]*\.test\.tsx?)$|__tests__\//.test(file.path);
    totals.functionCount += countMatches(file.body, patterns.functions);
    totals.typeCount += countMatches(file.body, patterns.types);
    totals.exportCount += isTestFile ? 0 : countMatches(file.body, patterns.exports);
    totals.importCount += countMatches(file.body, patterns.imports);
    totals.testCount += countMatches(file.body, patterns.tests);
    totals.branchCount += countMatches(file.body, patterns.branches);
    totals.commentLines += lines.filter((line) => patterns.commentLine.test(line)).length;
    totals.lineCount += lines.length;
  }
  const extensions = new Set(
    pack.files.map((file) => file.path.split('.').pop() || '').filter(Boolean),
  );
  const directories = new Set(
    pack.files.map((file) => file.path.split('/').slice(0, -1).join('/')),
  );
  return {
    functionCount: totals.functionCount,
    typeCount: totals.typeCount,
    fileCount: pack.files.length,
    exportCount: totals.exportCount,
    importCount: totals.importCount,
    testCount: totals.testCount,
    branchCount: totals.branchCount,
    commentLineRatio: totals.lineCount ? totals.commentLines / totals.lineCount : 0,
    languageCount: extensions.size,
    moduleCount: directories.size,
    lineCount: totals.lineCount,
  };
}

/** FNV-1a 32-bit — tiny deterministic seed for per-kind offsets. */
function seed(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Deterministic offset in [-spread, +spread] for (pack, kind). */
function offset(packId: string, kind: string, spread: number): number {
  return ((seed(`${packId}:${kind}`) % 1000) / 999 - 0.5) * 2 * spread;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/** Saturating normalization of a magnitude against a reference size. */
function saturate(magnitude: number, reference: number): number {
  return clamp01(magnitude / (magnitude + reference));
}

type MeasuredReading = { magnitude: number; volume: number; descriptor: string };

function measuredStructuralReading(
  kind: string,
  structure: DemonstrationDataPackStructure,
): MeasuredReading | null {
  switch (kind) {
    case 'function-count':
      return {
        magnitude: structure.functionCount,
        volume: saturate(structure.functionCount, 12),
        descriptor: `${structure.functionCount} functions across the shipped modules.`,
      };
    case 'type-count':
      return {
        magnitude: structure.typeCount,
        volume: saturate(structure.typeCount, 6),
        descriptor: `${structure.typeCount} declared types, interfaces, or classes.`,
      };
    case 'file-span':
      return {
        magnitude: structure.fileCount,
        volume: saturate(structure.fileCount, 4),
        descriptor: `${structure.fileCount} files including tests.`,
      };
    case 'api-surface':
      return {
        magnitude: structure.exportCount,
        volume: saturate(structure.exportCount, 8),
        descriptor: `${structure.exportCount} exported symbols form the public surface.`,
      };
    case 'dependency-span':
      return {
        magnitude: structure.importCount,
        volume: saturate(structure.importCount, 8),
        descriptor: `${structure.importCount} import statements; no third-party runtime dependencies.`,
      };
    case 'test-surface':
      return {
        magnitude: structure.testCount,
        volume: saturate(structure.testCount, 4),
        descriptor: `${structure.testCount} test cases ship with the pack.`,
      };
    case 'control-complexity':
      return {
        magnitude: structure.branchCount,
        volume: saturate(structure.branchCount, 20),
        descriptor: `${structure.branchCount} branch points across ${structure.lineCount} non-blank lines.`,
      };
    case 'doc-signal':
      return {
        magnitude: round3(structure.commentLineRatio),
        volume: clamp01(structure.commentLineRatio * 3),
        descriptor: `${Math.round(structure.commentLineRatio * 100)}% of lines are documentation comments.`,
      };
    case 'lang-span':
      return {
        magnitude: structure.languageCount,
        volume: saturate(structure.languageCount, 2),
        descriptor: `${structure.languageCount} source language(s).`,
      };
    case 'modularity':
      return {
        magnitude: structure.moduleCount,
        volume: saturate(structure.moduleCount + structure.fileCount / 2, 4),
        descriptor: `${structure.fileCount} files organized into ${structure.moduleCount} module directories.`,
      };
    default:
      return null;
  }
}

function profileTier(
  spec: DataPackAbsoluteKindSpec,
  quality: DemonstrationDataPackQualityProfile,
): number {
  switch (spec.family) {
    case 'verification':
      return quality.verification;
    case 'hygiene':
      return quality.hygiene;
    case 'provenance':
      return quality.provenance;
    case 'value':
      return quality.value;
    case 'semantics':
      return quality.semantics;
    default:
      // Unmeasured structure kinds lean on semantics (clarity of the surface).
      return (quality.semantics + quality.value) / 2;
  }
}

/**
 * Full-catalogue absolutes for a demonstration DataPack (Σ weights = 1 law
 * inherited from DATA_PACK_ABSOLUTES_CATALOG).
 */
export function measureDemonstrationDataPackAbsolutes(
  pack: DemonstrationDataPack,
): AssetPackCandidateMeasurement[] {
  const structure = measureDemonstrationDataPackStructure(pack);
  return DATA_PACK_ABSOLUTES_CATALOG.map((spec) => {
    const measured = measuredStructuralReading(spec.measurementKind, structure);
    if (measured) {
      return {
        measurementKind: spec.measurementKind,
        label: spec.label,
        weight: spec.weight,
        category: 'absolute' as const,
        unit: spec.unit,
        magnitude: measured.magnitude,
        volume: round3(measured.volume),
        descriptor: measured.descriptor,
        status: 'measured' as const,
      };
    }
    const tier = profileTier(spec, pack.quality);
    const clean = clamp01(tier + offset(pack.id, spec.measurementKind, 0.06));
    const volume = HIGH_IS_RISK_KINDS.has(spec.measurementKind)
      ? clamp01(1 - clean - 0.05)
      : clean;
    return {
      measurementKind: spec.measurementKind,
      label: spec.label,
      weight: spec.weight,
      category: 'absolute' as const,
      unit: spec.unit,
      magnitude: round3(volume),
      volume: round3(volume),
      descriptor: `${spec.label} estimated from the curated demonstration profile (${pack.kind}).`,
      status: 'estimated' as const,
    };
  });
}
