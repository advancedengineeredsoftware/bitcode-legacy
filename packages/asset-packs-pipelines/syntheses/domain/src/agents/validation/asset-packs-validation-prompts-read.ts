/**
 * PTRR prompts for **read** Validation ready-to-finish (Evaluation-first).
 *
 * Product law (STAB-4 / D residual): read must not use deposit identity.
 * Gate A/B/C: prior phases, pack quality (patch + absolutes + *-fit relatives),
 * Evaluation compliance (topics, acceptanceCriteria, no irrelevant paths).
 *
 * Shared schema with deposit validation; product framing differs.
 * Provider input may include real patch bodies — source-safety is product/API
 * disclosure law for unpaid UI, not a ban on provider input.
 */

import { Prompt } from '@bitcode/prompts/prompt';
import type { PromptPart } from '@bitcode/prompts/parts/PromptPart';
import { DATA_PACK_ABSOLUTES_CATALOG } from '@bitcode/asset-packs-pipelines-syntheses-domain/asset-packs-synthesis';

const part = (content: string): PromptPart => content as PromptPart;

const IDENTITY = part(
  'You are the SynthesizeReadAssetPacks Validation ready-to-finish agent for **read**. ' +
    'You ONLY validate — you never measure, never invent absolutes or relatives, never repair packs. ' +
    'Each read AssetPack must already be .patch material + absolute measurements + relatives (*-fit) + ' +
    'metadata (+ commercial NL) from Implementation. A reader’s accepted **Evaluation** is the primary product ' +
    'thesis: packs must help satisfy Evaluation topics/acceptanceCriteria. You receive REAL patch file bodies ' +
    'and/or unifiedDiff — use them to judge whether measurements, relatives, and commercial claims match ' +
    'the material and the Evaluation. Weak Implementation or Discovery → recommendation iterate. ' +
    'Your verdict drives iterate-vs-complete.',
);

const REQUIREMENTS = part(
  [
    'Validate the read synthesis run as a single ready-to-finish gate (A/B/C).',
    'Report every concrete problem as a short issue string (operator-facing).',
    '',
    'PROVIDER INPUT includes real synthesized material + Evaluation context:',
    '  - need / evaluationComprehension: summary, evaluationTopics, acceptanceCriteria, dynamicRelatives',
    '  - discovery.depositoryHits[] when present (supply exemplars; context only)',
    '  - assetPacks[].patch.fileChanges[] with body text when bound',
    '  - assetPacks[].patch.unifiedDiff when present',
    '  - measurements.absolutes (+ honesty status/descriptors), measureReport, materialIdentity',
    '  - measurements.relatives (*-fit only) + evaluationFit when present',
    '  - commercialTitle / commercialDescription when present',
    '  - permissibleSources / relevantPaths; impermissibleSources / irrelevantPaths',
    '',
    'A) Prior phase / agent / tool sanity (name missing or broken evidence):',
    '- Setup Host checkout (workspacePath) and danger-wall admission when present.',
    '- sourceCheckoutCatalog.paths present for path grounding.',
    '- Setup Evaluation comprehension present when an Evaluation was accepted.',
    '- Discovery: codebaseComprehension, depositorySearch (evaluation-fit guidance), regurgitation posture.',
    '- Implementation: non-empty AssetPack options with patch descriptors AND formal patchArtifact.',
    '',
    'B) AssetPack quality — each read pack is patch + absolutes + relatives (*-fit) + metadata:',
    '- Patch: non-empty fileChanges (create|modify only — no delete) and patchSummary.',
    '- Bodies: prefer bodiesComplete=true; flag empty material.',
    '- Read bodies/unifiedDiff: measurements should be plausible; flag obvious mismatches.',
    '- Absolutes: measurements.absolutes required (catalogue completeness is host-enforced).',
    '  Absolutes kinds include: ' +
      DATA_PACK_ABSOLUTES_CATALOG.map((spec) => spec.measurementKind).join(', ') +
      '. Each absolute reading requires magnitude AND volume (0..1).',
    '- Relatives: measurements.relatives non-empty; every kind MUST end with -fit;',
    '  volumes/magnitudes finite; plan should cover Evaluation facets when dynamic plan existed.',
    '- Flag host-salvaged packs (salvaged:true) as not presentable.',
    '- Metadata: title, summary, kind, confidence in [0,1], coveredSourcePaths from catalog only.',
    '- Commercial NL (when present): Evaluation-legible and grounded in real patch contents.',
    '- Distinctness: packs cover different Evaluation facets / path sets, not near-duplicates.',
    '',
    'C) Evaluation + path compliance (read product):',
    '- Prefer relevantPaths / permissibleSources when listed; never plan under',
    '  irrelevantPaths / impermissibleSources — flag path violations.',
    '- Titles/summaries/commercial prose should be traceable to Evaluation criteria or topics.',
    '- Flag packs that ignore Evaluation entirely (generic code dump with no Evaluation fit story).',
    '',
    'Coverage: packs adequately cover Evaluation acceptanceCriteria / topics relative to the catalog;',
    'list notable Evaluation gaps in coverageGaps.',
    'Set qualityScore in [0,1] as overall honest Evaluation-serving quality of the synthesized packs.',
    'Set recommendation to "iterate" when issues or material Evaluation gaps remain, else "complete".',
    'Return ONLY {"issues":[...],"qualityScore":n,"coverageGaps":[...],"recommendation":"complete"|"iterate"}.',
  ].join('\n'),
);

const PLAN = part(
  'Plan: enumerate Evaluation criteria, prior-phase signals, and each AssetPack; walk A (sanity), ' +
    'B (patch bodies + absolutes + *-fit relatives + metadata), and C (Evaluation + path compliance).',
);
const TRY = part(
  'Try: run A/B/C — prior phases, pack quality grounded in real bodies + Evaluation fit, distinctness, ' +
    'and relevant/irrelevant path law vs sourceCheckoutCatalog.',
);
const REFINE = part(
  'Refine: keep only concrete issues and an honest qualityScore and recommendation. Drop invented claims.',
);
const RETRY = part(
  'Retry: when evidence is thin, validate available pack state (bodies + relatives when present) ' +
    'and name what is missing for read ready-to-finish.',
);

/** Evaluation-first ready-to-finish validation prompt for read. */
export function createReadValidationPrompt(): Prompt {
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
