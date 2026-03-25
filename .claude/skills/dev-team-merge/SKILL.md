---
name: dev-team:merge
description: Merge a PR with monitoring -- checks Copilot comments, sets auto-merge, monitors until complete, triggers next steps.
user_invocable: true
---

Merge a pull request with full monitoring: $ARGUMENTS

## Release PRs

**Conway/release PRs MUST use this merge skill.** Release PRs (version bumps, changelog updates, release branches) require the same Copilot review handling and CI verification as any other PR — do not bypass this process for releases. When merging a release PR, pay extra attention to:
- Changelog completeness (all PRs since last release are documented)
- Version bump correctness (semver compliance)
- No draft or WIP markers left in release notes

## Setup

1. Determine the PR number:
   - If provided as argument, use it directly
   - Otherwise, detect from current branch: `gh pr view --json number --jq .number`
   - If no PR found, report error and stop

2. Capture repo context:
   - `gh repo view --json nameWithOwner --jq .nameWithOwner` to get {owner}/{repo}

## Step 1: Wait for and address Copilot review

Before proceeding with merge, **wait for Copilot review to complete** by monitoring the Copilot check run.

### 1a. Wait for Copilot review via check run monitoring

Get the HEAD commit SHA for the PR, then look up the Copilot check run:

```bash
# Get the PR's HEAD commit SHA
PR_SHA=$(gh pr view {number} --json headRefOid --jq .headRefOid)

# Look up the Copilot check run
gh api repos/{owner}/{repo}/commits/${PR_SHA}/check-runs \
  --jq '.check_runs[] | select(.app.slug == "copilot-pull-request-reviewer" or .name == "Copilot") | {name, status, conclusion}'
```

**If a Copilot check run exists:**
- If status is `queued` or `in_progress`: poll every 15 seconds until `completed` (max 12 polls, ~3 minutes)
- Once status is `completed`: proceed to check for comments (1a-read below)
- Do NOT set auto-merge before this step completes

**If no Copilot check run exists** (not all repos have it configured):
- Fall back to a single 30-second wait, then check comments once
- This maintains backward compatibility for repos without the Copilot check run

### 1a-read. Read Copilot comments

Once the check run is completed (or after the fallback wait), read comments once:

```bash
# Inline review comments
gh api --paginate repos/{owner}/{repo}/pulls/{number}/comments --jq '[.[] | select(.user.login == "Copilot")] | length'

# Summary reviews (may exist without inline comments)
gh api --paginate repos/{owner}/{repo}/pulls/{number}/reviews --jq '[.[] | select(.user.login == "Copilot")] | length'
```

- If either count > 0: Copilot review has findings, proceed to 1b
- If both counts == 0: Copilot review is clean, proceed to Step 2
- Use `--paginate` on all API calls to avoid missing results on PRs with many comments

### 1b. Address Copilot findings

```bash
# Inline comments (include node_id for thread resolution)
gh api --paginate repos/{owner}/{repo}/pulls/{number}/comments --jq '.[] | select(.user.login == "Copilot") | {id: .id, node_id: .node_id, path: .path, line: .line, body: .body}'

# Summary reviews
gh api --paginate repos/{owner}/{repo}/pulls/{number}/reviews --jq '.[] | select(.user.login == "Copilot") | {id: .id, state: .state, body: .body}'
```

For each Copilot comment:
1. Read the finding and assess: is it actionable?
2. **Actionable** (bug, ambiguity, missing logic): fix in code, commit, push
3. **Style/minor**: acknowledge but skip if not substantive
4. **Reply to the Copilot thread** explaining what was fixed (or why it was skipped). Use the inline comment reply API:
   ```bash
   gh api repos/{owner}/{repo}/pulls/{number}/comments/{comment_id}/replies -f body="Fixed: <brief explanation of the change>"
   ```
   Note: GitHub's API does not support programmatically resolving review threads. The `minimizeComment` mutation only hides comments (collapses them), it does not mark threads as resolved. Threads must be resolved manually in the GitHub UI, or will be resolved when the PR is merged. Replying with the fix explanation is sufficient.
   To get the `node_id` for a comment, include it in the initial fetch (already updated above).
5. After addressing all actionable findings, re-push and wait for CI to restart

### 1c. Verify no new Copilot comments after push

If you pushed fixes, Copilot may re-review. Re-run the check run monitoring from 1a (get the new HEAD SHA, wait for the Copilot check run to complete, then read comments once).

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
