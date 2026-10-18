/**
 * Read Implementation agent 4/4 — commercial NL (product re-implementation).
 *
 * Registry: implementation:read-implementation-agent-asset-packs-commercial-nl
 * Sequence: patch-plan → patchfile → measurements → THIS
 *
 * Domain base host only — never imports the deposit product package.
 * Product delta: Evaluation as demandContext for buyer framing.
 */

function findValue(execution: any, namespace: string, key: string): any {
  const local = execution?.get?.(namespace, key);
  if (local !== undefined) return local;
  return execution?.findUp?.(namespace, key);
}

export default async function runReadImplementationAgentAssetPacksCommercialNl(
  input: any,
  execution: any,
) {
  const evaluationText =
    findValue(execution, 'read', 'evaluation') ??
    findValue(execution, 'implementation', 'evaluation') ??
    input?.evaluation ??
    '';
  try {
    execution?.store?.('implementation', 'productLens', 'read');
    if (evaluationText) {
      execution?.store?.('implementation', 'evaluation', evaluationText);
      execution?.store?.('deposit', 'demandContext', [
        { topic: 'reader-evaluation', summary: String(evaluationText) },
      ]);
    }
  } catch {
    /* optional */
  }

  const { default: runBaseCommercialNl } = await import(
    '@bitcode/asset-packs-pipelines-syntheses-domain/agents/implementation/implementation-agent-asset-packs-commercial-nl'
  );
  return runBaseCommercialNl(
    {
      ...input,
      evaluation: evaluationText,
      demandContext: [{ topic: 'reader-evaluation', summary: String(evaluationText) }],
    },
    execution,
  );
}
