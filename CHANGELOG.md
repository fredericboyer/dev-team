# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [3.0.0] - 2026-03-30

### BREAKING
- v3 layout migration -- agents move from `.dev-team/agents/` to `.claude/agents/` with `.agent.md` extension; agent-memory moves from `.dev-team/agent-memory/` to `.claude/agent-memory/`; `.dev-team/skills/` removed (skills install directly to `.claude/skills/`).

### Added
- `migrateToV3Layout` migration -- automatically migrates pre-v3 directory layouts on `dev-team update`.
- `assertNotSymlink` guards on all `rmSync` calls in v3 layout migration (Szabo F-01).
- `BUILTIN_IDS` in adapter registry now includes all shipped adapters: claude, copilot, codex, agents-md (Szabo F-03).
- Tests for `migrateToV3Layout`: happy path, idempotent, partial state, memory migration, symlink cleanup, SHARED.md preserved.

## [2.0.2] - 2026-03-30

### Fixed
- `BUILTIN_IDS` adapter registry guard now covers all four shipped adapters -- prevents accidental replacement of copilot, codex, and agents-md adapters.
- `assertNotSymlink` guards added before `rmSync` calls in `migrateToV3Layout` -- prevents symlink-following directory removal.

### Tests
- 6 new integration tests for `migrateToV3Layout` migration function.

## [2.0.1] - 2026-03-30

### Removed
- MCP enforcement server and `npx dev-team mcp` CLI command — replaced by native Copilot hooks (#581).
- Cursor and Windsurf adapters — insufficient runtime maturity for reliable adapter support (#581).

### Added
- Copilot native hooks for enforcement — replaces MCP-based approach (#581).
- Turing verification gate for research brief validation (#581).

## [2.0.0] - 2026-03-30

### BREAKING
- New `--runtime` flag changes `init` behavior — selects target runtime (claude, copilot, codex) during initialization.
- `runtimes` field added to `config.json` — tracks which runtime adapters are active.
- Adapter registry replaces inline agent copy logic — agent installation now routes through runtime-specific adapters.

### Added
- Canonical agent definition format with YAML frontmatter and Markdown body (ADR-036, #501, #569).
- Adapter registry pattern — pluggable runtime adapters with shared interface (#501, #569).
- AGENTS.md export adapter — generates consolidated `AGENTS.md` from canonical definitions (#502, #570).
- GitHub Copilot adapter — translates agent definitions for Copilot CLI consumption (#504, #570).
- Codex CLI adapter — skills-focused translation for OpenAI Codex CLI (#505, #571).
- Barrel file for adapter imports (`src/adapters/index.ts`) (#569).
- Path traversal validation on adapter file operations (#569).
- Input boundary validation for adapter registry (#569).

### Research
- Codex CLI evaluation — capabilities, limitations, and integration strategy (#508, #568).
- Runtime verification — adapter correctness and cross-runtime consistency (#525, #568).
- Agent portability across runtimes — design principles for multi-runtime support (#264, #568).

### Internal
- Closes umbrella issue #264 (Support GitHub Copilot CLI as an agent runtime).

## [1.11.1] - 2026-03-30

### Fixed
- `mergeClaudeMd` no longer re-injects template scaffolding on update (#563, #565).
- `release.yml` unnecessary `\!` escaping removed (#562).

### Dependencies
- oxfmt 0.41.0 → 0.42.0 (#558).
- oxlint 1.56.0 → 1.57.0 (#559).

## [1.11.0] - 2026-03-29

### Added
- Review intensity tiers (LIGHT/FULL) with explicit selection criteria and reviewer routing (#519, #551).
- Definition of Done (DoD) negotiation protocol for task skill — agents and humans agree on acceptance criteria upfront (#520, #551).
- Harness assumption audit in retro skill — retro now validates that hook/skill assumptions still hold (#521, #550).
- Anti-pattern sections for reviewer agents — calibration examples of what NOT to flag (#523, #551).
- Calibration examples for Szabo, Knuth, and Brooks reviewers — concrete accept/flag/skip examples (#522, #553).
- `validate-docs` CI job — catches stale doc references and broken links (#546, #552).
- Semgrep SAST (non-blocking) added to CI pipeline (#533, #552).
- `.nvmrc` pinning Node.js version for consistent local development (#535, #554).
- Context documentation for review skill — explains what context reviewers receive (#524, #551).

### Changed
- Agent timeouts aligned to 2-minute threshold across all skills (#519, #551).
- Release workflow parallelized — independent CI jobs run concurrently (#547, #552).
- `npm ci` replaces `npm install` in CI for deterministic installs (#528, #552).
- Lint and format checks extended to `tests/` directory (#534, #555).
- `validate-agents` and `validate-hooks` CI jobs optimized (#530, #552).

### Fixed
- Symlink guards added to `mergeSettings` and `removeHooksFromSettings` — prevents symlink-following attacks (#531, #555).
- `compareSemver` prerelease handling — correctly orders prerelease vs release versions (#538, #554).
- `doctor.ts` `hookFileMap` deduplication — no longer reports false failures for hooks with multiple files (#539, #554).
- `listFilesRecursive` depth and symlink guard — bounded traversal prevents runaway recursion (#543, #554).
- Worktree hook input validation hardened — rejects malformed JSON gracefully (#537, #556).
- Safety guard and `shell:true` documentation clarified (#536, #554).
- Duplicate pre-commit hook entry removed from settings template (#532, #555).
- Retro CLAUDE.md template duplication removed (#549).
- Mori `HookEntry` memory corrected (#549).
- Docs aligned with guidelines — ADR index, research brief naming (#527).

### Tests
- 23+ new tests: worktree hook tests (13) (#529, #556), init error paths (#540, #557), update backup (#541, #557), `createAgent` validation (#542, #557), CLI help (#545, #557), `hookRemovals` integration (#548, #557).

## [1.10.1] - 2026-03-29

### Fixed
- `INFRA_HOOKS` missing from `config.json` after `init` — config completeness now validated (#515, #516).
- `init --all` silently overwrites existing config — now requires `--force` for re-initialization (#515, #516).
- `mergeSettings` drops new hook attributes (`timeout`, `blocking`) — HookEntry interface extended to preserve all attributes (#515, #516).

### Added
- `hookRemovals` migration support for clean hook lifecycle management (#516).
- `removeHooksFromSettings` cleanup utility (#516).
- Init guard requiring `--force` for re-init over existing installation (#516).

## [1.10.0] - 2026-03-29

### Added
- ADR-035: Skill composability via sub-skill invocation — skills can invoke other skills as building blocks (#493, #511).
- Borges zero-overrule rate monitoring — detects calibration stagnation when no challenges are overruled (#490, #511).
- Turing research brief on agent runtime portability (#500).

### Changed
- Merge skill auto-merge timing guard enforced as a GATE — prevents premature auto-merge before Copilot findings are addressed (#489, #512).
- Agent timeouts aligned to 2-minute threshold across all skills and hooks (#512).
- Scorecard skill now references `/dev-team:extract` for Borges extraction checks (#494, #510).

### Fixed
- Auto-merge timing enforcement — merge skill step ordering codified to wait for Copilot, address findings, then set auto-merge (#489, #512).
- Scorecard extract awareness — scorecard correctly detects `/dev-team:extract` invocation (#494, #510).

### Internal
- Updated dev-team installation to v1.9.0 (#498).

## [1.9.0] - 2026-03-29

### Added
- `/dev-team:extract` sub-skill — Borges memory extraction decoupled from retro, invocable standalone (#485, #492).
- Task skill delegates review rounds to `/dev-team:review --embedded` — unified review orchestration instead of inline reviewer spawning (#486, #496).

### Changed
- **BREAKING: `--reviewers` flag removed from task skill** — reviewer selection is now automatic via the review skill's routing logic. Manual reviewer override is no longer supported.
- Merge skill step ordering learning codified: wait for Copilot review, address all findings, then set auto-merge. Prevents premature merge with unresolved findings.

### Fixed
- Copilot findings from post-v1.8.0 retro PR addressed (#484, #487).
- README hooks count updated from 8 to 10 to reflect worktree hooks (#488).

### Internal
- Post-v1.8.0 retro cleanup and Borges memory extraction (#484).
- Turing research brief and retro fixes (#495).

## [1.8.0] - 2026-03-29

### Added
- Worktree serialization hook to prevent parallel creation races (#482).
- Decompose task skill into four orchestrated steps for better modularity (#481).
- Parent-directory symlink traversal guards for deeper path protection (#475).
- Task skill reviews PRs as they land, not in batched waves (#476).
- Retro skill verifies tech debt entries against issue tracker before reporting (#473).
- Merge skill enforces issue creation for deferred findings (#470).
- Version targeting guidance in process template (#477).

### Fixed
- `readFile()` throws on permission errors instead of silently masking them (#478).
- `mergeClaudeMd` replaces from BEGIN to EOF when END marker is missing, preventing duplicate markers (#479).
- Tighten test assertions to reduce false positive risk (#474).

### Docs
- README structure guidelines (#472).

### Internal
- Unit tests for `assertNotSymlink`, `assertNoSymlinkInPath`, and `safeRegex` (#480).

## [1.7.0] - 2026-03-27

### Security
- `lstatSync` guards to prevent symlink-following attacks in file operations (#433).
- ReDoS guards for user-controlled regex patterns — bounded complexity (#434).

### Added
- Test coverage for `doctor.ts`, `status.ts`, `prompts.ts` — 61 new tests (#438).
- `npm audit` step added to CI pipeline (#440).
- Scaffold recommended CLAUDE.md sections for new projects on `dev-team init` (#446).
- README structure guidelines research brief (#447).

### Changed
- Retro promotion criteria aligned with AGENTS.md Verdict framework (#445).

### Fixed
- `init.ts` step comment numbering corrected (#439).

### Internal
- Add `review-gate.test.js` to test script (#435).
- Extract `cachedGitDiff` into shared hook module `templates/hooks/lib/git-cache.js` (#436).
- Centralize pattern loading into shared module `templates/hooks/lib/agent-patterns.js`, remove ~200 lines of inline fallback arrays (#437).
- Extract symlink creation logic into `files.ts` helper (#441).

## [1.6.1] - 2026-03-27

### Fixed
- `doctor.ts` hookFileMap missing "Agent teams guide" — caused false failure on `dev-team doctor` (#431).
- `status.ts` checking wrong learnings path after v1.6.0 migration — now checks `.claude/rules/` first, falls back to `.dev-team/` (#432).

## [1.6.0] - 2026-03-26

### Added

**Architecture:**
- Move `process.md` and `learnings.md` to `.claude/rules/` for automatic agent context loading — ADR-033 (#406, #425).
- Delegate language-specific knowledge to agents instead of hooks — ADR-034, language-agnostic hook patterns (#395, #419).
- Audit agent templates for hardcoded workflow steps — Conway and Drucker now process-driven (#405, #426).
- Add `disable-model-invocation: true` to orchestration skills (#409, #414).
- Make scorecard skill autonomous — no longer requires manual invocation (#410, #413).

**Platform neutrality:**
- Generalize issue-closing syntax to be platform-aware (#386, #421).
- Replace Copilot references with generic automated review monitoring (#387, #422).
- Generalize milestone to milestone or iteration — platform-neutral language (#388, #415).
- Configurable branch prefixes via `taskBranchPattern` in config.json (#385, #418).

**Process improvements:**
- Enforce merge-as-you-go with sequential chain hard gate (#393, #423).
- Orchestrator agent liveness polling invariant for wait phases (#401, #420).
- Post-PR automated review polling guidance (#391, #424).
- Retro skill now audits `process.md` for staleness and gaps (#402, #416).
- Generalize scorecard for review, audit, and task workflows (#352, #427).

**Documentation:**
- Document `.claude/rules/` as extension point in template CLAUDE.md (#411, #412).
- Enforce `docs/` folder structure and file naming conventions (#392, #417).

### New ADRs
- ADR-033: Rules-based shared context distribution.
- ADR-034: Delegate language-specific pattern matching to agents.

## [1.5.1] - 2026-03-27

### Fixed
- Guard `process.md` from overwrite on re-init — same `fileExists` protection as `learnings.md` and `metrics.md` (#397).
- Install `process.md` during `dev-team update` for pre-v1.5.0 projects.
- Clarify which `.dev-team/` files are preserved vs overwritten.

### Changed
- Process template now includes Versioning, Branching, Integration, and Release placeholder sections for project customization.
- Deduplicated settings.json hook entries (from v1.5.0 update accumulation bug).

## [1.5.0] - 2026-03-26

### Added
- Shared agent protocol extracted into `SHARED.md` — 16% agent definition size reduction (#353).
- Process rules extracted from `CLAUDE.md` into `.dev-team/process.md` — CLAUDE.md under 100 lines (#348).
- `/dev-team:scorecard` skill for process conformance tracking (#351).
- Non-GitHub platform guidance and `platform` config field (#358).
- Turing research briefs now end with triage-ready Recommended Actions (#368).
- Non-JS/TS ecosystem benchmark for dev-team harness (#325).
- ADR-032: Memory write semantics — documents tension with ADR-012 (#335).

### Fixed
- `mergeSettings` duplicate hook entries on update (#364).
- Security preamble section ordering in audit and review skills (#354).
- Deduplicate routing tables — review skill references `agent-patterns.json` (#355).
- Strengthen Borges enforcement: placeholder cleanup, metrics gate (#356).
- Agent definition quality improvements: Conway, Deming, Turing, Rams (#357).
- Metrics file install path verified for skill alignment (#359).
- Sequential chain integration guidance made VCS-neutral (#374).

### New ADRs
- ADR-030: Shared agent protocol template.
- ADR-031: Extracted process definition file.
- ADR-032: Memory write semantics.

## [1.4.0] - 2026-03-26

### Added
- Shared file-pattern matching extracted into `agent-patterns.json` for hook and review routing consistency (#344).
- Agent timeout guidance and progress reporting added to skills and agent definitions (#343).
- Meaningful agent teammate naming convention enforced via hook (#336).
- Adversarial review loop enforcement via stateless commit gates (#331).
- Borges completion warning added to pre-commit gate (#317).
- README validation script to detect stale agent/hook counts (#346).
- Concurrent multi-user usage model research brief (#330).

### Changed
- Agent definitions updated with research-backed instruction surface improvements (#347).
- Finding acknowledgment clarified and multi-branch outcome logs supported (#329).
- 200-line guideline attribution corrected in multi-user research brief (#340).

### Fixed
- Finding routing in task loop now enforces all classified findings, merge skill usage, and Borges completion (#345).
- Review-gate hook edge cases covered with missing test cases (#342).
- Hamilton routing updated to include healthcheck variant (#328).
- Pre-commit gate wording in agent templates aligned with actual behavior (#327).
- Deferred findings from v1.2.0 tracked as GitHub issues (#324).
- Deming trigger example updated to generic linter/formatter config (#316).
- Release automation learning added to shared learnings (#310).

## [1.3.0] - 2026-03-26

### Added
- Agent-teams-guide hook for TeamCreate and worktree enforcement (#306).
- Deferred findings conversion tracking in retro skill (#305).

### Changed
- `/dev-team:assess` renamed to `/dev-team:retro` (#297).
- Project-specific skills dropped `dev-team` prefix (#290).
- Template references to merge/security-status skills made generic (#304).

### Fixed
- Review skill routing table aligned with hook patterns — Beck, Brooks, Hamilton gaps resolved (#303).
- Copilot login detection now handles `[bot]` suffix via regex matching (#307).
- Script detection aligned to use key-existence checks consistently (#308).
- Disambiguated 'Promotion opportunities' section names in retro skill (#301).
- Formatter detection package.json fallback added (#292).
- Dual Learning / Learnings Output sections consolidated in agent definitions (#293).
- Deferred findings tracking rule added to shared learnings (#296).
- Conway milestone closure promoted to shared learnings (#291).

## [1.2.0] - 2026-03-25

### Fixed
- Task skill now routes all classified findings (DEFECT, RISK, QUESTION, SUGGESTION) to the implementing agent — not just DEFECTs. Implementers must acknowledge each finding (#266).
- Structured Finding Outcome Log format added to task skill for Borges metrics recording, using aligned vocabulary (fixed/accepted/overruled/deferred/ignored) (#275).
- Review skill routing table: infrastructure files now route to Hamilton instead of Voss. Split into Hamilton (Docker, deploy, Terraform, k8s, CI) and Voss (config, migrations, database) (#273).
- Backtick formatting standardized across all review skill routing table entries (#273).
- `.env` ownership aligned with hook patterns: app config to Voss, templates to Hamilton (#273).

### Added
- Learnings Output (mandatory) section standardized across all 14 agent definitions. Szabo, Knuth, Brooks, Borges, and Drucker gain the section; Turing and Rams upgraded to full format (#274).
- Agent memory to shared learnings promotion check in both `/dev-team:assess` and `/assess-learnings` skills (#265).
- Post-promotion cleanup guidance to prevent duplication after memory entries are promoted (#265).
- Dispute escalation protocol added to parallel mode Phase 3 in task skill (#275).

## [1.1.1] - 2026-03-25

### Fixed
- Ghost hook/agent entries (e.g., "Task loop") in config.json are now cleaned up during `dev-team update` (#260).
- Framework skills (`/dev-team:task`, `/dev-team:review`, etc.) now discoverable via symlinks from `.claude/skills/` to `.dev-team/skills/` (#262).
- Merge skill now detects Copilot as a pending reviewer (not just check run) and waits for review before merging (#268).
- Symlink guard preserves any non-symlink path in `.claude/skills/`, not just directories containing SKILL.md (#269).
- `Object.hasOwn()` used instead of `in` operator for ghost entry filtering to avoid prototype pollution (#269).
- Windows compatibility: junction fallback when symlink creation fails with EPERM/EACCES (#269).
- Windows CI: fixed flaky `blocks commit when format:check fails independently` test (#269).
- Broken symlink test now creates junctions correctly on Windows (#269).

## [1.1.0] - 2026-03-25

### Added
- **ADR-026: Agent progress reporting and heartbeat protocol** — file-based status in `.dev-team/agent-status/`, JSON format, escalation via `action_required` (#250).
- **ADR-027: Turing pre-implementation researcher agent** — on-demand opus agent for library evaluation, migration paths, trade-off analysis (#251).
- **ADR-028: Rams design system reviewer agent** — read-only sonnet agent for design token compliance (#249).
- **New agent: dev-team-turing** — pre-implementation researcher, roster now 14 agents (#251).
- **New agent: dev-team-rams** — design system reviewer, graceful no-op when no design system detected (#249).
- **Progress reporting** sections added to Conway, Drucker, Borges, Brooks agent definitions (#244).
- **Escalation points** added to Conway and Drucker for blocked background agents (#248).
- **Phase milestone checkpoints** added to `/dev-team:task` skill for both single-issue and parallel modes (#245).
- **Heartbeat mechanism** — background agents write status to `.dev-team/agent-status/{agent}.json` for visibility (#246).
- **"What belongs in memory" guidance** in all implementing agent definitions — agents record patterns/calibration, not derivable counts (#256).
- **Borges extraction filter** — skips volatile numeric metrics and config-derivable facts (#256).
- Frontend file patterns in post-change-review hook trigger Rams for design system compliance review.

### Changed
- Merge skill now uses Copilot check run monitoring instead of comment-count polling — faster (15s polls vs 30s), more reliable, handles race conditions after fix pushes (#252).
- Drucker delegation table includes Turing (research pre-step) and Rams (conditional UI reviewer).
- Quality Benchmarks in learnings.md replaced with convention references — no more volatile numeric counts.
- Agent memory seed content guidance updated to filter out counts and config-derivable facts.

### Fixed
- Config.json ghost hook "Task loop" removed (was not a real hook).
- ADR counts updated in agent memories (was 22, now 25+).

## [1.0.0] - 2026-03-25

### Added
- **ADR-024: Remove workflow-skills from templates** -- Workflow skills (merge, security-status) are no longer shipped in templates; they are project-specific customizations in `.claude/skills/` (fixes #243).
- **ADR-025: Project-specific customization in .claude/** -- Clear two-directory convention: `.dev-team/` = product install, `.claude/` = project customization (fixes #243).
- **Project-specific customization guidance in template CLAUDE.md** -- Documents `.dev-team/` vs `.claude/` separation for all installed projects (#241).
- **Copilot merge gate hook** -- Project-specific hook in `.claude/hooks/` enforcing Copilot review before merge (#234).
- **Cross-model reviewer assignment (ADR-023)** -- Architecture for running reviewers on alternative models for cross-validation (#223).
- **Cold start seed entries** for all 12 agent memories -- New installations start with bootstrapped domain-appropriate memory entries (#225).
- **`/dev-team:assess` skill** added to README documentation.
- **Legacy workflow skill cleanup migration** -- `dev-team update` from pre-1.0 versions removes leftover `dev-team-merge` and `dev-team-security-status` dirs from `.dev-team/skills/`.

### Changed
- **BREAKING: Minimum Node.js version bumped to 22+** (was 18+) (#230).
- **BREAKING: Workflow skills removed from templates** -- `/dev-team:merge` and `/dev-team:security-status` are no longer installed by `dev-team init`. Projects that need them should add them to `.claude/skills/` (#237).
- **Project-specific hooks moved from `.dev-team/hooks/` to `.claude/hooks/`** -- Survives `dev-team update` without overwrite (#240).
- Parallelization guidance reconciled -- agent teams and worktrees documented as complementary approaches (#232).
- Drucker main loop pattern enforced for this repo (#232).
- README.md updated: agent names corrected (drucker/tufte/brooks/conway), Hamilton and Borges added to diagram, Node.js 22+, 5 skills, 12 agents.
- Docs restructured: PRD.md moved to `docs/`, guides to `docs/guides/`, research to `docs/research/`.
- `cross_model: false` removed from agent definitions -- field is omitted until multi-model runtime is available (per ADR-023).
- Conway template merge process made conditional on `/dev-team:merge` availability.
- Template CLAUDE.md wording clarified: `.claude/hooks/` and `.claude/skills/` are not overwritten by update (not the entire `.claude/` directory).
- Merge skill `minimizeComment` documented as hiding comments only (GitHub API limitation, does not resolve threads).
- Agent memory test counts corrected from 217 to 306 in Beck and Borges memories.
- git-workflow skill: `user_invocable` set to `true`, hardcoded path replaced with generic placeholder.

### Fixed
- Stale quality benchmarks updated in learnings.md (#231).
- Improved assess-learnings skill with deeper assessment coverage (#217).
- Addressed unresolved Copilot review feedback from v0.11 PRs (#214, #229).
- Workflow skills listed explicitly in template CLAUDE.md (#221).
- Merge skill replies directed to Copilot threads, enforced on release PRs (#228).

### Internal
- 306 tests. 12 agents. 5 framework skills. 6 hooks. 25 ADRs.
- ADR immutability convention: decision content is immutable, only the Status field changes as a lifecycle marker.
- Docs restructured: `docs/guides/`, `docs/research/`, `docs/adr/`, `docs/design/`, `docs/benchmarks/`.

## [0.11.0] - 2026-03-24

### Added
- **Agent proliferation governance (ADR-022)** -- Formal policy requiring justification for new agents with 4 decision criteria and soft cap of 15 agents (#166).
- **Scenario-level orchestration integration tests** -- 32 tests covering agent selection, multi-domain routing, complexity triage, configurable thresholds, edge cases, and parallel file independence (#167).

### Changed
- Drucker evaluates extending existing agents before recommending new ones (ADR-022).
- Brooks flags new agent additions during architectural review (ADR-022).
- ADR index updated to include all 22 ADRs (was missing 008-021).

### Internal
- 308 tests (was 276). 12 agents. ADR-022 added.

## [0.10.0] - 2026-03-24

### Added
- **Two-tier memory architecture** -- Tier 1 shared learnings + Tier 2 agent calibration memory with documented purposes (#157).
- **Memory evolution** -- Borges deduplicates entries, supersedes contradictions, and auto-generates calibration rules after 3+ overrules on same tag (#157).
- **Temporal decay** -- Memory entries track `Last-verified` dates; Borges flags stale (30d) and archives old (90d) entries (#157).
- **Cold start seed memories** -- Borges generates domain-appropriate seed entries from project config on first run (#158).
- **Role-aware memory loading** -- Each agent loads only relevant cross-agent memory entries by tag (#158).
- **Context compaction** -- Structured summaries between review waves prevent context window exhaustion (#163).
- **Calibration metrics tracking** -- Per-task metrics in `.dev-team/metrics.md`: agents, findings, acceptance rates, convergence rounds (#164).
- **Review calibration feedback loop** -- Finding outcomes (accepted/overruled) feed back into agent memory and calibration rules (#165).
- **Agent teams support** -- Drucker operates as team lead with peer-to-peer communication for milestone-level batches (#173).
- **Agent teams onboarding** -- `dev-team init` enables agent teams by default with graceful degradation (#177).
- **npm caching in CI** -- All setup-node steps cache ~/.npm for faster installs (#197).

### Changed
- CI matrix reduced from 9 to 3 build-and-test jobs (Node 22 only) (#171).
- Minimum Node.js version bumped to >=22.0.0 (#171).
- Memory heuristics use structured entry detection instead of file size (#183, #185).
- `create-agent` scaffolding uses new two-tier MEMORY.md format (#186).
- Security-status skill name aligned with invocation convention (#188).

### Fixed
- Legacy MEMORY.md merge heuristic no longer misclassifies template boilerplate as substantive (#183).
- Status command correctly detects empty vs populated memory files (#185).
- Missing test assertion for security-status skill (#187).

### Internal
- 276 tests (was 274). 5 framework skills. 12 agents. ADR-019 amended for agent teams.

## [0.9.0] - 2026-03-24

### Added
- **Automated memory formation** -- Borges extracts structured memory entries automatically (#156).
- **Structured memory entries** -- Type, Source, Tags, Outcome, Context format (#156).
- **Output validation at handoff points** -- Drucker validates before spawning reviewers (#160).
- **Complexity-based review triage** -- LIGHT/STANDARD/DEEP review depths (#159).
- **Judge filtering stage** -- Drucker filters findings before presenting to humans (#161).
- **Silence-is-golden principle** -- All 12 agents: no-findings is valid (#161).
- **Legacy memory cleanup** -- dev-team update removes orphan memory dirs (#154).
- **Skill separation** -- merge and security-status identified as project-specific (#152).

### Changed
- Templates provide capabilities, not workflow opinions (#152).
- Framework skills to .dev-team/skills/ (#152).
- Security preamble generalized -- no longer GitHub-specific (#152).
- Borges writes directly to agent MEMORY.md files (#156).
- Review depth levels added to Szabo, Knuth, Brooks (#159).

### Internal
- 274 tests (was 262). 5 framework skills. 12 agents.

## [0.8.1] - 2026-03-24

### Changed
- Generalized Drucker's task completion from PR-merge-specific to deliverable-focused — work is done when the deliverable is delivered, not just when a PR is merged. Projects can still use `/dev-team:merge` if configured, but it is no longer hardcoded as the default (#149).
- Review skill no longer auto-triggers merge on Approve verdict — reviews report verdicts, they don't take merge actions (#149).

### Internal
- 262 tests. 8 skills. 12 agents.

## [0.8.0] - 2026-03-24

### Added
- Skill recommendations during `dev-team init` — detects project stack (React, Express, Django, etc.) and recommends relevant community skills from trusted sources (#127).
- Research-current-practices step added to Beck, Tufte, and Conway agents — agents now research ecosystem conventions before proposing solutions (#141).

### Changed
- Drucker now owns the full PR lifecycle through merge — tasks and reviews do not end at PR creation, they end at merge. Includes worktree cleanup and merge failure reporting (#144).

### Fixed
- Fixed stale learnings file path in `templates/CLAUDE.md` — was pointing to old `.claude/` location (#139).
- Added `security-status` skill to `templates/CLAUDE.md` skills list — was missing from the installed skills documentation (#140).
- Fixed agent memory enforcement — agents now write to MEMORY.md files instead of just outputting learnings in responses. Borges memory gate blocks completion when agent memory is empty (#142).

### Internal
- 262 tests (was 262). 8 skills total (was 7, added skill-recommendations). 12 agents.

## [0.7.0] - 2026-03-24

### Added
- `/dev-team:assess` skill — audit knowledge base health: learnings staleness, agent memory gaps, CLAUDE.md accuracy, and cross-source contradictions (#128, #129).
- `/dev-team:merge` skill — PR merge monitoring workflow with Copilot review handling, auto-merge with squash strategy, CI status monitoring, and post-merge actions (#122).
- Agent eval framework spike — test samples and evaluation runner for measuring agent quality (#118, #123).
- Implementing agents now research current practices before proposing solutions — reduces reinvention and aligns with ecosystem conventions (#133).
- Meta assess-learnings skill for dogfooding dev-team's own knowledge base (#134).
- Borges enforcement tightened — memory updates now mandatory at end of every task, review, and audit. Blocks without updates (#124).

### Changed
- Migrated dev-team files from `.claude/` to `.dev-team/` directory — cleaner separation between Claude Code config and dev-team project files (#120).
- Removed stateful hooks in favor of conversation context — simpler architecture, no file-system side effects (#113, #116).
- Migrated to TypeScript 6.0 with `node16` module resolution (#131).

### Fixed
- Addressed Copilot review findings from PR #120: improved error handling and code quality (#121).
- Addressed Copilot findings from multiple v0.7 PRs: tightened types, removed dead code (#126).

### Internal
- Added process learning: link PRs to issues with `Closes #NNN` for auto-close on merge (#135).

### Dependencies
- Bump `actions/checkout` from 4 to 6 (#108).
- Bump `actions/setup-node` from 4 to 6 (#109).

## [0.6.0] - 2026-03-23

### Added
- Hamilton agent (`@dev-team-hamilton`) — new infrastructure implementing agent covering Dockerfiles, IaC, CI/CD, Kubernetes, deployment, health checks, and monitoring. Named after Margaret Hamilton. Replaces Voss's infrastructure scope.
- `/dev-team:security-status` skill — proactive GitHub security signal monitoring (code scanning, Dependabot, secret scanning). 5 skills total.
- NFR ownership codified — all 9 standard NFR dimensions mapped to explicit agent ownership: Mori (API compatibility), Voss (data compatibility), Deming (portability).
- Dependabot enabled for npm and GitHub Actions version updates.
- CodeQL explicit workflow permissions added to CI.
- ADR-020: Brooks always-on for all code changes, evaluating quality attributes alongside structural review.
- Tufte doc-drift detection — Tufte now triggers on significant implementation changes (not just doc file changes) to catch missing or stale documentation.
- Parallel review wave enforcement (#93, ADR-019) — mechanical enforcement with state machine, sync barriers, and phase transition tracking.
- Git context caching hardened (#94, ADR-018) — atomic temp+rename writes, symlink prevention via `lstatSync`, `0o600` file permissions.
- Branch protection migrated to GitHub rulesets with required status checks.
- 273 tests total (was 117).

### Changed
- Brooks is now always-on for all code changes (was architecture files only), evaluating performance, maintainability, and scalability. Design principle: "depth justifies separation, breadth justifies consolidation."
- Voss scope narrowed to backend and application config; infrastructure scope transferred to Hamilton.
- Reviewers always-on: Szabo (security, deep) + Knuth (correctness, deep) + Brooks (architecture + quality attributes, broad). Was 2, now 3.
- Agents: 12 total (was 11). Added Hamilton.

## [0.5.0] - 2026-03-23

### Added
- `npx dev-team doctor` — installation health check (prefs, agents, hooks, CLAUDE.md, memory)
- `npx dev-team status` — show installed version, agents, hooks, skills, and memory status
- `npx dev-team --version` / `-v` — print version from package.json
- ADR-018: Shared git context for hook deduplication (temp file cache with 5s TTL)
- ADR-019: Parallel implementation with review waves (5-phase orchestration model)
- Cached git diff helper in tdd-enforce and pre-commit-gate hooks (reduced redundant git calls)
- Process audit: all 11 agents now have at least one automatic invocation trigger
- Beck flagged by post-change-review hook when test files change
- Borges spawned at completion of /dev-team:review and /dev-team:audit skills
- Drucker parallel orchestration section for multi-issue coordination
- 15 new tests from comprehensive coverage pass (174 total)

### Changed
- Hook timeouts reduced from 5000ms to 2000ms for cached git calls
- CLAUDE.md template includes parallel execution instructions

## [0.4.1] - 2026-03-23

### Fixed
- Update command now runs version-keyed migrations for agent renames
- Pre-v0.4 installations correctly migrate: old agent files deleted, memory dirs renamed, prefs updated
- Migration system extensible for future schema changes (MIGRATIONS array)
- 155 tests total

## [0.4.0] - 2026-03-23

### Added
- @dev-team-borges (Librarian) — always spawned at end of every task for memory review, cross-agent coherence, and system improvement
- Memory self-maintenance for all 11 agents — read/prune/compress MEMORY.md at session start
- Pre-commit lint/format hook — intercepts `git commit`, runs lint + format:check, blocks on failure
- Deming hook gap analysis — compares CI enforcement against local hooks, flags [GAP] findings
- Active hook spawning — post-change-review outputs mandatory `ACTION REQUIRED` directives, pre-commit gate blocks if reviews not completed
- Drucker (Lead) spawns Brooks (Architect) for ADR assessment before delegation
- Version migration in update command — compares/stamps package version
- Backup corrupted settings — copies corrupt JSON to .bak before overwriting
- Duplicate BEGIN marker protection in CLAUDE.md — replaces first pair only, preserves user content
- `getPackageVersion()` shared utility — eliminates hardcoded version strings
- Enforcement gap detection in scan module with [GAP] reporting
- 10 ADRs (008-017) covering all v0.2/v0.3 architectural decisions
- 154 tests total (20 new)

### Changed
- Agent rename: Architect→Brooks, Docs→Tufte, Release→Conway, Lead→Drucker (named after notable figures)
- Blocking hooks (safety-guard, tdd-enforce) fail closed on malformed input
- Windows path compatibility — all hooks normalize backslashes before pattern matching
- `readFile()` distinguishes ENOENT from EACCES/EPERM (warns on permission denied, re-throws others)
- Deming memory hygiene deferred to Borges (scope separation)
- Presets include Drucker + Borges in all bundles (prevents spawn failures)
- Zero lint warnings (oxlint clean)

### Fixed
- `--no-verify` regex tightened to avoid matching inside commit messages
- `npm` invocation on Windows uses `shell: true` for .cmd resolution
- Cross-platform test scripts use helper files instead of shell builtins
- `init.ts` version derived from `package.json` instead of hardcoded string

## [0.3.1] - 2026-03-22

### Fixed
- Blocking hooks (safety-guard, tdd-enforce) now fail closed (exit 2) on malformed JSON input instead of silently allowing operations
- `create-agent` frontmatter `name:` field now uses lowercase (`dev-team-codd`) instead of titlecase

### Added
- Update command auto-discovers new hooks not in preferences and installs them
- Skill directories auto-discovered from templates/skills/ — no hardcoded lists in init or update
- `listSubdirectories()` utility in files.ts
- 6 new tests: create-agent (5 tests), hook auto-discovery (1 test)
- 124 tests total

### Changed
- Cleaned up all lint warnings: unused `sessionId`, regex→`.endsWith()` — oxlint now reports 0 warnings

## [0.3.0] - 2026-03-22

### Added
- Orchestrator agent (`@dev-team-lead`) — auto-delegates tasks to specialists, manages adversarial review loop, resolves conflicts
- `--preset` flag for `npx dev-team init`: `backend`, `fullstack`, `data` bundles with pre-configured agent selection
- `npx dev-team create-agent <name>` command — scaffolds custom agent definition and memory template
- Custom agent authoring guide (`docs/custom-agents.md`) with format reference, blank template, memory guide, and worked example
- Configurable agent watch lists — file-pattern-to-agent mappings in `dev-team.json` with auto-spawn recommendations
- Memory freshness check in pre-commit gate — reminds to update learnings when code changes without memory updates
- 10 agents total (added Lead), 6 hooks (added watch list), 117 tests

### Changed
- Issues #20 (plugin format) and #21 (eject) moved to future considerations pending Claude Code marketplace availability

## [0.2.0] - 2026-03-22

### Added
- 3 new agents: Docs (documentation sync), Architect (ADR compliance, read-only/opus), Release Manager (versioning, changelog, semver)
- `/dev-team:review` skill — orchestrated multi-agent parallel review with file-pattern-based agent selection
- `/dev-team:audit` skill — full codebase security + quality + tooling audit with priority matrix
- `npx dev-team update` command — in-place upgrades preserving agent memory, learnings, and CLAUDE.md customizations
- Deming auto-scan on install — detects linters, formatters, SAST, CI/CD, and dependency audit gaps
- Post-change-review hook patterns for Docs, Architect, and Release Manager agents
- 16 new tests (106 total): update command integration, scan unit tests, updated assertions

## [0.1.2] - 2026-03-22

### Fixed
- Fixed bin entry stripped during npm publish
- Switched to Trusted Publishing (OIDC) for npm releases — no token secrets needed
- Added `--provenance` flag for npm supply chain security

## [0.1.0] - 2026-03-22

### Added
- 6 adversarial agents: Voss (backend), Mori (frontend), Szabo (security), Knuth (quality), Beck (tests), Deming (tooling)
- 5 enforced hooks: safety guard, TDD enforcement, post-change review, pre-commit gate, task loop
- 2 skills: /dev-team:challenge, /dev-team:task
- CLI installer with onboarding wizard (npx dev-team init)
- Persistent agent memory with adversarial calibration
- Shared team learnings file
- 6 Architecture Decision Records
- CI/CD with GitHub Actions (Node 18/20/22 x ubuntu/macos/windows)
- Product Requirements Document
- Release process with documented checklist
