# ADR-043: Assessment sidecar contract for complexity-aware merge enforcement
Date: 2026-04-04
Status: accepted

## Context

The implement skill (via Brooks pre-assessment) classifies tasks as SIMPLE or COMPLEX and selects an appropriate review tier (LIGHT or FULL). That classification is useful at merge time: a COMPLEX task should require reviews from specific named agents before the merge gate allows the PR to proceed.

Prior to this ADR, no formal contract governed the assessment sidecar file. The merge-gate hook (`dev-team-merge-gate.js`) reads from `.dev-team/.assessments/`, and the implement skill writes to that directory, but the schema, lifecycle, and validation rules were undocumented. The connection between writer and reader existed only in code — any schema drift between them would be silent.

This is the complement to ADR-029, which documents the review sidecar contract (`.dev-team/.reviews/`). Review sidecars prove that a review happened; assessment sidecars define what review is required.

## Decision

Formalize the assessment sidecar as a first-class contract with a defined schema, location convention, writer, readers, lifecycle, and validation rules.

### Schema

```json
{
  "branch": "<branch-name>",
  "complexity": "SIMPLE | COMPLEX",
  "reviewTier": "LIGHT | FULL",
  "requiredReviewers": ["szabo", "knuth"],
  "assessedAt": "<ISO-8601 timestamp>"
}
```

Field rules:
- `branch` — the full git branch name (not sanitized), must match the branch being merged
- `complexity` — uppercase `SIMPLE` or `COMPLEX`
- `reviewTier` — `LIGHT` for SIMPLE tasks (advisory only), `FULL` for COMPLEX tasks (blocking)
- `requiredReviewers` — array of agent names (lowercase); empty array for SIMPLE tasks; non-empty for COMPLEX
- `assessedAt` — ISO-8601 timestamp when Brooks wrote the sidecar

### Location

```
.dev-team/.assessments/<sanitized-branch>.json
```

Branch name sanitization: replace any character that is not alphanumeric or a hyphen with a hyphen. Example: `feat/771-adr-contract` → `feat-771-adr-contract`.

The `.dev-team/.assessments/` directory is gitignored — assessment files are ephemeral process state, not version-controlled artifacts.

### Writer

Brooks (via the implement skill pre-assessment step). The orchestrating skill writes the sidecar immediately after the pre-assessment agent returns its classification. If `--skip-assessment` is used, no sidecar is written and the merge gate falls back to any-sidecar behavior.

### Readers

1. **merge-gate hook** (`dev-team-merge-gate.js`) — reads the sidecar at `gh pr merge` time. If the assessment classifies the branch as COMPLEX, the gate requires sidecar evidence from each agent in `requiredReviewers` before allowing the merge. If no assessment exists or complexity is SIMPLE, the gate falls back to the any-sidecar check from ADR-029.

2. **review skill** — may read `requiredReviewers` to determine which reviewer agents to spawn for a COMPLEX branch.

### Lifecycle

1. **Created** — during `implement` skill pre-assessment, written by the orchestrator immediately after Brooks returns its classification
2. **Consumed** — at `gh pr merge` time, read by the merge-gate hook to enforce tier requirements
3. **Cleaned up** — after merge, as part of the same cleanup that removes review sidecars from `.dev-team/.reviews/`

### Validation rules

The merge-gate hook applies these rules when reading an assessment:

- `branch` field must match the branch being merged (exact string match, unsanitized)
- `complexity` must be `"SIMPLE"` or `"COMPLEX"` (uppercase)
- `requiredReviewers` must be a non-empty array when `complexity` is `"COMPLEX"`
- A malformed or unparseable assessment JSON causes the hook to fall back to any-sidecar behavior (fail open), not block the merge

### Escape hatch

`--skip-review` on `gh pr merge` bypasses both the review evidence gate (ADR-029) and the complexity-aware enforcement added here. Logged as a process deviation for Borges calibration.

## Consequences

- The schema is now a public contract — changes to it require either updating this ADR or superseding it
- Doc-code drift between this ADR and `dev-team-merge-gate.js` is a `[DEFECT]` by definition
- The implement skill has a clear obligation: write the sidecar after every pre-assessment that is not skipped
- COMPLEX tasks that reach the merge gate without a matching assessment fall back to any-sidecar behavior — they are not blocked solely by the absence of an assessment
- `.dev-team/.assessments/` must be added to `.gitignore` alongside `.dev-team/.reviews/`
- Relationship to ADR-029: the two sidecar directories serve complementary roles. `.dev-team/.reviews/<agent>--<hash>.json` proves a review occurred. `.dev-team/.assessments/<branch>.json` defines what reviews are required. The merge gate reads both.
