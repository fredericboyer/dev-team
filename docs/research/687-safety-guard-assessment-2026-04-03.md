# Research Brief: Safety-Guard Hook Justification vs Platform Sandbox

**Date**: 2026-04-03
**Issue**: #687
**Researcher**: Turing

---

## Question

Claude Code's OS-level sandbox (Seatbelt/bubblewrap) and auto-mode classifier may cover many patterns the safety-guard hook currently blocks. The safety guard is explicitly labeled "NOT a security boundary" -- it catches foot-guns the platform allows. Should it be removed, slimmed, or kept?

---

## 1. Safety-Guard Blocked Patterns Inventory

The hook (`templates/hooks/dev-team-safety-guard.js`) blocks 8 patterns across 5 categories:

| # | Pattern | Category | What it catches |
|---|---------|----------|-----------------|
| 1 | `rm -r[f] ... /` | Filesystem destruction | Recursive delete on root path |
| 2 | `rm -r[f] ... ~/` | Filesystem destruction | Recursive delete on home directory |
| 3 | `git push --force ... main/master` | Git semantics | Force push to main (arg order 1) |
| 4 | `git push ... main/master --force` | Git semantics | Force push to main (arg order 2) |
| 5 | `DROP TABLE/DATABASE` | Database destruction | SQL destructive operations |
| 6 | `chmod 777` | Permission misconfiguration | World-writable permissions |
| 7 | `curl ... \| sh/bash/zsh` | Remote code execution | Piping curl output to shell |
| 8 | `wget ... \| sh/bash/zsh` | Remote code execution | Piping wget output to shell |

---

## 2. Platform Defense Layers

Claude Code has four defense layers relevant to these patterns:

### 2.1 OS-Level Sandbox (Seatbelt/bubblewrap)

The sandbox restricts **filesystem and network access** for Bash commands at the OS level:

- **Filesystem**: By default, write access is limited to the current working directory and subdirectories. Cannot modify `~/.bashrc`, `/bin/`, or files outside the project. Configurable via `sandbox.filesystem.allowWrite`.
- **Network**: Domain-based restriction via proxy. Only explicitly allowed domains can be reached. All subprocess traffic routes through the proxy.
- **Inheritance**: All child processes inherit sandbox restrictions.
- **Scope**: Applies only to Bash commands and their child processes. Does NOT restrict Read, Edit, Write, or WebFetch tools.

**Key limitation**: The sandbox controls *where* commands can read/write and *which hosts* they can reach. It does NOT inspect command semantics -- it cannot distinguish `git push --force main` from `git push feature-branch`, or `DROP TABLE` from `SELECT *`.

### 2.2 Auto-Mode Classifier

A background classifier model (Sonnet 4.6) evaluates each action before execution:

**Blocked by default** (relevant subset):
- Downloading and executing code (`curl | bash`)
- Destructive source control operations (force push, pushing to `main`)
- Irreversibly destroying files that existed before the session started
- Production deploys and migrations
- Mass deletion on cloud storage

**Key limitation**: Auto mode is a **research preview**, requires Team/Enterprise/API plan, requires Sonnet 4.6 or Opus 4.6, and must be explicitly enabled. It is NOT available by default. Most users run in `default` or `acceptEdits` mode.

### 2.3 Permission System

Tool-level allow/ask/deny rules evaluated in deny > ask > allow order:

- `Bash` commands require user approval by default (in `default` mode)
- `curl` and `wget` are on the **command blocklist** by default
- Permission rules match tool names and argument patterns, not command semantics
- Users can allowlist commands with "Yes, don't ask again" -- creating persistent allow rules

**Key limitation**: Permission rules are pattern-based (`Bash(git push *)`). Users who allowlist `Bash(git *)` or `Bash(git push *)` bypass any protection against force push. The safety guard catches this because it fires before permission evaluation.

### 2.4 Claude's System Prompt

The system prompt instructs Claude to:
- Never force push to main/master without explicit user request
- Consider reversibility and blast radius before acting
- Confirm destructive operations

**Key limitation**: Prompt-level instructions are advisory. They can be overridden by prompt injection or user instructions. They are not enforcement.

---

## 3. Per-Pattern Coverage Analysis

| # | Pattern | Sandbox blocks? | Auto-mode blocks? | Permissions block? | System prompt warns? | Safety guard needed? |
|---|---------|----------------|-------------------|-------------------|---------------------|---------------------|
| 1 | `rm -rf /` | **PARTIAL** -- sandbox limits write to CWD, so `rm -rf /` would fail for most paths. But if CWD is `/`, it could delete project files | **YES** -- "irreversibly destroying files" | **PARTIAL** -- requires user approval in default mode, but allowlisted `Bash(rm *)` bypasses | YES | **YES** -- last-resort catch for allowlisted users and sandbox edge cases |
| 2 | `rm -rf ~/` | **YES** -- sandbox denies writes outside CWD by default | **YES** -- "irreversibly destroying files" | **PARTIAL** -- same as above | YES | **MARGINAL** -- redundant with sandbox when sandbox is enabled |
| 3-4 | `git push --force main` | **NO** -- git operations are network+filesystem, both allowed for the repo remote | **YES** -- "destructive source control operations like force push" | **NO** -- not blocked by default rules | YES | **YES** -- only enforcement layer when auto mode is not enabled |
| 5 | `DROP TABLE/DATABASE` | **NO** -- sandbox doesn't inspect SQL semantics; if DB is on an allowed host, the command runs | **PARTIAL** -- "production deploys and migrations" may catch some, but classifier is context-dependent | **NO** -- not blocked by default rules | **NO** -- not specifically mentioned | **YES** -- unique coverage; no other layer blocks this |
| 6 | `chmod 777` | **PARTIAL** -- only effective within CWD (sandbox restricts writes outside CWD) | **NO** -- not in default block list | **NO** -- not blocked by default rules | **NO** -- not specifically mentioned | **YES** -- unique coverage within project directory |
| 7 | `curl \| sh` | **PARTIAL** -- `curl` is on command blocklist; sandbox blocks unknown network hosts | **YES** -- "downloading and executing code, like `curl \| bash`" | **YES** -- `curl` and `wget` blocked by default command blocklist | YES | **MARGINAL** -- triple-covered when all layers active |
| 8 | `wget \| sh` | **PARTIAL** -- same as curl | **YES** -- same as curl | **YES** -- same as curl | YES | **MARGINAL** -- triple-covered when all layers active |

---

## 4. Defense-in-Depth Analysis

### 4.1 Layer availability matrix

Not all defense layers are active for all users:

| Layer | Always active? | Requires setup? | Can be bypassed? |
|-------|---------------|-----------------|-----------------|
| Safety guard hook | YES (if dev-team installed) | No -- installed by `dev-team init` | `--skip-review` (escape hatch) |
| Sandbox | **NO** -- must be enabled via `/sandbox` | Yes | `dangerouslyDisableSandbox` parameter |
| Auto-mode classifier | **NO** -- research preview, requires plan + model + admin enablement | Yes (significant) | Falls back after 3 blocks |
| Permission prompts | YES in default mode | No | Allowlisted commands bypass |
| System prompt | YES | No | Advisory only, not enforcement |

**Critical finding**: The sandbox is not enabled by default. Auto mode requires significant setup. For the majority of users running in `default` or `acceptEdits` mode without sandbox enabled, the safety guard and permission prompts are the **only** enforcement layers.

### 4.2 Allowlist bypass scenario

When a user allowlists `Bash(git *)` (common for productivity), the permission system no longer prompts for `git push --force main`. The safety guard is the only remaining layer that catches this. The sandbox does not block git operations to allowed remotes.

### 4.3 Unique coverage

Patterns where the safety guard provides **sole enforcement** (no other layer blocks reliably):

1. **`git push --force main/master`** -- when auto mode is not enabled (majority of users)
2. **`DROP TABLE/DATABASE`** -- no other layer inspects SQL semantics
3. **`chmod 777`** -- no other layer blocks within CWD

---

## 5. Assessment

### 5.1 Verdict: KEEP, with minor slimming

The safety guard hook is **justified** and should be **retained**. The analysis reveals:

1. **It is the only always-on enforcement layer.** The sandbox must be enabled. Auto mode requires plan + model + admin opt-in. Permission prompts can be allowlisted away. The safety guard fires on every Bash command unconditionally (PreToolUse).

2. **It provides unique coverage for 3 of 8 patterns** -- force push to main (when auto mode off), DROP TABLE, and chmod 777 have no reliable alternative enforcement.

3. **Cost is negligible.** The hook is a synchronous regex check on every Bash command. No network calls, no AI inference, no latency. The maintenance burden is minimal -- the patterns are stable and do not require updating.

4. **It follows defense-in-depth correctly.** Even for patterns where the sandbox or auto mode also blocks, having an independent layer at a different point in the evaluation pipeline (PreToolUse, before permission evaluation) is textbook defense-in-depth. The hook's own comment acknowledges this: "NOT a security boundary" -- it's a safety net.

### 5.2 Potential slimming

Two patterns are **triple-covered** when all layers are active:

- `curl | sh/bash/zsh` (patterns 7-8): blocked by command blocklist + sandbox network isolation + auto-mode classifier
- `wget | sh/bash/zsh` (patterns 7-8): same triple coverage

However, removing these would save exactly zero runtime cost (they're regex checks in a loop) and would remove a defense layer for users who have allowlisted `curl`/`wget` via permissions. **Recommend keeping all 8 patterns.**

### 5.3 Patterns worth ADDING

The analysis reveals gaps in current coverage:

| Candidate pattern | Rationale | Platform coverage |
|-------------------|-----------|-------------------|
| `git reset --hard` | Destroys uncommitted work; system prompt warns but doesn't enforce | None when allowlisted |
| `git clean -fd` | Removes untracked files irreversibly | None when allowlisted |
| `git branch -D` | Deletes branches without merge check | None when allowlisted |
| `truncate` / `> file` | Empties files silently | Sandbox limits to CWD |

These are out of scope for this assessment but could be tracked as a follow-up enhancement issue.

---

## 6. ADR Recommendation

**No new ADR needed.** The conclusion is "keep as-is" -- no architectural change is warranted. The existing hook design is sound and the overlap with platform capabilities is intentional defense-in-depth, not redundancy.

If the team later decides to slim the hook (removing curl/wget patterns), that would be a minor change not warranting an ADR.

---

## Evidence

| Claim | Source | Verified |
|-------|--------|----------|
| Sandbox restricts filesystem writes to CWD by default | https://code.claude.com/docs/en/sandboxing | YES |
| Sandbox uses Seatbelt (macOS) and bubblewrap (Linux) at OS level | https://code.claude.com/docs/en/sandboxing | YES |
| Sandbox must be explicitly enabled via `/sandbox` | https://code.claude.com/docs/en/sandboxing | YES |
| Sandbox does not inspect command semantics (git, SQL) | https://code.claude.com/docs/en/sandboxing (scope: "filesystem and network isolation") | YES |
| Auto mode blocks force push, curl\|bash, file destruction by default | https://code.claude.com/docs/en/permission-modes | YES |
| Auto mode is research preview, requires Team/Enterprise/API + Sonnet 4.6/Opus 4.6 | https://code.claude.com/docs/en/permission-modes | YES |
| Auto mode must be admin-enabled on Team/Enterprise | https://code.claude.com/docs/en/permission-modes | YES |
| `curl` and `wget` are on command blocklist by default | https://code.claude.com/docs/en/security | YES |
| PreToolUse hooks fire before permission evaluation | https://code.claude.com/docs/en/permissions | YES |
| PreToolUse exit code 2 blocks before permission rules are evaluated | https://code.claude.com/docs/en/permissions | YES |
| Permission rules support wildcard allowlisting (`Bash(git *)`) | https://code.claude.com/docs/en/permissions | YES |
| System prompt instructs against force push to main/master | Claude Code system prompt (observed in session) | YES |
| Safety guard hook says "NOT a security boundary" | `templates/hooks/dev-team-safety-guard.js` line 9 | YES |
| Research #662 previously flagged safety guard overlap as P2 | `docs/research/662-platform-capabilities-2026-04-03.md` section 2.3 | YES |

---

## Confidence Level

**High.** All claims verified against official Claude Code documentation. The per-pattern analysis is deterministic (regex patterns vs documented platform behavior). The assessment that most users do not have sandbox or auto mode enabled is based on both being opt-in features requiring explicit setup.

Would increase to **Very High** with:
- Telemetry data on what percentage of dev-team users have sandbox enabled
- Testing auto-mode classifier behavior on each specific pattern
- Confirmation that `curl`/`wget` blocklist applies even in `bypassPermissions` mode
