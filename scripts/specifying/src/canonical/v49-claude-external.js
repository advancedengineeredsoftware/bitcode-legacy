// @ts-check

/**
 * V49 Gate 6 — Claude External proof builder.
 *
 * Gate 6 binds the hosted remote MCP server (bearer-gated, scope-filtered,
 * shared product tool registry), the OAuth 2.1 authorization server (RFC 8414
 * / 9728 metadata, dynamic registration, PKCE S256, single-use codes, refresh
 * rotation with reuse detection, revocation, hash-only storage), the Claude
 * card in Externals, the product plugin, and the API-key repair. Predicates
 * bind source, tests, migration, living CI, and SPEC law; the artifact is
 * source-safe metadata only.
 */

import crypto from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');

export const V49_CLAUDE_EXTERNAL_ARTIFACT_PATH = '.proofs/v49/claude-external.json';
export const V49_CLAUDE_EXTERNAL_SCHEMA_ID = 'bitcode.v49.claudeExternal.v1';
export const V49_CLAUDE_EXTERNAL_VERSION = 'V49';
export const V49_CLAUDE_EXTERNAL_CURRENT_TARGET = 'V48';
export const V49_CLAUDE_EXTERNAL_SOURCE_SAFETY_VERDICT = 'source-safe-claude-external';
export const V49_CLAUDE_EXTERNAL_SCOPES = Object.freeze(['deposits', 'reads', 'packs']);
export const V49_CLAUDE_EXTERNAL_TOOLS = Object.freeze(['deposit', 'read', 'packs', 'measure', 'auxiliary']);

const SOURCE_ROOTS = Object.freeze({
  spec: '.specifications/BITCODE_SPEC_V49.md',
  registry: 'packages/mcp-generics/src/bitcode-product-tools.ts',
  registryIndex: 'packages/mcp-generics/src/index.ts',
  stdioTools: 'apps/mcp/src/tools/product-tools.ts',
  mcpRoute: 'apps/uapi/app/api/mcp/route.ts',
  mcpServer: 'apps/uapi/lib/mcp/bitcode-mcp-server.ts',
  mcpTools: 'apps/uapi/lib/mcp/bitcode-mcp-tools.ts',
  mcpTransport: 'apps/uapi/lib/mcp/json-response-transport.ts',
  oauthService: 'apps/uapi/lib/oauth/oauth-service.ts',
  oauthRepository: 'apps/uapi/lib/oauth/oauth-repository.ts',
  oauthCrypto: 'apps/uapi/lib/oauth/oauth-crypto.ts',
  oauthHttp: 'apps/uapi/lib/oauth/oauth-http.ts',
  resourceMetadataRoute: 'apps/uapi/app/.well-known/oauth-protected-resource/[[...path]]/route.ts',
  serverMetadataRoute: 'apps/uapi/app/.well-known/oauth-authorization-server/[[...path]]/route.ts',
  registerRoute: 'apps/uapi/app/api/oauth/register/route.ts',
  tokenRoute: 'apps/uapi/app/api/oauth/token/route.ts',
  revokeRoute: 'apps/uapi/app/api/oauth/revoke/route.ts',
  consentRoute: 'apps/uapi/app/api/oauth/authorize/route.ts',
  consentPage: 'apps/uapi/app/oauth/authorize/page.tsx',
  migration: 'supabase/migrations/20261019120000_v49_claude_external_oauth.sql',
  depositRoute: 'apps/uapi/app/api/deposit/synthesize-options/route.ts',
  depositCore: 'apps/uapi/app/api/deposit/synthesize-options/start-deposit-synthesis.ts',
  readRoute: 'apps/uapi/app/api/read/synthesize-options/route.ts',
  readCore: 'apps/uapi/app/api/read/synthesize-options/start-read-synthesis.ts',
  claudeRoute: 'apps/uapi/app/api/auxillaries/claude/route.ts',
  claudeCard: 'apps/uapi/components/auxillaries/AuxillariesExternalsPane/ExternalsClaudeCard/ExternalsClaudeCard.tsx',
  claudeHook: 'apps/uapi/components/auxillaries/AuxillariesExternalsPane/hooks/use-claude-external.ts',
  externalsState: 'apps/uapi/components/auxillaries/AuxillariesExternalsPane/hooks/use-externals-pane-state.ts',
  apiKeysRoute: 'apps/uapi/app/api/auxillaries/api-keys/route.ts',
  pluginMcp: 'apps/claude/.mcp.json',
  pluginManifest: 'apps/claude/.claude-plugin/plugin.json',
  pluginSkill: 'apps/claude/skills/bitcode/SKILL.md',
  developerManifest: 'apps/claude/developer/.claude-plugin/plugin.json',
  developerMcp: 'apps/claude/developer/.mcp.json',
  serviceTest: 'apps/uapi/tests/lib/oauthService.test.ts',
  e2eTest: 'apps/uapi/tests/api/claudeExternalMcp.test.ts',
  cardTest: 'apps/uapi/tests/externalsClaudeCard.test.tsx',
  apiKeysTest: 'apps/uapi/tests/apiKeysRoutes.test.ts',
  localCi: 'scripts/run-bitcode-local-ci.mjs',
  packageJson: 'package.json',
  protocolIndex: 'scripts/specifying/src/index.js',
  protocolTypes: 'scripts/specifying/src/index.d.ts',
  generator: 'scripts/generate-v49-claude-external.mjs',
  checker: 'scripts/check-v49-gate6-claude-external.mjs',
  protocolTest: 'scripts/specifying/test/v49-claude-external.test.js',
});

function digest(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, 24);
}

function readSource(repoRoot, sourcePath) {
  const absolutePath = path.join(repoRoot, sourcePath);
  return existsSync(absolutePath) ? readFileSync(absolutePath, 'utf8') : '';
}

function predicateResult(id, sourcePath, passed) {
  return { id, sourcePath, passed: Boolean(passed) };
}

/**
 * @param {string} repoRoot
 */
function buildPredicateResults(repoRoot) {
  /** @type {Record<string, string>} */
  const s = Object.fromEntries(
    Object.entries(SOURCE_ROOTS).map(([key, sourcePath]) => [key, readSource(repoRoot, sourcePath)]),
  );
  return [
    predicateResult(
      'shared-product-tool-registry',
      SOURCE_ROOTS.registry,
      V49_CLAUDE_EXTERNAL_TOOLS.every((name) => s.registry.includes(`name: '${name}'`)) &&
        s.registry.includes("BITCODE_MCP_SCOPES = ['deposits', 'reads', 'packs']") &&
        s.registryIndex.includes("export * from './bitcode-product-tools'") &&
        s.stdioTools.includes('BitcodeMcpPacksInputSchema'),
    ),
    predicateResult(
      'remote-mcp-bearer-gated',
      SOURCE_ROOTS.mcpRoute,
      s.mcpRoute.includes('verifyAccessToken') &&
        s.mcpRoute.includes("'WWW-Authenticate': mcpWwwAuthenticate") &&
        s.oauthHttp.includes('resource_metadata=') &&
        s.e2eTest.includes('rejects MCP requests without a valid bearer token'),
    ),
    predicateResult(
      'streamable-http-json-response',
      SOURCE_ROOTS.mcpTransport,
      s.mcpTransport.includes('export class JsonResponseTransport') &&
        s.mcpRoute.includes('status: 202') &&
        s.e2eTest.includes("method: 'initialize'"),
    ),
    predicateResult(
      'scopes-gate-tools',
      SOURCE_ROOTS.mcpServer,
      s.mcpServer.includes('bitcodeProductToolsForScopes(scopes)') &&
        s.mcpServer.includes('!input.scopes.includes(tool.scope)') &&
        s.e2eTest.includes('"deposits" scope'),
    ),
    predicateResult(
      'oauth-metadata-rfc8414-rfc9728',
      SOURCE_ROOTS.oauthHttp,
      s.oauthHttp.includes("code_challenge_methods_supported: ['S256']") &&
        s.oauthHttp.includes('authorization_servers: [origin]') &&
        s.resourceMetadataRoute.includes('buildProtectedResourceMetadata') &&
        s.serverMetadataRoute.includes('buildAuthorizationServerMetadata') &&
        s.e2eTest.includes('publishes RFC 9728 and RFC 8414 metadata'),
    ),
    predicateResult(
      'dynamic-registration-public-clients',
      SOURCE_ROOTS.registerRoute,
      s.registerRoute.includes('registerClient') &&
        s.oauthService.includes("token_endpoint_auth_method: 'none'") &&
        s.oauthService.includes('export function isAllowedRedirectUri') &&
        s.serviceTest.includes('registers public clients and rejects unsafe redirect URIs'),
    ),
    predicateResult(
      'pkce-s256-single-use-codes',
      SOURCE_ROOTS.oauthService,
      s.oauthCrypto.includes('export function verifyPkceS256') &&
        s.oauthService.includes("params.get('code_challenge_method') !== 'S256'") &&
        s.oauthService.includes('Authorization code was already used.') &&
        s.serviceTest.includes('issues tokens for a verified code exactly once, and replay revokes them'),
    ),
    predicateResult(
      'refresh-rotation-reuse-revokes-family',
      SOURCE_ROOTS.oauthService,
      s.oauthService.includes('repository.markRotated(token.id') &&
        s.oauthService.includes('Refresh token was already used.') &&
        s.oauthRepository.includes(".is('rotated_at', null)") &&
        s.serviceTest.includes('rotates refresh tokens and revokes the family on reuse'),
    ),
    predicateResult(
      'revocation-yields-401',
      SOURCE_ROOTS.revokeRoute,
      s.revokeRoute.includes('getOAuthService().revoke(params.token)') &&
        s.e2eTest.includes('revocation turns the next MCP call into 401'),
    ),
    predicateResult(
      'hash-only-storage-and-ttls',
      SOURCE_ROOTS.migration,
      s.migration.includes('token_hash text not null unique') &&
        s.migration.includes('code_hash text not null unique') &&
        s.migration.includes('enable row level security') &&
        s.oauthCrypto.includes('OAUTH_ACCESS_TOKEN_TTL_MS = 60 * 60 * 1000') &&
        s.oauthCrypto.includes('OAUTH_REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000') &&
        s.oauthCrypto.includes('OAUTH_AUTHORIZATION_CODE_TTL_MS = 10 * 60 * 1000') &&
        s.serviceTest.includes('expect(JSON.stringify(memory.tokens)).not.toContain(issued.access_token)'),
    ),
    predicateResult(
      'consent-requires-session-same-origin',
      SOURCE_ROOTS.consentRoute,
      s.consentRoute.includes('Cross-origin consent is not allowed.') &&
        s.consentRoute.includes('A Bitcode session is required.') &&
        s.consentPage.includes('data-testid="oauth-consent"') &&
        s.e2eTest.includes('requires the session and same origin for consent'),
    ),
    predicateResult(
      'tools-dispatch-like-website',
      SOURCE_ROOTS.mcpTools,
      s.depositRoute.includes('startDepositSynthesisForUser') &&
        s.readRoute.includes('startReadSynthesisForUser') &&
        s.depositCore.includes('export async function startDepositSynthesisForUser') &&
        s.readCore.includes('export async function startReadSynthesisForUser') &&
        s.mcpTools.includes('startReadSynthesisForUser({ userId, body: args })'),
    ),
    predicateResult(
      'packs-source-safe-and-own-slice',
      SOURCE_ROOTS.mcpTools,
      s.mcpTools.includes('function sellerSlice') &&
        s.mcpTools.includes('toUnpaidReadOptionsPresentation') &&
        s.e2eTest.includes('projects owned and sold packs without other sellers'),
    ),
    predicateResult(
      'claude-card-grants-revoke',
      SOURCE_ROOTS.claudeCard,
      s.claudeCard.includes('externals-claude-connector-url') &&
        s.claudeCard.includes('Revoke') &&
        s.claudeRoute.includes('revokeClientForUser') &&
        s.claudeHook.includes('/api/auxillaries/claude') &&
        s.cardTest.includes('lists grants, shows the connector, and revokes'),
    ),
    predicateResult(
      'claude-satisfies-externals-step',
      SOURCE_ROOTS.externalsState,
      s.externalsState.includes('hasValidGitHubConnection || hasClaudeConnection') &&
        s.oauthRepository.includes("provider: 'anthropic-claude'") &&
        s.oauthService.includes('setClaudeConnection(userId, false'),
    ),
    predicateResult(
      'plugin-targets-remote-server',
      SOURCE_ROOTS.pluginMcp,
      s.pluginMcp.includes('"type": "http"') &&
        s.pluginMcp.includes('/api/mcp') &&
        s.pluginSkill.includes('name: bitcode') &&
        s.developerManifest.includes('"bitcode-developer"') &&
        s.developerMcp.includes('apps/mcp/src/index.ts'),
    ),
    predicateResult(
      'api-keys-hashed',
      SOURCE_ROOTS.apiKeysRoute,
      s.apiKeysRoute.includes('key_hash: hashApiKey(apiKey)') &&
        !s.apiKeysRoute.includes('key: apiKey') &&
        s.migration.includes('alter table public.user_api_keys drop column key') &&
        s.apiKeysTest.includes('only the SHA-256 hash and expires_at are stored'),
    ),
    predicateResult(
      'living-ci-runs-claude-external-tests',
      SOURCE_ROOTS.localCi,
      s.localCi.includes("'gate-test-claude-external'"),
    ),
    predicateResult(
      'spec-carries-claude-external-law',
      SOURCE_ROOTS.spec,
      ['### C-2 Remote MCP server', '### C-3 OAuth 2.1 authorization server', '### C-5a Realization map (binding paths)', '### C-6 Completion'].every(
        (heading) => s.spec.includes(heading),
      ),
    ),
    predicateResult(
      'package-json-exposes-gate6',
      SOURCE_ROOTS.packageJson,
      s.packageJson.includes('"generate:v49-claude-external"') &&
        s.packageJson.includes('"check:v49-gate6"') &&
        s.protocolIndex.includes('buildV49ClaudeExternal') &&
        s.protocolTypes.includes('buildV49ClaudeExternal') &&
        s.generator.includes('buildV49ClaudeExternal') &&
        s.checker.includes('V49 Gate 6 Claude External check') &&
        s.protocolTest.includes('buildV49ClaudeExternal'),
    ),
  ];
}

export function buildV49ClaudeExternal({ repoRoot = DEFAULT_REPO_ROOT } = {}) {
  const predicateResults = buildPredicateResults(repoRoot);
  const failedPredicateIds = predicateResults.filter((p) => !p.passed).map((p) => p.id);
  const sourceRoots = Object.fromEntries(
    Object.entries(SOURCE_ROOTS).map(([key, sourcePath]) => [key, `${sourcePath}:${digest(readSource(repoRoot, sourcePath))}`]),
  );
  const artifactRoot = `v49-claude-external:${digest(JSON.stringify({ sourceRoots }))}`;
  return {
    artifactId: 'v49-claude-external',
    schemaId: V49_CLAUDE_EXTERNAL_SCHEMA_ID,
    version: V49_CLAUDE_EXTERNAL_VERSION,
    currentTarget: V49_CLAUDE_EXTERNAL_CURRENT_TARGET,
    artifactPath: V49_CLAUDE_EXTERNAL_ARTIFACT_PATH,
    sourceSafetyVerdict: V49_CLAUDE_EXTERNAL_SOURCE_SAFETY_VERDICT,
    scopes: [...V49_CLAUDE_EXTERNAL_SCOPES],
    tools: [...V49_CLAUDE_EXTERNAL_TOOLS],
    oauthLaw: {
      grantTypes: ['authorization_code', 'refresh_token'],
      codeChallengeMethods: ['S256'],
      clientAuthentication: 'none',
      accessTokenTtlSeconds: 3600,
      refreshTokenTtlDays: 30,
      authorizationCodeTtlMinutes: 10,
      refreshRotation: 'rotate-on-use; reuse revokes family',
      storage: 'sha256-hash-only',
    },
    predicateResults,
    sourceRoots,
    artifactRoot,
    coverage: {
      requiredPredicateCount: predicateResults.length,
      passedPredicateCount: predicateResults.length - failedPredicateIds.length,
      failedPredicateIds,
      anthropicCredentialsStored: false,
      plaintextTokensStored: false,
      sourceSafeMetadataOnly: true,
      protectedSourceVisible: false,
    },
    passed: failedPredicateIds.length === 0,
  };
}

export const V49_CLAUDE_EXTERNAL_SOURCE_ROOTS = Object.freeze({ ...SOURCE_ROOTS });
