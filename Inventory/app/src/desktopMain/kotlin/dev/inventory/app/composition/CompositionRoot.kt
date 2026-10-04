package dev.inventory.app.composition

import dev.inventory.app.platform.DesktopPathOpener
import dev.inventory.app.platform.ImageIoDecoder
import dev.inventory.app.platform.JavaTimeTimestampFormatter
import dev.inventory.app.platform.SwingFolderPicker
import dev.inventory.app.presentation.browser.BrowserViewModel
import dev.inventory.app.presentation.browser.FileDetailLoader
import dev.inventory.app.presentation.common.BackgroundTaskRunner
import dev.inventory.app.presentation.common.TaskLane
import dev.inventory.app.presentation.common.ByteFormatter
import dev.inventory.app.presentation.consolidate.ConsolidateViewModel
import dev.inventory.app.presentation.duplicates.DuplicatesViewModel
import dev.inventory.app.presentation.shell.AppDependencies
import dev.inventory.app.presentation.tags.TagsViewModel
import dev.inventory.app.presentation.volumes.VolumesViewModel
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
import dev.inventory.core.application.keeper.GroupResolutionService
import dev.inventory.core.application.keeper.KeeperPolicyFactory
import dev.inventory.core.application.keeper.ShortestPathPolicy
import dev.inventory.core.application.report.CsvReportWriter
import dev.inventory.core.application.scanning.ScanSettings
import dev.inventory.core.application.scanning.VolumeScanner
import dev.inventory.core.application.tagging.TagRuleApplier
import dev.inventory.core.domain.file.FileKindClassifier
import dev.inventory.core.domain.file.FingerprintKind
import dev.inventory.data.db.DatabaseExecutor
import dev.inventory.data.db.DatabaseFactory
import dev.inventory.data.db.DatabaseHandle
import dev.inventory.data.filesystem.NioFileSystem
import dev.inventory.data.fingerprint.ArchiveContentsFingerprinter
import dev.inventory.data.fingerprint.AudioTagFingerprinter
import dev.inventory.data.fingerprint.ImageDHashFingerprinter
import dev.inventory.data.fingerprint.NormalizedTextFingerprinter
import dev.inventory.data.hashing.JvmTextDigest
import dev.inventory.data.hashing.Sha256ContentHasher
import dev.inventory.data.metadata.JvmFileMetadataReader
import dev.inventory.data.paths.AppDataLocator
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
import dev.inventory.data.time.SystemClock
import io.github.oshai.kotlinlogging.KotlinLogging
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel

/**
 * Wires every adapter, service, and view model for the desktop application.
 */
class CompositionRoot(
    private val locator: AppDataLocator = AppDataLocator(),
) : AutoCloseable {
    private val logger = KotlinLogging.logger {}
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private var handle: DatabaseHandle? = null

    /**
     * Builds the dependency graph; call once at startup.
     */
    fun build(): AppDependencies {
        val databaseFile = locator.databaseFile()
        logger.info { "Inventory starting; database=$databaseFile" }
        val opened = DatabaseFactory(databaseFile).open()
        handle = opened
        val database = opened.database
        val executor = DatabaseExecutor()

        val clock = SystemClock()
        val fileSystem = NioFileSystem()
        val ioDispatcher = Dispatchers.IO.limitedParallelism(8)
        val hasher = Sha256ContentHasher(ioDispatcher)
        val digest = JvmTextDigest()
        val metadata = JvmFileMetadataReader(ioDispatcher)

        val volumes = SqlDelightVolumeRepository(database, executor)
        val scans = SqlDelightScanRepository(database, executor)
        val files = SqlDelightFileEntryRepository(database, opened.driver, executor, FileEntryRowMapper(), FileQuerySqlBuilder())
        val directories = SqlDelightDirectoryEntryRepository(database, executor)
        val groups = SqlDelightDuplicateGroupRepository(database, executor)
        val tags = SqlDelightTagRepository(database, executor)
        val decisions = SqlDelightFileDecisionRepository(database, executor)
        val plans = SqlDelightConsolidationRepository(database, executor)

        val tasks = BackgroundTaskRunner(scope)
        val scanner = VolumeScanner(fileSystem, hasher, FileKindClassifier(), files, scans, volumes, clock, ScanSettings())
        val registry = FingerprinterRegistry(
            listOf(
                NormalizedTextFingerprinter(ioDispatcher),
                ImageDHashFingerprinter(ioDispatcher),
                AudioTagFingerprinter(ioDispatcher),
                ArchiveContentsFingerprinter(ioDispatcher),
            ),
        )
        val analysis = DuplicateAnalysis(
            fullHashEscalation = FullHashEscalation(files, volumes, fileSystem, hasher),
            fingerprintService = FingerprintService(files, volumes, fileSystem, registry),
            treeHasher = DirectoryTreeHasher(files, directories, digest),
            exactDetector = ExactDuplicateDetector(files),
            probableDetector = ProbableDuplicateDetector(
                listOf(
                    FingerprintEqualityRule(files, FingerprintKind.NORMALIZED_TEXT, "normalized-text", 0.9),
                    FingerprintEqualityRule(files, FingerprintKind.ARCHIVE_CONTENTS, "archive-contents", 0.9),
                    FingerprintEqualityRule(files, FingerprintKind.AUDIO_TAGS, "audio-tags", 0.85),
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
            isScanActive = { tasks.isLaneActive(TaskLane.SCAN) },
        )
        val resolution = GroupResolutionService(groups, files, directories, decisions, volumes, KeeperPolicyFactory(), clock)
        val planner = ConsolidationPlanner(
            files, volumes, decisions, groups, tags, plans, fileSystem,
            LayoutStrategyFactory(metadata, fileSystem), ConflictPolicyFactory(), ShortestPathPolicy(), clock,
        )
        val consolidationExecutor = ConsolidationExecutor(plans, files, decisions, fileSystem, hasher, clock)
        return AppDependencies(
            volumes = VolumesViewModel(volumes, scans, files, scanner, tasks),
            browser = BrowserViewModel(files, volumes, tags, decisions, FileDetailLoader(files, volumes, groups, tags, decisions, metadata, fileSystem), clock, tasks),
            duplicates = DuplicatesViewModel(groups, files, directories, decisions, volumes, fileSystem, analysis, resolution, tasks),
            tags = TagsViewModel(tags, TagRuleApplier(files, tags)),
            consolidate = ConsolidateViewModel(plans, volumes, planner, consolidationExecutor, CsvReportWriter(plans, fileSystem), clock, tasks),
            tasks = tasks,
            folderPicker = SwingFolderPicker(),
            imageDecoder = ImageIoDecoder(),
            pathOpener = DesktopPathOpener(),
            timestamps = JavaTimeTimestampFormatter(),
            bytes = ByteFormatter(),
        )
    }

    override fun close() {
        scope.cancel()
        handle?.close()
        logger.info { "Inventory stopped" }
    }
}
