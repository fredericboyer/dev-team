# Agent Memory: Brooks (Architect)
<!-- First 200 lines are loaded into agent context. Keep concise. -->

## Project Conventions

### [2026-03-24] 22 ADRs governing architecture — TypeScript/CommonJS, zero runtime deps, 12 agents
- **Type**: PATTERN [bootstrapped]
- **Source**: docs/adr/ + package.json analysis
- **Tags**: architecture, adr, structure
- **Outcome**: pending-verification
- **Last-verified**: 2026-03-24
- **Context**: Key ADRs: 001 (hooks over CLAUDE.md), 002 (zero deps), 005 (adversarial agents), 007 (oxc tooling), 019 (parallel review waves), 022 (agent proliferation governance with 15-agent soft cap). TypeScript 6 with NodeNext module resolution (ADR-021).

### [2026-03-24] Module structure: src/ (8 modules) to dist/ with templates/ shipped separately
- **Type**: PATTERN [bootstrapped]
- **Source**: project structure analysis
- **Tags**: architecture, modules, build
- **Outcome**: pending-verification
- **Last-verified**: 2026-03-24
- **Context**: src/ contains init.ts (entry), files.ts, scan.ts, create-agent.ts, update.ts, doctor.ts, status.ts, skill-recommendations.ts, prompts.ts. bin/dev-team.js is the CLI shim. templates/ contains agents, hooks, skills shipped to target projects. .dev-team/ is self-use only.

### [2026-03-24] Strict separation: templates/ (shipped) vs .dev-team/ (self-use)
- **Type**: PATTERN [bootstrapped]
- **Source**: CLAUDE.md + package.json files array
- **Tags**: architecture, boundaries
- **Outcome**: pending-verification
- **Last-verified**: 2026-03-24
- **Context**: templates/ contains what gets installed in target projects. .dev-team/ contains dev-team's own agents/hooks/skills for dogfooding. Improvements must target templates/ to ship in releases — never modify .dev-team/ for improvements (overwritten by update).

### [2026-03-24] Agent proliferation governed by ADR-022 — soft cap of 15
- **Type**: DECISION [bootstrapped]
- **Source**: docs/adr/022-agent-proliferation-governance.md
- **Tags**: architecture, agents, governance
- **Outcome**: pending-verification
- **Last-verified**: 2026-03-24
- **Context**: Currently 12 agents. New agents require justification against 4 criteria. Brooks flags additions during architectural review. Drucker evaluates extending existing agents first.

## Patterns to Watch For


## Calibration Log
<!-- Challenges accepted/overruled — tunes adversarial intensity over time -->
