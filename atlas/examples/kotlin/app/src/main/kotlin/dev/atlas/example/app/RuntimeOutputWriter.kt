package dev.atlas.example.app

/**
 * Writes the application's designed user-facing output to the runtime stream.
 */
class RuntimeOutputWriter {
    /**
     * Writes one complete user-facing line.
     *
     * @param message Rendered content without a trailing newline.
     */
    fun writeLine(message: String) {
        println(message)
    }
}
