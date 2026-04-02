# Research Brief: Concurrent Multi-User Usage Model

**Issue**: #257
**Date**: 2026-03-26
**Researcher**: Turing

## Question

How should dev-team handle concurrent usage by multiple developers or multiple AI agent sessions operating on the same project simultaneously? The current architecture assumes a single-user model, creating conflicts in memory files, agent status, hook execution, config, and worktree naming.

## Approaches Evaluated

### A1: Session-Scoped File Namespacing

Assign each Claude Code session a unique identifier (derived from `CLAUDE_SESSION_ID` or a generated UUID) and namespace all mutable state files by session.

**Memory files**: `.dev-team/agent-memory/<agent>/MEMORY-<session>.md`
**Status files**: `.dev-team/agent-status/<agent>-<session>.json`
**Worktree branches**: `feat/<issue>-<description>-<session-prefix>`

**Pros**:

- Eliminates write conflicts entirely — each session owns its own files
- Simple to implement — string interpolation on existing paths
- No coordination protocol needed between sessions

**Cons**:

- Memory fragmentation: learnings from session A are invisible to session B until merged
- Merge complexity: requires a reconciliation step to combine session-scoped memories into the canonical file
- File proliferation: N sessions x M agents = N*M status files, N*M memory files
- Breaks the current two-tier memory model (ADR-012) which assumes a single canonical file per agent

**Evidence**: Claude Code agent teams already use session-scoped isolation via worktrees (see [agent teams docs](https://code.claude.com/docs/en/agent-teams)). Cursor uses isolated git worktrees per agent to prevent merge conflicts. This pattern is proven for code files but untested for metadata/memory files.

### A2: Append-Only Log Format for Shared Files

Convert `.dev-team/learnings.md` and agent MEMORY.md files from freeform markdown to a structured append-only log with timestamped entries. Each session appends entries rather than editing existing content.

**Format**:

```markdown
### [2026-03-26T10:00:00Z] [session:abc123] Finding title

- Content here
- Last-verified: 2026-03-26
```

**Pros**:

- Merge-friendly: append-only means git can auto-merge most concurrent edits (different lines)
- Preserves full history — no data loss from overwrites
- Compatible with existing Borges temporal decay (entries already have timestamps)
- CRDT-like properties without requiring CRDT infrastructure

**Cons**:

- File growth: without active compaction, files grow unboundedly
- Duplicate entries: two sessions may independently discover the same learning
- Requires Borges (or a new compaction agent) to periodically deduplicate and compact
- Freeform markdown sections (like "Overruled Challenges") don't map cleanly to append-only

**Evidence**: CRDT append-only logs (e.g., ipfs-log) use a similar pattern for distributed systems. The key insight is that append-only operations commute — order doesn't matter, so concurrent appends never conflict. Git's line-based merge handles this well when entries are on separate lines.

### A3: Git-Branch-Based Memory Isolation with Merge-on-Complete

Each session works on its own branch (already the case for implementation via worktrees). Memory and status files are modified only on the session's branch. At task completion, memory changes are merged to main along with the code changes.

**Pros**:

- Zero coordination overhead during work — git handles isolation natively
- Memory changes are atomically committed with the code they describe
- Merge conflicts are surfaced at PR time, not during work
- Already how code changes work — extends the model to metadata

**Cons**:

- Memory updates are delayed: session B can't see session A's learnings until A merges
- Merge conflicts in learnings.md are likely when both sessions add entries to the same section
- Agent status files are gitignored (ADR-026), so this doesn't solve status collisions

**Evidence**: This is how distributed teams already work with shared documentation in git. The trade-off is freshness vs. conflict-freedom.

### A4: Advisory Lock Mechanism for Exclusive Operations

Introduce a lightweight lock file (`.dev-team/.locks/<operation>.lock`) for operations that must be exclusive: releases, version bumps, major config changes.

**Lock format**:

```json
{
  "operation": "release",
  "session": "abc123",
  "started": "2026-03-26T10:00:00Z",
  "ttl_seconds": 600
}
```

**Pros**:

- Prevents the most dangerous concurrent conflicts (two simultaneous releases)
- TTL-based expiry prevents stale locks from orphaned sessions
- Advisory — sessions can check before starting exclusive operations
- Lightweight — no external dependencies

**Cons**:

- Race condition: two sessions could check-then-create simultaneously (TOCTOU)
- Requires all agents to respect the lock protocol (prompt-based enforcement)
- Adds operational complexity for a rare scenario
- Git's own lock (`index.lock`) already prevents some concurrent operations

**Evidence**: Git LFS file locking uses a similar advisory model. The `git lock` command from git-extras provides advisory locking tracked in the repository. TOCTOU can be mitigated with `O_EXCL` atomic file creation or `mkdir` (which is atomic on POSIX).

### A5: Hook Deduplication via Change Hashing

When post-change-review hooks fire, include a hash of the triggering change (file path + content hash). Before spawning a review agent, check if a review for the same hash is already in progress or completed.

**Dedup store**: `.dev-team/agent-status/reviews/<hash>.json`

**Pros**:

- Prevents redundant reviews when two sessions edit the same file
- Reduces agent spawn overhead in multi-session scenarios
- Deterministic — same change always produces the same hash

**Cons**:

- Only deduplicates identical changes — different edits to the same file still spawn separate reviews
- Requires hook coordination (one hook checking another session's state)
- Stale review entries need cleanup (Borges)
- May suppress legitimate re-reviews after further edits

**Evidence**: CI systems (GitHub Actions, GitLab CI) use commit SHA deduplication to avoid redundant pipeline runs. The same principle applies here.

## Recommendation

**Adopt a layered approach combining A2 + A4 + A5, with A1 for status files only.**

### Layer 1: Append-Only Memory Format (A2)

Convert `.dev-team/learnings.md` and agent MEMORY.md files to append-only log format with timestamped, session-tagged entries. This is the highest-impact change:

- Eliminates the most common conflict (concurrent memory writes)
- Builds on existing timestamp convention (Borges temporal decay)
- Git auto-merge handles concurrent appends gracefully
- Borges compaction runs at end-of-task (already mandatory) to deduplicate

### Layer 2: Session-Scoped Status Files (A1, limited scope)

Rename agent status files from `{agent}.json` to `{agent}-{session-prefix}.json`. Status files are already gitignored (ADR-026), so this change is invisible to git. Benefits:

- Multiple sessions can report status without overwriting each other
- Borges cleanup (ADR-026) already handles orphaned status files
- Minimal code change — session prefix injected at write time

### Layer 3: Advisory Locks for Exclusive Operations (A4)

Implement advisory locks for release, version bump, and config.json modification. Use `mkdir` for atomic lock acquisition (POSIX-safe). Lock TTL of 10 minutes with session ID. Benefits:

- Prevents the most dangerous concurrent conflict (simultaneous releases)
- Lightweight, no external dependencies
- Lock check can be added to Conway's release flow and `dev-team update`

### Layer 4: Hook Deduplication (A5)

Add change hashing to post-change-review hooks. Before spawning a review agent, check for an existing review of the same content hash within the last 5 minutes. Benefits:

- Reduces unnecessary agent spawns in multi-session scenarios
- Low implementation cost — hash check added to existing hook logic

### What NOT to do

- **Full session namespacing of memory files (A1 for memory)**: The fragmentation cost outweighs the conflict prevention benefit. Append-only format achieves conflict freedom without fragmenting the knowledge base.
- **CRDT infrastructure**: Heavyweight for the problem. Git's merge is sufficient when files are append-only.
- **Real-time sync between sessions**: Out of scope. Sessions are independent git branches; synchronization happens at merge time.

## Evidence

| Source                                                                                                                                              | Relevance                                                                    |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| [Claude Code Agent Teams docs](https://code.claude.com/docs/en/agent-teams)                                                                         | Worktree isolation is the standard for code; we extend the model to metadata |
| [Git LFS File Locking](https://github.com/git-lfs/git-lfs/wiki/File-Locking)                                                                        | Advisory locking pattern for shared resources in git                         |
| [Cursor worktree isolation](https://dev.to/pockit_tools/cursor-vs-windsurf-vs-claude-code-in-2026-the-honest-comparison-after-using-all-three-3gof) | Industry standard: isolated worktrees per agent session                      |
| [Windsurf parallel Cascade panes](https://nevo.systems/blogs/nevo-journal/windsurf-vs-cursor)                                                       | Parallel sessions with dedicated terminal profiles                           |
| [CRDT append-only logs](https://en.wikipedia.org/wiki/Conflict-free_replicated_data_type)                                                           | Theoretical foundation: append-only operations commute                       |
| ADR-026 (agent-progress-reporting)                                                                                                                  | Current status file design assumes single writer per agent                   |
| ADR-013 (active-hook-spawning, superseded)                                                                                                          | Lesson: file-based coordination creates orphan bugs; cleanup is mandatory    |
| ADR-012 (memory-freshness-check)                                                                                                                    | Current memory model assumes single canonical file per agent                 |
| ADR-019 (parallel-review-waves)                                                                                                                     | Existing parallel orchestration already isolates via branches                |

## Known Issues / Caveats

1. **Append-only compaction is critical**: Without Borges compaction, learnings.md will grow unboundedly in high-activity projects. The 200-line guideline for agent MEMORY.md files (per agent definitions) must be enforced by compaction, not just convention.

2. **Session ID availability**: Claude Code exposes session context through agent teams (team name, teammate ID), but a standalone session may not have a stable ID. Fallback: generate a short UUID at session start and persist it in `.dev-team/agent-status/session-id`.

3. **Lock TTL races**: A session that acquires a lock and then crashes leaves the lock until TTL expires. 10-minute TTL is a balance between "too short" (premature expiry during long releases) and "too long" (blocking other sessions).

4. **Memory divergence window**: Between the time session A appends a learning and session B starts, B won't see A's learning unless it reads from main. This is acceptable for most learnings but could cause duplicate work.

5. **Hook dedup false negatives**: If session A edits a file and session B edits the same file differently, both will trigger separate reviews (different hashes). This is correct behavior but means dedup only helps with truly concurrent identical changes.

6. **Backward compatibility**: The append-only format change for learnings.md requires a migration. Existing freeform content must be preserved and tagged with a synthetic timestamp.

7. **Agent teams vs. standalone sessions**: Agent teams already have built-in isolation (worktrees, task lists). The multi-user problem is primarily about multiple independent sessions (different developers), not teammates within one agent team.

## Confidence Level

**Medium-High**

The append-only memory format (Layer 1) and session-scoped status files (Layer 2) are high-confidence recommendations — the patterns are well-established and the implementation is straightforward.

The advisory lock mechanism (Layer 3) is medium confidence — the use case (concurrent releases) is rare but severe, and the implementation has known edge cases (TOCTOU, stale locks).

Hook deduplication (Layer 4) is medium confidence — the benefit depends on how frequently multiple sessions edit the same files, which we have no data on yet.

**What would increase confidence**:

- Telemetry on how many concurrent sessions actually occur in practice (is this a theoretical or real problem?)
- Testing the append-only format with git's three-way merge on realistic concurrent edit scenarios
- User feedback on whether advisory locks feel too heavy for their workflow
