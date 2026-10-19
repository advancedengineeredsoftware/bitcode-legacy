/**
 * V49 Gate 6 (C-4): the Claude External card shows the connector URL, add
 * instructions, active grants, and revokes a grant.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import ExternalsClaudeCard from '@/components/auxillaries/AuxillariesExternalsPane/ExternalsClaudeCard/ExternalsClaudeCard';
import { useClaudeExternal } from '@/components/auxillaries/AuxillariesExternalsPane/hooks/use-claude-external';

function Harness() {
  const state = useClaudeExternal(true);
  return <ExternalsClaudeCard state={state} />;
}

describe('Claude External card (V49 C-4)', () => {
  it('lists grants, shows the connector, and revokes', async () => {
    let grants = [
      { clientId: 'bcl_1', clientName: 'Claude', scopes: ['reads', 'packs'], lastUsedAt: null, createdAt: '2026-10-19T00:00:00Z' },
    ];
    const fetchMock = jest.fn(async (url: string, init?: { method?: string }) => {
      if (init?.method === 'DELETE') {
        grants = [];
        return { ok: true, json: async () => ({ ok: true }) };
      }
      return {
        ok: true,
        json: async () => ({
          ok: true,
          connectorUrl: 'https://bitcode.exchange/api/mcp',
          claudeCodeCommand: 'claude mcp add --transport http bitcode https://bitcode.exchange/api/mcp',
          connected: grants.length > 0,
          grants,
        }),
      };
    });
    (global as unknown as { fetch: unknown }).fetch = fetchMock;

    render(<Harness />);
    expect((await screen.findByTestId('externals-claude-connector-url')).textContent).toContain('https://bitcode.exchange/api/mcp');
    expect((screen.getByTestId('externals-claude-code-command')).textContent).toContain('claude mcp add --transport http bitcode');
    expect((await screen.findByTestId('externals-claude-grants')).textContent).toContain('reads · packs');
    expect((screen.getByTestId('externals-claude-status')).textContent).toContain('Connected');

    fireEvent.click(screen.getByTestId('externals-claude-revoke-bcl_1'));
    await waitFor(() => expect((screen.getByTestId('externals-claude-status')).textContent).toContain('Not connected'));
    expect(fetchMock).toHaveBeenCalledWith('/api/auxillaries/claude?clientId=bcl_1', { method: 'DELETE' });
  });
});
