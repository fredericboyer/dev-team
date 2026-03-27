# Shared Team Learnings
<!-- Read by all agents at session start. Keep under 200 lines. -->
<!-- For formal decisions, use ADRs instead. This file captures organic learnings. -->

## Coding Conventions

- Use oxlint for linting, oxfmt for formatting (not ESLint/Prettier). See ADR-007.

## Process

- Always use `/dev-team:task` for implementation work — dogfood the agents.
- Spawn review agents as `general-purpose` subagents with the actual agent definition loaded from `.dev-team/agents/dev-team-*.md`. Do NOT use `pr-review-toolkit:*` as proxies — they have different behavior.
- Hooks over CLAUDE.md for enforcement (ADR-001). If agents keep flagging the same pattern, it should be a hook.
- **Review gate enforces the adversarial loop at commit time** (ADR-029). Two stateless gates: review evidence + findings resolution. Sidecar files in `.dev-team/.reviews/` keyed by agent + content hash. LIGHT reviews are advisory only. `--skip-review` is the escape hatch.

## Design Principles

- **Don't encode what agents already know.** AI agents have built-in knowledge of languages, frameworks, conventions, and standards. Hardcoding language-specific patterns (test file regex, linter commands, complexity keywords) into hooks or config creates static encyclopedias that are always incomplete. Instead, hooks should detect the ecosystem (read manifest files) and delegate language-specific reasoning to the agent. Include only what agents can't discover: tool preferences, legacy traps, test quirks, custom middleware warnings. (See: "AGENTS.md Verdict" — if the agent can discover it from code, delete it.)

## Known Tech Debt

- `readFile()` in `src/files.ts` distinguishes ENOENT from EACCES/EPERM and logs a warning on permission errors, but still returns null in both cases — can mask security-relevant permission errors (Szabo finding, tracked).
- `mergeClaudeMd` append-on-missing-END-marker can produce duplicate BEGIN markers on subsequent runs (Knuth finding, edge case).

## Quality Benchmarks

- Always run `npm run format` before committing new `.ts` files — oxfmt formatting is checked in CI.
- Finding Outcome Log vocabulary is standardized: outcomes are `fixed`, `accepted`, `deferred`, `overruled`, `ignored`. All skills and agents must use this vocabulary.
- Pre-commit gate: blocks commits without memory updates (override via `.dev-team/.memory-reviewed`).

## Overruled Challenges
<!-- When the human overrules an agent, record why — prevents re-flagging -->

