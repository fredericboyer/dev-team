# ADR-011: Configurable watch lists (file pattern → agent mapping)

Date: 2026-03-22
Status: accepted

## Context

The post-change-review hook has hardcoded file patterns (auth → Szabo, API → Mori, etc.) that work for built-in agents. Teams with custom agents need a way to route file changes to their own specialists without modifying hook source code.

## Decision

Add a `watchLists` configuration in `dev-team.json`:

```json
{
  "watchLists": [
    { "pattern": "src/db/", "agents": ["dev-team-codd"], "reason": "database code changed" }
  ]
}
```

A dedicated `dev-team-watch-list.js` hook reads this config on every Edit/Write and outputs spawn recommendations for matching patterns. Patterns are JavaScript regex. Invalid patterns are silently skipped.

The watch list hook is separate from post-change-review — it handles custom agents while post-change-review handles built-in agents.

## Consequences

- Teams can extend the review system without forking hooks
- Configuration lives in the project, visible to all developers
- Regex patterns offer flexibility but can be misconfigured silently (tracked as future improvement)
- Multiple agents can be triggered by the same pattern
