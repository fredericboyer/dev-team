# ADR-026: Agent progress reporting and heartbeat protocol
Date: 2026-03-25
Status: accepted

## Context
When agents run as background subagents (via Agent tool or agent teams), the main conversation loop and the human have no visibility into what phase an agent is in, whether it is stuck, or whether it needs human intervention. Long-running agents (Conway doing a release, Drucker orchestrating a multi-issue batch) can run for 10+ minutes with zero feedback. The human is left guessing whether the agent is working, blocked, or crashed.

ADR-013 established the lesson that coordination files can cause orphaned-file bugs when not properly cleaned up. Any file-based status mechanism must account for this.

## Decision
Establish a lightweight, file-based progress reporting protocol for background agents:

**Status file location**: `.dev-team/agent-status/` directory, gitignored. Implementations MUST ensure this directory exists before writing status files (e.g., `mkdir -p .dev-team/agent-status/`).

**Format**: JSON files with the schema:
```json
{
  "agent": "dev-team-conway",
  "task": "Release v1.1.0",
  "phase": "Drafting changelog",
  "phase_number": 2,
  "total_phases": 5,
  "started": "2026-03-25T10:00:00Z",
  "updated": "2026-03-25T10:02:30Z",
  "action_required": false
}
```

When escalation is needed, the agent sets `action_required: true` and adds a `reason` field:
```json
{
  "agent": "dev-team-conway",
  "task": "Release v1.1.0",
  "phase": "CI verification",
  "phase_number": 5,
  "total_phases": 5,
  "started": "2026-03-25T10:00:00Z",
  "updated": "2026-03-25T10:08:00Z",
  "action_required": true,
  "reason": "CI failing on release branch after 2 retries — test-integration job times out"
}
```

**Naming**: `{agent}.json` — one file per agent, overwritten at each phase boundary. This avoids orphan accumulation (lesson from ADR-013's tracking file). A crashed agent leaves at most one file, not N files per phase.

**Cleanup protocol**:
1. Each agent deletes its own status file on successful completion.
2. Borges, who runs at the end of every task, cleans up any remaining status files in `.dev-team/agent-status/` left by agents that crashed or failed to clean up. This is the orphan-prevention safety net.

**Escalation**: No separate sentinel file. The `action_required` boolean in the status file itself serves as the escalation signal. Drucker (or the main loop) checks status files and surfaces `action_required: true` entries immediately.

**Hook wiring**: No new hook is needed. Progress reporting is a prompt-level convention — agents emit status as part of their agent definition instructions. The main loop or human checks status on demand via `cat .dev-team/agent-status/*.json`.

**Console markers**: In addition to file-based status, agents emit structured console markers (e.g., `[Conway] Phase 2/5: Drafting changelog...`) for inline visibility in conversation output. These are ephemeral and not persisted.

## Consequences
- The human and main loop can check agent progress at any time without interrupting the agent
- Escalation is explicit and structured — no more silent blocking
- The overwrite-per-agent naming scheme prevents orphan file accumulation (ADR-013 lesson applied)
- Borges cleanup provides a safety net for crashed agents
- No new hooks or infrastructure required — purely prompt-based convention
- Status files are gitignored, so they never pollute the repository
- Agents that do not adopt the convention still work — progress reporting is additive, not gating
