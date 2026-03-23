# ADR-018: Shared git context via temp file cache
Date: 2026-03-22
Status: accepted

## Context
Multiple hooks shell out to git independently on every Edit/Write and TaskCompleted event:

- `dev-team-tdd-enforce.js` calls `git diff --name-only`
- `dev-team-pre-commit-gate.js` calls `git diff --cached --name-only` and `git diff --name-only`

These hooks fire on the same event cycle, so they redundantly execute the same git commands within milliseconds of each other. On large repositories or slow filesystems, this adds measurable latency to every tool use.

## Decision
Use a temp file cache with a 5-second TTL. Each hook that needs git output:

1. Derives a cache key from the git arguments (e.g. `diff--name-only`)
2. Checks `os.tmpdir()/dev-team-git-cache-{key}.txt`
3. If the file exists and was modified < 5 seconds ago, reads from cache
4. Otherwise, shells out to git, writes the result to the cache file, and returns it

The `cachedGitDiff` helper is defined inline in each hook (no shared module) to preserve the zero-dependency, single-file-per-hook architecture (ADR-003).

Hook timeouts are reduced from 5000ms to 2000ms, since cached reads are near-instant and git calls on a local repo should complete well within 2 seconds.

## Consequences
- Hooks that fire in the same cycle share git output without redundant process spawns
- Cache staleness risk is mitigated by the 5-second TTL — hook cycles complete in under a second, so stale reads are not a practical concern
- The cache file is written to `os.tmpdir()`, which is cleaned by the OS and does not pollute the working directory
- Each hook remains a standalone script — the helper is duplicated, not extracted to a shared module, consistent with ADR-003
- If a hook cannot write the cache file (permissions, disk full), it falls back to a direct git call with no user-visible impact
