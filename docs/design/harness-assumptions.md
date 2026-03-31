# Harness Assumptions

Components in dev-team that compensate for model limitations. Each retro evaluates whether these assumptions still hold, flagging outdated ones for simplification.

## Assumptions

### Safety guard hook

- **Assumption:** Models will execute dangerous commands (rm -rf, force push, credential exposure) without prompting the user first.
- **Current status:** Claude Code's built-in sandbox provides filesystem and network restrictions. The safety guard hook is a secondary speed bump that catches patterns the sandbox does not cover (e.g., `git push --force` to main).
- **Component:** `templates/hooks/dev-team-safety-guard.js`
- **Last-validated:** 2026-03-29

### TDD enforcement hook

- **Assumption:** Models will not write tests without explicit prompting, leading to untested code.
- **Current status:** Models are significantly better at TDD now and often generate tests unprompted. However, enforcement prevents regression in sessions where the model optimizes for speed over coverage.
- **Component:** `templates/hooks/dev-team-pre-commit-lint.js` (test coverage check)
- **Last-validated:** 2026-03-29

### Review gate

- **Assumption:** Models will skip peer reviews without enforcement, optimizing for speed of delivery over quality.
- **Current status:** Still valid. Models consistently optimize for task completion speed. Without the review gate, adversarial review loops are bypassed, reducing defect detection.
- **Component:** `templates/hooks/dev-team-review-gate.js`
- **Last-validated:** 2026-03-29

### Agent memory (two-tier)

- **Assumption:** Models cannot maintain context across sessions, requiring explicit persistence of learnings and calibration data.
- **Current status:** Still valid. Claude Code sessions are stateless between invocations. Without persisted memory, agents repeat mistakes and lose calibration across sessions.
- **Component:** `.claude/agent-memory/`, `.claude/rules/dev-team-learnings.md`
- **Last-validated:** 2026-03-29

### Structured finding classifications

- **Assumption:** Models need a rigid taxonomy ([DEFECT], [RISK], [SUGGESTION], [QUESTION]) to produce consistent, actionable review output.
- **Current status:** Could potentially be relaxed for more nuanced feedback. However, the taxonomy enables automated processing (metrics, gate decisions) and consistent cross-agent communication. Removing it would require replacing the automation layer.
- **Component:** Agent definitions, review gate, metrics system
- **Last-validated:** 2026-03-29
