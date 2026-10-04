package dev.inventory.data.repository

import app.cash.sqldelight.db.SqlCursor
import dev.inventory.core.domain.file.FileEntry
import dev.inventory.core.domain.file.FileKind
import dev.inventory.core.domain.file.FilePresence
import dev.inventory.core.domain.file.FingerprintKind
import dev.inventory.data.db.File_entry

/**
 * Converts file_entry rows, whether typed or from a raw cursor, into FileEntry domain objects.
 */
class FileEntryRowMapper {
    /**
     * Maps a generated row type to the domain entry.
     */
    fun fromRow(row: File_entry): FileEntry = FileEntry(
        id = row.id,
        volumeId = row.volume_id,
        relativePath = row.relative_path,
        name = row.name,
        extension = row.extension,
        kind = FileKind.valueOf(row.kind),
        size = row.size,
        modifiedAt = row.modified_at,
        createdAt = row.created_at,
        quickHash = row.quick_hash,
        fullHash = row.full_hash,
        fingerprint = row.fingerprint,
        fingerprintKind = row.fingerprint_kind?.let { FingerprintKind.valueOf(it) },
        presence = FilePresence.valueOf(row.presence),
        lastSeenScanId = row.last_seen_scan_id,
    )

    /**
     * Maps the current cursor row, whose columns must be the file_entry table columns in declaration order.
     */
    fun fromCursor(cursor: SqlCursor): FileEntry = FileEntry(
        id = cursor.getLong(0)!!,
        volumeId = cursor.getLong(1)!!,
        relativePath = cursor.getString(2)!!,
        name = cursor.getString(3)!!,
        extension = cursor.getString(4)!!,
        kind = FileKind.valueOf(cursor.getString(5)!!),
        size = cursor.getLong(6)!!,
        modifiedAt = cursor.getLong(7)!!,
        createdAt = cursor.getLong(8),
        quickHash = cursor.getString(9),
        fullHash = cursor.getString(10),
        fingerprint = cursor.getString(11),
        fingerprintKind = cursor.getString(12)?.let { FingerprintKind.valueOf(it) },
        presence = FilePresence.valueOf(cursor.getString(14)!!),
        lastSeenScanId = cursor.getLong(15)!!,
    )
}
