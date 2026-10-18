/**
 * Rich read source attribution (V49 settlement completion law S-1).
 *
 * After Implementation measures the read options, one model call attributes
 * each option to the admitted Depository DataPacks it derives from (ids from
 * the run's preloaded supply only, relative weights > 0). Output is validated
 * against the supply set; settle resolves sellers and normalizes weights.
 *
 * Fail-soft: no supply, real inference disabled, no registered model, or an
 * unusable response → no attributions (the option settles treasury-only).
 * Attribution never invents a seller.
 */

import { Prompt } from '@bitcode/prompts/prompt';
import type { PromptPart } from '@bitcode/prompts/parts/PromptPart';
import { isAssetPackRealInferenceEnabled } from '@bitcode/asset-packs-pipelines-syntheses-domain/runtime-inference-policy';

export interface ReadAttributionSupplyRow {
  depositoryAssetPackId: string;
  title: string;
  summary: string;
}

export interface ReadAttributionOption {
  title?: string;
  summary?: string;
  coveredSourcePaths?: string[];
  patch?: { patchSummary?: string } | null;
  commercialDescription?: string;
}

export type ReadOptionAttribution = Array<{ depositoryAssetPackId: string; weight: number; rationale: string }>;

const part = (content: string): PromptPart => content as PromptPart;

export function createReadSourceAttributionPrompt(): Prompt {
  const prompt = new Prompt();
  prompt.set(
    'attribution:1-identity',
    part(
      'You are read-source-attribution. For each synthesized read DataPack option, decide which admitted ' +
        'Depository DataPacks (supply) its knowledge derives from, and how much each contributed.',
    ),
  );
  prompt.set(
    'attribution:2-rules',
    part(
      [
        'Use ONLY depositoryAssetPackId values listed in supply. Never invent ids.',
        'weight is relative contribution (> 0) among the sources you list for that option.',
        'An option may have zero sources when it does not derive from supply.',
        'rationale: one short source-safe sentence (no code).',
        'Return ONLY JSON: {"attributions":[{"optionIndex":0,"sources":[{"depositoryAssetPackId":"...","weight":1,"rationale":"..."}]}]}',
      ].join('\n'),
    ),
  );
  prompt.requirePattern('attribution:*');
  return prompt;
}

function resolveConfiguredLLM(execution: any): ((input: any) => Promise<{ content: string }>) | undefined {
  for (const candidate of [execution, execution?.getRoot?.()]) {
    try {
      const llm = candidate?.llms?.getDefaultLLM?.();
      if (llm) return llm;
    } catch {
      /* next candidate */
    }
  }
  return undefined;
}

function parseAttributionResponse(content: string): unknown {
  const text = String(content ?? '').trim();
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  try {
    return JSON.parse(first >= 0 && last > first ? text.slice(first, last + 1) : text);
  } catch {
    return null;
  }
}

/** Validate a parsed response against the supply set (pure; exported for tests). */
export function validateReadSourceAttributions(
  raw: unknown,
  optionCount: number,
  supply: readonly ReadAttributionSupplyRow[],
): ReadOptionAttribution[] {
  const admitted = new Set(supply.map((row) => row.depositoryAssetPackId));
  const out: ReadOptionAttribution[] = Array.from({ length: optionCount }, () => []);
  const rows = Array.isArray((raw as { attributions?: unknown })?.attributions)
    ? ((raw as { attributions: unknown[] }).attributions as unknown[])
    : [];
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const index = Number((row as { optionIndex?: unknown }).optionIndex);
    if (!Number.isInteger(index) || index < 0 || index >= optionCount) continue;
    const sources = Array.isArray((row as { sources?: unknown }).sources) ? (row as { sources: unknown[] }).sources : [];
    for (const source of sources) {
      if (!source || typeof source !== 'object') continue;
      const id = String((source as { depositoryAssetPackId?: unknown }).depositoryAssetPackId ?? '').trim();
      const weight = Number((source as { weight?: unknown }).weight);
      if (!admitted.has(id) || !(weight > 0)) continue;
      out[index].push({
        depositoryAssetPackId: id,
        weight,
        rationale: String((source as { rationale?: unknown }).rationale ?? '').slice(0, 280),
      });
    }
  }
  return out;
}

export async function attributeReadOptionSources(input: {
  options: readonly ReadAttributionOption[];
  supply: readonly ReadAttributionSupplyRow[];
  evaluation: string;
  execution: any;
}): Promise<ReadOptionAttribution[]> {
  const empty = input.options.map((): ReadOptionAttribution => []);
  if (input.options.length === 0 || input.supply.length === 0 || !isAssetPackRealInferenceEnabled()) return empty;
  const llm = resolveConfiguredLLM(input.execution);
  if (!llm) return empty;
  try {
    const response = await llm({
      messages: [
        { role: 'system', content: createReadSourceAttributionPrompt().format() },
        {
          role: 'user',
          content: JSON.stringify({
            evaluation: input.evaluation,
            supply: input.supply.slice(0, 24),
            options: input.options.map((option, optionIndex) => ({
              optionIndex,
              title: option.title ?? '',
              summary: option.summary ?? '',
              patchSummary: option.patch?.patchSummary ?? '',
              coveredSourcePaths: (option.coveredSourcePaths ?? []).slice(0, 12),
              commercialDescription: option.commercialDescription ?? '',
            })),
          }),
        },
      ],
      config: { responseFormat: 'json', temperature: 0, maxTokens: 2_000 },
    });
    return validateReadSourceAttributions(parseAttributionResponse(response.content), input.options.length, input.supply);
  } catch {
    return empty;
  }
}
