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

## Step 1: Wait for and address Copilot review

Before proceeding with merge, **wait for Copilot review to appear** — it takes 30-120 seconds after PR creation.

### 1a. Wait for Copilot review

Poll up to 4 times (30s intervals, ~2 minutes total). Check both inline comments AND summary reviews — Copilot can leave either:

```bash
# Inline review comments
gh api --paginate repos/{owner}/{repo}/pulls/{number}/comments --jq '[.[] | select(.user.login == "Copilot")] | length'

# Summary reviews (may exist without inline comments)
gh api --paginate repos/{owner}/{repo}/pulls/{number}/reviews --jq '[.[] | select(.user.login == "Copilot")] | length'
```

- If either count > 0: Copilot review has arrived, proceed to 1b
- If both counts == 0 after 4 polls: Copilot review is absent (may not be configured), proceed to Step 2
- Do NOT set auto-merge before this step completes
- Use `--paginate` on all API calls to avoid missing results on PRs with many comments

### 1b. Address Copilot findings

```bash
# Inline comments
gh api --paginate repos/{owner}/{repo}/pulls/{number}/comments --jq '.[] | select(.user.login == "Copilot") | {id: .id, path: .path, line: .line, body: .body}'

# Summary reviews
gh api --paginate repos/{owner}/{repo}/pulls/{number}/reviews --jq '.[] | select(.user.login == "Copilot") | {id: .id, state: .state, body: .body}'
```

For each Copilot comment:
1. Read the finding and assess: is it actionable?
2. **Actionable** (bug, ambiguity, missing logic): fix in code, commit, push
3. **Style/minor**: acknowledge but skip if not substantive
4. After addressing all actionable findings, re-push and wait for CI to restart

### 1c. Verify no new Copilot comments after push

If you pushed fixes, Copilot may review again. Check once more after CI restarts:

```bash
gh api --paginate repos/{owner}/{repo}/pulls/{number}/comments --jq '[.[] | select(.user.login == "Copilot")] | length'
gh api --paginate repos/{owner}/{repo}/pulls/{number}/reviews --jq '[.[] | select(.user.login == "Copilot")] | length'
```

If new comments appeared, repeat 1b. Otherwise proceed to Step 2.

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
