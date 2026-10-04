package dev.inventory.app.presentation.shell

/**
 * Top-level screens reachable from the navigation rail.
 */
enum class Destination(
    /**
     * Label shown in the rail.
     */
    val label: String,
) {
    VOLUMES("Volumes"),
    BROWSER("Browser"),
    DUPLICATES("Duplicates"),
    TAGS("Tags"),
    CONSOLIDATE("Consolidate"),
}
