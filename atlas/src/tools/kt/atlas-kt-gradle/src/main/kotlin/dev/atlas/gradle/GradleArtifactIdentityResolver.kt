package dev.atlas.gradle

import org.gradle.api.Project
import org.gradle.api.publish.PublishingExtension
import org.gradle.api.publish.maven.MavenPublication

/**
 * Resolves a model's opaque artifact identity from Gradle publication coordinates and target configuration.
 */
class GradleArtifactIdentityResolver(
    private val project: Project,
    private val extension: AtlasKotlinExtension
) {
    /**
     * Resolves identity at task execution so publication coordinates configured later in a build remain authoritative.
     *
     * @return Published artifact identity and presentation metadata for one generated module model.
     */
    fun resolve(): GradleArtifactIdentity {
        val publication = project.extensions.findByType(PublishingExtension::class.java)
            ?.publications
            ?.withType(MavenPublication::class.java)
            ?.sortedBy { candidate -> candidate.name }
            ?.firstOrNull()
        val group = publication?.groupId?.takeIf { value -> value.isNotBlank() } ?: project.group.toString()
        val artifact = publication?.artifactId?.takeIf { value -> value.isNotBlank() } ?: project.name
        val version = publication?.version?.takeIf { value -> value.isNotBlank() } ?: project.version.toString()
        val variant = extension.artifactVariant?.takeIf { value -> this.isSelected(value) }
        return GradleArtifactIdentity(
            listOfNotNull(group, artifact, version, variant).joinToString(":"),
            artifact,
            version,
            variant,
            extension.artifactCategory ?: this.inferCategory()
        )
    }

    /** Determines whether a configured target is selected by the extension's include and exclude patterns. */
    private fun isSelected(target: String): Boolean {
        val included = extension.includedTargets.any { pattern -> this.matches(pattern, target) }
        val excluded = extension.excludedTargets.any { pattern -> this.matches(pattern, target) }
        return included && !excluded
    }

    /** Applies a small predictable wildcard matcher to target and variant labels. */
    private fun matches(pattern: String, target: String): Boolean {
        return Regex("^" + Regex.escape(pattern).replace("\\*", ".*") + "$", RegexOption.IGNORE_CASE).matches(target)
    }

    /** Infers only presentation metadata; core Atlas behavior does not interpret this category. */
    private fun inferCategory(): String {
        return when {
            project.plugins.hasPlugin("com.android.library") -> "gradle-aar"
            project.plugins.hasPlugin("org.jetbrains.kotlin.js") -> "gradle-js-artifact"
            project.plugins.hasPlugin("org.jetbrains.kotlin.multiplatform") -> "gradle-multiplatform-artifact"
            else -> "gradle-jvm-artifact"
        }
    }
}

/**
 * Identifies one Gradle-published artifact without exposing Gradle implementation objects to the model serializer.
 */
data class GradleArtifactIdentity(
    /** Opaque artifact identity used by cross-module targets and workspace manifests. */
    val id: String,
    /** Readable published artifact name. */
    val displayName: String,
    /** Published artifact version. */
    val version: String,
    /** Optional target or build variant label. */
    val variant: String?,
    /** Artifact family for presentation and categorization. */
    val category: String
)
