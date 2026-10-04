package dev.inventory.core.application.tagging

import dev.inventory.core.domain.tag.TagRule
import dev.inventory.core.port.FileEntryRepository
import dev.inventory.core.port.FileQuery
import dev.inventory.core.port.TagRepository
import io.github.oshai.kotlinlogging.KotlinLogging

/**
 * Attaches a tag to every present file that matches a TagRule.
 */
class TagRuleApplier(
    private val files: FileEntryRepository,
    private val tags: TagRepository,
) {
    private val logger = KotlinLogging.logger {}

    /**
     * Applies the rule and returns the number of files that received the tag.
     */
    suspend fun apply(rule: TagRule): Int {
        val matcher = rule.pathGlob?.takeIf { it.isNotBlank() }?.let { GlobMatcher(it) }
        val extensions = rule.extensions.map { it.lowercase().removePrefix(".") }.toSet()
        val queries = if (extensions.isEmpty()) listOf(FileQuery()) else extensions.map { FileQuery(extension = it) }
        var tagged = 0
        for (query in queries) {
            var offset = 0
            while (true) {
                val page = files.query(query, PAGE, offset)
                if (page.isEmpty()) break
                val matching = page.filter { matcher == null || matcher.matches(it.relativePath) }.map { it.id }
                if (matching.isNotEmpty()) {
                    tags.attach(matching, rule.tagId)
                    tagged += matching.size
                }
                offset += page.size
                if (page.size < PAGE) break
            }
        }
        logger.info { "Tag rule for tag ${rule.tagId} (extensions=${rule.extensions}, glob=${rule.pathGlob}) tagged $tagged files" }
        return tagged
    }

    private companion object {
        const val PAGE = 2000
    }
}
