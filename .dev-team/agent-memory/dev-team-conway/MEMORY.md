# Agent Memory: Conway (Release Manager)
<!-- First 200 lines are loaded into agent context. Keep concise. -->

## Project Conventions

### [2026-03-25] Semver versioning — v1.0.0 stable release
- **Type**: PATTERN [verified]
- **Source**: v1.0.0 release execution
- **Tags**: versioning, semver, release
- **Outcome**: verified
- **Last-verified**: 2026-03-25
- **Context**: v1.0.0 is the first stable release. Version in package.json must match git tag (validated in release workflow). CHANGELOG.md tracks all versions with [Unreleased] section at top. Breaking changes (Node.js 22+, workflow skills removal) justified the major bump.

### [2026-03-25] Tag-triggered release: v* tag to npm publish + GitHub Release
- **Type**: PATTERN [verified]
- **Source**: .github/workflows/release.yml analysis
- **Tags**: release, workflow, npm
- **Outcome**: verified
- **Last-verified**: 2026-03-25
- **Context**: Release process: bump version in package.json, update CHANGELOG.md, commit, push tag v*. Release workflow validates semver match, runs full test suite + lint + validation, publishes to npm with provenance, then creates GitHub Release with extracted changelog notes.

### [2026-03-25] npm package scope: @fredericboyer/dev-team, public access
- **Type**: PATTERN [verified]
- **Source**: package.json + release.yml analysis
- **Tags**: npm, publishing, scope
- **Outcome**: verified
- **Last-verified**: 2026-03-25
- **Context**: Published as scoped package with --access public --provenance. Uses NPM_TOKEN secret. Package includes bin/, dist/, templates/ (defined in files array).

### [2026-03-25] Release checklist includes full validation suite before publish
- **Type**: PATTERN [verified]
- **Source**: .github/workflows/release.yml analysis
- **Tags**: release, validation, quality-gate
- **Outcome**: verified
- **Last-verified**: 2026-03-25
- **Context**: Release job runs: build, test, lint, format check, validate-agents, validate-hooks — all must pass before npm publish. This is more comprehensive than CI (which splits into separate jobs).

## Patterns to Watch For

### [2026-03-25] Test count drift — always verify actual counts before release
- **Type**: PATTERN [verified]
- **Source**: v1.0.0 release — learnings said 308, actual was 306
- **Tags**: accuracy, benchmarks, release-readiness
- **Outcome**: verified
- **Last-verified**: 2026-03-25
- **Context**: Always run `npm test` and compare the actual test count against claims in docs and agent memories. Benchmarks drift when tests are removed or consolidated. Do not trust cached counts — derive from source.

### [2026-03-25] Copilot comments accumulate across PRs — batch-fix in releases
- **Type**: PATTERN [verified]
- **Source**: v1.0.0 release — 24 unaddressed Copilot comments across 6 PRs
- **Tags**: release-readiness, copilot, review-debt
- **Outcome**: verified
- **Last-verified**: 2026-03-25
- **Context**: Copilot review comments from merged PRs can go unaddressed. Before a release, audit all PRs since the last release for unaddressed comments. Key themes in v1.0: cross_model boolean vs string, template wording accuracy, stale test counts.

### [2026-03-25] ADR immutability — Status field is the exception
- **Type**: PATTERN [verified]
- **Source**: Copilot feedback on PR #241
- **Tags**: adr, convention, immutability
- **Outcome**: verified
- **Last-verified**: 2026-03-25
- **Context**: ADR decision content is immutable. The Status field (proposed/accepted/superseded) is a lifecycle marker and the only field that changes. To supersede an ADR, write a new one with "Supersedes: ADR-NNN" and update the old ADR's Status to "superseded by ADR-NNN".

### [2026-03-25] Version-keyed migrations handle breaking changes on update
- **Type**: PATTERN [verified]
- **Source**: update.ts migration system, v1.0.0 skillRemovals migration
- **Tags**: update, migration, breaking-change
- **Outcome**: verified
- **Last-verified**: 2026-03-25
- **Context**: The MIGRATIONS array in update.ts supports agentRenames (v0.4.0) and skillRemovals (v1.0.0). When `dev-team update` detects the user's installed version is older, it runs all applicable migrations. Added skillRemovals to clean up legacy workflow skill dirs.

## Calibration Log
<!-- Challenges accepted/overruled — tunes adversarial intensity over time -->
