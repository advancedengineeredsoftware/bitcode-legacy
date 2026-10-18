# Bitcode Spec V49 Measurement Parity Matrix

**Status:** Draft V49 measurement subsystem parity (spec ↔ implementation ↔ test) for the Absolute and Relative measurement families. Current canonical/latest target: `V48`.
**Canon:** `BITCODE_SPEC_V49.md` measurement law (DataPack identity + absolute hierarchy + honesty).
**Excluded:** `learning-gain` (BTD / evaluation-fit family owns exchange value scalar).

# Part A — Absolute family

## Hierarchy (rebuild law)

| Layer | Package pattern | Role |
| --- | --- | --- |
| Primitive | `@bitcode/measurement-generics` | Readings, carrier, `AbsoluteReadingStatus`, `DataPackMeasureReport` |
| Shared input | `@bitcode/generic-measurements-shared-absolute-measure-input` | DP-facing input + status enum |
| Bare absolute | `@bitcode/generic-measurements-absolutes-<kind>` | Pure `measureAbsolute*` of a **DataPack** |
| Catalogue | `@bitcode/generic-measurements-domain-data-pack-absolutes-catalog` | **Full commercial catalogue (65), Σ weights = 1** |
| Material identity | `@bitcode/generic-measurements-domain-data-pack-material-identity` | Compositions, inventories (deps-by-usage), tags, companion scalars |
| Tool | `@bitcode/generic-tools-tool-measure-<kind>` | ExecutionTool wrapper per kind |
| Agent | `@bitcode/generic-agents-agent-measure-absolutes` | Registry + full-catalogue runner + category PTRR factory |
| Product | `@bitcode/generic-asset-packs-synthesis` | Mode-parameterized product factory + re-exports |
| Domain host | `asset-packs-pipelines/syntheses/domain` | `measureDataPackAbsolutesAndIdentity`, static analysis, `resolveMeasureSourceSet` |
| Pipeline | `asset-packs-pipelines/syntheses/{deposit,read}` | After DP synthesis, attach absolutes + identity + measureReport |
| Tools postprocess | `@bitcode/agent-generics` `factoryToolsExecution` | Flat `useTools` or sequenced `toolPlan` waves |

**Unit under measure:** synthesized **DataPack** (patch + metadata), not the whole repository as commodity. Bodies may be read only via **measure source set** (covered + patch + manifests + optional sibling tests).

## Commercial catalogue law (live)

| Law | Value |
| --- | --- |
| Kind count | **65** (SSOT package; not a 11- or 46-kind subset) |
| Weight law | **Every kind has weight; Σ = 1** |
| Completeness | Product bags expand to full catalogue; fill rows must be `status: expanded-fill` |
| Honesty statuses | `measured` \| `estimated` \| `insufficient_evidence` \| `expanded-fill` \| `not_run` \| `not_implemented` |
| measureReport | Required product telemetry when measure ran (bodies, coverage, mode, fill/measured counts) |
| materialIdentity | Optional bag; required for excellent buyer legibility when manifests/bodies exist |

Policy roles (`weighted` \| `gate` \| `penalty` \| `flag` \| `target`) remain operational metadata; they do **not** remove kinds from the commercial catalogue.

## Structure performance (report-owned)

Static analysis **report-owned** kinds (host prefers report magnitudes only for these):

`function-count`, `type-count`, `file-span`, `symbolic-richness`, `modularity`,
`lang-span`, `test-surface`, `api-surface`, `dependency-span`, `doc-signal`,
`config-surface`.

Expanding a report over the full catalogue to volume 0 **must not** override bare
or material-identity readings for non-report-owned kinds.

## Deep measure source set

| Input | Rule |
| --- | --- |
| Covered + fileChanges | Always in path scope |
| Manifests | Always force when present in checkout bodies (package.json, locks, go.mod, Cargo.toml, pyproject, requirements, pom, gradle, Gemfile, composer, Dockerfile, …) |
| Sibling tests | Optional include for covered production paths |
| Cap | `BITCODE_DEPOSIT_MAX_MEASURE_BODIES` (default 80) + truncate telemetry |
| Lenses | Deposit **and** read Implementation |

## ToolsExecution waves

| Shape | Behavior |
| --- | --- |
| `useTools[]` | One sequential wave (backward compatible) |
| `toolPlan: ToolWave[]` | Ordered waves; each wave `sequential` and/or `parallel` |
| `usedTools` | Accumulated in wave order with `waveIndex` |
| PTRR steps | Still only Try + Retry tool-capable — no new steps |

## Product surfaces

| Surface | Honesty / identity |
| --- | --- |
| Deposit option card | Measure report strip; material identity + deps-by-usage; status badges; review artifact download |
| Exchange detail | Same measureReport + status + deps inventory (source-safe) |
| Pack activity | Project `status`, `materialIdentity`, `measureReport` |
| Review artifact | `bitcode.datapack.review-artifact` v1 (path-op + measurements + honesty) |
| Path-op patch | `bitcode.artifact.patch` protocol export |

## Test bindings

| Surface | Tests |
| --- | --- |
| Catalogue weights | `domain/data-pack-absolutes-catalog` core |
| Bare kinds | each `absolutes/<kind>/src/__tests__/core` |
| Material identity | `domain/data-pack-material-identity` core |
| Agent registry | `generic-agents/agent-measure-absolutes` core |
| Tool waves | `agent-generics` `tools-execution-waves.core` |
| Source set | `resolve-measure-source-set.core` |
| Host multi-file | `measure-datapack-multi-file.core` |
| Fixture matrix | `measure-fixture-matrix.core` (TS multi-lang-service, python-api, go-module) |
| Expand honesty | uapi `expandAbsoluteMeasurements` |
| Deposit/Exchange UX | deposit admission, pack activity, exchange page |

# Part B — Relative family (V49)

**Canon:** `BITCODE_SPEC_V49.md` measurement law (Relative family), Evaluations
rename law, and benchmark-delta Relative law.

## Hierarchy (rebuild law)

| Layer | Package pattern | Role |
| --- | --- | --- |
| Primitive | `@bitcode/measurement-generics` | `RelativeReading`, `MeasurementKindCategory = 'absolute' \| 'relative' \| 'material-identity'` |
| Catalogue | `@bitcode/generic-measurements-relatives` | `ASSET_PACK_RELATIVES_CATALOG` (static fit rows), `assertRelativeKindPattern`, `computeEvaluationFitVolume`, subfamily mass table |
| Benchmark delta | `@bitcode/generic-measurements-relatives-benchmark-delta` | `parseBenchmarkManifest`, reading formula (`improvementRatio`, volume, status) |
| Runner | `packages/pipeline-hosts` `runBenchmarkDeltas` | Sandbox baseline/candidate execution, budget, source-safe receipts |
| Read host | `asset-packs-pipelines/syntheses/read` `read-relative-measurements.ts` | Static + Evaluation-inferred measure; attach benchmark rows |
| Quick | `asset-packs-pipelines/syntheses/quick` | Evaluation-inferred rows from the single call (`estimated`); static + benchmark via host |
| BTD | `@bitcode/btd` `computeSettlementBtdFromRelatives` | evaluation-fit → settlement BTD |

## Relative kind law

| Subfamily | Pattern | Status classes | Mass (all present) |
| --- | --- | --- | --- |
| Static fit | `<dimension>-fit` (catalogue) | measured \| estimated | 0.4 |
| Evaluation-inferred fit | `<slug>-fit` (planned per Evaluation) | measured \| estimated | 0.3 |
| Benchmark delta | `benchmark-delta:<id>` | measured \| insufficient_evidence \| not_run | 0.3 |

Masses for partial presence: static only 1.0; static + inferred 0.6 / 0.4;
static + benchmark 0.6 / 0.4. Benchmark rows without `measured` status weigh
zero.

## Parity rows

| Row | Requirement | Current source truth | Test binding | Judgment | Gate |
| --- | --- | --- | --- | --- | --- |
| R-01 | Category literal `'relative'` replaces `'neediness'` | V48 literal | type + migration tests | implemented; promotion pending | Gate 2 |
| R-02 | Package `generic-measurements/relatives` | `generic-measurements/needinesses` | package tests | implemented; promotion pending | Gate 2 |
| R-03 | Kind-pattern law (`-fit` or `benchmark-delta:<id>`) | `-fit` suffix only | unit tests | spec closed; source gap | Gate 5 |
| R-04 | Subfamily mass table | 0.6 / 0.4 static/dynamic | unit tests | spec closed; source gap | Gate 5 |
| R-05 | Manifest parser fail-closed | absent | parser tests | spec closed; source gap | Gate 5 |
| R-06 | Runner medians, budget, `not_run` on exhaustion | absent | fixture repo test | spec closed; source gap | Gate 5 |
| R-07 | Reading formula + statuses | absent | unit tests | spec closed; source gap | Gate 5 |
| R-08 | Quick Evaluation-inferred rows are `estimated` | quick read rows `estimated` via `measureQuickReadRelatives` | quick tests | implemented; promotion pending | Gate 3 |
| R-09 | Option card Absolute / Relative sections incl. benchmark rows | needinesses section | component tests | spec closed; source gap | Gates 2, 5 |
| R-10 | Settlement BTD from relatives only | from needinesses only | btd tests | implemented; promotion pending | Gate 2 |
