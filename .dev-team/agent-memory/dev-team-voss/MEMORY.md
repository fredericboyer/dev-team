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

### [2026-03-25] Zero runtime dependencies — all functionality is self-contained
- **Type**: PATTERN [verified]
- **Source**: package.json analysis
- **Tags**: dependencies, architecture
- **Outcome**: verified
- **Last-verified**: 2026-03-25
- **Context**: Uses only Node.js built-in modules (fs, path, child_process). ADR-002 codifies zero-dep policy. Any new functionality must use built-ins or be implemented inline.

## Patterns to Watch For

### [2026-03-26] mergeSettings() must track Set state after push — dedup bug in src/files.ts
- **Type**: DEFECT [fixed]
- **Source**: PR #367 (fix/364), Copilot finding
- **Tags**: merge-logic, settings, dedup
- **Outcome**: fixed
- **Last-verified**: 2026-03-26
- **Context**: mergeSettings() pushed new commands into the array but did not update the Set used for dedup tracking. Also required null-safe normalization for hooks (` ?? []`) and a consolidation pass for duplicate matcher blocks. Three related DEFECTs fixed together.

## Calibration Log
<!-- Challenges accepted/overruled — tunes adversarial intensity over time -->
