---
name: dev-team-research
description: Pre-implementation research brief. Spawns Turing to investigate a question, evaluate options, and produce a structured research brief with citations to official documentation.
disable-model-invocation: false
---

Research: $ARGUMENTS

## Setup

1. Parse the research question and any flags:
   - `--task NNN` — link research to a GitHub issue number (used for brief filename and context)
   - `--adr` — produce an ADR draft if research leads to an architectural decision

2. Determine research scope:
   - Extract the core question from the arguments
   - If `--task NNN` is provided, read the issue description for additional context (`gh issue view NNN`)
   - Identify the tools, frameworks, or platforms involved

## Research execution

Spawn @dev-team-turing as a background agent with the research question. Turing is read-only — it produces research briefs, not code changes.

Provide Turing with:
- The core research question
- Any task/issue context (if `--task` was provided)
- Scope constraints: what is in scope, what is out of scope
- The project's current stack and conventions (from CLAUDE.md and package.json / manifest files)

**Best-practices lookup**: Before or alongside Turing's investigation, check official documentation for the tools, frameworks, and platforms involved. Every capability claim must cite an official documentation URL — claims without URLs are unverified. When current best practices conflict with established codebase conventions, prefer consistency and flag the newer approach as a `[SUGGESTION]` with a migration path.

**Timeout**: If Turing has not reported progress within 3 minutes, send a status ping. If no response within 2 additional minutes, terminate and perform the research directly using the same structured format.

## Output format

The research brief follows Turing's standard format (written to `docs/research/`):

```
## Research brief: [topic]
### Question
[The specific question being investigated]
### Approaches evaluated
[Each approach with pros, cons, and evidence]
### Recommendation
[Clear recommendation with reasoning]
### Evidence
| Claim | Source URL | Verified |
|-------|-----------|----------|
| [capability claim] | [official docs URL] | yes/no |
### Known issues / caveats
[Risks, edge cases, limitations]
### Confidence level
[High / Medium / Low — with explanation]
### Recommended Actions
[Each finding decomposed into a concrete issue for triage]
- **Title**: [concise issue title]
  **Severity**: P0 / P1 / P2
  **Files affected**: [list]
  **Scope**: S / M / L
```

## ADR draft (optional)

If `--adr` was passed, or if the research clearly leads to an architectural decision:
1. Check `docs/adr/` for the next available ADR number
2. Produce a draft ADR following the existing format in `docs/adr/`
3. The ADR is a draft — it requires human review before being finalized

## Return

Return a structured summary:

- Research question
- Brief file path (in `docs/research/`)
- Recommendation (one sentence)
- Confidence level
- Number of verified evidence claims vs total claims
- ADR draft path (if produced)
- Recommended actions (triage-ready list)
