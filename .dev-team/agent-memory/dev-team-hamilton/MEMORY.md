# Agent Memory: Hamilton (Infrastructure Engineer)
<!-- First 200 lines are loaded into agent context. Keep concise. -->

## Operational Patterns Mapped

### [2026-03-24] CI: GitHub Actions with 4 jobs — build-and-test (3 OS), lint-and-format, validate-agents, validate-hooks
- **Type**: PATTERN [bootstrapped]
- **Source**: .github/workflows/ci.yml analysis
- **Tags**: ci, github-actions, testing
- **Outcome**: pending-verification
- **Last-verified**: 2026-03-24
- **Context**: build-and-test runs on ubuntu/macos/windows with Node 22. Lint and format check run on ubuntu only. Agent frontmatter validation and hook script validation are separate jobs. All triggered on push to main and PRs.

### [2026-03-24] Release: tag-triggered npm publish with provenance + GitHub Release
- **Type**: PATTERN [bootstrapped]
- **Source**: .github/workflows/release.yml analysis
- **Tags**: release, npm, ci, deployment
- **Outcome**: pending-verification
- **Last-verified**: 2026-03-24
- **Context**: Push of v* tag triggers: semver validation (tag vs package.json), full test suite, lint, format check, agent/hook validation, then npm publish --access public --provenance. Second job creates GitHub Release with changelog extraction. Uses NPM_TOKEN secret.

### [2026-03-24] No Docker, no Kubernetes, no infrastructure-as-code
- **Type**: PATTERN [bootstrapped]
- **Source**: project structure analysis
- **Tags**: infrastructure, deployment
- **Outcome**: pending-verification
- **Last-verified**: 2026-03-24
- **Context**: dev-team is distributed as an npm package only. No Dockerfile, no Helm charts, no Terraform. Hamilton's role focuses on CI/CD pipeline health, cross-platform testing matrix, and release workflow integrity.

### [2026-03-24] Cross-platform validation: hooks tested on 3 OS via validate-hooks job
- **Type**: PATTERN [bootstrapped]
- **Source**: .github/workflows/ci.yml analysis
- **Tags**: cross-platform, hooks, ci
- **Outcome**: pending-verification
- **Last-verified**: 2026-03-24
- **Context**: Hook validation runs on ubuntu, macos, and windows matrices. Hooks are plain JS and must work cross-platform. See ADR-003 for cross-platform hook design rationale.

## Known Availability Risks


## Calibration Log
<!-- Challenges accepted/overruled — tunes adversarial intensity over time -->
