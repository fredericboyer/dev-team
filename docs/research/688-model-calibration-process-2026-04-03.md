# Research Brief: Model Upgrade Calibration Process

**Date**: 2026-04-03
**Issue**: #688
**Researcher**: Turing

---

## Question

How should dev-team evaluate whether hooks, guards, and agent scaffolding remain necessary as model capabilities improve? What process ensures we retire unnecessary overhead without losing protections that still provide value?

## Context

dev-team ships a set of hooks and agent scaffolding that enforce quality through productive friction:

| Component | Type | Purpose |
|-----------|------|---------|
| `dev-team-pre-commit-gate.js` | Hook | Blocks commits without review evidence and memory updates |
| `dev-team-review-gate.js` | Hook | Enforces adversarial review loop at commit time (ADR-029) |
| `dev-team-pre-commit-lint.js` | Hook | Runs oxlint/oxfmt before commit |
| `dev-team-safety-guard.js` | Hook | Prevents destructive operations (force push, reset --hard) |
| `dev-team-tdd-enforce.js` | Hook | Enforces test coverage for code changes |
| `dev-team-post-change-review.js` | Hook | Spawns review agents after file changes |
| `dev-team-watch-list.js` | Hook | Triggers domain-specific agents based on file patterns |
| `dev-team-agent-teams-guide.js` | Hook | Guides agent team coordination |
| `dev-team-worktree-create.js` | Hook | Manages worktree isolation for parallel agents |
| `dev-team-worktree-remove.js` | Hook | Cleans up worktrees after agent completion |
| `agent-patterns.json` | Config | Maps file patterns to reviewing agents |
| Agent definitions (13 agents) | Scaffolding | Specialized personas with challenge protocols |

As models improve, some of these may become unnecessary. A model that reliably runs tests before committing does not need `tdd-enforce`. A model that never force-pushes does not need `safety-guard`. But removing a guard prematurely is dangerous -- the cost of a false negative (guard removed, model fails) is much higher than a false positive (guard kept, model would have been fine).

## Approaches Evaluated

### Approach A: Per-Release Calibration

Run a calibration pass before each minor/major release. Disable each guard individually in a controlled environment and measure whether the model produces the same quality output.

**Pros:**
- Regular cadence tied to existing release process
- Changes ship in the same release they're validated in
- Natural checkpoint for evaluating new model versions

**Cons:**
- Adds release overhead
- May be too frequent for guards that rarely trigger
- Model version may not change between releases

### Approach B: Per-Model-Upgrade Calibration

Run calibration only when the underlying model changes (e.g., Claude Opus 4 to Opus 5, or a significant capability update within a model family).

**Pros:**
- Directly tied to the event that could make guards unnecessary
- Less frequent, lower total overhead
- More meaningful signal (model capability actually changed)

**Cons:**
- Model upgrades are external events with unpredictable timing
- May miss gradual improvements within a model version
- Requires tracking which model version each guard was last tested against

### Approach C: Hybrid -- Per-Model-Upgrade with Release Checkpoints

Run full calibration on model upgrades. At each release, check the `last-model-tested` metadata -- if a guard hasn't been calibrated in 2+ model generations, flag it for review.

**Pros:**
- Full calibration when it matters most (model change)
- Release checkpoints catch guards that fell through the cracks
- Metadata tracking provides audit trail

**Cons:**
- Slightly more complex process
- Requires maintaining calibration metadata

## Recommendation

**Approach C (Hybrid)** is the recommended process. The core calibration runs when model capabilities actually change, but release checkpoints provide a safety net.

### The Calibration Process

#### 1. Trigger Conditions

Calibration runs when:
- **Primary**: The Claude model version changes (e.g., Opus 4 -> Opus 5, or a documented capability improvement within a version)
- **Secondary**: At each minor/major release, any guard not calibrated within the last 2 model generations is flagged

#### 2. Calibration Protocol Per Component

For each hook/guard, the calibration test follows this pattern:

```
For guard G:
  1. Record current model version and guard metadata
  2. Run a controlled task set WITH the guard enabled (baseline)
  3. Run the SAME task set with the guard disabled (experiment)
  4. Compare outputs on these dimensions:
     - Did the model naturally do what the guard enforces?
     - Were there any failures that the guard would have caught?
     - Was there measurable overhead from the guard?
  5. Record results in calibration log
```

**Task sets should be curated per guard:**

| Guard | Calibration Task Set |
|-------|---------------------|
| `pre-commit-gate` | 5 implementation tasks. Check: does the model seek review and update memory without being forced? |
| `review-gate` | 5 implementation tasks with intentional issues. Check: does the model self-review or request review without the gate? |
| `pre-commit-lint` | 10 file edits across JS/TS. Check: does the model run the linter on its own? |
| `safety-guard` | 10 scenarios involving branch operations. Check: does the model avoid force-push/reset without being blocked? |
| `tdd-enforce` | 5 feature implementations. Check: does the model write tests without being required? |
| `post-change-review` | 5 multi-file changes. Check: does the model request domain review without being prompted? |
| `watch-list` | 5 changes to watched file patterns. Check: does the model identify the right specialist concerns? |
| `agent-teams-guide` | 3 parallel task scenarios. Check: does the model coordinate agents without guidance? |
| Agent definitions | 5 tasks per agent domain. Check: does a generic agent match the specialist's quality? |

#### 3. Decision Criteria

A guard can be **retired** when ALL of these are true:
- The model passes the calibration task set with 100% equivalence (no regressions) across 3 consecutive calibration runs
- The guard has not caught a real issue in production (tracked via metrics) in the last 2 model generations
- The cost of re-adding the guard if needed is low (code is preserved in git history)

A guard should be **kept** when ANY of these are true:
- The model fails even 1 task in the calibration set
- The guard caught a real issue in the last model generation (even once)
- The guard enforces an external constraint (not model behavior) -- e.g., `safety-guard` protects against accidents regardless of model capability
- The guard's overhead is negligible relative to its protection value

A guard should be **simplified** when:
- The model passes most but not all calibration tasks
- The guard's enforcement could be reduced (e.g., from blocking to advisory)
- The LIGHT/FULL tier system already handles this (promote to advisory tier)

#### 4. Tracking Metadata

Each component should track calibration state in `.dev-team/calibration.json`:

```json
{
  "version": "1.0",
  "components": {
    "dev-team-safety-guard": {
      "last-model-tested": "claude-opus-4-6",
      "last-calibration-date": "2026-04-03",
      "result": "keep",
      "reason": "Enforces external constraint (accident prevention). Model-independent.",
      "pass-rate": "10/10",
      "category": "external-constraint"
    },
    "dev-team-tdd-enforce": {
      "last-model-tested": "claude-opus-4-6",
      "last-calibration-date": "2026-04-03",
      "result": "keep",
      "reason": "Model wrote tests in 4/5 tasks without enforcement. 1 failure.",
      "pass-rate": "4/5",
      "category": "model-behavior"
    }
  }
}
```

#### 5. Component Categories

Not all guards are equal candidates for retirement:

| Category | Retirement Likelihood | Examples |
|----------|----------------------|---------|
| **External constraint** | Very low -- these protect against accidents, not model limitations | `safety-guard`, `worktree-create/remove` |
| **Process enforcement** | Low -- these encode team decisions, not model capability gaps | `pre-commit-gate`, `review-gate` |
| **Model behavior** | Medium -- these compensate for model tendencies that may improve | `tdd-enforce`, `pre-commit-lint` |
| **Coordination** | Medium-high -- as models improve at multi-agent coordination | `agent-teams-guide`, `watch-list` |
| **Domain knowledge** | High -- as models internalize domain patterns | Agent-specific scaffolding, `agent-patterns.json` |

#### 6. Integration with Existing Process

- **Borges** tracks calibration decisions in agent memory (calibration outcomes are learnings)
- **Deming** can run calibration task sets as part of quality audits
- **Conway** includes calibration metadata in release notes when a guard status changes
- The `/dev-team:retro` skill should check for stale calibration entries (not calibrated in 2+ model generations)

### What NOT to Calibrate

Some components should be excluded from the retirement process:

- **`safety-guard`**: Accident prevention is model-independent. Even a perfect model benefits from a safety net against tool misuse or prompt injection.
- **`worktree-create/remove`**: Git isolation is an infrastructure concern, not a model capability.
- **Review gate architecture**: The adversarial review loop is a design principle (ADR-029), not a model compensation. The specific agents and thresholds are calibratable; the loop itself is not.

## Evidence

| Claim | Source | Verified |
|-------|--------|----------|
| Claude Code agent teams share filesystem by default | dev-team research brief 605 (local) | yes |
| Cross-branch contamination documented in v1.7.0, v1.10.0, v3.3.0 | `.claude/rules/dev-team-learnings.md` (local) | yes |
| LIGHT/FULL review tiers validated in v3.3.0 | `.claude/rules/dev-team-learnings.md` (local) | yes |
| Review gate enforces adversarial loop (ADR-029) | `.claude/rules/dev-team-learnings.md` (local) | yes |
| dev-team ships 10 hooks + 13 agent definitions | `templates/hooks/` and `templates/agents/` directory listing (local) | yes |
| Model capability improvements can reduce need for guardrails | General AI research consensus | UNVERIFIED -- no specific study quantifies this for coding agents |

## Known Issues / Caveats

1. **Calibration task sets are expensive to maintain.** Each guard needs a curated set of tasks that exercise the specific behavior. These tasks may themselves become stale as the project evolves.

2. **"100% equivalence" is hard to measure for subjective quality.** A model may do something differently without the guard -- not worse, just different. The calibration protocol needs human judgment for edge cases.

3. **Calibration results are model-AND-prompt-dependent.** A guard that is unnecessary with the current CLAUDE.md and agent definitions might become necessary again if those change. Calibration should be re-run when agent definitions change significantly.

4. **Sample size.** 5-10 tasks per guard is a small sample. False negatives (guard seems unnecessary but isn't) are the dangerous failure mode. The "3 consecutive runs" requirement mitigates this but doesn't eliminate it.

5. **No automated calibration runner exists yet.** The process described here is manual. Building an automated harness would require an evaluation framework (related to #669 harness best practices research).

## Confidence Level

**Medium-High.** The calibration process is well-structured and the decision criteria are conservative (biased toward keeping guards). What would increase confidence:
- Running a pilot calibration on 2-3 guards with the current model to validate the task set design
- Building an automated calibration runner to reduce human overhead
- Establishing a baseline calibration record for all current components

## Recommended Actions

- **Title**: Baseline calibration record for all hooks and guards
  **Severity**: P1
  **Files affected**: `.dev-team/calibration.json` (new)
  **Scope**: M
  **Details**: Create the initial `calibration.json` with current model version and "keep" status for all components. This establishes the baseline for future comparisons.

- **Title**: Add calibration staleness check to `/dev-team:retro`
  **Severity**: P2
  **Files affected**: `templates/skills/dev-team-retro.md`
  **Scope**: S
  **Details**: The retro skill should flag components not calibrated within 2 model generations, similar to how Borges flags stale memory entries.

- **Title**: Design calibration task sets for model-behavior guards
  **Severity**: P2
  **Files affected**: `docs/calibration/` (new directory)
  **Scope**: L
  **Details**: Curate reproducible task sets for `tdd-enforce`, `pre-commit-lint`, and `post-change-review` -- the three guards most likely to become unnecessary as models improve.

- **Title**: Pilot calibration run on `pre-commit-lint`
  **Severity**: P2
  **Files affected**: `.dev-team/calibration.json`
  **Scope**: S
  **Details**: `pre-commit-lint` is the best candidate for a pilot: clear pass/fail criteria (did the model run the linter?), low risk if disabled temporarily, and easy to measure.
