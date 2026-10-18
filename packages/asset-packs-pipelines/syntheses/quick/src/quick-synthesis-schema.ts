/**
 * Quick synthesis output schema (V49 quick synthesis law Q-4).
 *
 * One model call returns the whole candidate set: the rich patch-plan fields,
 * full create|modify file bodies (the rich patchfile agent's job), commercial
 * NL (the rich commercial-nl agent's job), and a quality profile that becomes
 * `estimated` absolutes. Read adds Evaluation-inferred `-fit` rows, source
 * attributions over admitted Depository supply, and referenced benchmark ids.
 *
 * Models never emit absolute volumes, material identity, or benchmark results.
 */

import { z } from 'zod';
import { DEPOSIT_OPTION_KINDS } from '@bitcode/asset-packs-pipelines-syntheses-domain/agents/implementation/asset-packs-synthesis-schema';

export type QuickSynthesisLens = 'deposit' | 'read';

const unit = z.coerce.number().min(0).max(1);

function coerceKind(raw: unknown): (typeof DEPOSIT_OPTION_KINDS)[number] {
  const value = String(raw ?? '').trim();
  if ((DEPOSIT_OPTION_KINDS as readonly string[]).includes(value)) {
    return value as (typeof DEPOSIT_OPTION_KINDS)[number];
  }
  const lower = value.toLowerCase();
  if (lower.includes('proof') || lower.includes('test') || lower.includes('ops')) return 'proof-operations-slice';
  if (lower.includes('pattern') || lower.includes('implement')) return 'implementation-pattern';
  return 'capability-slice';
}

export const quickPatchFileSchema = z.object({
  path: z.string().min(1),
  // Commercial DataPack .patch: create|modify only — no deletions.
  op: z.enum(['create', 'modify']),
  /** Full resulting file body (not a diff hunk). */
  content: z.string().min(1),
});

export const quickQualityProfileSchema = z.object({
  verification: unit,
  hygiene: unit,
  provenance: unit,
  semantics: unit,
  value: unit,
});

export const quickRelativeRowSchema = z.object({
  measurementKind: z.string().min(1),
  label: z.string().min(1),
  guidance: z.string().default(''),
  volume: unit,
  rationale: z.string().default(''),
});

export const quickSourceAttributionSchema = z.object({
  depositoryAssetPackId: z.string().min(1),
  weight: z.coerce.number().positive(),
  rationale: z.string().default(''),
});

const quickOptionBaseSchema = z.object({
  kind: z.preprocess(coerceKind, z.enum(DEPOSIT_OPTION_KINDS)),
  title: z.string().min(8).max(160),
  summary: z.string().min(40).max(900),
  coveredSourcePaths: z.array(z.string().min(1)).min(1).max(40),
  confidence: unit,
  patch: z.object({
    fileChanges: z.array(quickPatchFileSchema).min(1).max(24),
    patchSummary: z.string().min(1),
  }),
  commercialTitle: z.string().min(4).max(160),
  commercialDescription: z.string().min(20).max(1200),
  measurementRationale: z.string().default(''),
  qualityProfile: quickQualityProfileSchema,
});

export const quickDepositOptionSchema = quickOptionBaseSchema;

export const quickReadOptionSchema = quickOptionBaseSchema.extend({
  relativeRows: z.array(quickRelativeRowSchema).max(6).default([]),
  sourceAttributions: z.array(quickSourceAttributionSchema).max(8).default([]),
});

export const quickDepositOutputSchema = z.object({
  options: z.array(quickDepositOptionSchema).min(1).max(4),
});

export const quickReadOutputSchema = z.object({
  options: z.array(quickReadOptionSchema).min(1).max(4),
  benchmarkIds: z.array(z.string().min(1)).max(12).default([]),
});

export type QuickDepositOption = z.infer<typeof quickDepositOptionSchema>;
export type QuickReadOption = z.infer<typeof quickReadOptionSchema>;
export type QuickDepositOutput = z.infer<typeof quickDepositOutputSchema>;
export type QuickReadOutput = z.infer<typeof quickReadOutputSchema>;
export type QuickSynthesisOutput = QuickDepositOutput | QuickReadOutput;

export class QuickSynthesisError extends Error {
  readonly code = 'quick_synthesis_failed';
  constructor(message: string) {
    super(message);
    this.name = 'QuickSynthesisError';
  }
}

/**
 * Parse the single response. One local JSON repair is permitted (strip fences,
 * take the outermost object, accept a bare options array); never a second call.
 */
export function parseQuickSynthesisResponse(content: string): unknown {
  const text = String(content ?? '').trim();
  const attempts = [text];
  const fenced = /```(?:json)?\s*([\s\S]*?)```/u.exec(text);
  if (fenced) attempts.push(fenced[1].trim());
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first >= 0 && last > first) attempts.push(text.slice(first, last + 1));
  for (const attempt of attempts) {
    try {
      const parsed = JSON.parse(attempt);
      if (Array.isArray(parsed)) return { options: parsed };
      if (parsed && typeof parsed === 'object') {
        const obj = parsed as Record<string, unknown>;
        if (!Array.isArray(obj.options)) {
          for (const key of ['assetPacks', 'candidates', 'packs', 'dataPacks']) {
            if (Array.isArray(obj[key])) return { ...obj, options: obj[key] };
          }
        }
        return obj;
      }
    } catch {
      /* next repair attempt */
    }
  }
  throw new QuickSynthesisError('Quick synthesis response is not valid JSON.');
}

export function validateQuickSynthesisOutput(lens: 'deposit', raw: unknown): QuickDepositOutput;
export function validateQuickSynthesisOutput(lens: 'read', raw: unknown): QuickReadOutput;
export function validateQuickSynthesisOutput(lens: QuickSynthesisLens, raw: unknown): QuickSynthesisOutput {
  const schema = lens === 'read' ? quickReadOutputSchema : quickDepositOutputSchema;
  const result = schema.safeParse(raw);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new QuickSynthesisError(
      `Quick synthesis output failed schema at ${issue?.path.join('.') || '(root)'}: ${issue?.message || 'invalid'}.`,
    );
  }
  return result.data;
}
