---
name: merge
description: Merge a PR with monitoring -- checks Copilot comments, sets auto-merge, monitors until complete, triggers next steps.
user_invocable: true
---

Merge a pull request with full monitoring: $ARGUMENTS

## Release PRs

**Release PRs MUST use this merge skill.** Release PRs (version bumps, changelog updates, release branches) require the same Copilot review handling and CI verification as any other PR — do not bypass this process for releases. When merging a release PR, pay extra attention to:
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

Before proceeding with merge, **wait for Copilot review to complete** using multi-signal detection (check run, requested reviewers, and submitted reviews).

### 1a. Wait for Copilot review via multi-signal detection

Copilot can appear as a check run, a requested reviewer, or both. Detect all signals before deciding how to wait.

Get the HEAD commit SHA for the PR, then probe all three signals sequentially:

```bash
# Get the PR's HEAD commit SHA
PR_SHA=$(gh pr view {number} --json headRefOid --jq .headRefOid)

# Signal 1: Check runs API
gh api repos/{owner}/{repo}/commits/${PR_SHA}/check-runs \
  --jq '.check_runs[] | select(.app.slug == "copilot-pull-request-reviewer" or .name == "Copilot") | {name, status, conclusion}'

# Signal 2: Requested reviewers API (Copilot pending as reviewer)
gh api repos/{owner}/{repo}/pulls/{number}/requested_reviewers \
  --jq '[.users[] | select(.login | test("^(Copilot|copilot-pull-request-reviewer)(\\[bot\\])?$"))] | length'

# Signal 3: Reviews API (Copilot already submitted a review — terminal states only)
gh api --paginate repos/{owner}/{repo}/pulls/{number}/reviews \
  --jq '[.[] | select((.user.login | test("^(Copilot|copilot-pull-request-reviewer)(\\[bot\\])?$")) and (.state == "APPROVED" or .state == "CHANGES_REQUESTED" or .state == "COMMENTED"))] | length'
```

**Decision logic (evaluate in order):**

1. **If a Copilot check run exists AND status is `queued` or `in_progress`:** poll the check-runs API every 15 seconds until `completed` (max 12 polls, ~3 minutes). If after the final (12th) poll the status is still `queued` or `in_progress`, **treat this as a timeout**: surface a clear error, do **not** proceed to comment reading or merge, and stop the workflow without setting auto-merge.
   - Once status is `completed` within the polling limit: proceed to 1a-read below.

2. **If Copilot is in requested_reviewers (Signal 2 count > 0):** Copilot has been requested but hasn't submitted a review yet. Poll the reviews API every 15 seconds until a review from Copilot appears with state `APPROVED`, `CHANGES_REQUESTED`, or `COMMENTED` (max 12 polls, ~3 minutes):
   ```bash
   gh api --paginate repos/{owner}/{repo}/pulls/{number}/reviews \
     --jq '[.[] | select((.user.login | test("^(Copilot|copilot-pull-request-reviewer)(\\[bot\\])?$")) and (.state == "APPROVED" or .state == "CHANGES_REQUESTED" or .state == "COMMENTED"))] | length'
   ```
   - If a completed review appears within the polling limit: proceed to 1a-read below.
   - If after the final (12th) poll no completed review exists, **treat this as a timeout**: surface a clear error, do **not** proceed to comment reading or merge, and stop the workflow without setting auto-merge.

3. **If Copilot already submitted a review (Signal 3 count > 0, but not in requested_reviewers and no check run):** review is already done. Proceed directly to 1a-read below.

4. **If none of the three signals detect Copilot:** fall back to a single 30-second wait, then check comments once. This maintains backward compatibility for repos without Copilot configured.

- Do NOT set auto-merge before this step completes.

### 1a-read. Read Copilot comments

Once the check run is completed (or after the fallback wait), read comments once:

```bash
# Inline review comments (check both Copilot logins)
gh api --paginate repos/{owner}/{repo}/pulls/{number}/comments --jq '[.[] | select(.user.login | test("^(Copilot|copilot-pull-request-reviewer)(\\[bot\\])?$"))] | length'

# Summary reviews (check both Copilot logins)
gh api --paginate repos/{owner}/{repo}/pulls/{number}/reviews --jq '[.[] | select(.user.login | test("^(Copilot|copilot-pull-request-reviewer)(\\[bot\\])?$"))] | length'
```

- If either count > 0: Copilot review has findings, proceed to 1b
- If both counts == 0: no Copilot comments were detected. If a Copilot check run was observed and completed, treat this as a clean review; if no Copilot check run exists, this likely means Copilot review is not configured or did not run. Then proceed to Step 2.
- Use `--paginate` on all API calls to avoid missing results on PRs with many comments

### 1b. Address Copilot findings

```bash
# Inline comments (include node_id for thread resolution, check both Copilot logins)
gh api --paginate repos/{owner}/{repo}/pulls/{number}/comments --jq '.[] | select(.user.login | test("^(Copilot|copilot-pull-request-reviewer)(\\[bot\\])?$")) | {id: .id, node_id: .node_id, path: .path, line: .line, body: .body}'

# Summary reviews (check both Copilot logins)
gh api --paginate repos/{owner}/{repo}/pulls/{number}/reviews --jq '.[] | select(.user.login | test("^(Copilot|copilot-pull-request-reviewer)(\\[bot\\])?$")) | {id: .id, state: .state, body: .body}'
```

For each Copilot comment:
1. Read the finding and assess: is it actionable?
2. **Actionable** (bug, ambiguity, missing logic): fix in code, commit, push
3. **Style/minor**: acknowledge but skip if not substantive
4. **Reply to the Copilot thread** explaining what was fixed (or why it was skipped). Use the inline comment reply API:
   ```bash
   gh api repos/{owner}/{repo}/pulls/comments/{comment_id}/replies -f body="Fixed: <brief explanation of the change>"
   ```
   Note: GitHub's API does not support programmatically resolving review threads. The `minimizeComment` mutation only hides comments (collapses them), it does not mark threads as resolved. Threads must be resolved manually in the GitHub UI, or will be resolved when the PR is merged. Replying with the fix explanation is sufficient.
   To get the `node_id` for a comment, include it in the initial fetch (already updated above).
5. **Deferred findings must be tracked.** For findings acknowledged but NOT fixed (style/minor skips, intentional deferrals, or "won't fix" decisions):
   - Create a GitHub issue to track the deferred finding:
     ```bash
     gh issue create \
       --title "Deferred Copilot finding: <short description>" \
       --body "$(cat <<'EOF'
     ## Copilot Finding

     **PR:** #{number}
     **File:** {path}
     **Line:** {line}

     ### Finding
     {copilot_comment_body}

     ### Reason for deferral
     {explanation of why it was not fixed in this PR}

     ---
     *Auto-created by merge skill from Copilot review on PR #{number}.*
     EOF
     )"
     ```
   - Reply to the Copilot thread with the tracking issue number:
     ```bash
     gh api repos/{owner}/{repo}/pulls/comments/{comment_id}/replies \
       -f body="Tracked in #NNN — deferred: <brief reason>"
     ```
6. **Validation gate before merge.** Before proceeding to Step 2 (auto-merge), verify that every Copilot inline comment has been addressed with one of:
   - A code fix (reply mentioning "Fixed:")
   - A tracking issue (reply mentioning "Tracked in #NNN")

   Empty acknowledgments, bare "acknowledged" replies, or comments without either a fix or an issue number are **not valid**. If any comment lacks proper resolution, go back and either fix it or create a tracking issue.

   To verify, re-fetch all Copilot inline comments and check that each has at least one reply from the PR author or bot containing "Fixed:" or "Tracked in #":
   ```bash
   # Get all Copilot comment IDs
   COPILOT_COMMENTS=$(gh api --paginate repos/{owner}/{repo}/pulls/{number}/comments \
     --jq '[.[] | select(.user.login | test("^(Copilot|copilot-pull-request-reviewer)(\\[bot\\])?$")) | .id]')

   # For each comment, verify it has a valid reply
   for COMMENT_ID in $(echo "$COPILOT_COMMENTS" | jq -r '.[]'); do
     REPLIES=$(gh api --paginate repos/{owner}/{repo}/pulls/{number}/comments \
       --jq "[.[] | select(.in_reply_to_id == ${COMMENT_ID}) | .body]")
     HAS_FIX=$(echo "$REPLIES" | jq 'any(test("Fixed:"))')
     HAS_ISSUE=$(echo "$REPLIES" | jq 'any(test("Tracked in #"))')
     if [ "$HAS_FIX" != "true" ] && [ "$HAS_ISSUE" != "true" ]; then
       echo "UNRESOLVED: Comment $COMMENT_ID has no fix or tracking issue"
     fi
   done
   ```
   If any comments are unresolved, **do not proceed** — address them before continuing.
7. After addressing all actionable findings, re-push and wait for CI to restart

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
