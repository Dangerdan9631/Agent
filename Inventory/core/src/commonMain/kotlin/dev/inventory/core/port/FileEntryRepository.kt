package dev.inventory.core.port

import dev.inventory.core.domain.file.FileEntry
import dev.inventory.core.domain.file.FileKind
import dev.inventory.core.domain.file.FingerprintKind

/**
 * Persistence for file entries, including the bulk operations scanning and duplicate detection depend on.
 */
interface FileEntryRepository {
    /**
     * Returns the previously recorded observation of every file on the volume keyed by relative path.
     */
    suspend fun observationsForVolume(volumeId: Long): Map<String, FileObservation>

    /**
     * Inserts new entries in one transaction; identifiers on the inputs are ignored.
     */
    suspend fun insertAll(entries: List<FileEntry>)

    /**
     * Rewrites the observed attributes of changed files and clears their full hash and fingerprint.
     */
    suspend fun updateChanged(entries: List<FileEntry>)

    /**
     * Marks unchanged files as PRESENT and seen by the given scan.
     */
    suspend fun markSeen(ids: List<Long>, scanId: Long)

    /**
     * Marks every file on the volume that was not seen by scanId as MISSING and returns how many were affected.
     */
    suspend fun markMissingNotSeenBy(volumeId: Long, scanId: Long): Long

    /**
     * Returns the entry with the given identifier, or null.
     */
    suspend fun byId(id: Long): FileEntry?

    /**
     * Returns the entries with the given identifiers in no particular order.
     */
    suspend fun byIds(ids: Collection<Long>): List<FileEntry>

    /**
     * Returns every PRESENT entry on a volume.
     */
    suspend fun presentForVolume(volumeId: Long): List<FileEntry>

    /**
     * Returns PRESENT files on the volume whose path is inside directoryPath.
     * An empty directoryPath returns every present file on the volume. A file matches only when it sits under that directory, so "docs/a.txt" matches "docs" and "docs-old/a.txt" does not.
     */
    suspend fun presentUnder(volumeId: Long, directoryPath: String): List<FileEntry>

    /**
     * Returns immediate child folders and files under parentPath on a volume that match the query.
     * An empty parentPath lists the volume root. Prefix matching uses a trailing slash so "docs" does not include "docs-old".
     */
    suspend fun directChildren(volumeId: Long, parentPath: String, query: FileQuery): DirectChildren

    /**
     * Returns a page of entries matching the query.
     */
    suspend fun query(query: FileQuery, limit: Int, offset: Int): List<FileEntry>

    /**
     * Returns the number of entries matching the query.
     */
    suspend fun count(query: FileQuery): Long

    /**
     * Returns the total size in bytes of entries matching the query.
     */
    suspend fun totalBytes(query: FileQuery): Long

    /**
     * Returns the distinct extensions among PRESENT files, sorted.
     */
    suspend fun distinctExtensions(): List<String>

    /**
     * Stores the full content hash of a file.
     */
    suspend fun updateFullHash(id: Long, fullHash: String)

    /**
     * Stores a fingerprint (or records a failed attempt when fingerprint is null) for a file.
     */
    suspend fun updateFingerprint(id: Long, fingerprint: String?, kind: FingerprintKind?)

    /**
     * Returns PRESENT files that share size and quick hash with another PRESENT file but lack a full hash.
     */
    suspend fun needingFullHash(limit: Int): List<FileEntry>

    /**
     * Returns PRESENT files of the given kinds that have not had a fingerprint attempt yet.
     */
    suspend fun needingFingerprint(kinds: Set<FileKind>, limit: Int): List<FileEntry>

    /**
     * Returns PRESENT files whose full hash is shared with at least one other PRESENT file.
     */
    suspend fun withSharedFullHash(): List<FileEntry>

    /**
     * Returns PRESENT files whose name and size are shared with at least one other PRESENT file.
     */
    suspend fun withSharedNameAndSize(): List<FileEntry>

    /**
     * Returns PRESENT files whose relative path exists on more than one volume.
     */
    suspend fun withSharedRelativePath(): List<FileEntry>

    /**
     * Returns PRESENT files whose name is shared with at least one other PRESENT file, limited to names with at most maxPerName occurrences.
     */
    suspend fun withSharedName(maxPerName: Int): List<FileEntry>

    /**
     * Returns PRESENT files whose fingerprint of the given kind is shared with at least one other PRESENT file.
     */
    suspend fun withSharedFingerprint(kind: FingerprintKind): List<FileEntry>

    /**
     * Returns the identifier and fingerprint of every PRESENT file with a fingerprint of the given kind.
     */
    suspend fun fingerprintsOfKind(kind: FingerprintKind): List<FileFingerprint>

    /**
     * Returns every entry (any presence) whose full hash equals the given value.
     */
    suspend fun copiesWithFullHash(fullHash: String): List<FileEntry>

    /**
     * Returns every entry (any presence) whose size and quick hash equal the given values.
     */
    suspend fun copiesWithQuickHash(size: Long, quickHash: String): List<FileEntry>

    /**
     * Marks a file MISSING after its source was deleted by consolidation.
     */
    suspend fun markMissing(id: Long)

    /**
     * Returns observations for the given relative paths on one volume.
     */
    suspend fun observationsForPaths(volumeId: Long, paths: Collection<String>): Map<String, FileObservation>

    /**
     * Returns the next page of present files on a volume ordered by relative path, strictly after afterPath.
     */
    suspend fun presentContentAfter(volumeId: Long, afterPath: String, limit: Int): List<PresentFileContent>

    /**
     * Returns how many present files of the given kinds have not had a fingerprint attempt.
     */
    suspend fun countNeedingFingerprint(kinds: Set<FileKind>): Long

    /**
     * Records new or changed files for incremental duplicate analysis.
     */
    suspend fun enqueueAnalysis(ids: Collection<Long>)

    /**
     * Returns up to limit inbox ids without removing them.
     */
    suspend fun claimAnalysisInbox(limit: Int): List<Long>

    /**
     * Returns how many files are waiting in the analysis inbox.
     */
    suspend fun countAnalysisInbox(): Long

    /**
     * Removes the given ids from the analysis inbox.
     */
    suspend fun deleteAnalysisInbox(ids: Collection<Long>)

    /**
     * Drops queued full-hash work that is already hashed or no longer present, then queues every current collision.
     */
    suspend fun seedFullHashQueue()

    /**
     * Queues present files that share size and quickHash and still need a full hash. Returns how many ids were newly queued.
     */
    suspend fun enqueueFullHashCollisions(size: Long, quickHash: String): Long

    /**
     * Returns up to limit ids waiting for a full hash, without removing them.
     */
    suspend fun claimFullHashQueue(limit: Int): List<Long>

    /**
     * Returns how many files are waiting for a full hash.
     */
    suspend fun countFullHashQueue(): Long

    /**
     * Removes the given ids from the full-hash queue.
     */
    suspend fun deleteFullHashQueue(ids: Collection<Long>)

    /**
     * Stores full hashes for many files in one transaction.
     */
    suspend fun updateFullHashes(updates: List<Pair<Long, String>>)

    /**
     * Stores fingerprints for many files in one transaction. A null fingerprint records a failed attempt.
     */
    suspend fun updateFingerprints(updates: List<Triple<Long, String?, FingerprintKind?>>)

    /**
     * Copies a sibling fingerprint onto files that share its full hash. Returns the ids that were updated.
     */
    suspend fun copyFingerprintsFromSiblings(ids: Collection<Long>): List<Long>

    /**
     * Invokes onGroup for each set of present files that share a full hash.
     */
    suspend fun forEachSharedFullHash(onGroup: suspend (List<MatchFile>) -> Unit)

    /**
     * Invokes onGroup for each set of present files that share a case-insensitive name and size.
     */
    suspend fun forEachSharedNameAndSize(onGroup: suspend (List<MatchFile>) -> Unit)

    /**
     * Invokes onGroup for each set of present files that share a relative path on more than one volume.
     */
    suspend fun forEachSharedRelativePath(onGroup: suspend (List<MatchFile>) -> Unit)

    /**
     * Invokes onGroup for each case-insensitive name shared by between 2 and maxPerName present files.
     */
    suspend fun forEachSharedName(maxPerName: Int, onGroup: suspend (List<MatchFile>) -> Unit)

    /**
     * Invokes onGroup for each fingerprint value of kind shared by more than one present file.
     */
    suspend fun forEachSharedFingerprint(kind: FingerprintKind, onGroup: suspend (List<MatchFile>) -> Unit)

    /**
     * Returns present files with this case-insensitive name and size.
     */
    suspend fun matchByNameAndSize(name: String, size: Long): List<MatchFile>

    /**
     * Returns present files at this relative path.
     */
    suspend fun matchByRelativePath(relativePath: String): List<MatchFile>

    /**
     * Returns up to limit present files with this case-insensitive name.
     */
    suspend fun matchByName(name: String, limit: Int): List<MatchFile>

    /**
     * Returns present files with this full hash.
     */
    suspend fun matchByFullHash(fullHash: String): List<MatchFile>

    /**
     * Returns present files with this fingerprint value and kind.
     */
    suspend fun matchByFingerprint(kind: FingerprintKind, fingerprint: String): List<MatchFile>
}
