# Ink App

The app directory owns the interactive shell that renders when the CLI is launched without a subcommand. It contains session state, route definitions, navigation helpers, and the fullscreen frame that coordinates screens without performing business mutations.

The shell preserves a stable top-to-bottom region order: status bar, context content area, routed selection screen, and global key hints. It calculates terminal row budgets centrally so the context area absorbs extra height, selection controls stay visible, and terminals below the supported minimum show resize guidance instead of overlapping content. Terminal resize events trigger automatic layout recalculation through a dedicated stdout resize hook.

Shell-level context is read-only. Screens may report focused option metadata to update the middle content area, but route changes and file mutations must remain tied to explicit selection or command actions.
