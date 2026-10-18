/**
 * Strongly typed contracts for ExecutionPipelineSimpleSettleAssetPack and BitcodeERC1155
 * settlement artifacts. No `unknown` on settle/contract surfaces.
 */

import type { CompensationStatement, SettleContributionInput } from '@bitcode/btd/erc1155';
import type {
  AssetPackMeasurementsForSettlement,
  BitcodeErc1155State,
  RelativeRowInput,
  SettlementBtdFromRelativesResult,
  SerializedBitcodeErc1155State,
  UsdSpotBoard,
} from '@bitcode/btd/erc1155';

// ---------------------------------------------------------------------------
// AssetPack option (one settle run)
// ---------------------------------------------------------------------------

export interface SettleAssetPackPatchFileChange {
  path: string;
  op: 'create' | 'modify' | 'delete' | string;
  /** Optional new file body for create/modify when shipping from request SHA. */
  content?: string | null;
  language?: string | null;
}

export interface SettleAssetPackPatch {
  patchSummary?: string;
  path?: string;
  /** Source-safe patch descriptor fields; fileChanges used for PR ship. */
  format?: string;
  fileChanges?: SettleAssetPackPatchFileChange[];
}

export interface SettleAssetPackOption {
  id?: string;
  optionRoot?: string;
  measurementRoot?: string;
  title?: string;
  kind?: string;
  summary?: string;
  patch?: SettleAssetPackPatch | null;
  measurements: AssetPackMeasurementsForSettlement;
  confidence?: number | null;
  selectable?: boolean;
  settleable?: boolean;
}

export interface SettleRepositoryRef {
  url?: string | null;
  owner?: string | null;
  name?: string | null;
  branch?: string | null;
  commit?: string | null;
  fullName?: string | null;
}

// ---------------------------------------------------------------------------
// Payment / mempool (settle-btc)
// ---------------------------------------------------------------------------

export interface SettleBtcPaymentObservationInput {
  schema?: string;
  network?: string;
  status?: string;
  txId?: string | null;
  amountSats?: number | null;
  confirmedAt?: string | null;
  finality?: string | null;
  /** Pay rail the buyer used (ETH | BTC | SOL); never BTD. */
  payAsset?: string | null;
  /** This option's allocation of the paid amount (pay-asset base units). */
  allocatedPayAmount?: string | null;
  /** Block explorer link for the payment transaction. */
  explorerUrl?: string | null;
  /**
   * On-chain verification performed by the settle route before dispatch
   * (`bitcode.settle.pay-rail-verification`). When `ok`, settle-btc trusts it
   * instead of re-observing the chain.
   */
  verification?: {
    schema: string;
    ok: boolean;
    confirmed: boolean;
    blockTime?: number | null;
    paidAmount?: string;
    requiredAmount?: string;
    recipient?: string;
    network?: string;
  } | null;
}

export interface SettleBtcMempoolObservation {
  schema: 'bitcode.settle-btc.mempool-observation';
  txId: string;
  confirmed: boolean;
  blockHeight?: number | null;
  blockTime?: number | null;
  fee?: number | null;
  source?: string;
  error?: string;
}

export interface SettleBtcPaymentObservation {
  schema: 'bitcode.settle-asset-pack.payment-observation';
  agent: 'settle-btc';
  network: string;
  status: 'final' | 'observed' | 'observed-projection';
  txId: string | null;
  amountSats: number | null;
  confirmedAt: string;
  finality: string;
  mempool: SettleBtcMempoolObservation | null;
  note: string;
  payAsset?: string | null;
  allocatedPayAmount?: string | null;
  explorerUrl?: string | null;
  verification?: SettleBtcPaymentObservationInput['verification'];
}

// ---------------------------------------------------------------------------
// Stage artifacts
// ---------------------------------------------------------------------------

export interface SettleValidationBoundary {
  schema: 'bitcode.settle-asset-pack.validation';
  state: string;
  pipeline: 'settle-asset-pack-pipeline';
  selectedCount: 1;
  assetPackKey: string;
  cardinality: '1:1';
}

export interface MintBtdReceiptWire {
  kind: string;
  tokenId: string;
  to: string;
  amountBaseUnits: string;
  evaluationFitVolume: number;
  weightedRelativesSum: number;
  relativesCount: number;
  btdTotalMintedBefore: string;
  btdTotalMintedAfter: string;
  maxSupplyBaseUnits: string;
  assetPackKey: string;
  settlementSequence: string;
  proofRoot: string;
  issuedAt: string;
}

/** Seller must review and finalize BTD vs pay-asset split on /packs. */
export interface SettlePendingPayout {
  schema: 'bitcode.settle.pending-payout';
  status: 'pending-seller-review' | 'finalized';
  assetPackKey: string;
  sellerAccount: string;
  buyerAccount: string;
  masterAccount: string;
  btdVolume: string;
  payAmount: string;
  payAsset: 'ETH' | 'BTC' | 'SOL';
  evaluationFitVolume: number;
  quoteId: string;
  apTokenId: string;
  /** Buyer-entitled source-safe patch summary (full patch when entitled). */
  patchSummary?: string | null;
  sellerBtdBpsFinalized?: number | null;
  finalizedAt?: string | null;
  sellerBtd?: string | null;
  treasuryBtd?: string | null;
  sellerPay?: string | null;
  treasuryPay?: string | null;
}

export interface MintBtdArtifact {
  schema: 'bitcode.settle-asset-pack.mint-btd';
  agent: 'mint-btd';
  settlementBtd: SettlementBtdFromRelativesResult;
  receipt: MintBtdReceiptWire;
  masterAccount: string;
  masterBtdBalance: string;
  note: string;
}

export interface SettleBtdReceiptWire {
  /** BTD transfer receipt, or multi-rail pay observation (buyer pays ETH/BTC/SOL). */
  kind: 'btd.erc1155.transfer' | 'settle.pay-rail';
  tokenId: string;
  from: string;
  to: string;
  amountBaseUnits: string;
  assetPackKey: string;
  settlementSequence: string;
  proofRoot: string;
  issuedAt: string;
}

export interface SettleBtdArtifact {
  schema: 'bitcode.settle-asset-pack.settle-btd';
  agent: 'settle-btd';
  receipt: SettleBtdReceiptWire;
  buyerAccount: string;
  buyerBtdBalance: string;
  masterBtdBalance: string;
  note: string;
}

export interface SettleAssetPackReceiptWire {
  kind: 'asset-pack.erc1155.co-own';
  tokenId: string;
  assetPackKey: string;
  addedAccount: string;
  coOwners: string[];
  removedPriorOwner: false;
  settlementSequence: string;
  proofRoot: string;
  issuedAt: string;
}

export interface SettleAssetPackArtifact {
  schema: 'bitcode.settle-asset-pack.settle-asset-pack';
  agent: 'settle-asset-pack';
  receipt: SettleAssetPackReceiptWire;
  coOwners: string[];
  removedPriorOwner: false;
  note: string;
}

export interface SettleRightsArtifact {
  schema: 'bitcode.settle-asset-pack.rights-transfer';
  readerWalletId: string | null;
  depositorWalletId: string | null;
  buyerEthereumAddress: string;
  /** True once BTD volume is minted/escrowed for the settlement. */
  btdMinted: boolean;
  /** True once BTD (or rights) transfer to the buyer path is complete. */
  btdTransferred: boolean;
  amountBaseUnits: string;
  /** pending-finalize while pay-rail / seller split still open. */
  status: 'transferred' | 'pending-finalize';
}

export interface SettleShippableRepository {
  url: string | null;
  owner: string | null;
  name: string | null;
  branch: string;
  commit: string | null;
  fullName: string | null;
}

export interface SettleShippable {
  schema: 'bitcode.settle-asset-pack.shippable';
  deliveryMechanism: 'pull_request';
  repository: SettleShippableRepository;
  headBranch: string;
  baseBranch: string;
  patchCount: number;
  optionTitle: string;
  measurements: AssetPackMeasurementsForSettlement | null;
  prUrl: string | null;
  status: 'projected' | 'opened' | 'failed';
  prError: string | null;
  note: string;
}

export interface SourceSafePackMeasurementRow {
  kind: string;
  category: 'absolute' | 'relative';
  volume: number | null;
  magnitude: number | null;
  unit: string | null;
  weight: number | null;
}

export interface PackActivityPaymentObservation {
  schema: string | undefined;
  network: string;
  status: string | null;
  txId: string | null;
  amountSats: number | null;
  finality: string | null;
}

export interface PackActivityShippableSummary {
  schema: string;
  deliveryMechanism: string;
  repository: SettleShippableRepository | null;
  headBranch: string | null;
  baseBranch: string | null;
  patchCount: number;
  prUrl: string | null;
  status: string;
  note: string | null;
}

export interface SettlePackActivity {
  schema: 'bitcode.packs.activity';
  surface: '/packs';
  packActivityType: 'settled-assetpack';
  activityType: 'settled-assetpack';
  settledAt: string;
  repositoryFullName: string | null;
  optionCount: 1;
  assetPackKey: string | null;
  assetPackTitle: string | null;
  optionTitles: string[];
  measurements: SourceSafePackMeasurementRow[];
  settlementState: 'settled';
  rightsState: 'btd-rights-transferred';
  deliveryState: string;
  deliveryReference: string | null;
  prUrl: string | null;
  paymentObservation: PackActivityPaymentObservation | null;
  mintBtd: {
    evaluationFitVolume: number | null;
    amountBaseUnits: string | null;
    masterAccount: string | null;
  } | null;
  settleBtd: {
    buyerAccount: string | null;
    amountBaseUnits: string | null;
  } | null;
  settleAssetPack: {
    tokenId: string | null;
    coOwners: string[];
    removedPriorOwner: false;
  } | null;
  shippable: PackActivityShippableSummary | null;
  rights: SettleRightsArtifact | null;
  pendingPayout?: SettlePendingPayout | null;
  /** Source-safe patch summary for entitled buyers (full patch at delivery). */
  entitledPatchSummary?: string | null;
}

// ---------------------------------------------------------------------------
// Pipeline input / output
// ---------------------------------------------------------------------------

export interface SettleAssetPackInput {
  repository?: SettleRepositoryRef;
  /** Exactly one bought option (1:1 settle). */
  assetPackOption?: SettleAssetPackOption;
  /**
   * Legacy multi-select carrier — only length-1 accepted; length > 1 throws.
   * Prefer `assetPackOption`.
   */
  selectedOptions?: SettleAssetPackOption[];
  synthesizedPacks?: SettleAssetPackOption[];
  paymentObservation?: SettleBtcPaymentObservationInput | SettleBtcPaymentObservation;
  githubAccessToken?: string | null;
  userId?: string | null;
  readerWalletId?: string | null;
  depositorWalletId?: string | null;
  buyerEthereumAddress?: string | null;
  depositorEthereumAddress?: string | null;
  masterEthereumAddress?: string | null;
  erc1155State?: BitcodeErc1155State | null;
  /**
   * Testnet spot board for BTD volume → pay-asset amounts. Must match the
   * board the buyer was quoted (and paid) with; defaults to the mock board.
   */
  spotBoard?: UsdSpotBoard | null;
  evaluation?: string | null;
  synthesisRunId?: string | null;
  /**
   * V49 S-1/S-2: validated source contribution set (server-resolved sellers,
   * Σ weightBps = 10000). Empty / omitted ⇒ treasury-only compensation.
   */
  sourceContributions?: SettleContributionInput[] | null;
  /** Protocol coin fee (bps) taken off the coin leg before contributor slices. */
  protocolCoinFeeBps?: number | null;
  /** Populated by finalize-settle: fee + per-contributor slices (S-2). */
  compensationStatement?: CompensationStatement | null;
  assetPackSettlementRightsDeliveryBoundary?: SettleValidationBoundary | null;
  /** Populated as stages complete (threaded through Simple pipeline). */
  mintBtd?: MintBtdArtifact;
  settleBtd?: SettleBtdArtifact;
  settleAssetPack?: SettleAssetPackArtifact;
  settlementBtd?: SettlementBtdFromRelativesResult;
  shippable?: SettleShippable;
  packActivity?: SettlePackActivity;
  settlementFinalized?: boolean;
  pendingPayout?: SettlePendingPayout | null;
  success?: boolean;
  summary?: string;
}

export interface SettleAssetPackResult extends SettleAssetPackInput {
  assetPackOption: SettleAssetPackOption;
  selectedOptions: [SettleAssetPackOption];
  success: boolean;
  packActivity: SettlePackActivity;
  summary: string;
  erc1155State: BitcodeErc1155State;
  mintBtd: MintBtdArtifact;
  settleBtd: SettleBtdArtifact;
  settleAssetPack: SettleAssetPackArtifact;
  settlementBtd: SettlementBtdFromRelativesResult;
  shippable: SettleShippable;
  paymentObservation: SettleBtcPaymentObservation;
  pendingPayout?: SettlePendingPayout | null;
  /** Product AssetPack after settlement (ReadSynthesizedSettledAssetPack). */
  readSynthesizedSettledAssetPack?: import('@bitcode/generic-asset-packs-read-synthesized-settled').ReadSynthesizedSettledAssetPack;
}

/**
 * Execution store surface used by settle stages.
 *
 * Structural: must accept `@bitcode/execution-generics` Execution (StorableValue)
 * while still documenting settle-local value shapes for callers.
 */
export interface SettleExecutionStore {
  store(namespace: string, key: string, value: SettleStoreValue | string | number | boolean | null): void;
  get(namespace: string, key: string): unknown;
}

export type SettleStoreValue =
  | string
  | number
  | boolean
  | null
  | SettleAssetPackOption
  | SettleValidationBoundary
  | SettleBtcPaymentObservation
  | MintBtdArtifact
  | SettleBtdArtifact
  | SettleAssetPackArtifact
  | SettlementBtdFromRelativesResult
  | SettleRightsArtifact
  | SettleShippable
  | SettlePackActivity
  | SettlePendingPayout
  | SerializedBitcodeErc1155State
  | BitcodeErc1155State
  | RelativeRowInput[]
  | SourceSafePackMeasurementRow[];

export type { RelativeRowInput, AssetPackMeasurementsForSettlement, SerializedBitcodeErc1155State };
