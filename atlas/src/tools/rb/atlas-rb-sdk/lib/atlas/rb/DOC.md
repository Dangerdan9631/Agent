# Ruby SDK Implementation

## Purpose

This directory implements workspace discovery, Prism extraction, Rails
convention analysis, model identity, and portable workspace linking.

## Conventions

- Keep Prism nodes inside syntax and parser boundaries.
- Build only language-neutral Atlas model values.
- Keep discovery and identity behavior deterministic across workstations.

## Contents

- Discovery types select Ruby packages and source roots.
- Extraction types translate Ruby and Rails facts into model elements.
- Linking types resolve relationships and assemble workspace results.
