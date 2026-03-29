# README Structure Guidelines

A good README answers three questions fast: **What is this? How do I start? Where do I learn more?** This guide defines the minimum viable README and recommended additions.

## Tier 1 — Essential sections

These five sections are the minimum for a README that works:

| # | Section | What it answers | Detail level |
|---|---------|-----------------|--------------|
| 1 | **Title + one-liner** | What is this? | 1 sentence. Should work as a package registry description. |
| 2 | **Install / Getting started** | How do I start using it? | Copy-pasteable commands. State prerequisites. 5–15 lines. |
| 3 | **Usage** | What does it look like in practice? | Minimal working example. Show expected output if applicable. Link to docs/ for more. |
| 4 | **Contributing** | Can I contribute? How? | 2–5 lines or link to CONTRIBUTING.md. Must mention how to run tests. |
| 5 | **License** | Can I use this? | 1 line: license name + link to LICENSE file. |

**Why these five?** They answer what every visitor needs (what/how/can-I-use-it) and what every potential contributor needs (how-do-I-help).

### The copy-paste test

For each section, ask: "Can a developer act on this without leaving the README?"

- Install: they can install by copying commands. Pass.
- Usage: they see a working example. Pass.
- Contributing: they know the first step. Pass.

If a section needs more than ~20 lines to be actionable, move the detail to docs/ and link to it.

## Tier 2 — Recommended sections

Add these when the project warrants:

| Section | When to add | Detail level |
|---------|-------------|--------------|
| **Badges** | CI, package registry, or coverage exist | Status, version, license. 3–5 badges max. |
| **Features** | Multiple capabilities | Bullet list, not paragraphs. 5–10 items. |
| **Architecture / How it works** | System is not obvious at a glance | Diagram or brief explanation. Link to docs/design/ for depth. |
| **Documentation link** | External docs exist | 1 line with link. Do not duplicate docs content. |
| **Security** | Project accepts external input | Responsible disclosure process. 2–3 lines. |
| **Community** | Forum, Discord, etc. exist | Links only. |

## What does NOT belong in README

Move these to dedicated locations:

| Content | Where it belongs |
|---------|-----------------|
| Detailed API reference | docs/ or generated docs |
| Changelog | CHANGELOG.md or release notes |
| Roadmap | Issue tracker milestones (static roadmaps go stale) |
| Detailed architecture | docs/design/ or docs/adr/ |
| Configuration reference | docs/guides/ or inline help |
| Author bios | Link to contributor graph |

## README vs docs/

The README is a **landing page**, not a manual.

```
README.md          -->  What is this? How do I start? Where do I learn more?
docs/guides/       -->  How do I do X? (user-facing how-tos)
docs/design/       -->  How does X work internally? (design notes)
docs/adr/          -->  Why was X decided? (architecture decisions)
CONTRIBUTING.md    -->  How do I contribute? (detailed contributor guide)
CHANGELOG.md       -->  What changed? (release history)
```

**Rule of thumb**: "what/why/how-to-start" goes in README. "How-to-do-X-in-depth" goes in docs/. References go in docs/ or are generated.

## README vs CLAUDE.md

These serve different audiences and should not duplicate content:

| Aspect | README | CLAUDE.md |
|--------|--------|-----------|
| **Audience** | Humans browsing the repo | AI agents working in the repo |
| **Purpose** | Attract, orient, onboard | Instruct, constrain, contextualize |
| **Tone** | Onboarding + marketing | Directive + technical |
| **Contains** | What the project does, how to use it | How to work in this codebase, workflow rules |

**Acceptable overlap**: development commands (`npm test`, build scripts) appear in both — same source of truth surfaced for two audiences.

**Should not overlap**: project marketing (README only), agent behavior rules (CLAUDE.md only), hook/skill configuration (CLAUDE.md only).

## Should dev-team scaffold a README?

**No.** A scaffolded README would be generic boilerplate that projects immediately overwrite. Unlike CLAUDE.md (which has dev-team-specific content), README has no dev-team-specific sections worth generating.

Scaffolding creates false completeness — placeholder text signals the project is unfinished.

**Instead, dev-team validates.** Tufte and Conway can check that a README exists, covers the essential sections, and has not gone stale. This is a review concern, not an init concern.
