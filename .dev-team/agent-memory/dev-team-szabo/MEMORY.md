# Agent Memory: Szabo (Security Auditor)
<!-- First 200 lines are loaded into agent context. Keep concise. -->

## Trust Boundaries Mapped

### [2026-03-25] CLI tool with no auth, no user data, no network services
- **Type**: PATTERN [verified]
- **Source**: package.json + src/ analysis
- **Tags**: trust-boundary, attack-surface
- **Outcome**: verified
- **Last-verified**: 2026-03-26
- **Context**: dev-team is a CLI installer that copies template files into target projects. No authentication system, no user data handling, no database, no HTTP server. Primary security concern is file system operations and template injection.

### [2026-03-25] readFile() returns null for both missing and permission-denied files
- **Type**: RISK [verified]
- **Source**: .claude/rules/dev-team-learnings.md (known tech debt)
- **Tags**: error-handling, file-system, tech-debt
- **Outcome**: verified
- **Last-verified**: 2026-03-26
- **Context**: src/files.ts readFile distinguishes ENOENT (missing file) from EACCES/EPERM (permission errors) and logs a warning on permission issues, but still returns null in both cases, which can mask security-relevant permission errors in target project file operations.

### [2026-03-25] Hook scripts execute in target project context
- **Type**: PATTERN [verified]
- **Source**: templates/hooks/ analysis
- **Tags**: code-execution, hooks, trust-boundary
- **Outcome**: verified
- **Last-verified**: 2026-03-26
- **Context**: Hooks shipped as plain JS run in the target project's environment. They spawn subprocesses and read/write files. Any command injection in hook logic would execute with the user's permissions.

## Known Attack Surfaces

### [2026-03-26] ReDoS risk in user-controlled regex patterns
- **Type**: RISK [fixed]
- **Source**: Codebase audit (S1/S2), Issue #434, PR #455
- **Tags**: regex, redos, input-validation, security
- **Outcome**: fixed — safe-regex.js shared module added
- **Last-verified**: 2026-03-27
- **Context**: Fixed: `templates/hooks/lib/safe-regex.js` validates user-supplied patterns (nested quantifiers, quantified backreferences, >1024 char rejection). Applied to watch-list and pre-commit-gate hooks. Agent-patterns.json left unguarded (developer-authored, different trust boundary).

### [2026-03-26] Symlink-following in file operations — path traversal risk
- **Type**: RISK [fixed]
- **Source**: Codebase audit (S3/S4), Issue #433, PR #454
- **Tags**: symlink, path-traversal, file-system, security
- **Outcome**: fixed — assertNotSymlink() guard added
- **Last-verified**: 2026-03-27
- **Context**: Fixed: assertNotSymlink() in files.ts uses lstatSync to reject symlinks before file operations. Applied to copyFile (guards both src and dest) and all renameSync calls in update.ts. Residual TOCTOU gap accepted as inherent to POSIX.


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

### [2026-03-26] Platform detection defaults to github — no fallback risk
- **Type**: RISK [fixed]
- **Source**: PR #371 (feat/358), Copilot finding
- **Tags**: platform, config, security
- **Outcome**: fixed
- **Last-verified**: 2026-03-26
- **Context**: Skills now detect platform from config (default: github). When platform field is absent (pre-v1.5 installs), skills default to github rather than failing. update.ts backfills the platform field on upgrade.
