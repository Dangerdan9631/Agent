package dev.inventory.core.application.consolidation

import dev.inventory.core.application.keeper.KeeperSelectionPolicy
import dev.inventory.core.domain.consolidation.ActionKind
import dev.inventory.core.domain.consolidation.ActionState
import dev.inventory.core.domain.consolidation.ConsolidationAction
import dev.inventory.core.domain.consolidation.ConsolidationPlan
import dev.inventory.core.domain.consolidation.PlanStatus
import dev.inventory.core.domain.decision.Decision
import dev.inventory.core.domain.duplicate.DuplicateGroupKind
import dev.inventory.core.domain.duplicate.ReviewState
import dev.inventory.core.domain.file.FileEntry
import dev.inventory.core.port.Clock
import dev.inventory.core.port.ConsolidationRepository
import dev.inventory.core.port.DuplicateGroupRepository
import dev.inventory.core.port.FileDecisionRepository
import dev.inventory.core.port.FileEntryRepository
import dev.inventory.core.port.FileQuery
import dev.inventory.core.port.FileSystemPort
import dev.inventory.core.port.TagRepository
import dev.inventory.core.port.VolumeRepository
import io.github.oshai.kotlinlogging.KotlinLogging

/**
 * Turns decisions and duplicate groups into a journaled set of MOVE, DELETE_REDUNDANT, and SKIP actions.
 */
class ConsolidationPlanner(
    private val files: FileEntryRepository,
    private val volumes: VolumeRepository,
    private val decisions: FileDecisionRepository,
    private val groups: DuplicateGroupRepository,
    private val tags: TagRepository,
    private val plans: ConsolidationRepository,
    private val fileSystem: FileSystemPort,
    private val layoutFactory: LayoutStrategyFactory,
    private val conflictFactory: ConflictPolicyFactory,
    private val defaultKeeperPolicy: KeeperSelectionPolicy,
    private val clock: Clock,
) {
    private val logger = KotlinLogging.logger {}

    /**
     * Builds and persists a DRAFT plan for the request and returns it; throws IllegalArgumentException when the destination overlaps a scanned volume.
     */
    suspend fun plan(request: PlanRequest): ConsolidationPlan {
        val allVolumes = volumes.all()
        validateDestination(request.destinationRoot, allVolumes.map { it.rootPath })
        val volumeMap = allVolumes.associateBy { it.id }
        val now = clock.now()

        val planFiles = loadFiles(request.volumeIds)
        val byId = planFiles.associateBy { it.id }
        val decisionMap = decisions.forFiles(byId.keys)
        logger.info { "Planning consolidation of ${planFiles.size} files to ${request.destinationRoot} with layout=${request.layoutStrategy} conflicts=${request.conflictPolicy} removeRedundantExact=${request.removeRedundantExact}" }

        val roles = HashMap<Long, Role>()
        assignExactRoles(roles, byId, decisionMap, request.removeRedundantExact, volumeMap)
        assignProbableRoles(roles, byId, decisionMap)

        val layout = layoutFactory.create(request.layoutStrategy)
        val conflicts = conflictFactory.create(request.conflictPolicy)
        val context = LayoutContext(volumeMap, tags.tagsForFiles(byId.keys))
        val taken = HashSet<String>()

        val plan = plans.createPlan(
            ConsolidationPlan(0, request.destinationRoot, request.layoutStrategy, request.conflictPolicy, request.removeRedundantExact, PlanStatus.DRAFT, now),
        )

        val moves = ArrayList<ConsolidationAction>()
        val skips = ArrayList<ConsolidationAction>()
        val deletes = ArrayList<Pair<ConsolidationAction, Long>>()

        for (file in planFiles.sortedWith(compareBy({ it.volumeId }, { it.relativePath }))) {
            val source = fileSystem.resolve(volumeMap.getValue(file.volumeId).rootPath, file.relativePath)
            when (val role = roles[file.id] ?: defaultRole(file, decisionMap)) {
                Role.Move -> {
                    val desired = layout.destinationRelativePath(file, context)
                    val resolved = if (desired.lowercase() in taken) conflicts.resolve(desired, taken) else desired
                    if (resolved == null) {
                        skips += action(plan.id, file.id, source, null, ActionKind.SKIP, "Destination conflict for $desired; left in place", null, now)
                    } else {
                        taken += resolved.lowercase()
                        moves += action(plan.id, file.id, source, fileSystem.resolve(request.destinationRoot, resolved), ActionKind.MOVE, null, null, now)
                    }
                }
                is Role.Redundant -> {
                    val keeper = byId.getValue(role.keeperId)
                    deletes += action(plan.id, file.id, source, null, ActionKind.DELETE_REDUNDANT, "Redundant copy of ${keeper.relativePath}", null, now) to role.keeperId
                }
                is Role.Skip -> skips += action(plan.id, file.id, source, null, ActionKind.SKIP, role.message, null, now)
            }
        }

        plans.insertActions(moves)
        plans.insertActions(skips)
        val moveIds = plans.moveActionIdsByFile(plan.id)
        plans.insertActions(
            deletes.map { (action, keeperId) ->
                val dependency = moveIds[keeperId]
                if (dependency == null) {
                    action.copy(kind = ActionKind.SKIP, message = "Keeper is not being moved in this plan; left in place")
                } else {
                    action.copy(dependsOnActionId = dependency)
                }
            },
        )
        logger.info { "Plan ${plan.id} created: ${moves.size} moves, ${deletes.size} redundant deletes, ${skips.size} skips" }
        return plan
    }

    private fun validateDestination(destination: String, roots: List<String>) {
        for (root in roots) {
            require(!fileSystem.isInside(destination, root)) { "Destination lies inside scanned volume $root" }
            require(!fileSystem.isInside(root, destination)) { "Scanned volume $root lies inside the destination" }
        }
    }

    private suspend fun loadFiles(volumeIds: Set<Long>): List<FileEntry> {
        val query = FileQuery(volumeIds = volumeIds)
        val result = ArrayList<FileEntry>()
        var offset = 0
        while (true) {
            val page = files.query(query, PAGE, offset)
            result += page
            if (page.size < PAGE) break
            offset += page.size
        }
        return result
    }

    private suspend fun assignExactRoles(
        roles: MutableMap<Long, Role>,
        byId: Map<Long, FileEntry>,
        decisionMap: Map<Long, dev.inventory.core.domain.decision.FileDecision>,
        removeRedundant: Boolean,
        volumeMap: Map<Long, dev.inventory.core.domain.volume.Volume>,
    ) {
        for ((group, members) in groups.allWithMembers(DuplicateGroupKind.EXACT)) {
            if (group.reviewState == ReviewState.DISMISSED) continue
            val present = members.mapNotNull { byId[it.memberId] }
            if (present.isEmpty()) continue
            val keeper = group.keeperFileId?.let { byId[it] } ?: defaultKeeperPolicy.choose(present, volumeMap)
            roles.putIfAbsent(keeper.id, Role.Move)
            for (member in present) {
                if (member.id == keeper.id) continue
                val decision = decisionMap[member.id]?.decision ?: Decision.UNDECIDED
                roles[member.id] = when {
                    decision == Decision.KEEP -> Role.Move
                    removeRedundant || decision == Decision.DISCARD -> Role.Redundant(keeper.id)
                    else -> Role.Skip("Redundant exact copy of ${keeper.relativePath}; left in place")
                }
            }
        }
    }

    private suspend fun assignProbableRoles(
        roles: MutableMap<Long, Role>,
        byId: Map<Long, FileEntry>,
        decisionMap: Map<Long, dev.inventory.core.domain.decision.FileDecision>,
    ) {
        for ((group, members) in groups.allWithMembers(DuplicateGroupKind.PROBABLE)) {
            if (group.reviewState != ReviewState.RESOLVED) continue
            val keeperId = group.keeperFileId ?: continue
            if (keeperId !in byId) continue
            roles.putIfAbsent(keeperId, Role.Move)
            for (member in members) {
                if (member.memberId == keeperId || member.memberId !in byId || member.memberId in roles) continue
                val decision = decisionMap[member.memberId]?.decision ?: Decision.UNDECIDED
                roles[member.memberId] = if (decision == Decision.DISCARD) Role.Redundant(keeperId) else Role.Move
            }
        }
    }

    private fun defaultRole(file: FileEntry, decisionMap: Map<Long, dev.inventory.core.domain.decision.FileDecision>): Role =
        if (decisionMap[file.id]?.decision == Decision.DISCARD) {
            Role.Skip("Marked DISCARD but no verified keeper exists; not deleted")
        } else {
            Role.Move
        }

    private fun action(
        planId: Long, fileId: Long, source: String, destination: String?, kind: ActionKind, message: String?, dependsOn: Long?, now: Long,
    ) = ConsolidationAction(0, planId, fileId, source, destination, kind, ActionState.PENDING, message, dependsOn, now)

    private sealed interface Role {
        data object Move : Role
        data class Redundant(val keeperId: Long) : Role
        data class Skip(val message: String) : Role
    }

    private companion object {
        const val PAGE = 5000
    }
}
