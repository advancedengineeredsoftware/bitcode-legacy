/**
 * Hosted Bitcode MCP server factory (V49 Claude External law C-2). One server
 * per HTTP request (stateless): tools/list and tools/call expose only the
 * product tools the bearer token's scopes allow; arguments are validated
 * against the shared registry schemas before any handler runs.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { BITCODE_PRODUCT_TOOLS, bitcodeProductToolsForScopes, getBitcodeProductTool } from '@bitcode/mcp-generics';
import { zodToJsonSchema } from 'zod-to-json-schema';

import { BITCODE_MCP_TOOL_HANDLERS, BitcodeMcpToolError, type BitcodeMcpToolContext } from './bitcode-mcp-tools';

export const BITCODE_MCP_SERVER_INFO = { name: 'bitcode', version: '1.0.0' } as const;

export const BITCODE_MCP_INSTRUCTIONS =
  'Bitcode measures and exchanges DataPacks of code. Use `read` with Evaluations to synthesize DataPack options ' +
  'for a repository, `deposit` to synthesize DataPacks to sell, then `packs` (view=run) to read the options. ' +
  '`packs` also lists DataPacks you own or sold; `measure` returns Absolute and Relative measurements.';

function textResult(payload: unknown, isError = false) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(payload, null, 2) }],
    ...(isError ? { isError: true } : { structuredContent: payload as Record<string, unknown> }),
  };
}

export function listBitcodeMcpTools(scopes: readonly string[]) {
  return bitcodeProductToolsForScopes(scopes).map((tool) => ({
    name: tool.name,
    title: tool.title,
    description: tool.description,
    inputSchema: zodToJsonSchema(tool.inputSchema, { target: 'jsonSchema7', $refStrategy: 'none' }) as {
      type: 'object';
      [key: string]: unknown;
    },
    annotations: { readOnlyHint: tool.readOnly, openWorldHint: false },
  }));
}

export function createBitcodeMcpServer(input: BitcodeMcpToolContext & { scopes: readonly string[] }) {
  const server = new Server(BITCODE_MCP_SERVER_INFO, {
    capabilities: { tools: {} },
    instructions: BITCODE_MCP_INSTRUCTIONS,
  });

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: listBitcodeMcpTools(input.scopes) }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const tool = getBitcodeProductTool(request.params.name);
    if (!tool || !BITCODE_PRODUCT_TOOLS.includes(tool)) {
      return textResult({ error: `Unknown tool: ${request.params.name}` }, true);
    }
    if (!input.scopes.includes(tool.scope)) {
      return textResult(
        { error: `This connection was not granted the "${tool.scope}" scope required by ${tool.name}.` },
        true,
      );
    }
    const parsed = tool.inputSchema.safeParse(request.params.arguments ?? {});
    if (!parsed.success) {
      return textResult({ error: 'Invalid arguments.', issues: parsed.error.issues.map((issue) => issue.message) }, true);
    }
    try {
      return textResult(await BITCODE_MCP_TOOL_HANDLERS[tool.name]!(parsed.data, input));
    } catch (error) {
      const message = error instanceof BitcodeMcpToolError ? error.message : 'The Bitcode tool failed.';
      return textResult({ error: message }, true);
    }
  });

  return server;
}
