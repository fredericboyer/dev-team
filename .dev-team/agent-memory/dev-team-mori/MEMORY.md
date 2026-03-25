# Agent Memory: Mori (Frontend/UI Engineer)
<!-- First 200 lines are loaded into agent context. Keep concise. -->

## Project Conventions

### [2026-03-24] No frontend UI — CLI-only tool, Mori role is API contract review
- **Type**: PATTERN [bootstrapped]
- **Source**: package.json + src/ analysis
- **Tags**: architecture, frontend, api-contracts
- **Outcome**: pending-verification
- **Last-verified**: 2026-03-24
- **Context**: dev-team has no browser UI, no React/Vue/Svelte, no CSS, no components. Mori's role is scoped to API contract review — triggered when API-related files change (/api/, /routes/, schema, etc.). For this project, that means watching template schemas, agent frontmatter contracts, and hook interfaces.

### [2026-03-24] Agent frontmatter is the primary schema contract
- **Type**: PATTERN [bootstrapped]
- **Source**: templates/agents/ + scripts/validate-agents.js analysis
- **Tags**: schema, contracts, agents
- **Outcome**: pending-verification
- **Last-verified**: 2026-03-24
- **Context**: Agent definitions use YAML frontmatter (name, description, tools, model, memory). scripts/validate-agents.js validates this schema in CI. Changes to frontmatter structure are API-level changes affecting all consuming agents.

### [2026-03-24] Hook interface contract: type + command fields in .claude/settings.json
- **Type**: PATTERN [bootstrapped]
- **Source**: src/files.ts HookEntry interface
- **Tags**: schema, contracts, hooks
- **Outcome**: pending-verification
- **Last-verified**: 2026-03-24
- **Context**: Hooks are registered via HookEntry { type, command } and HookMatcher { matcher?, hooks[] } in HookSettings. This is the integration contract between dev-team and Claude Code's hook system.

## Patterns to Watch For


## Calibration Log
<!-- Challenges accepted/overruled — tunes adversarial intensity over time -->
