package dev.atlas.example.app

import com.fasterxml.jackson.databind.ObjectMapper
import dev.atlas.example.lib.ReadingList
import dev.atlas.example.lib.ReadingListItem
import org.apache.commons.lang3.StringUtils

/**
 * Handles one reading-list command and renders its normalized public library item.
 */
class ReadingListCommand(
    private val readingList: ReadingList,
    private val objectMapper: ObjectMapper
) {
    /**
     * Adds one title and returns the public library type consumed by the app.
     *
     * @param arguments Title fragments supplied after the executable name.
     * @return Created reading-list item after its JSON representation is printed.
     */
    fun execute(arguments: List<String>): ReadingListItem {
        val title = StringUtils.defaultIfBlank(arguments.joinToString(" "), "The Left Hand of Darkness")
        val item = this.readingList.add(title)
        println(this.objectMapper.writeValueAsString(item))
        return item
    }
}
