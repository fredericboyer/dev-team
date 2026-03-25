---
name: git-workflow
description: Safe parallel git workflow — worktree isolation, branch naming, and cleanup for team work.
user_invocable: true
---

# Git Workflow for Parallel Team Work

## Worktree isolation (MANDATORY for teammates)

When working as a teammate in a parallel agent team, NEVER work directly in the main checkout. Always create a worktree:

```bash
git worktree add $TMPDIR/worktree-<task-number> -b <branch-name> origin/main
```

All file edits, commits, and pushes happen inside the worktree directory. This prevents branch contamination when multiple agents share the same repository.

## Branch naming

- Features: `feat/<issue-number>-<short-description>`
- Fixes: `fix/<issue-number>-<short-description>`

Examples: `feat/168-cross-model-validation`, `fix/209-stale-quality-benchmarks`

## Workflow

1. **Create worktree** from latest `origin/main`
2. **Make changes** — edit, test, commit inside the worktree
3. **Push** with `-u origin <branch-name>`
4. **Create PR** with `Closes #<issue>` in body
5. **Clean up** after push:
   ```bash
   cd <repo-root>
   git worktree remove $TMPDIR/worktree-<task-number>
   ```

## Rules

- Never `git checkout` in the main repo during parallel team work — it affects all teammates
- Each task gets its own worktree and branch
- Run `npm test` inside the worktree before committing
- Branches are auto-deleted on PR merge (GitHub setting)
- If a PR gets contaminated with unrelated commits, close it, delete the branch, and recreate cleanly from a new worktree
