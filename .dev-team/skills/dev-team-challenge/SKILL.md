---
name: dev-team:challenge
description: Challenge a proposed approach, implementation, or design decision. Use when the user says "challenge this", "what could go wrong", "play devil's advocate", or wants a critical review of an idea before committing to it.
---

Critically examine the following proposal or implementation: $ARGUMENTS

Follow this structured review:

## 1. Summarize the proposal
State what is being proposed in one paragraph. Confirm your understanding before proceeding.

## 2. Identify assumptions
List every assumption the proposal relies on. For each assumption, state what would have to be true for it to hold.

## 3. Find failure modes
For each assumption, construct a concrete scenario where it breaks. Be specific — name inputs, conditions, or sequences that cause failure.

## 4. Classify findings
For each finding, classify it:
- `[DEFECT]`: Concretely wrong. Will produce incorrect behavior.
- `[RISK]`: Not wrong today, but creates a likely failure mode.
- `[QUESTION]`: Decision needs justification.
- `[SUGGESTION]`: Works, but here is a specific improvement.

## 5. Verdict
State one of:
- **Proceed** — No blocking issues. Advisory findings noted.
- **Revise** — `[DEFECT]` or significant `[RISK]` found. Address before proceeding.
- **Reconsider** — Fundamental assumptions are flawed. Rethink the approach.
