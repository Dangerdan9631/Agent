# Ruby Example Library Implementation

## Purpose

This directory implements reusable reading-list item creation, normalization,
and collection behavior.

## Conventions

- Keep application and process concerns outside this namespace.
- Use only the library gem's declared direct dependencies.
- Return stable normalized titles and slugs for identical input.

## Contents

- `reading_list_item.rb` represents one normalized item.
- `reading_list.rb` creates and stores reading-list items.
