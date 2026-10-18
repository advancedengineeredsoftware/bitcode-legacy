/**
 * Read relatives measurement law helpers.
 *
 * All relative measurement kinds are "fits" and MUST be suffixed `-fit`
 * (e.g. language-fit, domain-fit, session-refresh-fit).
 *
 * Hybrid:
 *   - Static catalogue (language-fit, domain-fit, interface-fit)
 *   - Dynamic plan from Evaluation + codebase (kinds, labels, guidance, weights)
 *   - evaluation-fit composite = weighted mean of all relatives (not a raw row target)
 *
 * Weight law: static catalog weights + dynamic weights are re-normalized so the
 * full set sums to 1 before evaluation-fit.
 *
 * When BITCODE_ASSET_PACK_REAL_INFERENCE is on, volumes may come from
 * RelativesMeasureAgent; otherwise deterministic proxies (still real numbers).
 */

import {
  ASSET_PACK_RELATIVES_CATALOG,
  computeEvaluationFitVolume,
  EVALUATION_FIT_COMPOSITE_KIND,
  factoryRelativesMeasureAgent,
  type AssetPackRelativeSpec,
} from '@bitcode/generic-measurements-relatives';
import type { MeasurementSpec } from '@bitcode/measurement-generics';
import { isAssetPackRealInferenceEnabled } from '@bitcode/asset-packs-pipelines-syntheses-domain/runtime-inference-policy';

export { ASSET_PACK_RELATIVES_CATALOG, computeEvaluationFitVolume, EVALUATION_FIT_COMPOSITE_KIND };

const FIT_SUFFIX = '-fit';

/** Force a kind string into *-fit form (lowercase slug). */
export function slugifyRelativeKind(raw: string): string {
  const base = String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  if (!base) return 'unspecified-fit';
  if (base.endsWith(FIT_SUFFIX)) return base;
  if (base.endsWith('fit')) {
    return base.endsWith(FIT_SUFFIX)
      ? base
      : `${base.replace(/fit$/, '')}fit`.replace(/-+/g, '-');
  }
  return `${base}${FIT_SUFFIX}`;
}

export function assertRelativeKindSuffix(kind: string): boolean {
  return typeof kind === 'string' && kind.endsWith(FIT_SUFFIX) && kind.length > FIT_SUFFIX.length;
}

/** Human label from a *-fit kind (title case words). */
export function humanizeRelativeLabel(kind: string): string {
  const stem = String(kind || '')
    .replace(/-fit$/i, '')
    .replace(/[-_]+/g, ' ')
    .trim();
  if (!stem) return 'Evaluation fit';
  return stem
    .split(/\s+/)
    .map((w) => (w.length ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(' ');
}

/**
 * Dynamic relative plan row — produced from Evaluation + codebase comprehension.
 * Labels/guidance are first-class (not slug-derived only).
 */
export type DynamicRelativePlanRow = {
  measurementKind: string;
  label: string;
  guidance: string;
  /** Relative weight among dynamic rows; re-normalized with static catalog. */
  weight: number;
};

export type RelativeReading = {
  measurementKind: string;
  label: string;
  weight: number;
  volume: number;
  magnitude: number;
  unit: string;
  category: 'relative';
  propertyClass?: 'static-catalog' | 'dynamic-inferred';
  rationale?: string;
};

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * Normalize dynamic plan rows or bare kind strings into DynamicRelativePlanRow[].
 */
export function normalizeDynamicRelativePlan(
  raw:
    | Array<string | DynamicRelativePlanRow | Record<string, unknown>>
    | string[]
    | null
    | undefined,
  evaluationSummary?: string | null,
): DynamicRelativePlanRow[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const out: DynamicRelativePlanRow[] = [];
  const seen = new Set<string>();
  for (const entry of raw) {
    if (typeof entry === 'string') {
      const kind = slugifyRelativeKind(entry);
      if (!assertRelativeKindSuffix(kind) || seen.has(kind)) continue;
      seen.add(kind);
      out.push({
        measurementKind: kind,
        label: humanizeRelativeLabel(kind),
        guidance: `How well the AssetPack fits the Evaluation facet “${humanizeRelativeLabel(kind)}”${
          evaluationSummary ? ` (${evaluationSummary.slice(0, 120)})` : ''
        }.`,
        weight: 1,
      });
      continue;
    }
    if (!entry || typeof entry !== 'object') continue;
    const rec = entry as Record<string, unknown>;
    const kindRaw =
      typeof rec.measurementKind === 'string'
        ? rec.measurementKind
        : typeof rec.kind === 'string'
          ? rec.kind
          : '';
    const kind = slugifyRelativeKind(kindRaw);
    if (!assertRelativeKindSuffix(kind) || seen.has(kind)) continue;
    seen.add(kind);
    const label =
      typeof rec.label === 'string' && rec.label.trim()
        ? rec.label.trim().slice(0, 80)
        : humanizeRelativeLabel(kind);
    const guidance =
      typeof rec.guidance === 'string' && rec.guidance.trim()
        ? rec.guidance.trim().slice(0, 400)
        : `How well the AssetPack fits “${label}” relative to the reader Evaluation.`;
    const weight =
      typeof rec.weight === 'number' && Number.isFinite(rec.weight) && rec.weight > 0
        ? rec.weight
        : 1;
    out.push({ measurementKind: kind, label, guidance, weight });
  }
  return out.slice(0, 8);
}

/**
 * Ground dynamic plan from Evaluation text + optional codebase topics/paths.
 * Used when Setup LLM returns only kinds (or empty) so labels still quality.
 */
export function planDynamicRelativesFromContext(input: {
  evaluationText?: string | null;
  evaluationTopics?: string[] | null;
  acceptanceCriteria?: string[] | null;
  codebaseTopics?: string[] | null;
  pathHints?: string[] | null;
  existing?: Array<string | DynamicRelativePlanRow> | null;
}): DynamicRelativePlanRow[] {
  const fromExisting = normalizeDynamicRelativePlan(input.existing, input.evaluationText);
  if (fromExisting.length >= 3) return fromExisting;

  const seeds: string[] = [];
  for (const t of input.evaluationTopics || []) {
    if (typeof t === 'string' && t.trim()) seeds.push(t.trim());
  }
  for (const c of input.acceptanceCriteria || []) {
    if (typeof c === 'string' && c.trim()) seeds.push(c.trim().slice(0, 48));
  }
  for (const t of input.codebaseTopics || []) {
    if (typeof t === 'string' && t.trim()) seeds.push(`codebase ${t.trim()}`.slice(0, 48));
  }
  // Path basenames as weak hints only.
  for (const p of input.pathHints || []) {
    if (typeof p !== 'string') continue;
    const base = p.split('/').pop()?.replace(/\.[^.]+$/, '') || '';
    if (base.length > 3 && base.length < 32) seeds.push(base);
  }
  if (input.evaluationText && seeds.length < 3) {
    const words = String(input.evaluationText)
      .split(/\W+/)
      .filter((w) => w.length > 4)
      .slice(0, 6);
    seeds.push(...words);
  }

  const planned: DynamicRelativePlanRow[] = [...fromExisting];
  const seen = new Set(planned.map((r) => r.measurementKind));
  for (const seed of seeds) {
    if (planned.length >= 6) break;
    const kind = slugifyRelativeKind(
      seed.toLowerCase().includes('fit') ? seed : `needs-${seed}`,
    );
    if (seen.has(kind) || ASSET_PACK_RELATIVES_CATALOG.some((c) => c.measurementKind === kind)) {
      continue;
    }
    seen.add(kind);
    const label = humanizeRelativeLabel(kind);
    planned.push({
      measurementKind: kind,
      label,
      guidance: `Score how well the pack’s material satisfies “${label}” for Evaluation: ${
        (input.evaluationText || '').slice(0, 160) || 'stated reader Evaluation'
      }.`,
      weight: 1,
    });
  }
  if (planned.length === 0 && input.evaluationText) {
    const kind = slugifyRelativeKind(input.evaluationText.slice(0, 40) || 'evaluation');
    planned.push({
      measurementKind: kind,
      label: humanizeRelativeLabel(kind),
      guidance: `Overall fit of the AssetPack to the Evaluation: ${(input.evaluationText || '').slice(0, 160)}.`,
      weight: 1,
    });
  }
  return planned.slice(0, 8);
}

type SpecBuild = {
  specs: MeasurementSpec[];
  weightByKind: Map<string, number>;
  labelByKind: Map<string, string>;
  classByKind: Map<string, 'static-catalog' | 'dynamic-inferred'>;
};

/**
 * Build measurement specs with static + dynamic rows.
 * Re-normalize all weights to sum to 1 (static mass 0.6, dynamic mass 0.4 when both present).
 */
function buildSpecs(
  catalog: AssetPackRelativeSpec[],
  dynamic: DynamicRelativePlanRow[],
): SpecBuild {
  const weightByKind = new Map<string, number>();
  const labelByKind = new Map<string, string>();
  const classByKind = new Map<string, 'static-catalog' | 'dynamic-inferred'>();
  const specs: MeasurementSpec[] = [];

  const staticRows: Array<{ kind: string; weight: number; label: string; guidance: string; unit: string }> =
    [];
  for (const spec of catalog) {
    const kind = assertRelativeKindSuffix(spec.measurementKind)
      ? spec.measurementKind
      : slugifyRelativeKind(spec.measurementKind);
    staticRows.push({
      kind,
      weight: spec.weight > 0 ? spec.weight : 1,
      label: spec.label,
      guidance: spec.guidance,
      unit: spec.unit,
    });
  }

  const dynamicRows = dynamic.filter(
    (d) =>
      assertRelativeKindSuffix(d.measurementKind) &&
      !staticRows.some((s) => s.kind === d.measurementKind),
  );

  const staticMass = dynamicRows.length > 0 ? 0.6 : 1;
  const dynamicMass = dynamicRows.length > 0 ? 0.4 : 0;
  const staticSum = staticRows.reduce((s, r) => s + r.weight, 0) || 1;
  const dynamicSum = dynamicRows.reduce((s, r) => s + (r.weight > 0 ? r.weight : 1), 0) || 1;

  for (const row of staticRows) {
    const w = (row.weight / staticSum) * staticMass;
    weightByKind.set(row.kind, w);
    labelByKind.set(row.kind, row.label);
    classByKind.set(row.kind, 'static-catalog');
    specs.push({
      measurementKind: row.kind,
      label: row.label,
      unit: row.unit as MeasurementSpec['unit'],
      guidance: row.guidance,
      hasMagnitude: true,
    });
  }
  for (const row of dynamicRows) {
    const rawW = row.weight > 0 ? row.weight : 1;
    const w = (rawW / dynamicSum) * dynamicMass;
    weightByKind.set(row.measurementKind, w);
    labelByKind.set(row.measurementKind, row.label);
    classByKind.set(row.measurementKind, 'dynamic-inferred');
    specs.push({
      measurementKind: row.measurementKind,
      label: row.label,
      unit: 'estimate',
      guidance: row.guidance,
      hasMagnitude: true,
    });
  }

  return { specs, weightByKind, labelByKind, classByKind };
}

function resolveDynamicPlan(input: {
  dynamicKinds?: string[];
  dynamicRelatives?: Array<string | DynamicRelativePlanRow> | null;
  evaluationSummary?: string;
  /** When Evaluation is present but plan empty, re-ground from Evaluation + path hints (STAB-B2). */
  pathHints?: string[] | null;
  evaluationTopics?: string[] | null;
  acceptanceCriteria?: string[] | null;
}): DynamicRelativePlanRow[] {
  if (Array.isArray(input.dynamicRelatives) && input.dynamicRelatives.length > 0) {
    return normalizeDynamicRelativePlan(input.dynamicRelatives, input.evaluationSummary);
  }
  const fromKinds = normalizeDynamicRelativePlan(input.dynamicKinds || [], input.evaluationSummary);
  if (fromKinds.length > 0) return fromKinds;
  // STAB-B2: Evaluation present ⇒ non-empty dynamic plan (static catalog alone is not enough).
  if (input.evaluationSummary && String(input.evaluationSummary).trim()) {
    return planDynamicRelativesFromContext({
      evaluationText: input.evaluationSummary,
      evaluationTopics: input.evaluationTopics,
      acceptanceCriteria: input.acceptanceCriteria,
      pathHints: input.pathHints,
    });
  }
  return [];
}

/** Tokenize for pack↔Evaluation lexical grounding (source-safe strings only). */
function tokenizePackMaterial(text: string): Set<string> {
  const out = new Set<string>();
  for (const w of String(text || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)) {
    if (w.length > 2) out.add(w);
  }
  return out;
}

/**
 * Lexical overlap of Evaluation tokens with pack material (title/summary/patch/paths).
 * STAB-B2: deterministic fit must weight pack content, not title-only hash wobble.
 */
export function packEvaluationMaterialOverlap(input: {
  evaluationSummary?: string | null;
  title?: string | null;
  summary?: string | null;
  patchSummary?: string | null;
  coveredSourcePaths?: string[] | null;
  commercialDescription?: string | null;
}): number {
  const evaluationTokens = tokenizePackMaterial(input.evaluationSummary || '');
  if (evaluationTokens.size === 0) return 0.35;
  const packText = [
    input.title || '',
    input.summary || '',
    input.patchSummary || '',
    input.commercialDescription || '',
    ...(Array.isArray(input.coveredSourcePaths) ? input.coveredSourcePaths : []),
  ].join(' ');
  const packTokens = tokenizePackMaterial(packText);
  if (packTokens.size === 0) return 0.15;
  let hits = 0;
  for (const t of evaluationTokens) {
    if (packTokens.has(t)) hits += 1;
  }
  return clamp01(hits / Math.max(1, evaluationTokens.size));
}

/** Deterministic relative volumes (proxy when agent unavailable). */
export function measureReadRelativesDeterministic(input: {
  title: string;
  summary: string;
  confidence?: number;
  evaluationSummary?: string;
  /** @deprecated Prefer dynamicRelatives with labels. */
  dynamicKinds?: string[];
  dynamicRelatives?: Array<string | DynamicRelativePlanRow> | null;
  catalog?: AssetPackRelativeSpec[];
  /** Pack material for STAB-B2 grounding (not title/summary alone). */
  patchSummary?: string | null;
  coveredSourcePaths?: string[] | null;
  commercialDescription?: string | null;
  evaluationTopics?: string[] | null;
  acceptanceCriteria?: string[] | null;
}): RelativeReading[] {
  const catalog = input.catalog ?? ASSET_PACK_RELATIVES_CATALOG;
  const confidence = clamp01(input.confidence ?? 0.65);
  const materialOverlap = packEvaluationMaterialOverlap({
    evaluationSummary: input.evaluationSummary,
    title: input.title,
    summary: input.summary,
    patchSummary: input.patchSummary,
    coveredSourcePaths: input.coveredSourcePaths,
    commercialDescription: input.commercialDescription,
  });
  const seed = [
    input.title,
    input.summary,
    input.patchSummary || '',
    (input.coveredSourcePaths || []).slice(0, 12).join(','),
    input.evaluationSummary || '',
  ].join('|');
  const dynamic = resolveDynamicPlan({
    dynamicKinds: input.dynamicKinds,
    dynamicRelatives: input.dynamicRelatives,
    evaluationSummary: input.evaluationSummary,
    pathHints: input.coveredSourcePaths,
    evaluationTopics: input.evaluationTopics,
    acceptanceCriteria: input.acceptanceCriteria,
  });
  const { specs, weightByKind, labelByKind, classByKind } = buildSpecs(catalog, dynamic);

  return specs.map((spec, index) => {
    const wobble = ((hash(seed + spec.measurementKind) % 16) - 8) / 100;
    // Blend: confidence (prior) + pack↔Evaluation material overlap (primary) + small wobble.
    const volume = clamp01(
      confidence * 0.35 + materialOverlap * 0.55 + 0.08 + wobble + index * 0.005,
    );
    return {
      measurementKind: spec.measurementKind,
      label: labelByKind.get(spec.measurementKind) || spec.label,
      weight: weightByKind.get(spec.measurementKind) ?? 0,
      volume,
      magnitude: volume,
      unit: String(spec.unit),
      category: 'relative' as const,
      propertyClass: classByKind.get(spec.measurementKind),
      rationale: `Evaluation-relative ${spec.measurementKind} (deterministic; pack material overlap=${materialOverlap.toFixed(2)}).`,
    };
  });
}

/**
 * Prefer RelativesMeasureAgent when real inference is enabled; always fall back
 * to deterministic proxies so synthesis never invents volumes without a path.
 */
export async function measureReadRelatives(input: {
  title: string;
  summary: string;
  confidence?: number;
  evaluationSummary?: string;
  dynamicKinds?: string[];
  dynamicRelatives?: Array<string | DynamicRelativePlanRow> | null;
  catalog?: AssetPackRelativeSpec[];
  execution?: any;
  patchSummary?: string | null;
  coveredSourcePaths?: string[] | null;
  commercialDescription?: string | null;
  evaluationTopics?: string[] | null;
  acceptanceCriteria?: string[] | null;
}): Promise<RelativeReading[]> {
  const deterministic = measureReadRelativesDeterministic(input);
  if (!isAssetPackRealInferenceEnabled()) return deterministic;

  try {
    const catalog = input.catalog ?? ASSET_PACK_RELATIVES_CATALOG;
    const dynamic = resolveDynamicPlan(input);
    const { specs, weightByKind, labelByKind } = buildSpecs(catalog, dynamic);
    if (specs.length === 0) return deterministic;

    const agent = factoryRelativesMeasureAgent({
      name: 'SynthesizeReadAssetPacksRelativesMeasureAgent',
      subject: 'a synthesized source-safe AssetPack under a reader Evaluation',
      measurements: specs,
    });

    const raw = await agent(
      {
        artifact: {
          title: input.title,
          summary: input.summary,
          confidence: input.confidence,
          // Pack material for grounded fit (STAB-B2) — source-safe fields only.
          patchSummary: input.patchSummary || null,
          coveredSourcePaths: Array.isArray(input.coveredSourcePaths)
            ? input.coveredSourcePaths.slice(0, 24)
            : [],
          commercialDescription: input.commercialDescription || null,
        },
        evaluation: {
          summary: input.evaluationSummary || '',
          topics: input.evaluationTopics || [],
          acceptanceCriteria: input.acceptanceCriteria || [],
        },
        measurementsRequested: specs.map((s) => s.measurementKind),
      },
      input.execution,
    );
    const result = (raw as any)?.finalOutput ?? (raw as any)?.output ?? raw;
    const readings = Array.isArray(result?.measurements) ? result.measurements : [];
    if (readings.length === 0) return deterministic;

    const byKind = new Map<string, { volume?: number; magnitude?: number; rationale?: string }>();
    for (const r of readings) {
      if (r && typeof r.measurementKind === 'string') {
        byKind.set(r.measurementKind, r);
      }
    }

    return deterministic.map((row) => {
      const hit = byKind.get(row.measurementKind);
      if (!hit || typeof hit.volume !== 'number' || !Number.isFinite(hit.volume)) return row;
      const volume = clamp01(hit.volume);
      const magnitude =
        typeof hit.magnitude === 'number' && Number.isFinite(hit.magnitude)
          ? hit.magnitude
          : volume;
      return {
        ...row,
        volume,
        magnitude,
        weight: weightByKind.get(row.measurementKind) ?? row.weight,
        label: labelByKind.get(row.measurementKind) || row.label,
        rationale:
          typeof hit.rationale === 'string' && hit.rationale.length > 0
            ? hit.rationale
            : row.rationale,
      };
    });
  } catch {
    return deterministic;
  }
}
