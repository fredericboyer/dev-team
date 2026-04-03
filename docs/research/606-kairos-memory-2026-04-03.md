## Research brief: Kairos Memory System (#606)

**Date**: 2026-04-02
**Researcher**: Turing
**Confidence**: Medium (auto-dream is shipping but undocumented; KAIROS is unreleased)

### Question

What is KAIROS, how does its memory consolidation compare to dev-team's Borges-based memory system, and should dev-team integrate with, migrate to, or maintain independence from it?

### Background: Two Distinct Systems

Research reveals that "KAIROS" and "auto-dream" are related but distinct:

1. **KAIROS** — An unreleased always-on daemon mode discovered in the Claude Code source leak (March 31, 2026). It is gated behind compile-time feature flags set to `false` in external builds. KAIROS is a persistent background agent with a tick loop, 15-second blocking budget, append-only daily logs, and a `/dream` consolidation subprocess.

2. **Auto-dream** — A shipped (but officially undocumented) memory consolidation feature in Claude Code. It runs as a subagent between sessions, performing a 4-phase cleanup of auto-memory files. It is in gradual rollout behind a server-side feature flag (`tengu_onyx_plover`). The `/memory` UI references it, but the manual `/dream` command is not yet functional for all users (GitHub issues #38426, #39135).

### Auto-dream: 4-Stage Consolidation Cycle

| Phase | Name | What it does |
|-------|------|-------------|
| 1 | **Orient** | Scans existing memory directory, reads MEMORY.md, maps current knowledge structure |
| 2 | **Collect** | Gathers signal from recent sessions — user corrections, explicit save commands, recurring patterns, architectural decisions |
| 3 | **Consolidate** | Converts relative dates to absolute, removes contradicted facts, deletes stale entries (e.g., references to deleted files), merges overlapping entries |
| 4 | **Prune** | Updates MEMORY.md index to stay under 200-line / 25KB startup threshold, removes pointers to obsolete topic files |

**Activation conditions** (both must be met):
- 24 hours since last consolidation
- 5+ sessions since last consolidation

### Comparison: Auto-dream vs Borges Memory Extraction

| Dimension | Auto-dream (Claude Code) | Borges (dev-team) |
|-----------|------------------------|-------------------|
| **Trigger** | Automatic (24h + 5 sessions) | Manual (end of every `/dev-team:task`, `/review`, `/audit`, `/retro`) |
| **Scope** | Machine-local auto-memory (`~/.claude/projects/<project>/memory/`) | In-repo shared memory (`.claude/rules/dev-team-learnings.md` + `.claude/agent-memory/`) |
| **Visibility** | Single developer, single machine | Team-wide via version control |
| **Input** | Recent session transcripts (targeted search) | Classified findings from review agents, implementation decisions, human overrules |
| **Output** | Cleaned MEMORY.md + topic files | Structured entries with type/source/tags/outcome/last-verified fields |
| **Consolidation** | Orient → Collect → Consolidate → Prune (4 phases) | Extract → Evolve → Learnings → Audit → Decay → Coherence (6 phases) |
| **Date handling** | Converts relative to absolute dates | Entries include `Last-verified` dates; Borges flags >30 days stale, archives >90 days |
| **Contradiction resolution** | Deletes contradicted facts silently | New entries trigger re-evaluation; 3+ overrules generate calibration rules |
| **Cross-agent** | No (single-user, single-agent) | Yes (Borges has full cross-agent visibility, checks coherence) |
| **Structured extraction** | No (free-form topic files) | Yes (DEFECT/RISK/SUGGESTION/OVERRULED/PATTERN/DECISION taxonomy) |
| **Discoverability filter** | No explicit filter | "Can an agent learn this by reading code?" — skips redundant entries |
| **Memory evolution** | Simple prune/merge | Duplicates merged, contradictions superseded, overrule patterns detected |

### KAIROS: Impact Assessment

KAIROS itself is **not a near-term concern**. Key facts:

1. **Unreleased**: Gated behind compile-time flags set to `false` in external builds. No official announcement, no documentation, no changelog entry.
2. **Daemon mode**: KAIROS is primarily an always-on background agent (proactive actions, tick loop, sleep/wake cycles). Memory consolidation (`/dream`) is one subsystem, not the core feature.
3. **No team memory**: KAIROS operates on machine-local auto-memory. It has no concept of shared team memory, agent-specific calibration, or cross-agent coherence.
4. **Auto-dream is the relevant piece**: The 4-phase consolidation is already shipping independently of the KAIROS daemon. It targets the same machine-local `~/.claude/projects/` memory.

### Team Memory Paths

Auto-dream operates exclusively on machine-local auto-memory (`~/.claude/projects/<project>/memory/`). It does **not** touch:
- `.claude/rules/` files (loaded as context, not managed by auto-dream)
- In-repo CLAUDE.md files
- Any version-controlled memory files

This means auto-dream cannot supersede `.claude/rules/dev-team-learnings.md` because it operates in a completely different scope. Dev-team's Tier 1 shared memory is version-controlled and team-visible; auto-dream's scope is machine-local and single-developer.

### autoDream vs /dev-team:retro

| Aspect | autoDream | /dev-team:retro |
|--------|-----------|-----------------|
| **Purpose** | Clean stale machine-local memory | Audit knowledge base health across shared + agent memory |
| **Trigger** | Automatic (time + session gate) | Manual invocation |
| **Scope** | `~/.claude/projects/` (personal) | `.claude/rules/`, `.claude/agent-memory/`, `docs/adr/` (team) |
| **Cross-agent** | No | Yes (Borges reads all agent memories) |
| **Structured output** | No | Yes (calibration metrics, archive recommendations) |
| **Version controlled** | No | Yes |

They are complementary, not competing. autoDream cleans personal notes; retro audits team knowledge.

### Recommendation: Maintain Independence

**Do not integrate with or migrate to KAIROS/auto-dream.** Maintain the current two-tier architecture.

**Rationale:**

1. **Different scopes**: Auto-dream operates on machine-local memory. Dev-team's value is in *shared, version-controlled* memory visible to all team members and agents. These are fundamentally different concerns.

2. **Structured vs unstructured**: Borges produces structured entries (type, source, tags, outcome, last-verified) that enable machine-readable queries, temporal decay, and calibration rules. Auto-dream produces free-form markdown topic files with no schema.

3. **Cross-agent coherence**: Dev-team's multi-agent architecture requires coherence checking across agent memories. Auto-dream has no concept of multiple agents or cross-agent visibility.

4. **Adversarial extraction**: Borges extracts from classified findings (DEFECT, RISK, SUGGESTION) produced by the adversarial review loop. Auto-dream extracts from session transcripts. The adversarial signal is higher quality.

5. **KAIROS is unreleased**: Building integration with an unreleased feature behind compile-time flags would repeat the mistake from v2.0 (MCP enforcement server built on unverified claims, removed in v2.0.1).

**However, acknowledge the overlap:**

- Auto-dream's date normalization (relative → absolute) is something Borges already does. No gap.
- Auto-dream's contradiction detection is simpler but automatic. Borges requires explicit invocation. Consider whether a lightweight automatic check could supplement Borges.
- The `/dream` command (when it ships) could be useful as a personal memory hygiene tool for individual developers. It does not replace team-level memory management.

### Evidence

| Claim | Source URL | Verified |
|-------|-----------|----------|
| Auto-memory is machine-local at `~/.claude/projects/<project>/memory/` | [Official docs: memory](https://code.claude.com/docs/en/memory) | yes |
| First 200 lines / 25KB of MEMORY.md loaded at session start | [Official docs: memory](https://code.claude.com/docs/en/memory) | yes |
| Auto-memory requires v2.1.59+ | [Official docs: memory](https://code.claude.com/docs/en/memory) | yes |
| `.claude/rules/` files loaded automatically by all agents including subagents | [Official docs: memory](https://code.claude.com/docs/en/memory) | yes |
| KAIROS is unreleased, gated behind compile-time flags | [CodePointer: Architecture of KAIROS](https://codepointer.substack.com/p/claude-code-architecture-of-kairos) | yes (third-party analysis of leaked source) |
| KAIROS has 15-second blocking budget, tick loop, append-only logs | [CodePointer: Architecture of KAIROS](https://codepointer.substack.com/p/claude-code-architecture-of-kairos) | yes (third-party analysis of leaked source) |
| Auto-dream is in gradual rollout behind feature flag | [claudefast: Auto Dream](https://claudefa.st/blog/guide/mechanics/auto-dream) | yes (third-party, corroborated by GitHub issues) |
| Auto-dream 4-phase cycle: Orient, Collect, Consolidate, Prune | [claudefast: Auto Dream](https://claudefa.st/blog/guide/mechanics/auto-dream) | yes (third-party, consistent across multiple sources) |
| Auto-dream activation: 24h + 5 sessions dual gate | [claudefast: Auto Dream](https://claudefa.st/blog/guide/mechanics/auto-dream) | yes (third-party) |
| `/dream` command not functional for all users | [GitHub #38426](https://github.com/anthropics/claude-code/issues/38426), [GitHub #39135](https://github.com/anthropics/claude-code/issues/39135) | yes |
| Auto-dream NOT mentioned in official changelog through v2.1.91 | [Official changelog](https://code.claude.com/docs/en/changelog) | yes |
| KAIROS NOT mentioned in official docs or changelog | [Official changelog](https://code.claude.com/docs/en/changelog) | yes |
| Auto-dream does not touch `.claude/rules/` or in-repo files | UNVERIFIED — inferred from scope (machine-local auto-memory only). No official docs confirm or deny. | no |
| Auto-dream's consolidation handles contradiction resolution | [claudefast: Auto Dream](https://claudefa.st/blog/guide/mechanics/auto-dream) | yes (third-party) |

**Important caveat on evidence quality**: KAIROS claims are sourced from third-party analysis of leaked source code, not official documentation. Anthropic has not confirmed or documented KAIROS. Auto-dream claims are sourced from third-party guides corroborated by observable behavior (GitHub issues, `/memory` UI). Neither feature appears in official documentation or changelogs as of v2.1.91 (2026-04-02).

### Known Issues / Caveats

1. **Auto-dream scope may expand**: If Anthropic ships team-scoped auto-dream (consolidating version-controlled memory), the independence recommendation would need revisiting.
2. **KAIROS could ship at any time**: The source code shows it is fully built but gated. An official launch would require re-evaluation.
3. **`/dream` is broken**: The manual command is referenced in `/memory` UI but returns "Unknown skill" for many users. A third-party `claude-dream` plugin exists as a workaround.
4. **No official docs**: Both features are undocumented. Behavior may change without notice.
5. **Leaked source claims**: KAIROS architecture details come from the March 2026 npm source map leak. These are snapshots of implementation at a point in time, not API contracts.

### Confidence Level

**Medium**

- High confidence on auto-dream's existence and basic behavior (multiple independent confirmations, observable in `/memory` UI)
- Medium confidence on KAIROS architecture (single primary source: leaked source analysis)
- Low confidence on future direction (no official roadmap or documentation)

Would increase to High with: official Anthropic documentation of auto-dream, official KAIROS announcement, or confirmation that auto-dream scope will remain machine-local.

### Recommended Actions

- **Title**: Document auto-dream awareness in dev-team memory architecture docs
  **Severity**: P2
  **Files affected**: `templates/CLAUDE.md` (memory architecture section)
  **Scope**: S
  **Rationale**: Users should understand that Claude Code's auto-dream operates on machine-local memory and does not replace dev-team's shared memory tiers. A brief note prevents confusion.

- **Title**: Monitor KAIROS/auto-dream for scope expansion to team memory
  **Severity**: P2
  **Files affected**: None (monitoring task)
  **Scope**: S
  **Rationale**: If auto-dream gains the ability to consolidate version-controlled files, dev-team would need to either integrate with it or protect its memory files from auto-dream modification. Watch official changelog and docs.

- **Title**: Evaluate `/dream` as recommended skill for personal memory hygiene
  **Severity**: P2
  **Files affected**: `templates/skills/skill-recommendations.json` (if it exists)
  **Scope**: S
  **Rationale**: Once `/dream` ships reliably, it could complement Borges by handling individual developer memory cleanup. Low priority until the command works consistently.
