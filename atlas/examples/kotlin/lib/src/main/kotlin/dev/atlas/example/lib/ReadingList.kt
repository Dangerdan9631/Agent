package dev.atlas.example.lib

import com.google.common.base.CharMatcher
import org.apache.commons.lang3.StringUtils

/**
 * Creates and retains reading-list items behind a reusable library API.
 */
class ReadingList {
    private val items = mutableListOf<ReadingListItem>()

    /**
     * Adds one normalized title to the list.
     *
     * @param title User-supplied book title containing non-whitespace text.
     * @return Created immutable reading-list item.
     */
    fun add(title: String): ReadingListItem {
        val normalized = StringUtils.normalizeSpace(title).trim()
        require(normalized.isNotEmpty()) { "A book title is required." }
        val slug = CharMatcher.whitespace().trimAndCollapseFrom(normalized.lowercase(), '-')
            .replace(Regex("[^a-z0-9-]"), "")
        val item = ReadingListItem(normalized, slug)
        this.items.add(item)
        return item
    }
}
