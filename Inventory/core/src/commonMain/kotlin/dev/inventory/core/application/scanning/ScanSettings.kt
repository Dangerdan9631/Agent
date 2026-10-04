package dev.inventory.core.application.scanning

/**
 * Tunable limits for a volume scan.
 */
data class ScanSettings(
    /**
     * Maximum number of files hashed concurrently on one volume; keep low for spinning disks.
     */
    val hashParallelism: Int = 4,
    /**
     * Number of files accumulated before a database write.
     */
    val batchSize: Int = 500,
    /**
     * Directory names that are never descended into, compared case-insensitively.
     */
    val excludedDirectoryNames: Set<String> = setOf(
        "\$RECYCLE.BIN", "System Volume Information", ".git", "node_modules", ".gradle", ".Trash", ".Trashes",
    ),
)
