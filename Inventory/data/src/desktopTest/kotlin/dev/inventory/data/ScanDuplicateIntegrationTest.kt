package dev.inventory.data

import dev.inventory.core.domain.duplicate.DuplicateGroupKind
import dev.inventory.core.domain.file.FilePresence
import dev.inventory.core.port.FileQuery
import dev.inventory.data.support.BmpWriter
import dev.inventory.data.support.InventoryHarness
import dev.inventory.data.support.ZipWriter
import kotlinx.coroutines.flow.collect
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.nio.file.Files
import java.nio.file.Path

/**
 * Scans synthetic drive trees and checks exact, probable, and folder duplicate detection.
 */
class ScanDuplicateIntegrationTest {
    @TempDir
    lateinit var temp: Path

    @Test
    fun scanDetectsExactProbableAndFolderDuplicates() = runTest {
        val driveA = temp.resolve("drive-a")
        val driveB = temp.resolve("drive-b")
        writeTree(driveA, crlf = true)
        writeTree(driveB, crlf = false)
        Files.writeString(driveB.resolve("docs/notes.txt"), "edited after backup")
        Files.writeString(driveA.resolve("docs/only-on-a.txt"), "unique")

        InventoryHarness().use { harness ->
            val volumeA = harness.volumes.add("Drive A", driveA.toString())
            val volumeB = harness.volumes.add("Drive B", driveB.toString())
            harness.scanner.scan(volumeA).collect()
            harness.scanner.scan(volumeB).collect()
            harness.analysis.run().collect()

            val present = harness.files.query(FileQuery(), 200, 0)
            assertTrue(present.size >= 8)

            val exact = harness.groups.allWithMembers(DuplicateGroupKind.EXACT)
            assertTrue(exact.any { (_, members) -> members.size >= 2 }, "expected at least one exact group")

            val probable = harness.groups.allWithMembers(DuplicateGroupKind.PROBABLE)
            assertTrue(probable.any { it.first.reason == "normalized-text" }, "CRLF/LF twins should match by normalized text")
            assertTrue(probable.any { it.first.reason == "path-twin" }, "edited notes.txt should be a path twin")
            assertTrue(probable.any { it.first.reason == "archive-contents" }, "re-zipped archives should match by contents")
            assertTrue(probable.any { it.first.reason == "visual-similar" }, "resized images should be visually similar")

            val folders = harness.groups.allWithMembers(DuplicateGroupKind.FOLDER)
            assertTrue(folders.any { (_, members) -> members.size >= 2 }, "identical project folders should match")

            Files.delete(driveA.resolve("docs/only-on-a.txt"))
            harness.scanner.scan(volumeA).collect()
            val missing = harness.files.query(FileQuery(presence = FilePresence.MISSING), 50, 0)
            assertEquals(1, missing.count { it.relativePath == "docs/only-on-a.txt" })
        }
    }

    private fun writeTree(root: Path, crlf: Boolean) {
        Files.createDirectories(root.resolve("docs"))
        Files.createDirectories(root.resolve("project/src"))
        Files.createDirectories(root.resolve("photos"))
        Files.writeString(root.resolve("docs/notes.txt"), "hello world")
        val newline = if (crlf) "\r\n" else "\n"
        Files.writeString(root.resolve("docs/readme.md"), "title${newline}body${newline}")
        Files.writeString(root.resolve("project/src/Main.kt"), "fun main() {}\n")
        ZipWriter().write(
            root.resolve("docs/bundle.zip"),
            mapOf(
                "a.txt" to "alpha".encodeToByteArray(),
                "b.txt" to "beta".encodeToByteArray(),
                "docProps/core.xml" to (if (crlf) "meta-a" else "meta-b").encodeToByteArray(),
            ),
        )
        val bmp = BmpWriter()
        val size = if (crlf) 32 else 64
        bmp.write(root.resolve("photos/flag.bmp"), size, size) { x, _ -> if (x < size / 2) 0x000000 else 0xFFFFFF }
    }
}
