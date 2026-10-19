/**
 * Claude External state for the Externals pane (V49 C-4): connector URL,
 * active grants, and revoke, from /api/auxillaries/claude.
 */

import { useCallback, useEffect, useState } from 'react';

export interface ClaudeExternalGrant {
  clientId: string;
  clientName: string;
  scopes: string[];
  lastUsedAt: string | null;
  createdAt: string;
}

export interface ClaudeExternalState {
  isLoading: boolean;
  connectorUrl: string | null;
  claudeCodeCommand: string | null;
  connected: boolean;
  grants: ClaudeExternalGrant[];
  error: string | null;
  revoke: (clientId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useClaudeExternal(enabled = true): ClaudeExternalState {
  const [isLoading, setIsLoading] = useState(enabled);
  const [connectorUrl, setConnectorUrl] = useState<string | null>(null);
  const [claudeCodeCommand, setClaudeCodeCommand] = useState<string | null>(null);
  const [grants, setGrants] = useState<ClaudeExternalGrant[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/auxillaries/claude');
      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.ok) throw new Error(payload?.error || 'Unable to load the Claude External.');
      setConnectorUrl(payload.connectorUrl ?? null);
      setClaudeCodeCommand(payload.claudeCodeCommand ?? null);
      setGrants(Array.isArray(payload.grants) ? payload.grants : []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load the Claude External.');
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const revoke = useCallback(
    async (clientId: string) => {
      const res = await fetch(`/api/auxillaries/claude?clientId=${encodeURIComponent(clientId)}`, { method: 'DELETE' });
      if (!res.ok) setError('Revoke failed — try again.');
      await refresh();
    },
    [refresh],
  );

  return {
    isLoading,
    connectorUrl,
    claudeCodeCommand,
    connected: grants.length > 0,
    grants,
    error,
    revoke,
    refresh,
  };
}
