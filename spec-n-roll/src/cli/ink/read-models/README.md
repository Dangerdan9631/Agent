# Ink Read Models

Read models assemble screen-focused summaries from project files without writing to disk. They normalize filesystem details, warnings, and derived display state so screens can stay focused on presentation and navigation.

Instance home read models (`global-home-content.ts`, `local-home-content.ts`, `manage-local-content.ts`, `project-hub.ts`) combine install source, version comparison, project context, and spec health summaries into static labeled fields for home, hub, and manage screens.

This directory is the query boundary for the interactive app. It may call existing project readers and CLI query helpers, but mutations and command orchestration belong in screens or core command modules.
