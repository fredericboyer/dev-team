# ADR-007: TypeScript migration with oxlint/oxfmt

Date: 2026-03-22
Status: accepted

## Context

The CLI source (~500 LOC, 4 modules) was plain JavaScript with no type safety. package.json referenced ESLint and Prettier in scripts but neither was installed nor configured — `npm run lint` and `npm run format:check` both failed. The oxc.rs ecosystem (oxlint, oxfmt) offers Rust-native speed with zero-config TypeScript support, aligning with the Vite/VoidZero toolchain.

## Decision

- Migrate source files from JavaScript to TypeScript in `src/`, compiled to `dist/` via `tsc`
- Stay CommonJS (Node 18+ target, hooks use `require()`)
- Replace ESLint with **oxlint** (zero-config, 695+ rules)
- Replace Prettier with **oxfmt** (Prettier-compatible output, 30x faster)
- Tests stay as `.js` importing from `dist/` (no ts-node/tsx needed)
- Template hooks stay as `.js` (shipped to user projects, not compiled)
- All new tools are devDependencies only — ADR-002 (zero runtime dependencies) still holds

## Consequences

- Type errors caught at build time before tests run
- Faster lint/format cycles via native Rust binaries
- Build step required before test and publish (enforced via `pretest` and `prepublishOnly` scripts)
- Contributors must run `npm install` to get devDependencies
- CI pipeline gains lint + format gates alongside existing test matrix
