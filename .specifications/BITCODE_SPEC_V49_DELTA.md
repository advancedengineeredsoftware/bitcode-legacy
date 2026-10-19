# Bitcode Spec V49 Delta

## Status

- Version: `V49`
- V49 state: full-system draft open; this delta records the V48-to-V49 decision
  set for the fast, real, end-to-end commercial MVP (Gate 1 opening charter)
- Current canonical/latest target: `V48`
- Prior canonical anchor: `BITCODE_SPEC_V48.md` (historical process only — not
  required for V49 semantic recovery)
- Prior generated proof appendix: `BITCODE_SPEC_V48_PROVEN.md` (historical
  process only — not required for V49 semantic recovery)
- Generated structured artifact inventory: draft V49 family
  (`.proofs/v49/opening-charter.json`, later `.proofs/v49/*` gate artifacts,
  `.proofs/v49/spec-family-report.json`, `.proofs/v49/canonical-input-report.json`,
  `.proofs/v49/canon-posture-drift-report.json` when regenerated) and
  `BITCODE_SPEC_V49_PROVEN.md` at promotion
- Source parity state: V49 inherits the promoted V48 living product tree; the
  four V49 reforms are specified and realized gate by gate
- Spec companion: `BITCODE_SPEC_V49.md` (**sole rebuild law**)
- Notes companion: `BITCODE_SPEC_V49_NOTES.md`
- Parity companion: `BITCODE_SPEC_V49_PARITY_MATRIX.md`
- Measurement parity: `BITCODE_SPEC_V49_MEASUREMENT_PARITY_MATRIX.md`
- Scope: V49 draft delta for the fast, real, end-to-end commercial MVP over
  promoted V48 canon

## Why V49 exists

V48 proved the commercial website on staging-testnet, but an audit of the
promoted tree (2026-10-18) found four gaps between V48 and a functionally
complete MVP:

1. **Synthesis is too slow to demonstrate.** A rich SDIVF run issues on the
   order of 100–250 model calls; demonstration mode therefore replays a script
   instead of synthesizing.
2. **Settlement is single-seller and partly unwired.** Live read options carry
   no seller (only demonstration options carry provenance), so live purchases
   pay no one; source-to-shares (`buildSourceToSharesProof`) and the protocol
   coin fee required by V48 are not called by settle; the settle route accepts
   client-supplied payout addresses.
3. **Only one External exists.** GitHub is the only External; the Bitcode
   Claude plugin runs the stdio MCP server from a local checkout, and API-key
   auth for that server cannot succeed (issuance stores plaintext `key`, the
   server verifies `key_hash`; the table is absent from migrations).
4. **"Need" is the wrong product word and Relative measurement is shallow.**
   Buyers describe how DataPacks should be **evaluated**; the reader-relative
   family should be named **Relative**; and when a repository has benchmarks,
   the most honest Relative measurement is the benchmark delta with the patch
   applied — which nothing measures today (no pipeline applies a patch or runs
   repository code).

## Accepted V49 decisions

- **Canon:** all four reforms ship as V49 canon with gated commits; V≤48
  specs, proofs, and version-bound checks stay frozen (specifying law §4.3).
- **Quick synthesis selection:** server default `BITCODE_SYNTHESIS_PIPELINE`
  (`rich` default) plus per-run request override `synthesisPipeline`, surfaced
  as a Quick / Rich toggle behind `NEXT_PUBLIC_BITCODE_SYNTHESIS_PIPELINE_TOGGLE`.
- **"One model call total"** means one model request per quick run with no tool
  round-trips; Tools (tree, bodies, depository search, measure, benchmark
  runner) run deterministically before/after the call.
- **Quick primitives:** `factoryExecutionPipelineQuick` and `factoryQuickAgent`
  (both existing, previously unused) with the same Prompt / PromptPart, Tool,
  Execution store, and Finish law as rich synthesis.
- **Multi-source compensation:** model-attributed source weights, server-
  validated against admitted seller-linked Depository supply and normalized to
  basis points, become the `fitDeposits` input of `buildSourceToSharesProof`.
- **Protocol coin fee:** `BITCODE_PROTOCOL_COIN_FEE_BPS`, default **500**
  (5 %), taken from the coin leg before contributor allocation; BTD leg has no
  fee.
- **Funds:** ledger + protocol fee only; finalized contributor coin payouts are
  recorded obligations; no on-chain transfers or contract deployment.
- **Claude External:** a Bitcode-hosted remote MCP server (Streamable HTTP) with
  an OAuth 2.1 authorization server (DCR, PKCE S256, refresh rotation,
  revocation). Bitcode stores no Anthropic credentials. BYOK is not adopted.
- **Evaluations:** Need → Evaluation; needinesses → relatives (Relative family);
  `need-fit` → `evaluation-fit`. Relative rows (static fit, Evaluation-inferred
  fit, benchmark delta) all feed `evaluation-fit` and therefore settlement BTD.
- **Rename depth:** full codemod now, no dual-read; one idempotent data
  migration rewrites stored V48-shaped rows.
- **Relative kind law:** `*-fit` or `benchmark-delta:<id>`; subfamily masses
  1.0 / 0.6·0.4 / 0.6·0.4 / 0.4·0.3·0.3; unmeasured benchmark rows weigh zero.
- **Benchmarks:** declared only, in `.bitcode/benchmarks.json`; no discovery or
  inference of commands. Volume `clamp01(0.5 + r / (2 × 0.5))`.
- **Gate 1 category:** `spec-impl` (family plus posture, local-CI wiring, and
  the Gate 1 checker are opened together).

## Rejected alternatives

- **Replace demonstration replay with quick** (rejected as the only switch):
  demonstration keeps precedence unless `BITCODE_DEMONSTRATION_SYNTHESIS=quick`.
- **Deterministic overlap weights** for contributions (rejected for V49): the
  model already sees both the Depository supply and the synthesized patch; a
  validated attribution is cheaper and honest when labeled as such.
- **BYOK Anthropic key** as the Claude External (rejected for V49): the user
  asked for Claude to use Bitcode, not for Bitcode to bill the user's key.
- **Dual-read rename** (rejected): a single migration is simpler than carrying
  two vocabularies.
- **Auto-detected benchmarks** (rejected for V49): running undeclared commands
  is unsafe and ambiguous.
- **On-chain seller payouts** (deferred).

## Implementation-revealed refinements (from the V49 opening audit)

- Read dispatch calls `provisionDepositCheckout` with the wrong argument shape
  and always falls into the "host provision skipped" path. Gate 3 removes the
  call rather than "fixing" it: cloning before the pipeline violates the
  no-clone-during-initialization law, and rich read Setup already clones on
  the Host.
- `StepExecution.llms` delegates to the parent AgentExecution, so tracked
  `llm:*` nodes sit beside (not under) the step; the quick one-call count walks
  the whole QUICK pipeline execution.
- Rich read attribution is one extra model call after measurement rather than
  a new field on the shared six-field patch-plan schema (which deposit also
  uses); it is validated against the run's supply and fails soft to
  treasury-only.
- Activity history payloads nest raw `output`/`context` copies; the viewer
  projection of compensation statements is applied to those copies too.
  Legacy V48 `pendingPayout.sellerUserId` visibility is unchanged (pre-V49
  exposure; recorded, not widened).
- The settle package jest config moved onto the shared `createJestConfig`
  base (its hand-rolled mapper no longer resolved transitive packages).
- Benchmark measurement is a post-synthesis Host stage in the read dispatcher
  for both rich and quick runs, rather than a step inside the Implementation
  measurements agent / quick Measure step: the runner needs a Host workspace,
  and the synthesis pipelines stay host-free. Rows, masses, and evaluation-fit
  are applied before the run is stored, so Finish carriers and settle see the
  same option.
- The manifest/reading/selection law lives in the relatives package under
  `src/benchmark-delta/` (subpath export) instead of a separate nested
  package; it stays dependency-free so `@bitcode/pipeline-hosts` and uapi can
  import it without the measure-agent graph.
- Rich synthesis adds Evaluation-referenced benchmark ids deterministically
  (declared id or title named in the Evaluation text) instead of a new
  comprehend-evaluations output field; quick keeps its `benchmarkIds` output.
- Settle's boundary parser dropped `status` / `propertyClass`, so a failed
  benchmark row could have regained catalogue weight at mint. The parser now
  keeps them, and a benchmark row stored with weight 0 is non-bearing in both
  the relatives law and the btd mirror.
- Network egress during benchmark commands is not enforced by the runner; it
  relies on the Host's network policy. Commands never receive operator
  secrets (`env -i`).
- The remote MCP server uses the SDK's low-level `Server` with a per-request
  in-process transport in Streamable HTTP's stateless JSON-response mode: the
  SDK 1.21 Streamable HTTP server transport needs Node `req`/`res`, which a
  Next route handler does not have. No server-initiated stream (GET → 405).
- Remote tool names are `deposit`, `read`, `packs`, `measure`, `auxiliary`
  (MCP tool-name charset); the stdio server keeps its BTD contract ids. The
  remote `measure` reads measurements of a synthesis run's options (the
  website's measurement surface) rather than the stdio repository measure.
- The synthesize routes were split into session-free dispatch cores so the MCP
  tools dispatch exactly as the website does (same validation, ownership,
  execution rows, waitUntil).
- Signed-out consent: sign-in is an in-app Auxillaries flow without a generic
  return path, so the consent page links to sign-in and offers Continue
  (reload) once the session cookie exists.
- A failed PKCE attempt consumes the authorization code (single-use regardless
  of outcome); replaying a consumed code revokes tokens it issued.
- `apps/mcp` `measure-tools.ts` does not typecheck at the V49 Gate 5 tip
  (pre-existing; not in the living CI typecheck set); Gate 6 does not touch it.
- `verificationSignals` for `test-pass-rate` / `buildability` are read but never
  set; the Gate 5 runner is the future source (deferred beyond V49 scope).
- 46 frozen historical gate scripts reference Need vocabulary; they stay
  unedited and unexecuted. The living CI step `gate-test-read-need` is renamed
  in Gate 2.
- The `@bitcode/specifying` test script still ran frozen `test/v47-*` suites
  under pointer V48; Gate 2 (whose rename breaks a V47 source predicate)
  narrows it to active `v48-*` plus draft `v49-*` per specifying law §13.1.
  V47 suites stay on disk unedited.

## Changed contracts

| Contract | V48 | V49 |
|---|---|---|
| Read request body | `need` | `evaluation` (+ `evaluation.benchmarkIds[]`), optional `synthesisPipeline` |
| Deposit request body | — | optional `synthesisPipeline` |
| Option measurements | `{ absolutes, needinesses }`, `needFit` | `{ absolutes, relatives }`, `evaluationFit` |
| Option provenance | `supplyProvenance` (single admission) | `sourceContributions` (weighted set) |
| Settle row | single `pendingPayout` | `sourceToShares` + `compensationStatement` with per-contributor slices |
| Settle route body | accepted payout addresses | rejects payout addresses (400) |
| Payout finalize | whole settle, single seller | caller's slice, keyed `(settleRunId, sellerUserId)` |
| Externals | GitHub | GitHub + Claude |
| MCP | stdio (API key, broken) | stdio (API key, repaired) + remote `/api/mcp` (OAuth 2.1) |

## Generated artifact changes

New `.proofs/v49/*` gate artifacts (opening-charter, evaluations-rename,
quick-synthesis, settlement-completion, benchmark-delta-relatives,
claude-external, promotion-readiness-report) as listed in the SPEC generated
canon.

## Test and promotion changes

- Living local CI (`scripts/run-bitcode-local-ci.mjs`) under pointer `V48` adds
  the V49 draft family check and auto-discovers `scripts/check-v49-gate*.mjs`
  once `BITCODE_SPEC_V49.md` exists; posture drift checks `V48 / V49`.
- Promotion is Gate 7 (`check:v49-gate7`).

## Explicitly deferred

- Value-bearing mainnet settlement; on-chain seller payouts; on-chain
  BitcodeERC1155 deployment.
- BYOK model provider keys.
- Benchmark auto-discovery; using benchmark runs as `verificationSignals` for
  absolutes.
- ChatGPT App and Bitcode Chat commercialization.
- Deeper BTD mining cryptography; advanced market mechanics.

## Accepted boundaries

See SPEC "V49 accepted boundaries and reopen conditions".

## Reopen conditions

- Quick output presented as measured quality.
- Contribution weights shown to be manipulable to redirect compensation.
- Any benchmark run exposing secrets or executing undeclared commands.
- Any MCP tool reachable without a valid scoped token.
- Compensation conservation drift.

## Pre-Implementation Sequence

1. Gate 1 — open the V49 family, posture `V48 active / V49 draft`, living CI
   wiring, `check:v49-gate1`.
2. Gate 2 — Evaluations rename codemod + data migration (first, so all later
   gates are written in V49 vocabulary).
3. Gate 3 — quick synthesis.
4. Gate 4 — settlement completion.
5. Gate 5 — benchmark-delta Relatives.
6. Gate 6 — Claude External (independent of Gates 3–5).
7. Gate 7 — promotion readiness and pointer advance.

## Commit-Body Direction

Subjects follow `V49 Gate N (spec-only|impl-only|spec-impl): …` under the 50/72
law and name scope class (flag, opt-in, migration, test) when relevant. Bodies
state which SPEC section the change realizes, the predicates/tests it closes,
the commands run (`pnpm run ci:local`, `check:v49-gateN`), and any env flags or
deferrals introduced.

## Gate 1: Opening charter

Opens the V49 family, moves `DRAFT_TARGET_VERSION` to `V49`, wires living local
CI for the V49 draft family and gate checkers, updates the roadmap and
specifying README posture, and adds `buildV49OpeningCharter`,
`.proofs/v49/opening-charter.json`, `generate:v49-opening-charter`, and
`check:v49-gate1`.

## Gate 2: Evaluations rename

SPEC: Evaluations rename law. Codemod, prompt prose rewrite, product copy,
migration, CI step rename, vocabulary scan artifact.

## Gate 3: Quick synthesis

SPEC: quick synthesis law. Quick package, mode resolution, dispatch branches,
UI toggle, one-call proof, read provisioning repair.

## Gate 4: Settlement completion

SPEC: settlement completion law. Contributions, fee, source-to-shares,
per-contributor finalize, viewers, redelivery, payout-identity hardening.

## Gate 5: Benchmark-delta Relatives

SPEC: benchmark-delta Relative law. Manifest, selection, runner, reading,
weighting, display.

## Gate 6: Claude External

SPEC: Claude External law. Remote MCP, OAuth server, Externals card, plugin,
API-key repair.

## Gate 7: Promotion readiness

SPEC: V49 promotion canon.
