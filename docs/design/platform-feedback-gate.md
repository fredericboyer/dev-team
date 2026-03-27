# Design Note: Generalizing the Merge Skill into a Platform Feedback Gate

> Status: brainstorm / parked for future exploration

## Problem

The `/dev-team:merge` skill is GitHub-specific (Copilot review, `gh` CLI). But the underlying principle — "before completing work, check all automated feedback and address it" — is universal. Every platform has automated review bots, CI feedback, and code analysis tools.

Currently, Copilot feedback is missed because:
- The merge skill lives in `.claude/skills/` (project-specific), so agents don't always use it
- Release PRs bypass it entirely (Conway uses `gh pr merge` directly)
- The skill checks for feedback but doesn't enforce responding to/resolving threads

## Design Options

### Option A: Generic "feedback gate" in templates

Template skill or Drucker step: "Before marking work complete, check for automated review feedback from the platform. Read it, evaluate it, address actionable items, respond to threads."

- Platform-specific details (Copilot API endpoints, `gh` commands) stay in project CLAUDE.md or `.claude/skills/`
- The framework enforces the *behavior* (check feedback), the project provides the *how*
- Pros: every project gets the reminder, platform-agnostic
- Cons: without the specific API calls, the gate is just a guideline

### Option B: Conway owns PR readiness

Conway already owns release readiness. Extend to "PR readiness" — before any PR merges, Conway validates that all automated feedback is addressed.

- Pros: single owner for quality gates
- Cons: Conway is a release manager, not a merge manager. Overloads the role. Also, Conway only runs at release time, not for every PR.

### Option C: Drucker orchestration step

Drucker already coordinates the implement -> review -> merge flow. Add a step between review and merge: "Check platform feedback and address before proceeding."

- Pros: natural fit — orchestration concern, runs for every task
- Cons: Drucker needs to know how to check platform feedback (platform-specific)

### Recommended: A + C (hybrid)

1. **Template (framework-level):** Drucker's definition and the task/review skills include a generic "platform feedback gate" step: "Before completing work, verify that all automated platform feedback (CI bots, code review bots, security scanners) has been read and addressed. Respond to feedback threads to confirm resolution."

2. **Project-level (`.claude/skills/` or project CLAUDE.md):** Provides the specific implementation — which APIs to call, which bot usernames to check, how to respond. For GitHub: Copilot review comments, CodeQL alerts, Dependabot. For GitLab: MR bots, SAST. For Bitbucket: code insights.

3. **Enforcement:** The framework defines *that* feedback must be checked. The project defines *how*. If no project-level implementation exists, the gate is a best-effort reminder. If one exists, it's a hard gate.

## How This Affects Existing Architecture

- `/dev-team:merge` skill stays in `.claude/skills/` as the GitHub-specific implementation of the gate
- `templates/agents/dev-team-drucker.md` gets a generic "check platform feedback" step
- `templates/skills/dev-team-task/SKILL.md` completion section references the gate
- Conway's definition references the gate for release PRs specifically
- The merge skill adds: reply to comment threads, resolve threads after fixing

## Open Questions

- Should the gate be blocking (DEFECT-level) or advisory (RISK-level)?
- How does this interact with agent teams? Does each teammate check feedback on their own PR, or does the lead check all PRs?
- What's the right timeout for waiting for bot reviews? (Currently 2 minutes for Copilot)
- Should the gate also check CI bot comments (e.g., coverage reports, bundle size)?

## Related

- Issue #216 (merge skill gaps) — the immediate fix
- Issue #219 (orchestration model enforcement) — the main loop as Drucker
- Research synthesis R15 (judge/critic filtering) — the judge should also consume platform feedback
- ADR-001 (hooks over guidelines) — if this keeps being skipped, it should be a hook
