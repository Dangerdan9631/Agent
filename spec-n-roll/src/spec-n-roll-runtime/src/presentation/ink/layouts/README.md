# Ink layouts - presentation/ink/layouts

This directory contains reusable route layouts for the interactive runtime. The application scaffold supplies title and key-hint chrome, while these layouts organize route-owned content as actions or console output.

## Conventions

### Route ownership

Routes select one layout and provide only their content, actions, or transcript. Layouts honor the row budget supplied by the application scaffold and do not render application chrome.

### Console output

Console transcripts occupy the full supplied height and show a vertical scrollbar. Retain only the newest 9,999 transcript rows, and batch frequent writes before rendering them so update output remains visually stable.

### Input ownership

The action layout delegates menu input to `MenuList`. The console layout owns page-scroll input so update output retains its follow-until-scrolled behavior.
