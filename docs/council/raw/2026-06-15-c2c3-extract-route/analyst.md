# RAW — Analyst lens · C2+C3 extract→route · 2026-06-15

> Saved verbatim. Synthesis: `docs/product/DEEPDIVE-2026-06-15-c2c3-extract-route.md`.

## Analysis: Extract → Route Pipeline (C2 + C3) — Deep Decomposition

### 1. Every atomic step (12 steps, 4 stages)
STAGE 1 CAPTURE — Step 0 channel normalization (raw signal → UTF-8 + source meta; fails: whisper hallucination, encoding, split messages).
STAGE 2 EXTRACTION —
- Step 1 Boundary detection (raw text → candidate semantic units; fails: under/over-split, wrong intent boundary).
- Step 2 Type classification (unit → type from open registry; fails: type absent, ambiguous 2 types, too narrow/broad).
- Step 3 Field population (typed unit + schema → draft: id,type,title,description,body,occurredAt,validFrom/Until,status,importance,actor; title = load-bearing L1 surface; fails: verbose/terse title, default-3 importance, occurredAt=now for past event).
- Step 4 Link+tag proposal (draft + index → links[]+tags[]; needs full scan / embeddings / session memory; fails: hallucinated link to nonexistent id = dangling edge NOT guarded, wrong rel, missing critical link).
- Step 5 Home proposal (draft → single home id or null; "which context gives most meaning" not "which areas touched"; fails: home doesn't exist yet, multiple homes, new area).
- Step 6 Epistemic status (draft+actor → fact|hypothesis|proposal|archive; provenance-determined, DETERMINISTIC not AI-judged because it gates execution; fails: agent marks own inference as fact).
STAGE 3 ROUTING —
- Step 7 Home existence check.
- Step 8 Home creation (conditional, recursive extraction; fails: duplicate home homonym RU/EN "Health"/"Здоровье").
- Step 9 Conflict/dup detection (no dedup logic exists today).
- Step 10 Status assignment (proposal epistemic forces proposed lifecycle = primary safety gate; fails: no enforcement blocking agent execution of proposed node).
- Step 11 Commit to store (markdown write; fails: partial write, Cyrillic filename).
STAGE 4 ENRICHMENT —
- Step 12 Enrichment lifecycle (inbox/proposed → fields populated over time; fails: never happens → stuck in inbox, dangling links, importance drift).

### 2. Three flow variations
(a) Single-pass (AI writes directly): fastest, zero owner load, HIGHEST error surface, irreversible garbage as facts.
(b) Two-pass (propose→approve→commit): highest correctness, highest cognitive load, approval bottleneck defeats purpose for 10-20 notes/day → stale proposals.
(c) Inbox-staging (capture raw instantly, enrich/route later in batches): instant capture, near-zero loss, deferred correctness, batch enrichment has BETTER cross-item link detection; risk: inbox graveyard if no regular sessions.

RECOMMENDATION — Asymmetric Hybrid (inbox-staging + differential review):
- Stage 1 sync always: raw → minimal node (type=thought, status=inbox, title, body=full, home=INBOX_ROOT, epistemic=raw). <2s. No classification, just preservation.
- Stage 2 async batch AI: enrichment agent runs steps 1-10 on groups; differential view (what classified, confidence, uncertainty). High-confidence auto-promote to proposed w/ 24h silent window; only uncertain surface.
- Stage 3 owner review lightweight: only uncertain + recently auto-promoted; 5-10 min/day not per-input.
- Critical enabler: epistemic field raw→proposed→fact. Without it stages 1&2 indistinguishable, safety gate gone.

### 3. Concrete example
Input: «сходил в зал, пожал 80 кг на 5 раз, спина побаливает, надо записаться к неврологу до пятницы»
→ 3 semantic units → 3 nodes:
- Node1 event.workout "Жим лёжа 80 кг × 5" home=Фитнес, link→node2 (caused-observation), importance 3, epistemic fact, status done, meta{value:80,unit:kg,reps:5,exercise:bench-press}.
- Node2 observation.symptom "Боль в спине после тренировки" home=Здоровье, links→node1 (observed-after), →node3 (triggered-task), importance 4, epistemic fact, status active, meta{body-part:back,severity:mild}.
- Node3 task "Записаться к неврологу" home=Здоровье, due 2026-06-20, link→node2 (triggered-by), importance 4, epistemic fact, status open.
3 nodes, 4 directed edges. Node1 lives in Фитнес, nodes2/3 in Здоровье; cross-domain link node1↔node2 WITHOUT second parent = "multi-belonging = link not 2nd parent" resolving Axis B.

### 4. Decision answers
#1 Belonging: YES strict. home = single id. importance cascades via home path only; second home breaks scalar importance + context-budget. Multi-belonging = links[] rel:belongs-to/also-in (queryable, no cascade corruption). On owner home-correction, auto-create rel:related-context link so cross-ref not lost.
#3 Types: YES open registry. Core types in @ff/core (group,task,note,thought,event,fact,agent,message,trace); module types EXTEND core (event.workout extends event, +meta validation). type field becomes string, store validates against registry. Breaking change to node.ts, right break. Core type always valid for query (find all event gets workout too).
#4 Epistemic: YES mandatory, 4 values. raw(system on capture)/hypothesis(agent only)/proposal(agent only)/fact(owner or post-approval agent). Each blocks: raw→agent task routing; hypothesis→commit as fact; proposal→any action; fact→nothing. getContext MUST return epistemic in envelope; agents cannot strip it. Edge: owner-stated intent = fact; AI-inferred = proposal. actor + extraction path determine deterministically.

### (A) Recommended field shape
IDENTITY: id, type[CHANGED open], title, description[NEW], body.
TIME: created, updated, occurredAt[NEW], validFrom[NEW], validUntil[NEW].
STATUS: status[CHANGED lifecycle across types], epistemic[NEW].
PLACEMENT: home[CHANGED from parentId, single id].
CONNECTIONS: links[]{to,rel,href?[NEW]}.
IMPORTANCE: 1-5 int[CHANGED from enum].
PROVENANCE: actor.
TYPE-SPECIFIC: meta (validated by type schema, not free).
COMPUTED (not stored): level L1/L2/L3, context (cascaded), importance_effective.
Removed: parentId→home; due→validUntil (or meta.due); tags retained; static context field redundant (use getContext).

### (B) Sharpest owner question
"When the AI extracts a node and is 90% confident about type/home/importance — what is your acceptable error rate before you want to see it before it commits?" Determines whether proposal is mandatory step or optional net; whether inbox-hybrid worth it; whether epistemic is a blocker or just a label.
