---
name: dev-team-pr
description: Create a pull request from the current branch using pr format config from .dev-team/config.json. Composable pipeline step — called by /dev-team:task after implementation.
disable-model-invocation: false
---

Create a pull request: $ARGUMENTS

## Setup

1. Parse arguments for:
   - `--issue NNN` — GitHub issue number to link
   - `--draft` — override config to create as draft
   - Any additional context (title override, description notes)

2. Detect the current branch and ensure it has been pushed:
   ```bash
   branch=$(git rev-parse --abbrev-ref HEAD)
   ```
   If the branch is `main` or `master`, stop — PRs are not created from the default branch.

   Check if the branch has been pushed:
   ```bash
   git ls-remote --heads origin "$branch"
   ```
   If not pushed, push it:
   ```bash
   git push -u origin "$branch"
   ```

3. Check that no PR already exists for this branch:
   ```bash
   gh pr view --json number --jq .number 2>/dev/null
   ```
   If a PR already exists, return its number and URL instead of creating a new one.

## Step 1: Read config

Read PR format config from `.dev-team/config.json`:

```bash
cat .dev-team/config.json
```

Extract the `pr` section. Apply defaults for any missing fields:

| Field | Default | Values |
|-------|---------|--------|
| `titleFormat` | `"conventional"` | `"conventional"`, `"plain"`, `"issue-prefix"` |
| `linkKeyword` | `"Closes"` | Any GitHub closing keyword (`Closes`, `Fixes`, `Resolves`, etc.) |
| `draft` | `false` | `true` / `false` |
| `template` | `["summary", "testPlan"]` | Array of section names |
| `autoLabel` | `true` | `true` / `false` |

## Step 2: Determine PR metadata

### Title

Extract the issue number from the branch name (pattern: `feat/NNN-*`, `fix/NNN-*`, or via `--issue` argument).

If an issue number is available, fetch the issue title:
```bash
gh issue view NNN --json title --jq .title
```

Format the title based on `titleFormat`:

- **`conventional`**: `feat: <issue title>` or `fix: <issue title>` — derive the prefix from the branch name (`feat/` -> `feat:`, `fix/` -> `fix:`, `chore/` -> `chore:`)
- **`plain`**: `<issue title>` — no prefix
- **`issue-prefix`**: `#NNN: <issue title>` — issue number prefix

If no issue is linked, use the branch description or arguments as the title.

### Body

Build the PR body from the `template` config array. Each entry maps to a section:

- `summary` — generate a `## Summary` section with bullet points summarizing the changes (read from `git diff main...HEAD --stat` and commit messages)
- `testPlan` — generate a `## Test plan` section with a checklist of verification steps
- `issueLink` — add the issue link using the configured `linkKeyword` (e.g., `Closes #NNN`)

The `issueLink` section is always included when an issue number is available, regardless of the `template` array.

### Labels

If `autoLabel` is `true` and an issue number is available, read the issue's labels:
```bash
gh issue view NNN --json labels --jq '.labels[].name'
```
These labels will be applied to the PR.

### Draft

Use the `draft` config value. The `--draft` argument overrides config to `true`.

## Step 3: Create the PR

Build and execute the `gh pr create` command:

```bash
gh pr create \
  --title "<formatted title>" \
  --body "$(cat <<'EOF'
<formatted body>
EOF
)" \
  [--draft] \
  [--label "label1" --label "label2"]
```

Capture the PR number and URL from the output.

## Step 4: Link to issue

If an issue number is available, the body already contains the link keyword (e.g., `Closes #NNN`). GitHub will auto-close the issue on merge.

## Platform detection

Before issuing any `gh` commands, check `.dev-team/config.json` for the `platform` field. If the project specifies a non-GitHub platform (e.g., `"gitlab"`, `"bitbucket"`), adapt PR commands accordingly — use `glab` for GitLab, the Bitbucket API, or the appropriate CLI. Default to `"github"` if `platform` is absent.

## Output

Return a structured summary:

- PR number
- PR URL
- Title used
- Draft status
- Labels applied
- Linked issue (if any)
