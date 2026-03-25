# Agent Memory: Voss (Backend Engineer)
<!-- First 200 lines are loaded into agent context. Keep concise. -->

## Project Conventions

### [2026-03-24] CLI tool — no database, no API server, no ORM
- **Type**: PATTERN [bootstrapped]
- **Source**: package.json + src/ analysis
- **Tags**: architecture, data-layer, backend
- **Outcome**: pending-verification
- **Last-verified**: 2026-03-24
- **Context**: dev-team is a CLI installer (npx dev-team init). No database, no HTTP server, no REST/GraphQL API. Data model is file-based: reads package.json/tsconfig for project scanning, writes template files to target projects. Voss role here focuses on file I/O patterns, config parsing, and data modeling for scan/init logic.

### [2026-03-24] Config via JSON files — .dev-team/config.json in target projects
- **Type**: PATTERN [bootstrapped]
- **Source**: src/scan.ts + src/init.ts analysis
- **Tags**: configuration, data-model
- **Outcome**: pending-verification
- **Last-verified**: 2026-03-24
- **Context**: Project detection via scan.ts reads package.json, tsconfig.json, pyproject.toml to auto-detect runtime. Config stored as JSON. No environment variables for configuration (CLI tool, not a service).

### [2026-03-24] Zero runtime dependencies — all functionality is self-contained
- **Type**: PATTERN [bootstrapped]
- **Source**: package.json analysis
- **Tags**: dependencies, architecture
- **Outcome**: pending-verification
- **Last-verified**: 2026-03-24
- **Context**: Uses only Node.js built-in modules (fs, path, child_process). ADR-002 codifies zero-dep policy. Any new functionality must use built-ins or be implemented inline.

## Patterns to Watch For


## Calibration Log
<!-- Challenges accepted/overruled — tunes adversarial intensity over time -->
