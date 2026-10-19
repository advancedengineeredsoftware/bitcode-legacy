---
name: bitcode
description: Use Bitcode through its MCP connector — synthesize read DataPacks against Evaluations, synthesize deposit DataPacks to sell, measure options, and review DataPacks the user owns or sold. Use when the user wants code from the Bitcode exchange, wants to sell code as DataPacks, or asks about their Bitcode packs, measurements, or compensation.
---

# Using Bitcode

Bitcode is an exchange for **DataPacks**: measured, source-safe packages of
code. Buyers **read** (describe Evaluations; Bitcode synthesizes candidate
DataPacks for their repository). Sellers **deposit** (Bitcode synthesizes
DataPacks from their repository to sell). Tools come from the `bitcode` MCP
server; the first call asks the user to approve access with their Bitcode
account.

## Tools

| Tool | Use it to |
|---|---|
| `read` | Start read synthesis: `repositoryFullName` (owner/name) + `evaluation` (how options should be judged). Optional `benchmarkIds` (declared in the repo's `.bitcode/benchmarks.json`), `relevantPaths`, `synthesisPipeline: "quick"` for one fast model call. |
| `deposit` | Start deposit synthesis on a connected repository; optional `obfuscations` (what must stay out) and source path steering. |
| `packs` | `view: "run"` + `runId` to poll a synthesis run and read its options; `view: "owned"` for DataPacks bought (PR links, compensation); `view: "sold"` for the user's contributor slices. |
| `measure` | Absolute and Relative measurements (evaluation-fit, benchmark deltas) for a run's options. |
| `auxiliary` | Read-only profile / wallet / Externals status. |

## Workflow

1. **Read:** write a concrete Evaluation (the outcome, constraints, what "better"
   means). If the repo declares benchmarks, pass the relevant `benchmarkIds`.
2. Call `read`, then poll `packs` with `view: "run"` every 20–30 s until
   `status` is `completed` (quick runs take about a minute; rich runs longer).
3. Summarize options by **evaluation-fit** and Relative rows (benchmark rows show
   baseline → candidate). Use `measure` for the full table.
4. Settlement (payment and PR delivery) happens on the Bitcode website — link the
   user to `/reads`; don't claim a DataPack was bought until `packs` with
   `view: "owned"` lists it.

## Rules

- Unpaid options never include source paths or patch bodies; don't ask for them.
- Report Absolute and Relative measurements with their honesty status
  (`measured`, `estimated`, `insufficient_evidence`); never invent numbers.
- If a tool says a scope is missing, ask the user to reconnect Bitcode with that
  scope (Claude settings → Connectors) rather than retrying.
