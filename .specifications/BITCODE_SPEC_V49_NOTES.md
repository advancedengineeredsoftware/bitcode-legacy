# Bitcode Spec V49 Notes

## Status

- Version: `V49`
- V49 state: full-system draft open; notes companion for the Gate 1 opening
  charter
- Current canonical/latest target: `V48`
- Prior canonical anchor: `BITCODE_SPEC_V48.md` (historical process only — not
  required for V49 semantic recovery)
- Prior generated proof appendix: `BITCODE_SPEC_V48_PROVEN.md` (historical
  process only — not required for V49 semantic recovery)
- Generated structured artifact inventory: draft V49 family
  (`.proofs/v49/opening-charter.json`, later `.proofs/v49/*` gate artifacts) and
  `BITCODE_SPEC_V49_PROVEN.md` at promotion
- Source parity state: V49 inherits the promoted V48 living product tree; the
  four V49 reforms are specified and realized gate by gate
- Spec companion: `BITCODE_SPEC_V49.md` (**sole rebuild law**)
- Delta companion: `BITCODE_SPEC_V49_DELTA.md`
- Parity companion: `BITCODE_SPEC_V49_PARITY_MATRIX.md`
- Measurement parity: `BITCODE_SPEC_V49_MEASUREMENT_PARITY_MATRIX.md`

## Notes companion rule

These notes accompany the V49 draft specification family. They are **not**
stronger than `BITCODE_SPEC_V49.md`. Binding rebuild law for the entire Bitcode
stack lives in the SPEC. Notes record decisions, audit findings, and working
narrative; where notes disagree with SPEC, **SPEC wins**. Do not recover system
semantics from other versioned SPEC files when implementing V49.

## Concise current-system reading

Bitcode sells measured knowledge as **DataPacks** (patch + measurements +
metadata). Sellers deposit on `/deposits`; buyers read on `/reads` with
natural-language **Evaluations**; `/exchange` rereads all activity.

- **Synthesis** runs rich (SDIVF agents) by default, or **quick** (exactly one
  model call) when flagged — same validation, measurement, and Finish.
- **Measurements** are **Absolute** (intrinsic, full catalogue, honesty status)
  and **Relative** (static fit, Evaluation-inferred fit, and measured benchmark
  deltas when the repository declares benchmarks). Relative → `evaluation-fit`
  → settlement BTD.
- **Settlement** pays on a testnet rail, takes a 5 % protocol coin fee, mints BTD
  to escrow, splits by source-to-shares over the option's contributing
  Depository DataPacks, and lets **each contributor** choose their own BTD/coin
  split. Buyers own the pack and receive a PR; failed deliveries can be
  redelivered.
- **Externals** are GitHub (repositories) and **Claude** (Bitcode remote MCP
  connector, OAuth 2.1).

## Simplified-spec reading rule

If a surface does not help a depositor synthesize measured DataPack options and
get paid for their contribution, or help a reader evaluate, buy, and receive
Evaluation-fit DataPacks quickly — on the website or from Claude — it is out of
V49 scope. Estimated is never measured; unmeasured is never zero; quick is
never silently rich.

## Gate commitments

| Gate | Commitment |
|---|---|
| 1 | Family + posture + living CI + opening charter artifact |
| 2 | Evaluations vocabulary everywhere living; stored rows migrated |
| 3 | Quick synthesis with provably one model call |
| 4 | Multi-contributor settlement with fee and conservation |
| 5 | Declared benchmark deltas as Relative rows |
| 6 | Claude connects through OAuth 2.1 remote MCP |
| 7 | Promotion readiness and pointer advance |

Primary parity priorities: one-call proof (Gate 3), conservation and authority
(Gate 4), sandbox safety (Gate 5), token safety (Gate 6).

## Opening audit (2026-10-18)

Findings that shaped V49 (see DELTA for decisions):

- `factoryExecutionPipelineQuick` (`packages/pipelines-generics/src/quick-pipeline.ts`)
  and `factoryQuickAgent` (`packages/agent-generics/src/agents/factories.ts`) exist
  with no callers. There are no classes named `QuickPipeline` / `SimpleAgent`;
  these factories are the intended primitives.
- Rich read and deposit dispatch both branch on demonstration mode at a single
  seam (`dispatch-deposit-synthesis.ts`, `dispatch-read-synthesis.ts`); quick
  plugs into the same seam.
- Demonstration absolutes (`demonstration-absolutes.ts`) already show how to
  measure absolutes without a model; quick generalizes that.
- Live read options never carry a seller; `fitDeposits` are computed in
  Discovery but dropped before Finish.
- `buildSourceToSharesProof` and `allocateBtdContributorCells` are exposed only
  as a standalone proof route.
- `coinFeeBps` exists on the projected ERC1155 state but nothing sets it.
- The MCP API-key path stores plaintext and verifies hashes; `user_api_keys` is
  not in migrations.
- No code applies a pack patch to a checkout or runs repository commands;
  patches carry full bodies (direct writes are the correct apply).

## Open questions for later gates (non-canonical)

- Exact quick budget defaults (80 files / 300k chars) should be tuned against
  real repositories in Gate 3.
- Whether quick should support an optional second "repair" call is explicitly
  **out** of V49 (one call is the law); revisit only as a new version decision.
