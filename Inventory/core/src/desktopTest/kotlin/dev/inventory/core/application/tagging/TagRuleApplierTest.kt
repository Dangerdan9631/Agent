package dev.inventory.core.application.tagging

import dev.inventory.core.domain.tag.TagRule
import dev.inventory.core.support.FileEntries
import dev.inventory.core.support.InMemoryFileEntryRepository
import dev.inventory.core.support.InMemoryTagRepository
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

/**
 * Verifies bulk tagging attaches the tag only to files matching the rule.
 */
class TagRuleApplierTest {
    @Test
    fun tagsFilesMatchingExtensionAndGlob() = runTest {
        val entries = FileEntries()
        val files = InMemoryFileEntryRepository()
        val tags = InMemoryTagRepository()
        files.put(entries.create(id = 1, relativePath = "src/Main.kt", extension = "kt"))
        files.put(entries.create(id = 2, relativePath = "docs/Main.kt", extension = "kt"))
        files.put(entries.create(id = 3, relativePath = "src/notes.txt", extension = "txt"))
        val tag = tags.create("source", 0x336699)
        val applier = TagRuleApplier(files, tags)

        val tagged = applier.apply(TagRule(tag.id, setOf("kt"), "src/**"))

        assertEquals(1, tagged)
        assertEquals(listOf(tag), tags.tagsForFiles(listOf(1, 2, 3))[1])
        assertEquals(null, tags.tagsForFiles(listOf(1, 2, 3))[2])
    }
}
