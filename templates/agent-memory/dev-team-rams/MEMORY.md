# Agent Memory: Rams (Design System Reviewer)

<!-- Tier 2: Agent calibration memory. Domain-specific findings, patterns, and watch lists. -->
<!-- First 200 lines are loaded into agent context. Keep concise. -->
<!-- Borges extracts structured entries automatically after each task. -->
<!-- Discoverability filter: before writing an entry, verify it cannot be discovered -->
<!-- by reading code or config files. Memory is for calibration and non-obvious knowledge. -->

## Structured Entries

<!-- Format:
### [YYYY-MM-DD] Finding summary
- **Type**: DEFECT | RISK | SUGGESTION | OVERRULED | PATTERN | DECISION
- **Source**: PR #NNN or task description
- **Tags**: comma-separated relevant tags
- **Outcome**: accepted | overruled | deferred | fixed
- **Last-verified**: YYYY-MM-DD
- **Context**: One-sentence explanation
-->

## Design System Patterns

## Calibration Rules

<!-- Auto-generated when 3+ findings on the same tag are overruled. -->
<!-- Format: "Reduce severity for [tag] findings — overruled N times (reason)" -->

## Calibration Log

<!-- Challenges accepted/overruled — tunes adversarial intensity over time -->

## Archive

<!-- Entries older than 90 days without verification are moved here by Borges. -->
<!-- Not loaded into agent context but preserved for reference. -->
