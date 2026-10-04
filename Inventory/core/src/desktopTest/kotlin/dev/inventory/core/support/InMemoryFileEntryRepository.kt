package dev.inventory.core.support

import dev.inventory.core.domain.file.FileEntry
import dev.inventory.core.domain.file.FileKind
import dev.inventory.core.domain.file.FilePresence
import dev.inventory.core.domain.file.FingerprintKind
import dev.inventory.core.port.DirectChildren
import dev.inventory.core.port.DirectChildrenResolver
import dev.inventory.core.port.FileEntryRepository
import dev.inventory.core.port.FileFingerprint
import dev.inventory.core.port.FileObservation
import dev.inventory.core.port.FileQuery
import dev.inventory.core.port.FileSortField
import dev.inventory.core.port.MatchFile
import dev.inventory.core.port.PresentFileContent

/**
 * In-memory FileEntryRepository used by core unit tests.
 */
class InMemoryFileEntryRepository : FileEntryRepository {
    private val rows = LinkedHashMap<Long, FileEntry>()
    private var nextId = 1L
    private val attempted = HashSet<Long>()
    private val inbox = LinkedHashSet<Long>()
    private val hashQueue = LinkedHashSet<Long>()

    /**
     * Stores the entry, assigning an identifier when id is 0, and returns the stored row.
     */
    fun put(entry: FileEntry): FileEntry {
        val stored = if (entry.id == 0L) entry.copy(id = nextId++) else entry
        if (stored.id >= nextId) nextId = stored.id + 1
        rows[stored.id] = stored
        return stored
    }

    override suspend fun observationsForVolume(volumeId: Long): Map<String, FileObservation> =
        rows.values.filter { it.volumeId == volumeId }.associate {
            it.relativePath to FileObservation(it.id, it.size, it.modifiedAt, it.quickHash)
        }

    override suspend fun insertAll(entries: List<FileEntry>) {
        entries.forEach { inbox += put(it).id }
    }

    override suspend fun updateChanged(entries: List<FileEntry>) {
        entries.forEach {
            rows[it.id] = it
            attempted.remove(it.id)
            inbox += it.id
        }
    }

    override suspend fun markSeen(ids: List<Long>, scanId: Long) {
        ids.forEach { id -> rows[id]?.let { rows[id] = it.copy(presence = FilePresence.PRESENT, lastSeenScanId = scanId) } }
    }

    override suspend fun markMissingNotSeenBy(volumeId: Long, scanId: Long): Long {
        var count = 0L
        rows.values.filter { it.volumeId == volumeId && it.lastSeenScanId != scanId && it.presence == FilePresence.PRESENT }.forEach {
            rows[it.id] = it.copy(presence = FilePresence.MISSING)
            count++
        }
        return count
    }

    override suspend fun byId(id: Long): FileEntry? = rows[id]

    override suspend fun byIds(ids: Collection<Long>): List<FileEntry> = ids.mapNotNull { rows[it] }

    override suspend fun presentForVolume(volumeId: Long): List<FileEntry> =
        rows.values.filter { it.volumeId == volumeId && it.presence == FilePresence.PRESENT }

    override suspend fun presentUnder(volumeId: Long, directoryPath: String): List<FileEntry> =
        present().filter { it.volumeId == volumeId && isUnder(directoryPath, it.relativePath) }
            .sortedBy { it.relativePath }

    override suspend fun directChildren(volumeId: Long, parentPath: String, query: FileQuery): DirectChildren {
        if (query.volumeIds.isNotEmpty() && volumeId !in query.volumeIds) {
            return DirectChildren(emptyList(), emptyList())
        }
        val matching = rows.values.filter { it.volumeId == volumeId && matches(it, query) }
        return DirectChildrenResolver.fromMatchingFiles(parentPath, matching)
    }

    override suspend fun query(query: FileQuery, limit: Int, offset: Int): List<FileEntry> {
        val filtered = rows.values.filter { matches(it, query) }.sortedWith(sorter(query))
        return filtered.drop(offset).take(limit)
    }

    override suspend fun count(query: FileQuery): Long = rows.values.count { matches(it, query) }.toLong()

    override suspend fun totalBytes(query: FileQuery): Long = rows.values.filter { matches(it, query) }.sumOf { it.size }

    override suspend fun distinctExtensions(): List<String> =
        rows.values.filter { it.presence == FilePresence.PRESENT && it.extension.isNotEmpty() }.map { it.extension }.distinct().sorted()

    override suspend fun updateFullHash(id: Long, fullHash: String) {
        rows[id]?.let { rows[id] = it.copy(fullHash = fullHash) }
    }

    override suspend fun updateFingerprint(id: Long, fingerprint: String?, kind: FingerprintKind?) {
        attempted += id
        rows[id]?.let { rows[id] = it.copy(fingerprint = fingerprint, fingerprintKind = kind) }
    }

    override suspend fun needingFullHash(limit: Int): List<FileEntry> {
        val colliding = present().groupBy { it.size to it.quickHash }.filter { (key, group) -> key.second != null && group.size > 1 }.values.flatten()
        return colliding.filter { it.fullHash == null }.take(limit)
    }

    override suspend fun needingFingerprint(kinds: Set<FileKind>, limit: Int): List<FileEntry> =
        present().filter { it.kind in kinds && it.id !in attempted }.take(limit)

    override suspend fun withSharedFullHash(): List<FileEntry> =
        present().groupBy { it.fullHash }.filter { (hash, group) -> hash != null && group.size > 1 }.values.flatten()

    override suspend fun withSharedNameAndSize(): List<FileEntry> =
        present().groupBy { it.name.lowercase() to it.size }.filter { it.value.size > 1 }.values.flatten()

    override suspend fun withSharedRelativePath(): List<FileEntry> =
        present().groupBy { it.relativePath }.filter { group -> group.value.map { it.volumeId }.toSet().size > 1 }.values.flatten()

    override suspend fun withSharedName(maxPerName: Int): List<FileEntry> =
        present().groupBy { it.name.lowercase() }.filter { it.value.size in 2..maxPerName }.values.flatten()

    override suspend fun withSharedFingerprint(kind: FingerprintKind): List<FileEntry> =
        present().filter { it.fingerprintKind == kind }.groupBy { it.fingerprint }.filter { (fp, group) -> fp != null && group.size > 1 }.values.flatten()

    override suspend fun fingerprintsOfKind(kind: FingerprintKind): List<FileFingerprint> =
        present().filter { it.fingerprintKind == kind && it.fingerprint != null }.map { FileFingerprint(it.id, it.fingerprint!!) }

    override suspend fun copiesWithFullHash(fullHash: String): List<FileEntry> = rows.values.filter { it.fullHash == fullHash }

    override suspend fun copiesWithQuickHash(size: Long, quickHash: String): List<FileEntry> =
        rows.values.filter { it.size == size && it.quickHash == quickHash }

    override suspend fun markMissing(id: Long) {
        rows[id]?.let { rows[id] = it.copy(presence = FilePresence.MISSING) }
    }

    override suspend fun observationsForPaths(volumeId: Long, paths: Collection<String>): Map<String, FileObservation> {
        val wanted = paths.toSet()
        return rows.values.filter { it.volumeId == volumeId && it.relativePath in wanted }.associate {
            it.relativePath to FileObservation(it.id, it.size, it.modifiedAt, it.quickHash)
        }
    }

    override suspend fun presentContentAfter(volumeId: Long, afterPath: String, limit: Int): List<PresentFileContent> =
        present().filter { it.volumeId == volumeId && it.relativePath > afterPath }
            .sortedBy { it.relativePath }
            .take(limit)
            .map { PresentFileContent(it.relativePath, it.name, it.size, it.fullHash, it.quickHash) }

    override suspend fun countNeedingFingerprint(kinds: Set<FileKind>): Long =
        present().count { it.kind in kinds && it.id !in attempted }.toLong()

    override suspend fun enqueueAnalysis(ids: Collection<Long>) {
        inbox += ids
    }

    override suspend fun claimAnalysisInbox(limit: Int): List<Long> = inbox.take(limit)

    override suspend fun countAnalysisInbox(): Long = inbox.size.toLong()

    override suspend fun deleteAnalysisInbox(ids: Collection<Long>) {
        inbox.removeAll(ids.toSet())
    }

    override suspend fun seedFullHashQueue() {
        hashQueue.removeAll { id ->
            val file = rows[id]
            file == null || file.fullHash != null || file.presence != FilePresence.PRESENT || file.quickHash == null
        }
        needingFullHash(Int.MAX_VALUE).forEach { hashQueue += it.id }
    }

    override suspend fun enqueueFullHashCollisions(size: Long, quickHash: String): Long {
        val matches = present().filter { it.size == size && it.quickHash == quickHash && it.fullHash == null }
        if (matches.size < 2 && present().none { it.size == size && it.quickHash == quickHash && it.fullHash != null }) return 0
        val colliding = present().filter { it.size == size && it.quickHash == quickHash }
        if (colliding.size < 2) return 0
        var added = 0L
        colliding.filter { it.fullHash == null }.forEach {
            if (hashQueue.add(it.id)) added++
        }
        return added
    }

    override suspend fun claimFullHashQueue(limit: Int): List<Long> = hashQueue.take(limit)

    override suspend fun countFullHashQueue(): Long = hashQueue.size.toLong()

    override suspend fun deleteFullHashQueue(ids: Collection<Long>) {
        hashQueue.removeAll(ids.toSet())
    }

    override suspend fun updateFullHashes(updates: List<Pair<Long, String>>) {
        updates.forEach { (id, hash) -> updateFullHash(id, hash) }
    }

    override suspend fun updateFingerprints(updates: List<Triple<Long, String?, FingerprintKind?>>) {
        updates.forEach { (id, fingerprint, kind) -> updateFingerprint(id, fingerprint, kind) }
    }

    override suspend fun copyFingerprintsFromSiblings(ids: Collection<Long>): List<Long> {
        val copied = ArrayList<Long>()
        for (id in ids) {
            val file = rows[id] ?: continue
            val hash = file.fullHash ?: continue
            val sibling = present().firstOrNull { it.id != id && it.fullHash == hash && it.fingerprint != null } ?: continue
            rows[id] = file.copy(fingerprint = sibling.fingerprint, fingerprintKind = sibling.fingerprintKind)
            attempted += id
            copied += id
        }
        return copied
    }

    override suspend fun forEachSharedFullHash(onGroup: suspend (List<MatchFile>) -> Unit) {
        present().groupBy { it.fullHash }.filter { (hash, group) -> hash != null && group.size > 1 }.values
            .forEach { onGroup(it.map(::toMatch)) }
    }

    override suspend fun forEachSharedNameAndSize(onGroup: suspend (List<MatchFile>) -> Unit) {
        present().filter { it.size > 0 }.groupBy { it.name.lowercase() to it.size }.values.filter { it.size > 1 }
            .forEach { onGroup(it.map(::toMatch)) }
    }

    override suspend fun forEachSharedRelativePath(onGroup: suspend (List<MatchFile>) -> Unit) {
        present().groupBy { it.relativePath }.values.filter { group -> group.map { it.volumeId }.toSet().size > 1 }
            .forEach { onGroup(it.map(::toMatch)) }
    }

    override suspend fun forEachSharedName(maxPerName: Int, onGroup: suspend (List<MatchFile>) -> Unit) {
        present().filter { it.size > 0 }.groupBy { it.name.lowercase() }.values.filter { it.size in 2..maxPerName }
            .forEach { onGroup(it.map(::toMatch)) }
    }

    override suspend fun forEachSharedFingerprint(kind: FingerprintKind, onGroup: suspend (List<MatchFile>) -> Unit) {
        present().filter { it.fingerprintKind == kind && it.fingerprint != null }.groupBy { it.fingerprint }.values
            .filter { it.size > 1 }
            .forEach { onGroup(it.map(::toMatch)) }
    }

    override suspend fun matchByNameAndSize(name: String, size: Long): List<MatchFile> =
        present().filter { it.name.equals(name, ignoreCase = true) && it.size == size }.map(::toMatch)

    override suspend fun matchByRelativePath(relativePath: String): List<MatchFile> =
        present().filter { it.relativePath == relativePath }.map(::toMatch)

    override suspend fun matchByName(name: String, limit: Int): List<MatchFile> =
        present().filter { it.size > 0 && it.name.equals(name, ignoreCase = true) }.sortedBy { it.size }.take(limit).map(::toMatch)

    override suspend fun matchByFullHash(fullHash: String): List<MatchFile> =
        present().filter { it.fullHash == fullHash }.map(::toMatch)

    override suspend fun matchByFingerprint(kind: FingerprintKind, fingerprint: String): List<MatchFile> =
        present().filter { it.fingerprintKind == kind && it.fingerprint == fingerprint }.map(::toMatch)

    private fun toMatch(entry: FileEntry) = MatchFile(
        entry.id, entry.volumeId, entry.relativePath, entry.name, entry.size, entry.modifiedAt, entry.quickHash, entry.fullHash, entry.fingerprint,
    )

    private fun present(): List<FileEntry> = rows.values.filter { it.presence == FilePresence.PRESENT }

    private fun isUnder(directoryPath: String, relativePath: String): Boolean =
        directoryPath.isEmpty() || relativePath.startsWith("$directoryPath/")

    private fun matches(entry: FileEntry, query: FileQuery): Boolean {
        if (query.presence != null && entry.presence != query.presence) return false
        if (query.volumeIds.isNotEmpty() && entry.volumeId !in query.volumeIds) return false
        if (query.kinds.isNotEmpty() && entry.kind !in query.kinds) return false
        if (query.extension != null && entry.extension != query.extension) return false
        if (query.pathContains != null && !entry.relativePath.contains(query.pathContains, ignoreCase = true)) return false
        if (query.minSize != null && entry.size < query.minSize) return false
        if (query.maxSize != null && entry.size > query.maxSize) return false
        return true
    }

    private fun sorter(query: FileQuery): Comparator<FileEntry> {
        val base = when (query.sortField) {
            FileSortField.PATH -> compareBy<FileEntry> { it.relativePath }
            FileSortField.NAME -> compareBy { it.name }
            FileSortField.EXTENSION -> compareBy { it.extension }
            FileSortField.SIZE -> compareBy { it.size }
            FileSortField.MODIFIED -> compareBy { it.modifiedAt }
            FileSortField.KIND -> compareBy { it.kind.name }
        }
        return if (query.sortDescending) base.reversed() else base
    }
}
