# Demonstration mode — operator runbook

Status: operator configuration (not product law). Non-canonical; the V48
SPEC wins on any conflict. Code SSOT:
`packages/asset-packs-pipelines/syntheses/domain/src/demonstration/`.

Demonstration mode lets an operator present the **whole** Bitcode commercial
loop end to end — seller deposit → Depository admission → reader Read →
purchase with a real testnet payment → GitHub pull request delivery → seller
compensation split — without waiting on (or paying for) live SDIVF inference.

## 1. What is replayed vs. live

| Surface | Demonstration mode |
| --- | --- |
| Deposit SDIVF (`POST /api/deposit/synthesize-options`) | **Replayed.** Paced Setup → Discovery → Implementation ×4 → Validation → Finish telemetry (same UI log rows / pills), curated DataPacks. |
| Read SDIVF (`POST /api/read/synthesize-options`) | **Replayed** the same way; options ranked by measured evaluation-fit. |
| Request checkout (repo tree, primary language) | **Live** — GitHub App installation token; covered paths bind to real files. |
| Deposit fail-closed validation + option projection | **Live** (`validateDepositSynthesisOptions`, `buildRealDepositAssetPackOptionSynthesis`). |
| Read Finish (unpaid envelope + server `fullOptions`) | **Live** (`read-finish-synthesize-run-agent`). |
| Absolutes / relatives | Structural absolutes **measured** from pack bodies; qualitative absolutes **estimated** (honesty status says so); static `*-fit` relatives measured against the Evaluation. |
| Wallet session (Ethereum / Bitcoin) | **Live.** |
| Payment | **Live testnet, required.** Sepolia ETH or BTC testnet4 from the buyer's wallet; settle verifies recipient + amount on-chain, one checkout per txid. |
| Settle pipeline (BTD volume, escrow mint, co-own) | **Live** (projected ERC1155 state, as in all testnet settles). |
| Delivery | **Live GitHub pull request** on the reader's repository, branched from the request SHA, carrying the pack's files and a payment link. |
| Seller payout split | **Live** (`/exchange` slider → `POST /api/packs/payout/finalize`, seller-authorized). |

Every replayed LLM row is tagged `provider: demonstration` and the product
routes show a **Demonstration** badge whose tooltip states the split above.

### Demonstration dataset (all pack data is demonstration data)

Only the account's **wallet and GitHub connections** are real. Every
execution row written in demonstration mode (deposit/read runs, admissions,
Evaluation anchors, settles, payouts) carries `context.dataset = "demonstration"`:

| Surface | Demonstration mode shows |
| --- | --- |
| `/deposits`, `/reads` pipeline tables, anchors | demonstration runs only |
| `/exchange` | demonstration admissions/settles + catalog **network supply** fixtures |
| Depository supply / demand estimates | demonstration admissions + network supply (real search index never read or written) |
| Header BTD \| APs, wallet pane | opening BTD + demonstration settles/admissions (real credits / ledger rows excluded) |
| Notifications | withheld (they describe real packs) |

Live mode (`BITCODE_DEMONSTRATION_MODE` unset/0) never shows demonstration
rows. Cross-dataset run ids are not found (run detail, settle rehydrate,
payout finalize).

## 2. The curated catalog

Six self-contained, dependency-free DataPacks with bundled tests. They ship
verbatim into reader PRs, so the TypeScript packs compile under `strict` and
every pack's own tests pass (Jest / pytest):

| Pack | Language | Kind | Lands in reader repo | Core Evaluation signals |
| --- | --- | --- | --- | --- |
| Resilient HTTP client (retry + circuit breaker) | TypeScript | capability-slice | `src/resilience/*` | retry, backoff, timeout, flaky |
| Idempotent webhook ingestion (HMAC + exactly-once) | TypeScript | implementation-pattern | `src/webhooks/*` | webhook, signature, duplicate, replay |
| Hash-chained audit log (tamper-evident) | TypeScript | proof-operations-slice | `src/audit/*` | audit, tamper, integrity |
| Text-to-SQL evaluation harness (execution accuracy) | Python | implementation-pattern | `evals/sql_generation/*` | generation, eval, benchmark, accuracy |
| PostgreSQL migration safety linter | TypeScript | capability-slice | `src/migrations-lint/*` | migration, ddl, lock, downtime |
| Token-bucket rate limiter (per-key, Retry-After) | Python | capability-slice | `ratelimit/*` | rate limit, throttle, quota |

**Deposits** offer the 4 packs that best fit the selected repository (checkout
path hints + primary language). **Reads** draw from admitted Depository supply
first (seller-linked), measure `language-fit` / `domain-fit` / `interface-fit`
against the Evaluation and repository, and present the best matches plus the weakest
option as an explicit non-match. Shared domain words ("postgres", "api") only
count as partial fit; a pack's core signals carry it. Example — Evaluation
"PostgreSQL query generation evaluations improvements" on a TypeScript repo:

| Option | evaluation-fit | Buyer gate |
| --- | --- | --- |
| Text-to-SQL evaluation harness | ≈ 0.77 | buy recommended |
| PostgreSQL migration linter (shares context only) | ≈ 0.49 | buy with caution |
| Unrelated TypeScript pack | ≈ 0.41 | buy with caution |
| Python rate limiter (wrong domain + language) | ≈ 0.25 | do not buy |

Admit the packs you want buyable **before** the read; an unlinked top-up pack
can still settle and ship, but has no seller to pay.

## 2a. Holdings move like a normal environment

With no ERC1155 contract configured, account holdings are the projected
BitcodeERC1155 state from settle/admission records
(`projectAccountHoldingsFromSettlements`, `@bitcode/btd`):

- **APs** (header chip, wallet "Owned AssetPacks"): +1 for every DataPack the
  account admits (owner read) and every DataPack it buys (co-owner).
- **BTD** (header chip, wallet balance): the seller's slice of each
  **finalized** payout split. Unfinalized settles stay in escrow; buyers never
  receive BTD.

The chip refreshes right after settle and after a payout finalize.

## 3. Setup checklist

1. **Env** (`apps/uapi/.env.local` or the Vercel project):
   ```bash
   BITCODE_DEMONSTRATION_MODE=1
   NEXT_PUBLIC_BITCODE_DEMONSTRATION_MODE=1
   BITCODE_SETTLEMENT_ETH_RECIPIENT=0x…        # Sepolia treasury (or BITCODE_MASTER_ACCOUNT)
   BITCODE_SETTLEMENT_BTC_RECIPIENT=tb1…       # optional: testnet4 treasury
   BITCODE_ETHEREUM_RPC_URL=https://…sepolia…  # optional; public Sepolia RPC by default
   # BITCODE_DEMONSTRATION_PACE=0.5            # faster replays for rehearsals
   ```
   Payment is required automatically in demonstration mode. A rail without a
   recipient is shown as "not configured" and cannot settle.
1a. **Presenter account**: set the presenter's wallet and opening balance,
   then verify it (wallet binding, GitHub App install + repositories,
   onboarding) and complete onboarding:
   ```bash
   BITCODE_DEMONSTRATION_ACCOUNT_ADDRESS=0xCC9d9412FA5D24CE9D9af0a1BF8E6401177092DE
   BITCODE_DEMONSTRATION_OPENING_BTD=1000
   pnpm run demo:provision            # dry run report
   pnpm run demo:provision -- --apply # complete onboarding (idempotent)
   ```
   The account is real: sign in with that wallet (one signature) and every
   Auxillary is already connected. It starts at the opening BTD; purchases add
   APs and finalized seller splits add BTD on top. The script never fabricates a
   wallet binding or GitHub install — it prints the presenter action instead.
2. **GitHub App** (`bitcode-github-auxiliary`) installed for **both** the seller
   account (deposit repository) and the reader account (target repository) —
   repository listing, tree reads, and PR delivery all use installation tokens
   (refreshed automatically).
3. **Wallets**: the reader's Ethereum wallet funded with Sepolia ETH plus gas.
   Demonstration mode prices BTD at a testnet demo spot
   (`BITCODE_DEMONSTRATION_BTD_USD`, default $0.03), so every read DataPack
   settles for **< 0.000009 ETH** (≈ 0.000006–0.000008 typical). At this spot
   BTC testnet4 amounts (≈ 20–30 sats) are below the dust limit — demo the ETH
   rail, or raise the spot for BTC. The seller's bound profile wallet
   (`user_profiles` wallet binding) becomes the payout `sellerAccount`.
4. Two browser profiles (seller, reader) make roles obvious; one account playing
   both roles also works (it is then both buyer and seller of the settle row).

## 4. Demo script

1. **Seller — `/deposits`**: New (+) → pick repository + commit → optional
   Obfuscations → Synthesize. Narrate the live telemetry (Setup → Discovery →
   Implementation → Validation → Finish). Review the three option cards
   (absolutes, contents, `.patch` download) → approve/admit each to the
   Depository.
2. **Reader — `/reads`**: New (+) → pick the target repository + commit → write
   an Evaluation (e.g. "our webhook handler double-processes Stripe events; verify
   signatures and dedupe retries") → Synthesize. Options arrive ranked by
   evaluation-fit, linked to the seller's admitted supply.
3. **Reader — buy**: select option(s) → the checkout quotes each pack (BTD
   volume + per-rail totals) and shows the pay-to address → **Pay & settle** →
   confirm in the wallet → the server verifies the payment on-chain → one settle
   pipeline per pack → receipts show the **pull request** and payment links.
4. **Reader — GitHub**: open the PR (`bitcode/settle-…` branch): pack files,
   patch summary, and the payment explorer link.
5. **Seller — earnings**: `/deposits` → Earnings → *Sold DataPacks* ("awaiting
   your split") → opens the settled pack on `/exchange` → choose the BTD vs
   pay-asset split with the slider → Finalize.

## 5. Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| Deposit 403 `repository_not_connected` | Repository not in the seller's GitHub App inventory — install the App on it. |
| Options cite the pack's own paths, not the repo's | Tree read failed (no installation token / API error); the demo falls back to the pack's paths. Re-check the GitHub connection. |
| Settle 402 `payment_required` | No txid — pay from the wallet first (the checkout does this). |
| Settle 402 `payment_unverified (transaction-not-found)` | Tx not yet visible to the observer after ~20s; press **Retry settle with paid tx** (the txid is kept, no re-pay). |
| Settle 409 `payment_already_used` | That txid already backs a running/completed checkout. |
| MetaMask shows **From: Account 1 → To: Account 1** / "No changes" | The pay-to resolved to the presenter's own wallet (e.g. `BITCODE_MASTER_ACCOUNT` is that wallet). Set `BITCODE_SETTLEMENT_ETH_RECIPIENT` to a different treasury address; the checkout now refuses, and verification rejects (`self-payment`), paying yourself. |
| Delivery "projected" | No request SHA and branch head unresolved, or no GitHub token for the reader — fix the reader's App install. |
| Seller doesn't see the sale | The read option had no admitted Depository match (admit the seller's pack *before* the read). |

## 6. Known gaps (not covered by demonstration mode)

- Spot prices remain the mock board (`createMockSpotBoard`); ERC1155/BTD state
  is projected per settle run (no on-chain mint, no on-chain seller transfer).
- SOL is quote-only (no live verification rail).
- `/exchange` "Purchase" deep links still land on `/reads` with a banner; the
  reader composes an Evaluation (a listing is not directly buyable).
- Deposit admission is decided client-side and recorded as an activity row; the
  Depository index call is fire-and-forget.
- The legacy `apps/uapi/mocking/` system and most `apps/uapi/mocks/*.json` are
  unreferenced by the live app and are **not** part of demonstration mode.
