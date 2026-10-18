/**
 * Commercial Read-Evaluation review API.
 *
 * Owns product Read-Evaluation synthesis / accept / reject actions used by the Reads
 * experience. Protocol-demo host shims (scenario GET, specifying reviewRead)
 * are intentionally absent — those lived under the specifying machine only.
 */

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

type StatusError = Error & { statusCode?: number | undefined };

export async function POST(request: Request) {
  try {
    const body = await readJsonBody(request);
    const action = readEvaluationAction(body);
    if (action === 'synthesize_read_evaluation' || action === 'resynthesize_read_evaluation') {
      const { synthesizeReadEvaluationForPipelineInputWithInference } = await import('@bitcode/asset-packs-pipelines-execution-pipeline-sdivf-synthesize-reads-asset-packs/read-evaluation');
      const {
        buildReadEvaluationReviewResynthesisRuntime,
        persistReadEvaluationReviewResynthesisRuntime,
        summarizeReadEvaluationReviewResynthesisRuntime,
      } = await import('@bitcode/asset-packs-pipelines-execution-pipeline-sdivf-synthesize-reads-asset-packs/read-evaluation-review-resynthesis');
      const {
        READ_EVALUATION_COMPREHENSION_SYNTHESIS,
        READ_EVALUATION_COMPREHENSION_SYNTHESIS_CONTRACT,
        listReadingPipelineTelemetryTrace,
        summarizeReadingPipelineContract,
      } = await import('@bitcode/asset-packs-pipelines-execution-pipeline-sdivf-synthesize-reads-asset-packs/reading-pipeline-contract');
      const inferenceCapture = createRouteInferenceCapture();
      const readEvaluation = await synthesizeReadEvaluationForPipelineInputWithInference(
        readEvaluationPipelineInput(body),
        inferenceCapture.execution,
      );
      const reviewRuntime = buildReadEvaluationReviewResynthesisRuntime({
        action,
        readEvaluation,
        previousReadEvaluation: objectValue(body.previousReadEvaluation || body.readEvaluation) as Parameters<typeof buildReadEvaluationReviewResynthesisRuntime>[0]['previousReadEvaluation'],
        feedback: stringArray(body.feedback || body.readEvaluationFeedback),
      });
      persistReadEvaluationReviewResynthesisRuntime(inferenceCapture.execution, reviewRuntime);
      const synthesisStep =
        READ_EVALUATION_COMPREHENSION_SYNTHESIS_CONTRACT.phases
          .flatMap((phase) => phase.agents)
          .flatMap((agent) => agent.ptrrSteps)
          .find((step) => step.ptrrStepId === 'ReadEvaluationComprehensionSynthesis.comprehend.evaluation-synthesizer.try');

      return NextResponse.json({
        ok: true,
        pipelineName: READ_EVALUATION_COMPREHENSION_SYNTHESIS,
        stage: 'review_synthesized_evaluation',
        action,
        readEvaluation,
        readRequest: readEvaluation.request,
        readEvaluationReviewRuntime: reviewRuntime,
        storageProjection: reviewRuntime.storageProjection,
        runtimeSummary: summarizeReadEvaluationReviewResynthesisRuntime(reviewRuntime),
        fitsFindingAdmission: reviewRuntime.findingFitsAdmission,
        telemetry: {
          schema: 'bitcode.read-evaluation.synthesis-telemetry',
          pipelineName: READ_EVALUATION_COMPREHENSION_SYNTHESIS,
          pipelineContract: summarizeReadingPipelineContract(READ_EVALUATION_COMPREHENSION_SYNTHESIS_CONTRACT),
          pipelineTrace: listReadingPipelineTelemetryTrace(READ_EVALUATION_COMPREHENSION_SYNTHESIS_CONTRACT),
          phaseId: 'ReadEvaluationComprehensionSynthesis.comprehend',
          agentId: 'ReadEvaluationComprehensionSynthesis.comprehend.evaluation-synthesizer',
          ptrrStepId: synthesisStep?.ptrrStepId || 'ReadEvaluationComprehensionSynthesis.comprehend.evaluation-synthesizer.try',
          thinkingsGenerationIds: synthesisStep?.thinkingsGenerationIds || [],
          promptTemplate: synthesisStep?.prompt || null,
          promptInput: readEvaluation.read,
          interpolatedContext: {
            sourceConstraints: readEvaluation.sourceConstraints,
            targetArtifactKinds: readEvaluation.targetArtifactKinds,
            closureCriteria: readEvaluation.closureCriteria,
            feedbackHistory: readEvaluation.feedbackHistory,
          },
          modelOutput: {
            runtime: 'structured-read-evaluation-synthesis',
            outputKind: 'typed-protocol-synthesis',
            requirements: readEvaluation.requirements,
            failureModes: readEvaluation.failureModes,
            proofExpectations: readEvaluation.proofExpectations,
          },
          rawModelResponse: {
            runtime: 'structured-read-evaluation-synthesis',
            outputKind: 'typed-protocol-synthesis',
            content: readEvaluation,
          },
          thinkingsGeneration: {
            mode: inferenceCapture.value('bounded-inference', 'mode') || 'deterministic-typed-witness',
            status: inferenceCapture.value('bounded-inference', 'status') || 'deterministic-fallback',
            provider: inferenceCapture.value('bounded-inference', 'provider') || null,
            reasoningOutput: inferenceCapture.value('llm', 'reasoningOutput') || null,
            judgmentOutput: inferenceCapture.value('llm', 'judgmentOutput') || null,
            structuredOutput: inferenceCapture.value('llm', 'parsedOutput') || null,
          },
          parsedTypedOutput: readEvaluation,
          returnType: 'ReadEvaluation',
          parsedEvaluation: readEvaluation,
          readRequest: readEvaluation.request,
          previousEvaluationId: readEvaluation.request.previousEvaluationId || null,
          feedbackHistory: readEvaluation.feedbackHistory,
          measurementRoot: readEvaluation.measurementRoot,
          reviewState: readEvaluation.reviewState,
          resynthesisAttempt: action === 'resynthesize_read_evaluation',
          runtimeRoot: reviewRuntime.proofRoots.runtimeRoot,
          storageRoot: reviewRuntime.proofRoots.storageRoot,
          telemetryRoot: reviewRuntime.proofRoots.telemetryRoot,
        },
        nextProtocolAction: reviewRuntime.nextProtocolAction,
      });
    }

    if (action === 'accept_read_evaluation') {
      const { acceptReadEvaluation, admitReadFitsFinding } = await import('@bitcode/asset-packs-pipelines-execution-pipeline-sdivf-synthesize-reads-asset-packs/read-evaluation');
      const {
        buildReadEvaluationReviewResynthesisRuntime,
        persistReadEvaluationReviewResynthesisRuntime,
        summarizeReadEvaluationReviewResynthesisRuntime,
      } = await import('@bitcode/asset-packs-pipelines-execution-pipeline-sdivf-synthesize-reads-asset-packs/read-evaluation-review-resynthesis');
      const {
        READ_EVALUATION_COMPREHENSION_SYNTHESIS,
        READ_EVALUATION_COMPREHENSION_SYNTHESIS_CONTRACT,
        READ_FITS_FINDING_SYNTHESIS,
        listReadingPipelineTelemetryTrace,
        summarizeReadingPipelineContract,
      } = await import('@bitcode/asset-packs-pipelines-execution-pipeline-sdivf-synthesize-reads-asset-packs/reading-pipeline-contract');
      const readEvaluation = objectValue(body.readEvaluation) || objectValue(body.acceptedReadEvaluation);
      if (!readEvaluation || readEvaluation.schema !== 'bitcode.read.need') {
        return NextResponse.json({ error: 'readEvaluation is required' }, { status: 400 });
      }

      const acceptedReadEvaluation = acceptReadEvaluation(readEvaluation as unknown as Parameters<typeof acceptReadEvaluation>[0]);
      const fitsFindingAdmission = admitReadFitsFinding({
        acceptedReadEvaluation,
        requireAcceptedReadEvaluation: true,
      });
      const inferenceCapture = createRouteInferenceCapture();
      const reviewRuntime = buildReadEvaluationReviewResynthesisRuntime({
        action,
        readEvaluation: acceptedReadEvaluation,
      });
      persistReadEvaluationReviewResynthesisRuntime(inferenceCapture.execution, reviewRuntime);
      const acceptanceStep =
        READ_EVALUATION_COMPREHENSION_SYNTHESIS_CONTRACT.phases
          .flatMap((phase) => phase.agents)
          .flatMap((agent) => agent.ptrrSteps)
          .find((step) => step.ptrrStepId === 'ReadEvaluationComprehensionSynthesis.review.operator-review.try');
      return NextResponse.json({
        ok: true,
        pipelineName: READ_EVALUATION_COMPREHENSION_SYNTHESIS,
        nextPipelineName: READ_FITS_FINDING_SYNTHESIS,
        stage: 'request_fit_ready',
        action,
        acceptedReadEvaluation,
        readEvaluation: acceptedReadEvaluation,
        readRequest: acceptedReadEvaluation.request,
        fitsFindingAdmission,
        readEvaluationReviewRuntime: reviewRuntime,
        storageProjection: reviewRuntime.storageProjection,
        runtimeSummary: summarizeReadEvaluationReviewResynthesisRuntime(reviewRuntime),
        telemetry: {
          schema: 'bitcode.read-evaluation.acceptance-telemetry',
          pipelineName: READ_EVALUATION_COMPREHENSION_SYNTHESIS,
          pipelineContract: summarizeReadingPipelineContract(READ_EVALUATION_COMPREHENSION_SYNTHESIS_CONTRACT),
          pipelineTrace: listReadingPipelineTelemetryTrace(READ_EVALUATION_COMPREHENSION_SYNTHESIS_CONTRACT),
          phaseId: 'ReadEvaluationComprehensionSynthesis.review',
          agentId: 'ReadEvaluationComprehensionSynthesis.review.operator-review',
          ptrrStepId: acceptanceStep?.ptrrStepId || 'ReadEvaluationComprehensionSynthesis.review.operator-review.try',
          thinkingsGenerationIds: acceptanceStep?.thinkingsGenerationIds || [],
          evaluationId: acceptedReadEvaluation.evaluationId,
          measurementRoot: acceptedReadEvaluation.measurementRoot,
          reviewState: acceptedReadEvaluation.reviewState,
          acceptanceRoot: acceptedReadEvaluation.review?.acceptanceRoot || null,
          readRequest: acceptedReadEvaluation.request,
          feedbackHistory: acceptedReadEvaluation.feedbackHistory,
          nextStage: acceptedReadEvaluation.review?.nextStage || 'finding_fits',
          nextPipelineName: READ_FITS_FINDING_SYNTHESIS,
          returnType: 'AcceptedReadEvaluation',
          runtimeRoot: reviewRuntime.proofRoots.runtimeRoot,
          storageRoot: reviewRuntime.proofRoots.storageRoot,
          telemetryRoot: reviewRuntime.proofRoots.telemetryRoot,
        },
        nextProtocolAction: reviewRuntime.nextProtocolAction,
      });
    }

    if (action === 'reject_read_evaluation') {
      const { rejectReadEvaluation, admitReadFitsFinding } = await import('@bitcode/asset-packs-pipelines-execution-pipeline-sdivf-synthesize-reads-asset-packs/read-evaluation');
      const {
        buildReadEvaluationReviewResynthesisRuntime,
        persistReadEvaluationReviewResynthesisRuntime,
        summarizeReadEvaluationReviewResynthesisRuntime,
      } = await import('@bitcode/asset-packs-pipelines-execution-pipeline-sdivf-synthesize-reads-asset-packs/read-evaluation-review-resynthesis');
      const {
        READ_EVALUATION_COMPREHENSION_SYNTHESIS,
        READ_EVALUATION_COMPREHENSION_SYNTHESIS_CONTRACT,
        READ_FITS_FINDING_SYNTHESIS,
        listReadingPipelineTelemetryTrace,
        summarizeReadingPipelineContract,
      } = await import('@bitcode/asset-packs-pipelines-execution-pipeline-sdivf-synthesize-reads-asset-packs/reading-pipeline-contract');
      const readEvaluation = objectValue(body.readEvaluation);
      if (!readEvaluation || readEvaluation.schema !== 'bitcode.read.need') {
        return NextResponse.json({ error: 'readEvaluation is required' }, { status: 400 });
      }

      const rejectedReadEvaluation = rejectReadEvaluation(
        readEvaluation as unknown as Parameters<typeof rejectReadEvaluation>[0],
        stringArray(body.feedback || body.readEvaluationFeedback),
      );
      const fitsFindingAdmission = admitReadFitsFinding({
        readEvaluation: rejectedReadEvaluation,
        requireAcceptedReadEvaluation: true,
      });
      const inferenceCapture = createRouteInferenceCapture();
      const reviewRuntime = buildReadEvaluationReviewResynthesisRuntime({
        action,
        readEvaluation: rejectedReadEvaluation,
        feedback: stringArray(body.feedback || body.readEvaluationFeedback),
      });
      persistReadEvaluationReviewResynthesisRuntime(inferenceCapture.execution, reviewRuntime);
      const reviewStep =
        READ_EVALUATION_COMPREHENSION_SYNTHESIS_CONTRACT.phases
          .flatMap((phase) => phase.agents)
          .flatMap((agent) => agent.ptrrSteps)
          .find((step) => step.ptrrStepId === 'ReadEvaluationComprehensionSynthesis.review.operator-review.try');
      return NextResponse.json({
        ok: true,
        pipelineName: READ_EVALUATION_COMPREHENSION_SYNTHESIS,
        nextPipelineName: READ_FITS_FINDING_SYNTHESIS,
        stage: 'review_synthesized_evaluation',
        action,
        rejectedReadEvaluation,
        readEvaluation: rejectedReadEvaluation,
        readRequest: rejectedReadEvaluation.request,
        fitsFindingAdmission,
        readEvaluationReviewRuntime: reviewRuntime,
        storageProjection: reviewRuntime.storageProjection,
        runtimeSummary: summarizeReadEvaluationReviewResynthesisRuntime(reviewRuntime),
        telemetry: {
          schema: 'bitcode.read-evaluation.rejection-telemetry',
          pipelineName: READ_EVALUATION_COMPREHENSION_SYNTHESIS,
          pipelineContract: summarizeReadingPipelineContract(READ_EVALUATION_COMPREHENSION_SYNTHESIS_CONTRACT),
          pipelineTrace: listReadingPipelineTelemetryTrace(READ_EVALUATION_COMPREHENSION_SYNTHESIS_CONTRACT),
          phaseId: 'ReadEvaluationComprehensionSynthesis.review',
          agentId: 'ReadEvaluationComprehensionSynthesis.review.operator-review',
          ptrrStepId: reviewStep?.ptrrStepId || 'ReadEvaluationComprehensionSynthesis.review.operator-review.try',
          thinkingsGenerationIds: reviewStep?.thinkingsGenerationIds || [],
          evaluationId: rejectedReadEvaluation.evaluationId,
          measurementRoot: rejectedReadEvaluation.measurementRoot,
          reviewState: rejectedReadEvaluation.reviewState,
          rejectionRoot: rejectedReadEvaluation.review?.rejectionRoot || null,
          readRequest: rejectedReadEvaluation.request,
          feedbackHistory: rejectedReadEvaluation.feedbackHistory,
          blockedStage: 'finding_fits',
          nextPipelineName: READ_FITS_FINDING_SYNTHESIS,
          returnType: 'RejectedReadEvaluation',
          runtimeRoot: reviewRuntime.proofRoots.runtimeRoot,
          storageRoot: reviewRuntime.proofRoots.storageRoot,
          telemetryRoot: reviewRuntime.proofRoots.telemetryRoot,
        },
        nextProtocolAction: reviewRuntime.nextProtocolAction,
      });
    }

    return NextResponse.json(
      {
        error:
          'Unsupported read-review action. Use synthesize_read_evaluation, resynthesize_read_evaluation, accept_read_evaluation, or reject_read_evaluation.',
      },
      { status: 400 },
    );
  } catch (error) {
    return toRouteErrorResponse(error);
  }
}

async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  const text = await request.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    const err = new Error('Invalid JSON body.') as StatusError;
    err.statusCode = 400;
    throw err;
  }
}

function toRouteErrorResponse(error: unknown) {
  const resolved = error instanceof Error ? (error as StatusError) : (new Error('Unknown error.') as StatusError);
  if (!resolved.statusCode && /No candidates survived into the data pack/i.test(resolved.message || '')) {
    resolved.statusCode = 409;
  }
  if (!resolved.statusCode && /(Finding Fits|fit search) cannot proceed/i.test(resolved.message || '')) {
    resolved.statusCode = 409;
  }
  return NextResponse.json(
    { error: resolved.message || 'Unknown error.' },
    { status: resolved.statusCode || 500 },
  );
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function stringArray(value: unknown): string[] {
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => typeof entry === 'string' ? entry.trim() : '')
    .filter(Boolean);
}

function readEvaluationAction(body: Record<string, unknown>): string | null {
  return stringValue(body.action) || stringValue(body.readEvaluationAction);
}

function createRouteInferenceCapture() {
  const values = new Map<string, unknown>();
  type CapturedExecution = {
    child: (name?: string) => CapturedExecution;
    getRoot: () => CapturedExecution;
    store: (namespace: string, key: string, value: unknown) => void;
    get: (namespace: string, key: string) => unknown;
    findUp: (namespace: string, key: string) => unknown;
    llms: { getDefaultLLM: () => undefined };
  };
  const execution: CapturedExecution = {
    child() {
      return execution;
    },
    getRoot() {
      return execution;
    },
    store(namespace: string, key: string, value: unknown) {
      values.set(`${namespace}:${key}`, value);
    },
    get(namespace: string, key: string) {
      return values.get(`${namespace}:${key}`);
    },
    findUp(namespace: string, key: string) {
      return values.get(`${namespace}:${key}`);
    },
    llms: {
      getDefaultLLM() {
        return undefined;
      },
    },
  };

  return {
    execution,
    value(namespace: string, key: string) {
      return values.get(`${namespace}:${key}`);
    },
  };
}

function readEvaluationPipelineInput(body: Record<string, unknown>) {
  const readRequest = objectValue(body.readRequest);
  const read = objectValue(body.read);
  const sourceRevision = objectValue(body.sourceRevision);
  const prompt =
    stringValue(body.readPrompt) ||
    stringValue(body.prompt) ||
    stringValue(readRequest?.prompt) ||
    stringValue(read?.prompt) ||
    '';

  return {
    read: {
      ...read,
      id: stringValue(body.readId) || stringValue(read?.id) || stringValue(readRequest?.id),
      prompt,
      repositoryFullName:
        stringValue(body.repositoryFullName) ||
        stringValue(sourceRevision?.repositoryFullName) ||
        stringValue(read?.repositoryFullName) ||
        stringValue(readRequest?.repositoryFullName),
      sourceBranch:
        stringValue(body.sourceBranch) ||
        stringValue(sourceRevision?.branch) ||
        stringValue(read?.sourceBranch) ||
        stringValue(readRequest?.sourceBranch),
      sourceCommit:
        stringValue(body.sourceCommit) ||
        stringValue(sourceRevision?.commit) ||
        stringValue(read?.sourceCommit) ||
        stringValue(readRequest?.sourceCommit),
    },
    readRequest,
    sourceRevision,
    previousReadEvaluation: body.previousReadEvaluation || body.readEvaluation,
    readEvaluation: body.readEvaluation,
    targetArtifactKinds: body.targetArtifactKinds || body.targetKinds,
    targetKinds: body.targetKinds,
    closureCriteria: body.closureCriteria,
    failureModes: body.failureModes,
    feedback: body.feedback || body.readEvaluationFeedback,
  };
}
