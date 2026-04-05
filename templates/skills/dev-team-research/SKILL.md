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
   - `--depth shallow|standard|deep` — research depth (default: `standard`)
     - **shallow**: Single-pass, 1-2 search rounds. Use for well-documented topics with clear answers.
     - **standard**: Iterative, 3-5 rounds per sub-question. Default for most research tasks.
     - **deep**: Exhaustive, 5+ rounds per sub-question, parallel sub-agents for independent sub-questions, mandatory cross-referencing across all sources.

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
- The `--depth` level (shallow, standard, or deep)

**Depth-specific behavior:**

| Depth | Search rounds | Sub-question decomposition | Cross-referencing | Min. evidence per claim |
|-------|--------------|---------------------------|-------------------|------------------------|
| shallow | 1-2 | Optional (skip if question is simple) | Not required | 1 verified source |
| standard | 3-5 per sub-question | Required (2-5 sub-questions) | Required when sources disagree | 2 converging sources |
| deep | 5+ per sub-question | Required (2-5 sub-questions) | Mandatory across all sources | 3 converging sources or official docs |

For `deep` research: spawn parallel sub-agents for independent sub-questions to maximize coverage. Each sub-agent follows the same iterative search loop. Synthesize sub-agent results in the cross-referencing phase.

**Best-practices lookup**: Before or alongside Turing's investigation, check official documentation for the tools, frameworks, and platforms involved. Every capability claim must cite an official documentation URL — claims without URLs are unverified. When current best practices conflict with established codebase conventions, prefer consistency and flag the newer approach as a `[SUGGESTION]` with a migration path.

**Timeout scaling by depth:**
- shallow: 3 minutes (ping at 2 min, terminate at 3 min)
- standard: 5 minutes (ping at 3 min, terminate at 5 min)
- deep: 10 minutes (ping at 5 min, terminate at 10 min)

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
