/**
 * Hosted MCP product tool execution (V49 Claude External law C-2), acting as
 * the OAuth-authorized Bitcode user. Synthesis tools call the same dispatch
 * cores as the website routes; read tools return source-safe projections
 * under the website's disclosure law (unpaid options never carry patches or
 * paths; sold views show only the caller's own contributor slice).
 */

import { supabaseAdmin } from '@bitcode/supabase';
import {
  BitcodeMcpAuxiliaryInputSchema,
  BitcodeMcpDepositInputSchema,
  BitcodeMcpMeasureInputSchema,
  BitcodeMcpPacksInputSchema,
  BitcodeMcpReadInputSchema,
} from '@bitcode/mcp-generics';
import { toUnpaidReadOptionsPresentation } from '@bitcode/asset-packs-pipelines-syntheses-domain/unpaid-option-disclosure';
import type { z } from 'zod';

import { startDepositSynthesisForUser } from '@/app/api/deposit/synthesize-options/start-deposit-synthesis';
import { startReadSynthesisForUser } from '@/app/api/read/synthesize-options/start-read-synthesis';

export interface BitcodeMcpToolContext {
  userId: string;
  origin: string;
}

export class BitcodeMcpToolError extends Error {}

type Row = Record<string, any>;
const SETTLE_SOURCE = 'read-settle-asset-pack';

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Row) : {};
}

function dispatchResult(result: { status: number; body: Record<string, unknown> }, origin: string, route: string) {
  if (result.status >= 400) {
    throw new BitcodeMcpToolError(String(result.body.error || `Dispatch failed (${result.status}).`));
  }
  const runId = String(result.body.runId || '');
  return {
    runId,
    status: 'dispatched',
    next: 'Call the packs tool with view=run and this runId until status is completed.',
    productUrl: `${origin}${route}`,
  };
}

/** Buyer-safe compensation summary: fee + contributor weights, no seller identities. */
function buyerCompensation(statementRaw: unknown) {
  const statement = record(statementRaw);
  if (!statement.schema) return null;
  const contributors = Array.isArray(statement.contributors) ? statement.contributors : [];
  return {
    mode: statement.mode ?? null,
    payAsset: statement.payAsset ?? null,
    grossPay: statement.grossPay ?? null,
    protocolCoinFeeBps: statement.protocolCoinFeeBps ?? null,
    protocolFee: statement.protocolFee ?? null,
    contributors: contributors.map((row: Row) => ({ weightBps: row.weightBps ?? null, status: row.status ?? null })),
  };
}

/** Seller view: only the caller's own slice (never other sellers' ids or accounts). */
function sellerSlice(statementRaw: unknown, userId: string) {
  const statement = record(statementRaw);
  const slice = (Array.isArray(statement.contributors) ? statement.contributors : []).find(
    (row: Row) => row?.sellerUserId === userId,
  );
  if (!slice) return null;
  const split = record(slice.finalizedSplit);
  return {
    weightBps: slice.weightBps ?? null,
    sliceBtd: slice.sliceBtd ?? null,
    slicePay: slice.slicePay ?? null,
    status: slice.status ?? null,
    finalizedSplit: slice.finalizedSplit
      ? { sellerBtdBps: split.sellerBtdBps, sellerBtd: split.sellerBtd, sellerPay: split.sellerPay, finalizedAt: split.finalizedAt }
      : null,
    payAsset: statement.payAsset ?? null,
    protocolCoinFeeBps: statement.protocolCoinFeeBps ?? null,
  };
}

function settleTitle(row: Row): string | null {
  const context = record(row.context);
  const output = record(row.output);
  return context.assetPackTitle || output.assetPackTitle || null;
}

async function loadOwnedPacks(userId: string, limit: number) {
  const { data } = await supabaseAdmin
    .from('executions')
    .select('id, created_at, output, context')
    .eq('user_id', userId)
    .eq('context->>source', SETTLE_SOURCE)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data || []).map((row: Row) => {
    const output = record(row.output);
    const context = record(row.context);
    return {
      settleRunId: row.id,
      settledAt: row.created_at,
      title: settleTitle(row),
      repositoryFullName: context.repositoryFullName ?? null,
      deliveryState: output.deliveryState ?? context.deliveryState ?? null,
      prUrl: output.prUrl ?? context.prUrl ?? null,
      paymentExplorerUrl: output.paymentExplorerUrl ?? null,
      compensation: buyerCompensation(output.compensationStatement),
    };
  });
}

async function loadSoldPacks(userId: string, limit: number) {
  const { data } = await supabaseAdmin
    .from('executions')
    .select('id, created_at, output, context')
    .eq('context->>source', SETTLE_SOURCE)
    .eq('status', 'completed')
    .or(`context->>sellerUserId.eq.${userId},context->contributorUserIds.cs.${JSON.stringify([userId])}`)
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data || [])
    .map((row: Row) => ({
      settleRunId: row.id,
      settledAt: row.created_at,
      title: settleTitle(row),
      slice: sellerSlice(record(row.output).compensationStatement, userId),
    }))
    .filter((pack: { slice: unknown }) => pack.slice);
}

async function loadOwnRun(userId: string, runId: string) {
  const { data } = await supabaseAdmin
    .from('executions')
    .select('id, status, created_at, completed_at, output, context')
    .eq('id', runId)
    .eq('user_id', userId)
    .maybeSingle();
  if (!data) throw new BitcodeMcpToolError('No synthesis run with that id belongs to your account.');
  const output = record(data.output);
  const context = record(data.context);
  const envelope = record(output.selectionEnvelope);
  const rawOptions = Array.isArray(output.options)
    ? output.options
    : Array.isArray(envelope.options)
      ? envelope.options
      : [];
  return {
    runId: data.id,
    status: data.status,
    synthesisMode: context.synthesisMode ?? null,
    repositoryFullName: context.repositoryFullName ?? null,
    createdAt: data.created_at,
    completedAt: data.completed_at ?? null,
    // Source-safe allowlist projection: title, summary, measurements, coverage %.
    options: toUnpaidReadOptionsPresentation(rawOptions, output.catalogSourcePathCount ?? null),
  };
}

function compactReading(row: Row) {
  return {
    measurementKind: row.measurementKind ?? row.kind ?? null,
    label: row.label ?? null,
    volume: typeof row.volume === 'number' ? row.volume : null,
    magnitude: typeof row.magnitude === 'number' ? row.magnitude : null,
    unit: row.unit ?? null,
    status: row.status ?? null,
    ...(row.benchmark ? { benchmark: row.benchmark } : {}),
  };
}

async function loadConnections(userId: string) {
  const { data } = await supabaseAdmin
    .from('user_connections')
    .select('provider, is_active, updated_at')
    .eq('user_id', userId);
  return (data || []) as Array<{ provider: string; is_active: boolean | null; updated_at: string | null }>;
}

type ToolHandler = (args: any, context: BitcodeMcpToolContext) => Promise<unknown>;

export const BITCODE_MCP_TOOL_HANDLERS: Record<string, ToolHandler> = {
  async deposit(args: z.infer<typeof BitcodeMcpDepositInputSchema>, { userId, origin }) {
    return dispatchResult(await startDepositSynthesisForUser({ userId, body: args }), origin, '/deposits');
  },

  async read(args: z.infer<typeof BitcodeMcpReadInputSchema>, { userId, origin }) {
    return dispatchResult(await startReadSynthesisForUser({ userId, body: args }), origin, '/reads');
  },

  async packs(args: z.infer<typeof BitcodeMcpPacksInputSchema>, { userId }) {
    if (args.view === 'run') {
      if (!args.runId) throw new BitcodeMcpToolError('runId is required for view=run.');
      return loadOwnRun(userId, args.runId);
    }
    return args.view === 'sold'
      ? { view: 'sold', packs: await loadSoldPacks(userId, args.limit) }
      : { view: 'owned', packs: await loadOwnedPacks(userId, args.limit) };
  },

  async measure(args: z.infer<typeof BitcodeMcpMeasureInputSchema>, { userId }) {
    const run = await loadOwnRun(userId, args.runId);
    return {
      runId: run.runId,
      status: run.status,
      options: run.options.map((option: Row) => {
        const measurements = record(option.measurements);
        return {
          index: option.index,
          title: option.title,
          evaluationFit: option.evaluationFit ?? null,
          absolutes: (Array.isArray(measurements.absolutes) ? measurements.absolutes : []).map(compactReading),
          relatives: (Array.isArray(measurements.relatives) ? measurements.relatives : []).map(compactReading),
        };
      }),
    };
  },

  async auxiliary(args: z.infer<typeof BitcodeMcpAuxiliaryInputSchema>, { userId, origin }) {
    const connections = await loadConnections(userId);
    const active = (provider: string) => connections.some((row) => row.provider === provider && row.is_active !== false);
    if (args.pane === 'externals') {
      return {
        pane: 'externals',
        github: { connected: active('github') },
        claude: { connected: active('anthropic-claude'), connectorUrl: `${origin}/api/mcp` },
        productUrl: `${origin}/?auxillary-open-to=externals`,
      };
    }
    if (args.pane === 'wallet') {
      return {
        pane: 'wallet',
        walletProviders: connections
          .filter((row) => row.provider !== 'github' && row.provider !== 'anthropic-claude')
          .map((row) => ({ provider: row.provider, active: row.is_active !== false })),
        productUrl: `${origin}/?auxillary-open-to=wallet`,
      };
    }
    const { data } = await supabaseAdmin.auth.admin.getUserById(userId);
    return {
      pane: 'profile',
      userId,
      email: data?.user?.email ?? null,
      productUrl: `${origin}/?auxillary-open-to=profile`,
    };
  },
};
