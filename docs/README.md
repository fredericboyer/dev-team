# docs/ folder structure

Canonical layout for project documentation.

| Folder | Purpose | Naming convention |
|--------|---------|-------------------|
| `adr/` | Architecture Decision Records | `NNN-kebab-title.md` (sequential numbering) |
| `research/` | Turing research briefs | `{issue}-{kebab-title}-{date}.md` |
| `guides/` | User-facing guides | `{kebab-title}.md` |
| `design/` | Design notes and proposals | `{kebab-title}.md` |
| `benchmarks/` | Benchmark reports | `{kebab-title}.md` |

## Rules

- Every new document goes in the appropriate subfolder above — no files at `docs/` root (except this README).
- ADRs are immutable records. If a decision changes, write a new ADR that supersedes the original.
- Research briefs are written by Turing and should follow the research brief format defined in the Turing agent definition.
