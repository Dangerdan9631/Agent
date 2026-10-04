package dev.inventory.core.domain.consolidation

/**
 * Selects how destination paths are derived for files moved into the consolidated tree.
 */
enum class LayoutStrategyKind {
    /**
     * Keep the keeper's relative path beneath a folder named after its source volume label.
     */
    PRESERVE_KEEPER_RELATIVE_PATH,

    /**
     * Place images, video, and audio under year/month folders by capture or modified date; others keep their path.
     */
    DATE_FOLDERS_FOR_MEDIA,

    /**
     * Place each file under a folder named after its first tag, falling back to "Untagged".
     */
    TAG_FOLDERS,
}
