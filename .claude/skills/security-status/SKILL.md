---
name: security-status
description: Check GitHub security signals — code scanning, Dependabot, secret scanning, and compliance status. Use at session start and before releases.
user_invocable: true
---

# Security Status Check

Proactively monitor all GitHub Advanced Security signals for this repository.

## Steps

1. **Run all checks in parallel** using the Bash tool with `gh api`. Derive {owner}/{repo} from `gh repo view --json nameWithOwner --jq .nameWithOwner`:
   - Code scanning alerts (CodeQL, code quality): `gh api --paginate repos/{owner}/{repo}/code-scanning/alerts?state=open`
   - Dependabot alerts (vulnerable dependencies): `gh api --paginate repos/{owner}/{repo}/dependabot/alerts?state=open`
   - Secret scanning alerts: `gh api --paginate repos/{owner}/{repo}/secret-scanning/alerts?state=open`
   - Pending Dependabot PRs: `gh pr list --label dependencies`
   - Copilot review status on open PRs: check reviews on each open PR

2. **Report findings** in a summary table:

| Signal                 | Status                 | Details            |
| ---------------------- | ---------------------- | ------------------ |
| Code Scanning (CodeQL) | X open alerts          | severity breakdown |
| Dependabot Security    | X open alerts          | affected packages  |
| Dependabot Updates     | X pending PRs          | age of oldest      |
| Secret Scanning        | X open alerts          | types              |
| Copilot Review         | X comments on open PRs | blocking?          |

3. **Classify findings:**
   - `[DEFECT]` — Critical/high severity security alerts, exposed secrets
   - `[RISK]` — Medium severity alerts, stale Dependabot PRs (>7 days)
   - `[SUGGESTION]` — Low severity, informational

4. **Recommend actions** for any open alerts — who should fix, urgency, and whether it blocks the current work.

## When to run

- **Every session start** — quick baseline check
- **Before creating a release** — compliance gate
- **After merging Dependabot PRs** — verify alerts resolved
- **On request** — `/dev-team:security-status`
