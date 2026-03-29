# ADR-035: Skill composability via sub-skill invocation
Date: 2026-03-29
Status: accepted

## Context

The task skill (`/dev-team:task`) was monolithic — it contained inline logic for review orchestration (spawning reviewers, filtering findings, producing reports) and memory extraction (spawning Borges, verifying metrics, checking memory formation gates). This duplicated behavior that the review and extract skills also needed independently.

When `/dev-team:review` was used standalone, it duplicated the same Borges extraction logic. When `/dev-team:audit` and `/dev-team:retro` completed, they each reimplemented extraction steps. The result was logic drift: bug fixes in one skill's extraction path didn't propagate to others.

v1.9.0 decomposed the task skill into four orchestrated steps (see #481) and introduced skill-to-skill invocation: `/dev-team:task` calls `/dev-team:review` and `/dev-team:extract` as sub-skills rather than inlining their logic.

## Decision

Skills can invoke other skills via slash commands within the agent's skill context. This creates a composable skill architecture with two tiers:

### Skill classification

| Tier | Skills | Characteristics |
|------|--------|----------------|
| **Orchestration** | `task`, `audit`, `retro` | User-facing entry points. Manage lifecycle, coordinate steps, handle iteration. Call utility skills as sub-steps. |
| **Utility** | `extract`, `review` | Called by orchestration skills or directly by users. Produce a defined output (report, metrics). Encapsulate reusable logic. |
| **Advisory** | `challenge`, `scorecard` | Standalone. Not part of the composability graph. |

### The `--embedded` flag

When an orchestration skill invokes a utility skill, it passes `--embedded` to signal **compact mode**:

- **Skip lifecycle sections**: The utility skill omits its own Completion section (e.g., `/dev-team:review --embedded` skips the finding outcome log and Borges extraction — the calling skill handles those in a later step).
- **Identical report format**: The core output (findings, verdict, metrics) is identical in both standalone and embedded mode. Only post-report lifecycle actions differ.
- **Return control to caller**: The utility skill produces its output and the orchestration skill continues its own step sequence.

Without `--embedded`, utility skills run their full lifecycle (including their own extraction step), making them usable as standalone entry points.

### Current composition graph

```
/dev-team:task
  ├── Step 2: /dev-team:review --embedded
  └── Step 4: /dev-team:extract

/dev-team:review (standalone)
  └── Completion: /dev-team:extract

/dev-team:audit
  └── Completion: /dev-team:extract

/dev-team:retro
  └── Completion: /dev-team:extract
```

### Constraints

1. **Acyclic dependency graph.** Utility skills must not invoke orchestration skills. The call graph flows strictly downward: orchestration -> utility. This prevents infinite loops and keeps execution predictable.

2. **`disable-model-invocation: true` on all composable skills.** Both orchestration and utility skills that participate in the composition graph require explicit user or skill invocation. This prevents the model from autonomously triggering a skill chain. Advisory skills (`challenge`, `scorecard`) may allow autonomous invocation since they are standalone and side-effect-free.

3. **Single extraction point.** Each workflow produces exactly one `/dev-team:extract` call, regardless of how many sub-skills are invoked. Orchestration skills that call `/dev-team:review --embedded` defer extraction to their own final step. This prevents duplicate Borges runs and metric double-counting.

4. **Flag stripping.** Utility skills strip `--embedded` from `$ARGUMENTS` before processing the remaining arguments as their normal input. The flag is a control signal, not a user-visible parameter.

## Consequences

- **Eliminated duplication.** Review logic lives in `/dev-team:review`; extraction logic lives in `/dev-team:extract`. Bug fixes propagate to all callers automatically.
- **Consistent extraction.** All four workflow skills (task, review, audit, retro) share the same extraction path, ensuring metrics and memory formation are uniform.
- **Standalone utility.** Users can call `/dev-team:review` or `/dev-team:extract` directly with full lifecycle, or orchestration skills can call them in compact mode. The same skill serves both use cases.
- **New utility skills must follow the pattern.** Any future skill that encapsulates reusable logic should support `--embedded` for compact mode and be classified as a utility skill.
- **Debugging composition.** When a composed workflow fails, the failure may originate in a sub-skill. Phase checkpoint logging (e.g., `[dev-team:task] Step 2/4: Review`) provides visibility into which step is active.
