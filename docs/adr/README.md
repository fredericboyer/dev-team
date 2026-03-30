# Architecture Decision Records

This directory contains Architecture Decision Records (ADRs) for the dev-team project.

## Format

Each ADR follows the lightweight format inspired by Michael Nygard:

```
# ADR-NNN: Title
Date: YYYY-MM-DD
Status: proposed | accepted | deprecated | superseded by ADR-NNN | amended by ADR-NNN

## Context
What is the issue motivating this decision?

## Decision
What change are we making?

## Consequences
What becomes easier or more difficult?
```

## Index

| ADR | Title | Status |
|-----|-------|--------|
| [001](001-hooks-over-claude-md.md) | Hooks over CLAUDE.md for enforcement | accepted |
| [002](002-zero-dependencies.md) | Zero npm dependencies | accepted |
| [003](003-cross-platform-node-hooks.md) | Cross-platform Node.js hooks | accepted |
| [004](004-tdd-enforcement.md) | TDD enforced by hook | accepted |
| [005](005-adversarial-agents.md) | Devil's advocate agent culture | accepted |
| [006](006-cli-over-plugin.md) | CLI installer first, plugin later | accepted |
| [007](007-typescript-oxc-tooling.md) | TypeScript migration with oxlint/oxfmt | accepted |
| [008](008-agent-model-assignment.md) | Agent model assignment strategy (opus vs sonnet) | accepted |
| [009](009-idempotent-update.md) | Idempotent update command with auto-discovery | accepted |
| [010](010-preset-bundles.md) | Preset bundles for quick onboarding | accepted |
| [011](011-watch-lists.md) | Configurable watch lists (file pattern to agent mapping) | accepted |
| [012](012-memory-freshness-check.md) | Memory freshness check in pre-commit gate | accepted |
| [013](013-active-hook-spawning.md) | Active hook spawning via tracking file | accepted |
| [014](014-runtime-auto-discovery.md) | Runtime auto-discovery of skills and hooks | accepted |
| [015](015-orchestrator-agent.md) | Orchestrator agent (Lead) with delegation | accepted |
| [016](016-custom-agent-scaffolding.md) | Custom agent scaffolding via create-agent command | accepted |
| [017](017-role-based-tool-assignment.md) | Role-based tool assignment (read-only auditors vs implementers) | accepted |
| [018](018-shared-git-context.md) | Shared git context via temp file cache | accepted |
| [019](019-parallel-review-waves.md) | Parallel review waves for headless multi-issue execution | accepted |
| [020](020-quality-attribute-assessment.md) | Quality attribute assessment via expanded Brooks agent | accepted |
| [021](021-typescript-6-module-resolution.md) | TypeScript 6.0 with nodenext module resolution | accepted |
| [022](022-agent-proliferation-governance.md) | Agent proliferation governance | accepted |
| [023](023-cross-model-reviewer-assignment.md) | Cross-model reviewer assignment for high-risk changes | proposed |
| [024](024-remove-workflow-skills-from-templates.md) | Remove workflow-skills from templates | accepted |
| [025](025-project-specific-customization-in-claude.md) | Project-specific customization in .claude/ | accepted |
| [026](026-agent-progress-reporting.md) | Agent progress reporting and heartbeat protocol | accepted |
| [027](027-turing-researcher-agent.md) | Turing pre-implementation researcher agent | accepted |
| [028](028-rams-design-reviewer-agent.md) | Rams design system reviewer agent | accepted |
| [029](029-stateless-commit-gates.md) | Stateless commit gates for adversarial review enforcement | accepted |
| [030](030-shared-agent-protocol.md) | Shared agent protocol template | accepted |
| [031](031-extracted-process-file.md) | Extract process rules into separate file | accepted |
| [032](032-memory-write-semantics.md) | Memory write semantics — append-only format vs mutable content | accepted |
| [033](033-rules-based-context.md) | Rules-based context for shared files | accepted |
| [034](034-delegate-language-knowledge.md) | Delegate language-specific knowledge to agents, not hooks | accepted |
| [035](035-skill-composability.md) | Skill composability via sub-skill invocation | accepted |
| [036](036-canonical-format-adapter-registry.md) | Canonical agent definition format and multi-runtime adapter registry | accepted |
