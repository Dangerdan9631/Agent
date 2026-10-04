package dev.inventory.core.domain.file

/**
 * Maps a file extension to its coarse FileKind using a fixed extension table.
 */
class FileKindClassifier {
    private val byExtension: Map<String, FileKind> = buildMap {
        // Later entries win on overlap, so source extensions such as "ts" take precedence over video.
        put(FileKind.ARCHIVE, ARCHIVE_EXTENSIONS)
        put(FileKind.VIDEO, VIDEO_EXTENSIONS)
        put(FileKind.AUDIO, AUDIO_EXTENSIONS)
        put(FileKind.IMAGE, IMAGE_EXTENSIONS)
        put(FileKind.DOCUMENT, DOCUMENT_EXTENSIONS)
        put(FileKind.SOURCE, SOURCE_EXTENSIONS)
    }

    private fun MutableMap<String, FileKind>.put(kind: FileKind, extensions: Set<String>) {
        extensions.forEach { this[it] = kind }
    }

    /**
     * Returns the kind for the given lowercase extension without a leading dot; unknown extensions map to OTHER.
     */
    fun classify(extension: String): FileKind = byExtension[extension.lowercase()] ?: FileKind.OTHER

    private companion object {
        val DOCUMENT_EXTENSIONS = setOf(
            "txt", "md", "rtf", "pdf", "doc", "docx", "odt", "xls", "xlsx", "ods", "ppt", "pptx", "odp", "csv",
            "tsv", "epub", "mobi", "tex", "log", "one", "pages", "numbers", "key", "msg", "eml", "vsd", "pub", "wpd",
        )
        val SOURCE_EXTENSIONS = setOf(
            "kt", "kts", "java", "cs", "ts", "tsx", "js", "jsx", "mjs", "cjs", "py", "rb", "go", "rs", "c", "h",
            "cpp", "hpp", "cc", "hh", "m", "mm", "swift", "php", "pl", "sh", "ps1", "bat", "cmd", "psm1", "sql",
            "html", "htm", "css", "scss", "less", "xml", "json", "yaml", "yml", "toml", "ini", "cfg", "conf",
            "gradle", "properties", "vb", "fs", "lua", "r", "dart", "scala", "groovy", "clj", "ex", "exs", "erl",
            "hs", "ml", "jl", "asm", "s", "vue", "svelte", "proto", "graphql", "cmake", "mk", "dockerfile",
            "editorconfig", "gitignore", "sln", "csproj", "vbproj", "fsproj", "xaml", "razor", "cshtml", "resx",
        )
        val IMAGE_EXTENSIONS = setOf(
            "jpg", "jpeg", "png", "gif", "bmp", "tif", "tiff", "webp", "heic", "heif", "psd", "svg", "ico",
            "raw", "cr2", "cr3", "nef", "arw", "dng", "orf", "rw2", "jfif",
        )
        val VIDEO_EXTENSIONS = setOf(
            "mp4", "mkv", "avi", "mov", "wmv", "flv", "webm", "m4v", "mpg", "mpeg", "3gp", "ts", "mts", "m2ts",
            "vob", "ogv", "divx",
        )
        val AUDIO_EXTENSIONS = setOf(
            "mp3", "flac", "wav", "aac", "m4a", "ogg", "oga", "opus", "wma", "aif", "aiff", "ape", "alac", "mid",
            "midi",
        )
        val ARCHIVE_EXTENSIONS = setOf(
            "zip", "jar", "war", "ear", "7z", "rar", "tar", "gz", "tgz", "bz2", "xz", "iso", "cab", "apk", "ipa",
            "nupkg", "vsix",
        )
    }
}
