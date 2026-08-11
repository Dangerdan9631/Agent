# Kotlin Example Gradle Wrapper Assets

## Purpose

This directory stores the generated launcher and pinned distribution
configuration for the Kotlin reference workspace.

## Conventions

- Regenerate both wrapper assets together when changing Gradle versions.
- Keep the distribution checksum pinned in the properties document.
- Treat the launcher JAR as generated build infrastructure.

## Contents

- `gradle-wrapper.jar` launches the pinned Gradle distribution.
- `gradle-wrapper.properties` identifies and verifies that distribution.
