# ADR-032: Memory write semantics — append-only format vs mutable content
Date: 2026-03-26
Status: accepted

## Context

ADR-012 introduced a memory freshness check in the pre-commit gate, establishing the principle that memory files (`.dev-team/learnings.md` and `.dev-team/agent-memory/*/MEMORY.md`) should be actively maintained alongside code changes. The implicit model was append-only: agents produce findings, Borges extracts structured entries, and memory grows over time.

In practice, the memory system requires mutation operations that go beyond appending:

1. **Temporal decay**: Borges archives entries older than 90 days without verification, moving them from the active section to an `## Archive` section. This is a structural edit, not an append.
2. **Memory evolution**: When a new finding contradicts an existing entry, Borges marks the old entry as superseded. When duplicates are detected, entries are merged. When 3+ overrules accumulate on the same tag, Borges generates calibration rules. All of these modify existing content.
3. **Staleness removal**: Agents are instructed to remove stale entries from their own MEMORY.md at session start. This is deletion.
4. **Benchmark updates**: Shared learnings contain quality benchmarks (test counts, agent counts) that must be overwritten, not appended, when they change.

This creates a tension: the memory system was conceived as append-only (new learnings accumulate), but the maintenance protocol requires update, move, merge, and remove operations.

Without clarification, agents face contradictory guidance — "always append" vs "remove stale entries" — which leads to either memory bloat (never removing anything) or silent data loss (removing without audit trail).

## Decision

Memory write semantics are governed by two distinct principles:

### 1. Workflow writes are append-only

When agents and humans produce new knowledge during normal work — findings, decisions, overrules, patterns — these are appended as new structured entries. No existing entry is silently deleted or overwritten as a side effect of adding new knowledge.

This preserves the audit trail: every learning that entered the system is traceable.

### 2. Maintenance writes are mutable, Borges-authorized

Borges is the sole authorized mutation agent for memory maintenance operations:

| Operation | When | Authorization |
|-----------|------|---------------|
| **Archive** | Entry not verified in 90+ days | Borges temporal decay cycle |
| **Supersede** | New finding contradicts existing entry | Borges memory evolution |
| **Merge** | Duplicate entries detected (same tags + similar context) | Borges deduplication |
| **Update** | `Last-verified` date refresh, `Seen: N times` counter increment | Borges extraction |
| **Generate** | Calibration rules from 3+ overrules on same tag | Borges calibration |

Individual agents may remove clearly stale entries from their own MEMORY.md at session start (per their agent definitions), but only entries they own. Cross-agent mutations are Borges-only.

### Key constraint: no silent deletion

Archived entries are moved to the `## Archive` section, not deleted. Superseded entries are annotated with a `**Superseded by**` reference, not removed. The historical record is preserved even as active memory evolves.

The only true deletion is Borges compressing archived entries into summaries when an agent's MEMORY.md approaches the 200-line cap — and even then, the summary preserves the substance.

## Consequences

- ADR-012's freshness check remains valid — it ensures memory is updated, not that it is append-only
- Borges' maintenance operations (temporal decay, evolution, deduplication) are formally authorized, not in tension with the memory model
- Agents have clear guidance: append new entries, let Borges handle structural maintenance
- The archive-not-delete principle preserves audit trail while preventing memory bloat
- Cross-agent mutation is constrained to Borges, preventing coordination conflicts between agents editing each other's memory
- Individual agents retain the ability to clean their own stale entries at session start, keeping the self-maintenance loop fast
