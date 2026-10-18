/**
 * Model-call accounting for the quick invariant (Q-5): exactly one tracked
 * `llm` node per quick run. Tracked calls are the `llm:*` children that
 * AgentLLMsRegistry writes (`llm/status`), walked like
 * sumLlmTokensFromExecutionTree.
 */

type ExecutionNode = {
  get?: (namespace: string, key: string) => unknown;
  children?: Map<string, unknown> | unknown[] | { values?: () => IterableIterator<unknown> };
};

export function countLlmCallsFromExecutionTree(execution: ExecutionNode): number {
  let count = 0;
  const walk = (node: any) => {
    if (!node) return;
    try {
      const status = node.get?.('llm', 'status');
      if (status === 'success' || status === 'failed') count += 1;
    } catch {
      /* ignore unreadable nodes */
    }
    const children = node.children;
    if (!children) return;
    if (typeof children.values === 'function') {
      for (const child of children.values()) walk(child);
      return;
    }
    if (Array.isArray(children)) {
      for (const child of children) walk(child);
    }
  };
  walk(execution);
  return count;
}
