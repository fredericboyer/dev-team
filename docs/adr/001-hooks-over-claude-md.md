# ADR-001: Hooks over CLAUDE.md for enforcement
Date: 2026-03-22
Status: accepted

## Context
Claude Code offers two mechanisms for guiding agent behavior: CLAUDE.md (probabilistic — Claude reads it but may ignore instructions) and hooks (deterministic — shell scripts that fire on every tool use event and can block actions).

Engineering teams adopting AI need confidence that quality gates are enforced, not suggested.

## Decision
Anything that MUST happen goes in hooks. CLAUDE.md is reserved for guidance that benefits from Claude's judgment (team philosophy, escalation paths, workflow suggestions).

Specific enforcements moved to hooks:
- TDD (block implementation without tests)
- Safety guard (block dangerous commands)
- Post-change review flagging (which agents should review)
- Pre-commit review gate

## Consequences
- Teams get reliable enforcement without hoping the model follows instructions
- Hooks add a small overhead per tool call (Node.js script execution)
- CLAUDE.md stays slim and focused on judgment-based guidance
- Hook scripts must be maintained and tested like any other code
