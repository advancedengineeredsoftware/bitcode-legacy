/**
 * @jest-environment node
 *
 * Demonstration deposit options must survive the REAL deposit route session:
 * projected with bound patch bodies, and admissible to the Depository once
 * the depositor selects them (no settled-demand corpus, no criticality
 * signals — the posture a fresh demo seller has).
 */

import { validateDepositSynthesisOptions } from '@bitcode/asset-packs-pipelines-syntheses-domain/asset-packs-synthesis';
import { buildRealDepositAssetPackOptionSynthesis } from '@bitcode/asset-packs-pipelines-execution-pipeline-sdivf-synthesize-deposits-asset-packs/deposit-option-real-synthesis';
import { buildDemonstrationDepositRawOptions } from '@bitcode/asset-packs-pipelines-syntheses-domain/demonstration';
import { buildDepositRouteSession } from '@/components/deposits/models/deposit-route-model';

const REPOSITORY = 'advancedengineeredsoftware/Bitcode';
const CATALOG = ['README.md', 'apps/uapi/lib/http.ts', 'apps/uapi/app/api/webhooks/route.ts', 'packages/btd/src/journal.ts'];

function demonstrationSynthesis() {
  const validated = validateDepositSynthesisOptions(buildDemonstrationDepositRawOptions({ catalogPaths: CATALOG }), {
    lens: 'deposit',
    inventoryPaths: CATALOG,
    impermissibleSources: [],
    candidateKinds: ['capability-slice', 'implementation-pattern', 'proof-operations-slice'],
  });
  return buildRealDepositAssetPackOptionSynthesis(
    { repositoryFullName: REPOSITORY, sourceBranch: 'main', sourceCommit: '21d42c6', createdAt: '2026-10-13T00:00:00.000Z' },
    {
      lens: 'deposit',
      candidates: validated.candidates,
      droppedCandidateCount: validated.droppedCandidateCount,
      exclusionViolations: validated.exclusionViolations,
      inference: { provider: null, model: null, totalTokens: null, durationMs: 1 },
    },
    { paths: CATALOG, samples: [], totalPathCount: CATALOG.length, excludedPathCount: 0 },
  ).synthesis;
}

describe('demonstration deposit options in the real route session', () => {
  it('carry bound patch bodies (not a path-only surface)', () => {
    const synthesis = demonstrationSynthesis();
    for (const option of synthesis.options) {
      const changes = option.contents?.fileChanges ?? [];
      expect(changes.length).toBeGreaterThan(0);
      expect(changes.every((change: { content?: string }) => typeof change.content === 'string' && change.content.length > 0)).toBe(true);
      expect(option.contents?.unifiedDiff).toContain('diff --git');
    }
  });

  it('admits every selected demonstration option to the Depository', () => {
    const synthesis = demonstrationSynthesis();
    const session = buildDepositRouteSession({
      repositoryFullName: REPOSITORY,
      sourceBranch: 'main',
      sourceCommit: '21d42c6',
      precomputedOptionSynthesis: synthesis as never,
      optionsRequested: true,
      hasReviewedOption: true,
      optionReviewDecisions: synthesis.options.map((option) => ({
        optionId: option.optionId,
        decision: 'approved-for-admission' as const,
      })),
    } as never);
    const states = session.admission.receipts.map((receipt) => ({
      title: receipt.optionId,
      state: receipt.admission.state,
      blockers: receipt.admission.blockers,
    }));
    expect(states).toHaveLength(4);
    expect(states.filter((entry) => entry.state !== 'admitted-to-depository')).toEqual([]);
  });
});
