package dev.atlas.example.app

import com.fasterxml.jackson.databind.ObjectMapper
import dev.atlas.example.lib.ReadingList

/**
 * Hosts the Kotlin reading-list command-line application.
 */
object Program {
    /**
     * Composes and executes one reading-list command.
     *
     * @param arguments Book-title fragments supplied by the user.
     */
    @JvmStatic
    fun main(arguments: Array<String>) {
        ReadingListCommand(ReadingList(), ObjectMapper()).execute(arguments.toList())
    }
}
