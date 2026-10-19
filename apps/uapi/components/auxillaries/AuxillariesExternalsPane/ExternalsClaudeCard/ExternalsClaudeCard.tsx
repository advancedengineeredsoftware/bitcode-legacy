"use client";

/**
 * Claude External card (V49 Claude External law C-4): connect Claude.ai,
 * Claude Desktop, or Claude Code to Bitcode through the remote MCP connector
 * (OAuth). Shows the connector URL, add instructions, active grants, and
 * Revoke. Bitcode never receives Anthropic credentials.
 */

import React, { useState } from 'react';

import type { ClaudeExternalState } from '../hooks/use-claude-external';

function CopyField({ label, value, testId }: { label: string; value: string; testId: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-2">
      <p className="text-[0.62rem] uppercase tracking-[0.16em] text-neutral-500">{label}</p>
      <div className="mt-1 flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate border border-white/10 bg-black/40 px-2 py-1 text-xs text-neutral-100" data-testid={testId}>
          {value}
        </code>
        <button
          type="button"
          className="border border-white/15 px-2 py-1 text-xs text-neutral-200"
          onClick={() => {
            void navigator.clipboard?.writeText(value).then(() => setCopied(true));
          }}
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}

function formatWhen(iso: string | null): string {
  if (!iso) return 'not yet used';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? 'unknown' : date.toLocaleString();
}

export default function ExternalsClaudeCard({ state }: { state: ClaudeExternalState }) {
  return (
    <section className="mt-4 border border-white/10 bg-white/[0.035] px-4 py-4" data-testid="externals-claude-card">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[0.68rem] uppercase tracking-[0.22em] text-orange-200/80">External</p>
          <h3 className="mt-1 text-base font-semibold text-white">Claude</h3>
        </div>
        <span
          data-testid="externals-claude-status"
          className={`border px-2 py-0.5 text-[0.65rem] uppercase tracking-[0.14em] ${
            state.connected ? 'border-emerald-300/40 text-emerald-100' : 'border-white/15 text-neutral-400'
          }`}
        >
          {state.connected ? 'Connected' : 'Not connected'}
        </span>
      </div>
      <p className="mt-2 text-sm leading-6 text-neutral-400">
        Let Claude deposit, read with Evaluations, and review your DataPacks through Bitcode&apos;s MCP connector. You
        approve access with your Bitcode account; Bitcode never sees your Anthropic credentials.
      </p>

      {state.connectorUrl ? <CopyField label="Connector URL" value={state.connectorUrl} testId="externals-claude-connector-url" /> : null}

      <ol className="mt-3 grid gap-1.5 text-xs leading-5 text-neutral-300">
        <li>
          <span className="text-neutral-100">Claude.ai / Desktop:</span> Settings → Connectors → Add custom connector →
          paste the connector URL, then approve on Bitcode.
        </li>
        <li>
          <span className="text-neutral-100">Claude Code:</span> run the command below, then <code>/mcp</code> to sign in.
        </li>
      </ol>
      {state.claudeCodeCommand ? (
        <CopyField label="Claude Code" value={state.claudeCodeCommand} testId="externals-claude-code-command" />
      ) : null}

      {state.error ? <p className="mt-3 text-xs text-rose-200/80">{state.error}</p> : null}

      {state.grants.length > 0 ? (
        <ul className="mt-4 grid gap-2" data-testid="externals-claude-grants">
          {state.grants.map((grant) => (
            <li key={grant.clientId} className="flex flex-wrap items-center justify-between gap-2 border border-white/10 bg-black/30 px-3 py-2 text-xs">
              <span>
                <span className="text-neutral-100">{grant.clientName}</span>
                <span className="ml-2 font-mono text-neutral-400">{grant.scopes.join(' · ')}</span>
                <span className="ml-2 text-neutral-500">last used {formatWhen(grant.lastUsedAt)}</span>
              </span>
              <button
                type="button"
                data-testid={`externals-claude-revoke-${grant.clientId}`}
                className="border border-rose-300/30 px-2 py-0.5 text-rose-100"
                onClick={() => void state.revoke(grant.clientId)}
              >
                Revoke
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
