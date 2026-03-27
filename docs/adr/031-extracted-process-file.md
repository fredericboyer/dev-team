# ADR-031: Extract process rules into separate file
Date: 2026-03-26
Status: accepted

## Context
The CLAUDE.md template managed section exceeded 100 lines. Orchestration details (parallel execution protocol, agent naming conventions, unresponsive agent handling) are reference material consulted during multi-agent work but not needed on every read. Keeping them inline inflates the instruction surface that every conversation loads.

## Decision
Extract process rules into `templates/dev-team-process.md`, installed to `.dev-team/process.md` alongside other dev-team files. The CLAUDE.md managed section replaces the extracted content with a one-line pointer: "See `.dev-team/process.md` for orchestration protocol, parallel execution, and agent naming conventions."

The process file is always overwritten on `dev-team update` (not guarded by `fileExists`) since it is framework-managed content, not user-edited.

## Consequences
- CLAUDE.md managed section drops from ~115 lines to ~85 lines, well under the 100-line threshold.
- Process rules are editable in a dedicated file without touching CLAUDE.md.
- `dev-team update` manages the process file like agents and hooks.
- Agents that need orchestration details must read `.dev-team/process.md` — an additional file read, but one that only occurs during multi-agent coordination.
