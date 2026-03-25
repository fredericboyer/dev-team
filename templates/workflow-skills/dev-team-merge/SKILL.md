---
name: dev-team:merge
description: Merge a PR with monitoring -- checks Copilot comments, sets auto-merge, monitors until complete, triggers next steps.
user_invocable: true
---

Merge a pull request with full monitoring: $ARGUMENTS

## Setup

1. Determine the PR number:
   - If provided as argument, use it directly
   - Otherwise, detect from current branch: `gh pr view --json number --jq .number`
   - If no PR found, report error and stop

2. Capture repo context:
   - `gh repo view --json nameWithOwner --jq .nameWithOwner` to get {owner}/{repo}

## Step 1: Check for Copilot review comments

Before proceeding with merge, check for Copilot (and other automated) review comments:

```
gh api repos/{owner}/{repo}/pulls/{number}/reviews
gh api repos/{owner}/{repo}/pulls/{number}/comments
```

Filter for reviews/comments from bot accounts (especially `copilot` and `github-actions`).

- If Copilot has left comments or suggestions:
  1. Display each finding with file, line, and comment body
  2. For actionable suggestions: apply the fix in code, commit, and push
  3. For each comment thread: reply acknowledging the finding and resolve the thread using `gh api repos/{owner}/{repo}/pulls/{number}/comments/{id}/replies`
  4. After addressing all findings, re-push and wait for CI to restart

- If no Copilot comments: proceed to Step 2

## Step 2: Set auto-merge

```bash
gh pr merge {number} --squash --auto --delete-branch
```

This tells GitHub to merge automatically once all required checks pass.

## Step 3: Check CI status and monitor

Check current CI status:

```bash
gh pr checks {number}
```

**If all checks are passing:**
- The PR will merge immediately (or within seconds)
- Verify by checking: `gh pr view {number} --json state --jq .state`
- If state is `MERGED`, proceed to Step 4

**If checks are pending:**
- Inform the user that auto-merge is set and CI is running
- Spawn a background monitoring agent to poll until completion:
  - Poll every 30 seconds: `gh pr view {number} --json state --jq .state`
  - If state becomes `MERGED`: report success and proceed to Step 4
  - If checks fail: report the failure with details from `gh pr checks {number}`
  - Timeout after 15 minutes of polling

**If checks are failing:**
- Report which checks failed: `gh pr checks {number}`
- Do NOT proceed with merge
- Suggest investigating the failures

## Step 4: Post-merge actions

After merge is confirmed:

1. **Switch to main and pull latest:**
   ```bash
   git checkout main
   git pull origin main
   ```

2. **Report the merge commit:**
   ```bash
   git log -1 --format="%H %s"
   ```

3. **Check for next work:**
   - If there is a known next issue in the current milestone or the user mentioned follow-up work, suggest starting it
   - If the branch was a worktree, note that the worktree can be cleaned up

## Error handling

- If `gh` commands fail, check authentication: `gh auth status`
- If merge conflicts are reported, inform the user -- do not attempt automatic resolution
- If branch protection rules block the merge, report which rules are not satisfied
