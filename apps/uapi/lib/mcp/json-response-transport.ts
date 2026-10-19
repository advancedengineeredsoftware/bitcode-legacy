/**
 * In-process MCP transport for one Streamable HTTP POST (V49 C-2), stateless
 * and JSON-response mode: the route delivers the request's JSON-RPC
 * message(s) to the server and resolves once every request id has a
 * response. Notifications-only posts resolve immediately (HTTP 202).
 */

import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import type { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';

type RequestId = string | number;

function isRequest(message: JSONRPCMessage): message is JSONRPCMessage & { id: RequestId; method: string } {
  return 'method' in message && 'id' in message && message.id !== undefined;
}

export class JsonResponseTransport implements Transport {
  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage) => void;

  private readonly responses = new Map<RequestId, JSONRPCMessage>();
  private pending = new Set<RequestId>();
  private settle: (() => void) | null = null;

  async start(): Promise<void> {}

  async send(message: JSONRPCMessage): Promise<void> {
    if (('result' in message || 'error' in message) && 'id' in message && message.id !== undefined) {
      const id = message.id as RequestId;
      this.responses.set(id, message);
      this.pending.delete(id);
      if (this.pending.size === 0) this.settle?.();
    }
    // Server-initiated notifications/requests have no channel in JSON-response mode.
  }

  async close(): Promise<void> {
    this.settle?.();
    this.onclose?.();
  }

  /** Deliver one HTTP request's messages; resolve with responses in request order. */
  async handle(messages: JSONRPCMessage[]): Promise<JSONRPCMessage[]> {
    const requestIds = messages.filter(isRequest).map((message) => message.id);
    this.pending = new Set(requestIds);
    const done = new Promise<void>((resolve) => {
      this.settle = resolve;
    });
    for (const message of messages) this.onmessage?.(message);
    if (requestIds.length > 0) await done;
    return requestIds.map((id) => this.responses.get(id)).filter((message): message is JSONRPCMessage => Boolean(message));
  }
}
