package dev.inventory.core.application.consolidation

/**
 * Appends " (2)", " (3)", ... before the extension until the path is free.
 */
class RenameWithSuffixPolicy : ConflictPolicy {
    override fun resolve(desiredPath: String, taken: Set<String>): String {
        val slash = desiredPath.lastIndexOf('/')
        val directory = if (slash < 0) "" else desiredPath.substring(0, slash + 1)
        val name = desiredPath.substring(slash + 1)
        val dot = name.lastIndexOf('.')
        val stem = if (dot <= 0) name else name.substring(0, dot)
        val extension = if (dot <= 0) "" else name.substring(dot)
        var counter = 2
        while (true) {
            val candidate = "$directory$stem ($counter)$extension"
            if (candidate.lowercase() !in taken) return candidate
            counter++
        }
    }
}
