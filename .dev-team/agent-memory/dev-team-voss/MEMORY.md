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

## Calibration Log
<!-- Challenges accepted/overruled — tunes adversarial intensity over time -->
