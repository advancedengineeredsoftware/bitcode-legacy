import {
  acceptReadEvaluation,
  rejectReadEvaluation,
  synthesizeReadEvaluationForPipelineInput,
} from '../read-evaluation';
import {
  buildReadEvaluationReviewResynthesisRuntime,
  persistReadEvaluationReviewResynthesisRuntime,
  summarizeReadEvaluationReviewResynthesisRuntime,
} from '../read-evaluation-review-resynthesis';

const input = {
  read: {
    id: 'read-1',
    prompt: 'Find Reading proof evidence without leaking protected source.',
  },
  sourceRevision: {
    repositoryFullName: 'octocat/Spoon-Knife',
    branch: 'main',
    commit: '31bbc0c5227b6b3aed5d107fd8507d35ec22970a',
  },
};

describe('ReadEvaluation review, resynthesis, and admission runtime', () => {
  it('persists a source-safe synthesized Evaluation review loop before Finding Fits admission', () => {
    const readEvaluation = synthesizeReadEvaluationForPipelineInput(input);
    const runtime = buildReadEvaluationReviewResynthesisRuntime({
      action: 'synthesize_read_evaluation',
      readEvaluation,
    });

    expect(runtime).toMatchObject({
      schema: 'bitcode.read-evaluation-review-resynthesis-runtime',
      pipelineName: 'ReadEvaluationComprehensionSynthesis',
      nextPipelineName: 'ReadFitsFindingSynthesis',
      action: 'synthesize_read_evaluation',
      requestId: 'read-1',
      currentEvaluationId: readEvaluation.evaluationId,
      reviewState: 'needs_acceptance',
      findingFitsAdmission: {
        admitted: false,
        blockers: ['accepted_read_evaluation_missing'],
      },
      reviewLoop: {
        readRequestPersisted: true,
        synthesizedEvaluationPersisted: true,
        feedbackHistoryPersisted: true,
        resynthesisAttemptPersisted: false,
        evaluationMeasurementPersisted: true,
        acceptedEvaluationAdmissionPersisted: false,
        rejectedEvaluationPosturePersisted: false,
        findingFitsBlockedUntilAcceptedEvaluation: true,
      },
      sourceSafety: {
        sourceSafetyClass: 'source_safe_read_evaluation_review_resynthesis_metadata',
        protectedSourceVisible: false,
        rawProviderResponseVisible: false,
        unpaidAssetPackSourceVisible: false,
        credentialsSerialized: false,
      },
    });
    expect(runtime.storageProjection.map((record) => record.recordKind)).toEqual([
      'read_request',
      'synthesized_evaluation',
      'feedback',
      'evaluation_measurement',
      'telemetry_receipt',
    ]);
    expect(runtime.storageProjection.every((record) => record.sourceSafety.protectedSourceVisible === false)).toBe(true);
    expect(runtime.storageProjection.every((record) => record.sourceSafety.rawProviderResponseVisible === false)).toBe(true);
    expect(runtime.storageProjection.every((record) => record.sourceSafety.unpaidAssetPackSourceVisible === false)).toBe(true);
    expect(runtime.telemetryReceipts[0]).toMatchObject({
      pipelineName: 'ReadEvaluationComprehensionSynthesis',
      evaluationId: readEvaluation.evaluationId,
      reviewState: 'needs_acceptance',
    });
    expect(runtime.telemetryReceipts[0].ptrrStepIds).toHaveLength(16);
    expect(runtime.telemetryReceipts[0].thinkingsGenerationIds).toHaveLength(48);
    expect(runtime.proofRoots.runtimeRoot).toMatch(/^sha256:/);
    expect(runtime.nextProtocolAction).toMatch(/accept the synthesized Read-Evaluation/i);
  });

  it('records feedback and previous Evaluation lineage for resynthesis attempts', () => {
    const first = synthesizeReadEvaluationForPipelineInput({
      ...input,
      feedback: ['Prefer source-safe proof language.'],
    });
    const second = synthesizeReadEvaluationForPipelineInput({
      ...input,
      previousReadEvaluation: first,
      feedback: ['Narrow to product proof readback.'],
    });
    const runtime = buildReadEvaluationReviewResynthesisRuntime({
      action: 'resynthesize_read_evaluation',
      readEvaluation: second,
      previousReadEvaluation: first,
    });

    expect(runtime.previousEvaluationId).toBe(first.evaluationId);
    expect(runtime.reviewLoop.resynthesisAttemptPersisted).toBe(true);
    expect(runtime.storageProjection.map((record) => record.recordKind)).toContain('resynthesis_attempt');
    expect(
      runtime.storageProjection.find((record) => record.recordKind === 'feedback')?.payload,
    ).toMatchObject({
      feedbackHistory: [
        'Prefer source-safe proof language.',
        'Narrow to product proof readback.',
      ],
      feedbackCount: 2,
    });
  });

  it('admits Finding Fits only after Evaluation acceptance and stores admission posture', () => {
    const accepted = acceptReadEvaluation(
      synthesizeReadEvaluationForPipelineInput(input),
      '2026-05-25T00:00:00.000Z',
    );
    const runtime = buildReadEvaluationReviewResynthesisRuntime({
      action: 'accept_read_evaluation',
      readEvaluation: accepted,
    });

    expect(runtime.findingFitsAdmission).toMatchObject({
      admitted: true,
      blockers: [],
    });
    expect(runtime.reviewLoop.acceptedEvaluationAdmissionPersisted).toBe(true);
    expect(runtime.storageProjection.map((record) => record.recordKind)).toContain('accepted_evaluation_admission');
    expect(runtime.nextProtocolAction).toBe('Run Finding Fits with the accepted Read-Evaluation.');
  });

  it('stores rejected Evaluation posture and keeps Finding Fits blocked', () => {
    const rejected = rejectReadEvaluation(
      synthesizeReadEvaluationForPipelineInput(input),
      ['Evaluation over-claims settlement finality.'],
      '2026-05-25T00:00:00.000Z',
    );
    const runtime = buildReadEvaluationReviewResynthesisRuntime({
      action: 'reject_read_evaluation',
      readEvaluation: rejected,
    });

    expect(runtime.reviewState).toBe('rejected');
    expect(runtime.findingFitsAdmission).toMatchObject({
      admitted: false,
      blockers: ['read_evaluation_rejected', 'accepted_read_evaluation_missing'],
    });
    expect(runtime.reviewLoop.rejectedEvaluationPosturePersisted).toBe(true);
    expect(runtime.storageProjection.map((record) => record.recordKind)).toContain('rejected_evaluation_posture');
    expect(runtime.nextProtocolAction).toMatch(/resynthesize/i);
  });

  it('persists runtime projections into ExecutionPipeline-compatible storage', () => {
    const runtime = buildReadEvaluationReviewResynthesisRuntime({
      action: 'synthesize_read_evaluation',
      readEvaluation: synthesizeReadEvaluationForPipelineInput(input),
    });
    const store = jest.fn();

    persistReadEvaluationReviewResynthesisRuntime({ store }, runtime);

    expect(store).toHaveBeenCalledWith('read-evaluation-review', 'runtime', runtime);
    expect(store).toHaveBeenCalledWith('read-evaluation-review', 'runtimeRoot', runtime.proofRoots.runtimeRoot);
    expect(store).toHaveBeenCalledWith('read-evaluation-review', 'findingFitsAdmission', runtime.findingFitsAdmission);
    expect(store).toHaveBeenCalledWith('read/evaluation', 'request', expect.any(Object));
    expect(store).toHaveBeenCalledWith('read/evaluation', 'current', expect.any(Object));
  });

  it('summarizes runtime for source-safe route and telemetry payloads', () => {
    const runtime = buildReadEvaluationReviewResynthesisRuntime({
      action: 'synthesize_read_evaluation',
      readEvaluation: synthesizeReadEvaluationForPipelineInput(input),
    });

    expect(summarizeReadEvaluationReviewResynthesisRuntime(runtime)).toMatchObject({
      schema: 'bitcode.read-evaluation-review-resynthesis-runtime',
      pipelineName: 'ReadEvaluationComprehensionSynthesis',
      nextPipelineName: 'ReadFitsFindingSynthesis',
      storageRecordCount: 5,
      telemetryReceiptCount: 1,
      findingFitsAdmitted: false,
      pipelineContract: {
        pipelineName: 'ReadEvaluationComprehensionSynthesis',
        phaseCount: 4,
        ptrrStepCount: 16,
        thinkingsGenerationCount: 48,
      },
    });
  });
});
