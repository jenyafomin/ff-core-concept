---
node_type: analysis
status: draft
topic: rentacar-understanding
owner: jenya.stasik@gmail.com
date: 2026-08-16
source: real docs/ba/*
---

# GA Rentacar — Business-Process Layer (registry of understanding)

Source of truth for this file: `RENTACAR_EXCEL_ANALYTICS/docs/ba/02_bp_coverage.md` (BP-01..BP-17,
the spine), cross-read against `00_EXECUTIVE_SUMMARY.md`, `01_scope_and_goals.md`, `07_gap_register.md`
(GAP-01..GAP-20), `RBAC-analysis.md`. This is a registry node, not a narrative report — every row traces
to a real BP-id/GAP-id/role in those files. No invented processes, no invented roles.

Coverage legend (from source): IMPLEMENTED / PARTIAL / STUB / MISSING.

---

## BP registry table

| BP-id | Name | Actors / roles (RBAC) | Trigger | Coverage | Data touched (entities/sheets) | Where an AGENT helps (concrete) | Risk / consent note |
|-------|------|------------------------|---------|----------|--------------------------------|----------------------------------|----------------------|
| BP-01 | Order Opening | Manager, Owner, Accountant (R); sync process (C) | New CRM order sync row arrives; no manual-create path exists | PARTIAL — no Customer REST endpoint, no manual order create, no status machine | `customers`, `orders` (dates, rates, status, FK vehicle+customer) | Agent watches incoming sync batch, flags orders with missing/malformed `customer.mobile` or duplicate customer names before they silently upsert; drafts a "new customer created via sync" digest for Manager instead of leaving customers invisible (no endpoint today) | Customer PII (name, mobile, nationality) — any agent touching customer records inherits Client-portal consent boundary (see RBAC §5.3: client data not shared outward) |
| BP-02 | Order in Progress | Manager, Owner (R/U via `orders-p2.controller.ts`) | Order active; return date approaches or passes | PARTIAL — `order.overdue` event never fires (GAP-01, GAP-07); `TaskListener` empty | `orders` (dailyRate, invoiceAmount, paid, remaining, followUpDate) | **Highest-leverage slot**: agent is the missing cron+emitter — periodically scans `expectedReturnDate < today AND status='Active'`, raises the overdue signal (currently a fully dead pipe per GAP-01/GAP-07), drafts the manager/owner alert text and a suggested follow-up task instead of waiting on unbuilt infra | None beyond standard operational data; low consent risk (internal ops signal, not client-facing) |
| BP-03 | Order Closing | Manager, Owner, Accountant | Manager marks order complete | PARTIAL — no dedicated close endpoint; no rule blocking close on unpaid fines | `orders` (completedOn/By, securityDeposit, advancePayment), `fines` (paidByClient) | Agent acts as a pre-close checklist assistant: cross-checks outstanding `paidByClient` fines and unsettled deposit before a manager finalizes closure, surfaces a "blocked/ok to close" verdict (business rule currently unenforced in code) | Financial verdict must stay advisory (R/U split — Manager/Accountant per RBAC 1.2) until owner confirms enforcement is wanted |
| BP-04 | Maintenance / Vehicle State | Owner, Manager, Mechanic, Admin | Vehicle sync from CRM; document expiry approaching | PARTIAL — `vehicle.document_expiring` never fires (GAP-01, GAP-08); Repair/Prep (BP-15) absent | `maintenance`, `maintenance_sessions` (works JSONB, odometer), `vehicles` (licenseExp, insuranceExp) | Agent is the missing document-expiry cron: watches `licenseExp`/`insuranceExp` against a configurable N-day window (GAP-08), drafts admin/owner alerts; also can read `maintenance_sessions` JSONB history and summarize recurring issues per vehicle (pattern the raw log doesn't surface today) | Vehicle documents are business-compliance data, not personal — low consent risk |
| BP-05 | Finance | Owner, Accountant (R/full); Manager (R, own-order scope only, field-limited) | Multi-source sync (CRM + EXP current/old); manual entry (planned) | PARTIAL — no virtual accounts, no exchange-rate history table, `source` protection unverified (GAP-16) | `transactions` (source, externalId, amount, currency, rate, category, type, FK vehicle/order/investor) | Agent reconciles multi-source sync output: flags transactions with `source != 'system'` overwritten unexpectedly (the unverified protection in GAP-16 is exactly the kind of drift an agent should watch continuously, not a one-off code check); also drafts category-grouping summaries the missing dashboard doesn't compute server-side | Financial data — Accountant/Manager RBAC split (RBAC 1.2) must gate what the agent is allowed to write back, not just read; separation-of-duties risk flagged in RBAC §3.2 (R2, HIGH) applies equally to an agent that could both create and "confirm" a transaction — agent must never hold both capabilities |
| BP-06 | Transport / Location | Driver, Logist, Manager, Admin | Order requires vehicle delivery/pickup/transfer | MISSING — no domain at all (GAP-02); enums (`ETransportType/Status`) exist unused | (none — domain absent); would touch `vehicles.lastLocation` (missing field) | Cannot help yet — no domain to observe. Once built (GAP-02 fix), agent's first job is auto-linking fines to transport-first (BR-03, currently impossible per GAP-04) before falling back to order-linking | Driver-role photo/location data is operationally sensitive (360-photo workflow, RBAC 1.5) — needs its own consent scoping before any agent touches it |
| BP-07 | Customers | Manager, Accountant, Owner (R); no edit endpoint | Customer upserted via Fines/Orders sync (side effect) | STUB — customer is sync-derived only, no first-class endpoint (GAP-09) | `customers` (mobile, name, nationality) | Agent can pre-populate a "customer profile digest" (order history, fine history, total value) from existing sync data even before the REST endpoint (GAP-09) exists — read-only synthesis layer that doesn't require new backend | Direct PII (mobile, name) — this is exactly the kind of "referent=3rd party" case the FF consent value (V7) flags: an agent must not surface customer data outside the roles RBAC already allows (Investor and Client explicitly excluded, RBAC §5.2/5.3) |
| BP-08 | Fines | Manager, Accountant, Owner (R/U); Client (R own only, planned pay/dispute) | Traffic-fine sync from CRM sheet | IMPLEMENTED (data layer) but **FineEmitter never emits** (GAP-01) — critical P0 gap | `fines` (fineId, amounts, dates, FK vehicle/order/customer, paidByCompany, paidByClient) | **Second highest-leverage slot**: agent fills the dead `fine.created` emit — on each new synced fine, drafts the Telegram alert to Manager and the `FINE_NOTIFY_CLIENT` task (both are P0 rules with fully built infra and zero flow, per GAP-01/GAP-05) | Investor RBAC explicitly excludes fines entirely (RBAC §1.3, §5.2 — "fines NOT visible to investor, company expense only") — any fine-summarizing agent must hard-exclude Investor as an audience |
| BP-09 | Salik | Owner, Accountant (as transaction category only) | Toll transaction appears in sync | MISSING — no dedicated domain, tracked only via `LIKE '%salik%'` category filter | `transactions` (category filter only) | Low-value agent target today (GAP-14, low priority) — could draft a per-vehicle salik summary from the category filter without new backend, as a stopgap before a real domain exists | None significant |
| BP-10 | Parking | Owner, Accountant (probable, as transaction category) | Parking transaction appears in sync | MISSING — same pattern as Salik, unverified | `transactions` (probable category) | Same stopgap pattern as BP-09; low priority | None significant |
| BP-11 | Companies | Owner, Admin (R/full) | Auto-populated from vehicle projects during sync | IMPLEMENTED | `companies` (auto-populate via `ensureFromProjects`) | Low agent value — domain already correct and automated; agent role limited to anomaly-watch (e.g., a project referencing an unexpected/new company name) | None |
| BP-12 | Investors | Owner, Accountant (R/full); Investor (R, own only, field-limited) | Investor contract exists; P&L requested/scheduled | PARTIAL — `deductFines` default inverted vs owner rule (GAP-03, P0); `visibleCategories`/category-inversion missing from P&L (GAP-06); no historical period slicing (GAP-11) | `investors`, `investor_contract` (profitSharePct, monthlyFixedAed, deductFines, deductSalik...), `vehicle_investor_history` | Agent is a strong candidate as a P&L-correctness watchdog: flags contracts still on the inverted `deductFines=true` default (GAP-03) pending owner confirmation, and flags P&L runs that ignore `visibleCategories`/inversion (GAP-06) rather than silently serving a wrong number to an external investor | HIGH consent/trust stakes — this is externally-facing financial data (Investor portal). An agent must never auto-correct and publish; it drafts a flagged discrepancy for Accountant/Owner to confirm before an investor sees a number. Row-level security gap R3 (RBAC §6) — investors must not see each other's data — an agent must respect `vehicleId → investorId` scoping strictly |
| BP-13 | Vehicle Sales | Owner, Admin | Vehicle marked 'For Sale' | MISSING — status field exists, no workflow/price/buyer tracking (GAP-15) | `vehicles.status` only | Low priority; agent could track vehicles sitting in 'For Sale' status past a threshold and nudge Owner, using only the existing status field | None significant |
| BP-14 | Lease / Long-term Rental Sales | Owner, Manager | Order created with `rentType=LONG_TERM` | MISSING — tracked as order type only, no leasing workflow | `orders.rentType` | Low priority; similar stopgap — agent flags long-term orders nearing renewal/expiry using existing order fields | None significant |
| BP-15 | Repair / Preparation | Mechanic, Admin (implied; domain not built) | Vehicle needs repair/prep between orders | MISSING — architecturally DEFERRED (GAP-13) | none (no domain) | Cannot help — no domain. Flag for later: once built, natural fit for an agent that sequences repair queue against upcoming order pickups | n/a until domain exists |
| BP-16 | Employees / Users | Owner, Admin (full); all roles (self) | User invited/created; login | IMPLEMENTED (auth solid); CRUD endpoints partially unverified | `users` (id, email, role, status, inviteToken) | Low agent value on the core auth flow (already solid). Agent could be the delivery layer for the currently-dead notification pipeline (GAP-01) — since notification infra exists and targets Users/roles, an agent watching domain events is the natural consumer once BP-02/BP-04/BP-08 emitters are wired | Role/permission changes are governance-sensitive (RBAC §6, R7 "who grants/revokes roles?") — agent must never self-grant or alter roles, read-only on this BP |
| BP-17 | GPS | Driver, Logist (implied; no domain) | Vehicle location ping (not implemented) | MISSING — no domain, no Phase-5 plan; depends on Transport (BP-06) | none | Cannot help — no domain, and depends on BP-06 being built first | n/a until domain exists |

---

## Top 3 agent-leverage processes (highest value × lowest complexity)

1. **BP-08 Fines — fill the dead `fine.created` emit (GAP-01 + GAP-05).**
   Value: HIGH — this is an explicit P0 rule (Manager Telegram alert) with fully built downstream
   infrastructure (notification rules, templates, task types) and *zero* upstream signal — `FineEmitter`
   body is literally empty (`02_bp_coverage.md` BP-08, `07_gap_register.md` GAP-01). Complexity: LOW —
   the agent doesn't need to build backend event plumbing; it can act as the "emitter" itself by watching
   the fines sync output/table and drafting the manager alert + `FINE_NOTIFY_CLIENT` task content. Fastest
   path from "data exists, nothing happens" to "someone gets told."

2. **BP-02 Order in Progress — overdue detection (GAP-01 + GAP-07).**
   Value: HIGH — executive summary calls this out by name as "the main operational signal for a manager"
   that is "fully dead" (`00_EXECUTIVE_SUMMARY.md` finding #1; `02_bp_coverage.md` BP-02). Complexity:
   LOW — the detection rule is a simple date comparison (`expectedReturnDate < today AND status='Active'`),
   explicitly scoped in GAP-07 as a cron the codebase never got. An agent doesn't need new schema, just
   read access to `orders` and a way to deliver the alert.

3. **BP-12 Investors — P&L correctness watchdog (GAP-03 + GAP-06).**
   Value: HIGH — a P0-severity financial defect (`deductFines` defaulting opposite of the owner-confirmed
   rule, understating every investor's share) sitting in an externally-facing portal; trust/consent stakes
   are real (external investor sees numbers). Complexity: MEDIUM — the agent doesn't fix the P&L formula
   (that's a schema+service change, GAP-06/GAP-03), but it can flag every contract/run that hits the known-
   wrong default or skips `visibleCategories`/inversion *before* a number reaches an investor, which is a
   pure read+compare task an agent can do today without waiting on the backend fix.

Runner-up worth naming: **BP-04 document-expiry cron (GAP-08)** — same "dead pipe" pattern as #1/#2, lower
severity (compliance risk, not daily-ops blocker), included in the table above but not in the top 3 because
its business impact is lower-frequency than fines/overdue orders.

---

## What's still unknown (questions for owner)

1. **Consent/visibility scope for agents.** RBAC-analysis.md documents *human* role boundaries in detail
   (Investor never sees fines/customer names, Client never sees fleet registry, etc. — RBAC §5.2/§5.3) but
   says nothing about what an AI agent acting *on behalf of* a role is allowed to read/write. Does an agent
   inherit the RBAC scope of the role it serves (e.g., a "Manager assistant" agent bound to Manager's RBAC
   row), or does it need its own permission class? This is unresolved in the source docs.
2. **Who owns "confirm" when an agent drafts the alert/task?** GAP-01's fix scope is literally "wire
   `emit()` calls" — if an agent plays that role instead, does its output need a human confirm step before
   Telegram delivery, or can it fire directly once the P0 rule is owner-approved? (Relevant to RBAC's own
   open question R2 — separation-of-duties for Accountant create/confirm, RBAC §3.2 — the same SoD concern
   likely extends to any agent that both drafts and sends.)
2b. **Related — GAP-03 `deductFines` default:** gap register itself flags this as needing owner
   reconfirmation ("code was written after the memory note was recorded") — an agent flagging this
   shouldn't assume which direction is "correct" without that confirmation.
3. **Transport domain timeline (BP-06/BP-17 blocker).** BP-06, BP-15, and BP-17 are all MISSING and BP-17
   explicitly depends on BP-06. No agent leverage exists there until the domain is built (GAP-02, HIGH
   effort). Is Transport domain construction on a near-term roadmap, or should agent-leverage planning
   assume those three BPs stay out of scope for now?
4. **Row-level security enforcement (RBAC R1, R3).** RBAC-analysis.md flags unresolved risks — "does
   Manager see all active orders or only own?" (R1) and investor-to-investor data isolation (R3) — as MUST
   CLARIFY / HIGH priority, still open. Any agent touching BP-01, BP-02, or BP-12 inherits these same
   unresolved boundaries; building agent access before R1/R3 are resolved risks baking in the wrong scope.
5. **Does the owner want agents to *emit* (act as the missing infra) or *advise* (draft, human sends)?**
   The whole "Top 3" set above assumes an advisory/drafting posture is safe-by-default; source docs never
   discuss AI agents at all — this framing is this analysis's own inference, not attributable to the
   RENTACAR_EXCEL_ANALYTICS docs, and should be confirmed with the owner before any build.
