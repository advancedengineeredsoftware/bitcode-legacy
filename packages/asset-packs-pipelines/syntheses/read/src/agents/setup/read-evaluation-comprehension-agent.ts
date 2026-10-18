/**
 * Read Setup: comprehend the reader's Evaluation (instruction) — deposit twin of
 * setup:comprehend-obfuscations.
 *
 * Produces structured Evaluation guidance + **dynamic relative measurement plan**
 * (kinds that MUST end with `-fit`, e.g. auth-refresh-fit).
 * Empty Evaluation skips LLM (fail later at danger-wall if required).
 */

import { factoryPTRRAgent } from '@bitcode/agent-generics';
import { Prompt } from '@bitcode/prompts/prompt';
import type { PromptPart } from '@bitcode/prompts/parts/PromptPart';
import { z } from 'zod';
import { storeCrossPhaseArtifact } from '@bitcode/asset-packs-pipelines-syntheses-domain/synthesize-asset-packs';
import { projectInventoryForPrompt } from '@bitcode/asset-packs-pipelines-syntheses-domain/asset-packs-synthesis';
import {
  planDynamicRelativesFromContext,
  type DynamicRelativePlanRow,
} from '../../read-relative-measurements';

const part = (content: string): PromptPart => content as PromptPart;

const DynamicRelativeRowSchema = z.object({
  measurementKind: z.string(),
  label: z.string().optional(),
  guidance: z.string().optional(),
  weight: z.number().optional(),
});

const EvaluationComprehensionSchema = z.object({
  summary: z.string(),
  evaluationTopics: z.array(z.string()).optional(),
  acceptanceCriteria: z.array(z.string()).optional(),
  /** Dynamic relative kinds to measure (each must end with -fit). */
  dynamicRelativeKinds: z.array(z.string()).optional(),
  /**
   * Preferred: full dynamic plan with human labels + guidance grounded in Evaluation
   * and (when available) codebase topics.
   */
  dynamicRelatives: z.array(DynamicRelativeRowSchema).optional(),
  honorNotes: z.array(z.string()).optional(),
});

const OutputSchema = z.object({
  comprehension: EvaluationComprehensionSchema,
});

export type ReadEvaluationComprehension = z.infer<typeof EvaluationComprehensionSchema>;

const IDENTITY = part(
  'You are the SynthesizeAssetPacks Setup agent that comprehends the reader EVALUATION. ' +
    'Map free-text Evaluation text against the Host sourceCheckoutCatalog (paths/samples only). ' +
    'Produce structured Evaluation guidance and a DYNAMIC relative measurement PLAN ' +
    '(kinds + human labels + guidance + relative weights) to run after synthesis. ' +
    'Every dynamic kind MUST end with the suffix "-fit" (e.g. session-refresh-fit). ' +
    'Labels are short product titles (e.g. "Session refresh fit"), not slugs. ' +
    'Never quote raw source or secrets.',
);

const REQUIREMENTS = part(
  'From the Evaluation text and sourceCheckoutCatalog, derive: summary, evaluationTopics, ' +
    'acceptanceCriteria, dynamicRelatives (3–8 objects: measurementKind ending -fit, ' +
    'label, guidance how to score pack vs Evaluation, weight), and honorNotes. ' +
    'You may also emit dynamicRelativeKinds as a fallback. Return ONLY {"comprehension": {...}}.',
);

const PLAN = part('Plan: parse the Evaluation into topics, criteria, and fit dimensions to measure.');
const TRY = part(
  'Try: map Evaluation ideas onto catalog-grounded topics and dynamic *-fit measurement kinds.',
);
const REFINE = part(
  'Refine: ensure every dynamicRelativeKinds entry ends with -fit and is source-safe.',
);
const RETRY = part('Retry: return minimal Evaluation guidance with at least one *-fit kind rather than fail.');

function createPrompt(): Prompt {
  const prompt = new Prompt();
  prompt.set('agent:identity', IDENTITY);
  prompt.set('agent:requirements', REQUIREMENTS);
  prompt.set('ptrr:plan', PLAN);
  prompt.set('ptrr:try', TRY);
  prompt.set('ptrr:refine', REFINE);
  prompt.set('ptrr:retry', RETRY);
  prompt.require('agent:identity');
  prompt.require('agent:requirements');
  prompt.requirePattern('ptrr:*');
  return prompt;
}

const prompt = createPrompt();

export const ReadEvaluationComprehensionAgent = factoryPTRRAgent<any, z.infer<typeof OutputSchema>>({
  name: 'ReadEvaluationComprehensionAgent',
  description: 'Comprehends reader Evaluation into guidance + dynamic *-fit relative plan.',
  outputSchema: OutputSchema,
  tools: [],
  prompt,
  stepPrompts: {
    plan: () => prompt,
    try: () => prompt,
    refine: () => prompt,
    retry: () => prompt,
  },
  plan: { chunkThreshold: 2000 },
  try: { chunkThreshold: 4000 },
  refine: { maxAttempts: 2 },
  retry: { maxAttempts: 1 },
});

function findValue(execution: any, namespace: string, key: string): any {
  const local = execution?.get?.(namespace, key);
  if (local !== undefined) return local;
  return execution?.findUp?.(namespace, key);
}

export type ReadEvaluationComprehensionEnriched = ReadEvaluationComprehension & {
  dynamicRelatives: DynamicRelativePlanRow[];
};

export default async function runReadEvaluationComprehensionAgent(input: any, execution: any) {
  const evaluationText =
    input?.evaluation ??
    input?.needs ??
    input?.instructions ??
    findValue(execution, 'read', 'evaluation') ??
    findValue(execution, 'deposit', 'obfuscations') ??
    '';
  const repository = input?.repository ?? findValue(execution, 'read', 'repository') ??
    findValue(execution, 'deposit', 'repository') ?? {};
  const catalog =
    input?.sourceCheckoutCatalog ??
    findValue(execution, 'read', 'sourceCheckoutCatalog') ??
    findValue(execution, 'deposit', 'sourceCheckoutCatalog');

  const text = typeof evaluationText === 'string' ? evaluationText.trim() : '';
  if (!text) {
    const empty: ReadEvaluationComprehensionEnriched = {
      summary: 'No Evaluation text declared; reader must provide an Evaluation to synthesize packs.',
      evaluationTopics: [],
      acceptanceCriteria: [],
      dynamicRelativeKinds: [],
      dynamicRelatives: [],
      honorNotes: [],
    };
    storeCrossPhaseArtifact(execution, 'setup', 'inputComprehension', empty);
    storeCrossPhaseArtifact(execution, 'setup', 'evaluationComprehension', empty);
    storeCrossPhaseArtifact(execution, 'read', 'evaluationComprehension', empty);
    return {
      ...(input || {}),
      success: true,
      comprehension: empty,
      comprehensionMode: 'empty-evaluation-skip-llm',
    };
  }

  const catalogForPrompt = projectInventoryForPrompt(catalog);
  const raw = await ReadEvaluationComprehensionAgent(
    {
      ...input,
      evaluation: text,
      repository,
      sourceCheckoutCatalog: catalogForPrompt,
      inventoryPaths: catalogForPrompt?.paths ?? catalog?.paths,
    },
    execution,
  );
  const result = (raw as any)?.finalOutput ?? (raw as any)?.output ?? raw;
  const base: ReadEvaluationComprehension = (result as any)?.comprehension ?? {
    summary: text.slice(0, 400),
    evaluationTopics: [],
    acceptanceCriteria: [],
    dynamicRelativeKinds: [],
    honorNotes: [],
  };

  // Prefer model dynamicRelatives; else kinds; ground labels from Evaluation + paths.
  const pathHints = Array.isArray(catalogForPrompt?.paths)
    ? (catalogForPrompt.paths as string[]).slice(0, 24)
    : Array.isArray(catalog?.paths)
      ? (catalog.paths as string[]).slice(0, 24)
      : [];
  const existing =
    Array.isArray(base.dynamicRelatives) && base.dynamicRelatives.length > 0
      ? base.dynamicRelatives
      : base.dynamicRelativeKinds || [];
  const dynamicRelatives = planDynamicRelativesFromContext({
    evaluationText: text,
    evaluationTopics: base.evaluationTopics,
    acceptanceCriteria: base.acceptanceCriteria,
    pathHints,
    existing: existing as Array<string | DynamicRelativePlanRow>,
  });

  const comprehension: ReadEvaluationComprehensionEnriched = {
    ...base,
    dynamicRelativeKinds: dynamicRelatives.map((d) => d.measurementKind),
    dynamicRelatives,
  };

  storeCrossPhaseArtifact(execution, 'setup', 'inputComprehension', comprehension);
  storeCrossPhaseArtifact(execution, 'setup', 'evaluationComprehension', comprehension);
  storeCrossPhaseArtifact(execution, 'read', 'evaluationComprehension', comprehension);
  storeCrossPhaseArtifact(execution, 'read', 'evaluation', text);

  return { ...(input || {}), success: true, comprehension };
}
