package dev.inventory.data.repository

import dev.inventory.core.domain.decision.Decision
import dev.inventory.core.port.DuplicateStatusFilter
import dev.inventory.core.port.FileQuery
import dev.inventory.core.port.FileSortField

/**
 * Builds parameterized SQL for the dynamic browser query that SQLDelight's static statements cannot express.
 */
class FileQuerySqlBuilder {
    /**
     * A SQL fragment with its positional bind values.
     */
    data class Statement(
        /**
         * SQL text with "?" placeholders.
         */
        val sql: String,
        /**
         * Values to bind in order; each is a Long or a String.
         */
        val parameters: List<Any>,
    )

    /**
     * Returns the SELECT of full file_entry rows for the query with LIMIT and OFFSET applied.
     */
    fun select(query: FileQuery, limit: Int, offset: Int): Statement {
        val where = where(query)
        val sql = "SELECT f.* FROM file_entry f ${where.sql} ORDER BY ${orderBy(query)} LIMIT ? OFFSET ?"
        return Statement(sql, where.parameters + listOf(limit.toLong(), offset.toLong()))
    }

    /**
     * Returns a COUNT(*) statement for the query.
     */
    fun count(query: FileQuery): Statement {
        val where = where(query)
        return Statement("SELECT COUNT(*) FROM file_entry f ${where.sql}", where.parameters)
    }

    /**
     * Returns a SUM(size) statement for the query.
     */
    fun totalBytes(query: FileQuery): Statement {
        val where = where(query)
        return Statement("SELECT COALESCE(SUM(f.size), 0) FROM file_entry f ${where.sql}", where.parameters)
    }

    /**
     * Returns full file rows for files directly in parentPath on the given volume.
     */
    fun directChildFiles(volumeId: Long, parentPath: String, query: FileQuery): Statement {
        val where = whereForVolumeParent(query, volumeId, parentPath)
        val depth = directChildDepthClause(parentPath)
        val sql = "SELECT f.* FROM file_entry f ${where.sql} AND ${depth.sql} ORDER BY f.name COLLATE NOCASE"
        return Statement(sql, where.parameters + depth.parameters)
    }

    /**
     * Returns relative paths of entries under parentPath on the volume that may imply child folders.
     */
    fun pathsUnderParent(volumeId: Long, parentPath: String, query: FileQuery): Statement {
        val where = whereForVolumeParent(query, volumeId, parentPath)
        val deeper = deeperThanDirectChildClause(parentPath)
        val sql = "SELECT f.relative_path FROM file_entry f ${where.sql} AND ${deeper.sql}"
        return Statement(sql, where.parameters + deeper.parameters)
    }

    private fun whereForVolumeParent(query: FileQuery, volumeId: Long, parentPath: String): Statement {
        val base = where(query)
        val clauses = mutableListOf<String>()
        val parameters = mutableListOf<Any>()
        if (base.sql.isNotEmpty()) {
            clauses += base.sql.removePrefix("WHERE ")
            parameters.addAll(base.parameters)
        }
        clauses += "f.volume_id = ?"
        parameters += volumeId
        if (parentPath.isNotEmpty()) {
            clauses += "f.relative_path LIKE ? ESCAPE '\\'"
            parameters += escapeLike("$parentPath/") + "%"
        }
        val sql = "WHERE " + clauses.joinToString(" AND ")
        return Statement(sql, parameters)
    }

    private fun directChildDepthClause(parentPath: String): Statement =
        if (parentPath.isEmpty()) {
            Statement("f.relative_path NOT LIKE '%/%' ESCAPE '\\'", emptyList())
        } else {
            val prefix = escapeLike("$parentPath/") + "%"
            Statement(
                "f.relative_path LIKE ? ESCAPE '\\' AND f.relative_path NOT LIKE ? ESCAPE '\\'",
                listOf(prefix, prefix + "/%"),
            )
        }

    private fun deeperThanDirectChildClause(parentPath: String): Statement =
        if (parentPath.isEmpty()) {
            Statement("f.relative_path LIKE '%/%' ESCAPE '\\'", emptyList())
        } else {
            Statement(
                "f.relative_path LIKE ? ESCAPE '\\'",
                listOf(escapeLike("$parentPath/") + "%/%"),
            )
        }

    private fun where(query: FileQuery): Statement {
        val clauses = mutableListOf<String>()
        val parameters = mutableListOf<Any>()

        query.presence?.let {
            clauses += "f.presence = ?"
            parameters += it.name
        }
        if (query.volumeIds.isNotEmpty()) {
            clauses += "f.volume_id IN (${placeholders(query.volumeIds.size)})"
            parameters.addAll(query.volumeIds.toList())
        }
        if (query.kinds.isNotEmpty()) {
            clauses += "f.kind IN (${placeholders(query.kinds.size)})"
            parameters.addAll(query.kinds.map { it.name })
        }
        query.extension?.takeIf { it.isNotBlank() }?.let {
            clauses += "f.extension = ?"
            parameters += it.lowercase().removePrefix(".")
        }
        query.pathContains?.takeIf { it.isNotBlank() }?.let {
            clauses += "f.relative_path LIKE ? ESCAPE '\\'"
            parameters += "%" + escapeLike(it) + "%"
        }
        query.minSize?.let {
            clauses += "f.size >= ?"
            parameters += it
        }
        query.maxSize?.let {
            clauses += "f.size <= ?"
            parameters += it
        }
        if (query.tagIds.isNotEmpty()) {
            clauses += "EXISTS (SELECT 1 FROM file_tag ft WHERE ft.file_id = f.id AND ft.tag_id IN (${placeholders(query.tagIds.size)}))"
            parameters.addAll(query.tagIds.toList())
        }
        when (query.duplicateStatus) {
            DuplicateStatusFilter.ANY -> Unit
            DuplicateStatusFilter.IN_ANY_GROUP -> clauses += groupExists("('EXACT','PROBABLE')", negate = false)
            DuplicateStatusFilter.NOT_IN_GROUP -> clauses += groupExists("('EXACT','PROBABLE')", negate = true)
            DuplicateStatusFilter.EXACT -> clauses += groupExists("('EXACT')", negate = false)
            DuplicateStatusFilter.PROBABLE -> clauses += groupExists("('PROBABLE')", negate = false)
        }
        if (query.decisions.isNotEmpty()) {
            val explicit = query.decisions.filter { it != Decision.UNDECIDED }
            val parts = mutableListOf<String>()
            if (explicit.isNotEmpty()) {
                parts += "EXISTS (SELECT 1 FROM file_decision d WHERE d.file_id = f.id AND d.decision IN (${placeholders(explicit.size)}))"
                parameters.addAll(explicit.map { it.name })
            }
            if (Decision.UNDECIDED in query.decisions) {
                parts += "NOT EXISTS (SELECT 1 FROM file_decision d WHERE d.file_id = f.id)"
            }
            clauses += "(" + parts.joinToString(" OR ") + ")"
        }

        val sql = if (clauses.isEmpty()) "" else "WHERE " + clauses.joinToString(" AND ")
        return Statement(sql, parameters)
    }

    private fun groupExists(kinds: String, negate: Boolean): String {
        val exists = "EXISTS (SELECT 1 FROM duplicate_group_member m JOIN duplicate_group g ON g.id = m.group_id " +
            "WHERE m.member_id = f.id AND g.kind IN $kinds)"
        return if (negate) "NOT $exists" else exists
    }

    private fun orderBy(query: FileQuery): String {
        val direction = if (query.sortDescending) "DESC" else "ASC"
        return when (query.sortField) {
            FileSortField.PATH -> "f.volume_id $direction, f.relative_path COLLATE NOCASE $direction"
            FileSortField.NAME -> "f.name COLLATE NOCASE $direction, f.relative_path COLLATE NOCASE"
            FileSortField.EXTENSION -> "f.extension $direction, f.name COLLATE NOCASE $direction"
            FileSortField.SIZE -> "f.size $direction, f.relative_path COLLATE NOCASE"
            FileSortField.MODIFIED -> "f.modified_at $direction, f.relative_path COLLATE NOCASE"
            FileSortField.KIND -> "f.kind $direction, f.relative_path COLLATE NOCASE $direction"
        }
    }

    private fun placeholders(count: Int): String = List(count) { "?" }.joinToString(",")

    private fun escapeLike(value: String): String =
        value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
}
