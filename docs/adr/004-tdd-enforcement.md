# ADR-004: TDD enforced by hook

Date: 2026-03-22
Status: accepted

## Context

AI coding agents tend to overengineer — writing more implementation than necessary, adding speculative features, and producing code that isn't grounded in concrete requirements. Test-driven development constrains implementation to only what tests demand.

A CLAUDE.md instruction to "write tests first" is probabilistic and easily forgotten mid-session.

## Decision

A PostToolUse hook on Edit/Write blocks modifications to implementation files unless a corresponding test file has been modified in the same session. This forces the TDD cycle: write test → see it fail → write implementation → see it pass.

The hook recognizes common test patterns: `*.test.*`, `*.spec.*`, `__tests__/*`, `test/*`.

## Consequences

- Implementation is always grounded in tests — prevents overengineering
- Agents must write tests before implementation, not after
- May feel restrictive for small changes (config files, docs are excluded)
- Hook must correctly identify test vs implementation files across languages
- Teams can disable this hook during onboarding if TDD isn't their practice
