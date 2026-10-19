/**
 * Bitcode product MCP tool registry (V49 Claude External law C-2).
 *
 * One source of truth for tool names, scopes, descriptions, and input
 * schemas, shared by the hosted remote MCP server (`/api/mcp`, OAuth bearer)
 * and the stdio server (`apps/mcp`, API key). Each entry names the BTD MCP
 * tool contract it realizes; execution stays with each server.
 *
 * Scopes gate tools: `deposits` → deposit, `reads` → read, `packs` → packs,
 * measure, auxiliary.
 */

import { z } from 'zod';

export const BITCODE_MCP_SCOPES = ['deposits', 'reads', 'packs'] as const;
export type BitcodeMcpScope = (typeof BITCODE_MCP_SCOPES)[number];

const SYNTHESIS_PIPELINES = ['rich', 'quick'] as const;
const REPOSITORY_FULL_NAME = z
  .string()
  .regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/, 'owner/name')
  .describe('GitHub repository as owner/name (must be connected to your Bitcode account)');
const SOURCE_PATHS = z.array(z.string().min(1).max(400)).max(200);

export const BitcodeMcpDepositInputSchema = z.object({
  repositoryFullName: REPOSITORY_FULL_NAME,
  sourceBranch: z.string().max(200).optional().describe('Branch to synthesize from (default main)'),
  sourceCommit: z.string().max(80).optional().describe('Commit SHA to pin (optional)'),
  obfuscations: z
    .string()
    .max(8000)
    .optional()
    .describe('Obfuscations policy text: what to keep out of the DataPacks (optional)'),
  permissibleSources: SOURCE_PATHS.optional().describe('Paths DataPacks may draw from'),
  impermissibleSources: SOURCE_PATHS.optional().describe('Paths DataPacks must exclude'),
  synthesisPipeline: z.enum(SYNTHESIS_PIPELINES).optional().describe('quick = one model call; rich = full pipeline'),
});

export const BitcodeMcpReadInputSchema = z.object({
  repositoryFullName: REPOSITORY_FULL_NAME,
  evaluation: z
    .string()
    .min(10)
    .max(8000)
    .describe('Evaluations: how candidate DataPacks should be evaluated against this repository'),
  sourceBranch: z.string().max(200).optional(),
  sourceCommit: z.string().max(80).optional(),
  relevantPaths: SOURCE_PATHS.optional().describe('Paths that should steer the Evaluation'),
  irrelevantPaths: SOURCE_PATHS.optional().describe('Paths to de-emphasize'),
  benchmarkIds: z
    .array(z.string().regex(/^[a-z0-9][a-z0-9._-]*$/))
    .max(12)
    .optional()
    .describe('Declared benchmark ids from .bitcode/benchmarks.json to measure improvement on'),
  synthesisPipeline: z.enum(SYNTHESIS_PIPELINES).optional(),
});

export const BitcodeMcpPacksInputSchema = z.object({
  view: z
    .enum(['owned', 'sold', 'run'])
    .default('owned')
    .describe('owned = DataPacks you bought; sold = your contributor slices; run = one synthesis run'),
  runId: z.string().uuid().optional().describe('Synthesis run id (required for view=run)'),
  limit: z.number().int().min(1).max(50).default(20),
});

export const BitcodeMcpMeasureInputSchema = z.object({
  runId: z.string().uuid().describe('Synthesis run id whose options to measure'),
});

export const BitcodeMcpAuxiliaryInputSchema = z.object({
  pane: z.enum(['profile', 'wallet', 'externals']).describe('Account pane to summarize (read-only)'),
});

export interface BitcodeProductToolDefinition {
  /** Remote MCP tool name (`^[a-z_]+$`). */
  name: string;
  title: string;
  description: string;
  scope: BitcodeMcpScope;
  readOnly: boolean;
  /** BTD MCP tool contract this tool realizes on the stdio server. */
  contractToolId: string;
  inputSchema: z.ZodTypeAny;
}

export const BITCODE_PRODUCT_TOOLS: readonly BitcodeProductToolDefinition[] = Object.freeze([
  {
    name: 'deposit',
    title: 'Synthesize deposit DataPacks',
    description:
      'Start deposit option synthesis on one of your connected repositories. Returns a runId; use the packs tool ' +
      '(view=run) to read the options once the run completes.',
    scope: 'deposits',
    readOnly: false,
    contractToolId: 'bitcode://synthesize-asset-packs-for-deposit',
    inputSchema: BitcodeMcpDepositInputSchema,
  },
  {
    name: 'read',
    title: 'Synthesize read DataPacks',
    description:
      'Start read option synthesis: describe Evaluations for a repository; Bitcode synthesizes DataPack options ' +
      'measured as Absolute and Relative measurements (optionally benchmark deltas). Returns a runId.',
    scope: 'reads',
    readOnly: false,
    contractToolId: 'bitcode://synthesize-asset-packs-for-reads',
    inputSchema: BitcodeMcpReadInputSchema,
  },
  {
    name: 'packs',
    title: 'Your DataPacks',
    description:
      'List DataPacks you own (bought) or sold (your contributor compensation slices), or read one synthesis ' +
      'run with its source-safe options. Never returns unpaid source.',
    scope: 'packs',
    readOnly: true,
    contractToolId: 'bitcode://packs',
    inputSchema: BitcodeMcpPacksInputSchema,
  },
  {
    name: 'measure',
    title: 'DataPack measurements',
    description:
      'Source-safe Absolute and Relative measurements (including evaluation-fit and benchmark deltas) for the ' +
      'options of one of your synthesis runs.',
    scope: 'packs',
    readOnly: true,
    contractToolId: 'bitcode://measure',
    inputSchema: BitcodeMcpMeasureInputSchema,
  },
  {
    name: 'auxiliary',
    title: 'Account panes',
    description: 'Read-only summary of your Bitcode profile, wallet binding, or Externals (GitHub, Claude).',
    scope: 'packs',
    readOnly: true,
    contractToolId: 'bitcode://auxiliary-profile',
    inputSchema: BitcodeMcpAuxiliaryInputSchema,
  },
]);

export function getBitcodeProductTool(name: string): BitcodeProductToolDefinition | undefined {
  return BITCODE_PRODUCT_TOOLS.find((tool) => tool.name === name);
}

export function bitcodeProductToolsForScopes(scopes: readonly string[]): BitcodeProductToolDefinition[] {
  return BITCODE_PRODUCT_TOOLS.filter((tool) => scopes.includes(tool.scope));
}
