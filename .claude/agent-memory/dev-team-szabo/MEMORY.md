# Agent Memory: Szabo (Security Auditor)
<!-- First 200 lines are loaded into agent context. Keep concise. -->

## Trust Boundaries Mapped

### [2026-03-25] CLI tool with no auth, no user data, no network services
- **Type**: PATTERN [verified]
- **Source**: package.json + src/ analysis
- **Tags**: trust-boundary, attack-surface
- **Outcome**: verified
- **Last-verified**: 2026-03-29
- **Context**: dev-team is a CLI installer that copies template files into target projects. No authentication system, no user data handling, no database, no HTTP server. Primary security concern is file system operations and template injection.

### [2026-03-29] assertNoSymlinkInPath() — ancestor directory traversal guard
- **Type**: PATTERN [new]
- **Source**: #475, PR #475
- **Tags**: symlink, path-traversal, file-system, security, defense-in-depth
- **Outcome**: fixed
- **Last-verified**: 2026-03-29
- **Context**: Extends assertNotSymlink (leaf check) with ancestor-directory traversal. Walks from target to root checking each ancestor with lstatSync. Design tradeoff: realpathSync resolves system-level symlinks first, which can resolve away attacker symlinks at the deepest level — documented and accepted. Applied in update.ts and init.ts file operations.

### [2026-03-29] readFile() permission error masking — FIXED in v1.8.0
- **Type**: RISK [fixed]
- **Source**: #460, PR #478
- **Tags**: error-handling, file-system
- **Outcome**: fixed
- **Last-verified**: 2026-03-29
- **Context**: readFile() now throws on any error other than ENOENT. EACCES/EPERM no longer silently return null.

### [2026-03-25] Hook scripts execute in target project context
- **Type**: PATTERN [verified]
- **Source**: templates/hooks/ analysis
- **Tags**: code-execution, hooks, trust-boundary
- **Outcome**: verified
- **Last-verified**: 2026-03-29
- **Context**: Hooks shipped as plain JS run in the target project's environment. They spawn subprocesses and read/write files. Any command injection in hook logic would execute with the user's permissions.

## Known Attack Surfaces

### [2026-03-26] ReDoS risk in user-controlled regex patterns
- **Type**: RISK [fixed]
- **Source**: Codebase audit (S1/S2), Issue #434, PR #455
- **Tags**: regex, redos, input-validation, security
- **Outcome**: fixed — safe-regex.js shared module added
- **Last-verified**: 2026-04-02
- **Context**: Fixed: `templates/hooks/lib/safe-regex.js` validates user-supplied patterns (nested quantifiers, quantified backreferences, >1024 char rejection). Applied to watch-list and pre-commit-gate hooks. Agent-patterns.json left unguarded (developer-authored, different trust boundary).

### [2026-03-26] Symlink-following in file operations — path traversal risk
- **Type**: RISK [fixed]
- **Source**: Codebase audit (S3/S4), Issue #433, PR #454
- **Tags**: symlink, path-traversal, file-system, security
- **Outcome**: fixed — assertNotSymlink() + assertNoSymlinkInPath() guards added
- **Last-verified**: 2026-03-29
- **Context**: Fixed in two waves: v1.7.0 added assertNotSymlink() leaf check (lstatSync on target). v1.8.0 added assertNoSymlinkInPath() ancestor traversal (walks parent dirs to root). Both applied to copyFile and renameSync calls. Residual TOCTOU gap accepted as inherent to POSIX.


## Calibration Log
<!-- Challenges accepted/overruled — tunes adversarial intensity over time -->

### [2026-03-26] Audit baseline: 12 findings (0 DEFECT, 5 RISK, 2 QUESTION, 5 SUGGESTION)
- **Type**: CALIBRATION
- **Source**: Full codebase audit 2026-03-26
- **Tags**: audit, calibration, baseline
- **Outcome**: all accepted (2 issues for v1.6.1, 9 for v1.7.0)
- **Last-verified**: 2026-03-26
- **Context**: First full security audit. Zero DEFECTs — codebase has no critical security vulnerabilities. Primary themes: input validation (ReDoS), file system hardening (symlink guards), and advisory improvements. CLI trust boundary profile confirmed: no auth, no user data, no network — file system ops are the primary attack surface.

### [2026-03-27] v1.7.0: TOCTOU in assertNotSymlink accepted as inherent POSIX limitation
- **Type**: RISK [accepted]
- **Source**: PR #454 (Chain A, #433)
- **Tags**: symlink, toctou, posix, file-system
- **Outcome**: accepted
- **Last-verified**: 2026-03-27
- **Context**: assertNotSymlink uses lstatSync before the operation — classic TOCTOU gap. Accepted because: check-then-act is inherent to POSIX, exploitability requires local attacker with write access to target dir (already game over), and no atomic alternative exists without OS-specific APIs.

### [2026-03-27] v1.7.0: safeRegex bypass via {n,} quantifiers — fixed
- **Type**: RISK [fixed]
- **Source**: PR #455 (Chain B, #434)
- **Tags**: regex, redos, input-validation, security
- **Outcome**: fixed
- **Last-verified**: 2026-03-27
- **Context**: Initial safeRegex implementation missed `{n,}` quantifier syntax in the nested-quantifier check. Inner character class updated to include `{`. Reinforces: regex validation must cover all quantifier syntaxes, not just `*+?`.

### [2026-03-29] v1.10.0: Clean approve across 4 PRs — no security findings
- **Type**: CALIBRATION
- **Source**: PRs #509/#510/#511/#512
- **Tags**: calibration, security, review
- **Outcome**: clean
- **Last-verified**: 2026-03-29
- **Context**: All 4 retro-derived PRs (#489/#490/#493/#494) approved with no security concerns. Changes were skill definitions, ADR, learnings, and merge timing — no new file system operations or trust boundary changes. Confirms: retro-derived work is typically low-risk from a security perspective.

### [2026-03-29] v1.9.0: Extract skill trust boundary — $ARGUMENTS acceptable
- **Type**: CALIBRATION
- **Source**: PR #492, finding #1
- **Tags**: trust-boundary, skills, arguments
- **Outcome**: ignored (self-answered)
- **Last-verified**: 2026-03-29
- **Context**: Szabo raised $ARGUMENTS trust boundary question for /dev-team:extract skill. Self-answered — skill is invoked only by other orchestration skills (task, review, retro), not by untrusted input. Acceptable trust boundary for skill-to-skill invocation. No action needed.

### [2026-04-02] v3.3.0: safe-regex ? quantifier and complexity accepted as advisory
- **Type**: CALIBRATION
- **Source**: #663, review-680 findings #15-#16
- **Tags**: regex, safe-regex, calibration, security
- **Outcome**: accepted
- **Last-verified**: 2026-04-02
- **Context**: Review found `?` quantifier not in safe-regex check and O(n*g^2) worst-case complexity. Both accepted — 1024 char limit mitigates complexity risk, `?` is non-repeating so not a ReDoS vector. Bare `{` handling was also flagged as subtle — correct behavior confirmed. Reinforces: safe-regex covers the dangerous cases (nested quantifiers), advisory findings on edge cases are appropriate for the trust boundary.

### [2026-04-02] v3.3.0: worktree-create null byte and symlink bypass — deferred to #683
- **Type**: RISK [deferred]
- **Source**: #670, review-678 + Copilot findings
- **Tags**: worktree, path-traversal, symlink, null-byte, security
- **Outcome**: deferred
- **Last-verified**: 2026-04-02
- **Context**: worktree-create.js hardened with character validation, but null byte not in char check and symlink bypass on containment noted. Both deferred to #683 for worktree hook hardening. Defense-in-depth catches null bytes. Symlink bypass is a legitimate concern tracked for follow-up.

### [2026-03-26] Platform detection defaults to github — no fallback risk
- **Type**: RISK [fixed]
- **Source**: PR #371 (feat/358), Copilot finding
- **Tags**: platform, config, security
- **Outcome**: fixed
- **Last-verified**: 2026-03-26
- **Context**: Skills now detect platform from config (default: github). When platform field is absent (pre-v1.5 installs), skills default to github rather than failing. update.ts backfills the platform field on upgrade.

### [2026-03-29] v1.11.0: Semgrep SAST deferred to full enforcement
- **Type**: SUGGESTION [deferred]
- **Source**: PR #552, Szabo finding
- **Tags**: ci, sast, semgrep, security
- **Outcome**: deferred
- **Last-verified**: 2026-03-29
- **Context**: Semgrep SAST added to CI but configured as silent (non-blocking) on failure per Brooks suggestion. Szabo recommended full Semgrep config with custom rules. Deferred — current setup provides visibility without blocking CI. Full enforcement tracked for future hardening pass.

### [2026-03-30] v2.0: Path traversal via adapter name field — FIXED (F-01)
- **Type**: DEFECT [fixed]
- **Source**: PR #569, Szabo finding F-01
- **Tags**: path-traversal, adapters, input-validation, security
- **Outcome**: fixed
- **Last-verified**: 2026-03-30
- **Context**: parseAgentDefinition name field is used to construct file paths in adapters. Unrestricted names like `../../etc/passwd` could write outside target directories. Fixed: regex validation `/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/` added to parseAgentDefinition. Reinforces pattern: all user-facing string-to-path conversions need validation at the parsing boundary.

### [2026-03-30] v2.0: registerAdapter replacement guard — FIXED (F-02)
- **Type**: DEFECT [fixed]
- **Source**: PR #569, Szabo finding F-02
- **Tags**: adapters, registry, security, defense-in-depth
- **Outcome**: fixed
- **Last-verified**: 2026-03-30
- **Context**: registerAdapter allowed replacing built-in adapters with user-registered ones, potentially masking the Claude Code identity transform with a malicious adapter. Fixed: BUILTIN_IDS set prevents replacement of built-in adapters.

### [2026-03-30] v2.0: MCP filePath traversal validation — FIXED (R-02)
- **Type**: RISK [fixed]
- **Source**: PR #572, Szabo finding R-02
- **Tags**: mcp, path-traversal, input-validation, security
- **Outcome**: fixed
- **Last-verified**: 2026-03-30
- **Context**: MCP review_gate tool accepts filePath from MCP client. Without validation, absolute paths or `..` traversals could check files outside the project. Fixed: path.normalize + reject if starts with `..` or is absolute. Same pattern as the adapter name validation (F-01) — validate at the input boundary.
