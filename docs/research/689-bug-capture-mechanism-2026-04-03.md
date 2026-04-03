# Research Brief: Mid-Implementation Bug Capture Mechanism

**Date**: 2026-04-03
**Issue**: #689
**Researcher**: Turing
**Confidence**: High

---

## Question

How should implementing agents capture pre-existing bugs they discover during implementation, so that observations survive context resets and are actionable by the orchestrator?

## Background

The harness best practices guide (Section 6d) recommends immediately documenting discovered bugs. dev-team's challenge protocol handles bugs found during **review** (classified findings routed through the judge pass), but bugs discovered **during implementation** have no capture mechanism. Research brief #669 identified this as Gap 2.

The distinction matters: review findings are about the **current change**. Implementation-discovered bugs are about **pre-existing code** — the agent stumbles on a bug while working on something else. These observations are valuable but ephemeral: if the agent's context resets (timeout, crash, re-spawn), the observation is lost.

### Current state

| When bug found | Mechanism | Survives context reset? |
|----------------|-----------|------------------------|
| During review | Challenge protocol (`[DEFECT]` etc.) | Yes — sidecar files in `.dev-team/.reviews/` |
| During Borges extraction | Memory entries | Yes — written to agent memory / learnings |
| During implementation | None | No |
| During orchestration | Orchestrator can create issues manually | Depends on orchestrator context |

## Options Evaluated

### Option A: Structured file (`.dev-team/discovered-bugs.md`)

**Mechanism**: Agents append entries to a shared markdown file during implementation.

**Pros**:
- Simple to implement — just a file append
- Human-readable
- Survives context resets (on disk)
- No external dependencies

**Cons**:
- Parallel agents appending to the same file causes merge conflicts (the exact problem documented in dev-team-learnings.md: "Parallel branches editing shared files create N-way merge conflicts")
- Not machine-parseable for orchestrator routing
- Accumulates unbounded entries without lifecycle management
- Must be excluded from commits (or committed, creating noise in PRs)

**Verdict**: Rejected. The parallel-write conflict problem is a known anti-pattern in this project.

### Option B: Auto-create GitHub issue

**Mechanism**: Agent runs `gh issue create` immediately upon discovering a bug.

**Pros**:
- Survives everything — issues are external to the agent context
- Immediately actionable and visible to all team members
- Aligns with "Every piece of work starts with a GitHub Issue" (process.md)
- Auto-labeled and triaged by the orchestrator
- No merge conflict risk

**Cons**:
- Requires `gh` CLI access (available in all dev-team environments)
- Risk of noise: agents may over-report low-confidence observations
- Issue creation is a side effect — harder to test/mock
- Rate limiting on high-velocity sessions

**Mitigation for noise risk**: Use a confidence threshold. Only auto-create issues for bugs the agent can describe with a concrete reproduction scenario. Low-confidence observations get the lightweight log (Option D) instead.

**Verdict**: Recommended as the primary mechanism for high-confidence bugs.

### Option C: Agent memory entry

**Mechanism**: Agent writes to its own `.claude/agent-memory/<agent>/MEMORY.md`.

**Pros**:
- Uses existing infrastructure
- Agent-scoped (no cross-agent conflicts)

**Cons**:
- Agent memory is for **calibration**, not tracking (per SHARED.md: "Stable patterns and conventions... Calibration data... Architectural boundaries")
- Memory has temporal decay — Borges archives entries after 90 days
- No orchestrator visibility until Borges reads it (end of workflow)
- Bug observations are ephemeral work items, not stable knowledge
- Memory is not the right abstraction for "action needed" items

**Verdict**: Rejected. Wrong abstraction — memory is for calibration, not task tracking.

### Option D: Structured JSON log (`.dev-team/bug-observations/`)

**Mechanism**: Each agent writes one JSON file per observation to a directory. Files are named `<agent>-<timestamp>.json` to avoid conflicts.

```json
{
  "agent": "voss",
  "timestamp": "2026-04-03T14:22:00Z",
  "task": "#689",
  "branch": "feat/689-bug-capture",
  "file": "src/parser.ts",
  "line": 42,
  "confidence": "high",
  "summary": "Off-by-one in boundary check — empty input bypasses validation",
  "scenario": "parser.parse('') returns undefined instead of throwing",
  "severity": "bug"
}
```

**Pros**:
- No parallel-write conflicts (one file per observation)
- Machine-parseable for orchestrator routing
- Survives context resets
- Follows existing patterns (review sidecars use per-file JSON in `.dev-team/.reviews/`)
- Can be batch-processed by Borges or the orchestrator
- Lifecycle is clear: process observations, create issues, delete files

**Cons**:
- New directory and convention to maintain
- Agents must know the schema
- Files must be cleaned up (but this is the same pattern as review sidecars)

**Verdict**: Recommended as the low-overhead capture mechanism (complements Option B).

## Recommended Design: Two-Tier Bug Capture

Combine Options B and D into a two-tier system based on confidence level:

### Tier 1 — High-confidence bugs: auto-create GitHub issue

When an implementing agent discovers a bug with a **concrete reproduction scenario** (can describe the input, expected behavior, and actual behavior), it immediately creates a GitHub issue:

```bash
gh issue create \
  --title "Bug: <summary>" \
  --body "Discovered during implementation of #NNN.\n\n**File**: ...\n**Scenario**: ...\n**Expected**: ...\n**Actual**: ..." \
  --label "bug"
```

The issue number is logged to the JSON observation file (Tier 2) for traceability.

### Tier 2 — Low-confidence observations: JSON log file

When an agent notices something suspicious but cannot confirm it is a bug (no reproduction scenario, uncertain behavior), it writes a JSON observation file to `.dev-team/bug-observations/<agent>-<timestamp>.json`. These are processed by the orchestrator at the end of the task:

- **Promote**: If the orchestrator or Borges can confirm the observation, create a GitHub issue
- **Discard**: If the observation is noise or already known, delete the file
- **Defer**: If unclear, leave for the next session's orchestrator to evaluate

### Integration points

| Component | Change | Scope |
|-----------|--------|-------|
| `templates/agents/SHARED.md` | Add "Bug observation protocol" section to shared protocol | S |
| `templates/skills/dev-team-implement/SKILL.md` | Add "Bug capture" step after implementation, before validation | S |
| `templates/skills/dev-team-task/SKILL.md` | Add observation processing to Step 4 (alongside Borges extraction) | S |
| `templates/skills/dev-team-extract/SKILL.md` | Add observation triage to Borges extraction | S |
| `.dev-team/bug-observations/` | New directory (gitignored — observations are ephemeral) | S |
| `.gitignore` update | Add `.dev-team/bug-observations/` | S |

### Schema for observation files

```json
{
  "version": 1,
  "agent": "<agent-name>",
  "timestamp": "<ISO-8601>",
  "task": "<issue-number>",
  "branch": "<branch-name>",
  "file": "<file-path>",
  "line": "<line-number or null>",
  "confidence": "high | low",
  "summary": "<one-line description>",
  "scenario": "<reproduction steps or null>",
  "severity": "bug | smell | debt",
  "issueCreated": "<issue-number or null>"
}
```

### Lifecycle

1. **Capture**: Implementing agent writes observation file (and optionally creates issue)
2. **Process**: Orchestrator/Borges triages observations at end of task (Step 4)
3. **Cleanup**: Processed observation files are deleted; unprocessed ones persist for next session

### SHARED.md protocol addition

Add to the shared protocol under a new "Bug observation protocol" section:

> When you discover a pre-existing bug during implementation (not a bug in your own changes — those are caught by review):
>
> 1. **High confidence** (you can describe input, expected, and actual behavior): Create a GitHub issue immediately with `gh issue create --label "bug"`. Reference the task you are working on.
> 2. **Low confidence** (suspicious but unconfirmed): Write a JSON observation file to `.dev-team/bug-observations/<agent>-<timestamp>.json` using the standard schema.
> 3. **Continue working** — do not stop implementation to investigate the bug unless it blocks your current task.

## Evidence

| Claim | Source | Verified |
|-------|--------|----------|
| Best practices recommend immediate bug capture | [Harness guide, Section 6d](https://gist.github.com/celesteanders/21edad2367c8ede2ff092bd87e56a26f) | yes |
| Gap 2 identified in brief #669 | `docs/research/669-harness-best-practices-2026-04-03.md` line 74 | yes |
| Review sidecars use per-file JSON in `.dev-team/.reviews/` | `templates/hooks/dev-team-review-gate.js` lines 11-12 | yes |
| Parallel file edits cause merge conflicts | `.claude/rules/dev-team-learnings.md` "Parallel branches editing shared files" | yes |
| Agent memory is for calibration, not tracking | `templates/agents/SHARED.md` lines 57-68 | yes |
| Process requires GitHub issues for all work | `.claude/rules/dev-team-process.md` "Every piece of work starts with a GitHub Issue" | yes |
| Challenge protocol classifications | `templates/agents/SHARED.md` lines 32-37 | yes |
| Temporal decay archives after 90 days | `templates/agents/dev-team-borges.md` (temporal decay section) | yes |

## Known Issues / Caveats

1. **Issue noise risk**: Agents may over-create issues for false positives. The confidence threshold mitigates this, but may need calibration after initial deployment. Monitor the ratio of created vs closed-as-invalid issues.
2. **Observation file cleanup**: If Borges extraction is skipped (e.g., agent crash before Step 4), observation files persist. The next session's orchestrator should check for orphaned observations.
3. **Severity vocabulary**: The `severity` field uses `bug | smell | debt` which is distinct from the review finding vocabulary (`[DEFECT]` etc.). This is intentional — implementation observations are about pre-existing code, not the current change, so they use a different classification.

## Recommended Actions

- **Title**: Implement two-tier bug capture mechanism
  **Severity**: P2
  **Files affected**: `templates/agents/SHARED.md`, `templates/skills/dev-team-implement/SKILL.md`, `templates/skills/dev-team-task/SKILL.md`, `templates/skills/dev-team-extract/SKILL.md`
  **Scope**: M (multi-file, new convention)
  **Details**: Add the bug observation protocol to SHARED.md, integrate capture into the implement skill, and add observation triage to the extract/task skills. Create `.dev-team/bug-observations/` directory convention. Defer implementation to follow-up issues.

- **Title**: Add observation file cleanup to Borges orphan-prevention
  **Severity**: P3
  **Files affected**: `templates/agents/dev-team-borges.md`
  **Scope**: S
  **Details**: Extend Borges's end-of-task cleanup (which already handles orphaned agent-status files) to also process orphaned bug observation files. This is the safety net for observations that were never triaged.
