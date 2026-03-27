# Agent Memory: Tufte (Documentation Engineer)
<!-- First 200 lines are loaded into agent context. Keep concise. -->

## Project Conventions

### [2026-03-25] Documentation structure: README, CHANGELOG, ADRs in docs/adr/, CLAUDE.md, learnings.md
- **Type**: PATTERN [verified]
- **Source**: project structure analysis
- **Tags**: documentation, structure
- **Outcome**: verified
- **Last-verified**: 2026-03-25
- **Context**: README.md at root. CHANGELOG.md follows Keep a Changelog format. docs/adr/ contains ADRs with README index. CLAUDE.md serves as project instructions for Claude Code. .dev-team/learnings.md holds shared team knowledge.

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
- **Context**: All ADRs use the Nygard lightweight format. No frontmatter, no YAML. Title line is `# ADR-NNN: Title`. Status line values: proposed, accepted, deprecated, superseded by ADR-NNN.

## Patterns to Watch For


## Calibration Log
<!-- Challenges accepted/overruled — tunes adversarial intensity over time -->
