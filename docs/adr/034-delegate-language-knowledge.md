# ADR-034: Delegate language-specific knowledge to agents, not hooks

Date: 2026-03-26
Status: accepted

## Context

Hooks like `dev-team-tdd-enforce.js`, `dev-team-post-change-review.js`, and `dev-team-review-gate.js` hardcoded language-specific patterns:

- **TDD enforce** checked only JS/TS test file naming (`*.test.*`, `*.spec.*`, `__tests__/`) when looking for existing tests. Go (`_test.go`), Python (`test_*.py`), and Java (`*Test.java`) projects would always get blocked.
- **Complexity scoring** used JS/TS keywords (`function`, `async`, `export`, `class`) as complexity indicators. These produce zero signal for Python, Go, Rust, or any non-JS language.
- **Test file detection** in `agent-patterns.json` missed `_test.` patterns (Go convention).

The design principle in `.dev-team/learnings.md` already states: "Don't encode what agents already know." AI agents have built-in knowledge of language conventions, test frameworks, and complexity indicators. Hardcoding these into hooks creates static encyclopedias that are always incomplete.

## Decision

Hooks detect the ecosystem and flag; agents interpret and act. Specifically:

1. **Test file candidate lookup** (`tdd-enforce.js`): Expand to cover Go, Python, and Java conventions alongside JS/TS. When no candidate matches, the blocking message instructs the agent to use its knowledge of the language's test conventions to locate or create tests.

2. **Complexity scoring** (`post-change-review.js`): Replace JS/TS keyword patterns with language-agnostic structural proxies — nesting depth (indent levels) and control flow density (brace/keyword counting). These work across all C-family, Python, Ruby, and Go codebases.

3. **Test file pattern** (`agent-patterns.json`): Add `_test.` to cover Go's convention. Include a `_note` field documenting that agents apply built-in knowledge beyond this minimal pattern.

4. **Fallback patterns** (`review-gate.js`, `post-change-review.js`): Update `FALLBACK_TEST_FILE` to include `_test.` for consistency with the JSON pattern.

## Consequences

- Hooks remain functional and deterministic — they still detect, flag, and gate.
- Language coverage is no longer limited to what's hardcoded. Adding a new language to the project doesn't require hook changes.
- Complexity scores may shift for JS/TS projects since the scoring heuristic changed from keyword-counting to structure-based. The relative ordering (LIGHT < STANDARD < DEEP) is preserved.
- The boundary is clear: hooks handle detection and gating, agents handle language-specific interpretation.
