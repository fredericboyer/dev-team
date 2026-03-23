# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.5.0] - 2026-03-23

### Added
- `npx dev-team doctor` — installation health check (prefs, agents, hooks, CLAUDE.md, memory)
- `npx dev-team status` — show installed version, agents, hooks, skills, and memory status
- `npx dev-team --version` / `-v` — print version from package.json
- ADR-018: Shared git context for hook deduplication (temp file cache with 5s TTL)
- ADR-019: Parallel implementation with review waves (5-phase orchestration model)
- Cached git diff helper in tdd-enforce and pre-commit-gate hooks (reduced redundant git calls)
- Process audit: all 11 agents now have at least one automatic invocation trigger
- Beck flagged by post-change-review hook when test files change
- Borges spawned at completion of /dev-team:review and /dev-team:audit skills
- Drucker parallel orchestration section for multi-issue coordination
- 15 new tests from comprehensive coverage pass (174 total)

### Changed
- Hook timeouts reduced from 5000ms to 2000ms for cached git calls
- CLAUDE.md template includes parallel execution instructions

## [0.4.1] - 2026-03-23

### Fixed
- Update command now runs version-keyed migrations for agent renames
- Pre-v0.4 installations correctly migrate: old agent files deleted, memory dirs renamed, prefs updated
- Migration system extensible for future schema changes (MIGRATIONS array)
- 155 tests total

## [0.4.0] - 2026-03-23

### Added
- @dev-team-borges (Librarian) — always spawned at end of every task for memory review, cross-agent coherence, and system improvement
- Memory self-maintenance for all 11 agents — read/prune/compress MEMORY.md at session start
- Pre-commit lint/format hook — intercepts `git commit`, runs lint + format:check, blocks on failure
- Deming hook gap analysis — compares CI enforcement against local hooks, flags [GAP] findings
- Active hook spawning — post-change-review outputs mandatory `ACTION REQUIRED` directives, pre-commit gate blocks if reviews not completed
- Drucker (Lead) spawns Brooks (Architect) for ADR assessment before delegation
- Version migration in update command — compares/stamps package version
- Backup corrupted settings — copies corrupt JSON to .bak before overwriting
- Duplicate BEGIN marker protection in CLAUDE.md — replaces first pair only, preserves user content
- `getPackageVersion()` shared utility — eliminates hardcoded version strings
- Enforcement gap detection in scan module with [GAP] reporting
- 10 ADRs (008-017) covering all v0.2/v0.3 architectural decisions
- 154 tests total (20 new)

### Changed
- Agent rename: Architect→Brooks, Docs→Tufte, Release→Conway, Lead→Drucker (named after notable figures)
- Blocking hooks (safety-guard, tdd-enforce) fail closed on malformed input
- Windows path compatibility — all hooks normalize backslashes before pattern matching
- `readFile()` distinguishes ENOENT from EACCES/EPERM (warns on permission denied, re-throws others)
- Deming memory hygiene deferred to Borges (scope separation)
- Presets include Drucker + Borges in all bundles (prevents spawn failures)
- Zero lint warnings (oxlint clean)

### Fixed
- `--no-verify` regex tightened to avoid matching inside commit messages
- `npm` invocation on Windows uses `shell: true` for .cmd resolution
- Cross-platform test scripts use helper files instead of shell builtins
- `init.ts` version derived from `package.json` instead of hardcoded string

## [0.3.1] - 2026-03-22

### Fixed
- Blocking hooks (safety-guard, tdd-enforce) now fail closed (exit 2) on malformed JSON input instead of silently allowing operations
- `create-agent` frontmatter `name:` field now uses lowercase (`dev-team-codd`) instead of titlecase

### Added
- Update command auto-discovers new hooks not in preferences and installs them
- Skill directories auto-discovered from templates/skills/ — no hardcoded lists in init or update
- `listSubdirectories()` utility in files.ts
- 6 new tests: create-agent (5 tests), hook auto-discovery (1 test)
- 124 tests total

### Changed
- Cleaned up all lint warnings: unused `sessionId`, regex→`.endsWith()` — oxlint now reports 0 warnings

## [0.3.0] - 2026-03-22

### Added
- Orchestrator agent (`@dev-team-lead`) — auto-delegates tasks to specialists, manages adversarial review loop, resolves conflicts
- `--preset` flag for `npx dev-team init`: `backend`, `fullstack`, `data` bundles with pre-configured agent selection
- `npx dev-team create-agent <name>` command — scaffolds custom agent definition and memory template
- Custom agent authoring guide (`docs/custom-agents.md`) with format reference, blank template, memory guide, and worked example
- Configurable agent watch lists — file-pattern-to-agent mappings in `dev-team.json` with auto-spawn recommendations
- Memory freshness check in pre-commit gate — reminds to update learnings when code changes without memory updates
- 10 agents total (added Lead), 6 hooks (added watch list), 117 tests

### Changed
- Issues #20 (plugin format) and #21 (eject) moved to future considerations pending Claude Code marketplace availability

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
