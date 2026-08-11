# Atlas Ruby Generator

## Purpose

This directory contains the Ruby source-model generator and its executable
packaging. It produces portable Atlas module models and a workspace manifest
without rendering or validating architecture diagrams.

## Conventions

- Keep Ruby parsing behind the Prism adapter and Rails conventions behind a
  focused relationship extractor.
- Keep generated JSON language-neutral, deterministic, and free of absolute
  paths.
- Route process output through the CLI output adapter.

## Contents

- `lib/` contains the generator application and infrastructure classes.
- `exe/atlas-rb` is the installed executable.
- `test/` contains unit and integration coverage.
- `scripts/RunBundler.mjs` invokes Bundler consistently from repository scripts.
