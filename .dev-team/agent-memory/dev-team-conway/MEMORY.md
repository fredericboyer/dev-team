# Agent Memory: Conway (Release Manager)
<!-- First 200 lines are loaded into agent context. Keep concise. -->

## Project Conventions

### [2026-03-24] Semver versioning — currently v0.11.0, pre-1.0
- **Type**: PATTERN [bootstrapped]
- **Source**: package.json + CHANGELOG.md analysis
- **Tags**: versioning, semver, release
- **Outcome**: pending-verification
- **Last-verified**: 2026-03-24
- **Context**: Pre-1.0 semver. Version in package.json must match git tag (validated in release workflow). CHANGELOG.md tracks all versions with [Unreleased] section at top.

### [2026-03-24] Tag-triggered release: v* tag to npm publish + GitHub Release
- **Type**: PATTERN [bootstrapped]
- **Source**: .github/workflows/release.yml analysis
- **Tags**: release, workflow, npm
- **Outcome**: pending-verification
- **Last-verified**: 2026-03-24
- **Context**: Release process: bump version in package.json, update CHANGELOG.md, commit, push tag v*. Release workflow validates semver match, runs full test suite + lint + validation, publishes to npm with provenance, then creates GitHub Release with extracted changelog notes.

### [2026-03-24] npm package scope: @fredericboyer/dev-team, public access
- **Type**: PATTERN [bootstrapped]
- **Source**: package.json + release.yml analysis
- **Tags**: npm, publishing, scope
- **Outcome**: pending-verification
- **Last-verified**: 2026-03-24
- **Context**: Published as scoped package with --access public --provenance. Uses NPM_TOKEN secret. Package includes bin/, dist/, templates/ (defined in files array).

### [2026-03-24] Release checklist includes full validation suite before publish
- **Type**: PATTERN [bootstrapped]
- **Source**: .github/workflows/release.yml analysis
- **Tags**: release, validation, quality-gate
- **Outcome**: pending-verification
- **Last-verified**: 2026-03-24
- **Context**: Release job runs: build, test, lint, format check, validate-agents, validate-hooks — all must pass before npm publish. This is more comprehensive than CI (which splits into separate jobs).

## Patterns to Watch For


## Calibration Log
<!-- Challenges accepted/overruled — tunes adversarial intensity over time -->
