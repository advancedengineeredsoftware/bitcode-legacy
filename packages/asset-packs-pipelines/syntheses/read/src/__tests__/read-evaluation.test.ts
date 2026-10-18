import {
  acceptReadEvaluation,
  admitReadFitsFinding,
  buildAssetPackSourceSafePreview,
  buildShareToFeePreview,
  isAcceptedReadEvaluation,
  readEvaluationToDepositorySearchRead,
  resolveAssetPackReadRightState,
  synthesizeReadEvaluationForPipelineInputWithInference,
  synthesizeReadEvaluationForPipelineInput,
} from '../read-evaluation';
import {
  buildDepositoryFitResultEvidence,
  runDepositorySearchForPipelineInput,
} from '@bitcode/asset-packs-pipelines-syntheses-domain/depository-search';

const input = {
  read: {
    id: 'read-1',
    prompt:
      'Find whether the deposited repository has a complete product path through Deposit, Read/Fit, AssetPack evidence, proof readback, and ledger reconciliation.',
  },
  sourceRevision: {
    repositoryFullName: 'octocat/Spoon-Knife',
    branch: 'main',
    commit: '31bbc0c5227b6b3aed5d107fd8507d35ec22970a',
  },
};

function depositoryAsset() {
  return {
    assetId: 'deposit-asset-1',
    title: 'Deposited repository revision octocat/Spoon-Knife',
    artifactKind: 'repository-revision',
    repositoryFullName: 'octocat/Spoon-Knife',
    sourceBranch: 'main',
    sourceCommit: '31bbc0c5227b6b3aed5d107fd8507d35ec22970a',
    contentRoot: 'sha256:content',
    contentUnits: [
      {
        unitId: 'deposit-asset-1:unit-1',
        unitKind: 'repository-revision',
        text:
          'product path Deposit Read Fit AssetPack evidence proof root finality readback Supabase ledger reconciliation.',
      },
    ],
    verificationEvidence: {
      proofRoot: 'sha256:proof',
      measurementRoot: 'sha256:measurement',
      reconciliationReadbackRoot: 'sha256:reconciliation',
    },
    hasWalletOrAttestationProof: true,
    hasAssetMeasurementEvidence: true,
  };
}

describe('Read-Evaluation synthesis and Finding Fits admission', () => {
  const originalRealInferenceFlag = process.env.BITCODE_ASSET_PACK_REAL_INFERENCE;

  afterEach(() => {
    if (originalRealInferenceFlag === undefined) {
      delete process.env.BITCODE_ASSET_PACK_REAL_INFERENCE;
    } else {
      process.env.BITCODE_ASSET_PACK_REAL_INFERENCE = originalRealInferenceFlag;
    }
  });

  it('synthesizes a measured Evaluation that remains pending until accepted', () => {
    const evaluation = synthesizeReadEvaluationForPipelineInput(input);

    expect(evaluation.schema).toBe('bitcode.read.need');
    expect(evaluation.evaluationId).toMatch(/^evaluation-[a-f0-9]{16}$/);
    expect(evaluation.reviewState).toBe('needs_acceptance');
    expect(evaluation.measurementRoot).toMatch(/^sha256:/);
    expect(evaluation.request).toMatchObject({
      schema: 'bitcode.read.request',
      requestId: 'read-1',
      prompt: input.read.prompt,
      repositoryFullName: 'octocat/Spoon-Knife',
      sourceBranch: 'main',
      sourceCommit: '31bbc0c5227b6b3aed5d107fd8507d35ec22970a',
      previousEvaluationId: null,
    });
    expect(evaluation.sourceConstraints).toMatchObject({
      repositoryFullName: 'octocat/Spoon-Knife',
      sourceBranch: 'main',
      sourceCommit: '31bbc0c5227b6b3aed5d107fd8507d35ec22970a',
      protectedSourceDisclosure: 'forbidden_before_settlement',
    });
    expect(evaluation.pricingMeasurementInputs.measurementVector).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ dimension: 'semantic_relevance' }),
        expect.objectContaining({ dimension: 'source_binding' }),
      ])
    );
    expect(evaluation.inferenceReceipt).toMatchObject({
      schema: 'bitcode.read-evaluation-comprehension-synthesis.inference-receipt',
      pipelineName: 'ReadEvaluationComprehensionSynthesis',
      evaluationId: evaluation.evaluationId,
      requestId: 'read-1',
      reviewState: 'needs_acceptance',
      mode: 'deterministic-fallback',
      sourceSafety: {
        protectedSourceVisible: false,
        rawProviderResponseVisible: false,
        unpaidAssetPackSourceVisible: false,
        credentialsSerialized: false,
      },
      reviewBoundary: {
        supportsResynthesisWithFeedback: true,
        acceptedEvaluationRequiredForFindingFits: true,
        feedbackHistoryCount: 0,
        previousEvaluationId: null,
      },
    });
    expect(evaluation.inferenceReceipt?.phaseIds).toEqual([
      'ReadEvaluationComprehensionSynthesis.request',
      'ReadEvaluationComprehensionSynthesis.comprehend',
      'ReadEvaluationComprehensionSynthesis.measure',
      'ReadEvaluationComprehensionSynthesis.review',
    ]);
    expect(evaluation.inferenceReceipt?.agentIds).toHaveLength(4);
    expect(evaluation.inferenceReceipt?.ptrrStepIds).toHaveLength(16);
    expect(evaluation.inferenceReceipt?.failsafeSequenceIds).toHaveLength(48);
    expect(evaluation.inferenceReceipt?.thinkingsGenerationIds).toHaveLength(48);
    expect(evaluation.inferenceReceipt?.promptTemplateIds).toEqual(
      expect.arrayContaining([
        'ReadEvaluationComprehensionSynthesis.prompt.comprehend.evaluation-synthesizer.agent',
        'ReadEvaluationComprehensionSynthesis.prompt.evaluation-synthesis',
      ])
    );
    expect(evaluation.inferenceReceipt?.roots.receiptRoot).toMatch(/^sha256:/);
  });

  it('carries Read Request lineage and feedback through resynthesis', () => {
    const first = synthesizeReadEvaluationForPipelineInput({
      ...input,
      feedback: ['Keep proof roots prominent.'],
    });
    const second = synthesizeReadEvaluationForPipelineInput({
      ...input,
      previousReadEvaluation: first,
      feedback: ['Exclude settlement completion from Evaluation comprehension.'],
    });

    expect(second.evaluationId).not.toBe(first.evaluationId);
    expect(second.request.previousEvaluationId).toBe(first.evaluationId);
    expect(second.feedbackHistory).toEqual([
      'Keep proof roots prominent.',
      'Exclude settlement completion from Evaluation comprehension.',
    ]);
    expect(second.request.feedbackHistory).toEqual(second.feedbackHistory);
    expect(second.reviewState).toBe('needs_acceptance');
    expect(second.inferenceReceipt?.reviewBoundary).toMatchObject({
      feedbackHistoryCount: 2,
      previousEvaluationId: first.evaluationId,
    });
  });

  it('accepts an Evaluation as the only admissible input to strict Finding Fits search', () => {
    const accepted = acceptReadEvaluation(synthesizeReadEvaluationForPipelineInput(input), '2026-05-18T00:00:00.000Z');

    expect(isAcceptedReadEvaluation(accepted)).toBe(true);
    expect(accepted.inferenceReceipt).toMatchObject({
      pipelineName: 'ReadEvaluationComprehensionSynthesis',
      reviewState: 'accepted',
      mode: 'deterministic-fallback',
      reviewBoundary: {
        acceptedEvaluationRequiredForFindingFits: true,
      },
    });
    expect(admitReadFitsFinding({ acceptedReadEvaluation: accepted, requireAcceptedReadEvaluation: true })).toMatchObject({
      admitted: true,
      acceptedEvaluation: accepted,
      blockers: [],
    });
    expect(readEvaluationToDepositorySearchRead(accepted)).toMatchObject({
      id: accepted.evaluationId,
      prompt: accepted.read.prompt,
      sourceCommit: '31bbc0c5227b6b3aed5d107fd8507d35ec22970a',
    });
  });

  it('runs real-inference ReadEvaluationComprehension through one ThinkingsGeneration contract when enabled', async () => {
    process.env.BITCODE_ASSET_PACK_REAL_INFERENCE = '1';
    const llm = jest
      .fn()
      .mockResolvedValueOnce({
        content: JSON.stringify({
          analysis: 'The reader needs a source-bound product readiness AssetPack.',
          steps: ['read request', 'bound source revision', 'extract closure criteria'],
          conclusion: 'Synthesize a narrow Evaluation for product readiness evidence.',
          confidence: 0.91,
        }),
      })
      .mockResolvedValueOnce({
        content: JSON.stringify({
          quality: 0.88,
          issues: [],
          suggestions: ['Keep protected source withheld before settlement.'],
          approved: true,
        }),
      })
      .mockResolvedValueOnce({
        content: JSON.stringify({
          requirements: [
            'Find source-bound evidence for the Deposit and Reading path.',
            'Keep the Evaluation constrained to the selected repository revision.',
          ],
          closureCriteria: [
            'Finding Fits discovery must return source-bound fit deposit ids.',
            'AssetPack preview must expose only measurements and non-source metadata before settlement.',
          ],
          failureModes: ['protected_source_disclosed_before_settlement'],
          targetArtifactKinds: ['asset-pack-evidence', 'proof-root'],
          proofExpectations: ['ThinkingsGeneration telemetry contains reasoning, judgment, and typed output.'],
        }),
      });
    const execution = fakeInferenceExecution(llm);

    const evaluation = await synthesizeReadEvaluationForPipelineInputWithInference(input, execution);

    expect(llm).toHaveBeenCalledTimes(3);
    expect(evaluation.requirements).toContain('Find source-bound evidence for the Deposit and Reading path.');
    expect(evaluation.closureCriteria).toContain('Finding Fits discovery must return source-bound fit deposit ids.');
    expect(evaluation.failureModes).toContain('protected_source_disclosed_before_settlement');
    expect(evaluation.targetArtifactKinds).toEqual(['asset-pack-evidence', 'proof-root']);
    expect(evaluation.proofExpectations).toContain(
      'ThinkingsGeneration telemetry contains reasoning, judgment, and typed output.'
    );
    expect(evaluation.reviewState).toBe('needs_acceptance');
    expect(evaluation.inferenceReceipt).toMatchObject({
      pipelineName: 'ReadEvaluationComprehensionSynthesis',
      mode: 'real-inference',
      evaluationId: evaluation.evaluationId,
      reviewState: 'needs_acceptance',
    });
    expect(execution.store).toHaveBeenCalledWith('bounded-inference', 'mode', 'thinkings-generation');
    expect(execution.store).toHaveBeenCalledWith(
      'bounded-inference',
      'stack',
      expect.objectContaining({
        failsafeSequence: ['prepare-concise-context', 'chunk-then-sum', 'stitch-until-complete'],
        thinkingsGenerationStages: ['reason', 'judge', 'structured_output'],
      })
    );
    expect(execution.store).toHaveBeenCalledWith('bounded-inference', 'status', 'success');
    expect(execution.store).toHaveBeenCalledWith(
      'read-evaluation-comprehension',
      'inferenceReceipt',
      expect.objectContaining({
        pipelineName: 'ReadEvaluationComprehensionSynthesis',
        mode: 'real-inference',
        ptrrStepIds: expect.arrayContaining([
          'ReadEvaluationComprehensionSynthesis.comprehend.evaluation-synthesizer.try',
        ]),
      })
    );
    expect(execution.store).toHaveBeenCalledWith(
      'llm',
      'input',
      expect.objectContaining({
        failsafeSequence: ['prepare-concise-context', 'chunk-then-sum', 'stitch-until-complete'],
        generationSequence: ['reason', 'judge', 'structured_output'],
      })
    );
  });

  it('blocks strict Finding Fits search before Evaluation acceptance', async () => {
    const result = await runDepositorySearchForPipelineInput({
      ...input,
      requireAcceptedReadEvaluation: true,
      depositoryAssets: [depositoryAsset()],
    });

    expect(result.resultState).toBe('blocked_readiness');
    expect(result.resultReasons).toEqual(
      expect.arrayContaining([
        'Finding Fits search requires an accepted Read-Evaluation before depository discovery.',
        'accepted_read_evaluation_missing',
      ])
    );
    expect(result.candidateRanking).toHaveLength(0);
  });

  it('uses the accepted Evaluation measurement and source constraints for Finding Fits', async () => {
    const acceptedReadEvaluation = acceptReadEvaluation(
      synthesizeReadEvaluationForPipelineInput(input),
      '2026-05-18T00:00:00.000Z'
    );

    const result = await runDepositorySearchForPipelineInput({
      ...input,
      acceptedReadEvaluation,
      requireAcceptedReadEvaluation: true,
      depositoryAssets: [depositoryAsset()],
    });

    expect(result.resultState).toBe('worthy_fit');
    expect(result.read.id).toBe(acceptedReadEvaluation.evaluationId);
    expect(result.read.sourceCommit).toBe(acceptedReadEvaluation.sourceConstraints.sourceCommit);
    expect(result.selectedCandidateAssetIds).toEqual(['deposit-asset-1']);
  });

  it('derives a source-safe Share-to-Fee preview from accepted Evaluation measurements', () => {
    const acceptedReadEvaluation = acceptReadEvaluation(synthesizeReadEvaluationForPipelineInput(input));
    const preview = buildShareToFeePreview({
      evaluation: acceptedReadEvaluation,
      admittedFitQuality: 0.75,
    });

    expect(preview).toMatchObject({
      formula: 'sum(measurement.weight * measurement.volume * admitted_fit_quality)',
      evaluationId: acceptedReadEvaluation.evaluationId,
      evaluationMeasurementRoot: acceptedReadEvaluation.measurementRoot,
      finalityState: 'preview_not_paid',
      payer: 'reader',
    });
    expect(preview.feeSchedule).toMatchObject({
      satsPerWeightedVolume: 1000,
      minimumSats: 546,
      dustFloorSats: 546,
      networkFeePosture: 'reader_wallet_authorized_before_broadcast',
    });
    expect(preview.measurementVector).toBe(acceptedReadEvaluation.pricingMeasurementInputs.measurementVector);
    expect(preview.quoteRoot).toMatch(/^sha256:/);
    expect(preview.sats).toBeGreaterThanOrEqual(546);
  });

  it('builds a source-safe AssetPack preview without unlocking protected source', async () => {
    const acceptedReadEvaluation = acceptReadEvaluation(
      synthesizeReadEvaluationForPipelineInput(input),
      '2026-05-18T00:00:00.000Z'
    );
    const search = await runDepositorySearchForPipelineInput({
      ...input,
      acceptedReadEvaluation,
      requireAcceptedReadEvaluation: true,
      depositoryAssets: [depositoryAsset()],
    });
    const fitResult = buildDepositoryFitResultEvidence(search);
    const preview = buildAssetPackSourceSafePreview({
      evaluation: acceptedReadEvaluation,
      fitResult,
      rangeStart: 42,
      pullRequestTarget: 'https://github.com/octocat/Spoon-Knife/pull/6',
      createdAt: '2026-05-18T00:00:00.000Z',
    });

    expect(preview).toMatchObject({
      schema: 'bitcode.asset-pack.source-safe-preview',
      evaluation: {
        evaluationId: acceptedReadEvaluation.evaluationId,
        measurementRoot: acceptedReadEvaluation.measurementRoot,
        reviewState: 'accepted',
      },
      fit: {
        resultState: 'worthy_fit',
        selectedCandidateAssetIds: ['deposit-asset-1'],
      },
      disclosurePolicy: {
        protectedSourceDisclosure: 'forbidden_before_settlement',
      },
      settlementBoundary: {
        payer: 'reader',
        payee: 'depositor',
        serverCustody: false,
        ownershipTruth: 'asset_pack_range_and_license_rows',
      },
      unlock: {
        state: 'pending_settlement',
        sourceAvailable: false,
      },
      delivery: {
        pullRequestTarget: 'https://github.com/octocat/Spoon-Knife/pull/6',
        availableAfterSettlement: true,
      },
    });
    expect(preview.roots.previewRoot).toMatch(/^sha256:/);
    expect(preview.roots.sourceManifestRoot).toMatch(/^sha256:/);
    expect(preview.feeQuote.quoteRoot).toMatch(/^sha256:/);
    expect(preview.rangeProjection).toMatchObject({
      status: 'projected_not_minted',
      rangeStart: 42,
    });
    expect(preview.rangeProjection.rangeEndExclusive).toBe(
      preview.rangeProjection.rangeStart! + preview.rangeProjection.tokenCount
    );
    expect(preview.disclosurePolicy.withheldBeforeSettlement).toContain('protected source content');
  });

  it('keeps owner, licensed, pending-settlement, and denied read rights distinct', () => {
    expect(resolveAssetPackReadRightState({ hasOwnerClaim: true })).toBe('owner_read');
    expect(resolveAssetPackReadRightState({
      hasReadLicense: true,
      settlementReadbackComplete: true,
    })).toBe('licensed_read');
    expect(resolveAssetPackReadRightState({ settlementPending: true })).toBe('pending_settlement');
    expect(resolveAssetPackReadRightState({ policyDenied: true })).toBe('denied');
  });
});

function fakeInferenceExecution(llm: jest.Mock) {
  const values = new Map<string, unknown>();
  let execution: any;
  execution = {
    child: jest.fn(() => execution),
    getRoot: jest.fn(() => execution),
    store: jest.fn((namespace: string, key: string, value: unknown) => {
      values.set(`${namespace}:${key}`, value);
    }),
    get: jest.fn((namespace: string, key: string) => values.get(`${namespace}:${key}`)),
    findUp: jest.fn((namespace: string, key: string) => values.get(`${namespace}:${key}`)),
    llms: {
      getDefaultLLM: jest.fn(() => llm),
    },
  };
  return execution;
}
