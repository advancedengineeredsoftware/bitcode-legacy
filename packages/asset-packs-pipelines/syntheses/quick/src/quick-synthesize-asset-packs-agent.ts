/**
 * quick-synthesize-{deposit,read}-asset-packs — the single stage of the QUICK
 * synthesis pipelines (V49 quick synthesis law Q-3).
 *
 * Built on `factoryQuickAgent`. Inside its one step:
 *   1. Gather   (Tool, 0 model calls)  → telemetry Setup + Discovery
 *   2. Synthesize (exactly 1 model call) → Implementation
 *   3. Measure + project (0 model calls) → Validation
 * Phase rows are stored on the QUICK pipeline execution with the same
 * `phase/start` + `phase/complete` shape the SDIVF factory writes, so product
 * pipeline pills render unchanged (each row carries `pipeline: 'quick'`).
 */

import { factoryQuickAgent } from '@bitcode/agent-generics';
import type { LLM, LLMRegistry } from '@bitcode/llm-generics';

import { countLlmCallsFromExecutionTree } from './quick-synthesis-llm-calls';
import {
  projectQuickDepositOptions,
  projectQuickReadOptions,
  type QuickDepositorySupplyRow,
} from './quick-synthesis-options';
import { createQuickSynthesisPrompt } from './quick-synthesis-prompts';
import {
  parseQuickSynthesisResponse,
  QuickSynthesisError,
  validateQuickSynthesisOutput,
  type QuickSynthesisLens,
} from './quick-synthesis-schema';
import {
  quickSynthesisGatherSourceTool,
  readQuickSynthesisBudget,
  type QuickSynthesisBudget,
  type QuickSynthesisSourceLoader,
} from './quick-synthesis-source-tool';

export type QuickPhaseName = 'setup' | 'discovery' | 'implementation' | 'validation' | 'finish';

export interface QuickSynthesisAgentInput {
  lens: QuickSynthesisLens;
  runId: string;
  repositoryFullName: string;
  reference: string;
  permissibleSources: string[];
  impermissibleSources: string[];
  /** Deposit steering text (obfuscations). */
  obfuscations?: string;
  /** Read Evaluation text. */
  evaluation?: string;
  /** Read: admitted Depository supply the model may attribute options to. */
  depositorySupply?: QuickDepositorySupplyRow[];
  /** Read: benchmark ids the repository declares (Gate 5 runner consumes). */
  declaredBenchmarkIds?: string[];
  source: QuickSynthesisSourceLoader;
  budget?: QuickSynthesisBudget;
  emitStatus?: (message: string) => unknown;
  /** Test/operator seam: LLM registry installed on the agent before the call. */
  llmRegistry?: LLMRegistry;
}

export const MAX_QUICK_PROMPT_PATHS = 3_000;

function readMaxTokens(env: Record<string, string | undefined> = process.env): number {
  const parsed = Number.parseInt(String(env.BITCODE_QUICK_SYNTHESIS_MAX_TOKENS ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 32_000;
}

function findUp(execution: any, predicate: (node: any) => boolean): any {
  let current = execution;
  while (current) {
    if (predicate(current)) return current;
    current = current.parent;
  }
  return undefined;
}

function storePhase(pipeline: any, phase: QuickPhaseName, transition: 'start' | 'complete', detail: Record<string, unknown> = {}) {
  if (!pipeline?.store) return;
  if (transition === 'start') {
    pipeline.store('phase', 'current', phase);
    pipeline.store('phase', 'start', {
      phase,
      currentPhase: phase,
      iteration: null,
      pipeline: 'quick',
      startedAt: new Date().toISOString(),
      ...detail,
    });
    return;
  }
  pipeline.store('phase', 'complete', {
    phase,
    currentPhase: phase,
    iteration: null,
    pipeline: 'quick',
    status: detail.error ? 'failed' : 'completed',
    completedAt: new Date().toISOString(),
    ...detail,
  });
}

export async function executeQuickSynthesis(input: QuickSynthesisAgentInput, stepExecution: any) {
  const agentExecution = findUp(stepExecution, (node) => typeof node?.llms?.getDefaultLLM === 'function');
  const pipeline = findUp(stepExecution, (node) => node?.get?.('pipeline', 'pattern') === 'QUICK') ?? stepExecution;
  const emit = (message: string) => {
    try {
      void input.emitStatus?.(message);
    } catch {
      /* streaming optional */
    }
  };
  const steeringText = input.lens === 'read' ? input.evaluation || '' : input.obfuscations || '';

  storePhase(pipeline, 'setup', 'start');
  emit(`Quick synthesis (${input.lens}): one model call; gathering ${input.repositoryFullName}@${input.reference}…`);
  storePhase(pipeline, 'setup', 'complete', { lens: input.lens });

  storePhase(pipeline, 'discovery', 'start');
  const gathered = await quickSynthesisGatherSourceTool.use({
    loader: input.source,
    permissibleSources: input.permissibleSources,
    impermissibleSources: input.impermissibleSources,
    steeringText,
    budget: input.budget ?? readQuickSynthesisBudget(),
  });
  const { sourceCatalog, providerCatalog } = gathered;
  emit(
    `Quick synthesis: ${providerCatalog.sourcesIncluded} file bodies (${providerCatalog.totalCharsIncluded} chars) from ${sourceCatalog.totalPathCount} in-scope paths.`,
  );
  storePhase(pipeline, 'discovery', 'complete', {
    inScopePathCount: sourceCatalog.totalPathCount,
    sourcesIncluded: providerCatalog.sourcesIncluded,
  });

  storePhase(pipeline, 'implementation', 'start');
  if (!agentExecution) {
    throw new QuickSynthesisError('Quick synthesis agent has no LLM registry in its execution hierarchy.');
  }
  if (input.llmRegistry) agentExecution.llms.setLLMRegistry(input.llmRegistry);
  const llm: LLM = agentExecution.llms.getDefaultLLM();
  const system = createQuickSynthesisPrompt(input.lens).format();
  const user = JSON.stringify({
    lens: input.lens,
    repository: { fullName: input.repositoryFullName, reference: input.reference },
    steering: {
      permissibleSources: input.permissibleSources,
      impermissibleSources: input.impermissibleSources,
      ...(input.lens === 'deposit' ? { obfuscations: input.obfuscations || '' } : {}),
    },
    ...(input.lens === 'read'
      ? {
          evaluation: input.evaluation || '',
          depositorySupply: (input.depositorySupply || []).slice(0, 24),
          declaredBenchmarks: input.declaredBenchmarkIds || [],
        }
      : {}),
    catalog: {
      paths: sourceCatalog.paths.slice(0, MAX_QUICK_PROMPT_PATHS),
      sources: providerCatalog.sources,
    },
  });
  emit('Quick synthesis: model call in progress (patches, commercial prose, quality profile)…');
  const response = await llm({
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    config: { responseFormat: 'json', temperature: 0.2, maxTokens: readMaxTokens() },
  });
  // Tracked `llm:*` nodes hang off the AgentExecution that owns the registry
  // (StepExecution.llms delegates upward), so count over the whole QUICK run.
  const llmCallCount = countLlmCallsFromExecutionTree(pipeline);
  if (llmCallCount !== 1) {
    throw new QuickSynthesisError(`Quick synthesis invariant violated: ${llmCallCount} model calls (expected exactly 1).`);
  }
  const raw = parseQuickSynthesisResponse(response.content);
  storePhase(pipeline, 'implementation', 'complete', { usage: response.usage ?? null });

  storePhase(pipeline, 'validation', 'start');
  let result;
  if (input.lens === 'read') {
    const output = validateQuickSynthesisOutput('read', raw);
    const declared = new Set(input.declaredBenchmarkIds || []);
    result = {
      lens: 'read' as const,
      options: projectQuickReadOptions({
        options: output.options,
        evaluation: input.evaluation || '',
        inventoryPaths: sourceCatalog.paths,
        permissibleSources: input.permissibleSources,
        impermissibleSources: input.impermissibleSources,
        depositorySupply: input.depositorySupply || [],
      }),
      benchmarkIds: output.benchmarkIds.filter((id) => declared.has(id)),
    };
  } else {
    const output = validateQuickSynthesisOutput('deposit', raw);
    result = {
      lens: 'deposit' as const,
      options: projectQuickDepositOptions(output.options, input.runId),
      benchmarkIds: [] as string[],
    };
  }
  emit(`Quick synthesis: ${result.options.length} option(s) measured (absolutes + relatives, no further model calls).`);
  storePhase(pipeline, 'validation', 'complete', { optionCount: result.options.length });

  return {
    ...result,
    sourceCatalog,
    llmCallCount,
    usage: response.usage ?? null,
  };
}

export type QuickSynthesisAgentResult = Awaited<ReturnType<typeof executeQuickSynthesis>>;

export const quickSynthesizeDepositAssetPacksAgent = factoryQuickAgent<QuickSynthesisAgentInput, QuickSynthesisAgentResult>({
  name: 'quick-synthesize-deposit-asset-packs',
  description: 'Single-call deposit DataPack synthesis (gather → 1 model call → measure → project).',
  execute: executeQuickSynthesis,
});

export const quickSynthesizeReadAssetPacksAgent = factoryQuickAgent<QuickSynthesisAgentInput, QuickSynthesisAgentResult>({
  name: 'quick-synthesize-read-asset-packs',
  description: 'Single-call read DataPack synthesis (gather → 1 model call → measure → project).',
  execute: executeQuickSynthesis,
});
