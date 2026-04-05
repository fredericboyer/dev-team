## Research brief: TypeScript hook pre-compilation (#782)

### Question

How should dev-team migrate its 12 hook scripts (~1920 lines) and 2 shared libraries (~344 lines) from plain JavaScript to TypeScript, pre-compiling during `npm run build` and shipping compiled JS to target projects?

### Current state

- **12 hooks** in `templates/hooks/*.js` — all CommonJS, `"use strict"`, shebang `#!/usr/bin/env node`
- **2 shared libs** in `templates/hooks/lib/` — `git-cache.js` (72 lines), `safe-regex.js` (272 lines)
- All hooks use only Node.js built-ins (`fs`, `path`, `child_process`, `crypto`, `os`) and the 2 local libs
- Zero npm dependencies at runtime — hooks must remain standalone
- Hooks receive input via `JSON.parse(process.argv[2])` — a common schema with `tool_input.command`, `tool_input.file_path`, etc.
- `init.ts` and `update.ts` copy hooks from `templates/hooks/` to `.dev-team/hooks/` in target projects
- `package.json` `files` field ships `templates/` to npm — hooks are delivered as-is

### Approaches evaluated

#### Approach A: tsc project references (separate tsconfig for hooks)

**How it works:** Create `tsconfig.hooks.json` with `rootDir: "src/hooks"`, `outDir: "templates/hooks"`, `composite: true`. Reference it from the root `tsconfig.json`. Build via `tsc --build`.

**Pros:**
- Uses existing toolchain (tsc) — no new dependency
- Full type checking, declaration files if needed
- IDE navigation works naturally (`src/hooks/` is just another TS directory)
- Shared types can be imported from `src/` via project references

**Cons:**
- No official `tsc` option exists for adding shebang lines (verified by absence in CLI reference) — requires a post-build script to prepend `#!/usr/bin/env node`
- tsc cannot bundle `lib/` imports into standalone files — the `require("./lib/safe-regex")` pattern persists in output, meaning the lib directory structure must be preserved
- Compiled output goes to `templates/hooks/` which is git-tracked — creates noise (compiled JS alongside... nothing, since source moves to `src/hooks/`)
- `composite` requires `declaration: true` — generates `.d.ts` files in output that must be excluded
- Two separate compilation passes (main + hooks) — adds ~1-2s to build time

**Verdict:** Viable but awkward. The shebang post-processing and `.d.ts` cleanup are ongoing maintenance. The lib structure is preserved which is fine, but it's the most complex approach for hooks that are fundamentally standalone scripts.

#### Approach B: esbuild for hooks (recommended)

**How it works:** Add esbuild as a devDependency. Each hook TS file in `src/hooks/` is an entry point. esbuild bundles each into a standalone JS file in `templates/hooks/`, inlining `lib/` imports. A build script runs esbuild after tsc.

**Pros:**
- Each hook becomes a **single self-contained file** — no `lib/` directory needed in output
- `platform: "node"` automatically externalizes Node.js built-ins (`fs`, `path`, etc.)
- `banner: { js: "#!/usr/bin/env node" }` adds shebang natively — no post-processing
- `format: "cjs"` produces CommonJS output matching current hook format
- Sub-second build time for 12 files (~50ms total)
- No `.d.ts` generation to clean up
- Type checking delegated to `tsc --noEmit` (already available via `npm run typecheck`)

**Cons:**
- New devDependency (esbuild) — but it's a well-maintained, zero-dependency binary
- esbuild does not type-check — must rely on separate `tsc --noEmit` step (already exists as `npm run typecheck`)
- Bundled output is less readable than tsc output (but hooks are compiled artifacts, not meant for human editing)
- If hooks grow to import from `src/` types at runtime (not just type imports), circular build ordering must be managed

**Configuration sketch:**
```js
// scripts/build-hooks.js
const esbuild = require("esbuild");
const glob = require("node:fs").readdirSync("src/hooks")
  .filter(f => f.endsWith(".ts"));

esbuild.buildSync({
  entryPoints: glob.map(f => `src/hooks/${f}`),
  outdir: "templates/hooks",
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node22",
  banner: { js: "#!/usr/bin/env node" },
  // lib/ files are bundled inline, no external needed
});
```

**Verdict:** Best fit. Hooks are standalone scripts that benefit from single-file output. esbuild's Node.js platform support, shebang injection, and speed make it purpose-built for this use case.

#### Approach C: swc for hooks

**How it works:** Similar to esbuild but using swc CLI. Each hook file compiled individually.

**Pros:**
- Very fast compilation (Rust-based)
- Supports CommonJS output

**Cons:**
- swc is a transpiler, not a bundler — `require("./lib/safe-regex")` would remain in output (like tsc)
- Requires additional bundler if single-file output is desired
- Less mature Node.js-specific features compared to esbuild
- Configuration via `.swcrc` is less ergonomic for a secondary build target

**Verdict:** Inferior to esbuild for this use case because it can't bundle lib imports into standalone files without an additional tool.

#### Approach D: Rollup with TypeScript plugin

**How it works:** Rollup with `@rollup/plugin-typescript` or `rollup-plugin-esbuild`. Each hook as an entry point.

**Pros:**
- Can bundle to standalone files
- Mature plugin ecosystem
- Can add banners (shebang)

**Cons:**
- Significantly more configuration than esbuild (plugins, output format, externals)
- Slower than esbuild
- Overkill for simple standalone scripts — Rollup's strength is library/application bundling with tree-shaking, not script compilation
- Adds 3+ devDependencies (rollup + plugins)

**Verdict:** Overkill. The additional complexity is not justified when esbuild does the same job with less configuration.

### Recommendation

**Approach B: esbuild for hooks.**

The build pipeline change is:
1. Hook source moves from `templates/hooks/*.js` to `src/hooks/*.ts`
2. Shared libs move from `templates/hooks/lib/*.js` to `src/hooks/lib/*.ts` (bundled into each hook at build time)
3. `npm run build` becomes `tsc && node scripts/build-hooks.js`
4. esbuild outputs compiled, standalone JS files to `templates/hooks/` (git-tracked, shipped via npm)
5. `lib/` directory is no longer needed in `templates/hooks/` — each hook is self-contained
6. `init.ts` and `update.ts` copy logic simplifies — no `lib/` directory to handle separately

### Source location decision

**Source in `src/hooks/` (recommended)** over keeping in `templates/hooks/`:

| Factor | `src/hooks/` | `templates/hooks/` (with parallel build) |
|--------|-------------|------------------------------------------|
| Import paths | Natural — `import { safeRegex } from "./lib/safe-regex"` | Must configure path aliases |
| Shared types | Direct imports from `../init` or `../files` | Requires path mapping or copy |
| IDE navigation | Standard — same source tree | Two disconnected source trees |
| Build config | One esbuild config targeting `templates/hooks/` | Separate tsconfig with different rootDir |
| oxlint/oxfmt | Lint/format scripts retargeted to `src/hooks/`; `templates/hooks/` excluded as compiled output | Works but lint/format scripts must exclude generated files |
| Git tracking | Source in `src/`, compiled output in `templates/` (both tracked) | Source and output in same directory — confusing |

### Delivery mechanism impact

**Changes to `init.ts`:**
- Hook copy loop remains the same (copies from `templates/hooks/`)
- **Remove `lib/` directory copy logic** (lines 516-523 of `init.ts`) — hooks are now self-contained
- No other changes — the compiled JS in `templates/hooks/` is identical in structure to current JS

**Changes to `update.ts`:**
- Same as init — remove `lib/` directory sync logic (lines 866-878 of `update.ts`)
- Hook comparison/update logic stays the same

**Migration transition:**
- No transition needed — the change is atomic. Once `build` runs, `templates/hooks/` contains compiled JS that looks and works exactly like the current JS. The `init`/`update` copy logic doesn't know or care whether the source was handwritten JS or compiled TS.
- `templates/hooks/lib/` directory is deleted from the repo — hooks no longer have runtime dependencies on it

### User customization implications

**No impact on user custom hooks.** Users write hooks in `.claude/hooks/` (JS). Product hooks live in `.dev-team/hooks/`. The two are completely separate. Users never import from product hook libs.

**Type definitions for hook input schemas (optional but valuable):**
- A `HookInput` interface describing the `process.argv[2]` JSON structure would be useful
- Could be exported from a `src/hooks/types.ts` shared between hooks
- Not strictly necessary for users (they write JS), but useful if published as a `@types` export or documented in CLAUDE.md for AI agents writing custom hooks

### Shared type interfaces

Types that would benefit from sharing between `src/` and `src/hooks/`:

| Type | Current location | Hook usage |
|------|-----------------|------------|
| `HookInput` (new) | N/A — each hook does ad-hoc `JSON.parse(process.argv[2])` | All 12 hooks — standardizes input parsing |
| `WorkflowConfig` | `src/init.ts` | `review-gate.js`, `merge-gate.js` read workflow config from `.dev-team/preferences.json` |
| `SidecarFile` (new) | N/A — ad-hoc JSON shape in review-gate | `review-gate.js`, `pre-commit-gate.js` read sidecar files |

**Circular dependency risk:** Low. Hooks would import *types only* from `src/` (using `import type`). esbuild strips type imports at build time — no runtime dependency. The build order is: `tsc` (compiles `src/` to `dist/`) then `esbuild` (compiles `src/hooks/` to `templates/hooks/`). No circularity.

### ADR content

The ADR should cover:

1. **Decision**: Migrate hook source from `templates/hooks/*.js` to `src/hooks/*.ts`; compile via esbuild to standalone JS files in `templates/hooks/`
2. **Context**: Hooks are the largest non-TypeScript subsystem in the project (~2264 lines). They share patterns with `src/` but cannot use shared types, have no type safety, and linting coverage is limited to what oxlint can infer from JS
3. **Build tool choice**: esbuild over tsc project references — single-file output, shebang injection, speed
4. **Source location**: `src/hooks/` over `templates/hooks/` — natural imports, shared types, IDE coherence
5. **Delivery unchanged**: `templates/hooks/` remains the shipping directory; `init.ts`/`update.ts` copy from there as before
6. **lib/ elimination**: Shared libraries are bundled into each hook — simpler delivery, no runtime dependencies between files
7. **Supersedes**: N/A (no prior ADR on hook compilation)

### Evidence

| Claim | Source URL | Verified |
|-------|-----------|----------|
| esbuild bundles multiple entry points to standalone files | https://esbuild.github.io/api/#entry-points | yes |
| esbuild `platform: "node"` auto-externalizes Node.js built-ins | https://esbuild.github.io/api/#platform | yes |
| esbuild `banner` option injects shebang lines | https://esbuild.github.io/api/#banner | yes |
| esbuild `format: "cjs"` produces CommonJS output | https://esbuild.github.io/api/#format | yes |
| esbuild does not type-check TypeScript | https://esbuild.github.io/content-types/#typescript | yes |
| esbuild `external` option keeps packages out of bundle | https://esbuild.github.io/api/#external | yes |
| tsc project references require `composite: true` and `declaration: true` | https://www.typescriptlang.org/docs/handbook/project-references.html | yes (via web search; CSS-only from direct fetch) |
| tsc cannot inject shebang lines | UNVERIFIED — no official docs URL states this explicitly; verified by absence of any shebang option in tsc CLI reference |
| swc CLI compiles individual files but does not bundle | https://swc.rs/docs/usage/cli | yes |

### Known issues / caveats

1. **Compiled JS in git**: `templates/hooks/` will contain esbuild-generated JS that is committed to the repo. This is intentional (it's what gets shipped via npm) but reviewers should know these files are build artifacts.
2. **oxlint/oxfmt on compiled output**: The current `package.json` lints `templates/hooks/`. After migration, linting should target `src/hooks/` (source) not `templates/hooks/` (compiled output). The `lint` and `format` scripts need updating.
3. **`.gitattributes`**: Consider marking `templates/hooks/*.js` as `linguist-generated` so GitHub diffs collapse them by default and they don't count toward language statistics.
4. **Build ordering**: `tsc` must complete before `esbuild` runs, since hooks may import types from `src/`. The build script should be sequential: `tsc && node scripts/build-hooks.js`.
5. **Pre-existing hook modifications in target projects**: Users who manually edited hooks in `.dev-team/hooks/` will have their edits overwritten on `dev-team update` (same as today). No new risk.

### Confidence level

**High.** esbuild's capabilities for this use case are well-documented and verified. The hook structure is simple (standalone Node.js scripts with Node built-in imports and 2 local libs). The delivery mechanism change is minimal. The main risk is build pipeline complexity, which is low given esbuild's configuration simplicity.

### Recommended Actions

- **Title**: Migrate hook source from JS to TS with esbuild compilation
  **Severity**: P1
  **Files affected**: `templates/hooks/*.js` (move to `src/hooks/*.ts`), `templates/hooks/lib/*.js` (move to `src/hooks/lib/*.ts`), `package.json` (build script), `tsconfig.json` (exclude update), `src/init.ts` (remove lib copy), `src/update.ts` (remove lib copy)
  **Scope**: L

- **Title**: Write ADR for hook compilation decision
  **Severity**: P1
  **Files affected**: `docs/adr/adr-NNN-hook-compilation.md`
  **Scope**: S

- **Title**: Add `HookInput` type interface for hook input schema
  **Severity**: P2
  **Files affected**: `src/hooks/types.ts` (new)
  **Scope**: S

- **Title**: Update lint/format scripts to target `src/hooks/` instead of `templates/hooks/`
  **Severity**: P1
  **Files affected**: `package.json`
  **Scope**: S

- **Title**: Add `.gitattributes` for `templates/hooks/*.js` as linguist-generated
  **Severity**: P2
  **Files affected**: `.gitattributes`
  **Scope**: S

- **Title**: Add sidecar and workflow config shared types for hooks
  **Severity**: P2
  **Files affected**: `src/hooks/types.ts`, hooks that read sidecar/config files
  **Scope**: M
