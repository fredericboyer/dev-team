## Research Brief: OpenClaw Heartbeat Mechanism

### Question
How does OpenClaw's heartbeat mechanism work, and is it applicable to dev-team's agent monitoring needs?

### What is OpenClaw?
OpenClaw is an open-source personal AI assistant (100K+ GitHub stars) that runs on your own devices and connects to messaging channels (WhatsApp, Telegram, Slack, etc.). It uses LLM-backed agents with a gateway architecture for session management and scheduling.

### How the Heartbeat Works

The heartbeat is a **scheduled main-session turn** — a periodic message the system sends to the agent, prompting it to check for anything noteworthy. It is not a liveness probe; it is a proactive task-check mechanism.

**Protocol:**
1. At the configured interval (default: 30 min), the system injects a heartbeat prompt into the agent's session
2. The agent evaluates its `HEARTBEAT.md` checklist (tasks, conditions to monitor)
3. If nothing needs attention: agent replies `HEARTBEAT_OK` — the system strips this and drops the reply silently
4. If something needs attention: agent replies with actionable content, which is delivered to the configured target channel

**Key configuration fields:**
| Field | Purpose | Default |
|-------|---------|---------|
| `every` | Interval (duration string) | `30m` (1h for Anthropic auth) |
| `target` | Where to deliver alerts | `"last"` (last active channel) |
| `isolatedSession` | Fresh session per heartbeat (no history) | `false` |
| `lightContext` | Bootstrap only HEARTBEAT.md | `false` |
| `activeHours` | Time window restriction (`start`, `end`, `timezone`) | unrestricted |
| `ackMaxChars` | Max chars after HEARTBEAT_OK before delivery | `300` |

**Cost optimization:** Full session context costs ~100K tokens/heartbeat. With `isolatedSession: true` + `lightContext: true`, this drops to ~2-5K tokens/run. A cheaper model can be specified via `model` override.

**Scheduling behavior:** If the main queue is busy, the heartbeat is skipped and retried next interval. Outside active hours, heartbeats skip. Empty HEARTBEAT.md (only headers) skips the API call entirely.

### Design Decisions and Trade-offs

1. **Proactive task-check, not liveness probe.** OpenClaw heartbeat answers "does anything need my attention?" — not "is the agent alive?". The agent itself is the one checking, not an external monitor.
2. **Main-session integration.** Heartbeats run in the agent's main session by default, giving full conversation context. This is expensive but allows context-aware decisions.
3. **HEARTBEAT_OK as a null-response protocol.** Simple string matching avoids the cost of delivering empty responses. The `ackMaxChars` threshold handles edge cases where the agent appends minor commentary.
4. **Task-level scheduling within heartbeats.** HEARTBEAT.md supports `tasks:` blocks with individual intervals — only due tasks execute per heartbeat, reducing unnecessary work.

### Applicability to dev-team

**What dev-team needs (from project_agent_heartbeat.md):** Agent heartbeat/progress updates for long-running background work. The orchestrator currently polls agent-status files.

**OpenClaw heartbeat is a different pattern.** It solves "make an idle agent check for work periodically" — not "monitor whether a working agent is alive and making progress." Key differences:

| Concern | OpenClaw Heartbeat | dev-team Need |
|---------|-------------------|---------------|
| Direction | System → Agent ("check for work") | Agent → Orchestrator ("I'm alive, here's progress") |
| Purpose | Proactive task discovery | Liveness + progress reporting |
| Failure mode | Agent doesn't reply → skip, retry next interval | Agent stuck → orchestrator must detect and recover |
| Cost model | Token-heavy (LLM call per heartbeat) | Should be token-free (file write or signal) |

**What IS transferable:**
- **HEARTBEAT_OK as a null-response protocol** — dev-team could adopt a similar "no news is good news" pattern where agents write a status file only when there's something to report, and the orchestrator infers liveness from file timestamps
- **Active hours / skip-when-busy** — useful for rate-limiting orchestrator polling
- **Isolated session for cost control** — if dev-team ever adds periodic agent wake-ups, the isolated session pattern prevents token bloat

**What is NOT transferable:**
- The core mechanism (scheduled LLM turns) is too expensive for agent liveness monitoring
- OpenClaw's "agent checks for work" pattern inverts dev-team's "orchestrator checks on agent" pattern

### Evidence

| Claim | Source URL | Verified |
|-------|-----------|----------|
| Default interval 30 min (1h for Anthropic auth) | https://github.com/openclaw/openclaw/blob/main/docs/gateway/heartbeat.md | yes |
| HEARTBEAT_OK stripped when at start/end of reply | https://github.com/openclaw/openclaw/blob/main/docs/gateway/heartbeat.md | yes |
| isolatedSession reduces ~100K to ~2-5K tokens | https://github.com/openclaw/openclaw/blob/main/docs/gateway/heartbeat.md | yes |
| lightContext loads only HEARTBEAT.md | https://github.com/openclaw/openclaw/blob/main/docs/gateway/heartbeat.md | yes |
| HEARTBEAT.md supports tasks: blocks with individual intervals | https://github.com/openclaw/openclaw/blob/main/docs/gateway/heartbeat.md | yes |
| Busy queue skips heartbeat | https://github.com/openclaw/openclaw/blob/main/docs/gateway/heartbeat.md | yes |
| isolatedSession bug reported (session key reuse) | https://github.com/openclaw/openclaw/issues/56941 | yes |
| OpenClaw 100K+ GitHub stars | https://github.com/openclaw/openclaw | yes |

### Known Issues / Caveats

- **isolatedSession bug (March 2026):** Reported that isolation creates a "new" session but restores from persistent storage using the same session key, negating isolation. Status unclear — may be fixed by now.
- **Token cost at scale:** Even with optimization, each heartbeat is an LLM call. For dev-team's use case (monitoring 4-6 concurrent agents), this would be 4-6 LLM calls per interval — wasteful compared to file-based status checks.
- **Not a liveness probe:** OpenClaw heartbeat cannot detect a crashed agent. If the agent process dies, no heartbeat response occurs, but the system just skips and retries — there is no escalation or recovery mechanism.

### Confidence Level

**High** — Official documentation is comprehensive and verified against the GitHub source. The applicability analysis is straightforward: OpenClaw heartbeat solves a different problem than dev-team's agent monitoring need.

### Recommended Actions

- **Title**: Evaluate file-timestamp liveness detection for agent monitoring
  **Severity**: P2
  **Files affected**: `.dev-team/agent-status/`, orchestrator polling logic
  **Scope**: M
  **Context**: OpenClaw's HEARTBEAT_OK "no news is good news" pattern suggests dev-team could infer agent liveness from status file modification timestamps rather than requiring explicit heartbeat signals. If a status file hasn't been updated in N minutes, the agent is presumed stuck.

- **Title**: Consider null-response protocol for agent status reporting
  **Severity**: P2
  **Files affected**: agent status file format, orchestrator validation loop
  **Scope**: S
  **Context**: Inspired by HEARTBEAT_OK — agents could adopt a convention where writing a status update implicitly signals liveness, and the orchestrator only escalates when updates stop. This avoids a separate heartbeat mechanism entirely.
