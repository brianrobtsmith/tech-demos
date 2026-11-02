# Excerpts for stageshow-studio (not the full PRD)

Source: setasides-review/prd-plaid-accounts-realtime.md (Draft v2) · Google Doc 1_QqRR6s4yb25KqKGRUIShsOiEmlUUh3j0o6jJJedB6A

Only ACC flows/states, data fields, realtime, and investments — for demo stills.

## 1. Summary

This PRD specifies **read-only** bank and card linking through **Plaid**, powering a first-class **Accounts page**, with live UI updates via **Supabase Realtime Broadcast** (database-triggered private channels). It is the concrete linking slice of **Epic SYNC** / **CF.2–CF.3** in Addendum v28, and the foundation that **Epic MM** (money movement) and **Epic 3A** (three-account plan) depend on.

**What "live" means:** Plaid delivers transaction and balance updates in **batches**, not at the moment of a card swipe. After Plaid notifies us (webhook), Setasides syncs and Broadcasts so the Accounts page updates within **seconds of that notification**—not real-time payment rails. Copy and acceptance tests must never claim instant card-swipe updates. Sources: [Plaid Transactions](https://plaid.com/docs/transactions/), [Plaid help: not real-time](https://support.plaid.com/hc/en-us/articles/15373384920599-Do-the-transactions-get-and-transactions-sync-endpoints-provide-real-time-data).

**Add-on (v2):** **Live investment values** on the Accounts page are specified in §16. Holdings (securities + quantities) come from **Plaid Investments** (batch); **prices** come from a separate market-data provider. Client computes value = shares × price. Independent of bank/Transactions sync cadence.

**Broadcast recovery (v2 correction):** Postgres tables remain the source of truth; **refetch after reconnect is the primary recovery path**. **Broadcast Replay** is available on **private** channels for messages published via Broadcast from the Database (~72-hour partition retention; up to **25** messages per request)—use it as an **optional** catch-up optimization, not as the only recovery. Source: [Supabase Broadcast — Broadcast replay](https://supabase.com/docs/guides/realtime/broadcast).

**Out of scope for this PRD:** Plaid Transfer (or any ACH/RTP money movement product). Money movement remains **Epic MM** and ships **after** account sync. Core sync reads accounts, balances, and transactions; investment **pricing** is not from Plaid.

**Platforms:** Netlify web app (plain JavaScript) + MCP connector at `/mcp`, both on shared `lib/`. Supabase projects: preview `tliqhwbcslbptryrastw`, production `pzyqgszmaxyzgihtqixs`.

**Customer copy:** plain language only. Never say "Plaid," "webhook," "MCP," or "Realtime" on the Accounts page itself. Kind labels: neutral gray text, no emoji. Progress / accent UI notes: blue, not green. Example numbers only—never Brian's real finances.

---



---

## 5. User stories (Accounts page) — with acceptance criteria

Plain-language customer copy in quotes. UI notes: gray labels; blue accents for progress/status bars (not green).

### ACC.1 — Connect accounts

**As** a saver, **I want** to connect my checking, savings, and cards, **so** Setasides can show balances and find bills later without me typing everything.

**Acceptance criteria**

- Setup / Accounts empty state: **"Connect your accounts (recommended)"** and secondary **"Prefer not to connect? Upload statements instead"** (upload opens CF.1 when that slice exists; otherwise "Coming soon" without blocking connect).
- Consent screen before Link: read-only promise in plain words, e.g. **"We'll read balances and transactions to help your plan. We never see your bank password. We don't move money from this step."**
- After Link success, user chooses **Keep connected (recommended)** or **Read once and disconnect** (CF.2 / CF.3). Default = Keep connected.
- Keep connected: Item + token stored server-side; initial sync starts; Accounts shows institution name, masked account names (e.g. "Checking ···8049"), and a blue progress/status for **"Getting your history…"** until historical update is ready enough for the page.
- Read once: after history pull and pipeline handoff, call `/item/remove`, delete token, show **"Disconnected · data as of [date]"**.
- Request up to **730 days** (`transactions.days_requested`) on link token create ([Plaid Transactions](https://plaid.com/docs/transactions/)).
- Short history: **"We got about 6 months from Example Bank. Upload older statements for better suggestions."** (example bank name only).
- Unsupported institution: **"We can't connect to that bank yet. Upload statements instead."**
- Web and MCP share `lib/` connect orchestration (MCP cannot render Link UI—see ACC.MCP).

### ACC.2 — See balances

**As** a saver, **I want** to see current balances for each linked account, **so** I know where my set-aside money sits.

**Acceptance criteria**

- Accounts list groups by institution; each row: display name, type (Checking / Savings / Credit card—gray labels), mask, **available** and/or **current** balance as Plaid provides, **as of** timestamp.
- Example fixtures only (e.g. Checking ···1234 $2,450.00; High-yield savings ···5678 $8,200.00; Card ···9012 −$320.50).
- Balances refresh when sync runs (webhook or manual refresh). Stale copy: **"Balance as of [time]. Updates a few times a day—not the second you swipe."**
- Optional account **role** tag for later 3A (Checking / Savings / Long-term)—editable later; MVP may show type only.
- MCP: `list_accounts` returns the same fields.

### ACC.3 — Recent transactions

**As** a saver, **I want** recent transactions per account, **so** I can spot bills and transfers without leaving Setasides.

**Acceptance criteria**

- Per account or household feed: date, payee/merchant, amount, pending flag, account mask. Default last **30 days** or last **50** txns (Engineering picks one; document in UI helper).
- Pending shown with gray **"Pending"** label.
- Removed transactions disappear after sync (honor `/transactions/sync` `removed`).
- Does **not** auto-change M, N, or goals. Discovery suggestions stay in DISC / Epic 5 flows.
- MCP: `list_transactions` with `account_id` and `limit` / date filters; same shape as web.

### ACC.4 — Sync status

**As** a saver, **I want** to know whether my accounts are up to date, **so** I trust what I see.

**Acceptance criteria**

- Status values (internal → customer copy):
  - `connecting` → **"Connecting…"**
  - `initial_sync` → **"Getting your history…"**
  - `historical_ready` → **"Up to date"** (with **as of**)
  - `syncing` → **"Updating…"**
  - `error_reauth` → **"Reconnect needed"**
  - `error_other` → **"Can't update right now"**
  - `disconnected` → **"Disconnected"**
- Helper under status: **"Balances and purchases update after your bank sends them—usually within a day, often sooner. Not the second you swipe."**
- Manual **"Check for updates"** allowed; if using `/transactions/refresh`, treat as optional paid add-on (see Cost)—MVP may omit refresh and rely on webhooks only (open question).
- MCP: `get_sync_status`.

### ACC.5 — Re-auth and error states (ITEM_LOGIN_REQUIRED, consent expiry)

**As** a saver, **I want** a calm way to reconnect when my bank needs me again, **so** updates keep working without scary jargon.

**Acceptance criteria**

- On ITEM webhook `ERROR` with `ITEM_LOGIN_REQUIRED` (or API error): banner **"Reconnect Example Bank to keep balances current"** + **Reconnect** button. No "Plaid" / error codes in customer copy.
- **Reconnect** opens **Link update mode** for that Item ([Update mode](https://plaid.com/docs/link/update-mode/)).
- `PENDING_DISCONNECT` (US/CA) or `PENDING_EXPIRATION` (UK/EU): **"Your connection to Example Bank expires in about a week. Renew now so nothing drops."** + Renew (update mode).
- `LOGIN_REPAIRED`: dismiss reconnect messaging automatically.
- `USER_PERMISSION_REVOKED` / user revoked: mark Item disconnected; prompt to connect again if they want.
- Failed update mode: stay in reconnect state; plain **"Couldn't reconnect. Try again."**
- MCP: `get_sync_status` exposes `needs_reauth`; `create_update_link_token` for assistant-guided reconnect (assistant opens/hosts Link where the platform allows; otherwise returns link token / URL instructions for the person).

### ACC.6 — Disconnect

**As** a saver, **I want** to disconnect a bank, **so** Setasides stops reading it and stops paying for that connection.

**Acceptance criteria**

- Per Item: **"Disconnect"** → confirm **"Disconnect Example Bank? We'll stop updating these accounts. Your plan and past suggestions stay unless you delete them."**
- On confirm: `/item/remove`, delete access token / Vault secret, set Item `status=removed`, stop billing subscription for that Item ([Plaid billing](https://plaid.com/docs/account/billing/)).
- Choice to **keep** or **delete** stored transactions (follow Addendum retention / Privacy rules; default MVP: keep cleaned transactions for INS, drop token). Document the choice in Settings.
- MCP: `disconnect_item` with confirmation flag; destructive without confirm → clear error.

### ACC.7 — Live Accounts page (Realtime)

**As** a saver with the Accounts page open, **I want** balances and new transactions to appear without refreshing, **so** the page feels current after Setasides has synced.

**Acceptance criteria**

- Client subscribes to private channel `user:<auth.uid()>` with `config: { private: true }` and `realtime.setAuth()` ([Broadcast auth](https://supabase.com/docs/guides/realtime/authorization)).
- On broadcast for accounts / balances / transactions: patch UI.
- **Reconnect / multi-tab / missed messages (primary):** On channel `SUBSCRIBED` after reconnect (and when a tab becomes visible after a long background), **refetch** accounts, balances, and recent transactions from Postgres—the **source of truth**.
- **Optional optimization:** private-channel **Broadcast Replay** for DB-published messages (`since` + `limit` ≤ 25; partitions older than ~72 hours are dropped; availability at least 72 hours and at most ~4 days). Requires supabase-js **2.74.0+**. Replay must not replace refetch when more than 25 messages may have been missed or when state must be exact. Cite: [Broadcast replay](https://supabase.com/docs/guides/realtime/broadcast).
- Offline: show gray **"You're offline. Showing last loaded numbers."**; queue no writes; on online, refetch + resubscribe (optional replay afterward).
- Multi-tab: each tab subscribes; refetch-on-reconnect prevents divergent views.
- Never claim card-swipe latency in copy.

### ACC.MCP — Headless parity (required for every feature)

| Capability | Suggested MCP tool (names flexible; live in `lib/`) |
|---|---|
| Start connect | `create_link_token` → `{ link_token }` (client/platform completes Link) |
| Finish connect | `exchange_public_token` **only via trusted server path**—MCP server calls Edge/service, never stores token in chat logs |
| List accounts | `list_accounts` |
| List transactions | `list_transactions` |
| Sync status | `get_sync_status` |
| Update / re-auth | `create_update_link_token` |
| Disconnect | `disconnect_item` |
| Optional pull | `request_accounts_refresh` (triggers server sync if safe) |

- MCP must not receive or echo `access_token`.
- Mutations that change plan money still require existing `approved_by` rules where applicable; **this epic does not move money**.

---


---

## 6. Data model

Suggested tables (names can match Engineering conventions; columns are the contract).

### `plaid_items`

| Column | Notes |
|---|---|
| `id` | uuid PK |
| `user_id` | uuid FK → auth.users (or plans owner) |
| `item_id` | Plaid Item id, unique |
| `institution_id` / `institution_name` | display |
| `access_token_secret_id` | pointer into Vault **or** encrypted bytea; **never** plain text selectable by `authenticated` |
| `transactions_cursor` | last **committed** cursor after a full sync page sequence |
| `link_mode` | `keep_connected` \| `one_time` |
| `status` | `active` \| `error_reauth` \| `pending_expiration` \| `removed` \| … |
| `error_code` | nullable, internal |
| `consent_expiration_time` | timestamptz nullable |
| `initial_update_complete` / `historical_update_complete` | bool from webhook flags |
| `last_synced_at` | timestamptz |
| `created_at` / `updated_at` | |

**Cursor / idempotency rules**

1. Read committed cursor (null/empty for first sync).
2. Page `/transactions/sync` until `has_more=false`; on `TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION`, restart from the **preserved starting** cursor ([Plaid sync guide](https://plaid.com/docs/transactions/sync-migration/)).
3. Upsert added/modified by `transaction_id`; apply removals.
4. **Atomically** commit `next_cursor` only when the full page sequence succeeds.
5. Serialize sync **per Item** (advisory lock or job queue) so two webhook workers cannot race cursors.
6. Webhook delivery may repeat: treating sync as idempotent upserts + cursor commit makes retries safe.

### `accounts`

| Column | Notes |
|---|---|
| `id` | uuid PK |
| `user_id` | |
| `plaid_item_id` | FK |
| `account_id` | Plaid account_id, unique per item |
| `name`, `official_name`, `mask`, `type`, `subtype` | |
| `current_balance`, `available_balance`, `iso_currency_code` | |
| `balance_as_of` | |
| `hidden` / `closed` | optional |
| `role_hint` | optional enum for 3A later |

### `transactions`

| Column | Notes |
|---|---|
| `id` | uuid PK |
| `user_id` | |
| `account_id` | FK |
| `transaction_id` | Plaid id, **unique** |
| `amount`, `date`, `datetime`, `name`, `merchant_name` | |
| `pending`, `pending_transaction_id` | |
| `personal_finance_category` | jsonb nullable |
| `removed_at` | soft-delete when in `removed` |
| `raw` | optional jsonb for debug; exclude from client selects if large |

### `plaid_webhook_events` (optional but recommended)

| Column | Notes |
|---|---|
| `id`, `item_id`, `webhook_type`, `webhook_code`, `payload_hash`, `received_at`, `processed_at`, `status` | Dedupe by hash / delivery id if present |

Normalize into existing `import_expense_mining` transaction shape for DISC/CF pipelines (`source: in_app_link`).

---

## 7. Security and token handling

1. **Never** send `access_token`, client_id/secret, or Vault plaintext to the browser, Netlify front end, or MCP tool responses / logs.
2. **Edge Functions** hold Plaid `client_id` / `secret` as function secrets; use secret/service role only on the server ([Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys)).
3. **Token storage options (pick one in build; recommend A):**
   - **A.** Supabase **Vault** secret per Item; `plaid_items` stores Vault secret id; only security definer RPCs / Edge with service role decrypt ([Vault](https://supabase.com/docs/guides/database/vault)).
   - **B.** `pgcrypto` / authenticated encryption column; key outside DB; no `authenticated` SELECT on ciphertext table.
4. **Webhook verification required in production:** validate `Plaid-Verification` JWT (ES256, `kid` → `/webhook_verification_key/get`, `iat` ≤ 5 minutes, SHA-256 body match) ([Verify webhooks](https://plaid.com/docs/api/webhooks/webhook-verification/)).
5. **RLS:** users can SELECT only their rows on `accounts` / `transactions` / non-secret columns of `plaid_items`. No client INSERT/UPDATE/DELETE on sync tables; writes via Edge (service role) or security definer functions after auth checks.
6. **Disconnect** removes token and calls `/item/remove` so subscription billing stops.
7. **Logging:** scrub tokens; avoid logging full webhook bodies with account numbers in shared logs.
8. **Read-only product promise** in consent copy; money movement later is a separate opt-in (Epic MM).

---


---

## 8. RLS sketches

Illustrative SQL—Engineering adjusts names and uses `auth.uid()` mapping to plan owner as today.

```sql
-- Accounts: owner read-only
alter table public.accounts enable row level security;

create policy "users read own accounts"
on public.accounts for select to authenticated
using (user_id = auth.uid());

-- No insert/update/delete for authenticated (service role / definer only)

alter table public.transactions enable row level security;

create policy "users read own transactions"
on public.transactions for select to authenticated
using (user_id = auth.uid());

alter table public.plaid_items enable row level security;

create policy "users read own item metadata"
on public.plaid_items for select to authenticated
using (user_id = auth.uid());
-- Ensure access_token / vault columns are not exposed via a view; or revoke column privileges.
```

**Realtime private Broadcast** (topic = `user:` || auth.uid()):

```sql
-- Disable "Allow public access" in Realtime settings.

create policy "users receive own user topic broadcasts"
on realtime.messages
for select
to authenticated
using (
  realtime.messages.extension = 'broadcast'
  and realtime.topic() = 'user:' || auth.uid()::text
);
```

Trigger sketch (after upsert):

```sql
perform realtime.broadcast_changes(
  'user:' || NEW.user_id::text,
  TG_OP,
  TG_OP,
  TG_TABLE_NAME,
  TG_TABLE_SCHEMA,
  NEW,
  OLD
);
```

Client must use `{ config: { private: true } }` and matching private broadcast from DB ([Broadcast docs](https://supabase.com/docs/guides/realtime/broadcast)).

---


---

## 9. Realtime behavior details

| Concern | Behavior |
|---|---|
| **Primary path** | DB trigger → `realtime.broadcast_changes` → private `user:<id>` |
| **Why not Postgres Changes as primary** | Supabase recommends Broadcast-from-DB for many scale/security cases; keeps clients off direct WAL shape; easier per-user topic ACL |
| **Source of truth** | Postgres tables, not the broadcast payload |
| **Missed messages (primary)** | Expected on brief disconnect. **Refetch from Postgres on reconnect** (and on long background → visible). |
| **Broadcast Replay (optional)** | Available on **private** channels for messages published via **Broadcast from the Database**. Config: `since` (epoch ms, required), `limit` (optional, max **25**). Partitions older than **72 hours** are dropped (a message stays ≥72h and ≤~4 days). Client: supabase-js **2.74.0+**. Use to catch a small gap; **not** a substitute for table refetch when gaps may exceed 25 messages or when holdings/balances must match DB exactly. Source: [Broadcast replay](https://supabase.com/docs/guides/realtime/broadcast). |
| **Server webhook log** | Optional `plaid_webhook_events` is for ops/idempotency—not UI history. |
| **Offline** | Read-only cache of last fetch; show offline label; refetch when online (optional replay after). |
| **Multi-tab** | Independent subscriptions; refetch keeps them aligned. |
| **Cold start** | Initial page load = query tables; then subscribe (optional replay of recent DB broadcasts). |
| **Partition warning** | Ensure a client has connected so `realtime.messages` daily partitions exist before heavy broadcast ([troubleshooting](https://supabase.com/kb/troubleshooting/realtime-messages-not-arriving)). |

---


---

## 16. Add-on: Live investment values on Accounts (Draft v2)

**Status:** Approved direction by Brian (Nov 2, 2026, relayed via Job Finder). Spec for Engineering/Design review.  
**Depends on:** Accounts page shell; optional Plaid Investments link for holdings. **Independent of** bank/Transactions sync timing.  
**Ties to Epic 3A:** valued holdings feed the **long-term** sleeve of the three-account plan (checking / savings / long-term). This add-on supplies **read-only values**; allocation advice copy stays in Epic 3A. Example numbers only—never Brian's real portfolio.

### 16.1 Problem and approach

Bank sync (Plaid Transactions) updates cash and card activity in batches. **Brokerage holdings** (what you own) change when you trade or when corporate actions land—**rarely** compared with quotes—so **Plaid Investments** batch updates are enough for securities + quantities.

**Prices** move during market hours. Setasides should **not** rely on Plaid for streaming quotes. Use a **separate market-data provider**. Candidates to evaluate (no selection mandated): **Polygon**, **Alpaca**, **Finnhub**, **Twelve Data**.

**Pricing / commercial terms: unknown / unverified.** Do **not** state dollar fees in this PRD. Note qualitatively:

- Free tiers are often **~15-minute delayed** and/or **rate-limited**.
- **Real-time** (or low-latency) data usually **costs money** and carries **display / licensing** terms (who may show the quote, delayed labeling requirements, redistribution limits).
- **Mutual funds** typically price **once daily** (end-of-day **NAV**)—they are **never "live"** intraday. Always show **as-of** NAV date/time and gray **"End of day"** (not a live pulse).

**Recommended architecture**

1. Plaid Investments (or equivalent) syncs **holdings** → `securities` + `holdings` (quantity, cost basis optional later).
2. A **scheduled Supabase Edge Function** (cron during market hours) fetches latest prices for the household's symbols from the chosen provider and **upserts** `prices` (`symbol`, `price`, `as_of`, `source`, `is_delayed`, …).
3. Postgres trigger on `prices` (and holdings changes) calls `realtime.broadcast_changes()` on the user's private `user:<id>` channel (same pattern as bank sync).
4. **Client** computes **value = shares × price** in shared `lib/` (web + MCP). Prefer computing client-side (or in a view) over writing derived values every tick.
5. Refresh cadence: recommend **~1 minute during regular market hours**, not tick/streaming quotes—**cost**, provider rate limits, and **Supabase Realtime message limits**. After hours / weekends: **no** aggressive polling; show **last close** with time. A longer-running worker is only justified if Brian later chooses true streaming (not MVP).

### 16.2 User stories and acceptance criteria

#### INV.1 — See holdings with live (or delayed) values

**As** a saver with a linked brokerage, **I want** each holding's shares and current value on Accounts, **so** I know what my long-term money is worth.

**Acceptance criteria**

- Account section for investment accounts lists holdings: name/symbol (gray type label), quantity, price, **value**, **as of** time.
- Value = `quantity × prices.price` via shared `lib/position_value.js` (name flexible).
- Example fixture only: e.g. Example Total Market ETF · 10 shares · $120.00 · **$1,200.00** · as of 1:00 PM ET (made-up).
- If price is delayed: gray **"About 15 min delayed"** (or provider-accurate delay label)—never pretend free-tier delayed data is real-time.
- Mutual fund row: gray **"End of day"** + NAV as-of date; no live indicator.
- MCP: `list_holdings` returns the same fields including computed `value` and `price_as_of`.

#### INV.2 — Stale and market-closed behavior

**As** a saver, **I want** clear labels when a price is old or the market is closed, **so** I don't mistake last close for a live quote.

**Acceptance criteria**

- If `now - prices.as_of` exceeds a threshold (Engineering: e.g. >2× expected refresh interval during session): gray **"Price may be stale · as of [time]"** and optional blue refresh affordance if manual refresh exists.
- When US equity market is closed: show **last close** (or last stored price) with **"Market closed · last close as of [time]"**—no fake live pulse.
- Holidays / early close: same closed copy (calendar source is an open implementation detail).
- MCP: `get_holding_prices` / fields on `list_holdings` include `market_session: open | closed` and `stale: true | false`.

#### INV.3 — Holdings sync vs price sync are separate

**As** a saver, **I want** my share counts to update when the brokerage reports a trade, **without** waiting on the quote vendor.

**Acceptance criteria**

- Holdings upsert from Plaid Investments webhooks / periodic pull does not require a price API success.
- Missing price: show quantity and **"Waiting on price"** (gray); value hidden or em dash—not $0.
- Price worker failure: keep last good price + stale label; do not wipe holdings.
- Web and MCP agree.

#### INV.4 — Live update without full page reload

**As** a saver with Accounts open during market hours, **I want** values to update about every minute, **so** the long-term sleeve feels current without spammy flicker.

**Acceptance criteria**

- Price upserts Broadcast on `user:<id>`; UI recomputes values.
- Cadence target ~**60s** in session (configurable); document that this is **not** tick-by-tick.
- Recovery: **refetch holdings + prices** on reconnect (primary); optional Broadcast Replay per §9.
- Customer copy never says "real-time tick" or names the vendor on the page.

### 16.3 Data model additions

#### `securities`

| Column | Notes |
|---|---|
| `id` | uuid PK |
| `plaid_security_id` | unique nullable |
| `symbol` | e.g. VTI; index for price joins |
| `name` | |
| `type` | `equity` \| `etf` \| `mutual_fund` \| `other` (extend later) |
| `currency` | default USD |

#### `holdings`

| Column | Notes |
|---|---|
| `id` | uuid PK |
| `user_id` | |
| `account_id` | FK → investment account |
| `security_id` | FK |
| `quantity` | numeric |
| `as_of` | when brokerage quantity was sync'd |
| `cost_basis` | optional later |

#### `prices`

| Column | Notes |
|---|---|
| `symbol` | PK or unique with `source` |
| `price` | numeric |
| `as_of` | timestamptz of the quote/NAV |
| `source` | provider id string |
| `is_delayed` | bool |
| `delay_minutes` | nullable int |
| `market_session` | `open` \| `closed` \| `unknown` |
| `updated_at` | when we wrote the row |

RLS: users read holdings for their `user_id`; `securities` and `prices` readable to authenticated users who hold that symbol **or** prices are public-read within the app (Engineering pick—prefer not exposing a global price dump without auth). Writes: service role / Edge only. Trigger Broadcast on `prices` updates **only for symbols held by at least one user**, fan-out to affected `user:<id>` topics (implementation: price worker knows interested `user_id`s, or a bridge table `user_symbols`).

### 16.4 MCP parity

| Tool | Role |
|---|---|
| `list_holdings` | Holdings + computed values |
| `get_investment_summary` | Totals for long-term sleeve (feeds 3A later) |
| `request_holdings_refresh` | Triggers Investments sync (not price spam) |

No market-data API keys in MCP responses. No `approved_by` for reads.

### 16.5 Non-goals for this add-on

- Tick streaming / Level 2 / options chains.
- Tax lot optimization or trading.
- Guaranteeing real-time licensed data before a paid provider contract.
- Using Brian's real tickers or balances in specs/tests.

### 16.6 Open questions (also listed in §12)

- Provider choice and **unverified cost**.
- Which asset types in MVP; **crypto?**
- Whether delayed free-tier data is acceptable labeled for launch.
- How aggressively to Broadcast price updates vs coalesce per user per minute (Realtime limits).



---
