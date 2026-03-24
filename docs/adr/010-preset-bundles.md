# ADR-010: Preset bundles for quick onboarding
Date: 2026-03-22
Status: accepted

## Context
The interactive installer asks multiple questions (agents, hooks, tracker, branch convention). For teams that want opinionated defaults for their domain, this is friction. Different project types benefit from different agent combinations.

## Decision
Add `--preset backend|fullstack|data` flag that:
- Pre-selects agents and hooks appropriate for the domain
- Skips interactive prompts (uses defaults for tracker and branch convention)
- Runs Deming scan automatically
- Records preset name in `dev-team.json` for future reference

Preset definitions:
- **backend**: Voss, Szabo, Knuth, Beck, Deming, Architect, Release (no Mori, Docs)
- **fullstack**: all 10 agents
- **data**: Voss, Szabo, Knuth, Beck, Deming, Docs (no Mori, Architect, Release)

Presets always install all hooks — hooks are cheap and universally applicable.

## Consequences
- Faster onboarding for teams that fit a common archetype
- `--all` and `--preset fullstack` are functionally equivalent
- Teams can customize after installation by editing `.dev-team/agents/`
- New presets can be added without changing the installer architecture
