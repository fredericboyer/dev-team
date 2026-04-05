---
name: dev-team-pr
description: Create a well-formatted PR from the current branch using project config.
disable-model-invocation: false
---

Create a PR: $ARGUMENTS

## Setup

1. Parse any flags:
   - `--draft` — override config to create as draft PR
   - `--no-label` — skip auto-labeling even if enabled in config

2. Read PR config from `.dev-team/config.json` under the `pr` key:

   ```json
   {
     "pr": {
       "titleFormat": "conventional",
       "linkKeyword": "Closes",
       "draft": false,
       "template": ["summary", "testPlan"],
       "autoLabel": true
     }
   }
   ```

   If the `pr` key is absent, use these defaults:
   - `titleFormat`: `"conventional"`
   - `linkKeyword`: `"Closes"`
   - `draft`: `false`
   - `template`: `["summary", "testPlan"]`
   - `autoLabel`: `true`

## Platform detection

Before issuing any `gh` commands, check `.dev-team/config.json` for the `platform` field. If the project specifies a non-GitHub platform (e.g., `"gitlab"`, `"bitbucket"`), adapt PR commands accordingly — use `glab` for GitLab, the Bitbucket API, or the appropriate CLI for the configured platform. If `platform` is absent, default to `"github"`. The steps below assume GitHub.

## Step 1: Determine branch and issue context

1. Get the current branch name:
   ```bash
   git rev-parse --abbrev-ref HEAD
   ```

2. Extract the issue number from the branch name. Branch naming follows `(feat|fix|chore)/<issue-number>-<description>`:
   ```bash
   echo "$branch" | sed -n 's|^[^/]*/\([0-9]*\)-.*|\1|p'
   ```

3. If an issue number was extracted, fetch the issue title for use in PR title formatting:
   ```bash
   gh issue view <number> --json title --jq .title
   ```

4. Verify the branch is pushed to remote:
   ```bash
   git ls-remote --heads origin "$branch"
   ```
   If not pushed, push it:
   ```bash
   git push -u origin "$branch"
   ```

## Step 2: Format the PR title

Format the title based on the `titleFormat` config value:

- **`conventional`** — Derive the type prefix from the branch prefix:
  - `feat/` -> `feat: <issue title or description>`
  - `fix/` -> `fix: <issue title or description>`
  - `chore/` -> `chore: <issue title or description>`
  - `docs/` -> `docs: <issue title or description>`
  - If the branch prefix is not recognized, use the description as-is.

- **`plain`** — Use the issue title directly (or the branch description if no issue).

- **`issue-prefix`** — `#<issue-number>: <issue title or description>`. If no issue number, fall back to `plain`.

The description portion comes from the issue title (if available) or from the branch name with hyphens converted to spaces.

## Step 3: Build the PR body

Construct the PR body with the sections specified in the `template` array, in order. Each section maps to a heading and placeholder content:

- **`summary`** ->
  ```
  ## Summary
  <1-3 bullet points summarizing the changes>
  ```

- **`testPlan`** ->
  ```
  ## Test plan
  <bulleted checklist of how to verify the changes>
  ```

- **`breakingChanges`** ->
  ```
  ## Breaking changes
  <list any breaking changes, or "None">
  ```

- **`migration`** ->
  ```
  ## Migration guide
  <steps for consumers to migrate, if applicable>
  ```

Populate each section with actual content by examining the diff:
```bash
git diff main...HEAD --stat
git log main..HEAD --oneline
```

Append the issue link at the end of the body using the configured `linkKeyword`:
```
<linkKeyword> #<issue-number>
```

If no issue number was extracted, omit the issue link line.

## Step 4: Determine labels

If `autoLabel` is `true` (and `--no-label` was not passed):

1. Derive label from the branch prefix:
   - `feat/` -> `enhancement`
   - `fix/` -> `bug`
   - `docs/` -> `documentation`
   - `chore/` -> `chore`

2. Verify the label exists on the repository before applying:
   ```bash
   gh label list --json name --jq '.[].name'
   ```
   Only apply labels that already exist. Do not create new labels.

## Step 5: Create the PR

Build the `gh pr create` command:

```bash
gh pr create \
  --title "<formatted title>" \
  --body "<formatted body>" \
  [--draft] \
  [--label "<label>"]
```

- Add `--draft` if `pr.draft` is `true` in config OR `--draft` flag was passed.
- Add `--label` only if a valid label was determined in Step 4.

Capture the PR number and URL from the output.

## Step 6: Verify

Confirm the PR was created:
```bash
gh pr view --json number,url,title,isDraft --jq '{number, url, title, isDraft}'
```

## Output

Return a structured summary:

- PR number
- PR URL
- Title used
- Draft status
- Labels applied
- Issue linked (number, or "none")

## Error handling

- If `gh` commands fail, check authentication: `gh auth status`
- If the branch has no commits ahead of main, report error — nothing to create a PR for
- If PR already exists for this branch, report the existing PR number and URL instead of creating a duplicate
