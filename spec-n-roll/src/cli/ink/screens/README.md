# Ink Screens

Screens are the user-facing sections of the interactive CLI. They organize task specs, workflows, agents, project metadata, and setup operations into focused views that call read models for display data and existing command or core operations for mutations.

Screens own the read-only facts that describe their current route and selectable rows, while the app shell owns the fullscreen layout. Focusable lists should attach concise context metadata for the current option, including status, warnings, details, and next-step text when those facts help explain what selection will do.

Focus movement must remain informational. Updating context metadata should not change routes, write files, or invoke workflow operations; those effects belong to explicit activation handlers and existing mutation screens.
