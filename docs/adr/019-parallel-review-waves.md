# ADR-019: Parallel review waves for headless multi-issue execution
Date: 2026-03-22
Status: accepted

## Context
The `/dev-team:task` skill runs a single-issue loop: one implementing agent, followed by reviewers, iterated until convergence. When multiple independent issues need to be addressed in the same session, they execute sequentially — each issue waits for the previous one to complete its full review cycle. This is slow and wastes available concurrency.

Background agents spawned via the Agent tool can implement code in parallel on separate branches, but the current orchestration model has no concept of coordinated review timing. Without coordination, reviews start at arbitrary times, Borges runs once per issue instead of once across all, and there is no mechanism to detect file conflicts between parallel branches before they happen.

## Decision
Introduce a **parallel orchestration model** managed by Drucker with five distinct phases:

### Phase 0: Brooks pre-assessment (batch)
Before any implementation begins, Drucker spawns Brooks once with the full batch of issues. Brooks assesses:
- File independence: which issues touch overlapping files (conflict groups)
- ADR needs across the batch
- Architectural interactions between issues

Issues with file overlaps are grouped and executed sequentially within their group. Fully independent issues proceed in parallel.

### Phase 1: Parallel implementation
Drucker spawns one implementing agent per independent issue, each on its own branch (`feat/<issue>-<description>`). Agents work concurrently without awareness of each other. Each agent follows the standard implementation protocol from its agent definition.

State is tracked in `.claude/dev-team-parallel.json`:
```json
{
  "mode": "parallel",
  "issues": [
    { "issue": 42, "branch": "feat/42-add-auth", "agent": "dev-team-voss", "status": "implementing" },
    { "issue": 43, "branch": "feat/43-fix-nav", "agent": "dev-team-mori", "status": "implementing" }
  ],
  "phase": "implementation",
  "conflictGroups": [[42, 55]],
  "reviewWave": null
}
```

### Phase 2: Coordinated review wave
Reviews do **not** start until **all** implementation agents have completed. This is the key coordination point. Once all implementations are done, Drucker spawns review agents (Szabo + Knuth, plus conditional reviewers) in parallel across all branches simultaneously.

Each reviewer receives the diff for one specific branch and produces classified findings scoped to that branch.

### Phase 3: Defect routing
Drucker collects all findings and routes `[DEFECT]` items back to the original implementing agent for each branch. Agents fix defects on their own branch. After fixes, another review wave runs. This continues until no `[DEFECT]` findings remain or the iteration limit is reached.

### Phase 4: Borges completion
Borges runs **once** across all branches after the final review wave clears. This ensures cross-branch coherence: memory files are consistent, learnings are not duplicated, and system improvement recommendations consider the full batch of changes.

### Convergence criteria
The parallel task is complete when:
1. All branches have zero `[DEFECT]` findings, OR the per-branch iteration limit (default: 10) is reached
2. Borges has run across all branches
3. `.claude/dev-team-parallel.json` is deleted

## Consequences
- Independent issues execute in parallel, reducing wall-clock time roughly proportionally to the number of independent issues
- Reviews are batched, which reduces context-switch overhead for the human reviewing the results
- Conflict detection via Brooks prevents merge conflicts from parallel branches
- Borges runs once instead of N times, producing more coherent cross-issue recommendations
- The iteration limit applies per-branch, not globally — one slow branch does not block others from completing
- Sequential fallback: issues in the same conflict group still execute sequentially, preserving correctness
- State file (`.claude/dev-team-parallel.json`) enables resumability if a session is interrupted
- Increases peak resource usage: N implementation agents + 2N review agents at wave time
