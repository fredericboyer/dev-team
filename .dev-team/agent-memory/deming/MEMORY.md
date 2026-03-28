# Deming Agent Memory

## CI Pipeline

- `audit-dependencies` job added to CI (issue #440). Runs `npm audit --audit-level=high` as a separate job, consistent with existing job structure (each concern is its own job). Only blocks on high/critical severity. Last-verified: 2026-03-27.
