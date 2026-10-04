package dev.inventory.core.application.consolidation

import dev.inventory.core.domain.tag.Tag
import dev.inventory.core.domain.volume.Volume

/**
 * Lookup data a LayoutStrategy may need when deriving destination paths.
 */
data class LayoutContext(
    /**
     * Volumes keyed by identifier.
     */
    val volumes: Map<Long, Volume>,
    /**
     * Tags attached to each file, keyed by file identifier; files without tags are absent.
     */
    val tagsByFile: Map<Long, List<Tag>>,
)
