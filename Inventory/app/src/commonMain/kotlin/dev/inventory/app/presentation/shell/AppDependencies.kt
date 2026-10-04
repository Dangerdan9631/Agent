package dev.inventory.app.presentation.shell

import dev.inventory.app.platform.FolderPicker
import dev.inventory.app.platform.ImageDecoder
import dev.inventory.app.platform.PathOpener
import dev.inventory.app.platform.TimestampFormatter
import dev.inventory.app.presentation.browser.BrowserViewModel
import dev.inventory.app.presentation.common.BackgroundTaskRunner
import dev.inventory.app.presentation.common.ByteFormatter
import dev.inventory.app.presentation.consolidate.ConsolidateViewModel
import dev.inventory.app.presentation.duplicates.DuplicatesViewModel
import dev.inventory.app.presentation.tags.TagsViewModel
import dev.inventory.app.presentation.volumes.VolumesViewModel

/**
 * Everything the UI shell needs, assembled by the platform composition root.
 */
class AppDependencies(
    val volumes: VolumesViewModel,
    val browser: BrowserViewModel,
    val duplicates: DuplicatesViewModel,
    val tags: TagsViewModel,
    val consolidate: ConsolidateViewModel,
    val tasks: BackgroundTaskRunner,
    val folderPicker: FolderPicker,
    val imageDecoder: ImageDecoder,
    val pathOpener: PathOpener,
    val timestamps: TimestampFormatter,
    val bytes: ByteFormatter,
)
