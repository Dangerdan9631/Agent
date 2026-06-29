# Ink Screens

Screens are the user-facing sections of the interactive CLI. They organize task specs, workflows, agents, project metadata, and setup operations into focused views that call read models for display data and existing command or core operations for mutations.

Instance home screens (`global-home.tsx`, `local-home.tsx`) use static labeled content that does not change when menu focus moves. They expose installation, navigation, and lifecycle actions appropriate to global or local CLI context. Project hub and manage screens follow the same static-content pattern for their upper regions.

Each screen owns the interior of its route content slot. List and menu routes compose via `RouteContentLayout`, supplying route-local context metadata and selectable rows sized to their option count. Non-home list routes append a shared Back row as the last selectable item via `buildBackMenuItem`. Form, detail, and confirmation routes render directly into the full route slot without a selection sub-region. The app shell reserves fixed status bar and key hint chrome and passes `routeContentRows` into routed screens; screens decide how that budget is used.

Focusable lists should attach concise context metadata for the current option, including status, warnings, details, and next-step text when those facts help explain what selection will do. Focus movement must remain informational. Updating context metadata should not change routes, write files, or invoke workflow operations; those effects belong to explicit activation handlers and existing mutation screens.
