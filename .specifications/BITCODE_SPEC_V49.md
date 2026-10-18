# Bitcode Spec V49

## Status

- Version: `V49`
- V49 state: full-system draft SPEC open for Complete Implementation Derivability
  (sole rebuild law for the system described herein); Gate 1 opening charter
- Current canonical/latest target: `V48`
- Prior canonical anchor: `BITCODE_SPEC_V48.md` (historical process only — not
  required for V49 semantic recovery)
- Prior generated proof appendix: `BITCODE_SPEC_V48_PROVEN.md` (historical
  process only — not required for V49 semantic recovery)
- Generated structured artifact inventory: draft V49 family
  (`.proofs/v49/opening-charter.json`, `.proofs/v49/spec-family-report.json`,
  `.proofs/v49/canonical-input-report.json`,
  `.proofs/v49/canon-posture-drift-report.json` when regenerated), later
  `check:v49-gate*` evidence under `.proofs/v49/`, and
  `BITCODE_SPEC_V49_PROVEN.md` at promotion
- Source parity state: V49 inherits the promoted V48 living product tree; the
  four V49 reforms (Evaluations, quick synthesis, multi-source settlement,
  Claude External) are specified here and realized gate by gate (see
  `BITCODE_SPEC_V49_PARITY_MATRIX.md`)
- Notes companion: `BITCODE_SPEC_V49_NOTES.md`
- Delta companion: `BITCODE_SPEC_V49_DELTA.md`
- Parity companion: `BITCODE_SPEC_V49_PARITY_MATRIX.md`
- Measurement companion: `BITCODE_SPEC_V49_MEASUREMENT_PARITY_MATRIX.md`
- Scope: V49 canonical system specification for a fast, real, end-to-end
  commercial MVP over promoted V48 canon
- Posture: **draft** — pointer names V48; V49 is the sole draft target; **all
  V49 rebuild semantics live only in this family**
- Last fully realized canonical target preserved in source: `V48`

### Identity freeze (binding)

| Concept | Canonical term |
|---|---|
| Commodity | **DataPack** (product language). Residual code packages may still use
  `AssetPack*` identifiers; product prose and this SPEC use **DataPack**. |
| Seller route | `/deposits` |
| Buyer route | `/reads` |
| Market / activity route | **`/exchange`** (primary). Any `/packs` path is compatibility
  redirect or retired cockpit — not a launch CTA. |
| Experiences | Marketing, Exchange, Reads, Deposits, Docs, Conversations, Auxillaries |
| Buyer instruction | **Evaluation** (natural-language evaluation instructions on a
  Read; UI label **Evaluations**). Replaces V48 "Need". |
| Measurement families | **Absolute** (intrinsic to the DataPack) and **Relative**
  (relative to a Read's Evaluation and repository).
  Relative replaces V48 "needinesses". |
| Externals | **GitHub** (source/target repositories) and **Claude** (Bitcode remote
  MCP connector authorized by OAuth) |

```
DataPack =
  commercial .patch   // create|modify file material (bodies for entitled viewers)
  + measurements      // absolutes (+ relatives on read); materialIdentity?; measureReport?
  + metadata          // kind, title, summary, commercialTitle/Description, roots, …
```


## Version executive summary

V49 exists to make Bitcode a **fast, real, end-to-end commercial MVP**. V48
proved the commercial website on testnet but left four gaps that V49 closes:

1. **Quick synthesis.** Rich SDIVF synthesis issues on the order of 100–250
   model calls per run (PTRR × three failsafes × ~12 agents). V49 adds a
   flagged **quick** synthesis pipeline (`QUICK` pattern) that performs deposit
   and read DataPack synthesis with **exactly one model call per run**, using
   the same Prompt / Tool / Execution / store primitives and the same
   post-synthesis validation, measurement, and Finish law as rich synthesis.
2. **Settlement completion.** V48 settles one seller per DataPack and only in
   demonstration data. V49 binds **multi-source contribution** (model-attributed,
   server-validated weights over admitted Depository DataPacks) into
   source-to-shares, takes the **protocol coin fee**, lets **each contributor
   finalize their own payout split**, adds buyer **owned** and seller **sold**
   viewers with compensation statements, redelivers failed PRs, and removes
   client-supplied payout addresses.
3. **Claude External.** V49 adds a second External beside GitHub: users connect
   **Claude** (Claude.ai connectors, Claude Code) to Bitcode through a
   **Bitcode-hosted remote MCP server** authorized by **OAuth 2.1**, and the
   Bitcode Claude plugin points at that connector.
4. **Evaluations.** V49 renames the buyer's "Need" to **Evaluation** and the
   measurement families to **Absolute** and **Relative**. Relative measurements
   are inferred over code against the natural-language Evaluation **and**, when
   the reader repository declares benchmarks, **measured as benchmark deltas**
   by running the declared benchmark with each candidate DataPack's patch
   applied. Relative rows feed `evaluation-fit` and therefore settlement BTD.

V49 preserves every V48 law not named above: DataPack identity, the absolute
catalogue and honesty law, rich SDIVF deposit/read synthesis, disclosure and
viewer rights, multi-rail testnet settlement, BitcodeERC1155 semantics, PR
delivery, `/exchange`, Auxillaries, and source-safe telemetry.

V49 does not make mainnet value-bearing claims, does not move funds on-chain
to sellers (payouts remain ledgered obligations), does not add a contract
deployment, and does not commercialize ChatGPT App or Bitcode Chat.

Measurement remains the commercial primitive: absolutes on deposit and read,
Relative (Evaluation-relative) fit on read, weighted BTD scalar for
quote/rights, seller/buyer visualization without unpaid source leakage.

Product defaults that must appear in any rebuild: Anthropic model
`claude-haiku-4-5` (overridable), deposit-native SDIVF roster (no lens), DIV
`maxIterations=1`, LLM call timeout 180s, **sourceCheckoutCatalog**, DataPack =
patch + measurements + metadata with formal **DATA_PACK_ABSOLUTES_CATALOG**
(65 kinds, Σ weights = 1, honesty `status` + optional materialIdentity +
measureReport), empty Obfuscations skip Setup LLM, Permissible sources/Exclusions
path scope, Unestimatable demand when settled Depository search cannot ground
estimates, **four** deposit Implementation agents (plan → patchfile with hybrid
bodies → measurements → commercial-nl), synthesis pipeline default
`BITCODE_SYNTHESIS_PIPELINE=rich`, protocol coin fee
`BITCODE_PROTOCOL_COIN_FEE_BPS=500`, benchmark manifest `.bitcode/benchmarks.json`.

V49 gate plan:

| Gate | Category | Name | Owns |
|---|---|---|---|
| 1 | spec-impl | Opening charter | V49 family, posture `V48 active / V49 draft`, living CI wiring, `.proofs/v49/opening-charter.json`, `check:v49-gate1` |
| 2 | spec-impl | Evaluations rename | Need → Evaluation, needinesses → relatives codemod; data migration; `check:v49-gate2` |
| 3 | spec-impl | Quick synthesis | `QUICK` deposit/read pipelines, one model call, mode resolution, UI toggle; `check:v49-gate3` |
| 4 | spec-impl | Settlement completion | Contributions, protocol fee, source-to-shares, per-contributor finalize, owned/sold viewers, redelivery; `check:v49-gate4` |
| 5 | spec-impl | Benchmark-delta Relative | Benchmark manifest, runner, `benchmark-delta:*` relatives, evaluation-fit weighting; `check:v49-gate5` |
| 6 | spec-impl | Claude External | Remote MCP, OAuth 2.1 server, Externals card, plugin, API-key repair; `check:v49-gate6` |
| 7 | spec-impl | Promotion readiness | Readiness report, generated `_PROVEN_`, pointer advance; `check:v49-gate7` |

## Canonical Bitcode executive summary

Bitcode commoditizes knowledge by packaging source, documents, data, workflows,
and other technical materials as **DataPacks**. Depositors supply DataPacks into
the Depository. Readers ask Bitcode to understand a Read Request, synthesize an
Evaluation, find fitting Depository DataPacks, synthesize an Evaluation-Fit
DataPack (attributing the Depository DataPacks it derives from), preview
source-safe Absolute and Relative measurements and commercial prose, settle on a
pay rail, receive BTD volume/rights, and receive entitled repository delivery
(`.patch` / PR). Contributing depositors are compensated by source-to-shares
after the protocol coin fee.

BTD is the weighted scalar knowledge-volume measured from knowledge-bearing
material. Deposit-side options may show estimated BTD; final commercial volume
for settle is Evaluation-relative (relatives-weighted, including measured
benchmark deltas when declared) and bound to settlement, rights, delivery, and
source-to-shares compensation.

V49 makes the website commercially demonstrable quickly and truthfully on
staging-testnet: IP sellers deposit DataPacks on `/deposits`; IP buyers purchase
Evaluation-fitting DataPacks on `/reads`; every contributing seller sees and
finalizes their slice; network activity rereads on `/exchange`; and users can
operate Bitcode from Claude through the Claude External.

## V49 source-of-truth hierarchy

`BITCODE_SPEC.txt` points to `V48`; V48 is the active promoted Bitcode canon and
V49 is the draft target. `BITCODE_SPEC_V49.md`, `BITCODE_SPEC_V49_DELTA.md`,
`BITCODE_SPEC_V49_NOTES.md`, `BITCODE_SPEC_V49_PARITY_MATRIX.md`, and
`BITCODE_SPEC_V49_MEASUREMENT_PARITY_MATRIX.md` are the V49 draft
specification-family material. The V49 draft authorizes implementation gate by
gate through Complete Implementation Derivability; no implementation may outrun
it.

This V49 family is the **sole rebuild authority** for the system described here:

| File | Role |
|---|---|
| `BITCODE_SPEC_V49.md` | **Single full-system SPEC** — Complete Implementation Derivability |
| `BITCODE_SPEC_V49_DELTA.md` | Why V49 / accepted decisions / deferred / commit direction |
| `BITCODE_SPEC_V49_NOTES.md` | Architecture decisions, simplified reading (weaker than SPEC) |
| `BITCODE_SPEC_V49_PARITY_MATRIX.md` | Spec ↔ implementation ↔ test audit |
| `BITCODE_SPEC_V49_MEASUREMENT_PARITY_MATRIX.md` | Absolute catalogue + Relative family package/test parity |
| `BITCODE_SPEC_V49_PROVEN.md` | Generated proof appendix (at promotion) |

**Non-canonical companions** (README, FAMILIARIZATION, AGENTS, layout docs, etc.):
orientation and craft only. They **must not** be required to supply omitted
system semantics. Adjuncts may link SPEC; SPEC must not depend on them.

**Sole-completeness law.** This SPEC must restate all system meaning required
to rebuild Bitcode. Readers must not need other versioned SPEC files to recover
design or implementation law. Companions sharpen or evidence; they do not
replace omitted chapters.

Implementation remains unversioned in source paths. Routes, packages,
components, tests, prompts, telemetry, schemas, APIs, and workflows move in place
as the single current Bitcode system.

## V49 full-system, re-implementation, and audit rule

V49 must be reconstructable from this draft family, source code, generated
artifacts, proof roots, workflow receipts, ledger journals, database
projections, object-storage roots, wallet/provider receipts, repository
delivery receipts, and source-safe telemetry.

No **product/API/UI** surface may disclose protected source, unpaid DataPack
file bodies, raw prompts, raw model/provider responses, credentials, wallet
private material, private settlement payloads, private repository access, or
source-bearing delivery contents before entitlement.

**Disclosure boundary (binding):** source-safety is a **product and API
projection** law (what users and unpaid clients may see). It is **not** a ban
on sending full checkout or patch bodies to synthesis LLM providers. Pre-launch
third-party providers and launch self-hosted models both receive real material
for plan, measure, create, commercial-nl, and validation quality. Unpaid
Exchange/read surfaces still withhold bodies until rights unlock.

## V49 totality and precision enforcement rule

V49 is operationally complete for a fast commercial website testnet MVP. **DataPack**
is the commodity. BTD is weighted scalar knowledge-volume and, after settlement,
a rights-bearing receipt. Pay rails settle money (testnet-class in V49).
Source-to-shares is post-finality contributor allocation. Measurement is the
basis for price. Preview is not source disclosure. Quote is not payment.
Payment observation is not finality. Database projection is not ledger truth
when stronger evidence conflicts.

Every user-visible state must name whether it is estimate, potential, preview,
quote, observed testnet payment, final settlement, rights transfer, delivery,
contributor allocation, compensation, or repair.

## V49 system goals, non-goals, and design principles

Goals:

- Keep the V48 website MVP scope (`/deposits`, `/reads`, `/exchange`,
  Auxillaries) commercially coherent on staging-testnet.
- Make synthesis fast enough to demonstrate and experiment with: a flagged
  **quick** pipeline with exactly one model call per deposit or read run.
- Complete settlement after purchase: multi-source contribution, protocol coin
  fee, source-to-shares allocation, per-contributor payout finalize, owned and
  sold viewers, compensation statements, and PR delivery with redelivery.
- Admit **Claude** as an External through a Bitcode-hosted remote MCP connector
  authorized by OAuth 2.1, so users operate Bitcode from Claude.
- Replace Need with **Evaluation** and needinesses with **Relative**
  measurements, including a measured **benchmark-delta** Relative family when
  the reader repository declares benchmarks.
- Specify seller and buyer user flows with exact state machines; specify
  measurement law: catalog, prompts, typed outputs, weights, BTD scalar formula,
  proof roots, and source-safe visualizations.
- Prove E2E IP selling and IP buying (including two-contributor settlement)
  through browser-level commercial tests.

Non-goals:

- V49 does not launch value-bearing mainnet BTC settlement.
- V49 does not transfer seller coin payouts on-chain; finalized payouts are
  ledgered obligations paid by the treasury out of band.
- V49 does not deploy BitcodeERC1155 on-chain; ERC1155 state stays projected
  from settle and admission records.
- V49 does not commercialize Bitcode Chat or the ChatGPT App. MCP is admitted
  only as the Claude External remote connector and the existing stdio server.
- V49 does not let users bring their own model provider keys (BYOK); synthesis
  runs on the operator's provider configuration.
- V49 does not discover or invent benchmark commands; only repository-declared
  benchmarks run.
- V49 does not finish deeper BTD mining cryptography beyond the website launch
  contract.
- V49 does not expose unpaid DataPack file bodies or source-bearing prompts on
  product surfaces.
- V49 does not add advanced market mechanics beyond MVP selling and buying.

Design principles: measurement before price, price before settlement,
settlement before source unlock, product disclosure before convenience, website
clarity before advanced interfaces, proof-backed readback before projection,
and testnet value semantics without weakening production-like system behavior.

## V49 system architecture and layer boundaries

V49 acts through the website application:

- Auxillaries owns user identity, organizations, teams, wallets, Externals
  (GitHub source/target repository connections and Claude connector grants),
  interfaces, and histories.
- `/deposits` owns IP-seller source connection, deposit DataPack option
  synthesis, commercial + measurement review, Depository admission, and
  compensation expectation readback.
- `/reads` owns IP-buyer Read Request, Evaluation comprehension, Evaluation
  review/resynthesis, fit finding, source-safe preview, quote, multi-rail
  settlement, BTD rights transfer, and repository delivery.
- `/exchange` owns searchable master-detail network activity across deposits,
  reads, previews, quotes, settlements, rights, delivery, compensation,
  repairs, proof roots, and histories (purchase CTA may continue to `/reads`
  settle with intent params).
- Marketing (`/`), Docs (`/docs`), and Conversations (structure retained;
  full commercial conversations experience deferred) complete the website
  experience set.
- The Bitcode remote MCP server (`/api/mcp`) and its OAuth 2.1 authorization
  server are admitted as the **Claude External** interface (see Claude External
  law). ChatGPT App and Bitcode Chat remain deferred commercial surfaces in V49,
  though their source-safe contracts must not regress.

### Frontend component and naming architecture (rebuild law)

V49 website UI rebuilds from a three-layer component architecture with seven
experience prefixes. Dependency direction is strict:

```
Shadcn*  →  Bitcode*  →  {Marketing|Packs|Reads|Deposits|Docs|Conversations|Auxillaries}*
```

| Layer | Symbol prefix | Import rule | Owns |
| --- | --- | --- | --- |
| Shadcn | `Shadcn*` | Radix/shadcn primitives only | Root UI primitives re-exported with explicit `Shadcn` prefix |
| Bitcode | `Bitcode*` | Shadcn + Bitcode theme/tokens only | App-wide base: layout, nav, pipeline table/log/telemetry, auth chrome, explainers, route shell |
| Experience (7) | `Marketing*`, `Packs*`, `Reads*`, `Deposits*`, `Docs*`, `Conversations*`, `Auxillaries*` | Bitcode only (not raw Shadcn; not other experiences) | Page-specific composition |

Filesystem and co-location convention (named component directories, hooks/styles/__tests__, packages vs uapi): `internal-.docs/BITCODE_SOURCE_LAYOUT.md`.

Canonical directories (under the Next app root `apps/uapi/`):

- `apps/uapi/components/shadcn/`
- `apps/uapi/components/bitcode/`
- `apps/uapi/components/{marketing,exchange,reads,deposits,docs,conversations,auxillaries,datapacks}/`
- Thin page shells under `apps/uapi/app/{exchange,deposits,reads,docs,conversations,auxillaries}/`
  and marketing at `apps/uapi/app/page.tsx`

Naming law (types, classes, files, functions, variables — not only components):

- **Pipeline** is the product run surface language (master-detail tables, live
  stream, history, selection). Prefer `BitcodePipeline*`,
  `BitcodeDepositPipeline*`, `BitcodeReadPipeline*`, and experience-local
  `Deposits*` / `Reads*` forms.
- **Transaction / journal** remains ledger/journal vocabulary (BTD journal
  entries, reconciliation), not a product cockpit name.
- **Execution** as a product UI name is retired in favor of Pipeline. Low-level
  agent/executor packages (`execution-generics`, PTRR executor primitives) are
  not product Pipeline surfaces and are not blindly renamed.
- Product route SSOT: `EXCHANGE_ROUTE = '/exchange'`, `DEPOSITS_ROUTE`,
  `READS_ROUTE` under product-routes. Residual `/packs` is not a launch CTA.
- HTTP paths under `/api/executions/*` may remain stable during rename waves;
  internal TypeScript modules and UI labels move to Pipeline first.

Package law: generalizable non-React domain logic belongs in `packages/`;
uapi holds Next routes, React, and thin adapters. Shareable pure models that
leave product must land in packages or `components/bitcode` models — not
remain under a product path.

God-client modularization law:

- Experience page clients are **orchestration shells** only. Pure projections
  live under `apps/uapi/components/<experience>/models/`; stateful IO under
  co-located `hooks/`; render units under named `ComponentName/` directories.
- `/deposits` rebuild index: `DepositPageClient` + deposit models/hooks/units
  listed in G3-14. `/exchange` uses Exchange page client + master/detail units.
- Unit tests for pure deposit models register under `apps/uapi/tests/` (and
  `apps/uapi/jest.config.cjs` testMatch) so CI proves modular projections.

### Legacy cockpit eradication completion condition

cockpit eradication is complete when:

1. No live product cockpit tree under `apps/uapi/app/` for retired surfaces.
2. Launch nav/login CTAs use `/deposits`, `/reads`, `/exchange` only.
3. Shared pipeline selection, history, repository context, and readiness
   models live under Bitcode/experience names without retired product prefixes.
4. Browser proofs and commercial E2E remain on `/deposits`, `/reads`,
   `/exchange`, and Auxillaries.
5. BTD journal and operational-health packages use non-product names
   (`journal`, `operational-health`).

## V49 canonical domain model

Canonical V49 launch objects:

- IP seller, IP buyer, organization, team, wallet, testnet pay account,
  source connection, target repository connection, deposit source bundle
  (**sourceCheckoutCatalog**), deposit DataPack option, Depository DataPack,
  Read Request, synthesized Evaluation, accepted Evaluation, Fit candidate set, selected
  Fit set, Evaluation-Fit DataPack, source-safe preview, commercial brief,
  measurement vector, measurement weight policy, weighted BTD scalar,
  multi-rail quote, settlement receipt, BTD rights receipt, repository
  delivery receipt, source-to-shares allocation, compensation statement,
  Exchange activity row, proof root, repair case, and commercial rehearsal
  receipt.
- V49 additions: synthesis pipeline mode (`rich` | `quick` |
  `demonstration`), quick synthesis receipt (single model call record),
  source contribution set (per Evaluation-Fit DataPack option), protocol coin
  fee, contributor payout slice, contributor payout split, owned DataPack
  (buyer) and sold DataPack slice (seller) projections, delivery redelivery
  receipt, benchmark manifest, benchmark selection, benchmark run receipt
  (baseline and candidate samples), benchmark-delta Relative reading, OAuth
  client, OAuth authorization code, OAuth access/refresh token, Claude
  connector grant, and Claude External connection row.

Canonical V49 states:

- Seller states: `seller-connected`, `source-connected`,
  `deposit-options-synthesizing`, `deposit-option-synthesized`,
  `deposit-option-reviewed`, `deposit-option-approved`,
  `depository-admission-submitted`, `depository-datapack-admitted`,
  `compensation-eligible`, `contribution-awaiting-split`,
  `contribution-split-finalized`, `seller-repair-required`.
- Buyer states: `buyer-connected`, `target-repository-connected`,
  `read-requested`, `read-evaluation-synthesizing`, `read-evaluation-reviewing`,
  `read-evaluation-accepted`, `finding-fits-running`, `fits-found`,
  `evaluation-fit-datapack-synthesized`, `source-safe-preview-reviewing`,
  `quote-issued`, `settlement-observed`, `btd-rights-transferred`,
  `repository-delivery-created`, `repository-delivery-redelivered`,
  `buyer-repair-required`.
- Claude External states: `claude-not-connected`, `claude-authorization-pending`,
  `claude-connected`, `claude-grant-revoked`.
- Exchange activity states: `activity-created`, `measurement-visualized`,
  `proof-root-bound`, `ledger-projected`, `database-synchronized`,
  `storage-root-bound`, `repair-opened`, `repair-closed`.

## V49 measurement law

Measurement is the singular key to valuable IP commoditization and exchange.
Every V49 sale or deposit decision must be grounded in measured readback that
product surfaces may show under disclosure law. **Models do not invent absolute
volumes.** Hosts and tools measure; agents reason over measured readings and
(when synthesizing) full patch material.

### DataPack identity (measurement-bound)

```
DataPack = commercial .patch + measurements + metadata
```

- **Patch** — commercial change set: plan descriptor
  (`fileChanges[{path, op: create|modify}]`, `patchSummary`) plus formal
  **patchArtifact** with full file **bodies** when bound, `unifiedDiff`
  (depositor/entitled `.patch` text), and `bodiesComplete`. **No delete ops.**
- **Measurements** — nested **measurement KINDS** object (see below). Measuring is
  the most critical Bitcode subsystem: models do not invent measured values.
- **Metadata** — commercially legible fields: `kind`, `title`, `summary`,
  `coveredSourcePaths`, `confidence`, plus **`commercialTitle`** /
  **`commercialDescription`** (buyer-facing brief grounded in real patch
  material).

A **DataPack** is **always** a completely synthesized artifact — never a raw
source slice and never a bare path list. **Absolute measurements measure the
DataPack** (after synthesis), not the depositor repository as the commercial object.
Product hierarchy:

`DataPack` (primitive) → synthesis pack → deposit option / selection
envelope row / durable artifact projection.

(Legacy code identifiers may still say AssetPack until package renames complete;
product language and this SPEC use **DataPack**.)

Deposit option `kind` (v0): `capability-slice` | `implementation-pattern` |
`proof-operations-slice`. Implementation synthesizes **2–4** distinct options.

### Measurement KINDS (canonical carrier)

V49 admits **two measurement families** — **Absolute** and **Relative** — plus
two identity/telemetry bags on the DataPack carrier (kinds of measurements /
identity bags — not separate commercial objects):

```
measurements: {
  absolutes: AbsoluteReading[];           // Absolute family: full catalogue (Σ weights = 1)
  relatives: RelativeReading[];           // Relative family: Evaluation/repository-relative (READ ONLY)
  materialIdentity?: MaterialIdentityBag; // multi-valued buyer-visible identity
  measureReport?: DataPackMeasureReport;  // measure-session honesty telemetry
}
```

| Surface | When used | Nature |
|---|---|---|
| **absolutes** (Absolute) | Deposit + read | Intrinsic properties of the DataPack; **full** product catalogue (all kinds, Σ weights = 1) |
| **relatives** (Relative) | **Reading only** | Dimensions measured relative to the Read's Evaluation and target repository: static fit, Evaluation-inferred fit, and benchmark delta |
| **materialIdentity** | Deposit + read + Exchange | Source-safe multi-valued compositions, inventories (deps by usage), tags, companion scalar volumes |
| **measureReport** | Deposit + read + Exchange | Bodies measured, coverage ratio, expanded-fill count, mode (`deep` \| `thin` \| `path-only`) |

`MeasurementKindCategory = 'absolute' | 'relative' | 'material-identity'`.
The V48 category literal `'neediness'` is retired; stored rows are migrated
(see Evaluations rename law).

**Deposit law:** `measurements.relatives` is always `[]` (or omitted). No
`relativeSignal`, no deposit Relative preview, no inventing read-demand as a
measurement kind on deposit packs. Legal deposit bag keys:
`absolutes` (required), `materialIdentity?`, `measureReport?`, empty `relatives?`.

**Read law (Relative family):** the Relative family has **three subfamilies**.

| Subfamily | Kind pattern | Source of volume | Example |
|---|---|---|---|
| **Static fit** | `<dimension>-fit` from `ASSET_PACK_RELATIVES_CATALOG` | Host measure (measure agent or token-overlap fallback) | `language-fit`, `domain-fit`, `interface-fit` |
| **Evaluation-inferred fit** | `<slug>-fit`, planned per Evaluation | Rich: Setup `comprehend-evaluations` plan + host measure. Quick: the single synthesis call emits volume + rationale per planned row | `session-refresh-fit` |
| **Benchmark delta** | `benchmark-delta:<benchmarkId>` | Benchmark runner: declared command run on baseline and on the candidate's patch (no model) | `benchmark-delta:parse-throughput` |

- Kind-name law: every Relative `measurementKind` matches either `/^[a-z0-9-]+-fit$/`
  or `/^benchmark-delta:[a-z0-9][a-z0-9._-]*$/`. Any other kind fails closed
  (`assertRelativeKindPattern`). This replaces the V48 "-fit suffix only" law.
- Evaluation-inferred rows are first-class plan rows:

  ```
  dynamicRelatives: Array<{
    measurementKind: string;  // MUST end with -fit
    label: string;            // human title, not slug-only
    guidance: string;         // how to score pack vs Evaluation
    weight: number;           // relative among Evaluation-inferred rows
  }>
  ```

- Benchmark-delta rows exist only for benchmarks **declared** by the reader
  repository and **selected** for the Read (Benchmark-delta Relative law).
- **Weight re-normalization (subfamily masses):** each subfamily is
  re-normalized internally, then scaled by its mass. Masses depend on which
  subfamilies carry at least one row with honesty status `measured` or
  `estimated`:

  | Present subfamilies | static | Evaluation-inferred | benchmark delta |
  |---|---|---|---|
  | static only | 1.0 | — | — |
  | static + inferred | 0.6 | 0.4 | — |
  | static + benchmark | 0.6 | — | 0.4 |
  | static + inferred + benchmark | 0.4 | 0.3 | 0.3 |

  Benchmark rows with status `insufficient_evidence` / `not_run` are shown with
  their rationale but carry **zero weight** (their mass is redistributed by the
  table above as if absent); a failed benchmark never silently penalizes or
  rewards a DataPack.
- **`evaluation-fit` is a composite**, not a raw catalogue target:
  `evaluationFitVolume = Σ(w_i × clamp01(relatives_i.volume)) / Σ w_i` over
  weighted rows (`computeEvaluationFitVolume`). BTD on settle uses the Relative
  family / evaluation-fit composite only (never absolutes).
- Final synthesized-read options **must** carry:

  ```
  measurements: { absolutes: AbsoluteReading[]; relatives: RelativeReading[] }
  evaluationFit: number
  ```

- `RelativeReading` shares the absolute numeric field law (`volume` ∈ [0,1]
  always, `magnitude` always, `weight`, `unit`, `label`, `rationale?`) with
  `category: 'relative'` and an honesty `status` (`measured` | `estimated` |
  `insufficient_evidence` | `not_run`). Benchmark-delta rows add
  `benchmark: { benchmarkId, baseline, candidate, unit, direction, samples,
  improvementRatio }`.

### Depository search law (shared low-level tool)

Deposit and read Discovery share **`depository-asset-pack-search`**
(`runDepositDepositoryAssetPackSearch`):

| Channel | Law |
| --- | --- |
| **Static filters** | Optional kind / repository / lifecycle / absoluteKinds on supply rows |
| **Lexical** | Phrase-weighted term match over source-safe asset text (always) |
| **Vector** | Optional: embed query → cosine match when `BITCODE_DEPOSITORY_VECTOR_SEARCH=1` |
| **Multi-query** | Explicit `queries[]` fan-out; union by `assetId` (max score + multi-query boost) |
| **Product lens** | `deposit-relevants` vs `read-evaluation-fits` (query framing only; same ranker) |

**Index on admit:** when a deposit option is admitted to the Depository, the
product enqueues indexing:

1. Upsert source-safe row in `depository_search_documents` (structured metadata + embed text).
2. Embed `embed_text` with open-source **gte-small (384 dims)** via Supabase Edge
   Function (`Supabase.ai.Session`) — **not** the OpenAI Embeddings API.
3. Upsert into `depository_search_vectors` (Postgres **pgvector** only).
4. Search uses `match_depository_asset_pack_vectors` (cosine).

**Store law:** depository vectors live only in Supabase Postgres/pgvector.
OpenAI is not a vector database for Bitcode depository search.

**Runtime preload:** both deposit and read synthesize dispatch load admitted /
settled supply into execution stores (`depository.settledAssets` /
`deposit.settledDepositoryAssets`) **before** Discovery so lexical search is not empty.

### Absolute measurement hierarchy (rebuild law)

```
measurement-generics                         # carrier + AbsoluteReadingStatus + measureReport
  → generic-measurements/absolutes/<kind>     # bare pure measure (one package per kind)
  → generic-measurements/domain/
       data-pack-absolutes-catalog            # full commercial catalogue Σ=1
       data-pack-material-identity            # multi-valued identity extract
  → generic-tools/tool-measure-<kind>         # ExecutionTool wrapper
  → generic-agents/agent-measure-absolutes    # registers all absolute tools / bare measures
  → deposit|read pipelines                    # attach after DataPack synthesis
```

**Commercial catalogue size:** **65 kinds**, **Σ weights = 1** (single full
catalogue — there is no smaller “weighted subset”). Enumerated in
`@bitcode/generic-measurements-domain-data-pack-absolutes-catalog` and
`BITCODE_SPEC_V49_MEASUREMENT_PARITY_MATRIX.md`. Families: structure,
verification, hygiene, provenance, semantics, value, plus material-identity
companions. **`learning-gain` is not an absolute** — exchange value scalar is BTD
via relatives / evaluation-fit on read.

Hygiene kinds are first-class absolute packages; product policy may treat them as
hard gates or penalties. **Honesty law:** volume `1` (“clean”) is illegal without
bodies or a real scan; empty evidence → `status: insufficient_evidence` (or
`not_run`) with volume `0` — never claim measured-clean zeros from catalogue fill.

### Absolute commercial catalogue (`DATA_PACK_ABSOLUTES_CATALOG`)

Canonical **full** commercial catalogue in
`@bitcode/generic-measurements-domain-data-pack-absolutes-catalog`
(re-exported by product synthesis). **Every kind has a commercial weight; Σ = 1.**
Shared for deposit and read. Rebuild implementations must emit **one reading per
catalogue kind** (catalog-complete bag) with finite `volume` + `magnitude`.

**Catalogue completeness ≠ measurement quality.** Expanding a partial bag to the
full catalogue is legal UI/law fill only when each fill row is tagged
`status: expanded-fill` (volume/magnitude 0). Models and hosts **must not** present
expanded-fill zeros as measured cleanliness.

Structure **quantity** kinds are tool/bare-authoritative when static analysis or
identity extract supplies signals. Representative structure kinds (not exhaustive;
full list is SSOT in the catalogue package):

| Family slice | Examples | Authority |
|---|---|---|
| Classic structure | `function-count`, `type-count`, `file-span`, `symbolic-richness`, `modularity`, `lang-span`, `test-surface`, `api-surface` | Static analysis report (report-owned) |
| Extended structure | `dependency-span`, `doc-signal`, `config-surface`, data-flow / control / connectivity | Static analysis + bare heuristics |
| Identity companions | `language-concentration`, `framework-surface`, `dependency-class-balance`, `capability-surface`, `purpose-clarity`, … | Material-identity extract → `scalarVolumes` |
| Quality estimates | `correctness-estimate`, `objectives-fidelity`, `computational-usage`, … | Optional measure-agent refine; never invent in synthesis LLMs |

#### Absolute reading shape (rebuild type)

```
{
  measurementKind: string;   // catalogue key exactly (e.g. function-count)
  label: string;
  weight: number;            // catalogue weight (SSOT wins over legacy weights)
  volume: number;            // 0..1 normalized — ALWAYS
  magnitude: number;         // ALWAYS (quantity = raw count; quality = mirrors volume)
  unit: string;
  category: 'absolute';
  status: AbsoluteReadingStatus;  // REQUIRED honesty class
  descriptor?: string;       // instance prose when measured; short placeholder when fill
  rationale?: string;
  evidenceRoot?: string;
}

AbsoluteReadingStatus =
  | 'measured'                 // host/tool produced this reading from evidence
  | 'estimated'                // heuristic / soft estimate over partial evidence
  | 'insufficient_evidence'    // kind ran but lacked bodies/signals
  | 'expanded-fill'            // catalogue completeness only — NOT measured
  | 'not_run'                  // scanner/tool not invoked
  | 'not_implemented';         // package scaffold without mechanism
```

#### measureReport (product-visible measure telemetry)

```
measureReport: {
  measuredFromBodies: number;      // content-bearing files used
  coveredPathCount: number;        // path scope size
  bodyCoverageRatio: number;       // 0..1
  expandedFillCount: number;       // rows with status expanded-fill
  mode: 'deep' | 'thin' | 'path-only';
  toolInvocations?: number;
  measuredKindCount?: number;      // measured | estimated rows
}
```

Mode law (host defaults): `deep` when bodies ≥ 8 and coverage ≥ 0.5; `thin` when
bodies > 0; else `path-only`. Prefer fail-soft thin measure over silent zeros.

#### materialIdentity (buyer-visible multi-valued bag)

Schema `bitcode.data-pack.material-identity` v1. Source-safe only: compositions
(language mix, …), inventories (dependencies ranked by **usageShare** /
`fileHitCount`, frameworks, services), tag sets (purpose, runtimes, patterns,
capabilities), and companion `scalarVolumes` for identity absolute kinds.
**Models never invent dep lists.** Host extract is authoritative.

#### Deep measure source set (`resolveMeasureSourceSet`)

Measure unit remains the **DataPack**. Tools may read checkout bodies **only**
for paths that ground that DP:

1. All `coveredSourcePaths` + `fileChanges[].path` with bodies when available.
2. Always include measure-critical manifests if present in the checkout catalog
   (`package.json`, lockfiles, `go.mod`, `Cargo.toml`, `pyproject.toml`,
   `requirements.txt`, `pom.xml`, Gradle/Gemfile/composer, Dockerfiles, …)
   within obfuscation-allowed roots.
3. Optionally include sibling test files for covered production paths.
4. Cap by `BITCODE_DEPOSIT_MAX_MEASURE_BODIES` (default 80) with truncation
   telemetry — never silent truncate.
5. Never read paths outside run checkout / obfuscation allowlist.

Deposit **and** read Implementation must call `resolveMeasureSourceSet` before
`measureDataPackAbsolutesAndIdentity`.

#### Host merge law (report-owned quantities)

Static-analysis reports that expand the full catalogue to volume 0 **must not**
override bare/identity measures. Prefer report magnitudes only for **report-owned**
kinds: classic structure + `dependency-span` + `doc-signal` + `config-surface`
(and any kind the analyzer explicitly materializes). Material-identity
`scalarVolumes` win for companion kinds. Bare packages fill the rest.

#### ToolsExecution waves (Try/Retry postprocess)

PTRR still has only **Try** and **Retry** as tool-capable steps. Tool postprocess
must support **sequenced Executor waves**:

- Flat `useTools: [{ name, input, reason }]` ≡ one sequential wave (backward compat).
- Optional `toolPlan: ToolWave[]` where each wave has `sequential?: UseTool[]`
  and/or `parallel?: UseTool[]`. Waves run in order; `usedTools` accumulate with
  `waveIndex`. Later waves may use prior results.
- Host may run the same Executor graph **deterministically** (no LLM) for deep
  measure fan-out.

#### Absolute display and review artifact

| Surface | Law |
|---|---|
| Deposit option card | Measure report strip; material identity + deps-by-usage; honesty badge per absolute; prefer instance descriptor; fill rows show “Not measured — catalogue placeholder” |
| Exchange detail | Same honesty (status badges, measureReport strip, deps inventory); source-safe only |
| Pack activity projection | Carry `status` on absolute rows; project `materialIdentity` + `measureReport` into detail |
| Path-op patch download | `bitcode.artifact.patch` path-op-json (protocol) |
| **DataPack review artifact** (depositor) | `bitcode.datapack.review-artifact` v1: path-op + metadata + absolutes (with status) + materialIdentity + measureReport + honesty counts — **no unpaid raw source bodies** |

**Who measures when (deposit):**

| Phase | Law |
|---|---|
| Discovery `comprehend-codebase` | Measures **Host checkout material** → `discovery:sourceMeasurements` to ground the knowledge map |
| Implementation measurements agent | `resolveMeasureSourceSet` → static analysis + material identity + bare registry → `measureReport`; attach `measurements: { absolutes, materialIdentity?, measureReport? }` |
| Validation ready-to-finish | **Fail-closed** if pack lacks catalog-complete `measurements.absolutes` with magnitude+volume; **must not** re-measure |
| LLM agent JSON | **Must not** invent absolute, relative, or identity volumes |

Stack: `resolveMeasureSourceSet` → static analysis + material-identity extract →
bare `generic-measurements/absolutes/<kind>` (+ staticSignals) →
`measureDataPackAbsoluteReadings` / optional quality PTRR refine →
merge (report-owned + identity + bare) → attach. Package map: absolute measurement
parity matrix. Relatives remain `@bitcode/generic-measurements-relatives` (read).

### Relatives (read-only measurement family)

Relatives live under `measurements.relatives[]` with the **same numeric
field law** (magnitude + volume always; category `'relative'`).

| Concern | Law |
|---|---|
| Deposit | Always empty `relatives: []`; no deposit Relative preview |
| Static fit | language-fit, domain-fit, interface-fit (`ASSET_PACK_RELATIVES_CATALOG`) |
| Evaluation-inferred fit | Additional `-fit` dimensions inferred over code against the Read's natural-language Evaluation |
| Benchmark delta | `benchmark-delta:<id>` rows measured by running declared repository benchmarks with the candidate patch applied |
| evaluation-fit composite | `computeEvaluationFitVolume(relatives)` = weighted mean under the subfamily mass table; **not** a raw measure-agent target |
| BTD (read) | Settlement BTD from the Relative family / evaluation-fit after Evaluation acceptance |

### Commercial visualization (policy, not measurement kinds)

Product UI may still project commercial policy rows (criticality, ROI, settled
demand **Unestimatable** vs grounded estimate for **earnings panels**). Those are
**not** `measurements.relatives` and must not be confused with the Absolute /
Relative measurement taxonomy. (V48 titled this section "Relative / commercial
visualization"; in V49 **Relative** names only the measurement family.)

### Measurement prompt rule

- Each inference-owned measurement is commanded by named Prompt / PromptPart
  composition through `@bitcode/prompts`.
- Record: input context class, source boundary, prompt template identity,
  source-safe prompt digest, typed output schema, parsed result, proof root,
  telemetry receipt, repair posture.
- Raw protected prompts, raw provider responses, protected source, and unpaid
  AssetPack source remain private. Source-safe prompt identity, digest, typed
  result, and proof root are disclosable.

### Weighted scalar BTD formula

- Each measurement emits `measurementVolume` (or `volume`), `confidence` where
  applicable, `riskAdjustment` where applicable, and `weight`.
- Normalized contribution:
  `volume * confidence * riskAdjustment * weight` (omit factors not present).
- **Deposit-side BTD** is estimated / potential range (no reviewed buyer Evaluation).
- **Read-side / settlement BTD** is the **relatives-only** weighted scalar
  after Evaluation acceptance and option selection, minted only after BTC settle:

```
evaluationFitVolume = Σ(w_i × clamp01(relatives_i.volume)) / Σ w_i
                      // w_i = subfamily mass × in-subfamily normalized weight;
                      // zero for benchmark rows without measured evidence
amountBaseUnits = floor(evaluationFitVolume × 10^18)   // fungible Bitcode (BTD)
```

- Absolute composite (Σ weight × absolute volume) is commercial legibility of
  supply material only; **absolutes never mint BTD**.
- Fungible BTD max supply is **21,000,000** whole tokens (BitcodeERC1155 id 0).
- AssetPack identity is a separate non-fungible co-ownership unit (ERC1155 ids ≥ 1).

### Seller / buyer visualization

- Depositors must see source-safe absolutes (and relative or Unestimatable),
  criticality, demand posture, ROI/compensation expectation, source-safety
  blockers, and repair requirements before approving deposit.
- Readers must see Evaluation coverage, Fit confidence, selected Fit provenance
  (contributing Depository DataPacks and weights), Absolute and Relative
  sections (benchmark rows show baseline → candidate, signed improvement, unit,
  and honesty status), novelty, risk, delivery readiness, quote basis
  (including the protocol coin fee), final BTD scalar, and repair blockers
  before paying BTC-testnet settlement.

### Measurement theorem

No measurement, no price. No price, no settlement. No settlement, no market.



## V49 rich deposit synthesis law (SynthesizeDepositAssetPacks SDIVF) and deposit full-stack law

This section is **binding product law** for deposit synthesis. Together with the
rest of this SPEC it is sufficient to **rebuild deposit synthesis and `/deposits`
from zero** without consulting non-canonical companions or implementation tribal
knowledge. Paths locate the living system; the **law** is this SPEC.

**Rich vs quick.** This chapter is the **rich** deposit synthesis law and the
default pipeline (`BITCODE_SYNTHESIS_PIPELINE=rich`). The flagged one-call
**quick** pipeline is specified in the V49 quick synthesis law; it shares this
chapter's request contract, stores, option product shape, validation, Finish,
and persistence law, and replaces only the SDIVF agent roster. Section ids
`G3-*` are stable identifiers inherited from V48 Gate 3 and do not name V49
gates.

**Product law: no lens.** Deposit and read are **separate** SDIVF product
pipelines (not one lensed pipeline). Deposit roster keys below are deposit-native
only — no Fits Finding / Read-Evaluation agents under deposit Setup, no synonym alias
keys for the same agent loader.

### G3-1 Pipeline identity

| Law | Value |
|---|---|
| Product pipeline | **SynthesizeDepositAssetPacks** (deposit-only SDIVF) |
| Domain package | `@bitcode/asset-packs-pipelines-domain` (+ product package under `asset-packs-pipelines/synthesize-deposits-asset-packs-pipeline` when used) |
| Phase roster | `depositPhases` in `packages/asset-packs-pipelines/domain/src/phases/deposit-phases.ts` |
| Phases | **preprocess** → **Setup** → (**Discovery** → **Implementation** → **Validation**) × maxIterations → **Finish** → **postprocess** |
| DIV loop | Substrate supports early exit via `validation:readyToFinish`; product default **maxIterations = 1** (one D→I→V pass) |
| Mode | Deposit-only path stores `pipeline:synthesizeMode = deposit` / `synthesize-asset-packs:mode = deposit` on the **shared root** |
| Dual-entry legacy | Older `synthesizeAssetPacksPipeline` may still resolve deposit vs read by input `mode` — **new product code uses deposit-only factory** |
| Inference | Non-configurable formal hierarchy; real generation at leaf. Tests mock LLM at provider boundary only (F26-A). |
| Default LLM | Provider **`anthropic`**; model **`claude-haiku-4-5`** (`BITCODE_LLM_PROVIDER` / `BITCODE_LLM_MODEL` override) |
| Per-call timeout | `BITCODE_LLM_CALL_TIMEOUT_MS` default **180000** |
| Formal hierarchy | Pipeline Execution → Phase → Agent (`factoryPTRRAgent` where LLM) → Step (plan/try/refine/retry) → Failsafe (prepare_concise_context → chunk_then_sum → stitch_until_complete) → Thinkings (reason → judge → structured_output) |
| PTRR unwrap (F27) | Consumers read `finalOutput ?? output ?? raw` — never assume bare schema on factory envelope |

#### G3-1a Target phase sequence (binding)

| Phase | Sequence | Law |
|---|---|---|
| preprocess | deposit-only | Repository coords + steering; catalog may be empty until Host/Setup |
| Setup | (1) **clone alone** → (2) **parallel** {initialize-lsp, initialize-mcps-tools, comprehend-obfuscations} → (3) **danger-wall alone** | Clone first; danger wall last admits obfuscations |
| Discovery | **parallel** {comprehend-codebase, search-depository, inherent-regurgitation} | Measure is **inside** comprehend-codebase, not a separate agent |
| Implementation | **sequential** (1) `…-patch-plan` → (2) `…-patchfile` → (3) `…-measurements-synthesis` → (4) `…-commercial-nl` | Same DataPack(s): **plan** → **write hybrid-body patch artifact** → **measure** → **commercial NL**; deposit = descriptor + patchArtifact (bodies) + absolutes + commercialTitle/Description |
| Validation | **one** agent: `validation:ready-to-finish-asset-packs-synthesis-deposit-pipeline` | A prior phases · B pack quality · C obfuscations vs patch. **Validate only** — never measure/repair; weak Implementation → **iterate** |
| Finish | (1) store-artifacts → (2) ledgerize → (3) finish-synthesize-asset-packs-for-deposit-run | Persist · journal roots · selection envelope / cleanup |
| postprocess | normalize | Presentation-safe result for route |

#### G3-1b Optimization for depositor options

Bitcode optimizes **depositor-facing supply quality**, not a claimed global optimum:

1. Scope control — Permissible sources/Exclusion + Obfuscations bound admissible knowledge.
2. Measured structure — checkout absolutes + tree + LSP reveal capability density.
3. Demand alignment — depository search (underserved/likely topics) biases buyable slices (topic guidance only; **not** Read relative).
4. Pattern prior — inherent regurgitation avoids naive groupings.
5. Multi-option synthesis — 2–4 **distinct** knowledge groups (patchfile agent).
6. Tool-rich measurements — Implementation agent 2/2: static analysis (quantity) + quality inference into `DATA_PACK_ABSOLUTES_CATALOG` only.
7. Fail-closed Validation — **validate only** (no re-measure); missing absolutes, salvage, leakage, exclusion → **iterate**.
8. DIV substrate — re-enter Discovery→Implementation when not ready and maxIterations > 1.
9. Human selection — `/deposits` selection envelope only when `readyToPresent` (measured + presentable + Validation finish).

### G3-2 Data storage schemas (deposit persistence)

Migration authority: `supabase/migrations/20260515010000_terminal_execution_history.sql` (plus RLS/service policies as in that migration family).

#### `public.executions`

| Column | Type | Deposit use |
|---|---|---|
| `id` | uuid PK | `runId` returned to client |
| `user_id` | uuid → auth.users | Owner; cancel/history scoped |
| `type` | text | e.g. deposit synthesis workbench type |
| `status` | text | `pending` → `running` → `completed` \| `failed` \| `cancelled` \| `interrupted` |
| `input` | jsonb | Source-safe request summary (never full monorepo sources) |
| `output` | jsonb | On complete: `depositOptionSynthesis`, `reviewProjections`, `inference`, exclusion violations |
| `context` | jsonb | `source`, `route`, `pipelineCore`, `synthesisMode`, `repositoryFullName`, `sourceBranch`, `sourceCommit`, `optionCount`, `sandboxId` (if any), cancel fields |
| `error` | jsonb | Source-safe `{ message }` on fail/cancel |
| `total_tokens`, `duration_ms` | numbers | Accounting |
| `started_at`, `completed_at`, `created_at`, `updated_at` | timestamptz | Run clock |

RLS: owner select/insert/update; service_role all. Cancel law: once `status=cancelled`, background workers must not overwrite with `failed`/`completed`.

#### `public.execution_events`

| Column | Type | Deposit use |
|---|---|---|
| `id` | uuid PK | Event id |
| `run_id` | uuid → executions | Stream tail / history |
| `event_type` | text | `status`, `generation`, `tool`, `error`, `agent-complete`, `phase-complete`, … |
| `event_data` | jsonb | **Always** passed through `sourceSafeStreamEvent` before persist/stream |
| `agent_name`, `phase` | text | Optional denormalized labels |
| `created_at` | timestamptz | Ordering + RunClock |

Indexes: `(user_id, created_at DESC)` on executions; `(run_id, created_at)` on events.

Settled demand search may scan `executions` for admitted/settled AssetPack rows (`context.admissionState`, `context.settlementState`, `type`, deposit-option-review-admission source) — source-safe metadata only.

### G3-3 HTTP / API surface (rebuild routes)

| Method | Path | Law |
|---|---|---|
| POST | `/api/deposit/synthesize-options` | Auth required. Validate body (`repositoryFullName`, branch, commit, obfuscations, permissibleSources, impermissibleSources, demand signals). Create `executions` row `running`. Register `waitUntil` continuation. Return `{ runId, status: 'dispatched' }` immediately. `maxDuration` high enough for deposit (800s class). Background: provision host → run SDIVF or sandbox host → validate candidates → build real option synthesis → ground relative from settled packs → persist `output` **before** completion event. Fail-closed messages on zero options / cancel / timeout. |
| GET | `/api/deposit/demand-estimate` | Auth required. Query settled Depository packs; return `{ ok, estimate, signals }`. `estimatable:false` when corpus thin. |
| GET | `/api/executions/history` | List owner runs (deposit-mode / deposit pipeline filters). |
| GET | `/api/executions/history/[runId]` | Full row + optional event page; support `?tail=N` for last N events. |
| GET | `/api/executions/stream/[runId]` | SSE live tail of source-safe events. |
| POST | `/api/executions/[runId]/cancel` | Owner cancel; set `cancelled`; insert status event; best-effort sandbox stop. |

Dispatch must use Vercel `waitUntil` (QA F31) — bare `void` after response is illegal on serverless.

### G3-4 Hosts and provisioning

| HostKind | Implementation | Law |
|---|---|---|
| `local` | LocalHost + `apps/uapi/lib/deposit-source-provisioning` | Default when `BITCODE_PIPELINE_HOST` unset. Host **adopt this-run tree or clone** complete tree at SHA; Node fs workspace; build **sourceCheckoutCatalog** `{ paths, samples, sources? }`. |
| `sandbox` | VercelSandbox host family | When `BITCODE_PIPELINE_HOST=sandbox`. Auth fail-closed. Deposit boxes **`persistent: false`**. Persist `context.sandboxId` for cancel. |

Scope after provision: Permissible sources/Exclusions applied to catalog. Prompt path uses projection of **paths + samples only** — never full `sources` in prompts or telemetried `pipeline:input`.

**Host-only clone law:** Setup clone agent is the checkout authority for the SDIVF run; pre-Setup host provision may seed the Host, but deposit Setup does not use Fits Finding harness keys.

### G3-5 Deposit run inputs and preprocess stores

| Input | Law |
|---|---|
| `repositoryFullName`, `sourceBranch`, `sourceCommit` | Required for synthesis |
| `obfuscations` | Free-text withhold guidance. **Empty/whitespace → skip Setup obfuscation LLM**; store empty guidance (`comprehensionMode: empty-obfuscations-skip-llm`). Impermissible sources remain authoritative. |
| `permissibleSources` | Non-empty → only those roots in-scope |
| `impermissibleSources` | Fail-closed exclusion from catalog before prompts/measurement |
| `demandContext` | Optional demand signals; settled-Depository estimate preferred for earnings UI |
| Hooks (optional) | `deposit:persistArtifacts`, `deposit:ledgerWrite` injected by dispatch |

#### Naming: sourceCheckoutCatalog (binding)

| Concept | Store / type key |
|---|---|
| This-run Host checkout catalog | **`deposit:sourceCheckoutCatalog`** (`paths`, `samples`, optional `sources` file bodies) |
| Host workspace | `repository:workspacePath` |
| Legacy alias | `deposit:inventory` **dual-written only** for stream filters until fully migrated — **not** product vocabulary |

#### Preprocess cross-phase stores (shared root)

| Namespace:key | Content |
|---|---|
| `pipeline:input` | Request summary; catalog **without** full `sources` bodies |
| `pipeline:synthesizeMode` | `deposit` |
| `deposit:repository` | `{ url, owner, name, branch, commit, fullName }` |
| `deposit:obfuscations` | string \| null |
| `deposit:permissibleSources` | string[] |
| `deposit:impermissibleSources` | string[] |
| `deposit:demandContext` | array |
| `deposit:sourceCheckoutCatalog` | Full catalog for measurement tools (when available) |

### G3-6 Agent roster (deposit mode — exactly one key per agent)

Registry keys under `packages/asset-packs-pipelines/domain/src/`. **No synonym
aliases** (e.g. do not also register `discovery:codebase-comprehension` for the
same loader as `discovery:comprehend-codebase`).

#### Setup (`depositSetupPhase`)

| # | Registry key | Module | Objective | Tools / notes |
|---|---|---|---|---|
| 1 | `setup:clone-vcs-repository` | `agents/setup/asset-pack-clone-vcs-repository-agent.ts` | Host adopt/clone full tree at SHA | Host clone tool |
| 2a | `setup:initialize-lsp` | `agents/setup/asset-pack-initialize-lsp-agent.ts` | LSP on workspace | LSP init |
| 2b | `setup:initialize-mcps-tools` | `agents/setup/asset-pack-initialize-mcps-tools-agent.ts` | MCP/tools on Host | MCP helpers |
| 2c | `setup:comprehend-obfuscations` | `agents/setup/deposit-input-comprehension-agent.ts` | Obfuscations → structured guidance vs catalog paths | PTRR; empty skip LLM |
| 3 | `setup:danger-wall` | `agents/setup/deposit-danger-wall-agent.ts` | Admit obfuscation posture; fail-closed | Deterministic; `ShortCircuitError` |

**Setup stores:** `setup:inputComprehension` / `setup:obfuscationComprehension`
`{ summary, obfuscatedPaths?, obfuscatedConcepts?, honorNotes? }`;
`setup:admission` / `setup:dangerWall` `{ safe, reason, flags, … }`;
`setup/lsp:initialized`, workspace path.

**Comprehend-obfuscations output schema:**
`{ comprehension: { summary, obfuscatedPaths?, obfuscatedConcepts?, honorNotes? } }`.

#### Discovery (parallel)

| Registry key | Module | Objective | Tools |
|---|---|---|---|
| `discovery:comprehend-codebase` | `agents/discovery/deposit-codebase-comprehension-agent.ts` | Rich Host analysis → knowledge map for pack groups | LSP `lsp-query`, measure/static-analysis, Host file reads |
| `discovery:search-depository` | `agents/discovery/deposit-depository-search-agent.ts` | Plan queries + demand guidance + tool search | `depository-asset-pack-search` (lexical always; vector when `BITCODE_DEPOSITORY_VECTOR_SEARCH=1` + credentials) |
| `discovery:inherent-regurgitation` | `agents/discovery/deposit-inherent-regurgitation-agent.ts` | Model-inherent patterns (source-safe) | none |

##### Codebase comprehension evidence law (binding)

Before/around PTRR, the agent **must** gather:

1. Absolute measurements of checkout material → `discovery:sourceMeasurements`
2. LSP queries when available
3. Full file-tree structure from catalog paths (`buildFileTreeStructure`)
4. Bounded key file reads (README, manifests, configs, high-signal paths)

**Comprehension schema:**
`{ summary, capabilities?, knowledgeAreas?, notableModules?, measurementInsights?, structureInsights? }`.

**Rich analysis store** `discovery:codebaseAnalysis`:
`schema: bitcode.deposit.discovery.codebase-analysis` with repository,
workspacePath, catalog counts/paths, fileTree, keyFileReads, sourceMeasurements,
lsp queries, comprehension. Also `discovery:codebaseComprehension` (map alone).

##### Depository search output law

`{ guidance: { summary, likelyReadTopics?, demandAlignment?, underservedTopics?, readabilityNotes?, searchQueries? }, searchQueries? }`.
Stores: `discovery:depositorySearch`, `discovery:depositorySearchQueries`,
`discovery:depositorySearchToolResult`.

##### Inherent regurgitation output law

`{ regurgitation: { summary, relevantKnowledge?, patterns?, references? } }` →
`discovery:inherentRegurgitation`.

#### Implementation (four sequential agents — same DataPacks)

Deposit DataPack =
  **plan metadata + commercial .patch (bodies) + absolute measurements + commercial NL**.
Relative is **Read-pipeline only** and is never a deposit Implementation product field.

| Order | Registry key | Module | Objective |
|---|---|---|---|
| 1 | `implementation:deposit-implementation-agent-asset-packs-patch-plan` | `…/deposit-implementation-agent-asset-packs-patch-plan.ts` (+ schema/prompts) | 2–4 options; LLM **six fields only**; host catalog/exclusion gates; **no artifact write**; LLM input may include **full checkout bodies** via synthesis-provider inventory projection |
| 2 | `implementation:deposit-implementation-agent-asset-packs-patchfile` | `…/deposit-implementation-agent-asset-packs-patchfile.ts` (+ create-body hydrate) | For each planned pack: **write one** formal patch artifact; **hybrid bodies**: **modify** = depositor checkout full file; **create** = LLM (or deterministic) full new-file body; **no delete**; attach `patchArtifact` with `files[{path,op,body?}]`, `unifiedDiff`, `bodiesComplete` |
| 3 | `implementation:deposit-implementation-agent-asset-packs-measurements-synthesis` | `…/deposit-implementation-agent-asset-packs-measurements-synthesis.ts` | Requires `patchArtifact`; `resolveMeasureSourceSet` → host measure (absolutes + materialIdentity + measureReport); full catalogue + honesty |
| 4 | `implementation:deposit-implementation-agent-asset-packs-commercial-nl` | `…/deposit-implementation-agent-asset-packs-commercial-nl.ts` | **Full patch bodies + measurements** to LLM; emit `commercialTitle` + rich `commercialDescription` for purchase consideration; product surfaces may show commercial prose unpaid; bodies remain rights-gated |

**Agent 1 (patch-plan) LLM output (allowlist — no other keys):**

```
{
  options: [{
    kind: 'capability-slice'|'implementation-pattern'|'proof-operations-slice';
    title: string;                   // 8..160
    summary: string;                 // 40..900 product language
    coveredSourcePaths: string[];    // 1..40 from catalog only
    confidence: number;              // 0..1
    patch: {
      fileChanges: { path: string; op: 'create'|'modify' }[];  // min 1; NEVER delete
      patchSummary: string;
    };
  }]  // length 1..4
}
```

Plan step **output** is path+op only (staging). Plan step **input** includes real
checkout file bodies so titles/summaries/path choices are grounded.

**Agent 2 (patchfile write) host output (per pack):** same six fields with optional
`fileChanges[].content` (full bodies) +
`patchArtifact: { artifactId, assetPackId, format:'unified-diff'|'path-op-json',
files[{path,op,body?}], unifiedDiff?, bodiesComplete, envelopeJson, … }`
— **exactly one** formal artifact per pack; commercial law **create|modify only**.

**Agent 3 (measurements) host output (per pack):** agent-2 pack +
`measurements: { absolutes: AbsoluteReading[]; materialIdentity?; measureReport? }`
(catalog-complete absolutes with `status` + magnitude+volume; identity optional; report optional but required when bodies were available).

**Agent 4 (commercial-nl) host/LLM output (per pack):** agent-3 pack +
`commercialTitle` (8..160) + `commercialDescription` (80..6000, exhaustive buyer brief
grounded in real patch bodies and honesty telemetry). Deterministic fallback prose
is allowed when LLM fails; preferred path is model grounded on full material.

**Presentable gate (binding):** a pack is presentable only if not salvaged, has
formal patchArtifact, has required catalog absolutes, has **no delete** ops, and
when `bodiesComplete === false` it is **not** presentable.

**Host salvage (patch-plan only):** continuity packs with `salvaged: true` may be written as
artifacts but are **never presentable**; Validation **must iterate**.

**Product projection:** route validate must preserve file bodies, `patchArtifact`,
commercial fields, and measure honesty; rehydrate modify bodies from checkout
inventory when needed; rebuild `unifiedDiff` for depositor `.patch` download/view.

**Stores (after commercial-nl):**
`implementation:options` / `assetPacks` (commercial packs), `implementation:patchedPlans`,
`implementation:patchArtifacts`, `implementation:patchfileWritten`,
`implementation:measured`, `implementation:presentable`,
`implementation:commercialNlComplete`, salvage flags, measurementReports.

#### Validation (single agent — validate only)

| Registry key | Module | Objective |
|---|---|---|
| `validation:ready-to-finish-asset-packs-synthesis-deposit-pipeline` | `agents/validation/deposit-ready-to-finish-agent.ts` | Single A/B/C gate; **never measures or repairs packs** |

| Check | Law |
|---|---|
| A Prior phase / tool sanity | workspacePath; danger-wall; catalog.paths; Discovery products; non-empty options; `implementation:measured === true`; **no salvaged packs** |
| B Pack quality | Each pack = commercial patch (bodies when claimed) + `measurements.absolutes` (+ optional materialIdentity/measureReport) + metadata + commercial NL when present; no non-empty relatives; no delete ops; distinctness; full catalogue kinds; magnitude+volume; honesty status preserved; qualitative PTRR may read real patch bodies |
| C Obfuscations / Impermissible sources | covered paths + patch paths vs blocked prefixes (shared path law) |

Weak Implementation (missing absolutes, salvage, incomplete measure, empty options) →
`recommendation: iterate` so DIV re-enters Discovery→Implementation. Validation **must not**
call `measureDataPackAbsolutes` or `attachDepositAbsolutes`.

**Qualitative PTRR schema:**
`{ issues: string[]; qualityScore: number; coverageGaps: string[]; recommendation: 'complete'|'iterate' }`.

Stores: `validation/implementation:issues`, `validation:depositQuality`,
`validation:readyToFinish` `{ recommendation: 'finish'|'revise', summary, issues }`;
re-stores measured packs on `implementation:options|assetPacks`.

Compat module `deposit-validation-agent.ts` shares prompts/checks for unit tests;
**deposit phase roster registers only the ready-to-finish key.**

#### Finish (sequential)

| Registry key | Module | Objective |
|---|---|---|
| `finish:store-artifacts` | `agents/finish/deposit-store-artifacts-agent.ts` | Durable source-safe bundle + optional persist hook |
| `finish:ledgerize` | `agents/finish/deposit-ledgerize-agent.ts` | Journal roots + optional ledgerWrite hook |
| `finish:finish-synthesize-asset-packs-for-deposit-run` | `agents/finish/deposit-finish-synthesize-run-agent.ts` | Selection envelope + cleanup posture |

##### store-artifacts bundle schema

```
{
  schema: 'bitcode.deposit.synthesize-asset-packs.artifacts';
  storedAt: string;
  assetPacks: Option[];
  patches: [{ title, kind, patch, coveredSourcePaths, absolutes, metadata }];
  discovery: { codebaseComprehension, codebaseAnalysisSummary, depositorySearch,
               depositorySearchTool, inherentRegurgitation, sourceMeasurements };
  setup: { admission };
  validation: ReadyToFinish;
  sourceCheckoutCatalog: { pathCount, sampleCount, fileBodyCount, paths }; // no sources bodies
}
```

Stores: `finish:storedArtifacts`, `finish:uploadForReview`, `finish:persistResult`.

##### ledgerize (journal)

Requires storedArtifacts. Builds per-option `contentsRoot`, `measurementRoot`,
`metadataRoot` + discovery/validation roots. Optional `deposit:ledgerWrite`.
**Not** full commercial settlement (SettleAssetPack later). Stores:
`finish:ledgerize`, `finish:ledgerReceipt`, `finish:ledgerWriteResult`.

##### selection envelope schema

```
{
  schema: 'bitcode.deposit.synthesize-asset-packs.selection-envelope';
  surface: '/deposits';
  purpose: 'user-select-options-to-deposit';
  options: [{ index, kind, title, summary, coveredSourcePaths, confidence,
              patch, measurements /* absolutes */, metadata, selectable: true }],
  readyToPresent, validationSummary
}
```

Stores: `finish:selectionEnvelope`, `finish:completion`, `finish:summary`.
Host dispose is **dispatch-owned** after Finish returns.

### G3-7 Tools, prompts, execution tree, store-visibility

#### Tools (deposit path)

| Tool / capability | Phase | Role |
|---|---|---|
| Host VCS clone/adopt | Setup | Full checkout at SHA |
| LSP init + `lsp-query` | Setup / Discovery | Symbols for comprehension |
| MCP initialize | Setup | Host tool surface |
| Static analysis + measure stack | Discovery / Implementation / Validation backfill | Absolutes quantity + quality |
| `depository-asset-pack-search` | Discovery | Lexical + optional vector settled supply |
| `asset-pack-patch-write` | Implementation | Materialize path+op descriptors |
| `deposit:persistArtifacts` hook | Finish | Durable DB write |
| `deposit:ledgerWrite` hook | Finish | Journal binding |

#### Prompt composition law

LLM deposit agents set Prompt registry parts:

- `agent:identity` → `agent:requirements` → `ptrr:plan` | `ptrr:try` | `ptrr:refine` | `ptrr:retry`

Hierarchical system prompt reaches **every** leaf LLM call (identity before
requirements before PTRR step). Progressive specificity:
Pipeline → Phase → Agent → Step → Failsafe → Thinkings generation.

User/task payload: repository, **projected catalog**, Discovery maps, packs —
**never** full monorepo sources.

Prompt contracts pinned by
`packages/asset-packs-pipelines/domain/src/__tests__/deposit-agent-prompt-contracts.test.ts`.

#### Execution tree and cross-phase store-visibility law (F20 generalized)

```
Execution (ROOT)  ← dispatch / route holds this
  preprocess (seq child)
  setup / discovery / implementation / validation / finish (seq children)
    agent / PTRR step / generation children
  postprocess
```

Phases are **isolated siblings**. `findUp` walks **ancestors only**.

| Role | API |
|---|---|
| Producer | `storeCrossPhaseArtifact(execution, ns, key, value)` → writes on **`execution.getRoot()`** |
| Consumer | `execution.get(ns, key) ?? execution.findUp(ns, key)` |

Without this law, Setup guidance is invisible to Implementation, Discovery maps
vanish for Validation, and the route cannot read Finish outputs.

#### Complete deposit store index (normative)

| Namespace:key | Producer | Consumers |
|---|---|---|
| `deposit:sourceCheckoutCatalog` | preprocess / clone / ensure helpers | all agents, measure, Finish |
| `deposit:repository` | preprocess | all |
| `deposit:obfuscations` / forced* / demandContext | preprocess | Setup/Discovery/Impl |
| `deposit:persistArtifacts` / `ledgerWrite` | dispatch | Finish |
| `repository:workspacePath` | clone | LSP, Validation A |
| `setup:inputComprehension` | comprehend-obfuscations | danger-wall, Impl, Validation |
| `setup:admission` | danger-wall | Validation A, Finish |
| `discovery:codebaseComprehension` / `codebaseAnalysis` / `sourceMeasurements` | comprehend-codebase | Impl, Validation, Finish |
| `discovery:depositorySearch` (+ queries, tool result) | search-depository | Impl, Finish |
| `discovery:inherentRegurgitation` | inherent-regurgitation | Impl, Finish |
| `implementation:options` / `assetPacks` | Implementation (+ Validation re-store) | Validation, Finish, route |
| `validation:readyToFinish` / `depositQuality` | Validation | DIV gate, Finish, UI |
| `finish:storedArtifacts` / `ledgerize` / `selectionEnvelope` / `completion` | Finish | route, journal, UI |

### G3-8 AssetPack option product shape (route projection)

After pipeline + projection (`buildRealDepositAssetPackOptionSynthesis` +
`validateDepositSynthesisOptions` when used):

| Field | Law |
|---|---|
| `kind` | capability-slice \| implementation-pattern \| proof-operations-slice |
| `title`, `summary` | Source-safe commercial language |
| `absolutes[]` / projected `measurements[]` | Formal absolutes; category absolute; weights Σ=1; sizes have magnitude+unit |
| `contents` | `{ patchSummary, fileChanges[{path,op}], provenantSourcePaths, provenantSourceCount }` — path+op only |
| `relative` | Preview or Unestimatable |
| `visibility.*` | All raw/source flags **false** |
| Roots | optionRoot, sourceBindingRoot, demandAlignmentRoot, measurementRoot, contentsRoot, relativeRoot, reviewBoundaryRoot |

### G3-9 Full-stack route session after options exist

Rebuild order in `buildDepositRouteSession` / `DepositPageClient`:

1. **Synthesis** — options from precomputed real synthesis or blueprint fallback.
2. **Policy** — criticality, demand (settled-grounded or unestimatable), ROI, BTD potential, compensation, policyDecision.
3. **Admission** — review decisions → receipts (`admitted-to-depository` when approved).
4. **Earning supply intelligence** — likely demand, unmet read demand, compensation ranges (zeroed when unestimatable), recommendations.
5. **Organization policy + wallet authority** — required actions for `/deposits`.

**Full-stack completeness stats:**

| Stat | Law |
|---|---|
| Option roots | = synthesis.optionCount |
| Positive ROI options | May be >0 when demand Unestimatable (provisional measurement-ranked ROI); earnings **UI** still Unestimatable |
| Admitted options | Increments only after approval → admission |
| Required denials | Must not stick at 2 solely because `depositApproved` is false; sub-critical + under limit + grants + wallet + role ⇒ approve/submit allowed |

**Demand law:** search settled/admitted Depository AssetPacks only (`estimateDepositorySettledDemand`); floor of settled packs; no hardcoded client weights; UI **Unestimatable** when not estimatable.

### G3-10 Telemetry, observability, debugging

| Concern | Law |
|---|---|
| Source-safety gate | `sourceSafeStreamEvent` — metadata allowlist for `llm` stores; withhold message/content; structural summary only |
| Log row kinds | **Only** (1) LLM generation leaves (2) Tool uses — no intermediate store fragment rows |
| Pills | Phase → Agent → Step → Failsafe → Thinkings (generation) |
| Live SSE | Relay raw `event_data` with namespace/key/executionState intact |
| History reload | Paginate events; `?tail=N` for end; RunClock from event timestamps |
| Auto-follow | Pin to bottom unless user scrolled away |
| Failure UX | Banner with error message; hover failed/cancelled rows → last call-chain + error |
| Stall indicator | Amber when silence ≥ LLM call timeout default (180s) |
| Cancel | UI Cancel run → cancel API; cooperative polls in deposit background |

### G3-11 `/deposits` UI MVP completeness

| Surface | Law |
|---|---|
| Master table | Deposit pipeline runs; filters; select → URL `transactionId` |
| Compose (+) | Open new deposit configuration |
| Config | Editable until synthesis dispatched; Obfuscations + Permissible sources + Impermissible sources |
| Telemetry accordion | Source-safe SDIVF stream for attached run |
| Options cards | Kind, title, summary, contents panel, absolutes, relative, policy, earning estimate, approve/archive |
| Earnings panel | All-repos supply: Likely demand / Unfit Evaluation / Expected compensation — Unestimatable when required |
| Authority panel | Wallet, deposit policy, required denials, roots |
| Activity anchors | Obfuscations anchors; option anchors to ledger |

### G3-12 Error handling and fail-closed postures

| Failure | Posture |
|---|---|
| Zero admissible options | Fail run; clear message; no silent empty complete |
| LLM timeout | Per-call reject; agent/pipeline fails; surface message with model id when known |
| Missing sandbox auth | Fail closed before create |
| Cancel mid-run | `cancelled`; no flip to failed |
| Orphan stuck running | Sweep → `interrupted` (not cancelled) |
| Prompt too large / Invalid string length | Scope sourceCheckoutCatalog; safePromptJson; never put full sources in prompts |
| Empty obfuscations on monorepo | Skip input-comprehension LLM (no thrash) |
| Thin Depository demand | Unestimatable — never invent % |

### G3-13 Environment rebuild checklist

| Variable | G3 law |
|---|---|
| `BITCODE_ASSET_PACK_REAL_INFERENCE` | `true` for live deposit |
| `BITCODE_LLM_PROVIDER` / `BITCODE_LLM_MODEL` | `anthropic` / `claude-haiku-4-5` product default |
| `BITCODE_LLM_CALL_TIMEOUT_MS` | `180000` |
| `BITCODE_PIPELINE_HOST` | unset=local; `sandbox`=in-box |
| `BITCODE_DEPOSITORY_VECTOR_SEARCH` | `1` enables embedding + Supabase match RPC when credentials present |
| `XAI_API_KEY` | Required for xAI provider path when selected |
| Vercel sandbox auth | OIDC or token+team+project when sandbox host |
| Supabase | executions + execution_events migrations applied |

### G3-14 Implementation source map (rebuild index)

| Area | Path |
|---|---|
| Pipeline entry / preprocess | `packages/asset-packs-pipelines/domain/src/index.ts` |
| Deposit phase roster | `packages/asset-packs-pipelines/domain/src/phases/deposit-phases.ts` |
| Discovery registration | `packages/asset-packs-pipelines/domain/src/phases/discovery.ts` |
| Cross-phase store law | `packages/asset-packs-pipelines/domain/src/synthesize-asset-packs.ts` |
| sourceCheckoutCatalog resolve | `packages/asset-packs-pipelines/domain/src/resolve-source-checkout-catalog.ts` |
| Deposit agents | `…/agents/{setup,discovery,implementation,validation,finish}/deposit-*.ts` |
| Absolutes catalog | `packages/generic-asset-packs/synthesis/src/measurement-catalogs.ts` |
| Measured patch type | `packages/generic-asset-packs/synthesis/` |
| Measure host | `…/agents/validation/agent-measure-absolutes.ts` |
| Static analysis tool | `…/agents/validation/source-static-analysis-tool.ts` |
| Depository search pure | `…/tools/deposit-depository-asset-pack-search.ts` |
| Real option projection | `deposit-option-real-synthesis.ts` |
| Policy / admission / earnings | `deposit-asset-pack-option-policy.ts`, `deposit-asset-pack-option-admission.ts`, `depositor-earning-supply-intelligence.ts` |
| Settled demand | `depository-settled-demand-estimate.ts`, `apps/uapi/lib/depository-settled-demand.ts` |
| Hosts | `packages/pipeline-hosts/` (LocalHost, VercelSandbox, …) |
| Provisioning | `apps/uapi/lib/deposit-source-provisioning.ts` |
| Synthesize route / dispatch | `apps/uapi/app/api/deposit/synthesize-options/` |
| Demand route | `apps/uapi/app/api/deposit/demand-estimate/route.ts` |
| Cancel | `apps/uapi/lib/execution-cancel.ts`, `apps/uapi/app/api/executions/[runId]/cancel` |
| Stream safety | `packages/pipelines-generics/src/streaming/*` |
| UI page shell | `apps/uapi/app/deposits/page.tsx` (thin mount) |
| UI orchestration | `apps/uapi/components/deposits/DepositPageClient/DepositPageClient.tsx` |
| UI pure models | `apps/uapi/components/deposits/models/` |
| UI hooks | `apps/uapi/components/deposits/DepositPageClient/hooks/` |
| UI units | `DepositSourceSelection`, `DepositObfuscationsPanel`, `DepositAssetPackOptions`, `DepositPipelinesMaster`, `DepositSynthesisTelemetry`, `DepositActivityLedgerDetail`, `DepositRouteStateAside` under `apps/uapi/components/deposits/` |
| Layout contract | `internal-.docs/BITCODE_SOURCE_LAYOUT.md`, `apps/uapi/components/deposits/README.md` |
| LLM defaults | `packages/generic-llms/src/defaults.ts` |
| DB | `supabase/migrations/20260515010000_terminal_execution_history.sql` |
| Prompt contracts (test) | `…/__tests__/deposit-agent-prompt-contracts.test.ts` |
| Parity algorithm rows | `BITCODE_SPEC_V49_PARITY_MATRIX.md` § Deposit SDIVF target algorithm |

**Non-canonical companions (not rebuild law):** `ASSET_PACKS.md`, `README.md`,
`FAMILIARIZATION.md`, `AGENTS.md` — may summarize or link this SPEC; they must
not supply omitted system semantics.

#### G3-14a Deposit experience modularization law (rebuild)

The `/deposits` commercial surface is modular by SRP, not a single god client:

1. **Page shell** (`apps/uapi/app/deposits/`) mounts only; no domain logic.
2. **Orchestration** (`DepositPageClient`) wires state and handlers; pure
   projections and IO belong in `models/` and `hooks/`.
3. **Named component units** own discrete UI responsibilities (source,
   obfuscations, options, pipelines master, telemetry, ledger detail, aside).
4. **Hooks** own live runs, URL navigation, settled demand, network count, and
   synthesis activity/stream clocks.
5. **Models** own activity-ledger projections, route-session input assembly,
   criticality, demand shapes, and run-status mapping — unit-tested without React.
6. Rebuilders must follow `internal-.docs/BITCODE_SOURCE_LAYOUT.md`; do not
   reassemble deposit law into a single multi-thousand-line page client.

Package modularization (deposit domain): depository-search, deposit option
policy/admission/options/earnings/demand, depository-supply-index, and
asset-packs-synthesis are split into types/helpers/builders with stable public
entry paths under `@bitcode/asset-packs-pipelines-domain/*`. Host plan builder is
split from in-box runner templates. Agents co-locate schema/prompts/checks.


### G3-15 Deposit synthesis completion condition

Rich deposit synthesis law (G3) is satisfied when:

1. This SPEC family states rebuild law for deposit SDIVF end-to-end (measurement law + this section + PARITY matrix rows D-01…D-18) **without** requiring `ASSET_PACKS.md`, `README.md`, `FAMILIARIZATION.md`, or superseded `BITCODE_SPEC_V*.md` files.
2. Implementation matches G3-1…G3-14 (deposit-native roster, sourceCheckoutCatalog, absolutes, Finish schemas, store-visibility).
3. Automated tests for package + uapi deposit/route/telemetry suites pass; Gate Quality CI green on PR into `version/v49`.
4. Demand honesty (Unestimatable or settled-grounded) and full-stack stats (ROI/denials) do not present incomplete zeros for healthy sub-critical options with wallet authority.
5. Every Execution store, agent schema, tool, and UI expectation listed in G3-5…G3-11 is implemented or explicitly bounded as deferred with a SPEC reopen condition.


## V49 rich read synthesis law (SynthesizeRead DataPacks SDIVF) and commercial read full-stack law

> **Section ids:** `G4-*` are stable identifiers inherited from V48 (read/buyer
> pipeline law) and do not name V49 gates. The flagged one-call **quick** read
> pipeline is specified in the V49 quick synthesis law and shares this
> chapter's request, store, Finish, and settle hand-off law.

Read synthesize is **nearly identical** to deposit synthesize (same SDIVF shape,
many shared agents). Instruction input is **Evaluation** (not Obfuscations).
Measurements include **relatives** (Relative family: static fit,
Evaluation-inferred fit, benchmark delta). BTC settle / PR ship are **not** in
this pipeline.

### G4-1 Product split (three commercial pipelines)

| Pipeline | Pattern | Purpose |
|---|---|---|
| **SynthesizeDepositAssetPacks** | SDIVF | Depositor repo + Obfuscations → option selection on `/deposits` |
| **SynthesizeReadAssetPacks** | SDIVF | Reader repo + **Evaluation** → option selection on `/reads` |
| **settle-asset-pack-pipeline** | **Simple** (linear) | **1:1 DataPack : pipeline run** after buy: pay → mint BTD → rights → PR-ship → `/exchange` activity |

Synthesize-deposit and synthesize-read look like each other (multi-option). Settle does **not**: each bought option starts its own settle pipeline.

### G4-2 Read SDIVF sequence (mirrors deposit)

| Phase | Sequence |
|---|---|
| preprocess | Evaluation + repository + sourceCheckoutCatalog on shared root (`read:*`) |
| Setup | clone alone → parallel {initialize-lsp, initialize-mcps-tools, **comprehend-evaluations**} → **danger-wall** (admits Evaluation + dynamic *-fit plan) |
| Discovery | parallel {comprehend-codebase, search-depository, inherent-regurgitation} (shared with deposit) |
| Implementation | `implementation:read-asset-pack-synthesis` — patch (+ `sourceAttributions`) + `resolveMeasureSourceSet` + host attaches absolutes + materialIdentity + measureReport + relatives (static fit, Evaluation-inferred fit, benchmark delta when selected) |
| Validation | `validation:ready-to-finish-asset-packs-synthesis-read-pipeline` — A/B/C + Relative kind-pattern law |
| Finish | store-artifacts → ledgerize → finish-synthesize-read-run (selection envelope for settle) |

### G4-3 Relatives measurement law (read)

```
measurements: {
  absolutes: AbsoluteReading[];       // same full catalogue as deposit (+ status)
  relatives: RelativeReading[];       // *-fit or benchmark-delta:<id>
  materialIdentity?: MaterialIdentityBag;
  measureReport?: DataPackMeasureReport;
}
```

| Subkind | Examples | Law |
|---|---|---|
| Static catalogue | `language-fit`, `domain-fit`, `interface-fit` | Fixed weights; always measured on read options |
| Evaluation-inferred | `session-refresh-fit` | Planned in Setup comprehend-evaluations; host measures |
| Benchmark delta | `benchmark-delta:parse-throughput` | Declared + selected benchmark; benchmark runner measures (no model) |
| Composite | `evaluation-fit` | **Not** a raw row — subfamily-mass weighted mean of relatives |

Deposit: `relatives: []` always. Read: fail-closed if relatives empty or any kind violates the Relative kind-pattern law.
Read absolute measure path **must** share deposit deep source-set + honesty law.

### G4-4 User experience parity (`/reads` vs `/deposits`)

| Surface | Deposit | Read |
|---|---|---|
| Instruction | Obfuscations | **Evaluation** |
| Submit | synthesize-options | `POST /api/read/synthesize-options` |
| Review options | master-detail + option cards | master-detail + option cards (same pattern) |
| Next step after select | admit to Depository | **settle-asset-pack-pipeline** (pay → rights → PR) |

### G4-5 SettleAssetPack Simple stages (binding)

**Cardinality:** SynthesizeRead produces multiple options; the buyer may select
one or more. **Each bought option starts its own** `SettleAssetPackSimplePipeline`
run (1:1 AssetPack : settle pipeline). Never settle multiple packs inside one run.

**Pay / earn law:** Buyers **never pay in BTD**. Buyers pay **ETH, BTC, or SOL**
at spot vs BTD (mock spots allowed on testnet). Contributing depositors **earn**
via mint on settle (Relative-family volume after supply decay) and the coin
payment, both split by **source-to-shares** over the option's source
contribution set; each contributor then chooses their own `sellerBtdBps` split
of their slice. The **coin leg takes the protocol coin fee**
(`BITCODE_PROTOCOL_COIN_FEE_BPS`, default 500) before contributor allocation;
the **BTD leg has no fee**. Unchosen BTD is not minted to the contributor (it
stays with the treasury per the inverse split). Buyer receipt is **AssetPack
co-own NFT + delivery**. Full law: V49 settlement completion law.

| # | Stage / agent | Law |
|---|---|---|
| 1 | `validate-settlement-readiness` | Exactly one `assetPackOption`; fail-closed if zero or many |
| 2 | `settle-payment` | Observe / project pay rail (ETH on-chain; BTC/SOL attested) |
| 3 | `quote-btd-volume` | Relatives → rawV → residual-supply **decay** → V; multi-rail spot options |
| 4 | `finalize-settle` | `BitcodeERC1155`: mint **100% V BTD to escrow (master)**; add buyer co-owner; burn AP forbidden. Take protocol coin fee; build source-to-shares proof over contributions; persist `compensationStatement` with one `awaiting-split` slice per contributor. No contributor payout distributed yet. |
| 5 | `ship-asset-pack-patch-pr` | Open PR on **read** repo applying that option’s `.patch`; PR body carries contributors, evaluation-fit, Absolute/Relative summary (incl. benchmark deltas) |
| 6 | `journal-and-exchange-activity` | `/exchange` settled DataPack activity row + one `pendingPayout` slice per contributor |

#### Contributor payout finalize (Exchange detail)

After settle, **each contributing seller** opens the settled DataPack on
`/exchange` (or from *Sold DataPacks* on `/deposits`) and sets `sellerBtdBps`
for **their own slice** with a slider (BTD % vs pay-asset %; **ETH for V0**).
For contributor `c` with slice `(sliceBtd_c, slicePay_c)`:

```
contributor receives: sellerBtdBps/10000 of sliceBtd_c + (10000-sellerBtdBps)/10000 of slicePay_c
treasury receives:    inverse remainder of each asset of that slice
```

Example: sellerBtdBps=1000 → contributor 10% of slice BTD + 90% of slice ETH;
treasury 90% of slice BTD + 10% of slice ETH.

Buyer (entitled co-owner) may view the **patch summary** on pack detail after settle.
`POST /api/packs/payout/finalize` persists one contributor's split keyed by
`(settleRunId, sellerUserId)`; only that contributor may finalize it, once.

#### BTD (Bitcode) fungible token — volume and mint

- **BTD** is a finite fungible token named Bitcode with max supply **21,000,000**
  whole tokens (18 decimals). Freely transferable for external markets.
- **Volume uses relatives only** (absolutes never set V):

```
weightedRelativesSum = Σ (w_i × clamp01(volume_i))   // weighted Relative rows only
evaluationFitVolume  = weightedRelativesSum / Σ w_i   // ∈ [0,1]
rawV                   = floor(evaluationFitVolume × 10^18)
V                      = floor(rawV × decay)   // decay from residual 21M supply
```

- Mint destination is **contributor share recipient(s)** per source-to-shares
  slice and each contributor's `sellerBtdBps`, only on that contributor's finalize.
- Buyers do **not** receive fungible BTD mint as purchase receipt.

#### BitcodeERC1155 (single contract)

| Token | ID | Kind | Behavior |
|---|---|---|---|
| BTD (Bitcode) | `0` | Fungible | Cap 21M; mint on settle to depositor slices; free transfer |
| AssetPack | `≥ 1` | NFT co-ownership | `registerAssetPack`; add-only co-own; burn **forbidden** |

Pay entrypoints: `settleReadWithEth` (ETH); `settleReadWithExternalPay` (BTC/SOL + attestor).

Sources of truth:

- Solidity: `packages/btd/contracts/BitcodeERC1155.sol`
- TS mirror + decay + spot: `packages/btd/src/erc1155/`
- Pipeline: `packages/asset-packs-pipelines/settle/`

### G4-6 `/exchange` master-detail

Network-scope activity: searchable master table + detail for a selected DataPack
(settled/admitted supply and settled read deliveries). Unpaid viewers see
measurements + commercial prose + proof roots only; entitled viewers may download
`.patch` bodies after rights. Purchase CTA may deep-link to `/reads?intent=purchase`.

### G4-7 Implementation source map (read / settle / exchange)

| Area | Path |
|---|---|
| Read phases | `packages/asset-packs-pipelines/syntheses/domain` + read product package |
| Read product package | `packages/asset-packs-pipelines/syntheses/read/` |
| Evaluation comprehension | `agents/setup/read-evaluations-comprehension-agent.ts` |
| Read synthesis | `agents/implementation/read-*-synthesis-agent.ts` |
| Relatives helpers | `@bitcode/generic-measurements-relatives` |
| Settle package | `packages/asset-packs-pipelines/` settle Simple pipeline |
| BitcodeERC1155 | `packages/btd/contracts/BitcodeERC1155.sol`, `packages/btd/src/erc1155/` |
| Relatives → BTD | `computeSettlementBtdFromRelatives` (`@bitcode/btd/erc1155`) |
| Read API | `apps/uapi/app/api/read/synthesize-options/`, `apps/uapi/app/api/read/settle/` |
| UI | `apps/uapi/components/reads/*`, `apps/uapi/components/exchange/*` |

## V49 Evaluations rename law (Gate 2)

V49 renames the buyer instruction **Need** to **Evaluation** and the reader-
relative measurement family **needinesses** to **Relative** (`relatives`). The
rename is **total**: source symbols, files, packages, wire fields, prompts,
product copy, tests, and stored rows move together. There is **no dual-read**
of V48 names after Gate 2; stored V48-shaped rows are rewritten once by a
migration.

### E-1 Vocabulary map (binding)

| V48 term | V49 term |
|---|---|
| Need (product) / Needs (UI) | **Evaluation** / **Evaluations** |
| `ReadNeed`, `need`, `needText`, `needId` | `ReadEvaluation`, `evaluation`, `evaluationText`, `evaluationId` |
| accepted Need / synthesized Need | accepted Evaluation / synthesized Evaluation |
| Need anchor (`contextSource: 'read-need-anchor'`) | Evaluation anchor (`'read-evaluation-anchor'`) |
| `comprehend-needs` (Setup agent key) | `comprehend-evaluations` |
| `read-need-fits` (Depository search lens) | `read-evaluation-fits` |
| needinesses / neediness / `'neediness'` category | relatives / relative / `'relative'` category |
| `need-fit`, `needFit`, `needFitVolume` | `evaluation-fit`, `evaluationFit`, `evaluationFitVolume` |
| `computeNeedFitVolume` | `computeEvaluationFitVolume` |
| `computeSettlementBtdFromNeedinesses` | `computeSettlementBtdFromRelatives` |
| `ASSET_PACK_NEEDINESSES_CATALOG` | `ASSET_PACK_RELATIVES_CATALOG` |
| `assertNeedinessKindSuffix` | `assertRelativeKindPattern` |
| `@bitcode/generic-measurements-needinesses` | `@bitcode/generic-measurements-relatives` |
| Need-Fit DataPack | Evaluation-Fit DataPack |
| buyer states `read-need-*` | `read-evaluation-*` |
| `depository_search_index.neediness_kinds` | `depository_search_index.relative_kinds` |

Words that are not the product concept (e.g. "need" as an ordinary English
verb in prose) are not renamed.

### E-2 Source moves (representative; codemod is exhaustive)

| V48 path | V49 path |
|---|---|
| `packages/generic-measurements/needinesses/` | `packages/generic-measurements/relatives/` |
| `syntheses/read/src/read-need.ts` | `syntheses/read/src/read-evaluation.ts` |
| `syntheses/read/src/read-neediness-measurements.ts` | `syntheses/read/src/read-relative-measurements.ts` |
| `syntheses/read/src/agents/setup/read-need-comprehension-agent.ts` | `.../read-evaluation-comprehension-agent.ts` |
| `syntheses/read/src/agents/discovery/read-depository-search-for-need-fits-agent.ts` | `.../read-depository-search-for-evaluation-fits-agent.ts` |
| `syntheses/read/src/read-need-review-resynthesis.ts` | `.../read-evaluation-review-resynthesis.ts` |
| `syntheses/domain/src/asset-packs-synthesis-neediness.ts` | `.../asset-packs-synthesis-relative.ts` |
| `packages/btd/src/erc1155/settlement-btd-from-needinesses.ts` | `.../settlement-btd-from-relatives.ts` |
| `apps/uapi/components/reads/ReadsNeedComposePanel/` | `.../ReadsEvaluationComposePanel/` |
| `apps/uapi/components/reads/ReadsNeedAnchorControls/` | `.../ReadsEvaluationAnchorControls/` |
| `apps/uapi/components/reads/ReadsNeedPathPickers/` | `.../ReadsEvaluationPathPickers/` |

The codemod was `.codemods/v49-evaluations-rename.cjs` (temporary per
`.codemods/README.md`, removed in the Gate 2 commit after verification; TypeScript-AST rewrite of identifiers, string and
template literals, JSX text, and comments with a case-preserving token map;
historical-artifact tokens and English verb uses of "needs" are protected). Execution store namespaces move with it
(`read/need` → `read/evaluation`). Prompt
PromptParts (`comprehendread_*`, `synthesizereads_*`,
`assetpacksynthesizeartifacts_*`, read synthesis / commercial-nl / validation
read prompts) are rewritten in prose, not token-substituted.

### E-3 Product copy

- `/reads` compose panel heading **Evaluations**; textarea
  `reads-evaluation-input` with placeholder "Describe how candidate DataPacks
  should be evaluated against this repository…"; help text states that
  Evaluations are measured as Relative measurements (and benchmark deltas when
  benchmarks are selected).
- Option cards group measurements under **Absolute** and **Relative**; the
  composite is labeled **Evaluation fit (buy signal)**.
- Docs, deposit/exchange explainers, marketing copy, and page metadata use
  Evaluation / Absolute / Relative.

### E-4 Stored-row migration (binding)

One idempotent Supabase migration:

1. `ALTER TABLE depository_search_index RENAME COLUMN neediness_kinds TO relative_kinds`.
2. Rewrite exact quoted JSON tokens (keys and whole string values) in
   `executions.input/output/context/items/config/error` and exact text values
   of `executions.type`, using the codemod's token map (e.g. `need` →
   `evaluation`, `needText` → `evaluationText`, `needinesses` → `relatives`,
   `needFit` → `evaluationFit`, `neediness` → `relative`, `read-need-anchor` →
   `read-evaluation-anchor`, `read/need` → `read/evaluation`).
3. Apply the same rewrite to `execution_events.event_data` and exact text
   values of `event_type`, `phase`, and `agent_name`.

Migration file: `supabase/migrations/20261018120000_v49_evaluations_rename.sql`.
English prose inside stored strings is not rewritten.

The migration must be idempotent (re-running is a no-op) and must not touch
frozen historical migrations. After it runs, no product code reads V48 keys.

### E-5 Historical checks

Frozen pre-V48 gate scripts that reference V48 Need vocabulary (for example
`scripts/check-v28-gate10-read-need-comprehension.mjs`) remain unedited and
unexecuted per specifying law §4.3/§13.1. The living CI step
`gate-test-read-need` is renamed `gate-test-read-evaluation` and targets the
renamed suites. V48 active-canon checks that run during V49 drafting must stay
green; Gate 2 verifies none of them depend on Need vocabulary.

### E-6 Completion

Gate 2 closes when no living source, prompt, wire field, test, or product copy
uses Need / neediness vocabulary for the product concept; the migration
exists and is idempotent; `.proofs/v49/evaluations-rename.json` records a
vocabulary scan (zero living hits outside frozen paths) and source-root
digests; and `check:v49-gate2` passes.

## V49 quick synthesis law (Gate 3)

Quick synthesis performs **deposit** and **read** DataPack option synthesis
with **exactly one model call per run**, as a flagged alternative to rich
SDIVF. It is real synthesis over the real repository: real file bodies, real
patches, real measurements, real validation. It exists for demonstration speed
and for experimentation with single-prompt synthesis.

### Q-1 Mode resolution

```
SynthesisPipelineMode = 'rich' | 'quick' | 'demonstration'

resolveSynthesisPipelineMode({ requested }) =
  demonstration mode on (BITCODE_DEMONSTRATION_MODE) and
    BITCODE_DEMONSTRATION_SYNTHESIS != 'quick'          → 'demonstration'
  requested ∈ {'rich','quick'}                          → requested
  BITCODE_SYNTHESIS_PIPELINE ∈ {'rich','quick'}         → that value
  otherwise                                             → 'rich'
```

- `requested` is the optional `synthesisPipeline` field on
  `POST /api/deposit/synthesize-options` and `POST /api/read/synthesize-options`.
  Invalid values fail with 400 `invalid_synthesis_pipeline`.
- The UI shows a **Quick / Rich** toggle in the deposit and read compose panels
  only when `NEXT_PUBLIC_BITCODE_SYNTHESIS_PIPELINE_TOGGLE=1`; otherwise the
  request omits the field.
- The resolved mode is persisted on the execution row as
  `context.synthesisPipeline` and shown in run detail.

### Q-2 Pipeline identity

| Pipeline | Pattern | Entry |
|---|---|---|
| `SynthesizeDepositAssetPacksQuick` | `QUICK` (`factoryExecutionPipelineQuick`) | `runExecutionPipelineQuickSynthesizeDepositAssetPacks(input, execution)` |
| `SynthesizeReadAssetPacksQuick` | `QUICK` | `runExecutionPipelineQuickSynthesizeReadAssetPacks(input, execution)` |

Package: `packages/asset-packs-pipelines/syntheses/quick/`
(`@bitcode/asset-packs-pipelines-syntheses-quick`). The single stage is one
quick agent built with `factoryQuickAgent` (`agent-generics`), named
`quick-synthesize-deposit-asset-packs` / `quick-synthesize-read-asset-packs`.
Inputs are the same pipeline inputs the rich pipelines receive (repository,
reference, permissible/impermissible sources, obfuscations or Evaluation,
depository supply, benchmark selection on read).

### Q-3 Stage sequence inside the quick agent

| # | Step | Model calls | Law |
|---|---|---|---|
| 1 | **Gather** | 0 | Tools only: repository tree (GitHub REST or host checkout), permissible/impermissible scoping, file bodies, rank + cap via `projectInventoryForSynthesisProvider` with the quick budget (`BITCODE_QUICK_SYNTHESIS_MAX_FILES` default 80, `BITCODE_QUICK_SYNTHESIS_MAX_CHARS` default 300000; Evaluation/obfuscation keyword and path-hint ranking; manifests always included). Read: source-safe Depository supply summary (≤ 24 admitted DataPacks: id, title, summary, kind, absolute composite, covered paths) |
| 2 | **Synthesize** | **1** | One call to `execution.llms.getDefaultLLM()` with the quick Prompt (system + user) and the quick output schema. No tool use, no retry, no judge, no structured-output repair call. One local JSON repair parse is permitted |
| 3 | **Measure** | 0 | Absolutes: `resolveMeasureSourceSet` → `measureQuickDataPackAbsolutes` (structural kinds `measured` from patch bodies; qualitative kinds `estimated` from the model's quality profile, never `measured`). Read relatives: static fit via host measure fallback; Evaluation-inferred fit rows from the call output as `estimated`; benchmark deltas via the benchmark runner (Benchmark-delta law) |
| 4 | **Store** | 0 | Write the same stores rich synthesis writes (`implementation.options`; read: `read.*`, `validation.readyToFinish`) and then run the real Finish (`runReadFinishSynthesizeRunAgent` on read; deposit dispatch post-run validation/projection) |

Telemetry emits the same phase rows as rich synthesis (Setup → Discovery →
Implementation → Validation → Finish) mapped to steps 1→1→2→3→4 so product
pipeline pills and logs render unchanged; each row carries
`pipeline: 'quick'`.

### Q-4 Quick output schema

`quickSynthesisSchema` extends the rich candidate set
(`depositCandidateSetSchema`) per option with:

- `commercialTitle`, `commercialDescription` (replacing commercial-nl agent);
- `qualityProfile` (inputs to estimated qualitative absolutes);
- read only: `relativeRows[{ measurementKind (-fit), label, guidance, volume,
  rationale }]` (Evaluation-inferred fit) and
  `sourceAttributions[{ depositoryAssetPackId, weight, rationale }]`;
- read only: `benchmarkIds[]` — declared benchmark ids the Evaluation text
  references (unioned with the explicit selection; never ids outside the
  manifest).

2–4 options, same option kinds, same patch law (create|modify with full bodies,
no delete ops) as rich synthesis.

### Q-4a Realization map (binding paths)

| Concern | Path |
|---|---|
| Mode resolution + request parse | `syntheses/domain/src/synthesis-pipeline-mode.ts` (`resolveSynthesisPipelineMode`, `parseRequestedSynthesisPipeline`) |
| Profile absolutes (shared with demonstration) | `syntheses/domain/src/profile-absolutes.ts` (`measureProfileDataPackAbsolutes`) |
| Quick package | `syntheses/quick/src/` — schema, prompts, Gather tool (`quickSynthesisGatherSourceTool`), call counter (`countLlmCallsFromExecutionTree`), options projection, agent (`executeQuickSynthesis`), `deposit.ts`, `read.ts` |
| Website runners | `apps/uapi/lib/quick-synthesis.ts` (GitHub REST loader via `readGitHubRepositoryFileTexts`) |
| Dispatch seams | `dispatch-deposit-synthesis.ts`, `dispatch-read-synthesis.ts` (`context.synthesisPipeline`) |
| Toggle | `components/bitcode/routes/BitcodeSynthesisPipelineToggle`, `components/bitcode/pipeline/models/synthesis-pipeline-preference.ts` (rendered by `ProductSynthesizeDataPackOptionsButton`) |
| Living CI | `gate-test-quick-synthesis` |

Read options carry the call's validated `sourceAttributions` (admitted supply
ids only) and `benchmarkIds` (declared ids only); Gate 4 and Gate 5 consume
them.

### Q-5 Invariants

- **Exactly one model call** per quick run: the execution tree contains exactly
  one `llm/usage` record (`sumLlmTokensFromExecutionTree` call count = 1).
  A second call is a defect.
- Post-run law is shared with rich synthesis: `validateDepositSynthesisOptions`
  (covered paths in inventory, not excluded, non-empty, formal absolutes),
  read Validation kind-pattern law, Finish selection envelope, unpaid/full
  option split, persistence, `/exchange` activity.
- Models never invent absolute volumes, benchmark results, or material
  identity; quick only supplies the qualitative profile that becomes
  `estimated` rows and Evaluation-inferred fit volumes marked `estimated`.
- Parse failure or zero valid options fails the run (`quick_synthesis_failed`)
  with the source-safe reason; no hidden fallback to rich.

### Q-6 Completion

Gate 3 closes when both quick pipelines exist on `factoryExecutionPipelineQuick`
+ `factoryQuickAgent`; mode resolution and the request field/UI toggle exist;
both dispatchers branch on the resolved mode; tests prove one model call per
run, schema validation, deterministic absolutes honesty, and shared post-run
validation; the read dispatcher's pre-pipeline `provisionDepositCheckout`
call (wrong argument shape, always skipped, and contrary to the no-clone-
during-initialization law) is removed so rich read Setup clones on the Host
like deposit; `.proofs/v49/quick-synthesis.json` is generated; and
`check:v49-gate3` passes.

## V49 settlement completion law (Gate 4)

### S-1 Source contribution set

Every synthesized read option carries:

```
sourceContributions: {
  schema: 'bitcode.read.source-contributions';
  version: 1;
  mode: 'contributors' | 'treasury-only';
  sources: Array<{
    depositoryAssetPackId: string;
    admissionRunId: string;
    sellerUserId: string;
    weightBps: number;      // integer; Σ = 10000 when mode = contributors
    rationale: string;      // source-safe
  }>;
}
```

Derivation (`resolveReadOptionSourceContributions`,
`syntheses/domain/src/source-contributions.ts`):

1. Candidate attributions come from synthesis: rich Implementation emits
   `sourceAttributions` against Discovery `fitDeposits`; quick emits them in its
   single call.
2. Keep only attributions whose `depositoryAssetPackId` is in the run's
   preloaded admitted, seller-linked Depository supply; drop unknown ids and
   non-positive weights.
3. Merge duplicates (sum), normalize to integer basis points with largest-
   remainder rounding so Σ = 10000.
4. Zero survivors ⇒ `mode: 'treasury-only'`, `sources: []` (explicit; the whole
   net coin and BTD go to treasury and the UI says so).

`ReadOptionSupplyProvenance` (single admission) is retired; demonstration
options emit the same contribution shape.

### S-2 Settle accounting

In `finalize-settle`:

```
grossPay      = observed payment amount (wei | sats | lamports)
protocolFee   = floor(grossPay × BITCODE_PROTOCOL_COIN_FEE_BPS / 10000)   // default 500
netPay        = grossPay − protocolFee
V             = settlement BTD (Relative-family volume after decay)
proof         = buildSourceToSharesProof({ fitDeposits: contributions, btdRange: V, feeQuote: netPay, … })
slice_c       = (sliceBtd_c, slicePay_c) from proof.rangeSlices / settlementAllocations
```

- Conservation: `Σ slicePay_c = netPay`, `Σ sliceBtd_c = V`,
  `protocolFee + netPay = grossPay` (fail closed otherwise).
- Persist on the settle row: `sourceToShares` (proof root + slices) and
  `compensationStatement { gross, protocolFee, net, payAsset, btdVolume,
  contributors[{ sellerUserId, depositoryAssetPackId, weightBps, sliceBtd,
  slicePay, status: 'awaiting-split' | 'finalized', finalizedSplit? }] }`.
- `coinFeeBps` on the projected BitcodeERC1155 state is set from the same env.
- Supply decay uses the projected minted total (sum of finalized + escrowed BTD
  across settles) instead of zero.

### S-3 Settle route authority (binding)

- Payout identities (`depositorEthereumAddress`, `masterEthereumAddress`, any
  seller account) are **resolved server-side only** from contribution
  `sellerUserId` wallet bindings and treasury env; request-body values are
  ignored and rejected with 400 `payout_address_not_client_settable` when
  present.
- Payment proof is required by default on testnet rails
  (`BITCODE_SETTLEMENT_REQUIRE_PAYMENT` defaults to on; `0` opts out for local
  development only).

### S-4 Contributor payout finalize

- `POST /api/packs/payout/finalize { settleRunId, sellerBtdBps }` finalizes the
  caller's slice (`sellerUserId = session user`); 403 if the caller is not a
  contributor; 409 if that slice is already finalized.
- `computePayoutSplit` is applied to the slice (not the whole settle).
- `GET` preview requires authentication and returns only the caller's slice
  and the statement totals.
- `projectAccountHoldingsFromSettlements` credits each contributor with their
  finalized slice BTD; buyers never receive BTD.

### S-5 Viewers

| Viewer | Route | Content |
|---|---|---|
| **Sold DataPacks** (seller) | `/deposits` aside (`DepositSoldDataPacks`) | One row per contributor slice: pack, weight, slice BTD, slice coin, fee share, status (awaiting split / finalized), link to finalize |
| **Owned DataPacks** (buyer) | `/reads` aside (`ReadsOwnedDataPacks`) | Settled packs owned by the viewer: title, PR link + delivery status, payment explorer link, compensation statement summary, redeliver action |
| **Exchange detail** | `/exchange` | Compensation statement (gross, fee, net, contributors); slider only for the viewer's own awaiting slice |

All viewers are source-safe; owned packs link to entitled `.patch` download.

### S-6 Delivery and redelivery

- PR body adds: contributors (titles, weights), evaluation-fit, Absolute and
  Relative summaries (benchmark rows with baseline → candidate), protocol fee
  and payment link.
- `POST /api/read/settle/redeliver { settleRunId }` (buyer only) retries
  delivery when status is `projected` or `failed`; idempotent on the
  `bitcode/settle-*` branch (reuses an existing open PR); records a
  redelivery receipt and moves the buyer state to
  `repository-delivery-redelivered` on success.

### S-7 Completion

Gate 4 closes when contributions are derived/validated for rich, quick, and
demonstration reads; settle takes the fee, builds source-to-shares, and
persists statements with conservation; payout identities are server-only;
per-contributor finalize, owned/sold viewers, and redelivery exist; tests prove
conservation, authority, and a two-contributor settle; `.proofs/v49/settlement-
completion.json` is generated; and `check:v49-gate4` passes.

## V49 benchmark-delta Relative law (Gate 5)

### B-1 Benchmark manifest

A reader repository **declares** benchmarks in `.bitcode/benchmarks.json` at the
request revision. Nothing else is discovered or inferred.

```
{
  "schema": "bitcode.benchmarks",
  "version": 1,
  "benchmarks": [{
    "id": "parse-throughput",              // /^[a-z0-9][a-z0-9._-]*$/
    "title": "Parser throughput",
    "runtime": "node24" | "python3.13",
    "setup": "pnpm install --frozen-lockfile",   // optional
    "command": "pnpm bench:parse --json out.json",
    "metric": {
      "source": "stdout-regex" | "json-file",
      "pattern": "ops/sec: ([0-9.]+)",       // stdout-regex: first capture group
      "path": "out.json", "jsonPath": "$.hz" // json-file
    },
    "direction": "higher-is-better" | "lower-is-better",
    "unit": "ops/s",
    "runs": 3,                              // 1..5, median used
    "timeoutMs": 120000                     // ≤ 300000 per run
  }]
}
```

Schema and parser live in `packages/generic-measurements/relatives/benchmark-delta`
(`parseBenchmarkManifest`, fail-closed on unknown fields or invalid values).

### B-2 Selection

- `GET /api/read/benchmarks?repositoryFullName&reference` reads and validates the
  manifest via the reader's GitHub installation token and returns source-safe
  benchmark descriptors (`id`, `title`, `unit`, `direction`) or `[]`.
- The Evaluations compose panel lists declared benchmarks as checkboxes
  ("Measure improvement on…"). The read request carries
  `evaluation.benchmarkIds[]`.
- Synthesis may add ids referenced in the Evaluation text (rich:
  comprehend-evaluations; quick: `benchmarkIds` in its output). The selection is
  the union, restricted to declared ids.

### B-3 Runner

`runBenchmarkDeltas` (`packages/pipeline-hosts/src/benchmark-runner.ts`) on the
Vercel Sandbox host (local host in development):

1. One sandbox per read run with the benchmark's runtime; clone the reader
   repository at the request revision.
2. Run `setup` once; run the baseline `runs` times; parse the metric; take the
   median.
3. For each option: restore the clean tree, **write the option's patch file
   bodies directly** (create|modify; full bodies — not `git apply`), re-run
   `setup` only if a manifest file changed, run `runs` times, take the median.
4. Budget: total wall clock ≤ `BITCODE_BENCHMARK_BUDGET_MS` (default 600000);
   remaining options are marked `not_run` when exhausted.
5. Commands run without operator secrets in the environment; network egress is
   allowed only for setup.

### B-4 Reading

```
improvementRatio = direction == higher-is-better
  ? (candidate − baseline) / |baseline|
  : (baseline − candidate) / |baseline|
volume    = clamp01(0.5 + improvementRatio / (2 × BITCODE_BENCHMARK_DELTA_CAP))   // cap default 0.5
magnitude = improvementRatio × 100      // signed percent
status    = 'measured' when both medians parse, else 'insufficient_evidence'
            (setup/command failure, timeout, unparsable metric, baseline 0)
```

A DataPack that does not change the benchmark measures `volume = 0.5`
(neutral); +50 % saturates at 1, −50 % at 0. Weighting follows the Relative
subfamily mass table.

### B-5 Display and delivery

Option cards show benchmark rows under **Relative** (baseline → candidate,
signed %, unit, honesty badge, rationale). PR bodies include them. Benchmark
stdout/stderr is never projected; only parsed values and a source-safe failure
class are stored.

### B-6 Completion

Gate 5 closes when the manifest parser, selection route/UI, runner, reading
law, and evaluation-fit weighting exist for rich and quick reads; a fixture
repository proves a positive delta and an `insufficient_evidence` failure;
`.proofs/v49/benchmark-delta-relatives.json` is generated; and
`check:v49-gate5` passes.

## V49 Claude External law (Gate 6)

### C-1 Purpose

Users connect **Claude** (Claude.ai custom connectors, Claude Desktop, Claude
Code) to Bitcode. Claude acts on the user's behalf through Bitcode's remote MCP
server, authorized by OAuth 2.1 against the user's Bitcode account. Bitcode
does not receive or store the user's Anthropic credentials.

### C-2 Remote MCP server

- Route: `apps/uapi/app/api/mcp/route.ts` (Node runtime), Streamable HTTP
  transport (`@modelcontextprotocol/sdk` ≥ the release providing Streamable
  HTTP server transport and auth metadata helpers).
- Every request requires `Authorization: Bearer <access token>`; missing or
  invalid tokens return 401 with `WWW-Authenticate: Bearer
  resource_metadata="<origin>/.well-known/oauth-protected-resource"`.
- Tools are the Bitcode product tools shared with the stdio server through a
  package (`packages/mcp-generics` product tool registry): `deposit`
  (synthesize deposit options), `read` (synthesize read options with
  Evaluation + optional benchmark ids), `packs` (owned and sold DataPacks with
  compensation statements — no longer a stub), `measure`, and the auxiliary
  read-only panes. Tool results are source-safe under the same disclosure law
  as the website.
- Scopes gate tools: `deposits` (deposit), `reads` (read), `packs` (packs,
  measure, panes).

### C-3 OAuth 2.1 authorization server

| Endpoint | Law |
|---|---|
| `GET /.well-known/oauth-protected-resource` | RFC 9728 metadata naming the authorization server and scopes |
| `GET /.well-known/oauth-authorization-server` | RFC 8414 metadata: authorize, token, register, revoke endpoints; `code_challenge_methods_supported: ["S256"]`; grant types `authorization_code`, `refresh_token` |
| `POST /api/oauth/register` | RFC 7591 dynamic client registration (public clients; redirect URIs must be https or loopback) |
| `GET /oauth/authorize` | Consent page; requires Bitcode sign-in; shows client name, redirect host, scopes; PKCE S256 required |
| `POST /api/oauth/token` | Code exchange (PKCE verify, single-use, ≤ 10 min) and refresh (rotation; reuse revokes the family) |
| `POST /api/oauth/revoke` | RFC 7009 revocation |

Storage (new migration): `oauth_clients`, `oauth_authorization_codes`,
`oauth_tokens` — tokens and codes stored only as SHA-256 hashes with
`expires_at`; access tokens 1 h, refresh tokens 30 d.

### C-4 Claude External in Auxillaries

- `AuxillariesExternalsPane` shows a **Claude** card beside GitHub: connector
  URL (`<origin>/api/mcp`, copyable), add instructions for Claude.ai (Settings →
  Connectors → Add custom connector) and Claude Code
  (`claude mcp add --transport http bitcode <origin>/api/mcp`), connection state,
  active grants (client name, scopes, last used), and **Revoke**.
- First successful token issuance upserts `user_connections` with
  `provider = 'anthropic-claude'` (no secrets in `connection_data`); revoking the
  last grant marks it disconnected. A connected Claude External satisfies the
  onboarding `externals` step alongside GitHub.

### C-5 Plugin and API keys

- `apps/claude` (Bitcode Claude plugin) `.mcp.json` targets the remote server
  (`{ "type": "http", "url": "<origin>/api/mcp" }`); its skill teaches product
  use (deposit, read with Evaluations, packs). The monorepo developer plugin
  variant is kept separately.
- The stdio MCP API-key path is repaired: `user_api_keys` exists in migrations;
  issuance stores `key_hash` (SHA-256) and `expires_at`, never the plaintext key,
  matching the stdio server's verification.

### C-6 Completion

Gate 6 closes when the remote MCP server, OAuth server, Claude card, plugin, and
API-key repair exist; tests prove metadata, PKCE, single-use codes, refresh
rotation, revocation → 401, and scope gating; `.proofs/v49/claude-external.json`
is generated; and `check:v49-gate6` passes.

## V49 whole Bitcode operator chain

1. Seller connects identity, wallet, organization, and source (GitHub
   External); optionally connects Claude (Claude External) to operate Bitcode
   from Claude.
2. Bitcode synthesizes deposit DataPack options (full `.patch` material +
   absolutes + commercial brief) through the resolved synthesis pipeline mode
   (rich SDIVF, quick one-call, or demonstration replay).
3. Seller reviews commercial brief, measurements, and full `.patch` (owner rights)
   and approves an option for Depository admission.
4. Depository indexes admitted DataPack metadata, measurements, embeddings,
   proof roots, and compensation posture.
5. Buyer connects identity, wallet, organization, and target repository.
6. Buyer requests a Read with natural-language Evaluations and optional declared
   benchmarks (or continues from `/exchange` purchase CTA).
7. Bitcode synthesizes an Evaluation and the buyer accepts or resynthesizes it.
8. Bitcode runs Finding Fits against the Depository.
9. Bitcode synthesizes Evaluation-Fit DataPack options with source contribution
   sets, measures Absolute and Relative (incl. benchmark deltas), and produces
   unpaid-safe previews (commercial + measurements; no file bodies).
10. Buyer reviews commercial prose, measurements, contributors, quote (incl.
    protocol coin fee), and proof posture.
11. Buyer settles on a pay rail (**one settle pipeline per bought option**).
12. Bitcode observes payment → takes protocol coin fee → mints BTD volume to
    escrow → builds source-to-shares slices → transfers rights → entitled
    delivery (PR / `.patch`) → journals compensation statement → synchronizes
    `/exchange`.
13. Each contributing seller finalizes their own payout split; buyers see owned
    DataPacks and may redeliver failed deliveries.
14. Operators repair only through proof-backed state transitions.

## V49 canonical subsystem surfaces

### Depositing and asset supply

- Current canonical objects and emitted artifacts: deposit source bundle /
  **sourceCheckoutCatalog**, Host workspace, obfuscation guidance, deposit
  AssetPack option (**patch + measurements + metadata** with formal absolutes),
  Depository AssetPack, measurement vector / absolute readings, relative
  preview or Unestimatable, selection envelope, storedArtifacts bundle,
  ledgerize journal roots, admission receipt, compensation expectation,
  PackActivity row, execution + execution_events rows.
- Current algorithms and derivation rules: **full law in measurement section +
  rich deposit synthesis law G3-1…G3-15** — SynthesizeDepositAssetPacks SDIVF (Setup clone → parallel
  LSP/MCP/obfuscations → danger-wall; Discovery parallel three agents with
  measure-inside-codebase; Implementation 2–4 kinds; Validation A/B/C ready-to-
  finish; Finish store → journal → selection envelope); policy/admission/
  earnings after options; settled-Depository demand estimate.
- Current invariants and fail-closed conditions: no source exposure before
  entitlement; no full catalog bodies in prompts/telemetry; no absolute-volume
  invention by LLMs; no Finish without absolutes; no critical IP admission
  without explicit approval; no compensation claim without settlement evidence;
  danger-wall short-circuit on invalid obfuscations; zero options fails the run.
- Current proof obligations: source connection receipt, option synthesis
  receipt, measurement receipt (absolutes), approval receipt, admission receipt,
  index root, selection-envelope / storedArtifacts schema roots.
- Current source-bearing implementation basis: Host checkout + catalog; source
  remains protected behind source-safe option review and storage boundaries
  (G3-14 source map).
- Current validating commands and parity basis: deposit agent prompt contracts,
  setup/discovery/validation/store-contract tests, PARITY D-01…D-18; later Gate
  4/7 for seller E2E and deposit-to-read continuity.
- Current accepted boundaries: deposit estimates / relative are not final BTD
  until an Evaluation-relative read binds them; `deposit:inventory` is legacy dual-write
  only.

### Reading and prompt/inference ownership

- Current canonical objects and emitted artifacts: Read Request, synthesized
  Evaluation, accepted Evaluation, Prompt/PromptPart measurement commands, typed inference
  results, ReadFitsFindingSynthesis receipt, Evaluation-Fit AssetPack.
- Current algorithms and derivation rules: synthesize Evaluation, review/resynthesize
  Evaluation, find Fits, measure Evaluation-relative value (static fit,
  Evaluation-inferred fit, benchmark delta), synthesize preview and delivery;
  synthesis runs in the resolved pipeline mode (rich | quick | demonstration).
- Current invariants and fail-closed conditions: no Finding Fits without
  accepted Evaluation, no paid delivery before settlement, no raw prompt/provider
  response disclosure.
- Current proof obligations: prompt identity, source-safe prompt digest, typed
  output, parsed result, telemetry receipt, proof root, repair posture.
- Current source-bearing implementation basis: protected source may inform
  inference only through entitlement-safe execution boundaries.
- Current validating commands and parity basis: check-v49-gate2/3/5 and living
  E2E tests must prove buyer flow and Absolute/Relative measurement visualization.
- Current accepted boundaries: inference output is advisory until parsed,
  typed, proof-bound, and state-admitted.

### Fit, recall, ranking, and verification

- Current canonical objects and emitted artifacts: candidate Fits, selected Fit
  set, recall receipts, ranking receipts, verification receipts, source-safe
  provenance summaries.
- Current algorithms and derivation rules: search Depository metadata,
  embeddings, measurements, lexical indexes, and proof roots; rank above
  threshold; verify candidate usefulness before AssetPack synthesis.
- Current invariants and fail-closed conditions: no candidate source disclosure
  before settlement, no survivor-free AssetPack, no ranking without proofable
  measurement basis.
- Current proof obligations: query synthesis receipt, search receipt, ranking
  receipt, selected Fit receipt, verification receipt.
- Current source-bearing implementation basis: source remains protected while
  measurement metadata and provenance summaries remain source-safe.
- Current validating commands and parity basis: check-v49-gate4 and living E2E
  tests must prove Fit search and source contributions drive preview, settle, and delivery.
- Current contribution law: many Fits may contribute to one Evaluation-Fit
  DataPack; the option's source contribution set (model-attributed,
  server-validated, basis-point weights over admitted seller-linked Depository
  DataPacks) is the source-to-shares input after settlement.
- Current accepted boundaries: contribution weights are model-attributed
  judgments validated for membership and normalization, not measured
  derivation proofs.

### Selection and materialization

- Current canonical objects and emitted artifacts: Evaluation-Fit AssetPack,
  withheld source bundle, preview, delivery branch, repository PR, delivery
  receipt.
- Current algorithms and derivation rules: synthesize source-safe preview
  before settlement, materialize source-bearing delivery only after settlement
  and rights transfer.
- Current invariants and fail-closed conditions: preview is not source; quote
  is not delivery; delivery requires settlement and rights transfer.
- Current proof obligations: preview boundary receipt, quote receipt,
  settlement receipt, BTD rights receipt, delivery receipt.
- Current source-bearing implementation basis: source-bearing output is
  withheld until entitlement.
- Current validating commands and parity basis: check-v49-gate4 and living E2E
  tests must prove repository delivery (and redelivery) after settlement.
- Current accepted boundaries: failed delivery opens repair, not silent success.

### Identity, authorization, and sensitive flow

- Current canonical objects and emitted artifacts: user identity, organization,
  team, wallet, role, policy, source connection, target repository connection,
  Claude External OAuth client/grant/token (hashed), spend/deposit authority
  receipt.
- Current algorithms and derivation rules: bind actions to identity, wallet,
  org authority, connection authority, and policy.
- Current invariants and fail-closed conditions: no deposit, read, settlement,
  rights transfer, or delivery without authority; no MCP tool call without a
  valid, unrevoked, scope-matching OAuth access token; payout identities are
  never client-settable.
- Current proof obligations: auth receipt, wallet receipt, provider receipt,
  policy receipt, denial receipt.
- Current source-bearing implementation basis: credentials and wallet private
  material remain secret.
- Current validating commands and parity basis: check-v49-gate4 and
  check-v49-gate6 must prove route, payout, and OAuth/MCP authority.
- Current accepted boundaries: testnet BTC does not weaken identity or rights
  boundaries.

### Disclosure and projection

- Current canonical objects and emitted artifacts: unpaid commercial brief,
  measurement visualization, proof-root projection, Exchange activity
  projection, rights-gated downloads, denied-state projection, repair projection.
- **Viewer rights (binding per DataPack):**

| Role | May see / download |
|---|---|
| **Depositor (owner)** | Full `.patch` bodies, path-op, metadata review, commercial brief |
| **Pre-purchase buyer** | Commercial title/description, measurements, material identity, quote posture — **not** file bodies |
| **Post-settled purchaser** | Entitled `.patch` / delivery artifact + commercial + measurements |
| **Anonymous** | Commercial brief only (if listed) |

- **LLM synthesis providers** may receive full checkout and patch bodies (see
  totality disclosure boundary). That is not an unpaid UI disclosure.
- Current algorithms and derivation rules: project by rights; rebuild
  `unifiedDiff` for entitled viewers; strip bodies on unpaid API rows.
- Current invariants and fail-closed conditions: public projection
  overexposure blocks state advancement; zero bodies on unpaid listings.
- Current proof obligations: disclosure policy receipt, projection receipt,
  no-body/no-secret scan on unpaid paths, repair receipt.
- Current source-bearing implementation basis: raw source, unpaid DataPack file
  bodies, and raw protected prompts remain outside unpaid public projection;
  synthesis LLM providers may still receive full material for rebuild quality.
- Current validating commands and parity basis: living website and deposit
  disclosure tests must prove rights gates.
- Current accepted boundaries: commercial prose and measurements may be public;
  file bodies unlock only after depositor ownership or post-settle rights.

### Settlement and exact accounting

- Current canonical objects and emitted artifacts: BTC-testnet quote, payment
  observation, finality receipt, BTD scalar, BTD rights receipt,
  source-to-shares allocation, compensation statement.
- Current algorithms and derivation rules: compute quote from weighted BTD
  scalar, observe testnet payment, take the protocol coin fee, finalize
  settlement, transfer rights, allocate source-to-shares slices per contributor,
  let each contributor finalize their own BTD/coin split.
- Current invariants and fail-closed conditions: observed payment is not
  finality, finality is required before source unlock, compensation requires
  conservation.
- Current proof obligations: quote receipt, wallet/provider receipt, ledger
  journal, rights receipt, compensation receipt, reconciliation receipt.
- Current source-bearing implementation basis: settlement payloads remain
  private except source-safe receipts.
- Current validating commands and parity basis: check-v49-gate4 and living
  E2E tests must prove fee, source-to-shares conservation, contributor finalize, and repair.
- Current accepted boundaries: V49 pay-rail amounts are testnet; state
  semantics are production-intended; finalized contributor coin payouts are
  ledgered obligations (no on-chain transfer); BitcodeERC1155 state is
  projected.

### Proof contract, witnesses, and replay

- Current canonical objects and emitted artifacts: proof root, generated
  artifact, witness, replay receipt, workflow receipt, repair case.
- Current algorithms and derivation rules: every state transition must bind to
  a proofable receipt or fail closed.
- Current invariants and fail-closed conditions: proof mismatch opens repair;
  stale promoted status truth is failure.
- Current proof obligations: generated artifact, replay proof, workflow proof,
  diff hygiene, test receipt.
- Current source-bearing implementation basis: proofs must be source-safe unless
  entitlement authorizes source-bearing delivery.
- Current validating commands and parity basis: check-v49-gate7 must prove
  replay and promotion readiness.
- Current accepted boundaries: proof readback decides; UI projection explains.

## V49 proof-family canon

### Exact proof-family inventory matrix

| proofFamily | proofArtifactPath | memberIds | theoremIds | replayStepIds | witnessArtifactPaths | Current source basis |
| --- | --- | --- | --- | --- | --- | --- |
| Inference-synthesis | `.proofs/v49/spec-family-report.json` | `measurement-prompt`, `evaluation-synthesis`, `fit-synthesis` | `typed-measurement-output` | `v49-inference-readback` | `BITCODE_SPEC_V49_PROVEN.md` | V46 inference and V49 measurement law |
| Prompt-completeness | `.proofs/v49/spec-family-report.json` | `measurement-prompts`, `visualization-prompts` | `prompt-identity-bound` | `v49-prompt-readback` | `BITCODE_SPEC_V49_PROVEN.md` | Prompt registry and V41/V46 canon |
| Static-code-analysis | `.proofs/v49/canonical-input-report.json` | `route-static-contracts`, `workflow-hooks` | `source-safety-static` | `v49-static-readback` | `BITCODE_SPEC_V49_PROVEN.md` | Current website source and workflows |
| Verification-decisions | `.proofs/v49/spec-family-report.json` | `seller-decision`, `buyer-decision` | `measurement-before-price` | `v49-decision-readback` | `BITCODE_SPEC_V49_PROVEN.md` | V49 state machine law |
| Selection-and-materialization | `.proofs/v49/spec-family-report.json` | `fit-selection`, `delivery-materialization` | `settlement-before-source` | `v49-materialization-readback` | `BITCODE_SPEC_V49_PROVEN.md` | Reading and delivery packages |
| Authorization-and-sensitive-flow | `.proofs/v49/canonical-input-report.json` | `identity`, `wallet`, `source-connection` | `authority-required` | `v49-authority-readback` | `BITCODE_SPEC_V49_PROVEN.md` | Auxillaries and route authority |
| Settlement-source-to-shares | `.proofs/v49/spec-family-report.json` | `quote`, `settlement`, `compensation` | `btctestnet-conservation` | `v49-settlement-readback` | `BITCODE_SPEC_V49_PROVEN.md` | BTD/BTC accounting canon |
| Disclosure-boundary | `.proofs/v49/canonical-input-report.json` | `preview`, `measurement-visualization` | `no-unpaid-source` | `v49-disclosure-readback` | `BITCODE_SPEC_V49_PROVEN.md` | V45/V46 source-safety canon |
| Proof-contract | `.proofs/v49/spec-family-report.json` | `proof-root`, `replay`, `repair` | `proof-readback-decides` | `v49-proof-readback` | `BITCODE_SPEC_V49_PROVEN.md` | Generated proof and workflow canon |

### Inference-synthesis

- proofArtifactPath: `.proofs/v49/spec-family-report.json`
- members: measurement prompts, Evaluation synthesis, deposit option synthesis (rich and quick), Finding Fits, AssetPack synthesis, source attribution
- theoremIds: typed-measurement-output, inference-source-safety, measurement-before-price
- replayStepIds: v49-inference-readback
- witnessArtifactPaths: `BITCODE_SPEC_V49_PROVEN.md`
- current member closure criteria: every inference-owned measurement must have prompt identity, typed output, proof root, and repair posture
- current member verdict shape: source-safe typed receipt
- current theorem-by-theorem closure reading: inference may guide state only after typed parsing and proof binding
- current theorem-to-replay grouping: prompt identity, typed output, and measurement visualization replay together
- minimum artifact/replay binding set: prompt registry id, digest, typed output schema, telemetry receipt
- current proof-object fields: promptId, promptDigest, outputType, measurementId, proofRoot
- generated-artifact and test bindings: check-v49-gate3 (quick one-call proof) and check-v49-gate5 (Relative measurement); living E2E tests
- fail-closed conditions: prompt contract incompleteness, parsed-envelope inadmissibility, second model call in a quick run

### Prompt-completeness

- proofArtifactPath: `.proofs/v49/spec-family-report.json`
- members: measurement PromptParts, seller visualization prompts, buyer visualization prompts
- theoremIds: prompt-identity-bound, prompt-output-typed
- replayStepIds: v49-prompt-readback
- witnessArtifactPaths: `BITCODE_SPEC_V49_PROVEN.md`
- current member closure criteria: every measurement prompt must be catalogued and source-safe
- current member verdict shape: prompt contract receipt
- current theorem-by-theorem closure reading: prompt composition must identify source boundaries and output schema
- current theorem-to-replay grouping: prompt registry and measurement output replay together
- minimum artifact/replay binding set: PromptPart ids, Prompt id, interpolation keys, schema id
- current proof-object fields: promptPartIds, promptId, interpolationDigest, outputSchema
- generated-artifact and test bindings: V49 measurement-law parity (Absolute + Relative), prompt tests, check-v49-gate2 prompt vocabulary scan
- fail-closed conditions: missing prompt part, raw prompt leakage, schema mismatch

### Static-code-analysis

- proofArtifactPath: `.proofs/v49/canonical-input-report.json`
- members: route contracts, workflow hooks, no-source scans
- theoremIds: source-safety-static, route-state-static
- replayStepIds: v49-static-readback
- witnessArtifactPaths: `BITCODE_SPEC_V49_PROVEN.md`
- current member closure criteria: code and workflow changes must align to V49 launch scope
- current member verdict shape: static pass/fail receipt
- current theorem-by-theorem closure reading: static source must not expose protected payloads or stale route names
- current theorem-to-replay grouping: source scan and spec-family scan replay together
- minimum artifact/replay binding set: source paths, route ids, forbidden phrase scan
- current proof-object fields: sourcePath, predicateId, verdict, proofRoot
- generated-artifact and test bindings: gate/canon workflows and check-v49-gate1
- fail-closed conditions: source exposure, stale route, missing workflow hook

### Verification-decisions

- proofArtifactPath: `.proofs/v49/spec-family-report.json`
- members: seller approval, buyer payment, operator repair
- theoremIds: measurement-before-price, proof-before-state
- replayStepIds: v49-decision-readback
- witnessArtifactPaths: `BITCODE_SPEC_V49_PROVEN.md`
- current member closure criteria: decisions must show source-safe measurement and authority
- current member verdict shape: decision receipt
- current theorem-by-theorem closure reading: no decision is valid without measurement and proof
- current theorem-to-replay grouping: measurement, decision, and state transition replay together
- minimum artifact/replay binding set: actor, authority, measurement root, state transition
- current proof-object fields: actorId, authorityId, measurementRoot, transitionId
- generated-artifact and test bindings: V49 E2E seller/buyer tests including two-contributor settlement (check-v49-gate4)
- fail-closed conditions: authorization denial, missing measurement, projection mismatch

### Selection-and-materialization

- proofArtifactPath: `.proofs/v49/spec-family-report.json`
- members: Fit selection, AssetPack preview, repository delivery
- theoremIds: settlement-before-source, selected-fit-proof
- replayStepIds: v49-materialization-readback
- witnessArtifactPaths: `BITCODE_SPEC_V49_PROVEN.md`
- current member closure criteria: selected Fits and delivery must have proof roots
- current member verdict shape: materialization receipt
- current theorem-by-theorem closure reading: delivery follows settlement and rights transfer
- current theorem-to-replay grouping: Fit selection, quote, settlement, and delivery replay together
- minimum artifact/replay binding set: fitSetId, assetPackId, quoteId, deliveryId
- current proof-object fields: fitSetId, previewRoot, settlementRoot, deliveryRoot
- generated-artifact and test bindings: check-v49-gate4 (delivery and redelivery) and living E2E
- fail-closed conditions: no-survivor asset pack, settlement mismatch, delivery failure

### Authorization-and-sensitive-flow

- proofArtifactPath: `.proofs/v49/canonical-input-report.json`
- members: identity, organization, wallet, source connection, repository connection, Claude External OAuth grant
- theoremIds: authority-required, secrets-never-projected
- replayStepIds: v49-authority-readback
- witnessArtifactPaths: `BITCODE_SPEC_V49_PROVEN.md`
- current member closure criteria: every sensitive action must bind to authority and no-secret projection
- current member verdict shape: authority receipt
- current theorem-by-theorem closure reading: testnet does not weaken authority
- current theorem-to-replay grouping: identity, wallet, connection, and route action replay together
- minimum artifact/replay binding set: identityId, orgId, walletId, providerId, routeActionId
- current proof-object fields: subjectId, policyId, walletReceipt, providerReceipt
- generated-artifact and test bindings: check-v49-gate4 (server-only payout identities) and check-v49-gate6 (OAuth, scopes, revocation)
- fail-closed conditions: authorization denial, secret leakage, missing wallet

### Settlement-source-to-shares

- proofArtifactPath: `.proofs/v49/spec-family-report.json`
- members: quote, testnet observation, finality, protocol coin fee, BTD rights, source-to-shares slices, contributor payout split
- theoremIds: btctestnet-conservation, source-to-shares-conservation
- replayStepIds: v49-settlement-readback
- witnessArtifactPaths: `BITCODE_SPEC_V49_PROVEN.md`
- current member closure criteria: quote, settlement, rights, and compensation must conserve measured BTD and source-to-shares
- current member verdict shape: accounting receipt
- current theorem-by-theorem closure reading: BTC-testnet is free economically but not loose semantically
- current theorem-to-replay grouping: quote, payment, finality, rights, compensation replay together
- minimum artifact/replay binding set: quoteId, paymentId, btdScalar, rightsId, allocationId
- current proof-object fields: quoteAmount, testnetTxid, btdScalar, allocationRoot
- generated-artifact and test bindings: check-v49-gate4 (conservation: fee + sum of slices = gross; sum of slice BTD = V)
- fail-closed conditions: settlement conservation drift, payment mismatch, compensation mismatch

### Disclosure-boundary

- proofArtifactPath: `.proofs/v49/canonical-input-report.json`
- members: preview, measurement visualization, proof projection
- theoremIds: no-unpaid-source, measurement-visible-source-hidden
- replayStepIds: v49-disclosure-readback
- witnessArtifactPaths: `BITCODE_SPEC_V49_PROVEN.md`
- current member closure criteria: every pre-settlement display must expose value without exposing source
- current member verdict shape: disclosure receipt
- current theorem-by-theorem closure reading: measurements can reveal value, confidence, risk, and fit but not protected source
- current theorem-to-replay grouping: projection policy and UI state replay together
- minimum artifact/replay binding set: projectionId, measurementIds, no-source scan
- current proof-object fields: projectionId, allowedFields, deniedFields, scanRoot
- generated-artifact and test bindings: check-v49-gate3 through check-v49-gate6 source-safety predicates
- fail-closed conditions: public projection overexposure, raw prompt leakage, unpaid source leakage

### Proof-contract

- proofArtifactPath: `.proofs/v49/spec-family-report.json`
- members: proof root, workflow receipt, replay receipt, repair receipt
- theoremIds: proof-readback-decides, stale-truth-fails
- replayStepIds: v49-proof-readback
- witnessArtifactPaths: `BITCODE_SPEC_V49_PROVEN.md`
- current member closure criteria: every state transition must be proof-readable
- current member verdict shape: proof receipt
- current theorem-by-theorem closure reading: projection explains, proof decides
- current theorem-to-replay grouping: generated artifact, workflow, and repair replay together
- minimum artifact/replay binding set: artifactRoot, workflowRun, stateTransition, repairId
- current proof-object fields: artifactRoot, workflowId, transitionId, repairState
- generated-artifact and test bindings: check-v49-gate7 promotion readiness
- fail-closed conditions: stale promoted status truth, missing proof root, generated artifact drift

## V49 generated canon

### Appendix C. Generated artifact contract catalog

#### Inherited V19 reproducible-canon artifacts

Historical reproducibility evidence inventories may exist under
`.proofs/v19/*` (contract-change ledger, negative-proof mutation matrix,
proof-member semantic matrix, theorem-evidence matrix, state-machine matrix,
deterministic-replay report, volatility inventory). They are **optional
historical evidence**, not a source of omitted V49 system semantics.

#### Inherited V20 operator-quality artifacts

Historical operator-quality evidence inventories may exist under
`.proofs/v20/*` (operator acceptance, visual regression, accessibility,
performance budget, projection quality smoke, quality summary). They are
**optional historical evidence**, not a source of omitted V49 system semantics.

#### Exact generated-artifact inventory matrix

| artifactPath | role | disclosability |
| --- | --- | --- |
| `.proofs/v49/opening-charter.json` | Gate 1 opening charter (family, posture, gate plan, decisions, living CI wiring) | product-safe |
| `.proofs/v49/evaluations-rename.json` | Gate 2 vocabulary scan + migration evidence | product-safe |
| `.proofs/v49/quick-synthesis.json` | Gate 3 quick pipeline identity + one-call evidence | product-safe |
| `.proofs/v49/settlement-completion.json` | Gate 4 contribution, fee, source-to-shares conservation, viewer and authority evidence | product-safe |
| `.proofs/v49/benchmark-delta-relatives.json` | Gate 5 manifest, runner, reading, weighting evidence | product-safe |
| `.proofs/v49/claude-external.json` | Gate 6 OAuth / MCP / Externals evidence | product-safe |
| `.proofs/v49/promotion-readiness-report.json` | Gate 7 promotion readiness | product-safe |
| `.proofs/v49/spec-family-report.json` | V49 spec-family validation report (when regenerated) | product-safe |
| `.proofs/v49/canonical-input-report.json` | V49 canonical-input validation report (when regenerated) | product-safe |
| `.proofs/v49/canon-posture-drift-report.json` | Draft posture drift report (when regenerated) | product-safe |
| `BITCODE_SPEC_V49_PROVEN.md` | V49 generated proof appendix (at promotion) | product-safe |

#### V49 specifying generated artifacts

V49 reserves the `.proofs/v49/` inventory above. Each gate artifact is built by
a `scripts/specifying/src/canonical/v49-*.js` builder, written by
`scripts/generate-v49-*.mjs`, checked for freshness by its `--check` mode and by
`scripts/check-v49-gateN-*.mjs`, and must be regenerable from this SPEC's
obligations without recovering missing meaning from other version SPEC files.
Gate artifacts serialize source-safe metadata only: file paths, predicate ids,
digests, and verdicts — never source bodies, prompts, provider responses,
tokens, or wallet private material.

#### Shared generated-artifact fields

All V49 generated artifacts must carry artifact id, version, generatedAt or
deterministic marker, source roots, proof root, source-safety verdict,
predicate results, aggregate proof verdict, and repair posture.

#### Artifact-specific generated payload fields

Measurement artifacts must include measurement ids, weights, normalized
contributions, prompt identities, typed output schemas, visualization fields,
and source-safety denials.

#### Artifact confidentiality and disclosability taxonomy

V49 artifacts classify fields as public, operator, buyer, reviewer, internal,
source-bearing, secret, or denied.

#### Minimum generated appendix rendered contents

The generated appendix must render aggregate proof verdict, exact proof-family
inventory, exact per-family member inventory, exact per-family theorem
inventory, exact replay-step inventories and theorem bindings, witness artifact
inventories, generated artifact inventories, scenario and run coverage matrices,
proof-source commit, and fail closed when conditions.

#### Canonical regeneration and fail-closed posture

Regeneration must fail closed when source roots drift, proof roots mismatch,
generated artifact inventories are incomplete, scenario and run coverage
matrices are stale, proof-source commit is missing, or source-safety scans fail.

## V49 validation canon

V49 draft-family validation (living checks for active V48 + draft V49 only;
exact flags follow repository CI, `scripts/run-bitcode-local-ci.mjs`):

- Spec-family validation for the **promoted V48** family and the **draft V49**
  family (`check-bitcode-spec-family --version V49 --mode draft
  --current-target V48`).
- Canonical-input and posture-drift checks for `V48 active / V49 draft`
  (`check-bitcode-canon-posture-drift --active-canon V48 --draft-target V49`).
- V48 active gate checkers that remain living (`check:v48-gate*`).
- V49 gate checkers `check:v49-gate*` as each gate lands (local CI discovers
  `scripts/check-v49-gate*.mjs` automatically once the V49 SPEC exists).
- Living product CI: monorepo typecheck/build/Jest for website + pipeline
  packages; gate-focused Jest suites named in each gate's checker.

| Layer | Proves | Does not prove |
|---|---|---|
| Unit (Jest / node:test) | Pure law: mode resolution, quick schema, contribution normalization, fee/source-to-shares conservation, payout slice split, benchmark parsing/volume, PKCE/token hashing | Network, provider, sandbox, or wallet behavior |
| Integration (route tests with mocked providers) | Dispatch branching, one model call per quick run, settle persistence, finalize authority, OAuth endpoints, MCP 401/scope gating | Real provider quality, real chain finality |
| E2E (browser, deterministic mock mode) | Seller/buyer flows incl. two-contributor settlement and owned/sold viewers | Live testnet confirmation latency |
| Gate checkers + `.proofs/v49/*` | Required files, predicates, freshness, source-safety | Behavior beyond the asserted predicates |
| Staging rehearsal (operator) | Live GitHub, live testnet payment, live model call, live sandbox benchmark, live Claude connector | Mainnet value-bearing behavior (blocked) |

Historical version-bound checkers for versions before V48 remain immutable and
are not required green (specifying law §4.3/§13.1).

## V49 promotion canon

V49 may promote only after Gates 1–6 close, all `.proofs/v49/*` gate artifacts
are fresh, living CI is green, a staging-testnet rehearsal proves quick and rich
synthesis, a two-contributor settlement with per-contributor finalize, a
benchmark-delta Read, and a Claude connector session, and the maintained
promotion workflow advances `BITCODE_SPEC.txt` to `V49`.

V49 promotion readiness canon: Gate 7 owns
`.proofs/v49/promotion-readiness-report.json`, the
`buildV49PromotionReadinessReport` builder, and `check:v49-gate7` (with
`--promotion-mode` accepting pre-promotion `V48` or post-promotion `V49`
pointer truth). The readiness report binds every V49 gate artifact (Gates 1–6),
the generated `BITCODE_SPEC_V49_PROVEN.md`, the V49 entries in
`promote-bitcode-canon.mjs` and `prepare-bitcode-spec-family-promotion.mjs`,
the local-CI pointer posture for `V49` sole, package exports, focused tests,
README documentation, and the prepared post-promotion `V49 active / V49 draft`
posture. Promotion remains blocked while any evidence is missing, stale,
source-unsafe, or while value-bearing mainnet admission is implied.

## V49 appendices and canonical supporting material

### Appendix A. Canonical type and surface catalog

Canonical surfaces are `/deposits`, `/reads`, `/exchange`, Auxillaries
(including the GitHub and Claude Externals), the Bitcode remote MCP server
(`/api/mcp`) and OAuth 2.1 endpoints, Depository indexes, proof roots, workflow
receipts, ledger journals, database projections, object-storage roots,
wallet/provider receipts, repository delivery receipts, compensation statements,
and benchmark run receipts. The stdio MCP server remains a compatibility
surface; ChatGPT App and Bitcode Chat remain compatibility surfaces for V49, not
commercial launch scope.

Canonical V49 types added to the inherited catalogue:
`SynthesisPipelineMode`, `QuickSynthesisOutput`, `ReadEvaluation`,
`RelativeReading`, `BenchmarkManifest`, `BenchmarkRunReceipt`,
`ReadOptionSourceContributions`, `CompensationStatement`,
`ContributorPayoutSlice`, `OAuthClient`, `OAuthGrant`, `ClaudeExternalConnection`.

### Appendix B. Proof family closure catalog

The nine proof families above close through measurement, state-machine,
disclosure, settlement, delivery, repair, and promotion evidence.

### Appendix D. Validation and checking gate catalog

V49 gates:

1. Opening Charter. Gate 1 owns `.proofs/v49/opening-charter.json`, the
   `buildV49OpeningCharter` builder, and `check:v49-gate1`. It closes the V49
   family, the `V48 active / V49 draft` posture, living local-CI wiring for the
   V49 draft family and gate checkers, the accepted decision set, and the gate
   plan.
2. Evaluations Rename. Gate 2 owns `.proofs/v49/evaluations-rename.json`,
   `buildV49EvaluationsRename`, and `check:v49-gate2`.
3. Quick Synthesis. Gate 3 owns `.proofs/v49/quick-synthesis.json`,
   `buildV49QuickSynthesis`, and `check:v49-gate3`.
4. Settlement Completion. Gate 4 owns `.proofs/v49/settlement-completion.json`,
   `buildV49SettlementCompletion`, and `check:v49-gate4`.
5. Benchmark-delta Relatives. Gate 5 owns
   `.proofs/v49/benchmark-delta-relatives.json`,
   `buildV49BenchmarkDeltaRelatives`, and `check:v49-gate5`.
6. Claude External. Gate 6 owns `.proofs/v49/claude-external.json`,
   `buildV49ClaudeExternal`, and `check:v49-gate6`.
7. Promotion Readiness. Gate 7 owns
   `.proofs/v49/promotion-readiness-report.json`,
   `buildV49PromotionReadinessReport`, and `check:v49-gate7`.

Inherited V48 gate evidence (`.proofs/v48/*`, `check:v48-gate*`) is historical
evidence of V48 closure; living `check:v48-gate*` checkers keep running while V48
is the active pointer.

### Appendix E. Current canonical source map

| Area | Path |
|---|---|
| Website app (routes, API, components) | `apps/uapi/` |
| Deposit / read synthesize dispatch | `apps/uapi/app/api/deposit/synthesize-options/`, `apps/uapi/app/api/read/synthesize-options/` |
| Rich synthesis pipelines | `packages/asset-packs-pipelines/syntheses/{deposit,read,domain}/` |
| Quick synthesis pipelines | `packages/asset-packs-pipelines/syntheses/quick/` |
| Pipeline / agent primitives | `packages/pipelines-generics/` (`factoryExecutionPipelineQuick`), `packages/agent-generics/` (`factoryQuickAgent`), `packages/generic-pipelines/`, `packages/generic-agents/` |
| Prompts | `packages/prompts/` |
| Absolute measurements | `packages/generic-measurements/absolutes/*`, `packages/generic-measurements/domain/*`, `packages/measurement-generics/` |
| Relative measurements | `packages/generic-measurements/relatives/` (+ `relatives/benchmark-delta`) |
| Benchmark runner / hosts | `packages/pipeline-hosts/`, `packages/generic-hosts/VercelSandbox/` |
| Settlement pipeline | `packages/asset-packs-pipelines/settle/` |
| BTD / ERC1155 / source-to-shares | `packages/btd/` |
| Settle / payout / redeliver routes | `apps/uapi/app/api/read/settle/`, `apps/uapi/app/api/packs/payout/finalize/` |
| Externals (GitHub) | `apps/uapi/app/api/vcs/`, `apps/uapi/app/tps/github/`, `packages/vcs-generics/` |
| Claude External (MCP + OAuth) | `apps/uapi/app/api/mcp/`, `apps/uapi/app/api/oauth/`, `apps/uapi/app/oauth/`, `apps/uapi/app/.well-known/` |
| MCP tools | `packages/mcp-generics/`, `apps/mcp/` (stdio) |
| Claude plugin | `apps/claude/` |
| Auxillaries UI | `apps/uapi/components/auxillaries/` |
| Database | `supabase/migrations/` |
| Specifying machine | `scripts/specifying/`, `scripts/check-v49-*.mjs`, `scripts/generate-v49-*.mjs` |
| Generated artifacts | `.proofs/v49/` |

### Appendix F. Subsystem totality and derivability matrix

Required coverage phrases: repo supply and depositing; reading and measured
demand; prompt/inference/evaluator ownership; deposit-to-read fit; recall and
ranking; verification decisions; selection and materialization; branch
artifacts and assetPackEvidence; identity, authority, signing, and policy;
sensitive data and confidentiality flows; projection, disclosure, and
redaction; proof families, members, theorems, witnesses, and replay;
settlement, source-to-shares, journals, and exact accounting; telemetry,
persistence, state, and failure semantics; host/runtime capability truth;
operator experience and pedagogy; validation and test stack; generated
artifacts and canonical promotion.

### Appendix G. Canonical file-family and promotion contract catalog

The V49 file family is `BITCODE_SPEC_V49.md`,
`BITCODE_SPEC_V49_DELTA.md`, `BITCODE_SPEC_V49_NOTES.md`,
`BITCODE_SPEC_V49_PARITY_MATRIX.md`,
`BITCODE_SPEC_V49_MEASUREMENT_PARITY_MATRIX.md`, and eventually
`BITCODE_SPEC_V49_PROVEN.md`. Promotion must be workflow-driven.

### Appendix H. Operator surface and quality contract catalog

Operators need source-safe views of seller flow, buyer flow, measurements,
quotes, BTC-testnet observations, BTD rights, delivery, compensation, repair,
proof roots, and workflow receipts. Operator surfaces must remain measurable,
readable, accessible, performant, and repairable.

### Appendix I. Scenario, workflow, and cross-product contract catalog

V49 keeps historical scenario coverage terms auth-issuer-rollback,
privacy-boundary-proof-export, polyglot-gateway-benchmark-remediation,
auth-many-asset-normalization, Targeted deposit, Normalization deposit, patch,
context, public, buyer, reviewer, internal, Openly writable, Measurably
readable, Provable, and Valuable.

V49 scenarios are: IP seller deposits a DataPack (rich or quick synthesis); IP
buyer buys an Evaluation-Fit DataPack derived from two contributing Depository
DataPacks and both contributors finalize their slices; IP buyer selects a
declared benchmark and reviews a measured benchmark delta before buying; and a
user operates `read` and `packs` from Claude through the Claude External.

### Appendix J. Fail-closed contract and error posture matrix

V49 fails closed on invalid deposit, prompt contract incompleteness,
parsed-envelope inadmissibility, no-survivor asset pack, authorization denial,
public projection overexposure, settlement conservation drift, stale promoted
status truth, measurement formula drift, BTC-testnet quote mismatch,
repository delivery failure, a second model call in a quick run, a Relative
kind outside the kind-pattern law, contribution weights that do not normalize to
10000 over admitted seller-linked supply, compensation conservation drift
(fee + Σ slices ≠ gross), client-supplied payout identities, a contributor
finalizing another contributor's slice, an undeclared benchmark command, and an
MCP call without a valid scoped OAuth token.

### Appendix K. Source-bearing AssetPack and artifact contract catalog

Source-bearing artifacts include `.proofs/_shared/asset-pack.lock.json`,
`.proofs/_shared/selected-source-material.json`,
`.proofs/_shared/verification-report.json`, `.proofs/_shared/source-to-shares.json`,
`.proofs/_shared/projection-policy.json`, `.proofs/_shared/system-proof-bundle.json`, and
`BITCODE_SPEC_V49_PROVEN.md`. Source-bearing payloads remain protected until
entitlement; source-safe receipts may be projected.

## V49 accepted boundaries and reopen conditions

- V49 is a draft full-system SPEC; `BITCODE_SPEC.txt` advances to `V49` only
  through the promotion canon.
- V49 testnet means pay-rail amounts are testnet-class; system behavior remains
  production-intended. Value-bearing mainnet stays blocked.
- Finalized contributor coin payouts are ledgered obligations; on-chain seller
  transfers and an on-chain BitcodeERC1155 deployment are deferred.
- Source contribution weights are model-attributed and server-validated for
  membership and normalization; they are not a measured derivation proof.
  Reopen if weights are shown to be systematically manipulable.
- Quick synthesis qualitative absolutes are `estimated`, never `measured`.
  Reopen if quick output is presented as measured quality.
- Benchmark deltas run only repository-declared commands in an isolated
  sandbox. Reopen on any secret exposure or undeclared command execution.
- The Claude External authorizes Claude to act as the user through scoped OAuth
  tokens; Bitcode stores no Anthropic credentials; BYOK model keys are deferred.
- Measurement and commercial brief must be visible under disclosure law before
  a user decides to deposit or buy; file bodies remain rights-gated.
- ChatGPT App commercialization, Bitcode Chat, deeper BTD mining cryptography,
  and advanced market mechanics are deferred (compatibility surfaces must not
  regress).
- Any unpaid body leakage, measurement ambiguity, quote/finality collapse,
  rights ambiguity, compensation conservation drift, or delivery ambiguity
  reopens the relevant workstream.

## V49 completion condition

V49 Gate 1 is complete when the V49 draft family (`BITCODE_SPEC_V49.md`,
`_NOTES`, `_DELTA`, `_PARITY_MATRIX`, `_MEASUREMENT_PARITY_MATRIX`) exists as
sole rebuild law for the four V49 reforms over the inherited system; canon
posture reads `V48 active / V49 draft`; living local CI runs the V49 draft family
check and discovers `check-v49-gate*` scripts; the roadmap names V49 as the draft
target; `.proofs/v49/opening-charter.json` is generated; and `check:v49-gate1`
passes.

V49 Gate 2 is complete per Evaluations rename law E-6.

V49 Gate 3 is complete per quick synthesis law Q-6.

V49 Gate 4 is complete per settlement completion law S-7.

V49 Gate 5 is complete per benchmark-delta Relative law B-6.

V49 Gate 6 is complete per Claude External law C-6.

V49 Gate 7 is complete when the promotion readiness report binds Gates 1–6
artifacts as present, fresh, and product-safe; promotion scripts and local-CI
posture support `V49` sole; an active `BITCODE_SPEC_V49_PROVEN.md` is generated;
the V49 promotion dry-run passes; `.proofs/v49/promotion-readiness-report.json`
is generated; `check:v49-gate7` validates readiness; and the prepared
post-promotion posture advances `BITCODE_SPEC.txt` to `V49` only through the
promotion workflow.
