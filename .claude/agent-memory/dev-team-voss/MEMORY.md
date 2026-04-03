# Agent Memory: Voss (Backend Engineer)
<!-- First 200 lines are loaded into agent context. Keep concise. -->

## Project Conventions

### [2026-03-25] CLI tool — no database, no API server, no ORM
- **Type**: PATTERN [verified]
- **Source**: package.json + src/ analysis
- **Tags**: architecture, data-layer, backend
- **Outcome**: verified
- **Last-verified**: 2026-03-25
- **Context**: dev-team is a CLI installer (npx dev-team init). No database, no HTTP server, no REST/GraphQL API. Data model is file-based: reads package.json/tsconfig for project scanning, writes template files to target projects. Voss role here focuses on file I/O patterns, config parsing, and data modeling for scan/init logic.

### [2026-03-25] Config via JSON files — .dev-team/config.json in target projects
- **Type**: PATTERN [verified]
- **Source**: src/scan.ts + src/init.ts analysis
- **Tags**: configuration, data-model
- **Outcome**: verified
- **Last-verified**: 2026-03-25
- **Context**: Project detection via scan.ts reads package.json, tsconfig.json, pyproject.toml to auto-detect runtime. Config stored as JSON. No environment variables for configuration (CLI tool, not a service).

## Patterns to Watch For

### [2026-03-26] mergeSettings() must track Set state after push — dedup bug in src/files.ts
- **Type**: DEFECT [fixed]
- **Source**: PR #367 (fix/364), Copilot finding
- **Tags**: merge-logic, settings, dedup
- **Outcome**: fixed
- **Last-verified**: 2026-03-26
- **Context**: mergeSettings() pushed new commands into the array but did not update the Set used for dedup tracking. Also required null-safe normalization for hooks (` ?? []`) and a consolidation pass for duplicate matcher blocks. Three related DEFECTs fixed together.

### [2026-03-26] Rules-based context migration — init.ts and update.ts install to .claude/rules/
- **Type**: DECISION
- **Source**: Issue #406
- **Tags**: architecture, file-layout, migration
- **Outcome**: accepted
- **Last-verified**: 2026-03-26
- **Context**: Shared context files (learnings.md, process.md) moved from .dev-team/ to .claude/rules/ for automatic agent context loading. update.ts migration uses fs.renameSync for atomic move from old to new path. init.ts creates .claude/rules/ directory via copyFile (which mkdirSync's parent). Key pattern: migration checks old path exists AND new path missing before moving — prevents data loss if both exist.

### [2026-03-26] "AGENTS.md Verdict" — discoverable knowledge doesn't belong in templates
- **Type**: DECISION [verified]
- **Source**: Issue #405, v1.6.0 design principles
- **Tags**: architecture, templates, discoverability
- **Outcome**: accepted
- **Last-verified**: 2026-03-26
- **Context**: User insight that reshaped product direction: "if the agent can discover it from code, delete it." Templates should only contain what agents can't discover — tool preferences, legacy traps, process decisions. This filters what goes into agent definitions, hooks, and shared context.

### [2026-03-27] lstatSync guards — assertNotSymlink pattern for file operations
- **Type**: PATTERN [implemented]
- **Source**: Issue #433
- **Tags**: security, symlink, file-operations
- **Outcome**: fixed
- **Last-verified**: 2026-03-27
- **Context**: Added assertNotSymlink() helper to files.ts that uses lstatSync to reject symlinks before file operations. Applied to copyFile() (guards both src and dest) and all four renameSync calls in update.ts (legacy memory cleanup, migration memory rename, learnings migration, process migration). The ensureSymlink() function intentionally creates symlinks and was NOT guarded. Key insight: the linter (oxfmt) auto-removes unused imports, so the import must be added in the same edit pass as its usage — otherwise the linter strips it between edits.

### [2026-03-27] v1.7.0: ensureSymlink extracted to files.ts (#441)
- **Type**: DECISION [verified]
- **Source**: PR #454 (#441)
- **Tags**: deduplication, files, symlink
- **Outcome**: fixed
- **Last-verified**: 2026-03-27
- **Context**: ~30 lines of identical symlink creation with Windows junction fallback existed in both init.ts and update.ts. Extracted to ensureSymlink() in files.ts. ensureSymlink intentionally creates symlinks and was NOT guarded by assertNotSymlink. Removed unused fs import from init.ts.

### [2026-03-29] v1.8.0: assertNoSymlinkInPath — ancestor directory traversal
- **Type**: PATTERN [new]
- **Source**: #475, PR #475
- **Tags**: security, symlink, file-operations, defense-in-depth
- **Outcome**: fixed
- **Last-verified**: 2026-03-29
- **Context**: Extends the v1.7.0 assertNotSymlink leaf check. Walks from target to root checking each ancestor directory with lstatSync. realpathSync resolves system-level symlinks before the walk — design tradeoff documented (can resolve away attacker symlinks at deepest level). Applied alongside assertNotSymlink in file operation guards.

### [2026-04-02] v3.3.0: safe-regex nested quantifier fix — bare { handling and O(n*g^2) accepted
- **Type**: PATTERN [verified]
- **Source**: #663, PR fix/663-safe-regex-nested
- **Tags**: security, regex, safe-regex, boundary-condition
- **Outcome**: fixed
- **Last-verified**: 2026-04-02
- **Context**: safe-regex.js fixed to handle nested quantifiers involving bare `{` (e.g., `a{2}{3}`). Review found `?` quantifier not handled and O(n*g^2) worst case — both accepted as the 1024 char limit mitigates the complexity. Char class `]` edge case also accepted as advisory.

### [2026-04-02] v3.3.0: worktree-create path traversal hardening (#670)
- **Type**: PATTERN [verified]
- **Source**: #670, PR fix/670-worktree-path-traversal
- **Tags**: security, worktree, path-traversal, defense-in-depth
- **Outcome**: fixed
- **Last-verified**: 2026-04-02
- **Context**: worktree-create.js hardened with character validation for path traversal. Null byte not in character check (accepted — defense-in-depth catches it). Symlink bypass and err.status null deferred to #683.

## Calibration Log
<!-- Challenges accepted/overruled — tunes adversarial intensity over time -->
