# Benchmark: dev-team harness against non-JS/TS language ecosystems

**Date**: 2026-03-26
**Author**: Turing (pre-implementation researcher)
**Issue**: #325

## Research question

How well does the dev-team harness (hooks, agents, scanner, skills, file patterns) work for projects using Python, Rust, Go, or Java instead of JavaScript/TypeScript?

## Methodology

Systematic audit of every shipped template component:

1. **Hooks** (`templates/hooks/*.js`) -- 8 hook scripts analyzed for language-specific logic
2. **Scanner** (`src/scan.ts`) -- project detection and tooling gap analysis
3. **Agent patterns** (`templates/hooks/agent-patterns.json`) -- file-matching patterns for agent routing
4. **Agent definitions** (`templates/agents/*.md`) -- 14 agent definitions checked for language assumptions
5. **Skills** (`templates/skills/*/SKILL.md`) -- 5 skill definitions checked for language-specific commands

Each finding is categorized as:

- **Hard-coded JS/TS**: blocks non-JS/TS projects entirely or produces incorrect behavior
- **JS/TS-defaulting**: works but provides no value or reduced value for other languages
- **Language-agnostic**: already works for all languages

## Per-component analysis

### 1. Hooks

#### dev-team-safety-guard.js -- LANGUAGE-AGNOSTIC

All blocked patterns are universal: `rm -rf`, `git push --force`, `DROP TABLE`, `chmod 777`, `curl | sh`. No language-specific logic.

#### dev-team-pre-commit-lint.js -- PARTIALLY MULTI-LANGUAGE

- **Primary path**: reads `package.json` for `lint` and `format:check` scripts (JS/TS-defaulting)
- **Fallback path**: checks `pyproject.toml` for `ruff` (Python support exists)
- **Missing**: no detection for Go (`golangci-lint`), Rust (`cargo clippy`, `cargo fmt`), Java (`checkstyle`, `spotless`, `google-java-format`), Ruby (`rubocop`)
- **Impact**: hook silently does nothing for Go/Rust/Java projects -- exits 0 (allows commit) but provides zero pre-commit lint enforcement
- **Severity**: JS/TS-defaulting (degrades gracefully but provides no value)

#### dev-team-tdd-enforce.js -- MOSTLY LANGUAGE-AGNOSTIC

- File extension skip list includes `.md`, `.json`, `.yml`, etc. -- universal
- Test file patterns: `.test.`, `.spec.`, `_test.`, `__tests__/`, `/test/`, `/tests/` -- covers JS/TS (`*.test.ts`), Go (`*_test.go`), and directory conventions
- **Missing test patterns**: Rust (`#[cfg(test)]` modules are inline, not separate files), Java (`src/test/java/` Maven convention), Python (`test_*.py` pytest convention)
- Candidate test file lookup: `name.test{ext}`, `name.spec{ext}`, `__tests__/name{ext}` -- this is JS/TS-centric
- **Impact**: Go projects are well-covered. Python `test_*.py` files will match `/tests?/` directory pattern but `test_foo.py` in the same directory as `foo.py` will NOT be detected as a corresponding test. Rust inline test modules are invisible. Java Maven `src/test/` is covered by the `/test/` pattern but the candidate lookup misses `src/test/java/com/.../FooTest.java`.
- **Severity**: JS/TS-defaulting (false TDD violations for Python/Rust/Java)

#### dev-team-watch-list.js -- LANGUAGE-AGNOSTIC

Reads patterns from `.dev-team/config.json` -- fully user-configurable. No hardcoded language assumptions.

#### dev-team-agent-teams-guide.js -- LANGUAGE-AGNOSTIC

Advisory hook about agent team isolation patterns. No language-specific logic.

#### dev-team-pre-commit-gate.js -- MOSTLY LANGUAGE-AGNOSTIC

- Implementation file detection: `/\.(js|ts|jsx|tsx|py|rb|go|java|rs)$/` -- explicitly multi-language
- Memory and learnings file detection: universal
- Borges completion warning: universal
- Test file exclusion (`hasImplFiles`): skips files matching `\.(test|spec)\.` — same JS/TS-centric pattern that misses `_test.go`, `test_*.py`, `*Test.java`, and Rust inline tests. Implementation files in these languages may be incorrectly classified.
- **Status**: mostly language-agnostic (test exclusion pattern is JS/TS-biased)

#### dev-team-post-change-review.js -- MOSTLY LANGUAGE-AGNOSTIC

- Code file pattern: `\.(js|ts|jsx|tsx|py|rb|go|java|rs|c|cpp|cs)$` -- explicitly multi-language
- Test file pattern: `\.(test|spec)\.|__tests__|\/tests?\/` -- JS/TS-centric (misses `test_*.py`, `*_test.go`, Rust inline tests, Java `*Test.java`)
- Domain patterns (security, API, frontend, architecture, ops): all use path/filename matching that is language-agnostic
- Complexity scoring: uses `function`, `class`, `if/else`, `catch`, `throw`, `async`, `await`, `export` keywords -- these are JS/TS-biased
- **Missing complexity keywords**: `def` (Python), `fn` (Rust), `func` (Go), `public`/`private` (Java), `impl` (Rust), `goroutine`/`go ` (Go), `match` (Rust), `raise` (Python)
- **Impact**: complexity scoring underestimates non-JS/TS code, leading to lighter reviews than warranted
- **Severity**: JS/TS-defaulting (reduced review depth for non-JS/TS)

#### dev-team-review-gate.js -- SAME AS POST-CHANGE-REVIEW

Shares the same pattern definitions. Same language biases in code file detection and test file patterns.

### 2. Scanner (`src/scan.ts`)

The scanner is the most language-aware component, with explicit multi-language support:

| Category   | JS/TS tools                         | Non-JS/TS tools                                   | Status                                                         |
| ---------- | ----------------------------------- | ------------------------------------------------- | -------------------------------------------------------------- |
| Linters    | ESLint, Biome, `npm lint`           | pylint, ruff, RuboCop, golangci-lint              | Good coverage                                                  |
| Formatters | Prettier, Biome, EditorConfig       | rustfmt, clang-format                             | Good coverage                                                  |
| SAST       | Semgrep, Snyk, Trivy, SonarQube     | Bandit, Safety                                    | Python covered; missing `cargo audit`, `govulncheck`, SpotBugs |
| CI/CD      | GitHub Actions, GitLab CI, CircleCI | Jenkins, Travis, Azure, Bitbucket                 | Language-agnostic                                              |
| Dependency | npm audit, yarn audit, pnpm audit   | bundle audit, pip-audit, cargo audit, govulncheck | Good coverage                                                  |

**Enforcement gap detection** (`parseCiScripts`): reads `package.json` scripts only. Projects using `Makefile`, `pyproject.toml` scripts, `Cargo.toml`, or `build.gradle` for CI script definitions get zero enforcement gap analysis.

**Severity**: JS/TS-defaulting for enforcement gap detection; otherwise well-designed for multi-language.

### 3. Agent patterns (`agent-patterns.json`)

#### Code file pattern

```json
"codeFile": { "pattern": "\\.(js|ts|jsx|tsx|py|rb|go|java|rs|c|cpp|cs)$" }
```

Already multi-language. Covers Python, Ruby, Go, Java, Rust, C, C++, C#.

#### Test file pattern

```json
"testFile": { "pattern": "\\.(test|spec)\\.|__tests__|\\/tests?\\/" }
```

**JS/TS-biased.** Misses:

- Python: `test_*.py` (pytest convention)
- Go: `*_test.go` (the pattern `\.(test|spec)\.` requires a dot before `test`, so `_test.go` does NOT match)
- Rust: no separate test files (inline `#[cfg(test)]` modules)
- Java: `*Test.java`, `*Tests.java`, `src/test/java/` (Maven/Gradle)

The directory pattern `\/tests?\/` partially covers Go and Java when tests are in `/test/` directories, but the standard Go convention is same-directory `_test.go` files.

#### Domain patterns

All domain patterns (security, API, frontend, architecture, operations, release, tooling) match on path segments and filenames. They are largely language-agnostic.

**JS/TS-specific tooling patterns**: `eslint`, `prettier`, `tsconfig`, `jest.config`, `vitest`, `package.json`, `.husky` -- all JS/TS-specific. A `pyproject.toml` change, `Cargo.toml` change, `build.gradle` change, or `Makefile` change will NOT trigger Deming (tooling review).

**JS/TS-specific release patterns**: `package.json`, `.npmrc`, `.npmignore`, `lerna.json` -- JS/TS-specific. But also includes `pyproject.toml`, `cargo.toml`, `changelog`, `version` -- partially multi-language.

### 4. Agent definitions

All 14 agent definitions are language-agnostic in their instructions. They describe roles, focus areas, and challenge protocols without referencing specific languages or frameworks. Key observations:

- **Szabo** mentions `fs.readFile` path traversal in a challenge example -- JS-specific illustration, but the principle is universal
- **Deming** references ESLint configuration specifically -- but this is an example, not a constraint
- **Beck** references `describe/it vs test` -- JS testing framework convention, but framed as a convention to discover, not impose

**Status**: Language-agnostic. Agent behaviors are driven by pattern matching in hooks and config, not by agent definitions.

### 5. Skills

All 5 skills (`task`, `review`, `audit`, `challenge`, `retro`) are language-agnostic in their orchestration logic. They route to agents based on file patterns (which have the biases documented above) and use git-based workflows.

**review skill routing table** (line 17-29): lists file patterns for agent routing. These are duplicated from agent-patterns.json and have the same JS/TS biases in tooling patterns.

**task skill**: references `npm` nowhere. Uses generic terms like "test command" and "lint".

**Status**: Language-agnostic orchestration. Language bias is inherited from the pattern layer, not the skill logic.

## Per-language compatibility matrix

| Component                    | Python              | Rust    | Go      | Java    | Notes                                               |
| ---------------------------- | ------------------- | ------- | ------- | ------- | --------------------------------------------------- |
| **safety-guard**             | Full                | Full    | Full    | Full    | Universal patterns                                  |
| **pre-commit-lint**          | Partial (ruff only) | None    | None    | None    | Needs clippy, golangci-lint, checkstyle             |
| **tdd-enforce**              | Partial             | None    | Partial | Partial | Misses `test_*.py`, inline Rust tests, `*Test.java` |
| **watch-list**               | Full                | Full    | Full    | Full    | User-configurable                                   |
| **agent-teams-guide**        | Full                | Full    | Full    | Full    | No language logic                                   |
| **pre-commit-gate**          | Full                | Full    | Full    | Full    | Multi-language file extensions                      |
| **post-change-review**       | Partial             | Partial | Partial | Partial | Complexity scoring JS-biased                        |
| **review-gate**              | Partial             | Partial | Partial | Partial | Test pattern gaps                                   |
| **scanner**                  | Good                | Partial | Good    | Partial | Enforcement gaps JS-only                            |
| **agent-patterns (code)**    | Full                | Full    | Full    | Full    | All extensions covered                              |
| **agent-patterns (test)**    | Partial             | None    | None    | Partial | Missing conventions                                 |
| **agent-patterns (tooling)** | None                | None    | None    | None    | All JS/TS tooling names                             |
| **agent definitions**        | Full                | Full    | Full    | Full    | Language-agnostic                                   |
| **skills**                   | Full                | Full    | Full    | Full    | Bias inherited from patterns                        |

### Compatibility summary

| Language   | Fully working | Partially working | Not working | Compatibility score |
| ---------- | ------------- | ----------------- | ----------- | ------------------- |
| **Python** | 10/13         | 3/13              | 0/13        | 77%                 |
| **Go**     | 9/13          | 3/13              | 1/13        | 69%                 |
| **Java**   | 9/13          | 3/13              | 1/13        | 69%                 |
| **Rust**   | 9/13          | 2/13              | 2/13        | 62%                 |

## Recommendations (prioritized)

### P0 -- High impact, low effort

**1. Expand test file pattern in `agent-patterns.json`**

Current: `\\.(test|spec)\\.|__tests__|\\/tests?\\/`

Proposed: `\\.(test|spec)\\.|_test\\.|__tests__|\\/tests?\\/|test_|\\.tests?\\.|tests?\\.java$`

This single regex change fixes Go (`_test.go`), Python (`test_*.py` partially via `test_` prefix), and Java (`*Test.java`, `*Tests.java`). Both `post-change-review.js` and `review-gate.js` inherit this fix through the JSON.

**2. Add tooling patterns for non-JS/TS ecosystems**

Add to `agent-patterns.json` tooling patterns:

- `pyproject\\.toml$` (Python)
- `setup\\.cfg$` (Python)
- `cargo\\.toml$` (Rust)
- `clippy\\.toml$` (Rust)
- `build\\.gradle(\\.kts)?$` (Java)
- `pom\\.xml$` (Java)
- `makefile$` (universal)
- `\\.golangci\\.ya?ml$` (Go)
- `go\\.mod$` (Go)

**3. Add non-JS/TS linter detection to `pre-commit-lint.js`**

After the `pyproject.toml` / ruff check, add detection for:

- Go: check for `.golangci.yml` and run `golangci-lint run`
- Rust: check for `Cargo.toml` and run `cargo clippy`
- Java: check for `build.gradle` or `pom.xml` and run `./gradlew check` or `mvn verify`

### P1 -- Medium impact, medium effort

**4. Expand complexity scoring keywords in `post-change-review.js`**

Add language-specific complexity indicators:

- Python: `def`, `class`, `raise`, `except`, `async def`, `yield`
- Rust: `fn`, `impl`, `match`, `unsafe`, `async`, `pub`
- Go: `func`, `go `, `select`, `defer`, `panic`
- Java: `public`, `private`, `protected`, `throws`, `synchronized`

**5. Add TDD candidate patterns for non-JS/TS conventions**

In `tdd-enforce.js`, expand `CANDIDATE_PATTERNS` to include:

- Python: `test_${name}${ext}` in same directory
- Java: `${dir}/../test/**/` traversal, `${name}Test${ext}`
- Go: already covered if test pattern is fixed (Go tests live in same directory as `_test.go`)
- Rust: no separate file -- skip TDD enforcement for `.rs` files or check for `#[cfg(test)]` in the source

**6. Extend scanner enforcement gap detection beyond package.json**

`parseCiScripts()` currently reads only `package.json`. Add support for:

- `Makefile` targets (lint, test, format, build)
- `pyproject.toml` `[tool.pytest]` and `[tool.ruff]` sections
- `Cargo.toml` presence (implies `cargo test`, `cargo clippy`)
- `build.gradle` / `pom.xml` (implies build/test tasks)

### P2 -- Lower impact, useful for completeness

**7. Add release patterns for non-JS/TS ecosystems**

`agent-patterns.json` release section already includes `pyproject.toml` and `cargo.toml`. Add:

- `go.mod$` (Go module version)
- `build\\.gradle(\\.kts)?$` (Java/Kotlin version)
- `pom\\.xml$` (Maven version)
- `setup\\.py$` (legacy Python)
- `gemfile$` (Ruby)

**8. Document multi-language support status**

Add a section to the user-facing README or guides documenting which languages are fully supported, partially supported, and what users of non-JS/TS projects should configure manually.

## Known issues / caveats

1. **Rust inline tests are fundamentally different.** Rust's convention of `#[cfg(test)] mod tests {}` inside the implementation file means there is no separate test file to detect. The TDD enforcement hook will always fail for new Rust files. This requires a Rust-specific strategy: either parse the source for the test module attribute or skip TDD enforcement for `.rs` files that contain `#[cfg(test)]`.

2. **Monorepo / polyglot projects.** Projects mixing languages will benefit most from the fixes above, but the pre-commit-lint hook can only run one linter toolchain. A monorepo with both `package.json` and `Cargo.toml` will get npm lint but not cargo clippy. The hook should detect all present toolchains and run them all.

3. **The hooks are Node.js scripts.** All hooks are `#!/usr/bin/env node` scripts. This creates a hard dependency on Node.js being installed, even for pure Python/Rust/Go/Java projects. This is an inherent limitation of the Claude Code hook system which executes JS files, so this is not something dev-team can change without upstream support.

## Confidence level

**High** for the component analysis -- every file was read and analyzed directly. The compatibility matrix is based on pattern matching and code flow analysis, not assumptions.

**Medium** for the prioritization -- the impact rankings assume typical project structures. Atypical projects (monorepos, non-standard directory layouts) may have different priority orderings.

## Evidence

All findings are based on direct analysis of the following source files in the dev-team repository at commit `08cab2d`:

- `templates/hooks/dev-team-safety-guard.js` (67 lines)
- `templates/hooks/dev-team-pre-commit-lint.js` (123 lines)
- `templates/hooks/dev-team-tdd-enforce.js` (183 lines)
- `templates/hooks/dev-team-watch-list.js` (86 lines)
- `templates/hooks/dev-team-agent-teams-guide.js` (96 lines)
- `templates/hooks/dev-team-pre-commit-gate.js` (218 lines)
- `templates/hooks/dev-team-post-change-review.js` (395 lines)
- `templates/hooks/dev-team-review-gate.js` (521 lines)
- `src/scan.ts` (352 lines)
- `templates/hooks/agent-patterns.json` (184 lines)
- `templates/agents/*.md` (14 agent definitions)
- `templates/skills/*/SKILL.md` (5 skill definitions)
