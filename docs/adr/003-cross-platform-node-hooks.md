# ADR-003: Cross-platform Node.js hooks

Date: 2026-03-22
Status: accepted

## Context

Claude Code hooks execute shell commands. Shell scripts (.sh) work on macOS and Linux but not on Windows. Dev-team targets engineering organizations regardless of their OS.

## Decision

All hooks are Node.js scripts (.js) invoked with `node .dev-team/hooks/dev-team-*.js`. Since `npx` requires Node.js, this adds no new dependency for any platform.

## Consequences

- Hooks work on macOS, Linux, and Windows without modification
- Hook scripts can use Node.js built-ins (fs, path, child_process) for richer logic than shell allows
- Slightly more verbose than shell for simple pattern matching
- Consistent language (JavaScript) across hooks and CLI
