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

## Patterns to Watch For


## Calibration Log
<!-- Challenges accepted/overruled — tunes adversarial intensity over time -->
