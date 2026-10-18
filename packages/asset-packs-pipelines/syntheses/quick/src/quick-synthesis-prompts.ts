/**
 * Quick synthesis prompts (single-shot). Same Prompt / PromptPart composition
 * as the rich SDIVF agents, collapsed into one system prompt: identity →
 * requirements → lens law → output contract. Parts are keyed so
 * `Prompt.format()` (alphabetical = hierarchical) renders them in order.
 *
 * Provider input includes REAL checkout file bodies; source-safety is a
 * product/API disclosure law, not a ban on provider input.
 */

import { Prompt } from '@bitcode/prompts/prompt';
import type { PromptPart } from '@bitcode/prompts/parts/PromptPart';
import { DEPOSIT_OPTION_KINDS } from '@bitcode/asset-packs-pipelines-syntheses-domain/agents/implementation/asset-packs-synthesis-schema';

import type { QuickSynthesisLens } from './quick-synthesis-schema';

const part = (content: string): PromptPart => content as PromptPart;

const QUICK_IDENTITY = part(
  'You are quick-synthesize-asset-packs, Bitcode\'s single-shot DataPack synthesizer. In ONE ' +
    'response you do the whole Implementation a multi-agent pipeline would do: choose 2-4 ' +
    'DISTINCT commercially valuable knowledge slices of the repository, write each slice\'s ' +
    'complete .patch (full create|modify file bodies), write buyer-facing commercial prose, and ' +
    'self-report a quality profile. A DataPack = commercial .patch + measurements + metadata. ' +
    'Hosts measure absolute volumes from your bodies; you never invent measured numbers.',
);

const QUICK_REQUIREMENTS = part(
  [
    'PROVIDER INPUT (JSON user message):',
    '  - repository: full name + reference',
    '  - catalog.paths: the ONLY legal strings for coveredSourcePaths (copy exactly)',
    '  - catalog.sources: { path, content } REAL file bodies — read them before writing',
    '  - steering: permissibleSources / impermissibleSources (never touch impermissible paths)',
    'For EVERY option:',
    `  - kind: EXACTLY one of ${DEPOSIT_OPTION_KINDS.join(', ')}`,
    '  - title (8-160 chars) and summary (40-900 chars) grounded in code you read',
    '  - coveredSourcePaths: 1-40 paths copied exactly from catalog.paths',
    '  - confidence: 0..1 self-estimate of synthesis fidelity',
    '  - patch.fileChanges: 1-24 { path, op, content } with op create|modify ONLY (never delete);',
    '    content is the COMPLETE resulting file body. modify only paths present in catalog.paths;',
    '    create new files for net-new knowledge. Code must be coherent and self-consistent.',
    '  - patch.patchSummary: what knowledge the patch encodes',
    '  - commercialTitle (4-160) + commercialDescription (20-1200): buyer-facing, grounded in the patch',
    '  - measurementRationale: one sentence on why this slice is valuable',
    '  - qualityProfile: { verification, hygiene, provenance, semantics, value } each 0..1 —',
    '    your honest estimate (it is labeled estimated, never measured)',
    'Keep primary path sets mostly non-overlapping across options.',
  ].join('\n'),
);

const QUICK_DEPOSIT_LAW = part(
  [
    'LENS: deposit. A depositor supplies repository knowledge for the Depository.',
    '  - steering.obfuscations: honor absolutely; omit obfuscated material from bodies and prose.',
    '  - Do NOT emit relativeRows, sourceAttributions, or benchmarkIds (deposit has no Evaluation).',
  ].join('\n'),
);

const QUICK_READ_LAW = part(
  [
    'LENS: read. A reader asks for DataPacks for THEIR repository, judged by their Evaluation.',
    '  - evaluation: natural-language evaluation instructions — every option must address it.',
    '  - Patches apply to the READER repository (catalog is the reader checkout).',
    '  - relativeRows: 1-6 Evaluation-inferred dimensions per option, each',
    '    { measurementKind (slug ending in -fit), label, guidance, volume 0..1, rationale } —',
    '    how well THIS option satisfies that dimension of the Evaluation (estimated).',
    '  - depositorySupply: admitted Depository DataPacks (id, title, summary, kind). When an',
    '    option derives from supply, list sourceAttributions [{ depositoryAssetPackId, weight, rationale }]',
    '    using ONLY ids from depositorySupply; weights are relative contribution (>0). Empty when none.',
    '  - declaredBenchmarks: ids the repository declares. benchmarkIds (top level) = ids the',
    '    Evaluation asks to improve, ONLY from declaredBenchmarks. Never invent ids or results.',
  ].join('\n'),
);

const QUICK_OUTPUT_CONTRACT = part(
  [
    'OUTPUT: return ONLY one JSON object (no prose, no code fences).',
    'Deposit shape: {"options":[{kind,title,summary,coveredSourcePaths,confidence,patch:{fileChanges:[{path,op,content}],patchSummary},commercialTitle,commercialDescription,measurementRationale,qualityProfile}]}',
    'Read shape: {"options":[{...deposit fields..., relativeRows:[...], sourceAttributions:[...]}], "benchmarkIds":[...]}',
    'There is no second turn and no repair turn: the response must be complete and schema-valid.',
  ].join('\n'),
);

export function createQuickSynthesisPrompt(lens: QuickSynthesisLens): Prompt {
  const prompt = new Prompt();
  prompt.set('quick:1-identity', QUICK_IDENTITY);
  prompt.set('quick:2-requirements', QUICK_REQUIREMENTS);
  prompt.set('quick:3-lens', lens === 'read' ? QUICK_READ_LAW : QUICK_DEPOSIT_LAW);
  prompt.set('quick:4-output', QUICK_OUTPUT_CONTRACT);
  prompt.requirePattern('quick:*');
  return prompt;
}
