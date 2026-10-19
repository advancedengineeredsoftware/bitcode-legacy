# Bitcode V49 staging-testnet rehearsal

Operator attestation required by the V49 promotion canon before
`BITCODE_SPEC.txt` may advance to `V49`. Each lane is run on the staging
deployment against BTC/ETH testnet rails, live GitHub, live model providers,
and the live Vercel Sandbox. `check:v49-gate7 --promotion-mode
--require-rehearsal` (run by `promote:canon -- --version V49`) refuses to
promote until every lane reads `passed` and the attestation is signed.

- Deployment: _(staging URL)_
- Attested by: _(operator)_
- Attested at: _(ISO date)_

## Lanes

| Lane | Requirement | Status | Evidence |
| --- | --- | --- | --- |
| quick-synthesis | Read and deposit runs with `synthesisPipeline=quick` complete with exactly one model call each (execution tree `llm:*` count) | pending | |
| rich-synthesis | Read and deposit runs on the rich SDIVF pipeline complete with measured options | pending | |
| two-contributor-settlement | A read option attributed to two admitted Depository packs settles on testnet; both sellers see their slice and each finalizes independently; holdings update | pending | |
| benchmark-delta-read | A read on a repository declaring `.bitcode/benchmarks.json` shows `benchmark-delta:*` rows measured in the sandbox (baseline → candidate) | pending | |
| claude-connector-session | Claude (Claude.ai connector or Claude Code `--transport http`) completes OAuth, lists tools, runs `read` and `packs`; revoking the grant in Externals ends the session (401) | pending | |

Record evidence as source-safe references only (run ids, PR URLs, explorer
links, screenshots stored outside the repository). Never paste secrets,
tokens, or protected source.
