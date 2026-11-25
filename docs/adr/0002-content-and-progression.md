# ADR 0002: Data-driven world and progression

Status: accepted design; implementation pending.

## Context

The world should grow from a single room to a garden, forest and academy. Adding tasks must not require duplicating game code. Children must not be blocked by missing content or lose progress after a reload.

## Decision

Use Tiled maps and versioned JSON content definitions, with stable IDs, typed effects and build-time validation. Use lifetime independence points, awarded once per eligible quest. Store completion and reward effects atomically. Keep cat trust separate from PS. Use fixed habitat slots first; defer unrestricted construction.

## Consequences

Content creation requires validation and tests. IDs and save formats need migration discipline. Gate thresholds remain configurable and must be validated against accessible rewards before release. No daily-reset or repeat-click mechanism for farming progression.
