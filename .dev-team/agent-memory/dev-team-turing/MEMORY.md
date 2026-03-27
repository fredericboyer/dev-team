# Agent Memory: Turing (Pre-implementation Researcher)
<!-- First 200 lines are loaded into agent context. Keep concise. -->

## Research Patterns

### [2026-03-25] First install — no research history yet
- **Type**: PATTERN [verified]
- **Source**: initial setup
- **Tags**: research, setup
- **Outcome**: verified
- **Last-verified**: 2026-03-25
- **Context**: Turing was added in v1.1. Research briefs will be written to .dev-team/research/. Borges manages temporal decay (90-day archive).

### [2026-03-26] Multi-user concurrency model (#257)
- **Type**: RESEARCH [completed]
- **Source**: issue #257
- **Tags**: concurrency, memory, multi-user, agent-status
- **Outcome**: brief written to `.dev-team/research/257-multi-user-model-2026-03-26.md`
- **Last-verified**: 2026-03-26
- **Key findings**:
  - Append-only log format for shared memory files is the highest-impact change — git auto-merges concurrent appends
  - Session-scoped status files solve agent-status collisions without changing git-tracked files (status is gitignored per ADR-026)
  - Advisory locks needed only for exclusive operations (release, version bump) — rare but severe conflict
  - Full CRDT infrastructure is overkill; git's three-way merge is sufficient when files are append-only
  - Industry pattern: Cursor and Claude Code agent teams both use worktree isolation for code, but no tool has solved concurrent metadata/memory writes well yet
  - Session ID availability is a key unknown — Claude Code may not expose a stable session ID in standalone mode
- **Calibration**: Concurrency research requires checking both platform capabilities (Claude Code session model) and git merge behavior. Always test append patterns with `git merge` before recommending.

### [2026-03-26] Non-JS/TS ecosystem benchmark (#325)
- **Type**: RESEARCH [completed]
- **Source**: issue #325
- **Tags**: multi-language, python, rust, go, java, hooks, patterns
- **Outcome**: benchmark written to `docs/benchmark-non-jsts.md`
- **Last-verified**: 2026-03-26
- **Key findings**:
  - Agent definitions and skills are fully language-agnostic — language bias lives entirely in the pattern/hook layer
  - Test file detection is the biggest gap: `_test.go`, `test_*.py`, `*Test.java`, and Rust inline tests are all missed
  - Pre-commit-lint hook only supports npm scripts and ruff — Go, Rust, Java get zero lint enforcement
  - Complexity scoring uses JS/TS keywords (`function`, `async`, `export`) — underestimates non-JS/TS code complexity
  - Tooling patterns in agent-patterns.json are all JS/TS-specific (`eslint`, `tsconfig`, `jest.config`, etc.)
  - Scanner (`src/scan.ts`) is the most language-aware component — already detects multi-language linters, formatters, and lock files
  - Rust inline test modules (`#[cfg(test)]`) are fundamentally incompatible with the separate-test-file model
- **Calibration**: When researching cross-language support, always test regex patterns against actual language conventions (e.g., `_test.go` vs `.test.ts`). The separation between pattern layer (biased) and logic layer (agnostic) is a useful architectural insight for prioritizing fixes.
