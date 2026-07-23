# 🌳 doc-tree.view — генерируемое дерево docs/ (авто-вид)

> Собран `tools/lint/doc-tree.mjs`. НЕ править руками — перегенерировать: `node tools/lint/doc-tree.mjs`.
> Архетипы: numbered(ствол) · plural(контейнер) · service(_служебное) · trace(_log) · dated · named.
> 🔴 = в папке >6 прямых файлов (нарушение «нет loose-файлов»). Итого: 414 папок, 923 файлов.

## 🔴 Папки с перегрузом (везде, где много файлов — не должно быть)
- **32f** — `docs/base/product`
- **23f** — `docs/_log/2026-07-18-memory-unit-design`
- **18f** — `docs/02-project/core/01-brain/_archived/decomposition-pre-dissolve-2026-07-20/01-model/01-node`
- **16f** — `docs/01-organization/doc-discipline/restructure-2026-07/brain-top-level`
- **12f** — `docs/_log/2026-07-13-combination-fable`
- **10f** — `docs/00-states/04-improvement-plans`
- **10f** — `docs/topics/20-analysis`
- **9f** — `docs/01-organization/doc-discipline/restructure-2026-07`
- **9f** — `docs/02-project/core/01-brain/01-overview/01-values`
- **9f** — `docs/02-project/core/01-brain/01-overview/02-domains/01-knowledge-graph/04-mechanics`
- **8f** — `docs/02-project/core/01-brain/02-infrastructure/01-overview`
- **8f** — `docs/02-project/core/01-brain/analyses/2026-07-12-fable-series/2026-07-12-fable-decision`
- **8f** — `docs/_log/2026-07-10-directions-and-agents-mem-flood/council`
- **8f** — `docs/_log/2026-07-10-directions-and-agents-mem-flood/research`
- **8f** — `docs/base/council`
- **8f** — `docs/topics/30-plan`
- **7f** — `docs/01-organization/doc-discipline`
- **7f** — `docs/02-project/core/01-brain/02-infrastructure/04-modules/M-G3-type-registry-policy`
- **7f** — `docs/02-project/core/01-brain/analyses/2026-07-12-fable-series/2026-07-12-fable-basis`
- **7f** — `docs/02-project/core/01-brain/analyses/2026-07-12-fable-series/2026-07-12-forks-both-variants`
- **7f** — `docs/02-project/core/02-agents/01-orchestration`
- **7f** — `docs/_log/2026-07-10-directions-and-agents-mem-flood`
- **7f** — `docs/_log/2026-07-11-agents-manager-battle-state`
- **7f** — `docs/_log/2026-07-13-combination-fable/combination-scaffold/docs/decisions/ADR`
- **7f** — `docs/_log/2026-07-14-agents-audit-and-vision`
- **7f** — `docs/_log/2026-07-14-vector-and-defektovka`

## Дерево
```
docs/  [3f, 11d] named 🟢
  00-states/  [2f, 5d] numbered
    00-global-build/  [2f] numbered 🟢
    01-tree-rules-and-librarian/  [2f] numbered 🟢
    02-agent-system-mechanics/  [2f] numbered 🟢
    03-brain-productization/  [2f] numbered 🟢
    04-improvement-plans/  [10f] numbered  🔴 10 файлов — много (>6)
        · INDEX.md
        · PLAN-01-brain-core.md
        · PLAN-02-agent-orchestration.md
        · PLAN-03-docs-structure.md
        · PLAN-04-plugin-modularity.md
        · PLAN-05-gateway-build.md
        · PLAN-06-process-anti-churn.md
        · READINESS-2026-07-21.analysis.md
        · log.md
        · state.md
  01-organization/  [3f, 6d] numbered
    data-canon/  [5f, 1d] named
      forks/  [1f, 9d] named 🟢
        F1-domain/  [1f] named
        F2-units-law-or-exception/  [1f] named
        F3-project-axis-and-core/  [1f] named
        F4-platform-node/  [1f] named
        F5-family-shared-tier/  [1f] named
        F6-hard-erase-home/  [1f] named
        F7-reification-scope/  [1f] named
        F8-category-taxonomy-close/  [1f] named
        F9-canon-supersession/  [1f] named
    doc-discipline/  [7f, 2d] named  🔴 7 файлов — много (>6)
        · 2026-07-06-reorg-and-section-types.md
        · INDEX.md
        · PATCH-2026-07-17-conventions.md
        · method-01-entity-schema.md
        · method-02-adr-discipline.md
        · method-03-concept-navigation.md
        · section-types-registry.md
      growth-and-sequencing/  [3f] named 🟢
      restructure-2026-07/  [9f, 1d] named 🟢  🔴 9 файлов — много (>6)
          · DECOMPOSITION-DISSOLVE-MAP.md
          · HOOK-PROPOSAL.md
          · LOG-MODEL.md
          · MAP-current.md
          · MAP-target.md
          · MIGRATION-LOG.md
          · README.md
          · REGISTRY-UNIFICATION.md
          · SKILL-UPGRADE-PROPOSAL.md
        brain-top-level/  [16f] named  🔴 16 файлов — много (>6)
            · 01-numbering-and-no-loose-files.md
            · 02-containers-and-exceptions.md
            · 03-topics-must-migrate.md
            · 04-target-skeleton.md
            · 05-overview-first-pattern.md
            · 06-infrastructure-and-db.md
            · 07-decisions-distribute-and-index.md
            · 08-numbering-principles.md
            · 09-folders-vs-files-and-underscore.md
            · 10-staged-deliberation-process.md
            · 11-facet-template-and-numbering.md
            · AUDIT-MAP-2026-07-21.md
            · DEVELOPMENTAL-MODEL.md
            · PLACEMENT-AUDIT-2026-07-21.md
            · README.md
            · infra-recording.concept.json
    idea-studio/  [4f] named 🟢
    process/  [4f, 1d] named
      bugs/  [0f, 2d] named
        gateway-dup/  [1f] named 🟢
        gateway-tool-permission-stream/  [1f] named
    rules-and-skills/  [1f, 4d] named
      full-paths/  [1f] named
      investigation-economics/  [1f] named
      investigation-reporting/  [1f] named
      session-logging/  [2f] named
    session-handoff/  [1f] named 📦
  02-project/  [1f, 3d] numbered
    core/  [1f, 3d] named
      01-brain/  [3f, 9d] numbered 🟢
        01-overview/  [3f, 4d] numbered
          01-values/  [9f, 9d] numbered  🔴 9 файлов — много (>6)
              · GROWTH-MAP.md
              · V1-chitaemost.md
              · V2-tozhdestvo.md
              · V3-doverie.md
              · V4-vitalnost.md
              · V5-suverennost.md
              · V6-relyacionnost.md
              · V7-soglasie.md
              · _CARDS-2026-07-08.md
            01-chitaemost/  [2f, 6d] numbered
              01-passport/  [1f] numbered
              02-polysemy-lens/  [1f] numbered
              03-progressive-disclosure/  [1f] numbered
              04-temperature/  [1f] numbered
              05-dual-audience/  [1f] numbered
              06-fractal-stability/  [1f] numbered
            02-tozhdestvo/  [2f, 6d] numbered
              01-kriteriy-i-dedup/  [1f] numbered
              02-tozhdestvo-vo-vremeni/  [1f] numbered
              03-vetvleniye-i-varianty/  [1f] numbered
              04-kompoziciya-i-tip/  [1f] numbered
              05-koreferenciya-i-konflikt/  [1f] numbered
              06-dvizhkovyy-dolg/  [1f] numbered
            03-doverie/  [2f, 6d] numbered
              01-provenance/  [1f] numbered
              02-calibration/  [1f] numbered
              03-poisoning-defense/  [1f] numbered
              04-supersession-audit/  [1f] numbered
              05-concurrency-zombie/  [1f] numbered
              06-data-honesty/  [1f] numbered
            04-vitalnost/  [2f, 6d] numbered
              01-salience-weight/  [1f] numbered
              02-consolidation-emergence/  [1f] numbered
              03-forgetting-lifecycle/  [1f] numbered
              04-reinterpretation/  [1f] numbered
              05-pending-open-loops/  [1f] numbered
              06-metabolism-governance/  [1f] numbered
            05-suverennost/  [2f, 6d] numbered
              01-self-describing/  [1f] numbered
              02-policy-as-data/  [1f] numbered
              03-engine-contract/  [1f] numbered
              04-foreign-residence/  [1f] numbered
              05-ownership-keys/  [1f] numbered
              06-constitutional-ceiling/  [1f] numbered
            06-relyacionnost/  [2f, 6d] numbered
              01-edge-as-citizen/  [1f] numbered
              02-typed-edges-and-cascade/  [1f] numbered
              03-variants-and-templates/  [1f] numbered
              04-edge-decay/  [1f] numbered
              05-composition-and-emergence/  [1f] numbered
              06-conflict-cycles-and-scale/  [1f] numbered
            07-soglasie/  [2f, 7d] numbered
              01-referent/  [1f] numbered
              02-visibility/  [1f] numbered
              03-use-vs-read/  [1f] numbered
              04-consent-taint/  [1f] numbered
              05-revocation-erasure/  [1f] numbered
              06-custodial-override/  [1f] numbered
              decisions/  [4f] plural
            _archived/  [0f, 1d] service
              gen1/  [0f, 7d] named
                V1-chitaemost/  [3f, 1d] named
                  ideas/  [0f, 6d] plural
                    IDEA-authorship-badge/  [1f] named
                    IDEA-dual-format-passport/  [1f] named
                    IDEA-legibility-stress-test-at-scale/  [1f] named
                    IDEA-lens-as-memory-unit/  [1f] named
                    IDEA-passport-price-tag/  [1f] named
                    IDEA-temperature-as-visibility-gate/  [1f] named
                V2-tozhdestvo/  [3f, 1d] named
                  ideas/  [0f, 6d] plural
                    IDEA-bitemporal-version-variant-newnode/  [1f] named
                    IDEA-canonical-id-anchor/  [1f] named
                    IDEA-event-anchor-vs-record-identity/  [1f] named
                    IDEA-merge-conflict-protocol/  [1f] named
                    IDEA-scalable-merge-candidate-index/  [1f] named
                    IDEA-wave-identity-separate-from-cell-identity/  [1f] named
                V3-doverie/  [3f, 1d] named
                  ideas/  [0f, 5d] plural
                    IDEA-confidence-as-engine-primitive/  [1f] named
                    IDEA-contagion-threshold/  [1f] named
                    IDEA-source-origin-effective/  [1f] named
                    IDEA-supersession-self-annul/  [1f] named
                    IDEA-trust-write-authorization/  [1f] named
                V4-vitalnost/  [3f, 1d] named
                  ideas/  [0f, 5d] plural
                    IDEA-emergence-as-derived-node/  [1f] named
                    IDEA-incremental-metabolism-at-scale/  [1f] named
                    IDEA-lifecycle-stage-transparency/  [1f] named
                    IDEA-pending-as-separate-axis/  [1f] named
                    IDEA-salience-recipe-in-cell/  [1f] named
                V5-suverennost/  [3f, 1d] named
                  ideas/  [0f, 5d] plural
                    IDEA-engine-contract-handshake/  [1f] named
                    IDEA-fast-lane-slow-lane/  [1f] named
                    IDEA-key-travels-decision/  [1f] named
                    IDEA-lens-respects-policy/  [1f] named
                    IDEA-policy-source-label/  [1f] named
                V6-relyacionnost/  [3f, 1d] named
                  ideas/  [0f, 5d] plural
                    IDEA-conflict-visible-third/  [1f] named
                    IDEA-derived-edges-wave/  [1f] named
                    IDEA-edge-as-cell/  [1f] named
                    IDEA-edge-stale/  [1f] named
                    IDEA-typed-edges/  [1f] named
                V7-soglasie/  [3f, 1d] named
                  ideas/  [0f, 6d] plural
                    IDEA-consent-taint/  [1f] named
                    IDEA-custodial-override-as-cell/  [1f] named
                    IDEA-dual-forgetting/  [1f] named
                    IDEA-precomputed-consent-at-scale/  [1f] named
                    IDEA-referent-facet/  [1f] named
                    IDEA-use-vs-read-consent/  [1f] named
            _cross-cutting/  [1f, 1d] service
              ideas/  [0f, 3d] plural
                IDEA-auto-index-wave/  [1f] named
                IDEA-constructor-cell/  [1f] named
                IDEA-scale-as-feature/  [1f] named
          02-domains/  [3f, 2d] numbered
            01-knowledge-graph/  [1f, 6d] numbered
              01-explain/  [2f] numbered
              02-entities/  [1f] numbered
              03-relations/  [1f] numbered
              04-mechanics/  [9f] numbered  🔴 9 файлов — много (>6)
                  · MERGE-NOTES-2026-07-20.md
                  · act--decomp-2026-07-14.md
                  · categories-tags-facets--decomp-2026-07-14.md
                  · edge--decomp-2026-07-14.md
                  · layers--decomp-2026-07-14.md
                  · lens--decomp-2026-07-14.md
                  · node--decomp-2026-07-14.md
                  · passport--decomp-2026-07-14.md
                  · passport-fields--decomp-2026-07-14.md
              05-policy/  [1f] numbered
              questions/  [1f] plural
            _archived/  [4f, 1d] service
              02-agents-orchestration/  [6f] numbered
          portrait/  [1f] named
          scenarios/  [2f] plural
        02-infrastructure/  [2f, 4d] numbered
          01-overview/  [8f, 3d] numbered  🔴 8 файлов — много (>6)
              · MIGRATION-BLUEPRINT.md
              · MODULES.md
              · SYNTHESIS-01-2026-07-09.md
              · architecture-README.md
              · architecture.concept.json
              · infrastructure-INDEX.md
              · infrastructure-README.md
              · infrastructure-open-questions.md
            db-readiness/  [3f] named 🟢
            scenarios/  [7f] plural
            stack/  [3f] named
          02-backend/  [2f] numbered
          04-modules/  [0f, 7d] numbered
            M-G1-memory-engine/  [2f] named
            M-G2-orchestrator/  [3f] named
            M-G3-type-registry-policy/  [7f] named  🔴 7 файлов — много (>6)
                · MERGE-NOTES-2026-07-20.md
                · README.md
                · concept.json
                · policy-as-data--decomp-2026-07-14.md
                · policy-as-data-CARD--decomp-2026-07-14.md
                · policy-attachment--decomp-2026-07-14.md
                · policy-contents--decomp-2026-07-14.md
            M-G4-locality-residency/  [2f] named
            M-G5-identity-self/  [2f] named
            M-P3-loops/  [2f] named
            ideas/  [1f] plural
          _shared/  [1f] service
        _archived/  [0f, 2d] service
          decomposition-pre-dissolve-2026-07-20/  [5f, 3d] named
            01-model/  [2f, 9d] numbered 🟢
              01-node/  [18f, 4d] numbered  🔴 18 файлов — много (>6)
                  · 00-card.md
                  · APPLIED-2026-07-18.concept.json
                  · DECISIONS-unit.md
                  · FABLE-ANSWER-direction.md
                  · FABLE-ANSWER-hard-erase.md
                  · FABLE-ANSWER-skill-upgrade.md
                  · FABLE-BRIEF-direction.md
                  · FABLE-BRIEF-hard-erase.md
                  · HANDOFF-2026-07-16.md
                  · NEXT-STEPS.md
                  · PROCESS-UPGRADE-2026-07-17.md
                  · README.md
                  · START-HERE.md
                  · SYNTHESIS-unit.md
                  · TREE.md
                  · VISION-SIMPLE.md
                  · _critique-fable-erase.md
                  · _critique.md
                01-passport/  [1f] numbered
                02-policy-block/  [2f] numbered
                03-context-resolver/  [1f] numbered
                analyses/  [7f] plural
              02-edge/  [1f] numbered
              03-act/  [1f] numbered
              04-lens/  [1f] numbered
              05-plan-family/  [1f] numbered 🟢
              _shared/  [1f, 6d] service
                _to-dissolve/  [2f] service
                constitution/  [1f] named
                mechanisms/  [1f, 2d] named
                  hard-erase/  [1f] named 🟢
                  orchestration/  [1f] named
                passport/  [1f] named
                policy-as-data/  [2f] named
                routing-rule/  [1f] named 🟢
              plan/  [3f] named
              questions/  [1f] plural
              state/  [1f] named
            02-stack/  [3f] numbered
            03-method/  [5f] numbered
          state-moved/  [1f] named
        analyses/  [1f, 4d] plural
          2026-07-05-L1-values/  [4f] dated
          2026-07-05-fable-brain-dig/  [3f] dated
          2026-07-12-architecture-synthesis/  [5f, 1d] dated
            gaps/  [3f] named
          2026-07-12-fable-series/  [2f, 4d] dated
            2026-07-12-fable-basis/  [7f] dated  🔴 7 файлов — много (>6)
                · 01-basis-primitives.md
                · 02-node-vs-edge.md
                · 03-now-vs-later.md
                · 04-bridge-invariants.md
                · 05-goal-and-directions.md
                · 06-questions-for-owner.md
                · fable-basis.concept.json
            2026-07-12-fable-db-module/  [5f] dated
            2026-07-12-fable-decision/  [8f] dated  🔴 8 файлов — много (>6)
                · 01-basis-ratify.md
                · 02-directions-priority.md
                · 03-edge-facets-now-later.md
                · 04-diff-and-folder-orchestration.md
                · 05-third-primitive.md
                · 06-how-to-proceed.md
                · VERDICT.md
                · session.concept.json
            2026-07-12-forks-both-variants/  [7f] dated  🔴 7 файлов — много (>6)
                · 00-OVERVIEW.md
                · GR1-values-basis.md
                · GR2-spine-engine.md
                · GR3-units-structure.md
                · GR4-time-ops-origin.md
                · GR5-significance-input.md
                · forks.concept.json
        decisions/  [3f, 6d] plural
          D1-engine-vs-registry/  [2f] named
          D2-agent-memory-location/  [2f] named
          D3-canonical-type-names/  [2f] named
          D4-rebuild-reconcile-owner/  [2f] named
          D5-routing-rule/  [1f] named 🟢
          _archived/  [1f] service
        plan/  [5f] named
        questions/  [9f, 25d] plural
          FQ01-chitaemost-sliyanie/  [1f, 1d] named
            checks/  [1f] plural
          FQ02-tozhdestvo-novaya-cennost/  [1f, 1d] named
            checks/  [1f] plural
          FQ03-hrebet-tri-urovnya/  [3f, 1d] named
            checks/  [1f] plural
          FQ04-linza-pervoklassnaya/  [3f, 1d] named
            checks/  [1f] plural
          FQ05-emergens-vs-zabyvanie/  [1f, 1d] named
            checks/  [1f] plural
          FQ06-pending-petli/  [3f, 1d] named
            checks/  [1f] plural
          FQ07-referent-hard-erase/  [3f, 1d] named
            checks/  [1f] plural
          FQ08-g38-znachimost-na-rebre/  [1f, 1d] named
            checks/  [1f] plural
          FQ09-bazis-7-zamknut/  [1f, 1d] named
            checks/  [1f] plural
          FQ10-etika-opeka-avtonomiya/  [1f, 1d] named
            checks/  [1f] plural
          FQ11-kompoziciya-politik/  [2f, 1d] named
            checks/  [1f] plural
          FQ12-snapshot-v-moment/  [2f, 1d] named
            checks/  [1f] plural
          FQ13-append-only/  [1f, 1d] named
            checks/  [1f] plural
          FQ14-konstitucionnyy-chek/  [1f, 1d] named
            checks/  [1f] plural
          FQ15-obzor-chuzhih-proektov/  [2f, 1d] named
            checks/  [1f] plural
          FQ16-4-plana-breyna/  [1f, 1d] named
            checks/  [1f] plural
          FQ17-5-plan-affekt/  [3f, 1d] named
            checks/  [1f] plural
          FQ18-meta-uzel-samosti/  [1f, 1d] named
            checks/  [1f] plural
          FQ19-import-ne-human/  [1f, 1d] named
            checks/  [1f] plural
          FQ20-biografiya-rod-uzlov/  [1f, 1d] named
            checks/  [1f] plural
          FQ21-8-cennost-konstitutivnost/  [3f, 1d] named
            checks/  [1f] plural
          FQ22-uzel-profil/  [1f, 1d] named
            checks/  [1f] plural
          FQ23-stop-pravilo-sloyov/  [2f, 1d] named
            checks/  [1f] plural
          FQ24-vesch-vstrecha/  [3f, 1d] named
            checks/  [1f] plural
          FQ25-istina-log-vs-graph/  [1f, 1d] named 🟢
            analyses/  [1f] plural
        todo/  [1f] named
        topics/  [0f, 1d] named
          01-constitution/  [1f] numbered
      02-agents/  [1f, 3d] numbered
        01-orchestration/  [7f, 6d] numbered  🔴 7 файлов — много (>6)
            · DESIGN.md
            · README.md
            · agents-orchestration.concept.json
            · edge-types.md
            · modules.md
            · node-types.md
            · policy.md
          01-state/  [1f] numbered 🟢
          02-plan/  [2f] numbered
          03-task/  [1f] numbered
          04-loop/  [1f] numbered
          analyses/  [1f] plural
          decisions/  [2f] plural
        loop-system/  [3f] named
        runs/  [1f] named
      03-contract/  [1f] numbered
    open-questions/  [1f] named 🟢
    substrate/  [1f] named
  03-projects/  [1f, 5d] numbered
    7days/  [1f] named
    cardex/  [1f] named
    dwizh/  [1f] named
    ga-rentacar/  [1f] named
    video-social-music/  [1f] named
  04-knowledge/  [1f] numbered
  _generated/  [1f] service
  _inbox/  [1f] service 📦
  _log/  [0f, 25d] trace
    2026-07-06-navigation/  [1f] dated 🟢
    2026-07-06-reorg-brain/  [4f] dated 🟢
    2026-07-07-brain-open-questions/  [1f] dated
    2026-07-07-globalize-tree/  [4f] dated
    2026-07-07-reactivity-and-concept-method/  [3f] dated 🟢
    2026-07-10-directions-and-agents-mem-flood/  [7f, 3d] dated  🔴 7 файлов — много (>6)
        · CAPTURE-2-theme-management.md
        · CAPTURE.md
        · HANDOFF.md
        · STATUS-LEDGER.md
        · VERDICT.md
        · index.json
        · session.concept.json
      analysis/  [2f] named
      council/  [8f] named  🔴 8 файлов — много (>6)
          · areas-visibility.md
          · links-as-entity.md
          · loop-prompting-hitl.md
          · memory-unit-convergence.md
          · plans-as-data.md
          · prior-art-competitors.md
          · session-theme-turn.md
          · token-tracing.md
      research/  [8f] named  🔴 8 файлов — много (>6)
          · areas-visibility.md
          · links-as-entity.md
          · loop-prompting-hitl.md
          · memory-unit-convergence.md
          · plans-as-data.md
          · prior-art-competitors.md
          · session-theme-turn.md
          · token-tracing.md
    2026-07-11-agents-manager-battle-state/  [7f] dated  🔴 7 файлов — много (>6)
        · 01-vocabulary-and-forks.md
        · CAPTURE.md
        · CRITIQUE-and-presentation-architecture.md
        · HANDOFF.md
        · INDEX.md
        · UPGRADE-BACKLOG.md
        · session.concept.json
    2026-07-12-brain-concept-edges-flows/  [4f, 1d] dated
      raw/  [3f] plural
    2026-07-12-paths-nav-and-brain-scopes/  [2f] dated
    2026-07-13-arch-memory-design-to-build/  [5f] dated
    2026-07-13-combination-fable/  [12f, 3d] dated 🟢  🔴 12 файлов — много (>6)
        · CONTEXT-DIGEST.md
        · FABLE-BRIEF.md
        · FABLE-VERDICT.md
        · HANDOFF-OWNER.md
        · INDEX.md
        · MANDATE.md
        · MOVE-PLAN.md
        · PROTOCOL-concept-first.md
        · SURVIVING-CUT.md
        · VALUES-diverge-BA.md
        · _START-HERE.md
        · session-graph.json
      combination-scaffold/  [1f, 1d] named
        docs/  [1f, 6d] named
          decisions/  [1f, 1d] plural
            ADR/  [7f] named  🔴 7 файлов — много (>6)
                · ADR-C0-kernel.md
                · ADR-C1-manifest.md
                · ADR-C2-lenses.md
                · ADR-C3-port-bus.md
                · ADR-C4-provenance-cert.md
                · ADR-C5-scratch-erase.md
                · ADR-C6-cutover.md
          infrastructure/  [2f] named
          open-questions/  [1f] named
          plan/  [2f, 1d] named
            gaps/  [2f] named
          product/  [1f] named
          values/  [1f, 6d] named
            CV1-modularity/  [1f] named
            CV2-evolvability/  [1f] named
            CV3-compatibility-fork/  [1f] named
            CV4-sovereignty/  [1f] named
            CV5-trust-security/  [1f] named
            CV6-marketplace/  [1f] named
      concepts/  [2f] named
      handoff/  [6f] named
    2026-07-13-loop-mechanisms-brain/  [6f, 2d] dated
      fable/  [3f] named
      raw/  [0f] plural
    2026-07-14-agents-audit-and-vision/  [7f, 4d] dated 🟢  🔴 7 файлов — много (>6)
        · DIRECTION.md
        · HANDOFF.md
        · INDEX.md
        · OWNER-BRIEF-restated.md
        · QUESTION-fable.md
        · SKILL-BRIEF-thinking-vector.md
        · VISION-agents.md
      mechanisms/  [4f] named
      raw/  [2f] plural
      skills-draft/  [0f, 1d] named
        concept-first/  [3f] named
      skills-scan/  [1f] named
    2026-07-14-vector-and-defektovka/  [7f] dated  🔴 7 файлов — много (>6)
        · 00-RAW-owner-input.md
        · DECOMPOSITION-README.md
        · INDEX.md
        · INTEGRATION.md
        · PICTURE.concept.json
        · SYNTHESIS-integration.md
        · integration.concept.json
    2026-07-18-memory-unit-design/  [23f, 2d] dated  🔴 23 файлов — много (>6)
        · 01-model-README.md
        · APPLIED-2026-07-18.md
        · DECISIONS-unit.md
        · FABLE-ANSWER-direction.md
        · FABLE-ANSWER-hard-erase.md
        · FABLE-ANSWER-skill-upgrade.md
        · FABLE-BRIEF-direction.md
        · FABLE-BRIEF-hard-erase.md
        · HANDOFF-2026-07-16.md
        · NAV.concept.json
        · NEXT-STEPS.md
        · PROCESS-UPGRADE-2026-07-17.md
        · README.md
        · START-HERE.md
        · SYNTHESIS-unit.md
        · TREE.md
        · VISION-SIMPLE.md
        · _critique-fable-erase.md
        · _critique.md
        · _shared-README.md
        · _shared-mechanisms-README.md
        · design-queue.md
        · model-questions-README.md
      analyses/  [7f] plural
      method/  [2f] named
    2026-07-18-ratification-backlog/  [3f] dated
    2026-07-19-restructure-orchestration/  [2f] dated
    2026-07-20-concept-suffix-law-and-brain-directions/  [4f] dated
    2026-07-21-brain-restructure-recovery-and-model/  [3f] dated
    2026-07-21-improvement-plan-directions/  [2f] dated
    2026-07-21b-doc-org-map-and-plan/  [1f] dated
    2026-07-22-abstraction-spine-and-forks/  [1f] dated
    2026-07-22-blind-comprehension-experiment/  [1f] dated
    2026-07-22-brain-direction-fable/  [3f] dated
    2026-07-23-forks-adr-and-log-consolidation/  [1f] dated
  architecture/  [0f, 1d] named
    ADR/  [1f] named
  base/  [3f, 10d] named
    architecture/  [4f, 1d] named
      ADR/  [2f] named
    council/  [8f, 1d] named  🔴 8 файлов — много (>6)
        · COUNCIL-2026-06-13-architecture.md
        · COUNCIL-2026-06-13-first-slice.md
        · COUNCIL-2026-06-13-reframe.md
        · COUNCIL-2026-06-14-c1-node-meaning.md
        · COUNCIL-2026-06-14-c2-links-and-shadow.md
        · COUNCIL-2026-06-14-strategy-A-subscription-layer.md
        · COUNCIL-2026-06-14-strategy-B-api-runtime.md
        · COUNCIL-2026-06-14-synthesis-A-vs-B.md
      raw/  [1f, 18d] plural
        2026-06-15-c2c3-extract-route/  [4f] dated
        2026-06-15-cluster4-schema-stress/  [1f] dated
        2026-06-15-stress-adr0001/  [5f] dated
        2026-06-15-stress2-advanced/  [5f] dated
        2026-06-16-universal-node/  [2f] dated
        2026-06-19-facets-multicritic/  [2f] dated
        2026-06-21-load-bearing/  [4f] dated
        2026-06-21-passport-lock/  [3f] dated
        2026-06-21-ratify/  [3f] dated
        2026-06-23-series/  [0f, 6d] dated
          dogfood-schema/  [2f] named
          engine-spec/  [3f] named
          q3-dual-role/  [2f] named
          smart-categories/  [3f] named
          valve-rules/  [2f] named
          version-edges-stream/  [2f] named
        2026-06-23-stage1-inventory/  [2f] dated
        2026-06-23-stress-github-scenario/  [3f] dated
        2026-06-23-verbs-and-containers/  [3f] dated
        2026-06-24-agent-memory/  [2f] dated
        2026-06-24-competitors/  [3f] dated
        2026-06-24-doc-tree/  [1f] dated
        2026-06-24-engine/  [2f] dated
        2026-06-24-viewer/  [2f] dated
    dialogue/  [1f] named
    graph-example/  [6f] named
    ideas/  [6f] plural
    plan/  [4f] named
    product/  [32f] named  🔴 32 файлов — много (>6)
        · ANALYSIS-2026-06-12-multi-lens.md
        · ANALYSIS-2026-06-14-data-cell-and-modules.md
        · ANALYSIS-2026-06-14-information-model.md
        · CAPABILITY-MAP-2026-06-15-knowledge-base.md
        · CONCEPT-2026-06-15-data-model-stress-test.md
        · CONCEPT-2026-06-21-dialogue-as-data.md
        · DEEPDIVE-2026-06-15-c2c3-extract-route.md
        · FACETS-EXPLAINED-2026-06-19.md
        · RATIONALE-2026-06-19-two-foundations.md
        · RESEARCH-2026-06-21-load-bearing.md
        · SWEEP-2026-06-23-series.md
        · SYNTHESIS-2026-06-21-next.md
        · SYNTHESIS-2026-06-23-dogfood-schema.md
        · SYNTHESIS-2026-06-23-engine-spec.md
        · SYNTHESIS-2026-06-23-q3-dual-role.md
        · SYNTHESIS-2026-06-23-smart-categories.md
        · SYNTHESIS-2026-06-23-stress-test.md
        · SYNTHESIS-2026-06-23-valve-rules.md
        · SYNTHESIS-2026-06-23-verbs-and-containers.md
        · SYNTHESIS-2026-06-23-version-edges-stream.md
        · SYNTHESIS-2026-06-24-agent-memory.md
        · SYNTHESIS-2026-06-24-competitors.md
        · SYNTHESIS-2026-06-24-engine.md
        · SYNTHESIS-2026-06-24-viewer.md
        · SYSTEM-IN-PLAIN-WORDS.md
        · UNIVERSAL-NODE-2026-06-16-canvas.md
        · VERDICT-2026-06-15-adr0001-stress.md
        · VERDICT-2026-06-19-facets-multicritic.md
        · VERDICT-2026-06-21-ratify.md
        · VERDICT2-2026-06-15-advanced.md
        · VISION.md
        · stress-test-2026-06-15-detailed.md
    qa/  [1f] named
    research/  [1f] named
    spec/  [1f] named
  topics/  [1f, 11d] named
    00-canon/  [2f, 2d] numbered
      ADR/  [0f] named
      SPEC/  [0f] named
    10-synthesis/  [6f, 1d] numbered
      memory-unit/  [1f, 3d] named 📦
        open-questions/  [0f] named
        scenarios/  [0f] plural
        values/  [0f] named
    20-analysis/  [10f] numbered  🔴 10 файлов — много (>6)
        · 2026-07-01-AUDIT-knowledge-cell.md
        · 2026-07-04-AUDIT-core-readiness.md
        · 2026-07-05-DIAG-background-agents-died.md
        · 2026-07-05-deep-scenarios-opus.md
        · 2026-07-05-deep-scenarios-sonnet.md
        · 2026-07-05-forgotten-check.md
        · 2026-07-05-forgotten-fable-classified.md
        · 2026-07-05-other-projects-survey.md
        · 2026-07-05-round3-completeness.md
        · README.md
    30-plan/  [8f] numbered  🔴 8 файлов — много (>6)
        · 2026-07-03-DIRECTIONS-ecosystem-and-control-center.md
        · 2026-07-03-PLAN-agent-system-launch.md
        · 2026-07-04-CANON-three-tracks-and-topic-map.md
        · BACKLOG.md
        · FRONT-brain-memory-topic.md
        · README.md
        · START-agents-L0-agent-system.md
        · START-brain-L0-memory-unit.md
    40-dialogue/  [1f] numbered
    50-sessions/  [0f, 2d] numbered
      2026-07-03-comprehension/  [1f] dated
      2026-07-04-db-v1/  [6f] dated
    60-raw/  [6f, 2d] numbered
      2026-07-04-telegram-comm/  [1f] dated
      2026-07-05-memory-research/  [4f] dated
    70-ideas/  [2f] numbered
    80-examples/  [1f] numbered
    90-historical/  [1f] numbered
    99-qa/  [1f] numbered
```
