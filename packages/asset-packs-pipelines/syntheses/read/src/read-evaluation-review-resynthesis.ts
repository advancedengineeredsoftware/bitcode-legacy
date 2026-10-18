import { createHash } from 'node:crypto';
import {
  READ_FITS_FINDING_SYNTHESIS,
  READ_EVALUATION_COMPREHENSION_SYNTHESIS,
  READ_EVALUATION_COMPREHENSION_SYNTHESIS_CONTRACT,
  listReadingPipelineTelemetryTrace,
  summarizeReadingPipelineContract,
} from './reading-pipeline-contract';
import {
  admitReadFitsFinding,
  isAcceptedReadEvaluation,
  type ReadFitsFindingAdmission,
  type ReadEvaluation,
  type ReadEvaluationComprehensionSynthesisInferenceReceipt,
  type ReadEvaluationReviewState,
} from './read-evaluation';

export type ReadEvaluationReviewResynthesisAction =
  | 'synthesize_read_evaluation'
  | 'resynthesize_read_evaluation'
  | 'accept_read_evaluation'
  | 'reject_read_evaluation';

export type ReadEvaluationReviewStorageRecordKind =
  | 'read_request'
  | 'synthesized_evaluation'
  | 'feedback'
  | 'resynthesis_attempt'
  | 'evaluation_measurement'
  | 'accepted_evaluation_admission'
  | 'rejected_evaluation_posture'
  | 'telemetry_receipt';

export interface ReadEvaluationReviewStorageRecord {
  schema: 'bitcode.read-evaluation-review.storage-record';
  recordId: string;
  recordKind: ReadEvaluationReviewStorageRecordKind;
  pipelineName: typeof READ_EVALUATION_COMPREHENSION_SYNTHESIS;
  namespace: string;
  key: string;
  root: string;
  sourceSafety: ReadEvaluationReviewSourceSafety;
  payload: Record<string, unknown>;
}

export interface ReadEvaluationReviewTelemetryReceipt {
  schema: 'bitcode.read-evaluation-review.telemetry-receipt';
  receiptId: string;
  pipelineName: typeof READ_EVALUATION_COMPREHENSION_SYNTHESIS;
  action: ReadEvaluationReviewResynthesisAction;
  evaluationId: string;
  requestId: string;
  reviewState: ReadEvaluationReviewState;
  phaseIds: string[];
  agentIds: string[];
  ptrrStepIds: string[];
  failsafeSequenceIds: string[];
  thinkingsGenerationIds: string[];
  promptTemplateIds: string[];
  outputSchemaIds: string[];
  root: string;
}

export interface ReadEvaluationReviewSourceSafety {
  sourceSafetyClass: 'source_safe_read_evaluation_review_resynthesis_metadata';
  protectedSourceVisible: false;
  rawProtectedPromptVisible: false;
  rawProviderResponseVisible: false;
  unpaidAssetPackSourceVisible: false;
  walletPrivateMaterialVisible: false;
  settlementPrivatePayloadVisible: false;
  credentialsSerialized: false;
}

export interface ReadEvaluationReviewResynthesisRuntime {
  schema: 'bitcode.read-evaluation-review-resynthesis-runtime';
  runtimeId: string;
  pipelineName: typeof READ_EVALUATION_COMPREHENSION_SYNTHESIS;
  nextPipelineName: typeof READ_FITS_FINDING_SYNTHESIS;
  action: ReadEvaluationReviewResynthesisAction;
  requestId: string;
  currentEvaluationId: string;
  previousEvaluationId: string | null;
  reviewState: ReadEvaluationReviewState;
  findingFitsAdmission: ReadFitsFindingAdmission;
  reviewLoop: {
    readRequestPersisted: true;
    synthesizedEvaluationPersisted: true;
    feedbackHistoryPersisted: true;
    resynthesisAttemptPersisted: boolean;
    evaluationMeasurementPersisted: true;
    acceptedEvaluationAdmissionPersisted: boolean;
    rejectedEvaluationPosturePersisted: boolean;
    findingFitsBlockedUntilAcceptedEvaluation: true;
  };
  storageProjection: ReadEvaluationReviewStorageRecord[];
  telemetryReceipts: ReadEvaluationReviewTelemetryReceipt[];
  sourceSafety: ReadEvaluationReviewSourceSafety;
  proofRoots: {
    runtimeRoot: string;
    storageRoot: string;
    telemetryRoot: string;
    measurementRoot: string;
    readRequestRoot: string;
  };
  nextProtocolAction: string;
}

const SOURCE_SAFETY: ReadEvaluationReviewSourceSafety = {
  sourceSafetyClass: 'source_safe_read_evaluation_review_resynthesis_metadata',
  protectedSourceVisible: false,
  rawProtectedPromptVisible: false,
  rawProviderResponseVisible: false,
  unpaidAssetPackSourceVisible: false,
  walletPrivateMaterialVisible: false,
  settlementPrivatePayloadVisible: false,
  credentialsSerialized: false,
};

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((entry) => stableStringify(entry)).join(',')}]`;
  return `{${Object.keys(value as Record<string, unknown>)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`)
    .join(',')}}`;
}

function rootOf(value: unknown): string {
  return `sha256:${sha256(stableStringify(value))}`;
}

function recordId(kind: ReadEvaluationReviewStorageRecordKind, evaluationId: string, key: string): string {
  return `read-evaluation-${kind}-${sha256(`${evaluationId}:${key}`).slice(0, 16)}`;
}

function storageRecord(
  evaluation: ReadEvaluation,
  recordKind: ReadEvaluationReviewStorageRecordKind,
  namespace: string,
  key: string,
  payload: Record<string, unknown>,
): ReadEvaluationReviewStorageRecord {
  const root = rootOf({
    recordKind,
    namespace,
    key,
    payload,
  });
  return {
    schema: 'bitcode.read-evaluation-review.storage-record',
    recordId: recordId(recordKind, evaluation.evaluationId, `${namespace}:${key}:${root}`),
    recordKind,
    pipelineName: READ_EVALUATION_COMPREHENSION_SYNTHESIS,
    namespace,
    key,
    root,
    sourceSafety: SOURCE_SAFETY,
    payload,
  };
}

function telemetryReceipt(
  action: ReadEvaluationReviewResynthesisAction,
  evaluation: ReadEvaluation,
): ReadEvaluationReviewTelemetryReceipt {
  const trace = listReadingPipelineTelemetryTrace(READ_EVALUATION_COMPREHENSION_SYNTHESIS_CONTRACT);
  const receipt = evaluation.inferenceReceipt;
  const phaseIds = receipt?.phaseIds || READ_EVALUATION_COMPREHENSION_SYNTHESIS_CONTRACT.phases.map((phase) => phase.phaseId);
  const agentIds = receipt?.agentIds || READ_EVALUATION_COMPREHENSION_SYNTHESIS_CONTRACT.phases.flatMap((phase) => phase.agents.map((agent) => agent.agentId));
  const ptrrStepIds = receipt?.ptrrStepIds || trace.map((entry) => entry.ptrrStepId);
  const failsafeSequenceIds = receipt?.failsafeSequenceIds || trace.flatMap((entry) =>
    entry.thinkingsGenerations.map((generation) => `${entry.ptrrStepId}.${generation.failsafe}`)
  );
  const thinkingsGenerationIds = receipt?.thinkingsGenerationIds || trace.flatMap((entry) => entry.thinkingsGenerationIds);
  const promptTemplateIds = receipt?.promptTemplateIds || READ_EVALUATION_COMPREHENSION_SYNTHESIS_CONTRACT.phases.flatMap((phase) =>
    phase.agents.flatMap((agent) => [
      agent.promptRegistry.agentPromptId,
      ...Object.values(agent.promptRegistry.ptrrStepPromptIds),
      ...agent.ptrrSteps.flatMap((step) => step.prompt?.templateId ? [step.prompt.templateId] : []),
    ])
  );
  const outputSchemaIds = receipt?.outputSchemaIds || [
    ...new Set(trace.map((entry) => entry.outputType)),
  ];
  const root = rootOf({
    action,
    evaluationId: evaluation.evaluationId,
    requestId: evaluation.request.requestId,
    reviewState: evaluation.reviewState,
    phaseIds,
    agentIds,
    ptrrStepIds,
    failsafeSequenceIds,
    thinkingsGenerationIds,
    promptTemplateIds,
    outputSchemaIds,
  });
  return {
    schema: 'bitcode.read-evaluation-review.telemetry-receipt',
    receiptId: `read-evaluation-telemetry-${sha256(root).slice(0, 16)}`,
    pipelineName: READ_EVALUATION_COMPREHENSION_SYNTHESIS,
    action,
    evaluationId: evaluation.evaluationId,
    requestId: evaluation.request.requestId,
    reviewState: evaluation.reviewState,
    phaseIds,
    agentIds,
    ptrrStepIds,
    failsafeSequenceIds,
    thinkingsGenerationIds,
    promptTemplateIds,
    outputSchemaIds,
    root,
  };
}

function nextProtocolAction(evaluation: ReadEvaluation, admission: ReadFitsFindingAdmission): string {
  if (admission.admitted) return 'Run Finding Fits with the accepted Read-Evaluation.';
  if (evaluation.reviewState === 'rejected') return 'Revise or resynthesize the Read-Evaluation before Finding Fits can run.';
  return 'Review and accept the synthesized Read-Evaluation before Finding Fits.';
}

export function buildReadEvaluationReviewResynthesisRuntime(input: {
  action: ReadEvaluationReviewResynthesisAction;
  readEvaluation: ReadEvaluation;
  previousReadEvaluation?: ReadEvaluation | null;
  feedback?: string[];
}): ReadEvaluationReviewResynthesisRuntime {
  const readEvaluation = input.readEvaluation;
  const previousEvaluationId = readEvaluation.request.previousEvaluationId || input.previousReadEvaluation?.evaluationId || null;
  const findingFitsAdmission = admitReadFitsFinding({
    acceptedReadEvaluation: isAcceptedReadEvaluation(readEvaluation) ? readEvaluation : undefined,
    readEvaluation,
    requireAcceptedReadEvaluation: true,
  });
  const feedbackHistory = readEvaluation.feedbackHistory || [];
  const resynthesisAttemptPersisted = input.action === 'resynthesize_read_evaluation' || Boolean(previousEvaluationId);
  const acceptedEvaluationAdmissionPersisted = findingFitsAdmission.admitted;
  const rejectedEvaluationPosturePersisted = readEvaluation.reviewState === 'rejected';
  const telemetry = telemetryReceipt(input.action, readEvaluation);
  const records: ReadEvaluationReviewStorageRecord[] = [
    storageRecord(readEvaluation, 'read_request', 'read/evaluation', 'request', {
      requestId: readEvaluation.request.requestId,
      prompt: readEvaluation.request.prompt,
      repositoryFullName: readEvaluation.request.repositoryFullName || null,
      sourceBranch: readEvaluation.request.sourceBranch || null,
      sourceCommit: readEvaluation.request.sourceCommit || null,
      targetArtifactKinds: readEvaluation.request.targetArtifactKinds,
      closureCriteria: readEvaluation.request.closureCriteria,
      failureModes: readEvaluation.request.failureModes,
      previousEvaluationId,
    }),
    storageRecord(readEvaluation, 'synthesized_evaluation', 'read/evaluation', 'current', {
      evaluationId: readEvaluation.evaluationId,
      reviewState: readEvaluation.reviewState,
      requirements: readEvaluation.requirements,
      closureCriteria: readEvaluation.closureCriteria,
      failureModes: readEvaluation.failureModes,
      targetArtifactKinds: readEvaluation.targetArtifactKinds,
      proofExpectations: readEvaluation.proofExpectations,
      sourceConstraints: readEvaluation.sourceConstraints,
    }),
    storageRecord(readEvaluation, 'feedback', 'read/evaluation', 'feedbackHistory', {
      feedbackHistory,
      feedbackCount: feedbackHistory.length,
    }),
    storageRecord(readEvaluation, 'evaluation_measurement', 'read/evaluation', 'measurement', {
      evaluationId: readEvaluation.evaluationId,
      measurementRoot: readEvaluation.measurementRoot,
      pricingMeasurementInputs: readEvaluation.pricingMeasurementInputs,
    }),
    storageRecord(readEvaluation, 'telemetry_receipt', 'read/evaluation', 'telemetryReceipt', telemetry as unknown as Record<string, unknown>),
  ];

  if (resynthesisAttemptPersisted) {
    records.push(storageRecord(readEvaluation, 'resynthesis_attempt', 'read/evaluation', 'resynthesisAttempt', {
      previousEvaluationId,
      currentEvaluationId: readEvaluation.evaluationId,
      feedbackHistory,
      action: input.action,
    }));
  }

  if (acceptedEvaluationAdmissionPersisted) {
    records.push(storageRecord(readEvaluation, 'accepted_evaluation_admission', 'read/evaluation', 'accepted', {
      evaluationId: readEvaluation.evaluationId,
      reviewState: readEvaluation.reviewState,
      acceptanceRoot: readEvaluation.review?.acceptanceRoot || null,
      nextPipelineName: READ_FITS_FINDING_SYNTHESIS,
      blockers: findingFitsAdmission.blockers,
    }));
  }

  if (rejectedEvaluationPosturePersisted) {
    records.push(storageRecord(readEvaluation, 'rejected_evaluation_posture', 'read/evaluation', 'rejected', {
      evaluationId: readEvaluation.evaluationId,
      reviewState: readEvaluation.reviewState,
      rejectionRoot: readEvaluation.review?.rejectionRoot || null,
      blockedStage: 'finding_fits',
      blockers: findingFitsAdmission.blockers,
      feedbackHistory,
    }));
  }

  const storageRoot = rootOf(records.map((record) => ({ recordId: record.recordId, root: record.root })));
  const telemetryRoot = rootOf([telemetry.root]);
  const readRequestRoot = rootOf(readEvaluation.request);
  const runtimeRoot = rootOf({
    action: input.action,
    requestId: readEvaluation.request.requestId,
    currentEvaluationId: readEvaluation.evaluationId,
    previousEvaluationId,
    reviewState: readEvaluation.reviewState,
    storageRoot,
    telemetryRoot,
    findingFitsAdmission,
  });

  return {
    schema: 'bitcode.read-evaluation-review-resynthesis-runtime',
    runtimeId: `read-evaluation-runtime-${sha256(runtimeRoot).slice(0, 16)}`,
    pipelineName: READ_EVALUATION_COMPREHENSION_SYNTHESIS,
    nextPipelineName: READ_FITS_FINDING_SYNTHESIS,
    action: input.action,
    requestId: readEvaluation.request.requestId,
    currentEvaluationId: readEvaluation.evaluationId,
    previousEvaluationId,
    reviewState: readEvaluation.reviewState,
    findingFitsAdmission,
    reviewLoop: {
      readRequestPersisted: true,
      synthesizedEvaluationPersisted: true,
      feedbackHistoryPersisted: true,
      resynthesisAttemptPersisted,
      evaluationMeasurementPersisted: true,
      acceptedEvaluationAdmissionPersisted,
      rejectedEvaluationPosturePersisted,
      findingFitsBlockedUntilAcceptedEvaluation: true,
    },
    storageProjection: records,
    telemetryReceipts: [telemetry],
    sourceSafety: SOURCE_SAFETY,
    proofRoots: {
      runtimeRoot,
      storageRoot,
      telemetryRoot,
      measurementRoot: readEvaluation.measurementRoot,
      readRequestRoot,
    },
    nextProtocolAction: nextProtocolAction(readEvaluation, findingFitsAdmission),
  };
}

export function persistReadEvaluationReviewResynthesisRuntime(
  execution: {
    store?: (namespace: string, key: string, value: unknown) => void;
  } | null | undefined,
  runtime: ReadEvaluationReviewResynthesisRuntime,
): void {
  try {
    execution?.store?.('read-evaluation-review', 'runtime', runtime);
    execution?.store?.('read-evaluation-review', 'runtimeRoot', runtime.proofRoots.runtimeRoot);
    execution?.store?.('read-evaluation-review', 'storageRoot', runtime.proofRoots.storageRoot);
    execution?.store?.('read-evaluation-review', 'telemetryRoot', runtime.proofRoots.telemetryRoot);
    execution?.store?.('read-evaluation-review', 'findingFitsAdmission', runtime.findingFitsAdmission);
    for (const record of runtime.storageProjection) {
      execution?.store?.(record.namespace, record.key, record.payload);
    }
  } catch {
    // Runtime persistence is best-effort once typed route/package output exists.
  }
}

export function summarizeReadEvaluationReviewResynthesisRuntime(runtime: ReadEvaluationReviewResynthesisRuntime) {
  return {
    schema: runtime.schema,
    runtimeId: runtime.runtimeId,
    pipelineName: runtime.pipelineName,
    nextPipelineName: runtime.nextPipelineName,
    action: runtime.action,
    requestId: runtime.requestId,
    currentEvaluationId: runtime.currentEvaluationId,
    previousEvaluationId: runtime.previousEvaluationId,
    reviewState: runtime.reviewState,
    findingFitsAdmitted: runtime.findingFitsAdmission.admitted,
    blockers: runtime.findingFitsAdmission.blockers,
    storageRecordCount: runtime.storageProjection.length,
    telemetryReceiptCount: runtime.telemetryReceipts.length,
    reviewLoop: runtime.reviewLoop,
    sourceSafety: runtime.sourceSafety,
    proofRoots: runtime.proofRoots,
    pipelineContract: summarizeReadingPipelineContract(READ_EVALUATION_COMPREHENSION_SYNTHESIS_CONTRACT),
  };
}
