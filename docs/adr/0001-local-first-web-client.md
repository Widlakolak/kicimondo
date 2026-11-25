# ADR 0001: Local-first web game

Status: accepted design; implementation pending.

## Context

The game must run in a browser and on Android. The family NAS is suitable for hosting but should not be a dependency for a child's session. The project should also include meaningful Java backend work.

## Decision

Use Phaser with React/TypeScript for the runtime, Capacitor for Android, and a modular Java/Spring Boot backend for versioned content and optional sync. Bundle base content. Keep game rules and persistence independent of rendering. Build the room first; add server capabilities after the core loop is proven.

## Alternatives

libGDX provides a Java-first game runtime and native Android, but its web target introduces a different integration and build model. Godot and Unity are capable, but introduce another primary language/toolchain and are unnecessary for this initial web-first scope. Server-authoritative play would make offline play harder.

## Consequences

The Java backend is not responsible for rendering or every move. Some educational validation may exist in both languages; use shared fixtures/contracts to prevent divergence. Local storage needs explicit migrations and backups. Android must be tested early rather than assuming web behaviour is identical.
