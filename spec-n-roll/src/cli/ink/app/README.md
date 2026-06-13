# Ink App

The app directory owns the interactive shell that renders when the CLI is launched without a subcommand. It contains session state, route definitions, navigation helpers, and the scaffolding frame that coordinates screens without performing business mutations.

The shell preserves a stable top-to-bottom region order: status bar, route content area, and key hint overlay. It calculates terminal row budgets centrally so the route content slot absorbs extra height while fixed chrome keeps stable heights, and terminals below the supported minimum show resize guidance instead of overlapping content. Terminal resize events trigger automatic layout recalculation through a dedicated stdout resize hook.

Each routed screen owns the interior of the route content slot. List and menu routes compose via `RouteContentLayout` with route-local context and selection sub-regions. Form, detail, and confirmation routes render directly into the full route slot. Focus-driven context updates remain read-only; route changes and file mutations stay tied to explicit selection or command actions.
