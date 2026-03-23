# ADR-008: Agent model assignment strategy (opus vs sonnet)
Date: 2026-03-22
Status: accepted

## Context
dev-team agents serve two distinct roles: deep analysis (security audits, quality reviews, architectural assessment) and active implementation (writing code, tests, configuration). These roles have different requirements for reasoning depth vs speed/cost.

Claude Opus provides superior reasoning for catching subtle issues but is slower and more expensive. Claude Sonnet is faster and cheaper, suitable for code generation tasks.

## Decision
Assign models by role:
- **Opus** for read-only analysis agents: Szabo (security), Knuth (quality), Architect (architecture)
- **Opus** for the Lead orchestrator (needs deep reasoning to classify tasks and select agents, has full write access for delegation)
- **Sonnet** for implementation agents: Voss (backend), Mori (frontend), Beck (tests), Deming (tooling), Docs (documentation), Release (release management)

Tool access follows model role:
- Opus read-only agents get: `Read, Grep, Glob, Bash, Agent`
- Opus orchestrator (Lead) gets: `Read, Edit, Write, Bash, Grep, Glob, Agent`
- Sonnet implementers get: `Read, Edit, Write, Bash, Grep, Glob, Agent`

## Consequences
- Analysis agents can't accidentally modify code while reviewing
- Lead needs write access to create state files and manage delegation
- Teams can override model assignments in agent frontmatter for cost optimization
- The "opus = read-only" generalization doesn't hold for Lead — documentation must note this exception
