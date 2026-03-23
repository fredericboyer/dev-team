# ADR-017: Role-based tool assignment (read-only auditors vs implementers)
Date: 2026-03-22
Status: accepted

## Context
AI agents with write access can accidentally modify files while reviewing. A security auditor that "helpfully fixes" a vulnerability it found has changed the code without going through the adversarial review loop. This defeats the separation between finding issues and fixing them.

## Decision
Assign tool access by role:

**Read-only auditors** (tools: `Read, Grep, Glob, Bash, Agent`):
- Szabo (security) — audits and reports, does not fix
- Knuth (quality) — identifies gaps, does not write tests
- Architect (architecture) — reviews structure, does not refactor

**Implementers** (tools: `Read, Edit, Write, Bash, Grep, Glob, Agent`):
- Voss, Mori, Beck, Deming, Docs, Release — full write access

**Orchestrator** (tools: `Read, Edit, Write, Bash, Grep, Glob, Agent`):
- Lead — needs write for state management and delegation

Auditor findings are classified (`[DEFECT]`, `[RISK]`, etc.) and handed to implementers for resolution. This enforces the review loop: find → report → fix → re-review.

## Consequences
- Auditors cannot accidentally modify the codebase during review
- Clean separation: auditors find, implementers fix, auditors verify
- Auditors use `Bash` for read-only inspection (git log, file listing) — not for modification
- The `Agent` tool allows auditors to spawn sub-agents for exploration without write access leaking
- Teams can override tool assignments in frontmatter if their workflow requires it
- Documented in `docs/custom-agents.md` so custom agents follow the same pattern
