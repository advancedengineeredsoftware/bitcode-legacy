/**
 * Synthesis pipeline mode (V49 quick synthesis law Q-1).
 *
 * - `rich`: SDIVF agent roster (default).
 * - `quick`: one model call per run (`factoryExecutionPipelineQuick`).
 * - `demonstration`: curated paced replay (BITCODE_DEMONSTRATION_MODE).
 *
 * Demonstration keeps precedence unless BITCODE_DEMONSTRATION_SYNTHESIS=quick,
 * which lets demonstration runs use real quick inference.
 */

import { isBitcodeDemonstrationModeEnabled } from './demonstration/demonstration-mode';

export const SYNTHESIS_PIPELINE_MODES = ['rich', 'quick', 'demonstration'] as const;
export type SynthesisPipelineMode = (typeof SYNTHESIS_PIPELINE_MODES)[number];

/** Modes a request (or env default) may select explicitly. */
export const REQUESTABLE_SYNTHESIS_PIPELINES = ['rich', 'quick'] as const;
export type RequestableSynthesisPipeline = (typeof REQUESTABLE_SYNTHESIS_PIPELINES)[number];

export class InvalidSynthesisPipelineError extends Error {
  readonly code = 'invalid_synthesis_pipeline';
  constructor(value: unknown) {
    super(`synthesisPipeline must be one of ${REQUESTABLE_SYNTHESIS_PIPELINES.join(', ')}; received ${String(value)}.`);
  }
}

function asRequestable(value: unknown): RequestableSynthesisPipeline | null {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return (REQUESTABLE_SYNTHESIS_PIPELINES as readonly string[]).includes(normalized)
    ? (normalized as RequestableSynthesisPipeline)
    : null;
}

/**
 * Parse an optional request field. `undefined`/`null`/`''` mean "not requested";
 * any other non-requestable value throws InvalidSynthesisPipelineError (HTTP 400).
 */
export function parseRequestedSynthesisPipeline(value: unknown): RequestableSynthesisPipeline | null {
  if (value === undefined || value === null || value === '') return null;
  const parsed = asRequestable(value);
  if (!parsed) throw new InvalidSynthesisPipelineError(value);
  return parsed;
}

export function resolveSynthesisPipelineMode(
  input: { requested?: RequestableSynthesisPipeline | null } = {},
  env: Record<string, string | undefined> = process.env,
): SynthesisPipelineMode {
  if (
    isBitcodeDemonstrationModeEnabled(env) &&
    String(env.BITCODE_DEMONSTRATION_SYNTHESIS || '').trim().toLowerCase() !== 'quick'
  ) {
    return 'demonstration';
  }
  if (input.requested) return input.requested;
  return asRequestable(env.BITCODE_SYNTHESIS_PIPELINE) ?? 'rich';
}
