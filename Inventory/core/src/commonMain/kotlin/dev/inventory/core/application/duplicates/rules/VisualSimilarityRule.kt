package dev.inventory.core.application.duplicates.rules

import dev.inventory.core.application.duplicates.DuplicateCandidate
import dev.inventory.core.application.duplicates.ProbableMatchRule
import dev.inventory.core.domain.duplicate.DuplicateGroupKind
import dev.inventory.core.domain.file.FingerprintKind
import dev.inventory.core.port.FileEntryRepository

/**
 * Proposes images whose 64-bit difference hashes lie within a Hamming distance threshold.
 * Hashes that share an 8-bit chunk are compared directly until a chunk is crowded, then with a BK-tree so large catalogs are not skipped.
 */
class VisualSimilarityRule(
    private val files: FileEntryRepository,
    private val maxDistance: Int = 6,
    private val maxBucket: Int = MAX_BUCKET,
) : ProbableMatchRule {
    override val reason: String = "visual-similar"
    override val readsStoredFingerprints: Boolean = true

    private val index = HammingIndex(maxDistance, maxBucket)

    /**
     * True after stored image hashes have been loaded into the in-memory index.
     */
    val ready: Boolean
        get() = index.ready

    override suspend fun emit(onGroup: suspend (DuplicateCandidate) -> Unit) {
        if (!index.ready) prepare(onGroup) else index.emitClusters(reason, onGroup)
    }

    /**
     * Loads every stored image hash, links neighbors, and emits each cluster.
     */
    suspend fun prepare(onGroup: suspend (DuplicateCandidate) -> Unit) {
        index.reset()
        files.fingerprintsOfKind(FingerprintKind.IMAGE_DHASH).forEach { index.add(it.fileId, it.fingerprint) }
        index.ready = true
        index.emitClusters(reason, onGroup)
    }

    /**
     * Adds one newly stored image hash and emits its cluster when it has a neighbor.
     */
    suspend fun observe(fileId: Long, fingerprint: String, onGroup: suspend (DuplicateCandidate) -> Unit) {
        if (!index.ready) {
            prepare(onGroup)
        }
        if (index.add(fileId, fingerprint)) {
            index.clusterOf(fileId, reason)?.let { onGroup(it) }
        }
    }

    private class HammingIndex(
        private val maxDistance: Int,
        private val maxBucket: Int,
    ) {
        var ready: Boolean = false
        private val hashes = ArrayList<ULong>()
        private val fileIds = ArrayList<Long>()
        private val idToIndex = HashMap<Long, Int>()
        private val rootOf = ArrayList<Int>()
        private val component = HashMap<Int, MutableList<Int>>()
        private val buckets = Array(8) { HashMap<Int, MutableList<Int>>() }
        private val trees = Array(8) { HashMap<Int, BkNode>() }
        private val distances = HashMap<Long, Int>()

        fun reset() {
            ready = false
            hashes.clear()
            fileIds.clear()
            idToIndex.clear()
            rootOf.clear()
            component.clear()
            buckets.forEach { it.clear() }
            trees.forEach { it.clear() }
            distances.clear()
        }

        fun add(fileId: Long, hex: String): Boolean {
            if (fileId in idToIndex) return false
            val hash = hex.toULongOrNull(16) ?: return false
            val index = hashes.size
            hashes += hash
            fileIds += fileId
            idToIndex[fileId] = index
            rootOf += index
            component[index] = mutableListOf(index)
            for (chunk in 0 until 8) {
                val byte = ((hash shr (chunk * 8)) and 0xFFu).toInt()
                val members = buckets[chunk].getOrPut(byte) { mutableListOf() }
                if (members.size >= maxBucket) {
                    val tree = trees[chunk].getOrPut(byte) { buildTree(members) }
                    query(tree, index, hash)
                    insert(tree, index, hash)
                } else {
                    for (other in members) link(index, other)
                }
                members += index
            }
            return true
        }

        suspend fun emitClusters(reason: String, onGroup: suspend (DuplicateCandidate) -> Unit) {
            val seen = HashSet<Int>()
            for (index in hashes.indices) {
                val root = rootOf[index]
                if (!seen.add(root)) continue
                cluster(root, reason)?.let { onGroup(it) }
            }
        }

        fun clusterOf(fileId: Long, reason: String): DuplicateCandidate? {
            val index = idToIndex[fileId] ?: return null
            return cluster(rootOf[index], reason)
        }

        private fun cluster(root: Int, reason: String): DuplicateCandidate? {
            val indices = component[root] ?: return null
            if (indices.size !in 2..MAX_GROUP) return null
            val members = indices.map { i ->
                val best = indices.filter { it != i }.minOf { j -> distances[pairKey(i, j)] ?: 64 }
                fileIds[i] to (1.0 - best / 64.0)
            }
            val confidence = members.minOf { it.second }.coerceIn(0.5, 0.95)
            return DuplicateCandidate(DuplicateGroupKind.PROBABLE, reason, confidence, members)
        }

        private fun link(i: Int, j: Int) {
            val distance = (hashes[i] xor hashes[j]).countOneBits()
            if (distance > maxDistance) return
            distances[pairKey(i, j)] = distance
            union(i, j)
        }

        private fun union(a: Int, b: Int) {
            val ra = rootOf[a]
            val rb = rootOf[b]
            if (ra == rb) return
            val listA = component.getValue(ra)
            val listB = component.getValue(rb)
            val (from, to) = if (listA.size < listB.size) ra to rb else rb to ra
            val moved = component.remove(from) ?: return
            val target = component.getValue(to)
            for (index in moved) rootOf[index] = to
            target += moved
        }

        private fun buildTree(members: List<Int>): BkNode {
            val root = BkNode(members.first(), hashes[members.first()])
            for (i in 1 until members.size) insert(root, members[i], hashes[members[i]])
            return root
        }

        private fun insert(node: BkNode, index: Int, hash: ULong) {
            var current = node
            while (true) {
                val distance = (current.hash xor hash).countOneBits()
                val child = current.children[distance]
                if (child == null) {
                    current.children[distance] = BkNode(index, hash)
                    return
                }
                current = child
            }
        }

        private fun query(node: BkNode, index: Int, hash: ULong) {
            val distance = (node.hash xor hash).countOneBits()
            if (distance <= maxDistance) link(index, node.index)
            for ((childDistance, child) in node.children) {
                if (childDistance in (distance - maxDistance)..(distance + maxDistance)) query(child, index, hash)
            }
        }

        private fun pairKey(i: Int, j: Int): Long {
            val lo = minOf(i, j).toLong()
            val hi = maxOf(i, j).toLong()
            return (lo shl 32) or hi
        }
    }

    private class BkNode(val index: Int, val hash: ULong) {
        val children = HashMap<Int, BkNode>()
    }

    private companion object {
        const val MAX_BUCKET = 2000
        const val MAX_GROUP = 50
    }
}
