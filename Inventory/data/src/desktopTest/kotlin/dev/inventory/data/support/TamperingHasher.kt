package dev.inventory.data.support

import dev.inventory.core.port.ContentHasher

/**
 * ContentHasher that reports a wrong full hash for temporary consolidation copies so mismatch handling can be tested.
 */
class TamperingHasher(
    private val delegate: ContentHasher,
) : ContentHasher {
    override suspend fun quickHash(path: String, size: Long): String = delegate.quickHash(path, size)

    override suspend fun fullHash(path: String): String {
        val real = delegate.fullHash(path)
        return if (path.endsWith(".inventory-tmp")) "0".repeat(64) else real
    }
}
