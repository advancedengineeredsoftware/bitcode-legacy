/**
 * Demonstration ExecutionPipelineSDIVF telemetry script — a paced, source-safe
 * replay of the canonical SDIVF agent roster (Setup → Discovery ∥ →
 * Implementation ×4 → Validation → Finish) for deposit and read lenses.
 *
 * Events use the host telemetry artifact shape that the uapi telemetry bridge
 * already turns into formal LLM / tool log rows and Phase → Agent → Step →
 * Failsafe → Thinkings pills, so the pipeline UI renders exactly as for a
 * live run. Every LLM row is tagged `provider: demonstration` and carries
 * withheld content (no inference ran; nothing source-bearing is emitted).
 *
 * `store` events are cross-phase store writes the run-activity model reads
 * directly (pipeline mode, DIV iteration, Validation readyToFinish verdict);
 * the replay emits them straight to the execution stream (not via the bridge).
 */

export type DemonstrationSynthesisLens = 'deposit' | 'read';

/** Host telemetry artifact (bridge input) — see deposit-host-telemetry-bridge. */
export interface DemonstrationTelemetryArtifact {
  streamEventType: 'generation' | 'tool-use' | 'pipeline-stream-event' | 'store';
  namespace: string;
  key: string;
  message: string;
  executionState: Record<string, string>;
  executionPath: string[];
  executionNodeId: string;
  tool?: string;
  toolOk?: boolean;
  data?: Record<string, unknown> | string | number;
}

export interface DemonstrationTelemetryStep {
  /** Offset from run start, before pacing is applied. */
  atMs: number;
  artifact: DemonstrationTelemetryArtifact;
}

export interface DemonstrationTelemetryContext {
  lens: DemonstrationSynthesisLens;
  repositoryFullName: string;
  catalogPathCount: number;
  optionTitles: readonly string[];
  depositorySupplyCount: number;
}

type GenerationRow = { step: string; failsafe: string; generation: string; message: string };

const DEMONSTRATION_MODEL = 'demonstration-replay';

/** Compact PTRR generation set for one LLM-backed agent. */
function ptrrRows(objective: string): GenerationRow[] {
  return [
    { step: 'plan', failsafe: 'prepare-context', generation: 'reason', message: `Select execution-state keys for: ${objective}` },
    { step: 'plan', failsafe: 'chunk', generation: 'reason', message: `Plan: ${objective}` },
    { step: 'plan', failsafe: 'chunk', generation: 'structure', message: 'Plan structured to schema.' },
    { step: 'try', failsafe: 'chunk', generation: 'reason', message: `Try: ${objective}` },
    { step: 'try', failsafe: 'chunk', generation: 'judge', message: 'Judge: output satisfies objective and source-safety.' },
    { step: 'try', failsafe: 'chunk', generation: 'structure', message: 'Try output structured to schema.' },
  ];
}

class TelemetryScriptBuilder {
  readonly steps: DemonstrationTelemetryStep[] = [];
  private clockMs = 0;
  private sequence = 0;

  constructor(private readonly lens: DemonstrationSynthesisLens) {}

  private push(gapMs: number, artifact: DemonstrationTelemetryArtifact) {
    this.clockMs += gapMs;
    this.steps.push({ atMs: this.clockMs, artifact });
  }

  private path(phase: string, agent: string, leaf: string) {
    this.sequence += 1;
    return [`pipeline:${this.lens}`, `phase:${phase}`, `agent:${agent}`, `${leaf}#${this.sequence}`];
  }

  phase(phase: string) {
    this.push(400, {
      streamEventType: 'pipeline-stream-event',
      namespace: 'phase',
      key: 'current',
      message: `pipeline: phase/current=${phase}`,
      executionState: { phase },
      executionPath: this.path(phase, 'phase', 'phase'),
      executionNodeId: `phase:${phase}`,
      data: phase,
    });
  }

  agent(phase: string, agent: string) {
    this.push(250, {
      streamEventType: 'pipeline-stream-event',
      namespace: 'agent',
      key: 'name',
      message: `pipeline: agent/name=${agent}`,
      executionState: { phase, agent },
      executionPath: this.path(phase, agent, 'agent'),
      executionNodeId: `agent:${agent}`,
      data: agent,
    });
  }

  llm(phase: string, agent: string, objective: string, gapMs = 650) {
    for (const row of ptrrRows(objective)) {
      const executionPath = this.path(phase, agent, `thinkings:${row.generation}`);
      this.push(gapMs, {
        streamEventType: 'generation',
        namespace: 'llm',
        key: 'output',
        message: row.message,
        executionState: { phase, agent, step: row.step, failsafe: row.failsafe, generation: row.generation },
        executionPath,
        executionNodeId: executionPath[executionPath.length - 1],
        data: {
          provider: 'demonstration',
          model: DEMONSTRATION_MODEL,
          contentWithheld: true,
          sourceSafetyClass: 'source_safe',
          demonstration: true,
        },
      });
    }
  }

  tool(phase: string, agent: string, tool: string, summary: string, gapMs = 500) {
    const executionPath = this.path(phase, agent, `tool:${tool}`);
    this.push(gapMs, {
      streamEventType: 'tool-use',
      namespace: 'tool',
      key: 'result',
      message: tool,
      tool,
      toolOk: true,
      executionState: { phase, agent, step: 'try', tool },
      executionPath,
      executionNodeId: executionPath[executionPath.length - 1],
      data: { tool, ok: true, summary, demonstration: true },
    });
  }

  /** Cross-phase store write (e.g. validation/readyToFinish) for activity models. */
  store(phase: string, agent: string, namespace: string, key: string, data: Record<string, unknown> | string | number) {
    const executionPath = this.path(phase, agent, `store:${namespace}:${key}`);
    this.push(150, {
      streamEventType: 'store',
      namespace,
      key,
      message: `store ${namespace}/${key}`,
      executionState: { phase, agent },
      executionPath,
      executionNodeId: executionPath[executionPath.length - 1],
      data,
    });
  }

  decision(phase: string, agent: string, summary: string) {
    const executionPath = this.path(phase, agent, 'decision');
    this.push(450, {
      streamEventType: 'generation',
      namespace: 'llm',
      key: 'output',
      message: summary,
      executionState: { phase, agent, step: 'decide', failsafe: 'deterministic-gate', generation: 'structure' },
      executionPath,
      executionNodeId: executionPath[executionPath.length - 1],
      data: { provider: 'deterministic', model: null, contentWithheld: false, sourceSafetyClass: 'source_safe', demonstration: true },
    });
  }
}

/**
 * Build the full paced telemetry script for one demonstration SDIVF run.
 * Total unpaced duration ≈ 45–60s; callers scale with a pace factor.
 */
export function buildDemonstrationExecutionPipelineSDIVFTelemetryScript(
  context: DemonstrationTelemetryContext,
): DemonstrationTelemetryStep[] {
  const { lens } = context;
  const b = new TelemetryScriptBuilder(lens);
  const optionCount = context.optionTitles.length;

  // Setup
  b.store('setup', 'pipeline', 'synthesize-asset-packs', 'mode', lens);
  b.phase('setup');
  b.agent('setup', 'clone-vcs-repository');
  b.tool('setup', 'clone-vcs-repository', 'repository-clone', `Adopted ${context.repositoryFullName} checkout at request SHA.`, 900);
  b.tool('setup', 'clone-vcs-repository', 'source-checkout-catalog', `Catalogued ${context.catalogPathCount} in-scope paths.`);
  b.agent('setup', 'initialize-lsp');
  b.tool('setup', 'initialize-lsp', 'lsp-initialize', 'Language server initialized on workspace.');
  b.agent('setup', 'initialize-mcps-tools');
  b.tool('setup', 'initialize-mcps-tools', 'mcp-tools-register', 'Host tools registered for this run.');
  if (lens === 'deposit') {
    b.agent('setup', 'comprehend-obfuscations');
    b.llm('setup', 'comprehend-obfuscations', 'structure Obfuscations guidance against catalog paths');
  } else {
    b.agent('setup', 'comprehend-evaluations');
    b.llm('setup', 'comprehend-evaluations', 'comprehend the Evaluation and plan dynamic *-fit measurements');
  }
  b.agent('setup', 'danger-wall');
  b.decision('setup', 'danger-wall', lens === 'deposit' ? 'Danger wall admitted obfuscation posture (safe).' : 'Danger wall admitted Evaluation and *-fit plan (safe).');

  // Discovery (parallel in live runs; interleaved here)
  b.store('setup', 'pipeline', 'pipeline', 'currentIteration', 1);
  b.phase('discovery');
  b.agent('discovery', 'comprehend-codebase');
  b.tool('discovery', 'comprehend-codebase', 'lsp-query', 'Symbol graph queried for module boundaries.');
  b.tool('discovery', 'comprehend-codebase', 'lsp-query', 'Exported surfaces resolved.');
  b.llm('discovery', 'comprehend-codebase', 'build the knowledge map of capabilities and notable modules');
  b.agent('discovery', 'search-depository');
  b.tool('discovery', 'search-depository', 'depository-asset-pack-search', `Searched ${context.depositorySupplyCount} Depository DataPack(s) (lexical + vector).`);
  b.llm('discovery', 'search-depository', lens === 'deposit' ? 'derive demand guidance and underserved topics' : 'rank Depository supply for Evaluation fits');
  b.agent('discovery', 'inherent-regurgitation');
  b.llm('discovery', 'inherent-regurgitation', 'recall model-inherent patterns relevant to this source (source-safe)');

  // Implementation (four sequential agents over the same DataPacks)
  const impl = lens === 'deposit' ? 'deposit-implementation-agent-asset-packs' : 'read-implementation-agent-asset-packs';
  b.phase('implementation');
  b.agent('implementation', `${impl}-patch-plan`);
  b.llm('implementation', `${impl}-patch-plan`, `plan ${optionCount} distinct DataPack options`);
  b.agent('implementation', `${impl}-patchfile`);
  for (const title of context.optionTitles) {
    b.tool('implementation', `${impl}-patchfile`, 'asset-pack-patch-write', `Patch artifact written: ${title}.`, 700);
  }
  b.agent('implementation', `${impl}-measurements-synthesis`);
  for (const tool of ['measure-structure', 'measure-verification', 'measure-hygiene', 'measure-provenance']) {
    b.tool('implementation', `${impl}-measurements-synthesis`, tool, `Absolute catalogue family measured for ${optionCount} pack(s).`, 600);
  }
  if (lens === 'read') {
    b.tool('implementation', `${impl}-measurements-synthesis`, 'measure-relatives', `Static *-fit relatives measured for ${optionCount} pack(s).`, 600);
  }
  b.llm('implementation', `${impl}-measurements-synthesis`, 'author source-safe measurement descriptors');
  b.agent('implementation', `${impl}-commercial-nl`);
  b.llm('implementation', `${impl}-commercial-nl`, 'write commercial title and buyer brief per pack');

  // Validation
  const validation = `ready-to-finish-asset-packs-synthesis-${lens}-pipeline`;
  b.phase('validation');
  b.agent('validation', validation);
  b.llm('validation', validation, 'check A/B/C: phase sanity, pack quality, path law');
  b.store('validation', validation, 'validation', 'readyToFinish', {
    recommendation: 'finish',
    readyToFinish: true,
    qualityScore: 0.86,
    overallConfidence: 0.84,
    criticalChecks: { priorPhaseSanity: true, packQuality: true, pathLaw: true },
    finalWarnings: [],
    summary: `${lens === 'deposit' ? 'Deposit' : 'Read'} synthesis ready to finish: ${optionCount} measured, presentable DataPack option(s); path law and source-safety checks passed.`,
  });
  b.decision('validation', validation, `Ready to finish: ${optionCount} presentable pack(s), recommendation=finish.`);

  // Finish
  b.phase('finish');
  b.agent('finish', 'store-artifacts');
  b.tool('finish', 'store-artifacts', 'store-artifacts', 'Source-safe bundle stored.');
  b.agent('finish', 'ledgerize');
  b.decision('finish', 'ledgerize', `Journal roots computed for ${optionCount} option(s).`);
  const finishAgent = `finish-synthesize-asset-packs-for-${lens}-run`;
  b.agent('finish', finishAgent);
  b.decision('finish', finishAgent, `Selection envelope ready with ${optionCount} option(s).`);

  return b.steps;
}

/**
 * Demonstration pacing multiplier from env (`BITCODE_DEMONSTRATION_PACE`).
 * 1 = presenter pace (default), 0 = instant (tests), 0.5 = twice as fast.
 */
export function readDemonstrationPaceFactor(env: Record<string, string | undefined> = process.env): number {
  const raw = Number(env.BITCODE_DEMONSTRATION_PACE);
  return Number.isFinite(raw) && raw >= 0 ? Math.min(raw, 5) : 1;
}
