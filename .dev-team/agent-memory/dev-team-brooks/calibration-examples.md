# Calibration Examples: Brooks (Architect)

Annotated examples of correctly classified findings from this project's review history. Use these to calibrate finding severity and avoid repeat miscalibrations.

### Example 1: DEFERRED — Skill composability ADR suggestion

**Finding:** The skill-calls-skill pattern (/dev-team:extract invoked by /dev-team:task, /dev-team:review invoked with --embedded flag) should be formally documented in an ADR to establish the composability contract.
**Classification:** [SUGGESTION]
**Outcome:** deferred to #493, then completed in v1.10.0
**Why:** The pattern was working correctly at runtime but lacked formal architectural documentation. Deferring was correct — the implementation was sound and shipping it was higher priority than documenting it. But the ADR was genuinely needed: without it, future skill authors would not know the composability contract (disable-model-invocation, --embedded flag semantics, output format expectations).
**Lesson:** ADR suggestions for working patterns are legitimate deferrals, not dismissals. The test: "would a new contributor be confused without this documentation?" If yes, create the issue and track it. The v1.10.0 completion validated the deferral — the ADR was written with better context after the pattern had been exercised in production.

### Example 2: ACCEPTED — --reviewers removal as breaking change

**Finding:** Task skill now controls reviewer selection internally. The --reviewers flag on /dev-team:review is removed. Anyone invoking /dev-team:review directly with --reviewers will get an error.
**Classification:** [RISK]
**Outcome:** accepted (flagged for release notes)
**Why:** This is a genuine breaking change for direct review skill users. The --embedded pattern subsumes the old interface, but the removal is not backward-compatible. The correct action was to accept and ensure it appears in v1.9.0 release notes, not to maintain backward compatibility indefinitely.
**Lesson:** When a skill interface changes, always assess whether external consumers exist. Internal-only interfaces (invoked by other skills) can change freely. Public interfaces (invoked by users via slash commands) need release note callouts for removals. Brooks should flag interface removals even when the replacement is architecturally superior — the migration cost falls on users.

### Example 3: ACCEPTED — 4-way learnings merge conflict requiring sequential ordering

**Finding:** Four parallel branches all edited dev-team-learnings.md. Merging created a 4-way conflict that required sequential merge ordering with manual conflict resolution between each merge.
**Classification:** [DEFECT]
**Outcome:** accepted (resolved via sequential merge ordering)
**Why:** Parallel branches touching shared files is an architectural coordination problem, not just a process problem. The learnings file is a shared resource with high write contention. The fix — sequential merge ordering — is correct for the current scale but does not prevent recurrence.
**Lesson:** Shared mutable files (learnings, metrics, MEMORY.md) are architectural bottlenecks in parallel workflows. When reviewing parallel branch plans, flag shared file writes as merge-ordering constraints upfront. This is the same class as "sequential chains must integrate-as-you-go" but applies to parallel branches, not just sequential ones.

### Example 4: ACCEPTED — HookEntry interface incomplete (missing timeout/blocking fields)

**Finding:** The HookEntry TypeScript interface was missing timeout and blocking fields that exist in the runtime settings.json hook entries. mergeSettings using Object.assign would propagate these fields at runtime but the type system did not reflect them.
**Classification:** [RISK]
**Outcome:** accepted (interface extended)
**Why:** Type-reality drift is a maintainability risk. Code using HookEntry would not get type checking on timeout/blocking access, leading to potential undefined-at-runtime bugs. The fix was straightforward — extend the interface to match the runtime shape.
**Lesson:** When reviewing interface definitions, compare them against the actual data they model. JSON config files are the most common source of type-reality drift — the config evolves faster than the TypeScript types. Check settings.json schema against HookEntry/ConfigEntry types during reviews.

### Example 5: ACCEPTED — INFRA_HOOKS separation as temporary architectural pattern

**Finding:** init.ts now separates INFRA_HOOKS (always installed) from QUALITY_HOOKS (opt-in). Infrastructure hooks bypass user choice.
**Classification:** [RISK]
**Outcome:** accepted (with "remove when upstream fixes land" caveat)
**Why:** The worktree serialization hooks work around Claude Code bugs (#34645, #39680). They must be installed to prevent race conditions, so user opt-out would be counterproductive. However, the pattern of bypassing user choice is architecturally concerning if it grows beyond the current 2 hooks.
**Lesson:** Temporary architectural patterns need explicit removal conditions. "Remove when upstream fixes land" is a valid condition but must be tracked. Brooks should flag any growth in INFRA_HOOKS — each addition weakens user control. The current 2-hook scope is acceptable; 5+ would warrant an ADR.
