package dev.inventory.data.support

import dev.inventory.core.application.consolidation.ConflictPolicyFactory
import dev.inventory.core.application.consolidation.ConsolidationExecutor
import dev.inventory.core.application.consolidation.ConsolidationPlanner
import dev.inventory.core.application.consolidation.LayoutStrategyFactory
import dev.inventory.core.application.directory.DirectoryTreeHasher
import dev.inventory.core.application.duplicates.DuplicateAnalysis
import dev.inventory.core.application.duplicates.ExactDuplicateDetector
import dev.inventory.core.application.duplicates.FolderDuplicateDetector
import dev.inventory.core.application.duplicates.ProbableDuplicateDetector
import dev.inventory.core.application.duplicates.rules.FingerprintEqualityRule
import dev.inventory.core.application.duplicates.rules.NameSizeToleranceRule
import dev.inventory.core.application.duplicates.rules.PathTwinRule
import dev.inventory.core.application.duplicates.rules.SameNameAndSizeRule
import dev.inventory.core.application.duplicates.rules.VisualSimilarityRule
import dev.inventory.core.application.fingerprint.FingerprintService
import dev.inventory.core.application.fingerprint.FingerprinterRegistry
import dev.inventory.core.application.hashing.FullHashEscalation
import dev.inventory.core.application.keeper.ShortestPathPolicy
import dev.inventory.core.application.scanning.ScanSettings
import dev.inventory.core.application.scanning.VolumeScanner
import dev.inventory.core.domain.file.FileKindClassifier
import dev.inventory.core.domain.file.FingerprintKind
import dev.inventory.core.port.ContentHasher
import dev.inventory.core.port.FileSystemPort
import dev.inventory.data.db.DatabaseExecutor
import dev.inventory.data.db.DatabaseFactory
import dev.inventory.data.db.DatabaseHandle
import dev.inventory.data.filesystem.NioFileSystem
import dev.inventory.data.fingerprint.ArchiveContentsFingerprinter
import dev.inventory.data.fingerprint.ImageDHashFingerprinter
import dev.inventory.data.fingerprint.NormalizedTextFingerprinter
import dev.inventory.data.hashing.JvmTextDigest
import dev.inventory.data.hashing.Sha256ContentHasher
import dev.inventory.data.metadata.JvmFileMetadataReader
import dev.inventory.data.repository.FileEntryRowMapper
import dev.inventory.data.repository.FileQuerySqlBuilder
import dev.inventory.data.repository.SqlDelightConsolidationRepository
import dev.inventory.data.repository.SqlDelightDirectoryEntryRepository
import dev.inventory.data.repository.SqlDelightDuplicateGroupRepository
import dev.inventory.data.repository.SqlDelightFileDecisionRepository
import dev.inventory.data.repository.SqlDelightFileEntryRepository
import dev.inventory.data.repository.SqlDelightScanRepository
import dev.inventory.data.repository.SqlDelightTagRepository
import dev.inventory.data.repository.SqlDelightVolumeRepository
import kotlinx.coroutines.Dispatchers

/**
 * Wires an in-memory SQLDelight database to the real desktop adapters for integration tests.
 */
class InventoryHarness(
    fileSystem: FileSystemPort = NioFileSystem(),
    hasher: ContentHasher = Sha256ContentHasher(Dispatchers.IO),
) : AutoCloseable {
    private val handle: DatabaseHandle = DatabaseFactory(null).open()
    private val executor = DatabaseExecutor()
    private val io = Dispatchers.IO.limitedParallelism(4)

    /**
     * Filesystem used by scanning and consolidation.
     */
    val fileSystem: FileSystemPort = fileSystem

    /**
     * Content hasher used by scanning and consolidation.
     */
    val hasher: ContentHasher = hasher

    /**
     * Deterministic clock shared by every service.
     */
    val clock = TestClock()

    /**
     * Volume persistence.
     */
    val volumes = SqlDelightVolumeRepository(handle.database, executor)

    /**
     * Scan persistence.
     */
    val scans = SqlDelightScanRepository(handle.database, executor)

    /**
     * File persistence.
     */
    val files = SqlDelightFileEntryRepository(handle.database, handle.driver, executor, FileEntryRowMapper(), FileQuerySqlBuilder())

    /**
     * Directory persistence.
     */
    val directories = SqlDelightDirectoryEntryRepository(handle.database, executor)

    /**
     * Duplicate group persistence.
     */
    val groups = SqlDelightDuplicateGroupRepository(handle.database, executor)

    /**
     * Tag persistence.
     */
    val tags = SqlDelightTagRepository(handle.database, executor)

    /**
     * Decision persistence.
     */
    val decisions = SqlDelightFileDecisionRepository(handle.database, executor)

    /**
     * Consolidation journal persistence.
     */
    val plans = SqlDelightConsolidationRepository(handle.database, executor)

    /**
     * Scanner configured for small batches so tests exercise flush paths.
     */
    val scanner = VolumeScanner(fileSystem, hasher, FileKindClassifier(), files, scans, volumes, clock, ScanSettings(1, 2))

    /**
     * Duplicate analysis pipeline using the real detectors and fingerprinters.
     */
    val analysis = DuplicateAnalysis(
        fullHashEscalation = FullHashEscalation(files, volumes, fileSystem, hasher),
        fingerprintService = FingerprintService(
            files, volumes, fileSystem,
            FingerprinterRegistry(
                listOf(
                    NormalizedTextFingerprinter(io),
                    ImageDHashFingerprinter(io),
                    ArchiveContentsFingerprinter(io),
                ),
            ),
        ),
        treeHasher = DirectoryTreeHasher(files, directories, JvmTextDigest()),
        exactDetector = ExactDuplicateDetector(files),
        probableDetector = ProbableDuplicateDetector(
            listOf(
                FingerprintEqualityRule(files, FingerprintKind.NORMALIZED_TEXT, "normalized-text", 0.9),
                FingerprintEqualityRule(files, FingerprintKind.ARCHIVE_CONTENTS, "archive-contents", 0.9),
                VisualSimilarityRule(files),
                SameNameAndSizeRule(files),
                PathTwinRule(files),
                NameSizeToleranceRule(files),
            ),
        ),
        folderDetector = FolderDuplicateDetector(directories),
        groups = groups,
        files = files,
        volumes = volumes,
        clock = clock,
    )

    /**
     * Planner using preserve-path layout and the shortest-path keeper default.
     */
    val planner = ConsolidationPlanner(
        files, volumes, decisions, groups, tags, plans, fileSystem,
        LayoutStrategyFactory(JvmFileMetadataReader(io), fileSystem),
        ConflictPolicyFactory(),
        ShortestPathPolicy(),
        clock,
    )

    /**
     * Journaled executor bound to this harness's hasher and filesystem.
     */
    val consolidation = ConsolidationExecutor(plans, files, decisions, fileSystem, hasher, clock)

    override fun close() {
        handle.close()
    }
}
