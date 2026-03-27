# Agent Memory: Rams (Design System Reviewer)
<!-- First 200 lines are loaded into agent context. Keep concise. -->

## Design System Patterns

### [2026-03-26] CLI project — no design system, Rams scoped to accessibility observations
- **Type**: PATTERN [verified]
- **Source**: v1.5.0 agent definition update (PR #363)
- **Tags**: design-system, accessibility, scope
- **Outcome**: verified
- **Last-verified**: 2026-03-26
- **Context**: No browser UI, no design tokens, no CSS. Rams role scoped to passive accessibility observations in doc outputs and CLI formatting. Copilot finding in fix/357 clarified: accessibility scope should not conflict with broader UI concerns that don't exist here.
