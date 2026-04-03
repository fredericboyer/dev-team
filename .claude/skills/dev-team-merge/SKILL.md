---
name: dev-team:merge
description: Merge a PR with monitoring -- waits for review workflows, addresses unresolved threads, resolves them via GraphQL, sets auto-merge, and monitors until complete.
user_invocable: true
---

Merge a pull request with full monitoring: $ARGUMENTS

## Release PRs

**Release PRs MUST use this merge skill.** Release PRs (version bumps, changelog updates, release branches) require the same review handling and CI verification as any other PR. Pay extra attention to:
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

## Step 1: Wait for automated reviews and address threads

This step only **polls** for automated reviewers (Copilot). Human reviewers work on their own schedule — the skill does not block waiting for them. If no reviews exist yet and no automated reviewer is configured, proceed to Step 2 (set auto-merge) and let GitHub branch protection rulesets enforce review requirements at merge time.

### 1a. Wait for Copilot code review workflow (if configured)

After a push, the Copilot code review workflow may take time to start and complete. Use two-phase polling:

**Phase 1 — Wait to appear** (every 15s, timeout 2 minutes):
```bash
gh pr checks {number} | grep -i "copilot"
```
If `Copilot code review` never appears after 2 minutes, Copilot is not configured — skip to Step 1b.

**Phase 2 — Wait to complete** (every 15s, timeout 3 minutes):
Once the check appears, poll until its status is no longer `pending`:
```bash
gh pr checks {number} | grep -i "copilot"
```
When completed, proceed to Step 1b.

### 1b. Query all unresolved review threads

Use GraphQL to get ALL unresolved threads — from any reviewer (Copilot, human, bot):

```bash
gh api graphql -f query='
query($owner: String!, $repo: String!, $pr: Int!) {
  repository(owner: $owner, name: $repo) {
    pullRequest(number: $pr) {
      reviewThreads(first: 100) {
        nodes {
          id
          isResolved
          comments(first: 5) {
            nodes {
              author { login }
              body
            }
          }
        }
      }
    }
  }
}' -f owner="{owner}" -f repo="{repo}" -F pr={number} \
  --jq '.data.repository.pullRequest.reviewThreads.nodes[] | select(.isResolved == false) | {id, body: .comments.nodes[0].body}'
```

If zero unresolved threads, proceed to Step 2.

### 1c. Address each unresolved thread

For each unresolved thread:
1. Read the finding and assess: is it actionable?
2. **Actionable** (bug, ambiguity, missing logic): fix in code, commit, push
3. **Style/minor**: acknowledge with reason
4. **Reply to the thread** using the inline comment reply API:
   ```bash
   gh api repos/{owner}/{repo}/pulls/{number}/comments/{comment_id}/replies \
     -f body="Fixed: <brief explanation>"
   ```
5. **Deferred findings** — create a GitHub issue and reply with tracking number:
   ```bash
   gh api repos/{owner}/{repo}/pulls/{number}/comments/{comment_id}/replies \
     -f body="Tracked in #NNN — deferred: <brief reason>"
   ```

### 1d. Resolve threads via GraphQL

After replying to each thread, resolve it programmatically:

```bash
gh api graphql -f query='
mutation($threadId: ID!) {
  resolveReviewThread(input: { threadId: $threadId }) {
    thread { id isResolved }
  }
}' -f threadId="{thread_id}"
```

This is required — GitHub branch protection rulesets enforce `required_review_thread_resolution` as a merge condition. Unresolved threads block merging.

### 1e. Verify and loop

After addressing and resolving all threads:
1. If code was pushed, return to Step 1a (Copilot may re-review)
2. If only replies/resolves (no code push), verify zero unresolved threads remain and proceed to Step 2

## Step 2: Set auto-merge

**GATE: Do NOT proceed until all review threads are resolved.**

```bash
gh pr merge {number} --squash --auto --delete-branch
```

This sets GitHub's auto-merge to trigger when all required checks pass and branch protection rules are satisfied.

## Step 3: Monitor CI and merge

```bash
gh pr checks {number}
```

**If all checks pass:** PR will merge automatically via GitHub auto-merge.

**If checks are pending:** Report that auto-merge is set and CI is running. Poll every 30 seconds:
```bash
gh pr view {number} --json state --jq .state
```
Timeout after 15 minutes.

**If checks are failing:** Report which checks failed. Do NOT proceed.

## Step 4: Post-merge actions

After merge is confirmed:

1. **Switch to main and pull latest:**
   ```bash
   git checkout main && git pull origin main
   ```

2. **Report the merge commit:**
   ```bash
   git log -1 --format="%H %s"
   ```

3. **Check for next work:** suggest starting next issue if one is queued.

## Error handling

- If `gh` commands fail, check authentication: `gh auth status`
- If merge conflicts are reported, inform the user — do not attempt automatic resolution
- If branch protection rules block the merge, report which rules are not satisfied
