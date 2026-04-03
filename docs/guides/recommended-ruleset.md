# Recommended GitHub Ruleset Configuration

This document describes the recommended GitHub repository ruleset for projects using dev-team. These settings complement the automated review and merge workflow by enforcing quality gates at the platform level.

The ruleset targets the default branch (`main`) with **active** enforcement.

## Branch protection rules

### Deletion protection

```json
{ "type": "deletion" }
```

Prevents the default branch from being deleted. Without this, a force-push accident or misconfigured automation could destroy the main branch, requiring manual recovery from reflog or backups.

### Non-fast-forward protection

```json
{ "type": "non_fast_forward" }
```

Blocks force-pushes to the default branch. Force-pushes rewrite published history, which breaks any agent or developer working from a now-invalid base. Combined with deletion protection, this makes the main branch append-only.

### Linear history

```json
{ "type": "required_linear_history" }
```

Requires a linear commit history (no merge commits). This pairs with the squash-only merge method (below) to produce a clean, bisectable history. Every commit on main corresponds to exactly one PR, which makes `git bisect` reliable and `git log` readable.

## Pull request rules

```json
{
  "type": "pull_request",
  "parameters": {
    "required_approving_review_count": 0,
    "required_review_thread_resolution": true,
    "allowed_merge_methods": ["squash"],
    "dismiss_stale_reviews_on_push": false,
    "require_code_owner_review": false,
    "require_last_push_approval": false
  }
}
```

### Zero required approvals

Dev-team enforces quality through automated review bots (Copilot code review, dev-team reviewer agents) and thread resolution, not through human approval count. Setting `required_approving_review_count: 0` removes the human bottleneck from agent-driven workflows while still allowing humans to block PRs by opening review threads. See [ADR-041](../adr/041-mergify-no-approval-by-design.md) for the rationale.

### Required review thread resolution

`required_review_thread_resolution: true` is the core quality gate. Every review comment — whether from Copilot, a dev-team agent, or a human — must be explicitly resolved before the PR can merge. This means:

- Findings cannot be silently ignored
- The merge skill's thread resolution protocol (read, address, resolve via GraphQL) is enforced at the platform level
- Mergify's `#review-threads-unresolved = 0` condition and this setting reinforce each other

### Squash merges only

`allowed_merge_methods: ["squash"]` ensures every PR becomes a single commit on main. This keeps the history linear (required by the linear history rule above), makes reverts trivial (one commit per change), and produces clean changelogs.

### Other pull request settings

- `dismiss_stale_reviews_on_push: false` — Reviews persist across force-pushes to the PR branch. Since review bots re-review on push anyway, dismissing stale reviews would just add noise.
- `require_code_owner_review: false` — No CODEOWNERS file is used. Review routing is handled by dev-team's agent orchestration, not GitHub's ownership model.
- `require_last_push_approval: false` — Not needed when approvals are not required.

## Required status checks

```json
{
  "type": "required_status_checks",
  "parameters": {
    "strict_required_status_checks_policy": true,
    "do_not_enforce_on_create": false,
    "required_status_checks": [
      { "context": "build-and-test (ubuntu-latest, 22)" },
      { "context": "build-and-test (macos-latest, 22)" },
      { "context": "build-and-test (windows-latest, 22)" },
      { "context": "lint-and-format" },
      { "context": "validate-hooks (ubuntu-latest)" },
      { "context": "validate-hooks (macos-latest)" },
      { "context": "validate-hooks (windows-latest)" },
      { "context": "audit-dependencies" },
      { "context": "validate" }
    ]
  }
}
```

### Check descriptions

| Check | Purpose |
|-------|---------|
| `build-and-test` (ubuntu, macos, windows) | Runs the full test suite on all three platforms. Cross-platform coverage catches platform-specific bugs in hooks, path handling, and shell scripts. |
| `lint-and-format` | Runs oxlint and oxfmt. Catches style violations and common errors before merge. |
| `validate-hooks` (ubuntu, macos, windows) | Validates that hook scripts are syntactically correct and executable on all platforms. Hooks run at commit time — a broken hook blocks all developers. |
| `audit-dependencies` | Checks for known vulnerabilities in npm dependencies. Prevents merging code with unaddressed security advisories. |
| `validate` | Project-level validation (template integrity, configuration consistency). Catches structural issues that other checks miss. |

### Strict status checks

`strict_required_status_checks_policy: true` requires branches to be up-to-date with the base branch before merging. This prevents a class of bugs where two PRs individually pass CI but break when combined. The tradeoff is merge cascades — each merge makes other PRs stale, requiring rebase — but GitHub's auto-merge and Mergify handle this automatically.

### Enforce on branch creation

`do_not_enforce_on_create: false` means status checks apply even when the branch is first pushed. This prevents a race condition where a PR could be created and merged before CI runs.

## Copilot code review

```json
{
  "type": "copilot_code_review",
  "parameters": {
    "review_on_push": true,
    "review_draft_pull_requests": false
  }
}
```

Copilot automatically reviews every push to a non-draft PR. This provides a first-pass automated review that catches common issues (bugs, security problems, style violations) before dev-team's specialized agents run. Draft PRs are excluded to avoid reviewing work-in-progress.

## Code scanning (CodeQL)

```json
{
  "type": "code_scanning",
  "parameters": {
    "code_scanning_tools": [
      {
        "tool": "CodeQL",
        "alerts_threshold": "errors",
        "security_alerts_threshold": "medium_or_higher"
      }
    ]
  }
}
```

CodeQL performs static analysis for security vulnerabilities and code quality issues. The thresholds are:

- **Code quality alerts**: block on `errors` only (warnings are advisory)
- **Security alerts**: block on `medium` severity and above

This catches injection vulnerabilities, insecure configurations, and data flow issues that linting and tests cannot detect. CodeQL replaced Semgrep (removed in v3.2.0) as the preferred SAST tool because it integrates natively with GitHub, requires zero configuration, and provides equivalent coverage.

## Code quality

```json
{
  "type": "code_quality",
  "parameters": {
    "severity": "warnings"
  }
}
```

Blocks merges when code quality issues at warning severity or above are detected. This works alongside CodeQL and Copilot to provide layered quality enforcement.

## Setting up the ruleset

1. Go to **Settings > Rules > Rulesets** in your GitHub repository
2. Create a new **Branch ruleset** targeting the default branch (`~DEFAULT_BRANCH`)
3. Set enforcement to **Active**
4. Add each rule type as described above
5. Configure bypass actors if needed (e.g., repository administrators for emergency fixes)

Alternatively, use the GitHub API:

```bash
gh api repos/OWNER/REPO/rulesets --method POST --input ruleset.json
```

## How the pieces fit together

The ruleset works as one layer in a multi-layer quality system:

1. **Pre-commit hooks** (dev-team) — catch issues before code is pushed
2. **CI checks** (GitHub Actions) — verify correctness across platforms
3. **Automated review** (Copilot + dev-team agents) — find logical and architectural issues
4. **Ruleset** (this configuration) — enforces that all of the above passed before merge
5. **Mergify** — manages the merge queue with `#review-threads-unresolved = 0`

No single layer is sufficient alone. The ruleset is the platform-level enforcement that prevents bypassing the other layers.
