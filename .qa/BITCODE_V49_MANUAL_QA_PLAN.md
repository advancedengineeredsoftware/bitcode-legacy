# Bitcode V49 manual QA plan

Functional readiness for `version/v49` (Gates 1–7, tip `3707b1a37`) before
promotion readiness can be known. Automated proof is green (`pnpm run ci:local`,
`check:v49-gate1…7`) but runs on mocks, an in-memory OAuth store, and a LocalHost
fixture. This plan exercises the real system.

- **Pass A — local:** every V49 surface against real GitHub, real model
  providers, a real database, and Sepolia. Cheap to debug.
- **Pass B — staging-testnet:** the five lanes of
  `.qa/BITCODE_V49_STAGING_REHEARSAL.md` on the deployed stack (Vercel Sandbox,
  real Claude). A clean Pass B is the evidence that admits promotion.

Every step lists **Do** (UX actions or commands), **Expect**, and **Capture**
(telemetry / evidence). Record results in §8 (results log). Evidence must be
source-safe: run ids, PR URLs, explorer links, screenshot file names stored
outside the repository. Never paste tokens, keys, or protected source.

---

## 1. Third-party prerequisites

Have these ready before §2.

| # | Service | Needed for | What to prepare |
|---|---|---|---|
| P1 | **Supabase CLI** + Docker | Local DB (Pass A) | `brew install supabase/tap/supabase`; Docker Desktop running |
| P2 | **Supabase project** (staging) | Pass B | Project ref, service-role key, anon key, DB password (for `supabase link`) |
| P3 | **GitHub App** (`bitcode-github-auxiliary` or a QA copy) | Repo listing, tree reads, PR delivery, quick-synthesis Gather | `GITHUB_APP_ID`, `GITHUB_PRIVATE_KEY`, `GITHUB_APP_CLIENT_ID`, `GITHUB_APP_CLIENT_SECRET`, `GITHUB_APP_REDIRECT_URI`, `NEXT_PUBLIC_GITHUB_APP_PUBLIC_URL`. Callback URL must include `http://localhost:3000/...` for Pass A and the staging URL for Pass B |
| P4 | **GitHub accounts / orgs** | Three roles | Seller A, Seller B, Reader — each installs the App on their repo(s) (§2.5) |
| P5 | **Model provider keys** | Real synthesis | `ANTHROPIC_API_KEY` (and/or `OPENAI_API_KEY`, `XAI_API_KEY`, `GEMINI_API_KEY` per the inference profile in use) |
| P6 | **Ethereum wallets** (MetaMask or equivalent) | Sign-in, payment, payouts | Three wallets (Seller A, Seller B, Reader) on **Sepolia**; Reader funded with Sepolia ETH (any Sepolia faucet; ≥ 0.01 ETH covers many settles + gas). One treasury address for `BITCODE_SETTLEMENT_ETH_RECIPIENT` |
| P7 | **Sepolia RPC** (optional) | Payment verification | `BITCODE_ETHEREUM_RPC_URL` (Alchemy/Infura); a public RPC is the default |
| P8 | **Vercel** | Pass B deployment + Sandbox benchmark runner | Project with `version/v49` preview/staging deploy; Sandbox enabled (OIDC token is automatic on Vercel). For sandbox runs from a laptop: `VERCEL_TOKEN`, `VERCEL_TEAM_ID`, `VERCEL_PROJECT_ID` |
| P9 | **MCP Inspector** | Claude External (Pass A) | Node 22+; run with `npx @modelcontextprotocol/inspector` (no install) |
| P10 | **Claude** | Claude External (Pass B) | Claude.ai account with custom connectors (Pro/Max/Team/Enterprise), and/or Claude Code CLI (`claude`) |
| P11 | **HTTPS tunnel** (optional) | Real Claude against a laptop | `cloudflared` or `ngrok`, only if you want Claude.ai → local (Claude.ai requires a public https connector URL) |
| P12 | `psql`, `curl`, `jq`, `openssl` | Telemetry queries, OAuth / API checks | Standard CLI tools |

---

## 2. Environment setup (Pass A, local)

### 2.1 Checkout and dependencies

```bash
cd ~/Developer/bitcode
git switch version/v49            # or fast-forward version/v49 to v49/qa-manual-plan first
git log --oneline -1              # expect 3707b1a37 (or later)
git worktree remove .claude/worktrees/v48-demo-mode   # if still present (all work is committed)
pnpm install
```

### 2.2 Database and migrations

```bash
# Start local Supabase (Docker). Prints API URL, anon + service-role keys, DB URL.
bash scripts/supabase.sh start

# Option A — clean slate (wipes local data, applies every migration + seed):
pnpm run db:reset
# Option B — keep existing local data, apply only pending migrations:
(cd supabase && supabase migration up)
```

Verify the two V49 migrations applied (local DB URL is printed by `start`;
default `postgresql://postgres:postgres@127.0.0.1:54322/postgres`):

```bash
export DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
psql "$DATABASE_URL" -c "select version from supabase_migrations.schema_migrations where version like '2026101%' order by version;"
#   expect 20261018120000 (evaluations rename) and 20261019120000 (claude external oauth)
psql "$DATABASE_URL" -c "\dt public.oauth_*"
#   expect oauth_clients, oauth_authorization_codes, oauth_tokens
psql "$DATABASE_URL" -c "select column_name from information_schema.columns where table_name='user_api_keys' order by 1;"
#   expect key_hash, expires_at, last_used_at, scopes … and NO key / expire_at
```

### 2.3 `apps/uapi/.env.local`

Start from `apps/uapi/.env.example`, keep your existing Supabase/GitHub/model
values, and make sure these are set for Pass A:

```bash
# App + DB (values from `supabase start`)
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=…
SUPABASE_SERVICE_ROLE_KEY=…

# GitHub App (P3) and models (P5)
GITHUB_APP_ID=…   GITHUB_PRIVATE_KEY="-----BEGIN…"   GITHUB_APP_CLIENT_ID=…   GITHUB_APP_CLIENT_SECRET=…
NEXT_PUBLIC_GITHUB_APP_PUBLIC_URL=https://github.com/apps/<app-slug>
ANTHROPIC_API_KEY=…

# V49 behavior under test
BITCODE_SYNTHESIS_PIPELINE=rich                      # server default; UI toggle overrides per run
NEXT_PUBLIC_BITCODE_SYNTHESIS_PIPELINE_TOGGLE=1      # show the Quick / Rich toggle
BITCODE_PROTOCOL_COIN_FEE_BPS=500                    # 5% protocol coin fee (default)
BITCODE_SETTLEMENT_ETH_RECIPIENT=0x…                 # Sepolia treasury (P6)
BITCODE_ETHEREUM_RPC_URL=https://…sepolia…           # optional (P7)
BITCODE_PIPELINE_HOST=local                          # LocalHost on a laptop (benchmarks run locally)
# BITCODE_SETTLEMENT_REQUIRE_PAYMENT                 # leave UNSET (payment required by default)
# BITCODE_DEMONSTRATION_MODE                         # leave UNSET for Pass A (replay skips real synthesis + benchmarks)
# BITCODE_BENCHMARKS                                 # leave UNSET (benchmarks on); set 0 only in A4.6
# BITCODE_BENCHMARK_BUDGET_MS=600000                 # default 10 min
```

### 2.4 Start the servers

```bash
# Terminal 1 — Next dev server (Supabase already running from 2.2)
pnpm dev:remote                 # http://127.0.0.1:3000  (or `pnpm dev` = supabase start + next dev)

# Terminal 2 — keep a telemetry tail handy (see §7 for the queries)
psql "$DATABASE_URL"
```

Smoke: open http://localhost:3000, sign in; `curl -s localhost:3000/.well-known/oauth-authorization-server | jq .issuer`
→ `"http://localhost:3000"`.

### 2.5 Accounts, repositories, fixtures

1. **Three browser profiles** (Chrome profiles or separate browsers): *Seller A*,
   *Seller B*, *Reader*. In each: sign in with that role's wallet (one
   signature), complete Auxillaries → Profile, Wallet (bind + verify), Externals
   (install the GitHub App on that role's repositories).
2. **Seller repos A and B**: two repositories whose code overlaps in capability
   (e.g. both contain webhook-handling or retry logic) so one read option can
   draw on both.
3. **Reader repo** with benchmarks — copy the fixture and push:
   ```bash
   cp -R .fixtures/benchmark-repo/{.bitcode,src,bench} /path/to/reader-repo/
   cd /path/to/reader-repo && git add .bitcode src bench && git commit -m "Add Bitcode benchmarks" && git push
   ```
   Declares `lookup-steps` (stdout metric, improvable), `lookup-report`
   (json-file metric), `render-throughput` (deliberately failing).
4. Reader wallet funded on Sepolia (P6).

---

## 3. Pass A — local functional QA

Use one evidence row per step in §8. "Run id" = the execution id shown in the
telemetry header / URL (`?run=<uuid>`).

### A1. Evaluations rename (Gate 2)

| Step | Do | Expect | Capture |
|---|---|---|---|
| A1.1 | Reader → `/reads` → New (+) | Compose heading **Evaluations**; textarea placeholder "Describe how candidate DataPacks should be evaluated…"; no "Need/Needs" anywhere | screenshot |
| A1.2 | Open an existing pre-V49 read run from the history list | Options render with **Absolute** / **Relative** sections and "Evaluation fit (buy signal)" | run id |
| A1.3 | Type an Evaluation → anchor controls → save as "qa-anchor"; reload page; load it; clear | Anchor round-trips text + paths | — |
| A1.4 | Visit `/exchange`, `/packs`, `/docs` (settlement section) | No "Need" wording; "Evaluation(s)" / "Relative" used | screenshots |
| A1.5 | SQL: `select count(*) from executions where context ? 'need';` | `0` (migration rewrote keys) | value |

### A2. Quick vs rich synthesis (Gate 3)

| Step | Do | Expect | Capture |
|---|---|---|---|
| A2.1 | Seller A → `/deposits` → New → repo A + commit | Synthesize button group shows **Quick / Rich** toggle | screenshot |
| A2.2 | Select **Quick** → Synthesize | Telemetry: Setup → Discovery → Implementation → Validation → Finish; status line "Quick synthesis mode: one model call…"; completes ≈ 1–2 min | run id, wall-clock (§7.2) |
| A2.3 | Review option cards | Absolutes present: structural kinds `measured`, qualitative kinds `estimated`; `.patch` downloads and contains full file bodies | screenshot, patch file name |
| A2.4 | SQL §7.1 + §7.3 for the run | `context.synthesisPipeline = quick`; exactly **one** model-call event | values |
| A2.5 | Seller B → `/deposits` → repo B → **Rich** → Synthesize | Full SDIVF run; `synthesisPipeline = rich`; many model calls | run id, wall-clock, call count |
| A2.6 | Each seller: approve/admit ≥ 1 option to the Depository | Admission succeeds; pack appears on `/exchange` as supply | admission run ids |
| A2.7 | API guard: in DevTools on `/deposits`, replay the synthesize request (Copy as cURL) with `"synthesisPipeline":"bogus"` | 400 `invalid_synthesis_pipeline` | response |
| A2.8 | Set `NEXT_PUBLIC_BITCODE_SYNTHESIS_PIPELINE_TOGGLE=0`, restart dev server | Toggle hidden; runs use server default (`rich`) | screenshot; then restore `=1` |

### A3. Read synthesis + source attribution (Gates 3/4)

| Step | Do | Expect | Capture |
|---|---|---|---|
| A3.1 | Reader → `/reads` → New → reader repo + commit → Evaluation that both seller packs can satisfy → **Quick** → Synthesize | Options ranked by evaluation-fit; Relative rows: `language-fit`, `domain-fit`, `interface-fit` + Evaluation-inferred `*-fit` rows (`estimated`) | run id |
| A3.2 | Same with **Rich** | Same shape; telemetry shows the source-attribution step after measurements | run id |
| A3.3 | SQL §7.4 on the read run | `output.fullOptions[*].sourceAttributions` present; find an option attributed to **both** sellers' admitted packs | option index |
| A3.4 | If no two-seller option: rephrase the Evaluation to span both packs and re-run | ≥ 1 option with two attributions | run id |

### A4. Benchmark-delta Relatives (Gate 5)

| Step | Do | Expect | Capture |
|---|---|---|---|
| A4.1 | Reader → New → reader repo + commit | Evaluations panel shows **Measure improvement on…** with Lookup steps, Lookup report, Render throughput (unit + direction) | screenshot |
| A4.2 | Check **Lookup steps** + **Render throughput**; Evaluation e.g. "make lookups faster"; **Quick** → Synthesize | Telemetry: `benchmarks: 3 declared benchmark(s) found`, `benchmarks: measuring lookup-steps, render-throughput…`, per-option status lines | run id, telemetry excerpt |
| A4.3 | Option card fit panel | Benchmark rows: `Lookup steps · <baseline> steps → <candidate> steps (±x%)`; options that don't touch `src/lookup.js` read `+0.0%`; Render throughput reads **insufficient evidence — no weight** | screenshot |
| A4.4 | SQL §7.5 | `output.benchmarkReceipt` with ids, baseline samples, `render-throughput` `failureClass: baseline_failed`; no stdout stored | JSON excerpt |
| A4.5 | New run, **no checkbox**, Evaluation text "reduce lookup steps" | `lookup-steps` measured anyway (named in Evaluation) | run id |
| A4.6 | `BITCODE_BENCHMARKS=0`, restart, re-run | No benchmark rows; options complete normally. Restore (unset) | run id |
| A4.7 | Break the manifest (invalid JSON or unknown field) on a branch, select that ref | Panel shows ".bitcode/benchmarks.json was rejected: …"; synthesis still works without benchmarks | screenshot |
| A4.8 | Compare evaluation-fit of an option with an improving benchmark vs the same option without benchmarks | Measured improvement raises evaluation-fit; the failed benchmark changes nothing | values |

### A5. Settlement — fee, contributors, payment (Gate 4)

| Step | Do | Expect | Capture |
|---|---|---|---|
| A5.1 | Reader selects the two-contributor option (A3.3) → checkout | Quote shows BTD volume and per-rail total; pay-to = treasury | screenshot |
| A5.2 | DevTools: replay the settle POST **without** a payment proof | 402 (payment required by default) | response |
| A5.3 | Replay the settle POST adding `"depositorEthereumAddress":"0x…"` | 400 `payout_address_not_client_settable` | response |
| A5.4 | **Pay & settle** → confirm in wallet | Server verifies on-chain; one settle run per pack; receipt shows PR + payment explorer links | settle run id, tx hash |
| A5.5 | Open the PR (`bitcode/settle-…`) | Files applied; body has **Relative measurements** (benchmark rows as `baseline → candidate (+x%)`) and **Compensation** (protocol fee 5%, two contributors with weights) | PR URL |
| A5.6 | SQL §7.6 | `output.compensationStatement`: `mode=contributors`, `protocolCoinFeeBps=500`, two slices `awaiting-split`, conservation both `true`; `context.contributorUserIds` = both sellers | JSON excerpt |
| A5.7 | Settle an option with **no** admitted supply | `mode=treasury-only`; PR body says net payment and BTD stay with treasury | settle run id |

### A6. Viewers, per-contributor finalize, holdings, redelivery (Gate 4)

| Step | Do | Expect | Capture |
|---|---|---|---|
| A6.1 | Reader → `/reads` aside → **Owned DataPacks** | Pack listed: delivery state, PR link, payment link, contributor count, fee % | screenshot |
| A6.2 | Seller A → `/deposits` → Earnings → *Sold DataPacks* | Only Seller A's slice (weight %, BTD, pay, "awaiting your split") | screenshot |
| A6.3 | Seller A → open the settle on `/exchange` | Compensation statement: "Your contribution" highlighted, other row "Contributor 2"; DevTools response of `/api/packs/activity` contains **no** Seller B user id / account | screenshot, response check |
| A6.4 | Seller A: slider → **Finalize** | Slice `finalized`; settle `payoutState = partially-finalized` | §7.6 |
| A6.5 | Seller A: finalize again (replay request) | 409 `slice_already_finalized` | response |
| A6.6 | Reader: replay a finalize request for that settle | 403 `not_a_contributor` | response |
| A6.7 | Seller B finalizes | `payoutState = finalized` | §7.6 |
| A6.8 | Each seller: Auxillaries → Wallet / holdings | BTD increased by **their own** finalized slice only | before/after values |
| A6.9 | Delete the PR's `bitcode/settle-…` branch on GitHub (or pick a `projected` delivery) → Reader → Owned DataPacks → **Redeliver** | New PR opened; `redeliveries` recorded; second click reports already delivered | new PR URL |
| A6.10 | Seller replays the redeliver request | 403 (buyer-only) | response |

### A7. Claude External — OAuth + remote MCP (Gate 6)

**A7.a Card and metadata**

| Step | Do | Expect | Capture |
|---|---|---|---|
| A7.1 | Reader → Auxillaries → Externals → **Claude** card | Connector URL `http://localhost:3000/api/mcp`, Claude Code command, status **Not connected** | screenshot |
| A7.2 | `curl -i -X POST localhost:3000/api/mcp -H 'content-type: application/json' -d '{}'` | `401` + `WWW-Authenticate: Bearer resource_metadata="http://localhost:3000/.well-known/oauth-protected-resource"` | headers |
| A7.3 | `curl -s localhost:3000/.well-known/oauth-protected-resource \| jq` and `…/oauth-authorization-server \| jq` | `resource …/api/mcp`, scopes `deposits reads packs`; `code_challenge_methods_supported ["S256"]`, register/token/revoke endpoints | JSON |

**A7.b MCP Inspector (end-to-end OAuth)**

```bash
npx @modelcontextprotocol/inspector     # opens the Inspector UI in the browser
```

| Step | Do | Expect | Capture |
|---|---|---|---|
| A7.4 | Inspector: transport **Streamable HTTP**, URL `http://localhost:3000/api/mcp` → Connect (use its OAuth flow / "Open Auth Settings" → quick OAuth) | Browser opens `/oauth/authorize`: "Connect MCP Inspector to Bitcode", scopes listed, redirect host shown | screenshot |
| A7.5 | (Signed out profile) repeat | "Sign in to Bitcode" + Sign in / Continue; after signing in, Continue shows consent | screenshot |
| A7.6 | **Deny** once | Inspector receives `error=access_denied` | — |
| A7.7 | Connect again → **Allow** | Inspector connected; Tools list: `deposit, read, packs, measure, auxiliary` | screenshot |
| A7.8 | Call `read` `{ "repositoryFullName": "<reader repo>", "evaluation": "make lookups faster", "benchmarkIds": ["lookup-steps"], "synthesisPipeline": "quick" }` | `{ runId, status: "dispatched" }`; run appears on `/reads` | run id |
| A7.9 | Call `packs` `{ "view": "run", "runId": "<id>" }` until `status: completed` | Options with title / summary / measurements, **no paths or patch** | JSON excerpt |
| A7.10 | Call `measure` `{ "runId": "<id>" }` | Absolutes + relatives incl. `benchmark-delta:lookup-steps` with baseline/candidate | JSON excerpt |
| A7.11 | Call `packs` `{ "view": "owned" }` (Reader) | The A5 settle with PR link + buyer compensation (weights only, no seller ids) | JSON excerpt |
| A7.12 | Connect a Seller A session, call `packs` `{ "view": "sold" }` | Only Seller A's slice | JSON excerpt |
| A7.13 | Call `read` with `"evaluation": "short"` | Tool error "Invalid arguments" | — |
| A7.14 | Back in Externals → Claude card | Grant listed (client "MCP Inspector", scopes, last used), status **Connected**; Externals onboarding step complete even if GitHub were absent | screenshot |
| A7.15 | Card → **Revoke** → Inspector: list tools | `401`; card back to Not connected; SQL §7.7 tokens `revoked_at` set, `user_connections` anthropic-claude `is_active=false` | values |

**A7.c Scope narrowing and token law (curl, optional but recommended)**

```bash
BASE=http://localhost:3000
CLIENT=$(curl -s $BASE/api/oauth/register -H 'content-type: application/json' \
  -d '{"client_name":"qa-curl","redirect_uris":["http://localhost:8765/cb"]}' | jq -r .client_id)
VERIFIER=$(openssl rand -base64 48 | tr -d '=+/' | cut -c1-64)
CHALLENGE=$(printf %s "$VERIFIER" | openssl dgst -sha256 -binary | openssl base64 | tr '+/' '-_' | tr -d '=')
echo "$BASE/oauth/authorize?response_type=code&client_id=$CLIENT&redirect_uri=http://localhost:8765/cb&code_challenge=$CHALLENGE&code_challenge_method=S256&scope=packs&state=qa"
# open the URL in the Reader profile → Allow → copy `code` from the (failed-to-load) localhost:8765 redirect URL
CODE=…
curl -s $BASE/api/oauth/token -d grant_type=authorization_code -d client_id=$CLIENT \
  -d code=$CODE -d code_verifier=$VERIFIER -d redirect_uri=http://localhost:8765/cb | tee /tmp/qa-tok.json | jq 'del(.access_token,.refresh_token)'
AT=$(jq -r .access_token /tmp/qa-tok.json); RT=$(jq -r .refresh_token /tmp/qa-tok.json)
curl -s $BASE/api/mcp -H "authorization: Bearer $AT" -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | jq '[.result.tools[].name]'
```

| Step | Do | Expect |
|---|---|---|
| A7.16 | tools/list with `scope=packs` token | `["packs","measure","auxiliary"]` only |
| A7.17 | tools/call `read` with that token | `isError: true`, "not granted the \"reads\" scope" |
| A7.18 | Re-run the token exchange with the **same** `CODE` | `invalid_grant` (single-use); the earlier `AT` now returns 401 (replay revokes) |
| A7.19 | New code → tokens; `curl $BASE/api/oauth/token -d grant_type=refresh_token -d client_id=$CLIENT -d refresh_token=$RT` twice | 1st: new pair; 2nd (reuse): `invalid_grant` and the whole family is revoked |
| A7.20 | `curl $BASE/api/oauth/revoke -d token=$RT` | `200 {}`; subsequent MCP calls 401 |

**A7.d API keys (stdio MCP repair)**

| Step | Do | Expect | Capture |
|---|---|---|---|
| A7.21 | Auxillaries → API keys → create "qa-key" | Key shown **once** | — |
| A7.22 | SQL §7.8 | Row has `key_hash` (64 hex), `expires_at`; no plaintext anywhere | values |
| A7.23 | Prove the stdio lookup matches (the stdio server hashes the presented key and looks up `key_hash`): `psql "$DATABASE_URL" -c "select count(*) from user_api_keys where key_hash = encode(extensions.digest('<key>','sha256'),'hex');"` | `1` | value |
| A7.24 | (Optional) MCP Inspector, transport **STDIO**, command `pnpm exec tsx apps/mcp/src/index.ts` (cwd repo root, env `BITCODE_MCP_MODE=plugin`); call a tool with request `_meta` `{ "authorization": "Bearer <key>" }` | Authenticated; product tools respond (stdio reads `_meta.authorization` per request) | — |

### A8. Regression sweep

| Step | Do | Expect |
|---|---|---|
| A8.1 | V48 flows: deposit approve/admit, `/exchange` activity + detail, `/packs` dashboard, BTC rail quote (if `BITCODE_SETTLEMENT_BTC_RECIPIENT` set) | Unchanged behavior |
| A8.2 | `BITCODE_DEMONSTRATION_MODE=1` + `NEXT_PUBLIC_BITCODE_DEMONSTRATION_MODE=1`, restart; run the `.docs/DEMONSTRATION.md` §4 script | Replay runs; settles < 0.000009 ETH; no benchmarks; restore env |
| A8.3 | `pnpm run ci:local` on the root checkout | GREEN |

**Pass A exit criterion:** every step `pass`, or a defect filed (§8.2) and fixed
on a `v49/gate-N-*` follow-up branch with `pnpm run ci:local` and the affected
`check:v49-gateN` green, then the failing steps re-run.

---

## 4. Pass B — staging-testnet rehearsal

### 4.1 Deploy

```bash
# Database: link once, then push pending migrations (both V49 ones) to staging.
(cd supabase && supabase link --project-ref <staging-ref>)
bash scripts/supabase.sh db:push
# Verify (staging connection string):
psql "$STAGING_DATABASE_URL" -c "select version from supabase_migrations.schema_migrations where version like '2026101%';"

# App: deploy version/v49 to the staging Vercel project (git push triggers a preview,
# or promote the preview to the staging domain), or:
vercel deploy --prebuilt=false    # from apps/uapi, linked to the staging project
```

Staging env (Vercel project → Settings → Environment Variables), in addition to
the usual Supabase / GitHub App / model keys:

```bash
NEXT_PUBLIC_APP_URL=https://<staging-domain>          # OAuth issuer + connector URL
BITCODE_SYNTHESIS_PIPELINE=rich
NEXT_PUBLIC_BITCODE_SYNTHESIS_PIPELINE_TOGGLE=1
BITCODE_PROTOCOL_COIN_FEE_BPS=500
BITCODE_SETTLEMENT_ETH_RECIPIENT=0x…                  # staging treasury
# Sandbox host is automatic on Vercel (serverless → sandbox); OIDC token is injected.
```

GitHub App: add the staging callback / redirect URLs. Repeat §2.5 accounts on
staging (wallet binding + App install per role).

### 4.2 Lanes (fill `.qa/BITCODE_V49_STAGING_REHEARSAL.md`)

| Lane | Run these steps on staging | Evidence to write in the ledger |
|---|---|---|
| quick-synthesis | A2.2–A2.4 (deposit, quick) + A3.1 (read, quick) | both run ids; model-call count `1` each (§7.3) |
| rich-synthesis | A2.5 + A3.2 | both run ids |
| two-contributor-settlement | A3.3, A5.4–A5.6, A6.2–A6.8 | settle run id, PR URL, Sepolia tx link, finalize states, holdings deltas |
| benchmark-delta-read | A4.2–A4.4 (runner on **Vercel Sandbox**) | read run id; benchmark receipt excerpt (ids, failure classes) |
| claude-connector-session | **Real Claude**: Claude.ai → Settings → Connectors → Add custom connector → `https://<staging>/api/mcp` → approve; ask Claude to "use Bitcode to read DataPacks for <repo> that make lookups faster, then show my owned packs". Or Claude Code: `claude mcp add --transport http bitcode https://<staging>/api/mcp`, then `/mcp` → authenticate → same prompt. Then A7.14–A7.15 (revoke → Claude's next tool call fails / asks to reconnect) | grant timestamp, tool names invoked, run id from Claude's `read` call |

Then in the ledger: fill **Deployment**, **Attested by**, **Attested at**, set
each lane `passed`, and commit it (with approval) on a
`v49/gate-8-staging-rehearsal` branch.

---

## 5. Promotion readiness

```bash
node scripts/generate-v49-promotion-readiness-report.mjs
node scripts/check-v49-gate7-promotion-readiness.mjs --promotion-mode --require-rehearsal
#   expect: "...check passed (promotion admitted)."
pnpm run promote:canon -- --version V49 --commit "$(git rev-parse HEAD)" --dry-run
pnpm run promote:canon -- --version V49 --commit "$(git rev-parse HEAD)"     # clean tree
cat .specifications/BITCODE_SPEC.txt                                          # V49
pnpm run ci:local                                                             # GREEN under pointer V49
```

---

## 6. Timing and cost expectations

| Run | Expected wall-clock | Model calls |
|---|---|---|
| Quick deposit / read | ~1–2 min (+ benchmark stage when selected) | 1 (+1 attribution call on rich only) |
| Rich deposit / read | 5–15 min depending on repo | many (PTRR per agent) |
| Benchmark stage (fixture) | seconds locally; < 1 min on Sandbox | 0 |
| Settle (Sepolia) | 15–60 s after the payment tx confirms | 0 |

Record actual wall-clock (§7.2) — a quick run slower than ~3 min (excluding
benchmarks) is a finding.

---

## 7. Telemetry queries

Run against `$DATABASE_URL` (local) or the staging connection string.

**7.1 Run identity / mode**
```sql
select id, status, type, context->>'source' as source, context->>'synthesisMode' as mode,
       context->>'synthesisPipeline' as pipeline, context->'benchmarkIds' as benchmark_ids
from executions where id = '<run-id>';
```

**7.2 Wall-clock**
```sql
select id, context->>'synthesisPipeline' as pipeline, started_at, completed_at,
       completed_at - started_at as duration
from executions where user_id = '<user-id>' order by created_at desc limit 10;
```

**7.3 Event stream / model-call count** (telemetry rows behind the UI panel)
```sql
select event_type, phase, agent_name, created_at
from execution_events where run_id = '<run-id>' order by created_at;

select count(*) as model_call_events
from execution_events
where run_id = '<run-id>' and (event_type ilike '%llm%' or agent_name ilike 'llm:%');
```
Expect exactly 1 for a quick run. If event naming differs on your build,
count the model-call entries in the telemetry panel instead and note it.

**7.4 Read options + attributions (server-only fullOptions)**
```sql
select o->>'index' as idx, o->>'title' as title, o->>'evaluationFit' as fit,
       o->'sourceAttributions' as attributions
from executions, jsonb_array_elements(output->'fullOptions') o
where id = '<read-run-id>';
```

**7.5 Benchmark receipt + rows**
```sql
select output->'benchmarkReceipt' from executions where id = '<read-run-id>';
select o->>'index' idx, r->>'measurementKind' kind, r->>'status' status, r->>'volume' volume,
       r->'benchmark'->>'baseline' baseline, r->'benchmark'->>'candidate' candidate
from executions, jsonb_array_elements(output->'fullOptions') o,
     jsonb_array_elements(o->'measurements'->'relatives') r
where id = '<read-run-id>' and r->>'measurementKind' like 'benchmark-delta:%';
```

**7.6 Settlement / compensation**
```sql
select id, context->>'payoutState' payout_state, context->'contributorUserIds' contributors,
       output->'compensationStatement'->>'mode' mode,
       output->'compensationStatement'->>'protocolFee' fee,
       output->'compensationStatement'->'conservation' conservation,
       jsonb_path_query_array(output->'compensationStatement', '$.contributors[*].status') slice_status,
       output->>'prUrl' pr, output->'redeliveries' redeliveries
from executions where context->>'source' = 'read-settle-asset-pack' order by created_at desc limit 5;
```

**7.7 OAuth grants**
```sql
select c.client_name, t.token_kind, t.scopes, t.expires_at, t.revoked_at, t.rotated_at, t.last_used_at
from oauth_tokens t join oauth_clients c using (client_id)
where t.user_id = '<user-id>' order by t.created_at desc limit 10;
select provider, is_active, connection_data, updated_at
from user_connections where user_id = '<user-id>' and provider = 'anthropic-claude';
```

**7.8 API keys**
```sql
select name, length(key_hash) as hash_len, expires_at, last_used_at from user_api_keys where user_id = '<user-id>';
```

Also capture from the browser: telemetry panel screenshots (phase pills and
status lines), DevTools Network responses for the guard checks (A2.7, A5.2,
A5.3, A6.5, A6.6, A6.10), and the `/api/packs/activity` response for A6.3.

---

## 8. Results log

### 8.1 Step results

| Step | Pass/Fail | Evidence (run id / URL / screenshot / value) | Notes |
|---|---|---|---|
| A1.1 | | | |
| … | | | |

### 8.2 Defect template

```
ID: V49-QA-<n>        Step: <A?.?>        Severity: blocker | major | minor
Environment: local | staging (<url>), commit <sha>
Expected: …
Observed: …
Evidence: run id / response / screenshot
Suspected gate: Gate <n> (<area>)
Fix branch: v49/gate-<n>-<slug>
```

Promotion stays blocked until every blocker/major defect is fixed and its steps
re-pass, and Pass B's five lanes are attested.
