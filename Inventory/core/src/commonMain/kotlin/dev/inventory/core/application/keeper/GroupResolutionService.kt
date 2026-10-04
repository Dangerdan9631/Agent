package dev.inventory.core.application.keeper

import dev.inventory.core.domain.decision.Decision
import dev.inventory.core.domain.duplicate.DuplicateGroup
import dev.inventory.core.domain.duplicate.DuplicateGroupKind
import dev.inventory.core.domain.duplicate.ReviewState
import dev.inventory.core.domain.file.DirectoryEntry
import dev.inventory.core.domain.file.FileEntry
import dev.inventory.core.port.Clock
import dev.inventory.core.port.DirectoryEntryRepository
import dev.inventory.core.port.DuplicateGroupRepository
import dev.inventory.core.port.FileDecisionRepository
import dev.inventory.core.port.FileEntryRepository
import dev.inventory.core.port.VolumeRepository
import io.github.oshai.kotlinlogging.KotlinLogging

/**
 * Records keeper choices for duplicate groups and derives per-file KEEP/DISCARD decisions from them.
 */
class GroupResolutionService(
    private val groups: DuplicateGroupRepository,
    private val files: FileEntryRepository,
    private val directories: DirectoryEntryRepository,
    private val decisions: FileDecisionRepository,
    private val volumes: VolumeRepository,
    private val policyFactory: KeeperPolicyFactory,
    private val clock: Clock,
) {
    private val logger = KotlinLogging.logger {}

    /**
     * Marks keeperId as the keeper and resolves the group.
     * A file group sets KEEP on that file and DISCARD on the other members.
     * A folder group sets KEEP on every present file under the keeper directory and DISCARD on every present file under the other directories, pairing files by their path within each folder.
     */
    suspend fun resolve(groupId: Long, keeperId: Long) {
        if (groups.byId(groupId)?.kind == DuplicateGroupKind.FOLDER) {
            resolveFolder(groupId, keeperId)
        } else {
            resolveFiles(groupId, keeperId)
        }
    }

    /**
     * Marks the group as a false positive and clears decisions derived from it.
     */
    suspend fun dismiss(groupId: Long) {
        val group = groups.byId(groupId)
        if (group?.kind == DuplicateGroupKind.FOLDER) {
            releaseFolder(group)
            groups.setResolution(groupId, null, ReviewState.DISMISSED)
            logger.info { "Folder group $groupId dismissed" }
            return
        }
        val members = groups.members(groupId).map { it.memberId }
        val existing = decisions.forFiles(members)
        val derived = existing.values.filter { it.decision == Decision.DISCARD && it.note?.startsWith("Duplicate of file") == true }.map { it.fileId }
        if (derived.isNotEmpty()) decisions.clear(derived)
        groups.setResolution(groupId, null, ReviewState.DISMISSED)
        logger.info { "Group $groupId dismissed; cleared ${derived.size} derived decisions" }
    }

    /**
     * Reopens a group, clearing its keeper and any decisions derived from the previous resolution.
     */
    suspend fun reopen(groupId: Long) {
        val group = groups.byId(groupId)
        if (group?.kind == DuplicateGroupKind.FOLDER) {
            releaseFolder(group)
            groups.setResolution(groupId, null, ReviewState.OPEN)
            return
        }
        val members = groups.members(groupId).map { it.memberId }
        decisions.clear(members)
        groups.setResolution(groupId, null, ReviewState.OPEN)
    }

    /**
     * Applies a keeper policy to every OPEN group of the kind and returns how many groups were resolved.
     */
    suspend fun applyPolicy(kind: DuplicateGroupKind, policyKind: KeeperPolicyKind, preferredVolumeIds: List<Long>): Int {
        val resolved = if (kind == DuplicateGroupKind.FOLDER) {
            applyFolderPolicy(policyKind, preferredVolumeIds)
        } else {
            applyFilePolicy(kind, policyKind, preferredVolumeIds)
        }
        logger.info { "Applied $policyKind to $resolved open $kind groups" }
        return resolved
    }

    private suspend fun resolveFiles(groupId: Long, keeperId: Long) {
        val members = groups.members(groupId).map { it.memberId }
        require(keeperId in members) { "Keeper $keeperId is not a member of group $groupId" }
        val now = clock.now()
        decisions.set(listOf(keeperId), Decision.KEEP, null, now)
        decisions.set(members.filter { it != keeperId }, Decision.DISCARD, "Duplicate of file $keeperId", now)
        groups.setResolution(groupId, keeperId, ReviewState.RESOLVED)
        logger.info { "Group $groupId resolved with keeper $keeperId; ${members.size - 1} members marked DISCARD" }
    }

    private suspend fun resolveFolder(groupId: Long, keeperDirectoryId: Long) {
        val existing = groups.byId(groupId)
        if (existing?.keeperFileId != null) releaseFolder(existing)
        val memberIds = groups.members(groupId).map { it.memberId }
        require(keeperDirectoryId in memberIds) { "Keeper $keeperDirectoryId is not a member of group $groupId" }
        val dirs = directories.byIds(memberIds).associateBy { it.id }
        val keeperDir = dirs[keeperDirectoryId] ?: error("Directory $keeperDirectoryId does not exist")
        val filesByDir = dirs.values.associateWith { files.presentUnder(it.volumeId, it.relativePath) }
        val keeperFiles = filesByDir[keeperDir].orEmpty()
        val keeperByRelative = keeperFiles.associateBy { pathWithin(keeperDir.relativePath, it.relativePath) }
        val now = clock.now()
        if (keeperFiles.isNotEmpty()) {
            decisions.set(keeperFiles.map { it.id }, Decision.KEEP, "$KEEPER_NOTE_PREFIX$keeperDirectoryId", now)
        }
        var discarded = 0
        for ((dir, dirFiles) in filesByDir) {
            if (dir.id == keeperDirectoryId) continue
            for (file in dirFiles) {
                val counterpart = keeperByRelative[pathWithin(dir.relativePath, file.relativePath)]
                val note = if (counterpart == null) {
                    "$DISCARD_NOTE_PREFIX$keeperDirectoryId"
                } else {
                    "$DISCARD_NOTE_PREFIX$keeperDirectoryId file ${counterpart.id}"
                }
                decisions.set(listOf(file.id), Decision.DISCARD, note, now)
                discarded++
            }
        }
        alignExactGroups(keeperFiles, filesByDir.values.flatten().map { it.id }.toSet())
        groups.setResolution(groupId, keeperDirectoryId, ReviewState.RESOLVED)
        logger.info { "Folder group $groupId resolved with keeper directory $keeperDirectoryId; $discarded files marked DISCARD" }
    }

    private suspend fun alignExactGroups(keeperFiles: List<FileEntry>, folderFileIds: Set<Long>) {
        if (keeperFiles.isEmpty()) return
        for ((exact, members) in groups.allWithMembers(DuplicateGroupKind.EXACT)) {
            if (exact.reviewState != ReviewState.OPEN) continue
            val memberFileIds = members.map { it.memberId }
            val keeperFile = keeperFiles.firstOrNull { it.id in memberFileIds } ?: continue
            val fullyInside = memberFileIds.isNotEmpty() && memberFileIds.all { it in folderFileIds }
            groups.setResolution(exact.id, keeperFile.id, if (fullyInside) ReviewState.RESOLVED else ReviewState.OPEN)
        }
    }

    private suspend fun releaseFolder(group: DuplicateGroup) {
        val dirs = directories.byIds(groups.members(group.id).map { it.memberId })
        val filesByDir = dirs.associateWith { files.presentUnder(it.volumeId, it.relativePath) }
        val allFileIds = filesByDir.values.flatten().map { it.id }.toSet()
        val derived = decisions.forFiles(allFileIds).values.filter { decision ->
            val note = decision.note ?: return@filter false
            note.startsWith(KEEPER_NOTE_PREFIX) || note.startsWith(DISCARD_NOTE_PREFIX)
        }.map { it.fileId }
        if (derived.isNotEmpty()) decisions.clear(derived)

        val keeperDir = dirs.firstOrNull { it.id == group.keeperFileId } ?: return
        val keeperFileIds = filesByDir[keeperDir].orEmpty().map { it.id }.toSet()
        if (keeperFileIds.isEmpty()) return
        for ((exact, members) in groups.allWithMembers(DuplicateGroupKind.EXACT)) {
            if (exact.keeperFileId !in keeperFileIds) continue
            val memberFileIds = members.map { it.memberId }
            if (memberFileIds.none { it in allFileIds }) continue
            val fullyInside = memberFileIds.all { it in allFileIds }
            when (exact.reviewState) {
                ReviewState.RESOLVED -> if (fullyInside) groups.setResolution(exact.id, null, ReviewState.OPEN)
                ReviewState.OPEN -> groups.setResolution(exact.id, null, ReviewState.OPEN)
                ReviewState.DISMISSED -> Unit
            }
        }
    }

    private suspend fun applyFilePolicy(kind: DuplicateGroupKind, policyKind: KeeperPolicyKind, preferredVolumeIds: List<Long>): Int {
        val policy = policyFactory.create(policyKind, preferredVolumeIds)
        val volumeMap = volumes.all().associateBy { it.id }
        var resolved = 0
        for ((group, members) in groups.openWithMembers(kind)) {
            val entries = files.byIds(members.map { it.memberId })
            if (entries.size < 2) continue
            val keeper = policy.choose(entries, volumeMap)
            resolve(group.id, keeper.id)
            resolved++
        }
        return resolved
    }

    private suspend fun applyFolderPolicy(policyKind: KeeperPolicyKind, preferredVolumeIds: List<Long>): Int {
        var resolved = 0
        for ((group, members) in groups.openWithMembers(DuplicateGroupKind.FOLDER)) {
            val dirs = directories.byIds(members.map { it.memberId })
            if (dirs.size < 2) continue
            val filesByDir = dirs.associateWith { files.presentUnder(it.volumeId, it.relativePath) }
            val keeper = chooseDirectory(policyKind, preferredVolumeIds, dirs, filesByDir)
            resolve(group.id, keeper.id)
            resolved++
        }
        return resolved
    }

    private fun chooseDirectory(
        policy: KeeperPolicyKind,
        preferredVolumeIds: List<Long>,
        dirs: List<DirectoryEntry>,
        filesByDir: Map<DirectoryEntry, List<FileEntry>>,
    ): DirectoryEntry {
        fun volumeRank(dir: DirectoryEntry): Int = preferredVolumeIds.indexOf(dir.volumeId).let { if (it < 0) Int.MAX_VALUE else it }
        fun newest(dir: DirectoryEntry): Long = filesByDir[dir].orEmpty().maxOfOrNull { it.modifiedAt } ?: 0L
        fun oldest(dir: DirectoryEntry): Long = filesByDir[dir].orEmpty().minOfOrNull { it.modifiedAt } ?: Long.MAX_VALUE
        return when (policy) {
            KeeperPolicyKind.SHORTEST_PATH ->
                dirs.sortedWith(compareBy<DirectoryEntry> { it.relativePath.length }.thenBy { it.relativePath }.thenBy { it.id }).first()
            KeeperPolicyKind.PREFERRED_VOLUME_ORDER ->
                dirs.sortedWith(compareBy<DirectoryEntry> { volumeRank(it) }.thenBy { it.relativePath.length }.thenBy { it.id }).first()
            KeeperPolicyKind.NEWEST_MODIFIED ->
                dirs.sortedWith(compareByDescending<DirectoryEntry> { newest(it) }.thenBy { it.relativePath.length }.thenBy { it.id }).first()
            KeeperPolicyKind.OLDEST_MODIFIED ->
                dirs.sortedWith(compareBy<DirectoryEntry> { oldest(it) }.thenBy { it.relativePath.length }.thenBy { it.id }).first()
        }
    }

    private fun pathWithin(directoryPath: String, filePath: String): String =
        if (directoryPath.isEmpty()) filePath else filePath.removePrefix("$directoryPath/")

    private companion object {
        const val KEEPER_NOTE_PREFIX = "Keeper folder "
        const val DISCARD_NOTE_PREFIX = "Duplicate of folder "
    }
}
