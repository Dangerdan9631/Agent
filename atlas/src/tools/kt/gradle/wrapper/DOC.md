# Kotlin Gradle Wrapper Assets

## Purpose

This directory stores the generated launcher and distribution configuration for
the Kotlin toolkit's pinned Gradle runtime.

## Conventions

- Regenerate both wrapper assets together when changing Gradle versions.
- Keep the distribution checksum pinned in the properties document.
- Treat the wrapper JAR as generated build infrastructure rather than source code.

## Contents

- `gradle-wrapper.jar` launches the pinned Gradle distribution.
- `gradle-wrapper.properties` identifies and verifies that distribution.
