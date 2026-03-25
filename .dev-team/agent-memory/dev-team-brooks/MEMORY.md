# Agent Memory: Brooks (Architect)
<!-- First 200 lines are loaded into agent context. Keep concise. -->

## Project Conventions

### [2026-03-25] ADRs govern architecture — key decisions documented in docs/adr/
- **Type**: PATTERN [verified]
- **Source**: docs/adr/ + package.json analysis
- **Tags**: architecture, adr, structure
- **Outcome**: verified
- **Last-verified**: 2026-03-25
- **Context**: Key ADRs: 001 (hooks over CLAUDE.md), 002 (zero deps), 005 (adversarial agents), 007 (oxc tooling), 019 (parallel review waves), 022 (agent proliferation governance). TypeScript with NodeNext module resolution (ADR-021). Always check docs/adr/ for current count and contents.

### [2026-03-25] Module structure: src/ to dist/ with templates/ shipped separately
- **Type**: PATTERN [verified]
- **Source**: project structure analysis
- **Tags**: architecture, modules, build
- **Outcome**: verified
- **Last-verified**: 2026-03-25
- **Context**: src/ contains core modules (init, files, scan, create-agent, update, doctor, status, skill-recommendations, prompts). bin/dev-team.js is the CLI shim. templates/ contains agents, hooks, skills shipped to target projects. .dev-team/ is self-use only.

### [2026-03-25] Strict separation: templates/ (shipped) vs .dev-team/ (self-use)
- **Type**: PATTERN [verified]
- **Source**: CLAUDE.md + package.json files array
- **Tags**: architecture, boundaries
- **Outcome**: verified
- **Last-verified**: 2026-03-25
- **Context**: templates/ contains what gets installed in target projects. .dev-team/ contains dev-team's own agents/hooks/skills for dogfooding. Improvements must target templates/ to ship in releases — never modify .dev-team/ for improvements (overwritten by update).

### [2026-03-25] Agent proliferation governed by ADR-022 — soft cap of 15
- **Type**: DECISION [verified]
- **Source**: docs/adr/022-agent-proliferation-governance.md
- **Tags**: architecture, agents, governance
- **Outcome**: verified
- **Last-verified**: 2026-03-25
- **Context**: New agents require justification against 4 criteria. Brooks flags additions during architectural review. Drucker evaluates extending existing agents first.

## Patterns to Watch For


## Calibration Log
<!-- Challenges accepted/overruled — tunes adversarial intensity over time -->
