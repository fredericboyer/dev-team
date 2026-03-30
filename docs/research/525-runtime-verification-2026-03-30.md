# Research brief: Runtime verification for review step

**Issue**: #525
**Date**: 2026-03-30
**Researcher**: @dev-team-turing

## Question

Should dev-team's review step include optional runtime verification (browser testing)? Compare Playwright CLI and agent-browser. Determine whether binding to a specific tool is necessary or a generic interface suffices.

## Approaches evaluated

### 1. Playwright CLI (`@playwright/cli`)

**What it is**: A standalone CLI from Microsoft that runs browser automation via shell commands. Published as `@playwright/cli` on npm. Designed specifically for AI coding agents as a lighter alternative to Playwright MCP.

**How it integrates with Claude Code**: Claude invokes `playwright-cli` commands through the Bash tool. A Claude Code skill (`playwright-cli` or community skills like `lackeyjb/playwright-skill`) provides structured guidance so the agent writes and executes custom Playwright code. The skill is model-invoked — Claude autonomously decides when browser automation is needed.

**Interaction model**: Structured CLI commands (`open`, `snapshot`, `click`, `fill`, `screenshot`). Snapshots produce YAML files with element references (`@e1`, `@e2`) that subsequent commands use. Deterministic and scriptable.

**Setup requirements**:
- Node.js 18+
- `npm install -g @playwright/cli@latest`
- `playwright-cli install` (downloads Chromium)
- On Linux/Docker: `npx playwright install-deps` for system libraries

**Token efficiency**: ~27,000 tokens per typical session vs ~114,000 for Playwright MCP — roughly 4x reduction. Snapshots save to disk; screenshots never enter context unless explicitly read.

**Strengths**:
- Official Microsoft backing, active maintenance
- Deterministic scripts — reproducible results
- Excellent token efficiency via file-based snapshots
- Already in dev-team's `skill-recommendations.json` trusted sources (`"playwright"`, `"microsoft"`)
- Rich ecosystem: network interception, authentication, device emulation
- Headless and headed modes
- Already a skill available in the Claude Code skill registry (`playwright-cli`)

**Weaknesses**:
- Requires Node.js and Chromium binary installation (~400MB)
- File-based output means the agent manages cleanup
- No natural-language interaction — requires structured commands

### 2. agent-browser (Vercel Labs)

**What it is**: A Rust-native CLI for browser automation, published by Vercel Labs. Available via npm (`agent-browser`), Homebrew, or Cargo.

**How it integrates with Claude Code**: Ships with a Claude Code skill (`agent-browser`) that teaches agents the snapshot-ref interaction pattern. Agents invoke `agent-browser` commands through Bash.

**Interaction model**: Structured CLI commands, similar to Playwright CLI. Uses snapshot-ref pattern (`agent-browser snapshot -i` produces refs like `@e2`). Despite marketing suggesting "natural language", the actual interaction is command-based through bash.

**Setup requirements**:
- `npm install -g agent-browser` (or Homebrew/Cargo)
- `agent-browser install` (downloads Chrome for Testing)
- Maintains a background daemon for session state between commands

**Token efficiency**: ~3,000-5,000 tokens per page (per independent testing). Better than MCP-based tools but worse than Playwright CLI.

**Strengths**:
- Fast native Rust implementation
- Auth Vault for credential storage
- Network mocking built-in
- Background daemon maintains state between commands
- Exploratory "dogfood" testing skill — navigates like a real user and produces structured bug reports
- Vercel is a trusted source in `skill-recommendations.json`

**Weaknesses**:
- Vercel Labs project (experimental, not mainline Vercel)
- Windows path normalization issues reported
- 2-6x more tokens per page than Playwright CLI
- Less mature ecosystem than Playwright
- License unclear from public sources

### 3. Generic interface (no tool binding)

**What it would look like**: Define a `RuntimeVerifier` interface in dev-team that accepts a configuration object (URL, scenarios, expected outcomes). The reviewer agent invokes whatever browser tool the project has installed.

**Strengths**:
- No forced dependency on any specific tool
- Projects already using Playwright, Cypress, or Puppeteer can plug in
- Aligns with dev-team's platform-neutral design principles

**Weaknesses**:
- Claude Code already has skill discovery — if a project has `playwright-cli` or `agent-browser` installed, the agent can use it
- A generic interface adds abstraction without adding capability
- The agent already adapts to available tools; a rigid interface constrains this
- Configuration burden falls on the user for something that could be auto-detected

## Analysis: Integration architecture

### Where runtime verification fits in the review flow

The current review skill (`/dev-team:review`) follows: determine changes -> spawn reviewers -> filter findings -> report -> completion. Runtime verification would insert between "spawn reviewers" and "filter findings" as an optional parallel step.

**Option A — Reviewer agent invokes browser tool directly**:
The reviewer (e.g., Knuth or a dedicated Voss instance) detects that the change affects UI code and invokes `playwright-cli` or `agent-browser` to verify behavior. This requires the reviewer agent to have Bash tool access (which it already has as a general-purpose subagent).

**Option B — Dedicated runtime-verification step in review skill**:
Add a conditional step to the review skill: if the project has a `runtimeVerification` config in `.dev-team/config.json`, spawn a dedicated verification agent that runs browser tests.

**Option C — Hook-triggered verification**:
A post-change hook detects UI file changes and triggers browser verification. Results feed into the review.

**Recommendation**: Option A (reviewer invokes directly) combined with skill recommendations. The reviewer agent already has Bash access and can detect browser tools. No new orchestration is needed. Dev-team's role is to:
1. Recommend installation of `playwright-cli` skill for web projects (via `skill-recommendations.json`)
2. Add guidance to reviewer agent definitions about when to invoke runtime verification
3. Allow users to configure verification URLs and scenarios in `.dev-team/config.json`

### Configuration model

```json
// .dev-team/config.json (user-configured)
{
  "runtimeVerification": {
    "enabled": true,
    "url": "http://localhost:3000",
    "startCommand": "npm run dev",
    "scenarios": [
      "Navigate to homepage and verify main layout renders",
      "Submit login form with test credentials"
    ]
  }
}
```

This is lightweight, optional, and tool-agnostic. The reviewer reads the config and uses whatever browser tool is available.

## Which projects benefit?

| Project type | Benefit | Notes |
|-------------|---------|-------|
| Web apps with UI | High | Primary use case. Catches visual regressions, broken interactions |
| APIs with Swagger/docs UI | Low | Swagger UI is generated; little value in browser-testing it |
| CLI tools | None | No browser surface |
| Libraries | None | No browser surface |
| Desktop apps (Electron) | Medium | agent-browser has Electron support; Playwright can connect to CDP |

Detection heuristic: presence of `react`, `vue`, `next`, `angular`, `svelte` in dependencies + existence of HTML/JSX/TSX files in changed set.

## Key question: Bind to a specific tool or generic interface?

**Recommendation: Do not bind. Use skill recommendations + agent guidance.**

Rationale:
1. **Claude Code already has skill discovery.** If `playwright-cli` is installed, Claude will use it. Dev-team does not need to duplicate this.
2. **The skill registry already works.** `skill-recommendations.json` already recommends Playwright for projects with `@playwright/test` or `playwright` in dependencies. Expanding this to recommend `playwright-cli` for web projects is a one-line change.
3. **A generic interface adds abstraction without capability.** The agent adapts to available tools. A rigid interface constrains this natural adaptation.
4. **Configuration should be minimal.** URL + scenarios in config.json is enough. The agent picks the tool.

If a specific tool must be recommended, **Playwright CLI is the safer choice**:
- Microsoft backing vs Vercel Labs (experimental)
- 4x better token efficiency than MCP, and better than agent-browser
- Already in the trusted sources list
- Already a skill in the Claude Code registry
- Deterministic scripts over exploratory heuristics for review reliability

## Recommendation

**Do not build a runtime verification subsystem.** Instead:

1. **Add `playwright-cli` to skill recommendations** for web projects (detect by framework deps). This is a minor addition to `skill-recommendations.json`.
2. **Add optional `runtimeVerification` config** to `.dev-team/config.json` schema — just URL and scenarios. No tool binding.
3. **Add guidance to reviewer agent definitions** (Knuth, Szabo) noting: "If the project has `runtimeVerification` configured and a browser tool is available, verify changed UI behavior before producing findings."
4. **Do not add agent-browser as a recommendation** at this time. Playwright CLI has stronger fundamentals (Microsoft backing, better token efficiency, more mature). Revisit if agent-browser moves from Labs to mainline Vercel.

This keeps dev-team tool-agnostic while enabling runtime verification for web projects that opt in.

## Evidence

- [Playwright CLI: Token-Efficient Alternative to Playwright MCP](https://testcollab.com/blog/playwright-cli) — 4x token reduction data (27k vs 114k tokens)
- [agent-browser GitHub (Vercel Labs)](https://github.com/vercel-labs/agent-browser) — CLI architecture, setup requirements
- [agent-browser SKILL.md](https://github.com/vercel-labs/agent-browser/blob/main/skills/agent-browser/SKILL.md) — skill integration details
- [Playwright Skill (lackeyjb)](https://github.com/lackeyjb/playwright-skill) — model-invoked skill pattern
- [Browser tool comparison (DEV Community)](https://dev.to/minatoplanb/i-tested-every-browser-automation-tool-for-claude-code-heres-my-final-verdict-3hb7) — independent testing of token costs (agent-browser: 3k-5k/page)
- [Playwright MCP with Claude Code (Simon Willison)](https://til.simonwillison.net/claude-code/playwright-mcp-claude-code) — MCP integration reference
- [@playwright/cli on npm](https://www.npmjs.com/package/@playwright/cli) — package details
- dev-team `skill-recommendations.json` — existing Playwright entry in trusted sources
- dev-team `/dev-team:review` SKILL.md — current review flow (no runtime verification step)

## Known issues / caveats

1. **Chromium binary size**: ~400MB download. Projects in CI-constrained environments may not want this.
2. **Dev server dependency**: Runtime verification requires a running dev server. The `startCommand` config helps, but adds a process management concern (start, wait for ready, test, teardown).
3. **Flaky tests**: Browser automation in review context must not produce false positives. Deterministic Playwright scripts are more reliable than exploratory agent-browser "dogfood" testing for this reason.
4. **Token budget**: Even at 27k tokens per session, browser verification consumes significant context. Should only trigger for UI-affecting changes, not every review.
5. **Security**: Browser tools can navigate to arbitrary URLs. The `runtimeVerification.url` config should be restricted to localhost/internal URLs by default.

## Confidence level

**Medium-High.** The tool landscape is well-documented and independently benchmarked. The recommendation to avoid tool binding aligns with dev-team's design principles (platform-neutral, discoverable-only). Confidence would increase with:
- Direct benchmarking of Playwright CLI in a review agent context (token cost within a full review session)
- User feedback on whether the config model (`url` + `scenarios`) is sufficient

## Recommended Actions

- **Title**: Add `playwright-cli` to skill recommendations for web projects
  **Severity**: P2
  **Files affected**: `templates/skill-recommendations.json`
  **Scope**: S

- **Title**: Define `runtimeVerification` config schema in config.json
  **Severity**: P2
  **Files affected**: `src/config.ts` (or equivalent config schema), `templates/config.json`
  **Scope**: S

- **Title**: Add runtime verification guidance to reviewer agent definitions
  **Severity**: P2
  **Files affected**: `templates/agents/dev-team-knuth.md`, `templates/agents/dev-team-szabo.md`
  **Scope**: S

- **Title**: Document runtime verification opt-in in CLAUDE.md template
  **Severity**: P2
  **Files affected**: `templates/CLAUDE.md`
  **Scope**: S
