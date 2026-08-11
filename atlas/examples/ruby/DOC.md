# Atlas Ruby Reading-List Example

## Purpose

This maintained reference workspace demonstrates the Ruby SDK, CLI, and Rake
integration with a two-gem reading-list command-line application.

## Conventions

- `atlas-example-app` depends on `atlas-example-lib`; dependency flow is one-way.
- Both gems use Active Support and each uses one distinct direct dependency.
- Atlas commands are supplied by `starcruisestudios-atlas-rb-rake`.

## Contents

- `gems/lib/` owns `ReadingListItem` and `ReadingList`.
- `gems/app/` owns `ReadingListCommand` and `Program`.

## Commands

Run `bundle exec rake app` for the application, `bundle exec rake build` to
generate Atlas artifacts, or `bundle exec rake atlas:view` to open the viewer.
