---
name: dev-team:extract
description: Borges memory extraction — spawns Borges to record metrics, extract memory entries, and verify completion gates. Called by task, review, audit, and retro skills after their primary work is done.
disable-model-invocation: true
---

Extract memory and metrics via @dev-team-borges for: $ARGUMENTS

> **Skill composability:** This skill is designed to be invoked by other skills (task, review, audit, retro) as their final step. It relies on the agent's ability to invoke slash commands from within a skill context — the calling skill passes its finding outcome log as `$ARGUMENTS`.

## Input

`$ARGUMENTS` is a **finding outcome log** — a structured summary of findings from a completed task, review, audit, or retro. The log follows one of two formats depending on whether the work involved a single branch or multiple branches.

**Single-branch format:**

```
## Finding Outcome Log
Source: <issue number, PR, audit scope, or retro reference>
Branch: <branch name>
Review rounds: <N>
Agents involved: <comma-separated list of all participating agents>

### Findings
| # | Agent | Classification | File | Finding summary | Outcome | Reason |
|---|-------|---------------|------|-----------------|---------|--------|
| 1 | szabo | [DEFECT] | src/auth.ts | Missing input validation | fixed | Fixed in round 2 |
| 2 | knuth | [RISK] | src/parser.ts | No boundary check for empty input | deferred | Tracked in #999 |
| 3 | brooks | [SUGGESTION] | src/core.ts | Extract to shared utility | accepted | Refactored |
| 4 | knuth | [QUESTION] | src/config.ts | Why not use env vars? | ignored | Out of scope for this task |
| 5 | szabo | [RISK] | src/auth.ts | Token rotation interval too long | overruled | Team decided 24h is acceptable per ADR-015 |

### Summary
- Total findings: <N>
- DEFECTs: <N> fixed, <N> overruled
- Advisory (RISK/QUESTION/SUGGESTION): <N> accepted, <N> deferred, <N> overruled, <N> ignored
- Rounds to convergence: <N>
```

**Multi-branch format** (parallel mode):

```
## Finding Outcome Log
Sources: <comma-separated issue numbers, PRs, audit scopes, or retro references>
Branches:
- <branch-1>: <N> review rounds
- <branch-2>: <N> review rounds
Agents involved: <comma-separated list of all participating agents>

### Findings
| # | Branch | Agent | Classification | File | Finding summary | Outcome | Reason |
|---|--------|-------|---------------|------|-----------------|---------|--------|
| 1 | feat/123-auth | szabo | [DEFECT] | src/auth.ts | Missing input validation | fixed | Fixed in round 2 |
| 2 | feat/456-parser | knuth | [RISK] | src/parser.ts | No boundary check | deferred | Tracked in #999 |

### Summary
- Total findings: <N> across <N> branches
- DEFECTs: <N> fixed, <N> overruled
- Advisory (RISK/QUESTION/SUGGESTION): <N> accepted, <N> deferred, <N> overruled, <N> ignored
- Rounds to convergence: <per-branch breakdown or max>
```

## Execution

Spawn **@dev-team-borges** as `borges-extract` (Librarian). Pass Borges the finding outcome log from `$ARGUMENTS`.

Borges will:

- **Extract structured memory entries** from review findings and implementation decisions
- **Reinforce accepted patterns** in the reviewer's memory (calibration feedback)
- **Record overruled findings** with context so reviewers generate fewer false positives
- **Generate calibration rules** when 3+ findings on the same tag are overruled
- **Record metrics** to `.dev-team/metrics.md` (acceptance rates, rounds to convergence, per-agent stats)
- Write entries to each participating agent's MEMORY.md using the structured format
- Update shared learnings in `.claude/rules/dev-team-learnings.md`
- Check cross-agent coherence
- Report system improvement opportunities

## Completion gates

### Borges completion gate (HARD CHECK)

Before returning success, verify BOTH conditions:

- (a) Borges has been spawned **and completed** (not just spawned — wait for completion)
- (b) Read `.dev-team/metrics.md` and verify it contains a new `Task: <reference>` entry for the current task. The reference may be an issue number, PR number, or descriptive label (e.g., for audits and retros that lack an external reference). A stale metrics file (no new entry) means Borges did not complete successfully.

**If either check fails, the extraction is NOT complete.** If metrics.md has no new entry after Borges reports completion, flag this as a system failure and re-run Borges with explicit instruction to record metrics. Do not report success until both conditions are satisfied. This is a gate, not advisory.

### Memory formation gate

After Borges runs, verify that each participating agent's MEMORY.md contains at least one new structured entry from this task. Empty agent memory after a completed task is a system failure — Borges prevents this by automating extraction.

**Note:** Some callers (e.g., retro) may not have external participating agents — in that case, Borges itself counts as a participating agent and must still write at least one memory entry.

**If this gate fails**, re-run Borges with explicit instruction to write memory entries for each participating agent.

### Empty findings edge case

An empty findings table (zero findings) is valid input. Borges should still run to record metrics — zero findings is meaningful data (indicates clean implementation or no review friction). Callers should not skip the extract call when there are no findings.

## Result

Report success or failure. On success, include Borges's recommendations (system improvement opportunities, calibration suggestions). On failure, report which gate failed and what was attempted.
