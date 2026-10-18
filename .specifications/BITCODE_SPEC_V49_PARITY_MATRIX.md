# Bitcode Spec V49 Parity Matrix

## Status

- Version: `V49`
- V49 state: full-system draft open; parity ledger for the Gate 1 opening
  charter and the V49 gate plan
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
- Spec companion: `BITCODE_SPEC_V49.md` (sole rebuild law)
- Notes companion: `BITCODE_SPEC_V49_NOTES.md`
- Delta companion: `BITCODE_SPEC_V49_DELTA.md`
- Measurement parity: `BITCODE_SPEC_V49_MEASUREMENT_PARITY_MATRIX.md`
- Scope: V49 draft parity ledger for the fast, real, end-to-end commercial MVP
- Last fully realized canonical target preserved in source: `V48`

## Purpose

This matrix records V49 parity work against the **V49 SPEC family alone**: what
must be specified, implemented, tested, documented, and proven for the four V49
reforms (Evaluations, quick synthesis, settlement completion, Claude External)
over the inherited V48 website MVP.

## Audit basis

Audit inputs are the V49 SPEC family, the opening audit recorded in NOTES
(2026-10-18), living source under `apps/uapi`, `apps/mcp`, `apps/claude`, and
`packages/`, `supabase/migrations`, local CI (`scripts/run-bitcode-local-ci.mjs`),
and `.proofs/v49/*` gate artifacts as they are generated.

## V49 implementation matrix

| Area | Layer | Spec requirement | Current source truth | Validating tests / commands | Judgment | Closure gate |
| --- | --- | --- | --- | --- | --- | --- |
| V49 family + posture | promotion | Family exists; posture `V48 active / V49 draft`; roadmap names V49 draft | Opened in Gate 1 | `check:v49-gate1`; spec-quality basic | drafted | Gate 1 |
| Living CI wiring | test | Local CI runs V49 draft family + discovers `check-v49-gate*` under pointer V48 | Opened in Gate 1 | `pnpm run ci:local:list` | drafted | Gate 1 |
| Evaluations vocabulary | system | No living Need/neediness product vocabulary | V48 vocabulary in ~230 source files, ~17 prompt files, UI, wire | `check:v49-gate2` vocabulary scan | spec closed; source gap | Gate 2 |
| Stored-row migration | system | Idempotent migration of V48 keys and `neediness_kinds` | Not present | migration test; `check:v49-gate2` | spec closed; source gap | Gate 2 |
| Quick deposit synthesis | system | `QUICK` pipeline, one model call | `factoryExecutionPipelineQuick` / `factoryQuickAgent` exist, unused | one-call test; `check:v49-gate3` | spec closed; source gap | Gate 3 |
| Quick read synthesis | system | `QUICK` read pipeline + real Finish + contributions + relatives | Not present | one-call test; `check:v49-gate3` | spec closed; source gap | Gate 3 |
| Synthesis mode resolution | system | env + request + demonstration precedence; persisted | Demonstration flag only | unit tests | spec closed; source gap | Gate 3 |
| Read provisioning call shape | system | Read dispatch provisions with correct args | Wrong args; always skipped | dispatch test | spec closed; source gap | Gate 3 |
| Source contributions | system | Weighted, validated, normalized set on every read option | Demonstration-only single provenance | unit tests; `check:v49-gate4` | spec closed; source gap | Gate 4 |
| Protocol coin fee | system | `BITCODE_PROTOCOL_COIN_FEE_BPS` taken before allocation | `coinFeeBps` unset | conservation tests | spec closed; source gap | Gate 4 |
| Source-to-shares in settle | system | `buildSourceToSharesProof` per settle; statement persisted | Standalone route only | conservation tests | spec closed; source gap | Gate 4 |
| Payout identity authority | system | Server-only payout identities | Body overrides accepted | route test | spec closed; source gap | Gate 4 |
| Per-contributor finalize | system | Slice finalize keyed `(settleRunId, sellerUserId)` | Whole-settle single seller | route tests | spec closed; source gap | Gate 4 |
| Owned / sold viewers | operator | `ReadsOwnedDataPacks`, slice-level `DepositSoldDataPacks` | Sold (single seller) only | component tests; E2E | spec closed; source gap | Gate 4 |
| Redelivery | system | `POST /api/read/settle/redeliver` idempotent | Not present | route test | spec closed; source gap | Gate 4 |
| Benchmark manifest + selection | system | `.bitcode/benchmarks.json` parse; selection route/UI | Not present | parser tests | spec closed; source gap | Gate 5 |
| Benchmark runner | realization | Sandbox baseline/candidate medians, budget, no secrets | Not present (no patch apply/run anywhere) | fixture repo test | spec closed; source gap | Gate 5 |
| Relative weighting | system | Subfamily mass table; zero-weight unmeasured benchmarks | Static/dynamic 0.6/0.4 only | unit tests | spec closed; source gap | Gate 5 |
| Remote MCP | system | `/api/mcp` Streamable HTTP, bearer, scopes | stdio only | route tests | spec closed; source gap | Gate 6 |
| OAuth 2.1 server | system | Metadata, DCR, PKCE, rotation, revocation, hashed storage | Not present | unit + route tests | spec closed; source gap | Gate 6 |
| Claude External card | operator | Externals pane card, grants, revoke, onboarding | GitHub only | component tests | spec closed; source gap | Gate 6 |
| API-key repair | system | `user_api_keys` migration; hashed issuance | Plaintext issuance; table missing | route test | spec closed; source gap | Gate 6 |
| Promotion readiness | promotion | Gates 1–6 artifacts fresh; `_PROVEN_`; pointer advance | Not started | `check:v49-gate7` | drafted | Gate 7 |

## V49 implementation checklist

| Item | Required result | Judgment | Gate |
| --- | --- | --- | --- |
| Pointer status | `BITCODE_SPEC.txt` = `V48` during drafting | accepted boundary | Gate 1 |
| File-family completeness | SPEC, DELTA, NOTES, PARITY, MEASUREMENT_PARITY exist | drafted | Gate 1 |
| Stale draft language | No promoted-status claims in the V49 draft | drafted | Gate 1 |
| Generated `_PROVEN_` | Generated at promotion | generated artifact pending | Gate 7 |
| Generated `.proofs/v49/*` | Gate artifacts generated per gate | generated artifact pending | Gates 1–7 |
| Test gates | Living CI + gate checkers green | drafted | every gate |
| Promotion command | V49 entries in promotion scripts | drafted | Gate 7 |
| Canonical commit message body | Derived from DELTA decisions + parity closure | drafted | Gate 7 |
| Accepted boundaries | Recorded in SPEC and below | drafted | Gate 1 |

## V49 accepted boundaries

| Boundary | Reason | Reopen condition |
| --- | --- | --- |
| Testnet-only pay rails | Mainnet value-bearing blocked | Explicit future version decision |
| Ledgered contributor payouts | No on-chain transfer in V49 | On-chain payout version |
| Projected ERC1155 state | No contract deployment in V49 | Contract deployment version |
| Model-attributed contribution weights | Validated membership + normalization, not measured derivation | Manipulation evidence |
| Quick qualitative absolutes are `estimated` | One call cannot measure quality | Presented as measured |
| Declared benchmarks only | Safety and clarity | Undeclared execution or secret exposure |
| No BYOK | Out of V49 scope | User-funded inference decision |
| Historical pre-V48 checks unexecuted | Specifying law §4.3/§13.1 | Never (frozen) |

## V49 completion condition

V49 is complete when every implementation-matrix row above is `closed` or an
accepted boundary, `.proofs/v49/*` gate artifacts are fresh, `check:v49-gate1`
through `check:v49-gate7` pass, living CI is green, and the promotion workflow
advances `BITCODE_SPEC.txt` to `V49`. Gate 1 alone is complete per the SPEC
"V49 completion condition".
