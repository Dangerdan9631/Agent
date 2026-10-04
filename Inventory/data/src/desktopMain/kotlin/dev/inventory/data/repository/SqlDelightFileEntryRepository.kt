package dev.inventory.data.repository

import app.cash.sqldelight.db.QueryResult
import app.cash.sqldelight.db.SqlDriver
import dev.inventory.core.domain.file.FileEntry
import dev.inventory.core.domain.file.FileKind
import dev.inventory.core.domain.file.FingerprintKind
import dev.inventory.core.port.DirectChildren
import dev.inventory.core.port.DirectChildrenResolver
import dev.inventory.core.port.FileEntryRepository
import dev.inventory.core.port.FileFingerprint
import dev.inventory.core.port.FileObservation
import dev.inventory.core.port.FileQuery
import dev.inventory.core.port.MatchFile
import dev.inventory.core.port.PresentFileContent
import dev.inventory.data.db.DatabaseExecutor
import dev.inventory.data.db.InventoryDatabase

/**
 * FileEntryRepository backed by the SQLDelight file_entry table plus raw SQL for the dynamic browser query.
 */
class SqlDelightFileEntryRepository(
    private val database: InventoryDatabase,
    private val driver: SqlDriver,
    private val executor: DatabaseExecutor,
    private val mapper: FileEntryRowMapper,
    private val sqlBuilder: FileQuerySqlBuilder,
) : FileEntryRepository {
    private val queries get() = database.fileEntryQueries
    private val queue get() = database.analysisQueueQueries

    override suspend fun observationsForVolume(volumeId: Long): Map<String, FileObservation> = executor.run {
        val result = HashMap<String, FileObservation>()
        queries.selectObservationsForVolume(volumeId) { id, relativePath, size, modifiedAt, quickHash ->
            result[relativePath] = FileObservation(id, size, modifiedAt, quickHash)
        }.executeAsList()
        result
    }

    override suspend fun insertAll(entries: List<FileEntry>) = executor.run {
        database.transaction {
            entries.forEach { e ->
                queries.insertEntry(
                    volume_id = e.volumeId,
                    relative_path = e.relativePath,
                    name = e.name,
                    extension = e.extension,
                    kind = e.kind.name,
                    size = e.size,
                    modified_at = e.modifiedAt,
                    created_at = e.createdAt,
                    quick_hash = e.quickHash,
                    last_seen_scan_id = e.lastSeenScanId,
                )
                queue.enqueueInbox(queries.lastInsertedId().executeAsOne())
            }
        }
    }

    override suspend fun updateChanged(entries: List<FileEntry>) = executor.run {
        database.transaction {
            entries.forEach { e ->
                queries.updateChanged(
                    size = e.size,
                    modified_at = e.modifiedAt,
                    created_at = e.createdAt,
                    quick_hash = e.quickHash,
                    last_seen_scan_id = e.lastSeenScanId,
                    id = e.id,
                )
                queue.enqueueInbox(e.id)
            }
        }
    }

    override suspend fun markSeen(ids: List<Long>, scanId: Long) = executor.run {
        database.transaction { ids.forEach { queries.markSeen(scanId, it) } }
    }

    override suspend fun markMissingNotSeenBy(volumeId: Long, scanId: Long): Long =
        executor.run { queries.markMissingNotSeenBy(volumeId, scanId).value }

    override suspend fun byId(id: Long): FileEntry? =
        executor.run { queries.selectById(id).executeAsOneOrNull()?.let(mapper::fromRow) }

    override suspend fun byIds(ids: Collection<Long>): List<FileEntry> = executor.run {
        ids.chunked(IN_CHUNK).flatMap { chunk -> queries.selectByIds(chunk).executeAsList().map(mapper::fromRow) }
    }

    override suspend fun presentForVolume(volumeId: Long): List<FileEntry> =
        executor.run { queries.selectPresentForVolume(volumeId).executeAsList().map(mapper::fromRow) }

    override suspend fun presentUnder(volumeId: Long, directoryPath: String): List<FileEntry> = executor.run {
        val prefix = if (directoryPath.isEmpty()) "" else "$directoryPath/"
        // The substr length bind is text in the generated query; SQLite coerces it when measuring the prefix.
        queries.selectPresentUnder(volumeId, directoryPath, prefix.length.toString(), prefix).executeAsList().map(mapper::fromRow)
    }

    override suspend fun directChildren(volumeId: Long, parentPath: String, query: FileQuery): DirectChildren = executor.run {
        if (query.volumeIds.isNotEmpty() && volumeId !in query.volumeIds) {
            return@run DirectChildren(emptyList(), emptyList())
        }
        val files = rawQuery(sqlBuilder.directChildFiles(volumeId, parentPath, query)) { cursor ->
            val rows = ArrayList<FileEntry>()
            while (cursor.next().value) rows += mapper.fromCursor(cursor)
            rows
        }
        val paths = rawQuery(sqlBuilder.pathsUnderParent(volumeId, parentPath, query)) { cursor ->
            val rows = ArrayList<String>()
            while (cursor.next().value) {
                cursor.getString(0)?.let { rows += it }
            }
            rows
        }
        val folders = DirectChildrenResolver.foldersFromRelativePaths(parentPath, paths)
        DirectChildren(folders, files)
    }

    override suspend fun query(query: FileQuery, limit: Int, offset: Int): List<FileEntry> = executor.run {
        val statement = sqlBuilder.select(query, limit, offset)
        rawQuery(statement) { cursor ->
            val rows = ArrayList<FileEntry>()
            while (cursor.next().value) rows += mapper.fromCursor(cursor)
            rows
        }
    }

    override suspend fun count(query: FileQuery): Long = executor.run { scalar(sqlBuilder.count(query)) }

    override suspend fun totalBytes(query: FileQuery): Long = executor.run { scalar(sqlBuilder.totalBytes(query)) }

    override suspend fun distinctExtensions(): List<String> =
        executor.run { queries.selectDistinctExtensions().executeAsList() }

    override suspend fun updateFullHash(id: Long, fullHash: String) =
        executor.run { queries.updateFullHash(fullHash, id); Unit }

    override suspend fun updateFingerprint(id: Long, fingerprint: String?, kind: FingerprintKind?) =
        executor.run { queries.updateFingerprint(fingerprint, kind?.name, id); Unit }

    override suspend fun needingFullHash(limit: Int): List<FileEntry> =
        executor.run { queries.selectNeedingFullHash(limit.toLong()).executeAsList().map(mapper::fromRow) }

    override suspend fun needingFingerprint(kinds: Set<FileKind>, limit: Int): List<FileEntry> = executor.run {
        if (kinds.isEmpty()) {
            emptyList()
        } else {
            queries.selectNeedingFingerprint(kinds.map { it.name }, limit.toLong()).executeAsList().map(mapper::fromRow)
        }
    }

    override suspend fun withSharedFullHash(): List<FileEntry> =
        executor.run { queries.selectWithSharedFullHash().executeAsList().map(mapper::fromRow) }

    override suspend fun withSharedNameAndSize(): List<FileEntry> =
        executor.run { queries.selectWithSharedNameAndSize().executeAsList().map(mapper::fromRow) }

    override suspend fun withSharedRelativePath(): List<FileEntry> =
        executor.run { queries.selectWithSharedRelativePath().executeAsList().map(mapper::fromRow) }

    override suspend fun withSharedName(maxPerName: Int): List<FileEntry> =
        executor.run { queries.selectWithSharedName(maxPerName.toLong()).executeAsList().map(mapper::fromRow) }

    override suspend fun withSharedFingerprint(kind: FingerprintKind): List<FileEntry> =
        executor.run { queries.selectWithSharedFingerprint(kind.name, kind.name).executeAsList().map(mapper::fromRow) }

    override suspend fun fingerprintsOfKind(kind: FingerprintKind): List<FileFingerprint> = executor.run {
        queries.selectFingerprintsOfKind(kind.name) { id, fingerprint -> FileFingerprint(id, fingerprint) }.executeAsList()
    }

    override suspend fun copiesWithFullHash(fullHash: String): List<FileEntry> =
        executor.run { queries.selectCopiesWithFullHash(fullHash).executeAsList().map(mapper::fromRow) }

    override suspend fun copiesWithQuickHash(size: Long, quickHash: String): List<FileEntry> =
        executor.run { queries.selectCopiesWithQuickHash(size, quickHash).executeAsList().map(mapper::fromRow) }

    override suspend fun markMissing(id: Long) = executor.run { queries.markMissing(id); Unit }

    override suspend fun observationsForPaths(volumeId: Long, paths: Collection<String>): Map<String, FileObservation> = executor.run {
        val result = HashMap<String, FileObservation>()
        paths.distinct().chunked(IN_CHUNK).forEach { chunk ->
            queries.selectObservationsForPaths(volumeId, chunk) { id, relativePath, size, modifiedAt, quickHash ->
                result[relativePath] = FileObservation(id, size, modifiedAt, quickHash)
            }.executeAsList()
        }
        result
    }

    override suspend fun presentContentAfter(volumeId: Long, afterPath: String, limit: Int): List<PresentFileContent> = executor.run {
        queries.selectPresentContentPage(volumeId, afterPath, limit.toLong()) { path, name, size, fullHash, quickHash ->
            PresentFileContent(path, name, size, fullHash, quickHash)
        }.executeAsList()
    }

    override suspend fun countNeedingFingerprint(kinds: Set<FileKind>): Long = executor.run {
        if (kinds.isEmpty()) 0L else queries.countNeedingFingerprint(kinds.map { it.name }).executeAsOne()
    }

    override suspend fun enqueueAnalysis(ids: Collection<Long>) = executor.run {
        database.transaction { ids.forEach { queue.enqueueInbox(it) } }
    }

    override suspend fun claimAnalysisInbox(limit: Int): List<Long> =
        executor.run { queue.selectInbox(limit.toLong()).executeAsList() }

    override suspend fun countAnalysisInbox(): Long = executor.run { queue.countInbox().executeAsOne() }

    override suspend fun deleteAnalysisInbox(ids: Collection<Long>) = executor.run {
        database.transaction { ids.chunked(IN_CHUNK).forEach { queue.deleteInbox(it) } }
    }

    override suspend fun seedFullHashQueue() = executor.run {
        queue.purgeFullHashQueue()
        queue.seedFullHashQueue()
        Unit
    }

    override suspend fun enqueueFullHashCollisions(size: Long, quickHash: String): Long = executor.run {
        val presentPeers = queries.selectCopiesWithQuickHash(size, quickHash).executeAsList().count { it.presence == "PRESENT" }
        if (presentPeers < 2) return@run 0L
        queue.enqueueFullHashCollisions(size, quickHash)
        queue.rowsChanged().executeAsOne()
    }

    override suspend fun claimFullHashQueue(limit: Int): List<Long> =
        executor.run { queue.selectFullHashQueue(limit.toLong()).executeAsList() }

    override suspend fun countFullHashQueue(): Long = executor.run { queue.countFullHashQueue().executeAsOne() }

    override suspend fun deleteFullHashQueue(ids: Collection<Long>) = executor.run {
        database.transaction { ids.chunked(IN_CHUNK).forEach { queue.deleteFullHashQueue(it) } }
    }

    override suspend fun updateFullHashes(updates: List<Pair<Long, String>>) = executor.run {
        database.transaction { updates.forEach { (id, hash) -> queries.updateFullHash(hash, id) } }
    }

    override suspend fun updateFingerprints(updates: List<Triple<Long, String?, FingerprintKind?>>) = executor.run {
        database.transaction {
            updates.forEach { (id, fingerprint, kind) -> queries.updateFingerprint(fingerprint, kind?.name, id) }
        }
    }

    override suspend fun copyFingerprintsFromSiblings(ids: Collection<Long>): List<Long> = executor.run {
        val copied = ArrayList<Long>()
        database.transaction {
            for (id in ids) {
                val file = queries.selectById(id).executeAsOneOrNull() ?: continue
                val hash = file.full_hash ?: continue
                val sibling = queries.selectFingerprintSibling(hash, id).executeAsOneOrNull() ?: continue
                queries.updateFingerprint(sibling.fingerprint, sibling.fingerprint_kind, id)
                copied += id
            }
        }
        copied
    }

    override suspend fun forEachSharedFullHash(onGroup: suspend (List<MatchFile>) -> Unit) {
        forEachKey("", load = { after, limit -> queries.selectSharedFullHashKeys(after, limit).executeAsList() }) { key ->
            val members = executor.run { queries.selectMatchByFullHash(key, ::toMatch).executeAsList() }
            if (members.size > 1) onGroup(members)
        }
    }

    override suspend fun forEachSharedNameAndSize(onGroup: suspend (List<MatchFile>) -> Unit) {
        var afterName = ""
        var afterSize = -1L
        while (true) {
            val keys = executor.run {
                queries.selectSharedNameSizeKeys(afterName, afterName, afterSize, PAGE).executeAsList()
            }
            if (keys.isEmpty()) break
            for (key in keys) {
                val members = executor.run { queries.selectMatchByNameAndSize(key.name_key, key.size_key, ::toMatch).executeAsList() }
                if (members.size > 1) onGroup(members)
            }
            afterName = keys.last().name_key
            afterSize = keys.last().size_key
            if (keys.size < PAGE.toInt()) break
        }
    }

    override suspend fun forEachSharedRelativePath(onGroup: suspend (List<MatchFile>) -> Unit) {
        forEachKey("", load = { after, limit -> queries.selectSharedPathKeys(after, limit).executeAsList() }) { path ->
            val members = executor.run { queries.selectMatchByPath(path, ::toMatch).executeAsList() }
            if (members.size > 1) onGroup(members)
        }
    }

    override suspend fun forEachSharedName(maxPerName: Int, onGroup: suspend (List<MatchFile>) -> Unit) {
        forEachKey("", load = { after, limit -> queries.selectSharedNameKeys(after, maxPerName.toLong(), limit).executeAsList() }) { name ->
            val members = executor.run { queries.selectMatchByName(name, maxPerName.toLong(), ::toMatch).executeAsList() }
            if (members.size > 1) onGroup(members)
        }
    }

    override suspend fun forEachSharedFingerprint(kind: FingerprintKind, onGroup: suspend (List<MatchFile>) -> Unit) {
        forEachKey("", load = { after, limit -> queries.selectSharedFingerprintKeys(kind.name, after, limit).executeAsList() }) { fingerprint ->
            val members = executor.run { queries.selectMatchByFingerprint(kind.name, fingerprint, ::toMatch).executeAsList() }
            if (members.size > 1) onGroup(members)
        }
    }

    override suspend fun matchByNameAndSize(name: String, size: Long): List<MatchFile> =
        executor.run { queries.selectMatchByNameAndSize(name, size, ::toMatch).executeAsList() }

    override suspend fun matchByRelativePath(relativePath: String): List<MatchFile> =
        executor.run { queries.selectMatchByPath(relativePath, ::toMatch).executeAsList() }

    override suspend fun matchByName(name: String, limit: Int): List<MatchFile> =
        executor.run { queries.selectMatchByName(name, limit.toLong(), ::toMatch).executeAsList() }

    override suspend fun matchByFullHash(fullHash: String): List<MatchFile> =
        executor.run { queries.selectMatchByFullHash(fullHash, ::toMatch).executeAsList() }

    override suspend fun matchByFingerprint(kind: FingerprintKind, fingerprint: String): List<MatchFile> =
        executor.run { queries.selectMatchByFingerprint(kind.name, fingerprint, ::toMatch).executeAsList() }

    private suspend fun forEachKey(start: String, load: (String, Long) -> List<String>, onKey: suspend (String) -> Unit) {
        var after = start
        while (true) {
            val keys = executor.run { load(after, PAGE) }
            if (keys.isEmpty()) break
            for (key in keys) onKey(key)
            after = keys.last()
            if (keys.size < PAGE.toInt()) break
        }
    }

    private fun toMatch(
        id: Long,
        volumeId: Long,
        relativePath: String,
        name: String,
        size: Long,
        modifiedAt: Long,
        quickHash: String?,
        fullHash: String?,
        fingerprint: String?,
    ) = MatchFile(id, volumeId, relativePath, name, size, modifiedAt, quickHash, fullHash, fingerprint)

    private fun scalar(statement: FileQuerySqlBuilder.Statement): Long =
        rawQuery(statement) { cursor -> if (cursor.next().value) cursor.getLong(0) ?: 0L else 0L }

    private fun <T : Any> rawQuery(statement: FileQuerySqlBuilder.Statement, read: (app.cash.sqldelight.db.SqlCursor) -> T): T =
        driver.executeQuery(
            identifier = null,
            sql = statement.sql,
            mapper = { cursor -> QueryResult.Value(read(cursor)) },
            parameters = statement.parameters.size,
            binders = {
                statement.parameters.forEachIndexed { index, value ->
                    when (value) {
                        is Long -> bindLong(index, value)
                        is Int -> bindLong(index, value.toLong())
                        is String -> bindString(index, value)
                        else -> error("Unsupported bind type ${value::class}")
                    }
                }
            },
        ).value

    private companion object {
        const val IN_CHUNK = 500
        const val PAGE = 400L
    }
}
