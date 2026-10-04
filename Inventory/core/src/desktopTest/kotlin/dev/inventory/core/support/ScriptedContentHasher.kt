package dev.inventory.core.support

import dev.inventory.core.port.ContentHasher

/**
 * ContentHasher that returns caller-supplied hashes keyed by normalized path.
 */
class ScriptedContentHasher(
    private val hashes: MutableMap<String, String> = HashMap(),
) : ContentHasher {
    /**
     * Records the hash that fullHash and quickHash should return for path.
     */
    fun set(path: String, hash: String) {
        hashes[path.replace('\\', '/')] = hash
    }

    override suspend fun quickHash(path: String, size: Long): String = fullHash(path)

    override suspend fun fullHash(path: String): String =
        hashes[path.replace('\\', '/')] ?: error("No scripted hash for $path")
}
