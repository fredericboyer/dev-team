# ADR-012: Memory freshness check in pre-commit gate
Date: 2026-03-22
Status: accepted

## Context
Agent memory and shared learnings capture project-specific patterns, decisions, and calibration. Without a reminder, teams complete implementation and commit without updating memory. Over time, memory files go stale and agents lose calibration.

Discovered when `dev-team-learnings.md` quality benchmarks went stale after significant work (90 → 106 tests, 6 → 9 agents).

## Decision
Extend the pre-commit gate (TaskCompleted hook) to check: if implementation files are staged but no memory files (`dev-team-learnings.md` or `agent-memory/*/MEMORY.md`) are included, emit an advisory reminder.

Also detect unstaged memory changes and suggest staging them.

This check is **advisory only** (exit 0) — it reminds but does not block. Trivial changes (config edits, docs) should not require memory updates.

## Consequences
- Teams get a nudge to capture learnings at the natural commit boundary
- False positive rate is manageable — only triggers when code files are staged
- Does not block commits, preserving developer flow for trivial changes
- Lives in the pre-commit gate hook (TaskCompleted event)
