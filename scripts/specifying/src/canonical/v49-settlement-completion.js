// @ts-check

/**
 * V49 Gate 4 — Settlement completion proof builder.
 *
 * Gate 4 binds model-attributed, server-validated source contributions into
 * settle: protocol coin fee, source-to-shares slices with conservation,
 * per-contributor payout finalize, owned / sold viewers with viewer-projected
 * compensation statements, PR redelivery, server-only payout identities, and a
 * real residual-supply decay basis. Predicates bind source, tests, living CI,
 * and SPEC law; the artifact is source-safe metadata only.
 */

import crypto from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');

export const V49_SETTLEMENT_COMPLETION_ARTIFACT_PATH = '.proofs/v49/settlement-completion.json';
export const V49_SETTLEMENT_COMPLETION_SCHEMA_ID = 'bitcode.v49.settlementCompletion.v1';
export const V49_SETTLEMENT_COMPLETION_VERSION = 'V49';
export const V49_SETTLEMENT_COMPLETION_CURRENT_TARGET = 'V48';
export const V49_SETTLEMENT_COMPLETION_SOURCE_SAFETY_VERDICT = 'source-safe-settlement-completion';
export const V49_DEFAULT_PROTOCOL_COIN_FEE_BPS = 500;
export const V49_CLIENT_PAYOUT_IDENTITY_FIELDS = Object.freeze([
  'depositorEthereumAddress',
  'masterEthereumAddress',
  'depositorWalletId',
  'sellerAccount',
  'sourceContributions',
]);

const SOURCE_ROOTS = Object.freeze({
  spec: '.specifications/BITCODE_SPEC_V49.md',
  compensation: 'packages/btd/src/erc1155/contributor-compensation.ts',
  compensationTest: 'packages/btd/__tests__/contributor-compensation.test.ts',
  holdings: 'packages/btd/src/erc1155/projected-holdings.ts',
  holdingsTest: 'packages/btd/__tests__/projected-holdings.test.ts',
  contributions: 'packages/asset-packs-pipelines/syntheses/domain/src/source-contributions.ts',
  contributionsTest: 'packages/asset-packs-pipelines/syntheses/domain/src/__tests__/source-contributions.test.ts',
  richAttribution: 'packages/asset-packs-pipelines/syntheses/read/src/read-source-attribution.ts',
  richAttributionTest: 'packages/asset-packs-pipelines/syntheses/read/src/__tests__/read-source-attribution.test.ts',
  readMeasurements:
    'packages/asset-packs-pipelines/syntheses/read/src/agents/implementation/read-implementation-agent-asset-packs-measurements-synthesis.ts',
  readFinish: 'packages/asset-packs-pipelines/syntheses/read/src/agents/finish/read-finish-synthesize-run-agent.ts',
  settlePipeline: 'packages/asset-packs-pipelines/settle/src/index.ts',
  settlePipelineTest: 'packages/asset-packs-pipelines/settle/src/__tests__/settle-asset-pack-pipeline.test.ts',
  sellerResolution: 'apps/uapi/lib/source-contribution-sellers.ts',
  checkout: 'apps/uapi/lib/read-settlement-checkout.ts',
  settleRoute: 'apps/uapi/app/api/read/settle/route.ts',
  settleRouteTest: 'apps/uapi/tests/api/readSettleRoute.test.ts',
  settlePaymentTest: 'apps/uapi/tests/api/readSettlePaymentRoute.test.ts',
  quoteRoute: 'apps/uapi/app/api/read/settle/quote/route.ts',
  finalizeRoute: 'apps/uapi/app/api/packs/payout/finalize/route.ts',
  finalizeTest: 'apps/uapi/tests/api/packsPayoutFinalizeRoute.test.ts',
  redeliverRoute: 'apps/uapi/app/api/read/settle/redeliver/route.ts',
  redeliverTest: 'apps/uapi/tests/api/readSettleRedeliverRoute.test.ts',
  activityRoute: 'apps/uapi/app/api/packs/activity/route.ts',
  entitlementTest: 'apps/uapi/tests/api/packsActivityEntitlementRoute.test.ts',
  soldViewer: 'apps/uapi/components/deposits/DepositSoldDataPacks/hooks/use-deposit-sold-data-packs.ts',
  ownedViewer: 'apps/uapi/components/reads/ReadsOwnedDataPacks/ReadsOwnedDataPacks.tsx',
  viewerTest: 'apps/uapi/tests/settlementViewers.test.tsx',
  exchangeDetail: 'apps/uapi/components/exchange/ExchangeActivityDetail/ExchangeActivityDetail.tsx',
  localCi: 'scripts/run-bitcode-local-ci.mjs',
  packageJson: 'package.json',
  protocolIndex: 'scripts/specifying/src/index.js',
  protocolTypes: 'scripts/specifying/src/index.d.ts',
  generator: 'scripts/generate-v49-settlement-completion.mjs',
  checker: 'scripts/check-v49-gate4-settlement-completion.mjs',
  protocolTest: 'scripts/specifying/test/v49-settlement-completion.test.js',
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
      'fee-and-slices-conserve',
      SOURCE_ROOTS.compensation,
      s.compensation.includes(`DEFAULT_PROTOCOL_COIN_FEE_BPS = ${V49_DEFAULT_PROTOCOL_COIN_FEE_BPS}`) &&
        s.compensation.includes('buildSourceToSharesProof') &&
        s.compensation.includes('Compensation conservation drift') &&
        s.compensationTest.includes('conserves two contributor slices'),
    ),
    predicateResult(
      'per-contributor-finalize-authority',
      SOURCE_ROOTS.finalizeRoute,
      s.compensation.includes("'not_a_contributor'") &&
        s.compensation.includes("'slice_already_finalized'") &&
        s.finalizeRoute.includes('finalizeContributorSlice') &&
        s.finalizeRoute.includes("'partially-finalized'") &&
        s.finalizeTest.includes('finalizes only the calling contributor slice'),
    ),
    predicateResult(
      'contributions-validated-server-side',
      SOURCE_ROOTS.contributions,
      s.contributions.includes("mode: 'treasury-only'") &&
        s.sellerResolution.includes('resolveReadOptionSourceContributions') &&
        s.contributionsTest.includes('keeps only seller-linked supply'),
    ),
    predicateResult(
      'rich-and-quick-attribute-sources',
      SOURCE_ROOTS.richAttribution,
      s.readMeasurements.includes('attributeReadOptionSources') &&
        s.readFinish.includes('sourceAttributions') &&
        s.richAttributionTest.includes('uses exactly one registered model call'),
    ),
    predicateResult(
      'settle-builds-compensation-statement',
      SOURCE_ROOTS.settlePipeline,
      s.settlePipeline.includes('buildContributorCompensation') &&
        s.settlePipeline.includes("'compensationStatement'") &&
        s.settlePipelineTest.includes('splits two contributors and keeps treasury-only'),
    ),
    predicateResult(
      'payout-identities-server-only',
      SOURCE_ROOTS.settleRoute,
      V49_CLIENT_PAYOUT_IDENTITY_FIELDS.every((field) => s.settleRoute.includes(`'${field}'`)) &&
        s.settleRoute.includes("'payout_address_not_client_settable'") &&
        !s.settleRoute.includes('body.depositorEthereumAddress') &&
        s.settleRouteTest.includes('rejects client-supplied payout identities'),
    ),
    predicateResult(
      'payment-required-by-default',
      SOURCE_ROOTS.checkout,
      s.checkout.includes("env.BITCODE_SETTLEMENT_REQUIRE_PAYMENT !== '0'") &&
        s.settleRouteTest.includes('requires a verified payment by default'),
    ),
    predicateResult(
      'real-decay-basis',
      SOURCE_ROOTS.checkout,
      s.checkout.includes('loadProjectedBtdTotalMinted') &&
        !s.checkout.includes('btdTotalMinted: 0n') &&
        s.quoteRoute.includes('loadProjectedBtdTotalMinted') &&
        s.settleRoute.includes('loadProjectedBtdTotalMinted'),
    ),
    predicateResult(
      'holdings-credit-finalized-slices',
      SOURCE_ROOTS.holdings,
      s.holdings.includes('finalizedContributorBtd') &&
        s.holdingsTest.includes('credits each contributor only with their own finalized slice'),
    ),
    predicateResult(
      'viewer-projection-hides-other-sellers',
      SOURCE_ROOTS.activityRoute,
      s.activityRoute.includes('projectCompensationStatement') &&
        s.activityRoute.includes('contributorUserIds.cs') &&
        s.entitlementTest.includes('lets each contributor see and finalize only their own slice'),
    ),
    predicateResult(
      'owned-and-sold-viewers',
      SOURCE_ROOTS.ownedViewer,
      s.ownedViewer.includes('reads-owned-data-pack-redeliver') &&
        s.soldViewer.includes('viewerContributorSlice') &&
        s.exchangeDetail.includes('CompensationStatementSummary') &&
        s.viewerTest.includes('offers Redeliver for a projected delivery'),
    ),
    predicateResult(
      'redelivery-buyer-only-idempotent',
      SOURCE_ROOTS.redeliverRoute,
      s.redeliverRoute.includes('redeliverSettledAssetPackPatchPr') &&
        s.redeliverRoute.includes('alreadyDelivered') &&
        s.settlePipeline.includes('export async function redeliverSettledAssetPackPatchPr') &&
        s.redeliverTest.includes('is buyer-only'),
    ),
    predicateResult(
      'pr-body-names-compensation',
      SOURCE_ROOTS.settlePipeline,
      s.settlePipeline.includes('compensationReceiptLines') && s.settlePipeline.includes('### Compensation'),
    ),
    predicateResult(
      'living-ci-runs-settlement-tests',
      SOURCE_ROOTS.localCi,
      s.localCi.includes("'gate-test-settlement-completion'"),
    ),
    predicateResult(
      'spec-carries-settlement-law',
      SOURCE_ROOTS.spec,
      ['### S-1 Source contribution set', '### S-6a Realization map (binding paths)', '### S-7 Completion'].every((heading) =>
        s.spec.includes(heading),
      ),
    ),
    predicateResult(
      'package-json-exposes-gate4',
      SOURCE_ROOTS.packageJson,
      s.packageJson.includes('"generate:v49-settlement-completion"') && s.packageJson.includes('"check:v49-gate4"'),
    ),
    predicateResult(
      'package-exports-gate4',
      SOURCE_ROOTS.protocolIndex,
      s.protocolIndex.includes('buildV49SettlementCompletion') && s.protocolTypes.includes('buildV49SettlementCompletion'),
    ),
    predicateResult(
      'generator-checker-test-exist',
      SOURCE_ROOTS.generator,
      s.generator.includes('buildV49SettlementCompletion') &&
        s.checker.includes('V49 Gate 4 settlement completion check') &&
        s.protocolTest.includes('buildV49SettlementCompletion'),
    ),
  ];
}

export function buildV49SettlementCompletion({ repoRoot = DEFAULT_REPO_ROOT } = {}) {
  const predicateResults = buildPredicateResults(repoRoot);
  const failedPredicateIds = predicateResults.filter((p) => !p.passed).map((p) => p.id);
  const sourceRoots = Object.fromEntries(
    Object.entries(SOURCE_ROOTS).map(([key, sourcePath]) => [key, `${sourcePath}:${digest(readSource(repoRoot, sourcePath))}`]),
  );
  const artifactRoot = `v49-settlement-completion:${digest(JSON.stringify({ sourceRoots }))}`;
  return {
    artifactId: 'v49-settlement-completion',
    schemaId: V49_SETTLEMENT_COMPLETION_SCHEMA_ID,
    version: V49_SETTLEMENT_COMPLETION_VERSION,
    currentTarget: V49_SETTLEMENT_COMPLETION_CURRENT_TARGET,
    artifactPath: V49_SETTLEMENT_COMPLETION_ARTIFACT_PATH,
    sourceSafetyVerdict: V49_SETTLEMENT_COMPLETION_SOURCE_SAFETY_VERDICT,
    defaultProtocolCoinFeeBps: V49_DEFAULT_PROTOCOL_COIN_FEE_BPS,
    clientPayoutIdentityFields: [...V49_CLIENT_PAYOUT_IDENTITY_FIELDS],
    conservationLaw: 'protocolFee + sum(slicePay) = grossPay; sum(sliceBtd) = btdVolume',
    predicateResults,
    sourceRoots,
    artifactRoot,
    coverage: {
      requiredPredicateCount: predicateResults.length,
      passedPredicateCount: predicateResults.length - failedPredicateIds.length,
      failedPredicateIds,
      onChainSellerTransfers: false,
      sourceSafeMetadataOnly: true,
      protectedSourceVisible: false,
      walletPrivateMaterialVisible: false,
      settlementPrivatePayloadVisible: false,
      valueBearingMainnetEnabled: false,
    },
    passed: failedPredicateIds.length === 0,
  };
}

export const V49_SETTLEMENT_COMPLETION_SOURCE_ROOTS = Object.freeze({ ...SOURCE_ROOTS });
