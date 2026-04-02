# ADR-002: Zero npm dependencies

Date: 2026-03-22
Status: accepted

## Context

The dev-team CLI (`npx dev-team init`) is a file installer — it copies agent definitions, hook scripts, and skills into a target project. The core operations are file I/O, directory creation, and simple user prompts.

npm dependencies add supply chain risk, installation time, and maintenance burden. Every dependency is an attack surface (relevant since we ship a security auditor agent).

## Decision

The CLI uses only Node.js built-ins: `fs`, `path`, `readline`. No runtime dependencies.

Dev dependencies (ESLint, Prettier) are allowed for development but not shipped.

## Consequences

- `npx dev-team init` is fast — no `node_modules` to install
- Zero supply chain risk for the shipped package
- Must implement a few utilities ourselves (e.g., JSON deep merge, readline prompts)
- Limited to what Node.js built-ins provide — no fancy CLI frameworks
- Maximum compatibility with Node.js 18+
