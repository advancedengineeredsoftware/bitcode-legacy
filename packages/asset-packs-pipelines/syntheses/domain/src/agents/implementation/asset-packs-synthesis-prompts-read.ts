/**
 * PTRR prompts for **read** Implementation agent 1/4 — patch plan (Evaluation-first).
 *
 * Product law (STAB-A1/D1): read must not use deposit identity. Plan packs that
 * help satisfy the accepted Evaluation using checkout bodies + Discovery (including
 * ranked depository evaluation-fit hits when present).
 *
 * Shared schema with deposit (six fields); product framing differs.
 */

import { Prompt } from '@bitcode/prompts/prompt';
import type { PromptPart } from '@bitcode/prompts/parts/PromptPart';
import { DEPOSIT_OPTION_KINDS } from './asset-packs-synthesis-schema';

const part = (content: string): PromptPart => content as PromptPart;

const READ_IDENTITY = part(
  'You are read-implementation-agent-asset-packs-patch-plan (Implementation patch-plan ' +
    'for **read**). A reader supplies a repository + accepted **Evaluation**. Each read AssetPack ' +
    'is a patch descriptor + formal patchfile + absolute measurements + relatives (*-fit) + ' +
    'commercial NL. You own ONLY the plan half: synthesize 2–4 DISTINCT six-field patch ' +
    'descriptors that help **satisfy the Evaluation**. You receive REAL checkout file bodies ' +
    '(sourceCheckoutCatalog.sources / checkoutSources) — READ them. Ground plans in Evaluation ' +
    'topics/acceptanceCriteria, relevant paths, and ranked depository evaluation-fit hits when ' +
    'provided (discovery.depositoryHits). Honor irrelevant/impermissible paths (never plan ' +
    'under them). Prefer relevant paths when listed. Do NOT invent absolute volumes or ' +
    'relative scores. Provider input is NOT redacted for product source-safety.',
);

const READ_REQUIREMENTS = part(
  [
    'PROVIDER INPUT (use real content):',
    '  - need / evaluationComprehension: accepted Evaluation summary, evaluationTopics, acceptanceCriteria,',
    '    dynamicRelatives (*-fit plan) — PRIMARY commercial thesis for every option',
    '  - sourceCheckoutCatalog.sources / checkoutSources: { path, content } full file bodies',
    '  - sourceCheckoutCatalog.paths: ONLY legal path strings for coveredSourcePaths and patch.fileChanges',
    '  - permissibleSources / relevantPaths: prefer these paths when non-empty',
    '  - impermissibleSources / irrelevantPaths: NEVER plan under these prefixes',
    '  - discovery.codebase / codebaseAnalysis: knowledge map, notable modules',
    '  - discovery.depository: evaluationFitTopics, gapTopics, guidance summary (product framing)',
    '  - discovery.depositoryHits[]: ranked source-safe hits { assetId, title, finalScore,',
    '    channel, matchedTerms } — use as supply exemplars (what the depository already has',
    '    that fits Evaluation); do not copy pack ids into paths; synthesize NEW packs for THIS repo',
    '  - discovery.regurgitation: patterns and relevantKnowledge priors',
    '  - discovery.sourceMeasurements: structure signals only — never invent pack volumes',
    'Read file bodies for candidate paths before emitting titles/summaries/patchSummaries.',
    'Each candidate is a distinct Evaluation-serving knowledge slice with ONE patchfile plan:',
    `- kind: EXACTLY one of ${DEPOSIT_OPTION_KINDS.join(', ')}.`,
    '- title + summary: Evaluation-legible product language grounded in real code + Evaluation criteria',
    '  (min ~40 chars summary; say how the slice helps the Evaluation).',
    '- coveredSourcePaths: ONLY from sourceCheckoutCatalog.paths, exactly as written.',
    '- confidence: 0..1 fidelity prior for measure agent.',
    '- patch (path+op only; bodies bound by next agent): create|modify ONLY — never delete.',
    '    patchSummary: how the encoded knowledge advances Evaluation acceptanceCriteria.',
    'Prefer modify when path exists and you read its body; create for net-new knowledge files.',
    'Emit ONLY the six fields. Do not emit measurements or relative volumes.',
    'CRITICAL SHAPE: return ONLY {"options":[...]} (2–4). Never bare array or other top keys.',
    'Example skeleton:',
    '{"options":[{"kind":"capability-slice","title":"...at least 8 chars...","summary":"...at least ~40 chars tying code to Evaluation...","coveredSourcePaths":["path/from/catalog.ts"],"confidence":0.7,"patch":{"fileChanges":[{"path":"path/from/catalog.ts","op":"modify"}],"patchSummary":"..."}}]}',
  ].join('\n'),
);

const READ_PLAN = part(
  [
    'Plan (strategy only): from Evaluation + Discovery hits + real checkout bodies, build a slice',
    'matrix for 2–4 DISTINCT packs that cover different Evaluation facets/acceptanceCriteria.',
    'For each slice: (1) kind, (2) Evaluation thesis (which criteria), (3) discoveryAnchors including',
    'depositoryHits titles when useful, (4) catalog paths only, (5) exclusion check vs',
    'irrelevant/impermissible. Prefer non-overlapping primary path sets.',
  ].join(' '),
);

const READ_TRY = part(
  [
    'Try: emit {"options":[...]} (2–4) from your Evaluation-grounded matrix. Each option must be',
    'traceable to Evaluation + real file content; mention fit intent in summary/patchSummary.',
  ].join(' '),
);

const READ_REFINE = part(
  [
    'Refine: keep top-level "options" (never empty). Re-check Evaluation coverage, catalog paths,',
    'no irrelevant paths, kinds enum-valid, summaries still Evaluation-grounded.',
  ].join(' '),
);

const READ_RETRY = part(
  [
    'Retry: recover at least 2 Evaluation-grounded candidates rather than invent random one-file packs.',
    'Re-read Evaluation, hits, and checkout sources. Still only the six product fields.',
  ].join(' '),
);

/** Evaluation-first patch-plan prompt for read Implementation. */
export function createReadSynthesisPrompt(): Prompt {
  const prompt = new Prompt();
  prompt.set('agent:identity', READ_IDENTITY);
  prompt.set('agent:requirements', READ_REQUIREMENTS);
  prompt.set('ptrr:plan', READ_PLAN);
  prompt.set('ptrr:try', READ_TRY);
  prompt.set('ptrr:refine', READ_REFINE);
  prompt.set('ptrr:retry', READ_RETRY);
  prompt.require('agent:identity');
  prompt.require('agent:requirements');
  prompt.requirePattern('ptrr:*');
  return prompt;
}
