# ADR-005: Devil's advocate agent culture
Date: 2026-03-22
Status: accepted

## Context
AI agents that agree with each other produce confident but unchallenged output. Research on multi-agent systems (MAD paper, Anthropic's multi-agent research) shows that structured opposition produces better outcomes than collaborative agreement — adversarial agents find issues that single agents miss.

However, excessive adversarial behavior is counterproductive — agents can block all progress with nitpicking.

## Decision
All agents operate as devil's advocates: they actively find flaws, question assumptions, and demand justification. Their adversarial behavior is controlled by:

1. **Classification system**: `[DEFECT]` (blocks), `[RISK]`, `[QUESTION]`, `[SUGGESTION]` (advisory)
2. **One-exchange limit**: Agents get one exchange each before escalating to human
3. **Concrete evidence required**: No abstract concerns — every challenge must include a specific scenario, input, or code reference
4. **Calibration via memory**: Agents learn what the team accepts/rejects, reducing noise over time

## Consequences
- Higher quality output — bugs and security issues caught before merge
- Productive friction prevents "works on my machine" thinking
- Risk of false positives / noise (mitigated by calibration loop)
- More token usage per task (multiple review agents)
- Human remains final arbiter — agents cannot deadlock
