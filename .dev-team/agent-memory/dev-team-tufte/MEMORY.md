# Agent Memory: Tufte (Documentation Engineer)
<!-- First 200 lines are loaded into agent context. Keep concise. -->

## Project Conventions

### [2026-03-24] Documentation structure: README, CHANGELOG, 22 ADRs, CLAUDE.md, learnings.md
- **Type**: PATTERN [bootstrapped]
- **Source**: project structure analysis
- **Tags**: documentation, structure
- **Outcome**: pending-verification
- **Last-verified**: 2026-03-24
- **Context**: README.md at root. CHANGELOG.md follows Keep a Changelog format. docs/adr/ has 22 ADRs with README index. CLAUDE.md serves as project instructions for Claude Code. .dev-team/learnings.md holds shared team knowledge.

### [2026-03-24] CHANGELOG follows Keep a Changelog with semver — used in release workflow
- **Type**: PATTERN [bootstrapped]
- **Source**: CHANGELOG.md + release.yml analysis
- **Tags**: changelog, release, documentation
- **Outcome**: pending-verification
- **Last-verified**: 2026-03-24
- **Context**: Release workflow extracts changelog section matching the tag version to generate GitHub Release notes. Missing changelog entries produce a warning but don't block release. Format: ## [version] - YYYY-MM-DD with Added/Changed/Fixed/Internal sections.

### [2026-03-24] Tufte is triggered on implementation file changes to detect doc-code drift
- **Type**: PATTERN [bootstrapped]
- **Source**: CLAUDE.md hook trigger rules
- **Tags**: doc-code-drift, hooks, triggers
- **Outcome**: pending-verification
- **Last-verified**: 2026-03-24
- **Context**: Tufte is auto-flagged when .md/docs/README files change AND when significant implementation files change (src/, templates/agents/, templates/skills/, templates/hooks/, bin/, package.json). Dual trigger catches both direct doc edits and implementation changes that may require doc updates.

### [2026-03-24] Quality benchmarks in learnings.md must stay synchronized with actual counts
- **Type**: PATTERN [bootstrapped]
- **Source**: .dev-team/learnings.md analysis
- **Tags**: benchmarks, accuracy, learnings
- **Outcome**: pending-verification
- **Last-verified**: 2026-03-24
- **Context**: learnings.md tracks test count (308), agent count (12), skill count (7), hook count (6). These drift as the project evolves. Tufte should flag when implementation changes affect these counts.

## Patterns to Watch For


## Calibration Log
<!-- Challenges accepted/overruled — tunes adversarial intensity over time -->
