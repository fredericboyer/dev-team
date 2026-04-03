# Agent Memory: Tufte (Documentation Engineer)
<!-- First 200 lines are loaded into agent context. Keep concise. -->

## Project Conventions

### [2026-03-25] Documentation structure: README, CHANGELOG, ADRs in docs/adr/, CLAUDE.md, learnings.md
- **Type**: PATTERN [verified]
- **Source**: project structure analysis
- **Tags**: documentation, structure
- **Outcome**: verified
- **Last-verified**: 2026-03-25
- **Context**: README.md at root. CHANGELOG.md follows Keep a Changelog format. docs/adr/ contains ADRs with README index. CLAUDE.md serves as project instructions for Claude Code. .claude/rules/dev-team-learnings.md holds shared team knowledge.

### [2026-03-25] CHANGELOG follows Keep a Changelog with semver — used in release workflow
- **Type**: PATTERN [verified]
- **Source**: CHANGELOG.md + release.yml analysis
- **Tags**: changelog, release, documentation
- **Outcome**: verified
- **Last-verified**: 2026-03-25
- **Context**: Release workflow extracts changelog section matching the tag version to generate GitHub Release notes. Missing changelog entries produce a warning but don't block release. Format: ## [version] - YYYY-MM-DD with Added/Changed/Fixed/Internal sections.

### [2026-03-25] Tufte is triggered on implementation file changes to detect doc-code drift
- **Type**: PATTERN [verified]
- **Source**: CLAUDE.md hook trigger rules
- **Tags**: doc-code-drift, hooks, triggers
- **Outcome**: verified
- **Last-verified**: 2026-03-25
- **Context**: Tufte is auto-flagged when .md/docs/README files change AND when significant implementation files change (src/, templates/agents/, templates/skills/, templates/hooks/, bin/, package.json). Dual trigger catches both direct doc edits and implementation changes that may require doc updates.

### [2026-03-26] ADR README index can drift from actual ADR files on disk
- **Type**: PATTERN [verified]
- **Source**: ADR-032 authoring — ADR-029 existed on disk but was missing from README index
- **Tags**: adr, doc-code-drift, index
- **Outcome**: fixed
- **Last-verified**: 2026-03-26
- **Context**: The ADR README.md index table is manually maintained. When ADRs are added without updating the index, the table drifts. Check for unlisted ADR files when editing the index.

### [2026-03-26] ADR format is stable: Context/Decision/Consequences with Date+Status header
- **Type**: PATTERN [verified]
- **Source**: ADR-029, ADR-026, ADR-012 format comparison
- **Tags**: adr, format, documentation
- **Outcome**: verified
- **Last-verified**: 2026-03-26
- **Context**: All ADRs use the Nygard lightweight format. No frontmatter, no YAML. Title line is `# ADR-NNN: Title`. Status line values: proposed, accepted, deprecated, superseded by ADR-NNN, amended by ADR-NNN.

### [2026-03-27] AGENTS.md Verdict framework codified in retro skill for promotion/removal decisions
- **Type**: DECISION [verified]
- **Source**: Issue #445 implementation
- **Tags**: retro, promotion, discoverable, verdict
- **Outcome**: accepted
- **Last-verified**: 2026-03-27
- **Context**: Retro skill Phase 1 and Phase 3 now use an explicit classification table to distinguish PROMOTE categories (tool preferences, test quirks, legacy traps, custom middleware warnings) from DO NOT PROMOTE categories (codebase structure, language/framework, directory tree, tech stack overview). Previously the retro would flag tool preferences as discoverable, which contradicted the AGENTS.md Verdict principle already documented in design principles. oxlint/oxfmt entry was the first concrete promotion under this framework.

### [2026-03-27] v1.7.0: README structure validation research completed (#447)
- **Type**: DECISION [verified]
- **Source**: PR #452 (#447)
- **Tags**: readme, documentation, validation, research
- **Outcome**: accepted
- **Last-verified**: 2026-03-27
- **Context**: Turing research brief established tiered README model (5 essential + recommended sections). Key decision: dev-team should validate README quality, not generate READMEs. README vs CLAUDE.md boundary is clean: humans vs agents, marketing vs directives.

### [2026-03-29] v1.10.0: ADR-035 skill composability via sub-skill invocation (#493)
- **Type**: DECISION [new]
- **Source**: #493, PR #511
- **Tags**: adr, documentation, skill-composability, architecture
- **Outcome**: accepted
- **Last-verified**: 2026-03-29
- **Context**: ADR-035 formalizes the skill-calls-skill composability pattern established in v1.9.0. Documents: disable-model-invocation requirement for sub-skills, --embedded flag convention for compact output, contract boundaries between orchestrating and sub-skills. Builds on ADR-022 (agent governance) by extending governance to skills. ADR README index updated.

## Patterns to Watch For


## Calibration Log
<!-- Challenges accepted/overruled — tunes adversarial intensity over time -->

### [2026-03-26] Copilot review: ADR-032 over-attributed append-only to ADR-012
- **Type**: CALIBRATION [accepted]
- **Source**: PR #361 Copilot finding
- **Tags**: adr, precision, attribution
- **Outcome**: fixed
- **Last-verified**: 2026-03-26
- **Context**: ADR-012 only specifies a freshness reminder, not append-only semantics. Append-only was an emergent practice. Be precise about what an ADR actually mandates vs what emerged organically.

### [2026-03-26] ADR README index status vocabulary expanded
- **Type**: SUGGESTION [fixed]
- **Source**: PR #361 Copilot finding
- **Tags**: adr, documentation, vocabulary
- **Outcome**: fixed
- **Last-verified**: 2026-03-26
- **Context**: ADR README.md status table was missing "superseded" and "amended" statuses. Added during ADR-032 work. Keep status vocabulary in sync when new lifecycle states are introduced.

### [2026-03-26] Three new ADRs added in v1.5.0: 030, 031, 032
- **Type**: DECISION [verified]
- **Source**: PRs #376, #373, #361
- **Tags**: adr, documentation
- **Outcome**: accepted
- **Last-verified**: 2026-03-26
- **Context**: ADR-030 (shared agent protocol/SHARED.md), ADR-031 (process rules extraction), ADR-032 (memory write semantics — archive vs remove, seed vs real entries). All accepted status.

### [2026-03-26] Two new ADRs in v1.6.0: 033 (rules-based context), 034 (language delegation)
- **Type**: DECISION [verified]
- **Source**: PRs #425, #419
- **Tags**: adr, documentation, rules, language-neutral
- **Outcome**: accepted
- **Last-verified**: 2026-03-26
- **Context**: ADR-033 moves shared context to `.claude/rules/` for automatic agent loading. ADR-034 delegates language-specific knowledge from hooks to agents. Both accepted. ADR README index should be checked for these entries.

### [2026-03-26] Design principles section added to CLAUDE.md template
- **Type**: DECISION [verified]
- **Source**: PRs #408, #428
- **Tags**: documentation, design-principles, templates
- **Outcome**: accepted
- **Last-verified**: 2026-03-26
- **Context**: Seven design principles codified: workflow-agnostic, platform-neutral, language-neutral, discoverable-only, process-driven, rules for shared context, skill invocation control. These are the product's template design contract — all future template changes must comply.

### [2026-04-02] v3.3.0: ADR-041 Mergify merge queue — FULL review caught DEFECT
- **Type**: DECISION [verified]
- **Source**: #671, PR feat/671-mergify-adr
- **Tags**: adr, mergify, documentation, review-tier
- **Outcome**: fixed
- **Last-verified**: 2026-04-02
- **Context**: ADR-041 documents Mergify merge queue adoption. FULL review (review-677) caught 1 DEFECT: missing inline comment in .mergify.yml pull_request_rules. 2 SUGGESTION deferred (cosmetic — missing ADR cross-ref, bold text). This is the first real validation of LIGHT vs FULL review tiers — FULL review on a COMPLEX task caught a real defect that LIGHT would have missed.

### [2026-03-29] v1.11.0: Review tiers, DoD, context docs, and anti-pattern sections added
- **Type**: DECISION [new]
- **Source**: #519, #520, #523, #524, PR #551
- **Tags**: documentation, review, anti-patterns, templates
- **Outcome**: accepted
- **Last-verified**: 2026-03-29
- **Context**: Review skill documentation expanded: explicit tier definitions (LIGHT/STANDARD/DEEP), Definition of Done criteria, context documentation sections. Anti-pattern sections added to reviewer agent definitions (Szabo, Knuth, Brooks) with calibration examples. Safety guard and shell:true documentation updated (#536, #538, PR #554). ADR index and research brief naming aligned with guidelines (#527, PR for docs alignment).
