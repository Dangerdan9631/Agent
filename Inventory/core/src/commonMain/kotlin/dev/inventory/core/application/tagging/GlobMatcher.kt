package dev.inventory.core.application.tagging

/**
 * Matches forward-slash relative paths against a glob where "*" matches within a segment and "**" matches across segments.
 */
class GlobMatcher(
    glob: String,
) {
    private val regex: Regex = Regex(toRegex(glob), RegexOption.IGNORE_CASE)

    /**
     * Returns true when the relative path matches the glob.
     */
    fun matches(relativePath: String): Boolean = regex.matches(relativePath)

    private fun toRegex(glob: String): String {
        val out = StringBuilder("^")
        var i = 0
        while (i < glob.length) {
            val c = glob[i]
            when {
                c == '*' && i + 1 < glob.length && glob[i + 1] == '*' -> {
                    out.append(".*")
                    i += 2
                    if (i < glob.length && glob[i] == '/') i++
                    continue
                }
                c == '*' -> out.append("[^/]*")
                c == '?' -> out.append("[^/]")
                c in ".()+|^$\\{}[]" -> out.append('\\').append(c)
                else -> out.append(c)
            }
            i++
        }
        return out.append("$").toString()
    }
}
