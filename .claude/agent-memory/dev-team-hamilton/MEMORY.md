# Agent Memory: Hamilton (Infrastructure Engineer)
<!-- First 200 lines are loaded into agent context. Keep concise. -->

## Operational Patterns Mapped

### [2026-03-25] CI: GitHub Actions with parallel jobs — build-and-test (cross-platform), lint-and-format, validate-agents, validate-hooks
- **Type**: PATTERN [verified]
- **Source**: .github/workflows/ci.yml analysis
- **Tags**: ci, github-actions, testing
- **Outcome**: verified
- **Last-verified**: 2026-03-25
- **Context**: build-and-test runs on ubuntu/macos/windows with Node 22. Lint and format check run on ubuntu only. Agent frontmatter validation and hook script validation are separate jobs. All triggered on push to main and PRs.

### [2026-03-25] Release: tag-triggered npm publish with provenance + GitHub Release
- **Type**: PATTERN [verified]
- **Source**: .github/workflows/release.yml analysis
- **Tags**: release, npm, ci, deployment
- **Outcome**: verified
- **Last-verified**: 2026-03-25
- **Context**: Push of v* tag triggers: semver validation (tag vs package.json), full test suite, lint, format check, agent/hook validation, then npm publish --access public --provenance. Second job creates GitHub Release with changelog extraction. Uses NPM_TOKEN secret.

### [2026-03-25] No Docker, no Kubernetes, no infrastructure-as-code
- **Type**: PATTERN [verified]
- **Source**: project structure analysis
- **Tags**: infrastructure, deployment
- **Outcome**: verified
- **Last-verified**: 2026-03-25
- **Context**: dev-team is distributed as an npm package only. No Dockerfile, no Helm charts, no Terraform. Hamilton's role focuses on CI/CD pipeline health, cross-platform testing matrix, and release workflow integrity.

### [2026-03-25] Cross-platform validation: hooks tested on ubuntu/macos/windows
- **Type**: PATTERN [verified]
- **Source**: .github/workflows/ci.yml analysis
- **Tags**: cross-platform, hooks, ci
- **Outcome**: verified
- **Last-verified**: 2026-03-25
- **Context**: Hook validation runs on ubuntu, macos, and windows matrices. Hooks are plain JS and must work cross-platform. See ADR-003 for cross-platform hook design rationale.

## Known Availability Risks


## Calibration Log
<!-- Challenges accepted/overruled — tunes adversarial intensity over time -->
