---
name: dev-team:audit
description: Full codebase audit combining security, quality, and tooling assessments. Use to run a comprehensive scan with Szabo (security), Knuth (quality), and Deming (tooling) in parallel. Can be scoped to specific directories or file patterns.
---

Run a comprehensive audit of: $ARGUMENTS

## Setup

1. Determine the audit scope:
   - If a directory or file pattern is given, scope the audit to those paths
   - If no argument, audit the entire codebase
   - Respect `.gitignore` — skip `node_modules/`, `dist/`, build artifacts

2. The audit always spawns three specialist agents:
   - **@dev-team-szabo** — Security audit
   - **@dev-team-knuth** — Quality and correctness audit
   - **@dev-team-deming** — Tooling and automation audit

## Execution

1. Spawn all three agents as **parallel background subagents** using the Agent tool with `subagent_type: "general-purpose"`. Use the agent teammate naming convention: `szabo-audit`, `knuth-audit`, `deming-audit`. **Timeout**: If an audit agent has not reported progress (status file or message) within 3 minutes, send a status ping. If no response within 1 additional minute, terminate the agent and proceed with findings from the other agents.

2. Each agent's prompt must include:
   - The agent's full definition (read from `.dev-team/agents/<agent>.md`)
   - The scope (directory/pattern or "full codebase")
   - Instruction to produce classified findings: `[DEFECT]`, `[RISK]`, `[QUESTION]`, `[SUGGESTION]`
   - Instruction to read the actual code and tests for full context

3. Agent-specific instructions:

   **Szabo (Security)**:
   - Map all trust boundaries and entry points
   - Check for OWASP Top 10 vulnerabilities
   - Audit auth/authz flows end-to-end
   - Review secret management and dependency vulnerabilities

   **Knuth (Quality)**:
   - Identify untested code paths and coverage gaps
   - Find boundary conditions without tests
   - Check assertion quality in existing tests
   - Map test-to-requirement traceability

   **Deming (Tooling)**:
   - Inventory current tooling (linters, formatters, SAST, CI)
   - Identify missing automation opportunities
   - Check for stale dependencies and known vulnerabilities
   - Evaluate CI pipeline efficiency

4. Wait for all agents to complete.

## Report

Produce a consolidated audit report:

### Executive summary

One paragraph summarizing the overall health of the codebase across all three domains.

### Security findings (@dev-team-szabo)

List all findings, grouped by classification:
- `[DEFECT]` — must fix
- `[RISK]` — should address
- `[QUESTION]` / `[SUGGESTION]` — consider

### Quality findings (@dev-team-knuth)

Same grouping. Include specific files and line references.

### Tooling findings (@dev-team-deming)

Same grouping. Include actionable recommendations.

### Priority matrix

| Priority | Finding | Agent | Action |
|----------|---------|-------|--------|
| P0 (fix now) | `[DEFECT]` items | ... | ... |
| P1 (fix soon) | `[RISK]` items | ... | ... |
| P2 (improve) | `[SUGGESTION]` items | ... | ... |

### Recommended next steps

Numbered list of concrete actions, ordered by priority. Each action should reference the specific finding it addresses.

### Security preamble

Before starting the audit, check for open security alerts using the project's security monitoring process (e.g., a `/security-status` skill or CLAUDE.md guidance). If no such process, skill, or guidance is available, explicitly note this in your report and proceed by reviewing recent security-related issues and scanning for common vulnerabilities manually. Include any findings in the audit scope.

### Completion

After the audit report is delivered:
1. You MUST spawn **@dev-team-borges** as `borges-extract` (Librarian) as the final step to review memory freshness and capture learnings from the audit findings. Do NOT skip this.
2. If Borges was not spawned, the audit is INCOMPLETE.
3. **Metrics completion gate**: Read `.dev-team/metrics.md` and verify that a new `Task: <reference>` entry was appended after this audit started. A stale metrics file (no new entry) means Borges did not complete successfully. If metrics.md has no new entry after Borges reports completion, flag this as a system failure and re-run Borges with explicit instruction to record metrics.
4. Include Borges's recommendations in the final report.
