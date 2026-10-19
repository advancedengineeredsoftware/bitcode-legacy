/**
 * Boundary adapter: parse wire JSON into strongly typed SettleAssetPackOption.
 * Fail-closed — never returns loosely typed bags.
 */

import type {
  AbsoluteReadingForSettlement,
  AssetPackMeasurementsForSettlement,
  RelativeRowInput,
  SettlementBenchmarkEvidence,
} from '@bitcode/btd/erc1155';
import type { SettleAssetPackOption, SettleAssetPackPatch } from './settle-types';

const RELATIVE_STATUSES = new Set(['measured', 'estimated', 'insufficient_evidence', 'not_run']);
const RELATIVE_PROPERTY_CLASSES = new Set(['static-catalog', 'dynamic-inferred', 'benchmark-delta']);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function finiteOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** Benchmark-delta evidence: parsed values only (never command output). */
function parseBenchmarkEvidence(raw: unknown): SettlementBenchmarkEvidence | undefined {
  if (!isObject(raw) || typeof raw.benchmarkId !== 'string') return undefined;
  return {
    benchmarkId: raw.benchmarkId.slice(0, 64),
    baseline: finiteOrNull(raw.baseline),
    candidate: finiteOrNull(raw.candidate),
    unit: typeof raw.unit === 'string' ? raw.unit.slice(0, 24) : null,
    direction: raw.direction === 'lower-is-better' ? 'lower-is-better' : 'higher-is-better',
    improvementRatio: finiteOrNull(raw.improvementRatio),
  };
}

function parseRelativeRow(raw: unknown): RelativeRowInput | null {
  if (!isObject(raw)) return null;
  const volume = typeof raw.volume === 'number' ? raw.volume : null;
  if (volume === null || !Number.isFinite(volume)) return null;
  const weight = typeof raw.weight === 'number' && Number.isFinite(raw.weight) ? raw.weight : undefined;
  const magnitude =
    typeof raw.magnitude === 'number' && Number.isFinite(raw.magnitude) ? raw.magnitude : undefined;
  const unit = typeof raw.unit === 'string' ? raw.unit : null;
  // V49: honesty status + subfamily class drive the subfamily mass law.
  const honesty = {
    ...(typeof raw.status === 'string' && RELATIVE_STATUSES.has(raw.status) ? { status: raw.status } : {}),
    ...(typeof raw.propertyClass === 'string' && RELATIVE_PROPERTY_CLASSES.has(raw.propertyClass)
      ? { propertyClass: raw.propertyClass }
      : {}),
  };
  const label = typeof raw.label === 'string' && raw.label.trim() ? raw.label.trim().slice(0, 120) : undefined;
  const benchmark = parseBenchmarkEvidence(raw.benchmark);
  if (typeof raw.measurementKind === 'string' && raw.measurementKind.trim()) {
    return {
      measurementKind: raw.measurementKind.trim(),
      volume,
      weight,
      magnitude,
      unit,
      category: 'relative',
      ...honesty,
      ...(label ? { label } : {}),
      ...(benchmark ? { benchmark } : {}),
    };
  }
  if (typeof raw.kind === 'string' && raw.kind.trim()) {
    return {
      kind: raw.kind.trim(),
      volume,
      weight,
      magnitude,
      unit,
      category: 'relative',
      ...honesty,
    };
  }
  return null;
}

function parseAbsoluteRow(raw: unknown): AbsoluteReadingForSettlement | null {
  if (!isObject(raw)) return null;
  const volume = typeof raw.volume === 'number' ? raw.volume : null;
  if (volume === null || !Number.isFinite(volume)) return null;
  return {
    measurementKind: typeof raw.measurementKind === 'string' ? raw.measurementKind : undefined,
    kind: typeof raw.kind === 'string' ? raw.kind : undefined,
    volume,
    magnitude: typeof raw.magnitude === 'number' ? raw.magnitude : undefined,
    weight: typeof raw.weight === 'number' ? raw.weight : undefined,
    unit: typeof raw.unit === 'string' ? raw.unit : null,
    category: 'absolute',
  };
}

function parseMeasurements(raw: unknown): AssetPackMeasurementsForSettlement | null {
  if (!isObject(raw)) return null;
  const relativesRaw = Array.isArray(raw.relatives) ? raw.relatives : null;
  if (!relativesRaw) return null;
  const relatives: RelativeRowInput[] = [];
  for (const row of relativesRaw) {
    const parsed = parseRelativeRow(row);
    if (parsed) relatives.push(parsed);
  }
  if (relatives.length === 0) return null;
  const absolutes: AbsoluteReadingForSettlement[] = [];
  if (Array.isArray(raw.absolutes)) {
    for (const row of raw.absolutes) {
      const parsed = parseAbsoluteRow(row);
      if (parsed) absolutes.push(parsed);
    }
  }
  return { relatives, absolutes };
}

function parsePatch(raw: unknown): SettleAssetPackPatch | null {
  if (!isObject(raw)) return null;
  const fileChanges = Array.isArray(raw.fileChanges)
    ? raw.fileChanges
        .filter((c): c is Record<string, unknown> => isObject(c) && typeof c.path === 'string')
        .map((c) => ({
          path: String(c.path),
          op: typeof c.op === 'string' ? c.op : 'modify',
          content: typeof c.content === 'string' ? c.content : null,
          language: typeof c.language === 'string' ? c.language : null,
        }))
    : undefined;
  return {
    patchSummary: typeof raw.patchSummary === 'string' ? raw.patchSummary : undefined,
    path: typeof raw.path === 'string' ? raw.path : undefined,
    format: typeof raw.format === 'string' ? raw.format : undefined,
    ...(fileChanges && fileChanges.length > 0 ? { fileChanges } : {}),
  };
}

/**
 * Parse one wire option into SettleAssetPackOption.
 * Requires measurements.relatives with at least one valid *-fit row.
 */
export function parseSettleAssetPackOption(raw: unknown): SettleAssetPackOption | null {
  if (!isObject(raw)) return null;
  const measurements = parseMeasurements(raw.measurements);
  if (!measurements) return null;
  return {
    id: typeof raw.id === 'string' ? raw.id : undefined,
    optionRoot: typeof raw.optionRoot === 'string' ? raw.optionRoot : undefined,
    measurementRoot: typeof raw.measurementRoot === 'string' ? raw.measurementRoot : undefined,
    title: typeof raw.title === 'string' ? raw.title : undefined,
    kind: typeof raw.kind === 'string' ? raw.kind : undefined,
    summary: typeof raw.summary === 'string' ? raw.summary : undefined,
    patch: parsePatch(raw.patch),
    measurements,
    confidence: typeof raw.confidence === 'number' ? raw.confidence : null,
    selectable: typeof raw.selectable === 'boolean' ? raw.selectable : undefined,
    settleable: typeof raw.settleable === 'boolean' ? raw.settleable : undefined,
  };
}

export function parseSettleAssetPackOptions(raw: unknown): SettleAssetPackOption[] {
  if (!Array.isArray(raw)) return [];
  const options: SettleAssetPackOption[] = [];
  for (const item of raw) {
    const parsed = parseSettleAssetPackOption(item);
    if (parsed) options.push(parsed);
  }
  return options;
}
