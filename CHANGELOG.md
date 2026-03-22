# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-03-22

### Added
- 3 new agents: Docs (documentation sync), Architect (ADR compliance, read-only/opus), Release Manager (versioning, changelog, semver)
- `/dev-team:review` skill — orchestrated multi-agent parallel review with file-pattern-based agent selection
- `/dev-team:audit` skill — full codebase security + quality + tooling audit with priority matrix
- `npx dev-team update` command — in-place upgrades preserving agent memory, learnings, and CLAUDE.md customizations
- Deming auto-scan on install — detects linters, formatters, SAST, CI/CD, and dependency audit gaps
- Post-change-review hook patterns for Docs, Architect, and Release Manager agents
- 16 new tests (106 total): update command integration, scan unit tests, updated assertions

## [0.1.2] - 2026-03-22

### Fixed
- Fixed bin entry stripped during npm publish
- Switched to Trusted Publishing (OIDC) for npm releases — no token secrets needed
- Added `--provenance` flag for npm supply chain security

## [0.1.0] - 2026-03-22

### Added
- 6 adversarial agents: Voss (backend), Mori (frontend), Szabo (security), Knuth (quality), Beck (tests), Deming (tooling)
- 5 enforced hooks: safety guard, TDD enforcement, post-change review, pre-commit gate, task loop
- 2 skills: /dev-team:challenge, /dev-team:task
- CLI installer with onboarding wizard (npx dev-team init)
- Persistent agent memory with adversarial calibration
- Shared team learnings file
- 6 Architecture Decision Records
- CI/CD with GitHub Actions (Node 18/20/22 x ubuntu/macos/windows)
- Product Requirements Document
- Release process with documented checklist
