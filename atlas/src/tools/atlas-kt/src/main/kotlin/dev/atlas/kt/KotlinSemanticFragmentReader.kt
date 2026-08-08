package dev.atlas.kt

import java.io.File

/**
 * Reads the deliberately small, platform-neutral JSON contract emitted by Atlas KSP processors.
 */
class KotlinSemanticFragmentReader {
    /**
     * Reads every configured fragment in stable path order.
     *
     * @param files KSP fragment files supplied by a build integration.
     * @return Validated semantic fragments.
     */
    fun read(files: List<File>): List<KotlinSemanticFragment> {
        return files.sortedBy { file -> file.path }.map { file ->
            require(file.isFile) { "Atlas semantic fragment does not exist: ${file.path}" }
            this.read(file.readText(), file.path)
        }
    }

    private fun read(json: String, description: String): KotlinSemanticFragment {
        val artifactId = this.stringField(json, "artifactId")
            ?: throw IllegalArgumentException("Atlas semantic fragment '$description' is missing artifactId.")
        val elementsJson = this.arrayContent(json, "elements")
            ?: throw IllegalArgumentException("Atlas semantic fragment '$description' is missing elements.")
        val elements = this.objects(elementsJson).map { value ->
            KotlinSemanticFragment.Element(
                this.stringField(value, "qualifiedName")
                    ?: throw IllegalArgumentException("Atlas semantic fragment '$description' has an element without qualifiedName."),
                this.stringField(value, "kind")
                    ?: throw IllegalArgumentException("Atlas semantic fragment '$description' has an element without kind."),
                this.stringField(value, "signature"),
                this.stringArrayField(value, "traits").orEmpty().distinct().sorted(),
                this.stringArrayField(value, "references"),
                this.stringArrayField(value, "inherits"),
                this.stringArrayField(value, "implements")
            )
        }
        return KotlinSemanticFragment(artifactId, elements)
    }

    private fun stringField(json: String, name: String): String? {
        val pattern = Regex("\\\"${Regex.escape(name)}\\\"\\s*:\\s*\\\"((?:\\\\.|[^\\\"\\\\])*)\\\"")
        return pattern.find(json)?.groupValues?.get(1)?.let { value -> this.unescape(value) }
    }

    private fun stringArrayField(json: String, name: String): List<String>? {
        val content = this.arrayContent(json, name) ?: return null
        return Regex("\\\"((?:\\\\.|[^\\\"\\\\])*)\\\"")
            .findAll(content)
            .map { match -> this.unescape(match.groupValues[1]) }
            .distinct()
            .sorted()
            .toList()
    }

    private fun arrayContent(json: String, name: String): String? {
        val field = Regex("\\\"${Regex.escape(name)}\\\"\\s*:").find(json) ?: return null
        val start = json.indexOf('[', field.range.last + 1)
        if (start < 0) return null
        var depth = 0
        var inString = false
        var escaped = false
        for (index in start until json.length) {
            val character = json[index]
            if (inString) {
                when {
                    escaped -> escaped = false
                    character == '\\' -> escaped = true
                    character == '\"' -> inString = false
                }
            } else {
                when (character) {
                    '\"' -> inString = true
                    '[' -> depth += 1
                    ']' -> {
                        depth -= 1
                        if (depth == 0) return json.substring(start + 1, index)
                    }
                }
            }
        }
        return null
    }

    private fun objects(json: String): List<String> {
        val values = mutableListOf<String>()
        var start = -1
        var depth = 0
        var inString = false
        var escaped = false
        json.forEachIndexed { index, character ->
            if (inString) {
                when {
                    escaped -> escaped = false
                    character == '\\' -> escaped = true
                    character == '\"' -> inString = false
                }
            } else {
                when (character) {
                    '\"' -> inString = true
                    '{' -> {
                        if (depth == 0) start = index
                        depth += 1
                    }
                    '}' -> {
                        depth -= 1
                        if (depth == 0 && start >= 0) values.add(json.substring(start, index + 1))
                    }
                }
            }
        }
        return values
    }

    private fun unescape(value: String): String {
        return buildString {
            var index = 0
            while (index < value.length) {
                if (value[index] != '\\') {
                    append(value[index])
                    index += 1
                    continue
                }
                require(index + 1 < value.length) { "Invalid JSON escape in Atlas semantic fragment." }
                when (val escaped = value[index + 1]) {
                    '\"', '\\', '/' -> append(escaped)
                    'b' -> append('\b')
                    'f' -> append('\u000C')
                    'n' -> append('\n')
                    'r' -> append('\r')
                    't' -> append('\t')
                    'u' -> {
                        require(index + 5 < value.length) { "Invalid Unicode escape in Atlas semantic fragment." }
                        append(value.substring(index + 2, index + 6).toInt(16).toChar())
                        index += 4
                    }
                    else -> throw IllegalArgumentException("Invalid JSON escape '\\$escaped' in Atlas semantic fragment.")
                }
                index += 2
            }
        }
    }
}
