# Agent Memory: Szabo (Security Auditor)
<!-- First 200 lines are loaded into agent context. Keep concise. -->

## Trust Boundaries Mapped

### [2026-03-24] CLI tool with no auth, no user data, no network services
- **Type**: PATTERN [bootstrapped]
- **Source**: package.json + src/ analysis
- **Tags**: trust-boundary, attack-surface
- **Outcome**: pending-verification
- **Last-verified**: 2026-03-24
- **Context**: dev-team is a CLI installer that copies template files into target projects. No authentication system, no user data handling, no database, no HTTP server. Primary security concern is file system operations and template injection.

### [2026-03-24] readFile() returns null for both missing and permission-denied files
- **Type**: RISK [bootstrapped]
- **Source**: .dev-team/learnings.md (known tech debt)
- **Tags**: error-handling, file-system, tech-debt
- **Outcome**: pending-verification
- **Last-verified**: 2026-03-24
- **Context**: src/files.ts readFile distinguishes ENOENT (missing file) from EACCES/EPERM (permission errors) and logs a warning on permission issues, but still returns null in both cases, which can mask security-relevant permission errors in target project file operations.

### [2026-03-24] Hook scripts execute in target project context
- **Type**: PATTERN [bootstrapped]
- **Source**: templates/hooks/ analysis
- **Tags**: code-execution, hooks, trust-boundary
- **Outcome**: pending-verification
- **Last-verified**: 2026-03-24
- **Context**: 6 hooks shipped as plain JS run in the target project's environment. They spawn subprocesses and read/write files. Any command injection in hook logic would execute with the user's permissions.

### [2026-03-24] Zero runtime dependencies — small supply chain surface
- **Type**: PATTERN [bootstrapped]
- **Source**: package.json analysis
- **Tags**: supply-chain, dependencies
- **Outcome**: pending-verification
- **Last-verified**: 2026-03-24
- **Context**: Only devDependencies (typescript, oxlint, oxfmt, @types/node). No runtime deps means minimal supply chain attack surface. ADR-002 codifies this as a design principle.

## Known Attack Surfaces


## Calibration Log
<!-- Challenges accepted/overruled — tunes adversarial intensity over time -->
