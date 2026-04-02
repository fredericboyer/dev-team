# Research Brief: README Structure Guidelines

## Question

What sections are essential in a README? What level of detail per section? Where is the line between README and docs/? How does README relate to CLAUDE.md? Should dev-team scaffold a README on init?

## Survey of Well-Regarded OSS READMEs

### Patterns observed

Surveyed: React, Next.js, Tailwind CSS, Prisma, Express. These represent a spectrum from minimal (Tailwind) to comprehensive (Prisma, Express).

| Section                | React      | Next.js  | Tailwind | Prisma         | Express                |
| ---------------------- | ---------- | -------- | -------- | -------------- | ---------------------- |
| One-liner description  | Yes        | Yes      | Yes      | Yes            | Yes                    |
| Badges                 | Yes        | Yes      | Yes      | Yes            | Yes                    |
| What it is / Features  | Implicit   | Implicit | No       | Yes (detailed) | Yes                    |
| Installation           | Minimal    | No       | No       | Yes (detailed) | Yes                    |
| Quick start / Usage    | Yes (code) | No       | No       | Yes (5-step)   | Yes                    |
| Documentation link     | Yes        | Yes      | Yes      | Implicit       | Yes                    |
| Contributing           | Yes        | Yes      | Yes      | No             | Yes                    |
| License                | Yes        | Yes      | Implicit | Yes            | Yes                    |
| Community              | No         | Yes      | Yes      | Yes            | Yes (Docs & Community) |
| Security               | No         | Yes      | No       | Yes            | Via Contributing       |
| Philosophy             | No         | No       | No       | No             | Yes                    |
| Visuals / Architecture | No         | Logo     | Logo     | Logo           | No                     |

### Key observations

1. **Every project has a one-liner.** This is the single universal element — a sentence that answers "what is this?"
2. **Minimal READMEs work for established projects.** Tailwind and Next.js get away with near-empty READMEs because their external documentation sites carry the weight. Newer or smaller projects cannot rely on this.
3. **The best READMEs answer three questions fast:** What is this? How do I start? Where do I learn more?
4. **Installation and quick start are the highest-value sections** after the description. Prisma and Express — the most developer-friendly READMEs in the survey — both have concrete, copy-pasteable getting-started sequences.
5. **Feature lists are underrated.** They let developers quickly assess fit without reading docs. Only Prisma and Express include them, and both are better for it.
6. **Contributing sections range from a sentence to a full guide.** All surveyed projects except Prisma include one, even if it just links to CONTRIBUTING.md.
7. **Security sections are emerging as standard.** Next.js and Prisma both include them. Responsible disclosure guidance prevents security bugs from being filed as public issues.

## Existing Guidelines Reviewed

### Make a README (makeareadme.com)

Suggests 12 sections: Name, Description, Badges, Visuals, Installation, Usage, Support, Roadmap, Contributing, Authors, License, Project Status. Key principle: "too long is better than too short." Sections should be tailored to the project, not rigidly applied.

### The Good Docs Project

Emphasizes Description as "the most critical part." All sections are technically optional but strategically important. Recommends friendly voice, active language, user-focused benefits over technical capabilities.

### readme-best-practices (jehna)

Minimal template: logo, tagline, getting started, development guide, features, configuration, contributing, links, license. Pragmatic — focuses on what developers actually need when they land on a repo.

## Approaches Evaluated

### Approach A: Prescriptive template (many required sections)

Define 10+ sections, mark some required, some optional. Similar to Make a README's full list.

- **Pro**: Comprehensive. Ensures no critical section is forgotten.
- **Con**: Projects resist templates that feel bureaucratic. Empty sections (Roadmap, Authors) are worse than absent ones. Contradicts dev-team's "don't encode what agents can discover" principle.

### Approach B: Minimum viable + recommended (tiered)

Define 5 essential sections (the minimum to not be half-assed), then a tier of recommended sections for projects that want more.

- **Pro**: Low barrier to adoption. Clear "you must have at least this." Projects can grow into the recommended tier.
- **Con**: Some projects will stop at the minimum and never revisit.

### Approach C: Landing-page philosophy (README as index)

README answers "what, why, how-to-start, where-to-learn-more" and delegates everything else to docs/. Similar to Tailwind/Next.js model.

- **Pro**: README stays concise and maintainable. Single source of truth for each topic.
- **Con**: Only works when docs/ actually exists and is maintained. A README that points to empty docs/ is worse than a longer README.

## Recommendation

**Approach B: Minimum viable + recommended**, with a landing-page orientation from Approach C.

### Tier 1 — Essential (the minimum viable README)

These five sections are the minimum for a README that is not half-assed:

| #   | Section                       | What it answers                     | Detail level                                                                                 |
| --- | ----------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------- |
| 1   | **Title + one-liner**         | What is this?                       | 1 sentence. Should work as an npm/PyPI description.                                          |
| 2   | **Install / Getting started** | How do I start using it?            | Copy-pasteable commands. Prerequisites stated. 5-15 lines.                                   |
| 3   | **Usage**                     | What does it look like in practice? | Minimal working example. Show expected output if applicable. Link to more examples in docs/. |
| 4   | **Contributing**              | Can I contribute? How?              | 2-5 lines or link to CONTRIBUTING.md. Must include how to run tests.                         |
| 5   | **License**                   | Can I use this?                     | 1 line: license name + link to LICENSE file.                                                 |

**Why these five?** They answer the three questions every visitor has (what/how/can-I-use-it) and the one question every potential contributor has (how-do-I-help).

### Tier 2 — Recommended (better README)

Add these when the project warrants:

| Section                         | When to add                                 | Detail level                                                  |
| ------------------------------- | ------------------------------------------- | ------------------------------------------------------------- |
| **Badges**                      | When CI, npm, or coverage exist             | Status, version, license. Keep to 3-5 badges max.             |
| **Features**                    | When the project has multiple capabilities  | Bullet list, not paragraphs. 5-10 items max.                  |
| **Architecture / How it works** | When the system isn't obvious from a glance | Diagram or brief explanation. Link to docs/design/ for depth. |
| **Documentation link**          | When external docs exist                    | 1 line with link. Don't duplicate docs content in README.     |
| **Security**                    | When the project accepts external input     | Responsible disclosure process. 2-3 lines.                    |
| **Community**                   | When there's a forum, Discord, etc.         | Links only.                                                   |

### What does NOT belong in README

- **Detailed API reference** → docs/ or generated docs
- **Changelog** → CHANGELOG.md or GitHub releases
- **Roadmap** → GitHub milestones or project board (static roadmaps in READMEs go stale)
- **Detailed architecture** → docs/design/ or docs/adr/
- **Configuration reference** → docs/guides/ or inline help
- **Author bios** → mostly vanity; a "Contributors" link to GitHub's contributor graph is sufficient

### Detail calibration: the "copy-paste test"

For each section, ask: **"Can a developer act on this without leaving the README?"**

- Install section: they should be able to install by copying commands. Pass.
- Usage section: they should see a working example. Pass.
- Contributing section: they should know the first step (fork, install, test). Pass.
- Architecture section: they should understand the shape, not every detail. Deliberately partial — links to docs/ for depth.

If a section requires more than ~20 lines to be actionable, it belongs in docs/, with the README linking to it.

## README vs docs/ Relationship

The README is a **landing page**, not a manual. The relationship:

```
README.md          →  "What is this? How do I start? Where do I learn more?"
docs/guides/       →  "How do I do X?" (user-facing how-tos)
docs/adr/          →  "Why was X decided?" (architectural decisions)
docs/design/       →  "How does X work internally?" (design notes)
docs/research/     →  "What did we investigate?" (research briefs)
docs/benchmarks/   →  "How does X perform?" (benchmark reports)
CONTRIBUTING.md    →  "How do I contribute?" (detailed contributor guide)
CHANGELOG.md       →  "What changed?" (release history)
```

**Rule of thumb**: if the content answers "what/why/how-to-start" → README. If it answers "how-to-do-X-in-depth" → docs/. If it's a reference → docs/ or generated.

## README vs CLAUDE.md Relationship

These files serve different audiences and should not overlap:

| Aspect       | README                               | CLAUDE.md                                                 |
| ------------ | ------------------------------------ | --------------------------------------------------------- |
| **Audience** | Humans browsing the repo             | AI agents working in the repo                             |
| **Purpose**  | Attract, orient, onboard             | Instruct, constrain, contextualize                        |
| **Tone**     | Marketing + onboarding               | Directive + technical                                     |
| **Content**  | What the project does, how to use it | How to work in this codebase, workflow rules, agent setup |
| **Overlap**  | Project description, dev commands    | Dev commands (acceptable duplication)                     |

**Acceptable overlap**: development commands (`npm test`, `npm run build`) appear in both because README serves contributors and CLAUDE.md serves agents. This is fine — it's the same source of truth (package.json scripts), just surfaced in two contexts.

**Should not overlap**: project description/marketing (README only), agent behavior rules (CLAUDE.md only), hook/skill configuration (CLAUDE.md only), architecture decisions (ADRs, linked from either).

## Should dev-team Scaffold a README?

**No — but dev-team should validate README presence and quality.**

Reasoning:

1. **README is project-specific.** A scaffolded README would be generic boilerplate that projects immediately overwrite. Unlike CLAUDE.md (which has a dev-team-specific section), README has no dev-team-specific content.
2. **Scaffolding creates false completeness.** A generated README with placeholder text ("TODO: describe your project") is worse than no README — it signals the project is unfinished or lazy.
3. **Validation is more valuable.** Conway (release manager) or Tufte (documentation) can validate that a README exists, has the essential sections, and hasn't gone stale. This is a review concern, not an init concern.

**However**: dev-team could scaffold a `.github/README-checklist.md` or include README validation in the retro/audit skills. This is lighter-touch and more aligned with dev-team's philosophy of enforcement over generation.

**Alternative considered**: Scaffold a minimal README only if none exists (like how `npm init` creates package.json). Rejected because the README requires project-specific content that dev-team cannot generate — unlike package.json which has sensible defaults.

## Evidence

- [Make a README](https://www.makeareadme.com/) — community guidelines for README structure
- [The Good Docs Project — README template](https://www.thegooddocsproject.dev/template/readme) — structured template with guidance
- [readme-best-practices](https://github.com/jehna/readme-best-practices) — minimal practical template
- [React README](https://github.com/facebook/react) — minimal, documentation-first approach
- [Next.js README](https://github.com/vercel/next.js) — minimal, community-focused
- [Tailwind CSS README](https://github.com/tailwindlabs/tailwindcss) — ultra-minimal, delegates to docs site
- [Prisma README](https://github.com/prisma/prisma) — comprehensive, developer-friendly with code examples
- [Express README](https://github.com/expressjs/express) — balanced, includes philosophy and examples
- [awesome-readme](https://github.com/matiassingers/awesome-readme) — curated list of exemplary READMEs

## Known Issues / Caveats

1. **The "established project" exception.** Tailwind and Next.js prove that minimal READMEs can work — but only when backed by comprehensive external docs. Dev-team's guidelines should acknowledge this but not optimize for it, since most projects using dev-team are not at that scale.
2. **README staleness.** READMEs go stale when they contain volatile information (version numbers, feature lists, contributor lists). The tiered approach mitigates this by keeping Tier 1 stable and making Tier 2 optional.
3. **Non-English READMEs.** This research assumes English. Internationalization of READMEs (via translated README files like README.zh-CN.md) is out of scope but worth noting.
4. **Monorepo READMEs.** Monorepos need a root README that orients and per-package READMEs that are self-contained. This research focuses on single-package repos. Monorepo guidance would be a separate investigation.

## Confidence Level

**High** — README best practices are well-established and stable. The surveyed sources are authoritative and consistent. The tiered model synthesizes consensus rather than introducing novel ideas. What would increase confidence: user testing of the tiered model on 3-5 real projects to validate that Tier 1 is sufficient and Tier 2 adds value without busywork.

## Recommended Actions

- **Title**: Add README validation to retro/audit skills
  **Severity**: P1
  **Files affected**: `templates/skills/dev-team-retro/SKILL.md`, `templates/skills/dev-team-audit/SKILL.md`
  **Scope**: S
  **Description**: Retro and audit skills should check that README.md exists and contains the five essential sections (title+one-liner, install, usage, contributing, license). Flag missing sections as `[SUGGESTION]` findings, not blockers. This aligns with dev-team's validation-over-scaffolding philosophy.

- **Title**: Add README guidelines to docs/guides/
  **Severity**: P2
  **Files affected**: `docs/guides/readme-guidelines.md` (new)
  **Scope**: S
  **Description**: Publish the tiered README structure (Tier 1 essential, Tier 2 recommended, what-not-to-include) as a user-facing guide. Reference it from CLAUDE.md template so Tufte can consult it when reviewing documentation.

- **Title**: Add Conway README-accuracy check to release workflow
  **Severity**: P2
  **Files affected**: `templates/agents/dev-team-conway.md`
  **Scope**: S
  **Description**: Conway's release checklist should include "verify README install/usage sections match current CLI interface." Install commands and usage examples are the sections most likely to go stale on version bumps.

- **Title**: Document README vs CLAUDE.md boundary in CLAUDE.md template
  **Severity**: P2
  **Files affected**: `templates/CLAUDE.md`
  **Scope**: S
  **Description**: Add a brief note to the CLAUDE.md template clarifying what belongs in README vs CLAUDE.md. Prevents agents from duplicating README content into CLAUDE.md or vice versa. One sentence: "README is for humans browsing the repo; CLAUDE.md is for AI agents working in it."

- **Title**: Investigate monorepo README patterns
  **Severity**: P2
  **Files affected**: N/A (research task)
  **Scope**: S
  **Description**: This research focused on single-package repos. Monorepos need root + per-package README guidance. Separate Turing research brief if monorepo support becomes a priority.
